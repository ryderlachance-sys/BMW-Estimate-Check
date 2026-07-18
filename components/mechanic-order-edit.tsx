"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  updateOrderMechanicDelivery,
  type MechanicActionState,
} from "@/app/actions/mechanics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MechanicOrderEditForm({
  orderId,
  shopName,
  contactPerson,
  address,
  city,
  shopState,
  zip,
  phone,
  appointmentDate,
  appointmentTime,
  repairNotes,
}: {
  orderId: string;
  shopName: string;
  contactPerson: string | null;
  address: string;
  city: string;
  shopState: string;
  zip: string;
  phone: string;
  appointmentDate: Date | null;
  appointmentTime: string | null;
  repairNotes: string | null;
}) {
  const [formState, formAction, pending] = useActionState<MechanicActionState, FormData>(
    updateOrderMechanicDelivery,
    null
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-sm font-semibold">Edit mechanic delivery</p>
      <p className="text-xs text-muted-foreground">
        You can update shop details until the order starts processing.
      </p>
      <div className="space-y-2">
        <Label htmlFor="shopName">Mechanic or shop name</Label>
        <Input id="shopName" name="shopName" required defaultValue={shopName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPerson">Contact person</Label>
        <Input
          id="contactPerson"
          name="contactPerson"
          defaultValue={contactPerson ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Shop address</Label>
        <Input id="address" name="address" required defaultValue={address} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 space-y-2 sm:col-span-1">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" required defaultValue={city} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select id="state" name="state" required defaultValue={shopState}>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" required defaultValue={zip} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" required defaultValue={phone} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="appointmentDate">Appointment date</Label>
          <Input
            id="appointmentDate"
            name="appointmentDate"
            type="date"
            required
            defaultValue={toDateInput(appointmentDate)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="appointmentTime">Appointment time</Label>
          <Input
            id="appointmentTime"
            name="appointmentTime"
            type="time"
            defaultValue={appointmentTime ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="repairNotes">Repair notes</Label>
        <Textarea
          id="repairNotes"
          name="repairNotes"
          defaultValue={repairNotes ?? ""}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="saveToFavorites"
          value="yes"
          defaultChecked
          className="size-4 rounded border"
        />
        Update Favorite Mechanics in my Garage
      </label>
      {formState?.error && (
        <p className="text-sm font-medium text-destructive">{formState.error}</p>
      )}
      {formState?.ok && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" /> Saved
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  );
}
