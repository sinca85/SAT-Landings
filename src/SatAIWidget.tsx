import { useEffect, useState, type ReactNode } from "react";

interface SatAIWidgetProps { slug: string; apiUrl?: string; className?: string }
interface WidgetConfig { title?: string; placeholder?: string; welcomeMessage?: string; active: boolean }
interface ChatResponse { success: boolean; answer?: string; sources?: Array<{ document: string; page?: number }>; error?: string }

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

export function SatAIWidget({ slug, apiUrl = "https://api.seguroatiempo.com", className = "" }: SatAIWidgetProps) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { let cancelled = false; void fetch(`${apiUrl}/api/ai/chat/${encodeURIComponent(slug)}/config`).then((response) => response.ok ? response.json() : null).then((data) => { if (!cancelled) setConfig(data?.active ? data : null); }).catch(() => undefined); return () => { cancelled = true; }; }, [apiUrl, slug]);
  if (!config) return null;
  const ask = async () => { if (!question.trim() || loading) return; setLoading(true); setResult(null); try { const response = await fetch(`${apiUrl}/api/ai/chat/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: question.trim() }) }); setResult(await response.json() as ChatResponse); } catch { setResult({ success: false, error: "No pudimos consultar en este momento." }); } finally { setLoading(false); } };
  return <section className={`sat-ai-widget ${className}`} aria-label={config.title || "Asistente"}>{config.title && <h2>{config.title}</h2>}<div className="sat-ai-form"><input value={question} maxLength={500} placeholder={config.placeholder || "¿Qué querés saber?"} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} /><button type="button" disabled={!question.trim() || loading} onClick={() => void ask()}>{loading ? "Consultando..." : "Preguntar"}</button></div>{result && <div className="sat-ai-result" role="status">{renderTextWithLinks(result.error || result.answer || "")}<button type="button" className="sat-ai-new" onClick={() => { setQuestion(""); setResult(null); }}>Nueva consulta</button></div>}</section>;
}
