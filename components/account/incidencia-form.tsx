"use client";

import {
  crearIncidencia,
  type IncidenciaActionState,
} from "@/app/account/incidencias/actions";
import { useActionState } from "react";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-blue-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white";

const TIPOS = [
  {
    value: "retraso_envio",
    label: "El pedido no ha llegado o se ha retrasado",
  },
  {
    value: "producto_danado",
    label: "El producto ha llegado dañado",
  },
  {
    value: "pedido_incorrecto",
    label: "He recibido un producto equivocado",
  },
  {
    value: "falta_producto",
    label: "Falta un producto del pedido",
  },
  {
    value: "otro",
    label: "Otro problema",
  },
] as const;

export default function IncidenciaForm({
  pedidos,
  pedidoInicial = "",
}: {
  pedidos: { id: string; etiqueta: string }[];
  pedidoInicial?: string;
}) {
  const [state, formAction, pending] = useActionState<
    IncidenciaActionState,
    FormData
  >(crearIncidencia, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="pedido_id">
          Pedido
        </label>
        <select
          id="pedido_id"
          name="pedido_id"
          className={inputClass}
          required
          defaultValue={pedidoInicial}
        >
          <option value="" disabled>
            Selecciona el pedido afectado
          </option>
          {pedidos.map((pedido) => (
            <option key={pedido.id} value={pedido.id}>
              {pedido.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="tipo">
          Tipo de incidencia
        </label>
        <select
          id="tipo"
          name="tipo"
          className={inputClass}
          required
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona un tipo
          </option>
          {TIPOS.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="descripcion">
          ¿Qué ha pasado?
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          className={inputClass}
          rows={5}
          required
          minLength={10}
          maxLength={1000}
          placeholder="Cuéntanos los detalles para que podamos ayudarte."
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          No incluyas datos de pago ni contraseñas.
        </p>
      </div>

      {state.success ? (
        <p
          className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

      {state.error ? (
        <p
          className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Enviando..." : "Enviar incidencia"}
      </button>
    </form>
  );
}
