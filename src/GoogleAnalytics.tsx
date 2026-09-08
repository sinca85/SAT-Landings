declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}

export function trackLandingEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  const payload = { campaign: "Allianz Hogar", source: "landing", ...parameters };
  if (window.gtag) window.gtag("event", eventName, payload);
  else { window.dataLayer = window.dataLayer || []; window.dataLayer.push(["event", eventName, payload]); }
}
