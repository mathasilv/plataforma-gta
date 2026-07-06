"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Propostas" },
  { href: "/tarefas", label: "Tarefas" },
];

export function AppHeader({ userName }: { userName?: string }) {
  const router = useRouter();
  const pathname = usePathname();

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
        <div className="flex items-center gap-4 text-sm">
          {userName && <span className="hidden text-slate-300 sm:inline">{userName}</span>}
          <button onClick={logout} className="rounded border border-white/30 px-3 py-1 hover:bg-white/10">
            Sair
          </button>
        </div>
      </div>
      <div className="h-1 w-full bg-gta-orange" />
    </header>
  );
}
