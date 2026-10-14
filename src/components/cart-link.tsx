"use client";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
export default function CartLink() { const { count } = useCart(); return <Link className="header-cta cart-link" href="/cart">السلة <span>{count}</span></Link>; }
