# Stripe smoke-test findings — 2026-04-28

Issues found while running through the new-user flow on local dev with `stripe listen` forwarding to `localhost:3000/api/auth/stripe/webhook`. Capturing here before fixing so we don't lose context.

## 1. Credits gate on the image endpoints has no actionable CTA

**Where:** `app/api/menus/[slug]/items/[itemId]/enhance-image/route.ts:74`, `app/api/menus/[slug]/items/[itemId]/generate-image/route.ts:68`.

(`app/api/menus/route.ts` was also gated but extraction is now free as of 0.23.1, so menu creation no longer hits this.)

The API returns `{ error: 'Out of AI credits. Buy more or upgrade your plan.', gate: 'credits' }` but every call site on the client just shows the `error` string in a `toast.error()`. The `gate: 'credits'` discriminator is never read.

**User impact:** "Buy more or upgrade your plan" with no button — user is dead-ended on the menu editor with no way to act on the message.

**Fix (refined per testing 2026-04-28):**
- Toast is fine as a transient nudge, but the better surface is an **inline banner directly below the menu editor / item area**: "You're out of AI credits — top up to keep generating dish photos." with a **Buy 100 credits ($15)** button (calls `/api/billing/credit-pack/checkout` directly, same as `BillingPanel.buyCreditPack`) and a secondary **Upgrade plan →** link to `/dashboard/billing`.
- Banner shows whenever `state.credits.total === 0` (or below the cost of the next gated action) — derived from `getBillingState`. Fades in after the user hits the gate at least once, persists until they have credits again.
- Toast still fires on the click that triggered the gate, but uses `toast.error(msg, { action: { label: 'Buy credits', onClick } })` so the user has an immediate path without scrolling. The banner is the durable surface.

## 2. No path to start the trial — new users hit a wall on first paid action

**Confirmed in testing 2026-04-28:** signed up fresh, did onboarding, created a menu (now free), tried to generate a dish image — got "out of credits." Never asked for a card, never told a trial exists, no banner, no CTA. Trial banner only appears when `subscription.status === 'trialing'`, which requires a subscription row, which only exists after Stripe Checkout. Catch-22.

**Where:** `lib/auth.ts:45` — `onTrialStart` grants the 5 trial credits, but only when the Stripe subscription's trial actually starts (after card capture in Checkout). No subscription row = no credits = blocked on every paid action.

**User impact:** A brand-new account looks broken. There's nothing on screen telling them what to do — billing page is buried in the sidebar and nothing pushes them there.

**Fix (the right one, not just a band-aid):**
- After onboarding creates the org, if no subscription exists, redirect to (or open inline) a "Start your 14-day free trial" screen that calls `authClient.subscription.upgrade({ plan: 'trial' or first paid tier, … })` and runs Stripe Checkout for card capture.
- Until they complete it, every credit-gated UI affordance should preview-only / show a "Start trial to use this" badge instead of bouncing them to a dead-end toast.
- After Checkout returns: webhook fires → `onTrialStart` grants credits → banner appears → user can use AI.

## 3. URL extraction should populate restaurant name + description automatically

**Confirmed in testing 2026-04-28:** when the user enters a URL during onboarding, name and description should pre-fill the restaurant fields on the next step.

**Where:** `lib/ai/firecrawl.ts:91-93` — `scrapeBranding` already returns `name` (from ogTitle/title) and `description` (from ogDescription/description). `app/onboarding/OnboardingFlow.tsx:69-77` already maps both into `BrandDraft`. So the wiring exists, but if the source page lacks decent meta tags both come back undefined.

**Likely gap:** Falling back to the markdown body via Gemini when meta tags are missing — extract a restaurant name and a one-sentence tagline from the page content. Worth instrumenting `scrapeBranding` to log when it returns empty for either field so we can see how often it actually misses.

