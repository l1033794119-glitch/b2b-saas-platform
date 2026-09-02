"use client";

import { useState, useEffect, useMemo } from "react";
import { AgentLayout } from "@/components/Layout";
import { StatCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber, parseOrderDate } from "@/lib/utils";
import { Package, Bell, CreditCard, Truck, Calendar, ChevronDown } from "lucide-react";

interface CreditRecord {
  agentId: string;
  creditLimit: number;
  outstanding: number;
  available: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balance: number;
    note: string;
    time: string;
  }>;
}

interface Order {
  id: string;
  orderNo: string;
  agentId: string;
  items: any[];
  total: number;
  status: string;
  date: string;
  shippingAddress: string;
  trackingNumber?: string;
  trackingImage?: string;
  qrCode?: string;
  shippingFee?: number;
  shippedAt?: string;
}

interface DateFilter {
  label: string;
  value: string;
}

export default function AgentDashboard() {
  const { t, user, currency, lang, apiFetch } = useApp();
  const [credit, setCredit] = useState<CreditRecord | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  // 性能优化：后端聚合仪表盘数据（毫秒级）
  const [summary, setSummary] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("this_month");
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // summary 查询参数
  const summaryUrl = useMemo(() => {
    const { start, end } = (() => {
      const now = new Date(); const s = new Date(); const e = new Date();
      switch (dateFilter) {
        case "this_month": s.setDate(1); s.setHours(0,0,0,0); e.setHours(23,59,59,999); break;
        case "last_month": s.setMonth(s.getMonth()-1); s.setDate(1); s.setHours(0,0,0,0); e.setDate(0); e.setHours(23,59,59,999); break;
        case "last_7_days": s.setDate(s.getDate()-7); s.setHours(0,0,0,0); e.setHours(23,59,59,999); break;
        case "custom":
          if (customDateRange.start) s.setTime(new Date(customDateRange.start).getTime());
          if (customDateRange.end) e.setTime(new Date(customDateRange.end).getTime());
          s.setHours(0,0,0,0); e.setHours(23,59,59,999); break;
        default: return { start: null, end: null };
      }
      return { start: s, end: e };
    })();
    const p = new URLSearchParams();
    if (start && !isNaN(start.getTime())) {
      p.set("from", `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}-${String(start.getDate()).padStart(2,"0")}`);
    }
    if (end && !isNaN(end.getTime())) {
      p.set("to", `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,"0")}-${String(end.getDate()).padStart(2,"0")}`);
    }
    const qs = p.toString();
    return `/api/dashboard-summary${qs ? "?"+qs : ""}`;
  }, [dateFilter, customDateRange.start, customDateRange.end]);

  // 阶段 1：summary 秒出
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    apiFetch(summaryUrl)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d && typeof d === "object") setSummary(d); })
      .catch(e => console.warn("agent dashboard summary fail:", e));
    return () => { cancelled = true; };
  }, [user?.id, apiFetch, summaryUrl]);

  // 阶段 2：detail 懒加载（credit / orders / products / notifications）
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setDetailLoading(true);

    (async () => {
      // 先拿 credit + orders（最需要）
      const [cRes, oRes] = await Promise.all([
        apiFetch(`/api/credit?agentId=${user.id}`)
          .then((r) => (r.ok ? r.json().catch(() => null) : null)),
        apiFetch(`/api/orders?agentId=${user.id}`)
          .then((r) => (r.ok ? r.json().catch(() => []) : [])),
      ]);
      if (cancelled) return;
      if (cRes) setCredit(cRes);
      if (Array.isArray(oRes)) setOrders(oRes);

      const [pRes, nRes] = await Promise.all([
        apiFetch("/api/products").then(r => r.ok ? r.json().catch(()=>[]) : []),
        apiFetch("/api/notifications")
          .then((r) => (r.ok ? r.json().catch(() => []) : []))
          .catch(() => []),
      ]);
      if (cancelled) return;
      if (Array.isArray(pRes)) setProducts(pRes);
      if (Array.isArray(nRes)) {
        setNotifications(nRes.filter((n: any) => n.userId === user.id || !n.userId));
      }
      setDetailLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id, apiFetch]);

  // ---- helper：日期选项 & 范围 & 过滤 ----
  const getDateFilterOptions = (): DateFilter[] => [
    { label: lang === "en" ? "This Month" : lang === "zh-CN" ? "本月" : "本月", value: "this_month" },
    { label: lang === "en" ? "Last Month" : lang === "zh-CN" ? "上月" : "上月", value: "last_month" },
    { label: lang === "en" ? "Last 7 Days" : lang === "zh-CN" ? "近七天" : "近七天", value: "last_7_days" },
    { label: lang === "en" ? "Custom" : lang === "zh-CN" ? "自定义" : "自訂", value: "custom" },
  ];
  const getDateRange = () => {
    const now = new Date(); const start = new Date(); const end = new Date();
    switch (dateFilter) {
      case "this_month": start.setDate(1); start.setHours(0,0,0,0); end.setHours(23,59,59,999); break;
      case "last_month": start.setMonth(start.getMonth()-1); start.setDate(1); start.setHours(0,0,0,0); end.setDate(0); end.setHours(23,59,59,999); break;
      case "last_7_days": start.setDate(start.getDate()-7); start.setHours(0,0,0,0); end.setHours(23,59,59,999); break;
      case "custom":
        if (customDateRange.start) start.setTime(new Date(customDateRange.start).getTime());
        if (customDateRange.end) end.setTime(new Date(customDateRange.end).getTime());
        start.setHours(0,0,0,0); end.setHours(23,59,59,999); break;
    }
    return { start, end };
  };

  const filteredOrders = useMemo(() => {
    const { start, end } = getDateRange();
    const safe = Array.isArray(orders) ? orders : [];
    return safe.filter((order) => {
      const orderDate = order.date ? new Date(order.date) : new Date(0);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, dateFilter, customDateRange.start, customDateRange.end]);

  const shippingRecords = useMemo(() => {
    if (!credit?.transactions) return [];
    const txns = Array.isArray(credit.transactions) ? credit.transactions : [];
    return txns.filter((txn) =>
      txn.type === "order_deduct" && txn.note?.includes("Shipping fee")
    );
  }, [credit?.transactions]);

  // 统计：优先 summary，否则走前端过滤
  const stats = useMemo(() => {
    if (summary?.orders) {
      return {
        totalOrders: Number(summary.orders.count) || 0,
        // summary 的 revenue 不含运费但没过滤 cancelled，这里近似处理：
        // 代理商关心实际消费，用 summary.orders.revenue（后端聚合不区分 cancelled 因为只 1 次查询性能最优）
        totalSpent: Number(summary.orders.revenue) || 0,
        totalShippingFees: Number(summary.orders.shippingFees) || 0,
      };
    }
    // 降级：旧逻辑
    const filtered = filteredOrders;
    return {
      totalOrders: filtered.length,
      totalSpent: filtered.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + (o.total || 0), 0),
      totalShippingFees: filtered.filter((o) => o.shippingFee && o.shippingFee > 0).reduce((sum, o) => sum + (o.shippingFee || 0), 0),
    };
  }, [summary, filteredOrders]);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n) => !n.read).length;
  const safeProducts = Array.isArray(products) ? products : [];
  const dateOptions = getDateFilterOptions();

  // 计算已购买商品统计（按SKU聚合，含图片和名称）
  // 优先 summary.topProducts（无需等全量订单），否则走 detail 计算
  const purchasedProducts = useMemo(() => {
    if (summary?.topProducts && Array.isArray(summary.topProducts) && summary.topProducts.length > 0) {
      // 已按 revenue 排序，转为数量排序（更贴合代理视角"买了多少"）
      return summary.topProducts
        .map((p: any) => ({
          name: p.name,
          sku: p.sku,
          image: p.image || "",
          qty: Number(p.qty) || 0,
          total: Number(p.revenue) || 0,
        }))
        .sort((a: any, b: any) => b.qty - a.qty);
    }
    const productMap = new Map<string, { name: string; sku: string; image: string; qty: number; total: number }>();

    filteredOrders.forEach((o) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const key = item.productId || item.sku || item.name;
          const product = safeProducts.find((p: any) => p.id === item.productId);
          const image = item.image || product?.images?.[0] || "";
          const qty = item.quantity || item.qty || 1;
          const existing = productMap.get(key);
          if (existing) {
            existing.qty += qty;
            existing.total += (item.price || 0) * qty;
          } else {
            productMap.set(key, {
              name: item.name,
              sku: item.sku || "",
              image,
              qty,
              total: (item.price || 0) * qty,
            });
          }
        });
      }
    });

    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
  }, [summary, filteredOrders, safeProducts]);

  return (
    <AgentLayout title={lang === "en" ? "Welcome back" : lang === "zh-CN" ? "欢迎回来" : "歡迎回來"} subtitle={user?.company || user?.name}>
      {/* 日期筛选器 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Calendar className="w-4 h-4" />
            {dateOptions.find((o) => o.value === dateFilter)?.label}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-10 min-w-[160px]">
              {dateOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setDateFilter(option.value);
                    setShowDatePicker(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 first:rounded-t-xl last:rounded-b-xl ${
                    dateFilter === option.value ? "text-emerald-500 font-medium" : ""
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
          <div className="flex items-center gap-2 text-sm">
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
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("orders")} value={formatNumber(stats.totalOrders)} icon={Package} accent="emerald" />
        <StatCard label={lang === "en" ? "Total spent" : lang === "zh-CN" ? "累计消费" : "累計消費"} value={formatCurrency(stats.totalSpent, currency)} icon={CreditCard} accent="emerald" />
        <StatCard label={lang === "en" ? "Shipping fees" : lang === "zh-CN" ? "运费支出" : "運費支出"} value={formatCurrency(stats.totalShippingFees, currency)} icon={Truck} accent="amber" />
        <StatCard label={lang === "en" ? "Credit available" : lang === "zh-CN" ? "可用额度" : "可用額度"} value={formatCurrency(credit?.available ?? 0, currency)} icon={CreditCard} accent="amber" />
      </div>

      {/* 已购买商品统计 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">
              {lang === "en" ? "Purchased Products" : lang === "zh-CN" ? "已购买商品统计" : "已購買商品統計"}
            </h2>
            <div className="text-xs text-slate-500">
              {lang === "en"
                ? "Total quantity purchased per product"
                : lang === "zh-CN"
                ? "每个商品已购买总数量"
                : "每個商品已購買總數量"}
            </div>
          </div>
          {purchasedProducts.length > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-500">{lang === "en" ? "Total Items" : lang === "zh-CN" ? "总件数" : "總件數"}</div>
              <div className="text-2xl font-bold text-emerald-500">
                {formatNumber(purchasedProducts.reduce((s, p) => s + p.qty, 0))}
              </div>
            </div>
          )}
        </div>
        {purchasedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {purchasedProducts.map((p, idx) => (
              <div key={p.sku + idx} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:shadow-md transition-shadow">
                <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-3">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                  <div className="absolute top-2 right-2 min-w-[32px] h-8 px-2 bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center justify-center shadow-md">
                    ×{p.qty}
                  </div>
                </div>
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-slate-500 font-mono truncate">{p.sku}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{lang === "en" ? "Qty" : lang === "zh-CN" ? "数量" : "數量"}</span>
                  <span className="text-lg font-bold text-emerald-600">{formatNumber(p.qty)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{lang === "en" ? "No purchased products in this period" : lang === "zh-CN" ? "该时段暂无已购买商品" : "該時段暫無已購買商品"}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* 订单列表 */}
        <div className="xl:col-span-2 card p-5">
          <h2 className="text-base font-semibold mb-4">{t("recent_orders")}</h2>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{lang === "en" ? "No orders in this period" : lang === "zh-CN" ? "该时段暂无订单" : "該時段暫無訂單"}</p>
            </div>
          ) : (
            <div className="scrollable">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("order_no")}</th>
                    <th>{t("order_date")}</th>
                    <th>{lang === "en" ? "Amount" : lang === "zh-CN" ? "金额" : "金額"}</th>
                    <th>{lang === "en" ? "Shipping Fee" : lang === "zh-CN" ? "运费" : "運費"}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">{o.orderNo}</td>
                      <td>{parseOrderDate(o.date).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })}</td>
                      <td className="font-medium">{formatCurrency(o.total, currency)}</td>
                      <td className={o.shippingFee ? "text-orange-600 font-medium" : "text-slate-400"}>
                        {o.shippingFee ? formatCurrency(o.shippingFee, currency) : "—"}
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 账户信息 */}
        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4">{t("account_info")}</h2>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xl font-semibold">
              {(user?.name || "A").charAt(0)}
            </div>
            <div>
              <div className="font-semibold">{user?.name}</div>
              <div className="text-sm text-slate-500">{user?.email}</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">{t("agent_level")}</span><span className="font-semibold">{user?.level || "A"}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">{lang === "en" ? "Company" : lang === "zh-CN" ? "公司" : "公司"}</span><span className="font-semibold">{user?.company || "—"}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">{lang === "en" ? "Country" : lang === "zh-CN" ? "国家" : "國家"}</span><span className="font-semibold">{user?.country || "—"}</span></div>
          </div>

          {/* 信用账户面板 */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
            <div className="text-xs text-emerald-500 font-medium mb-3">{lang === "en" ? "Credit Account" : lang === "zh-CN" ? "信用账户" : "信用帳戶"}</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{lang === "en" ? "Credit limit" : lang === "zh-CN" ? "信用额度" : "信用額度"}</span>
                <span className="text-sm font-semibold">{formatCurrency(credit?.creditLimit ?? 0, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{lang === "en" ? "Outstanding" : lang === "zh-CN" ? "已用额度" : "已用額度"}</span>
                <span className="text-sm font-semibold text-amber-600">{formatCurrency(credit?.outstanding ?? 0, currency)}</span>
              </div>
              <div className="h-1.5 bg-emerald-500/15 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${credit && credit.creditLimit > 0 ? Math.min(100, (credit.outstanding / credit.creditLimit) * 100) : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{lang === "en" ? "Available" : lang === "zh-CN" ? "可用额度" : "可用額度"}</span>
                <span className="text-sm font-bold text-emerald-500">{formatCurrency(credit?.available ?? 0, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 运费记录 */}
      <div className="card p-5 mb-6">
        <h2 className="text-base font-semibold mb-4">
          {lang === "en" ? "Shipping Fee Records" : lang === "zh-CN" ? "运费记录" : "運費記錄"}
        </h2>
        {shippingRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{lang === "en" ? "No shipping fee records" : lang === "zh-CN" ? "暂无运费记录" : "暫無運費記錄"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shippingRecords.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {record.note?.replace("Shipping fee for ", "") || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(record.time).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Shanghai" })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-orange-600">
                    -{formatCurrency(Math.abs(record.amount), currency)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {lang === "en" ? "Balance" : lang === "zh-CN" ? "余额" : "餘額"}: {formatCurrency(record.balance, currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 通知 */}
      <div className="card p-5">
        <h2 className="text-base font-semibold mb-4">{t("notifications")}</h2>
        {safeNotifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{lang === "en" ? "No notifications" : lang === "zh-CN" ? "暂无通知" : "暫無通知"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {safeNotifications.slice(0, 4).map((n) => (
              <div key={n.id} className={`rounded-xl border p-3 ${n.read ? "border-slate-200 dark:border-slate-800" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="text-sm text-slate-500">{n.message}</div>
                  </div>
                  <div className="text-xs text-slate-400">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
