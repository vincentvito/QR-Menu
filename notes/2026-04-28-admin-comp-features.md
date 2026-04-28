# Admin: comp plans + multi-business management — 2026-04-28

Use case from the owner: he wants to add his own businesses to the platform, and give free access to relatives who also run businesses, without going through Stripe Checkout for any of them.

## Recommended approach

Single mechanism — a `compPlan` field on `Organization` — covers both:

- **Owner's businesses** → `compPlan = "pro"`, `compReason = "internal"`
- **Relatives** → `compPlan = "pro"`, `compReason = "family"`
- **Beta testers / promo** → `compPlan = "basic"`, `compReason = "beta"`

Why this beats the alternatives:

- **Buying real subscriptions for everyone** would round-trip the owner's own money, but pollutes Stripe analytics (false MRR) and makes future "what's our real revenue?" reporting harder. Also creates billing noise (invoices to himself, etc.).
- **Hard-coded email allowlist in code** doesn't scale and isn't auditable.
- **Manual DB edits** work but leave no trail and can't be revoked from a UI.

The comp flag is reversible (clear the field → org reverts to trial / unsubscribed state), auditable (track who granted it and why), and trivially separable from real customers when calculating MRR (`WHERE compPlan IS NULL`).

## MVP — ship these together

### 1. Schema

Add to `Organization` model in `prisma/schema.prisma`:

```prisma
compPlan        String?   // "basic" | "pro" | "business" | "enterprise"
compReason      String?   // "internal" | "family" | "beta" | free-text
compGrantedBy   String?   // admin user id (FK to user)
compGrantedAt   DateTime?
```

Migration is non-destructive — no existing row breaks.

### 2. Plan resolution

Update `resolvePlan` in `lib/plans.ts` so that when `compPlan` is set, it returns that plan regardless of subscription state. Comp plans should still respect `monthlyCreditsOverride` / `maxRestaurantsOverride` if those are also set, so an "internal" org could be Pro-baseline with bumped credits.

### 3. Subscription gates

Audit every place that checks for an active subscription. Comp orgs need to pass these gates without a Stripe `subscription` row:

- AI credit gates (image generate/enhance) — already plan-driven via `monthlyCreditsRemaining`, just need the credit grant to happen for comp orgs (see #4).
- Future: any "are you subscribed?" checks added when implementing read-only mode for canceled orgs (see test-findings #8a) must treat `compPlan != null` as "yes".

### 4. Credit granting for comp orgs

Comp orgs don't fire Stripe webhooks, so `handleSubscriptionLifecycle` never runs for them. Two options:

- **Cron / scheduled job** runs monthly, finds all `compPlan != null` orgs, refills `monthlyCreditsRemaining` to the plan's allowance.
- **Lazy refill** — when an org's `monthlyCreditsResetAt` is older than ~30 days, top up on next read of the credits state. Cheaper, no infra, but reset boundary is fuzzy (depends on usage).

Lazy refill is simpler and good enough for the small number of comp orgs expected. Implementation: `getBillingState` (or wherever credits are read) checks `compPlan` + age of `monthlyCreditsResetAt` and lazy-refills before returning.

### 5. Admin UI: comp management

In the existing `app/admin/users/page.tsx`:

- New column: **Comp** (badge: plan name + reason if set, "—" otherwise).
- Click row → modal with:
  - Plan picker (Basic / Pro / Business / Enterprise / **None / revoke**)
  - Reason text (with quick-pick chips: internal, family, beta, other)
  - Save → updates org row, captures `compGrantedBy = current admin user id`, `compGrantedAt = now()`
- Filter dropdown above the table: All / Comp only / Paying only / Trial / Canceled.

### 6. Admin UI: manual credit top-up

Inline action on the same admin org row → "Add credits" → number + reason → calls `grantBonusCredits` (already exists in `lib/plans/credits.ts`, signature `(orgId, amount, { type: 'grant', reason })`). Logs to `CreditTransaction` automatically.

### 7. Admin UI: impersonate

Wire `authClient.admin.impersonate(userId)` (Better Auth's admin plugin already supports this) to a button on each admin row. Useful for support — see exactly what a comped relative sees in their dashboard.

## Phase 2 — nice to have

### 8. Org overrides editor

Expose the existing `maxRestaurantsOverride` and `monthlyCreditsOverride` in the admin UI so the owner can grant a comped relative "Pro plan but with 200 credits/month" without creating a custom plan.

### 9. Audit log

Optional `AdminAction` table tracking comp grants, credit top-ups, override changes. Schema:

```prisma
model AdminAction {
  id           String   @id @default(cuid())
  adminUserId  String
  targetType   String   // "organization" | "user"
  targetId     String
  action       String   // "comp-grant" | "comp-revoke" | "credit-grant" | "override-set"
  payload      Json?
  reason       String?
  createdAt    DateTime @default(now())
}
```

Cheap to add now; very valuable when the owner is debugging "wait who comped this org?" six months from now.

### 10. Search + better filters

Right now Users tab paginates 50 at a time. Add server-side search by email/org name + filters by plan, status, restaurant count, last-AI-action date.

## Out of scope for now (but worth recording)

- **Self-serve invitations to comp** — owner sends a relative an invite link that auto-comps their org on signup. Could be a nice flow later but adds complexity (link expiry, usage limits, abuse prevention). For 5–10 manual comps, the admin UI is fine.
- **Comp expiration** — granting comp for a fixed window (e.g. "free for 6 months"). YAGNI; revoke manually when the time comes.
- **Tiered comp** — different perks for different reasons. The reason field is informational only; the plan tier is what matters.

## Acceptance criteria for MVP done

- [ ] Owner can sign up his businesses normally, then comp them from the admin panel without any Stripe involvement.
- [ ] A comped org has full plan caps and monthly credits matching the comped tier.
- [ ] Comped orgs continue to receive monthly credit refills indefinitely.
- [ ] Owner can revoke comp; org cleanly reverts to whatever subscription state it had (none = back to trial defaults).
- [ ] MRR / revenue calculations exclude `compPlan != null` orgs.
- [ ] Every comp action is attributable to an admin (via `compGrantedBy` or the optional `AdminAction` log).

## Open question for the owner

Should comped orgs **see** something in their dashboard indicating they're on a comp plan? Or should it look indistinguishable from a paid customer?

- **Visible comp banner** ("Complimentary Pro plan — courtesy of {grantor}") is honest and avoids surprise if comp is later revoked.
- **Invisible comp** is friendlier but means the user might be confused if they go to billing and see "Not subscribed".

Recommend visible — it removes ambiguity and the relative knows they're getting something special.
