import "server-only";
import { db } from "@/lib/db";

const AI_SETTING_KEY = "ai_parsing_enabled";

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const aiLimits = {
  perUserDaily: positiveInt(process.env.AI_PER_USER_DAILY_LIMIT, 5),
  globalDaily: positiveInt(process.env.AI_DAILY_CALL_LIMIT, 40),
  globalMonthly: positiveInt(process.env.AI_MONTHLY_CALL_LIMIT, 500),
};

function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfUtcMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function isAiParsingEnabled() {
  if (process.env.AI_PARSING_ENABLED?.toLowerCase() === "false") return false;
  const setting = await db.appSetting.findUnique({ where: { key: AI_SETTING_KEY } });
  return setting?.value !== "false";
}

export async function setAiParsingEnabled(enabled: boolean) {
  await db.appSetting.upsert({
    where: { key: AI_SETTING_KEY },
    update: { value: String(enabled) },
    create: { key: AI_SETTING_KEY, value: String(enabled) },
  });
}

export async function reserveAiCall(input: {
  userId: string;
  estimateId: string;
  inputType: "image" | "text";
}) {
  if (!(await isAiParsingEnabled())) return null;
  const now = new Date();
  const [userToday, globalToday, globalMonth] = await Promise.all([
    db.aiUsage.count({ where: { userId: input.userId, createdAt: { gte: startOfUtcDay(now) } } }),
    db.aiUsage.count({ where: { createdAt: { gte: startOfUtcDay(now) } } }),
    db.aiUsage.count({ where: { createdAt: { gte: startOfUtcMonth(now) } } }),
  ]);
  if (
    userToday >= aiLimits.perUserDaily ||
    globalToday >= aiLimits.globalDaily ||
    globalMonth >= aiLimits.globalMonthly
  ) return null;

  return db.aiUsage.create({
    data: {
      userId: input.userId,
      estimateId: input.estimateId,
      inputType: input.inputType,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    },
  });
}

export async function finishAiCall(id: string, succeeded: boolean) {
  await db.aiUsage.update({ where: { id }, data: { succeeded } }).catch(() => undefined);
}

export async function getAiBudgetStatus() {
  const now = new Date();
  const [enabled, today, month] = await Promise.all([
    isAiParsingEnabled(),
    db.aiUsage.count({ where: { createdAt: { gte: startOfUtcDay(now) } } }),
    db.aiUsage.count({ where: { createdAt: { gte: startOfUtcMonth(now) } } }),
  ]);
  return { enabled, today, month, limits: aiLimits };
}
