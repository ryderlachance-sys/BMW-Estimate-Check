"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/session";

export type AdminLoginState = { error?: string } | null;

export async function adminLogin(
  _previous: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  const supplied = String(formData.get("password") ?? "");
  if (!configured) return { error: "Admin login is not configured yet." };
  if (supplied !== configured) return { error: "Incorrect password." };

  const store = await cookies();
  store.set(ADMIN_COOKIE, await createAdminToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/owner-login");
}
