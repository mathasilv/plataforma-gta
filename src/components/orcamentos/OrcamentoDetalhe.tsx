"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  estacaoLabel,
  type AcaoTransicao,
  type Orcamento,
  type RegistroValidacao,
} from "@/lib/orcamentos/types";
import type { PermissaoKey } from "@/lib/rbac/permissoes";
import { Badge, KpiGrid, Kpi, type Tone } from "@/components/ui";
import { formatBRL, formatDecimal } from "@/lib/format";

const ESTACAO_TONE: Record<string, Tone> = {
  rascunho: "slate",
  em_revisao: "amber",
  aprovado: "green",
  cancelado: "slate",
};

const HIST: Record<RegistroValidacao["tipo"], { label: string; tone: Tone }> = {
  enviar: { label: "Enviado para revisão", tone: "indigo" },
  aprovar: { label: "Aprovado", tone: "green" },
  rejeitar: { label: "Devolvido para ajustes", tone: "red" },
  cancelar: { label: "Cancelado", tone: "slate" },
  auto: { label: "Validação automática", tone: "amber" },
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Ações que abrem o campo de parecer (obrigatório em aprovar/rejeitar). */
const PRECISA_PARECER: AcaoTransicao[] = ["aprovar", "rejeitar", "cancelar"];

export function OrcamentoDetalhe({
  inicial,
  perms,
}: {
  inicial: Orcamento;
  perms: PermissaoKey[];
}) {
  const pode = (k: PermissaoKey) => perms.includes(k);
  const [orc, setOrc] = useState<Orcamento>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // anexos
  const fileRef = useRef<HTMLInputElement>(null);
  const [anexando, setAnexando] = useState(false);

  // painel de parecer
  const [acaoAberta, setAcaoAberta] = useState<AcaoTransicao | null>(null);
  const [parecer, setParecer] = useState("");
  const [processando, setProcessando] = useState(false);

  async function transicionar(acao: AcaoTransicao, comParecer?: string) {
    setErro(null);
    setProcessando(true);
    try {
      const res = await fetch(`/api/orcamentos/${orc.id}/transicao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, parecer: comParecer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na ação.");
      setOrc(data.orcamento);
      setAcaoAberta(null);
      setParecer("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setProcessando(false);
    }
  }

  function acionar(acao: AcaoTransicao) {
    setErro(null);
    if (PRECISA_PARECER.includes(acao)) {
      setAcaoAberta(acao);
      setParecer("");
    } else {
      transicionar(acao);
    }
  }

  async function comentar(e: React.FormEvent) {
    e.preventDefault();
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    setErro(null);
    try {
      const res = await fetch(`/api/orcamentos/${orc.id}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: comentario.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao comentar.");
      setOrc(data.orcamento);
      setComentario("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function enviarAnexo(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setAnexando(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/orcamentos/${orc.id}/anexos`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao anexar.");
      setOrc(data.orcamento);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setAnexando(false);
    }
  }

  async function removerAnexo(anexoId: string) {
    if (!window.confirm("Remover este anexo?")) return;
    setErro(null);
    const res = await fetch(`/api/orcamentos/${orc.id}/anexos/${anexoId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error ?? "Falha ao remover.");
      return;
    }
    setOrc(data.orcamento);
  }

  const podeEnviar = orc.estacao === "rascunho" && pode("orcamentos.criar");
  const podeDecidir = orc.estacao === "em_revisao" && pode("orcamentos.aprovar");
  const podeCancelar = (orc.estacao === "rascunho" || orc.estacao === "em_revisao") && pode("orcamentos.cancelar");
  const semAcoes = !podeEnviar && !podeDecidir && !podeCancelar;
  const podeAnexar =
    (pode("orcamentos.criar") || pode("orcamentos.revisar")) &&
    orc.estacao !== "aprovado" &&
    orc.estacao !== "cancelado";

  return (
    <div className="space-y-5">
      <Link href="/aprovacoes" className="text-sm text-gta-indigo hover:underline">
        ← Voltar para aprovações
      </Link>

      {/* Cabeçalho */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gta-navy dark:text-slate-100">{orc.cliente}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">{orc.referencia}</p>
          </div>
          <Badge tone={ESTACAO_TONE[orc.estacao] ?? "slate"}>{estacaoLabel(orc.estacao)}</Badge>
        </div>
        {orc.descricao && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{orc.descricao}</p>}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Origem: <strong className="text-slate-700 dark:text-slate-200">{orc.fonte === "externo" ? "Externo (arquivo)" : "Interno (plataforma)"}</strong>
          </span>
          {orc.valor != null && (
            <span className="text-slate-500 dark:text-slate-400">
              Valor: <strong className="text-gta-navy dark:text-slate-100">{formatBRL(orc.valor)}</strong>
            </span>
          )}
          <span className="text-slate-500 dark:text-slate-400">Criado por {orc.criadoPorNome ?? orc.criadoPor}</span>
        </div>

        {orc.decididoPor && (
          <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/50">
            <strong>{estacaoLabel(orc.estacao)}</strong> por {orc.decididoPor}
            {orc.decididoEm ? ` em ${fmt(orc.decididoEm)}` : ""}
            {orc.parecer ? ` — “${orc.parecer}”` : ""}
          </p>
        )}
        {orc.expiraEm && (orc.estacao === "aprovado" || orc.estacao === "cancelado") && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Arquivos disponíveis para download até {fmt(orc.expiraEm)}.
          </p>
        )}
      </div>

      {/* Ficha externa */}
      {orc.fonte === "externo" && orc.ficha && (
        <KpiGrid>
          <Kpi label="Custo base" value={formatBRL(orc.ficha.custoBase)} />
          <Kpi label="Fator" value={formatDecimal(orc.ficha.fator, 3)} />
          <Kpi label="Faturamento" value={formatBRL(orc.ficha.faturamento)} destaque />
          <Kpi label="Margem líquida" value={`${formatDecimal(orc.ficha.margemLiquida * 100, 1)}%`} />
        </KpiGrid>
      )}

      {erro && <p className="field-error">{erro}</p>}

      {/* Anexos */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-gta-navy dark:text-slate-100">Anexos (PDF e planilha)</h2>
        {orc.anexos.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum anexo.</p>
        ) : (
          <ul className="space-y-2">
            {orc.anexos.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/50"
              >
                <div className="min-w-0">
                  <a
                    href={`/api/orcamentos/${orc.id}/anexos/${a.id}/download`}
                    className="block truncate font-medium text-gta-indigo hover:underline"
                  >
                    {a.nome}
                  </a>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {a.tipo === "pdf" ? "PDF" : "Planilha"} · {formatBytes(a.tamanho)} · {a.enviadoPor}
                  </div>
                </div>
                {podeAnexar && (
                  <button
                    onClick={() => removerAnexo(a.id)}
                    className="shrink-0 text-xs text-red-500 hover:underline dark:text-red-400"
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {podeAnexar && (
          <form onSubmit={enviarAnexo} className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              className="text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-gta-indigo/10 file:px-2 file:py-1 file:text-gta-indigo dark:text-slate-300"
            />
            <button type="submit" className="btn-secondary" disabled={anexando}>
              {anexando ? "Enviando..." : "Anexar"}
            </button>
          </form>
        )}
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          PDF ou planilha, até 4 MB. Após aprovado/cancelado, os arquivos ficam disponíveis por 7/3 dias e então são removidos.
        </p>
      </div>

      {/* Ações */}
      {!semAcoes && (
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-gta-navy dark:text-slate-100">Ações</h2>
          {acaoAberta ? (
            <div className="space-y-2">
              <label className="field-label">
                Parecer {acaoAberta === "cancelar" ? "(opcional)" : "*"}
              </label>
              <textarea
                className="field-input min-h-20"
                value={parecer}
                onChange={(e) => setParecer(e.target.value)}
                placeholder={acaoAberta === "rejeitar" ? "O que precisa ser ajustado?" : "Registre o parecer da revisão"}
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  disabled={processando || (acaoAberta !== "cancelar" && !parecer.trim())}
                  onClick={() => transicionar(acaoAberta, parecer.trim() || undefined)}
                >
                  {processando ? "Processando..." : `Confirmar ${HIST[acaoAberta].label.toLowerCase()}`}
                </button>
                <button className="btn-secondary" onClick={() => setAcaoAberta(null)} disabled={processando}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {podeEnviar && (
                <button className="btn-primary" onClick={() => acionar("enviar")} disabled={processando}>
                  Enviar para revisão
                </button>
              )}
              {podeDecidir && (
                <>
                  <button className="btn-primary" onClick={() => acionar("aprovar")} disabled={processando}>
                    Aprovar
                  </button>
                  <button
                    className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => acionar("rejeitar")}
                    disabled={processando}
                  >
                    Rejeitar
                  </button>
                </>
              )}
              {podeCancelar && (
                <button className="btn-secondary" onClick={() => acionar("cancelar")} disabled={processando}>
                  Cancelar orçamento
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comentários de revisão */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-gta-navy dark:text-slate-100">Revisão</h2>
        {orc.comentarios.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum comentário ainda.</p>
        ) : (
          <ul className="space-y-2">
            {orc.comentarios.map((c) => (
              <li key={c.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{c.autor}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{fmt(c.em)}</span>
                </div>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">{c.texto}</p>
              </li>
            ))}
          </ul>
        )}
        {pode("orcamentos.revisar") && (
          <form onSubmit={comentar} className="mt-3 flex gap-2">
            <input
              className="field-input"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escreva um comentário de revisão..."
            />
            <button className="btn-secondary shrink-0" disabled={enviandoComentario || !comentario.trim()}>
              {enviandoComentario ? "..." : "Comentar"}
            </button>
          </form>
        )}
      </div>

      {/* Histórico do fluxo de aprovação */}
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-gta-navy dark:text-slate-100">Histórico</h2>
        {orc.historico.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Sem movimentações.</p>
        ) : (
          <ul className="space-y-2">
            {[...orc.historico].reverse().map((h) => (
              <li key={h.id} className="flex items-start gap-3 text-sm">
                <Badge tone={HIST[h.tipo]?.tone ?? "slate"} className="mt-0.5 shrink-0">
                  {HIST[h.tipo]?.label ?? h.tipo}
                </Badge>
                <div className="min-w-0">
                  <p className="text-slate-600 dark:text-slate-300">{h.mensagem}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {h.autor} · {fmt(h.em)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
