"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { FunnelEventName } from "@/lib/analytics";

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
};

const ATTRIBUTION_KEY = "engine-genie-attribution";
const SESSION_KEY = "engine-genie-session";

function getSessionId() {
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getAttribution(): Attribution {
  const url = new URL(window.location.href);
  const incoming: Attribution = {
    source: url.searchParams.get("utm_source") || undefined,
    medium: url.searchParams.get("utm_medium") || undefined,
    campaign: url.searchParams.get("utm_campaign") || undefined,
    content: url.searchParams.get("utm_content") || undefined,
    term: url.searchParams.get("utm_term") || undefined,
    referrer: document.referrer || undefined,
  };
  const hasCampaign = Object.values(incoming).some(Boolean);
  if (hasCampaign) window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(incoming));
  try {
    return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || "{}") as Attribution;
  } catch {
    return incoming;
  }
}

export function trackFunnelEvent(event: FunnelEventName) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  const path = window.location.pathname;
  const dedupeKey = `engine-genie-event:${sessionId}:${event}:${path}`;
  if (window.sessionStorage.getItem(dedupeKey)) return;
  window.sessionStorage.setItem(dedupeKey, "1");
  void fetch("/api/funnel-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ event, sessionId, path, ...getAttribution() }),
  }).catch(() => window.sessionStorage.removeItem(dedupeKey));
}

export function FunnelTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/") trackFunnelEvent("LANDING_VIEW");
    else if (pathname === "/upload") trackFunnelEvent("UPLOAD_VIEW");
    else if (pathname === "/sample-results") trackFunnelEvent("SAMPLE_VIEW");
  }, [pathname]);
  return null;
}
