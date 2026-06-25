"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge, Badge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Plus, Search, Download, Upload, Edit2, Trash2, X, Check, Image as ImageIcon, AlertCircle } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  category: string;
  brand: string;
  images: string[];
  description: string;
  descriptionZh: string;
  costPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  stock: number;
  warehouse: string;
  warehouseId: string;
  status: "active" | "out_of_stock" | "disabled";
  levelAPrice: number;
  levelBPrice: number;
  levelCPrice: number;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
}

export default function ProductsPage() {
  const { t, currency, lang } = useApp();
  const [data, setData] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/warehouses"),
      ]);
      const pJson = await pRes.json();
      setData(pJson);
      if (wRes.ok) setWarehouses(await wRes.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const cats = ["all", ...Array.from(new Set(data.map((p) => p.category)))];
  const filtered = data.filter((p) => {
    const matchQ = query
      ? (p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase()) ||
          p.nameZh.includes(query))
      : true;
    const matchC = category === "all" || p.category === category;
    return matchQ && matchC;
  });

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "en" ? "Delete this product?" : lang === "zh-CN" ? "删除此产品？" : "刪除此產品？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async (product: Partial<Product>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const saved = await res.json();
      if (res.ok) {
        setData((prev) => {
          const idx = prev.findIndex((p) => p.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [saved, ...prev];
        });
        setShowForm(false);
        setEditing(null);
      } else {
        alert(lang === "en" ? "Failed to save product: " : lang === "zh-CN" ? "保存产品失败: " : "保存產品失敗: " + (saved.error || "Unknown error"));
      }
    } catch (err) {
      alert(lang === "en" ? "Failed to save product" : lang === "zh-CN" ? "保存产品失败" : "保存產品失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={t("products")} subtitle={`${formatNumber(data.length)} ${lang === "en" ? "items" : lang === "zh-CN" ? "项" : "項"}`}>
      <div className="flex flex-wrap items-stretch gap-3 mb-5">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            className="input pl-9 py-2.5"
            placeholder={lang === "en" ? "Search by name, SKU..." : lang === "zh-CN" ? "按名称、SKU 搜索..." : "按名稱、SKU 搜尋..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select py-2.5 w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          {cats.map((c) => (
            <option key={c} value={c}>{c === "all" ? (lang === "en" ? "All categories" : lang === "zh-CN" ? "全部分类" : "全部分類") : c}</option>
          ))}
        </select>
        <button className="btn-ghost flex items-center gap-2"><Upload className="w-4 h-4" /> {t("import")}</button>
        <button className="btn-ghost flex items-center gap-2"><Download className="w-4 h-4" /> {t("export")}</button>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {t("add_product")}</button>
      </div>

      {showForm && (
        <ProductForm
          product={editing}
          categories={cats.filter((c) => c !== "all")}
          warehouses={warehouses}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          lang={lang}
          t={t}
          currency={currency}
          saving={saving}
        />
      )}

      <PageCard
        title={lang === "en" ? "Product catalog" : lang === "zh-CN" ? "产品目录" : "產品目錄"}
        subtitle={`${formatNumber(filtered.length)} ${lang === "en" ? "results" : lang === "zh-CN" ? "个结果" : "個結果"}`}
      >
        {loading ? (
          <div className="text-center py-16 text-slate-400">{lang === "en" ? "Loading..." : "加载中..."}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p) => (
              <div key={p.id} className="card overflow-hidden group">
                <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <div className="text-5xl">📦</div>
                    </div>
                  )}
                  <div className="absolute top-3 left-3"><StatusBadge status={p.status} /></div>
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="w-8 h-8 rounded-lg bg-white/90 shadow flex items-center justify-center text-slate-700"><Edit2 className="w-4 h-4" /></button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="w-8 h-8 rounded-lg bg-white/90 shadow flex items-center justify-center text-red-600 disabled:opacity-50"
                    >
                      {deleting === p.id ? <span className="text-xs">...</span> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                  <div className="font-semibold mt-0.5 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 mb-3 truncate">{p.nameZh}</div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-500">{t("wholesale_price")}</div>
                    <div className="text-sm font-semibold">{formatCurrency(p.wholesalePrice, currency)}</div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-slate-500">{t("stock")}</div>
                    <div className={`text-sm font-semibold ${p.stock < 50 ? "text-amber-600" : ""}`}>{formatNumber(p.stock)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="chip">{p.category}</span>
                    <span className="chip">{p.brand}</span>
                    <span className="chip">{p.warehouse}</span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500">{t("no_data")}</div>
            )}
          </div>
        )}
      </PageCard>
    </AdminLayout>
  );
}

