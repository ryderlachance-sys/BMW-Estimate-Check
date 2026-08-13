# Supplier launch gate

Engine Genie deliberately refuses production card payments until a real supplier
workflow has passed a complete test shipment. This prevents charging a customer
for an order that nobody can fulfill.

## Required production variables

- `AUTH_SECRET`: long random value used to sign private customer sessions
- `ADMIN_PASSWORD`: owner password for `/owner-login`
- `STRIPE_SECRET_KEY`: live or test Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: signing secret for `/api/webhooks/stripe`
- `FULFILLMENT_WEBHOOK_SECRET`: long random callback secret
- Either `ORDERDESK_STORE_ID` + `ORDERDESK_API_KEY`, or `FULFILLMENT_WEBHOOK_URL`
- `FULFILLMENT_LIVE_ENABLED=false` until the test below passes

For actual customer email delivery, also configure `RESEND_API_KEY` and
`EMAIL_FROM`. Otherwise notifications remain stored in the customer dashboard.

## What the supplier receives

After Stripe confirms a paid order, the app sends an `order.paid` JSON payload
containing the order ID, customer email, shipping destination, complete ship-to
address, appointment date, and each requested part's SKU, brand, name, OEM number,
quantity, sell price, estimated supplier cost, and sourcing URL.

The supplier or fulfillment system must independently confirm exact fitment,
current cost, stock, and delivery time before purchasing. Catalog and marketplace
search prices are not live supplier quotes.

## Required test before enabling payments

1. Keep Stripe in test mode and `FULFILLMENT_LIVE_ENABLED=false`.
2. Send a controlled test order directly through the chosen supplier workflow.
3. Confirm that every line is the correct part and quantity for the test VIN.
4. Confirm the supplier purchases the products and ships to the submitted address.
5. Confirm tracking is returned to `/api/fulfillment/tracking` with the correct secret.
6. Confirm the order dashboard changes to `SHIPPED` and displays that tracking number.
7. Confirm cancellation, out-of-stock, price-change, refund, and partial-shipment handling.
8. Only after all checks pass, set `FULFILLMENT_LIVE_ENABLED=true`.

Until that final switch is enabled, checkout clearly says ordering is unavailable
and cannot take a customer's money.
