"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { api, type BookingDetail, type BookingStatus } from "@/lib/api";

const TRACKING_STEPS: BookingStatus[] = ["pending", "confirmed", "in_progress", "completed"];

const STEP_ICONS: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  in_progress: "🔧",
  completed: "🏁",
};

function getStepIndex(status: BookingStatus): number {
  return TRACKING_STEPS.indexOf(status);
}

export default function TrackingPage() {
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
    // Auto-refresh every 30s
    const interval = setInterval(async () => {
      try {
        const bks = await api.get<BookingDetail[]>("/api/v1/bookings/");
        setBookings(bks);
      } catch { /* */ }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeBookings = bookings.filter(
    (b) => !["completed", "cancelled"].includes(b.status)
  );
  const recentCompleted = bookings
    .filter((b) => b.status === "completed")
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link href="/dashboard/client" className="text-sm text-[var(--amilcar-text-secondary)] hover:text-white transition">← {t.clientNav.home}</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{t.clientNav.tracking}</h1>
        <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.trackingDesc}</p>
      </div>

      {activeBookings.length === 0 && recentCompleted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[var(--amilcar-card)] p-12 text-center">
          <span className="text-5xl">🚗</span>
          <p className="mt-4 text-lg font-semibold text-white">{t.client.noCarsTracking}</p>
          <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.noCarsTrackingDesc}</p>
          <Link href="/dashboard/client/booking" className="mt-4 inline-block rounded-xl bg-[var(--amilcar-red)] px-6 py-2.5 font-medium text-white hover:bg-[var(--amilcar-red)]/80 transition">
            📅 {t.client.bookAppointment}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {activeBookings.map((b) => {
            const currentStep = getStepIndex(b.status);
            const estimatedEnd = b.service_duration
              ? (() => {
                  const [h, m] = (b.booking_time || "09:00").split(":").map(Number);
                  const end = new Date(2000, 0, 1, h, m + (b.service_duration || 0));
                  return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
                })()
              : null;

            return (
              <div key={b.id} className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] overflow-hidden">
                {/* Header */}
                <div className="border-b border-white/[0.06] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-[var(--amilcar-text-secondary)]">
                        <span>📅 {b.booking_date}</span>
                        <span>🕐 {b.booking_time?.slice(0, 5)}</span>
                        {b.vehicle_info && <span>🚗 {b.vehicle_info}</span>}
                        {b.worker_name && <span>🔧 {b.worker_name}</span>}
                      </div>
                    </div>
                    {estimatedEnd && b.status === "in_progress" && (
                      <div className="text-end">
                        <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.client.estimatedDone}</p>
                        <p className="text-lg font-bold text-[var(--amilcar-red)]">{estimatedEnd}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    {TRACKING_STEPS.map((stepStatus, idx) => (
                      <div key={stepStatus} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all ${
                            idx <= currentStep
                              ? idx === currentStep
                                ? "bg-[var(--amilcar-red)] text-white shadow-lg shadow-[var(--amilcar-red)]/30 ring-4 ring-[var(--amilcar-red)]/20"
                                : "bg-green-500/20 text-green-400"
                              : "bg-white/5 text-white/20"
                          }`}>
                            {STEP_ICONS[stepStatus]}
                          </div>
                          <span className={`mt-2 text-xs text-center ${
                            idx <= currentStep ? "text-white font-medium" : "text-white/30"
                          }`}>
                            {t.bookings.status[stepStatus]}
                          </span>
                        </div>
                        {idx < TRACKING_STEPS.length - 1 && (
                          <div className={`h-0.5 w-full mx-1 rounded ${
                            idx < currentStep ? "bg-green-500" : "bg-white/10"
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Estimated time */}
                  {b.service_duration && (
                    <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex items-center justify-between">
                      <span className="text-sm text-[var(--amilcar-text-secondary)]">⏱ {t.bookings.duration}</span>
                      <span className="text-sm font-medium text-white">{b.service_duration} {t.bookings.minutes}</span>
                    </div>
                  )}

                  {b.status === "in_progress" && (
                    <div className="mt-3 rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-sm text-orange-400 font-medium">{t.client.inProgressNow}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Recently completed */}
          {recentCompleted.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">{t.client.recentlyCompleted}</h2>
              <div className="space-y-2">
                {recentCompleted.map((b) => (
                  <div key={b.id} className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏁</span>
                      <div>
                        <span className="font-medium text-white">{lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}</span>
                        <span className="ms-2 text-sm text-[var(--amilcar-text-secondary)]">📅 {b.booking_date}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-medium text-green-400">
                      ✅ {t.bookings.status.completed}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
