import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PropostasList } from "@/components/propostas/PropostasList";
import { PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/session";
import { temPermissao } from "@/lib/rbac/resolve";

export default async function PropostasPage() {
  const user = await requirePageUser();
  const podeEnviar = await temPermissao(user, "orcamentos.criar");

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="app-container py-8">
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

        <PropostasList podeEnviar={podeEnviar} />
      </main>
    </div>
  );
}
