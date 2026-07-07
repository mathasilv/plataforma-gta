"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SpdaParamsForm } from "./SpdaParamsForm";

const nf = (v: number, d = 2) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (v: number) => "R$ " + nf(v, 2);
const parseBR = (s: string) => {
  const t = String(s ?? "").trim();
  if (!t) return 0;
  return t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
};

const HOJE = new Date().toISOString().slice(0, 10);

interface Form {
  clienteNome: string;
  cidadeUf: string;
  localAtividade: string;
  referenciaSeq: number;
  dataEmissao: string;
  validadeDias: number;
  formaPagamento: string;
  nBlocos: number;
  areaM2: string;
  custoLogistico: string;
  valorProjeto: string; // design total (risco + projeto), sugerido e editável
  valorExecucao: string;
  objeto: string;
  prazoExecucao: string;
  observacoesExtra: string;
}

const OBJETO_PADRAO =
  "Serviços de engenharia para proteção contra descargas atmosféricas (SPDA) conforme a ABNT NBR 5419, contemplando a análise de gerenciamento de risco e o projeto executivo de SPDA (captação, descidas e malha de aterramento), com pranchas, memoriais, lista de materiais e ART.";
const OBS_PADRAO = [
  "Serviços conforme a ABNT NBR 5419.",
  "Inclui 1 visita técnica com medição de resistividade do solo (método Wenner).",
  "Emissão de ART junto ao CREA/GO inclusa.",
  "Instalação física (execução) e fornecimento de materiais são orçados à parte, quando não incluídos.",
];

const FORM_INICIAL: Form = {
  clienteNome: "", cidadeUf: "", localAtividade: "", referenciaSeq: 1, dataEmissao: HOJE, validadeDias: 20, formaPagamento: "A combinar",
  nBlocos: 1, areaM2: "", custoLogistico: "0",
  valorProjeto: "", valorExecucao: "0",
  objeto: OBJETO_PADRAO, prazoExecucao: "30 a 45 dias", observacoesExtra: OBS_PADRAO.join("\n"),
};

interface Preco {
  risco: number; projetoCalc: number; projeto: number; aplicouPiso: boolean;
  design: number; impostos: number; custoLogistico: number; lucro: number; margem: number;
}

