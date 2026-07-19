import type { Metadata } from "next";
import { UploadForm } from "@/components/upload-form";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Find Cheaper Parts",
  description:
    "Drop in your BMW shop estimate. We read your car and show cheaper parts to buy online.",
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find cheaper parts
        </h1>
        <p className="mt-3 text-muted-foreground">
          Drop your estimate. We read the car from the paperwork — no forms.
        </p>
      </div>
      <div className="mt-10">
        <UploadForm />
      </div>
    </div>
  );
}
