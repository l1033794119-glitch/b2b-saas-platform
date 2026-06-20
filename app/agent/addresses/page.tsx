"use client";

import { useState } from "react";
import { AgentLayout } from "@/components/Layout";
import { PageCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { formatNumber } from "@/lib/utils";
import { Plus, MapPin, Trash2, Star } from "lucide-react";

interface Address {
  id: string;
  name: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  postal: string;
  isDefault: boolean;
}

const seed: Address[] = [
  { id: "a1", name: "John Smith", phone: "+44 20 1234 5678", country: "United Kingdom", address: "123 Oxford Street", city: "London", postal: "W1D 1BS", isDefault: true },
  { id: "a2", name: "Jane Doe", phone: "+61 4 1234 5678", country: "Australia", address: "456 George Street", city: "Sydney", postal: "2000", isDefault: false },
];

export default function AddressesPage() {
  const { t, lang } = useApp();
  const [list, setList] = useState(seed);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Address>>({});

  const save = () => {
    if (!form.name || !form.address) return;
    if (form.isDefault) setList(list.map((a) => ({ ...a, isDefault: false })));
    setList([...list, { ...(form as any), id: `a${Date.now()}` }]);
    setForm({});
    setShowForm(false);
  };

  const remove = (id: string) => setList(list.filter((a) => a.id !== id));
  const setDefault = (id: string) => setList(list.map((a) => ({ ...a, isDefault: a.id === id })));

  return (
    <AgentLayout title={t("addresses")} subtitle={`${formatNumber(list.length)} ${lang === "en" ? "addresses" : lang === "zh-CN" ? "个地址" : "個地址"}`}>
      <div className="flex items-center justify-between mb-4">
        <div />
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {t("add_address")}</button>
      </div>

      {showForm && (
        <PageCard title={t("add_address")} className="mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="label">{t("recipient_name")}</label><input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">{t("phone")}</label><input className="input" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">{t("country")}</label><input className="input" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div><label className="label">{t("city")}</label><input className="input" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="label">{t("address")}</label><input className="input" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="label">{t("postal_code")}</label><input className="input" value={form.postal || ""} onChange={(e) => setForm({ ...form, postal: e.target.value })} /></div>
            <div className="flex items-end"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> {t("default_address")}</label></div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>{t("cancel")}</button>
            <button className="btn-primary" onClick={save}>{lang === "en" ? "Save" : lang === "zh-CN" ? "保存" : "儲存"}</button>
          </div>
        </PageCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((a) => (
          <div key={a.id} className="card p-5 relative">
            {a.isDefault && (
              <span className="badge badge-blue absolute top-4 right-4"><Star className="w-3 h-3 inline mr-1" /> {t("default_address")}</span>
            )}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-slate-500">{a.phone}</div>
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">{a.address}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{a.city}, {a.postal}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">{a.country}</div>
            <div className="flex gap-2">
              {!a.isDefault && <button onClick={() => setDefault(a.id)} className="btn-ghost text-sm py-1.5">{t("default_address")}</button>}
              <button onClick={() => remove(a.id)} className="btn-ghost text-sm py-1.5 text-rose-600 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> {t("delete")}</button>
            </div>
          </div>
        ))}
      </div>
    </AgentLayout>
  );
}
