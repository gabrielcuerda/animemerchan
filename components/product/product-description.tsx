import { AddToCart } from "components/cart/add-to-cart";
import StatusBadge from "components/grid/status-badge";
import Price from "components/price";
import Prose from "components/prose";
import WishlistToggle from "@/components/wishlist/wishlist-toggle";

import { Product } from "@/lib/commerce/types";
import { VariantSelector } from "./variant-selector";
import { translate, type Lang } from "@/lib/i18n/dict";
import { SelectorColor } from "./selector-color";
import { tieneCirculos } from "@/lib/commerce/colores-producto";

/** Texto y color del indicador de disponibilidad */
function disponibilidad(
  product: Product,
  lang: Lang,
): { texto: string; clase: string } {
  if (product.status === "pre-venta")
    return {
      texto: translate(lang, "product.preventa"),
      clase: "text-amber-600",
    };
  if (product.status === "a-pedido")
    return {
      texto: translate(lang, "product.apedido"),
      clase: "text-sky-600",
    };
  if (product.stock <= 0)
    return {
      texto: translate(lang, "product.agotado"),
      clase: "text-rose-600",
    };
  if (product.stock <= 5)
    return {
      texto: translate(lang, "product.pocas").replace(
        "{n}",
        String(product.stock),
      ),
      clase: "text-orange-600",
    };
  return {
    texto: translate(lang, "product.stock").replace(
      "{n}",
      String(product.stock),
    ),
    clase: "text-emerald-600",
  };
}

export function ProductDescription({
  product,
  saved = false,
  lang,
}: {
  product: Product;
  saved?: boolean;
  lang: Lang;
}) {
  const estado = disponibilidad(product, lang);

  return (
    <div className="relative">
      <div className="mb-6 flex flex-col border-b pb-6 dark:border-neutral-700">
        <h1 className="mb-3 text-5xl font-medium">{product.title}</h1>

        <div className="relative flex flex-wrap items-center gap-3 py-1 pr-12">
          <div className="rounded-full bg-blue-600 p-2 text-sm text-white">
            <Price
              amount={product.priceRange.maxVariantPrice.amount}
              currencyCode={product.priceRange.maxVariantPrice.currencyCode}
            />
          </div>
          <StatusBadge status={product.status} stock={product.stock} />
          <WishlistToggle productId={product.id} initialSaved={saved} />
        </div>

        <p className={`mt-3 text-sm font-medium ${estado.clase}`}>
          {estado.texto}
        </p>
      </div>

      <SelectorColor slug={product.handle} lang={lang} />
      <VariantSelector
        options={product.options}
        variants={product.variants}
        ocultar={tieneCirculos(product.handle) ? ["color"] : []}
      />
      {product.descriptionHtml ? (
        <Prose
          className="mb-6 text-sm leading-tight dark:text-white/[60%]"
          html={product.descriptionHtml}
        />
      ) : null}
      <AddToCart product={product} />
    </div>
  );
}
