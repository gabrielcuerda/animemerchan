import { createClient } from "@/lib/supabase/server";
import type { ItemPedido, Pedido } from "@/lib/db/types";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mis pedidos",
  description: "Consulta el historial de tus pedidos.",
};

type PedidoConItems = Pedido & {
  items_pedido: ItemPedido[];
};

const statusLabels: Record<Pedido["status"], string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusClasses: Record<Pedido["status"], string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  shipped:
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  delivered:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number(amount));
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account/orders");
  }

  const { data, error } = await supabase
    .from("pedidos")
    .select("*, items_pedido(*)")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("No hemos podido cargar tus pedidos.");
  }

  const pedidos = (data || []) as PedidoConItems[];

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold">Historial de pedidos</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Consulta el estado y el detalle de tus compras.
        </p>
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-black">
          <p className="font-medium">Todavía no tienes pedidos.</p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Cuando hagas tu primera compra, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pedidos.map((pedido) => (
            <article
              key={pedido.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-black"
            >
              <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Pedido #{pedido.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm">
                    {new Intl.DateTimeFormat("es-ES", {
                      dateStyle: "medium",
                    }).format(new Date(pedido.created_at))}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusClasses[pedido.status]}`}
                >
                  {statusLabels[pedido.status]}
                </span>
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {pedido.items_pedido.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-4 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.titulo_producto}</p>
                      <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                        Cantidad: {item.cantidad}
                      </p>
                    </div>
                    <p className="shrink-0">
                      {formatCurrency(
                        Number(item.precio) * item.cantidad,
                        pedido.moneda,
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
                <span className="font-semibold">
                  Total: {formatCurrency(Number(pedido.total), pedido.moneda)}
                </span>
                <div className="flex flex-wrap items-center gap-4">
                  {pedido.pago_id ? (
                    <Link
                      href={`/factura/${encodeURIComponent(pedido.pago_id)}`}
                      className="font-medium text-blue-600 underline underline-offset-4 hover:text-blue-700 dark:text-blue-400"
                    >
                      Ver factura
                    </Link>
                  ) : null}
                  <Link
                    href={`/account/incidencias?pedido=${pedido.id}`}
                    className="font-medium text-blue-600 underline underline-offset-4 hover:text-blue-700 dark:text-blue-400"
                  >
                    Abrir incidencia
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
