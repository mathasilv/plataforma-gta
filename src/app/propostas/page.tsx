import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PropostasList } from "@/components/propostas/PropostasList";
import { PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/session";

export default async function PropostasPage() {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <PageHeader
            title="Propostas geradas"
            subtitle="Todas as propostas geradas na plataforma, de qualquer serviço. Filtre por cliente, serviço, criador ou status; as de Solar podem ser reabertas para continuar."
            actions={
              <Link href="/" className="btn-primary whitespace-nowrap">
                + Nova proposta
              </Link>
            }
          />
        </div>

        <PropostasList />
      </main>
    </div>
  );
}
