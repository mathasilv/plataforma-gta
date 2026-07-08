import Link from "next/link";
import { SERVICES } from "@/services/registry";
import { AppHeader } from "@/components/AppHeader";
import { ServiceIcon } from "@/components/ServiceIcon";
import { PageHeader, Badge } from "@/components/ui";
import { requirePageUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={isAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <PageHeader title="Nova proposta" subtitle="Escolha o serviço para gerar uma proposta comercial." />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link
              key={s.key}
              href={`/nova/${s.key}`}
              className="group block h-full card p-4 transition hover:-translate-y-0.5 hover:border-gta-indigo hover:shadow-md sm:p-5 dark:hover:border-gta-indigo"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex rounded-lg bg-gta-indigo/10 p-2.5 text-gta-indigo dark:bg-gta-indigo/20 dark:text-indigo-300">
                  <ServiceIcon serviceKey={s.key} className="h-6 w-6" />
                </span>
                {s.emDesenvolvimento && <Badge tone="amber" dot>Em desenvolvimento</Badge>}
              </div>
              <div className="mt-3 font-semibold text-gta-navy group-hover:text-gta-indigo dark:text-slate-100">
                {s.label}
              </div>
              <p className="mt-1 subtitle">{s.description}</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 hint">
          Cada proposta gerada é fiel ao modelo oficial da GTA Energia.
        </p>
      </main>
    </div>
  );
}
