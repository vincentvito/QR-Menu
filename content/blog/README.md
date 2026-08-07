# Qtable blog authoring guide

Every post must begin with an approved brief under `content/seo/briefs`. The brief owns the search intent, canonical URL, proof requirements, call to action, and internal-link plan. One useful page should serve one intent; merge overlapping drafts instead of publishing competing URLs.

## Frontmatter

The filename is the slug and must use lowercase words separated by hyphens. Publishing fails loudly for missing fields, invalid dates, duplicate slugs, empty content, and non-draft future dates in production.

```md
---
title: How to Prepare a Restaurant Menu for a QR Launch
heading: Prepare your restaurant menu for a reliable QR launch
description: A practical summary that is specific to this guide.
publishedAt: 2026-08-07
modifiedAt: 2026-08-14
author: Qtable Product Team
authorRole: Restaurant menu workflow reviewers
tags: [QR menus, menu operations]
primaryIntent: prepare a restaurant menu for a QR launch
image: /blog/qr-menu-launch.jpg
imageAlt: A restaurant manager testing a table QR code with a phone
draft: true
---

Write the useful article here.
```

`modifiedAt`, `image`, and `imageAlt` are optional. Image and alt text must be supplied together. Omit both if there is no genuine, approved visual; never add generic imagery only to fill a slot.

## Images and Markdown

- Put editorial images in `public/blog` and reference them as `/blog/file-name.ext`.
- Use descriptive alt text for informative images. Do not put keywords into alt text unless they describe what is visible.
- Markdown supports headings, links, lists, blockquotes, fenced code, tables, and images. Raw HTML is intentionally disabled.
- The page template supplies the single H1. Start article sections at `##`.
- Use descriptive internal-link text. Link only to live routes, and confirm every link during review.

## Editorial review

Before changing `draft` to `false`:

1. Confirm the approved brief and canonical intent still match the draft.
2. Have the named author or responsible team review the article and date.
3. Verify every product detail against the current interface or code, and every external factual claim against a primary source.
4. Include original product proof, examples, or a genuinely useful operating method when the brief calls for it. If proof is unavailable, qualify or remove the claim.
5. Test the article without JavaScript, check heading order and alt text, and open every internal and external link.
6. Run tests, type checking, linting, formatting, and a production build.

Do not publish keyword stuffing, fake first-hand experience, invented customers or statistics, unsourced factual claims, copied competitor text, or thin variations of an existing page. Helpful coverage matters more than post count.

## Updating, merging, and retiring posts

- Change `modifiedAt` only after a substantive update, then recheck claims and links.
- Review each post at least quarterly for product drift, stale sources, weak internal links, and intent overlap.
- When two posts converge on the same intent, keep the stronger canonical, merge unique value into it, and add a permanent redirect from the retired slug before deleting the old file.
- Repair broken internal links in the same change. Record redirects and material reader-facing changes in the changelog.
