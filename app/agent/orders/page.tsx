"use client";

import { useState, useEffect } from "react";
import { AgentLayout } from "@/components/Layout";
import { StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Eye, Package, MapPin, Phone, Mail, User, Truck, Check, Search, Filter, Calendar, ChevronDown, X } from "lucide-react";

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
  notes?: string;
  shippingFee?: number;
  shippedAt?: string;
}

interface FilterOption {
  label: string;
  value: string;
}

const statusConfig: Record<string, { labelEn: string; labelZhCN: string; labelZhTW: string; color: string }> = {
  pending: { labelEn: "Unshipped", labelZhCN: "未发货", labelZhTW: "未發貨", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  shipped: { labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  completed: { labelEn: "Completed", labelZhCN: "已完成", labelZhTW: "已完成", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  cancelled: { labelEn: "Cancelled", labelZhCN: "已取消", labelZhTW: "已取消", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400" },
};

export default function MyOrdersPage() {
  const { t, currency, lang, user } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // 获取状态筛选选项
  const getStatusFilterOptions = (): FilterOption[] => {
    return [
      { label: lang === "en" ? "All Status" : lang === "zh-CN" ? "全部状态" : "全部狀態", value: "all" },
      { label: lang === "en" ? "Unshipped" : lang === "zh-CN" ? "未发货" : "未發貨", value: "pending" },
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
          start.setTime(new Date(customDateRange.start).getTime());
          start.setHours(0, 0, 0, 0);
          end.setTime(new Date(customDateRange.end).getTime());
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
    let filtered = [...orders];

    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // 日期筛选
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter((o) => {
        const orderDate = new Date(o.date);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    }

    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter((o) =>
        o.orderNo.toLowerCase().includes(keyword) ||
        o.contactName?.toLowerCase().includes(keyword) ||
        o.phone?.includes(keyword) ||
        o.trackingNumber?.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  };

  // 清除所有筛选
  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    setCustomDateRange({ start: "", end: "" });
    setSearchKeyword("");
  };

  // 计算运费总计
  const getTotalShippingFees = () => {
    return getFilteredOrders()
      .filter((o) => o.shippingFee && o.shippingFee > 0)
      .reduce((sum, o) => sum + (o.shippingFee || 0), 0);
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/orders?agentId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status] || { labelEn: status, labelZhCN: status, labelZhTW: status, color: "bg-slate-100 text-slate-700" };
    return lang === "en" ? config.labelEn : lang === "zh-CN" ? config.labelZhCN : config.labelZhTW;
  };

  const filteredOrders = getFilteredOrders();
  const totalShippingFees = getTotalShippingFees();
  const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all" || searchKeyword.trim() !== "";
  const statusOptions = getStatusFilterOptions();
  const dateOptions = getDateFilterOptions();

  return (
    <AgentLayout title={t("my_orders")} subtitle={`${formatNumber(filteredOrders.length)} ${lang === "en" ? "orders" : lang === "zh-CN" ? "个订单" : "個訂單"}`}>
      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Total Orders" : lang === "zh-CN" ? "订单总数" : "訂單總數"}</div>
          <div className="text-xl font-bold">{formatNumber(filteredOrders.length)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Total Amount" : lang === "zh-CN" ? "订单总额" : "訂單總額"}</div>
          <div className="text-xl font-bold text-indigo-600">{formatCurrency(filteredOrders.reduce((sum, o) => sum + o.total, 0), currency)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Shipping Fees" : lang === "zh-CN" ? "运费总额" : "運費總額"}</div>
          <div className="text-xl font-bold text-orange-600">{formatCurrency(totalShippingFees, currency)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">{lang === "en" ? "Pending" : lang === "zh-CN" ? "待处理" : "待處理"}</div>
          <div className="text-xl font-bold text-amber-600">{formatNumber(filteredOrders.filter((o) => o.status === "pending").length)}</div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={lang === "en" ? "Search orders..." : lang === "zh-CN" ? "搜索订单号/姓名/电话/运单号..." : "搜索訂單號/姓名/電話/運單號..."}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input pl-10 w-full"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 状态筛选 */}
          <div className="relative">
            <button
              onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowDateDropdown(false); }}
              className={`btn-ghost flex items-center gap-2 ${statusFilter !== "all" ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
            >
              <Filter className="w-4 h-4" />
              {statusOptions.find((o) => o.value === statusFilter)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-10 min-w-[160px]">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setStatusFilter(option.value); setShowStatusDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                      statusFilter === option.value ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 日期筛选 */}
          <div className="relative">
            <button
              onClick={() => { setShowDateDropdown(!showDateDropdown); setShowStatusDropdown(false); }}
              className={`btn-ghost flex items-center gap-2 ${dateFilter !== "all" ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
            >
              <Calendar className="w-4 h-4" />
              {dateOptions.find((o) => o.value === dateFilter)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showDateDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-10 min-w-[160px]">
                {dateOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setDateFilter(option.value); setShowDateDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                      dateFilter === option.value ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""
                    }`}
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
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="input py-1.5 px-3 text-sm"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="input py-1.5 px-3 text-sm"
              />
            </div>
          )}

          {/* 清除筛选 */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn-ghost text-sm flex items-center gap-1 text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
              {lang === "en" ? "Clear" : lang === "zh-CN" ? "清除" : "清除"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className={`${selected ? "xl:col-span-1" : "xl:col-span-3"}`}>
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
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("order_no")}</th>
                      <th>{lang === "en" ? "Products" : lang === "zh-CN" ? "商品" : "商品"}</th>
                      <th>{lang === "en" ? "Customer" : lang === "zh-CN" ? "客户" : "客戶"}</th>
                      <th>{t("amount")}</th>
                      <th>{lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费" : "運費"}</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => setSelected(o)}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected?.id === o.id ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                      >
                        <td className="font-mono text-xs">{o.orderNo}</td>
                        <td className="text-sm max-w-[150px]">
                          <div className="truncate">{o.items.map((i) => i.name).join(", ")}</div>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Order Detail */}
        {selected && (
          <div className="xl:col-span-2">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-500 font-mono">{selected.orderNo}</div>
                  <div className="text-sm text-slate-500">{new Date(selected.date).toLocaleString()}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              {/* Status Timeline */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-xs text-slate-500 mb-3">{lang === "en" ? "Order Status" : lang === "zh-CN" ? "订单状态" : "訂單狀態"}</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${selected.status === "pending" || selected.status === "shipped" || selected.status === "completed" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-xs">{lang === "en" ? "Submitted" : lang === "zh-CN" ? "已提交" : "已提交"}</span>
                  <div className={`flex-1 h-0.5 ${selected.status === "shipped" || selected.status === "completed" ? "bg-emerald-500" : "bg-slate-200"}`} />
                  <div className={`w-3 h-3 rounded-full ${selected.status === "shipped" || selected.status === "completed" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-xs">{lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨"}</span>
                  <div className={`flex-1 h-0.5 ${selected.status === "completed" ? "bg-emerald-500" : "bg-slate-200"}`} />
                  <div className={`w-3 h-3 rounded-full ${selected.status === "completed" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-xs">{lang === "en" ? "Completed" : lang === "zh-CN" ? "已完成" : "已完成"}</span>
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
                  <div className="text-sm mb-2">{selected.shippingAddress}</div>
                  <div className="text-sm text-slate-500">
                    {selected.postalCode && <span>{selected.postalCode}</span>}
                    {selected.postalCode && selected.country && <span>, </span>}
                    {selected.country && <span>{selected.country}</span>}
                  </div>

                  {/* Tracking Image */}
                  {selected.trackingImage && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-500 mb-2">{lang === "en" ? "Tracking Document" : lang === "zh-CN" ? "运单文件" : "運單文件"}</div>
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
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                          )}
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
                          <span className="ml-2 text-xs text-slate-400">@ {new Date(selected.shippedAt).toLocaleDateString()}</span>
                        )}
                      </span>
                      <span className="font-medium text-orange-600">{formatCurrency(selected.shippingFee, currency)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-semibold">{lang === "en" ? "Total" : lang === "zh-CN" ? "总计" : "總計"}</span>
                    <span className="text-lg font-bold text-indigo-600">{formatCurrency(selected.total, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
