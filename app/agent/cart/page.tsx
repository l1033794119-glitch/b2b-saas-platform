"use client";

import { useState, useEffect } from "react";
import { AgentLayout } from "@/components/Layout";
import { PageCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { useCart } from "@/lib/cart";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, AlertCircle, CheckCircle, X, MapPin, Phone, Mail, User } from "lucide-react";

interface ShippingInfo {
  address: string;
  postalCode: string;
  country: string;
  contactName: string;
  phone: string;
  email: string;
}

interface ProductStock {
  id: string;
  stock: number;
}

export default function CartPage() {
  const { t, currency, lang, user } = useApp();
  return (
    <AgentLayout title={t("shopping_cart")}>
      <CartInner t={t} currency={currency} lang={lang} agentId={user?.id} />
    </AgentLayout>
  );
}

function CartInner({ t, currency, lang, agentId }: { t: any; currency: string; lang: string; agentId?: string }) {
  const { items, update, remove, total, count, clear } = useCart();
  const [creditData, setCreditData] = useState<{ limit: number; used: number; available: number } | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [productStocks, setProductStocks] = useState<Map<string, number>>(new Map());
  const [stockWarning, setStockWarning] = useState<string>("");

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    address: "",
    postalCode: "",
    country: "",
    contactName: "",
    phone: "",
    email: "",
  });

  const subtotal = total;
  const discount = subtotal > 500 ? subtotal * 0.05 : 0;
  const grandTotal = subtotal - discount;

  // Fetch credit info
  const fetchCredit = async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/credit?agentId=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        // Map API field names to expected names
        setCreditData({
          limit: data.creditLimit,
          used: data.outstanding,
          available: data.available,
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchCredit();
  }, [agentId]);

  // Calculate credit usage percentage
  const creditUsedPercent = creditData ? (creditData.used / creditData.limit) * 100 : 0;
  const creditAvailablePercent = creditData ? (creditData.available / creditData.limit) * 100 : 100;

  // Fetch product stocks
  const fetchProductStocks = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const products = await res.json();
        const stockMap = new Map<string, number>();
        products.forEach((p: ProductStock) => {
          stockMap.set(p.id, p.stock);
        });
        setProductStocks(stockMap);
      }
    } catch {}
  };

  useEffect(() => {
    fetchProductStocks();
  }, []);

  // Handle quantity update with stock validation
  const handleUpdate = (productId: string, qty: number) => {
    const maxStock = productStocks.get(productId) ?? 0;
    if (qty > maxStock) {
      setStockWarning(lang === "en" ? `Maximum available stock: ${maxStock}` : lang === "zh-CN" ? `最高可用库存: ${maxStock}` : `最高可用庫存: ${maxStock}`);
      update(productId, maxStock);
    } else {
      setStockWarning("");
      update(productId, qty);
    }
  };

  const handleCheckout = async () => {
    if (!agentId) {
      setMessage(lang === "en" ? "Please login first" : lang === "zh-CN" ? "请先登录" : "請先登入");
      setStatus("error");
      return;
    }

    if (items.length === 0) return;

    setShowCheckoutModal(true);
  };

  const handleSubmitOrder = async () => {
    if (!agentId) return;

    // Validate shipping info
    if (!shippingInfo.address || !shippingInfo.contactName || !shippingInfo.phone || !shippingInfo.email) {
      setMessage(lang === "en" ? "Please fill in all required fields" : lang === "zh-CN" ? "请填写所有必填字段" : "請填寫所有必填欄位");
      setStatus("error");
      return;
    }

    if (creditData && creditData.available < grandTotal) {
      setMessage(`${lang === "en" ? "Insufficient credit" : lang === "zh-CN" ? "信用额度不足" : "信用額度不足"}. ${lang === "en" ? "Available" : lang === "zh-CN" ? "可用额度" : "可用額度"}: ${formatCurrency(creditData.available, currency)}`);
      setStatus("error");
      return;
    }

    setStatus("submitting");

    const orderItems = items.map((i) => ({
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      price: i.price,
      quantity: i.qty,
      image: i.image || "",
    }));

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        items: orderItems,
        total: grandTotal,
        shippingAddress: shippingInfo.address,
        postalCode: shippingInfo.postalCode,
        country: shippingInfo.country,
        contactName: shippingInfo.contactName,
        phone: shippingInfo.phone,
        email: shippingInfo.email,
        note: "",
      }),
    });

    if (orderRes.ok) {
      clear();
      setShowCheckoutModal(false);
      setStatus("success");
      setMessage(lang === "en" ? "Order submitted successfully!" : lang === "zh-CN" ? "订单提交成功！" : "訂單提交成功！");
      fetchCredit();
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 3000);
    } else {
      const err = await orderRes.json();
      setMessage(err.error || (lang === "en" ? "Failed to submit order" : lang === "zh-CN" ? "订单提交失败" : "訂單提交失敗"));
      setStatus("error");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PageCard>
            {status === "success" ? (
              <div className="text-center py-16">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
                <div className="font-medium text-lg text-emerald-600">{message}</div>
                <div className="text-sm text-slate-500 mt-2">{lang === "en" ? "Your order has been placed" : lang === "zh-CN" ? "您的订单已提交" : "您的訂單已提交"}</div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <div className="font-medium">{lang === "en" ? "Your cart is empty" : lang === "zh-CN" ? "购物车是空的" : "購物車是空的"}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {stockWarning && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {stockWarning}
                  </div>
                )}
                {items.map((i) => (
                  <div key={i.productId} className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
                      {i.image ? (
                        <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{i.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{i.sku}</div>
                      <div className="text-xs text-slate-400">
                        {lang === "en" ? "Available:" : lang === "zh-CN" ? "库存:" : "庫存:"} {productStocks.get(i.productId) ?? 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdate(i.productId, i.qty - 1)} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                      <input className="input !w-16 !py-1.5 text-center" value={i.qty} onChange={(e) => handleUpdate(i.productId, parseInt(e.target.value) || 0)} />
                      <button onClick={() => handleUpdate(i.productId, i.qty + 1)} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="w-24 text-right font-semibold">{formatCurrency(i.price * i.qty, currency)}</div>
                    <button onClick={() => remove(i.productId)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </div>

        <div>
          {/* Credit Usage Display */}
          {creditData && (
            <div className="card p-5 mb-4">
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {lang === "en" ? "Credit Usage" : lang === "zh-CN" ? "信用额度使用情况" : "信用額度使用情況"}
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{lang === "en" ? "Credit Limit" : lang === "zh-CN" ? "信用额度" : "信用額度"}</span>
                  <span className="font-medium">{formatCurrency(creditData.limit, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{lang === "en" ? "Used" : lang === "zh-CN" ? "已使用" : "已使用"}</span>
                  <span className="font-medium text-rose-600">{formatCurrency(creditData.used, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{lang === "en" ? "Available" : lang === "zh-CN" ? "可用额度" : "可用額度"}</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(creditData.available, currency)}</span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min(creditUsedPercent, 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-400 text-right">
                {creditUsedPercent.toFixed(1)}% {lang === "en" ? "used" : lang === "zh-CN" ? "已使用" : "已使用"}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="text-base font-semibold mb-4">{lang === "en" ? "Order summary" : lang === "zh-CN" ? "订单摘要" : "訂單摘要"}</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-slate-500">{t("subtotal")}</span><span className="font-medium">{formatCurrency(subtotal, currency)}</span></div>
              {discount > 0 && <div className="flex justify-between text-emerald-600"><span>{t("discount")}</span><span className="font-medium">-{formatCurrency(discount, currency)}</span></div>}
              <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-800"><span className="font-semibold">{t("grand_total")}</span><span className="text-lg font-bold text-indigo-600">{formatCurrency(grandTotal, currency)}</span></div>
            </div>

            {/* Credit Warning */}
            {creditData && creditData.available < grandTotal && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 mb-4">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-rose-600">
                  {lang === "en" ? "Insufficient credit" : lang === "zh-CN" ? "信用额度不足" : "信用額度不足"}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-2">
                <CreditCard className="w-3.5 h-3.5" />
                {lang === "en" ? "Credit payment" : lang === "zh-CN" ? "信用支付" : "信用支付"}
              </div>
              <div className="text-sm">
                {lang === "en" ? "Order amount will be deducted from your credit limit" : lang === "zh-CN" ? "订单金额将从信用额度中扣除" : "訂單金額將從信用額度中扣除"}
              </div>
            </div>

            {status === "error" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 mb-4">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-rose-600">{message}</div>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || (creditData ? creditData.available < grandTotal : false)}
              className="btn-primary w-full justify-center flex items-center gap-2 py-3 disabled:opacity-50"
            >
              {t("checkout")}
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {lang === "en" ? "Checkout" : lang === "zh-CN" ? "结账" : "結賬"}
              </h2>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Order Summary in Modal */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                <div className="text-sm font-medium mb-2">{lang === "en" ? "Order Summary" : lang === "zh-CN" ? "订单摘要" : "訂單摘要"}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">{t("subtotal")}</span><span>{formatCurrency(subtotal, currency)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-emerald-600"><span>{t("discount")}</span><span>-{formatCurrency(discount, currency)}</span></div>}
                  <div className="flex justify-between font-semibold pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>{t("grand_total")}</span>
                    <span className="text-indigo-600">{formatCurrency(grandTotal, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Info Form */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {lang === "en" ? "Shipping Information" : lang === "zh-CN" ? "收货信息" : "貨運資訊"}
                </h3>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {lang === "en" ? "Contact Name *" : lang === "zh-CN" ? "联系人姓名 *" : "聯絡人姓名 *"}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input !pl-12"
                      placeholder={lang === "en" ? "Enter contact name" : lang === "zh-CN" ? "输入联系人姓名" : "輸入聯絡人姓名"}
                      value={shippingInfo.contactName}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, contactName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {lang === "en" ? "Phone *" : lang === "zh-CN" ? "电话 *" : "電話 *"}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input !pl-12"
                      placeholder={lang === "en" ? "Enter phone number" : lang === "zh-CN" ? "输入电话号码" : "輸入電話號碼"}
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {lang === "en" ? "Email *" : lang === "zh-CN" ? "邮箱 *" : "郵箱 *"}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input !pl-12"
                      type="email"
                      placeholder={lang === "en" ? "Enter email address" : lang === "zh-CN" ? "输入邮箱地址" : "輸入郵箱地址"}
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {lang === "en" ? "Shipping Address *" : lang === "zh-CN" ? "收货地址 *" : "收貨地址 *"}
                  </label>
                  <textarea
                    className="input min-h-[80px]"
                    placeholder={lang === "en" ? "Enter detailed shipping address" : lang === "zh-CN" ? "输入详细收货地址" : "輸入詳細收貨地址"}
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      {lang === "en" ? "Postal Code" : lang === "zh-CN" ? "邮政编码" : "郵遞區號"}
                    </label>
                    <input
                      className="input"
                      placeholder={lang === "en" ? "Enter postal code" : lang === "zh-CN" ? "输入邮政编码" : "輸入郵遞區號"}
                      value={shippingInfo.postalCode}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      {lang === "en" ? "Country" : lang === "zh-CN" ? "国家" : "國家"}
                    </label>
                    <input
                      className="input"
                      placeholder={lang === "en" ? "Enter country" : lang === "zh-CN" ? "输入国家" : "輸入國家"}
                      value={shippingInfo.country}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {status === "error" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-rose-600">{message}</div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 btn-ghost justify-center"
                >
                  {lang === "en" ? "Cancel" : lang === "zh-CN" ? "取消" : "取消"}
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={status === "submitting"}
                  className="flex-1 btn-primary justify-center flex items-center gap-2"
                >
                  {status === "submitting" && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {status === "submitting" ? (lang === "en" ? "Submitting..." : lang === "zh-CN" ? "提交中..." : "提交中...") : (lang === "en" ? "Place Order" : lang === "zh-CN" ? "提交订单" : "提交訂單")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
