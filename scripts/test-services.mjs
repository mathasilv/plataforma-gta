/**
 * Teste de fidelidade dos serviços: gera cada proposta via API com os dados
 * reais do documento original e compara o texto extraído.
 *   node scripts/test-services.mjs [chave1 chave2 ...]
 * Requer `npm run dev` ativo em http://localhost:3000
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:3000";
const DOCS = "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos";

const FIXTURES = {
  limpeza: {
    original: `${DOCS}/06.26 - Limpeza de placas - Residencial Espanha/Proposta_GTA ResidencialEspanha_LimpezaSolar.docx`,
    formData: {
      clienteNome: "Residencial Espanha",
      clienteSigla: "RESPANHA",
      cidadeUf: "Anápolis/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-16",
      validadeDias: 30,
      formaPagamento: "30% na entrada + 70% após conclusão dos serviços",
      subtitulo: "LIMPEZA DE PAINÉIS SOLARES FOTOVOLTAICOS  ·  94 PLACAS  ·  DUAS TORRES",
      localServico: "Telhado das Duas Torres — Residencial Espanha — Anápolis/GO",
      objeto: "Limpeza de 94 Painéis Solares Fotovoltaicos em Duas Torres",
      prazoExecucao: "10 dias corridos a partir da aprovação da proposta",
      textoObjeto:
        "A presente Proposta Técnica e Comercial tem por objeto a prestação do serviço de limpeza de 94 (noventa e quatro) painéis solares fotovoltaicos instalados no telhado das duas torres do Residencial Espanha, em Anápolis/GO.",
      textoAbrangencia:
        "O serviço de limpeza abrangerá as 94 placas fotovoltaicas distribuídas nas duas torres do residencial, compreendendo:",
      textoMaoObra:
        "Mão de obra técnica especializada para execução da limpeza de todos os 94 módulos nas duas torres;",
      descricaoServico: "Limpeza de 94 painéis solares fotovoltaicos — Duas torres — Residencial Espanha",
      textoPrazo:
        "O prazo de execução do serviço de limpeza é de 10 (dez) dias corridos, contados a partir da aprovação desta proposta e do recebimento da entrada contratual (30%).",
      valorTotal: "2.300,00",
      pagamentos: [
        { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta, para mobilização da equipe", percentual: 30 },
        { parcela: "2ª", evento: "Após a conclusão do serviço de limpeza de todas as 94 placas nas duas torres", percentual: 70 },
      ],
      cronograma: [
        { etapa: "Aprovação da proposta e pagamento da 1ª parcela (30%)", prazo: "Dia D", responsavel: "Condomínio" },
        { etapa: "Mobilização da equipe e agendamento com o responsável do condomínio", prazo: "D + 1 a D + 3", responsavel: "GTA Energia" },
        { etapa: "Inspeção prévia e limpeza dos painéis — Torre 1", prazo: "D + 3 a D + 6", responsavel: "GTA Energia" },
        { etapa: "Inspeção prévia e limpeza dos painéis — Torre 2", prazo: "D + 6 a D + 9", responsavel: "GTA Energia" },
        { etapa: "Entrega do relatório fotográfico e 2ª parcela (70%)", prazo: "D + 10", responsavel: "GTA + Condomínio" },
      ],
      prazoTotal: "10 dias corridos",
    },
  },

  "inspecao-se": {
    original: `${DOCS}/06.26 - Condomínio Varandas (João Victor)/Proposta_GTA_Varandas_InspecaoSE.docx`,
    formData: {
      clienteNome: "Varandas Condomínio Clube",
      clienteSigla: "VARANDAS",
      cidadeUf: "Anápolis/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-05-29",
      validadeDias: 20,
      formaPagamento: "50% na entrada + 50% após entrega do relatório",
      endereco: "Vila Industrial — Anápolis/GO — CEP: 75115-100",
      textoObjeto:
        "A presente Proposta Técnica e Comercial tem por objeto a realização de inspeção técnica especializada na subestação de energia elétrica do Varandas Condomínio Clube, localizado em Anápolis/GO, com foco no diagnóstico das condições operacionais, análise de conformidade dos ajustes de proteção em relação à potência instalada, vistoria termográfica para identificação de pontos quentes e, quando necessário, elaboração de novo estudo de proteção e implementação dos ajustes corretivos.",
      textoPrazo:
        "O prazo total de execução é de 15 (quinze) dias corridos, contados a partir da data de aprovação desta proposta, assinatura do contrato e recebimento da entrada contratual.",
      valorTotal: "15.000,00",
      cronograma: [
        { etapa: "Aprovação, assinatura do contrato e pagamento da 1ª parcela", prazo: "Dia D", responsavel: "Condomínio + GTA" },
        { etapa: "Mobilização e deslocamento da equipe técnica a Anápolis/GO", prazo: "D + 3", responsavel: "GTA Energia" },
        { etapa: "Inspeção visual, levantamento técnico e vistoria termográfica", prazo: "D + 3 a D + 5", responsavel: "GTA Energia" },
        { etapa: "Download e análise dos ajustes de proteção + análise de sobrecarga", prazo: "D + 5 a D + 8", responsavel: "GTA Energia" },
        { etapa: "Elaboração de novo estudo de proteção e implementação (se necessário)", prazo: "D + 8 a D + 11", responsavel: "GTA Energia" },
        { etapa: "Elaboração e revisão do relatório técnico completo de diagnóstico", prazo: "D + 11 a D + 14", responsavel: "GTA Energia" },
        { etapa: "Entrega e apresentação do relatório ao cliente + 2ª parcela", prazo: "D + 15", responsavel: "GTA + Condomínio" },
      ],
    },
  },

  spda: {
    original: `${DOCS}/06.26 - SPDA Centro de Ensino Superior do Sudoeste Goiano/Orcamento_GTA_CESSG_SPDA.docx`,
    formData: {
      clienteNome: "Centro de Ensino Superior do Sudoeste Goiano LTDA",
      clienteSigla: "CESSG",
      cidadeUf: "Quirinópolis/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-10",
      validadeDias: 20,
      formaPagamento: "A Combinar",
      endereco: "Rua Secundino Pereira Alves, Q7-A, L1 — Residencial Morumbi — Quirinópolis/GO",
      textoObjeto:
        "O presente Orçamento Técnico e Comercial tem por objeto a prestação de serviços de engenharia elétrica para elaboração do Projeto de Análise de Gerenciamento de Risco e do Projeto de SPDA (Sistema de Proteção contra Descargas Atmosféricas) para o Centro de Ensino Superior do Sudoeste Goiano LTDA, localizado em Quirinópolis/GO.",
      textoDeslocamento:
        "Deslocamento da equipe técnica à Rua Secundino Pereira Alves, Q7-A, L1 — Residencial Morumbi, Quirinópolis/GO;",
      textoPrazo:
        "O prazo estimado de entrega dos documentos técnicos é de 45 dias corridos, contados a partir da aprovação deste orçamento, recebimento da entrada contratual e realização da visita técnica ao local.",
      valorRisco: "9.900,00",
      valorProjeto: "11.970,00",
    },
  },

  "carregador-ev": {
    original: `${DOCS}/02-26 - Carregadores Avenida Parque/Proposta_GTA_CondAvParque_CarregadorEV.docx`,
    formData: {
      clienteNome: "Condomínio Residencial Avenida Parque",
      clienteSigla: "AVPARQUE",
      cidadeUf: "Anápolis/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-05-26",
      validadeDias: 20,
      formaPagamento: "A Combinar",
      endereco: "Av. Universitária, 1257 — Vila Santa Isabel — Anápolis/GO",
      subtitulo: "INSTALAÇÃO DE CARREGADOR VEICULAR DUPLO 46 kW  ·  INFRAESTRUTURA ELÉTRICA COMPLETA",
      objeto: "Instalação de Carregador Veicular Duplo 46 kW (2 × 23 kW)",
      textoObjeto:
        "A presente Proposta Técnica e Comercial tem por objeto o fornecimento de materiais, a execução dos serviços de infraestrutura elétrica completa, as adequações civis, elétricas e eletromecânicas, bem como a elaboração do projeto elétrico (diagrama unifilar), emissão de ART, instalação e comissionamento do carregador veicular duplo de 46 kW (2 × 23 kW) no Condomínio Residencial Avenida Parque, em Anápolis/GO.",
      textoRecebimento:
        "Recebimento, posicionamento e fixação física do carregador veicular duplo 46 kW (2 × 23 kW) no local definido;",
      textoTestes:
        "Testes de funcionamento de cada ponto de carregamento (23 kW) individualmente e em simultâneo;",
      textoNotaEquipamento:
        "O equipamento carregador veicular duplo 46 kW (2 × 23 kW) será adquirido diretamente pelo Condomínio Residencial Avenida Parque junto ao fornecedor do produto, com faturamento direto ao cliente. O valor de R$ 18.250,00 está discriminado nesta proposta exclusivamente para compor o investimento total do projeto, não sendo faturado pela GTA Energia Ltda.",
      tituloEquipamento: "Carregador veicular duplo 46 kW (2 × 23 kW) — fornecimento do equipamento",
      valorGta: "58.000,00",
      valorEquipamento: "18.250,00",
      cronograma: [
        { etapa: "Aprovação, assinatura do contrato e pagamento da entrada", prazo: "Dia D", responsavel: "Condomínio + GTA" },
        { etapa: "Elaboração do diagrama unifilar, memorial de cálculo e emissão de ART", prazo: "D + 5", responsavel: "GTA Energia" },
        { etapa: "Aquisição dos materiais elétricos e mobilização da equipe", prazo: "D + 7", responsavel: "GTA Energia" },
        { etapa: "Execução da infraestrutura elétrica e adequações civis", prazo: "D + 7 a D + 20", responsavel: "GTA Energia" },
        { etapa: "Recebimento e instalação do carregador veicular", prazo: "D + 20 a D + 25", responsavel: "GTA + Cliente" },
        { etapa: "Comissionamento, testes e entrega do laudo final", prazo: "D + 25 a D + 30", responsavel: "GTA Energia" },
      ],
    },
  },

  qgbt: {
    original: `${DOCS}/06.26 - GEOLAB - QGBT/Orcamento_GTA_Geolab_QGBT.docx`,
    formData: {
      clienteNome: "GEOLAB INDÚSTRIA FARMACÊUTICA LTDA",
      clienteSigla: "GEOLAB",
      cidadeUf: "Anápolis/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-09",
      validadeDias: 20,
      formaPagamento: "A Combinar",
      endereco: "Via Principal 1, s/n — DAIA, Anápolis/GO — CEP: 75133-590",
      tituloCabecalho: "GEOLAB INDÚSTRIA FARMACÊUTICA — DAIA, ANÁPOLIS/GO",
      aceiteLocal: "DAIA — Anápolis/GO",
      textoObjeto:
        "O presente Orçamento tem por objeto o fornecimento do Quadro Geral de Baixa Tensão (QGBT) para instalação trifásica de baixa tensão, conforme especificação técnica de materiais e componentes fornecida pela Geolab Indústria Farmacêutica, destinado à unidade industrial no DAIA, Anápolis/GO.",
      descricaoFornecimento:
        "Quadro Painel ZK2L 1.500×800×600 IP55 completo com todos os componentes especificados, montado, identificado e testado em bancada.",
      textoPrazo:
        "O prazo de entrega do QGBT montado, identificado e testado será definido após confirmação do pedido e recebimento da entrada, conforme disponibilidade de componentes no mercado. O prazo estimado é de 15 a 20 dias úteis após a confirmação do pedido.",
      valorFornecimento: "27.795,00",
      valorEncargos: "4.905,00",
      parametros: [
        { parametro: "Tipo de Quadro", valor: "QGBT — Quadro Geral de Baixa Tensão" },
        { parametro: "Sistema", valor: "Trifásico + Neutro — 380/220V — 60Hz" },
        { parametro: "Invólucro / Armário", valor: "Painel ZK2L 1.500×800×600 mm — IP55 — ELETROPOLL" },
        { parametro: "Grau de Proteção", valor: "IP55 — Proteção contra poeira e jatos d'água" },
        { parametro: "Proteção Geral", valor: "Disjuntor Caixa Moldada ASGARD TRIP 350A 50kA/380V — STECK" },
        { parametro: "Seccionadora", valor: "Secc Sob Carga 315A — SIEMENS ERGON" },
        { parametro: "Barramento Principal", valor: "Barra de Cobre 1×1/4 — 359A" },
        { parametro: "Circuitos Derivados", valor: "Disjuntores Tripolares 32A e 40A Curva C 3kA — STECK" },
        { parametro: "Normas", valor: "ABNT NBR IEC 61439-1 e 61439-2" },
        { parametro: "Entrega", valor: "Quadro montado, identificado e testado" },
      ],
      materiais: [
        { identificacao: "ARM 1500X800X600", descricao: "PAINEL ZK2L 1500×800×600 IP55 COMPLETO", marca: "ELETROPOLL PAINEIS" },
        { identificacao: "BARRA 1X1/4", descricao: "BARRA COBRE 1×1/4 — (1,44 KG) 359A", marca: "BARRA COBRE" },
        { identificacao: "BANHO DE PRATA", descricao: "DPC-056-1 LÍQUIDO PRATEADOR 1L", marca: "THE TIGER" },
        { identificacao: "TERMORET 1\" PT", descricao: "W25PR — 1\" TERMORRETRATIL PRETO", marca: "FRONTEC" },
        { identificacao: "IP 50×50 M10AZUL", descricao: "ISOLADOR BAIXA TENSÃO PARALELO M10 AZ 50×50", marca: "CEBEL" },
        { identificacao: "CJ ISOLADOR BARRA", descricao: "411500302 CONJUNTO ISOLADOR ZK2L MONTADO", marca: "ELETROPOLL PAINEIS" },
        { identificacao: "ID PABA 15MM", descricao: "0819398 UC-WMT BC 15×4 P/PATG BLUEMARK PHOENIX", marca: "PHOENIX" },
        { identificacao: "LUVA 70MM", descricao: "LF-70 LUVA EMENDA 70MM", marca: "INTELLI INDUSTRIA" },
        { identificacao: "DT 350A SDJS350", descricao: "DISJUNTOR CX MOLD ASGARD TRIP 350A 50KA/380V", marca: "STECK" },
        { identificacao: "DT 32A SDD63C32", descricao: "DISJUNTOR TRIPOLAR 32A 3KA CURVA C", marca: "STECK" },
        { identificacao: "DT 40A SDD63C40", descricao: "DISJUNTOR TRIPOLAR 40A 3KA CURVA C", marca: "STECK" },
        { identificacao: "ERGON 315A", descricao: "SECC SOB CARGA 315A", marca: "SIEMENS" },
        { identificacao: "TRILHO NS 35/7,5", descricao: "TRILHO DE FIXAÇÃO LISO NS 35/7,5 2MTS", marca: "PHOENIX" },
        { identificacao: "CAN 50×80 AZUL P", descricao: "CANALETA HD9PF 50×80mm SEMI-ABERTA AZUL PETRÓLEO", marca: "HELLERMANN TYTON" },
        { identificacao: "TER 10MM 50A", descricao: "TP2757 TERMINAL SIMPLES TUB 10MM 50A VM DECORLUX", marca: "DECORLUX" },
        { identificacao: "TER 6MM 36A", descricao: "TP2036 TERMINAL SIMPLES TUB 6MM 36A AM DECORLUX", marca: "DECORLUX" },
        { identificacao: "POLICARBONATO 3MM", descricao: "POLICARBONATO CRISTAL 3MM 0300×1000×2050", marca: "" },
      ],
    },
  },

  "projeto-se": {
    original: `${DOCS}/06.26 - Fazenda Rio Doce/Orçamento - Projeto SE 750kVA/Proposta_GTA_CarlosViana_ProjSE750kVA_v2.docx`,
    formData: {
      clienteNome: "Carlos Roberto Viana",
      clienteSigla: "CARLOS",
      cidadeUf: "Bela Vista de Goiás/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-30",
      validadeDias: 30,
      formaPagamento: "A Combinar",
      tituloCabecalho: "CARLOS ROBERTO VIANA — FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO",
      subtitulo: "PROJETO DE SUBESTAÇÃO EM CUBÍCULO  ·  750 kVA  ·  13,8 kV  ·  ZONA RURAL",
      localServico: "Fazenda Rio Doce — Zona Rural — Bela Vista de Goiás/GO",
      objeto: "Projeto de Subestação em Cubículo — 750 kVA — 13,8 kV / 380-220 V",
      prazoExecucao: "6 meses corridos após aprovação desta proposta",
      concessionaria: "Equatorial Goiás",
      textoObjeto:
        "A presente Proposta Técnica e Comercial tem por objeto a elaboração do Projeto Elétrico Executivo da Subestação de Energia em Cubículo de 750 kVA em 13,8 kV, destinada ao atendimento das cargas elétricas da Fazenda Rio Doce, localizada em zona rural do município de Bela Vista de Goiás/GO.",
      textoDadosIntro:
        "Com base na demanda elétrica da Fazenda Rio Doce e nas características do sistema de fornecimento da Equatorial Goiás na região, os principais parâmetros da subestação projetada são:",
      textoPrazo:
        "O prazo total para elaboração, aprovação e entrega do projeto completo é de 6 (seis) meses, contados a partir da aprovação desta proposta e do recebimento da entrada contratual.",
      nomeLocal: "Fazenda Rio Doce",
      cidadeLocal: "Bela Vista de Goiás/GO",
      potencia: "750 kVA",
      tensaoMT: "13,8 kV",
      correnteBT: "1.139 A",
      parametros: [
        { parametro: "Tipo de Subestação", valor: "Cubículo de Média Tensão (Abrigada)" },
        { parametro: "Potência Nominal", valor: "750 kVA" },
        { parametro: "Tensão Primária (MT)", valor: "13.800 V — 13,8 kV (sistema trifásico)" },
        { parametro: "Tensão Secundária (BT)", valor: "380 / 220 V — trifásico + neutro (4 fios)" },
        { parametro: "Grupo de Ligação do Transformador", valor: "Dyn11" },
        { parametro: "Categoria da UC", valor: "Grupo A4 — MT 13,8 kV — Equatorial Goiás" },
        { parametro: "Classe de Tensão dos Equipamentos MT", valor: "15 kV" },
        { parametro: "Corrente Nominal no Secundário (BT)", valor: "In ≈ 1.139 A (para 750 kVA / 380 V × √3)" },
        { parametro: "Local de Instalação", valor: "Zona Rural — Fazenda Rio Doce — Bela Vista de Goiás/GO" },
      ],
      servicos: [
        { num: "01", descricao: "Levantamento técnico de campo — visita à Fazenda Rio Doce, coleta de dados de carga e demanda, análise de viabilidade do ponto de conexão 13,8 kV e definição do local do cubículo", valor: "—" },
        { num: "02", descricao: "Projeto elétrico executivo da subestação em cubículo 750 kVA / 13,8 kV — diagrama unifilar, planta baixa, detalhamentos, memorial descritivo, especificação de equipamentos e lista de materiais", valor: "—" },
        { num: "03", descricao: "Acompanhamento do processo de aprovação junto à Equatorial Goiás — submissão, análise, revisões (até 2) e obtenção da Autorização de Construção", valor: "—" },
        { num: "04", descricao: "Emissão de ART junto ao CREA/GO referente à elaboração do projeto da subestação 750 kVA / 13,8 kV", valor: "—" },
      ],
      valorSemDesconto: "18.500,00",
      valorDesconto: "3.250,00",
      pagamentos: [
        { percentual: 50, texto: "no ato da aprovação desta proposta e realização do levantamento de campo" },
        { percentual: 30, texto: "na entrega do projeto completo com ART" },
        { percentual: 20, texto: "na obtenção da Autorização de Construção da Equatorial Goiás" },
      ],
      cronograma: [
        { etapa: "Aprovação da proposta, contrato e 1ª parcela (50%)", prazo: "Dia D", responsavel: "Cliente + GTA" },
        { etapa: "Visita técnica de campo — Fazenda Rio Doce", prazo: "D + 1 a D + 7", responsavel: "GTA Energia" },
        { etapa: "Elaboração do projeto elétrico executivo completo da SE", prazo: "D + 7 a D + 35", responsavel: "GTA Energia" },
        { etapa: "Submissão do projeto à Equatorial Goiás", prazo: "D + 35 a D + 40", responsavel: "GTA Energia" },
        { etapa: "Análise e aprovação pela Equatorial Goiás (estimado)", prazo: "D + 40 a D + 80", responsavel: "Equatorial Goiás" },
        { etapa: "Revisões, adequações e obtenção da Autorização de Construção", prazo: "D + 80 a D + 87", responsavel: "GTA Energia" },
        { etapa: "Emissão da ART, entrega do dossiê técnico e 2ª parcela (50%)", prazo: "Até D + 90", responsavel: "GTA + Cliente" },
      ],
      prazoTotal: "6 meses",
      aceiteLocal: "Fazenda Rio Doce — Bela Vista de Goiás/GO",
    },
  },

  "projeto-rede-mt": {
    original: `${DOCS}/06.26 - Fazenda Rio Doce/Orçamento - Projeto de Rede MT- 1km/Proposta_GTA_CarlosViana_ProjRD13_8kV.docx`,
    formData: {
      clienteNome: "Carlos Roberto Viana",
      clienteSigla: "CARLOS",
      cidadeUf: "Bela Vista de Goiás/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-30",
      validadeDias: 30,
      formaPagamento: "A Combinar",
      tituloCabecalho: "CARLOS ROBERTO VIANA — FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO",
      subtitulo: "PROJETO DE REDE DE DISTRIBUIÇÃO 13,8 kV  ·  TRAVESSIA GO-147  ·  ZONA RURAL",
      localServico: "Fazenda Rio Doce — Zona Rural — Bela Vista de Goiás/GO",
      objeto: "Projeto de RD 13,8 kV com Travessia GO-147 (≈ 1 km) e Aprovação junto à Equatorial Goiás",
      prazoExecucao: "6 meses corridos após aprovação desta proposta",
      concessionaria: "Equatorial Goiás",
      textoObjeto:
        "O presente Orçamento Técnico e Comercial tem por objeto a elaboração do Projeto Elétrico Executivo da Rede de Distribuição em Média Tensão (RD 13,8 kV), contemplando a travessia da Rodovia GO-147 em extensão aproximada de 1 (um) quilômetro, para atendimento elétrico da Fazenda Rio Doce, localizada em zona rural do município de Bela Vista de Goiás/GO.",
      textoPrazo:
        "O prazo total para elaboração, aprovação e entrega do projeto completo é de 6 (seis) meses, contados a partir da aprovação deste orçamento e do recebimento da entrada contratual.",
      nomeLocal: "Fazenda Rio Doce",
      cidadeLocal: "Bela Vista de Goiás/GO",
      rodovia: "GO-147",
      tensaoMT: "13,8 kV",
      servicos: [
        { num: "01", descricao: "Levantamento técnico de campo — visita à Fazenda Rio Doce e trecho GO-147, coleta de dados, registro fotográfico e instrução do processo junto ao GOINFRA/DNIT", valor: "—" },
        { num: "02", descricao: "Projeto elétrico executivo da RD 13,8 kV — planta georreferenciada, diagrama unifilar, memorial descritivo, lista de materiais e projeto de travessia GO-147", valor: "—" },
        { num: "03", descricao: "Acompanhamento do processo de aprovação junto à Equatorial Goiás — submissão, análise, revisões (até 2) e obtenção da Autorização de Construção", valor: "—" },
        { num: "04", descricao: "Emissão de ART junto ao CREA/GO referente à elaboração do projeto elétrico da RD 13,8 kV", valor: "—" },
      ],
      valorTotal: "10.500,00",
      pagamentos: [
        { percentual: 50, texto: "no ato da aprovação deste orçamento e início do levantamento de campo" },
        { percentual: 30, texto: "na entrega do projeto completo com ART" },
        { percentual: 20, texto: "na obtenção da Autorização de Construção da Equatorial Goiás" },
      ],
      cronograma: [
        { etapa: "Aprovação do orçamento e pagamento da 1ª parcela", prazo: "Dia D", responsavel: "Cliente + GTA" },
        { etapa: "Visita técnica de campo — Fazenda Rio Doce e trecho GO-147", prazo: "D + 1 a D + 7", responsavel: "GTA Energia" },
        { etapa: "Instrução do processo junto ao GOINFRA/DNIT (travessia GO-147)", prazo: "D + 7 a D + 20", responsavel: "GTA Energia" },
        { etapa: "Elaboração do projeto elétrico executivo completo", prazo: "D + 7 a D + 35", responsavel: "GTA Energia" },
        { etapa: "Submissão do projeto à Equatorial Goiás", prazo: "D + 35 a D + 40", responsavel: "GTA Energia" },
        { etapa: "Análise e aprovação pela Equatorial Goiás (estimado)", prazo: "D + 40 a D + 80", responsavel: "Equatorial Goiás" },
        { etapa: "Revisões, adequações e obtenção da Autorização de Construção", prazo: "D + 80 a D + 88", responsavel: "GTA Energia" },
        { etapa: "Emissão da ART, entrega do dossiê e 2ª parcela", prazo: "Até D + 90", responsavel: "GTA + Cliente" },
      ],
      prazoTotal: "6 meses",
      aceiteLocal: "Fazenda Rio Doce — Bela Vista de Goiás/GO",
    },
  },

  "execucao-rede-mt": {
    original: `${DOCS}/06.26 - Fazenda Rio Doce/Orçamento - Execução SE 750kVA/Proposta_GTA_FazendaRioDoce_ExecucaoMT13_8kV.docx`,
    formData: {
      clienteNome: "Fazenda Rio Doce — Carlos Roberto Viana",
      clienteSigla: "FAZENDA",
      cidadeUf: "Bela Vista de Goiás/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-30",
      validadeDias: 30,
      formaPagamento: "60% entrada + 30% medições quinzenais + 10% conclusão",
      tituloCabecalho: "FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO",
      subtitulo: "EXECUÇÃO DE REDE DE DISTRIBUIÇÃO 13,8 kV  ·  ≈ 1 km  ·  ZONA RURAL",
      localServico: "Zona Rural — Bela Vista de Goiás/GO",
      objeto: "Execução de Rede de Distribuição 13,8 kV — Extensão ≈ 1 km — Zona Rural",
      prazoExecucao: "120 dias corridos após aprovação e entrega dos materiais (condicionado ao projeto aprovado)",
      concessionaria: "Equatorial Goiás",
      textoObjeto:
        "A presente Proposta Técnica e Comercial tem por objeto a execução da rede de distribuição de energia elétrica em média tensão 13,8 kV, com extensão aproximada de 1 (um) quilômetro em zona rural, para atendimento da Fazenda Rio Doce, localizada no município de Bela Vista de Goiás/GO, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral do ramal de média tensão.",
      textoPrazo:
        "O prazo total de execução dos serviços é de 120 (cento e vinte) dias corridos, contados a partir do cumprimento simultâneo das seguintes condições: aprovação desta proposta, assinatura do contrato, recebimento da entrada contratual (60%), apresentação do projeto aprovado pela Equatorial Goiás e disponibilização integral dos materiais pela Fazenda Rio Doce no canteiro de obras.",
      nomeLocal: "Fazenda Rio Doce",
      cidadeLocal: "Bela Vista de Goiás/GO",
      tensaoMT: "13,8 kV",
      extensao: "1 km",
      investimento: [
        { num: "01", titulo: "Serviços de execução — Rede MT 13,8 kV (≈ 1 km rural)", descricao: "Mão de obra especializada: escavação, içamento de postes, montagem de estruturas, lançamento de cabos, proteções, aterramento e comissionamento.", faturamento: "GTA Energia Ltda", valor: "60.000,00" },
        { num: "02", titulo: "Materiais e equipamentos da rede MT 13,8 kV — fornecimento", descricao: "Postes, cabos de alumínio, cruzetas, ferragens, isoladores, para-raios, chaves fusíveis, aterramento e demais componentes. Aquisição direta pelo cliente conforme projeto aprovado.", faturamento: "GTA Energia - Direto para o Cliente", valor: "95.000,00" },
      ],
      pagamentos: [
        { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos materiais no canteiro de obras, para mobilização da equipe e início das atividades", percentual: 60 },
        { parcela: "2ª a N", evento: "Medições quinzenais conforme avanço físico dos serviços, a serem pagas até a conclusão de cada etapa medida, documentadas por boletim de medição assinado por ambas as partes", percentual: 30 },
        { parcela: "Final", evento: "Saldo remanescente — após conclusão integral dos serviços, vistoria da Equatorial Goiás e entrega do relatório fotográfico ao cliente", percentual: 10 },
      ],
      cronograma: [
        { etapa: "Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + materiais no canteiro", prazo: "Dia D", responsavel: "Fazenda Rio Doce + GTA" },
        { etapa: "Mobilização da equipe, equipamentos e verificação dos materiais", prazo: "D + 1 a D + 7", responsavel: "GTA Energia" },
        { etapa: "Locação, marcação, escavação das cavas e içamento dos postes", prazo: "D + 7 a D + 35", responsavel: "GTA Energia" },
        { etapa: "Montagem das estruturas, cruzetas, ferragens e isoladores", prazo: "D + 25 a D + 60", responsavel: "GTA Energia" },
        { etapa: "Lançamento, tensionamento e conexão dos cabos de MT ao longo do trecho", prazo: "D + 50 a D + 85", responsavel: "GTA Energia" },
        { etapa: "Instalação de para-raios, chaves fusíveis e execução do aterramento completo", prazo: "D + 75 a D + 100", responsavel: "GTA Energia" },
        { etapa: "Inspeção técnica, comissionamento e acompanhamento da vistoria Equatorial Goiás", prazo: "D + 100 a D + 115", responsavel: "GTA + Equatorial" },
        { etapa: "Entrega do relatório fotográfico e pagamento do saldo final (10%)", prazo: "D + 120", responsavel: "GTA + Fazenda Rio Doce" },
      ],
      prazoDias: 120,
      prazoTotal: "120 dias corridos",
      aceiteNome: "FAZENDA RIO DOCE",
      aceiteResponsavel: "Carlos Roberto Viana",
    },
  },

  "execucao-se": {
    original: `${DOCS}/06.26 - Fazenda Rio Doce/Orçamento - Execução SE 750kVA/Proposta_GTA_FazendaRioDoce_SE750kVA.docx`,
    formData: {
      clienteNome: "Fazenda Rio Doce — Carlos Roberto Viana",
      clienteSigla: "FAZENDA",
      cidadeUf: "Bela Vista de Goiás/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-30",
      validadeDias: 30,
      formaPagamento: "60% entrada + 30% medições quinzenais + 10% conclusão",
      tituloCabecalho: "FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO",
      subtitulo: "EXECUÇÃO DE SUBESTAÇÃO DE MÉDIA TENSÃO  ·  750 kVA  ·  13,8 kV",
      localServico: "Zona Rural — Bela Vista de Goiás/GO",
      objeto: "Execução de Subestação de Média Tensão — 750 kVA — 13,8 kV / 380-220 V",
      prazoExecucao: "120 dias corridos após aprovação e entrega dos materiais (condicionado ao projeto aprovado)",
      concessionaria: "Equatorial Goiás",
      textoObjeto:
        "A presente Proposta Técnica e Comercial tem por objeto a execução completa da Subestação de Energia em Cubículo de 750 kVA em 13,8 kV para atendimento elétrico da Fazenda Rio Doce, localizada em zona rural do município de Bela Vista de Goiás/GO, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral da subestação.",
      textoPrazo:
        "O prazo total de execução dos serviços é de 120 (cento e vinte) dias corridos, contados a partir do cumprimento simultâneo das seguintes condições: aprovação desta proposta, assinatura do contrato, recebimento da entrada contratual (60%), apresentação do projeto aprovado pela Equatorial Goiás e disponibilização integral de todos os equipamentos e materiais pela Fazenda Rio Doce.",
      nomeLocal: "Fazenda Rio Doce",
      cidadeLocal: "Bela Vista de Goiás/GO",
      potencia: "750 kVA",
      tensaoMT: "13,8 kV",
      correnteBT: "1.139 A",
      parametros: [
        { parametro: "Tipo de Subestação", valor: "Cubículo de Média Tensão (Abrigada)" },
        { parametro: "Potência Nominal", valor: "750 kVA" },
        { parametro: "Tensão Primária (MT)", valor: "13.800 V — 13,8 kV — trifásico" },
        { parametro: "Tensão Secundária (BT)", valor: "380 / 220 V — trifásico + neutro (4 fios) — Dyn11" },
        { parametro: "Corrente Nominal Secundária", valor: "In ≈ 1.139 A" },
        { parametro: "Categoria da UC", valor: "Grupo A4 — MT 13,8 kV — Equatorial Goiás" },
        { parametro: "Classe de Tensão dos Equipamentos", valor: "15 kV" },
        { parametro: "Local de Instalação", valor: "Zona Rural — Fazenda Rio Doce — Bela Vista de Goiás/GO" },
      ],
      investimento: [
        { num: "01", titulo: "Serviços de execução — Subestação 750 kVA / 13,8 kV", descricao: "Obra civil, instalação de equipamentos de MT e BT, aterramento, comissionamento, vistoria e entrega do dossiê técnico. Mão de obra e mobilização inclusos.", faturamento: "GTA Energia Ltda", valor: "160.000,00" },
        { num: "02", titulo: "Equipamentos e materiais da subestação — fornecimento", descricao: "Transformador 750 kVA, cubículo, chave MT, para-raios, TCs, TPs, medidor, QGBT, cabos MT/BT, aterramento e demais componentes. Aquisição direta pelo cliente conforme projeto aprovado.", faturamento: "GTA Energia – Direto para o Cliente", valor: "235.000,00" },
      ],
      pagamentos: [
        { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos equipamentos, para mobilização e início das atividades", percentual: 60 },
        { parcela: "2ª a N", evento: "Medições quinzenais conforme avanço físico dos serviços, documentadas por boletim de medição assinado por ambas as partes", percentual: 30 },
        { parcela: "Final", evento: "Saldo remanescente — após energização da subestação pela Equatorial Goiás e entrega do dossiê técnico completo", percentual: 10 },
      ],
      cronograma: [
        { etapa: "Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + equipamentos disponíveis", prazo: "Dia D", responsavel: "Fazenda Rio Doce + GTA" },
        { etapa: "Mobilização, verificação dos equipamentos e preparação do canteiro de obras", prazo: "D + 1 a D + 10", responsavel: "GTA Energia" },
        { etapa: "Execução da obra civil — fundação e montagem do cubículo", prazo: "D + 10 a D + 35", responsavel: "GTA Energia" },
        { etapa: "Içamento e posicionamento do transformador + instalação dos equipamentos de MT", prazo: "D + 30 a D + 60", responsavel: "GTA Energia" },
        { etapa: "Instalação do sistema de medição (TCs, TPs, medidor) e conexões de MT", prazo: "D + 55 a D + 75", responsavel: "GTA Energia" },
        { etapa: "Instalação do QGBT e cabeamento de BT", prazo: "D + 70 a D + 90", responsavel: "GTA Energia" },
        { etapa: "Execução do aterramento completo com medição e registro", prazo: "D + 85 a D + 100", responsavel: "GTA Energia" },
        { etapa: "Comissionamento, vistoria Equatorial Goiás e energização supervisionada", prazo: "D + 100 a D + 115", responsavel: "GTA + Equatorial" },
        { etapa: "Entrega do dossiê técnico e pagamento do saldo final (10%)", prazo: "D + 120", responsavel: "GTA + Fazenda Rio Doce" },
      ],
      prazoDias: 120,
      prazoTotal: "120 dias corridos",
      aceiteNome: "FAZENDA RIO DOCE",
      aceiteResponsavel: "Carlos Roberto Viana",
    },
  },

  "loteamento-mtbt": {
    original: `${DOCS}/06.26 - Loteamento Residencial Jatobá - Senador Canedo/Proposta_GTA_LoteamentoJatoba_RedesMTBT_v2 (1).docx`,
    formData: {
      clienteNome: "Loteamento Residencial Jatobá",
      clienteSigla: "JATOBA",
      cidadeUf: "Senador Canedo/GO",
      referenciaSeq: 1,
      dataEmissao: "2026-06-30",
      validadeDias: 30,
      formaPagamento: "60% entrada + 30% medições quinzenais + 10% conclusão",
      tituloCabecalho: "LOTEAMENTO RESIDENCIAL JATOBÁ — SENADOR CANEDO/GO",
      localServico: "Senador Canedo — GO",
      nomeLocal: "Loteamento Residencial Jatobá",
      prazoExecucao: "90 dias corridos após aprovação da proposta e entrega dos materiais",
      concessionaria: "Equatorial Goiás",
      textoObjeto:
        "A presente Proposta Técnica e Comercial tem por objeto a execução completa da rede de distribuição de energia elétrica em média tensão (MT) e baixa tensão (BT) para o Loteamento Residencial Jatobá, localizado em Senador Canedo/GO, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral do sistema de distribuição.",
      textoPrazo:
        "O prazo de execução total dos serviços é de 90 (noventa) dias corridos, contados a partir da data de aprovação desta proposta, assinatura do contrato, recebimento da entrada contratual (60%) e disponibilização dos materiais no canteiro de obras pelo cliente.",
      investimento: [
        { num: "01", titulo: "Serviços de engenharia e execução — Rede MT/BT completa", descricao: "Projeto, aprovação Equatorial Goiás, ARTs, mão de obra especializada, montagem, lançamento, comissionamento e entrega do dossiê técnico.", faturamento: "GTA Energia Ltda", valor: "125.000,00" },
        { num: "02", titulo: "Materiais e equipamentos da rede MT/BT — fornecimento", descricao: "Postes, cabos MT/BT, transformadores, chaves, para-raios, cruzetas, ferragens, isoladores, padrões de entrada e demais componentes. Aquisição direta pelo cliente.", faturamento: "Direto — Cliente (Administração GTA)", valor: "205.000,00" },
      ],
      pagamentos: [
        { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta e assinatura do contrato, para mobilização da equipe e início das atividades", percentual: 60 },
        { parcela: "2ª a N", evento: "Medições quinzenais conforme avanço físico dos serviços — a serem pagas até a conclusão de cada etapa medida", percentual: 30 },
        { parcela: "Final", evento: "Saldo remanescente — após conclusão integral dos serviços, comissionamento e entrega do dossiê técnico", percentual: 10 },
      ],
      cronograma: [
        { etapa: "Aprovação, contrato e 1ª parcela (60%) + disponibilização dos materiais", prazo: "Dia D", responsavel: "Cliente + GTA" },
        { etapa: "Elaboração/revisão do projeto e submissão à Equatorial Goiás", prazo: "D + 1 a D + 15", responsavel: "GTA Energia" },
        { etapa: "Aprovação do projeto pela Equatorial Goiás", prazo: "D + 15 a D + 30*", responsavel: "Equatorial Goiás" },
        { etapa: "Mobilização da equipe e início das obras", prazo: "D + 30", responsavel: "GTA Energia" },
        { etapa: "Execução da rede MT — postes, estruturas e cabeamento", prazo: "D + 30 a D + 55", responsavel: "GTA Energia" },
        { etapa: "Execução da rede BT — cabos, caixas e ligações dos lotes", prazo: "D + 50 a D + 75", responsavel: "GTA Energia" },
        { etapa: "Comissionamento, testes e acompanhamento da vistoria Equatorial", prazo: "D + 75 a D + 85", responsavel: "GTA + Equatorial" },
        { etapa: "Entrega do dossiê técnico e saldo final (10%)", prazo: "D + 90", responsavel: "GTA + Cliente" },
      ],
      prazoDias: 90,
      prazoTotal: "90 dias corridos",
    },
  },
};

// ----- execução --------------------------------------------------------------

const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FIXTURES);

const login = await fetch(`${BASE}/api/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@gta.com", password: "gta123" }),
});
const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
console.log("login:", login.status);

let totalDiffs = 0;
for (const key of keys) {
  const fx = FIXTURES[key];
  if (!fx) {
    console.log(`\n### ${key}: sem fixture`);
    continue;
  }
  const res = await fetch(`${BASE}/api/gerar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ serviceKey: key, formData: fx.formData }),
  });
  console.log(`\n### ${key}: HTTP ${res.status}`);
  if (!res.ok) {
    console.log((await res.text()).slice(0, 800));
    totalDiffs += 99;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(ROOT, "scripts", `_out_${key}.docx`);
  fs.writeFileSync(outPath, buf);

  const g = normalize(extractText(outPath));
  const o = normalize(extractText(fx.original));
  const soO = o.filter((l) => !g.includes(l));
  const soG = g.filter((l) => !o.includes(l));
  console.log(`linhas: original ${o.length} | gerado ${g.length} | diffs ${soO.length + soG.length}`);
  soO.forEach((l) => console.log("  - " + l.slice(0, 160)));
  soG.forEach((l) => console.log("  + " + l.slice(0, 160)));
  totalDiffs += soO.length + soG.length;
}
console.log(`\n=== TOTAL de linhas diferentes: ${totalDiffs} ===`);

function extractText(file) {
  const z = new PizZip(fs.readFileSync(file));
  let xml = z.file("word/document.xml").asText();
  xml = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t").replace(/<[^>]+>/g, "");
  return xml
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
function normalize(t) {
  return t.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}
