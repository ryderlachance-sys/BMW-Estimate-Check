import { redirect } from "next/navigation";

/** Old affiliate path — everyone checks out on-site via Stripe now. */
export default function CheckoutShipRedirect() {
  redirect("/checkout");
}
