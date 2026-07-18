import { db } from "@/lib/db";
import type { User } from "@prisma/client";

/**
 * Local single-user mode: no external auth provider, no accounts, no sign-in.
 * Every visitor is the owner of this local install, who is also the admin.
 */
const OWNER_EMAIL = "demo@bmwestimatecheck.com";

export async function ensureUser(): Promise<User> {
  return db.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { isAdmin: true },
    create: {
      clerkId: "local-owner",
      email: OWNER_EMAIL,
      name: "Demo Driver",
      isAdmin: true,
    },
  });
}

/** In local mode the owner is always the admin. */
export async function getAdminUser(): Promise<User | null> {
  return ensureUser();
}
