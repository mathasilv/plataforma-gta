/**
 * Molde do serviço Carregador Veicular (EV) — a partir da proposta do
 * Condomínio Av. Parque.  node scripts/build-carregador-ev-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, collapseRows, collapseParas, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/02-26 - Carregadores Avenida Parque/Proposta_GTA_CondAvParque_CarregadorEV.docx";
const OUT = path.join(ROOT, "src", "services", "carregador-ev", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
xml = collapseParas(
  xml,
  "40% no ato da assinatura do contrato — entrada para mobilização e aquisição de materiais (R$ 23.200,00);",
  "20% na entrega final — após comissionamento completo, emissão da ART e aceite do cliente (R$ 11.600,00).",
  [["40% no ato da assinatura do contrato — entrada para mobilização e aquisição de materiais (R$ 23.200,00);", "{linha}"]],
  "pagamentos",
);

xml = collapseRows(
  xml,
  "Aprovação, assinatura do contrato e pagamento da entrada",
  "Comissionamento, testes e entrega do laudo final",
  [
    ["Aprovação, assinatura do contrato e pagamento da entrada", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Condomínio + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "A presente Proposta Técnica e Comercial tem por objeto o fornecimento de materiais, a execução dos serviços de infraestrutura elétrica completa, as adequações civis, elétricas e eletromecânicas, bem como a elaboração do projeto elétrico (diagrama unifilar), emissão de ART, instalação e comissionamento do carregador veicular duplo de 46 kW (2 × 23 kW) no Condomínio Residencial Avenida Parque, em Anápolis/GO.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "Recebimento, posicionamento e fixação física do carregador veicular duplo 46 kW (2 × 23 kW) no local definido;",
  "{textoRecebimento}",
);
xml = sub(
  xml,
  "Testes de funcionamento de cada ponto de carregamento (23 kW) individualmente e em simultâneo;",
  "{textoTestes}",
);
xml = sub(
  xml,
  "O equipamento carregador veicular duplo 46 kW (2 × 23 kW) será adquirido diretamente pelo Condomínio Residencial Avenida Parque junto ao fornecedor do produto, com faturamento direto ao cliente. O valor de R$ 18.250,00 está discriminado nesta proposta exclusivamente para compor o investimento total do projeto, não sendo faturado pela GTA Energia Ltda.",
  "{textoNotaEquipamento}",
);
xml = sub(xml, "Itens Inclusos nos Serviços GTA Energia (R$ 58.000,00)", "Itens Inclusos nos Serviços GTA Energia ({valorGta})");
xml = sub(
  xml,
  "Fornecimento do carregador veicular (aquisição direta pelo cliente — R$ 18.250,00);",
  "Fornecimento do carregador veicular (aquisição direta pelo cliente — {valorEquipamento});",
);
xml = sub(
  xml,
  "GTA Energia — Cinquenta e oito mil reais  |  Equipamento (cliente) — Dezoito mil e duzentos e cinquenta reais  |  Investimento total — Setenta e seis mil e duzentos e cinquenta reais.",
  "{extensoLinha}",
);
xml = sub(xml, "(R$ 58.000,00) serão definidas", "({valorGta}) serão definidas");
xml = sub(xml, "O pagamento do equipamento (R$ 18.250,00) é realizado diretamente", "O pagamento do equipamento ({valorEquipamento}) é realizado diretamente");
xml = sub(xml, "O valor do equipamento (R$ 18.250,00) é informativo", "O valor do equipamento ({valorEquipamento}) é informativo");
xml = sub(xml, "Esta proposta tem validade de 20 (vinte) dias corridos", "Esta proposta tem validade de {validadePorExtenso} dias corridos");
xml = sub(xml, "Deslocamento da equipe técnica ao local (Anápolis/GO);", "Deslocamento da equipe técnica ao local ({cidadeUf});");

// ----- cabeçalho e valores (do mais longo ao mais curto) --------------------
const R = [
  ["INSTALAÇÃO DE CARREGADOR VEICULAR DUPLO 46 kW  ·  INFRAESTRUTURA ELÉTRICA COMPLETA", "{subtitulo}"],
  ["CONDOMÍNIO RESIDENCIAL AVENIDA PARQUE — ANÁPOLIS/GO", "{clienteTitulo}"],
  ["Av. Universitária, 1257 — Vila Santa Isabel — Anápolis/GO", "{endereco}"],
  ["Instalação de Carregador Veicular Duplo 46 kW (2 × 23 kW)", "{objeto}"],
  ["Serviços e materiais — Infraestrutura elétrica completa + Projeto + ART + Instalação + Comissionamento", "{tituloServicos}"],
  ["Carregador veicular duplo 46 kW (2 × 23 kW) — fornecimento do equipamento", "{tituloEquipamento}"],
  ["Condomínio Residencial Avenida Parque", "{clienteNome}"],
  ["GTA-2026-AVPARQUE-EV-001", "{referencia}"],
  ["Goiânia, 26 de maio de 2026", "{dataEmissao}"],
  ["15 de junho de 2026 (20 dias corridos)", "{validade}"],
  ["30 dias corridos após aprovação e assinatura do contrato", "{prazoExecucao}"],
  ["A Combinar", "{formaPagamento}"],
  ["R$ 58.000,00", "{valorGta}", 2],
  ["R$ 18.250,00", "{valorEquipamento}", 2],
  ["R$ 76.250,00", "{valorTotal}"],
  ["30 dias corridos", "{prazoTotal}"],
  ["COND. RES. AVENIDA PARQUE", "{clienteNomeUpper}"],
  ["Anápolis/GO", "{cidadeUf}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

saveDocx(zip, xml, OUT);
