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
        <h1 className="text-2xl font-bold text-gta-navy dark:text-slate-100">Minha conta</h1>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <dl className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-3 sm:gap-y-2">
            <dt className="text-slate-500 dark:text-slate-400">Nome</dt>
            <dd className="font-medium text-gta-navy sm:col-span-2 dark:text-slate-100">{user.name}</dd>
            <dt className="mt-2 text-slate-500 sm:mt-0 dark:text-slate-400">E-mail</dt>
            <dd className="break-all text-slate-700 sm:col-span-2 dark:text-slate-300">{user.email}</dd>
            <dt className="mt-2 text-slate-500 sm:mt-0 dark:text-slate-400">Perfil</dt>
            <dd className="text-slate-700 sm:col-span-2 dark:text-slate-300">{ROLE_LABEL[user.role]}</dd>
          </dl>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-semibold text-gta-navy dark:text-slate-100">Alterar senha</h2>
          <ChangePasswordForm requireCurrent />
        </section>
      </main>
    </div>
  );
}
