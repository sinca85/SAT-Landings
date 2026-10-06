import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Car, CarFront, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, LockKeyhole, MessageCircle, PenLine, Search, ShieldCheck } from "lucide-react";
import { SatAIWidget } from "../SatAIWidget";
import { SiteFooter } from "../SiteFooter";
import { AutoAnalytics, trackAutoEvent } from "./AutoAnalytics";
import { autoRequest, useAutoCatalog, type AutoConfig, type AutoQuote, type Option } from "./auto-api";
import "./auto.css";
import "./auto-mobile.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const initialForm = { brand: "", model: "", year: "", version: "", zeroKm: false, postalCode: "", locality: "", gnc: false, gncValue: "", startDate: today(), name: "", email: "" };
type Draft = typeof initialForm;
type Faq = { _id?: string; question: string; answer: string };
const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
const label = (choices: Option[], value: string) => choices.find(item => item.value === value)?.label || value;

function quoteWhatsappUrl(baseUrl: string, form: Draft, quote: AutoQuote, coverage: AutoQuote["coverages"][number], vehicle: string, locality: string) {
  if (!baseUrl || baseUrl === "#") return "#";
  const details = [
    `Hola, soy ${form.name.trim()}. Cotizé mi auto en Seguro a Tiempo y quiero continuar con esta opción:`,
    `Vehículo: ${quote.vehicle || vehicle}`,
    `Ubicación: ${locality} (CP ${form.postalCode})`,
    quote.insuredAmount ? `Valor asegurado: ${money(quote.insuredAmount)}` : "",
    `Cobertura: ${coverage.name}`,
    `Precio: ${money(coverage.firstInstallment)} por mes`,
    coverage.deductible ? `Franquicia: ${coverage.deductible}` : "",
    quote.requestId ? `Cotización Galeno: ${quote.requestId}` : "",
  ].filter(Boolean).join("\n");
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("text", details);
    return url.toString();
  } catch { return baseUrl; }
}

