"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { api, type BookingDetail, type BookingStatus } from "@/lib/api";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  confirmed: "in_progress",
  in_progress: "completed",
};

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { t, locale: lang } = useI18n();

  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [allBookings, setAllBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "all">("mine");

  const today = fmtDate(new Date());

  const loadBookings = useCallback(async () => {
    try {
      const [mine, all] = await Promise.all([
        api.get<BookingDetail[]>(`/api/v1/bookings/?date_from=${today}&date_to=${today}`),
        api.get<BookingDetail[]>(`/api/v1/bookings/calendar?date=${today}`),
      ]);
      setBookings(mine);
      setAllBookings(all);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 30_000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  async function updateStatus(id: number, status: BookingStatus) {
    try {
      await api.patch(`/api/v1/bookings/${id}`, { status });
      await loadBookings();
    } catch {
      /* ignore */
    }
  }

  function getStatusLabel(s: BookingStatus): string {
    return t.bookings.status[s] || s;
  }

  const inProgress = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings.filter((b) => ["pending", "confirmed"].includes(b.status));
  const completed = bookings.filter((b) => b.status === "completed");
  const displayList = tab === "mine" ? bookings : allBookings;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          {t.admin.welcome} {user?.full_name} 👋
        </h1>
        <p className="mt-1 text-[var(--amilcar-text-secondary)]">{t.worker.subtitle}</p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-center">
          <p className="text-2xl font-bold text-orange-400">{inProgress.length}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.bookings.status.in_progress}</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{upcoming.length}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.bookings.status.pending}</p>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{completed.length}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.bookings.status.completed}</p>
        </div>
      </div>

      {/* Live screen link */}
      <a
        href="/live"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 p-4 transition hover:bg-[var(--amilcar-red)]/20"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--amilcar-red)]/20 text-lg">📺</span>
        <div>
          <p className="font-semibold text-white">{t.worker.openLive}</p>
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.nav.live}</p>
        </div>
        <span className="ms-auto text-[var(--amilcar-text-secondary)]">↗</span>
      </a>

      {/* Tab toggle */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["mine", "all"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-1.5 text-sm transition ${
                tab === v
                  ? "bg-[var(--amilcar-red)] text-white"
                  : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
              }`}
            >
              {v === "mine" ? t.worker.myBookings : t.worker.allBookings}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings list */}
      {displayList.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-8 text-center">
          <p className="text-[var(--amilcar-text-secondary)]">{t.worker.noBookingsToday}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList
            .filter((b) => b.status !== "cancelled")
            .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
            .map((b) => (
              <div
                key={b.id}
                className={`rounded-xl border p-4 transition ${STATUS_COLORS[b.status].replace(/text-\S+/, "")}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-white">{b.booking_time.slice(0, 5)}</span>
                      <span className="font-semibold text-white truncate">
                        {lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[b.status]}`}>
                        {getStatusLabel(b.status)}
                      </span>
                      {b.is_vip && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400">⭐ VIP</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--amilcar-text-secondary)]">
                      <span>👤 {b.client_name}</span>
                      {b.client_phone && <span>📞 {b.client_phone}</span>}
                      {b.vehicle_info && <span>🚗 {b.vehicle_info}</span>}
                      <span>💰 {b.total_price} د.ت</span>
                      {b.service_duration && <span>⏱ {b.service_duration} {t.bookings.minutes}</span>}
                      {b.worker_name && <span>🔧 {b.worker_name}</span>}
                    </div>
                    {b.notes && (
                      <p className="mt-1 text-xs text-[var(--amilcar-text-secondary)] italic">📝 {b.notes}</p>
                    )}
                  </div>

                  {/* Status action button */}
                  {NEXT_STATUS[b.status] && (
                    <button
                      onClick={() => updateStatus(b.id, NEXT_STATUS[b.status]!)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium border transition ${
                        NEXT_STATUS[b.status] === "in_progress"
                          ? "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
                          : "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                      }`}
                    >
                      {NEXT_STATUS[b.status] === "in_progress" ? "🔧 " : "✅ "}
                      {getStatusLabel(NEXT_STATUS[b.status]!)}
                    </button>
                  )}
                </div>

                {b.status === "completed" && (
                  <div className="mt-2 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-1.5 text-xs text-green-400">
                    ✅ {t.bookings.completed}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
