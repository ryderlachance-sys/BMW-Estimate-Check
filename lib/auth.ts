import { db } from "@/lib/db";
import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  isValidAdminToken,
  readCustomerToken,
} from "@/lib/session";

export async function ensureUser(): Promise<User> {
  const store = await cookies();
  const guestId = await readCustomerToken(store.get(CUSTOMER_COOKIE)?.value);
  if (!guestId) {
    throw new Error("Your secure session is missing. Refresh the page and try again.");
  }
  const email = `guest-${guestId}@users.enginegenie.local`;
  return db.user.upsert({
    where: { clerkId: `guest:${guestId}` },
    update: {},
    create: {
      clerkId: `guest:${guestId}`,
      email,
      name: "Guest Driver",
      isAdmin: false,
    },
  });
}

export async function getAdminUser(): Promise<User | null> {
  const store = await cookies();
  if (!(await isValidAdminToken(store.get(ADMIN_COOKIE)?.value))) return null;
  return ensureUser();
}
