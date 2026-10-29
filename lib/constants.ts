import { translate, type Lang } from "@/lib/i18n/dict";

export type SortFilterItem = {
  i18nKey: string;
  title: string;
  slug: string | null;
  sortKey: "RELEVANCE" | "BEST_SELLING" | "CREATED_AT" | "PRICE";
  reverse: boolean;
};

export const defaultSort: SortFilterItem = {
  i18nKey: "sort.relevance",
  title: "Relevance",
  slug: null,
  sortKey: "RELEVANCE",
  reverse: false,
};

export const sorting: SortFilterItem[] = [
  defaultSort,
  {
    i18nKey: "sort.trending",
    title: "Trending",
    slug: "trending-desc",
    sortKey: "BEST_SELLING",
    reverse: false,
  },
  {
    i18nKey: "sort.latest",
    title: "Latest arrivals",
    slug: "latest-desc",
    sortKey: "CREATED_AT",
    reverse: true,
  },
  {
    i18nKey: "sort.priceAsc",
    title: "Price: Low to high",
    slug: "price-asc",
    sortKey: "PRICE",
    reverse: false,
  },
  {
    i18nKey: "sort.priceDesc",
    title: "Price: High to low",
    slug: "price-desc",
    sortKey: "PRICE",
    reverse: true,
  },
];

export type ParamFilterItem = {
  i18nKey: string;
  title: string;
  param: string;
  value: string;
};

export const estados: ParamFilterItem[] = [
  {
    i18nKey: "status.stock",
    title: "En stock",
    param: "estado",
    value: "stock",
  },
  {
    i18nKey: "status.preVenta",
    title: "Pre-venta",
    param: "estado",
    value: "pre-venta",
  },
  {
    i18nKey: "status.aPedido",
    title: "Bajo pedido",
    param: "estado",
    value: "a-pedido",
  },
  {
    i18nKey: "status.oferta",
    title: "Oferta",
    param: "estado",
    value: "oferta",
  },
];

export const precios: ParamFilterItem[] = [
  {
    i18nKey: "price.under150",
    title: "Menos de 150 €",
    param: "precio",
    value: "0-150",
  },
  {
    i18nKey: "price.150to200",
    title: "150 € – 200 €",
    param: "precio",
    value: "150-200",
  },
  {
    i18nKey: "price.over200",
    title: "Más de 200 €",
    param: "precio",
    value: "200-",
  },
];

export function traducirFiltros<T extends { i18nKey: string; title: string }>(
  lang: Lang,
  items: T[],
): T[] {
  return items.map((i) => ({
    ...i,
    title: translate(lang, i.i18nKey) || i.title,
  }));
}

export const TAGS = {
  collections: "collections",
  products: "products",
  cart: "cart",
};

/** `productos.precio` se guarda SIN IVA: hay que sumarlo al cobrar. */
export const IVA_PORCENTAJE = 21;

/** Envío gratuito en todos los pedidos por ahora. */
export const COSTE_ENVIO = 0;

export const MONEDA = "EUR";

/** Solo lo usa la capa heredada de Shopify (lib/shopify). */
export const SHOPIFY_GRAPHQL_API_ENDPOINT = "/api/2023-01/graphql.json";

export const HIDDEN_PRODUCT_TAG = "nextjs-frontend-hidden";
export const DEFAULT_OPTION = "Default Title";