function ProductForm({ product, categories, warehouses, onSave, onClose, lang, t, currency, saving }: {
  product: Partial<Product> | null;
  categories: string[];
  warehouses: Warehouse[];
  onSave: (p: Partial<Product>) => void;
  onClose: () => void;
  lang: string;
  t: any;
  currency: string;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Product>>(() => {
    const defaultWh = warehouses[0];
    return product || {
      sku: "",
      name: "",
      nameZh: "",
      category: "",
      brand: "",
      images: [],
      costPrice: 0,
      wholesalePrice: 0,
      retailPrice: 0,
      stock: 0,
      warehouseId: defaultWh?.id || "",
      warehouse: defaultWh?.name || "UK Warehouse",
      status: "active",
      levelAPrice: 0,
      levelBPrice: 0,
      levelCPrice: 0,
    };
  });
  const [imageUrl, setImageUrl] = useState("");
  const [uploadError, setUploadError] = useState("");

  const set = (key: keyof Product, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const allowedFormats = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/tiff", "image/ico"];
  const maxFileSize = 10 * 1024 * 1024;

  const addImage = () => {
    if (imageUrl.trim()) {
      setForm((f) => ({ ...f, images: [...(f.images || []), imageUrl.trim()] }));
      setImageUrl("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    if (!allowedFormats.includes(file.type)) {
      setUploadError(lang === "en" ? "Only image files are allowed (JPEG, PNG, GIF, WebP, BMP, SVG, TIFF, ICO)" : lang === "zh-CN" ? "仅支持图片格式（JPEG、PNG、GIF、WebP、BMP、SVG、TIFF、ICO）" : "僅支援圖片格式（JPEG、PNG、GIF、WebP、BMP、SVG、TIFF、ICO）");
      e.target.value = "";
      return;
    }

    if (file.size > maxFileSize) {
      setUploadError(lang === "en" ? "File size exceeds 10MB limit" : lang === "zh-CN" ? "文件大小超过10MB限制" : "檔案大小超過10MB限制");
      e.target.value = "";
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.url) {
        setForm((f) => ({ ...f, images: [...(f.images || []), result.url] }));
      } else {
        setUploadError(result.error || lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
      }
    } catch (err) {
      setUploadError(lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
    }
    e.target.value = "";
  };

  const removeImage = async (idx: number) => {
    const images = form.images || [];
    const imageUrl = images[idx];
    if (imageUrl && imageUrl.startsWith("/uploads/")) {
      const fileName = imageUrl.replace("/uploads/", "");
      try {
        await fetch(`/api/upload?fileName=${encodeURIComponent(fileName)}`, {
          method: "DELETE",
        });
      } catch {
      }
    }
    setForm((f) => ({ ...f, images: images.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{product ? (lang === "en" ? "Edit Product" : "编辑商品") : (lang === "en" ? "Add Product" : "添加商品")}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">{lang === "en" ? "Product Images" : "产品图片"}</label>
            <div className="mb-3">
              <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-500">{lang === "en" ? "Click to upload image (JPEG, PNG, GIF, WebP, BMP, SVG, TIFF, ICO, max 10MB)" : lang === "zh-CN" ? "点击上传图片（JPEG、PNG、GIF、WebP、BMP、SVG、TIFF、ICO，最大10MB）" : "點擊上傳圖片（JPEG、PNG、GIF、WebP、BMP、SVG、TIFF、ICO，最大10MB）"}</span>
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,image/tiff,image/ico" onChange={handleFileUpload} className="hidden" />
              </label>
              {uploadError && (
                <div className="mt-2 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {uploadError}
                </div>
              )}
            </div>
            <div className="flex gap-2 mb-2">
              <input className="input flex-1" placeholder={lang === "en" ? "Or enter image URL..." : lang === "zh-CN" ? "或输入图片链接..." : "或輸入圖片連結..."} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <button onClick={addImage} className="btn-primary px-4"><Plus className="w-4 h-4" /></button>
            </div>
            {(form.images || []).length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {(form.images || []).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(form.images || []).length === 0 && (
              <div className="text-sm text-slate-400 mt-2">{lang === "en" ? "No images added" : lang === "zh-CN" ? "未添加图片" : "未添加圖片"}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{lang === "en" ? "Name (EN)" : "名称 (英)"}</label>
              <input className="input" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Name (CN)" : "名称 (中)"}</label>
              <input className="input" value={form.nameZh || ""} onChange={(e) => set("nameZh", e.target.value)} />
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku || ""} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Category" : "分类"}</label>
              <input className="input" list="cats" value={form.category || ""} onChange={(e) => set("category", e.target.value)} />
              <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="label">{lang === "en" ? "Brand" : "品牌"}</label>
              <input className="input" value={form.brand || ""} onChange={(e) => set("brand", e.target.value)} />
            </div>
            <div>
              <label className="label">{t("warehouse_name")}</label>
              <select
                className="select"
                value={form.warehouseId || ""}
                onChange={(e) => {
                  const wh = warehouses.find((w) => w.id === e.target.value);
                  if (wh) {
                    setForm((f) => ({ ...f, warehouseId: wh.id, warehouse: wh.name }));
                  } else {
                    set("warehouseId", e.target.value);
                  }
                }}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{lang === "en" ? "Cost Price" : "成本价"} ({currency})</label>
              <input className="input" type="number" step="0.01" value={form.costPrice || 0} onChange={(e) => set("costPrice", +e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Wholesale Price" : "批发价"} ({currency})</label>
              <input className="input" type="number" step="0.01" value={form.wholesalePrice || 0} onChange={(e) => set("wholesalePrice", +e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Retail Price" : "零售价"} ({currency})</label>
              <input className="input" type="number" step="0.01" value={form.retailPrice || 0} onChange={(e) => set("retailPrice", +e.target.value)} />
            </div>
            <div>
              <label className="label">{t("stock")}</label>
              <input className="input" type="number" value={form.stock || 0} onChange={(e) => set("stock", +e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Level A Price" : "A级代理价"} ({currency})</label>
              <input className="input" type="number" step="0.01" value={form.levelAPrice || 0} onChange={(e) => set("levelAPrice", +e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Level B Price" : "B级代理价"} ({currency})</label>
              <input className="input" type="number" step="0.01" value={form.levelBPrice || 0} onChange={(e) => set("levelBPrice", +e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Level C Price" : "C级代理价"} ({currency})</label>
              <input className="input" type="number" step="0.01" value={form.levelCPrice || 0} onChange={(e) => set("levelCPrice", +e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Status" : "状态"}</label>
              <select className="select" value={form.status || "active"} onChange={(e) => set("status", e.target.value)}>
                <option value="active">{lang === "en" ? "Active" : "正常"}</option>
                <option value="out_of_stock">{lang === "en" ? "Out of Stock" : "缺货"}</option>
                <option value="disabled">{lang === "en" ? "Disabled" : "已下架"}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-ghost">{lang === "en" ? "Cancel" : "取消"}</button>
          <button type="button" onClick={() => onSave(form)} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saving ? (lang === "en" ? "Saving..." : lang === "zh-CN" ? "保存中..." : "保存中...") : (lang === "en" ? "Save" : "保存")}
          </button>
        </div>
      </div>
    </div>
  );
}
