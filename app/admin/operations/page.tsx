"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard, StatCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { orders, agents, products } from "@/lib/mockData";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Package, Users, ShoppingCart, Activity } from "lucide-react";

export default function OperationsPage() {
  const { t, currency, lang } = useApp();
  return (
    <AdminLayout title={lang === "en" ? "Operations" : lang === "zh-CN" ? "运营中心" : "營運中心"} subtitle={lang === "en" ? "Monitor business flow" : lang === "zh-CN" ? "监控业务流程" : "監控業務流程"}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("orders")} value={formatNumber(orders.length)} icon={ShoppingCart} accent="indigo" />
        <StatCard label={t("products")} value={formatNumber(products.length)} icon={Package} accent="emerald" />
        <StatCard label={t("agents")} value={formatNumber(agents.length)} icon={Users} accent="amber" />
        <StatCard label={lang === "en" ? "Pending" : lang === "zh-CN" ? "待处理" : "待處理"} value={formatNumber(orders.filter((o) => o.status === "pending_review" || o.status === "pending_payment").length)} icon={Activity} accent="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PageCard title={lang === "en" ? "Orders requiring action" : lang === "zh-CN" ? "需要处理的订单" : "需要處理的訂單"}>
          <div className="scrollable">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("order_no")}</th>
                  <th>{t("customer_name")}</th>
                  <th>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs">{o.orderNo}</td>
                    <td className="font-medium">{o.company}</td>
                    <td className="font-semibold">{formatCurrency(o.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>

        <PageCard title={lang === "en" ? "Low stock products" : lang === "zh-CN" ? "低库存产品" : "低庫存產品"}>
          <div className="space-y-2">
            {products.filter((p) => p.stock < 100).slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                </div>
                <div className="text-amber-600 font-semibold">{p.stock} left</div>
              </div>
            ))}
          </div>
        </PageCard>
      </div>
    </AdminLayout>
  );
}
