"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Plus, Search, Mail, Phone, Globe, Check, Key, X, Trash2 } from "lucide-react";

interface Agent {
  id: string;
  company: string;
  contact: string;
  email: string;
  password?: string;
  phone: string;
  country: string;
  level: "A" | "B" | "C";
  status: "active" | "pending" | "disabled";
  creditLimit: number;
  outstanding: number;
  joinDate: string;
}

export default function AgentsPage() {
  const { t, currency, lang } = useApp();
  const [data, setData] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filtered = data.filter((a) => {
    const mq = !q || a.company.toLowerCase().includes(q.toLowerCase()) || a.contact.toLowerCase().includes(q.toLowerCase()) || a.email.toLowerCase().includes(q.toLowerCase());
    const mf = flt === "all" || a.status === flt;
    return mq && mf;
  });

  const approve = async (id: string) => {
    try {
      const res = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id, status: "active" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => prev.map((a) => a.id === id ? updated : a));
      }
    } catch {
      // ignore
    }
  };

  const disable = async (id: string) => {
    try {
      const res = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id, status: "disabled" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData((prev) => prev.map((a) => a.id === id ? updated : a));
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async (agent: Partial<Agent>) => {
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
      });
      if (res.ok) {
        const saved = await res.json();
        setData((prev) => {
          const idx = prev.findIndex((a) => a.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved];
        });
        setStatus("success");
        setMessage(lang === "en" ? "Agent added successfully!" : lang === "zh-CN" ? "代理商添加成功！" : "代理商新增成功！");
        setTimeout(() => {
          setShowForm(false);
          setEditing(null);
          setStatus("idle");
          setMessage("");
        }, 1500);
      } else {
        const err = await res.json();
        setMessage(err.error || (lang === "en" ? "Failed to add agent" : lang === "zh-CN" ? "添加失败" : "新增失敗"));
        setStatus("error");
      }
    } catch {
      setMessage(lang === "en" ? "Network error" : lang === "zh-CN" ? "网络错误" : "網路錯誤");
      setStatus("error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "en" ? "Delete this agent?" : lang === "zh-CN" ? "删除此代理商？" : "刪除此代理商？")) return;
    try {
      const res = await fetch(`/api/agents?agentId=${id}`, { method: "DELETE" });
      if (res.ok) {
        setData((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // ignore
    }
  };

  return (
    <AdminLayout title={t("agents")} subtitle={`${formatNumber(data.length)} ${lang === "en" ? "agents" : lang === "zh-CN" ? "代理商" : "代理商"}`}>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-11 py-2.5" placeholder={lang === "en" ? "Search agents..." : lang === "zh-CN" ? "搜索代理商..." : "搜尋代理商..."} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select py-2.5 w-auto" value={flt} onChange={(e) => setFlt(e.target.value)}>
          {[
            { id: "all", label: lang === "en" ? "All" : lang === "zh-CN" ? "全部" : "全部" },
            { id: "active", label: t("active") },
            { id: "pending", label: t("pending") },
            { id: "disabled", label: t("disabled") },
          ].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {lang === "en" ? "Add agent" : lang === "zh-CN" ? "添加代理商" : "新增代理商"}</button>
      </div>

      {showForm && (
        <AgentForm
          agent={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); setStatus("idle"); setMessage(""); }}
          lang={lang}
          currency={currency}
          status={status}
          message={message}
        />
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">{lang === "en" ? "Loading..." : "加载中..."}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold">
                  {a.company.charAt(0)}
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="font-semibold text-lg">{a.company}</div>
              <div className="text-sm text-slate-500 mb-3">{a.contact}</div>
              <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300 mb-4">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {a.email}</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {a.phone}</div>
                <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> {a.country}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 mb-4">
                <div>
                  <div className="text-xs text-slate-500">{t("agent_level")}</div>
                  <div className="font-semibold">{a.level}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{lang === "en" ? "Credit" : lang === "zh-CN" ? "信用额度" : "信用額度"}</div>
                  <div className="font-semibold">{formatCurrency(a.creditLimit, currency)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t("outstanding_balance")}</div>
                  <div className="font-semibold text-amber-600">{formatCurrency(a.outstanding, currency)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{lang === "en" ? "Joined" : lang === "zh-CN" ? "加入时间" : "加入時間"}</div>
                  <div className="font-semibold text-sm">{a.joinDate}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {a.status === "pending" && (
                  <button onClick={() => approve(a.id)} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> {t("approve")}</button>
                )}
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-1.5"><Key className="w-3.5 h-3.5" /> {lang === "en" ? "Edit" : lang === "zh-CN" ? "编辑" : "編輯"}</button>
                <button onClick={() => handleDelete(a.id)} className="btn-ghost flex-1 py-2 text-sm text-red-600 flex items-center justify-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> {lang === "en" ? "Delete" : lang === "zh-CN" ? "删除" : "刪除"}</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-500">{lang === "en" ? "No agents found" : lang === "zh-CN" ? "暂无代理商" : "暫無代理商"}</div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function AgentForm({ agent, onSave, onClose, lang, currency, status, message }: {
  agent: Partial<Agent> | null;
  onSave: (a: Partial<Agent>) => void;
  onClose: () => void;
  lang: string;
  currency: string;
  status: string;
  message: string;
}) {
  const [form, setForm] = useState<Partial<Agent>>(agent || {
    company: "",
    contact: "",
    email: "",
    password: "agent123",
    phone: "",
    country: "",
    level: "B",
    status: "active",
    creditLimit: 10000,
    outstanding: 0,
  });

  const set = (key: keyof Agent, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{agent ? (lang === "en" ? "Edit Agent" : "编辑代理商") : (lang === "en" ? "Add Agent" : "添加代理商")}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
              <Check className="w-5 h-5 text-emerald-500" />
              <div className="text-sm text-emerald-700">{message}</div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
              <X className="w-4 h-4 text-rose-500" />
              <div className="text-sm text-rose-600">{message}</div>
            </div>
          )}

          <div>
            <label className="label">{lang === "en" ? "Company Name" : "公司名称"}</label>
            <input className="input" value={form.company || ""} onChange={(e) => set("company", e.target.value)} placeholder={lang === "en" ? "Enter company name..." : lang === "zh-CN" ? "输入公司名称..." : "輸入公司名稱..."} />
          </div>

          <div>
            <label className="label">{lang === "en" ? "Contact Person" : "联系人"}</label>
            <input className="input" value={form.contact || ""} onChange={(e) => set("contact", e.target.value)} placeholder={lang === "en" ? "Enter contact name..." : lang === "zh-CN" ? "输入联系人姓名..." : "輸入聯絡人姓名..."} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === "en" ? "Email (Login)" : "邮箱（登录账号）"}</label>
              <input className="input" type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="agent@example.com" />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Password" : "密码"}</label>
              <input className="input" type="text" value={form.password || ""} onChange={(e) => set("password", e.target.value)} placeholder={lang === "en" ? "Default: agent123" : lang === "zh-CN" ? "默认: agent123" : "預設: agent123"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === "en" ? "Phone" : "电话"}</label>
              <input className="input" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Country" : "国家"}</label>
              <input className="input" value={form.country || ""} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === "en" ? "Agent Level" : "代理级别"}</label>
              <select className="select" value={form.level || "B"} onChange={(e) => set("level", e.target.value)}>
                <option value="A">{lang === "en" ? "Level A (Best Price)" : "A级（最优价格）"}</option>
                <option value="B">{lang === "en" ? "Level B (Standard)" : "B级（标准）"}</option>
                <option value="C">{lang === "en" ? "Level C (Basic)" : "C级（基础）"}</option>
              </select>
            </div>
            <div>
              <label className="label">{lang === "en" ? "Status" : "状态"}</label>
              <select className="select" value={form.status || "active"} onChange={(e) => set("status", e.target.value)}>
                <option value="active">{lang === "en" ? "Active" : "正常"}</option>
                <option value="pending">{lang === "en" ? "Pending" : "待审核"}</option>
                <option value="disabled">{lang === "en" ? "Disabled" : "已禁用"}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">{lang === "en" ? "Credit Limit" : "信用额度"} ({currency})</label>
            <input className="input" type="number" value={form.creditLimit || 10000} onChange={(e) => set("creditLimit", +e.target.value)} />
          </div>

          {agent && (
            <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              {lang === "en" ? `Agent ID: ${agent.id}` : lang === "zh-CN" ? `代理商ID: ${agent.id}` : `代理商ID: ${agent.id}`} · {lang === "en" ? `Joined: ${agent.joinDate}` : lang === "zh-CN" ? `加入时间: ${agent.joinDate}` : `加入時間: ${agent.joinDate}`}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} disabled={status === "submitting"} className="flex-1 btn-ghost py-2.5">{lang === "en" ? "Cancel" : "取消"}</button>
          <button onClick={() => onSave(form)} disabled={status === "submitting"} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
            {status === "submitting" && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Check className="w-4 h-4" />
            {agent ? (lang === "en" ? "Update" : "更新") : (lang === "en" ? "Add Agent" : "添加")}
          </button>
        </div>
      </div>
    </div>
  );
}