"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CarregadorParamsForm } from "./CarregadorParamsForm";
import { CopyButton } from "@/components/CopyButton";

const nf = (v: number, d = 2) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (v: number) => "R$ " + nf(v, 2);
const parseBR = (s: string) => {
  const t = String(s ?? "").trim();
  if (!t) return 0;
  return t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
};

const HOJE = new Date().toISOString().slice(0, 10);

/** Classes comerciais de carregadores AC (mono ≤ 7,4 kW; tri 11/22 kW). */
const PRESETS: { label: string; kw: string; fase: "mono" | "tri" }[] = [
  { label: "3,7 kW mono", kw: "3.7", fase: "mono" },
  { label: "7,4 kW mono", kw: "7.4", fase: "mono" },
  { label: "11 kW tri", kw: "11", fase: "tri" },
  { label: "22 kW tri", kw: "22", fase: "tri" },
];

interface Form {
  clienteNome: string;
  cidadeUf: string;
  localAtividade: string;
  referenciaSeq: number;
  dataEmissao: string;
  validadeDias: number;
  formaPagamento: string;
  potenciaKw: string;
  fase: "mono" | "tri";
  distanciaM: string;
  qtdPontos: number;
  protecaoCcIntegrada: boolean;
  valorServico: string;
  valorEquipamento: string;
  subtitulo: string;
  objeto: string;
  textoObjetivo: string;
  prazoExecucao: string;
}

const SUBTITULO_PADRAO = "INFRAESTRUTURA PARA CARREGAMENTO DE VEÍCULO ELÉTRICO  ·  NBR 5410 / NBR 17019";
const OBJETO_PADRAO =
  "Implantação de ponto(s) de carregamento para veículos elétricos, contemplando projeto, infraestrutura elétrica, proteções, aterramento, instalação, parametrização e ART, conforme a ABNT NBR 5410.";
const OBJETIVO_PADRAO =
  "A presente proposta tem como objetivo a implantação da infraestrutura elétrica para carregamento de veículo(s) elétrico(s), contemplando o dimensionamento conforme a ABNT NBR 5410 e a NBR 17019, o fornecimento e a instalação dos materiais, as proteções elétricas, o aterramento dedicado e a parametrização do(s) ponto(s) de recarga, com segurança e em conformidade com as normas técnicas vigentes.";

const FORM_INICIAL: Form = {
  clienteNome: "", cidadeUf: "", localAtividade: "", referenciaSeq: 1, dataEmissao: HOJE, validadeDias: 20, formaPagamento: "A combinar",
  potenciaKw: "7.4", fase: "mono", distanciaM: "20", qtdPontos: 1, protecaoCcIntegrada: true,
  valorServico: "", valorEquipamento: "0",
  subtitulo: SUBTITULO_PADRAO, objeto: OBJETO_PADRAO, textoObjetivo: OBJETIVO_PADRAO, prazoExecucao: "15 a 30 dias",
};

interface Sizing {
  tensao: number; correnteNominal: number; correnteProjeto: number; disjuntorA: number;
  polos: number; secaoMm2: number; quedaPct: number; nCondutores: number; nDps: number; eletroduto: string; drTipo: "A" | "B";
}
interface BomItem { categoria: string; descricao: string; unidade: string; qtd: number; precoUnit: number; precoTotal: number }
interface Bom { itens: BomItem[]; custoMateriais: number }
interface Preco { custoMateriais: number; maoObra: number; custoGeral: number; fatorK: number; preco: number; impostos: number; lucro: number; margem: number }

