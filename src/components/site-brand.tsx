"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SiteBrand({ className = "brand" }: { className?: string }) {
  const [storeName, setStoreName] = useState("Bein Store");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase
        .from("store_settings")
        .select("store_name,logo_url")
        .eq("id", "main")
        .maybeSingle();
      if (!alive || !data) return;
      setStoreName(data.store_name || "Bein Store");
      setLogoUrl(data.logo_url || null);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Link className={className} href="/" aria-label={storeName + " الرئيسية"}>
      {logoUrl
        ? <img className="site-subpage-logo" src={logoUrl} alt={storeName} />
        : <span className="brand-mark">B</span>}
      <span className="site-subpage-brand-name">{storeName}</span>
    </Link>
  );
}
