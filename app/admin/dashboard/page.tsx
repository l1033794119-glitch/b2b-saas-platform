"use client";

import { AdminLayout } from "@/components/Layout";
import { StatCard, PageCard, StatusBadge, Badge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import {
  ShoppingCart, DollarSign, Package, Users, TrendingUp, AlertTriangle,
  ArrowUpRight, PackageCheck, Activity, BarChart3, RefreshCw, Truck,
  Filter, Calendar, ChevronDown, X, Search,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useEffect, useCallback, useMemo } from "react";

// 日期筛选类型
type DateFilterType = "all" | "today" | "this_week" | "this_month" | "last_month" | "last_7_days" | "custom";

// 根据筛选条件获取日期范围
function getDateRange(filter: DateFilterType, customStart: string, customEnd: string) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (filter) {
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
      if (customStart && customEnd) {
        start.setTime(new Date(customStart).getTime());
        start.setHours(0, 0, 0, 0);
        end.setTime(new Date(customEnd).getTime());
        end.setHours(23, 59, 59, 999);
      }
      break;
    case "all":
    default:
      return null;
  }
  return { start, end };
}

// 生成销售趋势数据（基于实际订单和日期筛选）
function generateSalesTrend(orders: any[], dateRange: { start: Date; end: Date } | null, filter: DateFilterType) {
  // 根据筛选类型决定显示多少天
  let days = 7;
  if (filter === "this_week") days = 7;
  if (filter === "today") days = 1;
  if (filter === "custom" || filter === "all") {
    if (dateRange) {
      const diff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      days = Math.max(1, Math.min(14, diff + 1));
    }
  }

  const result = [];
  const baseDate = dateRange ? new Date(dateRange.end) : new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayOrders = orders.filter((o: any) => {
      const orderDate = (o.date && o.date.split("T")[0]) ||
                        (o.createdAt && o.createdAt.split("T")[0]);
      return orderDate === dateStr;
    });
    const revenue = dayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    result.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue,
      orders: dayOrders.length,
    });
  }
  return result;
}

// 生成月度收入数据（基于实际订单）
function generateMonthlyRevenue(orders: any[]) {
  const months = 6;
  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7);

    const monthOrders = orders.filter((o: any) =>
      (o.date && o.date.startsWith(monthStr)) ||
      (o.createdAt && o.createdAt.startsWith(monthStr))
    );
    const revenue = monthOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    result.push({
      month: date.toLocaleDateString("en-US", { month: "short" }),
      revenue,
    });
  }
  return result;
}

// 从订单中筛选指定日期范围的订单
function filterOrdersByDate(orders: any[], dateRange: { start: Date; end: Date } | null) {
  if (!dateRange) return orders;
  return orders.filter((o: any) => {
    const orderDateStr = (o.date && o.date.split("T")[0]) || (o.createdAt && o.createdAt.split("T")[0]);
    if (!orderDateStr) return false;
    const orderDate = new Date(orderDateStr);
    return orderDate >= dateRange.start && orderDate <= dateRange.end;
  });
}

