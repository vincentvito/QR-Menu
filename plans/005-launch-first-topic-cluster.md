# Plan 005: Launch the first product-led topic cluster and measurement loop

> **Executor instructions**: Publish only the first cluster approved in plan 002. The example
> topics below are hypotheses, not permission to create all of them. Follow the approved briefs,
> run every gate, and update `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat 1267241..HEAD -- app/page.tsx app/qr-menu-from-pdf app/blog components/landing components/marketing components/seo content/seo content/blog messages public app/sitemap.ts app/changelog/page.tsx tests`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/002-build-seo-baseline-and-keyword-map.md,
  plans/003-extend-technical-seo.md, plans/004-add-blog-content-system.md
- **Category**: direction, SEO, product marketing
- **Planned at**: commit `1267241`, reconciled after plans 001-004 on 2026-08-07

## Why this matters

The first cluster proves whether the strategy can earn qualified impressions and conversions
before QR-Menu scales content. The product has unusually strong proof for a likely cluster around
turning an existing restaurant menu into a mobile QR menu: it can import PDF/photo/text, publish a
branded menu, update it instantly and generate a QR code. One coherent hub plus a few genuinely
useful supporting guides gives search engines and users a clearer path than unrelated articles.

## Current state

- `README.md` documents the product capabilities and launch checks that can supply firsthand
  examples.
- The homepage already has product demo, pricing, FAQ content, and a visible blog entry point.
- Plan 002 supplies the approved intent, canonical paths and briefs.
- Plan 003 supplies SEO helpers and tests; plan 004 supplies the blog system.
- The first approved guide, `/blog/turn-menu-photo-into-digital-menu`, is already published as
  the plan 004 pilot. It counts toward the cluster and must not be recreated.
- The seed clusters in `plans/README.md` include QR menu creation, PDF/photo conversion,
  multilingual menus, instant price updates, templates, accessibility and pricing. Only validated
  distinct intents may ship.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Tests | `npm test` | all tests pass |
| Link scan | `rg -n '\]\(/|href="/' content/blog app/solutions app/resources app/page.tsx` | planned internal links print |
| Lint | `npm run lint` | exit 0 |
| Format | `npm run format:check` | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Build | `npm run build` | all cluster routes prerender successfully |

## Suggested executor toolkit

- Use `frontend-design` for landing-page composition and `vercel-react-best-practices` for the
  server-first implementation.
- Use TinyFish for any brief refresh or source verification when available.
- Use official Google Search Central guidance for content, sitemap and structured-data checks.

## Scope

**In scope**:

- The approved hub `/qr-menu-from-pdf` and the three remaining briefs in `content/seo/briefs/`;
  together with the existing pilot, the finished cluster is one hub plus four guides
- The exact canonical paths approved in plan 002: `/qr-menu-from-pdf` for the commercial hub and
  `/blog/` for informational guides
- Shared marketing components under `components/landing/` or a new `components/marketing/`
- `app/page.tsx` and relevant `messages/*.json` for homepage alignment/internal links
- `content/blog/*.md` and `public/blog/*` for approved guides
- SEO registry, sitemap and tests from plans 003-004
- analytics event wiring for the agreed organic conversion
- `app/changelog/page.tsx`
- `plans/README.md`

**Out of scope**:

- Unapproved clusters or mass page generation
- Root-level catch-all `[slug]` routes that could collide with app routes
- Fake testimonials, usage numbers, ratings or competitor claims
- Localized SEO URL expansion unless plan 002 approved a locale-routing migration
- Backlink purchases or automated outreach
- Editing `components/ui/*`

## Git workflow

- Branch: `codex/005-first-seo-cluster`
- Use logical conventional commits, for example `feat: add QR menu solution hub` and
  `content: publish QR menu setup guides`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Lock the cluster and prevent cannibalization

Read the approved briefs and create a one-row-per-page map of primary intent, title, H1,
canonical, CTA and internal links. Run an overlap review: if two pages would give substantially
the same answer, merge them and redirect any existing URL rather than changing wording to force a
difference.

The approved shape is fixed by plan 002:

- commercial hub: `/qr-menu-from-pdf`;
- existing pilot: `/blog/turn-menu-photo-into-digital-menu`;
- comparison: `/blog/pdf-menu-vs-mobile-qr-menu`;
- maintenance guide: `/blog/edit-qr-menu-without-reprinting`;
- launch guide: `/blog/qr-menu-launch-checklist`.

**Verify**: SEO tests or a data-validation test assert unique canonical, title and primary intent
for every cluster page.

### Step 2: Align the homepage with the validated category position

