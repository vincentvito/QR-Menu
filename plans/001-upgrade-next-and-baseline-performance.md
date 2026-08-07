# Plan 001: Upgrade Next.js and establish a real performance baseline

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If a STOP condition occurs, report it instead of
> improvising. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat f91421b..HEAD -- package.json package-lock.json next.config.ts app/page.tsx app/auth/login/page.tsx app/changelog/page.tsx`
> If an in-scope file changed, compare the current state below with live code before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: migration, performance, security
- **Planned at**: commit `f91421b`, 2026-08-07

## Why this matters

The app already uses Next.js 16, so this is a patch upgrade, not a major migration. It is pinned
to 16.2.6 while npm reported 16.2.12 as stable on 2026-08-07; Next.js also advised 16.x users to
upgrade to at least 16.2.11 for the July 2026 security release. Next.js 16.2 includes faster
server rendering and development startup, but faster navigation should be verified in this app
rather than assumed. The homepage currently performs a session lookup before rendering, which
may prevent the main acquisition page from being fully static.

## Current state

- `package.json:29` pins `next` to `16.2.6`; `package.json:50` pins
  `eslint-config-next` to the same patch.
- `package.json:35-36` pins React and React DOM to `19.2.6`.
- `next.config.ts:5-7` enables experimental View Transitions; preserve this unless the target
  patch rejects the option.
- `app/page.tsx:51-63` reads request headers and the auth session, then changes the CTA between
  `/dashboard` and `/auth/login`. This makes the landing route request-dependent.
- `app/auth/login/page.tsx` is the existing auth gate. Confirm whether it already redirects an
  authenticated user before removing request-time auth from the homepage.
- The repository has no automated test script. Verification currently relies on ESLint,
  Prettier, TypeScript and the production build.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Inspect stable versions | `npm view next version && npm view react version && npm view react-dom version` | prints versions without errors |
| Upgrade | `npm install next@16.2.12 eslint-config-next@16.2.12` | package and lockfile update; exit 0 |
| Lint | `npm run lint` | exit 0 |
| Format | `npm run format:check` | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Build | `npm run build` | exit 0 and route table is printed |

Use the stable version returned by `npm view next version` if it is newer than 16.2.12 when this
plan is executed. Do not install canary, preview or release-candidate builds.

## Suggested executor toolkit

- Use `vercel-react-best-practices` for the homepage static/dynamic review.
- Read `notes/you-might-not-need-effect.md` before changing React code.
- Use official Next.js release notes for migration decisions.

## Scope

**In scope**:

- `package.json`
- `package-lock.json`
- `next.config.ts` only if required by the stable patch
- `app/page.tsx` and `app/auth/login/page.tsx` only for the measured static-homepage change
- `app/changelog/page.tsx` for the user-facing performance/navigation change
- `plans/README.md` status row

**Out of scope**:

- Enabling Cache Components or another experimental caching model
- Broad React refactors
- Changing public-menu data fetching
- Upgrading unrelated dependencies
- Editing any `components/ui/*` shadcn-managed file

## Git workflow

- Branch: `codex/001-next-performance-baseline`
- Use conventional commits matching the repository, for example
  `chore: upgrade Next.js to 16.2.12` and `perf: make marketing homepage static`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Capture the before state

Record Node/npm versions, resolved Next/React versions, `npm run build` duration, the build route
classification for `/`, and three production-mode homepage measurements (TTFB and transferred
HTML size). Save the summary in the PR description or execution report, not a new source file.

**Verify**: `node --version; npm --version; npm ls next react react-dom` -> all versions print and
`npm ls` exits 0.

### Step 2: Upgrade the stable patch as one unit

Confirm the current stable release, then update `next` and `eslint-config-next` to the same stable
patch. Keep React/React DOM aligned with Next's peer requirements. Review lockfile changes and
ensure they are limited to the requested framework packages and unavoidable transitive changes.

**Verify**: `npm ls next eslint-config-next react react-dom` -> one valid version of each and no
peer-dependency errors.

### Step 3: Resolve migration warnings without broad refactoring

Run lint, typecheck and build. Fix only errors introduced by the patch. Preserve
`experimental.viewTransition` if supported; if the stable release replaces or removes it, use the
official migration path and document the behavior change.

**Verify**: `npm run lint; npx tsc --noEmit; npm run build` -> all exit 0.

### Step 4: Determine whether the homepage can be static

Inspect the build output. If `/` is dynamic solely because `app/page.tsx` reads the session,
confirm that `/auth/login` redirects authenticated visitors to `/dashboard`. If it does, remove
the homepage session read and use a stable CTA to `/auth/login`; preserve correct behavior through
the login gate. If it does not, leave the homepage behavior unchanged and report the measured
tradeoff instead of adding client-side auth JavaScript.

Do not claim improvement without comparing the same production-mode measurements from step 1.
Add a concise changelog item if this changes visible CTA behavior or navigation.

**Verify**: `npm run build` -> `/` is static only if behavior is preserved; otherwise the existing
dynamic classification is accepted and documented.

### Step 5: Report measured results

Repeat the exact before measurements. Report patch versions, build duration, route classification,
median TTFB and HTML size, with environment and sample count. Treat small local differences as
inconclusive.

**Verify**: the execution report contains before/after values and does not describe an unmeasured
navigation improvement as fact.

## Test plan

- Manually verify anonymous homepage CTA -> login and authenticated homepage CTA/login gate ->
  dashboard.
- Verify one dashboard navigation and one public-menu navigation in production mode.
- If auth-gate behavior changes, add a focused test using the project's eventual Node test setup;
  otherwise do not introduce a test framework solely for this patch.

## Done criteria

- [ ] Stable Next and `eslint-config-next` versions match and are at least 16.2.12.
- [ ] `npm ls next eslint-config-next react react-dom` exits 0.
- [ ] Lint, format check, typecheck and build all exit 0.
- [ ] Homepage static/dynamic behavior is measured and documented.
- [ ] Anonymous and authenticated CTA flows are verified.
- [ ] Any visible change is added to `app/changelog/page.tsx`.
- [ ] No unrelated dependency or source changes are present.
- [ ] `plans/README.md` status is updated.

## STOP conditions

- Stable npm versions require a React major change or conflict with `next-intl`.
- The patch produces a build/runtime regression that cannot be fixed without broad refactoring.
- Preserving authenticated CTA behavior would require client-side auth on the full homepage.
- The lockfile changes unrelated top-level packages unexpectedly.

## Maintenance notes

Re-check stable Next patches monthly, especially security releases. Keep framework and
`eslint-config-next` patches aligned. Do not enable Cache Components solely because it promises
instant navigation; first identify a route whose measured behavior and cache semantics justify it.

