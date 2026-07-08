"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PAINEIS_COMERCIAIS,
  INVERSORES_COMERCIAIS,
  sugerirInversorComercial,
} from "@/services/solar/commercial";
import { SolarParamsForm } from "@/components/admin/SolarParamsForm";
import { CopyButton } from "@/components/CopyButton";
import { CondicoesPagamento, montarFormaPagamento, COND_PADRAO, type CondPag } from "@/components/CondicoesPagamento";

/** Formatação pt-BR local (sem depender de libs de servidor). */
const nf = (v: number, d = 2) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (v: number) => "R$ " + nf(v, 2);
const pct = (v: number) => nf(v * 100, 2) + "%";
/** kW sem casas desnecessárias: 3.5 -> "3,5" · 10 -> "10" */
const kw = (v: number) => nf(v, Number.isInteger(v) ? 0 : 1);
/** Busca sem acento/caixa. */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

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
  eficiencia: number; // fração (0,75)
  overloadDesejado: number; // fração (0,15)
  nPaineis: number; // 0 = automático (usa a sugestão)
  potenciaInversor: number; // 0 = automático
  qtdInversores: number;
  tipoInversor: "string" | "micro";
  tipoTelhado: string;
  distribuidor: string;
  distribuidorNome: string;
  distribuidorCnpj: string;
  kitItens: string;
  kit: string;
  fator: number;
  viagens: number;
  execucaoCivil: string;
  // economia
  distribuidora: string;
  subgrupo: "B1" | "B2" | "B3";
  tarifaEnergia: string; // R$/kWh
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
  potenciaInversor: 0,
  qtdInversores: 1,
  tipoInversor: "string",
  tipoTelhado: "Metálico",
  distribuidor: "weg",
  distribuidorNome: "",
  distribuidorCnpj: "",
  kitItens: "módulos, inversor, estrutura e cabos",
  kit: "",
  fator: 1.575,
  viagens: 2,
  execucaoCivil: "0",
  distribuidora: "",
  subgrupo: "B1",
  tarifaEnergia: "",
  textoObjetivo:
    "A presente proposta tem como objetivo a implantação de um sistema de microgeração de energia solar fotovoltaica conectada à rede elétrica (On-Grid), proporcionando redução nos custos com energia elétrica através da geração própria de energia limpa e renovável.",
  textoObservacao:
    "Para o pleno funcionamento e atingimento da geração de energia estimada, é necessário que o telhado possua área útil compatível com orientação voltada para o Norte. Caso essas condições não sejam integralmente atendidas, a geração real poderá divergir dos valores previstos na simulação.",
  prazoExecucao: "45 a 60 dias",
};

interface Calc {
  sizing: { consumoMedio: number; hspMedia: number; kwpNecessaria: number; nPlacasSugerido: number; inversorSugerido: number };
  aplicado: { nPaineis: number; potenciaInversor: number; eficiencia: number; overloadDesejado: number };
  inversorSugerido: number;
  kwpTotal: number;
  overload: number;
  geracao: { linhas: { mes: string; insolacao: number; energia: number; consumo: number }[]; totalEnergia: number; totalConsumo: number };
  bom: { qtde: string; descricao: string }[];
  pricing: null | {
    valorTotal: number; servicos: number; margem: number; margemLiquida: number; lucro: number; lucroLiquido: number;
    custos: { instalacao: number; materialCa: number; deslocamento: number; art: number; imposto: number; comissao: number; total: number };
  };
  economia: null | {
    economiaAno1: number; economiaMensalMedia: number; gastoSemSolarAno1: number; gastoComSolarAno1: number;
    paybackAnos: number; paybackMeses: number; economiaPorAno: number[]; saldo: number[]; economiaHorizonte: number;
  };
}

const DISTRIBUIDORES = [
  { value: "weg", label: "WEG" },
  { value: "belenergy", label: "BelEnergy" },
  { value: "outro", label: "Outro distribuidor" },
];

const PASSOS = [
  "Informe o consumo da conta de energia",
  "Confira o dimensionamento sugerido",
  "Copie a lista e cote o kit com o distribuidor",
  "Informe o preço do kit e veja a margem",
  "Salve e gere o .docx",
];

