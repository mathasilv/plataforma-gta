import { z } from "zod";
import type { ServiceModule } from "../types";
import {
  cronogramaField,
  cronogramaZod,
  identData,
  identFields,
  identZod,
  money,
  naoVazio,
} from "../_shared";
import { capitalize, formatBRL, moneyToWords, numberToWords } from "@/lib/format";

/** Serviço: Instalação de Carregador Veicular (EV) com infraestrutura completa. */

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(20),
  subtitulo: naoVazio("Informe o subtítulo"),
  endereco: naoVazio("Informe o endereço"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: z.string().default("30 dias corridos após aprovação e assinatura do contrato"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoRecebimento: naoVazio("Informe o item de recebimento/fixação"),
  textoTestes: naoVazio("Informe o item de testes"),
  textoNotaEquipamento: naoVazio("Informe a nota do equipamento"),
  tituloServicos: naoVazio("Informe o título da linha de serviços").default(
    "Serviços e materiais — Infraestrutura elétrica completa + Projeto + ART + Instalação + Comissionamento",
  ),
  tituloEquipamento: naoVazio("Informe o título da linha do equipamento"),
  valorGta: naoVazio("Informe o valor GTA"),
  valorEquipamento: naoVazio("Informe o valor do equipamento"),
  pagamentos: z
    .array(z.object({ percentual: z.coerce.number(), texto: z.string() }))
    .min(1)
    .default([
      { percentual: 40, texto: "no ato da assinatura do contrato — entrada para mobilização e aquisição de materiais" },
      { percentual: 40, texto: "após a conclusão da infraestrutura elétrica e civil, antes da instalação do equipamento" },
      { percentual: 20, texto: "na entrega final — após comissionamento completo, emissão da ART e aceite do cliente" },
    ]),
  cronograma: cronogramaZod.default([
    { etapa: "Aprovação, assinatura do contrato e pagamento da entrada", prazo: "Dia D", responsavel: "Cliente + GTA" },
    { etapa: "Elaboração do diagrama unifilar, memorial de cálculo e emissão de ART", prazo: "D + 5", responsavel: "GTA Energia" },
    { etapa: "Aquisição dos materiais elétricos e mobilização da equipe", prazo: "D + 7", responsavel: "GTA Energia" },
    { etapa: "Execução da infraestrutura elétrica e adequações civis", prazo: "D + 7 a D + 20", responsavel: "GTA Energia" },
    { etapa: "Recebimento e instalação do carregador veicular", prazo: "D + 20 a D + 25", responsavel: "GTA + Cliente" },
    { etapa: "Comissionamento, testes e entrega do laudo final", prazo: "D + 25 a D + 30", responsavel: "GTA Energia" },
  ]),
  prazoTotal: z.string().default("30 dias corridos"),
});

type Form = z.infer<typeof zodSchema>;

