"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Product, Supplier, PurchaseLog, ServiceItem } from "@/lib/api";

type Tab = "products" | "suppliers" | "purchases";

/* ──────── tiny helpers ──────── */
const CATEGORIES = ["accessories","cleaning","protection","fragrance","polish","moisturizer","restorer","tools","other"] as const;
const UNITS = ["piece","ml","liter","kg","gram"] as const;
const UNIT_MIN_ALERT: Record<string, string> = { piece: "5", ml: "500", liter: "10", kg: "5", gram: "500" };
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function InventoryPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("products");

  /* data */
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseLog[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* modals */
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: "product"|"supplier"; id: number; name: string} | null>(null);

  /* forms */
  const emptyProduct = { name: "", name_ar: "", category: "cleaning" as string, price: "", cost_price: "", unit: "piece" as string, stock_quantity: "0", min_stock_alert: "5", consumption_per_car: "", service_id: "" };
  const emptySupplier = { name: "", phone: "", email: "", address: "", rating: "3", notes: "" };
  const emptyPurchase = { product_id: "", supplier_id: "", quantity: "1", unit_cost: "", notes: "" };

  const [pForm, setPForm] = useState(emptyProduct);
  const [sForm, setSForm] = useState(emptySupplier);
  const [purchForm, setPurchForm] = useState(emptyPurchase);

  const load = useCallback(async () => {
    try {
      const [prods, sups, purchs, svcs] = await Promise.all([
        api.get<Product[]>("/api/v1/products/?include_inactive=true"),
        api.get<Supplier[]>("/api/v1/products/suppliers/list"),
        api.get<PurchaseLog[]>("/api/v1/products/purchases/list"),
        api.get<ServiceItem[]>("/api/v1/services/"),
      ]);
      setProducts(prods);
      setSuppliers(sups);
      setPurchases(purchs);
      setServices(svcs);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lowStockCount = products.filter(p => p.is_active && p.stock_quantity <= p.min_stock_alert).length;

  /* ──── Product CRUD ──── */
  const openAddProduct = () => { setEditingProduct(null); setPForm(emptyProduct); setError(""); setShowProductModal(true); };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setPForm({ name: p.name, name_ar: p.name_ar || "", category: p.category, price: String(p.price), cost_price: p.cost_price ? String(p.cost_price) : "", unit: p.unit || "piece", stock_quantity: String(p.stock_quantity), min_stock_alert: String(p.min_stock_alert), consumption_per_car: p.consumption_per_car ? String(p.consumption_per_car) : "", service_id: p.service_id ? String(p.service_id) : "" });
    setError(""); setShowProductModal(true);
  };
  const handleUnitChange = (newUnit: string) => {
    setPForm(prev => ({ ...prev, unit: newUnit, min_stock_alert: UNIT_MIN_ALERT[newUnit] || "5" }));
  };
  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      const payload: Record<string, unknown> = {
        name: pForm.name, name_ar: pForm.name_ar || null, category: pForm.category,
        price: parseFloat(pForm.price), cost_price: pForm.cost_price ? parseFloat(pForm.cost_price) : null,
        unit: pForm.unit, stock_quantity: parseFloat(pForm.stock_quantity), min_stock_alert: parseFloat(pForm.min_stock_alert),
        consumption_per_car: pForm.consumption_per_car ? parseFloat(pForm.consumption_per_car) : null,
        service_id: pForm.service_id ? parseInt(pForm.service_id) : null,
      };
      if (editingProduct) await api.patch(`/api/v1/products/${editingProduct.id}`, payload);
      else await api.post("/api/v1/products/", payload);
      setShowProductModal(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSubmitting(false); }
  };

  /* ──── Supplier CRUD ──── */
  const openAddSupplier = () => { setEditingSupplier(null); setSForm(emptySupplier); setError(""); setShowSupplierModal(true); };
  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", rating: String(s.rating), notes: s.notes || "" });
    setError(""); setShowSupplierModal(true);
  };
  const submitSupplier = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      const payload = { name: sForm.name, phone: sForm.phone || null, email: sForm.email || null, address: sForm.address || null, rating: parseInt(sForm.rating), notes: sForm.notes || null };
      if (editingSupplier) await api.patch(`/api/v1/products/suppliers/${editingSupplier.id}`, payload);
      else await api.post("/api/v1/products/suppliers", payload);
      setShowSupplierModal(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSubmitting(false); }
  };

  /* ──── Purchase ──── */
  const openAddPurchase = () => { setPurchForm(emptyPurchase); setError(""); setShowPurchaseModal(true); };
  const submitPurchase = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      await api.post("/api/v1/products/purchases", {
        product_id: parseInt(purchForm.product_id),
        supplier_id: purchForm.supplier_id ? parseInt(purchForm.supplier_id) : null,
        quantity: parseFloat(purchForm.quantity),
        unit_cost: parseFloat(purchForm.unit_cost),
        notes: purchForm.notes || null,
      });
      setShowPurchaseModal(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSubmitting(false); }
  };

  /* ──── Delete ──── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "product") await api.delete(`/api/v1/products/${deleteTarget.id}`);
      else await api.delete(`/api/v1/products/suppliers/${deleteTarget.id}`);
      setDeleteTarget(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
  };

  const catLabel = (cat: string) => (t.inventory.categories as Record<string, string>)[cat] || cat;
  const unitLabel = (u: string) => (t.inventory.units as Record<string, string>)[u] || u;
  const serviceName = (id: number | null) => { if (!id) return t.inventory.product.noService; const s = services.find(sv => sv.id === id); return s ? (s.name_ar || s.name) : "—"; };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--amilcar-red)]" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.inventory.title}</h1>
        </div>
        <div className="flex gap-2">
          {tab === "products" && <button onClick={openAddProduct} className="flex items-center gap-2 rounded-lg bg-[var(--amilcar-red)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red-dark)]"><span>+</span>{t.inventory.addProduct}</button>}
          {tab === "suppliers" && <button onClick={openAddSupplier} className="flex items-center gap-2 rounded-lg bg-[var(--amilcar-red)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red-dark)]"><span>+</span>{t.inventory.addSupplier}</button>}
          {tab === "purchases" && <button onClick={openAddPurchase} className="flex items-center gap-2 rounded-lg bg-[var(--amilcar-red)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red-dark)]"><span>+</span>{t.inventory.addPurchase}</button>}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
          {t.inventory.lowStockAlert} — {lowStockCount} {t.inventory.tabs.products}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.totalProducts}</p>
          <p className="mt-1 text-3xl font-bold text-white">{products.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.lowStock}</p>
          <p className={`mt-1 text-3xl font-bold ${lowStockCount > 0 ? "text-yellow-400" : "text-green-400"}`}>{lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
          <p className="text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.totalSuppliers}</p>
          <p className="mt-1 text-3xl font-bold text-[var(--amilcar-silver)]">{suppliers.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-white/[0.06] bg-black/30 p-1 w-fit">
        {(["products","suppliers","purchases"] as Tab[]).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`rounded-md px-4 py-2 text-sm font-medium transition ${tab === t2 ? "bg-[var(--amilcar-red)] text-white" : "text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5"}`}>
            {t.inventory.tabs[t2]}
          </button>
        ))}
      </div>

      {/* ═══ PRODUCTS TAB ═══ */}
      {tab === "products" && (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-black/30">
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.product.name}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.product.category}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.product.price}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.product.costPrice}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.product.stock}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">🚗 {t.inventory.product.carsEstimate}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const isLow = p.stock_quantity <= p.min_stock_alert;
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{p.name}</p>
                        {p.name_ar && <p className="text-xs text-[var(--amilcar-text-secondary)]">{p.name_ar}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--amilcar-silver)]">{catLabel(p.category)}</td>
                      <td className="px-4 py-3 text-sm text-white">{Number(p.price).toFixed(3)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--amilcar-text-secondary)]">{p.cost_price ? Number(p.cost_price).toFixed(3) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${isLow ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>
                          {Number(p.stock_quantity) % 1 === 0 ? Number(p.stock_quantity) : Number(p.stock_quantity).toFixed(2)} {unitLabel(p.unit)} {isLow && "⚠️"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.cars_estimate != null ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${p.cars_estimate <= 5 ? "bg-red-500/10 text-red-400" : p.cars_estimate <= 15 ? "bg-yellow-500/10 text-yellow-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                            🚗 {p.cars_estimate} {t.inventory.product.cars}
                          </span>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditProduct(p)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--amilcar-silver)] hover:text-white">{t.edit}</button>
                          <button onClick={() => setDeleteTarget({type:"product",id:p.id,name:p.name})} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10">{t.delete}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--amilcar-text-secondary)]">{t.inventory.noProducts}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ SUPPLIERS TAB ═══ */}
      {tab === "suppliers" && (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-black/30">
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.name}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.phone}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.email}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.rating}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.notes}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--amilcar-silver)]" dir="ltr">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-[var(--amilcar-text-secondary)]">{s.email || "—"}</td>
                    <td className="px-4 py-3 text-sm text-yellow-400">{stars(s.rating)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--amilcar-text-secondary)] max-w-[200px] truncate">{s.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditSupplier(s)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--amilcar-silver)] hover:text-white">{t.edit}</button>
                        <button onClick={() => setDeleteTarget({type:"supplier",id:s.id,name:s.name})} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10">{t.delete}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--amilcar-text-secondary)]">{t.inventory.noSuppliers}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ PURCHASES TAB ═══ */}
      {tab === "purchases" && (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-black/30">
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.date}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.product}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.supplier}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.quantity}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.unitCost}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.totalCost}</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.notes}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(l => (
                  <tr key={l.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm text-[var(--amilcar-text-secondary)]">{new Date(l.purchased_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-white">{l.product_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-[var(--amilcar-silver)]">{l.supplier_name || t.inventory.purchase.noSupplier}</td>
                    <td className="px-4 py-3 text-sm text-white">{l.quantity}</td>
                    <td className="px-4 py-3 text-sm text-white">{Number(l.unit_cost).toFixed(3)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--amilcar-red)]">{Number(l.total_cost).toFixed(3)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--amilcar-text-secondary)] max-w-[200px] truncate">{l.notes || "—"}</td>
                  </tr>
                ))}
                {purchases.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--amilcar-text-secondary)]">{t.inventory.noPurchases}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ PRODUCT MODAL ═══ */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="mb-5 text-lg font-bold text-white">{editingProduct ? t.edit : t.inventory.addProduct}</h2>
            {error && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>}
            <form onSubmit={submitProduct} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.name}</label>
                <input type="text" required value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.category}</label>
                  <select value={pForm.category} onChange={e => setPForm({...pForm, category: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50">
                    {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.unit}</label>
                  <select value={pForm.unit} onChange={e => handleUnitChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50">
                    {UNITS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.stock} ({unitLabel(pForm.unit)})</label>
                  <input type="number" step="0.01" min="0" required value={pForm.stock_quantity} onChange={e => setPForm({...pForm, stock_quantity: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.price}</label>
                  <input type="number" step="0.001" min="0" required value={pForm.price} onChange={e => setPForm({...pForm, price: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.costPrice}</label>
                  <input type="number" step="0.001" min="0" value={pForm.cost_price} onChange={e => setPForm({...pForm, cost_price: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.consumptionPerCar} ({unitLabel(pForm.unit)})</label>
                  <input type="number" step="0.01" min="0" value={pForm.consumption_per_car} onChange={e => setPForm({...pForm, consumption_per_car: e.target.value})} placeholder="—" className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.service}</label>
                  <select value={pForm.service_id} onChange={e => setPForm({...pForm, service_id: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50">
                    <option value="">{t.inventory.product.noService}</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name_ar || s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.product.minAlert} ({unitLabel(pForm.unit)})</label>
                  <input type="number" step="0.01" min="0" required value={pForm.min_stock_alert} onChange={e => setPForm({...pForm, min_stock_alert: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
              </div>
              {/* Live car estimate preview */}
              {pForm.consumption_per_car && parseFloat(pForm.consumption_per_car) > 0 && pForm.stock_quantity && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                  <span className="text-emerald-400">🚗 {t.inventory.product.carsEstimate} <strong>{Math.floor(parseFloat(pForm.stock_quantity) / parseFloat(pForm.consumption_per_car))}</strong> {t.inventory.product.cars}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowProductModal(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--amilcar-silver)] hover:border-white/20">{t.cancel}</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--amilcar-red)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red-dark)] disabled:opacity-50">{submitting ? t.saving : t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ SUPPLIER MODAL ═══ */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="mb-5 text-lg font-bold text-white">{editingSupplier ? t.edit : t.inventory.addSupplier}</h2>
            {error && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>}
            <form onSubmit={submitSupplier} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.name}</label>
                <input type="text" required value={sForm.name} onChange={e => setSForm({...sForm, name: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.phone}</label>
                  <input type="text" value={sForm.phone} onChange={e => setSForm({...sForm, phone: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.email}</label>
                  <input type="email" value={sForm.email} onChange={e => setSForm({...sForm, email: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.address}</label>
                <input type="text" value={sForm.address} onChange={e => setSForm({...sForm, address: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.rating} (1-5)</label>
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setSForm({...sForm, rating: String(n)})} className={`text-xl transition ${parseInt(sForm.rating) >= n ? "text-yellow-400" : "text-white/20"}`}>★</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.supplier.notes}</label>
                  <input type="text" value={sForm.notes} onChange={e => setSForm({...sForm, notes: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--amilcar-silver)] hover:border-white/20">{t.cancel}</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--amilcar-red)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red-dark)] disabled:opacity-50">{submitting ? t.saving : t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ PURCHASE MODAL ═══ */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="mb-5 text-lg font-bold text-white">{t.inventory.addPurchase}</h2>
            {error && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>}
            <form onSubmit={submitPurchase} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.product}</label>
                <select required value={purchForm.product_id} onChange={e => setPurchForm({...purchForm, product_id: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50">
                  <option value="">—</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name_ar || p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.supplier}</label>
                <select value={purchForm.supplier_id} onChange={e => setPurchForm({...purchForm, supplier_id: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50">
                  <option value="">{t.inventory.purchase.noSupplier}</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.quantity}</label>
                  <input type="number" step="0.01" min="0.01" required value={purchForm.quantity} onChange={e => setPurchForm({...purchForm, quantity: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.unitCost}</label>
                  <input type="number" step="0.001" min="0" required value={purchForm.unit_cost} onChange={e => setPurchForm({...purchForm, unit_cost: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--amilcar-text-secondary)]">{t.inventory.purchase.notes}</label>
                <input type="text" value={purchForm.notes} onChange={e => setPurchForm({...purchForm, notes: e.target.value})} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--amilcar-red)]/50" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPurchaseModal(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--amilcar-silver)] hover:border-white/20">{t.cancel}</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--amilcar-red)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red-dark)] disabled:opacity-50">{submitting ? t.saving : t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DELETE MODAL ═══ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10"><span className="text-2xl">⚠️</span></div>
            <h3 className="mb-2 text-lg font-bold text-white">{t.delete}?</h3>
            <p className="mb-6 text-sm text-[var(--amilcar-text-secondary)]">
              <span className="font-medium text-white">{deleteTarget.name}</span>
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--amilcar-silver)] hover:border-white/20">{t.cancel}</button>
              <button onClick={handleDelete} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700">{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
