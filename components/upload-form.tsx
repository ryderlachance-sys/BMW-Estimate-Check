"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import { createEstimate, type CreateEstimateState } from "@/app/actions/estimate";
import { EstimateDropzone, type UploadedFile } from "@/components/estimate-dropzone";
import { KeywordScanTable } from "@/components/keyword-scan-table";
import { Button } from "@/components/ui/button";

export function UploadForm() {
  const [state, formAction, pending] = useActionState<CreateEstimateState, FormData>(
    createEstimate,
    null
  );
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  const ocrWeak =
    !!file &&
    file.type.startsWith("image/") &&
    (!file.extractedText || file.extractedText.trim().length < 40);

  const effectiveText = (pasteText.trim().length >= 8 ? pasteText : file?.extractedText) ?? "";

  // Auto-submit only when OCR looks usable (otherwise wait for paste / manual submit).
  useEffect(() => {
    if (!file || pending || autoSubmitted.current || !formRef.current) return;
    if (ocrWeak && pasteText.trim().length < 20) return;
    autoSubmitted.current = true;
    formRef.current.requestSubmit();
  }, [file, pending, ocrWeak, pasteText]);

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
                    : ocrWeak
                      ? "Photo uploaded — paste the estimate text below"
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
                  setPasteText("");
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
              setPasteText("");
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

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {ocrWeak
            ? "We had trouble reading that image clearly. Please copy and paste the text from your estimate directly into this box to instantly find your savings!"
            : "Or paste estimate text (optional — helps if the photo is blurry):"}
        </p>
        <textarea
          value={pasteText}
          onChange={(e) => {
            autoSubmitted.current = false;
            setPasteText(e.target.value);
          }}
          rows={ocrWeak ? 8 : 4}
          placeholder={`2019 Lexus RX 350\nFront brake pads  $189.00\nBrake rotors  $320.00\nAlternator  $450.00`}
          className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm leading-relaxed shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={pending}
        />
      </div>

      <input type="hidden" name="fileUrl" value={file?.url ?? (pasteText.trim().length >= 20 ? "paste://estimate" : "")} />
      <input
        type="hidden"
        name="fileType"
        value={file?.type ?? (pasteText.trim().length >= 20 ? "text/plain" : "")}
      />
      <input
        type="hidden"
        name="extractedText"
        value={pasteText.trim().length >= 8 ? pasteText : file?.extractedText ?? ""}
      />

      {effectiveText.trim().length >= 8 && <KeywordScanTable text={effectiveText} />}

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
          {state.error}
        </div>
      )}

      {((file && !pending) || (pasteText.trim().length >= 20 && !pending)) && (
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
