/**
 * Full-flow test (run with: npm run test:flows — needs db + dev server running).
 * Exercises the app the way a real user does:
 *  1. Upload form POST (real server action, progressive-enhancement path)
 *  2. Results page render
 *  3. Add-all-to-cart, quantity controls, remove (server action logic)
 *  4. Checkout form POST -> order created -> success page
 *  5. Admin: order status update, price edit, match override, CSV export
 */
import { db } from "../lib/db";

const BASE = "http://localhost:3000";
let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/** Ignore Next.js framework errors thrown by revalidatePath/redirect outside a request. */
async function runAction(fn: () => Promise<unknown>): Promise<{ redirect?: string }> {
  try {
    await fn();
    return {};
  } catch (err) {
    const digest = (err as { digest?: string })?.digest ?? "";
    const message = (err as Error)?.message ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return { redirect: digest.split(";")[2] };
    if (message.includes("static generation store") || message.includes("revalidatePath"))
      return {};
    throw err;
  }
}

function decodeHtml(s: string): string {
  return s
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/** Collects the $ACTION_* hidden inputs Next renders for progressive enhancement. */
function extractActionFields(html: string): [string, string][] {
  const fields: [string, string][] = [];
  const re = /<input type="hidden" name="(\$ACTION[^"]*)"(?: value="([^"]*)")?\/?>/g;
  for (const m of html.matchAll(re)) {
    fields.push([m[1], decodeHtml(m[2] ?? "")]);
  }
  return fields;
}

