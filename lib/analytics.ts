import "server-only";
import { db } from "@/lib/db";

export const FUNNEL_EVENTS = [
  "LANDING_VIEW",
  "UPLOAD_VIEW",
  "SAMPLE_VIEW",
  "UPLOAD_STARTED",
  "UPLOAD_COMPLETED",
  "MANUAL_SEARCH_STARTED",
  "ESTIMATE_CREATED",
  "ESTIMATE_PARSED",
  "REVIEW_CONFIRMED",
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export async function recordFunnelEvent(
  event: FunnelEventName,
  data: {
    sessionId?: string | null;
    path?: string | null;
    estimateId?: string | null;
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
    referrer?: string | null;
  } = {}
) {
  try {
    await db.funnelEvent.create({
      data: {
        event,
        sessionId: data.sessionId?.slice(0, 80) || null,
        path: data.path?.slice(0, 240) || null,
        estimateId: data.estimateId?.slice(0, 80) || null,
        source: data.source?.slice(0, 120) || null,
        medium: data.medium?.slice(0, 120) || null,
        campaign: data.campaign?.slice(0, 160) || null,
        content: data.content?.slice(0, 160) || null,
        term: data.term?.slice(0, 160) || null,
        referrer: data.referrer?.slice(0, 2000) || null,
      },
    });
  } catch (error) {
    console.error("funnel event failed", error);
  }
}
