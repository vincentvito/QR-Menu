# Call-waiter feature — design notes

## Two QR modes

Not every restaurant wants service features. A café or bakery just wants
their menu online; a dine-in restaurant wants call-waiter (and later,
ordering). Reflect this in a per-restaurant **Table service** toggle in
Settings.

- **Global QR** (`/m/[slug]`) — always exists. Menu browsing only, no
  call button, no table badge. The "one QR on the wall" flow.
- **Table QR** (`/m/[slug]/t/[tableId]`) — only relevant when Table
  service is on. Sets a short-lived cookie `{ restaurantSlug, tableId }`
  (e.g. 4–6 h) on first load. Unlocks the call button (and future
  ordering). Bare `/m/[slug]` still works for walk-bys / takeout even
  when Table service is on, but shows no call button there.

When Table service is **off**, the QR dashboard page shows only the
global QR. When **on**, it also shows a "Generate table QRs" section.

## v1 route + auth behavior

**Call button**
- Only rendered when (a) Table service is on for the restaurant *and*
  (b) the table cookie is present.
- POSTs `/api/call-waiter` with `{ tableId, reason? }`.
- Rate-limited on the server by cookie id + IP + tableId
  (e.g. 1 call / 90 s per table, burst of 3).

**Dashboard — staff inbox**
- New dashboard surface showing incoming calls in real time (start
  with polling every 10 s; upgrade to SSE/WebSocket later if needed).
- Each call has dismiss / acknowledged / handled states + a small sound
  cue on new arrivals.
- Retention: auto-archive after 30 min.

**Table QR generation**
- Extension of the existing per-menu QR page (`/dashboard/menus/[slug]/qr`):
  let owners pick a count (e.g. 1–50), export as PDF or ZIP of SVGs
  with each QR labeled "Table N".

**Abuse model**
- Photographed QR from the street → covered by the rate limit + staff
  dismissal. Acceptable residual risk.
- No geolocation. Intrusive permission prompt, poor accuracy (10–100 m),
  iOS Safari quirks — not worth it.

## v2 idea: branded NFC coasters (premium upsell)

Same underlying URL as the QR, delivered via NFC tag instead. Not a
security improvement — identical abuse surface — but:

- Nicer UX (tap vs scan).
- Harder to photograph from across the room.
- Differentiator for higher-tier plans.

**Potential shape**: offer branded NFC coasters as an add-on you sell
through the app (Business/Enterprise perk). Restaurant orders a batch,
we fulfill and bill via Stripe.

**Caveats before committing**:
- $0.30–$1/tag hard cost.
- ~5–10 % of phones either have NFC off or need the Shortcuts app.
- Physical fulfillment = operational complexity (stock, shipping,
  returns). Probably partner with a print-on-demand NFC vendor rather
  than hold inventory.

Parking this for post-v1. Revisit once table QR is shipped and we see
real usage patterns.
