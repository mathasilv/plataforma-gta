"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Nova proposta" },
  { href: "/propostas", label: "Orçamentos" },
  { href: "/tarefas", label: "Tarefas" },
];

export function AppHeader({ userName, isAdmin }: { userName?: string; isAdmin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // estado inicial do tema (o script no <head> já aplicou a classe)
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  // fecha o menu do usuário ao clicar fora
  useEffect(() => {
    if (!menuAberto) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuAberto]);

  function alternarTema() {
    const novo = !dark;
    setDark(novo);
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "dark" : "light");
    } catch {
      /* localStorage indisponível — ignora */
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" || pathname.startsWith("/nova") : pathname.startsWith(href);
  }

  return (
    <header className="bg-gradient-to-r from-gta-navy to-gta-navy2 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/gta-icon.png" alt="GTA" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">GTA Energia</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-1.5 transition ${
                  isActive(item.href)
                    ? "bg-white/15 font-semibold text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {userName && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="flex items-center gap-2 rounded border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
              aria-haspopup="menu"
              aria-expanded={menuAberto}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                {userName.trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[160px] truncate sm:inline">{userName}</span>
              <svg className={`h-3 w-3 transition ${menuAberto ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {menuAberto && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <div className="text-xs text-slate-400 dark:text-slate-500">Sessão</div>
                  <div className="truncate text-sm font-semibold text-gta-navy dark:text-slate-100">{userName}</div>
                </div>
                <MenuLink href="/conta" onNavigate={() => setMenuAberto(false)}>
                  Minha conta
                </MenuLink>
                {isAdmin && (
                  <MenuLink href="/admin/usuarios" onNavigate={() => setMenuAberto(false)}>
                    Gerenciar usuários
                  </MenuLink>
                )}
                <button
                  onClick={alternarTema}
                  role="menuitem"
                  className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  <span>Tema {dark ? "escuro" : "claro"}</span>
                  <span aria-hidden>{dark ? "🌙" : "☀️"}</span>
                </button>
                <button
                  onClick={logout}
                  role="menuitem"
                  className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-slate-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-slate-700"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="h-1 w-full bg-gta-orange" />
    </header>
  );
}

function MenuLink({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="block px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
    >
      {children}
    </Link>
  );
}
