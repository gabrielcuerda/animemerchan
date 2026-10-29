import { HomeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { Categoria } from "@/lib/db/types";

/**
 * Página 404 — versión EN.
 */
export function NotFoundEn({ categorias }: { categorias: Categoria[] }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-(--breakpoint-xl) flex-col items-center justify-center px-4 py-16 text-center">
      <p
        aria-hidden="true"
        className="text-8xl font-black text-slate-200 sm:text-9xl"
      >
        404
      </p>

      <h1 className="-mt-6 text-2xl font-bold sm:text-3xl">
        This page doesn&apos;t exist
      </h1>

      <p className="mt-3 max-w-lg text-sm text-slate-600 sm:text-base">
        The figure may have sold out and been removed from the catalogue, or the
        address may be mistyped.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <HomeIcon className="h-4 w-4" aria-hidden="true" />
          Back home
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
          Browse the catalogue
        </Link>
      </div>

      {categorias.length > 0 ? (
        <nav aria-label="Franchises" className="mt-12">
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            Or go straight to a franchise
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {categorias.map((categoria) => (
              <li key={categoria.id}>
                <Link
                  href={`/search/${categoria.slug}`}
                  className="inline-block rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {categoria.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </main>
  );
}
