"use client";

import { useEffect, useState } from "react";
import { ROLE_LABEL, type PublicUser, type Role } from "@/lib/users/types";

export function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const [usuarios, setUsuarios] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // criação
  const [novoAberto, setNovoAberto] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "member" as Role, senhaProvisoria: "" });
  const [salvando, setSalvando] = useState(false);

  // senha provisória a exibir (após criar ou resetar)
  const [credencial, setCredencial] = useState<{ email: string; senha: string } | null>(null);

  async function carregar() {
    try {
      const res = await fetch("/api/admin/usuarios");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar usuários.");
      setUsuarios(data.usuarios ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, senhaProvisoria: form.senhaProvisoria || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar usuário.");
      setUsuarios((prev) => [...prev, data.user]);
      setCredencial({ email: data.user.email, senha: data.senhaProvisoria });
      setForm({ name: "", email: "", role: "member", senhaProvisoria: "" });
      setNovoAberto(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setSalvando(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setErro(null);
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return setErro(data.error ?? "Falha ao atualizar.");
    setUsuarios((prev) => prev.map((u) => (u.id === id ? data.user : u)));
  }

  async function resetar(u: PublicUser) {
    if (!window.confirm(`Gerar uma nova senha provisória para ${u.name}?`)) return;
    const res = await fetch(`/api/admin/usuarios/${u.id}/reset-senha`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setErro(data.error ?? "Falha ao resetar.");
    setCredencial({ email: u.email, senha: data.senhaProvisoria });
    setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, mustChangePassword: true } : x)));
  }

  async function excluir(u: PublicUser) {
    if (!window.confirm(`Excluir o usuário ${u.name} (${u.email})?`)) return;
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(data.error ?? "Falha ao excluir.");
    setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando usuários...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={() => setNovoAberto((v) => !v)}>
          {novoAberto ? "Fechar" : "+ Novo usuário"}
        </button>
        <span className="ml-auto text-xs text-slate-400">{usuarios.length} usuário(s)</span>
      </div>

      {erro && <p className="field-error">{erro}</p>}

      {/* credencial gerada */}
      {credencial && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm">
          <p className="font-semibold text-green-800">Senha provisória gerada</p>
          <p className="mt-1 text-green-700">
            Entregue estes dados a <strong>{credencial.email}</strong>. A pessoa será obrigada a
            definir uma nova senha no primeiro acesso.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-white px-3 py-1 text-base font-bold tracking-wide text-gta-navy shadow-sm">
              {credencial.senha}
            </code>
            <button
              className="btn-secondary !py-1 text-xs"
              onClick={() => navigator.clipboard?.writeText(credencial.senha)}
            >
              Copiar
            </button>
            <button className="text-xs text-slate-500 hover:underline" onClick={() => setCredencial(null)}>
              Ocultar
            </button>
          </div>
        </div>
      )}

      {/* novo usuário */}
      {novoAberto && (
        <form onSubmit={criar} className="rounded-xl border border-gta-indigo/30 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gta-navy">Novo usuário</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="field-label">Nome *</label>
              <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="sm:col-span-3">
              <label className="field-label">E-mail *</label>
              <input type="email" className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Perfil</label>
              <select className="field-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="sm:col-span-4">
              <label className="field-label">Senha provisória (opcional)</label>
              <input className="field-input" value={form.senhaProvisoria} onChange={(e) => setForm({ ...form, senhaProvisoria: e.target.value })} placeholder="Deixe em branco para gerar automaticamente" />
            </div>
          </div>
          <div className="mt-3">
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </form>
      )}

      {/* tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const eu = u.id === currentUserId;
              return (
                <tr key={u.id} className={`border-t border-slate-100 ${!u.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2 font-medium text-gta-navy">
                    {u.name} {eu && <span className="text-xs font-normal text-slate-400">(você)</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-indigo-100 text-gta-indigo" : "bg-slate-100 text-slate-600"}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {u.active ? (
                      <span className="text-green-700">Ativo</span>
                    ) : (
                      <span className="text-slate-400">Inativo</span>
                    )}
                    {u.mustChangePassword && u.active && (
                      <span className="ml-1 text-xs text-amber-600">(troca pendente)</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button className="text-gta-indigo hover:underline" onClick={() => resetar(u)}>
                        Resetar senha
                      </button>
                      <button
                        className="text-slate-500 hover:underline disabled:opacity-40"
                        disabled={eu}
                        onClick={() => patch(u.id, { role: u.role === "admin" ? "member" : "admin" })}
                      >
                        {u.role === "admin" ? "Tornar membro" : "Tornar admin"}
                      </button>
                      <button
                        className="text-slate-500 hover:underline disabled:opacity-40"
                        disabled={eu}
                        onClick={() => patch(u.id, { active: !u.active })}
                      >
                        {u.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        className="text-red-500 hover:underline disabled:opacity-40"
                        disabled={eu}
                        onClick={() => excluir(u)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
