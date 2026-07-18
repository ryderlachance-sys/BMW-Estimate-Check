"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  FileScan,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { faqItems } from "@/lib/faq";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12, ease: [0.21, 0.65, 0.36, 1] as const },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 70% 20%, rgba(0,102,177,0.45) 0%, transparent 70%), radial-gradient(40% 40% at 20% 80%, rgba(0,102,177,0.25) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2">
        <div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300">
              <Sparkles className="size-3.5 text-[#4da3dd]" />
              Instant estimate analysis for BMW owners
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Stop Overpaying for{" "}
            <span className="bg-gradient-to-r from-[#4da3dd] to-[#0066B1] bg-clip-text text-transparent">
              BMW Repairs
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400"
          >
            Upload your mechanic&apos;s estimate. We extract every part and labor
            line, match it against OEM and premium aftermarket prices, and show you
            exactly how much you could save — then let you buy the parts in one click.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link href="/upload">
              <Button size="lg" className="w-full sm:w-auto">
                <Upload className="size-5" />
                Find cheaper parts
                <ArrowRight className="size-5" />
              </Button>
            </Link>
            <Link href="/catalog">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto"
              >
                Browse Parts Catalog
              </Button>
            </Link>
          </motion.div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-zinc-400"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#4da3dd]" /> OEM &amp; OE-supplier parts
            </span>
            <span className="flex items-center gap-2">
              <Star className="size-4 text-[#4da3dd]" /> Avg. 38% parts savings
            </span>
            <span className="flex items-center gap-2">
              <Truck className="size-4 text-[#4da3dd]" /> Free shipping over $149
            </span>
          </motion.div>
        </div>

        <SavingsExampleCard />
      </div>
    </section>
  );
}

function SavingsExampleCard() {
  const rows = [
    { part: "Front control arms (pair)", shop: 850, ours: 249.98 },
    { part: "Electric water pump", shop: 780, ours: 419.99 },
    { part: "Valve cover gasket", shop: 129, ours: 34.99 },
  ];
  const shopTotal = rows.reduce((s, r) => s + r.shop, 0);
  const ourTotal = rows.reduce((s, r) => s + r.ours, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.21, 0.65, 0.36, 1] }}
    >
      <Card className="border-white/10 bg-white/[0.04] text-white shadow-2xl backdrop-blur">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Example — 2015 BMW 335i
            </p>
            <span className="rounded-full bg-[#0066B1]/20 px-3 py-1 text-xs font-bold text-[#4da3dd]">
              Real savings
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {rows.map((r) => (
              <div key={r.part} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-zinc-300">{r.part}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="text-zinc-500 line-through">${r.shop.toFixed(0)}</span>
                  <span className="font-semibold text-white">${r.ours.toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Shop parts total</span>
              <span className="tabular-nums line-through">${shopTotal.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-zinc-400">
              <span>Our parts total</span>
              <span className="tabular-nums text-white">${ourTotal.toFixed(2)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#0066B1] to-[#004a80] px-5 py-4">
              <span className="font-semibold">You save</span>
              <span className="text-2xl font-extrabold tabular-nums">
                ${(shopTotal - ourTotal).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const steps = [
  {
    icon: Upload,
    title: "Upload your estimate",
    body: "Snap a photo or upload the PDF your shop gave you. Add your BMW's year, model, and engine.",
  },
  {
    icon: FileScan,
    title: "We read every line",
    body: "Parts, quantities, OEM part numbers, labor, and the total quote are extracted automatically.",
  },
  {
    icon: BadgeDollarSign,
    title: "See real prices",
    body: "We match each part to OEM and OE-supplier equivalents and show your savings, line by line.",
  },
  {
    icon: Package,
    title: "Order the parts",
    body: "Add everything to your cart, enter your shipping address, and place the order. We handle fulfillment.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          From a crumpled shop estimate to parts on your doorstep in four steps.
        </p>
      </motion.div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={i}
          >
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <step.icon className="size-5" />
                </span>
                <p className="mt-5 font-semibold">
                  <span className="mr-2 text-primary">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const trustItems = [
  { stat: "38%", label: "average savings on parts vs. shop pricing" },
  { stat: "11-digit", label: "OEM part-number matching for exact fitment" },
  { stat: "100%", label: "genuine BMW & OE-supplier brands like Lemförder, Bosch, Sachs" },
  { stat: "$0", label: "to use — upload and compare estimates completely free" },
];

export function TrustBar() {
  return (
    <section className="border-y bg-secondary/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {trustItems.map((item, i) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={i}
            className="text-center sm:text-left"
          >
            <p className="text-3xl font-extrabold text-primary">{item.stat}</p>
            <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-24">
      <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
        Frequently asked questions
      </h2>
      <div className="mt-10 divide-y rounded-xl border bg-card shadow-sm">
        {faqItems.map((item, i) => (
          <div key={item.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-semibold"
              aria-expanded={open === i}
            >
              {item.q}
              <span
                className={cn(
                  "text-xl text-primary transition-transform",
                  open === i && "rotate-45"
                )}
              >
                +
              </span>
            </button>
            {open === i && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden px-6 pb-5 text-sm leading-relaxed text-muted-foreground"
              >
                {item.a}
              </motion.p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-zinc-950 py-20 text-center text-white">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mx-auto max-w-2xl px-4"
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Got an estimate sitting in your glovebox?
        </h2>
        <p className="mt-4 text-zinc-400">
          It takes 60 seconds to find out what those parts really cost.
        </p>
        <Link href="/upload" className="mt-8 inline-block">
          <Button size="lg">
            <Upload className="size-5" />
            Find cheaper parts
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
