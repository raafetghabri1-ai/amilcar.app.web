"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { api, API_BASE_URL, type InvoiceOut } from "@/lib/api";

/* ═══════════════════ main component ═══════════════════ */

export default function InvoicesPage() {
  const { t, locale: lang } = useI18n();

  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [genType, setGenType] = useState<"booking" | "order">("booking");
  const [genId, setGenId] = useState("");
  const [genError, setGenError] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await api.get<InvoiceOut[]>("/api/v1/invoices/");
      setInvoices(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadInvoices();
      setLoading(false);
    })();
  }, [loadInvoices]);

  /* ─── generate invoice ─── */
  async function handleGenerate() {
    if (!genId) return;
    setGenLoading(true);
    setGenError("");
    try {
      const url =
        genType === "booking"
          ? `/api/v1/invoices/auto-generate/booking/${genId}`
          : `/api/v1/invoices/auto-generate/order/${genId}`;
      await api.post<InvoiceOut>(url, {});
      setShowGenerate(false);
      setGenId("");
      await loadInvoices();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenLoading(false);
    }
  }

  /* ─── download PDF ─── */
  function downloadPdf(inv: InvoiceOut) {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const url = `${API_BASE_URL}/api/v1/invoices/${inv.id}/pdf`;
    const a = document.createElement("a");

    // Use fetch + blob for auth header
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = `${inv.invoice_number}.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  }

  /* ─── filter ─── */
  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.client_name && inv.client_name.toLowerCase().includes(q))
    );
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.is_paid).length,
    unpaid: invoices.filter((i) => !i.is_paid).length,
    amount: invoices.reduce((s, i) => s + Number(i.total_amount), 0),
  };

  function getPaymentLabel(pm: string | null): string {
    if (!pm) return "—";
    const map = t.invoices.payment as Record<string, string>;
    return map[pm] || pm;
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.invoices.title}</h1>
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.invoices.subtitle}</p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="rounded-lg bg-[var(--amilcar-red)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red)]/80"
        >
          + {t.invoices.generateInvoice}
        </button>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t.invoices.totalInvoices, value: String(stats.total), color: "text-white" },
          { label: t.invoices.paidInvoices, value: String(stats.paid), color: "text-green-400" },
          { label: t.invoices.unpaidInvoices, value: String(stats.unpaid), color: "text-red-400" },
          { label: t.invoices.totalAmount, value: `${stats.amount.toFixed(3)} ${t.finance.tnd}`, color: "text-blue-400" },
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

      {/* ─── Search ─── */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.invoices.searchPlaceholder}
          className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-[var(--amilcar-text-secondary)]"
        />
      </div>

      {/* ─── Invoices Table ─── */}
      {filtered.length === 0 ? (
        <p className="text-center py-10 text-[var(--amilcar-text-secondary)]">{t.invoices.noInvoices}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[var(--amilcar-card)]">
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.invoices.invoiceNumber}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.invoices.client}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.invoices.type}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.invoices.amount}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.invoices.vat}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.invoices.total}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.status}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.invoices.date}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 font-mono text-white font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-white">
                    <div>{inv.client_name || "—"}</div>
                    {inv.client_phone && (
                      <div className="text-xs text-[var(--amilcar-text-secondary)]">{inv.client_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {inv.booking_id ? (
                      <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-400">
                        {t.invoices.booking} #{inv.booking_id}
                      </span>
                    ) : inv.order_id ? (
                      <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs text-purple-400">
                        {t.invoices.order} #{inv.order_id}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">{Number(inv.amount).toFixed(3)}</td>
                  <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">{Number(inv.vat_amount).toFixed(3)}</td>
                  <td className="px-4 py-3 font-medium text-white">{Number(inv.total_amount).toFixed(3)} {t.finance.tnd}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          inv.is_paid
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {inv.is_paid ? t.invoices.payment.paid : t.invoices.payment.unpaid}
                      </span>
                      {inv.payment_method && (
                        <span className="text-xs text-[var(--amilcar-text-secondary)]">
                          {getPaymentLabel(inv.payment_method)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">
                    {new Date(inv.issue_date).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => downloadPdf(inv)}
                      className="rounded-lg border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 px-3 py-1.5 text-xs text-[var(--amilcar-red)] hover:bg-[var(--amilcar-red)]/20 transition flex items-center gap-1"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Generate Invoice Modal ─── */}
      {showGenerate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowGenerate(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#111] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">{t.invoices.generateInvoice}</h3>

            {/* Type toggle */}
            <div className="flex rounded-lg border border-white/10 overflow-hidden mb-4">
              {(["booking", "order"] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => {
                    setGenType(tp);
                    setGenError("");
                  }}
                  className={`flex-1 px-4 py-2 text-sm transition ${
                    genType === tp
                      ? "bg-[var(--amilcar-red)] text-white"
                      : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
                  }`}
                >
                  {tp === "booking" ? t.invoices.fromBooking : t.invoices.fromOrder}
                </button>
              ))}
            </div>

            {/* ID input */}
            <label className="block mb-4">
              <span className="text-sm text-[var(--amilcar-text-secondary)]">
                {genType === "booking" ? `${t.invoices.booking} ID` : `${t.invoices.order} ID`}
              </span>
              <input
                type="number"
                min="1"
                value={genId}
                onChange={(e) => setGenId(e.target.value)}
                placeholder="1"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>

            {genError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400 mb-4">
                {genError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowGenerate(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-[var(--amilcar-silver)]"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleGenerate}
                disabled={genLoading || !genId}
                className="flex-1 rounded-lg bg-[var(--amilcar-red)] py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {genLoading ? t.loading : t.invoices.generateInvoice}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
