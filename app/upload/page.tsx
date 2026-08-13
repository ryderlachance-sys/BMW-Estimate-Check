import type { Metadata } from "next";
import { UploadForm } from "@/components/upload-form";
import { ManualPartsForm } from "@/components/manual-parts-form";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Find Cheaper Parts",
  description:
    "Drop in your shop estimate. We read your car and show cheaper parts to buy online.",
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find cheaper parts
        </h1>
        <p className="mt-3 text-muted-foreground">
          Upload a PDF, photo, or phone screenshot — we read the car from the paperwork when we can.
        </p>
      </div>
      <div className="mt-10">
        <UploadForm />
      </div>
      <div className="my-10 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> No estimate? <span className="h-px flex-1 bg-border" />
      </div>
      <section id="manual-parts" className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-extrabold">Tell us what parts you need</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your vehicle and repair parts manually. A VIN or OEM number gives the safest match.
        </p>
        <ManualPartsForm />
      </section>
    </div>
  );
}
