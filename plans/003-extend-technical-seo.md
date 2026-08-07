# Plan 003: Extend technical SEO to every acquisition route

> **Executor instructions**: Follow this plan after plans 001 and 002. Structured data must match
> visible page content; do not add markup merely because a schema type exists. Update the status
> row in `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat 3fa87fe..HEAD -- app/layout.tsx app/sitemap.ts app/robots.ts app/page.tsx app/changelog/page.tsx lib/site.ts lib/seo.ts components/seo tests package.json`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-upgrade-next-and-baseline-performance.md,
  plans/002-build-seo-baseline-and-keyword-map.md
- **Category**: correctness, SEO, tests
- **Planned at**: commit `3fa87fe`, 2026-08-07 (reconciled after plans 001-002)

## Why this matters

QR-Menu handles customer-menu SEO thoughtfully, but new acquisition pages need the same reliable
rules. The root canonical `/` can be inherited by routes that do not override metadata, and the
static sitemap currently includes only `/` and `/changelog`. Static entries also receive a fresh
`lastModified` value on every sitemap generation, even when content did not change. This plan
creates one tested source of truth for metadata, canonicals, structured data and sitemap entries.

## Current state

- `app/layout.tsx:10-74` defines global metadata and canonical `/`.
- `app/sitemap.ts:7-23` sets `lastModified` from `new Date()` for the homepage and changelog;
  `app/sitemap.ts:46-54` correctly uses each public menu's `updatedAt`.
- `app/robots.ts:4-26` correctly separates public and private surfaces.
- `app/page.tsx:974-1025` renders six visible FAQs but does not emit FAQ structured data.
- `app/m/[slug]/page.tsx:30-58` is the existing example for page-specific metadata;
  `app/m/[slug]/page.tsx:209-258` emits restaurant/menu structured data.
- The app has no test command or technical-SEO tests. Next.js and `eslint-config-next` are now
  aligned at 16.3.0 from plan 001.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Tests | `npm test` | all tests pass |
| Lint | `npm run lint` | exit 0 |
| Format | `npm run format:check` | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Build | `npm run build` | exit 0; acquisition routes listed |

## Suggested executor toolkit

- Follow Next.js Metadata API documentation for the installed stable patch.
- Validate deployed examples with Google Rich Results Test and URL Inspection.
- Use `vercel-react-best-practices`; keep acquisition content in Server Components.

## Scope

**In scope**:

- `lib/site.ts`
- `lib/seo.ts` (create)
- `components/seo/JsonLd.tsx` (create; do not place project logic under shadcn-managed files)
- `app/layout.tsx`
- `app/page.tsx`
- `app/sitemap.ts`
- `app/robots.ts` only if new public prefixes need explicit allowance
- `tests/seo.test.ts` (create)
- `package.json` for a Node test command
- `app/changelog/page.tsx`
- acquisition routes approved in plan 002 as they are added by later plans
- `plans/README.md` status row

**Out of scope**:

- Changing public menu eligibility or subscription queries
- Adding fake ratings/reviews, unsupported Product offers or hidden FAQ text
- Indexing dashboard, admin, auth, onboarding, API or invitation routes
- Editing `components/ui/*`
- Implementing locale-prefixed SEO routes without a separate decision and URL migration plan

## Git workflow

- Branch: `codex/003-technical-seo-foundation`
- Commit: `feat: add acquisition SEO foundation`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a typed SEO source of truth

Create `lib/seo.ts` with typed acquisition-route records: path, title, description, social image,
published/modified dates, change frequency, priority, indexability and optional breadcrumb data.
Populate only routes that exist. Use `SITE_URL` from `lib/site.ts`; do not duplicate fallback
domains. Add a helper for absolute URLs and a metadata builder that always supplies a unique
self-referencing canonical and matching Open Graph URL.

**Verify**: `npx tsc --noEmit` -> exit 0, and `rg "NEXT_PUBLIC_APP_URL" lib app | Select-String -NotMatch 'lib/site.ts'` reveals no newly duplicated URL fallback.

