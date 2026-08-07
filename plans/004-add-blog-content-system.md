# Plan 004: Add a safe, maintainable blog and editorial workflow

> **Executor instructions**: Build the content system, not a batch of speculative articles.
> Publish only the approved briefs from plan 002. Follow every verification gate and update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat df530dd..HEAD -- app components lib content public package.json package-lock.json tests app/changelog/page.tsx`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-upgrade-next-and-baseline-performance.md,
  plans/002-build-seo-baseline-and-keyword-map.md, plans/003-extend-technical-seo.md
- **Category**: direction, architecture, SEO
- **Planned at**: commit `df530dd`, 2026-08-07 (reconciled after plans 001-003)

## Why this matters

QR-Menu needs indexable answers to customer questions and a repeatable way to publish them. The
reference project uses local Markdown, static params, page-specific article metadata, BlogPosting
schema and related-post links. A similar system is appropriate here because content can ship with
the app, remain code-reviewed and render as server HTML. The system must resist unsafe raw HTML,
draft leakage and duplicate slugs.

## Current state

- There is no `content/blog`, `app/blog`, blog data loader or Markdown renderer.
- `app/page.tsx:109-114` labels an FAQ anchor as "Resources".
- The existing visual language lives in `app/page.tsx`; reuse its spacing, typography, brand mark,
  `PillButton` and footer patterns without editing shadcn-managed files.
- `lib/site.ts:1-21` is the canonical source for brand name, domain and default social image.
- Plan 003 created typed SEO helpers in `lib/seo.ts`, a safe JSON-LD component at
  `components/seo/JsonLd.tsx`, eight SEO tests, and the Node test command.
- Family Photo AI's useful reference shapes are `src/lib/blog.ts:25-114` and
  `src/app/blog/[slug]/page.tsx:17-97`, but its parser catches malformed posts and silently returns
  null. QR-Menu should fail validation loudly during tests/build.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install parser | `npm install react-markdown remark-gfm` | exit 0; lockfile updated |
| Tests | `npm test` | all tests pass |
| Lint | `npm run lint` | exit 0 |
| Format | `npm run format:check` | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Build | `npm run build` | `/blog` and approved posts are prerendered |

If the project already gained an approved Markdown/MDX stack after this plan was written, reuse it
instead of installing a second renderer.

## Suggested executor toolkit

- Use `frontend-design` for the blog index/post layout while preserving the existing brand.
- Use `vercel-react-best-practices`; blog rendering should remain server-first with minimal JS.
- Read Google's people-first content guidance before creating the authoring template.

## Scope

**In scope**:

- `content/blog/*.md`
- `content/blog/README.md` authoring template
- `lib/blog.ts`
- `components/blog/MarkdownContent.tsx`
- `components/blog/BlogCard.tsx` if useful
- `app/blog/page.tsx`
- `app/blog/[slug]/page.tsx`
- `public/blog/*` for approved article images
- `app/page.tsx` and its translation messages for real Blog/Resources navigation
- SEO registry/sitemap helpers from plan 003
- `tests/blog.test.ts`
- `package.json`, `package-lock.json`
- `app/changelog/page.tsx`
- `plans/README.md`

**Out of scope**:

- A hosted CMS, database-backed editor or admin publishing UI
- Raw HTML in Markdown
- Comments, likes, RSS/email subscriptions or author accounts
- More than one pilot article in this foundation plan; plan 005 owns the first cluster
- Editing `components/ui/*`

## Git workflow

- Branch: `codex/004-blog-content-system`
- Commit: `feat: add SEO blog and editorial workflow`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Define and validate the post contract

Create a typed frontmatter contract with: `slug` derived from filename, `title`, `description`,
`publishedAt`, optional `modifiedAt`, `author`, `authorRole`, `tags`, `primaryIntent`, `image`,
`imageAlt`, `draft`, and `content`. Reject missing required fields, invalid dates, duplicate slugs,
empty content, future publication dates in production and draft posts in production output.
Estimate reading time from plain content. Keep parsing synchronous at build time unless the
selected library requires otherwise.

**Verify**: tests cover one valid post and each invalid condition; `npm test` passes.

### Step 2: Implement safe server-side Markdown rendering

Use `react-markdown` and `remark-gfm`. Do not enable raw HTML. Map headings, links, lists, code,
tables and images to accessible styled elements. Internal links use `next/link`; images under
`public/blog` use `next/image` with known dimensions supplied by frontmatter or a constrained
component. External links must be clearly external and use safe rel attributes when opening a new
tab.

**Verify**: a test confirms raw `<script>`/HTML is not rendered as executable markup and internal
links remain valid.

### Step 3: Build the blog index

Create `/blog` as a server-rendered index of published, non-draft posts sorted newest first. Give
it unique metadata, H1 and introductory copy tied to the approved content territory. Cards show
title, description, image, date, reading time and relevant tag. Include normal crawlable links,
not click handlers.

**Verify**: `npm run build` lists `/blog`; inspecting built/rendered HTML shows links to each pilot
post and excludes drafts.

### Step 4: Build statically generated article pages

Create `/blog/[slug]` with `generateStaticParams`, `generateMetadata`, a visible byline/date,
updated date where applicable, hero image, article body, contextual product CTA and up to three
related posts scored by shared tags/cluster. Emit BlogPosting and Breadcrumb structured data using
plan 003 helpers. Unknown/draft slugs return 404 in production.

**Verify**: build output includes the pilot slug; metadata canonical and JSON-LD use the same URL;
the page works with JavaScript disabled.

### Step 5: Connect the blog to the site architecture

Change the homepage navigation so "Resources" leads to `/blog` or rename it to "Blog" according
to approved copy. Keep the FAQ anchor available through an accurate link if needed. Add Blog to
the footer and add contextual links from relevant acquisition pages. Add blog URLs and truthful
post dates to the sitemap.

**Verify**: `rg "href=.*blog" app components` shows homepage/footer and contextual inbound links;
SEO tests confirm blog sitemap entries.

### Step 6: Document the editorial quality gate

In `content/blog/README.md`, provide frontmatter example, image rules, review checklist, internal
link rules, source/citation expectations, update/merge/redirect procedure and the requirement that
every post come from an approved brief. Require original product screenshots, examples or lessons
where relevant. Explicitly prohibit keyword stuffing, fake expertise, unsourced claims and
near-duplicate posts.

**Verify**: the template contains all required fields and an overlap/cannibalization check.

### Step 7: Add one pilot post and changelog entry

Implement the highest-priority supporting brief from plan 002 as an end-to-end fixture. It must be
fully useful, reviewed and linked; do not use placeholder copy. Add a concise changelog item for
the new resources/blog experience.

**Verify**: all global gates pass and a preview renders correctly on mobile and desktop.

## Test plan

- Valid/invalid frontmatter, duplicate slug, draft exclusion and deterministic sorting.
- Reading-time calculation handles empty and normal posts.
- Related posts exclude the current post and rank shared tags first.
- Raw HTML is not executable.
- Metadata, canonical, article JSON-LD and sitemap URL agree.
- Unknown/draft production slug yields 404 behavior.

## Done criteria

- [ ] Blog index and pilot article are rendered in server HTML and prerendered.
- [ ] Drafts cannot appear in production index, static params or sitemap.
- [ ] Every post has unique metadata, canonical, visible author/date and BlogPosting schema.
- [ ] Related content and product CTAs are crawlable links.
- [ ] Authoring guide prevents duplicate, thin and unsafe content.
- [ ] `npm test`, lint, format check, typecheck and build pass.
- [ ] Homepage/footer navigation and changelog are updated.
- [ ] `plans/README.md` status is updated.

## STOP conditions

- Plan 002 has no approved pilot brief.
- Plan 003's SEO helpers or URL registry are incomplete.
- An existing Markdown/MDX stack conflicts with the proposed dependencies.
- The design requires editing a shadcn-managed `components/ui/*` file.

## Maintenance notes

Every post needs an owner and review date. Quarterly, merge or redirect overlapping posts, update
outdated claims and repair broken links. More output is not the goal; useful pages that convert
qualified users are.
