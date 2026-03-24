"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import {
  api,
  type Vehicle,
  type ClientHistory,
} from "@/lib/api";

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, locale: lang } = useI18n();
  const [history, setHistory] = useState<ClientHistory | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"info" | "vehicles" | "history">("info");

  // Profile edit
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // Vehicle form
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vForm, setVForm] = useState({ brand: "", model: "", year: "", color: "", plate_number: "" });

  // Password
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [hist, vehs] = await Promise.all([
          api.get<ClientHistory>(`/api/v1/bookings/clients/${user.id}/history`),
          api.get<Vehicle[]>("/api/v1/bookings/vehicles"),
        ]);
        setHistory(hist);
        setVehicles(vehs);
        setProfileForm({ full_name: user.full_name, email: user.email, phone: user.phone });
      } catch { /* */ }
      setLoading(false);
    })();
  }, [user]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await api.patch("/api/v1/auth/me", profileForm);
      setEditing(false);
    } catch { /* */ }
    setSaving(false);
  }

  async function handleAddVehicle() {
    if (!vForm.brand || !vForm.plate_number) return;
    try {
      await api.post("/api/v1/bookings/vehicles", {
        ...vForm,
        year: vForm.year ? Number(vForm.year) : null,
        color: vForm.color || null,
      });
      setShowVehicleForm(false);
      setVForm({ brand: "", model: "", year: "", color: "", plate_number: "" });
      const vehs = await api.get<Vehicle[]>("/api/v1/bookings/vehicles");
      setVehicles(vehs);
    } catch { /* */ }
  }

  async function handleDeleteVehicle(id: number) {
    try {
      await api.delete(`/api/v1/bookings/vehicles/${id}`);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch { /* */ }
  }

  async function handleChangePassword() {
    setPwError("");
    setPwSuccess(false);
    try {
      await api.put("/api/v1/auth/me/password", pwForm);
      setPwSuccess(true);
      setPwForm({ old_password: "", new_password: "" });
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : String(err));
    }
  }

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
        <h1 className="mt-2 text-2xl font-bold text-white">{t.clientNav.profile}</h1>
      </div>

      {/* Profile Header Card */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--amilcar-navy)] text-2xl font-bold text-white">
            {user?.full_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user?.full_name}</h2>
              {user?.is_vip && (
                <span className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-0.5 text-xs font-bold text-black">⭐ VIP</span>
              )}
            </div>
            <p className="text-sm text-[var(--amilcar-text-secondary)]">{user?.email}</p>
            <p className="text-sm text-[var(--amilcar-text-secondary)]">{user?.phone}</p>
          </div>
          {history && (
            <div className="hidden sm:flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{history.total_visits}</p>
                <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.bookings.totalVisits}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{history.total_spent} <span className="text-sm">د.ت</span></p>
                <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.bookings.totalSpent}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{vehicles.length}</p>
                <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.bookings.vehicles}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button onClick={() => setTab("info")} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${tab === "info" ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)]"}`}>
          👤 {t.client.personalInfo}
        </button>
        <button onClick={() => setTab("vehicles")} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${tab === "vehicles" ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)]"}`}>
          🚗 {t.client.myCars} ({vehicles.length})
        </button>
        <button onClick={() => setTab("history")} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${tab === "history" ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)]"}`}>
          📋 {t.client.visitHistory}
        </button>
      </div>

      {/* Info Tab */}
      {tab === "info" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">{t.client.personalInfo}</h3>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-sm text-[var(--amilcar-red)] hover:underline">{t.edit}</button>
              )}
            </div>
            {editing ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.fullName}</span>
                  <input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </label>
                <label className="block">
                  <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.login.email}</span>
                  <input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </label>
                <label className="block">
                  <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.phone}</span>
                  <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </label>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-[var(--amilcar-silver)]">{t.cancel}</button>
                  <button onClick={handleSaveProfile} disabled={saving} className="flex-1 rounded-lg bg-[var(--amilcar-red)] py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? t.saving : t.save}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--amilcar-text-secondary)]">{t.workers.form.fullName}</span>
                  <span className="text-white">{user?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--amilcar-text-secondary)]">{t.login.email}</span>
                  <span className="text-white">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--amilcar-text-secondary)]">{t.workers.form.phone}</span>
                  <span className="text-white">{user?.phone}</span>
                </div>
                {user?.is_vip && user.vip_since && (
                  <div className="flex justify-between">
                    <span className="text-[var(--amilcar-text-secondary)]">{t.vip.memberSince}</span>
                    <span className="text-amber-400">{new Date(user.vip_since).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{t.client.changePassword}</h3>
              {!showPwForm && (
                <button onClick={() => setShowPwForm(true)} className="text-sm text-[var(--amilcar-red)] hover:underline">{t.edit}</button>
              )}
            </div>
            {showPwForm ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.client.oldPassword}</span>
                  <input type="password" value={pwForm.old_password} onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </label>
                <label className="block">
                  <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.client.newPassword}</span>
                  <input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                </label>
                {pwError && <p className="text-sm text-red-400">{pwError}</p>}
                {pwSuccess && <p className="text-sm text-green-400">{t.client.passwordChanged}</p>}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setShowPwForm(false); setPwError(""); setPwSuccess(false); }} className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-[var(--amilcar-silver)]">{t.cancel}</button>
                  <button onClick={handleChangePassword} disabled={!pwForm.old_password || !pwForm.new_password} className="flex-1 rounded-lg bg-[var(--amilcar-red)] py-2 text-sm font-medium text-white disabled:opacity-50">{t.save}</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--amilcar-text-secondary)]">••••••••</p>
            )}
          </div>
        </div>
      )}

      {/* Vehicles Tab */}
      {tab === "vehicles" && (
        <div className="space-y-4">
          <button onClick={() => setShowVehicleForm(true)} className="rounded-xl bg-[var(--amilcar-red)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--amilcar-red)]/80 transition">
            + {t.bookings.addVehicle}
          </button>
          {vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
              <span className="text-4xl">🚗</span>
              <p className="mt-3 text-[var(--amilcar-text-secondary)]">{t.client.noCars}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">🚗 {v.brand} {v.model}</h3>
                      <div className="mt-2 space-y-1 text-sm text-[var(--amilcar-text-secondary)]">
                        <p>🔖 {v.plate_number}</p>
                        {v.year && <p>📅 {v.year}</p>}
                        {v.color && <p>🎨 {v.color}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteVehicle(v.id)} className="text-red-400/50 hover:text-red-400 text-sm">{t.delete}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Vehicle Modal */}
          {showVehicleForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowVehicleForm(false)}>
              <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#111] p-6" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{t.bookings.addVehicle}</h3>
                  <button onClick={() => setShowVehicleForm(false)} className="text-[var(--amilcar-text-secondary)] hover:text-white text-xl">✕</button>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.brand}</span>
                    <input value={vForm.brand} onChange={(e) => setVForm({ ...vForm, brand: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.model}</span>
                    <input value={vForm.model} onChange={(e) => setVForm({ ...vForm, model: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.year}</span>
                      <input type="number" value={vForm.year} onChange={(e) => setVForm({ ...vForm, year: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.color}</span>
                      <input value={vForm.color} onChange={(e) => setVForm({ ...vForm, color: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.plateNumber}</span>
                    <input value={vForm.plate_number} onChange={(e) => setVForm({ ...vForm, plate_number: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowVehicleForm(false)} className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-[var(--amilcar-silver)]">{t.cancel}</button>
                    <button onClick={handleAddVehicle} disabled={!vForm.brand || !vForm.plate_number} className="flex-1 rounded-lg bg-[var(--amilcar-red)] py-2 text-sm font-medium text-white disabled:opacity-50">{t.save}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && history && (
        <div className="space-y-3">
          {history.bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
              <p className="text-[var(--amilcar-text-secondary)]">{t.bookings.noBookings}</p>
            </div>
          ) : (
            history.bookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{b.status === "completed" ? "✅" : b.status === "cancelled" ? "❌" : "📅"}</span>
                  <div>
                    <span className="font-medium text-white">{lang === "ar" ? b.service_name_ar || b.service_name : b.service_name}</span>
                    <div className="flex gap-3 text-xs text-[var(--amilcar-text-secondary)]">
                      <span>📅 {b.booking_date}</span>
                      <span>💰 {b.total_price} د.ت</span>
                      {b.is_paid && <span className="text-green-400">{t.bookings.payment.paid}</span>}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  b.status === "completed" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                  b.status === "cancelled" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                  "bg-blue-500/20 text-blue-400 border-blue-500/30"
                }`}>
                  {t.bookings.status[b.status]}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
