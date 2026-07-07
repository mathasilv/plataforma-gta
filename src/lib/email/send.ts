/**
 * Envio de e-mail transacional via Resend (API HTTP — sem dependências novas).
 *
 * DORMENTE por padrão: se `RESEND_API_KEY` não estiver definido, `sendEmail`
 * retorna `{ skipped: true }` e nada é enviado. Assim o recurso pode ser mesclado
 * sem configuração e ativado depois apenas com variáveis de ambiente na Vercel:
 *   - RESEND_API_KEY  (obrigatória para ativar)
 *   - EMAIL_FROM      (ex.: "GTA Energia <tarefas@gtaenergia.com>")
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export type EmailResult =
  | { ok: true }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

/** Remetente. Configure EMAIL_FROM; o padrão só entrega para o dono da conta Resend. */
function remetente(): string {
  return process.env.EMAIL_FROM?.trim() || "GTA Energia <onboarding@resend.dev>";
}

/** true quando há credencial configurada (o envio está ativo). */
export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      return { ok: false, error: `Resend HTTP ${res.status}: ${detalhe.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "falha ao enviar e-mail" };
  }
}
