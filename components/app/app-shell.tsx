"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navForRole } from "@/lib/nav";
import { ROLE_LABELS, type Profile } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { BrandLogo } from "@/components/app/logo";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  profile,
  email,
  children,
}: {
  profile: Profile;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navForRole(profile.role);
  const displayName = profile.full_name ?? email;

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/60">
        Menu
      </p>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              active
                ? "bg-gradient-to-r from-brand-blue to-brand-sky text-white shadow-glow"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {active ? (
              <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-orange" />
            ) : null}
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-150",
                !active && "group-hover:scale-110",
              )}
            />
            {item.label}
            {active ? (
              <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-80" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-brand-ink via-brand-navy to-[#0d2b55]">
      {/* decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-blue/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-brand-orange/15 blur-3xl"
      />

      <Link
        href="/dashboard"
        onClick={() => setOpen(false)}
        className="relative flex items-center px-4 py-5 transition-colors hover:bg-white/5"
      >
        <BrandLogo tone="light" withTagline />
      </Link>

      <div className="relative mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative flex flex-1 flex-col overflow-y-auto">{nav}</div>

      <div className="relative border-t border-white/10 p-3">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-amber-500 text-xs font-bold text-white shadow-md ring-2 ring-white/20">
            {initialsOf(displayName) || "U"}
          </span>
          <span className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {displayName}
            </p>
            <p className="truncate text-xs text-sky-200/70">
              {ROLE_LABELS[profile.role]} · Settings
            </p>
          </span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="fixed h-screen w-64">{sidebarInner}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 shadow-2xl">
            {sidebarInner}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-brand-ink to-brand-navy px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard">
            <BrandLogo tone="light" markClassName="h-7 w-7" />
          </Link>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
