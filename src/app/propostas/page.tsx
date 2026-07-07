import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PropostasList } from "@/components/propostas/PropostasList";
import { requirePageUser } from "@/lib/session";

export default async function PropostasPage() {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gta-navy dark:text-slate-100">Orçamentos gerados</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Todas as propostas geradas na plataforma, de qualquer serviço. Filtre por cliente, serviço,
              criador ou status; as de Solar podem ser reabertas para continuar.
            </p>
          </div>
          <Link href="/" className="btn-primary whitespace-nowrap">
            + Nova proposta
          </Link>
        </div>

        <PropostasList />
      </main>
    </div>
  );
}
