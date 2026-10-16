"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
};
type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove?: (widgetId: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi; }
}

export default function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callbackRef = useRef(onToken);
  useEffect(() => { callbackRef.current = onToken; }, [onToken]);

  const render = useCallback(() => {
    if (!siteKey || !host.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(host.current, {
      sitekey: siteKey,
      theme: "light",
      language: "ar",
      callback: token => callbackRef.current(token),
      "expired-callback": () => callbackRef.current(""),
      "error-callback": () => callbackRef.current("")
    });
  }, [siteKey]);

  useEffect(() => {
    render();
    return () => {
      if (widgetId.current && window.turnstile?.remove) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [render]);

  if (!siteKey) return null;
  return (
    <div className="turnstile-widget" aria-label="التحقق الأمني">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} />
      <div ref={host} />
    </div>
  );
}
