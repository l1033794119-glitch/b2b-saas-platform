"use client";

import { useState, useEffect, useRef } from "react";
import { AgentLayout } from "@/components/Layout";
import { StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber, parseOrderDate } from "@/lib/utils";
import { useOrderQuery } from "@/hooks/useOrderQuery";
import { Eye, Package, MapPin, Phone, Mail, User, Truck, Check, Search, Filter, Calendar, ChevronDown, X, XCircle, Copy } from "lucide-react";

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
  trackingNumber?: string;
  trackingImage?: string;
  qrCode?: string;
  waybillImage?: string;
  notes?: string;
  shippingFee?: number;
  shippedAt?: string;
  cancelReason?: string | null;
  previousStatus?: string | null;
  cancelRequestedAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
}

interface FilterOption {
  label: string;
  value: string;
}

const statusConfig: Record<string, { labelEn: string; labelZhCN: string; labelZhTW: string; color: string }> = {
  pending_qrcode: { labelEn: "Submitted", labelZhCN: "已提交", labelZhTW: "已提交", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
  pending_delivery: { labelEn: "Pending Delivery", labelZhCN: "待投递", labelZhTW: "待投遞", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  pending_tracking: { labelEn: "Pending Tracking", labelZhCN: "待填写运单号", labelZhTW: "待填寫運單號", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400" },
  pending_cancellation: { labelEn: "Pending Cancellation", labelZhCN: "取消待审核", labelZhTW: "取消待審核", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" },
  shipped: { labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  completed: { labelEn: "Completed", labelZhCN: "已完成", labelZhTW: "已完成", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  cancelled: { labelEn: "Cancelled", labelZhCN: "已取消", labelZhTW: "已取消", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
};

export default function MyOrdersPage() {
  const { t, currency, lang, user, apiFetch } = useApp();

  // ---- 分页/搜索（逐页加载，不再一次拉几千条） ----
  const oq = useOrderQuery({ pageSize: 20, scope: "agent" });
  const {
    data, total, page, totalPages, hasPrev, hasNext, loading, searching, pageStats,
    draftQ, setDraftQ, draftStatus, setDraftStatus, draftFrom, setDraftFrom, draftTo, setDraftTo,
    submitSearch, quickSetStatus, quickSetDate, quickClear,
    setPage, goPrev, goNext, updateOrderInCache, fetchAllForExport,
    submitted,
  } = oq;

  // 兼容旧变量名
  const orders = data as any[];
  const searchKeyword = draftQ;
  const statusFilter = draftStatus;

  const [selected, setSelected] = useState<Order | null>(null);

  // 日期快捷选项（今日/本周/自定义...）选中态（UI 专用，实际筛选已转化为 from/to 传给 hook 的 submitted）
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const _pageSizeOld = 10;
  void _pageSizeOld;

  // ---- 统计卡片：当前筛选条件下的全量（用 hook 的 submitted 作为 key，保证翻页不重拉）----
  const [statsOrders, setStatsOrders] = useState<any[]>([]);
  const statsLoadKey = JSON.stringify(submitted || {});

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetchAllForExport().then((all) => { if (alive) setStatsOrders(all); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsLoadKey, user?.id]);

  // ---- 产品图缓存（一次性拉） ----
  useEffect(() => {
    if (!user?.id) return;
    fetchProductImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 订单 items.image 是历史快照，产品图更新/删除后会 404，
  // 所以优先用产品表最新缩略图缓存（按 productId 索引）。
  const productImgCacheRef = useRef<Map<string, string>>(new Map());

  const fetchProductImages = async () => {
    if (!user?.id) return;
    try {
      const res = await apiFetch("/api/products", { cache: "no-store" } as any);
      if (!res.ok) return;
      const list = await res.json().catch(() => []);
      const cache = new Map<string, string>();
      if (Array.isArray(list)) {
        for (const p of list) {
          const id = p?.id ? String(p.id) : null;
          let first = "";
          if (Array.isArray(p?.images) && typeof p.images[0] === "string") {
            first = p.images[0];
          } else if (typeof p?.images === "string") {
            try {
              const parsed = JSON.parse(p.images);
              if (Array.isArray(parsed) && typeof parsed[0] === "string") first = parsed[0];
            } catch { /* noop */ }
          }
          if (id && first) cache.set(id, first);
        }
      }
      productImgCacheRef.current = cache;
    } catch (err) {
      console.warn("AgentOrders: 拉产品图缓存失败", err);
    }
  };

  const getItemImage = (item: OrderItem): string | undefined => {
    // 🚩 代理端订单详情的产品图，也只取产品管理中的最新缩略图（按 productId 匹配）。
    // 不再回落到订单创建时写死的 items.image。
    if (item.productId) {
      return productImgCacheRef.current.get(String(item.productId));
    }
    return undefined;
  };

  // 获取状态筛选选项
  const getStatusFilterOptions = (): FilterOption[] => {
    return [
      { label: lang === "en" ? "All Status" : lang === "zh-CN" ? "全部状态" : "全部狀態", value: "all" },
      { label: lang === "en" ? "Submitted" : lang === "zh-CN" ? "已提交" : "已提交", value: "pending_qrcode" },
      { label: lang === "en" ? "Pending Delivery" : lang === "zh-CN" ? "待投递" : "待投遞", value: "pending_delivery" },
      { label: lang === "en" ? "Pending Tracking" : lang === "zh-CN" ? "待填写运单号" : "待填寫運單號", value: "pending_tracking" },
      { label: lang === "en" ? "Pending Cancellation" : lang === "zh-CN" ? "取消待审核" : "取消待審核", value: "pending_cancellation" },
      { label: lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨", value: "shipped" },
      { label: lang === "en" ? "Completed" : lang === "zh-CN" ? "已完成" : "已完成", value: "completed" },
      { label: lang === "en" ? "Cancelled" : lang === "zh-CN" ? "已取消" : "已取消", value: "cancelled" },
    ];
  };

  // 获取日期筛选选项
  const getDateFilterOptions = (): FilterOption[] => {
    return [
      { label: lang === "en" ? "All Time" : lang === "zh-CN" ? "全部时间" : "全部時間", value: "all" },
      { label: lang === "en" ? "Today" : lang === "zh-CN" ? "今天" : "今天", value: "today" },
      { label: lang === "en" ? "This Week" : lang === "zh-CN" ? "本周" : "本週", value: "this_week" },
      { label: lang === "en" ? "This Month" : lang === "zh-CN" ? "本月" : "本月", value: "this_month" },
      { label: lang === "en" ? "Last Month" : lang === "zh-CN" ? "上月" : "上月", value: "last_month" },
      { label: lang === "en" ? "Last 7 Days" : lang === "zh-CN" ? "近七天" : "近七天", value: "last_7_days" },
      { label: lang === "en" ? "Custom" : lang === "zh-CN" ? "自定义" : "自訂", value: "custom" },
    ];
  };

  // 根据筛选条件获取日期范围
  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (dateFilter) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "this_week":
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "this_month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last_month":
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last_7_days":
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          start.setTime(parseOrderDate(customDateRange.start + " 00:00:00").getTime());
          start.setHours(0, 0, 0, 0);
          end.setTime(parseOrderDate(customDateRange.end + " 23:59:59").getTime());
          end.setHours(23, 59, 59, 999);
        }
        break;
      case "all":
      default:
        return null;
    }
    return { start, end };
  };

  // 筛选订单
  const getFilteredOrders = () => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    let filtered = [...safeOrders];

    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // 日期筛选
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter((o) => {
        const orderDate = parseOrderDate(o.date);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    }

    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter((o) =>
        (o.orderNo || "").toLowerCase().includes(keyword) ||
        o.contactName?.toLowerCase().includes(keyword) ||
        o.phone?.toLowerCase().includes(keyword) ||
        o.email?.toLowerCase().includes(keyword) ||
        o.trackingNumber?.toLowerCase().includes(keyword) ||
        o.postalCode?.toLowerCase().includes(keyword) ||
        o.shippingAddress?.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  };

  // 清除所有筛选
  const clearFilters = () => {
    setDateFilter("all");
    setCustomDateRange({ start: "", end: "" });
    quickClear();
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  // 模态框打开时锁定背景滚动
  useEffect(() => {
    if (selected && typeof window !== "undefined") {
      const origBody = document.body.style.overflow;
      const origHtml = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origBody;
        document.documentElement.style.overflow = origHtml;
      };
    }
  }, [selected]);

  const canCancelOrder = (status: string) => {
    return ["pending_qrcode", "pending_delivery", "pending_tracking"].includes(status);
  };

  const handleCancelOrder = async () => {
    if (!selected || !cancelReason.trim()) return;

    setCancelling(true);
    try {
      const res = await apiFetch(`/api/orders/${selected.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: cancelReason.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        updateOrderInCache(selected.id, updated);
        // 同时更新统计数据（把取消状态同步进去）
        setStatsOrders((prev) => (Array.isArray(prev) ? prev.map((o: any) => (o.id === selected.id ? { ...o, ...updated } : o)) : prev));
        setSelected(updated);
        setShowCancelModal(false);
        setCancelReason("");
      } else {
        const err = await res.json().catch(() => ({ error: "取消失败" }));
        alert(err.error || "取消失败");
      }
    } catch (error) {
      console.error("Cancel order error:", error);
      alert("取消失败，请重试");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status] || { labelEn: status, labelZhCN: status, labelZhTW: status, color: "bg-slate-100 text-slate-700" };
    return lang === "en" ? config.labelEn : lang === "zh-CN" ? config.labelZhCN : config.labelZhTW;
  };

  // 数据：hook 已按 agentId + 服务端搜索/状态/日期过滤，返回 data 就是当前页；total 是总条数。
  const safeOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = safeOrders; // 命名兼容旧模板引用

  // 统计卡片基于 statsOrders（全量结果），保证数据正确
  const statsSafe = Array.isArray(statsOrders) ? statsOrders : [];
  const getTotalShippingFees = () => statsSafe.filter((o) => o.shippingFee && o.shippingFee > 0).reduce((sum, o) => sum + (o.shippingFee || 0), 0);
  const totalShippingFees = getTotalShippingFees();
  const totalCount = statsSafe.length;
  const totalAmount = statsSafe.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingCount = statsSafe.filter((o) => ["pending_qrcode", "pending_delivery", "pending_tracking"].includes(o.status)).length;

  const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all" || searchKeyword.trim() !== "";
  const statusOptions = getStatusFilterOptions();
  const dateOptions = getDateFilterOptions();

  // 搜索：回车触发
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitSearch();
    }
  };

  // 旧版本地"重置到第一页"不再需要（分页由 hook 管理，搜索会 setPage(1)）
  void page;

  return (
    <AgentLayout title={t("my_orders")} subtitle={`${formatNumber(total)} ${lang === "en" ? "orders" : lang === "zh-CN" ? "个订单" : "個訂單"}`}>
      {/* 统计信息（基于当前筛选下的全量订单） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Total Orders" : lang === "zh-CN" ? "订单总数" : "訂單總數"}</div>
          <div className="text-xl font-bold">{formatNumber(totalCount)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Total Amount" : lang === "zh-CN" ? "订单总额" : "訂單總額"}</div>
          <div className="text-xl font-bold text-indigo-600">{formatCurrency(totalAmount, currency)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Shipping Fees" : lang === "zh-CN" ? "运费总额" : "運費總額"}</div>
          <div className="text-xl font-bold text-orange-600">{formatCurrency(totalShippingFees, currency)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Pending" : lang === "zh-CN" ? "待处理" : "待處理"}</div>
          <div className="text-xl font-bold text-amber-600">{formatNumber(pendingCount)}</div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card p-4 mb-6" style={{ overflow: "visible", position: "relative", zIndex: 20 }}>
        <div className="flex flex-wrap items-end gap-3">
          {/* 搜索框 + 搜索按钮（点击按钮 / 回车才触发） */}
          <div className="flex-1 min-w-[260px] flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={lang === "en" ? "Search orders..." : lang === "zh-CN" ? "搜索订单号/姓名/电话/运单号/邮编..." : "搜索訂單號/姓名/電話/運單號/郵遞區號..."}
                value={searchKeyword}
                onChange={(e) => setDraftQ(e.target.value)}
                onKeyDown={onSearchKeyDown}
                className="input !pl-11 w-full"
              />
              {searchKeyword && (
                <button
                  onClick={() => setDraftQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => submitSearch()}
              disabled={searching}
              className="btn-primary px-3 sm:px-4 py-2 text-sm flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
              type="button"
            >
              <Search className="w-4 h-4" />
              {searching
                ? (lang === "en" ? "Searching..." : lang === "zh-CN" ? "搜索中..." : "搜尋中...")
                : (lang === "en" ? "Search" : lang === "zh-CN" ? "搜索" : "搜尋")}
            </button>
          </div>

          {/* 状态筛选 */}
          <div className="relative" style={{ zIndex: 40 }}>
            <button
              onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowDateDropdown(false); }}
              className={`btn-ghost flex items-center gap-2 ${statusFilter !== "all" ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
              type="button"
            >
              <Filter className="w-4 h-4" />
              {statusOptions.find((o) => o.value === statusFilter)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg min-w-[160px]" style={{ zIndex: 100 }}>
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { quickSetStatus(option.value); setShowStatusDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                      statusFilter === option.value ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""
                    }`}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 日期筛选 */}
          <div className="relative" style={{ zIndex: 40 }}>
            <button
              onClick={() => { setShowDateDropdown(!showDateDropdown); setShowStatusDropdown(false); }}
              className={`btn-ghost flex items-center gap-2 ${dateFilter !== "all" ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
              type="button"
            >
              <Calendar className="w-4 h-4" />
              {dateOptions.find((o) => o.value === dateFilter)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showDateDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg min-w-[160px]" style={{ zIndex: 100 }}>
                {dateOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateFilter(option.value);
                      setShowDateDropdown(false);
                      // 除 custom 之外：选了就立即生效（转化成 from/to）
                      if (option.value !== "custom") {
                        const rng = (() => {
                          const now = new Date();
                          const s = new Date(); const e = new Date();
                          switch (option.value) {
                            case "today":
                              s.setHours(0, 0, 0, 0); e.setHours(23, 59, 59, 999); break;
                            case "this_week": {
                              const d = s.getDay(); s.setDate(s.getDate() - d); s.setHours(0, 0, 0, 0); e.setHours(23, 59, 59, 999); break;
                            }
                            case "this_month":
                              s.setDate(1); s.setHours(0, 0, 0, 0); e.setHours(23, 59, 59, 999); break;
                            case "last_month":
                              s.setMonth(s.getMonth() - 1); s.setDate(1); s.setHours(0, 0, 0, 0);
                              e.setDate(0); e.setHours(23, 59, 59, 999); break;
                            case "last_7_days":
                              s.setDate(s.getDate() - 7); s.setHours(0, 0, 0, 0); e.setHours(23, 59, 59, 999); break;
                            case "all":
                            default:
                              return { from: "", to: "" };
                          }
                          const pad = (n: number) => String(n).padStart(2, "0");
                          const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                          return { from: fmt(s), to: fmt(e) };
                        })();
                        quickSetDate(rng.from, rng.to);
                        setCustomDateRange({ start: rng.from, end: rng.to });
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                      dateFilter === option.value ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""
                    }`}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 自定义日期选择 */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => {
                  const ns = e.target.value;
                  setCustomDateRange({ ...customDateRange, start: ns });
                  // 起止都填了才立即应用
                  if (ns && customDateRange.end) quickSetDate(ns, customDateRange.end);
                }}
                className="input py-1.5 px-3 text-sm"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => {
                  const ne = e.target.value;
                  setCustomDateRange({ ...customDateRange, end: ne });
                  if (customDateRange.start && ne) quickSetDate(customDateRange.start, ne);
                }}
                className="input py-1.5 px-3 text-sm"
              />
            </div>
          )}

          {/* 清除筛选 */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn-ghost text-sm flex items-center gap-1 text-rose-500 hover:text-rose-700"
              type="button"
            >
              <X className="w-4 h-4" />
              {lang === "en" ? "Clear" : lang === "zh-CN" ? "清除" : "清除"}
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="card p-0 overflow-hidden">
        <div className="scrollable">
              {loading ? (
                <div className="text-center py-12 text-slate-500">{lang === "en" ? "Loading..." : lang === "zh-CN" ? "加载中..." : "載入中..."}</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="font-medium">{lang === "en" ? "No orders found" : lang === "zh-CN" ? "暂无订单" : "暫無訂單"}</div>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-sm text-indigo-600 mt-2">
                      {lang === "en" ? "Clear filters" : lang === "zh-CN" ? "清除筛选" : "清除篩選"}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {(() => {
                    const pageItems = filteredOrders;
                    const currentPage = page;
                    const { startIdx, endIdx } = pageStats;
                    return (
                      <>
                <div className="hidden sm:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t("order_no")}</th>
                        <th>{lang === "en" ? "Products" : lang === "zh-CN" ? "商品" : "商品"}</th>
                        <th>{lang === "en" ? "Customer" : lang === "zh-CN" ? "客户" : "客戶"}</th>
                        <th>{t("amount")}</th>
                        <th>{lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费" : "運費"}</th>
                        <th>{t("status")}</th>
                        <th>{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="font-mono text-xs">{o.orderNo}</td>
                          <td className="text-sm max-w-[150px]">
                            <div className="truncate">{o.items.map((i: any) => i.name).join(", ")}</div>
                            <div className="text-xs text-slate-400">{o.items.length} {lang === "en" ? "items" : lang === "zh-CN" ? "件" : "件"}</div>
                          </td>
                          <td className="text-sm">
                            <div>{o.contactName || "—"}</div>
                            <div className="text-xs text-slate-400">{o.phone || "—"}</div>
                          </td>
                          <td className="font-medium">{formatCurrency(o.total, currency)}</td>
                          <td className={o.shippingFee ? "text-orange-600 font-medium" : "text-slate-400"}>
                            {o.shippingFee ? formatCurrency(o.shippingFee, currency) : "—"}
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[o.status]?.color || "bg-slate-100 text-slate-700"}`}>
                              {getStatusLabel(o.status)}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => setSelected(o)} className="text-emerald-500 hover:underline text-sm flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> <span>{t("view")}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden space-y-3">
                  {pageItems.map((o: any) => (
                    <div
                      key={o.id}
                      className="card p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-slate-500 mb-1">{o.orderNo}</div>
                          <div className="font-semibold text-sm truncate">{o.contactName || "—"}</div>
                          {o.phone && <div className="text-xs text-slate-400 truncate">{o.phone}</div>}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusConfig[o.status]?.color || "bg-slate-100 text-slate-700"}`}>
                          {getStatusLabel(o.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div>
                          <div className="text-slate-500 mb-0.5">{lang === "en" ? "Products" : lang === "zh-CN" ? "商品" : "商品"}</div>
                          <div className="font-medium truncate">{o.items.length} {lang === "en" ? "items" : lang === "zh-CN" ? "件" : "件"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">{t("order_date")}</div>
                          <div className="font-medium whitespace-nowrap">{new Date(o.date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-0.5">{t("amount")}</div>
                          <div className="font-medium">{formatCurrency(o.total, currency)}</div>
                        </div>
                        {o.shippingFee && (
                          <div>
                            <div className="text-slate-500 mb-0.5">{lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费" : "運費"}</div>
                            <div className="font-medium text-orange-600">{formatCurrency(o.shippingFee, currency)}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="text-xs text-slate-500">
                          {new Date(o.date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" })}
                        </div>
                        <button onClick={() => setSelected(o)} className="btn-primary px-4 py-2 text-sm">
                          {t("view")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <div className="text-xs text-slate-500">
                    {lang === "en" 
                      ? `${startIdx}-${endIdx} of ${total}`
                      : lang === "zh-CN" 
                        ? `${startIdx}-${endIdx} 条 / 共 ${total} 条`
                        : `${startIdx}-${endIdx} 條 / 共 ${total} 條`
                    }
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goPrev}
                      disabled={!hasPrev}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm disabled:opacity-30 hover:bg-white/5 transition-colors"
                    >
                      ‹
                    </button>
                    <div className="text-sm font-medium min-w-[80px] text-center">
                      {currentPage} / {totalPages}
                    </div>
                    <button
                      onClick={goNext}
                      disabled={!hasNext}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm disabled:opacity-30 hover:bg-white/5 transition-colors"
                    >
                      ›
                    </button>
                  </div>
                </div>
                      </>
                    );
                  })()}
                </>
              )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div
          className="modal-overlay fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelected(null)}
          onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
          style={{ touchAction: "none" }}
        >
          <div
            className="modal-card card p-4 sm:p-6 w-full max-w-full sm:max-w-4xl max-h-[90dvh] rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { e.stopPropagation(); }}
            style={{ overflowY: "auto", touchAction: "auto", WebkitOverflowScrolling: "touch" }}
          >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-500 font-mono">{selected.orderNo}</div>
                  <div className="text-sm text-slate-500">{new Date(selected.date).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Shanghai" })}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              {/* Status Timeline */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-xs text-slate-500 mb-3">{lang === "en" ? "Order Status" : lang === "zh-CN" ? "订单状态" : "訂單狀態"}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 已提交 */}
                  <div className={`w-3 h-3 rounded-full ${["pending_qrcode", "pending_delivery", "pending_tracking", "shipped", "completed"].includes(selected.status) ? "bg-orange-500" : "bg-slate-300"}`} />
                  <span className="text-xs whitespace-nowrap">{lang === "en" ? "Submitted" : lang === "zh-CN" ? "已提交" : "已提交"}</span>
                  <div className={`flex-1 h-0.5 min-w-4 ${["pending_delivery", "pending_tracking", "shipped", "completed"].includes(selected.status) ? "bg-emerald-500" : "bg-slate-200"}`} />
                  
                  {/* 待投递 */}
                  <div className={`w-3 h-3 rounded-full ${["pending_delivery", "pending_tracking", "shipped", "completed"].includes(selected.status) ? "bg-amber-500" : "bg-slate-300"}`} />
                  <span className="text-xs whitespace-nowrap">{lang === "en" ? "Delivery" : lang === "zh-CN" ? "待投递" : "待投遞"}</span>
                  <div className={`flex-1 h-0.5 min-w-4 ${["pending_tracking", "shipped", "completed"].includes(selected.status) ? "bg-emerald-500" : "bg-slate-200"}`} />
                  
                  {/* 待填写运单号 */}
                  <div className={`w-3 h-3 rounded-full ${["pending_tracking", "shipped", "completed"].includes(selected.status) ? "bg-cyan-500" : "bg-slate-300"}`} />
                  <span className="text-xs whitespace-nowrap">{lang === "en" ? "Tracking" : lang === "zh-CN" ? "待运单" : "待運單"}</span>
                  <div className={`flex-1 h-0.5 min-w-4 ${["shipped", "completed"].includes(selected.status) ? "bg-emerald-500" : "bg-slate-200"}`} />
                  
                  {/* 已发货 */}
                  <div className={`w-3 h-3 rounded-full ${["shipped", "completed"].includes(selected.status) ? "bg-purple-500" : "bg-slate-300"}`} />
                  <span className="text-xs whitespace-nowrap">{lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨"}</span>
                  <div className={`flex-1 h-0.5 min-w-4 ${selected.status === "completed" ? "bg-emerald-500" : "bg-slate-200"}`} />
                  
                  {/* 已完成 */}
                  <div className={`w-3 h-3 rounded-full ${selected.status === "completed" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-xs whitespace-nowrap">{lang === "en" ? "Completed" : lang === "zh-CN" ? "已完成" : "已完成"}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[selected.status]?.color || "bg-slate-100 text-slate-700"}`}>
                  {getStatusLabel(selected.status)}
                </span>
                {selected.trackingNumber && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    {selected.trackingNumber}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Shipping Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500">{lang === "en" ? "Shipping Address" : lang === "zh-CN" ? "收货地址" : "收貨地址"}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm flex-1">{selected.shippingAddress}</div>
                    {selected.shippingAddress && (
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(selected.shippingAddress!); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '28px', padding: '4px', color: '#64748b', background: 'transparent', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = 'transparent'; }} title={lang === "en" ? "Copy" : lang === "zh-CN" ? "复制" : "複製"}>
                        <Copy style={{ width: '16px', height: '16px' }} />
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                    {selected.postalCode && (
                      <span className="flex items-center gap-1">
                        <span>{selected.postalCode}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(selected.postalCode!); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', padding: '2px', color: '#64748b', background: 'transparent', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#334155'; }} title={lang === "en" ? "Copy" : lang === "zh-CN" ? "复制" : "複製"}>
                          <Copy style={{ width: '12px', height: '12px' }} />
                        </button>
                      </span>
                    )}
                    {selected.postalCode && selected.country && <span>,</span>}
                    {selected.country && <span>{selected.country}</span>}
                  </div>

                  {/* 客户联系信息 */}
                  <div className="mt-4 space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    {selected.contactName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm flex-1">{selected.contactName}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(selected.contactName!); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', padding: '4px', color: '#64748b', background: 'transparent', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = 'transparent'; }} title={lang === "en" ? "Copy" : lang === "zh-CN" ? "复制" : "複製"}>
                          <Copy style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    )}
                    {selected.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm flex-1">{selected.phone}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(selected.phone!); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', padding: '4px', color: '#64748b', background: 'transparent', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = 'transparent'; }} title={lang === "en" ? "Copy" : lang === "zh-CN" ? "复制" : "複製"}>
                          <Copy style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    )}
                    {selected.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm flex-1 truncate">{selected.email}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(selected.email!); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', padding: '4px', color: '#64748b', background: 'transparent', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }} onMouseEnter={(e) => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = 'transparent'; }} title={lang === "en" ? "Copy" : lang === "zh-CN" ? "复制" : "複製"}>
                          <Copy style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Waybill Image Display */}
                  {selected.waybillImage && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-500 mb-2">{lang === "en" ? "Waybill Image" : lang === "zh-CN" ? "快递面单" : "快遞面單"}</div>
                      <img src={selected.waybillImage} alt="Waybill" className="max-w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                    </div>
                  )}

                  {/* Tracking Number */}
                  {selected.trackingNumber && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Tracking Number" : lang === "zh-CN" ? "运单号" : "運單號"}</div>
                      <div className="text-sm font-mono font-medium">{selected.trackingNumber}</div>
                    </div>
                  )}

                  {/* Tracking Image - Show after shipped */}
                  {selected.trackingImage && (selected.status === "shipped" || selected.status === "completed") && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-500 mb-2">{lang === "en" ? "Tracking Image" : lang === "zh-CN" ? "运单图片" : "運單圖片"}</div>
                      <img src={selected.trackingImage} alt="Tracking" className="max-w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500">{lang === "en" ? "Items" : lang === "zh-CN" ? "商品" : "商品"} ({selected.items.length})</span>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selected.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                          {(() => {
                            const src = getItemImage(item);
                            return src ? (
                              <img
                                src={src}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const el = e.currentTarget;
                                  if (el.parentElement) {
                                    el.style.display = "none";
                                    const fallback = document.createElement("div");
                                    fallback.className = "w-full h-full flex items-center justify-center text-xl";
                                    fallback.textContent = "📦";
                                    if (!el.parentElement.querySelector(":scope > div")) {
                                      el.parentElement.appendChild(fallback);
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.name}</div>
                          <div className="text-xs text-slate-500">SKU: {item.sku} × {item.quantity}</div>
                        </div>
                        <div className="text-sm font-medium">{formatCurrency(item.price * item.quantity, currency)}</div>
                      </div>
                    ))}
                  </div>

                  {/* 运费显示 */}
                  {selected.shippingFee && selected.shippingFee > 0 && (
                    <div className="flex items-center justify-between pt-2 mt-2 text-sm">
                      <span className="text-slate-500">
                        {lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费" : "運費"}
                        {selected.shippedAt && (
                          <span className="ml-2 text-xs text-slate-400">@ {new Date(selected.shippedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })}</span>
                        )}
                      </span>
                      <span className="font-medium text-orange-600">{formatCurrency(selected.shippingFee, currency)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-semibold">{lang === "en" ? "Total" : lang === "zh-CN" ? "总计" : "總計"}</span>
                    <span className="text-lg font-bold text-indigo-600">{formatCurrency(selected.total + (selected.shippingFee || 0), currency)}</span>
                  </div>

                  {/* Cancel Reason Display */}
                  {selected.cancelReason && (
                    <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                      <div className="text-xs text-rose-600 dark:text-rose-400 mb-1">
                        {selected.status === "cancelled"
                          ? (lang === "en" ? "Cancel Reason" : lang === "zh-CN" ? "取消原因" : "取消原因")
                          : (lang === "en" ? "Pending Cancel Reason" : lang === "zh-CN" ? "申请取消原因" : "申請取消原因")}
                      </div>
                      <div className="text-sm text-rose-700 dark:text-rose-300">{selected.cancelReason}</div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {canCancelOrder(selected.status) && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => { setShowCancelModal(true); setCancelReason(""); }}
                        className="w-full btn-ghost text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/30 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        {lang === "en" ? "Cancel Order" : lang === "zh-CN" ? "取消订单" : "取消訂單"}
                      </button>
                    </div>
                  )}

                  {selected.status === "shipped" && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => {
                          if (confirm(lang === "en" ? "Are you sure you want to mark this order as completed?" : lang === "zh-CN" ? "确定要完成此订单吗？" : "確定要完成此訂單嗎？")) {
                            apiFetch(`/api/orders/${selected.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "completed" }),
                            }).then((res) => {
                              if (res.ok) {
                                res.json().then((updated: any) => {
                                  updateOrderInCache(selected.id, { status: "completed", ...updated });
                                  setStatsOrders((prev: any) => (Array.isArray(prev) ? prev.map((o: any) => (o.id === selected.id ? { ...o, status: "completed", ...updated } : o)) : prev));
                                }).catch(() => {
                                  updateOrderInCache(selected.id, { status: "completed" });
                                  setStatsOrders((prev: any) => (Array.isArray(prev) ? prev.map((o: any) => (o.id === selected.id ? { ...o, status: "completed" } : o)) : prev));
                                });
                                setSelected({ ...selected, status: "completed" });
                              }
                            });
                          }
                        }}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {lang === "en" ? "Complete Order" : lang === "zh-CN" ? "完成订单" : "完成訂單"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Cancel Order Modal */}
      {showCancelModal && selected && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="modal-card bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-rose-600">
                {lang === "en" ? "Cancel Order" : lang === "zh-CN" ? "取消订单" : "取消訂單"}
              </h2>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {lang === "en" ? "Order: " : lang === "zh-CN" ? "订单号：" : "訂單號："}
                <span className="font-mono font-medium">{selected.orderNo}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {lang === "en" ? "Cancel Reason *" : lang === "zh-CN" ? "取消原因 *" : "取消原因 *"}
                </label>
                <textarea
                  className="input w-full min-h-[100px] resize-y"
                  placeholder={lang === "en" ? "Please enter the reason for cancellation" : lang === "zh-CN" ? "请输入取消原因" : "請輸入取消原因"}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {lang === "en"
                    ? "⚠️ After submitting the cancellation request, it needs administrator approval. The order amount will be refunded to your credit limit after approval."
                    : lang === "zh-CN"
                    ? "⚠️ 提交取消申请后需管理员审核，审核通过后订单金额将退还到您的信用额度。"
                    : "⚠️ 提交取消申請後需管理員審核，審核通過後訂單金額將退還到您的信用額度。"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                disabled={cancelling}
                className="flex-1 btn-ghost py-2.5"
              >
                {lang === "en" ? "Cancel" : "取消"}
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={!cancelReason.trim() || cancelling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {lang === "en" ? "Submit Request" : lang === "zh-CN" ? "提交申请" : "提交申請"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AgentLayout>
  );
}
