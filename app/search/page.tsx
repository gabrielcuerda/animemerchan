import Grid from "components/grid";

import ProductoGridItems from "components/layout/producto-grid-items";
import { defaultSort, sorting } from "lib/constants";
import { createUrl } from "lib/utils";
import { getProductos } from "@/lib/db/productos";
import Link from "next/link";
import type { Metadata } from "next";
import { translate } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/lang";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: "Search",
    description: translate(lang, "search.metaDescription"),
  };
}

export default async function SearchPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const lang = await getLang();
  const t = (k: string) => translate(lang, k);
  const {
    sort,
    q: searchValue,
    estado,
    precio,
  } = searchParams as Record<string, string>;
  const { sortKey, reverse } =
    sorting.find((item) => item.slug === sort) || defaultSort;

  const productos = await getProductos({
    sortKey,
    reverse,
    query: searchValue,
    estado,
    precio,
  });

  const hayFiltros = Boolean(searchValue || estado || precio);
  const total = productos.length;
  const resultsText =
    total === 1 ? t("search.resultsOne") : t("search.resultsOther");

  const limpiarHref = createUrl(
    "/search",
    new URLSearchParams({ ...(searchValue && { q: searchValue }) }),
  );

  return (
    <>
      {hayFiltros ? (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <p className="m-0">
            {total === 0
              ? t("search.noMatches")
              : `${t("search.showing")} ${total} ${resultsText}`}
            {searchValue ? (
              <>
                {t("search.forQuery")}
                <span className="font-bold">&quot;{searchValue}&quot;</span>
              </>
            ) : null}
          </p>
          <Link
            href={limpiarHref}
            className="text-sm text-blue-600 underline underline-offset-4 hover:opacity-80"
          >
            {t("search.clearFilters")}
          </Link>
        </div>
      ) : null}
      {total > 0 ? (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ProductoGridItems productos={productos} />
        </Grid>
      ) : null}
    </>
  );
}
