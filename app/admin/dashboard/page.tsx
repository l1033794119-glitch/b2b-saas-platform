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
  const { t, currency, lang, apiFetch, user } = useApp();

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  // 仪表盘统计聚合（来源：新接口 /api/dashboard-summary）
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // 详细数据（订单列表 / 产品表 / 商品销售统计卡片）懒加载完成标记
  const [detailLoading, setDetailLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState<DateFilterType>("this_month");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // 把前端的 dateFilter 转成 summary API 能吃的 from/to 查询参数
  const summaryUrl = useMemo(() => {
    const range = getDateRange(dateFilter, customDateRange.start, customDateRange.end);
    const p = new URLSearchParams();
    if (range) {
      const f = `${range.start.getFullYear()}-${String(range.start.getMonth() + 1).padStart(2, "0")}-${String(range.start.getDate()).padStart(2, "0")}`;
      const t = `${range.end.getFullYear()}-${String(range.end.getMonth() + 1).padStart(2, "0")}-${String(range.end.getDate()).padStart(2, "0")}`;
      p.set("from", f);
      p.set("to", t);
    }
    const qs = p.toString();
    return `/api/dashboard-summary${qs ? "?" + qs : ""}`;
  }, [dateFilter, customDateRange.start, customDateRange.end]);

  // ===== 第 1 阶段：只拉聚合统计，6 个卡片 + 图表 100ms 级别出来 =====
  const fetchSummary = useCallback(async () => {
    try {
      const r = await apiFetch(summaryUrl);
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (data && typeof data === "object") setSummary(data);
      }
    } catch (e) {
      console.warn("dashboard-summary failed, fallback to old flow:", e);
    }
  }, [apiFetch, summaryUrl]);

  // ===== 第 2 阶段：详细数据异步拉取（订单列表 / 产品表 / 代理 / 仓库 / 通知） =====
  // 这些是「最近订单表格 / 商品销售统计卡片 / 低库存卡片」才需要的大数组
  const fetchDetail = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 性能：之前是 Promise.all 4 个大接口同时打，对 DB 和带宽压力大。
      // 改成分两批：先拿 orders / products（最需要），再拿 agents / warehouses。
      const [ordersRes, productsRes] = await Promise.all([
        apiFetch("/api/orders").then(r => r.json()).catch(() => []),
        apiFetch("/api/products").then(r => r.json()).catch(() => []),
      ]);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);

      const [agentsRes, warehousesRes] = await Promise.all([
        apiFetch("/api/agents").then(r => r.json().catch(() => [])),
        apiFetch("/api/warehouses").then(r => r.json().catch(() => [])),
      ]);
      setAgents(Array.isArray(agentsRes) ? agentsRes : []);
      setWarehouses(Array.isArray(warehousesRes) ? warehousesRes : []);

      // 通知最后拿
      try {
        const notifsRes = await apiFetch("/api/notifications").then(r => r.json()).catch(() => []);
        setNotifications(Array.isArray(notifsRes) ? notifsRes : []);
      } catch {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard detail data:", error);
    } finally {
      setDetailLoading(false);
    }
  }, [apiFetch, user?.id]);

  // 统一刷新按钮：两个阶段都跑
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setDetailLoading(true);
    try {
      await fetchSummary();
    } finally {
      setLoading(false);
    }
    // 第二阶段异步继续，不阻塞 loading 变 false
    void fetchDetail();
  }, [user?.id, fetchSummary, fetchDetail]);

  // 初次加载 & 切换筛选器时重新拉 summary
  useEffect(() => {
    if (!user?.id) return;
    const t0 = Date.now();
    setLoading(true);
    fetchSummary().finally(() => {
      setLoading(false);
      console.debug(`[dashboard] summary fetched in ${Date.now() - t0}ms`);
    });
  }, [fetchSummary, user?.id]);

  // 初次加载再拉一遍 detail（懒加载）
  useEffect(() => {
    if (!user?.id) return;
    setDetailLoading(true);
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 计算日期范围
  const dateRange = useMemo(
    () => getDateRange(dateFilter, customDateRange.start, customDateRange.end),
    [dateFilter, customDateRange]
  );

  // 根据日期筛选后的订单
  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    let result = filterOrdersByDate(safeOrders, dateRange);

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

  const safeProducts = Array.isArray(products) ? products : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];

  // ======== 统一数据层：优先用后端聚合 summary（<100ms），没有就走前端过滤（旧逻辑，保证 100% 兼容） ========
  const stats = useMemo(() => {
    // 筛选后订单：日期 + 状态 + 关键词（用于"最近订单表格 / 商品销售统计 / 搜索匹配"）
    const safe = Array.isArray(orders) ? orders : [];
    let filtered = filterOrdersByDate(safe, dateRange);
    if (statusFilter !== "all") filtered = filtered.filter((o: any) => o.status === statusFilter);
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      filtered = filtered.filter((o: any) =>
        (o.orderNo || "").toLowerCase().includes(kw) ||
        (o.company || "").toLowerCase().includes(kw) ||
        (o.contactName || "").toLowerCase().includes(kw) ||
        (o.agentId || "").toLowerCase().includes(kw)
      );
    }

    // 6 个统计卡片（含日期筛选 + 状态筛选，优先 summary，但 summary 不受 status/keyword 影响）
    const s: any = summary || null;

    // 如果用户没有加 status/keyword，只改了日期筛选 → 优先用 summary 数据（毫秒级）
    const canUseSummaryForStats =
      s && statusFilter === "all" && !searchKeyword.trim();

    // 库存 / 仓库 数不受订单筛选影响，直接用 summary
    const totalStock = s?.stock?.totalQty ?? safeProducts.reduce((sum: number, p: any) => sum + (p.stock || 0), 0);
    const totalValue = s?.stock?.totalValue ?? safeProducts.reduce((sum: number, p: any) => sum + (p.stock || 0) * (p.costPrice || 0), 0);
    const lowStock = s?.stock?.lowStock ?? safeProducts.filter((p: any) => (p.stock || 0) < 50).length;

    // 订单维度 6 指标
    let totalRevenue: number;
    let totalOrdersCount: number;
    let totalShippingFees: number;
    let pendingOrdersCount: number;
    let shippedOrdersCount: number;
    // let completedOrdersCount: number;

    if (canUseSummaryForStats) {
      totalRevenue = Number(s.orders.revenue) || 0;
      totalOrdersCount = Number(s.orders.count) || 0;
      totalShippingFees = Number(s.orders.shippingFees) || 0;
      pendingOrdersCount = Number(s.orders.pending) || 0;
      shippedOrdersCount = Number(s.orders.shipped) || 0;
      // completedOrdersCount = Number(s.orders.completed) || 0;
    } else {
      totalRevenue = filtered.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      totalOrdersCount = filtered.length;
      totalShippingFees = filtered
        .filter((o: any) => o.shippingFee && o.shippingFee > 0)
        .reduce((sum: number, o: any) => sum + (o.shippingFee || 0), 0);
      pendingOrdersCount = filtered.filter((o: any) =>
        o.status === "pending_qrcode" || o.status === "pending_delivery" || o.status === "pending_tracking" || o.status === "pending_payment"
      ).length;
      shippedOrdersCount = filtered.filter((o: any) => o.status === "shipped").length;
    }

    return {
      totalStock, totalValue, lowStock,
      totalRevenue, totalOrdersCount, totalShippingFees,
      pendingOrdersCount, shippedOrdersCount,
      filteredOrders: filtered,
    };
  }, [orders, dateRange, statusFilter, searchKeyword, summary, safeProducts]);

  const filteredOrders = stats.filteredOrders;
  const totalStock = stats.totalStock;
  const totalValue = stats.totalValue;
  const lowStock = stats.lowStock;
  const totalRevenue = stats.totalRevenue;
  const totalOrdersCount = stats.totalOrdersCount;
  const totalShippingFees = stats.totalShippingFees;
  const pendingOrdersCount = stats.pendingOrdersCount;
  const shippedOrdersCount = stats.shippedOrdersCount;

  // 生成图表数据
  // summary 里已经带了 14 天和 6 个月，直接用（毫秒级）
  const salesTrend = useMemo(() => {
    if (summary?.dailyTrend && Array.isArray(summary.dailyTrend) && summary.dailyTrend.length > 0
        && statusFilter === "all" && !searchKeyword.trim()) {
      return summary.dailyTrend.map((d: any) => ({
        date: d.date,
        revenue: Number(d.revenue) || 0,
        orders: Number(d.orders) || 0,
      }));
    }
    return generateSalesTrend(safeOrders, dateRange, dateFilter);
  }, [summary, safeOrders, dateRange, dateFilter, statusFilter, searchKeyword]);

  const monthlyRevenue = useMemo(() => {
    if (summary?.monthlyRevenue && Array.isArray(summary.monthlyRevenue) && summary.monthlyRevenue.length > 0) {
      return summary.monthlyRevenue.map((m: any) => ({
        month: m.month,
        revenue: Number(m.revenue) || 0,
      }));
    }
    return generateMonthlyRevenue(safeOrders);
  }, [summary, safeOrders]);

  // Top 产品 / 活跃代理：优先 summary（summary 的 Top 不考虑 status/keyword 筛选，和后端语义一致）
  const summaryTopProducts = useMemo(() => {
    if (summary?.topProducts && Array.isArray(summary.topProducts) && statusFilter === "all" && !searchKeyword.trim()) {
      return summary.topProducts.map((p: any) => ({
        name: p.name,
        sku: p.sku,
        qty: Number(p.qty) || 0,
        revenue: Number(p.revenue) || 0,
        image: p.image || "",
        productId: p.productId || "",
      }));
    }
    return null;
  }, [summary, statusFilter, searchKeyword]);

  const summaryTopAgents = useMemo(() => {
    if (summary?.topAgents && Array.isArray(summary.topAgents) && statusFilter === "all" && !searchKeyword.trim()) {
      return summary.topAgents.map((a: any) => ({
        name: a.agentId,
        company: a.company,
        orderCount: Number(a.orderCount) || 0,
        totalRevenue: Number(a.totalRevenue) || 0,
      }));
    }
    return null;
  }, [summary, statusFilter, searchKeyword]);

  // 计算热销产品（基于筛选后订单中商品出现的次数）
  const topProducts = useMemo(() => {
    if (summaryTopProducts) {
      // summary 的 Top5 按销售额排好序，直接用
      return summaryTopProducts.map((p: any) => ({
        name: p.name, sku: p.sku, qty: p.qty, revenue: p.revenue,
      }));
    }
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

  // 计算所有已售商品统计（含图片和名称，按数量排序）
  const allProductSales = useMemo(() => {
    const productMap = new Map<string, { name: string; sku: string; image: string; qty: number; revenue: number }>();

    filteredOrders.forEach((o: any) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const key = item.productId || item.sku || item.name;
          const product = products.find((p: any) => String(p.id) === String(item.productId));
          // 🚩 用户要求：所有仪表盘产品图，100% 只取「产品管理」中对应产品的最新图。
          // 不再使用订单创建时写入的历史快照 items.image（它在产品换图后必然是旧的/已删除的）。
          let image = "";
          if (product) {
            if (Array.isArray(product.images) && typeof product.images[0] === "string") {
              image = product.images[0];
            } else if (typeof product.images === "string") {
              try {
                const arr = JSON.parse(product.images);
                if (Array.isArray(arr) && typeof arr[0] === "string") image = arr[0];
              } catch { /* noop */ }
            }
          }
          const existing = productMap.get(key);
          if (existing) {
            existing.qty += item.quantity || item.qty || 1;
            existing.revenue += (item.price || 0) * (item.quantity || item.qty || 1);
            if (!existing.image) existing.image = image;  // 合并时仍可能该 key 第一次没匹配，只补一次 image
          } else {
            productMap.set(key, {
              name: item.name,
              sku: item.sku || "-",
              image,
              qty: item.quantity || item.qty || 1,
              revenue: (item.price || 0) * (item.quantity || item.qty || 1),
            });
          }
        });
      }
    });

    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
  }, [filteredOrders, products]);

  // 计算活跃代理商（基于筛选后订单）
  const activeAgents = useMemo(() => {
    if (summaryTopAgents) return summaryTopAgents;

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

  // 空状态：现在有 summary 也算有数据（不用等 detail 全拉完）
  const hasSummaryData = !!summary && (
    (summary.orders?.count || 0) > 0
      || (summary.stock?.productsCount || 0) > 0
      || (summary.agents?.total || 0) > 0
      || summary.warehouses > 0
  );
  // 空状态
  const hasData = products.length > 0 || orders.length > 0 || agents.length > 0 || hasSummaryData;
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
      pending_qrcode: lang === "en" ? "Pending QR Code" : lang === "zh-CN" ? "待上传二维码" : "待上傳二維碼",
      pending_delivery: lang === "en" ? "Pending Delivery" : lang === "zh-CN" ? "待投递" : "待投遞",
      pending_tracking: lang === "en" ? "Pending Tracking" : lang === "zh-CN" ? "待填写运单号" : "待填寫運單號",
      shipped: lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨",
      completed: lang === "en" ? "Completed" : lang === "zh-CN" ? "已完成" : "已完成",
    };
    return labels[statusFilter];
  };

  return (
    <AdminLayout title={t("dashboard")} subtitle={lang === "en" ? "Overview of your operations" : lang === "zh-CN" ? "您的业务运营总览" : "您的營運概覽"}>
      {/* 顶部工具栏 */}
      <div className="flex flex-col gap-2 sm:gap-3 mb-6">
        {/* 第一行: 搜索框 + 刷新按钮 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={lang === "en" ? "Search orders..." : lang === "zh-CN" ? "搜索订单/客户..." : "搜索訂單/客戶..."}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input !pl-11 py-2 text-sm w-full"
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
          <button onClick={fetchData} className="btn-ghost flex items-center gap-1.5 text-sm py-2 px-3 flex-shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{lang === "zh-CN" ? "刷新" : "Refresh"}</span>
          </button>
        </div>

        {/* 第二行: 筛选按钮 + 结果统计 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 日期筛选 */}
          <div className="relative">
            <button
              onClick={() => { setShowDateDropdown(!showDateDropdown); setShowStatusDropdown(false); }}
              className={`btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-2.5 ${dateFilter !== "all" ? "border-emerald-500/30 bg-emerald-500/10" : ""}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="max-w-[80px] sm:max-w-none truncate">{getDateFilterLabel()}</span>
              <ChevronDown className="w-3.5 h-3.5" />
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
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${dateFilter === option ? "text-emerald-500 font-medium" : ""}`}
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
              className={`btn-ghost flex items-center gap-1.5 text-sm py-1.5 px-2.5 ${statusFilter !== "all" ? "border-emerald-500/30 bg-emerald-500/10" : ""}`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="max-w-[80px] sm:max-w-none truncate">{getStatusFilterLabel()}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-10 min-w-[160px] py-1">
                {["all", "pending_qrcode", "pending_delivery", "pending_tracking", "shipped", "completed"].map((option) => {
                  const labels: Record<string, string> = {
                    all: lang === "en" ? "All Status" : lang === "zh-CN" ? "全部状态" : "全部狀態",
                    pending_qrcode: lang === "en" ? "Pending QR Code" : lang === "zh-CN" ? "待上传二维码" : "待上傳二維碼",
                    pending_delivery: lang === "en" ? "Pending Delivery" : lang === "zh-CN" ? "待投递" : "待投遞",
                    pending_tracking: lang === "en" ? "Pending Tracking" : lang === "zh-CN" ? "待填写运单号" : "待填寫運單號",
                    shipped: lang === "en" ? "Shipped" : lang === "zh-CN" ? "已发货" : "已發貨",
                    completed: lang === "en" ? "Completed" : lang === "zh-CN" ? "已完成" : "已完成",
                  };
                  return (
                    <button
                      key={option}
                      onClick={() => { setStatusFilter(option); setShowStatusDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${statusFilter === option ? "text-emerald-500 font-medium" : ""}`}
                    >
                      {labels[option]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 清除筛选 */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn-ghost text-sm flex items-center gap-1 text-rose-500 hover:text-rose-700 py-1.5 px-2.5"
            >
              <X className="w-3.5 h-3.5" />
              {lang === "en" ? "Clear" : lang === "zh-CN" ? "清除" : "清除"}
            </button>
          )}

          {/* 结果统计 */}
          {hasActiveFilters && (
            <div className="text-xs text-slate-500 ml-auto">
              {filteredOrders.length}/{orders.length} {lang === "en" ? "orders" : lang === "zh-CN" ? "笔" : "筆"}
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
              className="input py-1.5 px-3 text-sm flex-1"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
              className="input py-1.5 px-3 text-sm flex-1"
            />
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="xl:col-span-2 card p-4 sm:p-5">
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
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.3)" />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.3)" />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "rgba(28,28,32,0.9)", border: "1px solid rgba(255,255,255,0.08)", color: "#f5f5f7" }} formatter={(value: number) => formatCurrency(value, currency)} />
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

            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{t("monthly_revenue")}</h2>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={monthlyRevenue} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.3)" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.3)" />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, background: "rgba(28,28,32,0.9)", border: "1px solid rgba(255,255,255,0.08)", color: "#f5f5f7" }} formatter={(value: number) => formatCurrency(value, currency)} />
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="card p-4 sm:p-5 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">{t("top_products")}</h2>
                  <div className="text-xs text-slate-500">{lang === "en" ? "By order revenue in selected period" : lang === "zh-CN" ? "按筛选时段内订单销售额排名" : "按篩選時段內訂單銷售額排名"}</div>
                </div>
              </div>
              {topProducts.length > 0 ? (
                <>
                  {/* 手机端: 卡片列表 */}
                  <div className="sm:hidden space-y-3">
                    {topProducts.map((p, idx) => (
                      <div key={p.sku + idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{p.sku || "—"}</div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <div className="text-sm font-semibold text-emerald-600">{formatCurrency(p.revenue, currency)}</div>
                          <div className="text-xs text-slate-500">{formatNumber(p.qty)} {lang === "en" ? "sold" : lang === "zh-CN" ? "已售" : "已售"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 桌面端: 表格 */}
                  <div className="hidden sm:block scrollable">
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
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {lang === "en" ? "No product sales data in selected period" : lang === "zh-CN" ? "所选时段暂无产品销售数据" : "所選時段暫無產品銷售數據"}
                </div>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-sm sm:text-base font-semibold">{t("low_stock")} · {lowStock}</h2>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="space-y-2 sm:space-y-3">
                {safeProducts.filter((p) => (p.stock || 0) < 100).slice(0, 5).map((p) => {
                  const stock = p.stock || 0;
                  const pct = Math.max(5, Math.min(100, (stock / 100) * 100));
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-medium truncate">{p.name}</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-mono">{p.sku}</div>
                        <div className="mt-1 h-1 sm:h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold">{stock}</div>
                    </div>
                  );
                })}
                {safeProducts.filter((p) => (p.stock || 0) < 100).length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    {lang === "zh-CN" ? "库存充足" : "Stock levels are good"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 商品销售总数统计 */}
          <div className="card p-4 sm:p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">
                  {lang === "en" ? "Product Sales Summary" : lang === "zh-CN" ? "商品销售总数统计" : "商品銷售總數統計"}
                </h2>
                <div className="text-xs text-slate-500">
                  {lang === "en"
                    ? "Total quantity sold per SKU (with product image)"
                    : lang === "zh-CN"
                    ? "每个SKU已售出总数量（含产品图片）"
                    : "每個SKU已售出總數量（含產品圖片）"}
                </div>
              </div>
              {allProductSales.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-slate-500">{lang === "en" ? "Total Items Sold" : lang === "zh-CN" ? "已售总件数" : "已售總件數"}</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-500">
                    {formatNumber(allProductSales.reduce((s, p) => s + p.qty, 0))}
                  </div>
                </div>
              )}
            </div>
            {allProductSales.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {allProductSales.map((p, idx) => (
                  <div key={p.sku + idx} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 sm:p-3 hover:shadow-md transition-shadow">
                    <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-2 sm:mb-3">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (el.parentElement) {
                              el.style.display = "none";
                              const fallback = document.createElement("div");
                              fallback.className = "w-full h-full flex items-center justify-center text-2xl sm:text-3xl";
                              fallback.textContent = "📦";
                              if (!el.parentElement.querySelector(":scope > div")) {
                                el.parentElement.appendChild(fallback);
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl">📦</div>
                      )}
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 min-w-[24px] sm:min-w-[32px] h-6 sm:h-8 px-1.5 sm:px-2 bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-md sm:rounded-lg flex items-center justify-center shadow-md">
                        ×{p.qty}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 font-mono truncate">{p.sku}</div>
                    <div className="mt-1 sm:mt-2 flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs text-slate-500">{lang === "en" ? "Qty" : lang === "zh-CN" ? "数量" : "數量"}</span>
                      <span className="text-sm sm:text-lg font-bold text-emerald-600">{formatNumber(p.qty)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                {lang === "en" ? "No product sales data in selected period" : lang === "zh-CN" ? "所选时段暂无产品销售数据" : "所選時段暫無產品銷售數據"}
              </div>
            )}
          </div>

          {/* 最近订单 & 活跃代理商 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="card p-4 sm:p-5 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{lang === "en" ? "Recent orders" : lang === "zh-CN" ? "最近订单" : "最近訂單"}</h2>
              </div>
              {filteredOrders.length > 0 ? (
                <>
                  {/* 手机端: 卡片列表 */}
                  <div className="sm:hidden space-y-3">
                    {filteredOrders.slice(0, 5).map((o: any) => (
                      <div key={o.id || o.orderNo} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-slate-400">{o.orderNo}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{o.company || o.contactName || o.agentId || "—"}</span>
                          <span className="text-sm font-semibold ml-2 flex-shrink-0">{formatCurrency(o.total || 0, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">{(o.date && o.date.split("T")[0]) || (o.createdAt && o.createdAt.split("T")[0]) || "—"}</span>
                          {o.shippingFee ? (
                            <span className="text-xs text-orange-500">{lang === "en" ? "Shipping" : lang === "zh-CN" ? "运费" : "運費"} {formatCurrency(o.shippingFee, currency)}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 桌面端: 表格 */}
                  <div className="hidden sm:block scrollable">
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
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {lang === "en" ? "No orders in selected period" : lang === "zh-CN" ? "所选时段暂无订单" : "所選時段暫無訂單"}
                </div>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">{lang === "en" ? "Top Agents" : lang === "zh-CN" ? "活跃代理商" : "活躍代理商"}</h2>
              </div>
              <div className="space-y-3">
                {activeAgents.length > 0 ? activeAgents.map((a: any, i: number) => (
                  <div key={a.name + i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="card p-4 sm:p-5 xl:col-span-2">
              <h2 className="text-base font-semibold mb-4">
                {lang === "en" ? "Warehouses & stock" : lang === "zh-CN" ? "仓库与库存" : "倉庫與庫存"}
              </h2>
              {safeWarehouses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {safeWarehouses.map((w) => (
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
                  <a href="/admin/warehouse" className="text-emerald-500 hover:underline">
                    {lang === "zh-CN" ? "添加第一个仓库" : "Add your first warehouse"}
                  </a>
                </div>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold">{t("notifications")}</h2>
                {unread > 0 && <Badge tone="yellow">{unread} {lang === "en" ? "new" : lang === "zh-CN" ? "新" : "新"}</Badge>}
              </div>
              {notifications.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className={`rounded-lg border border-slate-200 dark:border-slate-800 p-3 ${n.read ? "" : "bg-emerald-500/10 border-emerald-500/20"}`}>
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
