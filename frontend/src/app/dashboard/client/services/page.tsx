"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { api, type ServiceItem } from "@/lib/api";
import { formatServicePriceLabel, getServicePresentation } from "@/lib/service-presentation";

const CATEGORY_ICONS: Record<string, string> = {
  wash: "🧼",
  polish: "✨",
  ceramic: "💎",
  interior: "🪑",
  exterior: "🚗",
  paint_protection: "🛡️",
  detailing: "🔍",
  other: "⚙️",
};

const CATEGORY_COLORS: Record<string, string> = {
  wash: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
  polish: "from-amber-500/20 to-amber-600/10 border-amber-500/20",
  ceramic: "from-purple-500/20 to-purple-600/10 border-purple-500/20",
  interior: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20",
  exterior: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20",
  paint_protection: "from-red-500/20 to-red-600/10 border-red-500/20",
  detailing: "from-pink-500/20 to-pink-600/10 border-pink-500/20",
  other: "from-gray-500/20 to-gray-600/10 border-gray-500/20",
};

export default function ServicesPage() {
  const { user } = useAuth();
  const { t, locale: lang } = useI18n();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const svcs = await api.get<ServiceItem[]>("/api/v1/services/");
        setServices(svcs.filter((s) => s.is_active));
      } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const filtered = filter === "all" ? services : services.filter((s) => s.category === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/client" className="text-sm text-[var(--amilcar-text-secondary)] hover:text-white transition">← {t.clientNav.home}</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{t.client.services}</h1>
        <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.servicesDesc}</p>
      </div>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "all" ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)] hover:bg-white/10"
          }`}
        >
          {t.client.allServices}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${
              filter === cat ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)] hover:bg-white/10"
            }`}
          >
            <span>{CATEGORY_ICONS[cat] || "⚙️"}</span>
            {t.client.serviceCategories[cat as keyof typeof t.client.serviceCategories] || cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`group rounded-2xl border bg-gradient-to-br ${getServicePresentation(s).accent || CATEGORY_COLORS[s.category] || CATEGORY_COLORS.other} overflow-hidden transition hover:scale-[1.02]`}
          >
            {/* Icon header */}
            <div className="p-6 pb-3">
              <div className="flex items-start justify-between">
                <span className="text-3xl">{getServicePresentation(s).icon || CATEGORY_ICONS[s.category] || "⚙️"}</span>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-[var(--amilcar-text-secondary)]">
                    {t.client.serviceCategories[s.category as keyof typeof t.client.serviceCategories] || s.category}
                  </span>
                  {getServicePresentation(s).startsFrom && (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      {lang === "ar" ? "ابتداء من" : "A partir de"}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">{lang === "ar" ? s.name_ar || s.name : s.name}</h3>
              <p className="mt-1 text-sm font-medium text-white/80">{lang === "ar" ? getServicePresentation(s).headlineAr : getServicePresentation(s).headlineFr}</p>
              {s.description && (
                <p className="mt-1.5 text-sm text-white/60 line-clamp-3">{s.description}</p>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] p-4 flex items-center justify-between">
              <div>
                {user?.is_vip && user.vip_discount_percent > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 line-through text-sm">{formatServicePriceLabel(s, lang)}</span>
                    <span className="text-lg font-bold text-amber-400">{(s.price * (100 - user.vip_discount_percent) / 100).toFixed(1)} TND</span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-white">{formatServicePriceLabel(s, lang)}</span>
                )}
                <div className="text-xs text-[var(--amilcar-text-secondary)]">⏱ {s.duration_minutes} {t.bookings.minutes}</div>
              </div>
              <Link
                href={`/dashboard/client/booking?service=${s.id}`}
                className="rounded-xl bg-[var(--amilcar-red)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red)]/80 transition"
              >
                {t.client.bookNowBtn}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
          <p className="text-[var(--amilcar-text-secondary)]">{t.noData}</p>
        </div>
      )}
    </div>
  );
}
