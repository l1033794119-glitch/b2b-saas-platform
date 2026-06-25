"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Eye, Truck, FileText, Search, X, Phone, Mail, User, MapPin, Package, Image, Upload } from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  id: string;
  orderNo: string;
  agentId: string;
  items: OrderItem[];
  total: number;
  status: string;
  date: string;
  shippingAddress: string;
  postalCode?: string;
  country?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  trackingNumber?: string;
  trackingImage?: string;
  company?: string;
  shippingFee?: number;
  shippedAt?: string;
}

interface Agent {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone?: string;
}

const statuses = [
  { id: "all", labelEn: "All", labelZhCN: "全部", labelZhTW: "全部" },
  { id: "pending", labelEn: "Unshipped", labelZhCN: "未发货", labelZhTW: "未發貨" },
  { id: "shipped", labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨" },
];

export default function OrdersPage() {
  const { t, currency, lang } = useApp();
  const [data, setData] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [shipInfo, setShipInfo] = useState({ trackingNumber: "", trackingImage: "", shippingFee: "" });
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleTrackingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setShipInfo({ ...shipInfo, trackingImage: data.url });
      } else {
        alert(lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const orders = await res.json();
        setData(orders);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const agentsData = await res.json();
        setAgents(agentsData);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchAgents();
  }, []);

  // 防止自动刷新时覆盖正在更新的订单
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      // 如果有订单正在更新，跳过这次刷新
      if (updatingOrderIds.size === 0) {
        fetchOrders();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [updatingOrderIds]);

  const updateOrderStatus = async (id: string, status: string, extra?: Partial<Order>) => {
    setUpdating(true);
    setUpdatingOrderIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      if (res.ok) {
        const updated = await res.json();
        const updatedOrder = { ...data.find((o) => o.id === id), ...updated };
        setData(data.map((o) => o.id === id ? updatedOrder : o));
        if (selected === id) setSelected(updatedOrder);
      }
    } catch (error) {
      console.error("Failed to update order:", error);
    } finally {
      setUpdating(false);
      setUpdatingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleShip = async () => {
    if (!shipInfo.trackingNumber.trim()) return;
    const orderId = selected!;
    setUpdating(true);
    setUpdatingOrderIds((prev) => new Set(prev).add(orderId));
    try {
      const fee = parseFloat(shipInfo.shippingFee) || 0;
      const currentOrder = data.find((o) => o.id === orderId);

      // 如果有运费，先从代理商信用额度中扣除
      if (fee > 0 && currentOrder) {
        const creditRes = await fetch("/api/credit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: currentOrder.agentId,
            action: "deduct",
            amount: fee,
            note: `Shipping fee for ${currentOrder.orderNo}`,
          }),
        });
        if (!creditRes.ok) {
          const err = await creditRes.json();
          alert(lang === "en" ? "Failed to deduct shipping fee: " : lang === "zh-CN" ? "运费扣除失败: " : "運費扣除失敗: ") + (err.error || "Unknown error");
          setUpdating(false);
          setUpdatingOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
          return;
        }
      }

      // 更新订单状态和运费信息
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "shipped",
          trackingNumber: shipInfo.trackingNumber,
          trackingImage: shipInfo.trackingImage,
          shippingFee: fee,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        const updatedOrder = { ...currentOrder, ...updated };
        setData(data.map((o) => o.id === orderId ? updatedOrder : o));
        if (selected === orderId) setSelected(updatedOrder);
      }
      setShowShipModal(false);
      setShipInfo({ trackingNumber: "", trackingImage: "", shippingFee: "" });
    } catch (error) {
      console.error("Shipping failed:", error);
    } finally {
      setUpdating(false);
      setUpdatingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const filtered = data.filter((o) => {
    // Search filter
    const searchText = q.toLowerCase();
    const mq = !q ||
      o.orderNo.toLowerCase().includes(searchText) ||
      (o.contactName && o.contactName.toLowerCase().includes(searchText)) ||
      (o.company && o.company.toLowerCase().includes(searchText)) ||
      (o.phone && o.phone.includes(searchText)) ||
      (o.email && o.email.toLowerCase().includes(searchText));

    // Status filter
    const mf = flt === "all" || o.status === flt;

    // Agent filter
    const mage = agentFilter === "all" || o.agentId === agentFilter;

    // Date filter
    const orderDate = new Date(o.date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;
    const mdate = (!fromDate || orderDate >= fromDate) && (!toDate || orderDate <= toDate);

    return mq && mf && mage && mdate;
  });

  const selectedOrder = data.find((o) => o.id === selected);

  return (
    <AdminLayout title={t("orders")} subtitle={`${formatNumber(filtered.length)} / ${formatNumber(data.length)} ${lang === "en" ? "orders" : lang === "zh-CN" ? "订单" : "訂單"}`}>
      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              className="input pl-9 py-2.5"
              placeholder={lang === "en" ? "Search orders..." : lang === "zh-CN" ? "搜索订单（订单号、联系人、电话、邮箱）..." : "搜尋訂單（訂單號、聯絡人、電話、郵箱）..."}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Agent Filter */}
          <div className="min-w-[180px]">
            <label className="block text-xs text-slate-500 mb-1">{lang === "en" ? "Agent" : lang === "zh-CN" ? "代理商" : "代理商"}</label>
            <select
              className="select py-2.5"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            >
              <option value="all">{lang === "en" ? "All Agents" : lang === "zh-CN" ? "全部代理商" : "全部代理商"}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.company}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex gap-1.5 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s.id}
                onClick={() => setFlt(s.id)}
                className={`px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 ${flt === s.id ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
              >
                {lang === "en" ? s.labelEn : lang === "zh-CN" ? s.labelZhCN : s.labelZhTW}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-end gap-4 mt-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{lang === "en" ? "From Date" : lang === "zh-CN" ? "开始日期" : "開始日期"}</label>
            <input
              type="date"
              className="input py-2"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{lang === "en" ? "To Date" : lang === "zh-CN" ? "结束日期" : "結束日期"}</label>
            <input
              type="date"
              className="input py-2"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setQ(""); setFlt("all"); setAgentFilter("all"); setDateFrom(""); setDateTo(""); }}
            className="btn-ghost py-2"
          >
            {lang === "en" ? "Clear Filters" : lang === "zh-CN" ? "清除筛选" : "清除篩選"}
          </button>
        </div>
      </div>

      {selectedOrder && (
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-slate-500 font-mono">{selectedOrder.orderNo}</div>
              <div className="text-lg font-semibold">{selectedOrder.contactName || selectedOrder.company || "N/A"}</div>
              <div className="text-sm text-slate-500">{new Date(selectedOrder.date).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Shanghai" })}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            <StatusBadge status={selectedOrder.status} />
            {selectedOrder.trackingNumber && (
              <span className="badge badge-blue">{selectedOrder.trackingNumber}</span>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            {selectedOrder.contactName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{selectedOrder.contactName}</span>
              </div>
            )}
            {selectedOrder.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{selectedOrder.phone}</span>
              </div>
            )}
            {selectedOrder.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{selectedOrder.email}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Shipping Address */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{t("shipping_address")}</span>
              </div>
              <div className="text-sm mb-2">{selectedOrder.shippingAddress}</div>
              <div className="text-sm text-slate-500">
                {selectedOrder.postalCode && <span>{selectedOrder.postalCode}</span>}
                {selectedOrder.postalCode && selectedOrder.country && <span>, </span>}
                {selectedOrder.country && <span>{selectedOrder.country}</span>}
              </div>

              {/* Tracking Image */}
              {selectedOrder.trackingImage && (
                <div className="mt-4">
                  <div className="text-xs text-slate-500 mb-2">{lang === "en" ? "Tracking Image" : lang === "zh-CN" ? "运单图片" : "運單圖片"}</div>
                  <img src={selectedOrder.trackingImage} alt="Tracking" className="max-w-xs rounded-lg border border-slate-200 dark:border-slate-700" />
                </div>
              )}
            </div>

            {/* Order Items */}
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

                {/* 运费显示 */}
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

          {selectedOrder.notes && (
            <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <div className="text-xs text-amber-600 mb-1">{lang === "en" ? "Notes" : lang === "zh-CN" ? "备注" : "備註"}</div>
              <div className="text-sm">{selectedOrder.notes}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* 未发货 → 发货 */}
            {selectedOrder.status === "pending" && (
              <button onClick={() => setShowShipModal(true)} disabled={updating} className="btn-primary flex items-center gap-2">
                <Truck className="w-4 h-4" /> {lang === "en" ? "发货" : lang === "zh-CN" ? "发货" : "發貨"}
              </button>
            )}

            <button className="btn-ghost flex items-center gap-2"><FileText className="w-4 h-4" /> {t("download_invoice")}</button>
          </div>
        </div>
      )}

      {/* Shipment Modal */}
      {showShipModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Truck className="w-5 h-5" />
                {lang === "en" ? "Ship Order" : lang === "zh-CN" ? "发货" : "發貨"}
              </h2>
              <button onClick={() => setShowShipModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {lang === "en" ? "Tracking Number *" : lang === "zh-CN" ? "运单号 *" : "運單號 *"}
                </label>
                <input
                  className="input"
                  placeholder={lang === "en" ? "Enter tracking number" : lang === "zh-CN" ? "输入运单号" : "輸入運單號"}
                  value={shipInfo.trackingNumber}
                  onChange={(e) => setShipInfo({ ...shipInfo, trackingNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费金额" : "運費金額"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currency}</span>
                  <input
                    className="input pl-16"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={shipInfo.shippingFee}
                    onChange={(e) => setShipInfo({ ...shipInfo, shippingFee: e.target.value })}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1.5">
                  {lang === "en" ? "Will be deducted from agent's credit limit" : lang === "zh-CN" ? "将从代理商的信用额度中扣除" : "將從代理商的信用額度中扣除"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {lang === "en" ? "Tracking Image" : lang === "zh-CN" ? "运单图片" : "運單圖片"}
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors">
                  {shipInfo.trackingImage ? (
                    <div className="relative">
                      <img src={shipInfo.trackingImage} alt="Tracking" className="max-h-40 mx-auto rounded-lg" />
                      <button
                        onClick={() => setShipInfo({ ...shipInfo, trackingImage: "" })}
                        className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="tracking-upload"
                        onChange={handleTrackingImageUpload}
                      />
                      <label htmlFor="tracking-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <div className="text-sm text-slate-500">
                          {uploadingImage ? (lang === "en" ? "Uploading..." : lang === "zh-CN" ? "上传中..." : "上傳中...") : (lang === "en" ? "Click to upload tracking image" : lang === "zh-CN" ? "点击上传运单图片" : "點擊上傳運單圖片")}
                        </div>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <button onClick={() => setShowShipModal(false)} className="flex-1 btn-ghost justify-center">
                {lang === "en" ? "Cancel" : lang === "zh-CN" ? "取消" : "取消"}
              </button>
              <button onClick={handleShip} disabled={!shipInfo.trackingNumber.trim() || updating} className="flex-1 btn-primary justify-center flex items-center gap-2 disabled:opacity-50">
                {updating ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                {lang === "en" ? "Confirm Shipment" : lang === "zh-CN" ? "确认发货" : "確認發貨"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageCard>
        <div className="scrollable">
          {loading ? (
            <div className="text-center py-8 text-slate-500">{lang === "en" ? "Loading..." : lang === "zh-CN" ? "加载中..." : "載入中..."}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500">{lang === "en" ? "No orders found" : lang === "zh-CN" ? "暂无订单" : "暫無訂單"}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("order_no")}</th>
                  <th>{lang === "en" ? "Agent" : lang === "zh-CN" ? "代理商" : "代理商"}</th>
                  <th>{lang === "en" ? "Contact" : lang === "zh-CN" ? "联系人" : "聯絡人"}</th>
                  <th>{t("order_date")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("status")}</th>
                  <th>{t("tracking_number")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const agent = agents.find((a) => a.id === o.agentId);
                  return (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">{o.orderNo}</td>
                      <td className="font-medium">
                        <div>{agent?.company || o.agentId}</div>
                        {agent?.email && <div className="text-xs text-slate-400">{agent.email}</div>}
                      </td>
                      <td className="font-medium">
                        <div>{o.contactName || o.company || "N/A"}</div>
                        {o.phone && <div className="text-xs text-slate-400">{o.phone}</div>}
                      </td>
                      <td className="text-slate-500 text-sm">{new Date(o.date).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })}</td>
                      <td className="font-medium">{formatCurrency(o.total, currency)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="text-sm text-slate-500 font-mono">{o.trackingNumber || "—"}</td>
                      <td>
                        <button onClick={() => setSelected(o.id)} className="text-indigo-600 hover:underline text-sm flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> {t("view")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </PageCard>
    </AdminLayout>
  );
}
