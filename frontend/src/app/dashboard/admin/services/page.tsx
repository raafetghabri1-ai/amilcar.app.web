"use client";

import { useCallback, useEffect, useState } from "react";

import { api, type ServiceItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatServicePriceLabel, getServicePresentation } from "@/lib/service-presentation";

type ServiceForm = {
  name: string;
  name_ar: string;
  description: string;
  category: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  name_ar: "",
  description: "",
  category: "wash",
  price: "",
  duration_minutes: "60",
  is_active: true,
};

const categories = ["wash", "polish", "ceramic", "interior", "exterior", "paint_protection", "detailing", "other"];

export default function AdminServicesPage() {
  const { t, locale } = useI18n();
  const lang = locale as "ar" | "fr";
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const data = await api.get<ServiceItem[]>("/api/v1/services/all");
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.workers.errorOccurred);
    } finally {
      setLoading(false);
    }
  }, [t.workers.errorOccurred]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingService(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (service: ServiceItem) => {
    setEditingService(service);
    setForm({
      name: service.name,
      name_ar: service.name_ar || "",
      description: service.description || "",
      category: service.category,
      price: String(service.price),
      duration_minutes: String(service.duration_minutes),
      is_active: service.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        name_ar: form.name_ar || null,
        description: form.description || null,
        category: form.category,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        is_active: form.is_active,
      };

      if (editingService) {
        await api.patch(`/api/v1/services/${editingService.id}`, payload);
      } else {
        await api.post("/api/v1/services/", payload);
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.workers.errorOccurred);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (serviceId: number) => {
    try {
      await api.delete(`/api/v1/services/${serviceId}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.workers.errorDeleting);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.admin.services.title}</h1>
          <p className="mt-1 text-[var(--amilcar-text-secondary)]">{t.admin.services.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-lg bg-[var(--amilcar-red)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--amilcar-red-dark)]"
        >
          + {t.admin.services.addService}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.admin.services.total}</p>
          <p className="mt-1 text-3xl font-bold text-white">{services.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.admin.services.active}</p>
          <p className="mt-1 text-3xl font-bold text-green-400">{services.filter((service) => service.is_active).length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.admin.services.startingFromLabel}</p>
          <p className="mt-1 text-3xl font-bold text-amber-400">
            {services.filter((service) => getServicePresentation(service).startsFrom).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {services.map((service) => {
          const presentation = getServicePresentation(service);
          return (
            <div
              key={service.id}
              className={`rounded-2xl border bg-gradient-to-br ${presentation.accent} p-5 transition hover:scale-[1.01]`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-3xl">{presentation.icon}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${service.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {service.is_active ? t.active : t.inactive}
                    </span>
                    {presentation.startsFrom && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                        {t.admin.services.startingFromLabel}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">{lang === "ar" ? service.name_ar || service.name : service.name}</h2>
                  <p className="mt-1 text-sm text-white/70">{lang === "ar" ? presentation.headlineAr : presentation.headlineFr}</p>
                  {service.description && <p className="mt-3 text-sm text-white/60">{service.description}</p>}
                </div>
                <div className="text-end">
                  <p className="text-lg font-bold text-white">{formatServicePriceLabel(service, lang)}</p>
                  <p className="mt-1 text-xs text-[var(--amilcar-text-secondary)]">⏱ {service.duration_minutes} {t.bookings.minutes}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[var(--amilcar-silver)]">{t.client.serviceCategories[service.category as keyof typeof t.client.serviceCategories] || service.category}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(service)} className="rounded-lg border border-white/10 px-3 py-1.5 text-[var(--amilcar-silver)] transition hover:border-white/25 hover:text-white">{t.edit}</button>
                  <button onClick={() => handleDelete(service.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-red-400 transition hover:bg-red-500/10">{t.delete}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="mb-5 text-lg font-bold text-white">
              {editingService ? t.admin.services.editService : t.admin.services.addService}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">FR</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">AR</span>
                  <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.admin.services.marketingDescription}</span>
                <textarea value={form.description} rows={3} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.admin.services.category}</span>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50">
                    {categories.map((category) => (
                      <option key={category} value={category}>{t.client.serviceCategories[category as keyof typeof t.client.serviceCategories] || category}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.price}</span>
                  <input type="number" step="0.001" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.bookings.duration}</span>
                  <input type="number" min="5" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-white">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                {t.active}
              </label>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--amilcar-silver)] transition hover:border-white/20">{t.cancel}</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--amilcar-red)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--amilcar-red-dark)] disabled:opacity-50">{submitting ? t.saving : t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
