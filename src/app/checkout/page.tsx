import Link from "next/link";
import CheckoutForm from "@/components/checkout-form";
export default function CheckoutPage() { return <main className="subpage"><header className="subpage-header"><Link className="brand" href="/"><span className="brand-mark">B</span><span>Bein <b>Store</b></span></Link><Link href="/cart">← العودة للسلة</Link></header><section className="section-wrap"><span className="eyebrow">CHECKOUT</span><h1 className="page-title">إتمام الطلب</h1><CheckoutForm /></section></main>; }
