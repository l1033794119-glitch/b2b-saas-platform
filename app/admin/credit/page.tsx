"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { RefreshCw, X, Check, CreditCard, AlertCircle, CheckCircle, Trash2, History } from "lucide-react";

interface CreditRecord {
  agentId: string;
  company: string;
  creditLimit: number;
  outstanding: number;
  available: number;
  transactions: CreditTransaction[];
}

interface CreditTransaction {
  id: string;
  type: "admin_set_limit" | "order_deduct" | "repayment" | "admin_writeoff";
  amount: number;
  balance: number;
  note: string;
  time: string;
}

export default function CreditLimitsPage() {
  const { t, currency, lang } = useApp();
  const [records, setRecords] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<CreditRecord | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNote, setEditNote] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "transactions">("overview");

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credit");
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : [data]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const openModal = (record: CreditRecord) => {
    setSelectedAgent(record);
    setEditValue(String(record.creditLimit));
    setEditNote("");
    setStatus("idle");
    setMessage("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAgent(null);
    setEditValue("");
    setEditNote("");
    setStatus("idle");
    setMessage("");
  };

  const handleSetLimit = async () => {
    if (!selectedAgent) return;
    const limit = parseFloat(editValue);
    if (isNaN(limit) || limit < 0) {
      setMessage(lang === "en" ? "Please enter a valid amount" : lang === "zh-CN" ? "请输入有效的金额" : "請輸入有效的金額");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/credit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.agentId,
          action: "set_limit",
          creditLimit: limit,
          note: editNote || (lang === "zh-CN" ? "调整额度" : lang === "zh-TW" ? "調整額度" : "Credit limit adjusted"),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecords((prev) => prev.map((r) => r.agentId === selectedAgent?.agentId ? updated : r));
        setStatus("success");
        setMessage(lang === "en" ? "Credit limit updated successfully!" : lang === "zh-CN" ? "信用额度更新成功！" : "信用額度更新成功！");
        setTimeout(() => { closeModal(); fetchCredits(); }, 1500);
      } else {
        const err = await res.json();
        setMessage(err.error || (lang === "en" ? "Failed to update" : lang === "zh-CN" ? "更新失败" : "更新失敗"));
        setStatus("error");
      }
    } catch {
      setMessage(lang === "en" ? "Network error" : lang === "zh-CN" ? "网络错误" : "網路錯誤");
      setStatus("error");
    }
  };

  const handleClearOutstanding = async () => {
    if (!selectedAgent || selectedAgent.outstanding === 0) return;
    if (!confirm(lang === "en" ? `Clear all outstanding (${formatCurrency(selectedAgent.outstanding, currency)})?` : lang === "zh-CN" ? `确定清零已用额度（${formatCurrency(selectedAgent.outstanding, currency)}）？` : `確定清零已用額度（${formatCurrency(selectedAgent.outstanding, currency)}）？`)) {
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/credit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.agentId,
          action: "clear_outstanding",
          note: editNote || (lang === "zh-CN" ? "已用额度清零" : lang === "zh-TW" ? "已用額度清零" : "Outstanding cleared"),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRecords((prev) => prev.map((r) => r.agentId === selectedAgent?.agentId ? updated : r));
        setStatus("success");
        setMessage(lang === "en" ? "Outstanding cleared successfully!" : lang === "zh-CN" ? "已用额度清零成功！" : "已用額度清零成功！");
        setTimeout(() => { closeModal(); fetchCredits(); }, 1500);
      } else {
        const err = await res.json();
        setMessage(err.error || (lang === "en" ? "Failed to clear" : lang === "zh-CN" ? "清零失败" : "清零失敗"));
        setStatus("error");
      }
    } catch {
      setMessage(lang === "en" ? "Network error" : lang === "zh-CN" ? "网络错误" : "網路錯誤");
      setStatus("error");
    }
  };

  const langMap: Record<string, string> = {
    admin_set_limit: lang === "en" ? "Admin adjustment" : lang === "zh-CN" ? "管理员调整" : "管理員調整",
    order_deduct: lang === "en" ? "Order deduction" : lang === "zh-CN" ? "订单扣减" : "訂單扣減",
    repayment: lang === "en" ? "Payment received" : lang === "zh-CN" ? "还款到账" : "還款到賬",
    admin_writeoff: lang === "en" ? "Write-off" : lang === "zh-CN" ? "已用清零" : "已用清零",
  };
  const txnIcon: Record<string, string> = {
    admin_set_limit: "⚙️",
    order_deduct: "🛒",
    repayment: "💰",
    admin_writeoff: "🗑️",
  };

  return (
    <AdminLayout title={t("credit_limits") || "Credit Limits"} subtitle={lang === "en" ? "Manage agent credit" : lang === "zh-CN" ? "代理商信用额度管理" : "代理商信用額度管理"}>
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === "overview" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
        >
          {lang === "en" ? "All agents" : lang === "zh-CN" ? "所有代理商" : "所有代理商"}
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === "transactions" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
        >
          {lang === "en" ? "Transaction history" : lang === "zh-CN" ? "交易记录" : "交易記錄"}
        </button>
        <button onClick={fetchCredits} className="ml-auto btn-ghost flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {lang === "en" ? "Refresh" : lang === "zh-CN" ? "刷新" : "刷新"}
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-16 text-slate-400">{lang === "en" ? "Loading..." : "加载中..."}</div>
          ) : records.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-400">{lang === "en" ? "No agents found" : "暂无代理商数据"}</div>
          ) : (
            records.map((r) => (
              <div key={r.agentId} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">{r.company}</div>
                  <button
                    onClick={() => openModal(r)}
                    className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {lang === "en" ? "Adjust" : lang === "zh-CN" ? "调整" : "調整"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-slate-500">{lang === "en" ? "Credit Limit" : "信用额度"}</div>
                    <div className="font-semibold text-sm">{formatCurrency(r.creditLimit, currency)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">{lang === "en" ? "Outstanding" : "已用额度"}</div>
                    <div className="font-semibold text-sm text-amber-600">{formatCurrency(r.outstanding, currency)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">{lang === "en" ? "Available" : "可用额度"}</div>
                    <div className={`font-semibold text-sm ${r.available < 1000 ? "text-red-500" : "text-emerald-600"}`}>
                      {formatCurrency(r.available, currency)}
                    </div>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-red-400"
                    style={{ width: `${r.creditLimit > 0 ? Math.min(100, (r.outstanding / r.creditLimit) * 100) : 0}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1 text-center">{lang === "en" ? "Usage" : "使用率"}：{r.creditLimit > 0 ? Math.round((r.outstanding / r.creditLimit) * 100) : 0}%</div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <PageCard key={rec.agentId} title={rec.company} subtitle={`${formatCurrency(rec.creditLimit, currency)} — ${formatCurrency(rec.available, currency)} ${lang === "en" ? "available" : lang === "zh-CN" ? "可用" : "可用"}`}>
              {rec.transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">{lang === "en" ? "No transactions yet" : lang === "zh-CN" ? "暂无交易记录" : "暫無交易記錄"}</div>
              ) : (
                <div className="space-y-2">
                  {rec.transactions.slice(0, 20).map((txn) => (
                    <div key={txn.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-2xl">{txnIcon[txn.type] || "📋"}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{langMap[txn.type] || txn.type}</div>
                        <div className="text-xs text-slate-500">{txn.note}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{new Date(txn.time).toLocaleString()}</div>
                      </div>
                      <div className={`text-sm font-semibold ${txn.amount > 0 ? "text-emerald-600" : "text-slate-700 dark:text-slate-200"}`}>
                        {txn.amount > 0 ? "+" : ""}{formatCurrency(txn.amount, currency)}
                      </div>
                      <div className="text-xs text-slate-500">{formatCurrency(txn.balance, currency)}</div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{lang === "en" ? "Adjust Credit Limit" : lang === "zh-CN" ? "调整信用额度" : "調整信用額度"}</h3>
                  <div className="text-sm text-slate-500">{selectedAgent.company}</div>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {status === "success" && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <div className="text-sm text-emerald-700">{message}</div>
                </div>
              )}

              {status === "error" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-rose-600">{message}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="text-center">
                  <div className="text-xs text-slate-500">{lang === "en" ? "Current Limit" : "当前额度"}</div>
                  <div className="font-semibold">{formatCurrency(selectedAgent.creditLimit, currency)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500">{lang === "en" ? "Outstanding" : "已用额度"}</div>
                  <div className="font-semibold text-amber-600">{formatCurrency(selectedAgent.outstanding, currency)}</div>
                </div>
              </div>

              <div>
                <label className="label">{lang === "en" ? "New credit limit" : "新信用额度"} ({currency})</label>
                <input
                  className="input text-lg font-medium"
                  type="number"
                  min="0"
                  step="100"
                  value={editValue}
                  onChange={(e) => { setEditValue(e.target.value); setStatus("idle"); setMessage(""); }}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="label">{lang === "en" ? "Note (optional)" : "备注（可选）"}</label>
                <input
                  className="input"
                  placeholder={lang === "en" ? "Reason for adjustment..." : lang === "zh-CN" ? "调整原因..." : "調整原因..."}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>

              <button
                onClick={handleClearOutstanding}
                disabled={selectedAgent.outstanding === 0 || status === "submitting"}
                className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {lang === "en" ? `Clear outstanding (${formatCurrency(selectedAgent.outstanding, currency)})` : lang === "zh-CN" ? `清零已用额度（${formatCurrency(selectedAgent.outstanding, currency)}）` : `清零已用額度（${formatCurrency(selectedAgent.outstanding, currency)}）`}
              </button>
            </div>

            <div className="flex gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={closeModal}
                disabled={status === "submitting"}
                className="flex-1 btn-ghost py-2.5"
              >
                {lang === "en" ? "Cancel" : "取消"}
              </button>
              <button
                onClick={handleSetLimit}
                disabled={status === "submitting"}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
              >
                {status === "submitting" && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <Check className="w-4 h-4" />
                {lang === "en" ? "Update limit" : lang === "zh-CN" ? "更新额度" : "更新額度"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
