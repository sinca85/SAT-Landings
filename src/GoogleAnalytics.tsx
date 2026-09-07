import { useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://api.seguroatiempo.com";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}

export function trackLandingEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  const payload = { campaign: "Allianz Hogar", source: "landing", ...parameters };
  if (window.gtag) window.gtag("event", eventName, payload);
  else { window.dataLayer = window.dataLayer || []; window.dataLayer.push(["event", eventName, payload]); }
}

export function GoogleAnalytics() {
  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/api/analytics/config`)
      .then((response) => response.ok ? response.json() as Promise<{ measurementId?: string }> : null)
      .then((configuration) => {
        const measurementId = configuration?.measurementId;
        if (cancelled || !measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
        window.gtag("js", new Date());
        const configureAndTrackPage = () => {
          window.gtag?.("config", measurementId, { send_page_view: false });
          // Google procesa la configuración del contenedor de forma asíncrona.
          // El breve diferimiento garantiza que el evento use la medición ya inicializada.
          window.setTimeout(() => {
            window.gtag?.("event", "page_view", { page_title: document.title, page_location: window.location.href });
          }, 100);
        };
        const existingScript = document.querySelector(`script[data-sat-ga="${measurementId}"]`);
        if (!existingScript) {
          const script = document.createElement("script");
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
          script.dataset.satGa = measurementId;
          script.addEventListener("load", configureAndTrackPage, { once: true });
          document.head.appendChild(script);
        } else {
          configureAndTrackPage();
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return null;
}
