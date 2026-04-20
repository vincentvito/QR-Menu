# QRmenucrafter — progress toward v1

Last updated: 2026-04-20

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

### v1 feature sweep (shipped 2026-04-19 → 2026-04-20)

- **WiFi reveal** — `Organization.wifiSsid` / `wifiPassword` / `wifiEncryption`.
  `WifiReveal` sheet on `/m/[slug]` shows SSID, masked password with copy, and
  a WiFi QR (`WIFI:T:…;S:…;P:…;;`). Uses a mount-deferred pattern to avoid a
  Radix `aria-controls` hydration mismatch — SSR renders a plain button, the
  real Sheet swaps in after `useEffect`.
- **Google review button** — `Organization.googleReviewUrl`; rendered as a
  pill in the public-menu footer.
- **Social follow buttons** — `instagramUrl` / `tiktokUrl` / `facebookUrl` on
  Organization; Settings accepts handles or full URLs (`lib/socials.ts`
  normalizes both). Rendered as icon buttons in the public-menu footer
  (icons in `components/brand/SocialIcons.tsx`).
- **Editorial badges** — five curated: Best Seller, Chef's Pick, Signature,
  New, Spicy. Stored as `MenuItem.badges String[]`; toggleable chips in the
  editor; rendered via shared `components/menu/BadgeRow.tsx`. All five are
  always available (the per-org disable toggle was shipped then removed in
  0.20.0 — the `disabledBadges` column is gone).
- **Today's Specials** — `MenuItem.specialUntil DateTime?` with auto-expiry.
  Active specials are pinned at the top of the public menu in a highlighted
  block (theme-aware `bg-pop/10` + `var(--pop)` color-mix glow). Editor has
  a date picker per dish.
- **Dish photos** — `MenuItem.imageUrl`. Upload via
  `/api/upload/menu-item-image` (org-scoped R2 keys), drag-drop uploader in
  the editor (`components/editor/DishPhotoUploader.tsx`). Public menu uses
  `components/menu/ImageLightbox.tsx` for tap-to-zoom. Delete button lives
  in the top-right above the dish name (was overlapping the price).
- **AI photos (Gemini)** — `@google/genai` `gemini-3.1-flash-image-preview`.
  Two endpoints: `.../enhance-image` (improve existing) and
  `.../generate-image` (from dish name + description). UI in
  `components/editor/AIPhotoPanel.tsx`. 20 MB API-level inline cap applies.
- **Menu templates** — code-defined registry in
  `components/menu/templates/`. Two shipped: `default` (Editorial list) and
  `photo-grid`. `Organization.templateId` picks the active one; preview in
  Settings runs inside an iPhone mockup (`components/menu/PhonePreview.tsx`).
  `PublicMenuBody` dispatches to the template's `Body`. Shared primitives
  (`PriceChip`, `BadgeRow`) lock brand decisions across templates.
- **Themes** — `lib/menus/themes.ts` defines 5 palette+typography presets:
  Editorial, Pastel, Luxury (parchment + espresso + classic gold +
  burgundy, Fraunces headings), Midnight (dark-mode), Sunset.
  `Organization.theme` + `buildInlineStyle()` inject CSS vars
  (`--background`, `--foreground`, `--accent`, `--pop`,
  `--heading-font-family`, …). Templates never import theme code.
- **Seasonal overlays** — `Organization.seasonalOverlay`
  (`snow | autumn | confetti | none`). `components/menu/SeasonalOverlay.tsx`
  renders pure-CSS keyframe animations with `scope: 'viewport' | 'contained'`
  so the Settings preview and the live menu share one component. Respects
  `prefers-reduced-motion`.
- **Header image banner** — `Organization.headerImage`. Landscape
  drop-zone uploader (`components/dashboard/HeaderImageUploader.tsx`, 20 MB
  cap, authed `/api/upload/header`). Public menu puts the image behind the
  restaurant name with a bottom-weighted dark gradient for readability; no
  image → the brand-color gradient fallback. Replacing/removing a header
  cleans up the old R2 object via `after(() => deleteByUrl(prev))` in the
  Organization PATCH (sequential `findUnique` before update is intentional —
  parallelizing would race with the write and orphan the old file).
- **SEO** — programmatic icons + OG images via `next/og` `ImageResponse`,
  per-menu OG card (`revalidate = 3600`), Restaurant→Menu→MenuSection→
  MenuItem JSON-LD on `/m/[slug]`, `robots: { index: false }` on
  dashboard/admin, sitemap, web app manifest, branded favicons.
