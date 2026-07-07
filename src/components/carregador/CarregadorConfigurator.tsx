"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CarregadorParamsForm } from "./CarregadorParamsForm";

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
  potenciaKw: string;
  fase: "mono" | "tri";
  distanciaM: string;
  qtdPontos: number;
  valorServico: string;
  valorEquipamento: string;
  objeto: string;
  prazoExecucao: string;
  observacoesExtra: string;
}

const OBJETO_PADRAO =
  "Implantação de ponto(s) de carregamento para veículos elétricos, contemplando projeto, infraestrutura elétrica, proteções, aterramento, instalação, parametrização e ART, conforme a ABNT NBR 5410.";
const OBS_PADRAO = [
  "Serviços conforme normas técnicas vigentes (ABNT NBR 5410 e correlatas).",
  "Estudo de demanda pode ser necessário conforme a capacidade da instalação.",
];

const FORM_INICIAL: Form = {
  clienteNome: "", cidadeUf: "", localAtividade: "", referenciaSeq: 1, dataEmissao: HOJE, validadeDias: 20, formaPagamento: "A combinar",
  potenciaKw: "7.4", fase: "mono", distanciaM: "20", qtdPontos: 1,
  valorServico: "", valorEquipamento: "0",
  objeto: OBJETO_PADRAO, prazoExecucao: "15 a 30 dias", observacoesExtra: OBS_PADRAO.join("\n"),
};

