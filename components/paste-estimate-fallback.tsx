"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { reparseWithPastedText, retryEstimate } from "@/app/actions/estimate";
import { KeywordScanTable } from "@/components/keyword-scan-table";
import { Button } from "@/components/ui/button";

const PASTE_HELP =
  "We had trouble reading that image clearly. Please copy and paste the text from your estimate directly into this box to instantly find your savings!";

/**
 * Fallback when OCR / image resolution fails or returns no parts.
 * Paste → local keyword scan preview → re-run analysis on the estimate.
 */
export function PasteEstimateFallback({
  estimateId,
  initialText = "",
  heading = "Couldn't read those parts from the image",
}: {
  estimateId: string;
  initialText?: string;
  heading?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onRetryAnalysis() {
    setError(null);
    setText("");
    startTransition(async () => {
      // Clear OCR / empty-parse error so the user can paste into the keyword loop
      await retryEstimate(estimateId, { clearExtractedText: true });
      router.refresh();
    });
  }

  function onFindSavings() {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      setError("Paste more of the estimate — include part names and dollar amounts.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reparseWithPastedText(estimateId, trimmed);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <h1 className="text-center text-2xl font-extrabold tracking-tight">{heading}</h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">{PASTE_HELP}</p>

      <div className="mt-6 space-y-3">
        <label htmlFor="paste-estimate" className="sr-only">
          Paste estimate text
        </label>
        <textarea
          id="paste-estimate"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={`Example:\n2019 Lexus RX 350\nFront brake pads  $189.00\nBrake rotors pair  $320.00\nAlternator  $450.00`}
          className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm leading-relaxed shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          disabled={pending}
        />

        {text.trim().length >= 8 && <KeywordScanTable text={text} />}

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <Button
          type="button"
          size="lg"
          className="w-full text-base"
          disabled={pending || text.trim().length < 20}
          onClick={onFindSavings}
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Search className="size-5" />
          )}
          Find savings from pasted text
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={onRetryAnalysis}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Retry analysis
        </Button>
      </div>
    </div>
  );
}