**Fix:** In `lib/ai/firecrawl.ts`, when `name`/`description` come back empty, run a tiny Gemini prompt over the markdown to extract them. Cheap, one call per onboarding, dramatically better first impression.

## 4. Onboarding step order is backwards

**Where:** `app/onboarding/OnboardingFlow.tsx:47` — flow is `url` → `details`. The first screen asks for the restaurant website with zero context; the user's name is buried inside the second screen.

**User feedback:** The first thing should be "Who are you?" (your name), then the restaurant URL, then the auto-extracted brand details to confirm/edit.

**Fix:** Add a leading `'name'` step (or merge name into a "welcome" intro). New flow: `name` → `url` → `details`. Carry `userName` through state as today; the create call already accepts it (`app/api/onboarding/create/route.ts`).

Bonus: skip the name step when `initialUserName` is already non-empty (Better Auth populated it from Google or prior signup) — don't re-ask if we know.

## 5. Credit balance is invisible from the menu editor

**Confirmed in testing 2026-04-28:** while generating dish images, there's no way to see how many credits remain without leaving the editor and going to `/dashboard/billing`. User flies blind through their 5 trial credits.

**Where:** dashboard sidebar (`components/dashboard/...`), menu editor toolbar, and any UI surface adjacent to the generate/enhance buttons.

**Fix options:**
- Persistent credit pill in the dashboard sidebar (e.g. `⚡ 4 credits`) — `getBillingState` already computes the total; surface it in the layout.
- Tooltip / inline counter on the "Generate image" button: `Generate image (1 credit)` so the cost is obvious before clicking.
- After a successful generate/enhance, return the new balance in the API response and update a client-side store so the pill refreshes without a router.refresh().

## 6. No signposting from the menu editor to design / branding settings

**Confirmed in testing 2026-04-28:** after creating their first menu, the user lands on the menu editor. They want to style the public menu (colors, template, header image, logo, QR style, WiFi, etc.) but **nothing on the menu page tells them those settings exist or where to find them**. They eventually have to guess "Settings" in the sidebar.

**Where:** menu editor surfaces (likely under `app/dashboard/menus/[slug]/edit/...`), sidebar nav, and possibly a first-run empty-state banner.

**User feedback:** "I know it's in Settings but it's not clear to me the first time I go into the app, and on the menu page there's nothing that tells me where to go to do that."

**Fix options:**
- Inline tip / callout above the menu items grid for first-time users: "Want to style your menu? Customize colors, template, and branding in Settings →" (dismissible, persisted per-user).
- Persistent secondary nav row at the top of the menu editor with quick links to Settings sub-sections: Brand, Menu design, QR code, WiFi.
- Auto-tour on first menu creation that highlights Settings + the public-menu preview link.

Cheapest, highest-leverage fix is probably the inline callout — one component, no new state machine.

## 7. Post-cancellation state has no orientation / re-subscribe CTA

**Confirmed in testing 2026-04-28:** cancelled trial immediately via Stripe Dashboard. Webhook fires correctly, subscription row gone. Dashboard now says "Not subscribed yet" and trial banner is hidden — but the user has no idea what they can or can't do, and no path to start over.

**Where:** `app/dashboard/billing/BillingPanel.tsx:257` — renders `'Not subscribed yet'` whenever `state.subscription` is null. Doesn't distinguish never-subscribed from canceled-trial.

**Behavioral gaps:**
- No banner on the dashboard explaining "Your trial has ended" or "Subscription canceled"
- No "Restart your trial" or "Re-subscribe" button anywhere obvious — the plan picker further down the page works, but it's unmarked as the way out
- No clarity on what's still allowed: AI actions are gated (correct) but editing text/prices/settings is not (probably correct, but uncommunicated)
- Public menus keep serving (correct and critical) but the user has no confirmation that their guests are still seeing the menu

