"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import { createEstimate, type CreateEstimateState } from "@/app/actions/estimate";
import { EstimateDropzone, type UploadedFile } from "@/components/estimate-dropzone";
import { Button } from "@/components/ui/button";

export function UploadForm() {
  const [state, formAction, pending] = useActionState<CreateEstimateState, FormData>(
    createEstimate,
    null
  );
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  // After the photo is uploaded + OCR'd, submit automatically — no car form.
  useEffect(() => {
    if (!file || pending || autoSubmitted.current || !formRef.current) return;
    autoSubmitted.current = true;
    formRef.current.requestSubmit();
  }, [file, pending]);

  return (
    <form ref={formRef} action={formAction} className="mx-auto max-w-xl space-y-6">
      <div className="space-y-3">
        {file ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-6 text-success" />
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pending
                    ? "Reading your car + finding cheaper parts…"
                    : "Ready — analyzing now…"}
                </p>
              </div>
            </div>
            {!pending && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove file"
                onClick={() => {
                  autoSubmitted.current = false;
                  setFile(null);
                }}
              >
                <X className="size-4" />
              </Button>
            )}
          </motion.div>
        ) : (
          <EstimateDropzone
            onUploaded={(uploaded) => {
              autoSubmitted.current = false;
              setFile(uploaded);
              setUploadError(null);
            }}
            onError={(msg) => {
              autoSubmitted.current = false;
              setUploadError(msg);
            }}
          />
        )}
        {uploadError && (
          <p className="text-sm font-medium text-destructive">{uploadError}</p>
        )}
      </div>

      <input type="hidden" name="fileUrl" value={file?.url ?? ""} />
      <input type="hidden" name="fileType" value={file?.type ?? ""} />
      <input type="hidden" name="extractedText" value={file?.extractedText ?? ""} />

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
          {state.error}
        </div>
      )}

      {/* Manual fallback if auto-submit fails */}
      {file && !pending && (
        <Button type="submit" size="lg" className="w-full text-base">
          <Search className="size-5" />
          Find cheaper parts
        </Button>
      )}

      {pending && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Pulling year, model, and engine from your estimate…
        </p>
      )}
    </form>
  );
}
