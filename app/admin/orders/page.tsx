"use client";

import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Eye, Truck, FileText, Search, X, Phone, Mail, User, MapPin, Package, Image, Upload, Check, AlertCircle, Edit2, QrCode, Package as PackageIcon, Download, Zap, XCircle } from "lucide-react";
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
  qrCode?: string;
  waybillImage?: string;
  company?: string;
  shippingFee?: number;
  shippedAt?: string;
  warehouseId?: string;
  warehouse?: string;
  cancelReason?: string | null;
  previousStatus?: string | null;
  cancelRequestedAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
}

interface Agent {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone?: string;
}

interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

const statuses = [
  { id: "all", labelEn: "All", labelZhCN: "全部", labelZhTW: "全部" },
  { id: "pending_cancellation", labelEn: "Pending Cancellation", labelZhCN: "取消待审核", labelZhTW: "取消待審核" },
  { id: "pending_qrcode", labelEn: "Pending QR Code", labelZhCN: "待上传二维码", labelZhTW: "待上傳二維碼" },
  { id: "pending_delivery", labelEn: "Pending Delivery", labelZhCN: "待投递", labelZhTW: "待投遞" },
  { id: "pending_tracking", labelEn: "Pending Tracking", labelZhCN: "待填写运单号", labelZhTW: "待填寫運單號" },
  { id: "shipped", labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨" },
  { id: "completed", labelEn: "Completed", labelZhCN: "已完成", labelZhTW: "已完成" },
  { id: "cancelled", labelEn: "Cancelled", labelZhCN: "已取消", labelZhTW: "已取消" },
];

export default function OrdersPage() {
  const { t, currency, lang } = useApp();
  const [data, setData] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [shipInfo, setShipInfo] = useState({ trackingNumber: "", trackingImage: "" });
  const [updating, setUpdating] = useState(false);
  const [uploadingQrImage, setUploadingQrImage] = useState(false);
  const [uploadingWaybillImage, setUploadingWaybillImage] = useState(false);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [editingQrCode, setEditingQrCode] = useState(false);
  const [editingWaybill, setEditingWaybill] = useState(false);
  const [editingTracking, setEditingTracking] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [tempQrCode, setTempQrCode] = useState("");
  const [tempWaybillImage, setTempWaybillImage] = useState("");
  const [tempTrackingNumber, setTempTrackingNumber] = useState("");
  const [tempShippingFee, setTempShippingFee] = useState("");
  const [tempAddress, setTempAddress] = useState("");
  const [tempPostalCode, setTempPostalCode] = useState("");
  const [tempCountry, setTempCountry] = useState("");


  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, forEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQrImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (forEdit) {
          setTempQrCode(data.url);
        } else {
          setTempQrCode(data.url);
        }
      } else {
        alert(lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
    } finally {
      setUploadingQrImage(false);
    }
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
    } catch (error) {
      console.error("Upload failed:", error);
      alert(lang === "en" ? "Upload failed" : lang === "zh-CN" ? "上传失败" : "上傳失敗");
    } finally {
      setUploadingWaybillImage(false);
    }
  };

  const handleTrackingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/warehouses");
      if (res.ok) {
        const warehousesData = await res.json();
        setWarehouses(warehousesData);
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const productsData = await res.json();
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const getProductImage = (productId?: string) => {
    if (!productId) return "";
    const p = products.find((x) => x.id === productId);
    if (p && Array.isArray(p.images) && p.images.length > 0) {
      return p.images[0];
    }
    return "";
  };

  useEffect(() => {
    fetchOrders();
    fetchAgents();
    fetchWarehouses();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selected && typeof window !== "undefined") {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [selected]);

  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      if (updatingOrderIds.size === 0) {
        fetchOrders();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [updatingOrderIds]);

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    setUpdating(true);
    setUpdatingOrderIds((prev) => new Set(prev).add(id));
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
        if (selected === id) setSelected(updatedOrder);
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
      setUpdatingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filtered = data.filter((o) => {
    const searchText = q.toLowerCase();
    const mq = !q ||
      o.orderNo.toLowerCase().includes(searchText) ||
      (o.contactName && o.contactName.toLowerCase().includes(searchText)) ||
      (o.company && o.company.toLowerCase().includes(searchText)) ||
      (o.phone && o.phone.includes(searchText)) ||
      (o.email && o.email.toLowerCase().includes(searchText));

    const mf = flt === "all" || o.status === flt;

    const mage = agentFilter === "all" || o.agentId === agentFilter;

    const mwarehouse = warehouseFilter === "all" || 
      (o.warehouseId && o.warehouseId === warehouseFilter) ||
      (o.warehouse && o.warehouse === warehouseFilter) ||
      (o.items && o.items.some((item: any) => item.warehouseId === warehouseFilter || item.warehouse === warehouseFilter));

    const orderDate = new Date(o.date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo + "T23:59:59") : null;
    const mdate = (!fromDate || orderDate >= fromDate) && (!toDate || orderDate <= toDate);

    return mq && mf && mage && mdate && mwarehouse;
  });

  const selectedOrder = data.find((o) => o.id === selected);

  const exportCSV = () => {
    if (filtered.length === 0) return;

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const statusLabels: Record<string, string> = {
      pending_qrcode: "Pending QR Code",
      pending_delivery: "Pending Delivery",
      pending_tracking: "Pending Tracking",
      shipped: "Shipped",
      completed: "Completed",
    };

    const headers = [
      "Order No", "Date", "Status", "Agent Company", "Agent Email",
      "Contact Name", "Phone", "Email", "Country", "Postal Code",
      "Shipping Address", "Warehouse", "Items", "Total Amount", "Shipping Fee",
      "Tracking Number", "Notes",
    ];

    const rows = filtered.map((o) => {
      const agent = agents.find((a) => a.id === o.agentId);
      const itemsStr = (o.items || [])
        .map((it: any) => `${it.name} x${it.quantity} @${it.price}`)
        .join("; ");
      return [
        o.orderNo,
        o.date,
        statusLabels[o.status] || o.status,
        agent?.company || o.company || "",
        agent?.email || "",
        o.contactName || "",
        o.phone || "",
        o.email || "",
        o.country || "",
        o.postalCode || "",
        o.shippingAddress || "",
        o.warehouse || "",
        itemsStr,
        o.total,
        o.shippingFee || 0,
        o.trackingNumber || "",
        o.notes || "",
      ].map(escapeCSV).join(",");
    });

    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openQrEdit = () => {
    setTempQrCode(selectedOrder?.qrCode || "");
    setTempShippingFee(selectedOrder?.shippingFee?.toString() || "");
    setEditingQrCode(true);
  };

  const saveQrCode = async () => {
    if (!selectedOrder || !tempQrCode) return;

    const fee = parseFloat(tempShippingFee) || 0;
    const updates: Partial<Order> = { qrCode: tempQrCode, shippingFee: fee };

    if (selectedOrder.status === "pending_qrcode") {
      updates.status = "pending_delivery";
    }

    if (fee > 0 && selectedOrder.status === "pending_qrcode") {
      const creditRes = await fetch("/api/credit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedOrder.agentId,
          action: "deduct",
          amount: fee,
          note: `Shipping fee for order ${selectedOrder.orderNo}`,
        }),
      });
      if (!creditRes.ok) {
        const err = await creditRes.json();
        alert(lang === "en" ? "Failed to deduct shipping fee: " : lang === "zh-CN" ? "运费扣除失败: " : "運費扣除失敗: " + (err.error || "Unknown error"));
        return;
      }
    }

    const ok = await updateOrder(selectedOrder.id, updates);
    if (ok) {
      setEditingQrCode(false);
    }
  };

  const openWaybillEdit = () => {
    setTempWaybillImage(selectedOrder?.waybillImage || "");
    setEditingWaybill(true);
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

  const openTrackingEdit = () => {
    setTempTrackingNumber(selectedOrder?.trackingNumber || "");
    setEditingTracking(true);
  };

  // 图像二值化处理
  const binarizeImage = (canvas: HTMLCanvasElement, threshold: number = 128): void => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
      const val = avg >= threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);
  };

  // 对比度增强
  const enhanceContrast = (canvas: HTMLCanvasElement, factor: number = 2): void => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
    }
    ctx.putImageData(imageData, 0, 0);
  };

  // 简单降噪处理
  const denoiseImage = (canvas: HTMLCanvasElement): void => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const output = new Uint8ClampedArray(data.length);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        let sumR = 0, sumG = 0, sumB = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            sumR += data[nIdx];
            sumG += data[nIdx + 1];
            sumB += data[nIdx + 2];
          }
        }
        output[idx] = sumR / 9;
        output[idx + 1] = sumG / 9;
        output[idx + 2] = sumB / 9;
        output[idx + 3] = 255;
      }
    }
    const outImageData = new ImageData(output, width, height);
    ctx.putImageData(outImageData, 0, 0);
  };

  // 预处理图片并转换为 blob URL
  // 确认发货：保存运单号并将状态改为已发货
  const confirmShip = async () => {
    if (!selectedOrder) return;
    if (!tempTrackingNumber.trim()) {
      alert(lang === "en" ? "Please enter tracking number" : lang === "zh-CN" ? "请输入运单号" : "請輸入運單號");
      return;
    }

    const updates: Partial<Order> = {
      trackingNumber: tempTrackingNumber.trim(),
      shippedAt: new Date().toISOString()
    };

    if (selectedOrder.status === "pending_tracking") {
      updates.status = "shipped";
    }

    const ok = await updateOrder(selectedOrder.id, updates);
    if (ok) {
      setEditingTracking(false);
    }
  };

  const saveTrackingNumberOnly = async () => {
    if (!selectedOrder) return;
    if (!tempTrackingNumber.trim()) {
      alert(lang === "en" ? "Please enter tracking number" : lang === "zh-CN" ? "请输入运单号" : "請輸入運單號");
      return;
    }

    const updates: Partial<Order> = {
      trackingNumber: tempTrackingNumber.trim(),
    };

    const ok = await updateOrder(selectedOrder.id, updates);
    if (ok) {
      setEditingTracking(false);
    }
  };

  const saveTrackingNumber = async () => {
    if (!selectedOrder) return;
    if (!tempTrackingNumber.trim()) {
      alert(lang === "en" ? "Please enter tracking number" : lang === "zh-CN" ? "请输入运单号" : "請輸入運單號");
      return;
    }

    const updates: Partial<Order> = {
      trackingNumber: tempTrackingNumber.trim(),
      shippedAt: new Date().toISOString()
    };

    if (selectedOrder.status === "pending_tracking") {
      updates.status = "shipped";
    }

    const ok = await updateOrder(selectedOrder.id, updates);
    if (ok) {
      setEditingTracking(false);
    }
  };

  const handleApproveCancel = async () => {
    if (!selectedOrder) return;
    if (!confirm(lang === "en" ? "Are you sure you want to approve the cancellation? The order amount will be refunded to the agent and inventory will be restored." : lang === "zh-CN" ? "确定要批准取消吗？订单金额将退还给代理商，库存将恢复。" : "確定要批准取消嗎？訂單金額將退還給代理商，庫存將恢復。")) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", adminName: "admin" }),
      });

      if (res.ok) {
        const updated = await res.json();
        setData(data.map((o) => o.id === selectedOrder.id ? updated : o));
      } else {
        const err = await res.json();
        alert(err.error || "操作失败");
      }
    } catch (error) {
      console.error("Approve cancel error:", error);
      alert("操作失败，请重试");
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectCancel = async () => {
    if (!selectedOrder) return;
    if (!confirm(lang === "en" ? "Are you sure you want to reject the cancellation? The order will be restored to its previous status." : lang === "zh-CN" ? "确定要拒绝取消吗？订单将恢复到之前的状态。" : "確定要拒絕取消嗎？訂單將恢復到之前的狀態。")) {
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", adminName: "admin" }),
      });

      if (res.ok) {
        const updated = await res.json();
        setData(data.map((o) => o.id === selectedOrder.id ? updated : o));
      } else {
        const err = await res.json();
        alert(err.error || "操作失败");
      }
    } catch (error) {
      console.error("Reject cancel error:", error);
      alert("操作失败，请重试");
    } finally {
      setUpdating(false);
    }
  };

  const openAddressEdit = () => {
    setTempAddress(selectedOrder?.shippingAddress || "");
    setTempPostalCode(selectedOrder?.postalCode || "");
    setTempCountry(selectedOrder?.country || "");
    setEditingAddress(true);
  };

  const saveAddress = async () => {
    if (!selectedOrder) return;
    if (!tempAddress.trim()) {
      alert(lang === "en" ? "Please enter address" : lang === "zh-CN" ? "请输入地址" : "請輸入地址");
      return;
    }

    const updates: Partial<Order> = {
      shippingAddress: tempAddress.trim(),
      postalCode: tempPostalCode.trim(),
      country: tempCountry.trim(),
    };

    const ok = await updateOrder(selectedOrder.id, updates);
    if (ok) {
      setEditingAddress(false);
    }
  };

  return (
    <AdminLayout title={t("orders")} subtitle={`${formatNumber(filtered.length)} / ${formatNumber(data.length)} ${lang === "en" ? "orders" : lang === "zh-CN" ? "订单" : "訂單"}`}>
      <div className="card p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {lang === "en" ? "Filters" : lang === "zh-CN" ? "筛选条件" : "篩選條件"}
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1.5 flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            {lang === "en" ? "Export CSV" : lang === "zh-CN" ? "导出CSV" : "匯出CSV"}
            <span className="text-xs opacity-75">({filtered.length})</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
          <div className="w-full sm:flex-1 sm:min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !pl-11 py-2.5 w-full"
              placeholder={lang === "en" ? "Search orders..." : lang === "zh-CN" ? "搜索订单（订单号、联系人、电话、邮箱）..." : "搜尋訂單（訂單號、聯絡人、電話、郵箱）..."}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[360px]">
            <div className="min-w-0">
              <label className="block text-xs text-slate-500 mb-1">{lang === "en" ? "Agent" : lang === "zh-CN" ? "代理商" : "代理商"}</label>
              <select
                className="select py-2 w-full"
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
              >
                <option value="all">{lang === "en" ? "All Agents" : lang === "zh-CN" ? "全部代理商" : "全部代理商"}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.company}</option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-xs text-slate-500 mb-1">{lang === "en" ? "Warehouse" : lang === "zh-CN" ? "仓库" : "倉庫"}</label>
              <select
                className="select py-2 w-full"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="all">{lang === "en" ? "All Warehouses" : lang === "zh-CN" ? "全部仓库" : "全部倉庫"}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap mt-3">
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => setFlt(s.id)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 ${flt === s.id ? "bg-emerald-500 text-white border-emerald-500" : ""}`}
            >
              {lang === "en" ? s.labelEn : lang === "zh-CN" ? s.labelZhCN : s.labelZhTW}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 mt-3">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs text-slate-500 mb-1">{lang === "en" ? "From Date" : lang === "zh-CN" ? "开始日期" : "開始日期"}</label>
            <input
              type="date"
              className="input py-2 w-full"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs text-slate-500 mb-1">{lang === "en" ? "To Date" : lang === "zh-CN" ? "结束日期" : "結束日期"}</label>
            <input
              type="date"
              className="input py-2 w-full"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setQ(""); setFlt("all"); setAgentFilter("all"); setWarehouseFilter("all"); setDateFrom(""); setDateTo(""); }}
            className="btn-ghost py-2 flex-shrink-0"
          >
            {lang === "en" ? "Clear Filters" : lang === "zh-CN" ? "清除筛选" : "清除篩選"}
          </button>
        </div>
      </div>

      {selectedOrder && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelected(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
          style={{ touchAction: "none" }}
        >
          <div 
            className="card p-4 sm:p-6 w-full max-w-full sm:max-w-4xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { e.stopPropagation(); }}
            style={{ overflowY: "auto", touchAction: "auto", WebkitOverflowScrolling: "touch" }}
          >
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 font-mono truncate">{selectedOrder.orderNo}</div>
              <div className="text-base sm:text-lg font-semibold truncate">{selectedOrder.contactName || selectedOrder.company || "N/A"}</div>
              <div className="text-xs sm:text-sm text-slate-500 truncate">{new Date(selectedOrder.date).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Shanghai" })}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 flex-shrink-0 p-1"><X className="w-5 h-5" /></button>
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500">{t("shipping_address")}</span>
                </div>
                <button onClick={openAddressEdit} className="text-xs text-emerald-500 hover:text-emerald-500 flex items-center gap-1">
                  <Edit2 className="w-3 h-3" />
                  {lang === "en" ? "Edit" : lang === "zh-CN" ? "编辑" : "編輯"}
                </button>
              </div>

              {editingAddress ? (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang === "en" ? "Address *" : lang === "zh-CN" ? "地址 *" : "地址 *"}
                    </label>
                    <textarea
                      className="input min-h-[80px] resize-y"
                      value={tempAddress}
                      onChange={(e) => setTempAddress(e.target.value)}
                      placeholder={lang === "en" ? "Enter shipping address" : lang === "zh-CN" ? "输入收货地址" : "輸入收貨地址"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {lang === "en" ? "Postal Code" : lang === "zh-CN" ? "邮编" : "郵遞區號"}
                      </label>
                      <input
                        className="input"
                        value={tempPostalCode}
                        onChange={(e) => setTempPostalCode(e.target.value)}
                        placeholder={lang === "en" ? "Postal code" : lang === "zh-CN" ? "邮编" : "郵遞區號"}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {lang === "en" ? "Country" : lang === "zh-CN" ? "国家" : "國家"}
                      </label>
                      <input
                        className="input"
                        value={tempCountry}
                        onChange={(e) => setTempCountry(e.target.value)}
                        placeholder={lang === "en" ? "Country" : lang === "zh-CN" ? "国家" : "國家"}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingAddress(false)} className="flex-1 btn-ghost justify-center">
                      {lang === "en" ? "Cancel" : lang === "zh-CN" ? "取消" : "取消"}
                    </button>
                    <button
                      onClick={saveAddress}
                      disabled={!tempAddress.trim() || updating}
                      className="flex-1 btn-primary justify-center flex items-center gap-2 disabled:opacity-50"
                    >
                      {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                      {lang === "en" ? "Save" : lang === "zh-CN" ? "保存" : "保存"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}

              <div className="mt-5 space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {lang === "en" ? "Payment QR Code" : lang === "zh-CN" ? "支付二维码" : "支付二維碼"}
                      </span>
                    </div>
                    <button onClick={openQrEdit} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                      <Edit2 className="w-3 h-3" />
                      {lang === "en" ? "Edit" : lang === "zh-CN" ? "编辑" : "編輯"}
                    </button>
                  </div>

                  {editingQrCode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-amber-700 dark:text-amber-400 mb-2">
                          {lang === "en" ? "QR Code Image *" : lang === "zh-CN" ? "二维码图片 *" : "二維碼圖片 *"}
                        </label>
                        <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl p-4 text-center hover:border-amber-500 transition-colors">
                          {tempQrCode ? (
                            <div className="relative">
                              <img src={tempQrCode} alt="QR Code" className="max-h-40 mx-auto rounded-lg" />
                              <button
                                onClick={() => setTempQrCode("")}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
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
                                id="qr-edit-upload"
                                onChange={(e) => handleQrImageUpload(e, true)}
                              />
                              <label htmlFor="qr-edit-upload" className="cursor-pointer">
                                <Upload className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                                <div className="text-sm text-amber-600">
                                  {uploadingQrImage ? (lang === "en" ? "Uploading..." : lang === "zh-CN" ? "上传中..." : "上傳中...") : (lang === "en" ? "Click to upload" : lang === "zh-CN" ? "点击上传" : "點擊上傳")}
                                </div>
                              </label>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-amber-700 dark:text-amber-400 mb-2">
                          {lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费金额" : "運費金額"}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currency}</span>
                          <input
                            className="input !pl-14"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={tempShippingFee}
                            onChange={(e) => setTempShippingFee(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setEditingQrCode(false)} className="flex-1 btn-ghost justify-center">
                          {lang === "en" ? "Cancel" : lang === "zh-CN" ? "取消" : "取消"}
                        </button>
                        <button
                          onClick={saveQrCode}
                          disabled={!tempQrCode || updating}
                          className="flex-1 btn-primary justify-center flex items-center gap-2 disabled:opacity-50"
                        >
                          {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                          {lang === "en" ? "Save" : lang === "zh-CN" ? "保存" : "保存"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selectedOrder.qrCode ? (
                        <img src={selectedOrder.qrCode} alt="QR Code" onClick={() => setPreviewImage(selectedOrder.qrCode!)} className="max-w-xs rounded-lg border border-amber-200 dark:border-amber-800 cursor-pointer hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="text-sm text-amber-500 italic">
                          {lang === "en" ? "Not uploaded yet" : lang === "zh-CN" ? "尚未上传" : "尚未上傳"}
                        </div>
                      )}
                      {selectedOrder.shippingFee != null && selectedOrder.shippingFee > 0 && (
                        <div className="mt-2 text-xs text-amber-600">
                          {lang === "en" ? "Shipping Fee: " : lang === "zh-CN" ? "运费: " : "運費: "}{formatCurrency(selectedOrder.shippingFee, currency)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        {lang === "en" ? "Waybill Image" : lang === "zh-CN" ? "快递面单" : "快遞面單"}
                      </span>
                    </div>
                    <button onClick={openWaybillEdit} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Edit2 className="w-3 h-3" />
                      {lang === "en" ? "Edit" : lang === "zh-CN" ? "编辑" : "編輯"}
                    </button>
                  </div>

                  {editingWaybill ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-blue-700 dark:text-blue-400 mb-2">
                          {lang === "en" ? "Waybill Image *" : lang === "zh-CN" ? "面单图片 *" : "面單圖片 *"}
                        </label>
                        <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                          {tempWaybillImage ? (
                            <div className="relative">
                              <img src={tempWaybillImage} alt="Waybill" className="max-h-40 mx-auto rounded-lg" />
                              <button
                                onClick={() => setTempWaybillImage("")}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
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
                                id="waybill-edit-upload"
                                onChange={handleWaybillImageUpload}
                              />
                              <label htmlFor="waybill-edit-upload" className="cursor-pointer">
                                <Upload className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                                <div className="text-sm text-blue-600">
                                  {uploadingWaybillImage ? (lang === "en" ? "Uploading..." : lang === "zh-CN" ? "上传中..." : "上傳中...") : (lang === "en" ? "Click to upload" : lang === "zh-CN" ? "点击上传" : "點擊上傳")}
                                </div>
                              </label>
                            </>
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
                          {lang === "en" ? "Save" : lang === "zh-CN" ? "保存" : "保存"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selectedOrder.waybillImage ? (
                        <img src={selectedOrder.waybillImage} alt="Waybill" onClick={() => setPreviewImage(selectedOrder.waybillImage!)} className="max-w-xs rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="text-sm text-blue-500 italic">
                          {lang === "en" ? "Not uploaded yet" : lang === "zh-CN" ? "尚未上传" : "尚未上傳"}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {lang === "en" ? "Tracking Number" : lang === "zh-CN" ? "运单号" : "運單號"}
                      </span>
                    </div>
                    {!editingTracking && (
                      <button onClick={openTrackingEdit} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        <Edit2 className="w-3 h-3" />
                        {lang === "en" ? "Edit" : lang === "zh-CN" ? "编辑" : "編輯"}
                      </button>
                    )}
                  </div>

                  {editingTracking ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-emerald-700 dark:text-emerald-400 mb-2">
                          {lang === "en" ? "Tracking Number *" : lang === "zh-CN" ? "运单号 *" : "運單號 *"}
                        </label>
                        <input
                          className="input"
                          placeholder={lang === "en" ? "Enter tracking number" : lang === "zh-CN" ? "输入运单号" : "輸入運單號"}
                          value={tempTrackingNumber}
                          onChange={(e) => setTempTrackingNumber(e.target.value)}
                        />
                      </div>

                      {/* 操作按钮组 */}
                      <div className="flex flex-wrap gap-2">
                        {/* 取消按钮 */}
                        <button onClick={() => setEditingTracking(false)} className="flex-1 btn-ghost justify-center">
                          {lang === "en" ? "Cancel" : lang === "zh-CN" ? "取消" : "取消"}
                        </button>

                        {/* 保存按钮（仅保存运单号，不改变状态） */}
                        <button
                          onClick={saveTrackingNumberOnly}
                          disabled={!tempTrackingNumber.trim() || updating}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                          {lang === "en" ? "Save" : lang === "zh-CN" ? "保存" : "保存"}
                        </button>

                        {/* 确认发货按钮（保存运单号 + 状态改为已发货） */}
                        <button
                          onClick={confirmShip}
                          disabled={!tempTrackingNumber.trim() || updating}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Truck className="w-4 h-4" />}
                          {lang === "en" ? "Confirm Ship" : lang === "zh-CN" ? "确认发货" : "確認發貨"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400 font-mono mb-3">
                        {selectedOrder.trackingNumber || (
                          <span className="text-emerald-500 italic font-normal">
                            {lang === "en" ? "Not entered yet" : lang === "zh-CN" ? "尚未填写" : "尚未填寫"}
                          </span>
                        )}
                      </div>
                      {/* 未填写运单号时，直接显示操作按钮 */}
                      {!selectedOrder.trackingNumber && (selectedOrder.status === "pending_tracking" || selectedOrder.status === "pending_delivery") && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={openTrackingEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            {lang === "en" ? "Enter Tracking Number" : lang === "zh-CN" ? "输入运单号" : "輸入運單號"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 取消订单审核区域 */}
            {(selectedOrder.status === "pending_cancellation" || selectedOrder.status === "cancelled") && selectedOrder.cancelReason && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                    {selectedOrder.status === "cancelled"
                      ? (lang === "en" ? "Cancel Reason" : lang === "zh-CN" ? "取消原因" : "取消原因")
                      : (lang === "en" ? "Cancel Request Pending Review" : lang === "zh-CN" ? "取消申请待审核" : "取消申請待審核")}
                  </span>
                </div>
                <div className="text-sm text-rose-700 dark:text-rose-300 mb-3">{selectedOrder.cancelReason}</div>

                {selectedOrder.status === "pending_cancellation" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleApproveCancel}
                      disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                      {lang === "en" ? "Approve Cancel" : lang === "zh-CN" ? "批准取消" : "批准取消"}
                    </button>
                    <button
                      onClick={handleRejectCancel}
                      disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                      {lang === "en" ? "Reject" : lang === "zh-CN" ? "拒绝" : "拒絕"}
                    </button>
                  </div>
                )}

                {selectedOrder.status === "cancelled" && selectedOrder.cancelledBy && (
                  <div className="text-xs text-rose-500">
                    {lang === "en" ? "Cancelled by: " : lang === "zh-CN" ? "操作人：" : "操作人："}{selectedOrder.cancelledBy}
                    {selectedOrder.cancelledAt && (
                      <span className="ml-2">
                        {lang === "en" ? "At: " : lang === "zh-CN" ? "时间：" : "時間："}
                        {new Date(selectedOrder.cancelledAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {lang === "en" ? "Items" : lang === "zh-CN" ? "商品" : "商品"} ({selectedOrder.items.length})
              </div>
              <div className="text-sm max-h-[500px] overflow-y-auto">
                {selectedOrder.items.map((item, idx) => {
                  const productImage = getProductImage(item.productId) || item.image;
                  return (
                    <div key={idx} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="relative w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex-shrink-0">
                        {productImage ? (
                          <img src={productImage} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                        )}
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                          {item.quantity}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">SKU: {item.sku}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="text-lg font-bold text-emerald-500">×{item.quantity}</div>
                        <div className="text-xs text-slate-400">{lang === "en" ? "pieces" : lang === "zh-CN" ? "件" : "件"}</div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatCurrency(item.price * item.quantity, currency)}</div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 p-3 bg-emerald-500/10 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-500">
                      {lang === "en" ? "Total Items" : lang === "zh-CN" ? "商品总数" : "商品總數"}
                    </span>
                    <span className="text-2xl font-bold text-emerald-500">
                      {selectedOrder.items.reduce((sum: number, it: any) => sum + it.quantity, 0)}
                    </span>
                  </div>
                </div>

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

          <div className="flex flex-wrap gap-2">
            {(selectedOrder.status === "shipped" || selectedOrder.status === "completed") && (
              <button onClick={() => {
                setShipInfo({
                  trackingNumber: selectedOrder.trackingNumber || "",
                  trackingImage: selectedOrder.trackingImage || "",
                });
                setShowShipModal(true);
              }} className="btn-ghost flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> {lang === "en" ? "Edit Shipping Info" : lang === "zh-CN" ? "编辑发货信息" : "編輯發貨資訊"}
              </button>
            )}

            <button className="btn-ghost flex items-center gap-2"><FileText className="w-4 h-4" /> {t("download_invoice")}</button>
          </div>
          </div>
        </div>
      )}

      {showShipModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <><Edit2 className="w-5 h-5" />{lang === "en" ? "Edit Shipping Info" : lang === "zh-CN" ? "编辑发货信息" : "編輯發貨資訊"}</>
              </h2>
              <button onClick={() => { setShowShipModal(false); setShipInfo({ trackingNumber: "", trackingImage: "" }); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {lang === "en" ? "Tracking Number" : lang === "zh-CN" ? "运单号" : "運單號"}
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
                  {lang === "en" ? "Tracking Image" : lang === "zh-CN" ? "运单图片" : "運單圖片"}
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors">
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
                        id="tracking-modal-upload"
                        onChange={handleTrackingImageUpload}
                      />
                      <label htmlFor="tracking-modal-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <div className="text-sm text-slate-500">
                          {lang === "en" ? "Click to upload tracking image" : lang === "zh-CN" ? "点击上传运单图片" : "點擊上傳運單圖片"}
                        </div>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <button onClick={() => { setShowShipModal(false); setShipInfo({ trackingNumber: "", trackingImage: "" }); }} className="flex-1 btn-ghost justify-center">
                {lang === "en" ? "Cancel" : lang === "zh-CN" ? "取消" : "取消"}
              </button>
              <button
                onClick={async () => {
                  if (!shipInfo.trackingNumber.trim() && !shipInfo.trackingImage) {
                    alert(lang === "en" ? "Please enter tracking number or upload image" : lang === "zh-CN" ? "请输入运单号或上传图片" : "請輸入運單號或上傳圖片");
                    return;
                  }
                  setUpdating(true);
                  try {
                    const res = await fetch(`/api/orders/${selectedOrder.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        trackingNumber: shipInfo.trackingNumber || selectedOrder.trackingNumber,
                        trackingImage: shipInfo.trackingImage || selectedOrder.trackingImage,
                      }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      const updatedOrder = { ...selectedOrder, ...updated };
                      setData(data.map((o) => o.id === selectedOrder.id ? updatedOrder : o));
                      setSelected(updatedOrder);
                      setShowShipModal(false);
                      setShipInfo({ trackingNumber: "", trackingImage: "" });
                    } else {
                      const err = await res.json();
                      alert(lang === "en" ? "Save failed: " : lang === "zh-CN" ? "保存失败: " : "保存失敗: " + (err.error || "Unknown error"));
                    }
                  } catch (error) {
                    console.error("Save error:", error);
                    alert(lang === "en" ? "Operation failed, please try again" : lang === "zh-CN" ? "操作失败，请重试" : "操作失敗，請重試");
                  } finally {
                    setUpdating(false);
                  }
                }}
                disabled={updating}
                className="flex-1 btn-primary justify-center flex items-center gap-2 disabled:opacity-50"
              >
                {updating ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {lang === "en" ? "Save" : lang === "zh-CN" ? "保存" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full rounded-lg object-contain"
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      <PageCard>
        <div className="scrollable">
          {loading ? (
            <div className="text-center py-8 text-slate-500">{lang === "en" ? "Loading..." : lang === "zh-CN" ? "加载中..." : "載入中..."}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500">{lang === "en" ? "No orders found" : lang === "zh-CN" ? "暂无订单" : "暫無訂單"}</div>
          ) : (
            <>
            <div className="hidden sm:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("order_no")}</th>
                    <th className="hidden md:table-cell">{lang === "en" ? "Agent" : lang === "zh-CN" ? "代理商" : "代理商"}</th>
                    <th>{lang === "en" ? "Contact" : lang === "zh-CN" ? "联系人" : "聯絡人"}</th>
                    <th className="hidden lg:table-cell">{lang === "en" ? "Postal Code" : lang === "zh-CN" ? "邮编" : "郵遞區號"}</th>
                    <th className="hidden md:table-cell">{t("order_date")}</th>
                    <th>{t("amount")}</th>
                    <th>{t("status")}</th>
                    <th className="hidden xl:table-cell">{t("tracking_number")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const agent = agents.find((a) => a.id === o.agentId);
                    return (
                      <tr key={o.id}>
                        <td className="font-mono text-xs">{o.orderNo}</td>
                        <td className="hidden md:table-cell font-medium">
                          <div>{agent?.company || o.agentId}</div>
                          {agent?.email && <div className="text-xs text-slate-400">{agent.email}</div>}
                        </td>
                        <td className="font-medium">
                          <div className="truncate max-w-[140px]">{o.contactName || o.company || "N/A"}</div>
                          {o.phone && <div className="text-xs text-slate-400 truncate max-w-[140px]">{o.phone}</div>}
                        </td>
                        <td className="hidden xl:table-cell text-sm text-slate-500 font-mono">{o.postalCode || "—"}</td>
                        <td className="hidden md:table-cell text-slate-500 text-sm whitespace-nowrap">{new Date(o.date).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })}</td>
                        <td className="font-medium whitespace-nowrap">{formatCurrency(o.total, currency)}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td className="hidden xl:table-cell text-sm text-slate-500 font-mono truncate max-w-[140px]">{o.trackingNumber || "—"}</td>
                        <td>
                          <button onClick={() => setSelected(o.id)} className="text-emerald-500 hover:underline text-sm flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> <span>{t("view")}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden space-y-3">
              {filtered.map((o) => {
                const agent = agents.find((a) => a.id === o.agentId);
                return (
                  <div
                    key={o.id}
                    className="card p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-slate-500 mb-1">{o.orderNo}</div>
                        <div className="font-semibold text-sm truncate">{o.contactName || o.company || "N/A"}</div>
                        {o.phone && <div className="text-xs text-slate-400 truncate">{o.phone}</div>}
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <div className="text-slate-500 mb-0.5">{lang === "en" ? "Agent" : lang === "zh-CN" ? "代理商" : "代理商"}</div>
                        <div className="font-medium truncate">{agent?.company || o.agentId}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-0.5">{t("order_date")}</div>
                        <div className="font-medium whitespace-nowrap">{new Date(o.date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })}</div>
                      </div>
                      {o.postalCode && (
                        <div>
                          <div className="text-slate-500 mb-0.5">{lang === "en" ? "Postal Code" : lang === "zh-CN" ? "邮编" : "郵遞區號"}</div>
                          <div className="font-mono font-medium">{o.postalCode}</div>
                        </div>
                      )}
                      {o.trackingNumber && (
                        <div>
                          <div className="text-slate-500 mb-0.5">{t("tracking_number")}</div>
                          <div className="font-mono font-medium truncate">{o.trackingNumber}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">{t("amount")}</div>
                        <div className="font-bold text-emerald-500">{formatCurrency(o.total, currency)}</div>
                      </div>
                      <button onClick={() => setSelected(o.id)} className="btn-primary px-4 py-2 text-sm">
                        {t("view")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </PageCard>
    </AdminLayout>
  );
}