**Additional confirmed in testing 2026-04-28:**
- After cancellation in the Stripe Dashboard, the **trial banner persisted on the dashboard until I manually refreshed the page**. The webhook had updated the DB but the UI didn't react — no `router.refresh()` triggered, no SSE/poll, no client-side invalidation.
- Once refreshed, the banner is gone but **nothing replaces it** — no indicator anywhere that the user is now in a "no subscription" state. From the user's perspective, the dashboard just looks normal again, even though they can't actually generate AI or, per #8a, create unlimited content.

**Fix:**
- Track "ever subscribed" via a boolean on Organization (or detect via `CreditTransaction` history with `type='grant'` and `reason='trial-start'`).
- When no active sub but ever-subscribed: show a top-of-billing banner. Two copy variants based on what they had before:
  - Trial-canceled / expired: "Your trial ended on {date}. Re-subscribe to keep generating dish photos and stay live with multiple restaurants."
  - Paid-plan canceled: "Your {plan name} subscription ended on {date}. Re-subscribe to keep editing menus and using AI."
  - Both with primary CTA "Pick a plan" (scrolls to plan picker) and dismissible link "Continue in read-only mode".
- Banner is **mandatory** in this state — current behavior shows a near-empty billing page with no signal that anything is wrong. Confirmed in testing 2026-04-28: after canceling and landing on /dashboard/billing, the only hint is a tiny "Not subscribed yet" line in the Current plan card, which reads as never-subscribed not just-canceled.
- Plan-picker section gets a clearer header in this state ("Choose a plan to keep going") instead of looking like a passive comparison.
- **Persistent dashboard-wide banner** (sibling component to TrialBanner) showing "Subscription canceled — re-subscribe to keep editing and generating images" with one-click → billing. Visible everywhere, not just the billing page.
- **Live UI updates on subscription change.** Two paths: (a) cheap — the webhook handler triggers a `revalidatePath('/dashboard', 'layout')` so the next nav re-renders fresh; (b) richer — a small client poll (every 30s on the dashboard) or SSE on `subscription.status` so the banner updates without a refresh. Start with (a); it's free and covers the common case.

## 8a. No-subscription state lets the user keep creating things

**Confirmed in testing 2026-04-28:** cancelled subscription, then created additional menus — the app accepted them. With no subscription:
- `resolvePlan(null)` returns the **trial plan** (`lib/plans.ts:95`) which has `maxMenusPerRestaurant: 5` and `maxRestaurants: 1`.
- So a canceled-trial user can effectively keep using a "trial-equivalent" plan without paying. Not the intended behavior.

**Product decision made 2026-04-28:** Option 1. Public menus stay live after a
subscription is canceled or a trial expires, but dashboard writes become
read-only until the owner picks a plan again.

| State                         | Public menu     | Dashboard editing | Create menu | Create restaurant | AI actions |
|-------------------------------|-----------------|-------------------|-------------|-------------------|------------|
| Trialing                      | live            | full              | ✅ up to 5   | ✅ up to 1         | ✅ via credits |
| Active (paid plan)            | live            | full              | ✅ per plan  | ✅ per plan        | ✅ via credits |
| Active, cancel-at-period-end  | live            | full              | ✅ per plan  | ✅ per plan        | ✅ via credits |
| Canceled / trial expired      | live            | read-only         | ❌          | ❌                | ❌ paused |

**Two policy options considered:**

**Option 1 — public menus keep serving even when the subscription is canceled / trial expired without conversion.**
- Pros: guests with already-distributed QR codes don't see a broken menu; the owner's churn doesn't punish their customers; "public menu uptime" is the value prop.
- Cons: the app keeps doing free hosting work for non-paying users; reduces the urgency to re-subscribe.
- Implementation: only gate the *dashboard* (creation + editing + AI). Public menu route stays open as-is.

