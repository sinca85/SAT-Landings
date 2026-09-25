import { useEffect, useState } from "react";
export const AUTO_API_URL = `${import.meta.env.VITE_API_URL || "https://api.seguroatiempo.com"}/api/auto`;
export type Option = { value: string; label: string };
export type AutoConfig = { ready: boolean; environment: "test"; mode: "demo" | "galeno"; personType: string; analytics: { enabled: boolean; measurementId?: string; metaPixelId?: string } };
export type AutoQuote = { environment: "test"; requestId: string; vehicle: string; insuredAmount: number | null; hasRestrictions: boolean; billing: { mode: string; condition: string; method: string }; coverages: { code: string; name: string; premium: number; firstInstallment: number; remainingInstallment: number; benefits: string[]; deductible: string }[] };
export async function autoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${AUTO_API_URL}${path}`, { ...init, cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "No pudimos consultar el cotizador. Intentá nuevamente.");
  return data as T;
}
export function useAutoCatalog(params: Record<string, string> | null) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const [state, setState] = useState<{ query: string; options: Option[]; loading: boolean; error: string }>({ query: "", options: [], loading: false, error: "" });
  const [attempt, retry] = useState(0);
  useEffect(() => {
    if (!query) { setState({ query: "", options: [], loading: false, error: "" }); return; }
    const controller = new AbortController();
    setState({ query, options: [], loading: true, error: "" });
    void autoRequest<{ options: Option[] }>(`/catalog?${query}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ query, options: data.options, loading: false, error: "" }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ query, options: [], loading: false, error: error instanceof Error ? error.message : "No se pudo cargar el catálogo." }); });
    return () => controller.abort();
  }, [query, attempt]);
  return { ...(state.query === query ? state : { options: [], loading: Boolean(query), error: "" }), retry: () => retry(value => value + 1) };
}
