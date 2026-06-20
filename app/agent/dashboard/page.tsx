"use client";

import { useState, useEffect } from "react";
import { AgentLayout } from "@/components/Layout";
import { StatCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
  shippingFee?: number;
  shippedAt?: string;
}

interface DateFilter {
  label: string;
  value: string;
}

export default function AgentDashboard() {
  const { t, user, currency, lang } = useApp();
  const [credit, setCredit] = useState<CreditRecord | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<string>("this_month");
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 获取日期过滤选项
  const getDateFilterOptions = (): DateFilter[] => {
    return [
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
    }
    return { start, end };
  };

  // 筛选订单
  const getFilteredOrders = () => {
    const { start, end } = getDateRange();
    return orders.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate >= start && orderDate <= end;
    });
  };

  // 获取运费记录（从信用交易中筛选）
  const getShippingFeeRecords = () => {
    if (!credit?.transactions) return [];
    return credit.transactions.filter((txn) =>
      txn.type === "order_deduct" && txn.note?.includes("Shipping fee")
    );
  };

  // 计算统计数据
  const getStats = () => {
    const filteredOrders = getFilteredOrders();
    const totalOrders = filteredOrders.length;
    const totalSpent = filteredOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);
    const totalShippingFees = filteredOrders
      .filter((o) => o.shippingFee && o.shippingFee > 0)
      .reduce((sum, o) => sum + (o.shippingFee || 0), 0);

    return { totalOrders, totalSpent, totalShippingFees };
  };

  useEffect(() => {
    if (!user?.id) return;

    // 获取信用记录
    fetch(`/api/credit?agentId=${user.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setCredit(data); });

    // 获取订单
    fetch("/api/orders")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const myOrders = Array.isArray(data) ? data.filter((o: Order) => o.agentId === user.id) : [];
        setOrders(myOrders);
      });

    // 获取通知（如果 API 存在）
    fetch("/api/notifications")
      .then((r) => r.ok ? r.json() : [])
      .catch(() => [])
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data.filter((n: any) => n.userId === user.id || !n.userId));
        }
      });
  }, [user?.id]);

  const stats = getStats();
  const filteredOrders = getFilteredOrders();
  const shippingRecords = getShippingFeeRecords();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const dateOptions = getDateFilterOptions();

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
        <StatCard label={t("orders")} value={formatNumber(stats.totalOrders)} icon={Package} accent="indigo" />
        <StatCard label={lang === "en" ? "Total spent" : lang === "zh-CN" ? "累计消费" : "累計消費"} value={formatCurrency(stats.totalSpent, currency)} icon={CreditCard} accent="emerald" />
        <StatCard label={lang === "en" ? "Shipping fees" : lang === "zh-CN" ? "运费支出" : "運費支出"} value={formatCurrency(stats.totalShippingFees, currency)} icon={Truck} accent="orange" />
        <StatCard label={lang === "en" ? "Credit available" : lang === "zh-CN" ? "可用额度" : "可用額度"} value={formatCurrency(credit?.available ?? 0, currency)} icon={CreditCard} accent="amber" />
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
                      <td>{new Date(o.date).toLocaleDateString()}</td>
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
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-semibold">
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
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900">
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-3">{lang === "en" ? "Credit Account" : lang === "zh-CN" ? "信用账户" : "信用帳戶"}</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{lang === "en" ? "Credit limit" : lang === "zh-CN" ? "信用额度" : "信用額度"}</span>
                <span className="text-sm font-semibold">{formatCurrency(credit?.creditLimit ?? 0, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{lang === "en" ? "Outstanding" : lang === "zh-CN" ? "已用额度" : "已用額度"}</span>
                <span className="text-sm font-semibold text-amber-600">{formatCurrency(credit?.outstanding ?? 0, currency)}</span>
              </div>
              <div className="h-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${credit && credit.creditLimit > 0 ? Math.min(100, (credit.outstanding / credit.creditLimit) * 100) : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{lang === "en" ? "Available" : lang === "zh-CN" ? "可用额度" : "可用額度"}</span>
                <span className="text-sm font-bold text-indigo-600">{formatCurrency(credit?.available ?? 0, currency)}</span>
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
                      {new Date(record.time).toLocaleString()}
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
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{lang === "en" ? "No notifications" : lang === "zh-CN" ? "暂无通知" : "暫無通知"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 4).map((n) => (
              <div key={n.id} className={`rounded-xl border p-3 ${n.read ? "border-slate-200 dark:border-slate-800" : "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20"}`}>
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
