import { AppHeader } from "@/components/AppHeader";
import { SolarParamsForm } from "@/components/admin/SolarParamsForm";
import { requirePageUser } from "@/lib/session";

/** Parâmetros de preço/dimensionamento do Solar — restrito a administradores. */
export default async function AdminParametrosPage() {
  const user = await requirePageUser({ requireAdmin: true });

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gta-navy">Parâmetros do Solar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Custos, imposto, comissão e eficiência usados como padrão em todos os cálculos do
          configurador. Os valores atuais vêm da planilha da GTA — ajuste quando os preços mudarem.
        </p>
        <div className="mt-6">
          <SolarParamsForm />
        </div>
      </main>
    </div>
  );
}
