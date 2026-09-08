import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Droplets, Flame, Home, House, KeyRound, LockKeyhole, Mail, MonitorSmartphone, ShieldCheck, Sparkles, Wrench, Tv, Pipette, UserRound, DoorOpen, Zap, Wind, Hammer, CalendarDays, CircleDollarSign, Phone, CreditCard, MessageCircle } from "lucide-react";
import { SatAIWidget } from "./SatAIWidget";
import { SiteFooter } from "./SiteFooter";
import { trackLandingEvent } from "./GoogleAnalytics";

type HomeType = "Casa" | "Departamento" | "PH" | "Barrio privado";
type FormState = { postalCode: string; homeType: HomeType; floor: string; squareMeters: string; name: string; email: string };
type HomeQuote = { requestedSquareMeters: number; quotedSquareMeters: number; areaLabel: string; monthlyPrice: number; structureCoverage: number; contentsCoverage: number; appliancesCoverage: number; glassCoverage: number; theftCoverage: number; waterDamageCoverage: number; assistanceIncluded: boolean; currency: "ARS" };
type ContractState = { firstName: string; lastName: string; dni: string; dateOfBirth: string; address: string; floor: string; apartment: string; postalCode: string; email: string; phone: string };

const initialForm: FormState = { postalCode: "", homeType: "Casa", floor: "No corresponde", squareMeters: "", name: "", email: "" };
const homeTypes = [
  { value: "Casa" as const, icon: House }, { value: "Departamento" as const, icon: Building2 },
  { value: "PH" as const, icon: Home }, { value: "Barrio privado" as const, icon: KeyRound },
];
const API_URL = import.meta.env.VITE_API_URL || "https://api.seguroatiempo.com";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function validArgentinePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 8 && digits.length <= 15;
}

function cleanPhone(value: string) {
  return value.replace(/[^\d+\s()-]/g, "").replace(/(?!^)\+/g, "").slice(0, 24);
}

function validExactFloor(category: string, value: string) {
  return category === "Segundo piso o superior" ? /^\d+$/.test(value) && Number(value) >= 2 : Boolean(value);
}

