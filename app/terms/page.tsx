import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated August 13, 2026</p>
      <div className="mt-8 space-y-6 leading-7 text-muted-foreground">
        <section><h2 className="text-lg font-bold text-foreground">Price comparison service</h2><p className="mt-2">Engine Genie helps interpret repair estimates and locate possible replacement parts. Unless a listing is explicitly marked verified, displayed catalog prices are estimates. Retailer prices, inventory, shipping, taxes, and eligibility can change.</p></section>
        <section><h2 className="text-lg font-bold text-foreground">Confirm fitment before buying</h2><p className="mt-2">Vehicle and part extraction can be wrong. You are responsible for confirming the VIN, engine, trim, OEM number, quantity, and fitment with the retailer or a qualified mechanic before purchasing or installing a part.</p></section>
        <section><h2 className="text-lg font-bold text-foreground">Retailer transactions</h2><p className="mt-2">Purchases are completed with independent retailers, not Engine Genie. The retailer controls payment, shipping, cancellations, warranties, and returns. Engine Genie may earn an affiliate commission from qualifying purchases at no additional cost to you.</p></section>
        <section><h2 className="text-lg font-bold text-foreground">No repair advice or guarantee</h2><p className="mt-2">Results are informational and are not a diagnosis, repair instruction, safety inspection, or guarantee of savings. Have safety-critical repairs and part selections reviewed by a qualified professional.</p></section>
      </div>
    </article>
  );
}
