import Grid from "components/grid";
import ProductoGridItems from "components/layout/producto-grid-items";
import Link from "next/link";
import { getWishlistProductos } from "@/lib/db/wishlist";
import { getLang } from "@/lib/i18n/lang";
import { translate } from "@/lib/i18n/dict";

type WishlistListProps = {
  userId: string;
  title?: string;
  description?: string;
};

export default async function WishlistList({
  userId,
  title,
  description,
}: WishlistListProps) {
  const lang = await getLang();
  const titulo = title ?? translate(lang, "wishlist.metaTitle");
  const descripcion = description ?? translate(lang, "wishlist.accountDesc");
  const items = await getWishlistProductos(userId);
  const productos = items.map((item) => item.productos);
  const wishlistProductIds = items.map((item) => item.producto_id);

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold">{titulo}</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {descripcion}
        </p>
      </div>

      {productos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-black">
          <p className="font-medium">{translate(lang, "wishlist.empty")}</p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {translate(lang, "wishlist.emptyHint")}
          </p>
          <Link
            className="mt-6 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            href="/search"
          >
            {translate(lang, "wishlist.explore")}
          </Link>
        </div>
      ) : (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <ProductoGridItems
            productos={productos}
            wishlistProductIds={wishlistProductIds}
          />
        </Grid>
      )}
    </section>
  );
}