function formatDni(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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

const faqItems = [
  ["¿Qué cubre el seguro de hogar?", "Protege tu vivienda y su contenido frente a eventos previstos en tu póliza, como incendio, robo, daños por agua y rotura de cristales. También incluye asistencia para tu hogar las 24 horas, los 365 días del año."],
  ["¿Qué significa “incendio de estructura”?", "Es el daño producido por incendio en las partes fijas de la vivienda: paredes, techos, pisos, aberturas e instalaciones que forman parte del inmueble, según la suma asegurada contratada."],
  ["¿Qué es “incendio del contenido”?", "Es la cobertura para los bienes que están dentro de tu hogar, como muebles, ropa, electrodomésticos y objetos personales, de acuerdo con las condiciones y límites de tu póliza."],
  ["¿Qué son “daños por agua”?", "Ampara daños accidentales ocasionados por escapes o filtraciones de cañerías e instalaciones, con el alcance, deducibles y límites que indique tu póliza."],
  ["¿Qué cristales están cubiertos?", "La cobertura contempla la rotura accidental de cristales asegurados de la vivienda, como ventanas y puertas, siempre que estén incluidos en la póliza y se respeten sus condiciones."],
  ["¿Qué compañía de seguros respalda este seguro?", "Allianz, una de las marcas de seguros líderes a nivel mundial, respalda este seguro de hogar."],
  ["¿Qué es Seguro a Tiempo?", "Seguro a Tiempo es un bróker de seguros que asesora, gestiona y acompaña a las personas aseguradas de principio a fin de su póliza. Está acreditado ante la Superintendencia de Seguros para cumplir ese rol."],
  ["¿Qué electrodomésticos están cubiertos?", "La cobertura de aparatos electrodomésticos incluye exclusivamente televisores, reproductores de DVD y/o Blu-ray, consolas PlayStation IV, V y/o XBOX (sin controles), home theater, equipos de audio, hornos eléctricos o microondas, hornos empotrados, anafes eléctricos, lavarropas, lavavajillas, heladeras, freezers, aires acondicionados, computadoras, notebooks, tablets y cavas."],
  ["¿Qué no está cubierto por el seguro?", "Quedan excluidos los hechos y bienes indicados en las condiciones de tu póliza, además de daños intencionales, desgaste normal y falta de mantenimiento. Ante una duda puntual, consultá al asistente o a un asesor."],
];

const situations = [
  { icon: Tv, title: "Se me quemó la TV", text: "Te contamos si está cubierta y qué documentación necesitás.", answer: "Puede corresponder la cobertura de incendio del contenido cuando el daño se origina en un incendio cubierto. Para confirmar el alcance en tu caso, conservá el equipo y la documentación del siniestro y consultá al asistente o a un asesor." },
  { icon: Pipette, title: "Se rompió un caño", text: "Conocé qué daños por agua contempla tu seguro.", answer: "Los daños accidentales por escapes o roturas de cañerías pueden estar contemplados dentro de daños por agua, según las condiciones, límites y deducibles de tu póliza. La asistencia de plomería también puede ayudarte con la urgencia." },
  { icon: UserRound, title: "Me robaron en mi casa", text: "Te explicamos qué hacer y cómo funciona la cobertura.", answer: "La cobertura de robo de contenido contempla los bienes asegurados dentro de la vivienda, con los límites y requisitos de la póliza. Realizá la denuncia y conservá comprobantes e inventario de los bienes afectados." },
  { icon: DoorOpen, title: "Se rompió una ventana", text: "Revisá cuándo aplica la cobertura de cristales.", answer: "La rotura accidental de cristales asegurados de la vivienda puede estar cubierta. No retires los restos antes de documentar el daño y verificá que el cristal esté incluido en tu póliza." },
  { icon: MonitorSmartphone, title: "Se dañó mi notebook", text: "Enterate qué cobertura puede corresponder.", answer: "Una notebook puede formar parte del contenido asegurado, sujeto a la cobertura contratada, suma asegurada y exclusiones. Tené a mano la factura o comprobante de compra y consultá el caso puntual." },
];

const assistance = [
  { icon: Zap, title: "Electricidad", text: "Corte total de luz por cortocircuito o desperfecto en instalación fija." },
  { icon: Wind, title: "Gas", text: "Fugas o pérdidas en instalaciones fijas. Incluye mano de obra y materiales." },
  { icon: Pipette, title: "Plomería", text: "Pérdidas de agua, roturas de cañerías, sanitarios y más." },
  { icon: Hammer, title: "Destapaciones", text: "Obstrucciones en cañerías internas y desagües de la vivienda." },
  { icon: KeyRound, title: "Cerrajería", text: "Apertura de puertas por pérdida de llaves o extravío." },
  { icon: Wrench, title: "Mantenimiento", text: "Arreglos cotidianos, instalaciones de artefactos y más." },
];

function InfoIntro() { return <section className="home-information info-intro" aria-label="Información del seguro de hogar"><div className="info-heading"><p className="eyebrow">Información para decidir tranquilo</p><h2>Todo lo que querés saber sobre tu seguro</h2><p>Respondemos las dudas más comunes para que tengas toda la información en un solo lugar.</p><SatAIWidget slug="allianz-hogar" hideTitle /></div></section>; }
function HomeInformation() {
  return <section className="home-information info-details" aria-label="Coberturas y situaciones del seguro de hogar">
    <div className="info-columns"><div className="faq-list"><h3><ShieldCheck size={22} /> Consultas frecuentes</h3>{faqItems.map(([question, answer], index) => <details open={index === 0} key={question}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}</div>
      <div className="situations"><h3>¿Qué cubre en situaciones reales?</h3>{situations.map(({ icon: Icon, title, text, answer }) => <details className="situation-card" key={title}><summary><Icon size={25} /><div><strong>{title}</strong><span>{text}</span></div><span className="situation-toggle" aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div>
  </section>;
}
function AssistanceBlock() { return <section className="home-information assistance"><div className="assistance-heading"><div><h3>Asistencia para tu hogar 24 hs</h3><p>Estamos siempre que nos necesitás.</p></div><ShieldCheck size={30} /></div><div className="assistance-grid">{assistance.map(({ icon: Icon, title, text }) => <div className="assistance-item" key={title}><span className="assistance-icon"><Icon size={22} /></span><strong>{title}</strong><p>{text}</p></div>)}</div><div className="assistance-note"><span><CalendarDays size={20} /> Hasta 4 eventos por año calendario en cada servicio esencial.</span><span><CircleDollarSign size={20} /> Tope de $75.000 por evento. Podés ampliar a $150.000 utilizando 2 eventos.</span><span><ShieldCheck size={20} /> Servicio brindado por profesionales calificados de nuestra red.</span></div></section>; }

function HomeStep({ form, setForm, onContinue, error, areaOptions, showValidation }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; onContinue: () => void; error: string; areaOptions: number[]; showValidation: boolean }) {
  const currentArea = Number(form.squareMeters) || areaOptions[0] || 30;
  const currentIndex = areaOptions.indexOf(currentArea);
  const isApartment = form.homeType === "Departamento";
  const postalInvalid = showValidation && !/^\d{4}$/.test(form.postalCode), floorInvalid = showValidation && isApartment && !form.floor, areaInvalid = showValidation && !areaOptions.includes(Number(form.squareMeters));
  const moveArea = (direction: -1 | 1) => {
    const nextIndex = currentIndex + direction;
    const nextValue = areaOptions[nextIndex];
    if (nextValue !== undefined) setForm((value) => ({ ...value, squareMeters: String(nextValue) }));
  };
  return <section className="form-step" aria-labelledby="home-title">
    <div className="section-heading"><p className="eyebrow">Cotizá online en minutos</p><h1 id="home-title">Contanos sobre tu hogar</h1><p>Así podemos encontrar una cobertura pensada para vos.</p></div>
    <div className="fields-grid">
      <div className={`field ${postalInvalid ? "field-invalid" : ""}`}><label htmlFor="postal-code">Código postal</label><input id="postal-code" aria-invalid={postalInvalid} inputMode="numeric" maxLength={4} placeholder="Ej: 1425" value={form.postalCode} onChange={e => setForm(v => ({ ...v, postalCode: e.target.value.replace(/\D/g, "") }))} />{postalInvalid && <span className="field-message">Ingresá un código postal de 4 números.</span>}</div>
      <fieldset className="field home-type-field"><legend>Tipo de vivienda</legend><div className="home-types">
        {homeTypes.map(({ value, icon: Icon }) => <button className={`home-type ${form.homeType === value ? "is-selected" : ""}`} type="button" aria-pressed={form.homeType === value} onClick={() => setForm(v => ({ ...v, homeType: value, floor: value === "Departamento" ? (v.floor === "No corresponde" ? "" : v.floor) : "No corresponde" }))} key={value}><Icon size={25} /><span>{value}</span></button>)}
      </div></fieldset>
      {isApartment && <div className={`field ${floorInvalid ? "field-invalid" : ""}`}><label htmlFor="floor">Piso</label><select id="floor" aria-invalid={floorInvalid} value={form.floor} onChange={e => setForm(v => ({ ...v, floor: e.target.value }))}><option value="">Seleccioná el piso</option><option>Planta baja</option><option>Primer piso</option><option>Segundo piso o superior</option></select>{floorInvalid && <span className="field-message">Seleccioná una opción.</span>}</div>}
      <div className={`field ${areaInvalid ? "field-invalid" : ""}`}><label htmlFor="area">Metros cuadrados cubiertos (aprox.)</label><div className="area-input"><button type="button" aria-label="Reducir metros cuadrados" onClick={() => moveArea(-1)} disabled={currentIndex <= 0}>−</button><div><input id="area" aria-invalid={areaInvalid} type="text" readOnly value={form.squareMeters || "Cargando..."} /><span>{form.squareMeters ? "m²" : ""}</span></div><button type="button" aria-label="Aumentar metros cuadrados" onClick={() => moveArea(1)} disabled={currentIndex < 0 || currentIndex >= areaOptions.length - 1}>+</button></div>{areaInvalid && <span className="field-message">No pudimos cargar las superficies disponibles.</span>}</div>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><span className="trust-note"><ShieldCheck size={17} /> Tu información está protegida</span><button className="button button-primary" type="button" onClick={onContinue}>Continuar <ArrowRight size={19} /></button></div>
  </section>;
}

function ContactStep({ form, setForm, onBack, onSubmit, error, submitting, showValidation }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; onBack: () => void; onSubmit: (event: FormEvent) => void; error: string; submitting: boolean; showValidation: boolean }) {
  const nameInvalid = showValidation && form.name.trim().length < 3, emailInvalid = showValidation && !/^\S+@\S+\.\S+$/.test(form.email);
  return <section className="form-step" aria-labelledby="contact-title">
    <div className="section-heading"><p className="eyebrow">Ya casi terminamos</p><h1 id="contact-title">Dejanos tus datos</h1><p>Te mostraremos la cotización en el próximo paso.</p></div>
    <form onSubmit={onSubmit}><div className="contact-layout"><div className="contact-fields">
      <div className={`field ${nameInvalid ? "field-invalid" : ""}`}><label htmlFor="name">Nombre y apellido</label><input id="name" aria-invalid={nameInvalid} autoComplete="name" placeholder="Ej: Juan Pérez" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} />{nameInvalid && <span className="field-message">Ingresá tu nombre y apellido.</span>}</div>
      <div className={`field ${emailInvalid ? "field-invalid" : ""}`}><label htmlFor="email">Email</label><input id="email" aria-invalid={emailInvalid} type="email" autoComplete="email" placeholder="Ej: juanperez@email.com" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} />{emailInvalid && <span className="field-message">Ingresá un email válido.</span>}</div>
    </div><aside className="delivery-note"><span className="delivery-icon"><Mail size={29} /></span><p>Te enviaremos el <strong>detalle de tu cotización</strong> y quedará guardada para vos.</p></aside></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="button button-secondary" type="button" onClick={onBack} disabled={submitting}><ArrowLeft size={18} /> Volver</button><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Guardando..." : "Ver mi cotización"} {!submitting && <ArrowRight size={19} />}</button></div></form>
  </section>;
}

