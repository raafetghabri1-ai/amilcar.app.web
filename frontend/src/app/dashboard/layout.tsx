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
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
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
                { href: "/dashboard/admin/workers", label: t.nav.workers },
                { href: "/dashboard/admin/inventory", label: t.nav.inventory },
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
      <footer className="border-t border-white/[0.06] bg-[#0a0a0a]/80 py-4 mt-8">
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
