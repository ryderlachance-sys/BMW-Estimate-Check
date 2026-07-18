import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";

export type EmailType =
  | "ORDER_CONFIRMED"
  | "PARTS_SHIPPED"
  | "PARTS_DELIVERED"
  | "DELIVERY_AFTER_APPOINTMENT";

/**
 * Local email notifications — no SendGrid/Mailgun account required.
 * Persists to the database (visible in dashboard) and writes a copy under
 * `.emails/` so you can open the message as a file while developing.
 */
export async function sendOrderEmail(opts: {
  userId: string;
  orderId: string;
  toEmail: string;
  type: EmailType;
  subject: string;
  body: string;
}): Promise<void> {
  const record = await db.emailNotification.create({
    data: {
      userId: opts.userId,
      orderId: opts.orderId,
      type: opts.type,
      subject: opts.subject,
      body: opts.body,
    },
  });

  const dir = path.join(process.cwd(), ".emails");
  await mkdir(dir, { recursive: true });
  const file = path.join(
    dir,
    `${record.createdAt.toISOString().replace(/[:.]/g, "-")}-${opts.type}-${opts.orderId.slice(-8)}.txt`
  );
  await writeFile(
    file,
    [
      `To: ${opts.toEmail}`,
      `Subject: ${opts.subject}`,
      `Type: ${opts.type}`,
      `Order: ${opts.orderId}`,
      "",
      opts.body,
    ].join("\n"),
    "utf8"
  );
}
