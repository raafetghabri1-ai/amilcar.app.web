"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import Image from "next/image";
import Link from "next/link";
import type { UserRole } from "@/lib/api";
import type { ReactNode } from "react";

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-[var(--amilcar-red)]",
  worker: "bg-[var(--amilcar-silver)]",
  client: "bg-[var(--amilcar-navy)]",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[var(--amilcar-black-soft)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href={`/dashboard/${user.role}`} className="flex items-center gap-3 transition hover:opacity-80">
            <Image
              src="/logo.png"
              alt="AMILCAR"
              width={36}
              height={36}
              className="rounded"
            />
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wide text-white">AMILCAR</span>
              <span className="hidden sm:inline text-xs text-[var(--amilcar-silver-dark)]">Auto Care</span>
            </div>
          </Link>

          {/* Admin Nav Links */}
          {user.role === "admin" && (
            <div className="hidden md:flex items-center gap-1">
              {[
                { href: "/dashboard/admin", label: t.nav.dashboard },
                { href: "/dashboard/admin/bookings", label: t.nav.bookings },
                { href: "/dashboard/admin/services", label: t.nav.services },
                { href: "/dashboard/admin/workers", label: t.nav.workers },
                { href: "/dashboard/admin/inventory", label: t.nav.inventory },
                { href: "/dashboard/admin/clients", label: t.nav.clients },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    pathname === link.href
                      ? "bg-[var(--amilcar-red)]/10 text-[var(--amilcar-red)] font-medium"
                      : "text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="/live"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5 transition flex items-center gap-1"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--amilcar-red)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--amilcar-red)]" />
                </span>
                {t.nav.live}
              </a>
            </div>
          )}

          {/* Worker Nav Links */}
          {user.role === "worker" && (
            <div className="hidden md:flex items-center gap-1">
              {[
                { href: "/dashboard/worker", label: t.nav.dashboard },
                { href: "/dashboard/worker/bookings", label: t.nav.myBookings },
                { href: "/dashboard/worker/attendance", label: t.nav.attendance },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    pathname === link.href
                      ? "bg-[var(--amilcar-red)]/10 text-[var(--amilcar-red)] font-medium"
                      : "text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="/live"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5 transition flex items-center gap-1"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--amilcar-red)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--amilcar-red)]" />
                </span>
                {t.nav.live}
              </a>
            </div>
          )}

          {/* Client Nav Links */}
          {user.role === "client" && (
            <div className="hidden md:flex items-center gap-1">
              {[
                { href: "/dashboard/client", label: t.clientNav.home },
                { href: "/dashboard/client/booking", label: t.clientNav.booking },
                { href: "/dashboard/client/tracking", label: t.clientNav.tracking },
                { href: "/dashboard/client/services", label: t.clientNav.services },
                { href: "/dashboard/client/store", label: t.clientNav.store },
                { href: "/dashboard/client/profile", label: t.clientNav.profile },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    pathname === link.href
                      ? "bg-[var(--amilcar-red)]/10 text-[var(--amilcar-red)] font-medium"
                      : "text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* User Info + Language + Logout */}
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/dashboard/settings"
              className={`rounded-lg p-1.5 transition ${
                pathname === "/dashboard/settings"
                  ? "bg-[var(--amilcar-red)]/10 text-[var(--amilcar-red)]"
                  : "text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5"
              }`}
              title={t.nav.settings}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <div className="text-left">
              <p className="text-sm font-medium text-white">{user.full_name}</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${ROLE_COLORS[user.role]}`}
                />
                <span className="text-xs text-[var(--amilcar-text-secondary)]">
                  {t.roles[user.role]}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--amilcar-silver)] transition hover:border-[var(--amilcar-red)]/50 hover:text-[var(--amilcar-red)]"
            >
              {t.logout}
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[var(--amilcar-black-soft)]/80 py-4 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--amilcar-text-muted)]">
          <p>{t.copyright}</p>
          <div className="flex items-center gap-4">
            <a href="tel:+21697038792" className="flex items-center gap-1 transition hover:text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              +216 97 038 792
            </a>
            <a href="mailto:amilcarautocare@gmail.com" className="flex items-center gap-1 transition hover:text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              amilcarautocare@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
