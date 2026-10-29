import { cookies } from "next/headers";
import { DEFAULT_LANG, LANGS, type Lang } from "./dict";

/**
 * Lee el idioma desde la cookie (SOLO en componentes de servidor).
 * Los de cliente usan `useLanguage()` de components/i18n/language-context.
 */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get("lang")?.value ?? "";
  return (LANGS as readonly string[]).includes(v) ? (v as Lang) : DEFAULT_LANG;
}
