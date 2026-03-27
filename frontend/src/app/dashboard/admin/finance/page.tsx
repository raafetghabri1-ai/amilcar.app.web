"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  api,
  type MonthlyReport,
  type ServiceRevenue,
  type ExpenseByCat,
  type FinanceSummary,
} from "@/lib/api";

/* ═══════════════════ main component ═══════════════════ */

export default function FinancePage() {
  const { t, locale: lang } = useI18n();

  const [tab, setTab] = useState<"summary" | "monthly" | "service" | "expense">("summary");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // data
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [byService, setByService] = useState<ServiceRevenue[]>([]);
  const [byExpense, setByExpense] = useState<ExpenseByCat[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sum, mon, svc, exp] = await Promise.all([
          api.get<FinanceSummary>("/api/v1/finance/summary"),
          api.get<MonthlyReport>(`/api/v1/finance/report/monthly?year=${year}`),
          api.get<ServiceRevenue[]>("/api/v1/finance/report/by-service"),
          api.get<ExpenseByCat[]>("/api/v1/finance/report/by-expense-category"),
        ]);
        setSummary(sum);
        setMonthly(mon);
        setByService(svc);
        setByExpense(exp);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" />
      </div>
    );
  }

  const monthNames = t.finance.months as unknown as Record<number, string>;
  const expCatNames = t.finance.expenseCategories as unknown as Record<string, string>;

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t.finance.title}</h1>
        <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.finance.subtitle}</p>
      </div>

      {/* ─── Summary Cards ─── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label={t.finance.totalRevenue} value={summary.total_revenue} color="text-green-400" tnd={t.finance.tnd} />
          <SummaryCard label={t.finance.totalExpenses} value={summary.total_expense} color="text-red-400" tnd={t.finance.tnd} />
          <SummaryCard
            label={t.finance.netProfit}
            value={summary.net_profit}
            color={summary.net_profit >= 0 ? "text-emerald-400" : "text-red-400"}
            tnd={t.finance.tnd}
          />
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(["summary", "monthly", "service", "expense"] as const).map((tb) => {
          const labels: Record<string, string> = {
            summary: t.finance.summary,
            monthly: t.finance.monthlyReport,
            service: t.finance.byService,
            expense: t.finance.byExpenseCategory,
          };
          return (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                tab === tb
                  ? "bg-[var(--amilcar-red)] text-white"
                  : "border border-white/10 text-[var(--amilcar-text-secondary)] hover:bg-white/5"
              }`}
            >
              {labels[tb]}
            </button>
          );
        })}

        {tab === "monthly" && (
          <div className="flex items-center gap-2 ms-auto">
            <button
              onClick={() => setYear(year - 1)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--amilcar-silver)] hover:bg-white/5"
            >
              ←
            </button>
            <span className="text-sm font-medium text-white">{year}</span>
            <button
              onClick={() => setYear(year + 1)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--amilcar-silver)] hover:bg-white/5"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* ═══════ SUMMARY TAB ═══════ */}
      {tab === "summary" && monthly && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            {t.finance.monthlyReport} — {year}
          </h2>
          {/* Visual bar chart */}
          <div className="space-y-3">
            {monthly.months.map((m) => {
              const maxVal = Math.max(...monthly.months.map((x) => Math.max(x.revenue, x.expense)), 1);
              return (
                <div key={m.month} className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{monthNames[m.month]}</span>
                    <span className={`text-sm font-bold ${m.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {m.profit.toFixed(3)} {t.finance.tnd}
                    </span>
                  </div>
                  {/* Revenue bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-20 text-xs text-[var(--amilcar-text-secondary)]">{t.finance.revenue}</span>
                    <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500/60"
                        style={{ width: `${(m.revenue / maxVal) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-end text-xs text-green-400">{m.revenue.toFixed(3)}</span>
                  </div>
                  {/* Expense bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-[var(--amilcar-text-secondary)]">{t.finance.expenses}</span>
                    <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500/60"
                        style={{ width: `${(m.expense / maxVal) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-end text-xs text-red-400">{m.expense.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ MONTHLY TABLE TAB ═══════ */}
      {tab === "monthly" && monthly && (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[var(--amilcar-card)]">
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.finance.month}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.finance.revenue}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.finance.expenses}</th>
                <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.finance.profit}</th>
              </tr>
            </thead>
            <tbody>
              {monthly.months.map((m) => (
                <tr key={m.month} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 text-white font-medium">{monthNames[m.month]}</td>
                  <td className="px-4 py-3 text-green-400">{m.revenue.toFixed(3)} {t.finance.tnd}</td>
                  <td className="px-4 py-3 text-red-400">{m.expense.toFixed(3)} {t.finance.tnd}</td>
                  <td className={`px-4 py-3 font-semibold ${m.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {m.profit.toFixed(3)} {t.finance.tnd}
                  </td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-[var(--amilcar-card)] font-bold">
                <td className="px-4 py-3 text-white">{t.orders.total}</td>
                <td className="px-4 py-3 text-green-400">
                  {monthly.months.reduce((s, m) => s + m.revenue, 0).toFixed(3)} {t.finance.tnd}
                </td>
                <td className="px-4 py-3 text-red-400">
                  {monthly.months.reduce((s, m) => s + m.expense, 0).toFixed(3)} {t.finance.tnd}
                </td>
                <td className={`px-4 py-3 ${monthly.months.reduce((s, m) => s + m.profit, 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {monthly.months.reduce((s, m) => s + m.profit, 0).toFixed(3)} {t.finance.tnd}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════ BY SERVICE TAB ═══════ */}
      {tab === "service" && (
        <div>
          {byService.length === 0 ? (
            <p className="text-center py-10 text-[var(--amilcar-text-secondary)]">{t.finance.noData}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[var(--amilcar-card)]">
                    <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.finance.service}</th>
                    <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.finance.bookingsCount}</th>
                    <th className="px-4 py-3 text-start text-[var(--amilcar-text-secondary)] font-medium">{t.finance.revenue}</th>
                  </tr>
                </thead>
                <tbody>
                  {byService.map((s) => {
                    const maxRev = Math.max(...byService.map((x) => x.total_revenue), 1);
                    return (
                      <tr key={s.service_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">
                            {lang === "ar" ? s.service_name_ar || s.service_name : s.service_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--amilcar-text-secondary)]">{s.bookings_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[var(--amilcar-red)]/60"
                                style={{ width: `${(s.total_revenue / maxRev) * 100}%` }}
                              />
                            </div>
                            <span className="text-white font-medium whitespace-nowrap">
                              {s.total_revenue.toFixed(3)} {t.finance.tnd}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════ BY EXPENSE CATEGORY TAB ═══════ */}
      {tab === "expense" && (
        <div>
          {byExpense.length === 0 ? (
            <p className="text-center py-10 text-[var(--amilcar-text-secondary)]">{t.finance.noData}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byExpense.map((cat) => {
                const total = byExpense.reduce((s, c) => s + c.total, 0);
                const pct = total > 0 ? ((cat.total / total) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={cat.category}
                    className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-white">
                        {expCatNames[cat.category] || cat.category}
                      </h3>
                      <span className="rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-xs text-red-400">
                        {pct}%
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {cat.total.toFixed(3)} <span className="text-sm font-normal text-[var(--amilcar-text-secondary)]">{t.finance.tnd}</span>
                    </p>
                    <p className="text-xs text-[var(--amilcar-text-secondary)] mt-1">
                      {cat.count} {t.finance.count.toLowerCase()}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ sub-components ═══════════════════ */

function SummaryCard({
  label,
  value,
  color,
  tnd,
}: {
  label: string;
  value: number;
  color: string;
  tnd: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
      <p className="text-xs text-[var(--amilcar-text-secondary)]">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        {value.toFixed(3)} <span className="text-sm font-normal text-[var(--amilcar-text-secondary)]">{tnd}</span>
      </p>
    </div>
  );
}
