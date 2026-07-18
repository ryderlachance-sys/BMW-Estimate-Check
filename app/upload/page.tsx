import type { Metadata } from "next";
import { UploadForm } from "@/components/upload-form";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Find Cheaper Parts",
  description:
    "Upload your BMW repair estimate and buy the same parts cheaper online.",
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find cheaper parts
        </h1>
        <p className="mt-3 text-muted-foreground">
          Drop in your shop estimate. We show what to buy online — and where.
        </p>
      </div>
      <div className="mt-10">
        <UploadForm />
      </div>
    </div>
  );
}
