"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { API_BASE_URL, type BookingDetail, type BookingStatus } from "@/lib/api";
import Image from "next/image";

/* ═══════════════════ constants ═══════════════════ */

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<BookingStatus, string> = {
  pending: "⏳",
  confirmed: "✓",
  in_progress: "🔧",
  completed: "✅",
  cancelled: "✕",
};

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/* ═══════════════════ main component ═══════════════════ */

export default function LiveCenterPage() {
  const { t, locale: lang } = useI18n();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [clock, setClock] = useState(new Date());
  const [loading, setLoading] = useState(true);

  /* ─── fetch bookings (public — no auth needed for the live display) ─── */
  const fetchBookings = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const today = fmtDate(new Date());
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/bookings/calendar?date=${today}`,
        { headers }
      );
      if (res.ok) {
        const data: BookingDetail[] = await res.json();
        setBookings(data);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();
    const dataInterval = setInterval(fetchBookings, 15_000); // refresh every 15s
    const clockInterval = setInterval(() => setClock(new Date()), 1_000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, [fetchBookings]);

  /* ─── categorize ─── */
  const inProgress = bookings.filter((b) => b.status === "in_progress");
  const waiting = bookings.filter((b) => ["pending", "confirmed"].includes(b.status));
  const completedToday = bookings.filter((b) => b.status === "completed");

  function getStatusLabel(s: BookingStatus): string {
    return t.bookings.status[s] || s;
  }

  const dateStr = clock.toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = clock.toLocaleTimeString(lang === "ar" ? "ar-TN" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* ─── Header Bar ─── */}
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a] px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="AMILCAR" width={44} height={44} className="rounded" />
          <div>
            <h1 className="text-2xl font-black tracking-wide">
              AMILCAR <span className="text-[var(--amilcar-red)]">Auto Care</span>
            </h1>
            <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.live.subtitle}</p>
          </div>
        </div>
        <div className="text-end">
          <div className="text-3xl font-mono font-bold tabular-nums text-[var(--amilcar-red)]">{timeStr}</div>
          <div className="text-sm text-[var(--amilcar-text-secondary)]">{dateStr}</div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--amilcar-red)]" />
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-88px)]">

          {/* ══════════ LEFT: Cars in progress ══════════ */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-sm">🔧</span>
              <h2 className="text-xl font-bold">{t.live.carsInProgress}</h2>
              <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2.5 py-0.5 text-sm font-bold text-orange-400">
                {inProgress.length}
              </span>
            </div>

            {inProgress.length === 0 ? (
              <div className="flex-1 flex items-center justify-center rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)]">
                <p className="text-lg text-[var(--amilcar-text-secondary)]">{t.live.noCarsNow}</p>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min overflow-y-auto">
                {inProgress.map((b) => (
                  <LiveCard key={b.id} b={b} t={t} lang={lang} getStatusLabel={getStatusLabel} />
                ))}
              </div>
            )}
          </div>

          {/* ══════════ RIGHT: Sidebar ══════════ */}
          <div className="flex flex-col gap-6 overflow-y-auto">

            {/* Waiting cars */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm">⏳</span>
                <h3 className="text-lg font-semibold">{t.live.waitingCars}</h3>
                <span className="rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2 py-0.5 text-xs font-bold text-yellow-400">
                  {waiting.length}
                </span>
              </div>
              {waiting.length === 0 ? (
                <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.live.noUpcoming}</p>
              ) : (
                <div className="space-y-2">
                  {waiting
                    .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
                    .map((b) => (
                      <div
                        key={b.id}
                        className={`rounded-xl border p-3 ${STATUS_COLORS[b.status].replace(/text-\S+/, "")}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{b.booking_time.slice(0, 5)}</span>
                          <span className="text-sm font-medium text-white truncate">
                            {lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}
                          </span>
                          <span className={`ms-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[b.status]}`}>
                            {STATUS_ICONS[b.status]} {getStatusLabel(b.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--amilcar-text-secondary)]">
                          <span>👤 {b.client_name}</span>
                          {b.vehicle_info && <span>🚗 {b.vehicle_info}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Upcoming (next one highlighted) */}
            {waiting.length > 0 && (
              <div className="rounded-2xl border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 p-4">
                <p className="text-xs text-[var(--amilcar-red)] font-medium mb-1">{t.live.next} ↓</p>
                <p className="text-xl font-bold">
                  {waiting.sort((a, b) => a.booking_time.localeCompare(b.booking_time))[0].booking_time.slice(0, 5)}
                </p>
                <p className="text-sm text-white">
                  {lang === "ar"
                    ? waiting[0].service_name_ar || waiting[0].service_name
                    : waiting[0].service_name}
                  {' — '}{waiting[0].client_name}
                </p>
              </div>
            )}

            {/* Completed today */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm">✅</span>
                <h3 className="text-lg font-semibold">{t.live.completedToday}</h3>
                <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-xs font-bold text-green-400">
                  {completedToday.length}
                </span>
              </div>
              {completedToday.length === 0 ? (
                <p className="text-sm text-[var(--amilcar-text-secondary)]">—</p>
              ) : (
                <div className="space-y-1">
                  {completedToday.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg bg-green-500/5 border border-green-500/20 px-3 py-2">
                      <span className="text-sm text-white truncate">
                        {b.booking_time.slice(0, 5)} — {lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}
                      </span>
                      <span className="text-xs text-green-400">✅</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer pulse */}
      <div className="fixed bottom-4 left-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--amilcar-red)] opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--amilcar-red)]" />
        </span>
        <span className="text-xs text-[var(--amilcar-text-secondary)]">{t.live.title}</span>
      </div>
    </div>
  );
}

/* ═══════════════════ Live car card ═══════════════════ */

function LiveCard({
  b,
  t,
  lang,
  getStatusLabel,
}: {
  b: BookingDetail;
  t: ReturnType<typeof useI18n>["t"];
  lang: string;
  getStatusLabel: (s: BookingStatus) => string;
}) {
  return (
    <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent p-5 transition animate-pulse-slow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl font-bold text-white">{b.booking_time.slice(0, 5)}</span>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[b.status]}`}>
          {STATUS_ICONS[b.status]} {getStatusLabel(b.status)}
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        {lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}
      </h3>

      <div className="space-y-1 text-sm text-[var(--amilcar-text-secondary)]">
        <div className="flex items-center gap-2">
          <span>👤</span>
          <span className="text-white font-medium">{b.client_name}</span>
          {b.is_vip && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400">⭐ VIP</span>
          )}
        </div>
        {b.vehicle_info && (
          <div className="flex items-center gap-2">
            <span>🚗</span>
            <span className="text-white">{b.vehicle_info}</span>
          </div>
        )}
        {b.worker_name && (
          <div className="flex items-center gap-2">
            <span>🔧</span>
            <span>{b.worker_name}</span>
          </div>
        )}
        {b.service_duration && (
          <div className="flex items-center gap-2">
            <span>⏱</span>
            <span>{b.service_duration} {t.bookings.minutes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