**Option 2 — public menus go to a "Menu not available" state when subscription is canceled or expired (including trial expiration without conversion).**
- Pros: clear forcing function — guests scanning a QR get pressure on the owner to re-subscribe; cleaner billing story ("you pay to be live").
- Cons: punishes the owner's customers for the owner's lapsed payment; ugly broken-link experience for guests; might burn goodwill if a card simply expired.
- Implementation: public menu route checks `subscription.status` for the org and renders a polite "This menu is temporarily unavailable" page when not in `active|trialing|past_due`. Owner contact email visible. Maybe a grace period (3-7 days post-expiration) before going dark.

**Trial-expiration-without-conversion case (specifically asked):** today nothing happens — Stripe automatically cancels (no payment method) or fails to charge (card declined). The webhook fires `customer.subscription.deleted` and our DB row goes to `canceled`. From the user's perspective they just lose access silently. Same behavior as a deliberate cancel.

**Recommended default if forced to pick: Option 1 + grace-period banner.** Public menus stay live indefinitely; dashboard goes read-only on day 1 of canceled. After 7 days, send an email warning "menu will go offline if no resubscribe in 7 days" — gives the owner a reason to come back without immediately punishing guests.

**Other parts of the matrix:**
- **Dashboard goes read-only** — same model as the existing read-only mode for restaurants beyond plan cap (`reconcileRestaurantActivation`). User can still view, share QR, see analytics, but can't edit menu text, prices, items, settings, or generate AI.
- **Create endpoints all gate on `subscription.status in ('trialing', 'active', 'past_due')`**. If not, return a 402 with a clear "Re-subscribe to keep editing" message and a CTA to billing. Routes: `/api/menus` (create), `/api/restaurants` (create), all `PATCH/PUT/DELETE` on menus/items/settings.
- **Enforce on the server, not just in UI**. Read-only banner is helpful but the gate must be at the API layer or anyone with cookies can bypass.

This connects to issue #7 (post-cancellation orientation). The fix is two-part: copy + plumbing. First decide the matrix above, then implement.

## 8b. AI image generate/enhance toast swallows API error messages

**Confirmed in testing 2026-04-28:** clicking "Generate image" hit a 404 (root cause unclear — likely dev-server hot-reload churn). The toast just said **"AI request failed"** with no actionable info. The API returned a structured response like `{error: 'Not allowed'}` or `{error: 'Dish not found'}` but the frontend never surfaced any of it. Cost ~30 min of diagnosis to find out the API was actually returning a real message.

**Where:** `components/menu-editor/AIPhotoPanel.tsx:91` (the toast call after a failed POST). Same pattern likely repeats on the enhance-image button.

**Fix:**
- Read the JSON body on non-2xx responses and surface `body.error` in the toast (with a sensible fallback if absent).
- For 4xx responses with a known `gate` discriminator (e.g. `gate: 'credits'`), show the actionable banner / toast action from issue #1.
- Log the full response (status + body) to console for dev visibility — `console.error('[generate-image]', res.status, body)` — so debug doesn't depend on opening the Network tab.

## 9. Billing page conflates bonus and monthly credits

**Confirmed in testing 2026-04-28:** during trial, billing shows **"4 / 30 this month"**. That's misleading — the user has 4 *bonus* credits (5 trial – 1 used) and **0 monthly** credits during trial. The `30` is Basic plan's monthly allowance, but it's not the denominator the `4` is a fraction of.

**Where:** `app/dashboard/billing/BillingPanel.tsx:289-296`. The big number is `state.credits.total = monthly + bonus`, but the "/ N this month" suffix uses `state.plan.monthlyCredits` as the denominator — implying the total is a count of monthly credits, which isn't true when bonus is in the mix.

**User impact:** confusing during trial (no monthly credits exist yet), and even on a paid plan it's not obvious whether the count includes the bonus pack the user just bought.

**Fix:**

When `state.plan.monthlyCredits === null` (trial / no-sub) the billing page already renders the clean shape — confirmed during testing:

```
4
Monthly bucket: 0
Bonus (never expire): 4
```

