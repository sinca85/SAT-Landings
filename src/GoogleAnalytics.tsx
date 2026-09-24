import { useEffect } from "react";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void; _fbq?: unknown; }
}

const utmParams = () => { const params = new URLSearchParams(window.location.search); return { utm_source: params.get("utm_source") || undefined, utm_campaign: params.get("utm_campaign") || undefined, utm_content: params.get("utm_content") || undefined, utm_medium: params.get("utm_medium") || undefined, utm_term: params.get("utm_term") || undefined }; };
export function trackLandingEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  const payload = { ...utmParams(), ...parameters };
  console.info(`[Seguro a Tiempo][GA4] Evento enviado: ${eventName}`, payload);
  if (window.gtag) window.gtag("event", eventName, payload);
  else { window.dataLayer = window.dataLayer || []; window.dataLayer.push(["event", eventName, payload]); }
}

export function trackMetaEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  const payload = { ...utmParams(), ...parameters };
  if (!window.fbq) { console.info(`[Seguro a Tiempo][Meta] Evento en cola: ${eventName}`, payload); return; }
  console.info(`[Seguro a Tiempo][Meta] Evento enviado: ${eventName}`, payload);
  window.fbq("track", eventName, payload);
}

export function TrackingScripts() {
  useEffect(() => {
    const onWhatsAppClick = (event: MouseEvent) => { const target = event.target as HTMLElement; const link = target.closest<HTMLAnchorElement>('a[href*="wa.me"]'); if (!link) return; trackLandingEvent("whatsapp_click", { placement: link.className || "whatsapp_cta" }); trackMetaEvent("Contact", { placement: link.className || "whatsapp_cta" }); };
    document.addEventListener("click", onWhatsAppClick);
    const ga = document.createElement("script"); ga.async = true; ga.src = "https://www.googletagmanager.com/gtag/js?id=G-WSQ0X7LXTC"; document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args)); window.gtag("js", new Date()); window.gtag("config", "G-WSQ0X7LXTC"); console.info("[Seguro a Tiempo][GA4] Configuración inicializada", "G-WSQ0X7LXTC");
    const pixel = document.createElement("script"); pixel.text = "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');"; document.head.appendChild(pixel); window.fbq = window.fbq || ((...args: unknown[]) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push(["fbq", ...args]); }); window.fbq("init", "1378259864357969"); console.info("[Seguro a Tiempo][Meta] Pixel inicializado", "1378259864357969"); window.fbq("track", "PageView"); trackMetaEvent("PageView");
    return () => document.removeEventListener("click", onWhatsAppClick);
  }, []);
  return null;
}
