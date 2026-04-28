// One-shot account deletion for test/cleanup purposes.
//
// Usage:
//   npx tsx scripts/delete-account.ts <email>             # dry-run, prints plan
//   npx tsx scripts/delete-account.ts <email> --confirm   # actually delete
//
// Deletes the user, every org where they're the owner, and all
// restaurants/menus/items/credit ledger/etc. cascading from those orgs.
// Also deletes Subscription rows (no FK cascade) and best-effort removes
// R2 images (org logo/header, restaurant logo/header, menu item photos,
// user avatar).

import 'dotenv/config'

import prisma from '../lib/prisma'
import { deleteByUrl } from '../lib/storage/r2'

const email = process.argv[2]
const confirm = process.argv.includes('--confirm')

if (!email || email.startsWith('--')) {
  console.error('Usage: tsx scripts/delete-account.ts <email> [--confirm]')
  process.exit(1)
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, image: true },
  })

  if (!user) {
    console.error(`No user found for email: ${email}`)
    process.exit(1)
  }

  const memberships = await prisma.member.findMany({
    where: { userId: user.id },
    select: { organizationId: true, role: true },
  })

  const ownedOrgIds = memberships.filter((m) => m.role === 'owner').map((m) => m.organizationId)
  const nonOwnerOrgIds = memberships.filter((m) => m.role !== 'owner').map((m) => m.organizationId)

  const orgs = ownedOrgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: ownedOrgIds } },
        select: { id: true, name: true, slug: true, logo: true, stripeCustomerId: true },
      })
    : []

  const restaurants = ownedOrgIds.length
    ? await prisma.restaurant.findMany({
        where: { organizationId: { in: ownedOrgIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          headerImage: true,
          organizationId: true,
        },
      })
    : []

  const menuItems = ownedOrgIds.length
    ? await prisma.menuItem.findMany({
        where: { menu: { organizationId: { in: ownedOrgIds } } },
        select: { id: true, imageUrl: true },
      })
    : []

  const subscriptions = ownedOrgIds.length
    ? await prisma.subscription.findMany({
        where: { referenceId: { in: ownedOrgIds } },
        select: {
          id: true,
          referenceId: true,
          plan: true,
          status: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      })
    : []

  const imageUrls: string[] = []
  if (user.image) imageUrls.push(user.image)
  for (const o of orgs) if (o.logo) imageUrls.push(o.logo)
  for (const r of restaurants) {
    if (r.logo) imageUrls.push(r.logo)
    if (r.headerImage) imageUrls.push(r.headerImage)
  }
  for (const mi of menuItems) if (mi.imageUrl) imageUrls.push(mi.imageUrl)

  console.log('━━━ DELETION PLAN ━━━')
  console.log(`User:        ${user.email}  (id=${user.id}, name=${user.name ?? '—'})`)
  console.log(`Owned orgs:  ${orgs.length}`)
  for (const o of orgs) {
    console.log(`  • ${o.name} (id=${o.id}, slug=${o.slug ?? '—'}, stripeCustomer=${o.stripeCustomerId ?? '—'})`)
  }
  if (nonOwnerOrgIds.length > 0) {
    console.log(`Non-owner memberships (will be removed via cascade, org kept): ${nonOwnerOrgIds.length}`)
  }
  console.log(`Restaurants: ${restaurants.length}`)
  for (const r of restaurants) console.log(`  • ${r.name} (slug=${r.slug ?? '—'})`)
  console.log(`Menu items:  ${menuItems.length}`)
  console.log(`Subscriptions to delete (no FK cascade): ${subscriptions.length}`)
  for (const s of subscriptions) {
    console.log(
      `  • ${s.plan}/${s.status} (stripeSub=${s.stripeSubscriptionId ?? '—'}, stripeCust=${s.stripeCustomerId ?? '—'})`,
    )
  }
  console.log(`R2 images to delete: ${imageUrls.length}`)
  for (const u of imageUrls) console.log(`  • ${u}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━')

  if (!confirm) {
    console.log('\nDRY RUN — re-run with --confirm to execute.')
    return
  }

  console.log('\nExecuting…')

  if (subscriptions.length > 0) {
    const r = await prisma.subscription.deleteMany({
      where: { id: { in: subscriptions.map((s) => s.id) } },
    })
    console.log(`Deleted ${r.count} subscription rows`)
  }

  await prisma.verification.deleteMany({ where: { identifier: email } })

  // Deleting the user cascades sessions, accounts, members, invitations,
  // restaurantMembers, restaurantInvitations. Owned orgs we still need to
  // delete explicitly (Member cascade only removes the join row, not the org).
  await prisma.user.delete({ where: { id: user.id } })
  console.log(`Deleted user ${user.email}`)

  if (ownedOrgIds.length > 0) {
    const r = await prisma.organization.deleteMany({ where: { id: { in: ownedOrgIds } } })
    console.log(`Deleted ${r.count} owned organizations (cascades restaurants, menus, items, ledger)`)
  }

  // R2 cleanup is best-effort; deleteByUrl swallows errors.
  console.log(`Deleting ${imageUrls.length} R2 objects…`)
  await Promise.all(imageUrls.map((u) => deleteByUrl(u)))
  console.log('R2 cleanup done')

  console.log('\nDone.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
