"use server";

import { enviarIncidenciaIntegracion } from "@/lib/integracion/enviar-integracion";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";

export type IncidenciaActionState = {
  success?: string;
  error?: string;
  incidenciaId?: string;
};

const TIPOS = [
  "retraso_envio",
  "producto_danado",
  "pedido_incorrecto",
  "falta_producto",
  "otro",
] as const;

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Crea una incidencia desde la cuenta del cliente.
 *
 * La tienda no guarda la incidencia: valida que el pedido sea del usuario y
 * envía `incident.created` al webhook de n8n, que la crea en el back-office.
 * Así el back-office sigue siendo el sistema de registro y el cliente recibe
 * una referencia real.
 */
export async function crearIncidencia(
  _estadoAnterior: IncidenciaActionState,
  formData: FormData,
): Promise<IncidenciaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  }

  const pedidoId = texto(formData, "pedido_id");
  const tipo = texto(formData, "tipo");
  const descripcion = texto(formData, "descripcion");

  if (!pedidoId) {
    return { error: "Selecciona el pedido al que se refiere la incidencia." };
  }

  if (!(TIPOS as readonly string[]).includes(tipo)) {
    return { error: "Selecciona un tipo de incidencia válido." };
  }

  if (descripcion.length < 10) {
    return { error: "Describe la incidencia con al menos 10 caracteres." };
  }

  if (descripcion.length > 1000) {
    return { error: "La descripción no puede superar los 1000 caracteres." };
  }

  // El pedido tiene que ser del usuario. No nos fiamos del <select>: el
  // formulario es público para cualquiera con sesión y el id viaja en el POST.
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("id")
    .eq("id", pedidoId)
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (pedidoError) {
    console.error(
      "[incidencias] No se ha podido comprobar el pedido:",
      pedidoError.message,
    );
    return { error: "No hemos podido comprobar el pedido." };
  }

  if (!pedido) {
    return { error: "Ese pedido no existe o no pertenece a tu cuenta." };
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("full_nombre")
    .eq("id", user.id)
    .maybeSingle();

  const nombrePerfil =
    typeof perfil?.full_nombre === "string" ? perfil.full_nombre : null;
  const nombreMetadata =
    typeof user.user_metadata?.full_nombre === "string"
      ? user.user_metadata.full_nombre
      : null;

  const incidenciaId = `INC-${randomUUID()}`;

  // Demo: el cliente web no tiene un chat de Telegram conocido. Asociamos la
  // incidencia al chat del equipo/pruebas para que P3 pueda validarla y para
  // que el back-office no guarde null. Se puede cambiar sin tocar código con
  // INCIDENCIAS_TELEGRAM_CHAT_ID.
  const telegramChatId =
    process.env.INCIDENCIAS_TELEGRAM_CHAT_ID?.trim() || "7683478497";

  const resultado = await enviarIncidenciaIntegracion({
    incidenciaId,
    pedidoId,
    clienteEmail: user.email ?? "",
    clienteNombre: nombrePerfil ?? nombreMetadata,
    tipo,
    descripcion,
    fecha: new Date().toISOString(),
    telegramChatId,
  });

  if (!resultado.ok) {
    const detalle = resultado.errores?.length
      ? ` ${resultado.errores.join(" ")}`
      : "";

    return {
      error: `${resultado.error ?? "No hemos podido registrar la incidencia."}${detalle}`,
    };
  }

  return {
    success:
      `Incidencia registrada con la referencia ${resultado.incidenciaId ?? incidenciaId}. ` +
      "El equipo de soporte la revisará.",
    incidenciaId: resultado.incidenciaId ?? incidenciaId,
  };
}