export const carregadorEvService: ServiceModule = {
  key: "carregador-ev",
  label: "Carregador Veicular (EV)",
  description: "Instalação de carregador veicular com projeto, ART e infraestrutura completa.",
  icon: "🔋",
  referencePrefix: "EV",
  validityDays: 20,
  templateFile: "src/services/carregador-ev/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 20 }),
          { name: "endereco", label: "Endereço", type: "text", required: true, width: "full", placeholder: "Ex.: Av. Universitária, 1257 — Vila Santa Isabel — Anápolis/GO" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "INSTALAÇÃO DE CARREGADOR VEICULAR DUPLO 46 kW  ·  INFRAESTRUTURA ELÉTRICA COMPLETA" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Instalação de Carregador Veicular Duplo 46 kW (2 × 23 kW)" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "half", defaultValue: "30 dias corridos após aprovação e assinatura do contrato" },
        ],
      },
      {
        title: "Equipamento e textos",
        fields: [
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "A presente Proposta Técnica e Comercial tem por objeto o fornecimento de materiais, a execução dos serviços de infraestrutura elétrica completa, as adequações civis, elétricas e eletromecânicas, bem como a elaboração do projeto elétrico (diagrama unifilar), emissão de ART, instalação e comissionamento do carregador veicular no cliente." },
          { name: "textoRecebimento", label: "Item de recebimento/fixação (Seção 2.4)", type: "text", required: true, width: "full", defaultValue: "Recebimento, posicionamento e fixação física do carregador veicular no local definido;" },
          { name: "textoTestes", label: "Item de testes (Seção 2.4)", type: "text", required: true, width: "full", defaultValue: "Testes de funcionamento de cada ponto de carregamento individualmente e em simultâneo;" },
          { name: "textoNotaEquipamento", label: "Nota sobre aquisição do equipamento (Seção 3.2)", type: "textarea", required: true, width: "full", defaultValue: "O equipamento carregador veicular será adquirido diretamente pelo cliente junto ao fornecedor do produto, com faturamento direto ao cliente. O valor está discriminado nesta proposta exclusivamente para compor o investimento total do projeto, não sendo faturado pela GTA Energia Ltda." },
          { name: "tituloEquipamento", label: "Título da linha do equipamento (tabela)", type: "text", required: true, width: "full", defaultValue: "Carregador veicular — fornecimento do equipamento" },
          { name: "tituloServicos", label: "Título da linha de serviços (tabela)", type: "text", required: true, width: "full", defaultValue: "Serviços e materiais — Infraestrutura elétrica completa + Projeto + ART + Instalação + Comissionamento" },
        ],
      },
      {
        title: "Valores e pagamento",
        fields: [
          { name: "valorGta", label: "Valor serviços GTA (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 58.000,00" },
          { name: "valorEquipamento", label: "Valor do equipamento (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 18.250,00" },
          {
            name: "pagamentos", label: "Sugestão de pagamento (% sobre o valor GTA)", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { percentual: 40, texto: "no ato da assinatura do contrato — entrada para mobilização e aquisição de materiais" } },
              { defaults: { percentual: 40, texto: "após a conclusão da infraestrutura elétrica e civil, antes da instalação do equipamento" } },
              { defaults: { percentual: 20, texto: "na entrega final — após comissionamento completo, emissão da ART e aceite do cliente" } },
            ],
            itemFields: [
              { name: "percentual", label: "%", type: "number", width: "third" },
              { name: "texto", label: "Condição", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Prazo e cronograma",
        fields: [
          cronogramaField([
            { etapa: "Aprovação, assinatura do contrato e pagamento da entrada", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Elaboração do diagrama unifilar, memorial de cálculo e emissão de ART", prazo: "D + 5", responsavel: "GTA Energia" },
            { etapa: "Aquisição dos materiais elétricos e mobilização da equipe", prazo: "D + 7", responsavel: "GTA Energia" },
            { etapa: "Execução da infraestrutura elétrica e adequações civis", prazo: "D + 7 a D + 20", responsavel: "GTA Energia" },
            { etapa: "Recebimento e instalação do carregador veicular", prazo: "D + 20 a D + 25", responsavel: "GTA + Cliente" },
            { etapa: "Comissionamento, testes e entrega do laudo final", prazo: "D + 25 a D + 30", responsavel: "GTA Energia" },
          ]),
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "half", defaultValue: "30 dias corridos" },
        ],
      },
    ],
  },
  zodSchema,
  map: (formData) => {
    const form = formData as Form;
    const gta = money(form.valorGta);
    const equip = money(form.valorEquipamento);
    const totalN = gta.n + equip.n;
    return {
      data: {
        ...identData(form, "EV"),
        subtitulo: form.subtitulo,
        clienteTitulo: `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
        endereco: form.endereco,
        objeto: form.objeto,
        prazoExecucao: form.prazoExecucao,
        textoObjeto: form.textoObjeto,
        textoRecebimento: form.textoRecebimento,
        textoTestes: form.textoTestes,
        textoNotaEquipamento: form.textoNotaEquipamento,
        tituloServicos: form.tituloServicos,
        tituloEquipamento: form.tituloEquipamento,
        valorGta: gta.fmt,
        valorEquipamento: equip.fmt,
        valorTotal: formatBRL(totalN),
        extensoLinha: `GTA Energia — ${capitalize(moneyToWords(gta.n))}  |  Equipamento (cliente) — ${capitalize(moneyToWords(equip.n))}  |  Investimento total — ${capitalize(moneyToWords(totalN))}.`,
        pagamentos: form.pagamentos.map((p, i) => ({
          linha: `${p.percentual}% ${p.texto} (${formatBRL((gta.n * p.percentual) / 100)})${i === form.pagamentos.length - 1 ? "." : ";"}`,
        })),
        cronograma: form.cronograma,
        prazoTotal: form.prazoTotal,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};
