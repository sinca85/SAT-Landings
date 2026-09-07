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
        <p>Asesoramiento real para proteger lo que importa.</p>
      </div>

      {(emails.length > 0 || whatsapps.length > 0 || addresses.length > 0) && <section className="site-footer__section">
        <h2>Contacto</h2>
        <ul className="site-footer__contact-list">
          {whatsapps.map((entry) => <li key={entry.slug}><MessageCircle aria-hidden="true" size={18} /><a href={whatsappUrl(entry.value)} target="_blank" rel="noreferrer">{entry.label || entry.value}</a></li>)}
          {emails.map((entry) => <li key={entry.slug}><Mail aria-hidden="true" size={18} /><a href={`mailto:${entry.value}`}>{entry.label || entry.value}</a></li>)}
          {addresses.map((entry) => <li key={entry.slug}><MapPin aria-hidden="true" size={18} /><a href={mapsUrl(entry.value)} target="_blank" rel="noreferrer">{entry.label || entry.value}</a></li>)}
        </ul>
      </section>}

      {socialLinks.length > 0 && <section className="site-footer__section site-footer__social">
        <h2>Seguinos</h2>
        <div className="site-footer__social-links">
          {socialLinks.map((entry) => <a key={entry.slug} href={externalUrl(entry.value)} target="_blank" rel="noreferrer" aria-label={entry.label} title={entry.label}><Globe2 aria-hidden="true" size={20} /></a>)}
        </div>
      </section>}
    </div>
    <div className="site-footer__bottom"><span>© {new Date().getFullYear()} Seguro a Tiempo. Todos los derechos reservados.</span></div>
  </footer>;
}
