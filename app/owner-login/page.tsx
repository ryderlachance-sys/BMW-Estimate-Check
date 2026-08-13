"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { adminLogin } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OwnerLoginPage() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <Card className="w-full">
        <CardContent className="p-8">
          <ShieldCheck className="size-10 text-primary" />
          <h1 className="mt-5 text-2xl font-bold">Owner access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area contains private estimate, click, and product analytics.
          </p>
          <form action={action} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold" htmlFor="password">
              Admin password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:ring-2 focus:ring-primary"
            />
            {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
            <Button className="w-full" disabled={pending}>
              {pending ? "Checking…" : "Open admin dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
