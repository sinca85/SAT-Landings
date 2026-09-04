import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Droplets, Flame, Home, House, KeyRound, LockKeyhole, Mail, MonitorSmartphone, ShieldCheck, Sparkles, Wrench } from "lucide-react";

type HomeType = "Casa" | "Departamento" | "PH" | "Barrio privado";
type FormState = { postalCode: string; homeType: HomeType; floor: string; squareMeters: string; name: string; email: string; phone: string };
type HomeQuote = { requestedSquareMeters: number; quotedSquareMeters: number; areaLabel: string; monthlyPrice: number; structureCoverage: number; contentsCoverage: number; appliancesCoverage: number; glassCoverage: number; theftCoverage: number; waterDamageCoverage: number; assistanceIncluded: boolean; currency: "ARS" };

const initialForm: FormState = { postalCode: "", homeType: "Casa", floor: "", squareMeters: "", name: "", email: "", phone: "" };
const homeTypes = [
  { value: "Casa" as const, icon: House }, { value: "Departamento" as const, icon: Building2 },
  { value: "PH" as const, icon: Home }, { value: "Barrio privado" as const, icon: KeyRound },
];
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

function HomeStep({ form, setForm, onContinue, error, areaOptions }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; onContinue: () => void; error: string; areaOptions: number[] }) {
  const currentArea = Number(form.squareMeters) || areaOptions[0] || 30;
  const moveArea = (direction: -1 | 1) => {
    const nextIndex = direction > 0
      ? areaOptions.findIndex((value) => value > currentArea)
      : areaOptions.filter((value) => value < currentArea).length - 1;
    if (nextIndex >= 0) setForm((value) => ({ ...value, squareMeters: String(areaOptions[nextIndex]) }));
  };
  return <section className="form-step" aria-labelledby="home-title">
    <div className="section-heading"><p className="eyebrow">Cotizá online en minutos</p><h1 id="home-title">Contanos sobre tu hogar</h1><p>Así podemos encontrar una cobertura pensada para vos.</p></div>
    <div className="fields-grid">
      <div className="field"><label htmlFor="postal-code">Código postal</label><input id="postal-code" inputMode="numeric" maxLength={4} placeholder="Ej: 1425" value={form.postalCode} onChange={e => setForm(v => ({ ...v, postalCode: e.target.value.replace(/\D/g, "") }))} /></div>
      <fieldset className="field home-type-field"><legend>Tipo de vivienda</legend><div className="home-types">
        {homeTypes.map(({ value, icon: Icon }) => <button className={`home-type ${form.homeType === value ? "is-selected" : ""}`} type="button" aria-pressed={form.homeType === value} onClick={() => setForm(v => ({ ...v, homeType: value }))} key={value}><Icon size={25} /><span>{value}</span></button>)}
      </div></fieldset>
      <div className="field"><label htmlFor="floor">Piso</label><select id="floor" value={form.floor} onChange={e => setForm(v => ({ ...v, floor: e.target.value }))}><option value="">Seleccioná el piso</option><option>Planta baja</option><option>1° piso</option><option>2° a 5° piso</option><option>6° piso o superior</option><option>No corresponde</option></select></div>
      <div className="field"><label htmlFor="area">Metros cuadrados cubiertos (aprox.)</label><div className="area-input"><button type="button" aria-label="Reducir metros cuadrados" onClick={() => moveArea(-1)} disabled={currentArea <= (areaOptions[0] || 30)}>−</button><div><input id="area" type="number" inputMode="numeric" min={30} max={200} placeholder="Ej: 70" value={form.squareMeters} onChange={e => setForm(v => ({ ...v, squareMeters: e.target.value.replace(/\D/g, "") }))} /><span>m²</span></div><button type="button" aria-label="Aumentar metros cuadrados" onClick={() => moveArea(1)} disabled={currentArea >= (areaOptions.at(-1) || 200)}>+</button></div><small>Ingresá una superficie entre 30 y 200 m². Si queda entre dos tramos, cotizamos el inmediato superior.</small></div>
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

function QuoteStep({ form, quote, onBack }: { form: FormState; quote: HomeQuote; onBack: () => void }) {
  const firstName = form.name.trim().split(/\s+/)[0] || "";
  const coverage = [
    { icon: Flame, label: "Incendio de estructura", value: formatCurrency(quote.structureCoverage) }, { icon: Home, label: "Incendio del contenido", value: formatCurrency(quote.contentsCoverage) },
    { icon: MonitorSmartphone, label: "Electrodomésticos", value: formatCurrency(quote.appliancesCoverage) }, { icon: Sparkles, label: "Cristales", value: formatCurrency(quote.glassCoverage) },
    { icon: LockKeyhole, label: "Robo de contenido", value: formatCurrency(quote.theftCoverage) }, { icon: Droplets, label: "Daños por agua", value: formatCurrency(quote.waterDamageCoverage) },
    { icon: Wrench, label: "Asistencia para tu hogar", value: "Incluida" },
  ];
  return <section className="form-step quote-step" aria-labelledby="quote-title">
    <div className="quote-welcome"><span className="success-icon"><Check size={23} strokeWidth={3} /></span><div><h1 id="quote-title">¡Listo, {firstName}!</h1><p>Tenemos una cobertura pensada para tu hogar.</p></div></div>
    <div className="quote-layout"><div><div className="home-summary">Cobertura sugerida para <strong>{form.homeType} de {quote.quotedSquareMeters} m²</strong></div><div className="price-card"><span>Tu seguro está respaldado por</span><div className="insurer-logo"><img src="/assets/allianz.png" alt="Allianz" /></div><small>Tu seguro de hogar</small><div className="price">{formatCurrency(quote.monthlyPrice)} <span>/mes</span></div><strong>12 CUOTAS FIJAS</strong><span>Póliza anual</span><em>Precio consultado en el tarifario vigente</em></div><button className="button button-primary full-button" type="button" disabled>Quiero contratar <ArrowRight size={19} /></button></div>
      <div className="coverage-card"><h2>Tu cobertura</h2>{coverage.map(({ icon: Icon, label, value }, index) => <div className="coverage-row" key={label}><span><Icon size={19} /> {label}</span><strong className={index === coverage.length - 1 ? "included" : ""}>{value}</strong></div>)}</div>
    </div><div className="quote-footer"><button className="text-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Corregir mis datos</button><span>Guardamos tu solicitud para que un asesor pueda ayudarte.</span></div>
  </section>;
}

function HomeQuotePage() {
  const [step, setStep] = useState(1), [form, setForm] = useState(initialForm), [error, setError] = useState(""), [submitting, setSubmitting] = useState(false);
  const [areaOptions, setAreaOptions] = useState<number[]>([30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,110,120,130,140,150,160,170,180,190,200]);
  const [quote, setQuote] = useState<HomeQuote | null>(null);
  const submissionId = useRef(crypto.randomUUID());
  useEffect(() => { void fetch(`${API_URL}/leads/home/quote?squareMeters=30`).then(response => response.ok ? response.json() : Promise.reject()).then(data => setAreaOptions(data.options)).catch(() => undefined); }, []);
  function continueToContact() { const area = Number(form.squareMeters); if (!/^\d{4}$/.test(form.postalCode) || !form.floor || !Number.isInteger(area) || area < 30 || area > 200) { setError("Completá el código postal, el piso y una superficie entre 30 y 200 m²."); return; } setError(""); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function submitContact(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(form.email) || form.phone.replace(/\D/g, "").length < 8) { setError("Ingresá tu nombre, un email válido y un teléfono de contacto."); return; }
    const squareMeters = Number(form.squareMeters);
    setError(""); setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch(`${API_URL}/leads/home`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submissionId.current, name: form.name, email: form.email, phone: form.phone,
          postalCode: form.postalCode, homeType: form.homeType, floor: form.floor, squareMeters,
          origin: {
            pageUrl: window.location.href, referrer: document.referrer || undefined,
            utmSource: params.get("utm_source") || undefined, utmMedium: params.get("utm_medium") || undefined,
            utmCampaign: params.get("utm_campaign") || undefined, utmContent: params.get("utm_content") || undefined,
            utmTerm: params.get("utm_term") || undefined,
          },
        }),
      });
      if (!response.ok) throw new Error("No pudimos guardar la solicitud");
      const data = await response.json();
      setQuote(data.quote);
      setStep(3); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("No pudimos guardar tu solicitud. Por favor, intentá nuevamente.");
    } finally { setSubmitting(false); }
  }
  return <div className="page-shell"><SiteHeader /><main className="quote-main"><div className="quote-card"><Stepper current={step} />
    {step === 1 && <HomeStep form={form} setForm={setForm} onContinue={continueToContact} error={error} areaOptions={areaOptions} />}
    {step === 2 && <ContactStep form={form} setForm={setForm} onBack={() => { setError(""); setStep(1); }} onSubmit={submitContact} error={error} submitting={submitting} />}
    {step === 3 && quote && <QuoteStep form={form} quote={quote} onBack={() => setStep(2)} />}
  </div></main><footer className="site-footer"><span>Seguro a Tiempo</span><span>Asesoramiento real para proteger lo que importa.</span></footer></div>;
}

export function App() { return <HomeQuotePage />; }
