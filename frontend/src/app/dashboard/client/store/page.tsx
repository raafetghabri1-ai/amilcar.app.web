"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { api, type Product, type OrderOut } from "@/lib/api";

interface CartItem {
  product: Product;
  quantity: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  accessories: "🔑",
  cleaning: "🧼",
  protection: "🛡️",
  fragrance: "🌸",
  polish: "✨",
  moisturizer: "💧",
  restorer: "🔄",
  tools: "🔧",
  other: "📦",
};

export default function StorePage() {
  const { user } = useAuth();
  const { t, locale: lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"shop" | "orders">("shop");

  useEffect(() => {
    (async () => {
      try {
        const [prods, ords] = await Promise.all([
          api.get<Product[]>("/api/v1/products/"),
          api.get<OrderOut[]>("/api/v1/orders/"),
        ]);
        setProducts(prods.filter((p) => p.is_active && p.category === "accessories"));
        setOrders(ords);
      } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  // Also show all retail-safe categories
  const storeProducts = products.length > 0 ? products : [];
  useEffect(() => {
    if (products.length === 0 && !loading) {
      // Show all products if no accessories-only filter
      (async () => {
        try {
          const prods = await api.get<Product[]>("/api/v1/products/");
          setProducts(prods.filter((p) => p.is_active));
        } catch { /* */ }
      })();
    }
  }, [products.length, loading]);

  const categories = Array.from(new Set(storeProducts.map((p) => p.category)));
  const filtered = filter === "all" ? storeProducts : storeProducts.filter((p) => p.category === filter);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function updateQuantity(productId: number, qty: number) {
    if (qty <= 0) return removeFromCart(productId);
    setCart((prev) => prev.map((item) => item.product.id === productId ? { ...item, quantity: qty } : item));
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function handleOrder() {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      await api.post("/api/v1/orders/", {
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      setCart([]);
      setShowCart(false);
      setOrderSuccess(true);
      const ords = await api.get<OrderOut[]>("/api/v1/orders/");
      setOrders(ords);
    } catch { /* */ }
    setOrdering(false);
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
      <div className="mb-6">
        <Link href="/dashboard/client" className="text-sm text-[var(--amilcar-text-secondary)] hover:text-white transition">← {t.clientNav.home}</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{t.client.accessoriesShop}</h1>
        <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)]">{t.client.storeDesc}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button onClick={() => setTab("shop")} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${tab === "shop" ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)]"}`}>
          🛍️ {t.client.shopTab}
        </button>
        <button onClick={() => setTab("orders")} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${tab === "orders" ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)]"}`}>
          📋 {t.client.myOrders} {orders.length > 0 && `(${orders.length})`}
        </button>
      </div>

      {orderSuccess && (
        <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-green-400">{t.client.orderSuccess}</p>
            <p className="text-sm text-green-400/70">{t.client.orderPickup}</p>
          </div>
          <button onClick={() => setOrderSuccess(false)} className="ms-auto text-green-400/50 hover:text-green-400">✕</button>
        </div>
      )}

      {tab === "shop" && (
        <>
          {/* Category filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button onClick={() => setFilter("all")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === "all" ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)]"}`}>
              {t.client.allProducts}
            </button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilter(cat)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${filter === cat ? "bg-[var(--amilcar-red)] text-white" : "bg-white/5 text-[var(--amilcar-text-secondary)]"}`}>
                <span>{CATEGORY_ICONS[cat] || "📦"}</span>
                {t.inventory.categories[cat as keyof typeof t.inventory.categories] || cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const inCart = cart.find((item) => item.product.id === p.id);
              return (
                <div key={p.id} className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] overflow-hidden group hover:border-white/10 transition">
                  {/* Product icon */}
                  <div className="p-6 pb-3">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">{CATEGORY_ICONS[p.category] || "📦"}</span>
                      {p.stock_quantity <= p.min_stock_alert && (
                        <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[10px] text-orange-400">{t.client.limitedStock}</span>
                      )}
                    </div>
                    <h3 className="mt-3 font-bold text-white">{lang === "ar" ? p.name_ar || p.name : p.name}</h3>
                    {p.description && <p className="mt-1 text-sm text-[var(--amilcar-text-secondary)] line-clamp-2">{p.description}</p>}
                  </div>
                  <div className="border-t border-white/[0.06] p-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-white">{p.price} TND</span>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(p.id, inCart.quantity - 1)} className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">−</button>
                        <span className="text-sm font-bold text-white w-6 text-center">{inCart.quantity}</span>
                        <button onClick={() => updateQuantity(p.id, inCart.quantity + 1)} className="h-8 w-8 rounded-lg bg-[var(--amilcar-red)] text-white hover:bg-[var(--amilcar-red)]/80 transition">+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)} className="rounded-xl bg-[var(--amilcar-red)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--amilcar-red)]/80 transition">
                        {t.client.addToCart}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating cart button */}
          {cart.length > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="fixed bottom-6 end-6 z-40 flex items-center gap-2 rounded-full bg-[var(--amilcar-red)] px-6 py-3 font-medium text-white shadow-2xl shadow-[var(--amilcar-red)]/30 hover:bg-[var(--amilcar-red)]/90 transition"
            >
              🛒 {t.client.cart} ({cartCount}) — {cartTotal.toFixed(1)} TND
            </button>
          )}

          {/* Cart Modal */}
          {showCart && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)}>
              <div className="w-full max-w-lg mx-4 mb-4 sm:mb-0 rounded-2xl border border-white/10 bg-[#111] p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">🛒 {t.client.cart}</h3>
                  <button onClick={() => setShowCart(false)} className="text-[var(--amilcar-text-secondary)] hover:text-white text-xl">✕</button>
                </div>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[var(--amilcar-card)] p-3">
                      <div>
                        <span className="font-medium text-white">{lang === "ar" ? item.product.name_ar || item.product.name : item.product.name}</span>
                        <span className="ms-2 text-sm text-[var(--amilcar-text-secondary)]">{item.product.price} TND</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="h-7 w-7 rounded bg-white/10 text-white text-sm">−</button>
                        <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="h-7 w-7 rounded bg-white/10 text-white text-sm">+</button>
                        <button onClick={() => removeFromCart(item.product.id)} className="ms-1 text-red-400 hover:text-red-300 text-sm">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                  <span className="text-lg font-bold text-white">{t.client.total}: {cartTotal.toFixed(1)} TND</span>
                  <button onClick={handleOrder} disabled={ordering} className="rounded-xl bg-[var(--amilcar-red)] px-6 py-2.5 font-medium text-white hover:bg-[var(--amilcar-red)]/80 disabled:opacity-50 transition">
                    {ordering ? t.saving : t.client.placeOrder}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--amilcar-text-secondary)] text-center">{t.client.orderPickup}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Orders tab */}
      {tab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
              <span className="text-4xl">📋</span>
              <p className="mt-3 text-[var(--amilcar-text-secondary)]">{t.client.noOrders}</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-white/[0.06] bg-[var(--amilcar-card)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[var(--amilcar-text-secondary)]">#{order.id} — {new Date(order.created_at).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}</span>
                  <span className="font-bold text-white">{order.total_amount} TND</span>
                </div>
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-white">{lang === "ar" ? item.product_name_ar || item.product_name : item.product_name} × {item.quantity}</span>
                      <span className="text-[var(--amilcar-text-secondary)]">{(item.unit_price * item.quantity).toFixed(1)} TND</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
