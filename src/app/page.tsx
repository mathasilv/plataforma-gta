import Link from "next/link";
import { SERVICES } from "@/services/registry";
import { AppHeader } from "@/components/AppHeader";
import { requirePageUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={isAdmin} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gta-navy">Nova proposta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o serviço para gerar uma proposta comercial em .docx.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => {
            const mostrarParametros = isAdmin && s.usesConfigurator;
            return (
              <div key={s.key} className="relative">
                <Link
                  href={`/nova/${s.key}`}
                  className="group block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gta-indigo hover:shadow-md"
                >
                  <div className="text-3xl">{s.icon}</div>
                  <div className="mt-3 font-semibold text-gta-navy group-hover:text-gta-indigo">
                    {s.label}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{s.description}</p>
                  {mostrarParametros && <span className="mt-3 inline-block text-xs text-slate-400">Configurável ⚙</span>}
                </Link>
                {mostrarParametros && (
                  <Link
                    href="/admin/parametros"
                    className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-xs text-slate-500 shadow-sm transition hover:border-gta-indigo hover:text-gta-indigo"
                    title="Ajustar parâmetros de preço e dimensionamento"
                  >
                    ⚙ Parâmetros
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Cada proposta gerada é fiel ao modelo oficial da GTA Energia (.docx). Para adicionar um novo
          tipo de serviço, basta criar um novo módulo em src/services.
        </p>
      </main>
    </div>
  );
}
