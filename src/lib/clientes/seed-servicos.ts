/**
 * Lista-semente de clientes extraída da pasta "Serviços" da GTA (um job por
 * pasta): nomes/cidade/segmento vieram dos NOMES das pastas; o restante veio
 * de dentro dos arquivos (contratos, faturas, ARTs, formulários de conexão).
 *
 * IMPORTANTE (repositório público no GitHub): este arquivo só guarda dado de
 * REGISTRO PÚBLICO de empresas/instituições (CNPJ, endereço comercial) — NUNCA
 * CPF, telefone/e-mail pessoal, nome de contato individual ou endereço
 * residencial/de propriedade de pessoa física. Quando o cliente é pessoa
 * física (ou o contato encontrado era um indivíduo dentro de uma empresa),
 * só entra cidade/UF (granularidade que já era usada em todo o cadastro) e
 * uma observação sem nomear ninguém. Alguns campos foram deixados vazios de
 * propósito quando os documentos da própria pasta se CONTRADIZIAM (ex.:
 * Fazenda Rio Doce) — nesses casos a incerteza vai só em observacoesExtra.
 *
 * Usada por duas rotas (ambas idempotentes, sem risco de duplicar):
 * - POST /api/clientes/importar   — cria só quem ainda não existe (nome).
 * - POST /api/clientes/atualizar  — cria quem não existe + PREENCHE só os
 *   campos que estiverem VAZIOS nos já cadastrados (nunca sobrescreve nome,
 *   segmento, contato etc. já preenchidos manualmente). `observacoesExtra` é
 *   sempre ANEXADO ao campo observações existente (é um log, não um fato).
 */
export type ClienteSeed = {
  nome: string;
  tipoPessoa?: "PF" | "PJ";
  documento?: string;
  contatoNome?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  segmento?: string;
  /** Anexado ao campo observações existente (não sobrescreve). */
  observacoesExtra?: string;
};

