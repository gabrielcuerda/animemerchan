import { supabase } from "@/lib/supabase/client";
import type { Producto, ProductoImagen } from "./types";

type ProductoConImagen = Producto & { producto_imagenes: ProductoImagen[] };

function orderProductos(
  queryBuilder: any,
  sortKey?: string,
  reverse?: boolean,
) {
  switch (sortKey) {
    case "PRICE":
      return queryBuilder.order("precio", { ascending: !reverse });
    case "BEST_SELLING":
      return queryBuilder.order("stock", { ascending: false });
    case "CREATED_AT":
      return queryBuilder.order("created_at", { ascending: false });
    case "STOCK":
      return queryBuilder.order("stock", { ascending: false });
    default:
      return queryBuilder.order("created_at", { ascending: false });
  }
}

const ESTADOS_VALIDOS = ["stock", "pre-venta", "a-pedido", "oferta"];

function parseRangoPrecio(rango: string): { min?: number; max?: number } {
  const [a, b] = rango.split("-");
  const min = a ? Number(a) : NaN;
  const max = b ? Number(b) : NaN;
  return {
    ...(Number.isFinite(min) && { min }),
    ...(Number.isFinite(max) && { max }),
  };
}

export async function getProductos({
  query,
  sortKey,
  reverse,
  estado,
  precio,
}: {
  query?: string;
  sortKey?: string;
  reverse?: boolean;
  estado?: string;
  precio?: string;
} = {}) {
  let queryBuilder = supabase
    .from("productos")
    .select("*, producto_imagenes(*)");

  if (query) {
    queryBuilder = queryBuilder.or(
      `titulo.ilike.%${query}%,descripcion.ilike.%${query}%,tags.cs.{${query}}`,
    );
  }

  if (estado && ESTADOS_VALIDOS.includes(estado)) {
    queryBuilder = queryBuilder.eq("status", estado);
  }

  if (precio) {
    const { min, max } = parseRangoPrecio(precio);
    if (min !== undefined) queryBuilder = queryBuilder.gte("precio", min);
    if (max !== undefined) queryBuilder = queryBuilder.lte("precio", max);
  }

  queryBuilder = orderProductos(queryBuilder, sortKey, reverse);

  const { data, error } = await queryBuilder.limit(100);

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}

export async function getProducto(slug: string) {
  const { data, error } = await supabase
    .from("productos")
    .select(
      "*, producto_imagenes(*, orden_cat), producto_variantes(*), categorias(nombre, slug)",
    )
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Producto & {
    producto_imagenes: ProductoImagen[];
    producto_variantes: import("./types").ProductoVariante[];
    categorias: { nombre: string; slug: string } | null;
  };
}

export async function getProductosByCategoria(
  categoriaSlug: string,
  {
    sortKey,
    reverse,
    estado,
    precio,
  }: {
    sortKey?: string;
    reverse?: boolean;
    estado?: string;
    precio?: string;
  } = {},
) {
  let queryBuilder = supabase
    .from("productos")
    .select("*, producto_imagenes(*), categorias!inner(id, nombre, slug)")
    .eq("categorias.slug", categoriaSlug);

  if (estado && ESTADOS_VALIDOS.includes(estado)) {
    queryBuilder = queryBuilder.eq("status", estado);
  }

  if (precio) {
    const { min, max } = parseRangoPrecio(precio);
    if (min !== undefined) queryBuilder = queryBuilder.gte("precio", min);
    if (max !== undefined) queryBuilder = queryBuilder.lte("precio", max);
  }

  queryBuilder = orderProductos(queryBuilder, sortKey, reverse);

  const { data, error } = await queryBuilder;

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}

export async function getProductosDestacados() {
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_imagenes(*)")
    .eq("destacado", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}

export async function getProductosOferta() {
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_imagenes(*)")
    .eq("status", "oferta")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}

export async function getProductosPreVenta() {
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_imagenes(*)")
    .eq("status", "pre-venta")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}

/**
 * Los más vendidos = suma de unidades vendidas en items_pedido,
 * excluyendo los pedidos cancelados (regla de negocio).
 * Si todavía no hay ventas reales, hace fallback:
 *   1) productos destacados  2) los que más stock tienen.
 */
export async function getProductosMasVendidos(limit = 8) {
  // 1) Pedidos que sí cuentan como venta (regla: se excluye 'cancelled')
  const { data: pedidos, error: pedidosError } = await supabase
    .from("pedidos")
    .select("id")
    .neq("status", "cancelled");

  if (pedidosError) throw pedidosError;
  const pedidoIds = (pedidos || []).map((pedido) => pedido.id);

  if (pedidoIds.length > 0) {
    // 2) Líneas de esos pedidos (producto y cantidad comprada)
    const { data: items, error: itemsError } = await supabase
      .from("items_pedido")
      .select("producto_id, cantidad")
      .in("pedido_id", pedidoIds);

    if (itemsError) throw itemsError;

    // 3) Agregamos en memoria: producto -> unidades vendidas
    const unidades = new Map<string, number>();
    for (const item of items || []) {
      if (!item.producto_id) continue;
      unidades.set(
        item.producto_id,
        (unidades.get(item.producto_id) ?? 0) + (item.cantidad ?? 0),
      );
    }

    if (unidades.size > 0) {
      // 4) Ranking de ids y descarga de esos productos
      const ranking = [...unidades.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id)
        .slice(0, limit);

      const { data, error } = await supabase
        .from("productos")
        .select("*, producto_imagenes(*)")
        .in("id", ranking);

      if (error) throw error;

      // 5) Reordenamos los productos según el ranking de ventas
      const posicion = new Map(ranking.map((id, index) => [id, index]));
      return ((data || []) as ProductoConImagen[]).sort(
        (a, b) => (posicion.get(a.id) ?? 0) - (posicion.get(b.id) ?? 0),
      );
    }
  }

  // 6) FALLBACK: sin ventas reales mostramos los destacados...
  const destacados = await getProductosDestacados();
  if (destacados.length > 0) return destacados.slice(0, limit);

  // 7) ...y si tampoco hay destacados, los que más stock tienen
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_imagenes(*)")
    .order("stock", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}

/** Novedades: los productos con fecha de alta más reciente */
export async function getProductosNuevos(limit = 8) {
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_imagenes(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}

export async function getProductosRelacionados(
  productoId: string,
  categoriaId: string,
) {
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_imagenes(*)")
    .eq("categoria_id", categoriaId)
    .neq("id", productoId)
    .limit(4);

  if (error) throw error;
  return (data || []) as ProductoConImagen[];
}