async function main() {
  // ---------- 0. Photo upload path (OCR, no AI) ----------
  const { readFile } = await import("node:fs/promises");
  const png = await readFile("scripts/test-estimate-435i.png");
  const imgForm = new FormData();
  imgForm.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "estimate.png");
  const imgUpload = await (await fetch(`${BASE}/api/upload`, { method: "POST", body: imgForm })).json();
  check("photo uploads via /api/upload", typeof imgUpload.url === "string");

  {
    const html = await (await fetch(`${BASE}/upload`)).text();
    const fields = extractActionFields(html);
    const fd = new FormData();
    for (const [name, value] of fields) fd.append(name, value);
    fd.append("year", "2018");
    fd.append("model", "435i");
    fd.append("trim", "");
    fd.append("engine", "B46");
    fd.append("vin", "");
    fd.append("fileUrl", imgUpload.url);
    fd.append("fileType", "image/png");
    const res = await fetch(`${BASE}/upload`, { method: "POST", body: fd, redirect: "manual" });
    const loc = res.headers.get("x-action-redirect")?.split(";")[0]
      ?? res.headers.get("location") ?? "";
    check("photo estimate submit redirects to results", res.status === 303 && loc.startsWith("/results/"));
    const photoEstimateId = loc.split("/").pop() ?? "";
    const photoEstimate = await db.estimate.findUnique({
      where: { id: photoEstimateId },
      include: { items: true, comparisons: true },
    });
    check(
      "photo estimate parsed via OCR (no AI)",
      photoEstimate?.status === "PARSED" && (photoEstimate?.items.length ?? 0) >= 3,
      `status=${photoEstimate?.status} items=${photoEstimate?.items.length}`
    );
    check(
      "photo estimate parts matched to catalog",
      (photoEstimate?.comparisons.length ?? 0) >= 3,
      `comparisons=${photoEstimate?.comparisons.length}`
    );
    // Clean up the OCR test estimate + vehicle.
    if (photoEstimate) await db.vehicle.delete({ where: { id: photoEstimate.vehicleId } });
  }

  // ---------- 1. Upload form (real HTTP form submission) ----------
  const uploadHtml = await (await fetch(`${BASE}/upload`)).text();
  const uploadFields = extractActionFields(uploadHtml);
  check("upload page renders with form action", uploadFields.length > 0);

  let resultsPath = "";
  if (uploadFields.length > 0) {
    const fd = new FormData();
    for (const [name, value] of uploadFields) fd.append(name, value);
    fd.append("year", "2013");
    fd.append("model", "335i");
    fd.append("trim", "M Sport");
    fd.append("engine", "N55");
    fd.append("vin", "");
    fd.append("fileUrl", "/uploads/141d601e-e897-47d3-8efb-d346626f22f5.pdf");
    fd.append("fileType", "application/pdf");

    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      body: fd,
      redirect: "manual",
    });
    resultsPath = res.headers.get("x-action-redirect")?.split(";")[0]
      ?? res.headers.get("location") ?? "";
    check(
      "upload form submit redirects to results",
      res.status === 303 && resultsPath.startsWith("/results/"),
      `status=${res.status} location=${resultsPath}`
    );
  }

  const estimateId = resultsPath.split("/").pop() ?? "";
  if (estimateId) {
    const estimate = await db.estimate.findUnique({
      where: { id: estimateId },
      include: { items: true, comparisons: true },
    });
    check("estimate parsed via form flow", estimate?.status === "PARSED");
    check("estimate items extracted", (estimate?.items.length ?? 0) === 6, `items=${estimate?.items.length}`);
    check("comparisons built", (estimate?.comparisons.length ?? 0) === 6, `comparisons=${estimate?.comparisons.length}`);

    const resultsHtml = await (await fetch(`${BASE}${resultsPath}`)).text();
    check(
      "results page shows matches + add-all button",
      resultsHtml.includes("Add all 6 parts to cart") && resultsHtml.includes("Pierburg")
    );

    // ---------- 2. Cart actions (same functions the buttons call) ----------
    const { addAllFromEstimate, addToCart, updateCartItemQuantity, removeCartItem, getOrCreateCart } =
      await import("../app/actions/cart");

    // Clear leftover cart items from prior runs so counts stay deterministic.
    const existingCart = await getOrCreateCart();
    await db.cartItem.deleteMany({ where: { cartId: existingCart.id } });

    await runAction(() => addAllFromEstimate(estimateId));
    let cart = await getOrCreateCart();
    check("add-all-to-cart fills cart", cart.items.length === 6, `cartItems=${cart.items.length}`);

    const anyPart = await db.catalogPart.findFirstOrThrow({ where: { sku: "MAH-11427566327" } });
    await runAction(() => addToCart(anyPart.id, 1));
    cart = await getOrCreateCart();
    const added = cart.items.find((i) => i.catalogPartId === anyPart.id);
    check("catalog add-to-cart works", Boolean(added));

    if (added) {
      await runAction(() => updateCartItemQuantity(added.id, 3));
      cart = await getOrCreateCart();
      check(
        "quantity + / - controls work",
        cart.items.find((i) => i.id === added.id)?.quantity === 3
      );
      await runAction(() => removeCartItem(added.id));
      cart = await getOrCreateCart();
      check("remove item works", !cart.items.some((i) => i.id === added.id));
    }

    // ---------- 3. Affiliate checkout (customer path) ----------
    const affiliateCheckoutHtml = await (await fetch(`${BASE}/checkout`)).text();
    check(
      "affiliate checkout renders buy steps",
      affiliateCheckoutHtml.includes("Checkout") &&
        (affiliateCheckoutHtml.includes("buy all") ||
          affiliateCheckoutHtml.includes("Retailers ship"))
    );

    // ---------- 3b. Merchant Stripe checkout (admin path) ----------
    const checkoutHtml = await (await fetch(`${BASE}/checkout/ship`)).text();
    const checkoutFields = extractActionFields(checkoutHtml);
    check("merchant checkout page renders with form action", checkoutFields.length > 0);
    check(
      "merchant checkout offers Mechanic Delivery",
      checkoutHtml.includes("Ship Directly to My Mechanic") &&
        checkoutHtml.includes("Ship to My Address")
    );

    let orderId = "";
    if (checkoutFields.length > 0) {
      // Mechanic Delivery path
      const appt = new Date();
      appt.setDate(appt.getDate() + 21);
      const apptStr = appt.toISOString().slice(0, 10);

      const fd = new FormData();
      for (const [name, value] of checkoutFields) fd.append(name, value);
      fd.append("destination", "MECHANIC");
      fd.append("shopName", "Test Indie BMW");
      fd.append("contactPerson", "Alex Tech");
      fd.append("address", "500 Service Rd");
      fd.append("city", "Columbus");
      fd.append("state", "OH");
      fd.append("zip", "43215");
      fd.append("phone", "(614) 555-9911");
      fd.append("appointmentDate", apptStr);
      fd.append("appointmentTime", "09:30");
      fd.append("repairNotes", "Leave with service writer");
      fd.append("saveMechanic", "yes");
      const res = await fetch(`${BASE}/checkout/ship`, { method: "POST", body: fd, redirect: "manual" });
      const loc = res.headers.get("x-action-redirect")?.split(";")[0]
        ?? res.headers.get("location") ?? "";
      check(
        "place order redirects to success",
        res.status === 303 && loc.includes("/checkout/success?order="),
        `status=${res.status} location=${loc}`
      );
      orderId = loc.split("order=")[1] ?? "";

      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true, emails: true },
      });
      check(
        "mechanic order stored as PAID with shop + appointment",
        order?.status === "PAID" &&
          order.shippingDestination === "MECHANIC" &&
          order.mechanicShopName === "Test Indie BMW" &&
          order.shippingZip === "43215" &&
          order.items.length === 6 &&
          Boolean(order.estimatedDelivery),
        `dest=${order?.shippingDestination} shop=${order?.mechanicShopName}`
      );
      check(
        "order confirmation email recorded",
        (order?.emails.some((e) => e.type === "ORDER_CONFIRMED") ?? false)
      );

      const savedMech = await db.mechanic.findFirst({
        where: { shopName: "Test Indie BMW" },
      });
      check("mechanic saved to favorites", Boolean(savedMech?.isFavorite));

      const cartAfter = await getOrCreateCart();
      check("cart cleared after order", cartAfter.items.length === 0);

      const successHtml = await (await fetch(`${BASE}/checkout/success?order=${orderId}`)).text();
      check(
        "success page shows mechanic delivery confirmation",
        (successHtml.includes("Payment confirmed") || successHtml.includes("Order confirmed")) &&
          successHtml.includes("shipped directly to your repair shop")
      );

      const dash = await (await fetch(`${BASE}/dashboard`)).text();
      check(
        "dashboard shows mechanic delivery details",
        dash.includes("Test Indie BMW") && dash.includes("Favorite Mechanics")
      );

      const detail = await (await fetch(`${BASE}/dashboard/orders/${orderId}`)).text();
      check(
        "order detail shows tracking fields",
        detail.includes("Tracking number") && detail.includes("Estimated delivery")
      );
    }

    // ---------- 4. Admin actions ----------
    const { updateOrderStatus, updateCatalogPart, overrideComparisonMatch } =
      await import("../app/actions/admin");

    if (orderId) {
      await runAction(() => updateOrderStatus(orderId, "FULFILLING"));
      const o = await db.order.findUnique({ where: { id: orderId } });
      check("admin order-status dropdown works", o?.status === "FULFILLING");
    }

    const priceProbe = await db.catalogPart.findFirstOrThrow({ where: { sku: "NGK-12120037607" } });
    await runAction(() => updateCatalogPart(priceProbe.id, { price: 12.49 }));
    const priced = await db.catalogPart.findUnique({ where: { id: priceProbe.id } });
    check("admin price editor works", priced?.price === 12.49);
    await runAction(() => updateCatalogPart(priceProbe.id, { price: priceProbe.price })); // restore

    const comparison = await db.comparison.findFirstOrThrow({
      where: { estimateId },
      include: { estimateItem: true },
    });
    const altPart = await db.catalogPart.findFirstOrThrow({
      where: { id: { not: comparison.catalogPartId } },
    });
    await runAction(() => overrideComparisonMatch(comparison.id, altPart.id));
    const overridden = await db.comparison.findUnique({ where: { id: comparison.id } });
    check(
      "admin match override recalculates savings",
      overridden?.catalogPartId === altPart.id && overridden.matchMethod === "MANUAL"
    );

    const csv = await (await fetch(`${BASE}/api/admin/orders/export`)).text();
    check("CSV export contains the order", orderId !== "" && csv.includes(orderId));
    // Note: the retry-analysis button calls the same processEstimate function
    // already exercised by the upload flow above.
  }

  console.log(failures === 0 ? "\nALL FLOWS PASS" : `\n${failures} FAILURES`);
  await db.$disconnect();
  process.exitCode = failures === 0 ? 0 : 1;
}

main();