### Step 2: Correct page-level canonical ownership

Keep global title/description/brand defaults in `app/layout.tsx`, but do not let `/` be the
canonical for unrelated pages. Give every indexable static acquisition page its own metadata.
Give low-value public utility pages such as changelog either an accurate self-canonical or an
explicit noindex decision documented in the route record. Preserve noindex metadata for private
layouts.

**Verify**: tests assert unique canonical URLs for all indexable route records and no canonical
points to `/` unless the route path is `/`.

### Step 3: Add accurate structured data

Create a server-only JSON-LD component that serializes data without allowing raw user-provided
script markup. Add Organization and WebSite data where visible brand facts support them. Add
SoftwareApplication only if the required visible product facts are present. Add BreadcrumbList to
pages with visible breadcrumbs and Article/BlogPosting to blog posts in plan 004. If FAQ markup is
used, it must exactly match the visible homepage questions/answers; note that eligibility is not
guaranteed and FAQ rich results are restricted.

Escape `<` in serialized JSON (`JSON.stringify(data).replace(/</g, '\\u003c')`) to avoid script
termination hazards.

**Verify**: unit tests parse the generated JSON, assert the expected type and confirm visible FAQ
text equals marked-up FAQ text.

### Step 4: Make sitemap dates and coverage truthful

Generate static sitemap entries from the typed route records. Use source-controlled published or
modified dates; never set `lastModified` to request time unless the page actually changed then.
Keep eligible public menu entries derived from `menu.updatedAt`. Include only canonical,
indexable, successful routes. Add blog entries from their frontmatter in plan 004.

**Verify**: tests assert that private paths are absent, every approved acquisition path is present,
URLs are absolute and unique, and static dates are deterministic.

### Step 5: Preserve robots boundaries

Confirm the new `/blog/` and chosen acquisition prefix (for example `/solutions/` or
`/resources/`) are crawlable. Do not loosen existing private-route disallows. Verify that a page
is not simultaneously intended for indexing and blocked.

**Verify**: tests compare indexable route prefixes with robots rules and fail on conflicts.

### Step 6: Add a lightweight test baseline

Add `"test": "node --import tsx --test tests/*.test.ts"` to `package.json`, matching the existing
`tsx` development dependency. Create `tests/seo.test.ts` around pure helpers/data rather than
starting a browser or database.

**Verify**: `npm test` -> all SEO tests pass without network or database access.

### Step 7: Validate a deployed preview and update changelog

On a preview deployment, inspect rendered HTML, canonical, robots meta, sitemap and JSON-LD for
the homepage and one acquisition page. Run Google's Rich Results Test. Add a concise user-facing
changelog item describing improved discoverability, not internal helper names.

**Verify**: record tested URLs and validation results in the execution report; all global gates
pass.

## Test plan

Model tests after Node's built-in `node:test` style. Cover:

- unique and absolute canonicals;
- private paths excluded from sitemap;
- deterministic `lastModified` for static content;
- public menu dates remain data-driven;
- JSON-LD is parseable and escapes `<`;
- structured FAQ content matches visible data if FAQ markup is retained;
- no indexable path conflicts with robots rules.

## Done criteria

- [ ] Every indexable acquisition route has unique metadata and self-canonical.
- [ ] Sitemap contains every canonical acquisition page and no private page.
- [ ] Static `lastModified` values do not change on every request/build.
- [ ] Structured data matches visible content and passes validation.
- [ ] `npm test`, lint, format check, typecheck and build all pass.
- [ ] Existing public-menu SEO behavior remains intact.
- [ ] Changelog and `plans/README.md` are updated.

## STOP conditions

- The approved URL structure from plan 002 is missing or still disputed.
- Adding locale alternates would require changing existing production URLs.
- A schema requires factual fields the visible product does not currently provide.
- Technical changes alter public-menu subscription/indexing behavior.

## Maintenance notes

New acquisition routes must be added to the typed route source and tests in the same PR. Review
sitemap dates and structured data whenever copy or pricing changes. Do not treat valid markup as a
guarantee of a rich result.