That's the right pattern. **The active-subscription branch should match this format**, not collapse to "4 / 30 this month".

- Split the two visually. Lead with the most relevant bucket:
  - **Trial / no-sub state (already correct):** big total + breakdown lines for Monthly bucket and Bonus.
  - **Active state:** same shape — drop the misleading "/ N this month" suffix entirely. Keep the breakdown lines visible, optionally with a "of 30 monthly" caption next to the Monthly bucket line so users still see their plan allowance.
- Concretely in `BillingPanel.tsx:289-300`: remove the `totalCreditLimit` denominator from the headline; keep the existing Monthly + Bonus breakdown sublines as the source of truth.

## Status

- ✅ Menu creation no longer spends a credit (0.23.1, 2026-04-28). `MENU_EXTRACTION` removed from `lib/plans/costs.ts`; gate + spend stripped from `app/api/menus/route.ts`.
- ✅ Trial-start step added after onboarding (0.23.3, 2026-04-28). `app/onboarding/start-trial/{page,StartTrialPanel}.tsx`; `OnboardingFlow.createOrganization` now redirects there instead of `/dashboard`.
- ✅ AI credit gates are actionable (0.23.5, 2026-04-28). The menu editor shows an out-of-credits banner; AI generate/enhance toasts expose the API error and include a Buy credits action.
- ✅ URL onboarding fills name/description more reliably (0.23.5, 2026-04-28). Firecrawl branding now requests markdown too; Gemini fills missing restaurant name/description from page text.
- ✅ Onboarding order changed to name → URL → details (0.23.5, 2026-04-28). Known user names skip the name step.
- ✅ Credit balance is visible in the menu editor (0.23.5, 2026-04-28). The editor toolbar shows the current AI credit count and decrements after successful AI image generation/enhancement.
- ✅ Menu editor now signposts Settings (0.23.5, 2026-04-28). Inline callout links users to branding, template, QR, WiFi, and header-image settings.
- ✅ Post-cancellation/read-only policy implemented (0.23.5, 2026-04-28). Dashboard shows a subscription-ended banner, Billing explains the state, public menus stay live, and dashboard write APIs return a 402 gate.
- ✅ Canceled/expired subscriptions can no longer keep creating/editing for free (0.23.5, 2026-04-28). Server gates cover menu creation, menu/item edits, settings, uploads, AI image actions, restaurant creation/activation, staff invites/removals, and credit-pack checkout.
- ✅ Billing credit display no longer conflates monthly and bonus credits (0.23.5, 2026-04-28). Big number is total; monthly and bonus buckets are shown separately.
- ✅ FAQ updated (0.23.5, 2026-04-28). Landing FAQ now answers "What happens if my subscription expires?"

## Remaining launch tasks from this finding set

- [ ] Re-run Stripe cancellation/regression test after the new read-only policy:
  - Start trial → credits granted.
  - Cancel subscription/trial → dashboard banner appears.
  - Public menu URL still loads.
  - Menu edits, new menus, settings, uploads, staff changes, credit-pack checkout, and AI image actions are blocked with a clear 402 message.
  - Re-subscribe → dashboard editing and plan caps restore.
- [ ] Confirm Customer Portal return path refreshes the dashboard state after cancellation. If canceling from the Stripe Dashboard while the app is already open, the user may still need a refresh; live polling/SSE is optional post-launch polish.
- [ ] Decide later whether to add expiration warning emails. Current launch policy keeps public menus live indefinitely and pauses dashboard writes immediately after cancellation/expiration.

## Test environment

- Local dev: `npm run dev` on `localhost:3000`
- Webhooks: `stripe listen --forward-to localhost:3000/api/auth/stripe/webhook` (CLI-only, no ngrok needed)
- Stripe in test mode; webhook secret from `stripe listen` lives in `.env.local`
- Account `vlad.palacio@gmail.com` was wiped via `scripts/delete-account.ts` to reproduce a fresh-user flow
