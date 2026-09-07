import { useEffect, useMemo, useState } from "react";
import { Globe2, Mail, MapPin, MessageCircle } from "lucide-react";

type ConfigType = "email" | "whatsapp" | "direccion" | "red_social";

type ConfigEntry = {
  slug: string;
  label: string;
  value: string;
  type: ConfigType;
  category: "contactos" | "ubicacion" | "redes_sociales";
};

const API_URL = import.meta.env.VITE_API_URL || "https://api.seguroatiempo.com";

function whatsappUrl(value: string) {
  const number = value.replace(/\D/g, "");
  return number ? `https://wa.me/${number}` : "#";
}

function mapsUrl(value: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

function externalUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function SocialIcon({ entry }: { entry: ConfigEntry }) {
  const key = `${entry.slug} ${entry.label} ${entry.value}`.toLowerCase();
  const path = key.includes("facebook")
    ? "M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-92.4 233.5h-63.9c-50.1 0-59.8 23.8-59.8 58.8v77.1h119.6l-15.6 120.7h-104V912H539.2V602.2H434.9V481.4h104.3v-89c0-103.3 63.1-159.6 155.3-159.6 44.2 0 82.1 3.3 93.2 4.8v107.9z"
    : key.includes("instagram")
      ? "M512 306.9c-113.5 0-205.1 91.6-205.1 205.1S398.5 717.1 512 717.1 717.1 625.5 717.1 512 625.5 306.9 512 306.9zm0 338.4c-73.4 0-133.3-59.9-133.3-133.3S438.6 378.7 512 378.7 645.3 438.6 645.3 512 585.4 645.3 512 645.3zm213.5-394.6c-26.5 0-47.9 21.4-47.9 47.9s21.4 47.9 47.9 47.9 47.9-21.3 47.9-47.9a47.84 47.84 0 00-47.9-47.9zM911.8 512c0-55.2.5-109.9-2.6-165-3.1-64-17.7-120.8-64.5-167.6-46.9-46.9-103.6-61.4-167.6-64.5-55.2-3.1-109.9-2.6-165-2.6-55.2 0-109.9-.5-165 2.6-64 3.1-120.8 17.7-167.6 64.5C132.6 226.3 118.1 283 115 347c-3.1 55.2-2.6 109.9-2.6 165s-.5 109.9 2.6 165c3.1 64 17.7 120.8 64.5 167.6 46.9 46.9 103.6 61.4 167.6 64.5 55.2 3.1 120.8 2.6 165 2.6s109.9.5 165-2.6c64-3.1 120.8-17.7 167.6-64.5 46.9-46.9 61.4-103.6 64.5-167.6 3.2-55.1 2.6-109.8 2.6-165zm-88 235.8c-7.3 18.2-16.1 31.8-30.2 45.8-14.1 14.1-27.6 22.9-45.8 30.2C695.2 844.7 570.3 840 512 840c-58.3 0-183.3 4.7-235.9-16.1-18.2-7.3-31.8-16.1-45.8-30.2-14.1-14.1-22.9-27.6-30.2-45.8C179.3 695.2 184 570.3 184 512c0-58.3-4.7-183.3 16.1-235.9 7.3-18.2 16.1-31.8 30.2-45.8s27.6-22.9 45.8-30.2C328.7 179.3 453.7 184 512 184s183.3-4.7 235.9 16.1c18.2 7.3 31.8 16.1 45.8 30.2 14.1 14.1 22.9 27.6 30.2 45.8C844.7 328.7 840 453.7 840 512c0 58.3 4.7 183.2-16.2 235.8z"
      : key.includes("linkedin")
        ? "M847.7 112H176.3c-35.5 0-64.3 28.8-64.3 64.3v671.4c0 35.5 28.8 64.3 64.3 64.3h671.4c35.5 0 64.3-28.8 64.3-64.3V176.3c0-35.5-28.8-64.3-64.3-64.3zM230.6 411.9h118.7v381.8H230.6zm59.4-52.2c37.9 0 68.8-30.8 68.8-68.8a68.8 68.8 0 10-137.6 0c-.1 38 30.7 68.8 68.8 68.8zm252.3 245.1c0-49.8 9.5-98 71.2-98 60.8 0 61.7 56.9 61.7 101.2v185.7h118.6V584.3c0-102.8-22.2-181.9-142.3-181.9-57.7 0-96.4 31.7-112.3 61.7h-1.6v-52.2H423.7v381.8h118.6V604.8z"
        : undefined;
  if (!path) return <Globe2 aria-hidden="true" size={20} />;
  return <svg aria-hidden="true" viewBox="64 64 896 896" width="20" height="20" fill="currentColor"><path d={path} /></svg>;
}

export function SiteFooter() {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/config`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar la configuración pública.");
        return response.json() as Promise<{ entries?: ConfigEntry[] }>;
      })
      .then((data) => setEntries(Array.isArray(data.entries) ? data.entries : []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEntries([]);
      });
    return () => controller.abort();
  }, []);

  const { emails, whatsapps, addresses, socialLinks } = useMemo(() => ({
    emails: entries.filter((entry) => entry.type === "email"),
    whatsapps: entries.filter((entry) => entry.type === "whatsapp"),
    addresses: entries.filter((entry) => entry.type === "direccion"),
    socialLinks: entries.filter((entry) => entry.type === "red_social"),
  }), [entries]);

  return <footer className="site-footer" aria-label="Información de contacto">
    <div className="site-footer__inner">
      <div className="site-footer__brand">
        <a href="https://seguroatiempo.com/" aria-label="Seguro a Tiempo, inicio">
          <img src="/assets/logo-seguro-a-tiempo.svg" alt="Seguro a Tiempo" />
        </a>
        <img className="site-footer__ssn" src="/assets/ssn-logo.png" alt="Superintendencia de Seguros de la Nación" />
        <p>Asesoramiento real para proteger lo que importa.</p>
      </div>

      {(emails.length > 0 || whatsapps.length > 0 || addresses.length > 0) && <section className="site-footer__section">
        <h2>Contacto</h2>
        <ul className="site-footer__contact-list">
          {whatsapps.map((entry) => <li key={entry.slug}><MessageCircle aria-hidden="true" size={18} /><a href={whatsappUrl(entry.value)} target="_blank" rel="noreferrer">{entry.value}</a></li>)}
          {emails.map((entry) => <li key={entry.slug}><Mail aria-hidden="true" size={18} /><a href={`mailto:${entry.value}`}>{entry.value}</a></li>)}
          {addresses.map((entry) => <li key={entry.slug}><MapPin aria-hidden="true" size={18} /><a href={mapsUrl(entry.value)} target="_blank" rel="noreferrer">{entry.value}</a></li>)}
        </ul>
      </section>}

      {socialLinks.length > 0 && <section className="site-footer__section site-footer__social">
        <h2>Seguinos</h2>
        <div className="site-footer__social-links">
          {socialLinks.map((entry) => <a key={entry.slug} href={externalUrl(entry.value)} target="_blank" rel="noreferrer" aria-label={entry.label} title={entry.label}><SocialIcon entry={entry} /></a>)}
        </div>
      </section>}
    </div>
    <div className="site-footer__bottom"><span>© {new Date().getFullYear()} Seguro a Tiempo. Todos los derechos reservados.</span></div>
  </footer>;
}
