import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getService } from "@/services/registry";
import { AppHeader } from "@/components/AppHeader";
import { ServiceIcon } from "@/components/ServiceIcon";
import { requirePageUser } from "@/lib/session";
import { SERVICOS_COM_AJUDA } from "@/components/ajuda/disponivel";
import { SolarAjuda } from "@/components/ajuda/SolarAjuda";

/** Conteúdo da ajuda por serviço. Adicione um case ao criar o componente. */
function conteudoAjuda(servico: string) {
  switch (servico) {
    case "solar":
      return <SolarAjuda />;
    default:
      return null;
  }
}

export default async function AjudaServicoPage({ params }: { params: Promise<{ servico: string }> }) {
  const { servico } = await params;
  const service = getService(servico);
  if (!service || !SERVICOS_COM_AJUDA.has(servico)) notFound();
  const conteudo = conteudoAjuda(servico);
  if (!conteudo) notFound();

  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link href={`/nova/${servico}`} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-gta-indigo dark:text-slate-300 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao configurador
          </Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-gta-navy sm:gap-2.5 sm:text-2xl dark:text-slate-100">
            <ServiceIcon serviceKey={service.key} className="h-6 w-6 shrink-0 text-gta-indigo sm:h-7 sm:w-7 dark:text-indigo-300" />
            Como precificar — {service.label}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tutorial, fórmulas e valores padrão de precificação deste serviço.</p>
        </div>
        {conteudo}
      </main>
    </div>
  );
}
