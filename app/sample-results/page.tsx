import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { formatCurrency } from "@/lib/utils";
import { amazonProductUrl } from "@/lib/affiliates";

export const metadata: Metadata = {
  title: "Example Parts Savings",
  description: "See an example Engine Genie estimate comparison before uploading your own.",
  alternates: { canonical: "/sample-results" },
};

const sampleParts = [
  {
    name: "TRQ Front Vented Brake Rotor Set",
    shop: 569.5,
    online: 92.95,
    retailer: "Amazon",
    url: amazonProductUrl("B09HZ459FG"),
    fitment: "Example verified fit for 2021 Lexus ES 350",
  },
  {
    name: "Genuine Lexus Alternator Assembly",
    shop: 619,
    online: 361.87,
    retailer: "AutoPartsPrime",
    url: "https://www.autopartsprime.com/genuine/lexus-alternator-assy-w-regulator~27060-0p440.html",
    fitment: "Example OEM-number match: 27060-0P440",
  },
  {
    name: "Bosch Blue Ceramic Front Brake Pad Set",
    shop: 189.99,
    online: 39.49,
    retailer: "Amazon",
    url: amazonProductUrl("B0BHL39JV9"),
    fitment: "Example verified fit for 2021 Lexus ES 350",
  },
];

export default function SampleResultsPage() {
  const shopTotal = sampleParts.reduce((sum, part) => sum + part.shop, 0);
  const onlineTotal = sampleParts.reduce((sum, part) => sum + part.online, 0);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <strong>Example analysis:</strong> This shows how a finished result looks. Your upload will use your own vehicle and repair lines.
      </div>
      <p className="mt-6 text-sm text-muted-foreground">2021 Lexus ES 350 · 3 verified example parts</p>
      <div className="mt-3 rounded-3xl bg-primary px-6 py-8 text-center text-primary-foreground">
        <p className="text-sm font-bold uppercase tracking-wide opacity-90">Example parts savings</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums sm:text-6xl">{formatCurrency(shopTotal - onlineTotal)}</p>
        <p className="mt-3 text-sm opacity-90">Shop parts {formatCurrency(shopTotal)} · example online total {formatCurrency(onlineTotal)}</p>
      </div>
      <AffiliateDisclosure className="mt-4 text-center" />
      <div className="mt-5 space-y-3">
        {sampleParts.map((part) => (
          <article key={part.name} className="rounded-2xl border bg-card p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="min-w-0">
              <h2 className="font-extrabold">{part.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Shop charged <span className="line-through">{formatCurrency(part.shop)}</span></p>
              <p className="text-sm font-extrabold text-primary">{part.retailer} {formatCurrency(part.online)} <span className="text-xs text-success">Save {formatCurrency(part.shop - part.online)}</span></p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" /> {part.fitment}</p>
            </div>
            <a href={part.url} target="_blank" rel="noopener noreferrer sponsored" className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white sm:mt-0 sm:w-auto sm:shrink-0">
              View example <ExternalLink className="size-3.5" />
            </a>
          </article>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Example prices were checked August 13, 2026 and can change. Confirm the current retailer price and fitment before buying.</p>
      <Link href="/upload" className="mt-8 block">
        <Button size="lg" className="w-full">Check my own estimate <ArrowRight className="size-5" /></Button>
      </Link>
    </div>
  );
}
