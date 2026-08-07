# Plan 002: Build the SEO baseline, keyword map and content briefs

> **Executor instructions**: Follow each step and verification gate. This plan produces research
> artifacts, not production pages. Never invent keyword volume, rankings, conversions or Search
> Console data. Update the status row in `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat f91421b..HEAD -- README.md app/layout.tsx app/page.tsx messages/en.json content/seo plans/README.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction, docs
- **Planned at**: commit `f91421b`, 2026-08-07

## Why this matters

The reference project's repeatable advantage is not merely its blog; it records each cluster's
queries, result-page patterns, intent, competitors and differentiated angle. QR-Menu currently
has seven broad terms in global metadata but no page-to-query map. This plan creates evidence that
prevents guessed topics, duplicate pages and content that attracts visitors who will never use the
product.

## Current state

- `app/layout.tsx:18-26` lists broad phrases such as `digital menu`, `qr menu` and `menu maker`.
- `app/page.tsx:76-84` contains the full acquisition experience in one page.
- `app/page.tsx:109-114` sends "Resources" to the homepage FAQ, not an indexable content hub.
- `README.md` supplies product truths to use in research: photo/PDF/text menu import, branded
  public menus, QR generation, multilingual output, editing, analytics and multiple templates.
- There is no `content/seo` directory or historical SEO baseline in this repository.
- AGENTS.md requires TinyFish for web research when its tools are available.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Inventory routes | `rg --files app | rg '(page|layout|sitemap|robots)\\.(ts|tsx)$'` | route files print |
| Validate cluster JSON | `node -e "JSON.parse(require('fs').readFileSync('content/seo/_clusters.json','utf8')); console.log('valid')"` | prints `valid` |
| Validate CSV presence | `Get-Item content/seo/keyword-map.csv` | file exists and is non-empty |
| Format check | `npm run format:check` | exit 0 after final formatting |

## Suggested executor toolkit

- Use TinyFish search/fetch tools for result-page research when available, per `AGENTS.md`.
- Use an existing authenticated browser only to export Search Console data if the operator has
  authorized access. Do not request or record credentials.

## Scope

**In scope**:

- `content/seo/baseline-2026-08-07.md` (create; use the actual execution date if later)
- `content/seo/_clusters.json` (create)
- `content/seo/keyword-map.csv` (create)
- `content/seo/briefs/*.md` (create only for approved first-cluster pages)
- `plans/README.md` status row

**Out of scope**:

- Production routes or metadata
- Publishing content
- Buying SEO tools, ads or links
- Copying private Search Console exports into git; store only aggregated, non-sensitive findings
- Claiming the Family Photo AI changes caused its growth without time-aligned evidence

## Git workflow

- Branch: `codex/002-seo-research`
- Commit: `docs: add SEO baseline and keyword map`
- Do not push or publish external documents unless instructed.

## Steps

### Step 1: Capture QR-Menu's measurement baseline

Export or request the last 16 months of Search Console performance by query, page, date, country
and device. In the tracked baseline, record date range, filters, total impressions/clicks/CTR,
branded vs non-branded split, top pages/queries, pages with impressions but weak CTR, sitemap and
indexing status, and organic conversions if analytics can segment them. Record `DATA UNAVAILABLE`
for inaccessible fields; never substitute estimates.

Also document the primary conversion event (for example signup started, menu created or trial
started), its analytics event name and current organic conversion rate if available.

**Verify**: `content/seo/baseline-<date>.md` contains a data-source/date-range section and every
metric is either sourced or explicitly `DATA UNAVAILABLE`.

### Step 2: Analyze the successful project without assuming causality

Using Family Photo AI's Search Console export, if authorized and available, create a private
page/query timeline around publication and landing-page changes. In the QR-Menu baseline, record
only generalized lessons: which page types gained impressions, whether clicks followed, query
clusters, lag from publication, and whether branded demand or seasonality explain part of the
change. If the data is unavailable, base the comparison on code architecture and say so.

**Verify**: the baseline has a `Reference project comparison` section separating observed code
patterns, observed metrics and inferences.

### Step 3: Build seed queries from product jobs

Collect language from the landing page, onboarding, import UI, FAQs, support/feedback and Search
Console. Start with the hypotheses in `plans/README.md`, then add real customer wording. Classify
each candidate as transactional, commercial investigation, informational or navigational.

**Verify**: `keyword-map.csv` has columns:
`cluster,query,intent,funnel_stage,target_page,current_page,gsc_impressions,gsc_clicks,gsc_position,product_fit,evidence,status,notes`.
Every row has an intent, product-fit score and evidence source.

### Step 4: Inspect live search results and cluster by shared intent

For every shortlisted cluster, inspect at least three representative queries. Record competitor
types, ranking page types, title patterns, apparent freshness, SERP features and the gap QR-Menu
can fill with firsthand product value. Use batch TinyFish tools for two or more URLs. Do not copy
competitor text. Group queries only when the same page can satisfy them; assign one canonical
target page per intent.

Store this structure in `_clusters.json`: `fetchedAt`, `locale`, `method`, and for each cluster
`anchorQueries`, `intent`, `serpPageTypes`, `competitorTypes`, `titlePatterns`, `userQuestions`,
`ourAngle`, `proofAssets`, `targetPage`, `supportingPages`, `status`.

**Verify**: JSON validation command prints `valid`, and every approved cluster has exactly one
`targetPage`.

### Step 5: Prioritize opportunities

Score each target on product fit (30%), conversion proximity (25%), demonstrated demand (20%),
ability to add original proof (15%) and effort/competition (10%). Document scoring definitions.
Choose one first cluster, one hub, and three to five supporting pages. Reject overlapping targets
or merge them into one brief.

**Verify**: every approved target in `_clusters.json` has a rationale, score and unique primary
intent; no two approved briefs share the same primary query.

### Step 6: Write implementation-ready content briefs

Each brief must include: target user and job, primary intent/query, supporting questions, result
page observations, unique angle, product proof/screenshots required, title/H1 options, outline,
CTA, internal links in/out, schema type, canonical path, author/reviewer, sources and success
metrics. Mark all factual claims needing verification.

**Verify**: each approved target has one brief under `content/seo/briefs/`, and every brief names
its unique canonical path and at least two internal-link destinations.

## Test plan

- Parse `_clusters.json` with Node.
- Check CSV headers and duplicate `target_page` values with a small one-off read-only command.
- Manually review the first cluster for query overlap; if two pages answer the same job, merge
  them before implementation.

## Done criteria

- [ ] Baseline distinguishes sourced data, missing data and inference.
- [ ] Keyword map connects every approved query to one page and one intent.
- [ ] Cluster file is valid JSON and documents live result-page evidence.
- [ ] One first cluster and three to five supporting pages are approved.
- [ ] Briefs contain original proof requirements and internal-link maps.
- [ ] No private raw exports or credentials are committed.
- [ ] `npm run format:check` exits 0.
- [ ] `plans/README.md` status is updated.

## STOP conditions

- The operator expects numerical Search Console conclusions but no export/access is available.
- Search results show that a proposed query has an intent the product cannot honestly satisfy.
- Two planned pages cannot be given materially different user jobs and content.
- Research would require paid access or external publication not authorized by the operator.

## Maintenance notes

Refresh the query/page map monthly from Search Console and the live results quarterly. A keyword
map is a routing document, not a one-time deliverable: update targets when Google reveals a
different query interpretation or when two pages begin competing.

