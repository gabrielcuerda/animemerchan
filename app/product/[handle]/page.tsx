import { GridTileImage } from "components/grid/tile";
import { Gallery } from "components/product/gallery";
import { ProductDescription } from "components/product/product-description";
import { ViewTracker } from "components/product/view-tracker";
import { HIDDEN_PRODUCT_TAG } from "lib/constants";

import { getProduct, getProductRecommendations } from "@/lib/commerce/products";
import type { Image, Product } from "@/lib/commerce/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n/lang";
import { translate, type Lang } from "@/lib/i18n/dict";

function Breadcrumb({ product, lang }: { product: Product; lang: Lang }) {
  const migas = [
    { nombre: translate(lang, "crumb.home"), href: "/" },
    { nombre: translate(lang, "crumb.categories"), href: "/search" },
  ];

  if (product.categoria) {
    migas.push({
      nombre: product.categoria.nombre,
      href: `/search/${product.categoria.slug}`,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        {migas.map((miga) => (
          <li key={miga.href} className="flex items-center gap-1.5">
            <Link
              href={miga.href}
              className="transition hover:text-blue-600 hover:underline"
            >
              {miga.nombre}
            </Link>
            <span aria-hidden="true">›</span>
          </li>
        ))}
        <li
          aria-current="page"
          className="min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100"
        >
          {product.title}
        </li>
      </ol>
    </nav>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = !product.tags.includes(HIDDEN_PRODUCT_TAG);

  return {
    title: product.seo.title || product.title,
    description: product.seo.description || product.description,
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
      },
    },
    openGraph: url
      ? {
          images: [
            {
              url,
              width,
              height,
              alt,
            },
          ],
        }
      : null,
  };
}

export default async function ProductPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const lang = await getLang();

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  let guardado = false;

  if (authData.user) {
    const { data: fila } = await supabase
      .from("wishlist")
      .select("id")
      .eq("usuario_id", authData.user.id)
      .eq("producto_id", product.id)
      .maybeSingle();
    guardado = Boolean(fila);
  }

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.featuredImage.url,
    offers: {
      "@type": "AggregateOffer",
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: product.priceRange.minVariantPrice.currencyCode,
      highPrice: product.priceRange.maxVariantPrice.amount,
      lowPrice: product.priceRange.minVariantPrice.amount,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />
      {/* Telemetría de `product.viewed`. Va aquí y no junto a `getProduct`
          porque desde el servidor también se ejecuta con el prefetch de los
          enlaces a producto. Ver components/product/view-tracker.tsx. */}
      <ViewTracker productId={product.id} />
      <div className="mx-auto max-w-(--breakpoint-2xl) px-4 pt-6">
        <Breadcrumb product={product} lang={lang} />
        <div className="flex flex-col rounded-lg border border-neutral-200 bg-white p-8 md:p-12 lg:flex-row lg:gap-8 dark:border-neutral-800 dark:bg-black">
          <div className="h-full w-full basis-full lg:basis-4/6">
            <Suspense
              fallback={
                <div className="relative aspect-square h-full max-h-[550px] w-full overflow-hidden" />
              }
            >
              <Gallery
                images={product.images.slice(0, 5).map((image: Image) => ({
                  src: image.url,
                  altText: image.altText,
                }))}
              />
            </Suspense>
          </div>

          <div className="basis-full lg:basis-2/6">
            <Suspense fallback={null}>
              <ProductDescription
                product={product}
                saved={guardado}
                lang={lang}
              />
            </Suspense>
          </div>
        </div>
        <RelatedProducts id={product.id} lang={lang} />
      </div>
    </>
  );
}

async function RelatedProducts({ id, lang }: { id: string; lang: Lang }) {
  const relatedProducts = await getProductRecommendations(id);

  if (!relatedProducts.length) return null;

  return (
    <div className="py-8">
      <h2 className="mb-4 text-2xl font-extrabold uppercase tracking-tight">
        {translate(lang, "product.related")}
      </h2>
      <ul className="flex w-full gap-4 overflow-x-auto pt-1">
        {relatedProducts.map((product) => (
          <li
            key={product.handle}
            className="aspect-square w-full flex-none min-[475px]:w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5"
          >
            <Link
              className="relative h-full w-full"
              href={`/product/${product.handle}`}
              prefetch={true}
            >
              <GridTileImage
                alt={product.title}
                label={{
                  title: product.title,
                  amount: product.priceRange.maxVariantPrice.amount,
                  currencyCode: product.priceRange.maxVariantPrice.currencyCode,
                }}
                src={product.featuredImage?.url}
                fill
                sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, (min-width: 475px) 50vw, 100vw"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
