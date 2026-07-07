import { requirePageUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/users/ChangePasswordForm";

/** Troca de senha obrigatória no primeiro acesso (ou após reset pelo admin). */
export default async function TrocarSenhaPage() {
  const user = await requirePageUser({ allowMustChange: true });
  const forcado = user.mustChangePassword;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gta-navy to-gta-navy2 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-800">
        <div className="h-1.5 w-full bg-gta-orange" />
        <div className="p-8">
          <div className="mb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/gta-logo.png" alt="GTA Energia" className="mx-auto h-20 w-auto" />
            <h1 className="mt-3 text-lg font-bold text-gta-navy dark:text-slate-100">Defina sua senha</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {forcado
                ? "Por segurança, crie uma nova senha para continuar."
                : "Atualize a senha da sua conta."}
            </p>
          </div>
          {/* Troca obrigatória: não pede a senha atual (já entrou com ela). */}
          <ChangePasswordForm requireCurrent={!forcado} redirectTo="/" />
        </div>
      </div>
    </main>
  );
}
