import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated August 14, 2026</p>
      <div className="mt-8 space-y-6 leading-7 text-muted-foreground">
        <section><h2 className="text-lg font-bold text-foreground">Information we process</h2><p className="mt-2">Engine Genie processes repair estimates you upload or paste, vehicle details found in those estimates, and anonymous session information needed to return your results. Do not upload documents containing information you do not want processed.</p></section>
        <section><h2 className="text-lg font-bold text-foreground">How it is used</h2><p className="mt-2">We use this information to extract repair parts, compare prices, prevent abuse, improve reliability, and display your results. Uploaded estimates may be stored by our hosting and file-storage providers so the analysis can complete.</p></section>
        <section><h2 className="text-lg font-bold text-foreground">Anonymous usage analytics</h2><p className="mt-2">We record first-party events such as page visits, estimate starts, completed analyses, retailer clicks, and advertising campaign tags. We use a random browser session identifier rather than your name or payment information to understand which parts of the service work.</p></section>
        <section><h2 className="text-lg font-bold text-foreground">Retailer links</h2><p className="mt-2">Retailers have their own privacy practices. When you open a retailer link, that retailer may collect information under its own policy. Affiliate tracking parameters may identify Engine Genie as the referring website.</p></section>
        <section><h2 className="text-lg font-bold text-foreground">Your choices</h2><p className="mt-2">You can avoid uploading an image by pasting only the relevant vehicle, part, and price lines. Avoid including names, addresses, phone numbers, payment details, or other unnecessary personal information.</p></section>
      </div>
    </article>
  );
}
