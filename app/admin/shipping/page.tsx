"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { orders } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { Truck, Package } from "lucide-react";

export default function ShippingPage() {
  const { t, currency, lang } = useApp();
  const shippable = orders.filter((o) => (o.status as any) === "pending_shipment" || (o.status as any) === "shipped");
  const carriers = ["Royal Mail", "Evri", "DPD", "UPS", "DHL"];

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

      <PageCard title={lang === "en" ? "Shipments" : lang === "zh-CN" ? "发货单" : "發貨單"}>
        <div className="scrollable">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("order_no")}</th>
                <th>{lang === "en" ? "Customer" : lang === "zh-CN" ? "客户" : "客戶"}</th>
                <th>{t("shipping_address")}</th>
                <th>{t("amount")}</th>
                <th>{t("carrier")}</th>
                <th>{t("tracking_number")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {shippable.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs">{o.orderNo}</td>
                  <td className="font-medium">{o.company}</td>
                  <td className="text-sm text-slate-500 max-w-[220px]">{o.shippingAddress}</td>
                  <td className="font-medium">{formatCurrency(o.total, currency)}</td>
                  <td>{o.carrier || "—"}</td>
                  <td className="font-mono text-xs">{o.trackingNumber || "—"}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </AdminLayout>
  );
}
