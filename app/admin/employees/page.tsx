"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatNumber } from "@/lib/utils";
import { Plus, Shield, Check, X, Trash2, Search, RefreshCw, Edit2, Lock, Mail, User } from "lucide-react";

// 菜单权限定义：key 必须与 AdminSidebar 中的 menuKey 一致
const MENU_PERMISSIONS = [
  { key: "dashboard", label: "仪表盘", labelEn: "Dashboard" },
  { key: "products", label: "产品管理", labelEn: "Products" },
  { key: "inventory", label: "库存管理", labelEn: "Inventory" },
  { key: "warehouse", label: "仓库管理", labelEn: "Warehouses" },
  { key: "agents", label: "代理商", labelEn: "Agents" },
  { key: "credit", label: "信用额度", labelEn: "Credit Limits" },
  { key: "orders", label: "订单管理", labelEn: "Orders" },
  { key: "shipping", label: "物流管理", labelEn: "Shipping" },
  { key: "finance", label: "财务中心", labelEn: "Finance" },
  { key: "analytics", label: "数据分析", labelEn: "Analytics" },
  { key: "notifications", label: "消息通知", labelEn: "Notifications" },
  { key: "employees", label: "员工管理", labelEn: "Employees" },
  { key: "audit_logs", label: "审计日志", labelEn: "Audit Logs" },
  { key: "settings", label: "系统设置", labelEn: "Settings" },
];

interface Employee {
  id: string;
  name: string;
  email: string;
  password?: string;
  permissions: Record<string, boolean>;
  active: boolean;
  createdAt?: string;
}

export default function EmployeesPage() {
  const { t, lang } = useApp();
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filtered = list.filter((e) => {
    if (!q) return true;
    const qq = q.toLowerCase();
    return (
      e.name.toLowerCase().includes(qq) ||
      e.email.toLowerCase().includes(qq)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
    setStatus("idle");
    setMessage("");
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setShowModal(true);
    setStatus("idle");
    setMessage("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setStatus("idle");
    setMessage("");
  };

  const handleSave = async (emp: Partial<Employee>) => {
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emp),
      });
      if (res.ok) {
        const saved = await res.json();
        setList((prev) => {
          if (editing) {
            return prev.map((e) => (e.id === saved.id ? saved : e));
          }
          return [...prev, saved];
        });
        setStatus("success");
        setMessage(editing
          ? (lang === "zh-CN" ? "员工更新成功！" : "Employee updated!")
          : (lang === "zh-CN" ? "员工添加成功！" : "Employee added!")
        );
        setTimeout(() => closeModal(), 1500);
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed");
        setStatus("error");
      }
    } catch {
      setMessage(lang === "zh-CN" ? "网络错误" : "Network error");
      setStatus("error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === "zh-CN" ? "确定删除此员工？" : "Delete this employee?")) return;
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setList((prev) => prev.filter((e) => e.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete");
      }
    } catch {
      alert(lang === "zh-CN" ? "网络错误" : "Network error");
    }
  };

  const activeCount = list.filter((e) => e.active).length;
  const totalCount = list.length;

  return (
    <AdminLayout
      title={t("employees")}
      subtitle={`${formatNumber(activeCount)}/${formatNumber(totalCount)} ${lang === "zh-CN" ? "名员工已激活" : "employees active"}`}
    >
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-11 py-2.5"
            placeholder={lang === "zh-CN" ? "搜索员工..." : "Search employees..."}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button onClick={fetchEmployees} className="btn-ghost flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {lang === "zh-CN" ? "刷新" : "Refresh"}
        </button>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {lang === "zh-CN" ? "添加员工" : "Add Employee"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">{lang === "zh-CN" ? "加载中..." : "Loading..."}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">👤</div>
          {lang === "zh-CN" ? "暂无员工" : "No employees found"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold text-sm">
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {e.email}
                    </div>
                  </div>
                </div>
                <StatusBadge status={e.active ? "active" : "disabled"} />
              </div>

              {/* 权限徽章 */}
              <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(e.permissions || {})
                  .filter(([, v]) => v)
                  .map(([k]) => {
                    const perm = MENU_PERMISSIONS.find((m) => m.key === k);
                    return (
                      <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        {perm ? (lang === "zh-CN" ? perm.label : perm.labelEn) : k}
                      </span>
                    );
                  })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(e)}
                  className="flex-1 btn-ghost py-2 text-sm flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {lang === "zh-CN" ? "编辑" : "Edit"}
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="flex-1 btn-ghost py-2 text-sm text-red-600 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {lang === "zh-CN" ? "删除" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <EmployeeModal
          employee={editing}
          onSave={handleSave}
          onClose={closeModal}
          lang={lang}
          status={status}
          message={message}
        />
      )}
    </AdminLayout>
  );
}

