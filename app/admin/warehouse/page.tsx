"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { MapPin, User, Box, Plus, Printer, X, Check, Trash2, AlertTriangle, Package } from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
  stock: number;
  value: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  category: string;
  brand: string;
  stock: number;
  warehouse: string;
  warehouseId: string;
  costPrice: number;
}

export default function WarehousePage() {
  const { t, currency, lang } = useApp();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newManager, setNewManager] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteOrphans, setDeleteOrphans] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        fetch("/api/warehouses"),
        fetch("/api/products"),
      ]);
      if (wRes.ok) setWarehouses(await wRes.json());
      if (pRes.ok) setProducts(await pRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWarehouse = async () => {
    setError("");
    if (!newName.trim() || !newLocation.trim() || !newManager.trim()) {
      setError(lang === "en" ? "All fields are required" : "请填写所有字段");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), location: newLocation.trim(), manager: newManager.trim() }),
      });
      if (res.ok) {
        setShowModal(false);
        setNewName("");
        setNewLocation("");
        setNewManager("");
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || (lang === "en" ? "Failed to create warehouse" : "创建仓库失败"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const url = `/api/warehouses?id=${encodeURIComponent(deleteTarget.id)}${deleteOrphans ? "&cleanupOrphans=1" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        setDeleteOrphans(true);
        fetchData();
      } else {
        const data = await res.json();
        setDeleteError(data.error || (lang === "en" ? "Failed to delete" : "删除失败"));
      }
    } finally {
      setDeleting(false);
    }
  };

  // 一键清理所有孤儿产品（不删除任何仓库）
  const handleCleanupOrphans = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch("/api/warehouses/cleanup-orphans", { method: "PUT" });
      if (res.ok) {
        fetchData();
      }
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <AdminLayout title={t("warehouses")} subtitle={lang === "en" ? "Multi-warehouse management" : lang === "zh-CN" ? "多仓库管理" : "多倉庫管理"}>
      <div className="flex flex-wrap gap-3 mb-5">
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {lang === "en" ? "New warehouse" : lang === "zh-CN" ? "新建仓库" : "新建倉庫"}</button>
        <button className="btn-ghost flex items-center gap-2"><Printer className="w-4 h-4" /> {t("pick_list")}</button>
        <button
          onClick={handleCleanupOrphans}
          disabled={cleanupLoading}
          className="btn-ghost flex items-center gap-2 ml-auto text-amber-600 border-amber-300 dark:border-amber-800"
        >
          {cleanupLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {lang === "en" ? "Clean up orphan products" : lang === "zh-CN" ? "清理孤儿产品" : "清理孤兒產品"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">{lang === "en" ? "Loading..." : "加载中..."}</div>
      ) : (
        <>
          {/* 孤儿产品检测 - 显示不归属任何仓库的产品 */}
          {(() => {
            const warehouseIds = new Set(warehouses.map(w => w.id));
            const warehouseNames = new Set(warehouses.map(w => w.name));
            const orphans = products.filter((p) => {
              const pid = p.warehouseId || "";
              const pname = p.warehouse || "";
              if (pid && warehouseIds.has(pid)) return false;
              if (!pid && pname && warehouseNames.has(pname)) return false;
              return true;
            });
            return orphans.length > 0 ? (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-700 dark:text-amber-300">
                    {lang === "en"
                      ? `${orphans.length} orphan products found`
                      : lang === "zh-CN"
                      ? `发现 ${orphans.length} 个孤儿产品`
                      : `發現 ${orphans.length} 個孤兒產品`}
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {lang === "en"
                      ? "These products don't belong to any existing warehouse. You can delete the last warehouse and also clean these up, or clean them separately."
                      : lang === "zh-CN"
                      ? "这些产品不归属任何现有仓库。删除最后一个仓库时可一并清理，或单独清理。"
                      : "這些產品不歸屬任何現有倉庫。刪除最後一個倉庫時可一併清理，或單獨清理。"}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-500 mt-2 font-mono">
                    {lang === "en" ? "Products:" : "产品:"} {orphans.slice(0, 4).map(o => o.name).join(", ")}
                    {orphans.length > 4 && ` ... (+${orphans.length - 4})`}
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {warehouses.map((w) => {
              // 优先按 warehouseId 匹配；兼容旧数据按名称匹配
              const productsHere = products.filter((p) =>
                (p.warehouseId && p.warehouseId === w.id) || (!p.warehouseId && p.warehouse === w.name)
              );
              const stockHere = productsHere.reduce((s, p) => s + p.stock, 0);
              const valueHere = productsHere.reduce((s, p) => s + p.stock * p.costPrice, 0);
              return (
                <div key={w.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-lg font-semibold">{w.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {w.location}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}
                      className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60 flex items-center justify-center"
                      title={lang === "en" ? "Delete" : "删除"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                      <Box className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-1.5 mb-4"><User className="w-3.5 h-3.5" /> {w.manager}</div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500">{t("stock")}</div>
                    <div className="text-lg font-bold">{formatNumber(stockHere || w.stock)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{lang === "en" ? "Value" : lang === "zh-CN" ? "价值" : "價值"}</div>
                    <div className="text-lg font-bold">{formatCurrency(valueHere || w.value, currency)}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">{productsHere.length} {lang === "en" ? "products" : lang === "zh-CN" ? "个产品" : "個產品"}</div>
              </div>
              );
            })}
          </div>

          <PageCard title={lang === "en" ? "Stock by warehouse" : lang === "zh-CN" ? "各仓库库存明细" : "各倉庫庫存明細"}>
            <div className="scrollable">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>{t("product_name")}</th>
                    <th>{t("warehouse_name")}</th>
                    <th>{t("stock")}</th>
                    <th>{t("cost_price")}</th>
                    <th>{lang === "en" ? "Value" : lang === "zh-CN" ? "价值" : "價值"}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.sku}</td>
                      <td className="font-medium">{p.name}</td>
                      <td>{p.warehouse}</td>
                      <td className={p.stock < 50 ? "text-amber-600 font-medium" : ""}>{formatNumber(p.stock)}</td>
                      <td>{formatCurrency(p.costPrice, currency)}</td>
                      <td className="font-medium">{formatCurrency(p.stock * p.costPrice, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageCard>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold">{lang === "en" ? "New Warehouse" : lang === "zh-CN" ? "新建仓库" : "新建倉庫"}</h2>
              <button onClick={() => { setShowModal(false); setError(""); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">{lang === "en" ? "Warehouse Name" : lang === "zh-CN" ? "仓库名称" : "倉庫名稱"}</label>
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={lang === "en" ? "e.g. Japan Warehouse" : lang === "zh-CN" ? "例如：日本仓库" : "例如：日本倉庫"} />
              </div>
              <div>
                <label className="label">{lang === "en" ? "Location / Address" : lang === "zh-CN" ? "位置 / 地址" : "位置 / 地址"}</label>
                <input className="input" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder={lang === "en" ? "e.g. Tokyo, Japan" : lang === "zh-CN" ? "例如：东京，日本" : "例如：東京，日本"} />
              </div>
              <div>
                <label className="label">{lang === "en" ? "Warehouse Manager" : lang === "zh-CN" ? "仓库管理员" : "倉庫管理員"}</label>
                <input className="input" value={newManager} onChange={(e) => setNewManager(e.target.value)} placeholder={lang === "en" ? "e.g. Tom Tanaka" : lang === "zh-CN" ? "例如：田中太郎" : "例如：田中太郎"} />
              </div>
              {error && <div className="text-sm text-rose-600">{error}</div>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => { setShowModal(false); setError(""); }} className="btn-ghost">{lang === "en" ? "Cancel" : "取消"}</button>
              <button onClick={handleCreateWarehouse} disabled={submitting} className="btn-primary flex items-center gap-2">{submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}{lang === "en" ? "Create" : "创建"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                {lang === "en" ? "Delete Warehouse" : "删除仓库"}
              </h2>
              <button onClick={() => { setDeleteTarget(null); setDeleteError(""); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-slate-700 dark:text-slate-300">
                {lang === "en" ? (
                  <>
                    Are you sure you want to delete warehouse <span className="font-semibold text-rose-600">{deleteTarget.name}</span>?
                  </>
                ) : lang === "zh-CN" ? (
                  <>
                    确认删除仓库 <span className="font-semibold text-rose-600">{deleteTarget.name}</span>？
                  </>
                ) : (
                  <>
                    確認刪除倉庫 <span className="font-semibold text-rose-600">{deleteTarget.name}</span>？
                  </>
                )}
              </div>

              {/* 计算该仓库和孤儿产品的数量 */}
              {(() => {
                const productsInWarehouse = products.filter((p) =>
                  (p.warehouseId && p.warehouseId === deleteTarget.id) || (!p.warehouseId && p.warehouse === deleteTarget.name)
                );
                const warehouseIds = new Set(warehouses.map(w => w.id));
                const warehouseNames = new Set(warehouses.map(w => w.name));
                const orphans = products.filter((p) => {
                  const pid = p.warehouseId || "";
                  const pname = p.warehouse || "";
                  if (pid && warehouseIds.has(pid)) return false;
                  if (!pid && pname && warehouseNames.has(pname)) return false;
                  return true;
                });
                return (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="text-sm space-y-2 flex-1">
                        <div className="font-semibold">
                          {lang === "en" ? "This action will also delete:" : lang === "zh-CN" ? "此操作同时也会删除：" : "此操作同時也會刪除："}
                        </div>
                        <ul className="space-y-1 text-amber-600 dark:text-amber-400 pl-1">
                          <li className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            {lang === "en" ? "Products in this warehouse" : lang === "zh-CN" ? "该仓库中的产品" : "該倉庫中的產品"}
                            <span className="ml-auto font-mono">{productsInWarehouse.length}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Box className="w-4 h-4" />
                            {lang === "en" ? "Inventory data for these products" : lang === "zh-CN" ? "这些产品的库存数据" : "這些產品的庫存數據"}
                          </li>
                          <li className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            {lang === "en" ? "Operation logs" : lang === "zh-CN" ? "操作日志" : "操作日誌"}
                          </li>
                        </ul>
                        {orphans.length > 0 && (
                          <div className="pt-3 mt-3 border-t border-amber-200 dark:border-amber-900/40">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={deleteOrphans}
                                onChange={(e) => setDeleteOrphans(e.target.checked)}
                                className="mt-1"
                              />
                              <span className="text-xs">
                                {lang === "en"
                                  ? `Also clean up ${orphans.length} orphan products (products not belonging to any warehouse)`
                                  : lang === "zh-CN"
                                  ? `同时清理 ${orphans.length} 个孤儿产品（不归属任何仓库的产品）`
                                  : `同時清理 ${orphans.length} 個孤兒產品（不歸屬任何倉庫的產品）`}
                              </span>
                            </label>
                          </div>
                        )}
                        <div className="pt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          {lang === "en" ? "⚠ This cannot be undone!" : "⚠ 此操作不可撤销！"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {deleteError && <div className="text-sm text-rose-600">{deleteError}</div>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(""); }} className="btn-ghost">{lang === "en" ? "Cancel" : "取消"}</button>
              <button onClick={handleDeleteWarehouse} disabled={deleting} className="btn-primary bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 flex items-center gap-2">
                {deleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {lang === "en" ? "Delete" : "删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
