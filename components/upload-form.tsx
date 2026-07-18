"use client";

import { useActionState, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, Loader2, X } from "lucide-react";
import { createEstimate, type CreateEstimateState } from "@/app/actions/estimate";
import { EstimateDropzone, type UploadedFile } from "@/components/estimate-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const BMW_MODELS = [
  "228i", "230i", "328i", "330i", "335i", "340i", "428i", "435i", "440i",
  "528i", "535i", "540i", "550i", "740i", "750i",
  "M2", "M3", "M4", "M5", "M340i", "M550i",
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
    <form action={formAction} className="grid gap-8 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>1. Your BMW</CardTitle>
          <CardDescription>We use this to verify part fitment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select id="year" name="year" required defaultValue="2018">
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select id="model" name="model" required defaultValue="335i">
                {BMW_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trim">Trim (optional)</Label>
              <Input id="trim" name="trim" placeholder="e.g. xDrive, M Sport" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engine">Engine</Label>
              <Select id="engine" name="engine" defaultValue="N55">
                {ENGINES.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">VIN (optional)</Label>
            <Input
              id="vin"
              name="vin"
              placeholder="17-character VIN for exact fitment"
              maxLength={17}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Adding your VIN lets us verify exact part fitment for your production date.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>2. Your Estimate</CardTitle>
          <CardDescription>
            PDF, photo, or screenshot — up to 16&nbsp;MB. We read it automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <p className="text-xs text-muted-foreground">Uploaded and ready to analyze</p>
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
            <p className="mt-3 text-sm font-medium text-destructive">{uploadError}</p>
          )}

          <input type="hidden" name="fileUrl" value={file?.url ?? ""} />
          <input type="hidden" name="fileType" value={file?.type ?? ""} />

          {state?.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
              {state.error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-6 w-full"
            disabled={pending || !file}
          >
            {pending ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Analyzing your estimate…
              </>
            ) : (
              <>
                <FileText className="size-5" />
                Analyze My Estimate
              </>
            )}
          </Button>
          {pending && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Reading every line item and matching parts — usually a few seconds.
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
