/** Notificações in-app (sino no cabeçalho). */

export interface Notificacao {
  id: string;
  /** E-mail do destinatário. */
  paraEmail: string;
  /** Categoria (ex.: "orcamento_rejeitado", "orcamento_aprovado") — para extensão futura. */
  tipo: string;
  titulo: string;
  mensagem: string;
  /** Rota interna para onde o clique leva (ex.: /aprovacoes/[id]). "" = sem link. */
  link: string;
  lida: boolean;
  criadoEm: string;
}

export type NovaNotificacao = Omit<Notificacao, "id" | "lida" | "criadoEm">;