interface Sizing {
  tensao: number; correnteNominal: number; correnteProjeto: number; disjuntorA: number;
  polos: number; secaoMm2: number; quedaPct: number; nCondutores: number; nDps: number; eletroduto: string;
}
interface BomItem { categoria: string; descricao: string; unidade: string; qtd: number; precoUnit: number; precoTotal: number }
interface Bom { itens: BomItem[]; custoMateriais: number }
interface Preco { custoMateriais: number; maoObra: number; custoGeral: number; preco: number; margem: number; lucro: number }

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

  const calcKey = JSON.stringify([form.potenciaKw, form.fase, form.distanciaM, form.qtdPontos, recalcNonce]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (parseBR(form.potenciaKw) <= 0) { setSizing(null); setBom(null); setPreco(null); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/carregador/calcular", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ potenciaKw: parseBR(form.potenciaKw), fase: form.fase, distanciaM: parseBR(form.distanciaM), qtdPontos: form.qtdPontos }),
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

  function tituloDoc() {
    return `PROPOSTA TÉCNICA E COMERCIAL — CARREGADOR VEICULAR ELÉTRICO${sizing ? ` ${nf(parseBR(form.potenciaKw), parseBR(form.potenciaKw) % 1 ? 1 : 0)} kW` : ""}`;
  }
  function montarItens() {
    if (!sizing) return null;
    const n = form.qtdPontos;
    const itens = [{
      descricao:
        `Projeto, infraestrutura elétrica, instalação, parametrização e comissionamento de ${n > 1 ? `${n} pontos` : "1 ponto"} de carregamento veicular ` +
        `(${nf(parseBR(form.potenciaKw), parseBR(form.potenciaKw) % 1 ? 1 : 0)} kW, ${form.fase === "mono" ? "monofásico" : "trifásico"}), incluindo materiais, ` +
        `proteções (disjuntor ${sizing.disjuntorA} A, DR Tipo A e DPS), aterramento e ART, conforme a NBR 5410`,
      valor: nf(parseBR(form.valorServico), 2),
      condicao: "50% na contratação e 50% na entrega",
    }];
    if (parseBR(form.valorEquipamento) > 0) {
      itens.push({ descricao: `Fornecimento do(s) carregador(es) — ${n > 1 ? `${n} unidades` : "1 unidade"}`, valor: nf(parseBR(form.valorEquipamento), 2), condicao: "faturamento direto do equipamento" });
    }
    return itens;
  }
  function montarObservacoes() {
    const base = sizing
      ? `Base de dimensionamento (NBR 5410) — Carregador ${nf(parseBR(form.potenciaKw), parseBR(form.potenciaKw) % 1 ? 1 : 0)} kW ${form.fase === "mono" ? "monofásico (220 V)" : "trifásico (380 V)"} · ` +
        `Corrente nominal: ${nf(sizing.correnteNominal, 1)} A · Corrente de projeto: ${nf(sizing.correnteProjeto, 1)} A · ` +
        `Disjuntor: ${sizing.disjuntorA} A curva C (${sizing.polos}P) + DR Tipo A · Condutor: ${sizing.nCondutores} × ${sizing.secaoMm2} mm² (queda ${nf(sizing.quedaPct * 100, 1)}%) em eletroduto ${sizing.eletroduto} · ` +
        `${sizing.nDps} DPS Classe II e aterramento dedicado. Distância considerada: ${nf(parseBR(form.distanciaM), 0)} m.`
      : "";
    return [base, ...form.observacoesExtra.split("\n")].filter((l) => l.trim());
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
    const itens = montarItens();
    if (!itens) { setErro("Informe a potência do carregador para dimensionar."); return; }
    if (!form.clienteNome) { setErro("Informe o nome do cliente."); return; }
    if (!form.cidadeUf) { setErro("Informe a Cidade/UF."); return; }
    if (parseBR(form.valorServico) <= 0) { setErro("Informe o valor do serviço."); return; }
    setGerando(true); setErro(null);
    try {
      let id = savedId;
      if (!id) { id = (await salvar(true)) ?? undefined; if (!id) return; }
      const formData = {
        clienteNome: form.clienteNome, cidadeUf: form.cidadeUf, localAtividade: form.localAtividade,
        referenciaSeq: form.referenciaSeq, dataEmissao: form.dataEmissao, validadeDias: form.validadeDias, formaPagamento: form.formaPagamento,
        titulo: tituloDoc(), objeto: form.objeto, prazoExecucao: form.prazoExecucao, itens, observacoes: montarObservacoes(),
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
        </div>

        {sizing && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4 dark:bg-slate-900/50">
            <Kpi label="Disjuntor" value={`${sizing.disjuntorA} A · ${sizing.polos}P`} destaque />
            <Kpi label="Corrente nominal" value={`${nf(sizing.correnteNominal, 1)} A`} />
            <Kpi label="Corrente de projeto" value={`${nf(sizing.correnteProjeto, 1)} A`} />
            <Kpi label="Condutor" value={`${sizing.nCondutores} × ${sizing.secaoMm2} mm²`} />
            <Kpi label="Eletroduto" value={sizing.eletroduto} />
            <Kpi label="Queda de tensão" value={`${nf(sizing.quedaPct * 100, 2)}%`} />
            <Kpi label="DR" value={`${sizing.disjuntorA} A · ${sizing.polos}P`} />
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
            <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => navigator.clipboard?.writeText(bom.itens.map((b) => `${b.qtd}\t${b.unidade}\t${b.descricao}`).join("\n"))}>Copiar lista</button>
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
            {preco ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">materiais {brl(preco.custoMateriais)} + MO {brl(preco.maoObra)} = custo {brl(preco.custoGeral)} · margem {nf(preco.margem * 100, 0)}% → sugerido {brl(preco.preco)}</p> : null}
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
      </section>

      {/* Textos */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">Textos da proposta (opcional)</summary>
        <div className="mt-4 space-y-3">
          <div><label className="field-label">Objeto</label><textarea className={`${inputCls} min-h-[70px]`} value={form.objeto} onChange={(e) => set("objeto", e.target.value)} /></div>
          <div><label className="field-label">Condições gerais (uma por linha)</label><textarea className={`${inputCls} min-h-[70px]`} value={form.observacoesExtra} onChange={(e) => set("observacoesExtra", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Prazo de execução</label><input className={inputCls} value={form.prazoExecucao} onChange={(e) => set("prazoExecucao", e.target.value)} /></div>
            <div><label className="field-label">Forma de pagamento</label><input className={inputCls} value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)} /></div>
          </div>
        </div>
      </details>

      {/* Parâmetros */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">Parâmetros de preço (mão de obra, margem, Fator K)</summary>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Preço = (materiais × Fator K + mão de obra) / (1 − margem). Ao salvar, valem para todos os próximos cálculos.</p>
        <div className="mt-4"><CarregadorParamsForm onSaved={aplicarParams} /></div>
      </details>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" onClick={() => salvar(false)} disabled={salvando}>{salvando ? "Salvando..." : savedId ? "Salvar alterações" : "Salvar proposta"}</button>
        <button className="btn-primary" onClick={gerar} disabled={gerando || !sizing || parseBR(form.valorServico) <= 0}>{gerando ? "Gerando..." : "Gerar .docx"}</button>
        <button className="text-sm text-gta-indigo hover:underline" onClick={() => router.push("/propostas")}>Ver orçamentos</button>
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
