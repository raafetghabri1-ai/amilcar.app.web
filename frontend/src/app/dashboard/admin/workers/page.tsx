"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { User, WorkerStats } from "@/lib/api";

interface WorkerForm {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  specialty: string;
  salary: string;
}

const emptyForm: WorkerForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  specialty: "",
  salary: "",
};

export default function WorkersPage() {
  const { t } = useI18n();
  const [workers, setWorkers] = useState<User[]>([]);
  const [stats, setStats] = useState<WorkerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<User | null>(null);
  const [form, setForm] = useState<WorkerForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [workersData, statsData] = await Promise.all([
        api.get<User[]>("/api/v1/users/?role=worker"),
        api.get<WorkerStats[]>("/api/v1/users/workers/stats"),
      ]);
      setWorkers(workersData);
      setStats(statsData);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingWorker(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (w: User) => {
    setEditingWorker(w);
    setForm({
      full_name: w.full_name,
      email: w.email,
      phone: w.phone,
      password: "",
      specialty: w.specialty || "",
      salary: w.salary?.toString() || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (editingWorker) {
        const payload: Record<string, unknown> = {};
        if (form.full_name !== editingWorker.full_name) payload.full_name = form.full_name;
        if (form.email !== editingWorker.email) payload.email = form.email;
        if (form.phone !== editingWorker.phone) payload.phone = form.phone;
        if (form.specialty !== (editingWorker.specialty || "")) payload.specialty = form.specialty || null;
        if (form.salary !== (editingWorker.salary?.toString() || ""))
          payload.salary = form.salary ? parseFloat(form.salary) : null;
        await api.patch(`/api/v1/users/${editingWorker.id}`, payload);
      } else {
        await api.post("/api/v1/users/", {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: "worker",
          specialty: form.specialty || null,
          salary: form.salary ? parseFloat(form.salary) : null,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.workers.errorOccurred);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/v1/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.workers.errorDeleting);
    }
  };

  const getWorkerStats = (workerId: number) =>
    stats.find((s) => s.worker_id === workerId);

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.workers.title}</h1>
          <p className="mt-1 text-[var(--amilcar-text-secondary)]">
            {workers.length} {t.workers.registered}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-[var(--amilcar-red)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--amilcar-red-dark)]"
        >
          <span className="text-lg">+</span>
          {t.workers.addWorker}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.workers.totalWorkers}</p>
          <p className="mt-1 text-3xl font-bold text-white">{workers.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.workers.activeWorkers}</p>
          <p className="mt-1 text-3xl font-bold text-green-400">
            {workers.filter((w) => w.is_active).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.workers.avgAttendance}</p>
          <p className="mt-1 text-3xl font-bold text-[var(--amilcar-silver)]">
            {stats.length > 0
              ? (stats.reduce((a, s) => a + s.attendance_rate, 0) / stats.length).toFixed(1)
              : "0"}
            %
          </p>
        </div>
      </div>

      {/* Workers Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/30">
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.worker}</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.specialty}</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.salary}</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.attendance}</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.completedCars}</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.performance}</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.status}</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.workers.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const ws = getWorkerStats(w.id);
                return (
                  <tr
                    key={w.id}
                    className="border-b border-white/[0.04] transition hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{w.full_name}</p>
                        <p className="text-xs text-[var(--amilcar-text-secondary)]">{w.phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--amilcar-silver)]">
                      {w.specialty || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {w.salary ? `${Number(w.salary).toFixed(3)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ws ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${Math.min(ws.attendance_rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--amilcar-text-secondary)]">
                            {ws.attendance_rate}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--amilcar-text-secondary)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {ws?.completed_bookings ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ws ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--amilcar-red)]/10 px-2.5 py-1 text-xs font-medium text-[var(--amilcar-red)]">
                          ⭐ {ws.performance_points}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          w.is_active
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {w.is_active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(w)}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--amilcar-silver)] transition hover:border-[var(--amilcar-silver)]/50 hover:text-white"
                        >
                          {t.edit}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(w)}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--amilcar-text-secondary)]">
                    {t.workers.noWorkers}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="mb-5 text-lg font-bold text-white">
              {editingWorker ? t.workers.editTitle : t.workers.addTitle}
            </h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.fullName}</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--amilcar-red)]/50"
                  placeholder={t.workers.form.fullNamePlaceholder}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.email}</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--amilcar-red)]/50"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.phone}</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--amilcar-red)]/50"
                    placeholder="21600000000"
                  />
                </div>
              </div>
              {!editingWorker && (
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.password}</label>
                  <input
                    type="password"
                    required={!editingWorker}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--amilcar-red)]/50"
                    placeholder={t.workers.form.passwordPlaceholder}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.specialty}</label>
                  <input
                    type="text"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--amilcar-red)]/50"
                    placeholder={t.workers.form.specialtyPlaceholder}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.workers.form.salaryLabel}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--amilcar-red)]/50"
                    placeholder="0.000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--amilcar-silver)] transition hover:border-white/20"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[var(--amilcar-red)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--amilcar-red-dark)] disabled:opacity-50"
                >
                  {submitting ? t.saving : editingWorker ? t.workers.saveChanges : t.workers.addButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t.workers.deleteConfirm}</h3>
            <p className="mb-6 text-sm text-[var(--amilcar-text-secondary)]">
              {t.workers.deleteMsg}{" "}
              <span className="font-medium text-white">{deleteTarget.full_name}</span>?
              <br />
              {t.workers.deleteWarn}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--amilcar-silver)] transition hover:border-white/20"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
