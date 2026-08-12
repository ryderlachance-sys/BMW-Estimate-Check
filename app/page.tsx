import type { Metadata } from "next";
import { Hero, HowItWorks, TrustBar, Faq, FinalCta } from "@/components/landing";
import { faqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Stop Overpaying for Car Repairs | Engine Genie",
  description:
    "Upload any mechanic estimate and compare it against real part prices. See your savings instantly and buy parts online.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <Faq />
      <FinalCta />
    </>
  );
}
