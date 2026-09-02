"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";

/**
 * 订单分页查询 Hook（admin/orders、admin/shipping 共用，未来 agent/orders 也能接）。
 *
 * 核心能力：
 *  1) 逐页加载（page/pageSize）→ 不加载几千条，首屏快、不卡不崩
 *  2) 搜索：提交"搜索按钮"或回车才触发（不是边输入边搜，避免抖动）
 *  3) 所有筛选走后端（status/agentId/warehouseId/from/to/statusIn/q），数据库直接 LIMIT+索引
 *  4) updateOrderInCache：PUT /api/orders/:id 成功后，直接替换当前页一条记录，不重新翻页
 *  5) exportAllCSV：导出时用 pageSize=0（返回全量数组）→ 做 CSV
 *  6) 自动取消上一次的 HTTP（新请求覆盖旧请求）
 *
 * 向后兼容：若后端 /api/orders 没接分页（老版本），data 仍会是数组，这里兜底用老的本地过滤。
 */

export type PagedOrders = {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export interface UseOrderQueryOpts {
  /** 每页条数，默认 20 */
  pageSize?: number;
  /** 物流管理：只保留指定状态（OR）。例 ['pending_delivery','pending_tracking','shipped','completed'] */
  statusIn?: string[];
  /** agent 端强制分页（此 hook 内不再调用 getAllOrders 返回整表） */
  scope?: "admin" | "shipping" | "agent";
}

export interface OrderSearchPayload {
  q?: string;
  status?: string;
  agentId?: string;
  warehouseId?: string;
  from?: string;
  to?: string;
}

export function useOrderQuery(opts: UseOrderQueryOpts = {}) {
  const PAGE_SIZE_DEFAULT = opts.pageSize ?? 20;
  const { apiFetch, user } = useApp();

  const [data, setData] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // ---- 搜索/筛选已提交的"生效值"（未点击搜索按钮前，上一次的提交继续保留）----
  const [submitted, setSubmitted] = useState<OrderSearchPayload>({});
  // ---- 暂存值：用户在输入框/下拉里正在编辑但还没点"搜索" ----
  const [draftQ, setDraftQ] = useState("");
  const [draftStatus, setDraftStatus] = useState<string>("all");
  const [draftAgent, setDraftAgent] = useState<string>("all");
  const [draftWarehouse, setDraftWarehouse] = useState<string>("all");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, activeFilters: OrderSearchPayload, opts2: { withLoading?: boolean } = {}) => {
      if (!user?.id) return;
      if (opts2.withLoading !== false) setLoading(true);
      setSearching(true);
      try {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const p = new URLSearchParams();
        p.set("page", String(targetPage));
        p.set("pageSize", String(pageSize));
        if (opts.statusIn?.length) p.set("statusIn", opts.statusIn.join(","));
        if (opts.scope === "agent" && user?.id) p.set("agentId", user.id);
        if (activeFilters.q) p.set("q", activeFilters.q);
        if (activeFilters.status && activeFilters.status !== "all") p.set("status", activeFilters.status);
        if (activeFilters.agentId && activeFilters.agentId !== "all") p.set("agentId", activeFilters.agentId);
        if (activeFilters.warehouseId && activeFilters.warehouseId !== "all") p.set("warehouseId", activeFilters.warehouseId);
        if (activeFilters.from) p.set("from", activeFilters.from);
        if (activeFilters.to) p.set("to", activeFilters.to);

        const res = await apiFetch(`/api/orders?${p.toString()}`, {
          signal: ctrl.signal,
          // 分页/搜索结果不缓存：每次要最新的
          cache: "no-store" as any,
        });

        if (!res.ok) {
          console.warn("useOrderQuery /api/orders HTTP", res.status);
          return;
        }
        const body = await res.json().catch(() => null);
        if (body && typeof body === "object" && "data" in body && Array.isArray(body.data)) {
          const r = body as PagedOrders;
          setData(r.data);
          setTotal(r.total ?? 0);
          setPage(r.page ?? targetPage);
          setTotalPages(r.totalPages ?? 1);
          setHasPrev(!!r.hasPrev);
          setHasNext(!!r.hasNext);
        } else if (Array.isArray(body)) {
          // 后端没升级（还是数组返回全量）：本地分页兜底（兼容性）
          const all = body;
          const t0 = (activeFilters.status && activeFilters.status !== "all")
            ? all.filter((o: any) => o.status === activeFilters.status)
            : opts.statusIn?.length
              ? all.filter((o: any) => opts.statusIn!.includes(o.status))
              : all;
          const t1 = !activeFilters.agentId || activeFilters.agentId === "all"
            ? t0 : t0.filter((o: any) => o.agentId === activeFilters.agentId);
          const t2 = !activeFilters.warehouseId || activeFilters.warehouseId === "all" ? t1 : t1.filter((o: any) => {
            if (o.warehouseId === activeFilters.warehouseId || o.warehouse === activeFilters.warehouseId) return true;
            return (o.items || []).some((it: any) => it.warehouseId === activeFilters.warehouseId || it.warehouse === activeFilters.warehouseId);
          });
          const t3 = !activeFilters.q ? t2 : t2.filter((o: any) => {
            const k = activeFilters.q!.toLowerCase();
            return (
              (o.orderNo || "").toLowerCase().includes(k) ||
              (o.contactName || "").toLowerCase().includes(k) ||
              (o.company || "").toLowerCase().includes(k) ||
              (o.phone || "").toLowerCase().includes(k) ||
              (o.email || "").toLowerCase().includes(k) ||
              (o.postalCode || "").toLowerCase().includes(k) ||
              (o.shippingAddress || "").toLowerCase().includes(k)
            );
          });
          const totalN = t3.length;
          const tp = Math.max(1, Math.ceil(totalN / pageSize));
          const cur = Math.max(1, Math.min(targetPage, tp));
          const slice = t3.slice((cur - 1) * pageSize, cur * pageSize);
          setData(slice); setTotal(totalN); setPage(cur); setTotalPages(tp);
          setHasPrev(cur > 1); setHasNext(cur < tp);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") console.warn("useOrderQuery failed:", e);
      } finally {
        setSearching(false);
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, pageSize, opts.statusIn?.join(","), opts.scope]
  );

  // ---- 初始 / page / pageSize / submitted 变化 → 重拉 ----
  useEffect(() => {
    if (!user?.id) return;
    void fetchPage(page, submitted);
  }, [page, pageSize, submitted, user?.id, fetchPage]);

  // ---- 公开：提交"搜索"（搜索按钮/回车）----
  const submitSearch = useCallback((override?: Partial<OrderSearchPayload>) => {
    const payload: OrderSearchPayload = {
      q: (override?.q !== undefined ? override.q : draftQ).trim(),
      status: override?.status ?? draftStatus,
      agentId: override?.agentId ?? draftAgent,
      warehouseId: override?.warehouseId ?? draftWarehouse,
      from: override?.from ?? draftFrom,
      to: override?.to ?? draftTo,
    };
    setSubmitted(payload);
    setPage(1);
  }, [draftQ, draftStatus, draftAgent, draftWarehouse, draftFrom, draftTo]);

  // ---- 快捷：单独切换 status/agent/warehouse 下拉，立即生效（不需要额外点搜索按钮，符合习惯）----
  const quickSetStatus = useCallback((v: string) => { setDraftStatus(v); setSubmitted((s) => ({ ...s, status: v })); setPage(1); }, []);
  const quickSetAgent = useCallback((v: string) => { setDraftAgent(v); setSubmitted((s) => ({ ...s, agentId: v })); setPage(1); }, []);
  const quickSetWarehouse = useCallback((v: string) => { setDraftWarehouse(v); setSubmitted((s) => ({ ...s, warehouseId: v })); setPage(1); }, []);
  const quickSetDate = useCallback((from_: string, to_: string) => {
    setDraftFrom(from_); setDraftTo(to_);
    setSubmitted((s) => ({ ...s, from: from_, to: to_ }));
    setPage(1);
  }, []);
  const quickClear = useCallback(() => {
    setDraftQ(""); setDraftStatus("all"); setDraftAgent("all"); setDraftWarehouse("all"); setDraftFrom(""); setDraftTo("");
    setSubmitted({}); setPage(1);
  }, []);

  // ---- 公开：修改当前页某条后，直接内存替换不重拉 ----
  const updateOrderInCache = useCallback((id: string, patch: Record<string, any>) => {
    setData((prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((o) => (o?.id === id ? { ...o, ...patch } : o));
    });
  }, []);

  // ---- 公开：获取全量订单（CSV 导出用），不经过分页，纯函数返回 any[] ----
  const fetchAllForExport = useCallback(async (): Promise<any[]> => {
    if (!user?.id) return [];
    const p = new URLSearchParams();
    // 故意不带 pageSize → 后端兼容模式返回数组全量
    if (opts.statusIn?.length) p.set("statusIn", opts.statusIn.join(","));
    if (submitted.q) p.set("q", submitted.q);
    if (submitted.status && submitted.status !== "all") p.set("status", submitted.status);
    if (submitted.agentId && submitted.agentId !== "all") p.set("agentId", submitted.agentId);
    if (submitted.warehouseId && submitted.warehouseId !== "all") p.set("warehouseId", submitted.warehouseId);
    if (submitted.from) p.set("from", submitted.from);
    if (submitted.to) p.set("to", submitted.to);
    const qs = p.toString();
    const res = await apiFetch(`/api/orders${qs ? "?" + qs : ""}`, { cache: "no-store" as any });
    if (!res.ok) return [];
    const body = await res.json().catch(() => null);
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object" && "data" in body && Array.isArray((body as any).data)) return (body as any).data;
    return [];
  }, [apiFetch, user?.id, opts.statusIn, submitted]);

  // ---- 便捷导出 ----
  const pageStats = useMemo(() => {
    const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endIdx = Math.min(page * pageSize, total);
    return { startIdx, endIdx };
  }, [total, page, pageSize]);

  return {
    // 结果
    data: (Array.isArray(data) ? data : []) as any[],
    total,
    page,
    pageSize,
    totalPages,
    hasPrev,
    hasNext,
    loading,
    searching,
    pageStats,
    // 草稿（绑定到 input/select）
    draftQ, setDraftQ,
    draftStatus, setDraftStatus,
    draftAgent, setDraftAgent,
    draftWarehouse, setDraftWarehouse,
    draftFrom, setDraftFrom,
    draftTo, setDraftTo,
    // 提交/快捷
    submitSearch,
    quickSetStatus, quickSetAgent, quickSetWarehouse, quickSetDate, quickClear,
    // 导航
    setPage,
    goPrev: () => setPage((p) => Math.max(1, p - 1)),
    goNext: () => setPage((p) => Math.min(totalPages, p + 1)),
    refresh: () => fetchPage(page, submitted, { withLoading: false }),
    updateOrderInCache,
    fetchAllForExport,
    // 保留兼容：已提交的 filters（Debug/其他用途）
    submitted,
  };
}
