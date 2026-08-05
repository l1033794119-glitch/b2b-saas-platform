"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  image?: string;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (productId: string) => void;
  update: (productId: string, qty: number) => void;
  clear: () => void;
  syncPrices: (priceMap: Record<string, number>) => number;
  total: number;
  count: number;
  lastAdded: string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<string>("");
  const itemsRef = useRef<CartItem[]>([]);

  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agent.cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("agent.cart", JSON.stringify(items));
    } catch {}
  }, [items]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) => i.productId === item.productId ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { ...item, qty }];
    });
    setLastAdded(item.productId);
    setTimeout(() => setLastAdded(""), 800);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== id));
  }, []);

  const update = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((i) => i.productId === id ? { ...i, qty } : i).filter((i) => i.qty > 0));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  // 同步最新价格，返回发生变化的商品数量
  const syncPrices = useCallback((priceMap: Record<string, number>) => {
    let changed = 0;
    const next = itemsRef.current.map((i) => {
      const newPrice = priceMap[i.productId];
      if (newPrice !== undefined && newPrice !== i.price) {
        changed++;
        return { ...i, price: newPrice };
      }
      return i;
    });
    if (changed > 0) {
      setItems(next);
    }
    return changed;
  }, []);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, update, clear, syncPrices, total, count, lastAdded }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
