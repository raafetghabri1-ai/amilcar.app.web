"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import {
  api,
  type BookingDetail,
  type BookingStatus,
  type AttendanceRecord,
  type WorkerMonthlyStats,
} from "@/lib/api";

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
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [stats, setStats] = useState<WorkerMonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const today = fmtDate(new Date());

  const loadData = useCallback(async () => {
    try {
      const [bk, att, st] = await Promise.all([
        api.get<BookingDetail[]>(`/api/v1/bookings/?date_from=${today}&date_to=${today}`),
        api.get<AttendanceRecord | null>("/api/v1/attendance/today").catch(() => null),
        api.get<WorkerMonthlyStats>("/api/v1/attendance/my-stats").catch(() => null),
      ]);
      setBookings(bk);
      setTodayAttendance(att);
      setStats(st);
    } catch { /* */ }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      const rec = await api.post<AttendanceRecord>("/api/v1/attendance/checkin", {});
      setTodayAttendance(rec);
    } catch { /* */ }
    setActionLoading(false);
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      const rec = await api.post<AttendanceRecord>("/api/v1/attendance/checkout", {});
      setTodayAttendance(rec);
    } catch { /* */ }
    setActionLoading(false);
  }

  async function updateStatus(id: number, status: BookingStatus) {
    try {
      await api.patch(`/api/v1/bookings/${id}`, { status });
      await loadData();
    } catch { /* */ }
  }

  function getStatusLabel(s: BookingStatus): string {
    return t.bookings.status[s] || s;
  }

  const inProgress = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings.filter((b) => ["pending", "confirmed"].includes(b.status));
  const completed = bookings.filter((b) => b.status === "completed");

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

      {/* ═══ Attendance Card ═══ */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            📋 {t.worker.todayStatus}
          </h2>
          {todayAttendance && (
            <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2.5 py-0.5 text-[10px] font-bold text-green-400">
              ✅ {t.worker.present}
            </span>
          )}
        </div>

        {!todayAttendance ? (
          <button
            onClick={handleCheckIn}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--amilcar-red)] px-4 py-3 font-bold text-white transition hover:bg-[#d6181d] hover:shadow-[0_0_20px_rgba(192,21,26,0.4)] disabled:opacity-50"
          >
            {actionLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>🕐 {t.worker.checkIn}</>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex-1 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                <span className="text-green-400/70 text-xs">{t.worker.checkedInAt}</span>
                <p className="font-mono font-bold text-green-400">{todayAttendance.check_in?.slice(0, 5) || "—"}</p>
              </div>
              <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                <span className="text-[var(--amilcar-text-secondary)] text-xs">{t.worker.checkedOutAt}</span>
                <p className="font-mono font-bold text-white">{todayAttendance.check_out?.slice(0, 5) || "—"}</p>
              </div>
            </div>

            {!todayAttendance.check_out && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 px-4 py-2.5 font-medium text-[var(--amilcar-red)] transition hover:bg-[var(--amilcar-red)]/20 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--amilcar-red)]/30 border-t-[var(--amilcar-red)]" />
                ) : (
                  <>🚪 {t.worker.checkOut}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Monthly Stats ═══ */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--amilcar-red)]/20 bg-[var(--amilcar-red)]/5 p-4 text-center">
          <p className="text-2xl font-bold text-[var(--amilcar-red)]">{stats?.completed_this_month ?? 0}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.worker.completedThisMonth}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats?.completed_total ?? 0}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.worker.completedTotal}</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats?.attendance_days ?? 0}</p>
          <p className="text-xs text-green-400/70">{t.worker.attendanceDays}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats?.performance_points ?? 0}</p>
          <p className="text-xs text-amber-400/70">{t.worker.performancePoints}</p>
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <h2 className="mb-3 text-sm font-semibold text-white">{t.worker.quickActions}</h2>
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/dashboard/worker/bookings"
          className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 transition hover:border-[var(--amilcar-red)]/30 hover:bg-[var(--amilcar-hover)]"
        >
          <span className="text-xl">📋</span>
          <div>
            <span className="font-semibold text-white">{t.worker.bookingsPage}</span>
            <span className="mt-0.5 block text-xs text-[var(--amilcar-text-secondary)]">{t.worker.bookingsPageDesc}</span>
          </div>
        </Link>
        <Link
          href="/dashboard/worker/attendance"
          className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 transition hover:border-[var(--amilcar-red)]/30 hover:bg-[var(--amilcar-hover)]"
        >
          <span className="text-xl">🗓️</span>
          <div>
            <span className="font-semibold text-white">{t.worker.attendance}</span>
            <span className="mt-0.5 block text-xs text-[var(--amilcar-text-secondary)]">{t.worker.attendanceDesc}</span>
          </div>
        </Link>
        <a
          href="/live"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl border border-[var(--amilcar-red)]/20 bg-[var(--amilcar-red)]/5 p-4 transition hover:border-[var(--amilcar-red)]/40 hover:bg-[var(--amilcar-red)]/10"
        >
          <span className="text-xl">📺</span>
          <div>
            <span className="font-semibold text-white">{t.worker.openLive}</span>
            <span className="mt-0.5 block text-xs text-[var(--amilcar-text-secondary)]">{t.nav.live}</span>
          </div>
        </a>
      </div>

      {/* ═══ Today's Bookings ═══ */}
      <h2 className="mb-3 text-sm font-semibold text-white flex items-center gap-2">
        🔧 {t.worker.todayBookings}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">{bookings.filter((b) => b.status !== "cancelled").length}</span>
      </h2>

      {bookings.filter((b) => b.status !== "cancelled").length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-8 text-center">
          <p className="text-[var(--amilcar-text-secondary)]">{t.worker.noBookingsToday}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings
            .filter((b) => b.status !== "cancelled")
            .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
            .map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 transition hover:border-white/10"
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
                      {b.vehicle_info && <span>🚗 {b.vehicle_info}</span>}
                      <span>💰 {b.total_price} د.ت</span>
                      {b.service_duration && <span>⏱ {b.service_duration} {t.bookings.minutes}</span>}
                    </div>
                  </div>

                  {NEXT_STATUS[b.status] && (
                    <button
                      onClick={() => updateStatus(b.id, NEXT_STATUS[b.status]!)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium border transition ${
                        NEXT_STATUS[b.status] === "in_progress"
                          ? "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
                          : "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                      }`}
                    >
                      {NEXT_STATUS[b.status] === "in_progress"
                        ? `🔧 ${t.worker.startWork}`
                        : `✅ ${t.worker.finishWork}`}
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
