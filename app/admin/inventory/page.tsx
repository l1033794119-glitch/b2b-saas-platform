"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Plus, Minus, Settings2, Package, Warehouse, TrendingUp, AlertTriangle, RefreshCw, Search, Edit2, Check, MapPin } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  category: string;
  brand: string;
  images: string[];
  stock: number;
  warehouse: string;
  warehouseId: string;
  status: "active" | "out_of_stock" | "disabled";
  wholesalePrice: number;
  levelAPrice: number;
  levelBPrice: number;
  levelCPrice: number;
}

interface InventoryLog {
  id: string;
  type: "stock_in" | "stock_out" | "adjustment" | "transfer";
  productId: string;
  productName: string;
  sku: string;
  warehouse: string;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  operator: string;
  time: string;
  note: string;
}

interface Wh {
  id: string;
  name: string;
  location: string;
  manager: string;
}

export default function InventoryPage() {
  const { t, currency, lang } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [warehouses, setWarehouses] = useState<Wh[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "logs">("overview");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionType, setActionType] = useState<"stock_in" | "stock_out" | "adjustment">("stock_in");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      const [invRes, logsRes, whRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory?action=logs"),
        fetch("/api/warehouses"),
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        setProducts(data.products || []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
      if (whRes.ok) {
        const whs = await whRes.json();
        setWarehouses(whs);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStockAction = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          productId: selectedProduct.id,
          qty,
          note,
          operator: "Admin",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === selectedProduct.id ? data.product : p))
        );
        const logsRes = await fetch("/api/inventory?action=logs");
        if (logsRes.ok) {
          setLogs(await logsRes.json());
        }
        setSelectedProduct(null);
        setQty(1);
        setNote("");
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const cats = ["all", ...Array.from(new Set(products.map((p) => p.category)))];
  const warehouseNames = ["all", ...Array.from(new Set(products.map((p) => p.warehouse)))];
  // 仓库筛选值可能是 warehouseId 或 warehouse 名称
  // 仓库筛选选项优先使用 warehouses 列表（按 ID），回退到按名称
  const warehouseOptions = warehouses.length > 0
    ? [{ id: "all", name: "" }, ...warehouses]
    : [{ id: "all", name: "" }, ...products.map(p => ({ id: p.warehouse, name: p.warehouse }))];

  const filteredProducts = products.filter((p) => {
    const matchQ = !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.sku.toLowerCase().includes(searchQ.toLowerCase()) || p.nameZh.includes(searchQ);
    const matchC = catFilter === "all" || p.category === catFilter;
    const matchW = warehouseFilter === "all" || p.warehouseId === warehouseFilter || p.warehouse === warehouseFilter;
    return matchQ && matchC && matchW;
  });

  const lowStockProducts = products.filter((p) => p.stock < 100);

  const totalStock = filteredProducts.reduce((s, p) => s + p.stock, 0);

  const actionLabels = {
    stock_in: { en: "入库", zh: "入庫" },
    stock_out: { en: "出库", zh: "出庫" },
    adjustment: { en: "调整", zh: "調整" },
  };

  return (
    <AdminLayout title={t("inventory")} subtitle={lang === "en" ? "库存管理" : "庫存管理"}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatNumber(filteredProducts.length)}</div>
            <div className="text-sm text-slate-500">{lang === "en" ? "Total Products" : "商品总数"}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatNumber(totalStock)}</div>
            <div className="text-sm text-slate-500">{lang === "en" ? "Total Stock" : "库存总量"}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatNumber(lowStockProducts.length)}</div>
            <div className="text-sm text-slate-500">{lang === "en" ? "Low Stock" : "低库存"}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Warehouse className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-bold">{warehouseNames.length - 1}</div>
            <div className="text-sm text-slate-500">{lang === "en" ? "Warehouses" : "仓库数"}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 ${tab === "overview" ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
        >
          {lang === "en" ? "Overview" : "总览"}
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 ${tab === "logs" ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
        >
          {lang === "en" ? "Logs" : "操作记录"}
        </button>
        <button onClick={fetchData} className="btn-ghost flex items-center gap-2 ml-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {tab === "overview" ? (
        <>
          {selectedProduct && (
            <div className="card p-5 mb-6 border-2 border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{lang === "en" ? "Adjust Stock" : "调整库存"}</h3>
                  <div className="text-sm text-slate-500">
                    {selectedProduct.sku} · {selectedProduct.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {lang === "en" ? "Warehouse:" : "仓库:"} <span className="font-medium">{selectedProduct.warehouse}</span>
                    {" · "}{lang === "en" ? "Current:" : "当前:"} <span className="font-medium text-indigo-600">{formatNumber(selectedProduct.stock)}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{lang === "en" ? "Action" : "操作"}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActionType("stock_in")}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${actionType === "stock_in" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
                    >
                      <Plus className="w-4 h-4" /> {lang === "en" ? "In" : "入库"}
                    </button>
                    <button
                      onClick={() => setActionType("stock_out")}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${actionType === "stock_out" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
                    >
                      <Minus className="w-4 h-4" /> {lang === "en" ? "Out" : "出库"}
                    </button>
                    <button
                      onClick={() => setActionType("adjustment")}
                      className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${actionType === "adjustment" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
                    >
                      <Settings2 className="w-4 h-4" /> {lang === "en" ? "Adjust" : "调整"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">
                    {actionType === "adjustment" ? (lang === "en" ? "New Stock" : "新库存") : (lang === "en" ? "Quantity" : "数量")}
                  </label>
                  <input
                    type="number"
                    className="input w-32"
                    value={qty}
                    onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-slate-500 mb-1">{lang === "en" ? "Note" : "备注"}</label>
                  <input
                    className="input w-full"
                    placeholder={lang === "en" ? "Add a note..." : "添加备注..."}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleStockAction}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2"
                >
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  {lang === "en" ? "Confirm" : "确认"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                className="input pl-9 py-2.5"
                placeholder={lang === "en" ? "Search products..." : "搜索商品..."}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
            <select className="select py-2.5 w-auto" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
              {warehouseOptions.map((w: any) => (
                <option key={w.id} value={w.id}>{w.id === "all" ? (lang === "en" ? "All Warehouses" : "全部仓库") : w.name}</option>
              ))}
            </select>
            <select className="select py-2.5 w-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              {cats.map((c) => (
                <option key={c} value={c}>{c === "all" ? (lang === "en" ? "All Categories" : "全部分类") : c}</option>
              ))}
            </select>
          </div>

          <PageCard title={lang === "en" ? "Product Inventory" : "商品库存"}>
            <div className="scrollable">
              {loading ? (
                <div className="text-center py-12 text-slate-500">{lang === "en" ? "Loading..." : "加载中..."}</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>{lang === "en" ? "Product" : "商品"}</th>
                      <th>{lang === "en" ? "Category" : "分类"}</th>
                      <th>{lang === "en" ? "Warehouse" : "仓库"}</th>
                      <th>{lang === "en" ? "Stock" : "库存"}</th>
                      <th>{lang === "en" ? "Price" : "价格"}</th>
                      <th>{lang === "en" ? "Actions" : "操作"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono text-xs">{p.sku}</td>
                        <td>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-slate-400">{p.nameZh}</div>
                        </td>
                        <td><span className="chip">{p.category}</span></td>
                        <td className="text-sm"><span className="chip">{p.warehouse}</span></td>
                        <td>
                          <span className={`font-semibold ${p.stock < 50 ? "text-rose-600" : p.stock < 100 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatNumber(p.stock)}
                          </span>
                        </td>
                        <td className="font-medium">{formatCurrency(p.wholesalePrice, currency)}</td>
                        <td>
                          <button
                            onClick={() => setSelectedProduct(p)}
                            className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {lang === "en" ? "Adjust" : "调整"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          {lang === "en" ? "No products found" : "未找到商品"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </PageCard>
        </>
      ) : (
        <PageCard title={lang === "en" ? "Inventory Operation Logs" : "库存操作记录"}>
          <div className="scrollable">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Type" : "类型"}</th>
                  <th>{lang === "en" ? "Product" : "商品"}</th>
                  <th>{lang === "en" ? "Warehouse" : "仓库"}</th>
                  <th>{lang === "en" ? "Before" : "调整前"}</th>
                  <th>{lang === "en" ? "Change" : "变动"}</th>
                  <th>{lang === "en" ? "After" : "调整后"}</th>
                  <th>{lang === "en" ? "Operator" : "操作员"}</th>
                  <th>{lang === "en" ? "Time" : "时间"}</th>
                  <th>{lang === "en" ? "Note" : "备注"}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`badge ${
                        log.type === "stock_in" ? "badge-green" :
                        log.type === "stock_out" ? "badge-red" :
                        "badge-blue"
                      }`}>
                        {log.type === "stock_in" ? "+" : log.type === "stock_out" ? "-" : "±"}
                        {log.type === "stock_in" ? (lang === "en" ? "In" : "入库") :
                         log.type === "stock_out" ? (lang === "en" ? "Out" : "出库") :
                         (lang === "en" ? "Adjust" : "调整")}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium">{log.productName}</div>
                      <div className="text-xs text-slate-400 font-mono">{log.sku}</div>
                    </td>
                    <td><span className="chip">{(log as any).warehouse || (log as any).toWarehouse || "—"}</span></td>
                    <td className="text-slate-500">{formatNumber(log.stockBefore)}</td>
                    <td className={`font-semibold ${log.type === "stock_in" ? "text-emerald-600" : "text-rose-600"}`}>
                      {log.type === "adjustment" ? "→ " : (log.type === "stock_in" ? "+" : "-")}{formatNumber(log.qty)}
                    </td>
                    <td className="font-semibold">{formatNumber(log.stockAfter)}</td>
                    <td className="text-sm">{log.operator}</td>
                    <td className="text-sm text-slate-500">{new Date(log.time).toLocaleString()}</td>
                    <td className="text-sm text-slate-500 max-w-[150px] truncate">{log.note || "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      {lang === "en" ? "No operation records" : "暂无操作记录"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}
    </AdminLayout>
  );
}