function EmployeeModal({
  employee,
  onSave,
  onClose,
  lang,
  status,
  message,
}: {
  employee: Employee | null;
  onSave: (e: Partial<Employee>) => void;
  onClose: () => void;
  lang: string;
  status: string;
  message: string;
}) {
  const [form, setForm] = useState<Partial<Employee>>(
    employee || {
      name: "",
      email: "",
      password: "",
      permissions: Object.fromEntries(MENU_PERMISSIONS.map((m) => [m.key, false])),
      active: true,
    }
  );

  // 编辑模式：如果没有传密码则不更新密码
  const [showPassword, setShowPassword] = useState(false);

  const togglePerm = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: {
        ...f.permissions,
        [key]: !f.permissions?.[key],
      },
    }));
  };

  const handleSubmit = () => {
    const data = { ...form };
    // 编辑时如果密码为空字符串则不传（不更新密码）
    if (employee && !data.password) {
      delete data.password;
    }
    onSave(data);
  };

  const permLabels = (key: string) => {
    const p = MENU_PERMISSIONS.find((m) => m.key === key);
    return { zh: p?.label || key, en: p?.labelEn || key };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold">
                {employee ? (lang === "zh-CN" ? "编辑员工" : "Edit Employee") : (lang === "zh-CN" ? "添加员工" : "Add Employee")}
              </h3>
              <div className="text-xs text-slate-500">
                {employee ? employee.email : lang === "zh-CN" ? "创建新账号" : "Create new account"}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 消息提示 */}
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-sm text-emerald-700">
              <Check className="w-4 h-4" /> {message}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-sm text-red-600">
              <X className="w-4 h-4" /> {message}
            </div>
          )}

          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                <User className="w-3.5 h-3.5 inline mr-1" />
                {lang === "zh-CN" ? "姓名" : "Name"}
              </label>
              <input
                className="input"
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={lang === "zh-CN" ? "输入员工姓名..." : "Enter name..."}
              />
            </div>
            <div>
              <label className="label">
                <Mail className="w-3.5 h-3.5 inline mr-1" />
                {lang === "zh-CN" ? "邮箱（登录账号）" : "Email (Login)"}
              </label>
              <input
                className="input"
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="employee@company.com"
              />
            </div>
          </div>

          <div>
            <label className="label">
              <Lock className="w-3.5 h-3.5 inline mr-1" />
              {lang === "zh-CN" ? "密码" : "Password"}
              {employee && <span className="text-xs text-slate-400 ml-2">({lang === "zh-CN" ? "留空则不修改" : "Leave blank to keep current"})</span>}
            </label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? "text" : "password"}
                value={form.password || ""}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={employee ? "••••••••" : "admin123"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 菜单权限 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-indigo-600" />
              <label className="label mb-0">
                {lang === "zh-CN" ? "菜单权限（可见的导航按钮）" : "Menu Permissions (Visible Nav Items)"}
              </label>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              {lang === "zh-CN" ? "勾选的菜单项将在侧边栏中显示；未勾选则隐藏。" : "Checked items are visible in the sidebar; unchecked items are hidden."}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MENU_PERMISSIONS.map((p) => {
                const checked = form.permissions?.[p.key] === true;
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePerm(p.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-left transition-all ${
                      checked
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      checked ? "bg-indigo-500 text-white" : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                      {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{lang === "zh-CN" ? p.label : p.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 账号状态 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              className={`w-11 h-6 rounded-full transition-all relative ${
                form.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${
                form.active ? "left-[22px]" : "left-0.5"
              }`} />
            </button>
            <div>
              <div className="text-sm font-medium">{lang === "zh-CN" ? "账号状态" : "Account Status"}</div>
              <div className={`text-xs ${form.active ? "text-emerald-600" : "text-slate-400"}`}>
                {form.active
                  ? (lang === "zh-CN" ? "已激活，可正常登录" : "Active — can log in")
                  : (lang === "zh-CN" ? "已禁用，无法登录" : "Disabled — cannot log in")}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} disabled={status === "submitting"} className="flex-1 btn-ghost py-2.5">
            {lang === "zh-CN" ? "取消" : "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={status === "submitting" || !form.name || !form.email}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            {status === "submitting" && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Check className="w-4 h-4" />
            {employee
              ? (lang === "zh-CN" ? "保存更改" : "Save Changes")
              : (lang === "zh-CN" ? "创建员工" : "Create Employee")}
          </button>
        </div>
      </div>
    </div>
  );
}
