/**
 * Serviços que já têm página de ajuda "Como precificar" (`/ajuda/[servico]`).
 * O cabeçalho do configurador só mostra o botão de ajuda para estes; a página
 * de ajuda retorna 404 para os demais. Adicione a chave aqui ao criar o conteúdo.
 */
export const SERVICOS_COM_AJUDA = new Set<string>(["solar"]);
