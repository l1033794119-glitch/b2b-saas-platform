"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Truck, Package, Search, Eye, X, Phone, Mail, User,
  MapPin, Upload, Check, Edit2, FileText
} from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  id: string;
  orderNo: string;
  agentId: string;
  agent?: string;
  company?: string;
  items: OrderItem[];
  total: number;
  status: "pending_qrcode" | "pending_delivery" | "pending_tracking" | "pending_payment" | "shipped" | "completed" | "cancelled";
  date: string;
  shippingAddress: string;
  postalCode?: string;
  country?: string;
  trackingNumber?: string;
  trackingImage?: string;
  qrCode?: string;
  waybillImage?: string;
  warehouseId?: string;
  warehouse?: string;
  carrier?: string;
  notes?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  shippingFee?: number;
  shippedAt?: string;
}

export default function ShippingPage() {
  const { t, currency, lang } = useApp();
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editingWaybill, setEditingWaybill] = useState(false);
  const [tempWaybillImage, setTempWaybillImage] = useState("");
  const [uploadingWaybillImage, setUploadingWaybillImage] = useState(false);

  const carriers = ["Royal Mail", "Evri", "DPD", "UPS", "DHL"];

  const statuses = [
    { id: "all", labelEn: "All", labelZhCN: "全部", labelZhTW: "全部" },
    { id: "pending_delivery", labelEn: "Pending Delivery", labelZhCN: "待投递", labelZhTW: "待投遞" },
    { id: "pending_tracking", labelEn: "Delivered", labelZhCN: "已投递", labelZhTW: "已投遞" },
    { id: "shipped", labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨" },
    { id: "completed", labelEn: "Completed", labelZhCN: "已完成", labelZhTW: "已完成" },
  ];

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const ordersData = await res.json();
        setData(ordersData || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = data.filter((o) => {
    if (!["pending_delivery", "pending_tracking", "shipped", "completed"].includes(o.status)) {
      return false;
    }
    if (flt !== "all" && o.status !== flt) return false;
    if (q) {
      const searchText = q.toLowerCase();
      return (
        o.orderNo.toLowerCase().includes(searchText) ||
        (o.contactName && o.contactName.toLowerCase().includes(searchText)) ||
        (o.company && o.company.toLowerCase().includes(searchText)) ||
        (o.shippingAddress && o.shippingAddress.toLowerCase().includes(searchText))
      );
    }
    return true;
  });

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        const currentOrder = data.find((o) => o.id === id);
        const updatedOrder = { ...currentOrder, ...updated };
        setData(data.map((o) => o.id === id ? updatedOrder : o));
        if (selectedId === id) setSelectedOrder(updatedOrder);
        return true;
      } else {
        const err = await res.json();
        alert(lang === "en" ? "Failed: " : lang === "zh-CN" ? "操作失败: " : "操作失敗: " + (err.error || "Unknown error"));
        return false;
      }
    } catch (error: any) {
      console.error("Failed to update order:", error);
      alert(lang === "en" ? "Operation failed: " : lang === "zh-CN" ? "操作失败: " : "操作失敗: " + (error.message || JSON.stringify(error)));
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const openWaybillEdit = () => {
    setTempWaybillImage(selectedOrder?.waybillImage || "");
    setEditingWaybill(true);
  };

  const handleWaybillImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWaybillImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setTempWaybillImage(data.url);
      } else {
        alert(lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
      }
    } catch (error: any) {
      alert(error.message || "Upload failed");
    } finally {
      setUploadingWaybillImage(false);
    }
  };

  const saveWaybill = async () => {
    if (!selectedOrder || !tempWaybillImage) return;

    const updates: Partial<Order> = { waybillImage: tempWaybillImage };

    if (selectedOrder.status === "pending_delivery") {
      updates.status = "pending_tracking";
    }

    const ok = await updateOrder(selectedOrder.id, updates);
    if (ok) {
      setEditingWaybill(false);
    }
  };

  const selected = (id: string) => {
    const order = data.find((o) => o.id === id);
    setSelectedId(id);
    setSelectedOrder(order || null);
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { labelEn: string; labelZhCN: string; labelZhTW: string }> = {
      pending_delivery: { labelEn: "Pending Delivery", labelZhCN: "待投递", labelZhTW: "待投遞" },
      pending_tracking: { labelEn: "Delivered", labelZhCN: "已投递", labelZhTW: "已投遞" },
      shipped: { labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨" },
      completed: { labelEn: "Completed", labelZhCN: "已完成", labelZhTW: "已完成" },
    };
    const v = map[status] || { labelEn: status, labelZhCN: status, labelZhTW: status };
    return lang === "en" ? v.labelEn : lang === "zh-CN" ? v.labelZhCN : v.labelZhTW;
  };

  return (
    <AdminLayout title={t("shipping")} subtitle={lang === "en" ? "Carrier management & tracking" : lang === "zh-CN" ? "物流管理与追踪" : "物流管理與追蹤"}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {carriers.map((c) => (
          <div key={c} className="card p-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-3">
              <Truck className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm">{c}</div>
            <div className="text-xs text-slate-500">{lang === "en" ? "Active" : lang === "zh-CN" ? "已启用" : "已啟用"}</div>
          </div>
        ))}
      </div>

      <div className="card p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
          <div className="w-full sm:flex-1 sm:min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              className="input pl-9 py-2.5 w-full"
              placeholder={lang === "en" ? "Search shipments..." : lang === "zh-CN" ? "搜索物流订单（订单号、地址、收件人）..." : "搜尋物流訂單（訂單號、地址、收件人）..."}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
            {statuses.map((s) => (
              <button
                key={s.id}
                onClick={() => setFlt(s.id)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 ${flt === s.id ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
              >
                {lang === "en" ? s.labelEn : lang === "zh-CN" ? s.labelZhCN : s.labelZhTW}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 font-mono truncate">{selectedOrder.orderNo}</div>
              <div className="text-base sm:text-lg font-semibold truncate">{selectedOrder.contactName || selectedOrder.company || "N/A"}</div>
              <div className="text-xs sm:text-sm text-slate-500 truncate">{new Date(selectedOrder.date).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Shanghai" })}</div>
            </div>
            <button onClick={() => { setSelectedId(null); setSelectedOrder(null); setEditingWaybill(false); }} className="text-slate-400 hover:text-slate-700 flex-shrink-0 p-1"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-5">
            <StatusBadge status={selectedOrder.status} />
            {selectedOrder.trackingNumber && (
              <span className="badge badge-blue">{selectedOrder.trackingNumber}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 sm:mb-5 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            {selectedOrder.contactName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{selectedOrder.contactName}</span>
              </div>
            )}
            {selectedOrder.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{selectedOrder.phone}</span>
              </div>
            )}
            {selectedOrder.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{selectedOrder.email}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{t("shipping_address")}</span>
              </div>
              <div className="text-sm mb-2">{selectedOrder.shippingAddress || "—"}</div>
              <div className="text-sm text-slate-500 space-y-1">
                {selectedOrder.postalCode && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{lang === "en" ? "Postal Code:" : lang === "zh-CN" ? "邮编:" : "郵遞區號:"}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{selectedOrder.postalCode}</span>
                  </div>
                )}
                {selectedOrder.country && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{lang === "en" ? "Country:" : lang === "zh-CN" ? "国家:" : "國家:"}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{selectedOrder.country}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {/* 运单图片上传 - 待投递状态显示 */}
                {selectedOrder.status === "pending_delivery" && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {lang === "en" ? "Waybill Image" : lang === "zh-CN" ? "快递面单" : "快遞面單"}
                        </span>
                      </div>
                      {!editingWaybill && (
                        <button onClick={openWaybillEdit} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                          <Edit2 className="w-3 h-3" />
                          {lang === "en" ? "Upload" : lang === "zh-CN" ? "上传" : "上傳"}
                        </button>
                      )}
                    </div>

                    {editingWaybill ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-amber-700 dark:text-amber-400 mb-2">
                            {lang === "en" ? "Waybill Image *" : lang === "zh-CN" ? "快递面单图片 *" : "快遞面單圖片 *"}
                          </label>
                          <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl p-4 text-center hover:border-amber-500 transition-colors">
                            {tempWaybillImage ? (
                              <div className="relative">
                                <img src={tempWaybillImage} alt="Waybill" className="max-h-40 mx-auto rounded-lg" />
                                <button
                                  onClick={() => setTempWaybillImage("")}
                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer block">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleWaybillImageUpload}
                                />
                                <Upload className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                                <div className="text-sm text-amber-700 dark:text-amber-400">
                                  {uploadingWaybillImage ? (lang === "en" ? "Uploading..." : lang === "zh-CN" ? "上传中..." : "上傳中...") : (lang === "en" ? "Click to upload" : lang === "zh-CN" ? "点击上传" : "點擊上傳")}
                                </div>
                                <div className="text-xs text-amber-500 mt-1">{lang === "en" ? "JPG, PNG up to 5MB" : lang === "zh-CN" ? "支持JPG、PNG，最大5MB" : "支持JPG、PNG，最大5MB"}</div>
                              </label>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => setEditingWaybill(false)} className="flex-1 btn-ghost justify-center">
                            {lang === "en" ? "Cancel" : lang === "zh-CN" ? "取消" : "取消"}
                          </button>
                          <button
                            onClick={saveWaybill}
                            disabled={!tempWaybillImage || updating}
                            className="flex-1 btn-primary justify-center flex items-center gap-2 disabled:opacity-50"
                          >
                            {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                            {lang === "en" ? "Confirm Delivery" : lang === "zh-CN" ? "确认投递" : "確認投遞"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 dark:text-amber-400 italic">
                        {selectedOrder.waybillImage || lang === "en" ? "Not uploaded yet" : lang === "zh-CN" ? "尚未上传" : "尚未上傳"}
                      </div>
                    )}
                  </div>
                )}

                {/* 已投递/已发货状态显示运单图片 */}
                {(selectedOrder.status === "pending_tracking" || selectedOrder.status === "shipped" || selectedOrder.status === "completed") && selectedOrder.waybillImage && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {lang === "en" ? "Waybill Image" : lang === "zh-CN" ? "快递面单" : "快遞面單"}
                      </span>
                    </div>
                    <img src={selectedOrder.waybillImage} alt="Waybill" className="max-w-full rounded-lg border border-amber-200 dark:border-amber-800" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {lang === "en" ? "Items" : lang === "zh-CN" ? "商品" : "商品"} ({selectedOrder.items.length})
              </div>
              <div className="text-sm max-h-60 overflow-y-auto">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">SKU: {item.sku} × {item.quantity}</div>
                    </div>
                    <div className="font-medium">{formatCurrency(item.price * item.quantity, currency)}</div>
                  </div>
                ))}

                {selectedOrder.shippingFee && selectedOrder.shippingFee > 0 && (
                  <div className="flex items-center justify-between py-2 text-sm border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">
                      {lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费" : "運費"}
                      {selectedOrder.shippedAt && (
                        <span className="ml-2 text-xs text-slate-400">@ {new Date(selectedOrder.shippedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })}</span>
                      )}
                    </span>
                    <span className="font-medium">{formatCurrency(selectedOrder.shippingFee, currency)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-3 font-semibold text-base">
                  <span>{t("total")}</span>
                  <span>{formatCurrency(selectedOrder.total + (selectedOrder.shippingFee || 0), currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 运单号显示 - 已发货后展示 */}
          {(selectedOrder.status === "shipped" || selectedOrder.status === "completed") && selectedOrder.trackingNumber && (
            <div className="mb-5 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {lang === "en" ? "Tracking Number" : lang === "zh-CN" ? "运单号" : "運單號"}
                </span>
              </div>
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400 font-mono">
                {selectedOrder.trackingNumber}
              </div>
              {selectedOrder.trackingImage && (
                <div className="mt-3">
                  <img src={selectedOrder.trackingImage} alt="Tracking" className="max-w-full rounded-lg border border-emerald-200 dark:border-emerald-800" />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost flex items-center gap-2"><FileText className="w-4 h-4" /> {t("download_invoice")}</button>
          </div>
        </div>
      )}

      <PageCard title={lang === "en" ? "Shipments" : lang === "zh-CN" ? "物流订单" : "物流訂單"} subtitle={`${formatNumber(filtered.length)} ${lang === "en" ? "orders" : lang === "zh-CN" ? "条订单" : "條訂單"}`}>
        <div className="scrollable">
          {loading ? (
            <div className="text-center py-8 text-slate-500">{lang === "en" ? "Loading..." : lang === "zh-CN" ? "加载中..." : "載入中..."}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500">{lang === "en" ? "No shipments found" : lang === "zh-CN" ? "暂无物流订单" : "暫無物流訂單"}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("order_no")}</th>
                  <th className="hidden sm:table-cell">{lang === "en" ? "Customer" : lang === "zh-CN" ? "收件人" : "收件人"}</th>
                  <th>{t("shipping_address")}</th>
                  <th className="hidden md:table-cell">{t("amount")}</th>
                  <th>{lang === "en" ? "Status" : lang === "zh-CN" ? "状态" : "狀態"}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs">{o.orderNo}</td>
                    <td className="hidden sm:table-cell font-medium">
                      <div className="truncate max-w-[120px]">{o.contactName || o.company || "N/A"}</div>
                      {o.phone && <div className="text-xs text-slate-400 truncate max-w-[120px]">{o.phone}</div>}
                    </td>
                    <td className="text-sm text-slate-500 max-w-[200px] truncate">{o.shippingAddress}</td>
                    <td className="hidden md:table-cell font-medium whitespace-nowrap">{formatCurrency(o.total, currency)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>
                      <button onClick={() => selected(o.id)} className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("view")}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageCard>
    </AdminLayout>
  );
}