function QuoteStep({ form, quote, onBack, onContract }: { form: FormState; quote: HomeQuote; onBack: () => void; onContract: () => void }) {
  const firstName = form.name.trim().split(/\s+/)[0] || "";
  const coverage = [
    { icon: Flame, label: "Incendio de estructura", value: formatCurrency(quote.structureCoverage) }, { icon: Home, label: "Incendio del contenido", value: formatCurrency(quote.contentsCoverage) },
    { icon: MonitorSmartphone, label: "Electrodomésticos", value: formatCurrency(quote.appliancesCoverage) }, { icon: Sparkles, label: "Cristales", value: formatCurrency(quote.glassCoverage) },
    { icon: LockKeyhole, label: "Robo de contenido", value: formatCurrency(quote.theftCoverage) }, { icon: Droplets, label: "Daños por agua", value: formatCurrency(quote.waterDamageCoverage) },
    { icon: Wrench, label: "Asistencia para tu hogar", value: "Incluida" },
  ];
  return <section className="form-step quote-step" aria-labelledby="quote-title">
    <div className="quote-welcome"><span className="success-icon"><Check size={23} strokeWidth={3} /></span><div><h1 id="quote-title">¡Listo, {firstName}!</h1><p>Tenemos una cobertura pensada para tu hogar.</p></div></div>
    <div className="quote-layout"><div><div className="home-summary">Tu cobertura para <strong>{form.homeType.toLowerCase()} de {quote.quotedSquareMeters} m²</strong></div><div className="price-card"><span>Con el respaldo de</span><div className="insurer-logo"><img src="/assets/allianz.png" alt="Allianz" /></div><small>Tu seguro de hogar</small><div className="price">{formatCurrency(quote.monthlyPrice)} <span>/mes</span></div><strong>12 CUOTAS FIJAS</strong><span>Póliza anual</span><em>Precio vigente por 10 días</em></div><button className="button button-primary full-button" type="button" onClick={onContract}>Quiero contratar <ArrowRight size={19} /></button></div>
      <div className="coverage-card"><h2>Tu cobertura</h2>{coverage.map(({ icon: Icon, label, value }, index) => <div className="coverage-row" key={label}><span><Icon size={19} /> {label}</span><strong className={index === coverage.length - 1 ? "included" : ""}>{value}</strong></div>)}</div>
    </div><div className="quote-footer"><button className="text-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Corregir mis datos</button><span>Guardamos tu solicitud para que un asesor pueda ayudarte.</span></div>
  </section>;
}

