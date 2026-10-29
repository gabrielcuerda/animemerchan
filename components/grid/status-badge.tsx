import clsx from "clsx";
import type { Producto } from "@/lib/db/types";
import { translate } from "@/lib/i18n/dict";
import { getLang } from "@/lib/i18n/lang";

type Status = Producto["status"];

const ESTADOS: Record<Status, { key: string; clases: string }> = {
  stock: { key: "status.stock", clases: "bg-emerald-600 text-white" },
  "pre-venta": { key: "status.preVenta", clases: "bg-amber-400 text-black" },
  "a-pedido": { key: "status.aPedido", clases: "bg-sky-600 text-white" },
  oferta: { key: "status.oferta", clases: "bg-rose-600 text-white" },
};

export default async function StatusBadge({
  status,
  stock,
}: {
  status: Status;
  stock?: number;
}) {
  const lang = await getLang();

  // Marcado como "en stock" pero sin unidades => agotado
  const agotado = status === "stock" && stock !== undefined && stock <= 0;

  const estado = agotado
    ? { key: "status.agotado", clases: "bg-alert-500 text-white" }
    : ESTADOS[status];

  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wider shadow-md",
        estado.clases,
      )}
    >
      {translate(lang, estado.key)}
    </span>
  );
}
