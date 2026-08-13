import type { Metadata } from "next";
import { Hero, HowItWorks, TrustBar, Faq, FinalCta } from "@/components/landing";
import { faqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Compare Mechanic Parts Prices | Engine Genie",
  description:
    "Upload a mechanic estimate, confirm the vehicle and repair parts, and compare the shop's parts charges with compatible retailer listings.",
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
