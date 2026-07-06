import Link from "next/link";
import { notFound } from "next/navigation";
import { getService } from "@/services/registry";
import { AppHeader } from "@/components/AppHeader";
import { DynamicForm } from "@/components/DynamicForm";
import { requirePageUser } from "@/lib/session";

export default async function NovaPropostaPage({
  params,
}: {
  params: Promise<{ servico: string }>;
}) {
  const { servico } = await params;
  const service = getService(servico);
  if (!service) notFound();

  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gta-indigo hover:underline">
            ← Voltar
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gta-navy">
            <span>{service.icon}</span> {service.label}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{service.description}</p>
        </div>

        <DynamicForm
          serviceKey={service.key}
          serviceLabel={service.label}
          formSchema={service.formSchema}
        />
      </main>
    </div>
  );
}
