import Link from "next/link";
import { notFound } from "next/navigation";
import { getService } from "@/services/registry";
import { AppHeader } from "@/components/AppHeader";
import { DynamicForm } from "@/components/DynamicForm";
import { SolarConfigurator } from "@/components/solar/SolarConfigurator";
import { SubestacaoConfigurator } from "@/components/subestacao/SubestacaoConfigurator";
import { CarregadorConfigurator } from "@/components/carregador/CarregadorConfigurator";
import { SpdaConfigurator } from "@/components/spda/SpdaConfigurator";
import { ExecucaoSubestacaoConfigurator } from "@/components/execucao-subestacao/ExecucaoSubestacaoConfigurator";
import { ServiceIcon } from "@/components/ServiceIcon";
import { requirePageUser } from "@/lib/session";

export default async function NovaPropostaPage({
  params,
  searchParams,
}: {
  params: Promise<{ servico: string }>;
  searchParams: Promise<{ proposta?: string }>;
}) {
  const { servico } = await params;
  const { proposta } = await searchParams;
  const service = getService(servico);
  if (!service) notFound();

  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gta-indigo hover:underline">
            ← Voltar
          </Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-gta-navy sm:gap-2.5 sm:text-2xl dark:text-slate-100">
            <ServiceIcon serviceKey={service.key} className="h-6 w-6 shrink-0 text-gta-indigo sm:h-7 sm:w-7 dark:text-indigo-300" />
            {service.label}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{service.description}</p>
        </div>

        {service.emDesenvolvimento && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300">
            <span aria-hidden>🚧</span>
            <p>
              <strong>Serviço em desenvolvimento.</strong> A precificação automática e o layout da proposta ainda estão sendo ajustados ao padrão da plataforma (como Solar, Carregador e SPDA). O documento é gerado normalmente — confira os valores antes de enviar.
            </p>
          </div>
        )}

        {service.key === "solar" ? (
          <SolarConfigurator propostaId={proposta} />
        ) : service.key === "projeto-subestacao" ? (
          <SubestacaoConfigurator propostaId={proposta} />
        ) : service.key === "carregador" ? (
          <CarregadorConfigurator propostaId={proposta} />
        ) : service.key === "spda" ? (
          <SpdaConfigurator propostaId={proposta} />
        ) : service.key === "execucao-subestacao" ? (
          <ExecucaoSubestacaoConfigurator propostaId={proposta} />
        ) : (
          <DynamicForm serviceKey={service.key} serviceLabel={service.label} formSchema={service.formSchema} />
        )}
      </main>
    </div>
  );
}
