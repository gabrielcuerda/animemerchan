"use client";

import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { translate } from "@/lib/i18n/dict";
import { useLanguage } from "@/components/i18n/language-context";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { lang } = useLanguage();

  {
    loading
      ? translate(lang, "auth.signingOut")
      : translate(lang, "auth.signOut");
  }

  async function handleSignOut() {
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // Aunque falle el cierre, salimos: en /login la sesión ya no es usable.
    } finally {
      setLoading(false);
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
      type="button"
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
