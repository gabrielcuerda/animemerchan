import { getProducto, getProductos } from "@/lib/db/productos";
import type {
  Producto,
  ProductoImagen,
  ProductoVariante,
} from "@/lib/db/types";
import type { Image, Product, ProductOption, ProductVariant } from "./types";
import { getLang } from "@/lib/i18n/lang";
import { traducirCampo } from "@/lib/i18n/productos.en";
import type { Lang } from "@/lib/i18n/dict";

const placeholderImage: Image = {
  url: "/placeholder.svg",
  altText: "Imagen no disponible",
  width: 1200,
  height: 1200,
};

type ProductoConDetalle = Producto & {
  producto_imagenes: ProductoImagen[];
  producto_variantes: ProductoVariante[];
  categorias: { nombre: string; slug: string } | null;
};

const IMAGENES_LOCALES: Record<string, string[]> = {
  // Vacío: las fotos viven en Supabase Storage (`producto_imagenes`).
  // El mecanismo se conserva como respaldo para productos sin fotos en BD.
};

export function getImagenesLocales(slug: string): string[] {
  return IMAGENES_LOCALES[slug] ?? [];
}

function mapImages(producto: ProductoConDetalle, titulo: string): Image[] {
  const images = [...(producto.producto_imagenes || [])]
    .sort((a, b) => a.orden_cat - b.orden_cat)
    .map((image) => ({
      url: image.url,
      altText: image.alt_text || titulo,
      width: 1200,
      height: 1200,
    }));

  if (images.length > 0) return images;

  const locales = IMAGENES_LOCALES[producto.slug] ?? [];
  if (locales.length > 0)
    return locales.map((url) => ({
      url,
      altText: titulo,
      width: 1200,
      height: 1200,
    }));

  return [placeholderImage];
}

function mapProduct(producto: ProductoConDetalle, lang: Lang): Product {
  const titulo = traducirCampo(producto.slug, "titulo", producto.titulo, lang);
  const descripcion = traducirCampo(
    producto.slug,
    "descripcion",
    producto.descripcion,
    lang,
  );

  type SourceVariant = Pick<
    ProductoVariante,
    "id" | "titulo" | "precio" | "stock" | "opciones"
  >;

  const sourceVariants: SourceVariant[] = producto.producto_variantes?.length
    ? producto.producto_variantes
    : [
        {
          id: producto.id,
          titulo: "Default Title",
          precio: producto.precio,
          stock: producto.stock,
          opciones: [],
        },
      ];

  const variants: ProductVariant[] = sourceVariants.map((variant) => ({
    id: variant.id,
    title: variant.titulo,
    availableForSale: variant.stock > 0 || producto.status !== "stock",
    selectedOptions: variant.opciones || [],
    price: {
      amount: String(variant.precio),
      currencyCode: "EUR",
    },
  }));

  const optionMap = new Map<string, Set<string>>();
  variants.forEach((variant) => {
    variant.selectedOptions.forEach((option) => {
      const values = optionMap.get(option.name) || new Set<string>();
      values.add(option.value);
      optionMap.set(option.name, values);
    });
  });

  const options: ProductOption[] = Array.from(optionMap.entries()).map(
    ([name, values]) => ({
      id: `${producto.id}-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      values: Array.from(values),
    }),
  );

  const prices = variants.map((variant) => Number(variant.price.amount));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const images = mapImages(producto, titulo);

  return {
    id: producto.id,
    title: titulo,
    description: descripcion,
    descriptionHtml: descripcion,
    handle: producto.slug,
    availableForSale: producto.stock > 0 || producto.status !== "stock",
    status: producto.status,
    stock: producto.stock,
    categoria: producto.categorias ?? null,
    featuredImage: images[0] || placeholderImage,
    images,
    options,
    variants,
    priceRange: {
      minVariantPrice: { amount: String(minPrice), currencyCode: "EUR" },
      maxVariantPrice: { amount: String(maxPrice), currencyCode: "EUR" },
    },
    seo: {
      title: titulo,
      description: descripcion || titulo,
    },
    tags: producto.tags || [],
    createdAt: producto.created_at,
    updatedAt: producto.updated_at,
  };
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  const producto = await getProducto(handle);
  if (!producto) return undefined;
  const lang = await getLang();
  return mapProduct(producto as ProductoConDetalle, lang);
}

export async function getProductRecommendations(
  productId: string,
): Promise<Product[]> {
  const productos = await getProductos({});
  const lang = await getLang();
  return productos
    .filter((producto) => producto.id !== productId)
    .slice(0, 4)
    .map((producto) =>
      mapProduct(
        {
          ...producto,
          producto_variantes: [],
          categorias: null,
        } as ProductoConDetalle,
        lang,
      ),
    );
}
