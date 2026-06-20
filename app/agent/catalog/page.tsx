"use client";

import { useState, useEffect, useCallback } from "react";
import { AgentLayout } from "@/components/Layout";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { Search, Plus, RefreshCw, ShoppingCart, Check } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  category: string;
  images: string[];
  stock: number;
  status: "active" | "out_of_stock" | "disabled";
  levelAPrice: number;
  levelBPrice: number;
  levelCPrice: number;
  warehouseId?: string;
  warehouse?: string;
}

interface Warehouse {
  id: string;
  name: string;
  location?: string;
  manager?: string;
}

export default function CatalogPage() {
  const { t, currency, lang, user } = useApp();
  const { count, lastAdded } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, warehousesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/warehouses"),
      ]);
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }
      if (warehousesRes.ok) {
        const whData = await warehousesRes.json();
        setWarehouses(whData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const interval = setInterval(fetchProducts, 5000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  useEffect(() => {
    const handler = () => fetchProducts();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [fetchProducts]);

  const cats = ["all", ...Array.from(new Set(products.map((p) => p.category)))];
  const priceKey = user?.level === "A" ? "levelAPrice" : user?.level === "C" ? "levelCPrice" : "levelBPrice";

  const filtered = products.filter((p) => {
    const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()) || p.nameZh.includes(q);
    const matchC = cat === "all" || p.category === cat;
    const matchW = selectedWarehouse === "all" || p.warehouseId === selectedWarehouse;
    const active = p.status === "active";
    return matchQ && matchC && matchW && active;
  });

  return (
    <AgentLayout title={t("product_catalog")} subtitle={`${formatNumber(filtered.length)} ${lang === "en" ? "products" : lang === "zh-CN" ? "产品" : "產品"} | ${count} ${lang === "en" ? "items in cart" : lang === "zh-CN" ? "件购物车商品" : "件購物車商品"}`}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            className="input pl-9 py-2.5"
            placeholder={lang === "en" ? "Search catalog..." : lang === "zh-CN" ? "搜索产品..." : "搜尋產品..."}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="select py-2.5 w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? (lang === "en" ? "All categories" : lang === "zh-CN" ? "全部分类" : "全部分類") : c}
            </option>
          ))}
        </select>
        <select className="select py-2.5 w-auto" value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
          <option value="all">
            {lang === "en" ? "All warehouses" : lang === "zh-CN" ? "全部仓库" : "全部倉庫"}
          </option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}{w.location ? ` (${w.location})` : ""}
            </option>
          ))}
        </select>
        <button onClick={fetchProducts} className="btn-ghost flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {lang === "en" ? "Refresh" : lang === "zh-CN" ? "刷新" : "刷新"}
        </button>
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-900">
          <ShoppingCart className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">{count}</span>
          <span className="text-sm text-indigo-600">{lang === "en" ? "items" : lang === "zh-CN" ? "件" : "件"}</span>
        </div>
      </div>

      <CatalogGrid items={filtered} priceKey={priceKey} currency={currency} t={t} lang={lang} lastAdded={lastAdded} />
    </AgentLayout>
  );
}

function CatalogGrid({ items, priceKey, currency, t, lang, lastAdded }: {
  items: Product[];
  priceKey: string;
  currency: string;
  t: any;
  lang: string;
  lastAdded: string;
}) {
  const { add, items: cartItems } = useCart();

  // Build map of product id -> quantity in cart
  const cartQtyMap = new Map<string, number>();
  cartItems.forEach((i) => cartQtyMap.set(i.productId, i.qty));

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="text-5xl mb-4">📭</div>
        <div className="font-medium">{lang === "en" ? "No products available" : lang === "zh-CN" ? "暂无可用商品" : "暫无可用商品"}</div>
        <div className="text-sm mt-1">{lang === "en" ? "The administrator may have removed all products." : lang === "zh-CN" ? "管理员可能已下架所有商品" : "管理員可能已下架所有商品"}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((p) => {
        const price = (p as any)[priceKey] || 0;
        const isJustAdded = lastAdded === p.id;
        const inCart = cartQtyMap.get(p.id) ?? 0;
        const remainingStock = p.stock - inCart;
        return (
          <div key={p.id} className={`card overflow-hidden transition-all duration-300 ${isJustAdded ? "ring-2 ring-emerald-500 shadow-lg" : ""}`}>
            <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
              {p.images && p.images.length > 0 ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <div className="text-5xl">📦</div>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-500 font-mono">{p.sku} · {p.category}</div>
              <div className="font-semibold mt-0.5">{p.name}</div>
              <div className="text-sm text-slate-500 mb-3">{p.nameZh}</div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-500">{t("agent_price")}</div>
                <div className="text-lg font-bold text-indigo-600">{formatCurrency(price, currency)}</div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-slate-500">{t("available_stock")}</div>
                <div className={`text-sm font-semibold ${remainingStock < 50 ? "text-amber-600" : "text-emerald-600"}`}>
                  {formatNumber(remainingStock)}
                  {inCart > 0 && <span className="text-xs text-slate-400 ml-1">({inCart} {lang === "en" ? "in cart" : lang === "zh-CN" ? "已在购物车" : "已在購物車"})</span>}
                </div>
              </div>
              {remainingStock > 0 ? (
                <button
                  onClick={() => add({ productId: p.id, name: p.name, sku: p.sku, price, image: p.images && p.images[0] }, 1)}
                  className={`w-full justify-center flex items-center gap-2 py-2.5 rounded-lg font-medium transition-all ${isJustAdded ? "bg-emerald-600 text-white" : "btn-primary"}`}
                >
                  {isJustAdded ? (
                    <>
                      <Check className="w-4 h-4" /> {lang === "en" ? "Added!" : lang === "zh-CN" ? "已添加!" : "已新增!"}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> {t("add_to_cart")}
                    </>
                  )}
                </button>
              ) : (
                <button disabled className="btn-ghost w-full opacity-50">{lang === "en" ? "Out of stock" : lang === "zh-CN" ? "缺货" : "缺貨"}</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
