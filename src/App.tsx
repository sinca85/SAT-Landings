import { FormEvent, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Droplets, Flame, Home, House, KeyRound, LockKeyhole, Mail, MonitorSmartphone, ShieldCheck, Sparkles, Wrench } from "lucide-react";

type HomeType = "Casa" | "Departamento" | "PH" | "Barrio privado";
type FormState = { postalCode: string; homeType: HomeType; floor: string; area: string; name: string; email: string; phone: string };

const initialForm: FormState = { postalCode: "", homeType: "Casa", floor: "", area: "", name: "", email: "", phone: "" };
const homeTypes = [
  { value: "Casa" as const, icon: House }, { value: "Departamento" as const, icon: Building2 },
  { value: "PH" as const, icon: Home }, { value: "Barrio privado" as const, icon: KeyRound },
];
const quotes: Record<string, { area: string; monthly: number; structure: number }> = {
  "50": { area: "hasta 50 m²", monthly: 18_990, structure: 75_000_000 },
  "80": { area: "51 a 80 m²", monthly: 24_999, structure: 105_000_000 },
  "120": { area: "81 a 120 m²", monthly: 30_990, structure: 150_000_000 },
  "160": { area: "121 a 160 m²", monthly: 37_990, structure: 200_000_000 },
  "200": { area: "más de 160 m²", monthly: 44_990, structure: 250_000_000 },
};
const API_URL = import.meta.env.VITE_API_URL || "https://api.seguroatiempo.com";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function Stepper({ current }: { current: number }) {
  return <ol className="stepper" aria-label={`Paso ${current} de 3`}>
    {["Tu hogar", "Tus datos", "Tu cotización"].map((label, index) => {
      const number = index + 1, done = number < current;
      return <li className={number === current ? "is-current" : done ? "is-done" : ""} key={label}>
        <span className="step-marker">{done ? <Check size={15} strokeWidth={3} /> : number}</span><span>{label}</span>
      </li>;
    })}
  </ol>;
}

function SiteHeader() {
  return <header className="site-header"><div className="header-inner">
    <a href="https://seguroatiempo.com/" aria-label="Seguro a Tiempo, inicio"><img src="/assets/logo-seguro-a-tiempo.svg" alt="Seguro a Tiempo" className="brand-logo" /></a>
    <div className="secure-label"><ShieldCheck size={19} /> Cotización <strong>100% segura</strong></div>
  </div></header>;
}

function HomeStep({ form, setForm, onContinue, error }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; onContinue: () => void; error: string }) {
  return <section className="form-step" aria-labelledby="home-title">
    <div className="section-heading"><p className="eyebrow">Cotizá online en minutos</p><h1 id="home-title">Contanos sobre tu hogar</h1><p>Así podemos encontrar una cobertura pensada para vos.</p></div>
    <div className="fields-grid">
      <div className="field"><label htmlFor="postal-code">Código postal</label><input id="postal-code" inputMode="numeric" maxLength={4} placeholder="Ej: 1425" value={form.postalCode} onChange={e => setForm(v => ({ ...v, postalCode: e.target.value.replace(/\D/g, "") }))} /></div>
      <fieldset className="field home-type-field"><legend>Tipo de vivienda</legend><div className="home-types">
        {homeTypes.map(({ value, icon: Icon }) => <button className={`home-type ${form.homeType === value ? "is-selected" : ""}`} type="button" aria-pressed={form.homeType === value} onClick={() => setForm(v => ({ ...v, homeType: value }))} key={value}><Icon size={25} /><span>{value}</span></button>)}
      </div></fieldset>
      <div className="field"><label htmlFor="floor">Piso</label><select id="floor" value={form.floor} onChange={e => setForm(v => ({ ...v, floor: e.target.value }))}><option value="">Seleccioná el piso</option><option>Planta baja</option><option>1° piso</option><option>2° a 5° piso</option><option>6° piso o superior</option><option>No corresponde</option></select></div>
      <div className="field"><label htmlFor="area">Metros cuadrados cubiertos (aprox.)</label><select id="area" value={form.area} onChange={e => setForm(v => ({ ...v, area: e.target.value }))}><option value="">Seleccioná una opción</option><option value="50">Hasta 50 m²</option><option value="80">51 a 80 m²</option><option value="120">81 a 120 m²</option><option value="160">121 a 160 m²</option><option value="200">Más de 160 m²</option></select><small>No hace falta que sea exacto, elegí la opción más cercana.</small></div>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><span className="trust-note"><ShieldCheck size={17} /> Tu información está protegida</span><button className="button button-primary" type="button" onClick={onContinue}>Continuar <ArrowRight size={19} /></button></div>
  </section>;
}

