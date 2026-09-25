import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CarFront, Check, ShieldCheck, MapPin, SlidersHorizontal } from "lucide-react";
import { SiteFooter } from "../SiteFooter";
import { AutoAnalytics, trackAutoEvent } from "./AutoAnalytics";
import { autoRequest, useAutoCatalog, type AutoConfig, type AutoQuote, type Option } from "./auto-api";
import "./auto.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const initialForm = { brand: "", model: "", year: "", version: "", zeroKm: false, postalCode: "", locality: "", gnc: false, gncValue: "", startDate: today(), name: "" };
type Draft = typeof initialForm;
const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value);
const label = (choices: Option[], value: string) => choices.find(item => item.value === value)?.label || value;
function SelectField({ title, value, catalog, onChange, disabled = false }: { title: string; value: string; catalog: ReturnType<typeof useAutoCatalog>; onChange: (value: string) => void; disabled?: boolean }) {
  const id = `auto-${title.replace(/\s/g, "-")}`;
  return <div className="field"><label htmlFor={id}>{title}</label><select id={id} required value={value} disabled={disabled || catalog.loading || !catalog.options.length} onChange={event => onChange(event.target.value)}><option value="">{catalog.loading ? "Cargando..." : `Seleccioná ${title.toLowerCase()}`}</option>{catalog.options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{catalog.error && <div className="field-message" role="alert">{catalog.error} <button type="button" className="text-button" onClick={catalog.retry}>Reintentar</button></div>}{!disabled && !catalog.loading && !catalog.error && !catalog.options.length && <small>No hay opciones disponibles para esta selección.</small>}</div>;
}
export default function AutoQuotePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Draft>(initialForm);
  const [config, setConfig] = useState<AutoConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [configAttempt, setConfigAttempt] = useState(0);
  const [quote, setQuote] = useState<AutoQuote | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const patch = (values: Partial<Draft>) => { setForm(previous => ({ ...previous, ...values })); setError(""); };
  useEffect(() => {
    const controller = new AbortController(); setConfigError("");
    void autoRequest<AutoConfig>("/config", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setConfig(data); }).catch((err: unknown) => { if (!controller.signal.aborted) setConfigError(err instanceof Error ? err.message : "No se pudo cargar el cotizador."); });
    return () => controller.abort();
  }, [configAttempt]);
  useEffect(() => { if (step > 1) heading.current?.focus(); }, [step]);
  const ready = config?.ready === true;
  const brands = useAutoCatalog(ready ? { kind: "brands" } : null);
  const models = useAutoCatalog(ready && form.brand ? { kind: "models", brand: form.brand } : null);
  const years = useAutoCatalog(ready && form.brand && form.model ? { kind: "years", brand: form.brand, model: form.model } : null);
  const versions = useAutoCatalog(ready && form.brand && form.model && form.year ? { kind: "versions", brand: form.brand, model: form.model, year: form.year } : null);
  const localities = useAutoCatalog(ready && /^\d{4}$/.test(form.postalCode) ? { kind: "locations", postalCode: form.postalCode } : null);
  const vehicleComplete = Boolean(form.brand && form.model && form.year && versions.options.some(item => item.value === form.version));
  const vehicleSummary = `${label(brands.options, form.brand)} ${label(models.options, form.model)} · ${form.year}`;
  const next = (event: FormEvent) => { event.preventDefault(); if (!vehicleComplete) { setError("Completá la marca, modelo, año y versión de tu auto."); return; } setError(""); trackAutoEvent("auto_vehicle_completed"); setStep(2); };
  const submitQuote = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!vehicleComplete || !localities.options.some(item => item.value === form.locality)) { setError("Elegí una versión y una localidad válidas para cotizar."); return; }
    submittingRef.current = true; setSubmitting(true); setError("");
    try {
      const data = await autoRequest<{ quote: AutoQuote }>("/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, gncValue: form.gnc ? Number(form.gncValue) : 0 }) });
      setQuote(data.quote); setStep(3); trackAutoEvent("auto_quote_completed");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo cotizar. Intentá nuevamente."); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  return <div className="page-shell auto-page">
    {config && <AutoAnalytics config={config.analytics} />}
    <header className="site-header"><div className="header-inner"><a href="https://seguroatiempo.com/hogar" aria-label="Seguro a Tiempo, inicio"><img src="/assets/logo-seguro-a-tiempo.svg" alt="Seguro a Tiempo" className="brand-logo" /></a><div className="secure-label"><ShieldCheck size={19} /> Cotización <strong>100% segura</strong></div></div></header>
    <main className="quote-main">
      <div className="auto-demo" role="note"><strong>{config?.mode === "demo" ? "Modo demostración" : "Entorno de prueba"}</strong><span>{config?.mode === "demo" ? "Los vehículos, precios y coberturas son simulados. No se consulta a Galeno ni se emiten pólizas." : "Cotizaciones del sandbox de Galeno. No se emiten pólizas ni se envían emails."}</span></div>
      {configError && <div className="auto-pending" role="alert">{configError} <button type="button" className="text-button" onClick={() => setConfigAttempt(value => value + 1)}>Reintentar</button></div>}
      {!config && !configError && <p role="status">Cargando cotizador...</p>}
      {config && !ready && <div className="auto-pending" role="status">Estamos preparando el cotizador. Todavía falta completar la configuración de Galeno.</div>}
      <div className="quote-card">
        <ol className="stepper" aria-label={`Paso ${step} de 3`}>{["Tu auto", "Tu cobertura", "Tu cotización"].map((title, index) => <li key={title} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-done" : ""}><span className="step-marker">{index + 1 < step ? <Check size={15} /> : index + 1}</span><span>{title}</span></li>)}</ol>
        <section className="form-step auto-form">
          <div className="section-heading"><p className="eyebrow">SEGURO DE AUTO · GALENO SEGUROS</p><h1 ref={heading} tabIndex={-1}>{step === 1 ? "Tu próximo camino, más tranquilo" : step === 2 ? "Una cobertura a tu medida" : "Tu cotización de auto"}</h1><p>{step === 1 ? "Contanos qué auto tenés y encontrá una cobertura para acompañarte." : step === 2 ? "Completá los datos de tu auto y dónde lo guardás." : config?.mode === "demo" ? "Estas opciones son simuladas para probar el cotizador." : "Estas son las opciones devueltas por Galeno en su entorno de prueba."}</p></div>
          {step === 1 && <form onSubmit={next}>
            <div className="auto-layout"><div className="auto-fields">
              <SelectField title="Marca" value={form.brand} catalog={brands} disabled={!ready} onChange={brand => patch({ brand, model: "", year: "", version: "", zeroKm: false })} />
              <SelectField title="Modelo" value={form.model} catalog={models} disabled={!form.brand} onChange={model => patch({ model, year: "", version: "", zeroKm: false })} />
              <SelectField title="Año" value={form.year} catalog={years} disabled={!form.model} onChange={year => patch({ year, version: "", zeroKm: false })} />
              <SelectField title="Versión" value={form.version} catalog={versions} disabled={!form.year} onChange={version => patch({ version })} />
              <label className="auto-check"><input type="checkbox" checked={form.zeroKm} onChange={event => patch({ zeroKm: event.target.checked })} /> Es 0 km</label>
            </div><aside className="auto-aside"><span className="auto-car"><CarFront size={66} strokeWidth={1.3} /></span><h2>Cada auto tiene su cobertura</h2><p>Elegí la versión exacta que aparece en la documentación de tu vehículo.</p><div><ShieldCheck size={18} /> Con el respaldo de <strong>Galeno Seguros</strong></div></aside></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions"><span className="trust-note"><ShieldCheck size={17} /> Sin compromiso</span><button className="button button-primary" disabled={!ready || !vehicleComplete}>Continuar <ArrowRight size={19} /></button></div>
          </form>}
          {step === 2 && <form onSubmit={submitQuote}>
            <div className="auto-summary"><CarFront size={22} /><strong>{vehicleSummary}</strong><span>{label(versions.options, form.version)}{form.zeroKm ? " · 0 km" : ""}</span></div>
            <fieldset disabled={submitting} className="auto-input-group"><div className="auto-fields">
              <div className="field"><label htmlFor="auto-postal">Código postal de guarda</label><input id="auto-postal" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="Ej: 1425" value={form.postalCode} onChange={event => patch({ postalCode: event.target.value.replace(/\D/g, ""), locality: "" })} /></div>
              <SelectField title="Localidad" value={form.locality} catalog={localities} disabled={!/^\d{4}$/.test(form.postalCode)} onChange={locality => patch({ locality })} />
              <div className="field"><label htmlFor="auto-date">Inicio de cobertura deseado</label><input id="auto-date" type="date" min={today()} required value={form.startDate} onChange={event => patch({ startDate: event.target.value })} /></div>
              <div className="field"><label htmlFor="auto-gnc">¿Tiene equipo de GNC?</label><select id="auto-gnc" value={form.gnc ? "yes" : "no"} onChange={event => patch({ gnc: event.target.value === "yes", gncValue: "" })}><option value="no">No</option><option value="yes">Sí</option></select></div>
              {form.gnc && <div className="field"><label htmlFor="auto-gnc-value">Valor del equipo de GNC ($)</label><input id="auto-gnc-value" type="number" min="1" max="999999999" required value={form.gncValue} onChange={event => patch({ gncValue: event.target.value })} /></div>}
              <div className="field"><label htmlFor="auto-name">{config?.personType === "2" ? "Razón social (opcional)" : "Nombre y apellido (opcional)"}</label><input id="auto-name" autoComplete={config?.personType === "2" ? "organization" : "name"} maxLength={120} value={form.name} onChange={event => patch({ name: event.target.value })} /></div>
            </div></fieldset>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions"><button type="button" disabled={submitting} className="button button-secondary" onClick={() => { setError(""); setStep(1); }}><ArrowLeft size={18} /> Volver</button><button className="button button-primary" disabled={submitting || !form.locality || localities.loading}>{submitting ? (config?.mode === "demo" ? "Generando cotización..." : "Consultando Galeno...") : "Ver mi cotización"} <ArrowRight size={19} /></button></div>
          </form>}
          {step === 3 && quote && <>
            <div className="auto-summary"><CarFront size={22} /><strong>{quote.vehicle || vehicleSummary}</strong><span>{label(localities.options, form.locality)} ({form.postalCode})</span></div>
            <p className="auto-payment-summary">{quote.billing.mode} · {quote.billing.condition} · {quote.billing.method}{quote.insuredAmount !== null && <> · Suma asegurada: <strong>{money(quote.insuredAmount)}</strong></>}</p>
            {!quote.coverages.length && <p className="auto-pending" role="status">No hay coberturas disponibles para estos datos. Podés corregirlos e intentar nuevamente.</p>}
            <div className="auto-results">{quote.coverages.map(item => <article key={item.code}><span className="auto-result-tag">{config?.mode === "demo" ? "Galeno · Demo" : "Galeno · Sandbox"}</span><ShieldCheck size={28} /><h2>{item.name}</h2><div className="auto-price">{money(item.firstInstallment)}</div><small>Primera cuota</small>{item.remainingInstallment > 0 && <small>Cuotas restantes: {money(item.remainingInstallment)} cada una</small>}<small>Premio informado: {money(item.premium)}</small>{item.deductible && <p>Franquicia: {item.deductible}</p>}<details><summary>Ver detalle de cobertura</summary><ul>{item.benefits.map((benefit, index) => <li key={index}>{benefit}</li>)}</ul></details></article>)}</div>
            {quote.hasRestrictions && <p className="auto-pending">Galeno informó restricciones. Se muestran únicamente las coberturas sin excepciones.</p>}
            <p className="auto-pending">{config?.mode === "demo" ? "Resultado simulado, sin validez comercial ni contractual." : "Resultado de prueba, sin validez para contratar."} Referencia: {quote.requestId || "No informada"}.</p>
            <button type="button" className="text-button" onClick={() => { setQuote(null); setStep(2); }}><ArrowLeft size={17} /> Corregir mis datos</button>
          </>}
        </section>
      </div>
      <section className="auto-benefits" aria-label="Cómo cotizar">{[{ icon: CarFront, title: "Elegí tu auto", text: "Marca, modelo, año y versión exacta." }, { icon: MapPin, title: "Contanos dónde lo guardás", text: "La localidad nos ayuda a preparar tu cotización." }, { icon: SlidersHorizontal, title: "Compará tus opciones", text: "Revisá las alternativas disponibles para tu vehículo." }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={24} /><h2>{title}</h2><p>{text}</p></div>)}</section>
    </main><SiteFooter />
  </div>;
}
