"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { api, type ClientDetail } from "@/lib/api";

export default function AdminClientsPage() {
  const { t, locale: lang } = useI18n();
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientDetail | null>(null);
  const [editingBirth, setEditingBirth] = useState<{ id: number; date: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<ClientDetail[]>("/api/v1/users/clients/details");
        setClients(data);
      } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.vehicles.some((v) => v.plate_number.includes(search))
  );

  async function saveBirthDate(clientId: number, date: string) {
    try {
      await api.patch(`/api/v1/users/${clientId}`, { date_of_birth: date });
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, date_of_birth: date } : c))
      );
      if (selected?.id === clientId) setSelected({ ...selected, date_of_birth: date });
      setEditingBirth(null);
    } catch { /* */ }
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.clients.title}</h1>
          <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">
            {filtered.length} {t.clients.registered}
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.clients.searchPlaceholder}
          className="w-full sm:w-72 rounded-xl border border-white/10 bg-[var(--amilcar-card)] px-4 py-2.5 text-white text-sm placeholder:text-white/30"
        />
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 text-center">
          <p className="text-2xl font-bold text-white">{clients.length}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.clients.totalClients}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{clients.filter((c) => c.is_vip).length}</p>
          <p className="text-xs text-amber-400/70">{t.clients.vipClients}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 text-center">
          <p className="text-2xl font-bold text-white">{clients.reduce((s, c) => s + c.vehicles.length, 0)}</p>
          <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.clients.totalCars}</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{clients.reduce((s, c) => s + c.total_spent, 0).toFixed(0)} <span className="text-sm">د.ت</span></p>
          <p className="text-xs text-green-400/70">{t.clients.totalRevenue}</p>
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[var(--amilcar-text-secondary)]">
                <th className="px-4 py-3 text-start font-medium">{t.clients.name}</th>
                <th className="px-4 py-3 text-start font-medium">{t.clients.phone}</th>
                <th className="px-4 py-3 text-start font-medium">{t.clients.email}</th>
                <th className="px-4 py-3 text-start font-medium">{t.clients.cars}</th>
                <th className="px-4 py-3 text-center font-medium">{t.clients.visits}</th>
                <th className="px-4 py-3 text-center font-medium">{t.clients.spent}</th>
                <th className="px-4 py-3 text-center font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--amilcar-navy)] text-xs font-bold text-white">
                        {c.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-white">{c.full_name}</span>
                        {c.is_vip && (
                          <span className="ms-1.5 inline-block rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">⭐ VIP</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">
                    <a href={`tel:${c.phone}`} className="hover:text-white transition">{c.phone}</a>
                  </td>
                  <td className="px-4 py-3 text-[var(--amilcar-text-secondary)] text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">
                    {c.vehicles.length > 0
                      ? c.vehicles.map((v) => `${v.brand} ${v.model}`).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-white">{c.total_visits}</td>
                  <td className="px-4 py-3 text-center font-medium text-green-400">{c.total_spent} د.ت</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelected(c)}
                      className="rounded-lg bg-[var(--amilcar-red)]/10 border border-[var(--amilcar-red)]/20 px-3 py-1 text-xs text-[var(--amilcar-red)] hover:bg-[var(--amilcar-red)]/20 transition"
                    >
                      {t.clients.viewDetails}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-[var(--amilcar-text-secondary)]">{t.noData}</div>
        )}
      </div>

      {/* ═══ Client Detail Modal ═══ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setSelected(null); setEditingBirth(null); }}>
          <div className="w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[#0d0d0d] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0d0d0d] p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--amilcar-navy)] text-xl font-bold text-white">
                    {selected.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{selected.full_name}</h2>
                      {selected.is_vip && (
                        <span className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-0.5 text-xs font-bold text-black">⭐ VIP — {selected.vip_discount_percent}%</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.clients.memberSince} {new Date(selected.created_at).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}</p>
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setEditingBirth(null); }} className="text-[var(--amilcar-text-secondary)] hover:text-white text-xl p-1">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info */}
              <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">👤 {t.clients.personalInfo}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[var(--amilcar-text-secondary)]">{t.clients.phone}</span>
                    <p className="font-medium text-white">{selected.phone}</p>
                  </div>
                  <div>
                    <span className="text-[var(--amilcar-text-secondary)]">{t.clients.email}</span>
                    <p className="font-medium text-white">{selected.email}</p>
                  </div>
                  <div>
                    <span className="text-[var(--amilcar-text-secondary)]">{t.clients.birthDate}</span>
                    {editingBirth?.id === selected.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          value={editingBirth.date}
                          onChange={(e) => setEditingBirth({ ...editingBirth, date: e.target.value })}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white text-sm"
                        />
                        <button onClick={() => saveBirthDate(selected.id, editingBirth.date)} className="text-xs text-green-400 hover:underline">{t.save}</button>
                        <button onClick={() => setEditingBirth(null)} className="text-xs text-red-400 hover:underline">{t.cancel}</button>
                      </div>
                    ) : (
                      <p className="font-medium text-white flex items-center gap-2">
                        {selected.date_of_birth
                          ? new Date(selected.date_of_birth).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")
                          : "—"}
                        <button
                          onClick={() => setEditingBirth({ id: selected.id, date: selected.date_of_birth || "" })}
                          className="text-[10px] text-[var(--amilcar-red)] hover:underline"
                        >
                          {t.edit}
                        </button>
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--amilcar-text-secondary)]">VIP</span>
                    <p className="font-medium text-white">
                      {selected.is_vip
                        ? <span className="text-amber-400">✅ VIP — {selected.vip_discount_percent}%</span>
                        : <span className="text-white/40">—</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 text-center">
                  <p className="text-2xl font-bold text-white">{selected.total_visits}</p>
                  <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.clients.visits}</p>
                </div>
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{selected.total_spent} <span className="text-sm">د.ت</span></p>
                  <p className="text-xs text-green-400/70">{t.clients.spent}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4 text-center">
                  <p className="text-2xl font-bold text-white">{selected.vehicles.length}</p>
                  <p className="text-xs text-[var(--amilcar-text-secondary)]">{t.clients.cars}</p>
                </div>
              </div>

              {/* Vehicles */}
              {selected.vehicles.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-white text-sm flex items-center gap-2">🚗 {t.clients.cars}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selected.vehicles.map((v, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-3">
                        <p className="font-medium text-white">{v.brand} {v.model}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--amilcar-text-secondary)]">
                          <span>🔖 {v.plate_number}</span>
                          {v.year && <span>📅 {v.year}</span>}
                          {v.color && <span>🎨 {v.color}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service History */}
              {selected.services_used.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-white text-sm flex items-center gap-2">🛠️ {t.clients.serviceHistory} ({selected.services_used.length})</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selected.services_used.map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            s.status === "completed" ? "bg-green-500" :
                            s.status === "cancelled" ? "bg-red-500" :
                            s.status === "in_progress" ? "bg-orange-500" : "bg-yellow-500"
                          }`} />
                          <span className="text-white">{lang === "ar" ? s.service_name_ar || s.service_name : s.service_name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--amilcar-text-secondary)]">
                          <span>{s.date}</span>
                          <span className="font-medium text-white">{s.price} د.ت</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Store Orders */}
              {selected.orders.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-white text-sm flex items-center gap-2">🛍️ {t.clients.storeOrders} ({selected.orders.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selected.orders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-[var(--amilcar-text-secondary)]">#{order.id} — {new Date(order.created_at).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}</span>
                          <span className="font-bold text-white text-sm">{order.total_amount} د.ت</span>
                        </div>
                        <div className="space-y-0.5">
                          {order.items.map((item, j) => (
                            <div key={j} className="flex justify-between text-xs">
                              <span className="text-[var(--amilcar-text-secondary)]">{lang === "ar" ? item.product_name_ar || item.product_name : item.product_name} × {item.quantity}</span>
                              <span className="text-white">{(item.unit_price * item.quantity).toFixed(1)} د.ت</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty states */}
              {selected.services_used.length === 0 && selected.orders.length === 0 && selected.vehicles.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <span className="text-3xl">📋</span>
                  <p className="mt-2 text-[var(--amilcar-text-secondary)]">{t.clients.noHistory}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
