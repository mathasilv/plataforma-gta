import Link from "next/link";
import { SERVICES } from "@/services/registry";
import { AppHeader } from "@/components/AppHeader";
import { requirePageUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gta-navy">Nova proposta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o serviço para gerar uma proposta comercial em .docx.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link
              key={s.key}
              href={`/nova/${s.key}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gta-indigo hover:shadow-md"
            >
              <div className="text-3xl">{s.icon}</div>
              <div className="mt-3 font-semibold text-gta-navy group-hover:text-gta-indigo">
                {s.label}
              </div>
              <p className="mt-1 text-sm text-slate-500">{s.description}</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Cada proposta gerada é fiel ao modelo oficial da GTA Energia (.docx). Para adicionar um novo
          tipo de serviço, basta criar um novo módulo em src/services.
        </p>
      </main>
    </div>
  );
}
