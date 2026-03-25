"use client";

import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  const stats = [
    { label: t.admin.stats.bookingsToday, value: "—", icon: "📅", accent: "border-[var(--amilcar-red)]/30" },
    { label: t.admin.stats.monthlyRevenue, value: "—", icon: "💰", accent: "border-green-500/30" },
    { label: t.admin.stats.workers, value: "—", icon: "👷", accent: "border-[var(--amilcar-silver)]/30" },
    { label: t.admin.stats.clients, value: "—", icon: "👥", accent: "border-[var(--amilcar-navy)]/50" },
  ];

  const quickActions = [
    { label: t.admin.actions.bookings, desc: t.admin.actions.bookingsDesc, icon: "📋", href: "/dashboard/admin/bookings" },
    { label: t.admin.actions.services, desc: t.admin.actions.servicesDesc, icon: "🛠️", href: "/dashboard/admin/services" },
    { label: t.admin.actions.workers, desc: t.admin.actions.workersDesc, icon: "👥", href: "/dashboard/admin/workers" },
    { label: t.admin.actions.inventory, desc: t.admin.actions.inventoryDesc, icon: "📦", href: "/dashboard/admin/inventory" },
    { label: t.admin.actions.clients, desc: t.admin.actions.clientsDesc, icon: "👤", href: "/dashboard/admin/clients" },
    { label: t.admin.actions.finance, desc: t.admin.actions.financeDesc, icon: "📊", href: "#" },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {t.admin.welcome} {user?.full_name} 👋
        </h1>
        <p className="mt-1 text-[var(--amilcar-text-secondary)]">{t.admin.subtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5 transition hover:border-white/10 ${stat.accent}`}
          >
            <span className="text-2xl">{stat.icon}</span>
            <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-[var(--amilcar-text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="mb-4 text-lg font-semibold text-white">{t.admin.quickActions}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5 text-right transition hover:border-[var(--amilcar-red)]/30 hover:bg-[var(--amilcar-hover)]"
          >
            <span className="mt-0.5 text-xl">{action.icon}</span>
            <div>
              <span className="font-semibold text-white">{action.label}</span>
              <span className="mt-1 block text-sm text-[var(--amilcar-text-secondary)]">{action.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
