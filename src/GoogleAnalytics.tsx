import { useEffect } from "react";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void; _fbq?: unknown; }
}

const utmParams = () => { const params = new URLSearchParams(window.location.search); return { utm_source: params.get("utm_source") || undefined, utm_campaign: params.get("utm_campaign") || undefined, utm_content: params.get("utm_content") || undefined, utm_medium: params.get("utm_medium") || undefined, utm_term: params.get("utm_term") || undefined }; };
export function trackLandingEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  const payload = { campaign: "Allianz Hogar", source: "landing", ...utmParams(), ...parameters };
  if (window.gtag) window.gtag("event", eventName, payload);
  else { window.dataLayer = window.dataLayer || []; window.dataLayer.push(["event", eventName, payload]); }
}

export function trackMetaEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  if (!window.fbq) return;
  window.fbq(eventName, { ...utmParams(), campaign: "Allianz Hogar", source: "landing", ...parameters });
}

export function TrackingScripts() {
  useEffect(() => {
    const ga = document.createElement("script"); ga.async = true; ga.src = "https://www.googletagmanager.com/gtag/js?id=G-WSQ0X7LXTC"; document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args)); window.gtag("js", new Date()); window.gtag("config", "G-WSQ0X7LXTC");
    const pixel = document.createElement("script"); pixel.text = "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');"; document.head.appendChild(pixel); window.fbq = window.fbq || ((...args: unknown[]) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push(["fbq", ...args]); }); window.fbq("init", "1378259864357969"); window.fbq("track", "PageView"); trackMetaEvent("PageView");
  }, []);
  return null;
}
