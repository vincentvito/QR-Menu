# Qtable launch plan — 2026-04-27

Sequenced so each phase unblocks the next. Check off as you go.

## Phase 1 — Infra ✅ DONE

- [x] **R2 bucket** — `qtable` bucket created in own Cloudflare account; CORS policy applied for `qtable.ai`, `www.qtable.ai`, `localhost:3000/3001` (GET/HEAD).
- [x] **Public domain bound** — `cdn.qtable.ai` → `qtable` bucket.
- [x] **Local `.env`** — `CLOUDFLARE_BUCKET_NAME=qtable`, `CLOUDFLARE_PUBLIC_URL=https://cdn.qtable.ai`.
- [x] **Migrate objects** — `rclone copy screenslick:screenslick/qrmenucrafter/ qtable:qtable/` → 34 objects, 35.36 MiB. Stored under `qtable/` prefix in the new bucket (URLs are `cdn.qtable.ai/qtable/...`).
- [x] **DB URL swap** — `qrmenucrafter` schema, ran the migration. Updated rows: `organization.logo` 2, `restaurant.logo` 2, `restaurant.headerImage` 1, `menu_item.imageUrl` 26 (31 total). Verified images load from `cdn.qtable.ai`.

### Still TODO before deleting screenslick access

- [x] **Local `.env` R2 creds** — swapped to qtable-account creds.
- [x] **Revoke screenslick invite** — done; prod + local both use qtable-account creds.

## Phase 2 — Domain + deploy ✅ DONE

App is live on `https://qtable.ai`.

- [x] **Vercel** → Project → Settings → Domains → add `qtable.ai` and `www.qtable.ai`.
- [x] **Cloudflare DNS** (grey cloud / DNS-only):
  - `A` record `qtable.ai` → `76.76.21.21`
  - `CNAME` record `www` → `cname.vercel-dns.com`
- [x] **Vercel env vars** set (`NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, `CLOUDFLARE_*`, `EMAIL_*`, Stripe test keys).
- [x] **Deploy** + smoke-test on `https://qtable.ai`.

## Phase 3 — External services

- [x] ~~Google OAuth~~ — **N/A**, not using Google login.
- [x] **ZeptoMail** — `qtable.ai` verified (SPF/DKIM/DMARC), OTP working.
- [ ] **Stripe** — switch to live keys, register webhook at `https://qtable.ai/api/...`, update business profile + branding to Qtable.

## Phase 4 — Stripe end-to-end test (~45min)

Code support for trial start, credit grants, credit packs, cancellation read-only mode, and re-subscribe recovery is implemented. Keep this phase open until the full flow is re-tested after the latest read-only changes.

- [ ] Trial signup → card capture → 5 free credits granted
- [ ] Upgrade plan (monthly + yearly toggle)
- [ ] Buy credit pack ($15 / 100 credits) → credits land
- [ ] Customer portal → cancel → webhook downgrades to read-only
- [ ] Re-subscribe → restored

## Phase 5 — Landing + legal

- [ ] Finish landing page sections — add a real QR code pointing to a real menu as the live demo.
- [ ] Terms + Privacy pages (required for Stripe live).

## Phase 6 — SEO kickoff (post-launch)

- [ ] Submit `https://qtable.ai/sitemap.xml` to Google Search Console + Bing.
- [ ] Verify domain ownership (DNS TXT).
- [ ] Add analytics (GA4 or Plausible).
- [ ] Plan 3–5 cornerstone blog posts + directory listings.

---

**Status (2026-04-28):** 1 ✅, 2 ✅, 3 mostly done (Stripe live keys remaining). Stripe polish code is in; remaining work is Stripe live setup + final E2E retest (3 + 4), landing demo QR + legal pages (5), SEO/analytics kickoff (6).