Update the homepage title, description, H1/supporting copy and internal links only where plan 002
shows a clearer primary intent. Preserve the product's voice and conversion design. The H1 should
describe the product naturally; do not force exact-match repetition. Add a visible link to the new
hub and replace the misleading FAQ-only Resources destination with real resource navigation.

**Verify**: rendered homepage has one H1, unique metadata, a link to the cluster hub and no broken
anchor/navigation labels.

### Step 3: Build the commercial hub with product proof

Use a dedicated route under the approved prefix, not a catch-all. Include: direct answer/value
proposition, who it is for, workflow, actual import/output examples, benefits and limitations,
template/examples section, visible FAQs if useful, pricing path and a primary CTA into the real
product flow. Reuse actual product components/assets where possible. Keep it server-rendered and
avoid unnecessary effects or client state.

**Verify**: JavaScript-disabled HTML contains H1, core explanation, proof, CTA and crawlable links;
build lists the route as static/prerendered unless a documented requirement prevents it.

### Step 4: Publish three to five supporting guides

Implement the three remaining approved briefs through the blog system; retain and integrate the
existing pilot as the fourth guide. Each guide must answer its query early,
use original QR-Menu screenshots/workflows, link to the hub and another relevant guide, and end
with a context-appropriate CTA. Cite external facts and identify the author/reviewer. Avoid filler,
generic AI prose and word-count targets.

**Verify**: editorial checklist passes for every guide and tests confirm no duplicate primary
intent or missing inbound/outbound cluster links.

### Step 5: Complete the internal-link graph

The homepage links to the hub; the hub links to every supporting guide; each guide links back to
the hub and at least one sibling where useful; blog index and footer expose the cluster. Use
descriptive anchor text, not repeated exact-match anchors everywhere. Add visible breadcrumbs and
matching Breadcrumb JSON-LD.

**Verify**: a test over the content registry asserts every cluster page has at least one inbound
link and no orphan target.

### Step 6: Verify search readiness

Confirm unique metadata, canonicals, social images, indexability, sitemap coverage, truthful dates,
status 200, mobile rendering, image dimensions/alt text and structured data. Check that no page is
blocked by robots. Validate a deployed preview, then submit the sitemap and request indexing for
the hub and one guide after production deployment.

**Verify**: all automated gates pass; execution report records Rich Results Test/URL Inspection
results and sitemap submission date.

### Step 7: Instrument and run the 90-day feedback loop

Use the primary conversion defined in plan 002. Record publication dates and annotations. At days
28, 56 and 90, compare page/query impressions, clicks, CTR, position, indexed status and organic
conversions against the baseline. For high-impression/low-CTR pages, test title/description changes;
for positions roughly 8-20, improve usefulness and internal links; for overlapping queries, merge
or retarget. Document decisions in the SEO baseline, not the application changelog.

**Verify**: analytics receives the conversion event with landing-page attribution, and scheduled
review dates/owners are recorded in `content/seo/baseline-<date>.md`.

## Test plan

- Unique slug/path, title, H1, canonical and primary intent across cluster records.
- Every cluster route appears in sitemap and is absent from private robots/noindex sets.
- Link graph has no orphan page and all internal targets resolve.
- Draft/unapproved content is excluded from static params and sitemap.
- Structured data is parseable and matches visible breadcrumbs/FAQs.
- Production build succeeds and approved routes are statically rendered where planned.
- Manual mobile checks at narrow and desktop widths; CTA flow completes for anonymous users.

## Done criteria

- [ ] One approved commercial hub and three to five supporting pages are live.
- [ ] Each page has a distinct user intent and original product proof.
- [ ] Homepage, hub, blog and supporting pages form a complete internal-link graph.
- [ ] Metadata, canonicals, sitemap, robots and structured data pass checks.
- [ ] Organic conversion tracking and 28/56/90-day review dates are in place.
- [ ] `npm test`, lint, format check, typecheck and build all pass.
- [ ] User-facing changes are added to the changelog.
- [ ] `plans/README.md` status is updated.

## STOP conditions

- Plan 002 did not approve a first cluster or the briefs still overlap.
- Required product claims cannot be supported by visible product behavior or real evidence.
- Analytics cannot attribute the chosen conversion to an organic landing page.
- The route strategy collides with an existing route or requires a production URL migration not
  covered by the plan.
- Meeting scope would require publishing placeholder/thin content.

## Maintenance notes

Do not launch the second cluster until the first is indexed and its early query data has been
reviewed. Use that evidence to refine templates, content length and internal linking. Quarterly,
refresh successful pages, consolidate overlap and retire pages that cannot earn or convert
qualified traffic after meaningful improvement attempts.
