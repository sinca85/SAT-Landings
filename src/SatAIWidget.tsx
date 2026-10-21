import { useEffect, useState, type ReactNode } from "react";
import { trackLandingEvent } from "./GoogleAnalytics";

interface SatAIWidgetProps { slug: string; apiUrl?: string; className?: string; hideTitle?: boolean; placeholder?: string; heading?: string; subtitle?: string; suggestedQuestions?: string[] }
interface WidgetConfig { title?: string; placeholder?: string; welcomeMessage?: string; active: boolean }
interface ChatResponse { success: boolean; answer?: string; sources?: Array<{ document: string; page?: number }>; error?: string; needsAdvisor?: boolean; whatsappUrl?: string }

function renderTextWithLinks(value: string): ReactNode[] {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|<a\s+[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(value))) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const href = match[2] || match[3];
    const label = match[1] || match[4] || href;
    nodes.push(<a key={`${match.index}-${href}`} href={href} target="_blank" rel="noreferrer">{label}</a>);
    cursor = linkPattern.lastIndex;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes.length ? nodes : [value];
}

export function SatAIWidget({ slug, apiUrl = "https://api.seguroatiempo.com", className = "", hideTitle = false, placeholder, heading, subtitle, suggestedQuestions = [] }: SatAIWidgetProps) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { let cancelled = false; void fetch(`${apiUrl}/api/ai/chat/${encodeURIComponent(slug)}/config`).then((response) => response.ok ? response.json() : null).then((data) => { if (!cancelled) setConfig(data?.active ? data : null); }).catch(() => undefined); return () => { cancelled = true; }; }, [apiUrl, slug]);
  if (!config) return null;
  const ask = async () => { if (!question.trim() || loading) return; setLoading(true); setResult(null); try { const response = await fetch(`${apiUrl}/api/ai/chat/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: question.trim() }) }); setResult(await response.json() as ChatResponse); } catch { setResult({ success: false, error: "No pudimos consultar en este momento." }); } finally { setLoading(false); } };
  const askTracked = () => { if (question.trim()) trackLandingEvent("asistente_preguntar", { question: question.trim(), assistant: slug }); void ask(); };
  return <section className={`sat-ai-widget ${className}`} aria-label={heading || config.title || "Asistente"}>{heading && <div className="sat-ai-heading"><span aria-hidden="true">🤖</span><div><h2>{heading}</h2>{subtitle && <p>{subtitle}</p>}</div></div>}{!heading && !hideTitle && config.title && <h2>{config.title}</h2>}<div className="sat-ai-form"><input value={question} maxLength={500} placeholder={placeholder || config.placeholder || "¿Qué querés saber?"} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") askTracked(); }} /><button type="button" disabled={!question.trim() || loading} onClick={askTracked} aria-label={heading ? "Enviar pregunta" : undefined}>{heading ? (loading ? "..." : "➤") : (loading ? "Consultando..." : "Preguntar")}</button></div>{suggestedQuestions.length > 0 && !result && <div className="sat-ai-suggestions"><small>Preguntas sugeridas:</small><div>{suggestedQuestions.map(item => <button type="button" key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div></div>}{result && <div className="sat-ai-result" role="status">{renderTextWithLinks(result.error || result.answer || "")}{result.needsAdvisor && result.whatsappUrl && <a className="sat-ai-whatsapp" href={result.whatsappUrl} target="_blank" rel="noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.3h.1C18.7 23.6 24 18.3 24 11.8c0-3.1-1.2-6.1-3.5-8.3ZM12.2 21.5h-.1c-1.7 0-3.4-.5-4.8-1.4l-.4-.2-3.9 1 1-3.8-.3-.4a9.6 9.6 0 0 1-1.5-5.1c0-5.4 4.5-9.9 9.9-9.9 2.6 0 5.1 1 7 2.9s2.9 4.4 2.9 7c0 5.4-4.4 9.9-9.8 9.9Zm5.4-7.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.7.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z" /></svg><span>Contactar a un asesor por WhatsApp</span></a>}<button type="button" className="sat-ai-new" onClick={() => { setQuestion(""); setResult(null); }}>Nueva consulta</button></div>}</section>;
}