- **Menu creation UX** — creating a menu now drops you into the editor
  (not the public view). 20 MB client/server cap on menu uploads removed
  (Gemini's API cap still applies). AED added to currency list.
- **Public menu header tightening** — h1 shrunk from `44/56px` to `28/40px`,
  logo from `16/20` to `12/16`, padding reduced. The QRmenucrafter wordmark
  was removed from the public-menu header (it remains in the footer).

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

| Feature                                                                                                  | Status                                                                                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Admin / employee roles                                                                                   | ✅                                                                                                            |
| Admin can manage menus                                                                                   | ✅                                                                                                            |
| Daily specials section                                                                                   | ✅ (0.16)                                                                                                     |
| Best-seller + editorial badges (Chef's Pick, Signature, New, Spicy)                                      | ✅ (0.15 / revised 0.20)                                                                                      |
| Dish photo uploads (+ AI enhancement)                                                                    | ✅ (0.14, Gemini 3.1 flash-image-preview)                                                                     |
| Customizable brand colors + logo + QR                                                                    | ✅                                                                                                            |
| **Call-waiter action bar → tablet / messaging bot**                                                      | ⚠ Button exists on `/m/[slug]` but click still does nothing                                                   |
| WiFi password reveal                                                                                     | ✅ (0.13)                                                                                                     |
| **Multi-language switcher for the public menu** (auto-translate + manual override)                       | ❌ — app i18n is wired via next-intl, but menu _content_ isn't translated                                     |
| Google review redirect button                                                                            | ✅ (0.13)                                                                                                     |
| Social media follow buttons (IG, TikTok, FB)                                                             | ✅ (0.13)                                                                                                     |
| **Owner analytics** — scan counts, views per dish, waiter-call frequency, language breakdown, peak hours | ❌ — start by shipping the event table + instrumentation so there's real data when the dashboard is built     |
| Menu templates (big-bet differentiator)                                                                  | ✅ 2 of 3–5 shipped (0.17) — Editorial + Photo Grid; Chalkboard / Minimal List / Brutalist still on the table |
| Seasonal overlays                                                                                        | ✅ (0.18) — Snow / Autumn / Confetti                                                                          |
| Themes (palette + typography presets)                                                                    | ✅ (0.18) — 5 shipped                                                                                         |
| Header image banner                                                                                      | ✅ (0.21)                                                                                                     |
| SEO (JSON-LD, OG, favicons, sitemap, robots, manifest)                                                   | ✅ (0.19)                                                                                                     |

### Prioritization suggestion

Three gaps remain against the v1 list:

1. **Call-waiter wiring** (small). The Bell button on `/m/[slug]` is wired
   to nothing. Options: (a) tablet URL field on Org + a simple alert page
   that polls for calls; (b) webhook field on Org so owners can route to
   their own system; (c) a lightweight `WaiterCall` table + real-time page
   at `/dashboard/waiter`. (a) or (b) is the fastest path.

2. **Owner analytics** (medium-bigger). Ship in two phases so there's real
   data by the time the dashboard lands:
   - Phase 1 (now): `MenuEvent` table + `POST /api/events` beacon +
     `IntersectionObserver` for dish views. Privacy-friendly (no user id,
     no IP, no fingerprint — just `slug`, `eventType`, `itemId?`, day bucket).
   - Phase 2 (later): `/dashboard/analytics` with Recharts — scan counts,
     views per dish, waiter-call frequency, peak hours.

3. **Multi-language public menu** (biggest). Translate item names +
   descriptions per locale. Data model options:
   (a) JSONB `translations: Record<locale, { name, description }>` on
   `MenuItem` — simple, denormalized.
   (b) `MenuItemTranslation` table — normalized, enables filtering.
   Auto-translate via Gemini on save; owners can override per field.
   Public menu gets a language switcher in the header; falls back to the
   base language when a translation is missing.

### Big-bet differentiator — status

Templates + themes + seasonal overlays are all shipped (0.17 / 0.18).
Two follow-ups worth considering before launch:

- **More templates**. Shipped: Editorial (default) + Photo Grid. Targets
  worth evaluating: Chalkboard (bistro/pub), Minimal List (fine-dining
  single-page), Brutalist (modern-cocktail-bar). Each is ~1 day of work
  once the template shape is set — `components/menu/templates/<id>/Body.tsx`
  - thumbnail + registry entry.
- **Date-scheduled seasonal overlays**. Today the owner manually picks
  snow/autumn/confetti; auto-picking based on the current month (snow Dec–
  Feb, autumn Sep–Nov) would make the feature feel alive without a
  Settings visit.

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
- `Organization.headerImage` is a string URL (Prisma migration
  `20260420100000_org_header_image`). Rotation uses `after()` to delete the
  previous R2 object post-update; if that ever needs to be atomic, add a
  pre-update transaction instead — today's pattern is intentionally
  best-effort.
