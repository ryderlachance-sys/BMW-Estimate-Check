import "server-only";
import Stripe from "stripe";

/** True when Stripe secret key is present — real card checkout is enabled. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to .env (free test keys from https://dashboard.stripe.com/test/apikeys)."
    );
  }
  if (!stripe) {
    // API version pinned by the installed stripe package default.
    stripe = new Stripe(key);
  }
  return stripe;
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}
