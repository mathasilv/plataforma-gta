import Link from "next/link";
import { SERVICES } from "@/services/registry";
import { AppHeader } from "@/components/AppHeader";
import { ServiceIcon } from "@/components/ServiceIcon";
import { requirePageUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={isAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gta-navy dark:text-slate-100">Nova proposta</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Escolha o serviço para gerar uma proposta comercial em .docx.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link
              key={s.key}
              href={`/nova/${s.key}`}
              className="group block h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-gta-indigo hover:shadow-md sm:p-5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-gta-indigo"
            >
              <span className="inline-flex rounded-lg bg-gta-indigo/10 p-2.5 text-gta-indigo dark:bg-gta-indigo/20 dark:text-indigo-300">
                <ServiceIcon serviceKey={s.key} className="h-6 w-6" />
              </span>
              <div className="mt-3 font-semibold text-gta-navy group-hover:text-gta-indigo dark:text-slate-100">
                {s.label}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.description}</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs text-slate-400 dark:text-slate-500">
          Cada proposta gerada é fiel ao modelo oficial da GTA Energia (.docx). Para adicionar um novo
          tipo de serviço, basta criar um novo módulo em src/services.
        </p>
      </main>
    </div>
  );
}
