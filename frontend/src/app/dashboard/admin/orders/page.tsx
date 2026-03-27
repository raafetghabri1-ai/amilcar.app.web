"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { api, type OrderOut, type OrderStatus, type PaymentMethod } from "@/lib/api";

/* ═══════════════════ helpers ═══════════════════ */

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ready: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "ready", "completed"];

function getNextStatuses(current: OrderStatus): OrderStatus[] {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return [];
  return STATUS_FLOW.slice(idx + 1);
}

/* ═══════════════════ main component ═══════════════════ */

export default function OrdersPage() {
  const { t, locale: lang } = useI18n();

  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const url = statusFilter
        ? `/api/v1/orders/?status_filter=${statusFilter}`
        : "/api/v1/orders/";
      const data = await api.get<OrderOut[]>(url);
      setOrders(data);
    } catch {
      /* ignore */
    }
  }, [statusFilter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadOrders();
      setLoading(false);
    })();
  }, [loadOrders]);

  /* ─── actions ─── */
  async function updateStatus(id: number, status: OrderStatus) {
    try {
      await api.patch(`/api/v1/orders/${id}`, { status });
      await loadOrders();
    } catch {
      /* ignore */
    }
  }

  async function togglePaid(id: number, is_paid: boolean) {
    try {
      await api.patch(`/api/v1/orders/${id}`, { is_paid });
      await loadOrders();
    } catch {
      /* ignore */
    }
  }

  async function setPaymentMethod(id: number, payment_method: PaymentMethod) {
    try {
      await api.patch(`/api/v1/orders/${id}`, { payment_method });
      await loadOrders();
    } catch {
      /* ignore */
    }
  }

  async function cancelOrder(id: number) {
    try {
      await api.delete(`/api/v1/orders/${id}`);
      setConfirmCancel(null);
      await loadOrders();
    } catch {
      /* ignore */
    }
  }

  /* ─── derived ─── */
  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(o.id).includes(q) ||
      (o.client_name && o.client_name.toLowerCase().includes(q)) ||
      o.items.some(
        (item) =>
          item.product_name?.toLowerCase().includes(q) ||
          item.product_name_ar?.toLowerCase().includes(q)
      )
    );
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    ready: orders.filter((o) => o.status === "ready").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  function getStatusLabel(s: OrderStatus): string {
    return t.orders.status[s] || s;
  }

  /* ═══════════════════ render ═══════════════════ */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t.orders.title}</h1>
        <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.orders.subtitle}</p>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t.orders.totalOrders, value: stats.total, color: "text-white" },
          { label: t.orders.pendingOrders, value: stats.pending, color: "text-yellow-400" },
          { label: t.orders.readyOrders, value: stats.ready, color: "text-purple-400" },
          { label: t.orders.completedOrders, value: stats.completed, color: "text-green-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4"
          >
            <p className="text-xs text-[var(--amilcar-text-secondary)]">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Filter & Search ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["", "pending", "confirmed", "ready", "completed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm transition ${
                statusFilter === s
                  ? "bg-[var(--amilcar-red)] text-white"
                  : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
              }`}
            >
              {s === "" ? t.orders.filterAll : getStatusLabel(s)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.orders.searchPlaceholder}
          className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-[var(--amilcar-text-secondary)]"
        />
      </div>

      {/* ─── Orders Table ─── */}
      {filtered.length === 0 ? (
        <p className="text-center py-10 text-[var(--amilcar-text-secondary)]">{t.orders.noOrders}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[var(--amilcar-card)]">
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.orders.orderId}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.orders.client}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.orders.items}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.orders.total}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.status}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.orders.date}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  lang={lang}
                  t={t}
                  expanded={expandedId === order.id}
                  onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  onUpdateStatus={updateStatus}
                  onTogglePaid={togglePaid}
                  onSetPaymentMethod={setPaymentMethod}
                  onCancel={() => setConfirmCancel(order.id)}
                  getStatusLabel={getStatusLabel}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Cancel Confirmation Modal ─── */}
      {confirmCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmCancel(null)}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#111] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">{t.orders.cancelOrder}</h3>
            <p className="text-sm text-[var(--amilcar-text-secondary)] mb-1">{t.orders.cancelConfirm}</p>
            <p className="text-xs text-yellow-400 mb-4">{t.orders.cancelWarn}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-[var(--amilcar-silver)]"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => cancelOrder(confirmCancel)}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white"
              >
                {t.orders.cancelOrder}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ sub-components ═══════════════════ */

function OrderRow({
  order,
  lang,
  t,
  expanded,
  onToggle,
  onUpdateStatus,
  onTogglePaid,
  onSetPaymentMethod,
  onCancel,
  getStatusLabel,
}: {
  order: OrderOut;
  lang: string;
  t: ReturnType<typeof useI18n>["t"];
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (id: number, status: OrderStatus) => void;
  onTogglePaid: (id: number, is_paid: boolean) => void;
  onSetPaymentMethod: (id: number, pm: PaymentMethod) => void;
  onCancel: () => void;
  getStatusLabel: (s: OrderStatus) => string;
}) {
  const nextStatuses = getNextStatuses(order.status);
  const canCancel = order.status !== "cancelled" && order.status !== "completed";

  return (
    <>
      <tr
        className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-mono text-white">#{order.id}</td>
        <td className="px-4 py-3 text-white">{order.client_name || "—"}</td>
        <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">
          {order.items.length > 0
            ? order.items
                .map((i) => {
                  const name = lang === "ar" ? i.product_name_ar || i.product_name : i.product_name;
                  return `${name} ×${i.quantity}`;
                })
                .join(", ")
            : "—"}
        </td>
        <td className="px-4 py-3 font-medium text-white">
          {Number(order.total_amount).toFixed(3)} {t.finance.tnd}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
            {getStatusLabel(order.status)}
          </span>
        </td>
        <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">
          {new Date(order.created_at).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {nextStatuses.map((ns) => (
              <button
                key={ns}
                onClick={() => onUpdateStatus(order.id, ns)}
                className={`rounded-lg border px-2 py-1 text-xs transition hover:opacity-80 ${STATUS_COLORS[ns]}`}
                title={getStatusLabel(ns)}
              >
                {getStatusLabel(ns)}
              </button>
            ))}
            {canCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
              >
                ✕
              </button>
            )}
          </div>
        </td>
      </tr>
      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-white/[0.02]">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/[0.06] bg-[var(--amilcar-card)] p-3"
                >
                  <p className="text-sm font-medium text-white">
                    {lang === "ar" ? item.product_name_ar || item.product_name : item.product_name}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--amilcar-text-secondary)]">
                    <span>×{item.quantity}</span>
                    <span>{Number(item.unit_price).toFixed(3)} {t.finance.tnd}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment controls */}
            <div className="mt-4 flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {/* Payment status toggle */}
              <button
                onClick={() => onTogglePaid(order.id, !order.is_paid)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                  order.is_paid
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                {order.is_paid ? t.invoices.payment.paid : t.invoices.payment.unpaid}
              </button>

              {/* Payment method selector */}
              <select
                value={order.payment_method || ""}
                onChange={(e) => {
                  if (e.target.value) onSetPaymentMethod(order.id, e.target.value as PaymentMethod);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
              >
                <option value="">—</option>
                <option value="cash">{t.invoices.payment.cash}</option>
                <option value="card">{t.invoices.payment.card}</option>
                <option value="bank_transfer">{t.invoices.payment.bank_transfer}</option>
              </select>
            </div>

            {order.updated_at && (
              <p className="mt-3 text-xs text-[var(--amilcar-text-secondary)]">
                {t.orders.updateStatus}: {new Date(order.updated_at).toLocaleString(lang === "ar" ? "ar-TN" : "fr-FR")}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
