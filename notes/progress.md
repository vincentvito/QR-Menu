# QRmenucrafter — progress toward v1

Last updated: 2026-04-19

This note exists so context can be cleared without losing the plot. Pair it
with `notes/v1-feature-list.md` (the target) and `app/changelog/page.tsx`
(the user-facing history of what's shipped).

---

## What's done

### Foundations (Phases 1–6)

- **Auth** — OTP-only via better-auth; no password flow.
- **Organizations (= restaurants) via better-auth `organization` plugin.** One
  user → one org to start (`organizationLimit` not set, but hinted). Members
  roles: `owner` (creator), `admin` (invited), `member` (invited).
- **Admin plugin registered** — platform-level superuser role (`User.role`).
  `PLATFORM_ADMIN_EMAILS` env var auto-promotes matching emails on signup via
  `databaseHooks.user.create.before`. Distinct from org roles.
- **Onboarding flow** at `/onboarding` — two steps: (1) restaurant URL →
  Firecrawl v2 branding extraction, (2) editable details (name, description,
  logo, main/accent colors, currency) + user's display name.
- **Dashboard shell** at `/dashboard` with collapsible shadcn sidebar.
  Routes: `/menus`, `/menus/[slug]/edit`, `/menus/[slug]/qr`, `/menus/new`,
  `/team`, `/settings`, `/profile`. Gate lives in `/dashboard/layout.tsx`
  via cached `getDashboardContext()` (session + org + role in one round-trip).
- **Invitations** — owner/admin sends invite from `/dashboard/team` →
  branded email via ZeptoMail → `/accept-invite?invitationId=…` public page
  → OTP login → auto-join.
- **Platform admin at `/admin`** — user table (impersonate, ban), stats grid,
  signups-over-time chart (Recharts via shadcn). `notFound()` for non-admins.
- **Impersonation banner** in dashboard layout when `session.session.impersonatedBy`
  is set.
- **Menu creation** — Firecrawl + Gemini extraction from URL / text / photo /
  PDF. Menus belong to the org, not the user. Editor at
  `/dashboard/menus/[slug]/edit` (autosave per dish).
- **Public menu** at `/m/[slug]` — uses org's main/accent colors as
  `--accent`/`--pop` CSS vars, shows org logo + name + menu name.

### QR codes

- **Real QR generation** via `qr-code-styling` (dynamically imported).
- **Per-org styling** — dot style, corner style, foreground + background colors,
  center content (none / logo / text up to 4 chars). Live preview in Settings.
- **Downloads** — SVG + PNG from both `/dashboard/menus/[slug]/qr` and the
  Settings preview (falls back to disabled state if no menus yet).
- **"Use my brand colors"** one-click preset pulls main/accent into QR FG/BG.

### Brand + profile

- **Logo upload via drag-drop** — Cloudflare R2 (shared bucket with
  menu-design-ai / screenslick, namespaced under `qrmenucrafter/`). Max 2 MB.
  Works from Settings (org-scoped key) and Onboarding (user-scoped key,
  before org exists). Delete logo via AlertDialog confirm.
- **Profile page** `/dashboard/profile` — edit display name via
  `authClient.updateUser`. Sidebar footer user card links here.
- **Display name fallback** — `formatDisplayName()` renders email local part
  as "Vlad Palacio" when `user.name` is empty.

### Landing

- **Session-aware CTAs** — every "Get started / Start free / Choose plan"
  link goes to `/dashboard` if authed, `/auth/login` otherwise.
- **Top nav simplified** — single pill button (reads "Get started" signed out,
  "Dashboard" signed in). Sign-in link removed.
- **BackToTop** button, passive scroll listener.

### Infra / plumbing you'll care about

- **Cloudflare R2** via `@aws-sdk/client-s3`. Env: `CLOUDFLARE_BUCKET_API`,
  `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`,
  `CLOUDFLARE_BUCKET_NAME`, `CLOUDFLARE_PUBLIC_URL`. Helpers in
  `lib/storage/r2.ts`.
- **ZeptoMail** for OTP + invitation emails. Env: `ZEPTOMAIL_API_URL`,
  `ZEPTO_MAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`. Templates in
  `lib/email-templates.ts`. Falls back to console log when unset.
- **Gemini + Firecrawl** for menu/brand extraction. Env: `FIRECRAWL_API_KEY`,
  `GOOGLE_GENERATIVE_AI_API_KEY`.
- **Supabase Postgres** via Prisma. Migrations are up to date; the AI harness
  can't run `prisma migrate dev` (Prisma blocks data-loss ops); use
  `migrate dev --create-only` + `migrate deploy`, or write SQL files
  by hand for column drops.
- **shadcn/ui rule** (see `AGENTS.md`): never edit files under
  `components/ui/*` that shadcn manages. Custom variants live in sibling
  files like `components/ui/pill-button.tsx`.
- **Performance rule of thumb**: dashboard pages all call
  `getDashboardContext()` for auth/org — cached via `React.cache()` so it's
  free after the layout already resolved it. Org updates call
  `revalidatePath('/dashboard', 'layout')` + `revalidatePath('/m/[slug]', 'page')`
  so stale RSC doesn't haunt anyone.

---

## What's left for v1

Source of truth: `notes/v1-feature-list.md`. Status relative to that:

| Feature | Status |
|---|---|
| Admin / employee roles | ✅ |
| Admin can manage menus | ✅ |
| **Daily specials section** | ❌ |
| **Best-seller tag (+ Chef's Pick, New, Vegan, Spicy badges)** | ⚠ Dietary tags exist (`V/VG/GF/DF/NF`) but no editorial badges |
| **Dish photo uploads (+ AI enhancement)** | ❌ |
| Customizable brand colors + logo + QR | ✅ |
| **Call-waiter action bar → tablet / messaging bot** | ⚠ Button exists on `/m/[slug]` but click does nothing |
| **WiFi password reveal** | ❌ (planned schema: `wifiSsid` + `wifiPassword` on Organization; menu-page reveal button + WiFi QR using `WIFI:T:WPA;S:…;P:…;;` standard) |
| **Multi-language switcher for the public menu** (auto-translate + manual override) | ❌ (app i18n exists via next-intl, but menu *content* isn't translated) |
| **Google review redirect button** | ❌ |
| **Social media follow buttons** (IG, TikTok, FB) | ❌ |
| **Owner analytics** — scan counts, views per dish, waiter-call frequency, language breakdown, peak hours | ❌ — start by shipping the event table + instrumentation now so there's real data when the dashboard is built |

### Prioritization suggestion

The items break into three buckets:

1. **Small scoped additions** (one phase each, low risk):
   - WiFi password (field + reveal + WiFi QR)
   - Google review redirect + social follow buttons (config fields on Org + render on public menu)
   - Wire the call-waiter button to *something* (tablet URL field on Org,
     basic alert log, or a webhook)
   - Best-seller / editorial badges (extend `MenuItem.tags` or add a
     `badges: string[]` field + UI chip picker in the editor)
   - Daily specials (add `specialUntil: DateTime?` on `MenuItem` + a pinned
     "Today's specials" section at the top of the public menu)

2. **Medium-sized features**:
   - Dish photo uploads (R2 storage is already wired; add `imageUrl` field
     to `MenuItem`, new `/api/upload/menu-item` endpoint gated by org
     membership, uploader in the editor)
   - Dish photo AI enhancement (defer — Replicate / similar; the sibling
     project `menu-design-ai` has a prediction pattern you could mirror)

3. **Bigger commitments**:
   - **Multi-language public menu** — translate item names + descriptions
     per locale. Data model options:
     (a) JSONB `translations: Record<locale, { name, description }>` on
     MenuItem (simple, denormalized)
     (b) `MenuItemTranslation` table (normalized, enables filtering).
     Auto-translate via Gemini or DeepL; let owners manually override.
     Public menu gets a language switcher.
   - **Owner analytics** — events table (`MenuEvent`), public-menu
     instrumentation (`POST /api/events` beacon, `IntersectionObserver`
     for dish views), aggregation queries, `/dashboard/analytics` page
     with Recharts. Privacy-friendly (no user id, no IP, no fingerprint).
     Start with the table + instrumentation, ship dashboard later when
     there's real data.

### Big-bet differentiator (post-v1, pre-launch wow-factor)

**Menu templates + seasonal themes.** Goal: every restaurant's public menu
feels *its own*, not the same layout with a different color. Intended as
the main differentiator vs. generic QR-menu competitors.

Two orthogonal layers:

1. **Templates** — core layout/typography variants selected per-menu or
   per-org. Ship 3–5 curated ones (e.g. "Editorial", "Photo grid",
   "Chalkboard", "Minimal list"). Each template already picks up the
   org's brand colors via the `--accent` / `--pop` CSS vars we inject.
   Owner picks a template in Settings; it renders immediately on `/m/[slug]`.
2. **Seasonal themes** — lightweight *decoration overlay* that sits on top
   of any template. Small Lottie/SVG ornaments: snow for December,
   falling leaves, subtle pumpkin motifs, etc. Either date-scheduled
   automatically or owner-toggled. Should work with any template.

**Sequencing rationale (why we deferred):** templates need content to
shine. A "Photo grid" template without dish photos is just a styled
text list. Shipping templates before photos/badges/daily-specials means
rebuilding the templates once that data lands. So the order is:

> small bucket (badges, specials, call-waiter) → dish photos →
> templates → seasonal themes.

**Data-model implications to keep in mind** when we get there:
- `Menu.templateId String?` (or on Organization if picked once)
- Templates are code-defined (a registry), not DB rows.
- Seasonal theme: `Organization.seasonalTheme String?` with values
  like `'snow' | 'autumn' | 'halloween' | 'none'` + optional auto-pick
  from date.

### Nice-to-haves post-v1

- Printable table-card layout (menu QR + restaurant name + "Scan for menu"
  at standard table-tent sizes; optionally second WiFi QR alongside).
- Delete-restaurant danger zone in Settings.
- Member management UI (promote/demote/remove — currently you can only
  invite + cancel pending).
- Cross-browser logo shape safety net: `object-cover` crops wide logomarks.
  Either server-side square-crop on upload, or a per-surface
  `object-contain` toggle. Flag if real uploads look bad.
- Pagination + search on `/admin` user table.
- Role-change UI on `/admin`.

### Known debt

- `next build` fails in the maintainer's WSL env on a missing
  `@parcel/watcher` native binary. Builds are done manually on Windows.
  AI harness uses `npx tsc --noEmit` only — do not run `next build` here.
- `i18n` Spanish translations (`messages/es.json`) are still mostly English.
  Needs a sweep before marketing in Spanish-speaking markets.
- The changelog on `/changelog` is getting dense — fine for now, may want
  collapse/expand per version before launch.
