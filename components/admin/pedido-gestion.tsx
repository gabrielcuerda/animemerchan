"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BOTON_PELIGRO,
  BOTON_SECUNDARIO,
  Campo,
  Input,
  MensajeAccion,
  Select,
  Textarea,
} from "@/components/admin/campos";
import { fechaYhora } from "@/lib/admin/formato";
import {
  cambiarEstadoPedido,
  guardarNotas,
  guardarSeguimiento,
  reenviarFactura,
} from "@/app/admin/pedidos/actions";
import {
  PEDIDO_STATUS,
  PEDIDO_STATUS_LABEL,
  SECUENCIA_PEDIDO,
  type AdminActionState,
  type EstadoFactura,
  type PedidoStatus,
} from "@/lib/admin/tipos";

/**
 * Panel de gestión de un pedido: estado, seguimiento y notas internas.
 *
 * `useTransition` + llamada directa a la action + `router.refresh()`, el patrón
 * de `components/wishlist/wishlist-toggle.tsx`. Aquí no hay `<form>` porque cada
 * control guarda por separado.
 */
export default function PedidoGestion({
  pedidoId,
  estado,
  tracking,
  notas,
  email,
  factura,
  pagoId,
}: {
  pedidoId: string;
  estado: PedidoStatus;
  tracking: string | null;
  notas: string | null;
  /** Email guardado en el pedido; null si la compra no lo conservó. */
  email: string | null;
  /** Último envío de la factura, según `correo_estado`. */
  factura: EstadoFactura;
  /** `cs_...` de Stripe; es lo que identifica la factura en /factura. */
  pagoId: string | null;
}) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();

  const [estadoActual, setEstadoActual] = useState<PedidoStatus>(estado);
  const [seguimiento, setSeguimiento] = useState(tracking ?? "");
  const [nota, setNota] = useState(notas ?? "");

  const [mensajeEstado, setMensajeEstado] = useState<AdminActionState>({});
  const [mensajeTracking, setMensajeTracking] = useState<AdminActionState>({});
  const [mensajeNotas, setMensajeNotas] = useState<AdminActionState>({});
  const [mensajeFactura, setMensajeFactura] = useState<AdminActionState>({});

  const ejecutar = (
    accion: () => Promise<AdminActionState>,
    setMensaje: (estado: AdminActionState) => void,
    trasGuardar?: () => void,
  ) => {
    iniciarTransicion(async () => {
      const resultado = await accion();
      setMensaje(resultado);

      if (resultado.error) {
        toast.error(resultado.error);
      } else {
        if (resultado.success) toast.success(resultado.success);
        trasGuardar?.();
      }

      router.refresh();
    });
  };

  const cambioEstado = (nuevo: PedidoStatus) => {
    const cancelar = nuevo === "cancelled" && estadoActual !== "cancelled";

    if (
      cancelar &&
      !window.confirm(
        "¿Cancelar este pedido?\n\nEl stock de las líneas NO se repone automáticamente: tendrás que ajustarlo a mano en el producto. Para reembolsar, usa Stripe Dashboard.",
      )
    ) {
      return;
    }

    ejecutar(
      () => cambiarEstadoPedido(pedidoId, nuevo),
      setMensajeEstado,
      () => setEstadoActual(nuevo),
    );
  };

  const pasoActual = SECUENCIA_PEDIDO.indexOf(estadoActual);
  const cancelado = estadoActual === "cancelled";

  return (
    <div className="flex flex-col gap-6">
      <MensajeAccion
        success={mensajeEstado.success}
        error={mensajeEstado.error}
      />

      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-ink-500">
          Estado
        </h2>

        {!cancelado ? (
          <ol
            className="mt-3 flex flex-wrap gap-2"
            aria-label="Progreso del pedido"
          >
            {SECUENCIA_PEDIDO.map((paso, indice) => {
              const alcanzado = indice <= pasoActual;

              return (
                <li
                  key={paso}
                  aria-current={paso === estadoActual ? "step" : undefined}
                  className={
                    alcanzado
                      ? "flex-1 rounded-card border border-brand-300 bg-brand-50 px-3 py-2 text-center text-xs font-semibold text-brand-700"
                      : "flex-1 rounded-card border border-ink-200 px-3 py-2 text-center text-xs font-medium text-ink-400"
                  }
                >
                  {PEDIDO_STATUS_LABEL[paso]}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 rounded-card border border-alert-300 bg-alert-50 px-4 py-3 text-sm font-semibold text-alert-700">
            Este pedido está cancelado.
          </p>
        )}

        <div className="mt-4">
          <Campo etiqueta="Cambiar estado" htmlFor="pedido-estado">
            <Select
              id="pedido-estado"
              value={estadoActual}
              disabled={pendiente}
              onChange={(e) => cambioEstado(e.target.value as PedidoStatus)}
            >
              {PEDIDO_STATUS.map((valor) => (
                <option key={valor} value={valor}>
                  {PEDIDO_STATUS_LABEL[valor]}
                </option>
              ))}
            </Select>
          </Campo>
          <p className="mt-2 text-xs text-ink-500">
            El cambio se sincroniza con el back-office a través de n8n.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-ink-500">
          Seguimiento
        </h2>

        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            ejecutar(
              () => guardarSeguimiento(pedidoId, seguimiento),
              setMensajeTracking,
            );
          }}
        >
          <Campo
            etiqueta="Número de seguimiento"
            htmlFor="pedido-tracking"
            ayuda="El número que da la empresa de envíos."
          >
            <Input
              id="pedido-tracking"
              value={seguimiento}
              onChange={(e) => setSeguimiento(e.target.value)}
              placeholder="1Z999AA10123456784"
            />
          </Campo>

          <div>
            <button
              type="submit"
              disabled={pendiente}
              className={BOTON_SECUNDARIO}
            >
              {pendiente ? "Guardando…" : "Guardar seguimiento"}
            </button>
          </div>

          <MensajeAccion
            success={mensajeTracking.success}
            error={mensajeTracking.error}
          />
        </form>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-ink-500">
          Factura
        </h2>

        {!email ? (
          <p className="mt-3 rounded-card border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
            Este pedido no guardó ningún email, así que no se le puede mandar la
            factura por correo. Suele ser un pedido anterior a que la factura se
            enviara desde aquí: el cliente sí recibió la de Stripe.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-600">
              Se envía a{" "}
              <span className="font-medium text-ink-900">{email}</span>.
            </p>

            {factura ? (
              <p className="mt-1 text-sm text-ink-500">
                {factura.estado === "enviado" ? (
                  <>
                    Enviada el {fechaYhora(factura.enviado_at)}.{" "}
                    {factura.intentos > 1
                      ? `Enviada ${factura.intentos} veces.`
                      : null}
                  </>
                ) : factura.estado === "error" ? (
                  <>
                    El último envío falló ({factura.intentos}{" "}
                    {factura.intentos === 1 ? "intento" : "intentos"}):{" "}
                    <span className="text-alert-700">{factura.error}</span>
                  </>
                ) : (
                  "Pendiente de enviar."
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-500">
                Todavía no se ha registrado ningún envío.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pendiente || cancelado}
                onClick={() =>
                  ejecutar(() => reenviarFactura(pedidoId), setMensajeFactura)
                }
                className={BOTON_SECUNDARIO}
              >
                {pendiente ? "Enviando…" : "Reenviar factura"}
              </button>

              {pagoId ? (
                <Link
                  href={`/factura/${encodeURIComponent(pagoId)}`}
                  className="text-sm font-medium text-ink-600 underline underline-offset-4 hover:text-ink-950"
                >
                  Ver la factura
                </Link>
              ) : null}
            </div>

            <MensajeAccion
              success={mensajeFactura.success}
              error={mensajeFactura.error}
            />
          </>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-ink-500">
          Notas internas
        </h2>

        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            ejecutar(() => guardarNotas(pedidoId, nota), setMensajeNotas);
          }}
        >
          <Campo
            etiqueta="Notas para el equipo"
            htmlFor="pedido-notas"
            ayuda="Solo para el equipo. Ninguna vista de cliente las muestra, y no deberías añadir ninguna que lo haga."
          >
            <Textarea
              id="pedido-notas"
              rows={5}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Comprobación de la transferencia pendiente, instrucciones del cliente…"
            />
          </Campo>

          <div>
            <button
              type="submit"
              disabled={pendiente}
              className={BOTON_PELIGRO}
            >
              {pendiente ? "Guardando…" : "Guardar notas"}
            </button>
          </div>

          <MensajeAccion
            success={mensajeNotas.success}
            error={mensajeNotas.error}
          />
        </form>
      </div>
    </div>
  );
}