export function SpdaConfigurator({ propostaId }: { propostaId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(FORM_INICIAL);
  const [preco, setPreco] = useState<Preco | null>(null);
  const [recalcNonce, setRecalcNonce] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(propostaId);
  const [aliq, setAliq] = useState(0.15);
  const precoTocado = useRef(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const aplicarParams = () => { precoTocado.current = false; setRecalcNonce((n) => n + 1); };

  useEffect(() => {
    if (propostaId) {
      fetch(`/api/propostas/${propostaId}`).then((r) => r.json()).then((d) => {
        if (d.proposta?.dados) { setForm({ ...FORM_INICIAL, ...(d.proposta.dados as Partial<Form>) }); precoTocado.current = true; }
      }).catch(() => {});
    } else {
      fetch("/api/propostas/proximo?serviceKey=spda").then((r) => r.json()).then((d) => {
        if (d.seq) setForm((f) => ({ ...f, referenciaSeq: d.seq }));
      }).catch(() => {});
    }
  }, [propostaId]);

  const calcKey = JSON.stringify([form.nBlocos, form.areaM2, form.custoLogistico, recalcNonce]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/spda/calcular", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nBlocos: form.nBlocos, areaM2: parseBR(form.areaM2), custoLogistico: parseBR(form.custoLogistico) }),
        });
        if (res.ok) {
          const d = await res.json();
          setPreco(d.preco);
          if (d.params?.aliqImpostos != null) setAliq(d.params.aliqImpostos);
          if (!precoTocado.current) setForm((f) => ({ ...f, valorProjeto: nf(d.preco.design, 2) }));
        }
      } catch { /* ignora */ }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcKey]);

  // Divisão dos itens: risco (por bloco, calculado) + projeto (total − risco).
  const valorTotalProjeto = parseBR(form.valorProjeto);
  const riscoItem = preco?.risco ?? 0;
  const projetoItem = Math.max(0, valorTotalProjeto - riscoItem);
  const totalCliente = valorTotalProjeto + parseBR(form.valorExecucao);
  // Composição do faturamento (reflete o valor editado do projeto).
  const impostosVal = valorTotalProjeto * aliq;
  const lucroVal = valorTotalProjeto - impostosVal - (preco?.custoLogistico ?? 0);
  const margemVal = valorTotalProjeto > 0 ? lucroVal / valorTotalProjeto : 0;

  function montarItens() {
    const itens: { descricao: string; valor: string; condicao: string }[] = [];
    const n = form.nBlocos;
    const area = parseBR(form.areaM2);
    itens.push({
      descricao:
        `Análise de gerenciamento de risco (ABNT NBR 5419) para ${n > 1 ? `${n} estruturas` : "1 estrutura"}: visita técnica, ` +
        `medição de resistividade do solo, cálculo das componentes de risco (R1/R2/R3), definição da classe de SPDA, laudo e memorial de cálculo`,
      valor: nf(riscoItem, 2),
      condicao: "",
    });
    itens.push({
      descricao:
        `Projeto executivo de SPDA (ABNT NBR 5419)${area > 0 ? ` — área de cobertura ~${nf(area, 0)} m²` : ""}: captação, condutores de descida e ` +
        `malha de aterramento, com pranchas DWG/PDF, memorial descritivo, memorial de cálculo e lista de materiais`,
      valor: nf(projetoItem, 2),
      condicao: "50% na aprovação (com a visita técnica) e 50% na entrega dos documentos e ART",
    });
    if (parseBR(form.valorExecucao) > 0) {
      itens.push({
        descricao: "Execução do SPDA (mão de obra, ferramental, ensaios e relatório) — materiais conforme a lista do projeto, faturados à parte",
        valor: nf(parseBR(form.valorExecucao), 2),
        condicao: "30% de entrada e saldo conforme cronograma",
      });
    }
    return itens;
  }

  function montarObservacoes() {
    return form.observacoesExtra.split("\n").filter((l) => l.trim());
  }

  async function salvar(silencioso = false) {
    if (!form.clienteNome) { setErro("Informe o nome do cliente para salvar."); return null; }
    setSalvando(true); setErro(null);
    try {
      const payload = { serviceKey: "spda", cliente: form.clienteNome, status: totalCliente > 0 ? "precificada" : "rascunho", dados: form };
      const res = savedId
        ? await fetch(`/api/propostas/${savedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/propostas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar.");
      const id = data.proposta?.id ?? savedId;
      setSavedId(id);
      if (!silencioso) setStatus("Proposta salva.");
      return id;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar."); return null;
    } finally { setSalvando(false); }
  }

  async function gerar() {
    if (!form.clienteNome) { setErro("Informe o nome do cliente."); return; }
    if (!form.cidadeUf) { setErro("Informe a Cidade/UF."); return; }
    if (valorTotalProjeto <= 0) { setErro("Informe o valor do projeto."); return; }
    setGerando(true); setErro(null);
    try {
      let id = savedId;
      if (!id) { id = (await salvar(true)) ?? undefined; if (!id) return; }
      const formData = {
        clienteNome: form.clienteNome, cidadeUf: form.cidadeUf, localAtividade: form.localAtividade,
        referenciaSeq: form.referenciaSeq, dataEmissao: form.dataEmissao, validadeDias: form.validadeDias, formaPagamento: form.formaPagamento,
        titulo: "PROPOSTA TÉCNICA E COMERCIAL — SPDA E GERENCIAMENTO DE RISCO",
        objeto: form.objeto, prazoExecucao: form.prazoExecucao, itens: montarItens(), observacoes: montarObservacoes(),
      };
      const res = await fetch("/api/gerar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceKey: "spda", formData, propostaId: id }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Falha ao gerar."); }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const m = disp.match(/filename="?([^"]+)"?/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = m ? decodeURIComponent(m[1]) : "spda.docx"; a.click();
      URL.revokeObjectURL(url);
      setStatus("Documento gerado e baixado. Registrado no histórico.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally { setGerando(false); }
  }

  const inputCls = "field-input";
  const sec = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-800";
  const h2 = "text-lg font-semibold text-gta-navy dark:text-slate-100";

  return (
    <div className="space-y-6">
      {erro && <p className="field-error">{erro}</p>}

      {/* Cliente e local */}
      <section className={sec}>
        <h2 className={h2}>Cliente e local</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-3"><label className="field-label">Nome do cliente *</label><input className={inputCls} value={form.clienteNome} onChange={(e) => set("clienteNome", e.target.value)} /></div>
          <div className="sm:col-span-3"><label className="field-label">Cidade/UF *</label><input className={inputCls} value={form.cidadeUf} onChange={(e) => set("cidadeUf", e.target.value)} placeholder="Ex.: Goiânia/GO" /></div>
          <div className="sm:col-span-3"><label className="field-label">Local / obra</label><input className={inputCls} value={form.localAtividade} onChange={(e) => set("localAtividade", e.target.value)} placeholder="Ex.: Campus — Quirinópolis/GO" /></div>
          <div className="sm:col-span-1"><label className="field-label">Validade (dias)</label><input type="number" className={inputCls} value={form.validadeDias} onChange={(e) => set("validadeDias", Number(e.target.value))} /></div>
          <div className="sm:col-span-2"><label className="field-label">Emissão</label><input type="date" className={inputCls} value={form.dataEmissao} onChange={(e) => set("dataEmissao", e.target.value)} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">A referência é gerada automaticamente ao salvar.</p>
      </section>

      {/* Estrutura e área */}
      <section className={sec}>
        <h2 className={h2}>Estrutura e área</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">O preço vem das métricas reais: <strong>risco por bloco</strong> + <strong>projeto por m²</strong>.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2"><label className="field-label">Nº de blocos / estruturas *</label><input type="number" min={1} className={inputCls} value={form.nBlocos} onChange={(e) => set("nBlocos", Math.max(1, Number(e.target.value)))} /></div>
          <div className="sm:col-span-2"><label className="field-label">Área total de cobertura (m²) *</label><input className={inputCls} inputMode="decimal" value={form.areaM2} onChange={(e) => set("areaM2", e.target.value)} placeholder="Ex.: 3.790" /></div>
          <div className="sm:col-span-2"><label className="field-label">Custo logístico estimado (R$)</label><input className={inputCls} inputMode="decimal" value={form.custoLogistico} onChange={(e) => set("custoLogistico", e.target.value)} placeholder="0" /><p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Deslocamento, hospedagem, diárias, terrômetro, estagiário — só para conferir a margem.</p></div>
        </div>

        {preco && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4 dark:bg-slate-900/50">
            <Kpi label={`Risco (${form.nBlocos} × bloco)`} value={brl(preco.risco)} />
            <Kpi label="Projeto (por m²)" value={brl(preco.projetoCalc)} />
            <Kpi label="Faturamento do projeto" value={brl(preco.design)} destaque />
            <Kpi label="Margem líquida" value={`${nf(preco.margem * 100, 1)}%`} destaque />
          </div>
        )}
        {preco?.aplicouPiso && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">⚠ Piso mínimo aplicado: risco + projeto ({brl(preco.risco + preco.projetoCalc)}) ficou abaixo do piso, o valor foi elevado para proteger o custo fixo.</p>
        )}
      </section>

      {/* Preço */}
      <section className={sec}>
        <div className="flex items-center justify-between">
          <h2 className={h2}>Preço</h2>
          {preco && precoTocado.current && (
            <button type="button" className="text-xs text-gta-indigo hover:underline" onClick={() => { precoTocado.current = false; setForm((f) => ({ ...f, valorProjeto: nf(preco.design, 2) })); }}>Usar sugerido {brl(preco.design)}</button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="field-label">Valor do projeto (R$) *</label>
            <input className={inputCls} value={form.valorProjeto} onChange={(e) => { precoTocado.current = true; set("valorProjeto", e.target.value); }} placeholder="Ex.: 21.870,00" />
            {preco ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">risco {brl(riscoItem)} + projeto {brl(projetoItem)} = {brl(valorTotalProjeto)} · margem {nf(margemVal * 100, 0)}%</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Execução (R$, 0 = só projeto)</label>
            <input className={inputCls} value={form.valorExecucao} onChange={(e) => set("valorExecucao", e.target.value)} />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Mão de obra; materiais faturados à parte.</p>
          </div>
          <div className="sm:col-span-2 flex items-end">
            <div className="w-full rounded-md bg-gta-navy p-2 text-white shadow-sm">
              <div className="text-xs text-slate-300">Total ao cliente</div>
              <div className="mt-0.5 text-lg font-bold">{brl(totalCliente)}</div>
            </div>
          </div>
        </div>

        {preco && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Composição do faturamento (uso interno)</p>
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4 dark:bg-slate-900/50">
              <Kpi label="Gerenciamento de risco" value={brl(riscoItem)} />
              <Kpi label="Projeto de SPDA" value={brl(projetoItem)} />
              <Kpi label="Faturamento (projeto)" value={brl(valorTotalProjeto)} destaque />
              <Kpi label={`Impostos (${nf(aliq * 100, 0)}%)`} value={brl(impostosVal)} />
              <Kpi label="Custo logístico" value={brl(preco.custoLogistico)} />
              <Kpi label="Lucro líquido" value={brl(lucroVal)} />
              <Kpi label="Margem líquida" value={`${nf(margemVal * 100, 1)}%`} destaque />
            </div>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Faturamento = risco (por bloco) + projeto (por m²), com piso mínimo. Margem = (faturamento − impostos − custo logístico) / faturamento. Ajuste as taxas em “Parâmetros de preço”.
            </p>
          </div>
        )}
      </section>

      {/* Textos */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">Textos da proposta (opcional)</summary>
        <div className="mt-4 space-y-3">
          <div><label className="field-label">Objeto</label><textarea className={`${inputCls} min-h-[70px]`} value={form.objeto} onChange={(e) => set("objeto", e.target.value)} /></div>
          <div><label className="field-label">Condições gerais (uma por linha)</label><textarea className={`${inputCls} min-h-[90px]`} value={form.observacoesExtra} onChange={(e) => set("observacoesExtra", e.target.value)} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="field-label">Prazo de execução</label><input className={inputCls} value={form.prazoExecucao} onChange={(e) => set("prazoExecucao", e.target.value)} /></div>
            <div><label className="field-label">Forma de pagamento</label><input className={inputCls} value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)} /></div>
          </div>
        </div>
      </details>

      {/* Parâmetros */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">Parâmetros de preço (R$/bloco, R$/m², piso, impostos)</summary>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Faturamento = R$/bloco × nº de blocos + R$/m² × área, respeitando o piso mínimo. Ao salvar, valem para todos os próximos cálculos.</p>
        <div className="mt-4"><SpdaParamsForm onSaved={aplicarParams} /></div>
      </details>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" onClick={() => salvar(false)} disabled={salvando}>{salvando ? "Salvando..." : savedId ? "Salvar alterações" : "Salvar proposta"}</button>
        <button className="btn-primary" onClick={gerar} disabled={gerando || valorTotalProjeto <= 0}>{gerando ? "Gerando..." : "Gerar .docx"}</button>
        <button className="text-sm text-gta-indigo hover:underline" onClick={() => router.push("/propostas")}>Ver propostas</button>
        {status && <span className="text-sm text-green-600 dark:text-green-400">{status}</span>}
      </div>
    </div>
  );
}

function Kpi({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={`rounded-md p-2 shadow-sm ${destaque ? "bg-gta-navy text-white" : "bg-white dark:bg-slate-800"}`}>
      <div className={`text-xs ${destaque ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>{label}</div>
      <div className="mt-0.5 font-semibold dark:text-slate-100">{value}</div>
    </div>
  );
}
