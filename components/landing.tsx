"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Star,
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
              Free parts comparison for any car
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Upload Your Estimate.{" "}
            <span className="bg-gradient-to-r from-[#4da3dd] to-[#0066B1] bg-clip-text text-transparent">
              Find Cheaper Parts.
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400"
          >
            Upload your mechanic&apos;s estimate — BMW, Toyota, Honda, Ford, or anything else.
            Take a photo or upload the PDF. Confirm the car and parts we read, see the shop&apos;s
            markup, and open a matching product at a trusted retailer. No estimate? Enter the
            parts yourself. Retailers handle payment and shipping.
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
                Check my estimate
                <ArrowRight className="size-5" />
              </Button>
            </Link>
            <Link href="/upload#manual-parts">
              <Button size="lg" variant="outline" className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto">
                I don&apos;t have an estimate
              </Button>
            </Link>
            <Link href="/sample-results">
              <Button size="lg" variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white sm:w-auto">
                See an example
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
              <ShieldCheck className="size-4 text-[#4da3dd]" /> You confirm the vehicle first
            </span>
            <span className="flex items-center gap-2">
              <Star className="size-4 text-[#4da3dd]" /> No card required
            </span>
            <span className="flex items-center gap-2">
              <BadgeDollarSign className="size-4 text-[#4da3dd]" /> Free — buy at retailers
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
              Example — shop vs online
            </p>
            <span className="rounded-full bg-[#0066B1]/20 px-3 py-1 text-xs font-bold text-[#4da3dd]">
              Illustrative savings
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
              <span>Online parts total</span>
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
    title: "Upload or enter parts",
    body: "Snap a photo, upload a PDF or screenshot, paste the text, or enter a repair manually.",
  },
  {
    icon: ShieldCheck,
    title: "Confirm what we found",
    body: "Review the vehicle, engine, VIN, part names, quantities, prices, and OEM numbers before matching.",
  },
  {
    icon: BadgeDollarSign,
    title: "See the real comparison",
    body: "Compare the shop's parts charge with a current exact retailer listing when one can be verified.",
  },
  {
    icon: ExternalLink,
    title: "Buy at a retailer",
    body: "Open the product at the retailer. The retailer handles payment, delivery, warranties, and returns.",
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
          Four clear steps. No account setup, checkout, or fulfillment on Engine Genie.
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
  { stat: "Parts only", label: "labor is kept separate so savings stay honest" },
  { stat: "Any make", label: "BMW, Toyota, Honda, Ford, and more" },
  { stat: "OEM + OE", label: "genuine & OE-supplier brands when we match a part" },
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
