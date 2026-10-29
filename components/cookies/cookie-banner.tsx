"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { translate } from "@/lib/i18n/dict";
import { useLanguage } from "@/components/i18n/language-context";

const COOKIE = "cookie-consent";

function leerConsentimiento(): string | null {
  const par = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE}=`));
  return par ? par.slice(COOKIE.length + 1) : null;
}

export default function CookieBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!leerConsentimiento()) setVisible(true);
  }, []);

  if (!visible) return null;

  const elegir = (valor: "all" | "necessary" | "rejected") => {
    document.cookie = `${COOKIE}=${valor}; path=/; max-age=31536000; samesite=lax`;
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={translate(lang, "cookie.title")}
      className="fixed right-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-card border border-ink-200 bg-white p-5 shadow-card"
    >
      <p className="text-sm font-extrabold tracking-wide uppercase">
        {translate(lang, "cookie.title")}
      </p>
      <p className="mt-2 text-sm text-ink-600">
        {translate(lang, "cookie.text")}
      </p>
      <Link
        href="/cookies"
        className="mt-2 inline-block text-sm font-semibold underline underline-offset-4"
      >
        {translate(lang, "cookie.more")}
      </Link>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => elegir("all")}
          className="rounded-full bg-ink-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
        >
          {translate(lang, "cookie.accept")}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => elegir("necessary")}
            className="flex-1 rounded-full border border-ink-200 px-4 py-2.5 text-sm font-semibold transition hover:border-ink-950"
          >
            {translate(lang, "cookie.necessary")}
          </button>
          <button
            type="button"
            onClick={() => elegir("rejected")}
            className="flex-1 rounded-full border border-ink-200 px-4 py-2.5 text-sm font-semibold transition hover:border-ink-950"
          >
            {translate(lang, "cookie.reject")}
          </button>
        </div>
      </div>
    </div>
  );
}