export const CLIENTES_SERVICOS: ClienteSeed[] = [
  {
    nome: "CPMG Itapuranga",
    tipoPessoa: "PJ",
    cidade: "Itapuranga",
    uf: "GO",
    segmento: "Órgão público",
    documento: "31.494.547/0001-14",
    cep: "76680-000",
    logradouro: "Rua 48",
    numero: "80",
    bairro: "Centro",
    observacoesExtra:
      "Contrato de projeto elétrico (subestação MT/BT + reforma predial) assinado em 23/01/2026. Contratante formal: APMF (Associação de Pais, Mestres e Funcionários) do CEPMG Dep. José Alves de Assis.",
  },
  {
    nome: "Oggi Sorvetes",
    tipoPessoa: "PJ",
    contatoNome: "Renan",
    segmento: "Comercial",
    documento: "63.436.092/0001-77",
    cep: "72870-233",
    logradouro: "Rua 22, Quadra 64, Lote 1, Loja 05B",
    bairro: "Jardim Oriente",
    cidade: "Valparaíso de Goiás",
    uf: "GO",
    observacoesExtra: "Razão social: RR Gelados Ltda. Possui geração distribuída fotovoltaica (27 kW).",
  },
  {
    nome: "Loteamento Reserva da Mata",
    tipoPessoa: "PJ",
    contatoNome: "Marcelo Bernadeli",
    segmento: "Construtora",
    documento: "26.512.802/0001-74",
    cep: "75350-000",
    logradouro: "Fazenda Barro Amarelo, S/N",
    bairro: "Zona Rural",
    cidade: "Guapó",
    uf: "GO",
    observacoesExtra: "Razão social: Balsamo Empreendimentos Imobiliários SPE Ltda.",
  },
  {
    nome: "Catedral Metropolitana de Goiânia",
    tipoPessoa: "PJ",
    cidade: "Goiânia",
    uf: "GO",
    segmento: "Outro",
    // Pasta só tem um arquivo binário de analisador de energia (.smd) — nada extraível.
  },
  {
    nome: "Karla",
    tipoPessoa: "PF",
    segmento: "Residencial",
    // Pasta só tem um arquivo binário de analisador de energia (.smd) — nada extraível.
  },
  {
    nome: "Eduardo",
    tipoPessoa: "PF",
    segmento: "Residencial",
    cidade: "Anápolis",
    uf: "GO",
    observacoesExtra: "Instalação de infraestrutura elétrica para carregador de veículo elétrico (contrato/ART assinado em 03/06/2026).",
  },
  {
    nome: "Fazenda Rio Doce",
    tipoPessoa: "PJ",
    segmento: "Rural",
    // CPF e cidade/CEP do proprietário DIVERGEM entre os documentos da própria
    // pasta (Inscrição Estadual vs. formulário de conexão) — não gravo nenhum
    // dos dois pra não cadastrar algo errado; só a nota abaixo.
    observacoesExtra:
      "ATENÇÃO: documentos da pasta trazem dados conflitantes do proprietário (CPF e cidade/CEP divergem entre a Inscrição Estadual e o formulário de conexão à rede) — confirmar manualmente antes de completar o cadastro.",
  },
  {
    nome: "Sobreiro (Rede MT)",
    tipoPessoa: "PJ",
    segmento: "Rural",
    cidade: "Itapirapuã",
    uf: "GO",
    observacoesExtra: "Unidade rural com geração distribuída (créditos de energia).",
  },
  {
    // Cliente NOVO (pasta criada depois da 1ª importação) — só dado de empresa.
    nome: "Urus Invest Ltda",
    tipoPessoa: "PJ",
    cidade: "Corumbaíba",
    uf: "GO",
    segmento: "Construtora",
    observacoesExtra:
      "Loteamento Residencial Mirante do Lago — projeto de rede de média tensão aprovado pela Equatorial Goiás (18/03/2025).",
  },
  {
    nome: "Souza Agronegócios",
    tipoPessoa: "PJ",
    contatoNome: "Marcelo Rodrigues",
    segmento: "Rural",
    cidade: "Anápolis",
    uf: "GO",
    observacoesExtra: "Redução de 42% no custo de energia entre as safras 2025 e 2026 após intervenções da GTA.",
  },
  {
    nome: "Paróquia Nossa Senhora dos Apóstolos",
    tipoPessoa: "PJ",
    segmento: "Outro",
    documento: "01.569.466/0110-29",
    cep: "74367-631",
    logradouro: "Rua Venneza",
    bairro: "Res Eldorado",
    cidade: "Goiânia",
    uf: "GO",
    observacoesExtra:
      "Unidade da Arquidiocese de Goiânia. MESMO CNPJ (01.569.466/0110-29) e endereço encontrados também no cliente 'Paróquia Rainha dos Apóstolos' — muito provavelmente a MESMA paróquia cadastrada duas vezes; considere unificar os dois cadastros.",
  },
  {
    nome: "Privilege Jundiaí",
    tipoPessoa: "PJ",
    cidade: "Jundiaí",
    uf: "SP",
    segmento: "Comercial",
    // Estudo de viabilidade lido não trouxe CNPJ/endereço/contato — só confirmou o segmento residencial do empreendimento.
  },
  {
    nome: "BMC – Metrô de Brasília",
    tipoPessoa: "PJ",
    cidade: "Brasília",
    uf: "DF",
    segmento: "Órgão público",
    // Só documentos técnicos de escopo — nenhum dado cadastral do contratante.
  },
  {
    nome: "FUNEV",
    tipoPessoa: "PJ",
    segmento: "Outro",
    cidade: "São Luís de Montes Belos",
    uf: "GO",
    observacoesExtra:
      "Nome completo: Fundação Universitária Evangélica (FUNEV), administradora do Hospital Estadual de São Luís de Montes Belos Dr. Geraldo Landó. ATENÇÃO: possível duplicidade com o cliente 'HESLMB' — os documentos das duas pastas apontam para o mesmo hospital; considere unificar os dois cadastros. Segmento sugerido: 'Órgão público' (hoje 'Outro').",
  },
  {
    nome: "Cristal Têxtil",
    tipoPessoa: "PJ",
    segmento: "Industrial",
    documento: "37.318.948/0001-08",
    cep: "75149-899",
    logradouro: "Fazenda Olaria, Rota 967, Km 6",
    bairro: "Zona Rural",
    cidade: "Anápolis",
    uf: "GO",
    observacoesExtra:
      "Razão social oficial: Cristal Indústria Têxtil Ltda (nome cadastrado como 'Cristal Têxtil' — considere atualizar para a razão social completa).",
  },
  {
    nome: "Capela Nossa Senhora do Loreto",
    tipoPessoa: "PJ",
    segmento: "Outro",
    cidade: "Anápolis",
    uf: "GO",
    observacoesExtra:
      "ACHADO A CONFIRMAR: os documentos da pasta (relatório de obra e projeto elétrico) referem-se à 'Base Aérea de Anápolis', não a uma paróquia civil comum — pode ser uma capela militar dentro da Base Aérea. Vale confirmar manualmente a identidade real deste cliente antes de completar o cadastro (CNPJ/contato).",
  },
  {
    nome: "Centro Pastoral Dom Fernando",
    tipoPessoa: "PJ",
    segmento: "Outro",
    cep: "74770-495",
    logradouro: "Av. Manchester, quadra 1A, lote área 1 K-6",
    bairro: "Jardim das Aroeiras",
    cidade: "Goiânia",
    uf: "GO",
    observacoesExtra:
      "ATENÇÃO: o contrato encontrado tem inconsistência interna (corpo do texto cita 'Centro Pastoral Dom Fernando', bloco de assinatura cita outra entidade da Arquidiocese) — por isso o CNPJ não foi gravado; confirmar manualmente antes de completar o cadastro.",
  },
  {
    nome: "Condomínio Goianápolis",
    tipoPessoa: "PJ",
    contatoNome: "Paulo",
    cidade: "Goianápolis",
    uf: "GO",
    segmento: "Residencial",
    // Documentos trazem dados pessoais (CPF/telefone/endereço) do proprietário
    // pessoa física — não gravados no cadastro (repositório público).
  },
  {
    nome: "Faculdade Católica de Anápolis",
    tipoPessoa: "PJ",
    cidade: "Anápolis",
    uf: "GO",
    segmento: "Outro",
    documento: "00.772.442/0001-56",
    cep: "75080-730",
    logradouro: "Rua 5",
    numero: "580",
    bairro: "Cidade Jardim",
    observacoesExtra: "Mantenedora/razão social: Fundação São Miguel Arcanjo.",
  },
  {
    nome: "Fazenda Conquista",
    tipoPessoa: "PJ",
    segmento: "Rural",
    documento: "24.143.146/0001-54",
    email: "projetos1@brasolengenharia.com.br",
    cep: "75813-000",
    logradouro: "Fazenda Conquista, Zona Rural",
    bairro: "Rural",
    cidade: "Caçu",
    uf: "GO",
    observacoesExtra:
      "Contratante do projeto de rede/subestação: Brasol Energia Solar Ltda (empresa de geração solar que adquiriu direitos sobre um lote da fazenda histórica).",
  },
  {
    nome: "HESLMB",
    tipoPessoa: "PJ",
    segmento: "Outro",
    documento: "07.776.237/0013-41",
    cep: "76050-129",
    logradouro: "Rua 03, Qd. 04, Lt. 08",
    bairro: "Vila Popular",
    cidade: "São Luís de Montes Belos",
    uf: "GO",
    observacoesExtra:
      "Nome completo: Hospital Estadual de São Luís de Montes Belos Dr. Geraldo Landó, administrado pela Fundação Universitária Evangélica (FUNEV). ATENÇÃO: possível duplicidade com o cliente 'FUNEV' — considere unificar os dois cadastros.",
  },
  {
    nome: "Francefarma",
    tipoPessoa: "PJ",
    segmento: "Industrial",
    documento: "18.575.413/0001-60",
    cep: "74900-000",
    logradouro: "Ala Lafaiete de Campos, Q. APM, L. 15 H, S/N",
    bairro: "All Park Polo Empresarial",
    cidade: "Aparecida de Goiânia",
    uf: "GO",
    observacoesExtra: "Razão social: Francefarma Indústria de Cosméticos Ltda - ME.",
  },
  {
    nome: "Condomínio Vale Verde",
    tipoPessoa: "PJ",
    cidade: "Abadiânia",
    uf: "GO",
    segmento: "Residencial",
    observacoesExtra:
      "Possível razão social do condomínio/incorporadora original: Vale Verde Negócios Imobiliários Ltda (não confirmado como a mesma entidade que contratou a GTA).",
  },
  {
    nome: "Residencial J. Alves",
    tipoPessoa: "PJ",
    segmento: "Residencial",
    cidade: "Anápolis",
    uf: "GO",
    observacoesExtra: "Vistoria/manutenção elétrica, iluminação de emergência e SPDA do condomínio (ART emitida em 19/02/2025).",
  },
  {
    nome: "Avenida Parque",
    tipoPessoa: "PJ",
    segmento: "Comercial",
    // Estudo de conformidade não trouxe CNPJ/endereço/contato do condomínio.
  },
  {
    nome: "Localiza",
    tipoPessoa: "PJ",
    segmento: "Comercial",
    documento: "16.670.085/0905-53",
    cep: "74985-245",
    logradouro: "Rua 06, Qda 024, S/N",
    bairro: "Polo Empresarial",
    cidade: "Aparecida de Goiânia",
    uf: "GO",
    observacoesExtra:
      "Razão social: Localiza Rent a Car S/A (unidade/CD Aparecida de Goiânia). Diversos serviços pontuais/recorrentes (QGBT, funilaria, iluminação).",
  },
  {
    nome: "Paróquia Rainha dos Apóstolos",
    tipoPessoa: "PJ",
    segmento: "Outro",
    documento: "01.569.466/0110-29",
    cep: "74000-000",
    logradouro: "Rua Veneza, Q. 07, L. 00, S/N",
    bairro: "Residencial Eldorado",
    cidade: "Goiânia",
    uf: "GO",
    observacoesExtra:
      "ATENÇÃO: mesmo CNPJ (01.569.466/0110-29) e mesmo endereço aparecem no cliente 'Paróquia Nossa Senhora dos Apóstolos' — muito provavelmente é a MESMA paróquia cadastrada duas vezes. Considere unificar os dois cadastros.",
  },
  {
    nome: "Roger",
    tipoPessoa: "PF",
    segmento: "Residencial",
    cidade: "Abadiânia",
    uf: "GO",
    observacoesExtra:
      "Projeto de SPDA para a edificação 'Casa de Lago'. Um documento de terceiro cita uma empresa como proprietária registrada do imóvel — não confirmado como a mesma pessoa/empresa do cliente, por isso nenhum CNPJ foi gravado.",
  },
  {
    nome: "Santuário Sagrada Família",
    tipoPessoa: "PJ",
    segmento: "Outro",
    documento: "01.569.466/0058-00",
    cep: "74415-220",
    logradouro: "Rua C 14, Qd 19, Lt 15",
    bairro: "Vila Nova Canaã",
    cidade: "Goiânia",
    uf: "GO",
    observacoesExtra: "Contrato de assessoria/consultoria elétrica contínuo (mensalidade fixa + valor por chamado), assinado em 04/04/2025.",
  },
  {
    nome: "Valmir Dal Toe",
    tipoPessoa: "PF",
    segmento: "Residencial",
    documento: "26.961.648/0001-18",
    cep: "74912-651",
    logradouro: "Rodovia BR-153, S/N",
    cidade: "Aparecida de Goiânia",
    uf: "GO",
    observacoesExtra:
      "Nome fantasia/CNPJ: Real Prive (é pessoa jurídica, não física — hoje cadastrado como PF). Contrato de análise energética assinado em 02/07/2025. Sugestão: revisar tipo de pessoa (PJ) e segmento (parece Comercial, não Residencial).",
  },
];
