/**
 * Lista-semente de clientes extraída dos NOMES das pastas da pasta "Serviços"
 * da GTA (um job por pasta). Só nome + cidade/segmento inferidos do próprio nome
 * da pasta — CNPJ/telefone/endereço ficam em branco para completar depois.
 * Usada uma única vez pela ferramenta de importação (/api/clientes/importar),
 * que é idempotente (não recria quem já existe pelo nome).
 */
export type ClienteSeed = {
  nome: string;
  tipoPessoa?: "PF" | "PJ";
  contatoNome?: string;
  cidade?: string;
  uf?: string;
  segmento?: string;
};

export const CLIENTES_SERVICOS: ClienteSeed[] = [
  { nome: "CPMG Itapuranga", tipoPessoa: "PJ", cidade: "Itapuranga", uf: "GO", segmento: "Órgão público" },
  { nome: "Oggi Sorvetes", tipoPessoa: "PJ", contatoNome: "Renan", segmento: "Comercial" },
  { nome: "Loteamento Reserva da Mata", tipoPessoa: "PJ", contatoNome: "Marcelo Bernadeli", segmento: "Construtora" },
  { nome: "Catedral Metropolitana de Goiânia", tipoPessoa: "PJ", cidade: "Goiânia", uf: "GO", segmento: "Outro" },
  { nome: "Karla", tipoPessoa: "PF", segmento: "Residencial" },
  { nome: "Eduardo", tipoPessoa: "PF", segmento: "Residencial" },
  { nome: "Fazenda Rio Doce", tipoPessoa: "PJ", segmento: "Rural" },
  { nome: "Sobreiro (Rede MT)", tipoPessoa: "PJ", segmento: "" },
  { nome: "Souza Agronegócios", tipoPessoa: "PJ", contatoNome: "Marcelo Rodrigues", segmento: "Rural" },
  { nome: "Paróquia Nossa Senhora dos Apóstolos", tipoPessoa: "PJ", segmento: "Outro" },
  { nome: "Privilege Jundiaí", tipoPessoa: "PJ", cidade: "Jundiaí", uf: "SP", segmento: "Comercial" },
  { nome: "BMC – Metrô de Brasília", tipoPessoa: "PJ", cidade: "Brasília", uf: "DF", segmento: "Órgão público" },
  { nome: "FUNEV", tipoPessoa: "PJ", segmento: "Outro" },
  { nome: "Cristal Têxtil", tipoPessoa: "PJ", segmento: "Industrial" },
  { nome: "Capela Nossa Senhora do Loreto", tipoPessoa: "PJ", segmento: "Outro" },
  { nome: "Centro Pastoral Dom Fernando", tipoPessoa: "PJ", segmento: "Outro" },
  { nome: "Condomínio Goianápolis", tipoPessoa: "PJ", contatoNome: "Paulo", cidade: "Goianápolis", uf: "GO", segmento: "Residencial" },
  { nome: "Faculdade Católica de Anápolis", tipoPessoa: "PJ", cidade: "Anápolis", uf: "GO", segmento: "Outro" },
  { nome: "Fazenda Conquista", tipoPessoa: "PJ", segmento: "Rural" },
  { nome: "HESLMB", tipoPessoa: "PJ", segmento: "Outro" },
  { nome: "Francefarma", tipoPessoa: "PJ", segmento: "Industrial" },
  { nome: "Condomínio Vale Verde", tipoPessoa: "PJ", cidade: "Abadiânia", uf: "GO", segmento: "Residencial" },
  { nome: "Residencial J. Alves", tipoPessoa: "PJ", segmento: "Residencial" },
  { nome: "Avenida Parque", tipoPessoa: "PJ", segmento: "Comercial" },
  { nome: "Localiza", tipoPessoa: "PJ", segmento: "Comercial" },
  { nome: "Paróquia Rainha dos Apóstolos", tipoPessoa: "PJ", segmento: "Outro" },
  { nome: "Roger", tipoPessoa: "PF", segmento: "Residencial" },
  { nome: "Santuário Sagrada Família", tipoPessoa: "PJ", segmento: "Outro" },
  { nome: "Valmir Dal Toe", tipoPessoa: "PF", segmento: "Residencial" },
];
