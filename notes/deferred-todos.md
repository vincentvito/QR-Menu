# Deferred TODOs

Things we've consciously punted on. Revisit when user feedback or a phase
crosses a relevant threshold.

## URL scoping for the dashboard (phase 2b-ii)

**What it is:** Move `/dashboard/settings`, `/dashboard/menus/*` under
`/dashboard/[restaurantSlug]/...` so each restaurant owns its own URL
space. Add redirect shims at every legacy path.

**Why deferred (2026-04-21):** Restaurant owners navigate via the sidebar;
they don't bookmark deep dashboard pages. Deep links to a specific menu
(`/dashboard/menus/<slug>/edit`) already resolve by menu slug regardless
of session state, so cross-teammate sharing already works. Top-level
bookmarks are the only pain point, and that's a rounding error for a
≤5-restaurant-per-account product.

**Revisit when:**
- Customer explicitly asks for bookmarkable per-restaurant pages.
- Dashboard grows analytics/reports pages where the URL "which restaurant
  am I looking at?" becomes genuinely ambiguous.
- We hit a scale where one account has >5 restaurants and the switcher
  flow feels clunky.

**Effort estimate:** ~1 session. Move 8 page files, add redirect shims at
old paths, update sidebar nav links to prepend the active slug. No DB work.

## Per-restaurant logo (schema migration)

**What it is:** Move `logo` off `Organization` onto `Restaurant`. Right
now the logo lives on the organization so every restaurant under an org
shares it. In a multi-restaurant world, each venue wants its own logo.

**Why deferred:** Phase 1 focused on the branding/QR/wifi/social/template
fields that were clearly per-venue. Logo is a minor fourth column that
can ride in its own migration without blocking anything.

**Revisit when:**
- Any user creates a second restaurant under one account.
- Before shipping the "+ Add restaurant" flow publicly (phase 3 territory).

**Effort estimate:** ~20 minutes. Additive column on Restaurant, backfill
from Organization.logo, dual-write in PATCH /api/organizations, update the
sidebar + public menu to read from `restaurant.logo` with fallback.

## Phase 2b-iii: Onboarding post-signup redirect

**What it is:** After onboarding, land the user on `/dashboard/[slug]`
instead of `/dashboard`. Enforce ≥1 restaurant via a "can't delete last
one" guard on the delete-restaurant action (once that action exists).

**Why deferred:** Depends on URL scoping (2b-ii). Without scoped URLs,
there's nothing different to redirect to. The ≥1 enforcement is
independently useful — fold it into whichever phase ships a
restaurant-delete UX.
