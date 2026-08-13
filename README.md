# Engine Genie

Engine Genie is an affiliate car-parts comparison site. A visitor uploads a
repair estimate (photo, screenshot, or PDF), confirms the detected vehicle and
part lines, and opens compatible products at independent retailers. Retailers
collect payment, ship the order, and handle returns. Engine Genie may earn a
commission from qualifying purchases.

## What works

- Image, screenshot, PDF, and pasted-text estimate input
- Optional OpenAI vision parsing with local OCR/keyword fallbacks
- Manual vehicle and parts entry when there is no estimate
- Required vehicle/parts review before product recommendations
- Editable year, make, model, engine, VIN, part, quantity, shop price, and OEM number
- Catalog matching by OEM number, vehicle compatibility, and part description
- Direct Amazon/eBay product links when a verified product ID exists
- Automatic eBay exact-product, live-price, and fitment matching when Browse API access is configured
- Affiliate click tracking and an owner analytics dashboard
- Repair-cost SEO guides for multiple vehicle makes

The app does not collect card payments or fulfill parts. It does not guess a
specific product when retailer data cannot verify fitment; it shows a clearly
labeled retailer search instead.

## Local setup

```bash
npm install
npm run db:local
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env`.

Required:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET` in production
- `ADMIN_PASSWORD` for `/owner-login`

Estimate parsing:

- Leave `OPENAI_API_KEY` empty to use local extraction only.
- Set `OPENAI_API_KEY` and `OPENAI_MODEL` for image/text AI parsing.

Affiliate revenue:

- `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` tracks qualifying Amazon purchases.
- `NEXT_PUBLIC_EBAY_CAMPAIGN_ID` tracks qualifying eBay purchases.
- `NEXT_PUBLIC_FCP_EURO_CLICK_ID` enables an approved FCP Euro tracking link.

Automatic exact-product matching:

- `EBAY_CLIENT_ID`: eBay Production App ID
- `EBAY_CLIENT_SECRET`: eBay Production Cert ID

The eBay credentials stay server-side. They power Browse API searches and
vehicle compatibility checks. Without them, eBay search links still work but
the app cannot promise one exact listing or a live price.

Amazon's affiliate tag does not provide catalog access. Amazon's official
Creators API credentials can be integrated after the Associates account becomes
eligible for API access.

## How revenue works

1. A visitor confirms their vehicle and repair parts.
2. Engine Genie presents a verified retailer listing when available.
3. The visitor opens the tagged retailer link and completes checkout there.
4. The retailer attributes an eligible purchase to the affiliate account.

There is no inventory, customer payment processing, or manual order fulfillment
inside Engine Genie.

## Verification

```bash
npm run typecheck
npm run build
npm run test:launch
```

## Vercel deployment

1. Import the GitHub repository into Vercel.
2. Add the production environment variables listed above.
3. Point `DATABASE_URL` at PostgreSQL.
4. Run `npx prisma migrate deploy` against that production database.
5. Deploy. Git pushes to `main` trigger subsequent deployments.

Live site: <https://bmw-estimate-check.vercel.app>
