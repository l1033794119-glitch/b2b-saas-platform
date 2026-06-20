"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  total: number;
  count: number;
  lastAdded: string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<string>("");

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

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, update, clear, total, count, lastAdded }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