export function CarregadorConfigurator({ propostaId }: { propostaId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(FORM_INICIAL);
  const [sizing, setSizing] = useState<Sizing | null>(null);
  const [bom, setBom] = useState<Bom | null>(null);
  const [preco, setPreco] = useState<Preco | null>(null);
  const [recalcNonce, setRecalcNonce] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(propostaId);
  const precoTocado = useRef(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const aplicarParams = () => { precoTocado.current = false; setRecalcNonce((n) => n + 1); };

  useEffect(() => {
    if (propostaId) {
      fetch(`/api/propostas/${propostaId}`).then((r) => r.json()).then((d) => {
        if (d.proposta?.dados) { setForm({ ...FORM_INICIAL, ...(d.proposta.dados as Partial<Form>) }); precoTocado.current = true; }
      }).catch(() => {});
    } else {
      fetch("/api/propostas/proximo?serviceKey=carregador").then((r) => r.json()).then((d) => {
        if (d.seq) setForm((f) => ({ ...f, referenciaSeq: d.seq }));
      }).catch(() => {});
    }
  }, [propostaId]);

  const calcKey = JSON.stringify([form.potenciaKw, form.fase, form.distanciaM, form.qtdPontos, form.protecaoCcIntegrada, recalcNonce]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (parseBR(form.potenciaKw) <= 0) { setSizing(null); setBom(null); setPreco(null); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/carregador/calcular", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ potenciaKw: parseBR(form.potenciaKw), fase: form.fase, distanciaM: parseBR(form.distanciaM), qtdPontos: form.qtdPontos, protecaoCcIntegrada: form.protecaoCcIntegrada }),
        });
        if (res.ok) {
          const d = await res.json();
          setSizing(d.sizing); setBom(d.bom); setPreco(d.preco);
          if (!precoTocado.current) setForm((f) => ({ ...f, valorServico: nf(d.preco.preco, 2) }));
        }
      } catch { /* ignora */ }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcKey]);

  const totalCliente = parseBR(form.valorServico) + parseBR(form.valorEquipamento);

  function montarMateriais() {
    if (!bom) return [];
    return bom.itens.map((it) => ({ qtde: `${it.qtd} ${it.unidade}`, descricao: it.descricao }));
  }

  async function salvar(silencioso = false) {
    if (!form.clienteNome) { setErro("Informe o nome do cliente para salvar."); return null; }
    setSalvando(true); setErro(null);
    try {
      const payload = { serviceKey: "carregador", cliente: form.clienteNome, status: totalCliente > 0 ? "precificada" : "rascunho", dados: form };
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
    if (!sizing || !bom) { setErro("Informe a potência do carregador para dimensionar."); return; }
    if (!form.clienteNome) { setErro("Informe o nome do cliente."); return; }
    if (!form.cidadeUf) { setErro("Informe a Cidade/UF."); return; }
    if (parseBR(form.valorServico) <= 0) { setErro("Informe o valor do serviço."); return; }
    setGerando(true); setErro(null);
    try {
      let id = savedId;
      if (!id) { id = (await salvar(true)) ?? undefined; if (!id) return; }
      const formData = {
        clienteNome: form.clienteNome, cidadeUf: form.cidadeUf,
        referenciaSeq: form.referenciaSeq, dataEmissao: form.dataEmissao, validadeDias: form.validadeDias, formaPagamento: form.formaPagamento,
        subtitulo: form.subtitulo, objeto: form.objeto, textoObjetivo: form.textoObjetivo,
        potenciaKw: form.potenciaKw, sizing, materiais: montarMateriais(),
        valorServico: form.valorServico, valorEquipamento: form.valorEquipamento,
        prazoExecucao: form.prazoExecucao,
      };
      const res = await fetch("/api/gerar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceKey: "carregador", formData, propostaId: id }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Falha ao gerar."); }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const m = disp.match(/filename="?([^"]+)"?/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = m ? decodeURIComponent(m[1]) : "carregador.docx"; a.click();
      URL.revokeObjectURL(url);
      setStatus("Documento gerado e baixado. Registrado no histórico.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally { setGerando(false); }
  }

  const inputCls = "field-input";
  const sec = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";
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
          <div className="sm:col-span-3"><label className="field-label">Local da instalação</label><input className={inputCls} value={form.localAtividade} onChange={(e) => set("localAtividade", e.target.value)} placeholder="Ex.: Garagem — vaga 12" /></div>
          <div className="sm:col-span-1"><label className="field-label">Validade (dias)</label><input type="number" className={inputCls} value={form.validadeDias} onChange={(e) => set("validadeDias", Number(e.target.value))} /></div>
          <div className="sm:col-span-2"><label className="field-label">Emissão</label><input type="date" className={inputCls} value={form.dataEmissao} onChange={(e) => set("dataEmissao", e.target.value)} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">A referência é gerada automaticamente ao salvar.</p>
      </section>

      {/* Dados do carregador */}
      <section className={sec}>
        <h2 className={h2}>Carregador e infraestrutura</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">O sistema dimensiona a proteção e o cabo (NBR 5410) e monta a lista de materiais.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn-secondary !py-1 text-xs" onClick={() => setForm((f) => ({ ...f, potenciaKw: p.kw, fase: p.fase }))}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2"><label className="field-label">Potência (kW) *</label><input className={inputCls} inputMode="decimal" value={form.potenciaKw} onChange={(e) => set("potenciaKw", e.target.value)} placeholder="Ex.: 7,4 / 11 / 22" /></div>
          <div className="sm:col-span-2">
            <label className="field-label">Alimentação</label>
            <select className={inputCls} value={form.fase} onChange={(e) => set("fase", e.target.value as Form["fase"])}>
              <option value="mono">Monofásico (220 V)</option>
              <option value="tri">Trifásico (380 V)</option>
            </select>
          </div>
          <div className="sm:col-span-1"><label className="field-label">Distância (m)</label><input className={inputCls} inputMode="decimal" value={form.distanciaM} onChange={(e) => set("distanciaM", e.target.value)} /></div>
          <div className="sm:col-span-1"><label className="field-label">Nº de pontos</label><input type="number" className={inputCls} value={form.qtdPontos} onChange={(e) => set("qtdPontos", Number(e.target.value))} /></div>
          <div className="sm:col-span-6">
            <label className="field-label">Proteção diferencial (NBR 17019)</label>
            <select className={inputCls} value={form.protecaoCcIntegrada ? "sim" : "nao"} onChange={(e) => set("protecaoCcIntegrada", e.target.value === "sim")}>
              <option value="sim">Carregador com detecção de 6 mA CC integrada → DR Tipo A</option>
              <option value="nao">Sem detecção integrada → DR Tipo B (obrigatório)</option>
            </select>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">A NBR 17019 proíbe DR Tipo AC. A maioria dos WallBox (WEG, Intelbras, Wallbox) tem detecção de 6 mA CC integrada.</p>
          </div>
        </div>

        {sizing && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4 dark:bg-slate-900/50">
            <Kpi label="Disjuntor" value={`${sizing.disjuntorA} A · ${sizing.polos}P`} destaque />
            <Kpi label="Corrente nominal" value={`${nf(sizing.correnteNominal, 1)} A`} />
            <Kpi label="Corrente de projeto" value={`${nf(sizing.correnteProjeto, 1)} A`} />
            <Kpi label="Condutor" value={`${sizing.nCondutores} × ${sizing.secaoMm2} mm²`} />
            <Kpi label="Eletroduto" value={sizing.eletroduto} />
            <Kpi label="Queda de tensão" value={`${nf(sizing.quedaPct * 100, 2)}%`} />
            <Kpi label="DR (NBR 17019)" value={`Tipo ${sizing.drTipo} · ${sizing.disjuntorA} A`} />
            <Kpi label="DPS" value={`${sizing.nDps} × Classe II`} />
          </div>
        )}
        {!sizing && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">Informe a <strong>potência</strong> para dimensionar.</p>
        )}
      </section>

      {/* Lista de materiais */}
      {bom && (
        <section className={sec}>
          <div className="flex items-center justify-between">
            <h2 className={h2}>Lista de materiais (custo interno)</h2>
            <CopyButton label="Copiar lista" text={() => bom.itens.map((b) => `${b.qtd}\t${b.unidade}\t${b.descricao}`).join("\n")} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Base para cotação. Custo total dos materiais: <strong>{brl(bom.custoMateriais)}</strong>.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 dark:text-slate-400"><tr><th className="py-1">Material</th><th>Qtd</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {bom.itens.map((b, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-1 text-slate-700 dark:text-slate-300">{b.descricao}</td>
                    <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{b.qtd} {b.unidade}</td>
                    <td className="whitespace-nowrap text-right text-slate-600 dark:text-slate-300">{brl(b.precoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Preço */}
      <section className={sec}>
        <div className="flex items-center justify-between">
          <h2 className={h2}>Preço</h2>
          {preco && precoTocado.current && (
            <button type="button" className="text-xs text-gta-indigo hover:underline" onClick={() => { precoTocado.current = false; setForm((f) => ({ ...f, valorServico: nf(preco.preco, 2) })); }}>Usar sugerido {brl(preco.preco)}</button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="field-label">Valor do serviço (R$) *</label>
            <input className={inputCls} value={form.valorServico} onChange={(e) => { precoTocado.current = true; set("valorServico", e.target.value); }} placeholder="Ex.: 5.000,00" />
            {preco ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">custo {brl(preco.custoGeral)} × Fator K {nf(preco.fatorK, 2)} → sugerido {brl(preco.preco)} · margem líq. {nf(preco.margem * 100, 0)}%</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Equipamento / carregador (R$)</label>
            <input className={inputCls} value={form.valorEquipamento} onChange={(e) => set("valorEquipamento", e.target.value)} />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">0 = fornecido pelo cliente.</p>
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
              <Kpi label="Custo materiais" value={brl(preco.custoMateriais)} />
              <Kpi label="Mão de obra" value={brl(preco.maoObra)} />
              <Kpi label="Custo geral" value={brl(preco.custoGeral)} />
              <Kpi label="Fator K (markup)" value={`× ${nf(preco.fatorK, 2)}`} />
              <Kpi label="Faturamento" value={brl(preco.preco)} destaque />
              <Kpi label="Impostos" value={brl(preco.impostos)} />
              <Kpi label="Lucro líquido" value={brl(preco.lucro)} />
              <Kpi label="Margem líquida" value={`${nf(preco.margem * 100, 1)}%`} destaque />
            </div>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Faturamento = custo geral × Fator K. Margem líquida = (faturamento − impostos − custo) / faturamento. Ajuste o Fator K e os impostos em “Parâmetros de preço”.
            </p>
          </div>
        )}
      </section>

      {/* Textos */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">Textos da proposta (opcional)</summary>
        <div className="mt-4 space-y-3">
          <div><label className="field-label">Subtítulo do cabeçalho</label><input className={inputCls} value={form.subtitulo} onChange={(e) => set("subtitulo", e.target.value)} /></div>
          <div><label className="field-label">Objeto</label><textarea className={`${inputCls} min-h-[60px]`} value={form.objeto} onChange={(e) => set("objeto", e.target.value)} /></div>
          <div><label className="field-label">Texto do objetivo</label><textarea className={`${inputCls} min-h-[90px]`} value={form.textoObjetivo} onChange={(e) => set("textoObjetivo", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Prazo de execução</label><input className={inputCls} value={form.prazoExecucao} onChange={(e) => set("prazoExecucao", e.target.value)} /></div>
            <div><label className="field-label">Forma de pagamento</label><input className={inputCls} value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)} /></div>
          </div>
        </div>
      </details>

      {/* Parâmetros */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">Parâmetros de preço (mão de obra, Fator K, impostos)</summary>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Faturamento = (materiais + mão de obra) × Fator K. Padrão GTA: Fator K 1,65 e impostos 7,01% → margem líquida ≈ 30%. Ao salvar, valem para todos os próximos cálculos.</p>
        <div className="mt-4"><CarregadorParamsForm onSaved={aplicarParams} /></div>
      </details>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" onClick={() => salvar(false)} disabled={salvando}>{salvando ? "Salvando..." : savedId ? "Salvar alterações" : "Salvar proposta"}</button>
        <button className="btn-primary" onClick={gerar} disabled={gerando || !sizing || parseBR(form.valorServico) <= 0}>{gerando ? "Gerando..." : "Gerar .docx"}</button>
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
