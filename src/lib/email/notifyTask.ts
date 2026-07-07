import type { Task } from "@/lib/tasks/types";
import { prioridadeLabel } from "@/lib/tasks/types";
import { users } from "@/lib/users/store";
import { sendEmail } from "./send";

/**
 * Notifica por e-mail o responsável quando uma tarefa é criada para ele.
 * Totalmente best-effort: nunca lança (a criação da tarefa não pode quebrar por
 * causa do e-mail) e é no-op se o envio não estiver configurado.
 */
export async function notifyTaskAssigned(task: Task): Promise<void> {
  try {
    // Sem responsável, ou o criador atribuiu a si mesmo: não faz sentido notificar.
    if (!task.responsavel) return;
    if (task.responsavel.trim().toLowerCase() === task.criadoPor.trim().toLowerCase()) return;

    const store = await users();
    const resp = await store.getByEmail(task.responsavel);
    if (!resp || resp.active === false) return; // responsável não é usuário ativo

    const criador = await store.getByEmail(task.criadoPor);
    const criadorNome = criador?.name || task.criadoPor;

    const { subject, html, text } = montarEmail(task, resp.name, criadorNome);
    const r = await sendEmail({ to: resp.email, subject, html, text, replyTo: task.criadoPor });
    if (r.ok === false && "error" in r) {
      console.error("Notificação de tarefa: falha no envio —", r.error);
    }
  } catch (e) {
    console.error("Notificação de tarefa: erro inesperado —", e);
  }
}

// ------------------------------------------------------------------ conteúdo

const COR = { navy: "#1A2F4A", indigo: "#5B4FCF", laranja: "#F26522", cinza: "#64748b", borda: "#e2e8f0" };
const PRIORIDADE_COR: Record<string, string> = { alta: "#dc2626", media: "#d97706", baixa: "#64748b" };

function baseUrl(): string {
  const u = process.env.APP_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return u.replace(/\/$/, "");
}

function fmtPrazo(prazo: string): string {
  if (!prazo) return "Sem prazo definido";
  const [y, m, d] = prazo.split("-");
  return y && m && d ? `${d}/${m}/${y}` : prazo;
}

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function montarEmail(task: Task, respNome: string, criadorNome: string) {
  const prio = prioridadeLabel(task.prioridade);
  const prioCor = PRIORIDADE_COR[task.prioridade] ?? COR.cinza;
  const prazo = fmtPrazo(task.prazo);
  const base = baseUrl();

  const subject = `Nova tarefa: ${task.titulo}`;

  const linha = (rotulo: string, valor: string) =>
    `<tr>
       <td style="padding:6px 0;color:${COR.cinza};font-size:13px;width:120px;vertical-align:top">${esc(rotulo)}</td>
       <td style="padding:6px 0;color:${COR.navy};font-size:14px;font-weight:600">${valor}</td>
     </tr>`;

  const botao = base
    ? `<a href="${base}/tarefas" style="display:inline-block;background:${COR.indigo};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:8px">Abrir no painel</a>`
    : "";

  const html = `
  <div style="background:#f5f6f8;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${COR.borda};border-radius:12px;overflow:hidden">
        <tr><td style="background:${COR.navy};padding:16px 24px">
          <span style="color:#fff;font-size:16px;font-weight:700">Plataforma GTA</span>
          <span style="color:#c7cdd6;font-size:13px"> · Nova tarefa atribuída a você</span>
        </td></tr>
        <tr><td style="padding:24px">
          <p style="margin:0 0 4px;color:${COR.navy};font-size:15px">Olá, ${esc(respNome)},</p>
          <p style="margin:0 0 16px;color:${COR.cinza};font-size:14px">${esc(criadorNome)} criou uma tarefa e definiu você como responsável:</p>
          <div style="border:1px solid ${COR.borda};border-left:4px solid ${COR.laranja};border-radius:8px;padding:16px">
            <p style="margin:0 0 10px;color:${COR.navy};font-size:17px;font-weight:700">${esc(task.titulo)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${task.cliente ? linha("Cliente/Obra", esc(task.cliente)) : ""}
              ${linha("Prioridade", `<span style="display:inline-block;background:${prioCor}1a;color:${prioCor};font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px">${esc(prio)}</span>`)}
              ${linha("Prazo", esc(prazo))}
              ${linha("Criada por", esc(criadorNome))}
            </table>
            ${task.descricao ? `<p style="margin:14px 0 0;padding-top:12px;border-top:1px solid ${COR.borda};color:${COR.navy};font-size:14px;white-space:pre-wrap">${esc(task.descricao)}</p>` : ""}
          </div>
          ${botao ? `<p style="margin:20px 0 0">${botao}</p>` : ""}
        </td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid ${COR.borda};color:${COR.cinza};font-size:12px">
          Você recebeu este e-mail porque é responsável por uma tarefa na Plataforma GTA · GTA Energia.
        </td></tr>
      </table>
    </td></tr></table>
  </div>`;

  const text =
    `Nova tarefa atribuída a você\n\n` +
    `${task.titulo}\n` +
    (task.cliente ? `Cliente/Obra: ${task.cliente}\n` : "") +
    `Prioridade: ${prio}\n` +
    `Prazo: ${prazo}\n` +
    `Criada por: ${criadorNome}\n` +
    (task.descricao ? `\n${task.descricao}\n` : "") +
    (base ? `\nAbrir no painel: ${base}/tarefas\n` : "");

  return { subject, html, text };
}
