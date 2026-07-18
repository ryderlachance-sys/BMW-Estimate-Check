import type { Metadata } from "next";
import { UploadForm } from "@/components/upload-form";

export const metadata: Metadata = {
  title: "Check Your Estimate",
  description:
    "Upload your BMW repair estimate and get an instant AI-powered price comparison against OEM and aftermarket parts.",
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Check your repair estimate
        </h1>
        <p className="mt-4 text-muted-foreground">
          Tell us about your BMW, upload the estimate your shop gave you, and we&apos;ll
          show you what those parts actually cost.
        </p>
      </div>
      <div className="mt-12">
        <UploadForm />
      </div>
    </div>
  );
}