function SelectField({ title, value, catalog, onChange, disabled = false }: { title: string; value: string; catalog: ReturnType<typeof useAutoCatalog>; onChange: (value: string) => void; disabled?: boolean }) {
  const id = `auto-${title.replace(/\s/g, "-")}`;
  return <div className="field"><label htmlFor={id}>{title}</label><select id={id} required value={value} disabled={disabled || catalog.loading || !catalog.options.length} onChange={event => onChange(event.target.value)}><option value="">{catalog.loading ? "Cargando..." : `Elegí ${title.toLowerCase()}`}</option>{catalog.options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{catalog.error && <div className="field-message" role="alert">{catalog.error} <button type="button" className="text-button" onClick={catalog.retry}>Reintentar</button></div>}</div>;
}

function Toggle({ label: title, value, onChange, yesDisabled = false }: { label: string; value: boolean; onChange: (value: boolean) => void; yesDisabled?: boolean }) {
  return <fieldset className="auto-toggle"><legend>{title}</legend><div><button type="button" disabled={yesDisabled} className={value ? "is-selected" : ""} onClick={() => onChange(true)}>Sí</button><button type="button" className={!value ? "is-selected" : ""} onClick={() => onChange(false)}>No</button></div></fieldset>;
}

function Stepper({ step }: { step: number }) {
  return <ol className="auto-stepper" aria-label={`Paso ${step} de 3`}>{["Tu vehículo", "Tus datos", "Tu cotización"].map((title, index) => { const number = index + 1; return <li key={title} className={number === step ? "is-current" : number < step ? "is-done" : ""}><span>{number < step ? <Check size={17} strokeWidth={3} /> : number}</span><b>{title}</b></li>; })}</ol>;
}

function QuoteLoading() {
  return <div className="auto-quote-loading" role="status" aria-live="polite">
    <div className="auto-loading-road" aria-hidden="true"><Car /></div>
    <strong>Estamos buscando las mejores opciones para tu auto</strong>
  </div>;
}

function HelpAndFaqs({ faqs }: { faqs: Faq[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? faqs : faqs.slice(0, 6);
  return <section className="auto-help-grid">
    <SatAIWidget slug="galeno-auto" className="auto-ai" heading="¿Tenés alguna consulta?" subtitle="Preguntale al Asistente de Seguro a Tiempo." placeholder="Escribí tu pregunta..." suggestedQuestions={["¿Qué significa franquicia?", "¿Me cubre si viajo a Uruguay?", "¿Qué pasa si me roban una rueda?"]} />
    <div className="auto-faqs"><header><span><CircleHelp size={20} /></span><h2>Preguntas comunes</h2>{faqs.length > 6 && <button type="button" onClick={() => setShowAll(value => !value)}>{showAll ? "Ver menos" : "Ver todas"} <ArrowRight size={15} /></button>}</header><div>{shown.map(faq => <details key={faq._id || faq.question}><summary>{faq.question}<ChevronDown size={16} /></summary><p>{faq.answer}</p></details>)}</div></div>
  </section>;
}

type Coverage = AutoQuote["coverages"][number];
function normalized(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function selectCoverages(coverages: Coverage[]) {
  const matches = (item: Coverage, value: string) => normalized(`${item.name} ${item.code}`).includes(value);
  const todoRiesgoOptions = coverages.filter(item => matches(item, "todo riesgo"));
  const deductiblePercent = (item: Coverage) => normalized(`${item.name} ${item.deductible}`).match(/(?:^|\D)(2|4)\s*%/)?.[1];
  const todoRiesgo = todoRiesgoOptions.find(item => deductiblePercent(item) === "2")
    || todoRiesgoOptions.find(item => deductiblePercent(item) === "4")
    || todoRiesgoOptions.sort((a, b) => a.firstInstallment - b.firstInstallment)[0];
  const black = coverages.find(item => matches(item, "terceros completo black"));
  const platinum = coverages.find(item => matches(item, "terceros completo platinum"));
  const complete = black || platinum || coverages.filter(item => /tercer|total/.test(normalized(item.name)) && item !== todoRiesgo).sort((a, b) => b.firstInstallment - a.firstInstallment)[0];
  const essential = coverages.find(item => matches(item, "responsabilidad civil clasica")) || coverages.find(item => matches(item, "responsabilidad civil"));
  return [{ item: todoRiesgo, level: "Máxima protección" }, { item: complete, level: "Cobertura completa" }, { item: essential, level: "Esencial" }].filter((entry, index, list): entry is { item: Coverage; level: string } => Boolean(entry.item) && list.findIndex(other => other.item === entry.item) === index);
}
function CoverageCard({ item, level, selected, onHighlight, onSelect }: { item: Coverage; level: string; selected: boolean; onHighlight: () => void; onSelect: () => void }) {
  return <article className={`auto-coverage ${selected ? "is-selected" : ""}`} onClick={onHighlight}><span className="auto-coverage-level">{level}</span><div className="auto-coverage-title"><span><CarFront size={24} /></span><div><h2>{item.name}</h2><strong>{money(item.firstInstallment)} <small>/ mes</small></strong></div></div>{item.deductible && <p>Franquicia: {item.deductible}</p>}<p className="auto-assistance"><CheckCircle2 size={19} /> Asistencia al vehículo incluida</p>{level === "Máxima protección" && item.deductible && <p className="auto-franchise-note"><CheckCircle2 size={19} /> El % de la franquicia significa que la franquicia será ese % de la suma asegurada.</p>}<details><summary>Ver todo lo que cubre <ChevronDown size={16} /></summary><ul>{item.benefits.map((benefit, index) => <li key={index}>{benefit}</li>)}</ul></details><button type="button" className="button button-primary" onClick={onSelect}>Me interesa esta cobertura <ArrowRight size={19} /></button></article>;
}

export default function AutoQuotePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Draft>(initialForm);
  const [config, setConfig] = useState<AutoConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [configAttempt, setConfigAttempt] = useState(0);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [quote, setQuote] = useState<AutoQuote | null>(null);
  const [selectedCoverage, setSelectedCoverage] = useState<Coverage | null>(null);
  const [highlightedCoverageCode, setHighlightedCoverageCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const patch = (values: Partial<Draft>) => { setForm(previous => ({ ...previous, ...values })); setError(""); };
  useEffect(() => { const controller = new AbortController(); setConfigError(""); void autoRequest<AutoConfig>("/config", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setConfig(data); }).catch((err: unknown) => { if (!controller.signal.aborted) setConfigError(err instanceof Error ? err.message : "No se pudo cargar el cotizador."); }); return () => controller.abort(); }, [configAttempt]);
  useEffect(() => { const controller = new AbortController(); void autoRequest<{ faqs: Faq[] }>("/faqs", { signal: controller.signal }).then(data => setFaqs(data.faqs)).catch(() => setFaqs([])); return () => controller.abort(); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);
  const ready = config?.ready === true;
  const brands = useAutoCatalog(ready ? { kind: "brands" } : null);
  const models = useAutoCatalog(ready && form.brand ? { kind: "models", brand: form.brand } : null);
  const years = useAutoCatalog(ready && form.brand && form.model ? { kind: "years", brand: form.brand, model: form.model } : null);
  const versions = useAutoCatalog(ready && form.brand && form.model && form.year ? { kind: "versions", brand: form.brand, model: form.model, year: form.year } : null);
  const localities = useAutoCatalog(ready && /^\d{4}$/.test(form.postalCode) ? { kind: "locations", postalCode: form.postalCode } : null);
  const vehicleComplete = Boolean(form.brand && form.model && form.year && versions.options.some(item => item.value === form.version));
  const vehicleSummary = `${label(brands.options, form.brand)} ${label(models.options, form.model)} · ${form.year} · ${label(versions.options, form.version)}`;
  const selectedOptions = quote ? selectCoverages(quote.coverages) : [];
  const selectedWhatsappUrl = config?.whatsappUrl && quote && selectedCoverage
    ? quoteWhatsappUrl(config.whatsappUrl, form, quote, selectedCoverage, vehicleSummary, label(localities.options, form.locality))
    : config?.whatsappUrl || "#";
  const next = (event: FormEvent) => { event.preventDefault(); if (!vehicleComplete || (form.gnc && !Number(form.gncValue))) { setError("Completá los datos marcados para continuar."); return; } setError(""); trackAutoEvent("auto_vehicle_completed"); setStep(2); };
  const submitQuote = async (event: FormEvent) => {
    event.preventDefault(); if (submittingRef.current) return;
    if (!vehicleComplete || !localities.options.some(item => item.value === form.locality) || !form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) { setError("Completá el código postal, localidad, nombre y email."); return; }
    submittingRef.current = true; setSubmitting(true); setError("");
    try { const { email: _email, ...payload } = form; const data = await autoRequest<{ quote: AutoQuote }>("/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, gncValue: form.gnc ? Number(form.gncValue) : 0 }) }); setQuote(data.quote); setHighlightedCoverageCode(""); setStep(3); trackAutoEvent("auto_quote_completed"); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo cotizar. Intentá nuevamente."); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  const chooseCoverage = (coverage: Coverage) => { setSelectedCoverage(coverage); setError(""); setStep(4); trackAutoEvent("auto_coverage_selected"); };
  return <div className="page-shell auto-page">
    {config && <AutoAnalytics config={config.analytics} />}
    <header className="site-header"><div className="header-inner"><a href="https://seguroatiempo.com" aria-label="Seguro a Tiempo, inicio"><img src="/assets/logo-seguro-a-tiempo.svg" alt="Seguro a Tiempo" className="brand-logo" /></a><div className="secure-label"><ShieldCheck size={21} /> Cotización <strong>100% segura</strong></div></div></header>
    <main>
      <section className={`auto-journey auto-step-${step}`}><div className="auto-journey-inner">{step === 1 ? <div className="auto-desktop-stepper"><Stepper step={1} /></div> : <Stepper step={Math.min(step, 3)} />}
        {config?.mode === "demo" && <div className="auto-demo" role="note"><strong>Modo demostración:</strong> datos y precios simulados, sin conexión con Galeno.</div>}
        {configError && <div className="auto-pending" role="alert">{configError} <button type="button" onClick={() => setConfigAttempt(value => value + 1)}>Reintentar</button></div>}
        {step === 1 && <div className="auto-first-step"><div className="auto-hero-copy"><small>SEGURO DE AUTO</small><h1>Vos conocés tu auto.<br /><span>Nosotros, qué seguro recomendarte.</span></h1><p>Contanos sobre tu auto y te mostramos las mejores opciones de cobertura</p><div className="auto-mobile-stepper"><Stepper step={1} /></div></div><form className="auto-panel" onSubmit={next}><div className="auto-panel-heading"><h2>Datos del vehículo</h2></div><div className="auto-fields"><SelectField title="Marca" value={form.brand} catalog={brands} disabled={!ready} onChange={brand => patch({ brand, model: "", year: "", version: "", zeroKm: false })} /><SelectField title="Modelo" value={form.model} catalog={models} disabled={!form.brand} onChange={model => patch({ model, year: "", version: "", zeroKm: false })} /><SelectField title="Año" value={form.year} catalog={years} disabled={!form.model} onChange={year => patch({ year, version: "", zeroKm: false })} /><SelectField title="Versión" value={form.version} catalog={versions} disabled={!form.year} onChange={version => patch({ version })} /><Toggle label="¿Es 0 km?" value={form.zeroKm} yesDisabled={form.year !== "2026"} onChange={zeroKm => patch({ zeroKm })} /><Toggle label="¿Tiene equipo de GNC?" value={form.gnc} onChange={gnc => patch({ gnc, gncValue: "" })} />{form.gnc && <div className="field auto-gnc-value"><label htmlFor="auto-gnc-value">Valor del equipo de GNC</label><select id="auto-gnc-value" required value={form.gncValue} onChange={event => patch({ gncValue: event.target.value })}><option value="">Elegí una opción</option><option value="1000000">$1.000.000</option><option value="1500000">$1.500.000</option><option value="2000000">$2.000.000</option></select></div>}</div>{error && <p className="form-error">{error}</p>}<button className="button button-primary auto-submit" disabled={!ready}>Continuar con mi cotización <ArrowRight size={21} /></button><p className="auto-privacy"><LockKeyhole size={16} /> Tus datos se usan únicamente para preparar tu cotización.</p></form><div className="auto-promises"><span><Clock3 /><b>Cotizá en<br />1 minuto</b></span><span><MessageCircle /><b>Asesoramiento<br />online</b></span><span><ShieldCheck /><b>Compañías<br />con respaldo</b></span></div></div>}
        {step === 2 && <form className="auto-panel auto-data-panel" onSubmit={submitQuote}><div className="auto-panel-heading"><small>PASO 2 DE 3</small><h1>Ya casi está</h1><p>Completá estos datos para preparar y enviarte tu cotización.</p></div><div className="auto-vehicle-strip"><span className="auto-vehicle-thumb" /><strong>{vehicleSummary}</strong><button type="button" onClick={() => setStep(1)}>Modificar <PenLine size={16} /></button></div><fieldset disabled={submitting} className="auto-input-group"><div className="auto-fields"><div className="field"><label htmlFor="auto-postal">Código postal de guarda</label><input id="auto-postal" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="Ej. 1426" value={form.postalCode} onChange={event => patch({ postalCode: event.target.value.replace(/\D/g, ""), locality: "" })} /></div><SelectField title="Localidad" value={form.locality} catalog={localities} disabled={!/^\d{4}$/.test(form.postalCode)} onChange={locality => patch({ locality })} /><div className="field"><label htmlFor="auto-name">Nombre</label><input id="auto-name" required autoComplete="name" placeholder="Ej. Juan" maxLength={120} value={form.name} onChange={event => patch({ name: event.target.value })} /></div><div className="field"><label htmlFor="auto-email">Email</label><input id="auto-email" required type="email" autoComplete="email" placeholder="Ej. juan@gmail.com" value={form.email} onChange={event => patch({ email: event.target.value })} /></div></div></fieldset>{submitting && <QuoteLoading />}{error && <p className="form-error">{error}</p>}<button className="button button-primary auto-submit" disabled={submitting}>{submitting ? <>Buscando tus opciones…</> : <>Ver mis opciones <ArrowRight size={21} /></>}</button><p className="auto-privacy"><LockKeyhole size={16} /> Usamos estos datos únicamente para preparar y enviarte tu cotización.</p><button type="button" className="text-button auto-back" onClick={() => setStep(1)}><ArrowLeft size={16} /> Volver</button></form>}
        {step === 3 && quote && <div className="auto-results-view"><div className="auto-results-heading"><small>PASO 3 DE 3</small><h1>Estas son las opciones que seleccionamos para tu auto</h1><p>Analizamos las coberturas disponibles para tu vehículo y elegimos alternativas con distintos niveles de protección.</p></div><div className="auto-vehicle-strip"><span className="auto-vehicle-thumb" /><div className="auto-vehicle-data"><strong>{quote.vehicle || vehicleSummary}</strong>{quote.insuredAmount && <b>Valor: {money(quote.insuredAmount)}</b>}</div><button type="button" onClick={() => { setQuote(null); setStep(2); }}>Modificar datos <PenLine size={16} /></button></div>{selectedOptions.length ? <div className="auto-results">{selectedOptions.map(({ item, level }) => <CoverageCard key={`${item.code}-${level}`} item={item} level={level} selected={(highlightedCoverageCode || selectedOptions[0]?.item.code) === item.code} onHighlight={() => setHighlightedCoverageCode(item.code)} onSelect={() => chooseCoverage(item)} />)}</div> : <div className="auto-no-results"><Search size={38} /><h2>No encontramos opciones disponibles</h2><p>Contactanos y vemos tu caso.</p><a className="button button-primary" href={config?.whatsappUrl || "#"} target="_blank" rel="noreferrer"><MessageCircle size={20} /> Hablar por WhatsApp</a></div>}<div className="auto-galeno"><img src="/assets/galeno.png" alt="Galeno Seguros" /><span /><p><b>¿Quién respalda estas coberturas?</b> Las opciones de esta cotización son ofrecidas por <strong>Galeno Seguros</strong> y fueron seleccionadas por <strong>Seguro a Tiempo</strong> según las alternativas disponibles para tu vehículo.</p></div></div>}
        {step === 4 && selectedCoverage && <section className="auto-panel auto-next-choice"><button type="button" className="text-button" onClick={() => setStep(3)}><ArrowLeft size={17} /> Volver a las opciones</button><div className="auto-choice-heading"><CheckCircle2 size={44} /><h1>Elegiste {selectedCoverage.name}</h1><p><strong>{money(selectedCoverage.firstInstallment)}</strong> por mes{selectedCoverage.deductible ? ` · Franquicia: ${selectedCoverage.deductible}` : ""}</p></div><div className="auto-choice-grid"><a className="auto-choice-card" href={selectedWhatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={34} /><h2>Continuar por WhatsApp</h2><p>Hablá ahora con un asesor para avanzar con esta cobertura.</p><span>Ir a WhatsApp <ArrowRight size={18} /></span></a></div></section>}
      </div></section>
      <HelpAndFaqs faqs={faqs} />
      <section className="auto-bottom-promises"><span><CarFront /><b>Analizamos las mejores opciones para tu vehículo</b></span><span><Clock3 /><b>Cotizá en pocos minutos y sin compromiso</b></span><span><MessageCircle /><b>Asesoramiento gratuito por WhatsApp</b></span><span><ShieldCheck /><b>Todo el respaldo de un bróker de seguros</b></span></section>
    </main>
    <SiteFooter />
  </div>;
}
