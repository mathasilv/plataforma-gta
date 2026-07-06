/**
 * Molde do serviço Limpeza de Painéis Solares — a partir da proposta do
 * Residencial Espanha.  node scripts/build-limpeza-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, collapseRows, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Limpeza de placas - Residencial Espanha/Proposta_GTA ResidencialEspanha_LimpezaSolar.docx";
const OUT = path.join(ROOT, "src", "services", "limpeza", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
xml = collapseRows(
  xml,
  "Entrada — no ato da aprovação da proposta, para mobilização da equipe",
  "Após a conclusão do serviço de limpeza de todas as 94 placas nas duas torres",
  [
    ["1ª", "{#pagamentos}{parcela}"],
    ["Entrada — no ato da aprovação da proposta, para mobilização da equipe", "{evento}"],
    ["30%", "{percentual}"],
    ["R$ 690,00", "{valor}{/pagamentos}"],
  ],
);

xml = collapseRows(
  xml,
  "Aprovação da proposta e pagamento da 1ª parcela (30%)",
  "Entrega do relatório fotográfico e 2ª parcela (70%)",
  [
    ["Aprovação da proposta e pagamento da 1ª parcela (30%)", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Condomínio", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "A presente Proposta Técnica e Comercial tem por objeto a prestação do serviço de limpeza de 94 (noventa e quatro) painéis solares fotovoltaicos instalados no telhado das duas torres do Residencial Espanha, em Anápolis/GO.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "O serviço de limpeza abrangerá as 94 placas fotovoltaicas distribuídas nas duas torres do residencial, compreendendo:",
  "{textoAbrangencia}",
);
xml = sub(
  xml,
  "Mão de obra técnica especializada para execução da limpeza de todos os 94 módulos nas duas torres;",
  "{textoMaoObra}",
);
xml = sub(
  xml,
  "O prazo de execução do serviço de limpeza é de 10 (dez) dias corridos, contados a partir da aprovação desta proposta e do recebimento da entrada contratual (30%).",
  "{textoPrazo}",
);
xml = sub(xml, "aprovação prévia pelo Residencial Espanha antes da locação", "aprovação prévia pelo {clienteNome} antes da locação");
xml = sub(xml, "Deslocamento da equipe ao local (Anápolis/GO);", "Deslocamento da equipe ao local ({cidadeUf});");
xml = sub(xml, "Esta proposta tem validade de 30 (trinta) dias corridos", "Esta proposta tem validade de {validadePorExtenso} dias corridos");

// ----- cabeçalho e valores (do mais longo ao mais curto) --------------------
const R = [
  ["LIMPEZA DE PAINÉIS SOLARES FOTOVOLTAICOS  ·  94 PLACAS  ·  DUAS TORRES", "{subtitulo}"],
  ["RESIDENCIAL ESPANHA — ANÁPOLIS/GO", "{clienteTitulo}"],
  ["Telhado das Duas Torres — Residencial Espanha — Anápolis/GO", "{localServico}"],
  ["Limpeza de 94 painéis solares fotovoltaicos — Duas torres — Residencial Espanha", "{descricaoServico}"],
  ["Limpeza de 94 Painéis Solares Fotovoltaicos em Duas Torres", "{objeto}"],
  ["GTA-2026-RESPANHA-SOLAR-001", "{referencia}"],
  ["Goiânia, 16 de junho de 2026", "{dataEmissao}"],
  ["16 de julho de 2026 (30 dias corridos)", "{validade}"],
  ["10 dias corridos a partir da aprovação da proposta", "{prazoExecucao}"],
  ["30% na entrada + 70% após conclusão dos serviços", "{formaPagamento}"],
  ["R$ 2.300,00", "{valorTotal}", 2],
  ["Dois mil e trezentos reais.", "{valorTotalExtenso}"],
  ["10 dias corridos", "{prazoTotal}"],
  ["RESIDENCIAL ESPANHA", "{clienteNomeUpper}"],
  ["Residencial Espanha", "{clienteNome}"],
  ["Anápolis/GO", "{cidadeUf}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

saveDocx(zip, xml, OUT);