function ContactStep({ form, setForm, onBack, onSubmit, error, submitting }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; onBack: () => void; onSubmit: (event: FormEvent) => void; error: string; submitting: boolean }) {
  return <section className="form-step" aria-labelledby="contact-title">
    <div className="section-heading"><p className="eyebrow">Ya casi terminamos</p><h1 id="contact-title">Dejanos tus datos</h1><p>Te mostraremos la cotización y guardaremos el detalle para vos.</p></div>
    <form onSubmit={onSubmit}><div className="contact-layout"><div className="contact-fields">
      <div className="field"><label htmlFor="name">Nombre y apellido</label><input id="name" autoComplete="name" placeholder="Ej: Juan Pérez" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" placeholder="Ej: juanperez@email.com" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} /></div>
      <div className="field"><label htmlFor="phone">Teléfono</label><input id="phone" type="tel" autoComplete="tel" placeholder="Ej: +54 9 11 1234 5678" value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} /></div>
    </div><aside className="delivery-note"><span className="delivery-icon"><Mail size={29} /></span><p>Te enviaremos el <strong>detalle de tu cotización</strong> y quedará guardada para vos.</p></aside></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="button button-secondary" type="button" onClick={onBack} disabled={submitting}><ArrowLeft size={18} /> Volver</button><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Guardando..." : "Ver mi cotización"} {!submitting && <ArrowRight size={19} />}</button></div></form>
  </section>;
}

function QuoteStep({ form, onBack }: { form: FormState; onBack: () => void }) {
  const quote = quotes[form.area], firstName = form.name.trim().split(/\s+/)[0] || "";
  if (!quote) return null;
  const coverage = [
    { icon: Flame, label: "Incendio de estructura", value: formatCurrency(quote.structure) }, { icon: Home, label: "Incendio del contenido", value: "$20.000.000" },
    { icon: MonitorSmartphone, label: "Electrodomésticos", value: "$3.000.000" }, { icon: Sparkles, label: "Cristales", value: "$500.000" },
    { icon: LockKeyhole, label: "Robo de contenido", value: "$2.000.000" }, { icon: Droplets, label: "Daños por agua", value: "$1.000.000" },
    { icon: Wrench, label: "Asistencia para tu hogar", value: "Incluida" },
  ];
  return <section className="form-step quote-step" aria-labelledby="quote-title">
    <div className="quote-welcome"><span className="success-icon"><Check size={23} strokeWidth={3} /></span><div><h1 id="quote-title">¡Listo, {firstName}!</h1><p>Tenemos una cobertura pensada para tu hogar.</p></div></div>
    <div className="quote-layout"><div><div className="home-summary">Cobertura sugerida para <strong>{form.homeType} de {quote.area}</strong></div><div className="price-card"><span>Tu seguro está respaldado por</span><div className="insurer-logo"><img src="/assets/allianz.png" alt="Allianz" /></div><small>Tu seguro de hogar</small><div className="price">{formatCurrency(quote.monthly)} <span>/mes</span></div><strong>12 CUOTAS FIJAS</strong><span>Póliza anual</span><em>Precio demostrativo · sin conexión al tarifario</em></div><button className="button button-primary full-button" type="button" disabled>Quiero contratar <ArrowRight size={19} /></button></div>
      <div className="coverage-card"><h2>Tu cobertura</h2>{coverage.map(({ icon: Icon, label, value }, index) => <div className="coverage-row" key={label}><span><Icon size={19} /> {label}</span><strong className={index === coverage.length - 1 ? "included" : ""}>{value}</strong></div>)}</div>
    </div><div className="quote-footer"><button className="text-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Corregir mis datos</button><span>Guardamos tu solicitud para que un asesor pueda ayudarte.</span></div>
  </section>;
}

function HomeQuotePage() {
  const [step, setStep] = useState(1), [form, setForm] = useState(initialForm), [error, setError] = useState(""), [submitting, setSubmitting] = useState(false);
  const submissionId = useRef(crypto.randomUUID());
  function continueToContact() { if (!/^\d{4}$/.test(form.postalCode) || !form.floor || !form.area) { setError("Completá el código postal, el piso y los metros cuadrados."); return; } setError(""); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function submitContact(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(form.email) || form.phone.replace(/\D/g, "").length < 8) { setError("Ingresá tu nombre, un email válido y un teléfono de contacto."); return; }
    const quote = quotes[form.area];
    if (!quote) { setError("Seleccioná los metros cuadrados de tu hogar."); return; }
    setError(""); setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch(`${API_URL}/leads/home`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submissionId.current, name: form.name, email: form.email, phone: form.phone,
          postalCode: form.postalCode, homeType: form.homeType, floor: form.floor, areaCode: form.area,
          origin: {
            pageUrl: window.location.href, referrer: document.referrer || undefined,
            utmSource: params.get("utm_source") || undefined, utmMedium: params.get("utm_medium") || undefined,
            utmCampaign: params.get("utm_campaign") || undefined, utmContent: params.get("utm_content") || undefined,
            utmTerm: params.get("utm_term") || undefined,
          },
        }),
      });
      if (!response.ok) throw new Error("No pudimos guardar la solicitud");
      setStep(3); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("No pudimos guardar tu solicitud. Por favor, intentá nuevamente.");
    } finally { setSubmitting(false); }
  }
  return <div className="page-shell"><SiteHeader /><main className="quote-main"><div className="quote-card"><Stepper current={step} />
    {step === 1 && <HomeStep form={form} setForm={setForm} onContinue={continueToContact} error={error} />}
    {step === 2 && <ContactStep form={form} setForm={setForm} onBack={() => { setError(""); setStep(1); }} onSubmit={submitContact} error={error} submitting={submitting} />}
    {step === 3 && <QuoteStep form={form} onBack={() => setStep(2)} />}
  </div></main><footer className="site-footer"><span>Seguro a Tiempo</span><span>Asesoramiento real para proteger lo que importa.</span></footer></div>;
}

export function App() { return <HomeQuotePage />; }
