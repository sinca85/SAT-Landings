import { useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://api.seguroatiempo.com";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}

export function GoogleAnalytics() {
  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/api/analytics/config`)
      .then((response) => response.ok ? response.json() as Promise<{ measurementId?: string }> : null)
      .then((configuration) => {
        const measurementId = configuration?.measurementId;
        if (cancelled || !measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return;
        if (!document.querySelector(`script[data-sat-ga="${measurementId}"]`)) {
          const script = document.createElement("script");
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
          script.dataset.satGa = measurementId;
          document.head.appendChild(script);
        }
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
        window.gtag("js", new Date());
        window.gtag("config", measurementId);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return null;
}
