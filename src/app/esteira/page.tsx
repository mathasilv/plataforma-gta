import { AppHeader } from "@/components/AppHeader";
import { EsteiraBoard } from "@/components/orcamentos/EsteiraBoard";
import { PageHeader } from "@/components/ui";
import { requirePageUser } from "@/lib/session";
import { permissoesDoUsuario } from "@/lib/rbac/resolve";

/** Esteira de validação de orçamentos. */
export default async function EsteiraPage() {
  const user = await requirePageUser();
  const perms = Array.from(await permissoesDoUsuario(user));

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <PageHeader
          title="Esteira de orçamentos"
          subtitle="Cada orçamento passa por revisão e aprovação antes de ser liberado."
        />
        <div className="mt-6">
          <EsteiraBoard perms={perms} />
        </div>
      </main>
    </div>
  );
}
