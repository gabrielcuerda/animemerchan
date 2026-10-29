import { getCategoria } from "@/lib/db/categorias";
import { getProductosByCategoria } from "@/lib/db/productos";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Grid from "components/grid";

import ProductoGridItems from "components/layout/producto-grid-items";
import { defaultSort, sorting } from "lib/constants";

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const params = await props.params;

  const categoria = await getCategoria(params.collection);

  if (!categoria) return notFound();

  return {
    title: categoria.nombre,
    description:
      categoria.descripcion ||
      `Catálogo de figuras y merchandising de ${categoria.nombre} importados desde Japón`,
  };
}

function Breadcrumb({ nombre }: { nombre: string }) {
  const migas = [
    { nombre: "Inicio", href: "/" },
    { nombre: "Categorías", href: "/search" },
  ];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-blue-100/80">
        {migas.map((miga) => (
          <li key={miga.href} className="flex items-center gap-1.5">
            <Link
              href={miga.href}
              className="transition hover:text-white hover:underline"
            >
              {miga.nombre}
            </Link>
            <span aria-hidden="true">›</span>
          </li>
        ))}
        <li aria-current="page" className="font-medium text-white">
          {nombre}
        </li>
      </ol>
    </nav>
  );
}

export default async function CategoryPage(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { sort, estado, precio } = searchParams as { [key: string]: string };
  const { sortKey, reverse } =
    sorting.find((item) => item.slug === sort) || defaultSort;

  const categoria = await getCategoria(params.collection);
  if (!categoria) return notFound();

  const productos = await getProductosByCategoria(params.collection, {
    sortKey,
    reverse,
    estado,
    precio,
  });

  const descripcion =
    categoria.descripcion ||
    `Catálogo de figuras y merchandising de ${categoria.nombre}`;

  const textoContador =
    productos.length === 1 ? "1 producto" : `${productos.length} productos`;

  return (
    <section>
      <header className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative">
          <Breadcrumb nombre={categoria.nombre} />

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {categoria.nombre}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
                {descripcion}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
              {textoContador}
            </span>
          </div>
        </div>
      </header>

      {productos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-3">
          <p className="m-0 text-lg">
            {estado || precio
              ? "No hay productos que coincidan con los filtros."
              : "No hay productos en esta categoría"}
          </p>
          {estado || precio ? (
            <Link
              href={`/search/${params.collection}`}
              className="text-sm text-blue-600 underline underline-offset-4 hover:opacity-80"
            >
              Limpiar filtros
            </Link>
          ) : null}
        </div>
      ) : (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ProductoGridItems productos={productos} />
        </Grid>
      )}
    </section>
  );
}
