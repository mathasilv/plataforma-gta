"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PRIORIDADES,
  STATUS_TAREFA,
  type Prioridade,
  type StatusTarefa,
  type Task,
} from "@/lib/tasks/types";

interface Usuario {
  email: string;
  name: string;
}

const PRIORIDADE_PESO: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

const PRIORIDADE_BADGE: Record<Prioridade, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-amber-100 text-amber-700",
  baixa: "bg-slate-100 text-slate-600",
};

const STATUS_BADGE: Record<StatusTarefa, string> = {
  afazer: "border-slate-300 bg-white text-slate-700",
  andamento: "border-gta-indigo/40 bg-indigo-50 text-gta-indigo",
  concluida: "border-green-300 bg-green-50 text-green-700",
};

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function atrasada(t: Task): boolean {
  return Boolean(t.prazo) && t.prazo < hoje() && t.status !== "concluida";
}

function formatPrazo(prazo: string): string {
  if (!prazo) return "—";
  const [y, m, d] = prazo.split("-");
  return `${d}/${m}/${y}`;
}

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface FormState {
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: Prioridade;
  prazo: string;
}

const FORM_VAZIO: FormState = { titulo: "", descricao: "", responsavel: "", prioridade: "media", prazo: "" };

export function TaskList({ currentUserEmail }: { currentUserEmail: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // filtros
  const [fStatus, setFStatus] = useState<string>("ativas");
  const [fResp, setFResp] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  // formulário de nova tarefa
  const [novaAberta, setNovaAberta] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // linha expandida
  const [abertaId, setAbertaId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rt, ru] = await Promise.all([fetch("/api/tarefas"), fetch("/api/usuarios")]);
        const dt = await rt.json();
        const du = await ru.json();
        setTasks(dt.tasks ?? []);
        setUsuarios(du.usuarios ?? []);
      } catch {
        setErro("Falha ao carregar as tarefas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nomeDe = useMemo(() => {
    const map = new Map(usuarios.map((u) => [u.email, u.name]));
    return (email: string) => map.get(email) ?? email;
  }, [usuarios]);

  const visiveis = useMemo(() => {
    let list = [...tasks];
    if (fStatus === "ativas") list = list.filter((t) => t.status !== "concluida");
    else if (fStatus !== "todas") list = list.filter((t) => t.status === fStatus);
    if (fResp !== "todos") list = list.filter((t) => t.responsavel === fResp);
    const q = busca.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.titulo.toLowerCase().includes(q) || t.descricao.toLowerCase().includes(q),
      );
    }
    // ordenação: concluídas por último; depois atrasadas primeiro; prazo mais próximo; prioridade
    list.sort((a, b) => {
      const ca = a.status === "concluida" ? 1 : 0;
      const cb = b.status === "concluida" ? 1 : 0;
      if (ca !== cb) return ca - cb;
      const aa = atrasada(a) ? 0 : 1;
      const ab = atrasada(b) ? 0 : 1;
      if (aa !== ab) return aa - ab;
      const pa = a.prazo || "9999-12-31";
      const pb = b.prazo || "9999-12-31";
      if (pa !== pb) return pa < pb ? -1 : 1;
      return PRIORIDADE_PESO[a.prioridade] - PRIORIDADE_PESO[b.prioridade];
    });
    return list;
  }, [tasks, fStatus, fResp, busca]);

  function aplicar(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "afazer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar a tarefa.");
      setTasks((prev) => [...prev, data.task]);
      setForm(FORM_VAZIO);
      setNovaAberta(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizar(id: string, patch: Record<string, unknown>) {
    setErro(null);
    const res = await fetch(`/api/tarefas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error ?? "Falha ao atualizar.");
      return;
    }
    aplicar(data.task);
  }

  async function excluir(id: string, titulo: string) {
    if (!window.confirm(`Excluir a tarefa "${titulo}"?`)) return;
    const res = await fetch(`/api/tarefas/${id}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function comentar(id: string, texto: string) {
    const res = await fetch(`/api/tarefas/${id}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const data = await res.json();
    if (res.ok) aplicar(data.task);
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando tarefas...</p>;

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          className="btn-primary"
          onClick={() => {
            setNovaAberta((v) => !v);
            setForm((f) => ({ ...f, responsavel: f.responsavel || currentUserEmail }));
          }}
        >
          {novaAberta ? "Fechar" : "+ Nova tarefa"}
        </button>
        <select className="field-input !w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="ativas">Ativas (padrão)</option>
          <option value="todas">Todas</option>
          {STATUS_TAREFA.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select className="field-input !w-auto" value={fResp} onChange={(e) => setFResp(e.target.value)}>
          <option value="todos">Todos os responsáveis</option>
          {usuarios.map((u) => (
            <option key={u.email} value={u.email}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          className="field-input !w-56"
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <span className="ml-auto text-xs text-slate-400">
          {visiveis.length} tarefa{visiveis.length === 1 ? "" : "s"}
        </span>
      </div>

      {erro && <p className="field-error">{erro}</p>}

      {/* nova tarefa */}
      {novaAberta && (
        <form onSubmit={criar} className="rounded-xl border border-gta-indigo/30 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gta-navy">Nova tarefa</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label className="field-label">Título *</label>
              <input className="field-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
            </div>
            <div className="sm:col-span-6">
              <label className="field-label">Descrição</label>
              <textarea className="field-input min-h-[70px]" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Responsável *</label>
              <select className="field-input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} required>
                <option value="">Selecione...</option>
                {usuarios.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Prioridade</label>
              <select className="field-input" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value as Prioridade })}>
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Prazo</label>
              <input type="date" className="field-input" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
            </div>
          </div>
          <div className="mt-3">
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar tarefa"}
            </button>
          </div>
        </form>
      )}

      {/* lista */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tarefa</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Prazo</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma tarefa encontrada. Crie a primeira com “+ Nova tarefa”.
                </td>
              </tr>
            )}
            {visiveis.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                aberta={abertaId === t.id}
                onToggle={() => setAbertaId(abertaId === t.id ? null : t.id)}
                nomeDe={nomeDe}
                usuarios={usuarios}
                onStatus={(s) => atualizar(t.id, { status: s })}
                onPatch={(patch) => atualizar(t.id, patch)}
                onExcluir={() => excluir(t.id, t.titulo)}
                onComentar={(texto) => comentar(t.id, texto)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskRow({
  task: t,
  aberta,
  onToggle,
  nomeDe,
  usuarios,
  onStatus,
  onPatch,
  onExcluir,
  onComentar,
}: {
  task: Task;
  aberta: boolean;
  onToggle: () => void;
  nomeDe: (email: string) => string;
  usuarios: Usuario[];
  onStatus: (s: StatusTarefa) => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onExcluir: () => void;
  onComentar: (texto: string) => void;
}) {
  const concluida = t.status === "concluida";
  const late = atrasada(t);
  const [comentario, setComentario] = useState("");
  const [editando, setEditando] = useState(false);
  const [edit, setEdit] = useState<FormState>({
    titulo: t.titulo,
    descricao: t.descricao,
    responsavel: t.responsavel,
    prioridade: t.prioridade,
    prazo: t.prazo,
  });

  return (
    <>
      <tr className={`border-t border-slate-100 ${concluida ? "opacity-50" : ""} ${late ? "bg-red-50/40" : ""}`}>
        <td className="px-4 py-2">
          <select
            value={t.status}
            onChange={(e) => onStatus(e.target.value as StatusTarefa)}
            className={`rounded-full border px-2 py-1 text-xs font-medium ${STATUS_BADGE[t.status]}`}
          >
            {STATUS_TAREFA.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2">
          <button onClick={onToggle} className={`text-left font-medium text-gta-navy hover:text-gta-indigo ${concluida ? "line-through" : ""}`}>
            {t.titulo}
          </button>
          {t.comentarios.length > 0 && (
            <span className="ml-2 text-xs text-slate-400">💬 {t.comentarios.length}</span>
          )}
        </td>
        <td className="px-4 py-2 text-slate-600">{nomeDe(t.responsavel)}</td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_BADGE[t.prioridade]}`}>
            {PRIORIDADES.find((p) => p.value === t.prioridade)?.label}
          </span>
        </td>
        <td className={`px-4 py-2 ${late ? "font-semibold text-red-600" : "text-slate-600"}`}>
          {formatPrazo(t.prazo)}
          {late && <span className="ml-1 text-xs">(atrasada)</span>}
        </td>
        <td className="px-2 py-2 text-center">
          <button onClick={onExcluir} className="text-slate-300 hover:text-red-600" title="Excluir">
            ✕
          </button>
        </td>
      </tr>
      {aberta && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={6} className="px-6 py-4">
            {!editando ? (
              <div className="space-y-3">
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {t.descricao || <span className="italic text-slate-400">Sem descrição.</span>}
                </p>
                <p className="text-xs text-slate-400">
                  Criada por {nomeDe(t.criadoPor)} em {formatDataHora(t.criadoEm)} · Atualizada em {formatDataHora(t.atualizadoEm)}
                </p>
                <button className="btn-secondary !py-1 text-xs" onClick={() => setEditando(true)}>
                  Editar tarefa
                </button>
              </div>
            ) : (
              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  onPatch(edit as unknown as Record<string, unknown>);
                  setEditando(false);
                }}
              >
                <div className="sm:col-span-6">
                  <label className="field-label">Título</label>
                  <input className="field-input" value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} required />
                </div>
                <div className="sm:col-span-6">
                  <label className="field-label">Descrição</label>
                  <textarea className="field-input min-h-[70px]" value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label">Responsável</label>
                  <select className="field-input" value={edit.responsavel} onChange={(e) => setEdit({ ...edit, responsavel: e.target.value })}>
                    {usuarios.map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label">Prioridade</label>
                  <select className="field-input" value={edit.prioridade} onChange={(e) => setEdit({ ...edit, prioridade: e.target.value as Prioridade })}>
                    {PRIORIDADES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label">Prazo</label>
                  <input type="date" className="field-input" value={edit.prazo} onChange={(e) => setEdit({ ...edit, prazo: e.target.value })} />
                </div>
                <div className="flex gap-2 sm:col-span-6">
                  <button type="submit" className="btn-primary !py-1 text-xs">
                    Salvar
                  </button>
                  <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => setEditando(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* comentários */}
            <div className="mt-4 border-t border-slate-200 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Comentários ({t.comentarios.length})
              </h3>
              <ul className="space-y-2">
                {t.comentarios.map((c) => (
                  <li key={c.id} className="rounded-md bg-white p-2 text-sm shadow-sm">
                    <span className="font-medium text-gta-navy">{c.autor}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatDataHora(c.em)}</span>
                    <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{c.texto}</p>
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comentario.trim()) {
                    onComentar(comentario.trim());
                    setComentario("");
                  }
                }}
              >
                <input
                  className="field-input"
                  placeholder="Escreva um comentário..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
                <button type="submit" className="btn-secondary">
                  Comentar
                </button>
              </form>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
