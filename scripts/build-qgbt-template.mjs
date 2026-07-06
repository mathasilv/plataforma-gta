/**
 * Molde do serviço Fornecimento de QGBT — a partir do orçamento da Geolab.
 *   node scripts/build-qgbt-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, collapseRows, collapseParas, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - GEOLAB - QGBT/Orcamento_GTA_Geolab_QGBT.docx";
const OUT = path.join(ROOT, "src", "services", "qgbt", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
xml = collapseRows(
  xml,
  "Tipo de Quadro",
  "Quadro montado, identificado e testado",
  [
    ["QGBT — Quadro Geral de Baixa Tensão", "{valor}{/parametros}"],
    ["Tipo de Quadro", "{#parametros}{parametro}"],
  ],
);

xml = collapseRows(
  xml,
  "ARM 1500X800X600",
  "POLICARBONATO CRISTAL 3MM 0300×1000×2050",
  [
    ["PAINEL ZK2L 1500×800×600 IP55 COMPLETO", "{descricao}"],
    ["ARM 1500X800X600", "{#materiais}{identificacao}"],
    ["ELETROPOLL PAINEIS", "{marca}{/materiais}"],
  ],
);

xml = collapseParas(
  xml,
  "50% no ato da aprovação do orçamento e confirmação do pedido — entrada para aquisição dos materiais (R$ 16.350,00);",
  "50% na entrega do quadro testado e aprovado (R$ 16.350,00).",
  [["50% no ato da aprovação do orçamento e confirmação do pedido — entrada para aquisição dos materiais (R$ 16.350,00);", "{linha}"]],
  "pagamentos",
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "O presente Orçamento tem por objeto o fornecimento do Quadro Geral de Baixa Tensão (QGBT) para instalação trifásica de baixa tensão, conforme especificação técnica de materiais e componentes fornecida pela Geolab Indústria Farmacêutica, destinado à unidade industrial no DAIA, Anápolis/GO.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "O prazo de entrega do QGBT montado, identificado e testado será definido após confirmação do pedido e recebimento da entrada, conforme disponibilidade de componentes no mercado. O prazo estimado é de 15 a 20 dias úteis após a confirmação do pedido.",
  "{textoPrazo}",
);
xml = sub(
  xml,
  "Trinta e dois mil e setecentos reais (sendo R$ 27.795,00 de fornecimento/serviços e R$ 4.905,00 de encargos fiscais).",
  "{valorTotalExtenso}",
);
xml = sub(xml, "Este orçamento tem validade de 20 (vinte) dias corridos", "Este orçamento tem validade de {validadePorExtenso} dias corridos");

// ----- cabeçalho e valores (do mais longo ao mais curto) --------------------
const R = [
  ["QUADRO GERAL DE BAIXA TENSÃO (QGBT)  ·  TRIFÁSICO  ·  CONFORME ESPECIFICAÇÃO DO CLIENTE", "{subtitulo}"],
  ["GEOLAB INDÚSTRIA FARMACÊUTICA — DAIA, ANÁPOLIS/GO", "{clienteTitulo}"],
  ["Via Principal 1, s/n — DAIA, Anápolis/GO — CEP: 75133-590", "{endereco}"],
  ["Fornecimento de QGBT — Baixa Tensão Trifásico — Conforme Especificação", "{objeto}"],
  ["Quadro Painel ZK2L 1.500×800×600 IP55 completo com todos os componentes especificados, montado, identificado e testado em bancada.", "{descricaoFornecimento}"],
  ["GEOLAB INDÚSTRIA FARMACÊUTICA LTDA", "{clienteNome}"],
  ["GTA-2026-GEOLAB-QGBT-001", "{referencia}"],
  ["Goiânia, 09 de junho de 2026", "{dataEmissao}"],
  ["29 de junho de 2026 (20 dias corridos)", "{validade}"],
  ["A Combinar", "{formaPagamento}"],
  ["R$ 27.795,00", "{valorFornecimento}"],
  ["R$ 4.905,00", "{valorEncargos}"],
  ["R$ 32.700,00", "{valorTotal}"],
  ["GEOLAB INDÚSTRIA FARMACÊUTICA", "{clienteNomeUpper}"],
  ["DAIA — Anápolis/GO", "{aceiteLocal}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

saveDocx(zip, xml, OUT);