export function SolarConfigurator({ propostaId }: { propostaId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(FORM_INICIAL);
  const [municipios, setMunicipios] = useState<{ nome: string; uf: string }[]>([]);
  const [distribuidoras, setDistribuidoras] = useState<string[]>([]);
  const [calc, setCalc] = useState<Calc | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(propostaId);
  const [painelCustom, setPainelCustom] = useState(false);
  const [invCustom, setInvCustom] = useState(false);
  const [cond, setCond] = useState<CondPag>(COND_PADRAO);
  // campos que o usuário já editou de propósito (a sugestão não sobrescreve)
  const touched = useRef({ nPaineis: false, inversor: false });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // carrega municípios, parâmetros padrão e (se reabrindo) a proposta salva
  useEffect(() => {
    fetch("/api/municipios").then((r) => r.json()).then((d) => setMunicipios(d.municipios ?? [])).catch(() => {});
    fetch("/api/distribuidoras").then((r) => r.json()).then((d) => setDistribuidoras(d.distribuidoras ?? [])).catch(() => {});
    if (propostaId) {
      fetch(`/api/propostas/${propostaId}`).then((r) => r.json()).then((d) => {
        if (d.proposta?.dados) {
          const dados = d.proposta.dados as Partial<Form> & { cond?: CondPag };
          setForm({ ...FORM_INICIAL, ...dados });
          if (dados.cond) setCond(dados.cond as CondPag);
          // valores salvos são escolhas do usuário — não sobrescrever com sugestões
          touched.current = { nPaineis: (dados.nPaineis ?? 0) > 0, inversor: (dados.potenciaInversor ?? 0) > 0 };
          if (dados.potenciaPainel && !PAINEIS_COMERCIAIS.includes(dados.potenciaPainel)) setPainelCustom(true);
          if (dados.potenciaInversor && !INVERSORES_COMERCIAIS.includes(dados.potenciaInversor)) setInvCustom(true);
        }
      }).catch(() => {});
    } else {
      // proposta nova: usa os parâmetros vigentes e o próximo nº de referência
      fetch("/api/solar/config").then((r) => r.json()).then((d) => {
        if (d.params) {
          setForm((f) => ({
            ...f,
            eficiencia: d.params.eficiencia,
            overloadDesejado: d.params.overloadDesejado,
            fator: d.params.fator,
            viagens: d.params.viagens,
          }));
        }
      }).catch(() => {});
      fetch("/api/propostas/proximo?serviceKey=solar").then((r) => r.json()).then((d) => {
        if (d.seq) setForm((f) => ({ ...f, referenciaSeq: d.seq }));
      }).catch(() => {});
    }
  }, [propostaId]);

  // aplica os parâmetros salvos no card de configuração à proposta atual
  function aplicarParams(p: { eficiencia: number; overloadDesejado: number; fator: number; viagens: number }) {
    setForm((f) => ({ ...f, eficiencia: p.eficiencia, overloadDesejado: p.overloadDesejado, fator: p.fator, viagens: p.viagens }));
  }

  // recálculo ao vivo (debounce) — dispara com município + consumo; painéis/inversor são sugeridos
  const temConsumo = form.consumo.some((c) => Number(c) > 0);
  const calcKey = JSON.stringify([
    form.municipio, form.consumo, form.tipoConexao, form.potenciaPainel, form.eficiencia,
    form.overloadDesejado, form.nPaineis, form.potenciaInversor, form.qtdInversores,
    form.tipoInversor, form.tipoTelhado, form.kit, form.fator, form.viagens, form.execucaoCivil,
    form.distribuidora, form.subgrupo, form.tarifaEnergia,
  ]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!form.municipio || !temConsumo) {
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
            viagens: form.viagens,
            execucaoCivil: form.execucaoCivil,
            distribuidora: form.distribuidora,
            subgrupo: form.subgrupo,
            tarifaEnergia: form.tarifaEnergia,
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

  // preenche painéis/inversor com o valor aplicado pelo servidor enquanto o
  // usuário não mexer nesses campos (a sugestão "segue" o consumo)
  useEffect(() => {
    if (!calc) return;
    setForm((f) => {
      const next = { ...f };
      let mudou = false;
      if (!touched.current.nPaineis && calc.aplicado.nPaineis !== f.nPaineis) {
        next.nPaineis = calc.aplicado.nPaineis;
        mudou = true;
      }
      if (!touched.current.inversor && calc.aplicado.potenciaInversor !== f.potenciaInversor) {
        next.potenciaInversor = calc.aplicado.potenciaInversor;
        mudou = true;
      }
      return mudou ? next : f;
    });
  }, [calc]);

  function aplicarSugestao() {
    if (!calc) return;
    const nP = Math.max(1, calc.sizing.nPlacasSugerido);
    const inv = sugerirInversorComercial((nP * form.potenciaPainel) / 1000, form.overloadDesejado);
    touched.current = { nPaineis: false, inversor: false };
    setInvCustom(false);
    setForm((f) => ({ ...f, nPaineis: nP, potenciaInversor: inv, qtdInversores: 1 }));
  }

  const nivelMargem = useMemo(() => {
    const m = calc?.pricing?.margemLiquida ?? 0;
    if (!calc?.pricing) return null;
    if (m >= 0.3) return { cls: "bg-green-100 text-green-800", label: "saudável" };
    if (m >= 0.15) return { cls: "bg-amber-100 text-amber-800", label: "atenção" };
    return { cls: "bg-red-100 text-red-700", label: "baixa" };
  }, [calc?.pricing]);

  const overloadOk = calc ? calc.overload >= 0 && calc.overload <= 0.35 : true;

  // datalist filtrado: só busca com 2+ letras (5.508 opções travam o navegador)
  const sugestoesMunicipio = useMemo(() => {
    const q = normalizar(form.municipio);
    if (q.length < 2) return [];
    return municipios.filter((m) => normalizar(m.nome).includes(q)).slice(0, 50);
  }, [municipios, form.municipio]);

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
      formaPagamento: montarFormaPagamento(cond, calc?.pricing?.valorTotal ?? 0),
      textoObjetivo: form.textoObjetivo,
      potenciaPainel: `${form.potenciaPainel} W`,
      qtdPaineis: `${calc.aplicado.nPaineis} unidades`,
      potenciaTotal: `${nf(calc.kwpTotal, 2)} kWp`,
      potenciaInversor: `${kw(calc.aplicado.potenciaInversor)} kWp`,
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
      // economia/payback (entra no .docx quando calculada)
      economiaMensal: calc.economia ? brl(calc.economia.economiaMensalMedia) : "",
      economiaAno1: calc.economia ? brl(calc.economia.economiaAno1) : "",
      paybackTexto: calc.economia
        ? (calc.economia.paybackAnos <= 25 ? paybackTexto(calc.economia.paybackMeses) : "acima de 25 anos")
        : "",
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
      const payload = { serviceKey: "solar", cliente: form.clienteNome, status: st, dados: { ...form, cond } };
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
      setErro("Preencha o município e o consumo para calcular antes de gerar.");
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
      // Garante um registro no histórico antes de gerar (evita duplicar:
      // o /api/gerar apenas marca este id como "gerada").
      let id = savedId;
      if (!id) {
        id = (await salvar(true)) ?? undefined;
        if (!id) return; // salvar já reportou o erro
      }
      const res = await fetch("/api/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceKey: "solar", formData, propostaId: id }),
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
      setStatus("Documento gerado e baixado. Registrado no histórico.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setGerando(false);
    }
  }

  const inputCls = "field-input";
  const sec = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";
  const h2 = "text-lg font-semibold text-gta-navy dark:text-slate-100";

  const painelSelect = painelCustom ? "outro" : String(form.potenciaPainel);
  const invSelect = invCustom ? "outro" : String(form.potenciaInversor);

  return (
    <div className="space-y-6">
      {/* Passo a passo */}
      <ol className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-gta-navy/5 px-4 py-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {PASSOS.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gta-navy text-[10px] font-bold text-white">{i + 1}</span>
            {p}
          </li>
        ))}
      </ol>

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
            <label className="field-label">Cidade da instalação *</label>
            <input
              className={inputCls}
              list="municipios-list"
              value={form.municipio}
              onChange={(e) => preencherMunicipio(e.target.value)}
              placeholder="Digite 2+ letras e selecione..."
            />
            <datalist id="municipios-list">
              {sugestoesMunicipio.map((m) => (
                <option key={m.nome} value={m.nome} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Usada para buscar a irradiação solar (HSP) da região.</p>
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">Cidade/UF (como sai no documento)</label>
            <input className={inputCls} value={form.cidadeUf} onChange={(e) => set("cidadeUf", e.target.value)} placeholder="Ex.: Goiânia/GO" />
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">Validade (dias)</label>
            <input type="number" className={inputCls} value={form.validadeDias} onChange={(e) => set("validadeDias", Number(e.target.value))} />
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">Emissão</label>
            <input type="date" className={inputCls} value={form.dataEmissao} onChange={(e) => set("dataEmissao", e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          A referência (nº da proposta) é gerada automaticamente ao salvar.
        </p>
      </section>

      {/* 1 · Consumo */}
      <section className={sec}>
        <h2 className={h2}><Passo n={1} /> Consumo mensal (kWh)</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Copie os 12 meses da conta de energia. É a única entrada necessária — o dimensionamento sai daqui.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
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
          <div className="flex items-end sm:col-span-2">
            <button
              type="button"
              className="btn-secondary !py-2 text-xs"
              disabled={!Number(form.consumo[0])}
              onClick={() => set("consumo", Array(12).fill(form.consumo[0]))}
              title="Útil quando o cliente só informa a média mensal"
            >
              Repetir Jan nos 12 meses
            </button>
          </div>
        </div>
      </section>

      {/* 2 · Dimensionamento */}
      <section className={sec}>
        <h2 className={h2}><Passo n={2} /> Dimensionamento</h2>

        {!calc && (
          <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            Preencha a <strong>cidade da instalação</strong> e o <strong>consumo</strong> acima — o
            sistema sugere os painéis e o inversor automaticamente.
          </p>
        )}

        {calc && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gta-navy/20 bg-gta-navy/5 p-4 dark:border-slate-600 dark:bg-slate-900/50">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-gta-navy dark:text-slate-100">Sugestão para este consumo:</span>{" "}
              <strong>{Math.max(1, calc.sizing.nPlacasSugerido)} painéis</strong> de {form.potenciaPainel} Wp
              {" "}(≈ {nf((Math.max(1, calc.sizing.nPlacasSugerido) * form.potenciaPainel) / 1000, 2)} kWp)
              {" "}+ <strong>inversor {kw(sugerirInversorComercial((Math.max(1, calc.sizing.nPlacasSugerido) * form.potenciaPainel) / 1000, form.overloadDesejado))} kW</strong>
              <span className="text-slate-500 dark:text-slate-400"> · necessidade calculada: {nf(calc.sizing.kwpNecessaria, 2)} kWp</span>
            </div>
            <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={aplicarSugestao}>
              Aplicar sugestão
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="field-label">Potência do painel (Wp)</label>
            <div className="flex gap-2">
              <select
                className={inputCls}
                value={painelSelect}
                onChange={(e) => {
                  if (e.target.value === "outro") setPainelCustom(true);
                  else { setPainelCustom(false); set("potenciaPainel", Number(e.target.value)); }
                }}
              >
                {PAINEIS_COMERCIAIS.map((p) => <option key={p} value={p}>{p} Wp</option>)}
                <option value="outro">Outra...</option>
              </select>
              {painelCustom && (
                <input type="number" className={inputCls} value={form.potenciaPainel} onChange={(e) => set("potenciaPainel", Number(e.target.value))} />
              )}
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className="field-label">Nº de painéis</label>
            <input
              type="number"
              className={inputCls}
              value={form.nPaineis || ""}
              placeholder="auto"
              onChange={(e) => { touched.current.nPaineis = true; set("nPaineis", Number(e.target.value)); }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Inversor (kW)</label>
            <div className="flex gap-2">
              <select
                className={inputCls}
                value={invSelect}
                onChange={(e) => {
                  touched.current.inversor = true;
                  if (e.target.value === "outro") setInvCustom(true);
                  else { setInvCustom(false); set("potenciaInversor", Number(e.target.value)); }
                }}
              >
                {!INVERSORES_COMERCIAIS.includes(form.potenciaInversor) && !invCustom && (
                  <option value={String(form.potenciaInversor)}>
                    {form.potenciaInversor === 0 ? "Automático" : `${kw(form.potenciaInversor)} kW`}
                  </option>
                )}
                {INVERSORES_COMERCIAIS.map((p) => <option key={p} value={p}>{kw(p)} kW</option>)}
                <option value="outro">Outro...</option>
              </select>
              {invCustom && (
                <input
                  type="number"
                  step="0.5"
                  className={inputCls}
                  value={form.potenciaInversor}
                  onChange={(e) => { touched.current.inversor = true; set("potenciaInversor", Number(e.target.value)); }}
                />
              )}
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className="field-label">Qtd. inversores</label>
            <input type="number" className={inputCls} value={form.qtdInversores} onChange={(e) => set("qtdInversores", Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Tipo de inversor</label>
            <select className={inputCls} value={form.tipoInversor} onChange={(e) => set("tipoInversor", e.target.value as Form["tipoInversor"])}>
              <option value="string">Inversor (string)</option>
              <option value="micro">Microinversor</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Tipo de telhado</label>
            <select className={inputCls} value={form.tipoTelhado} onChange={(e) => set("tipoTelhado", e.target.value)}>
              {["Metálico", "Colonial", "Fibrocimento", "Laje", "Solo"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {calc && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4 dark:bg-slate-900/50">
            <Kpi label="Potência do sistema" value={`${nf(calc.kwpTotal, 2)} kWp`} destaque />
            <Kpi label="Consumo médio" value={`${nf(calc.sizing.consumoMedio, 0)} kWh/mês`} />
            <Kpi label="HSP média (local)" value={nf(calc.sizing.hspMedia, 2)} />
            <div className={`rounded-md p-2 shadow-sm ${overloadOk ? "bg-white dark:bg-slate-800" : "bg-amber-50 dark:bg-amber-900/30"}`}>
              <div className="text-xs text-slate-500 dark:text-slate-400">Overload do inversor</div>
              <div className={`mt-0.5 font-semibold ${overloadOk ? "text-gta-navy dark:text-slate-100" : "text-amber-700 dark:text-amber-300"}`}>
                {pct(calc.overload)} {overloadOk ? "" : "· verificar"}
              </div>
            </div>
          </div>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 dark:text-slate-400">Ajustes avançados (eficiência e overload)</summary>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="field-label">Eficiência do sistema (%)</label>
              <input
                type="number" step="1" min="30" max="100" className={inputCls}
                value={Math.round(form.eficiencia * 100)}
                onChange={(e) => set("eficiencia", Number(e.target.value) / 100)}
              />
            </div>
            <div>
              <label className="field-label">Overload desejado (%)</label>
              <input
                type="number" step="1" min="0" max="100" className={inputCls}
                value={Math.round(form.overloadDesejado * 100)}
                onChange={(e) => set("overloadDesejado", Number(e.target.value) / 100)}
              />
            </div>
            <p className="col-span-2 self-end text-xs text-slate-400 dark:text-slate-500">
              Padrão vem dos Parâmetros (abaixo) — mude aqui só para esta proposta.
            </p>
          </div>
        </details>
      </section>

      {/* Geração + gráfico */}
      {calc?.geracao && (
        <section className={sec}>
          <h2 className={h2}>Simulação de geração</h2>
          <GraficoGeracao linhas={calc.geracao.linhas} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 dark:text-slate-400">
                <tr><th className="py-1">Mês</th><th>Insolação</th><th>Geração (kWh)</th><th>Consumo (kWh)</th></tr>
              </thead>
              <tbody>
                {calc.geracao.linhas.map((l) => (
                  <tr key={l.mes} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-1">{l.mes}</td>
                    <td>{nf(l.insolacao, 3)}</td>
                    <td className="font-medium text-green-700 dark:text-green-400">{nf(l.energia, 0)}</td>
                    <td className="text-orange-600 dark:text-orange-400">{nf(l.consumo, 0)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 font-semibold dark:border-slate-600">
                  <td className="py-1">Total anual</td><td></td>
                  <td className="text-green-700 dark:text-green-400">{nf(calc.geracao.totalEnergia, 0)}</td>
                  <td className="text-orange-600 dark:text-orange-400">{nf(calc.geracao.totalConsumo, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3 · Materiais genéricos */}
      {calc?.bom && (
        <section className={sec}>
          <div className="flex items-center justify-between">
            <h2 className={h2}><Passo n={3} /> Lista de materiais (para cotar)</h2>
            <CopyButton label="Copiar lista" text={() => calc.bom.map((b) => `${b.qtde}\t${b.descricao}`).join("\n")} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lista genérica (sem marca) para enviar ao distribuidor e obter o preço do kit.</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {calc.bom.map((b, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="w-20 py-1 font-medium text-gta-navy dark:text-slate-100">{b.qtde}</td>
                  <td className="py-1 text-slate-700 dark:text-slate-300">{b.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 4 · Distribuidor e preço */}
      <section className={sec}>
        <h2 className={h2}><Passo n={4} /> Preço e margem</h2>
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
            <label className="field-label">Viagens</label>
            <input type="number" min="0" className={inputCls} value={form.viagens} onChange={(e) => set("viagens", Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Execução civil (R$)</label>
            <input className={inputCls} value={form.execucaoCivil} onChange={(e) => set("execucaoCivil", e.target.value)} />
          </div>
        </div>

        {calc?.pricing && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4 dark:bg-slate-900/50">
            <Kpi label="Valor total" value={brl(calc.pricing.valorTotal)} destaque />
            <Kpi label="Serviços GTA" value={brl(calc.pricing.servicos)} />
            <Kpi label="Lucro (líq.)" value={brl(calc.pricing.lucroLiquido)} />
            <div className="rounded-md bg-white p-2 shadow-sm dark:bg-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Margem líquida</div>
              <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${nivelMargem?.cls}`}>
                {pct(calc.pricing.margemLiquida)} · {nivelMargem?.label}
              </div>
            </div>
            <div className="col-span-2 text-xs text-slate-400 sm:col-span-4 dark:text-slate-500">
              Custos: instalação {brl(calc.pricing.custos.instalacao)} · material CA {brl(calc.pricing.custos.materialCa)} ·
              deslocamento {brl(calc.pricing.custos.deslocamento)} · ART {brl(calc.pricing.custos.art)} ·
              imposto {brl(calc.pricing.custos.imposto)} · comissão {brl(calc.pricing.custos.comissao)}
            </div>
          </div>
        )}
      </section>

      {/* Condições de pagamento (seção compartilhada) */}
      <CondicoesPagamento total={calc?.pricing?.valorTotal ?? 0} value={cond} onChange={setCond} />

      {/* 5 · Economia e retorno */}
      <section className={sec}>
        <h2 className={h2}>Economia e retorno do investimento</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Informe a distribuidora e a tarifa da conta de energia. O Fio B (Lei 14.300) é buscado
          automaticamente. Requer o valor do kit preenchido acima.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label className="field-label">Distribuidora</label>
            <input
              className={inputCls}
              list="distribuidoras-list"
              value={form.distribuidora}
              onChange={(e) => set("distribuidora", e.target.value)}
              placeholder="Ex.: Equatorial GO"
            />
            <datalist id="distribuidoras-list">
              {distribuidoras.map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div className="sm:col-span-1">
            <label className="field-label">Subgrupo</label>
            <select className={inputCls} value={form.subgrupo} onChange={(e) => set("subgrupo", e.target.value as Form["subgrupo"])}>
              <option value="B1">B1 (residencial)</option>
              <option value="B2">B2 (rural)</option>
              <option value="B3">B3 (demais)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Tarifa de energia (R$/kWh)</label>
            <input className={inputCls} value={form.tarifaEnergia} onChange={(e) => set("tarifaEnergia", e.target.value)} placeholder="Ex.: 1,14" />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Valor cheio da conta (com impostos).</p>
          </div>
        </div>

        {calc?.economia ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4 dark:bg-slate-900/50">
              <Kpi label="Economia média/mês" value={brl(calc.economia.economiaMensalMedia)} destaque />
              <Kpi label="Economia no 1º ano" value={brl(calc.economia.economiaAno1)} />
              <div className="rounded-md bg-white p-2 shadow-sm dark:bg-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Payback</div>
                <div className="mt-0.5 font-semibold text-green-700 dark:text-green-400">
                  {calc.economia.paybackAnos <= 25 ? paybackTexto(calc.economia.paybackMeses) : "acima de 25 anos"}
                </div>
              </div>
              <Kpi label="Economia em 25 anos" value={brl(calc.economia.economiaHorizonte)} />
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Considera inflação da tarifa, degradação dos módulos, Fio B progressivo e o consumo simultâneo
              (ajustáveis nos Parâmetros). Gasto atual ≈ {brl(calc.economia.gastoSemSolarAno1 / 12)}/mês → com solar ≈ {brl(calc.economia.gastoComSolarAno1 / 12)}/mês.
            </p>
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            Preencha o <strong>valor do kit</strong>, a <strong>distribuidora</strong> e a <strong>tarifa</strong> para
            ver a economia mensal e o payback.
          </p>
        )}
      </section>

      {/* Parâmetros de preço e dimensionamento (retraído; disponível a todos) */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">
          Parâmetros de preço e dimensionamento
        </summary>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Valores padrão da plataforma (custos, imposto/NF, comissão, fator, eficiência). Ao salvar, valem
          para todos os próximos cálculos.
        </p>
        <div className="mt-4">
          <SolarParamsForm onSaved={aplicarParams} />
        </div>
      </details>

      {/* Textos (edição manual) */}
      <details className={sec}>
        <summary className="cursor-pointer text-sm font-semibold text-gta-navy dark:text-slate-100">Textos da proposta (opcional)</summary>
        <div className="mt-4 space-y-3">
          <div><label className="field-label">Objeto</label><input className={inputCls} value={form.objeto} onChange={(e) => set("objeto", e.target.value)} /></div>
          <div><label className="field-label">Objetivo</label><textarea className={`${inputCls} min-h-[70px]`} value={form.textoObjetivo} onChange={(e) => set("textoObjetivo", e.target.value)} /></div>
          <div><label className="field-label">Observação técnica</label><textarea className={`${inputCls} min-h-[70px]`} value={form.textoObservacao} onChange={(e) => set("textoObservacao", e.target.value)} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="field-label">Prazo de execução</label><input className={inputCls} value={form.prazoExecucao} onChange={(e) => set("prazoExecucao", e.target.value)} /></div>
          </div>
        </div>
      </details>

      {/* 5 · Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" onClick={() => salvar(false)} disabled={salvando}>
          {salvando ? "Salvando..." : savedId ? "Salvar alterações" : "Salvar proposta"}
        </button>
        <button className="btn-primary" onClick={gerar} disabled={gerando || !calc?.pricing} title={!calc?.pricing ? "Informe o valor do kit para gerar" : undefined}>
          {gerando ? "Gerando..." : "Gerar .docx"}
        </button>
        <button className="text-sm text-gta-indigo hover:underline" onClick={() => router.push("/propostas")}>
          Ver propostas
        </button>
        {!calc?.pricing && <span className="text-xs text-slate-400 dark:text-slate-500">Informe o valor do kit para habilitar a geração.</span>}
        {status && <span className="text-sm text-green-600 dark:text-green-400">{status}</span>}
      </div>
    </div>
  );
}

function Passo({ n }: { n: number }) {
  return (
    <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gta-navy align-middle text-xs font-bold text-white">
      {n}
    </span>
  );
}

/** "26" -> "2 anos e 2 meses". */
function paybackTexto(meses: number): string {
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  const pa = anos > 0 ? `${anos} ano${anos > 1 ? "s" : ""}` : "";
  const pm = m > 0 ? `${m} m${m > 1 ? "eses" : "ês"}` : "";
  return [pa, pm].filter(Boolean).join(" e ") || "menos de 1 mês";
}

function Kpi({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={`rounded-md p-2 shadow-sm ${destaque ? "bg-gta-navy text-white" : "bg-white dark:bg-slate-800"}`}>
      <div className={`text-xs ${destaque ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>{label}</div>
      <div className="mt-0.5 font-semibold dark:text-slate-100">{value}</div>
    </div>
  );
}

function GraficoGeracao({ linhas }: { linhas: { mes: string; energia: number; consumo: number }[] }) {
  const max = Math.max(1, ...linhas.map((l) => Math.max(l.energia, l.consumo)));
  const W = 620, H = 180, pad = 24, bw = (W - pad * 2) / linhas.length;
  return (
    <div className="mt-3 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[340px] sm:min-w-[520px]">
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
      <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#1B7A3E]" /> Geração</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#E65100]" /> Consumo</span>
      </div>
    </div>
  );
}
