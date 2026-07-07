"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Formatação pt-BR local (sem depender de libs de servidor). */
const nf = (v: number, d = 2) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (v: number) => "R$ " + nf(v, 2);
const pct = (v: number) => nf(v * 100, 2) + "%";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface Form {
  clienteNome: string;
  municipio: string; // "GOIANIA - GO" (p/ HSP)
  cidadeUf: string; // "Goiânia/GO" (documento)
  objeto: string;
  subtitulo: string;
  referenciaSeq: number;
  dataEmissao: string;
  validadeDias: number;
  formaPagamento: string;
  consumo: string[]; // 12
  tipoConexao: "mono" | "bi" | "tri";
  potenciaPainel: number;
  eficiencia: number;
  overloadDesejado: number;
  nPaineis: number;
  potenciaInversor: number;
  qtdInversores: number;
  tipoInversor: "string" | "micro";
  tipoTelhado: string;
  distribuidor: string;
  distribuidorNome: string;
  distribuidorCnpj: string;
  kitItens: string;
  kit: string;
  fator: number;
  execucaoCivil: string;
  textoObjetivo: string;
  textoObservacao: string;
  prazoExecucao: string;
}

const HOJE = new Date().toISOString().slice(0, 10);

const FORM_INICIAL: Form = {
  clienteNome: "",
  municipio: "",
  cidadeUf: "",
  objeto: "Implantação de Sistema de Microgeração Solar Fotovoltaica On-Grid",
  subtitulo: "SISTEMA FOTOVOLTAICO CONECTADO À REDE  ·  MICROGERAÇÃO SOLAR ON-GRID",
  referenciaSeq: 1,
  dataEmissao: HOJE,
  validadeDias: 20,
  formaPagamento: "A combinar",
  consumo: Array(12).fill(""),
  tipoConexao: "tri",
  potenciaPainel: 700,
  eficiencia: 0.75,
  overloadDesejado: 0.15,
  nPaineis: 0,
  potenciaInversor: 5,
  qtdInversores: 1,
  tipoInversor: "string",
  tipoTelhado: "Metálico",
  distribuidor: "weg",
  distribuidorNome: "",
  distribuidorCnpj: "",
  kitItens: "módulos, inversor, estrutura e cabos",
  kit: "",
  fator: 1.5,
  execucaoCivil: "0",
  textoObjetivo:
    "A presente proposta tem como objetivo a implantação de um sistema de microgeração de energia solar fotovoltaica conectada à rede elétrica (On-Grid), proporcionando redução nos custos com energia elétrica através da geração própria de energia limpa e renovável.",
  textoObservacao:
    "Para o pleno funcionamento e atingimento da geração de energia estimada, é necessário que o telhado possua área útil compatível com orientação voltada para o Norte. Caso essas condições não sejam integralmente atendidas, a geração real poderá divergir dos valores previstos na simulação.",
  prazoExecucao: "45 a 60 dias",
};

interface Calc {
  sizing: { consumoMedio: number; hspMedia: number; kwpNecessaria: number; nPlacasSugerido: number; inversorSugerido: number };
  kwpTotal: number;
  overload: number;
  geracao: { linhas: { mes: string; insolacao: number; energia: number; consumo: number }[]; totalEnergia: number; totalConsumo: number };
  bom: { qtde: string; descricao: string }[];
  pricing: null | {
    valorTotal: number; servicos: number; margem: number; margemLiquida: number; lucro: number; lucroLiquido: number;
    custos: { instalacao: number; materialCa: number; deslocamento: number; art: number; imposto: number; comissao: number; total: number };
  };
}

const DISTRIBUIDORES = [
  { value: "weg", label: "WEG" },
  { value: "belenergy", label: "BelEnergy" },
  { value: "outro", label: "Outro distribuidor" },
];

