"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Lang } from "@/lib/i18n";
import { useApp, languageLabels } from "@/components/AppProvider";
import { Globe, Lock, Shield } from "lucide-react";
import { getAdminDefaultHref } from "@/lib/admin-menu";

export default function AdminLogin() {
  const { t, lang, setLang, login, user } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const adminRoles = ["super_admin", "warehouse_manager", "finance_manager", "operations_manager", "customer_service"];
      if (adminRoles.includes(user.role)) {
        router.push(getAdminDefaultHref(user.permissions));
      }
    }
  }, [user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await login(email, password, true);
    setLoading(false);
    if (!ok) {
      setError(lang === "en" ? "Invalid admin credentials" : lang === "zh-CN" ? "管理员凭据无效" : "管理員憑證無效");
      return;
    }
    const userData = JSON.parse(localStorage.getItem("app.user") || "{}");
    router.push(getAdminDefaultHref(userData.permissions));
  };

  const langs: Lang[] = ["en", "zh-CN", "zh-TW"];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px]" />
      </div>
      
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden z-10 bg-black">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-green-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3 text-xl font-semibold text-white">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
              boxShadow: "0 4px 16px rgba(52, 199, 89, 0.4)",
            }}
          >
            <Shield className="w-5 h-5" />
          </div>
          <span>{t("administrator_portal")}</span>
        </div>
        <div className="relative text-white">
          <h1 className="text-4xl font-bold leading-tight mb-4 tracking-tight">
            {lang === "en" ? "Admin console for operations, finance and warehouse teams" : lang === "zh-CN" ? "运营、财务与仓库团队的管理控制台" : "營運、財務與倉庫團隊的管理控制台"}
          </h1>
          <p className="text-lg text-white/70 max-w-lg">
            {lang === "en"
              ? "Monitor inventory, process orders and manage your agent network from a single professional dashboard."
              : lang === "zh-CN"
              ? "从一个专业仪表盘监控库存、处理订单并管理您的代理商网络。"
              : "從一個專業儀表板監控庫存、處理訂單並管理您的代理商網絡。"}
          </p>
          <div className="mt-10 space-y-3 max-w-md">
            {[
              "2FA & IP logging",
              "Role-based access control",
              "Full audit trail",
              "Multi-language & multi-currency",
            ].map((f, i) => (
              <div key={f} className="flex items-center gap-3 text-sm text-white/80">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <span className="text-[10px] font-bold">{i + 1}</span>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm text-white/50">© 2025 B2B Platform. All rights reserved.</div>
      </div>

      <div className="flex flex-col relative z-10">
        <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/5">
          <Link href="/login" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: "#34c759" }}>
            ← {t("back_to_login")}
          </Link>
          <div className="relative flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <select
              className="bg-transparent text-sm rounded-xl px-2.5 py-1.5 outline-none cursor-pointer input-glass"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              {langs.map((l) => (
                <option key={l} value={l}>{languageLabels[l]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-2xl text-white flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
                  boxShadow: "0 4px 16px rgba(52, 199, 89, 0.3)",
                }}
              >
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">{t("welcome_back_admin")}</h1>
            <p className="text-slate-500 mb-8">{t("sign_in_to_admin")}</p>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="label">{t("email")}</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">{t("password")}</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {error && (
                <div 
                  className="text-sm rounded-xl px-4 py-3"
                  style={{ 
                    background: "rgba(255, 59, 48, 0.1)", 
                    color: "#ff3b30",
                    border: "1px solid rgba(255, 59, 48, 0.2)",
                  }}
                >
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary w-full justify-center flex items-center py-3 text-base font-medium"
              >
                {loading ? "..." : t("sign_in")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
