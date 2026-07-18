import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowRight, Clock, DollarSign, Upload, Wrench } from "lucide-react";
import { getRepairGuide, repairGuides } from "@/lib/repairs";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function generateStaticParams() {
  return repairGuides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getRepairGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: `/repairs/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      type: "article",
    },
  };
}

export default async function RepairGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getRepairGuide(slug);
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.heading,
    description: guide.metaDescription,
    author: { "@type": "Organization", name: "BMW Estimate Check" },
    about: {
      "@type": "Service",
      name: guide.heading,
      offers: {
        "@type": "AggregateOffer",
        lowPrice: guide.shopCostRange.low,
        highPrice: guide.shopCostRange.high,
        priceCurrency: "USD",
      },
    },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        BMW Repair Cost Guide
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {guide.heading}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Wrench className="size-4" /> Typical shop quote
            </CardDescription>
            <CardTitle className="tabular-nums">
              {formatCurrency(guide.shopCostRange.low)}–{formatCurrency(guide.shopCostRange.high)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="size-4" /> Actual parts cost
            </CardDescription>
            <CardTitle className="tabular-nums text-primary">
              {formatCurrency(guide.partsCostRange.low)}–{formatCurrency(guide.partsCostRange.high)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="size-4" /> Labor time
            </CardDescription>
            <CardTitle>{guide.laborHours}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <AlertCircle className="size-5 text-primary" /> Common symptoms
        </h2>
        <ul className="mt-4 space-y-2">
          {guide.symptoms.map((s) => (
            <li key={s} className="flex items-start gap-3 text-muted-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {s}
            </li>
          ))}
        </ul>
      </section>

      {guide.body.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-xl font-bold">{section.heading}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{section.text}</p>
        </section>
      ))}

      <Card className="mt-14 border-primary/30 bg-accent">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <h2 className="text-2xl font-extrabold">Got a quote for this repair?</h2>
          <p className="max-w-md text-sm text-accent-foreground/80">
            Upload the estimate and see exactly what the parts cost — free, in under a
            minute.
          </p>
          <Link href="/upload">
            <Button size="lg">
              <Upload className="size-5" /> Check my estimate <ArrowRight className="size-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="mt-12 border-t pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          More repair guides
        </p>
        <ul className="mt-4 space-y-2">
          {repairGuides
            .filter((g) => g.slug !== guide.slug)
            .map((g) => (
              <li key={g.slug}>
                <Link href={`/repairs/${g.slug}`} className="text-primary hover:underline">
                  {g.heading}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </article>
  );
}
