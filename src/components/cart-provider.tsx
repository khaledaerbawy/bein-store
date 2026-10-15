"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";

export type CartItem = { product: Product; quantity: number };
type CartContextValue = {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  lastAdded: Product | null;
  noticeVersion: number;
};
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "bein-store-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState<Product | null>(null);
  const [noticeVersion, setNoticeVersion] = useState(0);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) { const valid = parsed.filter((x) => x?.product?.id && Number.isInteger(x.quantity) && x.quantity > 0); setItems(valid); setLastAdded(valid[valid.length - 1]?.product ?? null); }
      }
    } catch { /* Ignore corrupt local cart data. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items, ready]);
  const add = useCallback((product: Product, quantity = 1) => {
    setLastAdded(product); setNoticeVersion((version) => version + 1);
    setItems((old) => {
    const existing = old.find((x) => x.product.id === product.id);
    return existing ? old.map((x) => x.product.id === product.id ? { ...x, quantity: Math.min(99, x.quantity + quantity) } : x) : [...old, { product, quantity: Math.min(99, Math.max(1, quantity)) }];
    });
  }, []);
  const setQuantity = useCallback((id: string, quantity: number) => setItems((old) => quantity < 1 ? old.filter((x) => x.product.id !== id) : old.map((x) => x.product.id === id ? { ...x, quantity: Math.min(99, Math.floor(quantity)) } : x)), []);
  const remove = useCallback((id: string) => setItems((old) => old.filter((x) => x.product.id !== id)), []);
  const clear = useCallback(() => { setItems([]); setLastAdded(null); }, []);
  const value = useMemo(() => ({ items, add, setQuantity, remove, clear, count: items.reduce((sum, x) => sum + x.quantity, 0), subtotal: items.reduce((sum, x) => sum + (Number(x.product.price_egp) || 0) * x.quantity, 0), lastAdded, noticeVersion }), [items, add, setQuantity, remove, clear, lastAdded, noticeVersion]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used inside CartProvider"); return value; }
