import { AppHeader } from "@/components/AppHeader";
import { ChangePasswordForm } from "@/components/users/ChangePasswordForm";
import { requirePageUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/users/types";

/** Página "Minha conta": dados do usuário e troca voluntária de senha. */
export default async function ContaPage() {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gta-navy">Minha conta</h1>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="grid grid-cols-3 gap-y-2 text-sm">
            <dt className="text-slate-500">Nome</dt>
            <dd className="col-span-2 font-medium text-gta-navy">{user.name}</dd>
            <dt className="text-slate-500">E-mail</dt>
            <dd className="col-span-2 text-slate-700">{user.email}</dd>
            <dt className="text-slate-500">Perfil</dt>
            <dd className="col-span-2 text-slate-700">{ROLE_LABEL[user.role]}</dd>
          </dl>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gta-navy">Alterar senha</h2>
          <ChangePasswordForm requireCurrent />
        </section>
      </main>
    </div>
  );
}
