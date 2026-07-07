"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Botão de copiar com feedback: ao clicar, escreve no clipboard e troca o rótulo
 * para "✓ Copiado!" por ~2s. Aceita o texto direto ou uma função (lida no clique,
 * útil quando o conteúdo muda). Tem fallback para contextos sem Clipboard API.
 */
export function CopyButton({
  text,
  label = "Copiar",
  copiedLabel = "Copiado!",
  className = "btn-secondary !py-1 text-xs",
}: {
  text: string | (() => string);
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copiar() {
    const value = typeof text === "function" ? text() : text;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback para navegadores/contextos sem Clipboard API (ex.: http).
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignora */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copiar} aria-live="polite" className={className}>
      {copied ? (
        <span style={{ color: "#22c55e" }}>✓ {copiedLabel}</span>
      ) : (
        label
      )}
    </button>
  );
}
