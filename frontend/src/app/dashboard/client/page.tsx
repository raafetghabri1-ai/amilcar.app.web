"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import {
  api,
  type BookingDetail,
  type BookingStatus,
} from "@/lib/api";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<BookingStatus, string> = {
  pending: "⏳",
  confirmed: "✅",
  in_progress: "🔧",
  completed: "🏁",
  cancelled: "❌",
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const { t, locale: lang } = useI18n();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const bks = await api.get<BookingDetail[]>("/api/v1/bookings/");
        setBookings(bks);
      } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  const activeBookings = bookings.filter((b) => !["completed", "cancelled"].includes(b.status));
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A2744] via-[#0f1829] to-black border border-white/[0.06] p-8">
        <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-right-bottom opacity-5 bg-[length:200px]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white">
              {t.admin.welcome} {user?.full_name}
            </h1>
            {user?.is_vip && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-sm font-bold text-black shadow-lg shadow-amber-500/20">
                ⭐ VIP
              </span>
            )}
          </div>
          <p className="mt-2 text-[var(--amilcar-text-secondary)]">{t.client.subtitle}</p>
        </div>
      </div>

      {/* VIP Card / Loyalty Progress */}
      {user?.is_vip ? (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/30 text-3xl">⭐</span>
            <div>
              <p className="text-lg font-bold text-amber-400">{t.vip.congratsTitle}</p>
              <p className="text-sm text-amber-400/80">{t.vip.congratsDesc} — <span className="font-bold text-amber-300">{user.vip_discount_percent}%</span></p>
              {user.vip_since && (
                <p className="mt-1 text-xs text-amber-400/60">{t.vip.memberSince} {new Date(user.vip_since).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl">🏆</span>
            <div>
              <p className="font-semibold text-white">{t.vip.progressTitle}</p>
              <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.vip.progressDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-1">
                <div className={`h-3 w-full rounded-full transition-all ${i < completedCount ? "bg-gradient-to-r from-amber-500 to-yellow-500 shadow-sm shadow-amber-500/30" : "bg-white/10"}`} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--amilcar-text-secondary)]">
            {completedCount}/5 — {Math.max(0, 5 - completedCount)} {t.vip.visitsLeft}
          </p>
        </div>
      )}

      {/* Upcoming Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t.clientNav.booking}</h2>
          <Link href="/dashboard/client/booking" className="text-sm text-[var(--amilcar-red)] hover:underline">
            {t.client.bookAppointment} →
          </Link>
        </div>
        {activeBookings.length > 0 ? (
          <div className="space-y-3">
            {activeBookings.slice(0, 3).map((b) => (
              <div key={b.id} className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 hover:border-white/10 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{STATUS_ICONS[b.status]}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">
                          {lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                          {t.bookings.status[b.status]}
                        </span>
                        {b.is_vip && (
                          <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400">⭐ VIP</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-sm text-[var(--amilcar-text-secondary)]">
                        <span>📅 {b.booking_date}</span>
                        <span>🕐 {b.booking_time?.slice(0, 5)}</span>
                        <span>💰 {b.total_price} د.ت</span>
                        {b.vehicle_info && <span>🚗 {b.vehicle_info}</span>}
                      </div>
                    </div>
                  </div>
                  {(b.status === "confirmed" || b.status === "in_progress") && (
                    <Link href="/dashboard/client/tracking" className="rounded-lg bg-[var(--amilcar-red)]/10 border border-[var(--amilcar-red)]/30 px-3 py-1.5 text-xs text-[var(--amilcar-red)] hover:bg-[var(--amilcar-red)]/20 transition">
                      {t.clientNav.tracking}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-[var(--amilcar-card)] p-8 text-center">
            <span className="text-4xl">✨</span>
            <p className="mt-3 font-semibold text-white">{t.client.noUpcoming}</p>
            <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.bookNow}</p>
            <Link
              href="/dashboard/client/booking"
              className="mt-4 inline-block rounded-xl bg-[var(--amilcar-red)] px-6 py-2.5 font-medium text-white hover:bg-[var(--amilcar-red)]/80 transition"
            >
              📅 {t.client.bookAppointment}
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/client/booking" className="group rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6 hover:border-[var(--amilcar-red)]/30 transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--amilcar-red)]/10 text-2xl group-hover:bg-[var(--amilcar-red)]/20 transition">📅</div>
          <h3 className="mt-3 font-semibold text-white">{t.client.bookAppointment}</h3>
          <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.bookAppointmentDesc}</p>
        </Link>
        <Link href="/dashboard/client/services" className="group rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6 hover:border-blue-500/30 transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl group-hover:bg-blue-500/20 transition">🛠️</div>
          <h3 className="mt-3 font-semibold text-white">{t.client.browseServices}</h3>
          <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.browseServicesDesc}</p>
        </Link>
        <Link href="/dashboard/client/store" className="group rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6 hover:border-emerald-500/30 transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl group-hover:bg-emerald-500/20 transition">🛍️</div>
          <h3 className="mt-3 font-semibold text-white">{t.client.accessoriesShop}</h3>
          <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.accessoriesShopDesc}</p>
        </Link>
        <Link href="/dashboard/client/profile" className="group rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6 hover:border-purple-500/30 transition">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-2xl group-hover:bg-purple-500/20 transition">👤</div>
          <h3 className="mt-3 font-semibold text-white">{t.clientNav.profile}</h3>
          <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.profileDesc}</p>
        </Link>
      </div>
    </div>
  );
}
