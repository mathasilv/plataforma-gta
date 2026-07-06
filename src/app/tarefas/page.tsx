import { AppHeader } from "@/components/AppHeader";
import { TaskList } from "@/components/tasks/TaskList";
import { requirePageUser } from "@/lib/session";

export default async function TarefasPage() {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen">
      <AppHeader userName={user.name} isAdmin={user.role === "admin"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gta-navy">Tarefas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organize e acompanhe as tarefas da equipe GTA.
        </p>
        <div className="mt-6">
          <TaskList currentUserEmail={user.email} />
        </div>
      </main>
    </div>
  );
}
