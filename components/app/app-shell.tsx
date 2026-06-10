"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { navForRole } from "@/lib/nav";
import { ROLE_LABELS, type Profile } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { APP_NAME, LOGO_PATH } from "@/lib/constants";

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

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-navy text-white"
                : "text-slate-200 hover:bg-white/10",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col bg-brand-navy">
      <Link
        href="/dashboard"
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 px-4 py-4 transition-colors hover:bg-white/5"
      >
        <Image
          src={LOGO_PATH}
          alt={APP_NAME}
          width={140}
          height={76}
          className="h-9 w-auto rounded bg-white/95 p-1"
        />
        <span className="text-sm font-semibold text-white">{APP_NAME}</span>
      </Link>
      {nav}
      <div className="border-t border-white/10 p-3">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="mb-2 block rounded-md px-2 py-1.5 transition-colors hover:bg-white/10"
        >
          <p className="truncate text-sm font-medium text-white">
            {profile.full_name ?? email}
          </p>
          <p className="text-xs text-slate-300">
            {ROLE_LABELS[profile.role]} · Settings
          </p>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="fixed h-screen w-60">{sidebarInner}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64">{sidebarInner}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-md p-1 text-brand-navy hover:bg-muted"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard" className="font-semibold text-brand-navy">
            {APP_NAME}
          </Link>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
