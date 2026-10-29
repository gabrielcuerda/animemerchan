export type ColorProducto = {
  clave: string;
  hex: string;
  valor: string;
};

/** El orden debe coincidir con IMAGENES_LOCALES en ./products. */
export const COLORES_POR_PRODUCTO: Record<string, ColorProducto[]> = {
  "camiseta-attack-on-titan-eren-titan": [
    { clave: "azul", hex: "#1d4ed8", valor: "Azul" },
    { clave: "roja", hex: "#dc2626", valor: "Roja" },
    { clave: "verde", hex: "#16a34a", valor: "Verde" },
    { clave: "negra", hex: "#18181b", valor: "Negra" },
    { clave: "blanca", hex: "#f8fafc", valor: "Blanca" },
  ],
};

export function tieneCirculos(slug: string): boolean {
  return slug in COLORES_POR_PRODUCTO;
}
