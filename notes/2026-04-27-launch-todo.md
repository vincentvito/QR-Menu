# Qtable launch plan — 2026-04-27

Sequenced so each phase unblocks the next. Check off as you go.

## Phase 1 — Infra ✅ DONE

- [x] **R2 bucket** — `qtable` bucket created in own Cloudflare account; CORS policy applied for `qtable.ai`, `www.qtable.ai`, `localhost:3000/3001` (GET/HEAD).
- [x] **Public domain bound** — `cdn.qtable.ai` → `qtable` bucket.
- [x] **Local `.env`** — `CLOUDFLARE_BUCKET_NAME=qtable`, `CLOUDFLARE_PUBLIC_URL=https://cdn.qtable.ai`.
- [x] **Migrate objects** — `rclone copy screenslick:screenslick/qrmenucrafter/ qtable:qtable/` → 34 objects, 35.36 MiB. Stored under `qtable/` prefix in the new bucket (URLs are `cdn.qtable.ai/qtable/...`).
- [x] **DB URL swap** — `qrmenucrafter` schema, ran the migration. Updated rows: `organization.logo` 2, `restaurant.logo` 2, `restaurant.headerImage` 1, `menu_item.imageUrl` 26 (31 total). Verified images load from `cdn.qtable.ai`.

### Still TODO before deleting screenslick access

- [ ] **Local `.env` R2 creds** — replace screenslick-account creds with qtable-account creds: `CLOUDFLARE_BUCKET_API`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`. Then dev uploads also go to the new bucket.
- [ ] **Revoke screenslick invite** — once local + prod both use qtable-account creds.

## Phase 2 — Domain + deploy (~30min)

DNS at Cloudflare, app at Vercel.

- [ ] **Vercel** → Project → Settings → Domains → add `qtable.ai` and `www.qtable.ai`.
- [ ] **Cloudflare DNS** (grey cloud / DNS-only):
  - `A` record `qtable.ai` → `76.76.21.21`
  - `CNAME` record `www` → `cname.vercel-dns.com`
- [ ] **Vercel env vars**:
  - `NEXT_PUBLIC_APP_URL=https://qtable.ai`
  - `BETTER_AUTH_URL=https://qtable.ai`
  - `CLOUDFLARE_PUBLIC_URL=https://cdn.qtable.ai`
  - `CLOUDFLARE_BUCKET_NAME=qtable`
  - new `CLOUDFLARE_BUCKET_API` / `CLOUDFLARE_ACCESS_KEY_ID` / `CLOUDFLARE_SECRET_ACCESS_KEY` (qtable account)
  - `EMAIL_FROM=noreply@qtable.ai`, `EMAIL_FROM_NAME=Qtable`, `EMAIL_REPLY_TO=noreply@qtable.ai`
  - real `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (live keys come in Phase 3)
- [ ] **Deploy** + smoke-test on `https://qtable.ai`: `/`, OTP login, dashboard, public menu, images from `cdn.qtable.ai`.

## Phase 3 — External services (~1hr)

- [ ] **Google OAuth** — add `https://qtable.ai` to authorized origins + redirect URIs.
- [ ] **ZeptoMail** — verify `qtable.ai` (SPF, DKIM, DMARC); send test OTP.
- [ ] **Stripe** — switch to live keys, register webhook at `https://qtable.ai/api/...`, update business profile + branding to Qtable.

## Phase 4 — Stripe end-to-end test (~45min)

- [ ] Trial signup → card capture → 5 free credits granted
- [ ] Upgrade plan (monthly + yearly toggle)
- [ ] Buy credit pack ($15 / 100 credits) → credits land
- [ ] Customer portal → cancel → webhook downgrades to read-only
- [ ] Re-subscribe → restored

## Phase 5 — Landing + legal

- [ ] Finish landing page sections.
- [ ] Terms + Privacy pages (required for Stripe live + OAuth verification).

## Phase 6 — SEO kickoff (post-launch)

- [ ] Submit `https://qtable.ai/sitemap.xml` to Google Search Console + Bing.
- [ ] Verify domain ownership (DNS TXT).
- [ ] Add analytics (GA4 or Plausible).
- [ ] Plan 3–5 cornerstone blog posts + directory listings.

---

**Order for today:** 1 ✅ → 2 → 3 → 4 (product proven end-to-end on new domain), then 5, then 6.
