import { useEffect } from "react";
import type { AutoConfig } from "./auto-api";

type Pixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; push?: Pixel; loaded?: boolean; version?: string };
type AutoWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: Pixel; _fbq?: Pixel };
const target = window as AutoWindow;
let enabled = false;
let configured = "";
export function trackAutoEvent(name: "auto_vehicle_completed" | "auto_quote_completed") {
  if (!enabled) return;
  target.gtag?.("event", name, { campaign: "Galeno Auto", environment: "sandbox" });
  target.fbq?.("trackCustom", name, { campaign: "Galeno Auto", environment: "sandbox" });
}
export function AutoAnalytics({ config }: { config: AutoConfig["analytics"] }) {
  useEffect(() => {
    enabled = config.enabled === true;
    if (!enabled) return;
    const id = config.measurementId;
    const pixel = config.metaPixelId;
    if (!id || !/^G-[A-Z0-9]+$/.test(id)) { enabled = false; return; }
    const signature = `${id}:${pixel || ""}`;
    // React StrictMode remount must not create duplicate tags/pageviews.
    if (configured !== signature) {
      target.dataLayer = target.dataLayer || [];
      target.gtag = target.gtag || function () { target.dataLayer!.push(arguments); };
      target.gtag("js", new Date());
      target.gtag("config", id, { page_location: `${location.origin}${location.pathname}`, page_title: "Cotizador Auto | Seguro a Tiempo" });
      const ga = document.createElement("script"); ga.id = "auto-google-analytics"; ga.async = true; ga.src = `https://www.googletagmanager.com/gtag/js?id=${id}`; document.head.appendChild(ga);
      if (pixel && /^\d+$/.test(pixel)) {
        if (!target.fbq) {
          const fbq: Pixel = (...args) => { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue!.push(args); };
          fbq.queue = []; fbq.push = fbq; fbq.loaded = true; fbq.version = "2.0"; target.fbq = fbq; target._fbq = fbq;
          const meta = document.createElement("script"); meta.id = "auto-meta-pixel"; meta.async = true; meta.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(meta);
        }
        target.fbq("init", pixel); target.fbq("track", "PageView");
      }
      configured = signature;
    }
    return () => { enabled = false; };
  }, [config.enabled, config.measurementId, config.metaPixelId]);
  return null;
}