function ContractStep({ data, setData, homeType, floorCategory, onBack, onSubmit, error, submitting, showValidation }: { data: ContractState; setData: React.Dispatch<React.SetStateAction<ContractState>>; homeType: HomeType; floorCategory: string; onBack: () => void; onSubmit: (event: FormEvent) => void; error: string; submitting: boolean; showValidation: boolean }) {
  const field = (key: keyof ContractState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setData((current) => ({ ...current, [key]: event.target.value }));
  const isApartment = homeType === "Departamento";
  const requiresExactFloor = floorCategory === "Segundo piso o superior";
  const invalid: Partial<Record<keyof ContractState, boolean>> = showValidation ? { firstName: !data.firstName, lastName: !data.lastName, dni: data.dni.length < 6 || data.dni.length > 8, dateOfBirth: !data.dateOfBirth, address: data.address.length < 3, floor: isApartment && !validExactFloor(requiresExactFloor ? "Segundo piso o superior" : "Primer piso", data.floor), postalCode: data.postalCode.length < 4, email: !/^\S+@\S+\.\S+$/.test(data.email), phone: !validArgentinePhone(data.phone) } : {};
  const fieldClass = (key: keyof ContractState, extra = "") => `field ${extra} ${invalid[key] ? "field-invalid" : ""}`.trim();
  const message = (key: keyof ContractState, text = "Completá este campo.") => invalid[key] ? <span className="field-message">{text}</span> : null;
  return <section className="form-step contract-step" aria-labelledby="contract-title">
    <div className="section-heading"><p className="eyebrow">Solicitud de contratación</p><h1 id="contract-title">Completá tus datos</h1><p>Usaremos esta información para preparar tu propuesta de emisión.</p></div>
    <div className="contract-security"><ShieldCheck size={20} /><span><strong>En este paso no te pediremos ningún medio de pago.</strong> Usaremos estos datos para preparar tu propuesta. Cuando la recibamos, te contactaremos en el día para revisarla y recién entonces solicitarte el medio de pago para finalizar la emisión.</span></div>
    <form onSubmit={onSubmit}>
      <div className="contract-fields">
        <div className={fieldClass("firstName")}><label htmlFor="contract-first-name">Nombre</label><input id="contract-first-name" aria-invalid={invalid.firstName} autoComplete="given-name" value={data.firstName} onChange={field("firstName")} />{message("firstName")}</div>
        <div className={fieldClass("lastName")}><label htmlFor="contract-last-name">Apellido</label><input id="contract-last-name" aria-invalid={invalid.lastName} autoComplete="family-name" value={data.lastName} onChange={field("lastName")} />{message("lastName")}</div>
        <div className={fieldClass("dni")}><label htmlFor="contract-dni">DNI</label><input id="contract-dni" aria-invalid={invalid.dni} inputMode="numeric" maxLength={10} placeholder="Ej: 30.123.456" value={formatDni(data.dni)} onChange={event => setData(current => ({ ...current, dni: event.target.value.replace(/\D/g, "").slice(0, 8) }))} />{message("dni", "Ingresá un DNI válido de hasta 8 dígitos.")}</div>
        <div className={fieldClass("dateOfBirth")}><label htmlFor="contract-birth-date">Fecha de nacimiento</label><input id="contract-birth-date" aria-invalid={invalid.dateOfBirth} type="date" autoComplete="bday" value={data.dateOfBirth} onChange={field("dateOfBirth")} />{message("dateOfBirth")}</div>
        <div className={fieldClass("address", "contract-address")}><label htmlFor="contract-address">Domicilio</label><input id="contract-address" aria-invalid={invalid.address} autoComplete="street-address" placeholder="Calle y número" value={data.address} onChange={field("address")} />{message("address", "Ingresá la calle y el número.")}</div>
        {isApartment && <><div className={fieldClass("floor")}><label htmlFor="contract-floor">{requiresExactFloor ? "Piso exacto" : "Piso"}</label>{requiresExactFloor ? <input id="contract-floor" aria-invalid={invalid.floor} inputMode="numeric" maxLength={2} placeholder="Ej: 7" value={data.floor} onChange={event => setData(current => ({ ...current, floor: event.target.value.replace(/\D/g, "").slice(0, 2) }))} /> : <input id="contract-floor" value={data.floor} readOnly />}{message("floor", "Ingresá el piso exacto, con hasta 2 dígitos.")}</div>
        <div className="field"><label htmlFor="contract-apartment">Departamento <span className="optional">(opcional)</span></label><input id="contract-apartment" placeholder="Ej: B" value={data.apartment} onChange={field("apartment")} /></div></>}
        <div className={fieldClass("postalCode")}><label htmlFor="contract-postal-code">Código postal</label><input id="contract-postal-code" aria-invalid={invalid.postalCode} inputMode="numeric" autoComplete="postal-code" maxLength={8} value={data.postalCode} onChange={field("postalCode")} />{message("postalCode", "Ingresá un código postal válido.")}</div>
        <div className={fieldClass("email")}><label htmlFor="contract-email">Email</label><input id="contract-email" aria-invalid={invalid.email} type="email" autoComplete="email" value={data.email} onChange={field("email")} />{message("email", "Ingresá un email válido.")}</div>
        <div className={fieldClass("phone")}><label htmlFor="contract-phone">Celular</label><input id="contract-phone" aria-invalid={invalid.phone} type="tel" inputMode="tel" maxLength={24} autoComplete="tel" placeholder="Ej: 11 5062 5555" value={data.phone} onChange={event => setData(current => ({ ...current, phone: cleanPhone(event.target.value) }))} />{message("phone", "Ingresá entre 8 y 15 números.")}</div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={onBack} disabled={submitting}><ArrowLeft size={18} /> Volver</button><div className="contract-submit"><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Solicitar contratación"} {!submitting && <ArrowRight size={19} />}</button><small><LockKeyhole size={13} /> Sin pago en esta instancia. Te contactamos en el día.</small></div></div>
    </form>
  </section>;
}

function ContractSuccess({ form, contract, quote }: { form: FormState; contract: ContractState; quote: HomeQuote }) {
  return <section className="form-step contract-success"><span className="success-icon large"><Check size={36} strokeWidth={3} /></span><h1>¡Recibimos tu solicitud, {contract.firstName}!</h1><p>Ya estamos preparando tu propuesta de <strong>Seguro de Hogar Allianz.</strong></p><div className="success-quote"><div><small>Tu cotización</small><img src="/assets/allianz.png" alt="Allianz" /></div><div><strong>{form.homeType} · {quote.quotedSquareMeters} m²</strong><span>Código postal {form.postalCode}</span><b>{formatCurrency(quote.monthlyPrice)} <em>/ mes</em></b><span>12 cuotas fijas · Póliza anual</span></div></div><section className="next-steps"><h2>¿Qué pasa ahora?</h2><div className="next-steps-grid"><div><span><Check size={21} /></span><strong>1. Solicitud recibida</strong><p>Ya tenemos tus datos y la cotización.</p></div><ArrowRight className="next-arrow" /><div><span><ShieldCheck size={21} /></span><strong>2. Preparamos tu propuesta</strong><p>Revisamos la información para preparar la emisión.</p></div><ArrowRight className="next-arrow" /><div><span><Phone size={21} /></span><strong>3. Te contactamos en el día</strong><p>Un asesor se va a comunicar para revisar la propuesta con vos.</p></div><ArrowRight className="next-arrow" /><div><span><CreditCard size={21} /></span><strong>4. Elegís el medio de pago y emitimos</strong><p>Una vez confirmada, solicitaremos el medio de pago que prefieras para finalizar.</p></div></div><div className="no-payment"><ShieldCheck size={28} /><div><strong>No tenés que hacer nada ahora.</strong><span>Todavía no realizaste ningún pago y tu póliza aún no fue emitida.</span></div></div></section><a href="https://wa.me/5491150625555" target="_blank" rel="noreferrer" className="success-whatsapp"><MessageCircle size={34} /><span><strong>¿Querés hablar con nosotros ahora?</strong><small>Escribinos por WhatsApp y te ayudamos.</small></span><b>Hablar por WhatsApp <ArrowRight size={18} /></b></a><div className="success-commitments"><span><CircleDollarSign size={25} /><b>Nuestro compromiso</b><small>Cotizamos y emitimos en el día.</small></span><span><UserRound size={25} /><b>Asesoramiento humano</b><small>Te acompañamos en todo el proceso.</small></span><span><ShieldCheck size={25} /><b>Tu tranquilidad, nuestra prioridad</b><small>Trabajamos con Allianz, una de las compañías de seguros líderes del mundo.</small></span></div></section>;
}

function HomeQuotePage() {
  const [step, setStep] = useState(1), [form, setForm] = useState(initialForm), [error, setError] = useState(""), [submitting, setSubmitting] = useState(false);
  const [areaOptions, setAreaOptions] = useState<number[]>([]);
  const [quote, setQuote] = useState<HomeQuote | null>(null);
  const [leadId, setLeadId] = useState("");
  const [contract, setContract] = useState<ContractState>({ firstName: "", lastName: "", dni: "", dateOfBirth: "", address: "", floor: "", apartment: "", postalCode: "", email: "", phone: "" });
  const [validationAttempted, setValidationAttempted] = useState<Record<number, boolean>>({});
  const submissionId = useRef(crypto.randomUUID());
  const revealErrors = (validationStep: number) => { setValidationAttempted(current => ({ ...current, [validationStep]: true })); window.setTimeout(() => document.querySelector(".field-invalid")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); };
  useEffect(() => { void fetch(`${API_URL}/leads/home/options`).then(response => response.ok ? response.json() : Promise.reject()).then(data => { const options = Array.isArray(data.options) ? data.options.filter((value: unknown) => typeof value === "number") : []; if (!options.length) throw new Error(); setAreaOptions(options); setForm(current => ({ ...current, squareMeters: String(options[0]) })); }).catch(() => setError("No pudimos cargar el tarifario. Por favor, intentá nuevamente.")); }, []);
  function continueToContact() { const area = Number(form.squareMeters); if (!/^\d{4}$/.test(form.postalCode) || (form.homeType === "Departamento" && !form.floor) || !areaOptions.includes(area)) { revealErrors(1); setError("Completá los campos marcados para continuar."); return; } trackLandingEvent("cotizador_continuar", { step: 1, home_type: form.homeType, floor: form.floor }); setError(""); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function submitContact(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(form.email)) { revealErrors(2); setError("Completá los campos marcados para continuar."); return; }
    const squareMeters = Number(form.squareMeters);
    trackLandingEvent("cotizador_ver_cotizacion", { step: 2, home_type: form.homeType, floor: form.floor, square_meters: squareMeters });
    setError(""); setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch(`${API_URL}/leads/home`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submissionId.current, name: form.name, email: form.email,
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
      setLeadId(data.leadId);
      setStep(3); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("No pudimos guardar tu solicitud. Por favor, intentá nuevamente.");
    } finally { setSubmitting(false); }
  }
  function startContract() {
    trackLandingEvent("cotizador_quiero_contratar", { step: 3, home_type: form.homeType });
    const [firstName = "", ...lastNameParts] = form.name.trim().split(/\s+/);
    setContract({ firstName, lastName: lastNameParts.join(" "), dni: "", dateOfBirth: "", address: "", floor: form.floor === "Segundo piso o superior" ? "" : form.floor, apartment: "", postalCode: form.postalCode, email: form.email, phone: "" });
    setError(""); setStep(4); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submitContract(event: FormEvent) {
    event.preventDefault();
    if (!contract.firstName || !contract.lastName || contract.dni.length < 6 || contract.dni.length > 8 || !contract.dateOfBirth || contract.address.length < 3 || (form.homeType === "Departamento" && !validExactFloor(form.floor, contract.floor)) || contract.postalCode.length < 4 || !/^\S+@\S+\.\S+$/.test(contract.email) || !validArgentinePhone(contract.phone)) { revealErrors(4); setError("Completá los campos marcados para continuar."); return; }
    setError(""); setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/leads/home/${leadId}/contract`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: submissionId.current, ...contract }) });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(detail?.error || "No pudimos actualizar la solicitud");
      }
      setStep(5); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setError(error instanceof Error ? error.message : "No pudimos enviar tus datos. Por favor, intentá nuevamente."); }
    finally { setSubmitting(false); }
  }
  return <div className="page-shell"><SiteHeader /><main className="quote-main"><div className="quote-card">{step <= 3 && <Stepper current={step} />}
    {step === 1 && <HomeStep form={form} setForm={setForm} onContinue={continueToContact} error={error} areaOptions={areaOptions} showValidation={Boolean(validationAttempted[1])} />}
    {step === 2 && <ContactStep form={form} setForm={setForm} onBack={() => { setError(""); setStep(1); }} onSubmit={submitContact} error={error} submitting={submitting} showValidation={Boolean(validationAttempted[2])} />}
    {step === 3 && quote && <QuoteStep form={form} quote={quote} onBack={() => setStep(2)} onContract={startContract} />}
    {step === 4 && <ContractStep data={contract} setData={setContract} homeType={form.homeType} floorCategory={form.floor} onBack={() => setStep(3)} onSubmit={submitContract} error={error} submitting={submitting} showValidation={Boolean(validationAttempted[4])} />}
    {step === 5 && quote && <ContractSuccess form={form} contract={contract} quote={quote} />}
  </div>{step <= 3 && <><InfoIntro /><HomeInformation /><AssistanceBlock /><div className="info-contact"><div><strong>¿No encontraste lo que buscabas?</strong><span>Hablá con un asesor y te ayudamos.</span></div><a href="https://wa.me/5491150625555" target="_blank" rel="noreferrer" className="button button-primary">Hablar por WhatsApp <ArrowRight size={18} /></a></div></>}</main><SiteFooter /></div>;
}

export function App() { return <HomeQuotePage />; }
