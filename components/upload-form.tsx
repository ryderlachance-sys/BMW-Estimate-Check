"use client";

import { useActionState, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import { createEstimate, type CreateEstimateState } from "@/app/actions/estimate";
import { EstimateDropzone, type UploadedFile } from "@/components/estimate-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const BMW_MODELS = [
  "228i", "230i", "328i", "330i", "335i", "340i", "428i", "435i", "440i",
  "528i", "535i", "540i", "550i", "740i", "750i",
  "M2", "M3", "M4", "M5", "M8", "M340i", "M550i",
  "X1", "X3", "X5", "X5 M", "X6", "X7", "Z4", "i4", "iX",
];

const ENGINES = ["N20", "N26", "N52", "N54", "N55", "N63", "S55", "S58", "S63", "B46", "B48", "B58", "Other"];

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + 1 - i);

export function UploadForm() {
  const [state, formAction, pending] = useActionState<CreateEstimateState, FormData>(
    createEstimate,
    null
  );
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-8">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Select id="year" name="year" required defaultValue="2020">
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select id="model" name="model" required defaultValue="M5">
            {BMW_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="engine">Engine</Label>
          <Select id="engine" name="engine" defaultValue="S63">
            {ENGINES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </div>
      </div>
      <input type="hidden" name="trim" value="" />
      <input type="hidden" name="vin" value="" />

      <div className="space-y-3">
        <Label>Shop estimate photo or PDF</Label>
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
                <p className="text-xs text-muted-foreground">Ready</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              onClick={() => setFile(null)}
            >
              <X className="size-4" />
            </Button>
          </motion.div>
        ) : (
          <EstimateDropzone
            onUploaded={(uploaded) => {
              setFile(uploaded);
              setUploadError(null);
            }}
            onError={setUploadError}
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

      <Button type="submit" size="lg" className="w-full text-base" disabled={pending || !file}>
        {pending ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Finding cheaper parts…
          </>
        ) : (
          <>
            <Search className="size-5" />
            Find cheaper parts
          </>
        )}
      </Button>
    </form>
  );
}
