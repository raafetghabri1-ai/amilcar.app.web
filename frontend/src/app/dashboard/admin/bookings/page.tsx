"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  api,
  type BookingDetail,
  type BookingStatus,
  type ServiceItem,
  type User,
  type ClientHistory,
} from "@/lib/api";

/* ═══════════════════ helpers ═══════════════════ */

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 19) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/* ═══════════════════ main component ═══════════════════ */

export default function BookingsPage() {
  const { t, locale: lang } = useI18n();

  // ── data ──
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // ── calendar state ──
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "week">("day");

  // ── modals ──
  const [showCreate, setShowCreate] = useState(false);
  const [editBooking, setEditBooking] = useState<BookingDetail | null>(null);
  const [historyClient, setHistoryClient] = useState<ClientHistory | null>(null);

  // ── form state ──
  const [form, setForm] = useState({
    service_id: "",
    booking_date: fmtDate(new Date()),
    booking_time: "09:00",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  /* ─── load data ─── */
  const loadBookings = useCallback(async () => {
    try {
      const start = view === "day" ? currentDate : getWeekStart(currentDate);
      const end = view === "day" ? currentDate : addDays(start, 6);
      const data = await api.get<BookingDetail[]>(
        `/api/v1/bookings/?date_from=${fmtDate(start)}&date_to=${fmtDate(end)}`
      );
      setBookings(data);
    } catch {
      /* ignore */
    }
  }, [currentDate, view]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [svcs, wrks] = await Promise.all([
          api.get<ServiceItem[]>("/api/v1/services/"),
          api.get<User[]>("/api/v1/users/?role=worker"),
        ]);
        setServices(svcs);
        setWorkers(wrks);
      } catch {
        /* ignore */
      }
      await loadBookings();
      setLoading(false);
    })();
  }, [loadBookings]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /* ─── helpers ─── */
  function getWeekStart(d: Date): Date {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  function bookingsForDate(date: string): BookingDetail[] {
    return bookings.filter((b) => b.booking_date === date).sort((a, b) => a.booking_time.localeCompare(b.booking_time));
  }

  function getStatusLabel(s: BookingStatus): string {
    return t.bookings.status[s] || s;
  }

  /* ─── create booking ─── */
  async function handleCreate() {
    if (!form.service_id) return;
    setSaving(true);
    setFormError("");
    try {
      await api.post("/api/v1/bookings/", {
        service_id: Number(form.service_id),
        booking_date: form.booking_date,
        booking_time: form.booking_time + ":00",
        notes: form.notes || null,
      });
      setShowCreate(false);
      setForm({ service_id: "", booking_date: fmtDate(new Date()), booking_time: "09:00", notes: "" });
      await loadBookings();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  /* ─── update booking ─── */
  async function updateStatus(id: number, status: BookingStatus) {
    try {
      await api.patch(`/api/v1/bookings/${id}`, { status });
      await loadBookings();
      setEditBooking(null);
    } catch {
      /* ignore */
    }
  }

  async function assignWorker(id: number, worker_id: number) {
    try {
      await api.patch(`/api/v1/bookings/${id}`, { worker_id });
      await loadBookings();
    } catch {
      /* ignore */
    }
  }

  async function togglePaid(id: number, is_paid: boolean) {
    try {
      await api.patch(`/api/v1/bookings/${id}`, { is_paid });
      await loadBookings();
    } catch {
      /* ignore */
    }
  }

  /* ─── client history ─── */
  async function showClientHistory(clientId: number) {
    try {
      const data = await api.get<ClientHistory>(`/api/v1/bookings/clients/${clientId}/history`);
      setHistoryClient(data);
    } catch {
      /* ignore */
    }
  }

  /* ─── cancel booking ─── */
  async function cancelBooking(id: number) {
    try {
      await api.delete(`/api/v1/bookings/${id}`);
      await loadBookings();
      setEditBooking(null);
    } catch {
      /* ignore */
    }
  }

  /* ═══════════════════ render ═══════════════════ */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  const weekDays: Date[] = [];
  if (view === "week") {
    const ws = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) weekDays.push(addDays(ws, i));
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.bookings.title}</h1>
          <p className="text-sm text-[var(--amilcar-text-secondary)]">
            {currentDate.toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* view toggle */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm transition ${
                  view === v
                    ? "bg-[var(--amilcar-red)] text-white"
                    : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
                }`}
              >
                {v === "day" ? t.bookings.calendar : t.bookings.list}
              </button>
            ))}
          </div>
          {/* nav buttons */}
          <button
            onClick={() => setCurrentDate(addDays(currentDate, view === "day" ? -1 : -7))}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--amilcar-silver)] hover:bg-white/5"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--amilcar-silver)] hover:bg-white/5"
          >
            {t.bookings.today}
          </button>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, view === "day" ? 1 : 7))}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--amilcar-silver)] hover:bg-white/5"
          >
            →
          </button>
          {/* add */}
          <button
            onClick={() => {
              setForm({ ...form, booking_date: fmtDate(currentDate) });
              setShowCreate(true);
            }}
            className="rounded-lg bg-[var(--amilcar-red)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--amilcar-red)]/80"
          >
            + {t.bookings.addBooking}
          </button>
        </div>
      </div>

      {/* ═══════ DAY VIEW ═══════ */}
      {view === "day" && (
        <div className="space-y-2">
          {TIME_SLOTS.map((slot) => {
            const slotBookings = bookingsForDate(fmtDate(currentDate)).filter(
              (b) => b.booking_time.slice(0, 5) === slot
            );
            return (
              <div key={slot} className="flex items-start gap-3">
                <div className="w-14 pt-2 text-xs font-medium text-[var(--amilcar-text-secondary)]">{slot}</div>
                <div className="flex-1 min-h-[3rem] border-t border-white/[0.04] pt-2">
                  {slotBookings.length === 0 ? (
                    <div className="h-8" />
                  ) : (
                    <div className="space-y-2">
                      {slotBookings.map((b) => (
                        <BookingCard
                          key={b.id}
                          b={b}
                          t={t}
                          lang={lang}
                          onEdit={() => setEditBooking(b)}
                          onHistory={() => showClientHistory(b.client_id)}
                          getStatusLabel={getStatusLabel}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {bookingsForDate(fmtDate(currentDate)).length === 0 && (
            <p className="text-center py-10 text-[var(--amilcar-text-secondary)]">{t.bookings.noBookings}</p>
          )}
        </div>
      )}

      {/* ═══════ WEEK VIEW ═══════ */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayStr = fmtDate(day);
            const dayBookings = bookingsForDate(dayStr);
            const isToday = fmtDate(new Date()) === dayStr;
            return (
              <div key={dayStr} className={`rounded-xl border p-3 min-h-[200px] ${isToday ? "border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/5" : "border-white/[0.06] bg-[var(--amilcar-card)]"}`}>
                <div className="mb-2 text-center">
                  <div className="text-xs text-[var(--amilcar-text-secondary)]">
                    {day.toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR", { weekday: "short" })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? "text-[var(--amilcar-red)]" : "text-white"}`}>
                    {day.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayBookings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setEditBooking(b)}
                      className={`w-full rounded-lg p-2 text-start text-xs border ${STATUS_COLORS[b.status]}`}
                    >
                      <div className="font-medium truncate">{b.booking_time.slice(0, 5)}</div>
                      <div className="truncate">{lang === "ar" ? b.service_name_ar : b.service_name}</div>
                      <div className="truncate text-white/60">{b.client_name}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ CREATE BOOKING MODAL ═══════ */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title={t.bookings.addBooking}>
          <div className="space-y-4">
            {/* Service */}
            <label className="block">
              <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.selectService}</span>
              <select
                value={form.service_id}
                onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                <option value="">{t.bookings.selectService}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === "ar" ? s.name_ar || s.name : s.name} — {s.price} د.ت ({s.duration_minutes} {t.bookings.minutes})
                  </option>
                ))}
              </select>
            </label>
            {/* Date */}
            <label className="block">
              <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.date}</span>
              <input
                type="date"
                value={form.booking_date}
                onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            {/* Time */}
            <label className="block">
              <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.time}</span>
              <select
                value={form.booking_time}
                onChange={(e) => setForm({ ...form, booking_time: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            {/* Notes */}
            <label className="block">
              <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.notes}</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
            {formError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                {formError}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-[var(--amilcar-silver)]"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.service_id}
                className="flex-1 rounded-lg bg-[var(--amilcar-red)] py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════ EDIT / DETAIL BOOKING MODAL ═══════ */}
      {editBooking && (
        <Modal onClose={() => setEditBooking(null)} title={t.bookings.editBooking}>
          <div className="space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label={t.bookings.client} value={editBooking.client_name || "—"} />
              <InfoRow label={t.bookings.service} value={lang === "ar" ? editBooking.service_name_ar : editBooking.service_name} />
              <InfoRow label={t.bookings.date} value={editBooking.booking_date} />
              <InfoRow label={t.bookings.time} value={editBooking.booking_time.slice(0, 5)} />
              <InfoRow label={t.bookings.price} value={
                editBooking.original_price
                  ? `${editBooking.total_price} د.ت (${t.vip.originalPrice}: ${editBooking.original_price} د.ت)`
                  : `${editBooking.total_price} د.ت`
              } />
              <InfoRow label={t.bookings.vehicle} value={editBooking.vehicle_info || "—"} />
              <InfoRow label={t.bookings.duration} value={editBooking.service_duration ? `${editBooking.service_duration} ${t.bookings.minutes}` : "—"} />
              <InfoRow label={t.bookings.worker} value={editBooking.worker_name || "—"} />
            </div>

            {editBooking.is_vip && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-400 flex items-center gap-2">
                ⭐ {t.vip.badge} — {t.vip.discount} {editBooking.vip_discount_percent}%
              </div>
            )}

            {editBooking.notes && (
              <div className="rounded-lg bg-white/5 px-3 py-2 text-sm text-[var(--amilcar-text-secondary)]">
                {editBooking.notes}
              </div>
            )}

            {/* Status */}
            <div>
              <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.status}</span>
              <div className={`mt-1 inline-block rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[editBooking.status]}`}>
                {getStatusLabel(editBooking.status)}
              </div>
            </div>

            {/* Status actions */}
            {editBooking.status !== "cancelled" && editBooking.status !== "completed" && (
              <div className="flex flex-wrap gap-2">
                {editBooking.status === "pending" && (
                  <button
                    onClick={() => updateStatus(editBooking.id, "confirmed")}
                    className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/30"
                  >
                    ✓ {t.bookings.status.confirmed}
                  </button>
                )}
                {(editBooking.status === "pending" || editBooking.status === "confirmed") && (
                  <button
                    onClick={() => updateStatus(editBooking.id, "in_progress")}
                    className="rounded-lg bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/30"
                  >
                    🔧 {t.bookings.status.in_progress}
                  </button>
                )}
                {editBooking.status === "in_progress" && (
                  <button
                    onClick={() => updateStatus(editBooking.id, "completed")}
                    className="rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/30"
                  >
                    ✅ {t.bookings.completed}
                  </button>
                )}
              </div>
            )}

            {editBooking.status === "completed" && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400">
                ✅ {t.bookings.notificationSent}
              </div>
            )}

            {/* Assign worker */}
            {editBooking.status !== "cancelled" && editBooking.status !== "completed" && (
              <label className="block">
                <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.assignWorker}</span>
                <select
                  value={editBooking.worker_id || ""}
                  onChange={(e) => assignWorker(editBooking.id, Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                >
                  <option value="">{t.bookings.selectWorker}</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.full_name}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Payment */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.payment.paid}</span>
              <button
                onClick={() => togglePaid(editBooking.id, !editBooking.is_paid)}
                className={`rounded-full px-3 py-1 text-xs font-medium border ${
                  editBooking.is_paid
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                {editBooking.is_paid ? t.bookings.payment.paid : t.bookings.payment.unpaid}
              </button>
            </div>

            {/* Bottom actions */}
            <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => showClientHistory(editBooking.client_id)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-[var(--amilcar-silver)] hover:bg-white/5"
              >
                📋 {t.bookings.clientHistory}
              </button>
              {editBooking.status !== "cancelled" && editBooking.status !== "completed" && (
                <button
                  onClick={() => cancelBooking(editBooking.id)}
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════ CLIENT HISTORY MODAL ═══════ */}
      {historyClient && (
        <Modal onClose={() => setHistoryClient(null)} title={t.bookings.clientHistory}>
          <div className="space-y-4">
            {/* Client info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label={t.bookings.client} value={historyClient.full_name} />
              <InfoRow label="📞" value={historyClient.phone} />
              <InfoRow label={t.bookings.totalSpent} value={`${historyClient.total_spent} د.ت`} />
              <InfoRow label={t.bookings.totalVisits} value={String(historyClient.total_visits)} />
            </div>

            {historyClient.is_vip && (
              <div className="rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 p-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  ⭐ {t.vip.badge} — {t.vip.discount} {historyClient.vip_discount_percent}%
                </div>
                {historyClient.vip_since && (
                  <div className="mt-1 text-xs text-amber-400/70">
                    {t.vip.memberSince} {new Date(historyClient.vip_since).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}
                  </div>
                )}
              </div>
            )}

            {/* Vehicles */}
            {historyClient.vehicles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-2">{t.bookings.vehicles}</h4>
                <div className="space-y-1">
                  {historyClient.vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-[var(--amilcar-text-secondary)]">
                      🚗 {v.brand} {v.model} {v.year ? `(${v.year})` : ""} — {v.plate_number}
                      {v.color && <span className="text-xs">({v.color})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past bookings */}
            <div>
              <h4 className="text-sm font-medium text-white mb-2">{t.bookings.title}</h4>
              {historyClient.bookings.length === 0 ? (
                <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.noBookings}</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {historyClient.bookings.map((b) => (
                    <div key={b.id} className="rounded-lg border border-white/[0.06] bg-[var(--amilcar-card)] p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{lang === "ar" ? b.service_name_ar : b.service_name}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[b.status]}`}>
                          {getStatusLabel(b.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-[var(--amilcar-text-secondary)]">
                        📅 {b.booking_date} — {b.booking_time.slice(0, 5)} — {b.total_price} د.ت
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════ sub-components ═══════════════════ */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#111] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-[var(--amilcar-text-secondary)] hover:text-white text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string | null | undefined; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-[var(--amilcar-text-secondary)]">{label}</span>
      <p className="font-medium text-white">{value || "—"}</p>
    </div>
  );
}

function BookingCard({
  b,
  t,
  lang,
  onEdit,
  onHistory,
  getStatusLabel,
}: {
  b: BookingDetail;
  t: ReturnType<typeof useI18n>["t"];
  lang: string;
  onEdit: () => void;
  onHistory: () => void;
  getStatusLabel: (s: BookingStatus) => string;
}) {
  return (
    <div
      className={`rounded-xl border p-3 cursor-pointer transition hover:border-[var(--amilcar-red)]/30 ${STATUS_COLORS[b.status].replace(/text-\S+/, "")}`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">
              {lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[b.status]}`}>
              {getStatusLabel(b.status)}
            </span>
            {b.is_vip && (
              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-400">⭐ VIP</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--amilcar-text-secondary)]">
            <span>👤 {b.client_name}</span>
            {b.vehicle_info && <span>🚗 {b.vehicle_info}</span>}
            {b.worker_name && <span>🔧 {b.worker_name}</span>}
            {b.original_price ? (
              <span>💰 <s className="text-white/30">{b.original_price}</s> {b.total_price} د.ت <span className="text-amber-400">(-{b.vip_discount_percent}%)</span></span>
            ) : (
              <span>💰 {b.total_price} د.ت</span>
            )}
            {b.service_duration && <span>⏱ {b.service_duration} {t.bookings.minutes}</span>}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHistory();
          }}
          className="text-xs text-[var(--amilcar-silver)] hover:text-white"
          title={t.bookings.clientHistory}
        >
          📋
        </button>
      </div>
    </div>
  );
}