export default function DashboardPage() {
  const { t, currency, lang } = useApp();

  // 真实数据状态
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [dateFilter, setDateFilter] = useState<DateFilterType>("this_month");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, ordersRes, agentsRes, warehousesRes] = await Promise.all([
        fetch("/api/products").then(r => r.json()).catch(() => []),
        fetch("/api/orders").then(r => r.json()).catch(() => []),
        fetch("/api/agents").then(r => r.json()).catch(() => []),
        fetch("/api/warehouses").then(r => r.json()).catch(() => []),
      ]);

      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setAgents(Array.isArray(agentsRes) ? agentsRes : []);
      setWarehouses(Array.isArray(warehousesRes) ? warehousesRes : []);

      // 获取通知（如果API存在）
      try {
        const notifsRes = await fetch("/api/notifications").then(r => r.json()).catch(() => []);
        setNotifications(Array.isArray(notifsRes) ? notifsRes : []);
      } catch {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 计算日期范围
  const dateRange = useMemo(
    () => getDateRange(dateFilter, customDateRange.start, customDateRange.end),
    [dateFilter, customDateRange]
  );

  // 根据日期筛选后的订单
  const filteredOrders = useMemo(() => {
    let result = filterOrdersByDate(orders, dateRange);

    // 状态筛选
    if (statusFilter !== "all") {
      result = result.filter((o: any) => o.status === statusFilter);
    }

    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter((o: any) =>
        (o.orderNo || "").toLowerCase().includes(keyword) ||
        (o.company || "").toLowerCase().includes(keyword) ||
        (o.contactName || "").toLowerCase().includes(keyword) ||
        (o.agentId || "").toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [orders, dateRange, statusFilter, searchKeyword]);

  // 计算统计数据（基于筛选后的订单）
  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
  const totalValue = products.reduce((s, p) => s + (p.stock || 0) * (p.costPrice || 0), 0);
  const lowStock = products.filter((p) => (p.stock || 0) < 50).length;

  // 基于筛选后订单的统计
  const totalRevenue = filteredOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const totalShippingFees = filteredOrders
    .filter((o: any) => o.shippingFee && o.shippingFee > 0)
    .reduce((sum: number, o: any) => sum + (o.shippingFee || 0), 0);
  const pendingOrdersCount = filteredOrders.filter((o: any) =>
    o.status === "pending" || o.status === "pending_payment"
  ).length;
  const shippedOrdersCount = filteredOrders.filter((o: any) =>
    o.status === "shipped"
  ).length;

  // 生成图表数据
  const salesTrend = useMemo(
    () => generateSalesTrend(orders, dateRange, dateFilter),
    [orders, dateRange, dateFilter]
  );
  const monthlyRevenue = useMemo(() => generateMonthlyRevenue(orders), [orders]);

  // 计算热销产品（基于筛选后订单中商品出现的次数）
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();

    filteredOrders.forEach((o: any) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const key = item.productId || item.sku || item.name;
          const existing = productMap.get(key);
          if (existing) {
            existing.qty += item.quantity || item.qty || 1;
            existing.revenue += (item.price || 0) * (item.quantity || item.qty || 1);
          } else {
            productMap.set(key, {
              name: item.name,
              sku: item.sku || "",
              qty: item.quantity || item.qty || 1,
              revenue: (item.price || 0) * (item.quantity || item.qty || 1),
            });
          }
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // 计算活跃代理商（基于筛选后订单）
  const activeAgents = useMemo(() => {
    const agentMap = new Map<string, { name: string; company: string; orderCount: number; totalRevenue: number }>();

    filteredOrders.forEach((o: any) => {
      const agentId = o.agentId;
      if (!agentId) return;
      const existing = agentMap.get(agentId);
      if (existing) {
        existing.orderCount += 1;
        existing.totalRevenue += o.total || 0;
      } else {
        agentMap.set(agentId, {
          name: o.agentName || agentId,
          company: o.company || "",
          orderCount: 1,
          totalRevenue: o.total || 0,
        });
      }
    });

    return Array.from(agentMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredOrders]);

  const unread = notifications.filter((n) => !n.read).length;

  // 空状态
  const hasData = products.length > 0 || orders.length > 0 || agents.length > 0;
  const hasActiveFilters = dateFilter !== "all" || statusFilter !== "all" || searchKeyword.trim() !== "";

  // 清除所有筛选
  const clearFilters = () => {
    setDateFilter("all");
    setStatusFilter("all");
    setSearchKeyword("");
    setCustomDateRange({ start: "", end: "" });
  };

  // 获取筛选器标签
  const getDateFilterLabel = () => {
    const labels: Record<string, string> = {
      all: lang === "en" ? "All Time" : lang === "zh-CN" ? "全部时间" : "全部時間",
      today: lang === "en" ? "Today" : lang === "zh-CN" ? "今天" : "今天",
      this_week: lang === "en" ? "This Week" : lang === "zh-CN" ? "本周" : "本週",
      this_month: lang === "en" ? "This Month" : lang === "zh-CN" ? "本月" : "本月",
      last_month: lang === "en" ? "Last Month" : lang === "zh-CN" ? "上月" : "上月",
      last_7_days: lang === "en" ? "Last 7 Days" : lang === "zh-CN" ? "近七天" : "近七天",
      custom: lang === "en" ? "Custom" : lang === "zh-CN" ? "自定义" : "自訂",
    };
    return labels[dateFilter];
  };

  const getStatusFilterLabel = () => {
    const labels: Record<string, string> = {
      all: lang === "en" ? "All Status" : lang === "zh-CN" ? "全部状态" : "全部狀態",
      pending: lang === "en" ? "Unshipped" : lang === "zh-CN" ? "未发货" : "未發貨",
      shipped: lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨",
      completed: lang === "en" ? "Completed" : lang === "zh-CN" ? "已完成" : "已完成",
      cancelled: lang === "en" ? "Cancelled" : lang === "zh-CN" ? "已取消" : "已取消",
    };
    return labels[statusFilter];
  };

  return (
    <AdminLayout title={t("dashboard")} subtitle={lang === "en" ? "Overview of your operations" : lang === "zh-CN" ? "您的业务运营总览" : "您的營運概覽"}>
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={lang === "en" ? "Search orders..." : lang === "zh-CN" ? "搜索订单/客户..." : "搜索訂單/客戶..."}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input pl-10 py-2 text-sm w-60"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 日期筛选 */}
          <div className="relative">
            <button
              onClick={() => { setShowDateDropdown(!showDateDropdown); setShowStatusDropdown(false); }}
              className={`btn-ghost flex items-center gap-2 text-sm py-2 ${dateFilter !== "all" ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
            >
              <Calendar className="w-4 h-4" />
              {getDateFilterLabel()}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showDateDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-10 min-w-[160px] py-1">
                {["all", "today", "this_week", "this_month", "last_month", "last_7_days", "custom"].map((option) => {
                  const labels: Record<string, string> = {
                    all: lang === "en" ? "All Time" : lang === "zh-CN" ? "全部时间" : "全部時間",
                    today: lang === "en" ? "Today" : lang === "zh-CN" ? "今天" : "今天",
                    this_week: lang === "en" ? "This Week" : lang === "zh-CN" ? "本周" : "本週",
                    this_month: lang === "en" ? "This Month" : lang === "zh-CN" ? "本月" : "本月",
                    last_month: lang === "en" ? "Last Month" : lang === "zh-CN" ? "上月" : "上月",
                    last_7_days: lang === "en" ? "Last 7 Days" : lang === "zh-CN" ? "近七天" : "近七天",
                    custom: lang === "en" ? "Custom Range" : lang === "zh-CN" ? "自定义范围" : "自訂範圍",
                  };
                  return (
                    <button
                      key={option}
                      onClick={() => { setDateFilter(option as DateFilterType); setShowDateDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${dateFilter === option ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""}`}
                    >
                      {labels[option]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 状态筛选 */}
          <div className="relative">
            <button
              onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowDateDropdown(false); }}
              className={`btn-ghost flex items-center gap-2 text-sm py-2 ${statusFilter !== "all" ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
            >
              <Filter className="w-4 h-4" />
              {getStatusFilterLabel()}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-10 min-w-[160px] py-1">
                {["all", "pending", "shipped", "completed", "cancelled"].map((option) => {
                  const labels: Record<string, string> = {
                    all: lang === "en" ? "All Status" : lang === "zh-CN" ? "全部状态" : "全部狀態",
                    pending: lang === "en" ? "Unshipped" : lang === "zh-CN" ? "未发货" : "未發貨",
                    shipped: lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨",
                    completed: lang === "en" ? "Completed" : lang === "zh-CN" ? "已完成" : "已完成",
                    cancelled: lang === "en" ? "Cancelled" : lang === "zh-CN" ? "已取消" : "已取消",
                  };
                  return (
                    <button
                      key={option}
                      onClick={() => { setStatusFilter(option); setShowStatusDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${statusFilter === option ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""}`}
                    >
                      {labels[option]}
                    </button>
                  );
                })}
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
              className="btn-ghost text-sm flex items-center gap-1 text-rose-500 hover:text-rose-700 py-2"
            >
              <X className="w-4 h-4" />
              {lang === "en" ? "Clear" : lang === "zh-CN" ? "清除" : "清除"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <div className="text-xs text-slate-500">
              {lang === "en" ? "Showing" : lang === "zh-CN" ? "显示" : "顯示"} {filteredOrders.length} {lang === "en" ? "of" : lang === "zh-CN" ? "/共" : "/共"} {orders.length} {lang === "en" ? "orders" : lang === "zh-CN" ? "笔订单" : "筆訂單"}
            </div>
          )}
          <button onClick={fetchData} className="btn-ghost flex items-center gap-2 text-sm py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {lang === "zh-CN" ? "刷新" : "Refresh"}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label={t("orders_count") || (lang === "en" ? "Orders" : lang === "zh-CN" ? "订单数" : "訂單數")} value={formatNumber(totalOrdersCount)} icon={ShoppingCart} accent="indigo" />
        <StatCard label={lang === "en" ? "Revenue" : lang === "zh-CN" ? "营业收入" : "營業收入"} value={formatCurrency(totalRevenue, currency)} icon={DollarSign} accent="emerald" />
        <StatCard label={lang === "en" ? "Shipping Fees" : lang === "zh-CN" ? "运费收入" : "運費收入"} value={formatCurrency(totalShippingFees, currency)} icon={Truck} accent="amber" />
        <StatCard label={lang === "en" ? "Pending" : lang === "zh-CN" ? "待处理" : "待處理"} value={formatNumber(pendingOrdersCount)} icon={Package} accent="amber" />
        <StatCard label={lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨"} value={formatNumber(shippedOrdersCount)} icon={PackageCheck} accent="sky" />
        <StatCard label={lang === "en" ? "Total Inventory" : lang === "zh-CN" ? "库存总量" : "庫存總量"} value={formatCurrency(totalValue, currency)} icon={BarChart3} accent="emerald" />
      </div>

      {/* 空状态引导 */}
      {!hasData && !loading && (
        <div className="card p-8 mb-6 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold mb-2">{lang === "zh-CN" ? "开始使用" : "Get Started"}</h3>
          <p className="text-slate-500 mb-4 max-w-md mx-auto">
            {lang === "zh-CN"
              ? "系统暂无数据。请依次添加：1. 仓库 → 2. 产品 → 3. 代理商，即可开始运营。"
              : "No data yet. Add: 1. Warehouses → 2. Products → 3. Agents to get started."}
          </p>
          <div className="flex justify-center gap-3">
            <a href="/admin/warehouse" className="btn-primary">{lang === "zh-CN" ? "添加仓库" : "Add Warehouses"}</a>
            <a href="/admin/products" className="btn-ghost">{lang === "zh-CN" ? "添加产品" : "Add Products"}</a>
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* 图表区 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="xl:col-span-2 card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">{t("sales_trend")}</h2>
                  <div className="text-xs text-slate-500">
                    {getDateFilterLabel()} · {lang === "en" ? "Revenue & Orders" : lang === "zh-CN" ? "收入与订单数" : "收入與訂單數"}
                  </div>
                </div>
              </div>
              {salesTrend.some((d: any) => d.revenue > 0 || d.orders > 0) ? (
                <div className="h-72">
                  <ResponsiveContainer>
                    <LineChart data={salesTrend} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value: number) => formatCurrency(value, currency)} />
                      <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="orders" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                  {lang === "en" ? "No order data in selected period" : lang === "zh-CN" ? "所选时段暂无订单数据" : "所選時段暫無訂單數據"}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{t("monthly_revenue")}</h2>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={monthlyRevenue} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value: number) => formatCurrency(value, currency)} />
                    <Bar dataKey="revenue" fill="url(#g)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 热销产品 & 低库存 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="card p-5 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">{t("top_products")}</h2>
                  <div className="text-xs text-slate-500">{lang === "en" ? "By order revenue in selected period" : lang === "zh-CN" ? "按筛选时段内订单销售额排名" : "按篩選時段內訂單銷售額排名"}</div>
                </div>
              </div>
              {topProducts.length > 0 ? (
                <div className="scrollable">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{lang === "en" ? "SKU" : lang === "zh-CN" ? "SKU" : "SKU"}</th>
                        <th>{lang === "en" ? "Product" : lang === "zh-CN" ? "产品" : "產品"}</th>
                        <th>{lang === "en" ? "Quantity Sold" : lang === "zh-CN" ? "已售数量" : "已售數量"}</th>
                        <th>{lang === "en" ? "Revenue" : lang === "zh-CN" ? "销售额" : "銷售額"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, idx) => (
                        <tr key={p.sku + idx}>
                          <td className="font-mono text-xs text-slate-500">{p.sku || "—"}</td>
                          <td className="font-medium">{p.name}</td>
                          <td>{formatNumber(p.qty)}</td>
                          <td className="font-semibold text-emerald-600">{formatCurrency(p.revenue, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {lang === "en" ? "No product sales data in selected period" : lang === "zh-CN" ? "所选时段暂无产品销售数据" : "所選時段暫無產品銷售數據"}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{t("low_stock")} · {lowStock}</h2>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="space-y-3">
                {products.filter((p) => (p.stock || 0) < 100).slice(0, 5).map((p) => {
                  const stock = p.stock || 0;
                  const pct = Math.max(5, Math.min(100, (stock / 100) * 100));
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                        <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{stock}</div>
                    </div>
                  );
                })}
                {products.filter((p) => (p.stock || 0) < 100).length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    {lang === "zh-CN" ? "库存充足" : "Stock levels are good"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 最近订单 & 活跃代理商 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="card p-5 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{lang === "en" ? "Recent orders" : lang === "zh-CN" ? "最近订单" : "最近訂單"}</h2>
              </div>
              {filteredOrders.length > 0 ? (
                <div className="scrollable">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t("order_no")}</th>
                        <th>{t("customer_name")}</th>
                        <th>{t("amount")}</th>
                        <th>{lang === "en" ? "Shipping" : lang === "zh-CN" ? "运费" : "運費"}</th>
                        <th>{t("status")}</th>
                        <th>{lang === "en" ? "Date" : lang === "zh-CN" ? "日期" : "日期"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.slice(0, 5).map((o: any) => (
                        <tr key={o.id || o.orderNo}>
                          <td className="font-mono text-xs">{o.orderNo}</td>
                          <td className="font-medium">{o.company || o.contactName || o.agentId || "—"}</td>
                          <td>{formatCurrency(o.total || 0, currency)}</td>
                          <td className={o.shippingFee ? "text-orange-600 font-medium" : "text-slate-400"}>
                            {o.shippingFee ? formatCurrency(o.shippingFee, currency) : "—"}
                          </td>
                          <td><StatusBadge status={o.status} /></td>
                          <td className="text-slate-500 text-sm">{(o.date && o.date.split("T")[0]) || (o.createdAt && o.createdAt.split("T")[0]) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {lang === "en" ? "No orders in selected period" : lang === "zh-CN" ? "所选时段暂无订单" : "所選時段暫無訂單"}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{lang === "en" ? "Top Agents" : lang === "zh-CN" ? "活跃代理商" : "活躍代理商"}</h2>
              </div>
              <div className="space-y-3">
                {activeAgents.length > 0 ? activeAgents.map((a: any, i: number) => (
                  <div key={a.name + i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{a.company || a.name}</div>
                      <div className="text-xs text-slate-500">
                        {formatNumber(a.orderCount)} {lang === "en" ? "orders" : lang === "zh-CN" ? "笔订单" : "筆訂單"} · {formatCurrency(a.totalRevenue, currency)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    {lang === "zh-CN" ? "所选时段暂无代理商订单" : "No agent orders in selected period"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 仓库库存 & 通知 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="card p-5 xl:col-span-2">
              <h2 className="text-base font-semibold mb-4">
                {lang === "en" ? "Warehouses & stock" : lang === "zh-CN" ? "仓库与库存" : "倉庫與庫存"}
              </h2>
              {warehouses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {warehouses.map((w) => (
                    <div key={w.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold">{w.name}</div>
                      </div>
                      <div className="text-xs text-slate-500 mb-3">{w.location}</div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-xs text-slate-500">{t("stock")}</div>
                          <div className="text-xl font-bold">{formatNumber(w.stock || 0)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">{lang === "en" ? "Value" : lang === "zh-CN" ? "价值" : "價值"}</div>
                          <div className="text-xl font-bold">{formatCurrency(w.value || 0, currency)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <a href="/admin/warehouse" className="text-indigo-600 hover:underline">
                    {lang === "zh-CN" ? "添加第一个仓库" : "Add your first warehouse"}
                  </a>
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold">{t("notifications")}</h2>
                {unread > 0 && <Badge tone="yellow">{unread} {lang === "en" ? "new" : lang === "zh-CN" ? "新" : "新"}</Badge>}
              </div>
              {notifications.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className={`rounded-lg border border-slate-200 dark:border-slate-800 p-3 ${n.read ? "" : "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-900/40"}`}>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-slate-500">{n.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {lang === "zh-CN" ? "暂无通知" : "No notifications"}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