export function SolarConfigurator({ propostaId }: { propostaId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(FORM_INICIAL);
  const [municipios, setMunicipios] = useState<{ nome: string; uf: string }[]>([]);
  const [calc, setCalc] = useState<Calc | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(propostaId);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // carrega municípios e (se reabrindo) a proposta salva
  useEffect(() => {
    fetch("/api/municipios").then((r) => r.json()).then((d) => setMunicipios(d.municipios ?? [])).catch(() => {});
    if (propostaId) {
      fetch(`/api/propostas/${propostaId}`).then((r) => r.json()).then((d) => {
        if (d.proposta?.dados) setForm({ ...FORM_INICIAL, ...(d.proposta.dados as Partial<Form>) });
      }).catch(() => {});
    }
  }, [propostaId]);

  // recálculo ao vivo (debounce) quando os dados relevantes mudam
  const calcKey = JSON.stringify([
    form.municipio, form.consumo, form.tipoConexao, form.potenciaPainel, form.eficiencia,
    form.overloadDesejado, form.nPaineis, form.potenciaInversor, form.qtdInversores,
    form.tipoInversor, form.tipoTelhado, form.kit, form.fator, form.execucaoCivil,
  ]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!form.municipio || !form.nPaineis) {
      setCalc(null);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/solar/calcular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            municipio: form.municipio,
            consumo: form.consumo.map((c) => c || 0),
            tipoConexao: form.tipoConexao,
            potenciaPainel: form.potenciaPainel,
            eficiencia: form.eficiencia,
            overloadDesejado: form.overloadDesejado,
            nPaineis: form.nPaineis,
            potenciaInversor: form.potenciaInversor,
            qtdInversores: form.qtdInversores,
            tipoInversor: form.tipoInversor,
            tipoTelhado: form.tipoTelhado,
            kit: form.kit,
            fator: form.fator,
            execucaoCivil: form.execucaoCivil,
          }),
        });
        if (res.ok) setCalc(await res.json());
      } catch {
        /* ignora erro de cálculo transitório */
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcKey]);

  // sugere nº de painéis quando o cálculo muda e o campo está zerado
  useEffect(() => {
    if (calc?.sizing?.nPlacasSugerido && form.nPaineis === 0) {
      set("nPaineis", calc.sizing.nPlacasSugerido);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc?.sizing?.nPlacasSugerido]);

  const nivelMargem = useMemo(() => {
    const m = calc?.pricing?.margemLiquida ?? 0;
    if (!calc?.pricing) return null;
    if (m >= 0.3) return { cls: "bg-green-100 text-green-800", label: "saudável" };
    if (m >= 0.15) return { cls: "bg-amber-100 text-amber-800", label: "atenção" };
    return { cls: "bg-red-100 text-red-700", label: "baixa" };
  }, [calc?.pricing]);

  function preencherMunicipio(nome: string) {
    set("municipio", nome);
    // sugere cidadeUf a partir do município (usuário pode ajustar acentuação)
    if (!form.cidadeUf && nome.includes(" - ")) {
      const [cid, uf] = nome.split(" - ");
      const cap = cid.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      set("cidadeUf", `${cap}/${uf}`);
    }
  }

  /** Monta o formData no formato que o /api/gerar (serviço solar) já espera. */
  function montarFormData() {
    if (!calc) return null;
    return {
      clienteNome: form.clienteNome,
      cidadeUf: form.cidadeUf,
      objeto: form.objeto,
      subtitulo: form.subtitulo,
      referenciaSeq: form.referenciaSeq,
      dataEmissao: form.dataEmissao,
      validadeDias: form.validadeDias,
      formaPagamento: form.formaPagamento,
      textoObjetivo: form.textoObjetivo,
      potenciaPainel: `${form.potenciaPainel} W`,
      qtdPaineis: `${form.nPaineis} unidades`,
      potenciaTotal: `${nf(calc.kwpTotal, 2)} kWp`,
      potenciaInversor: `${nf(form.potenciaInversor, 0)} kWp`,
      overload: pct(calc.overload),
      qtdInversores: `${form.qtdInversores} ${form.qtdInversores > 1 ? "unidades" : "unidade"}`,
      tipoInversor: form.tipoInversor === "micro" ? "microinversor" : "inversor",
      simulacao: calc.geracao.linhas.map((l) => ({
        mes: l.mes,
        insolacao: nf(l.insolacao, 3),
        energia: nf(l.energia, 2),
        consumo: nf(l.consumo, 2),
      })),
      textoObservacao: form.textoObservacao,
      materiais: calc.bom.map((b) => ({ qtde: b.qtde, descricao: b.descricao })),
      distribuidor: form.distribuidor,
      distribuidorNome: form.distribuidorNome,
      distribuidorCnpj: form.distribuidorCnpj,
      kitItens: form.kitItens,
      valorKit: form.kit,
      valorGta: calc.pricing ? nf(calc.pricing.servicos, 2) : "0",
      prazoExecucao: form.prazoExecucao,
    };
  }

  async function salvar(silencioso = false) {
    if (!form.clienteNome) {
      setErro("Informe o nome do cliente para salvar.");
      return null;
    }
    setSalvando(true);
    setErro(null);
    try {
      const st = calc?.pricing ? "precificada" : "rascunho";
      const payload = { serviceKey: "solar", cliente: form.clienteNome, status: st, dados: form };
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
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      return null;
    } finally {
      setSalvando(false);
    }
  }

  async function gerar() {
    const formData = montarFormData();
    if (!formData) {
      setErro("Preencha o município e o nº de painéis para gerar.");
      return;
    }
    if (!form.clienteNome) {
      setErro("Informe o nome do cliente.");
      return;
    }
    if (!form.cidadeUf) {
      setErro("Informe a Cidade/UF do documento.");
      return;
    }
    if (!form.kit || !calc?.pricing) {
      setErro("Informe o valor do kit (cotação) antes de gerar o documento.");
      return;
    }
    setGerando(true);
    setErro(null);
    try {
      const res = await fetch("/api/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: "solar", formData }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Falha ao gerar.");
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const m = disp.match(/filename="?([^"]+)"?/);
      const filename = m ? decodeURIComponent(m[1]) : "proposta-solar.docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Documento gerado e baixado.");
      await salvar(true); // marca como salva/atualizada
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setGerando(false);
    }
  }

  const inputCls = "field-input";
  const sec = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
  const h2 = "text-lg font-semibold text-gta-navy";

  return (
    <div className="space-y-6">
      {erro && <p className="field-error">{erro}</p>}

      {/* Identificação */}
      <section className={sec}>
        <h2 className={h2}>Cliente e local</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label className="field-label">Nome do cliente *</label>
            <input className={inputCls} value={form.clienteNome} onChange={(e) => set("clienteNome", e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">Município (para a irradiação) *</label>
            <input
              className={inputCls}
              list="municipios-list"
              value={form.municipio}
              onChange={(e) => preencherMunicipio(e.target.value)}
              placeholder="Digite e selecione..."
            />
            <datalist id="municipios-list">
              {municipios.map((m) => (
                <option key={m.nome} value={m.nome} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">Cidade/UF (documento)</label>
            <input className={inputCls} value={form.cidadeUf} onChange={(e) => set("cidadeUf", e.target.value)} placeholder="Ex.: Goiânia/GO" />
          </div>
          <div className="sm:col-span-1">
            <label className="field-label">Nº ref.</label>
            <input type="number" className={inputCls} value={form.referenciaSeq} onChange={(e) => set("referenciaSeq", Number(e.target.value))} />
          </div>
          <div className="sm:col-span-1">
            <label className="field-label">Validade (dias)</label>
            <input type="number" className={inputCls} value={form.validadeDias} onChange={(e) => set("validadeDias", Number(e.target.value))} />
          </div>
          <div className="sm:col-span-1">
            <label className="field-label">Emissão</label>
            <input type="date" className={inputCls} value={form.dataEmissao} onChange={(e) => set("dataEmissao", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Consumo */}
      <section className={sec}>
        <h2 className={h2}>Consumo mensal (kWh)</h2>
        <p className="mt-1 text-sm text-slate-500">Informe os 12 meses da conta de energia. O sistema dimensiona automaticamente.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          {MESES.map((mes, i) => (
            <div key={mes}>
              <label className="field-label">{mes.slice(0, 3)}</label>
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.consumo[i]}
                onChange={(e) => set("consumo", form.consumo.map((c, j) => (j === i ? e.target.value : c)))}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="field-label">Tipo de conexão</label>
            <select className={inputCls} value={form.tipoConexao} onChange={(e) => set("tipoConexao", e.target.value as Form["tipoConexao"])}>
              <option value="mono">Monofásico</option>
              <option value="bi">Bifásico</option>
              <option value="tri">Trifásico</option>
            </select>
          </div>
        </div>
      </section>

      {/* Dimensionamento */}
      <section className={sec}>
        <h2 className={h2}>Dimensionamento</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div><label className="field-label">Potência do painel (W)</label><input type="number" className={inputCls} value={form.potenciaPainel} onChange={(e) => set("potenciaPainel", Number(e.target.value))} /></div>
          <div><label className="field-label">Eficiência</label><input type="number" step="0.01" className={inputCls} value={form.eficiencia} onChange={(e) => set("eficiencia", Number(e.target.value))} /></div>
          <div><label className="field-label">Overload desejado</label><input type="number" step="0.01" className={inputCls} value={form.overloadDesejado} onChange={(e) => set("overloadDesejado", Number(e.target.value))} /></div>
          <div className="sm:col-span-2">
            <label className="field-label">Nº de painéis (comercial)</label>
            <div className="flex gap-2">
              <input type="number" className={inputCls} value={form.nPaineis} onChange={(e) => set("nPaineis", Number(e.target.value))} />
              {calc?.sizing?.nPlacasSugerido ? (
                <button type="button" className="btn-secondary whitespace-nowrap !px-2 text-xs" onClick={() => set("nPaineis", calc.sizing.nPlacasSugerido)}>
                  usar {calc.sizing.nPlacasSugerido}
                </button>
              ) : null}
            </div>
          </div>
          <div><label className="field-label">Potência inversor (kW)</label><input type="number" className={inputCls} value={form.potenciaInversor} onChange={(e) => set("potenciaInversor", Number(e.target.value))} /></div>
          <div><label className="field-label">Qtd. inversores</label><input type="number" className={inputCls} value={form.qtdInversores} onChange={(e) => set("qtdInversores", Number(e.target.value))} /></div>
          <div>
            <label className="field-label">Tipo</label>
            <select className={inputCls} value={form.tipoInversor} onChange={(e) => set("tipoInversor", e.target.value as Form["tipoInversor"])}>
              <option value="string">Inversor</option>
              <option value="micro">Microinversor</option>
            </select>
          </div>
          <div><label className="field-label">Tipo de telhado</label><input className={inputCls} value={form.tipoTelhado} onChange={(e) => set("tipoTelhado", e.target.value)} /></div>
        </div>

        {calc?.sizing && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4">
            <Kpi label="kWp necessária" value={`${nf(calc.sizing.kwpNecessaria, 2)} kWp`} />
            <Kpi label="Placas sugeridas" value={String(calc.sizing.nPlacasSugerido)} />
            <Kpi label="Inversor sugerido" value={`${nf(calc.sizing.inversorSugerido, 2)} kW`} />
            <Kpi label="Potência total" value={`${nf(calc.kwpTotal, 2)} kWp`} destaque />
          </div>
        )}
      </section>

      {/* Geração + gráfico */}
      {calc?.geracao && (
        <section className={sec}>
          <h2 className={h2}>Simulação de geração</h2>
          <GraficoGeracao linhas={calc.geracao.linhas} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th className="py-1">Mês</th><th>Insolação</th><th>Geração (kWh)</th><th>Consumo (kWh)</th></tr>
              </thead>
              <tbody>
                {calc.geracao.linhas.map((l) => (
                  <tr key={l.mes} className="border-t border-slate-100">
                    <td className="py-1">{l.mes}</td>
                    <td>{nf(l.insolacao, 3)}</td>
                    <td className="font-medium text-green-700">{nf(l.energia, 0)}</td>
                    <td className="text-orange-600">{nf(l.consumo, 0)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 font-semibold">
                  <td className="py-1">Total anual</td><td></td>
                  <td className="text-green-700">{nf(calc.geracao.totalEnergia, 0)}</td>
                  <td className="text-orange-600">{nf(calc.geracao.totalConsumo, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Materiais genéricos */}
      {calc?.bom && (
        <section className={sec}>
          <div className="flex items-center justify-between">
            <h2 className={h2}>Lista de materiais (para cotar)</h2>
            <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => navigator.clipboard?.writeText(calc.bom.map((b) => `${b.qtde}\t${b.descricao}`).join("\n"))}>
              Copiar lista
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500">Lista genérica (sem marca) para enviar ao distribuidor e obter o preço do kit.</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {calc.bom.map((b, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="w-20 py-1 font-medium text-gta-navy">{b.qtde}</td>
                  <td className="py-1 text-slate-700">{b.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Distribuidor e preço */}
      <section className={sec}>
        <h2 className={h2}>Distribuidor e preço</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="field-label">Distribuidor</label>
            <select className={inputCls} value={form.distribuidor} onChange={(e) => set("distribuidor", e.target.value)}>
              {DISTRIBUIDORES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Valor do kit (cotação) *</label>
            <input className={inputCls} value={form.kit} onChange={(e) => set("kit", e.target.value)} placeholder="Ex.: 18.400,27" />
          </div>
          <div>
            <label className="field-label">Fator</label>
            <input type="number" step="0.05" className={inputCls} value={form.fator} onChange={(e) => set("fator", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Execução civil (R$)</label>
            <input className={inputCls} value={form.execucaoCivil} onChange={(e) => set("execucaoCivil", e.target.value)} />
          </div>
        </div>

        {calc?.pricing && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4">
            <Kpi label="Valor total" value={brl(calc.pricing.valorTotal)} destaque />
            <Kpi label="Serviços GTA" value={brl(calc.pricing.servicos)} />
            <Kpi label="Lucro (líq.)" value={brl(calc.pricing.lucroLiquido)} />
            <div className="rounded-md bg-white p-2 shadow-sm">
              <div className="text-xs text-slate-500">Margem líquida</div>
              <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${nivelMargem?.cls}`}>
                {pct(calc.pricing.margemLiquida)} · {nivelMargem?.label}
              </div>
            </div>
            <div className="col-span-2 text-xs text-slate-400 sm:col-span-4">
              Custos: instalação {brl(calc.pricing.custos.instalacao)} · material CA {brl(calc.pricing.custos.materialCa)} ·
              deslocamento {brl(calc.pricing.custos.deslocamento)} · ART {brl(calc.pricing.custos.art)} ·
              imposto {brl(calc.pricing.custos.imposto)} · comissão {brl(calc.pricing.custos.comissao)}
            </div>
          </div>
        )}
      </section>

      {/* Textos (edição manual) */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy">Textos da proposta (opcional)</summary>
        <div className="mt-4 space-y-3">
          <div><label className="field-label">Objeto</label><input className={inputCls} value={form.objeto} onChange={(e) => set("objeto", e.target.value)} /></div>
          <div><label className="field-label">Objetivo</label><textarea className={`${inputCls} min-h-[70px]`} value={form.textoObjetivo} onChange={(e) => set("textoObjetivo", e.target.value)} /></div>
          <div><label className="field-label">Observação técnica</label><textarea className={`${inputCls} min-h-[70px]`} value={form.textoObservacao} onChange={(e) => set("textoObservacao", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">Prazo de execução</label><input className={inputCls} value={form.prazoExecucao} onChange={(e) => set("prazoExecucao", e.target.value)} /></div>
            <div><label className="field-label">Forma de pagamento</label><input className={inputCls} value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)} /></div>
          </div>
        </div>
      </details>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" onClick={() => salvar(false)} disabled={salvando}>
          {salvando ? "Salvando..." : savedId ? "Salvar alterações" : "Salvar proposta"}
        </button>
        <button className="btn-primary" onClick={gerar} disabled={gerando || !calc?.pricing} title={!calc?.pricing ? "Informe o valor do kit para gerar" : undefined}>
          {gerando ? "Gerando..." : "Gerar .docx"}
        </button>
        <button className="text-sm text-gta-indigo hover:underline" onClick={() => router.push("/propostas")}>
          Ver propostas salvas
        </button>
        {!calc?.pricing && <span className="text-xs text-slate-400">Informe o valor do kit para habilitar a geração.</span>}
        {status && <span className="text-sm text-green-600">{status}</span>}
      </div>
    </div>
  );
}

function Kpi({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={`rounded-md p-2 shadow-sm ${destaque ? "bg-gta-navy text-white" : "bg-white"}`}>
      <div className={`text-xs ${destaque ? "text-slate-300" : "text-slate-500"}`}>{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}

function GraficoGeracao({ linhas }: { linhas: { mes: string; energia: number; consumo: number }[] }) {
  const max = Math.max(1, ...linhas.map((l) => Math.max(l.energia, l.consumo)));
  const W = 620, H = 180, pad = 24, bw = (W - pad * 2) / linhas.length;
  return (
    <div className="mt-3 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]">
        {linhas.map((l, i) => {
          const x = pad + i * bw;
          const hg = ((H - pad * 2) * l.energia) / max;
          const hc = ((H - pad * 2) * l.consumo) / max;
          return (
            <g key={i}>
              <rect x={x + bw * 0.15} y={H - pad - hg} width={bw * 0.32} height={hg} fill="#1B7A3E" />
              <rect x={x + bw * 0.53} y={H - pad - hc} width={bw * 0.32} height={hc} fill="#E65100" />
              <text x={x + bw / 2} y={H - pad + 12} textAnchor="middle" fontSize="8" fill="#64748b">{l.mes.slice(0, 3)}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#1B7A3E]" /> Geração</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#E65100]" /> Consumo</span>
      </div>
    </div>
  );
}
