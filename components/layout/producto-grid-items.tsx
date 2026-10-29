import Grid from "components/grid";
import { GridTileImage } from "components/grid/tile";
import StatusBadge from "components/grid/status-badge";
import WishlistToggle from "@/components/wishlist/wishlist-toggle";
import type { Producto, ProductoImagen } from "@/lib/db/types";
import Link from "next/link";
import { getLang } from "@/lib/i18n/lang";
import { traducirCampo } from "@/lib/i18n/productos.en";
import { getImagenesLocales } from "@/lib/commerce/products";

export type ProductoConImagen = Producto & {
  producto_imagenes: ProductoImagen[];
};

export function getMainImage(producto: ProductoConImagen): string | undefined {
  if (producto.producto_imagenes?.length) {
    const sorted = [...producto.producto_imagenes].sort(
      (a, b) => a.orden_cat - b.orden_cat,
    );
    return sorted[0]?.url;
  }
  return getImagenesLocales(producto.slug)[0];
}

export default async function ProductoGridItems({
  productos,
  wishlistProductIds = [],
}: {
  productos: ProductoConImagen[];
  wishlistProductIds?: string[];
}) {
  const lang = await getLang();
  return (
    <>
      {productos.map((producto) => (
        <Grid.Item key={producto.id} className="animate-fadeIn">
          <div className="relative h-full w-full">
            <Link
              className="relative block h-full w-full"
              href={`/product/${producto.slug}`}
              prefetch={true}
            >
              <GridTileImage
                alt={traducirCampo(
                  producto.slug,
                  "titulo",
                  producto.titulo,
                  lang,
                )}
                badge={
                  <StatusBadge
                    status={producto.status}
                    stock={producto.stock}
                  />
                }
                label={{
                  title: traducirCampo(
                    producto.slug,
                    "titulo",
                    producto.titulo,
                    lang,
                  ),
                  amount: producto.precio.toString(),
                  currencyCode: "EUR",
                }}
                src={getMainImage(producto) ?? "/placeholder.svg"}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
            </Link>
            <WishlistToggle
              productId={producto.id}
              initialSaved={wishlistProductIds.includes(producto.id)}
            />
          </div>
        </Grid.Item>
      ))}
    </>
  );
}
