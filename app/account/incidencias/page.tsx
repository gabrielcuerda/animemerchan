import IncidenciaForm from "@/components/account/incidencia-form";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Soporte postventa",
  description: "Abre una incidencia sobre uno de tus pedidos.",
};

type PedidoResumen = {
  id: string;
  status: string;
  total: number;
  moneda: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function formatoPedido(pedido: PedidoResumen) {
  const importe = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: pedido.moneda || "EUR",
  }).format(Number(pedido.total));

  const fecha = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
  }).format(new Date(pedido.created_at));

  return `#${pedido.id.slice(0, 8).toUpperCase()} · ${
    STATUS_LABEL[pedido.status] ?? pedido.status
  } · ${importe} · ${fecha}`;
}

export default async function IncidenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string | string[] }>;
}) {
  const { pedido } = await searchParams;
  const pedidoInicial = Array.isArray(pedido) ? pedido[0] : pedido;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account/incidencias");
  }

  const { data, error } = await supabase
    .from("pedidos")
    .select("id, status, total, moneda, created_at")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("No hemos podido cargar tus pedidos.");
  }

  const pedidos = (data ?? []) as PedidoResumen[];

  return (
    <section className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Soporte postventa</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Cuéntanos qué ha pasado con tu pedido. La incidencia llega al
          back-office y el equipo la revisará.
        </p>
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-black">
          <p className="font-medium">Todavía no tienes pedidos.</p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Cuando tengas uno, podrás abrir una incidencia desde aquí.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-black">
          <IncidenciaForm
            key={pedidoInicial ?? "sin-pedido"}
            pedidoInicial={pedidoInicial ?? ""}
            pedidos={pedidos.map((pedido) => ({
              id: pedido.id,
              etiqueta: formatoPedido(pedido),
            }))}
          />
        </div>
      )}
    </section>
  );
}
