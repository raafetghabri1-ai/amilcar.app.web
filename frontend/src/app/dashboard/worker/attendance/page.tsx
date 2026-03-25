"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { api, type AttendanceRecord, type WorkerMonthlyStats } from "@/lib/api";

const STATUS_MAP: Record<string, { color: string; key: "present" | "absent" | "late" | "leave" }> = {
  present: { color: "bg-green-500/20 text-green-400 border-green-500/30", key: "present" },
  absent: { color: "bg-red-500/20 text-red-400 border-red-500/30", key: "absent" },
  late: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", key: "late" },
  leave: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", key: "leave" },
};

export default function WorkerAttendancePage() {
  const { t, locale: lang } = useI18n();

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [monthly, setMonthly] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<WorkerMonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [today, month, st] = await Promise.all([
        api.get<AttendanceRecord | null>("/api/v1/attendance/today").catch(() => null),
        api.get<AttendanceRecord[]>("/api/v1/attendance/my-monthly"),
        api.get<WorkerMonthlyStats>("/api/v1/attendance/my-stats").catch(() => null),
      ]);
      setTodayRecord(today);
      setMonthly(month);
      setStats(st);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      const rec = await api.post<AttendanceRecord>("/api/v1/attendance/checkin", {});
      setTodayRecord(rec);
      await loadData();
    } catch { /* */ }
    setActionLoading(false);
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      const rec = await api.post<AttendanceRecord>("/api/v1/attendance/checkout", {});
      setTodayRecord(rec);
      await loadData();
    } catch { /* */ }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t.worker.attendance}</h1>
        <p className="mt-1 text-[var(--amilcar-text-secondary)]">{t.worker.attendanceDesc}</p>
      </div>

      {/* ═══ Today's Attendance Card ═══ */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6">
        <h2 className="mb-4 text-sm font-semibold text-white flex items-center gap-2">
          📋 {t.worker.todayStatus}
          {todayRecord && (
            <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2.5 py-0.5 text-[10px] font-bold text-green-400">
              ✅ {t.worker.present}
            </span>
          )}
        </h2>

        {!todayRecord ? (
          <button
            onClick={handleCheckIn}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--amilcar-red)] px-4 py-4 font-bold text-white text-lg transition hover:bg-[#d6181d] hover:shadow-[0_0_20px_rgba(192,21,26,0.4)] disabled:opacity-50"
          >
            {actionLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>🕐 {t.worker.checkIn}</>
            )}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
                <span className="text-green-400/70 text-xs">{t.worker.checkedInAt}</span>
                <p className="mt-1 font-mono text-2xl font-bold text-green-400">{todayRecord.check_in?.slice(0, 5) || "—"}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
                <span className="text-[var(--amilcar-text-secondary)] text-xs">{t.worker.checkedOutAt}</span>
                <p className="mt-1 font-mono text-2xl font-bold text-white">
                  {todayRecord.check_out?.slice(0, 5) || "—"}
                </p>
              </div>
            </div>

            {!todayRecord.check_out ? (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 px-4 py-3 font-medium text-[var(--amilcar-red)] transition hover:bg-[var(--amilcar-red)]/20 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--amilcar-red)]/30 border-t-[var(--amilcar-red)]" />
                ) : (
                  <>🚪 {t.worker.checkOut}</>
                )}
              </button>
            ) : (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-2 text-center text-sm text-green-400">
                ✅ {t.worker.checkedInAt}: {todayRecord.check_in?.slice(0, 5)} — {t.worker.checkedOutAt}: {todayRecord.check_out?.slice(0, 5)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Monthly Stats ═══ */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats?.attendance_days ?? 0}</p>
          <p className="text-xs text-green-400/70">{t.worker.attendanceDays}</p>
        </div>
        <div className="rounded-xl border border-[var(--amilcar-red)]/20 bg-[var(--amilcar-red)]/5 p-4 text-center">
          <p className="text-2xl font-bold text-[var(--amilcar-red)]">{stats?.completed_this_month ?? 0}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.worker.completedThisMonth}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats?.performance_points ?? 0}</p>
          <p className="text-xs text-amber-400/70">{t.worker.performancePoints}</p>
        </div>
      </div>

      {/* ═══ Monthly Log ═══ */}
      <h2 className="mb-3 text-sm font-semibold text-white flex items-center gap-2">
        🗓️ {t.worker.monthlyLog}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">{monthly.length}</span>
      </h2>

      {monthly.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-8 text-center">
          <p className="text-[var(--amilcar-text-secondary)]">{t.worker.noAttendance}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[var(--amilcar-text-secondary)]">
                  <th className="px-4 py-3 text-start font-medium">{t.bookings.date}</th>
                  <th className="px-4 py-3 text-center font-medium">{t.worker.checkedInAt}</th>
                  <th className="px-4 py-3 text-center font-medium">{t.worker.checkedOutAt}</th>
                  <th className="px-4 py-3 text-center font-medium">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((rec) => {
                  const st = STATUS_MAP[rec.status] || STATUS_MAP.present;
                  return (
                    <tr key={rec.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 text-white font-medium">
                        {new Date(rec.date).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-green-400">{rec.check_in?.slice(0, 5) || "—"}</td>
                      <td className="px-4 py-3 text-center font-mono text-white">{rec.check_out?.slice(0, 5) || <span className="text-white/30">—</span>}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                          {t.worker[st.key]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
