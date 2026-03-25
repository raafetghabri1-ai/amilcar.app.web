"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { api, type ServiceItem, type Vehicle } from "@/lib/api";
import { formatServicePriceLabel, getServicePresentation } from "@/lib/service-presentation";

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 19) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

interface SlotAvailability {
  time: string;
  available: boolean;
}

export default function BookingPage() {
  const { user } = useAuth();
  const { t, locale: lang } = useI18n();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // form
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [slotsAvailability, setSlotsAvailability] = useState<SlotAvailability[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  // step
  const [step, setStep] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [svcs, vehs] = await Promise.all([
          api.get<ServiceItem[]>("/api/v1/services/"),
          api.get<Vehicle[]>("/api/v1/bookings/vehicles"),
        ]);
        setServices(svcs.filter(s => s.is_active));
        setVehicles(vehs);
      } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  const checkSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) return;
    setCheckingSlots(true);
    const slots: SlotAvailability[] = [];
    for (const time of TIME_SLOTS) {
      try {
        const res = await api.get<{ available: boolean }>(`/api/v1/bookings/check-slot?date=${selectedDate}&time=${time}:00&service_id=${selectedService.id}`);
        slots.push({ time, available: res.available });
      } catch {
        slots.push({ time, available: false });
      }
    }
    setSlotsAvailability(slots);
    setCheckingSlots(false);
  }, [selectedService, selectedDate]);

  useEffect(() => {
    if (step === 3 && selectedService && selectedDate) {
      checkSlots();
    }
  }, [step, selectedService, selectedDate, checkSlots]);

  async function handleSubmit() {
    if (!selectedService || !selectedTime) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/v1/bookings/", {
        service_id: selectedService.id,
        vehicle_id: selectedVehicle ? Number(selectedVehicle) : null,
        booking_date: selectedDate,
        booking_time: selectedTime + ":00",
        notes: notes || null,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl mb-6">✅</div>
        <h2 className="text-2xl font-bold text-white mb-2">{t.client.bookingConfirmed}</h2>
        <p className="text-[var(--amilcar-text-secondary)] mb-6">{t.client.bookingConfirmedDesc}</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard/client" className="rounded-xl border border-white/10 px-6 py-2.5 text-white hover:bg-white/5 transition">
            {t.clientNav.home}
          </Link>
          <Link href="/dashboard/client/tracking" className="rounded-xl bg-[var(--amilcar-red)] px-6 py-2.5 text-white hover:bg-[var(--amilcar-red)]/80 transition">
            {t.clientNav.tracking}
          </Link>
        </div>
      </div>
    );
  }

  const vipPrice = selectedService && user?.is_vip && user.vip_discount_percent > 0
    ? (selectedService.price * (100 - user.vip_discount_percent) / 100).toFixed(1)
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/client" className="text-sm text-[var(--amilcar-text-secondary)] hover:text-white transition">← {t.clientNav.home}</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{t.client.bookAppointment}</h1>
      </div>

      {/* Steps indicator */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
              step >= s ? "bg-[var(--amilcar-red)] text-white" : "bg-white/10 text-[var(--amilcar-text-secondary)]"
            }`}>{s}</div>
            {s < 4 && <div className={`h-0.5 flex-1 rounded ${step > s ? "bg-[var(--amilcar-red)]" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Service */}
      {step === 1 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">{t.bookings.selectService}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedService(s); setStep(2); }}
                className={`rounded-xl border p-4 text-start transition ${
                  selectedService?.id === s.id
                    ? "border-[var(--amilcar-red)] bg-[var(--amilcar-red)]/10"
                    : "border-white/[0.06] bg-[var(--amilcar-card)] hover:border-white/10"
                }`}
              >
                <div className="font-semibold text-white">{lang === "ar" ? s.name_ar || s.name : s.name}</div>
                <p className="mt-1 text-sm text-white/80">{lang === "ar" ? getServicePresentation(s).headlineAr : getServicePresentation(s).headlineFr}</p>
                {s.description && <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)] line-clamp-2">{s.description}</p>}
                <div className="mt-2 flex items-center gap-3 text-sm">
                  {user?.is_vip && user.vip_discount_percent > 0 ? (
                    <>
                      <span className="text-white/40 line-through">{formatServicePriceLabel(s, lang)}</span>
                      <span className="text-amber-400 font-bold">{(s.price * (100 - user.vip_discount_percent) / 100).toFixed(1)} TND</span>
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">-{user.vip_discount_percent}%</span>
                    </>
                  ) : (
                    <span className="text-[var(--amilcar-red)] font-bold">{formatServicePriceLabel(s, lang)}</span>
                  )}
                  <span className="text-[var(--amilcar-text-secondary)]">⏱ {s.duration_minutes} {t.bookings.minutes}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Choose Vehicle */}
      {step === 2 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">{t.bookings.selectVehicle}</h2>
          <div className="space-y-3 mb-6">
            <button
              onClick={() => { setSelectedVehicle(""); setStep(3); }}
              className={`w-full rounded-xl border p-4 text-start transition ${
                !selectedVehicle ? "border-[var(--amilcar-red)] bg-[var(--amilcar-red)]/10" : "border-white/[0.06] bg-[var(--amilcar-card)] hover:border-white/10"
              }`}
            >
              <span className="text-[var(--amilcar-text-secondary)]">— {t.client.noVehicleSelected}</span>
            </button>
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => { setSelectedVehicle(String(v.id)); setStep(3); }}
                className={`w-full rounded-xl border p-4 text-start transition ${
                  selectedVehicle === String(v.id) ? "border-[var(--amilcar-red)] bg-[var(--amilcar-red)]/10" : "border-white/[0.06] bg-[var(--amilcar-card)] hover:border-white/10"
                }`}
              >
                <div className="font-medium text-white">🚗 {v.brand} {v.model}</div>
                <div className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{v.plate_number} {v.year ? `• ${v.year}` : ""} {v.color ? `• ${v.color}` : ""}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="text-sm text-[var(--amilcar-text-secondary)] hover:text-white">← {t.client.back}</button>
        </div>
      )}

      {/* Step 3: Choose Date & Time */}
      {step === 3 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">{t.bookings.selectDate}</h2>
          <input
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
            className="mb-6 w-full rounded-xl border border-white/10 bg-[var(--amilcar-card)] px-4 py-3 text-white"
          />

          <h2 className="mb-4 text-lg font-semibold text-white">{t.bookings.selectTime}</h2>
          {checkingSlots ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--amilcar-red)]" />
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
              {slotsAvailability.map((slot) => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => { setSelectedTime(slot.time); setStep(4); }}
                  className={`rounded-lg py-2.5 text-sm font-medium transition ${
                    selectedTime === slot.time
                      ? "bg-[var(--amilcar-red)] text-white"
                      : slot.available
                        ? "border border-white/10 bg-[var(--amilcar-card)] text-white hover:border-[var(--amilcar-red)]/30"
                        : "border border-white/[0.04] bg-white/[0.02] text-white/20 cursor-not-allowed line-through"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setStep(2)} className="text-sm text-[var(--amilcar-text-secondary)] hover:text-white">← {t.client.back}</button>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && selectedService && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">{t.client.confirmBooking}</h2>
          <div className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6 space-y-4">
            <div className="flex justify-between">
              <span className="text-[var(--amilcar-text-secondary)]">{t.bookings.service}</span>
              <span className="font-medium text-white">{lang === "ar" ? selectedService.name_ar || selectedService.name : selectedService.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--amilcar-text-secondary)]">{t.bookings.date}</span>
              <span className="font-medium text-white">{selectedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--amilcar-text-secondary)]">{t.bookings.time}</span>
              <span className="font-medium text-white">{selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--amilcar-text-secondary)]">{t.bookings.duration}</span>
              <span className="font-medium text-white">{selectedService.duration_minutes} {t.bookings.minutes}</span>
            </div>
            {selectedVehicle && vehicles.find(v => String(v.id) === selectedVehicle) && (
              <div className="flex justify-between">
                <span className="text-[var(--amilcar-text-secondary)]">{t.bookings.vehicle}</span>
                <span className="font-medium text-white">
                  {(() => { const v = vehicles.find(v => String(v.id) === selectedVehicle); return v ? `${v.brand} ${v.model}` : ""; })()}
                </span>
              </div>
            )}
            <hr className="border-white/[0.06]" />
            <div className="flex justify-between items-center">
              <span className="text-[var(--amilcar-text-secondary)] font-medium">{t.bookings.price}</span>
              <div className="text-end">
                {vipPrice ? (
                  <div>
                    <span className="text-white/40 line-through text-sm">{selectedService.price} TND</span>
                    <span className="ms-2 text-xl font-bold text-amber-400">{vipPrice} TND</span>
                  </div>
                ) : (
                  <span className="text-xl font-bold text-white">{formatServicePriceLabel(selectedService, lang)}</span>
                )}
              </div>
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.bookings.notes}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
            />

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">{error}</div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 rounded-xl border border-white/10 py-3 text-[var(--amilcar-silver)] hover:bg-white/5 transition">
              {t.client.back}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 rounded-xl bg-[var(--amilcar-red)] py-3 font-bold text-white hover:bg-[var(--amilcar-red)]/80 disabled:opacity-50 transition"
            >
              {saving ? t.saving : t.client.confirmBooking}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
