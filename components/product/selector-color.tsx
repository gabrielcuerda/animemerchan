"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { translate, type Lang } from "@/lib/i18n/dict";
import { COLORES_POR_PRODUCTO } from "@/lib/commerce/colores-producto";

export function SelectorColor({ slug, lang }: { slug: string; lang: Lang }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const colores = COLORES_POR_PRODUCTO[slug];
  if (!colores) return null;

  const actual = searchParams.get("image") ?? "0";

  const elegir = (indice: number, valor: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("image", String(indice));
    params.set("color", valor);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mb-8">
      <p className="mb-4 text-sm uppercase tracking-wide">
        {translate(lang, "product.color")}
      </p>
      <div className="flex flex-wrap gap-3">
        {colores.map((c, i) => {
          const nombre = translate(lang, `color.${c.clave}`);
          const activo = actual === String(i);
          return (
            <button
              key={c.clave}
              type="button"
              title={nombre}
              aria-label={nombre}
              aria-pressed={activo}
              onClick={() => elegir(i, c.valor)}
              style={{ backgroundColor: c.hex }}
              className={clsx(
                "h-10 w-10 rounded-full border border-neutral-300 ring-offset-2 transition dark:border-neutral-700",
                activo
                  ? "ring-2 ring-blue-600"
                  : "hover:ring-2 hover:ring-blue-300",
              )}
            />
          );
        })}
      </div>
      <p
        aria-live="polite"
        className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        {translate(
          lang,
          `color.${colores[Number(searchParams.get("image") ?? "0")]?.clave ?? "azul"}`,
        )}
      </p>
    </div>
  );
}
