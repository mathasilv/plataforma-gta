import { AppHeader } from "@/components/AppHeader";
import { UsersAdmin } from "@/components/users/UsersAdmin";
import { requirePageUser } from "@/lib/session";

/** Gestão de usuários — restrito a administradores. */
export default async function AdminUsuariosPage() {
  const user = await requirePageUser({ requireAdmin: true });

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gta-navy">Usuários</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cadastre e gerencie quem tem acesso à plataforma.
        </p>
        <div className="mt-6">
          <UsersAdmin currentUserId={user.id} />
        </div>
      </main>
    </div>
  );
}
