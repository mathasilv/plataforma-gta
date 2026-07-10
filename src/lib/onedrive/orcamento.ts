import type { Orcamento, OrcamentoOneDrive } from "@/lib/orcamentos/types";
import { lerAnexo } from "@/lib/orcamentos/anexo-store";
import { enviarParaPasta, pastaBase, oneDriveConfigurado, type ArquivoUpload } from "./graph";

/** Remove caracteres inválidos para nome de pasta do OneDrive/SharePoint. */
function limpar(s: string): string {
  return s.replace(/[\\/:*?"<>|#%]/g, "-").replace(/\s+/g, " ").trim();
}

/**
 * Código da pasta do orçamento: ano-mês · SERVIÇO · cliente · referência.
 * Ex.: "2026-07 · SOLAR · Fazenda Rio Doce · GTA-2026-FAZENDA-ORC-001".
 * Identifica de imediato serviço, mês, ano e cliente; a referência garante unicidade.
 */
export function pastaDoOrcamento(orc: Orcamento): string {
  const iso = orc.meta?.dataEmissao ? `${orc.meta.dataEmissao}T12:00:00` : orc.criadoEm;
  let d = new Date(iso);
  if (Number.isNaN(d.getTime())) d = new Date(orc.criadoEm);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const servico = (orc.serviceKey || (orc.fonte === "externo" ? "externo" : "servico")).toUpperCase();
  const partes = [`${ano}-${mes}`, servico, orc.cliente, orc.referencia].map(limpar).filter(Boolean);
  return partes.join(" · ").slice(0, 120);
}

/**
 * Cria a pasta do orçamento no OneDrive e envia todos os anexos (revisões + o
 * .docx da Rev 00). Lança se algo estrutural falhar (token/pasta); erros por
 * arquivo individual voltam em `erro` sem interromper os demais.
 */
export async function enviarOrcamentoParaOneDrive(orc: Orcamento): Promise<OrcamentoOneDrive> {
  const nome = pastaDoOrcamento(orc);
  const arquivos: ArquivoUpload[] = [];
  const erros: string[] = [];
  for (const a of orc.anexos) {
    try {
      arquivos.push({ nome: a.nome, bytes: await lerAnexo(a), contentType: a.contentType });
    } catch (e) {
      erros.push(`${a.nome}: ${e instanceof Error ? e.message : "não foi possível ler o anexo"}`);
    }
  }
  const r = await enviarParaPasta([pastaBase(), nome], arquivos);
  erros.push(...r.erros);
  return {
    pasta: nome,
    url: r.webUrl,
    arquivos: r.enviados,
    enviadoEm: new Date().toISOString(),
    erro: erros.length ? erros.join("; ").slice(0, 500) : undefined,
  };
}

export { oneDriveConfigurado };
