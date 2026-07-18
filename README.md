# BMW Estimate Check

Stop overpaying for BMW repairs. Upload a mechanic estimate (PDF or photo),
let the app extract every part and labor line, compare it against OEM and
premium-aftermarket part prices, and order the parts.

**Runs locally for free.** Checkout works in demo mode out of the box; add
free Stripe test keys when you want real (or test) card payments.

## Quick start (nothing to sign up for)

```bash
npm install
npm run db:local        # terminal 1 — free embedded PostgreSQL, keep running
npx prisma migrate dev  # terminal 2 — creates tables
npm run db:seed         #             loads 31 BMW parts + demo vehicles
npm run dev             #             starts the site
```

Open http://localhost:3000. That's it — everything works:

- No sign-in: you're automatically the owner (and admin) of your local install.
- Estimate uploads are saved to `public/uploads/` on your own disk.
- Estimate parsing is built in and free: text PDFs are parsed directly, and
  photos/screenshots are read with local OCR (tesseract.js) — no AI account
  needed for either.
- Checkout collects home or Mechanic Delivery details. With Stripe keys set,
  customers pay by card on Stripe's secure page. Without keys, orders complete
  in demo mode (no charge) so you can still test the full flow.

## Features

- **Estimate parsing** — extracts parts, quantities, OEM part numbers, labor,
  and totals from uploaded estimates, validated with Zod.
- **Comparison engine** — exact OEM part-number matching first, then semantic
  description matching filtered by BMW model/year fitment, with brand-quality
  tie-breaking (Genuine BMW → OE suppliers → aftermarket).
- **Savings display** — dollar savings, percentage savings, total project
  savings, and an estimated fair-labor range.
- **Affiliate buy links** — every matched part links to Amazon, eBay, RockAuto,
  and FCP Euro so visitors can buy cheaper parts online (your commission when
  affiliate IDs are set in `.env`).
- **Searchable parts catalog** — filter by model, year, brand, and category.
- **Mechanic Delivery** — first-class checkout choice: ship home or ship
  directly to your shop, with appointment date, delivery ETA warnings,
  favorite mechanics in the Garage, order tracking, and local email notices.
- **Cart + checkout** — quantity controls, shipping estimate, local checkout
  with home or mechanic destination.
- **Order management** — statuses `PENDING → PAID → FULFILLING → SHIPPED →
  DELIVERED` (or `CANCELLED`) for manual fulfillment.
- **Admin panel** (`/admin`) — analytics (revenue, average savings, top BMW
  models), order status management, CSV export, inventory price/stock editing,
  estimate review with AI-match override, and user list.
- **SEO** — dynamic metadata, Open Graph tags, JSON-LD, sitemap/robots, and
  four repair-cost landing pages.

## Optional: AI parsing (free options)

The built-in parser handles text PDFs directly and reads photos/screenshots
with free local OCR — no AI needed for anything. If you want potentially higher
accuracy on messy handwritten or low-quality photos, you can optionally plug in
any OpenAI-compatible provider via `.env` — free options (exact values in
`.env.example`):

- **Google Gemini** — generous free tier, no credit card
  ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))
- **Groq** — free tier with vision models
  ([console.groq.com/keys](https://console.groq.com/keys))
- **Ollama** — 100% local and free ([ollama.com](https://ollama.com))

If an AI call fails at runtime, the app automatically falls back to the
built-in parser (PDF text or OCR) instead of failing the estimate.

## Taking card payments (Stripe — free to start)

1. Create a free Stripe account: [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Open **Developers → API keys** (stay in **Test mode** first).
3. Paste the **Secret key** (`sk_test_…`) into `.env` as `STRIPE_SECRET_KEY`.
4. Restart `npm run dev`. Checkout buttons become **Pay with card** and send
   customers to Stripe to enter their card.
5. Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
6. When you're ready for real money, toggle Stripe to **Live mode**, put the
   live secret key in `.env`, and finish Stripe's identity / bank payout setup.

**Do you have to pay money?** No monthly fee. Stripe only takes a cut when a
payment succeeds (US cards typically **2.9% + $0.30**). Test mode charges $0.

Optional webhook (so payment confirms even if the browser closes early):

```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Put the whsec_… signing secret in STRIPE_WEBHOOK_SECRET
```

The success page also confirms payment via `session_id` if the webhook isn't set.

## How you make money

1. **Sell parts on this site** — customers pay you via Stripe; you fulfill
   (or dropship) the order.
2. **Affiliate commissions** (no inventory) — sign up free for
   [Amazon Associates](https://affiliate-program.amazon.com/),
   [eBay Partner Network](https://partnernetwork.ebay.com/), and/or FCP Euro’s
   Impact program, put IDs in `.env`, and earn when shoppers buy through the
   retailer buttons on results/catalog.

## Try the flow

1. Go to **Check an Estimate**, pick your BMW (e.g. 2013 335i, N55), and drop
   in a shop estimate — PDF, photo, or screenshot.
2. Review the parsed line items, matched parts, and savings.
3. Click **Buy all cheaper parts online** (or a retailer button on each row).
4. Optionally **Add all to cart** → checkout with a shipping address (demo
   fulfillment path).
5. See orders in `/dashboard`, manage them in `/admin/orders`, export CSV,
   edit inventory pricing in `/admin/inventory`.

## Project structure

```
app/
  page.tsx                  Landing (hero, savings card, trust, FAQ)
  upload/                   Vehicle form + estimate dropzone
  results/[id]/             Parsed estimate + comparison + savings
  catalog/                  Filterable parts catalog
  cart/ checkout/           Cart, shipping form, confirmation
  dashboard/                Orders, vehicles, estimate history
  admin/                    Analytics, orders, estimates, inventory, users
  repairs/[slug]/           SEO repair-cost guides
  actions/                  Server actions (estimate, cart, checkout, admin)
  api/upload/               Local file upload (saves to public/uploads)
  api/admin/orders/export/  CSV export
lib/
  ai/                       Heuristic parser, optional AI parsing, PDF text extraction
  affiliates.ts             Amazon / eBay / RockAuto / FCP Euro buy-link builder
  comparison.ts             OEM/semantic matching engine + labor heuristic
  auth.ts                   Local single-user mode (owner = admin)
  db.ts, utils.ts
prisma/
  schema.prisma             Full data model
  seed.ts                   31 realistic BMW parts + demo vehicles
scripts/
  dev-db.ts                 Embedded PostgreSQL (no install needed)
```

## Deploying (optional)

The app deploys to Vercel: set `DATABASE_URL` to a hosted Postgres (Neon's
free tier works) and `NEXT_PUBLIC_APP_URL` to your domain, then run
`npx prisma migrate deploy` and `npm run db:seed` against that database.
Note that local mode has no authentication — anyone who can reach the site is
the owner — so a public deployment should stay behind something private (or
re-add an auth provider) before sharing the URL.

## Notes & disclaimers

- Orders are stored for manual fulfillment — nothing is auto-purchased.
- Labor estimates are informational, based on typical independent BMW shop rates.
- Not affiliated with BMW AG. BMW is a registered trademark of BMW AG.
