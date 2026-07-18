"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, Home, Loader2, MapPin, Package, Wrench } from "lucide-react";
import { placeOrder, type PlaceOrderState } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export type SavedMechanic = {
  id: string;
  shopName: string;
  contactPerson: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  notes: string | null;
  isFavorite: boolean;
};

type Destination = "HOME" | "MECHANIC";

export function CheckoutForm({
  savedMechanics,
  deliveryLabel,
  stripeEnabled,
}: {
  savedMechanics: SavedMechanic[];
  deliveryLabel: string;
  /** When true, submit sends the customer to Stripe to enter their card. */
  stripeEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<PlaceOrderState, FormData>(
    placeOrder,
    null
  );
  const [destination, setDestination] = useState<Destination>("HOME");
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(
    savedMechanics[0]?.id ?? null
  );

  const selected = useMemo(
    () => savedMechanics.find((m) => m.id === selectedMechanicId) ?? null,
    [savedMechanics, selectedMechanicId]
  );

  const favorites = savedMechanics.filter((m) => m.isFavorite);
  const mechanicCards = favorites.length > 0 ? favorites : savedMechanics;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="destination" value={destination} />

      <div>
        <p className="text-sm font-semibold">Where should we ship the parts?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ship to your home or straight to the shop — same simple checkout either way.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDestination("HOME")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              destination === "HOME"
                ? "border-primary bg-accent ring-2 ring-primary/20"
                : "hover:bg-secondary"
            )}
          >
            <Home className="size-5 text-primary" />
            <p className="mt-2 font-semibold">Ship to My Address</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Standard residential delivery to you.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setDestination("MECHANIC")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              destination === "MECHANIC"
                ? "border-primary bg-accent ring-2 ring-primary/20"
                : "hover:bg-secondary"
            )}
          >
            <Wrench className="size-5 text-primary" />
            <p className="mt-2 font-semibold">Ship Directly to My Mechanic</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Parts arrive at the shop before your appointment.
            </p>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed bg-secondary/40 px-4 py-3 text-sm">
        <p className="font-medium">Recommended delivery</p>
        <p className="text-muted-foreground">{deliveryLabel}</p>
      </div>

      {destination === "HOME" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required placeholder="Alex Fahrer" autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Street address</Label>
            <Input
              id="address"
              name="address"
              required
              placeholder="1234 Autobahn Ave, Apt 5"
              autoComplete="street-address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required placeholder="Columbus" autoComplete="address-level2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select id="state" name="state" required defaultValue="OH">
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                name="zip"
                required
                placeholder="43004"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {mechanicCards.length > 0 && (
            <div>
              <p className="text-sm font-semibold">Favorite mechanics</p>
              <p className="mt-1 text-xs text-muted-foreground">
                One click to reuse a shop you&apos;ve used before.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {mechanicCards.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMechanicId(m.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      selectedMechanicId === m.id
                        ? "border-primary bg-accent ring-2 ring-primary/20"
                        : "hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold">{m.shopName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.address}, {m.city}, {m.state} {m.zip}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedMechanicId(null)}
                  className={cn(
                    "rounded-xl border border-dashed p-4 text-left transition-colors",
                    selectedMechanicId === null
                      ? "border-primary bg-accent ring-2 ring-primary/20"
                      : "hover:bg-secondary"
                  )}
                >
                  <p className="font-semibold">Use a different shop</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter new mechanic details below.
                  </p>
                </button>
              </div>
            </div>
          )}

          <input type="hidden" name="mechanicId" value={selected?.id ?? ""} />

          <div className="space-y-4 rounded-xl border p-4">
            <p className="text-sm font-semibold">Mechanic / shop details</p>
            <div className="space-y-2">
              <Label htmlFor="shopName">Mechanic or shop name</Label>
              <Input
                id="shopName"
                name="shopName"
                required
                key={`shop-${selected?.id ?? "new"}`}
                defaultValue={selected?.shopName ?? ""}
                placeholder="Precision Motorwerks LLC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact person (optional)</Label>
              <Input
                id="contactPerson"
                name="contactPerson"
                key={`contact-${selected?.id ?? "new"}`}
                defaultValue={selected?.contactPerson ?? ""}
                placeholder="Mike D."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-address">Shop address</Label>
              <Input
                id="m-address"
                name="address"
                required
                key={`addr-${selected?.id ?? "new"}`}
                defaultValue={selected?.address ?? ""}
                placeholder="2280 Commerce Blvd, Unit C"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 space-y-2 sm:col-span-1">
                <Label htmlFor="m-city">City</Label>
                <Input
                  id="m-city"
                  name="city"
                  required
                  key={`city-${selected?.id ?? "new"}`}
                  defaultValue={selected?.city ?? ""}
                  placeholder="Columbus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-state">State</Label>
                <Select
                  id="m-state"
                  name="state"
                  required
                  key={`state-${selected?.id ?? "new"}`}
                  defaultValue={selected?.state ?? "OH"}
                >
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-zip">ZIP</Label>
                <Input
                  id="m-zip"
                  name="zip"
                  required
                  key={`zip-${selected?.id ?? "new"}`}
                  defaultValue={selected?.zip ?? ""}
                  placeholder="43204"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                required
                key={`phone-${selected?.id ?? "new"}`}
                defaultValue={selected?.phone ?? ""}
                placeholder="(614) 555-0187"
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">Appointment date</Label>
                <Input id="appointmentDate" name="appointmentDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentTime">Appointment time (optional)</Label>
                <Input id="appointmentTime" name="appointmentTime" type="time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repairNotes">Repair notes (optional)</Label>
              <Textarea
                id="repairNotes"
                name="repairNotes"
                key={`notes-${selected?.id ?? "new"}`}
                defaultValue={selected?.notes ?? ""}
                placeholder="Leave parts with advisor Mike. Customer will bring vehicle Friday."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="saveMechanic"
                value="yes"
                defaultChecked
                className="size-4 rounded border"
              />
              Save this shop to Favorite Mechanics in my Garage
            </label>
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              We&apos;ll warn you if estimated delivery looks later than your appointment date.
            </div>
          </div>
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-destructive">
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Package className="size-4" />}
        {pending
          ? stripeEnabled
            ? "Opening secure payment…"
            : "Placing your order…"
          : stripeEnabled
            ? destination === "MECHANIC"
              ? "Pay & ship to my mechanic"
              : "Pay with card"
            : destination === "MECHANIC"
              ? "Confirm mechanic delivery"
              : "Place order"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {stripeEnabled
          ? "You'll enter your card on Stripe's secure checkout. Stripe is free to set up — they only take a small fee when a payment succeeds (~2.9% + $0.30)."
          : "Demo mode: no Stripe keys in .env yet, so no card is charged. Add free test keys from dashboard.stripe.com to take real (or test) payments."}
      </p>
    </form>
  );
}
