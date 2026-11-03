-- ============================================================================
-- Envío variable por tramos de importe
--
-- Antes: `coste_envio` era 0 (envío gratis en todos los pedidos). El importe se
-- pasaba desde TypeScript con la constante `COSTE_ENVIO`, así que la base de
-- datos no tenía criterio propio y el checkout de Stripe y `pedidos.coste_envio`
-- podían desincronizarse en cuanto la regla dejara de ser una constante.
--
-- Ahora: el coste depende del subtotal (SIN IVA), con los mismos tramos que
-- `lib/envio.ts`:
--
--     subtotal < 150 €          -> 5,95 €
--     150 € <= subtotal < 300 € -> 2,95 €
--     subtotal >= 300 €         -> gratis
--
-- Por qué está la regla también en SQL: `crear_pedido` se llama desde el webhook
-- de Stripe, que llega sin cookies y por tanto no puede releer el carrito en
-- TypeScript para calcular el subtotal. El único sitio que conoce el subtotal
-- real en ese momento es esta función, así que aquí se recalcula. Si cambias los
-- tramos, cámbialos en los dos sitios (`lib/envio.ts` y aquí) o la factura y la
-- base de datos dejarán de cuadrar.
--
-- Ejecutar en: Supabase Studio > SQL Editor > New query > Run
-- Es idempotente (`create or replace`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Regla de negocio en un único sitio dentro de la base de datos
-- ----------------------------------------------------------------------------

create or replace function public.coste_envio_variable(p_subtotal numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_subtotal, 0) < 150 then 5.95
    when coalesce(p_subtotal, 0) < 300 then 2.95
    else 0
  end::numeric;
$$;

revoke execute on function public.coste_envio_variable(numeric) from public;

-- ----------------------------------------------------------------------------
-- 2. `crear_pedido`: calcula el envío en vez de confiar en el parámetro
--
--    `p_coste_envio` se mantiene en la firma por compatibilidad con las
--    llamadas ya desplegadas, pero se ignora: el importe lo decide el subtotal.
-- ----------------------------------------------------------------------------

create or replace function public.crear_pedido(
  p_usuario_id uuid default null,
  p_session_id text default null,
  p_direccion jsonb,
  p_pago_id text,
  p_metodo_pago text default 'stripe',
  p_iva_porcentaje numeric default 21,
  p_coste_envio numeric default 0
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_propietario uuid;
  v_sesion text;
  v_item record;
  v_pedido_id uuid;
  v_existente uuid;
  v_subtotal numeric := 0;
  v_iva numeric := 0;
  v_coste_envio numeric := 0;
  v_total numeric := 0;
  v_precio numeric;
begin
  if nullif(btrim(coalesce(p_pago_id, '')), '') is null then
    raise exception 'Falta el identificador del pago.';
  end if;

  if p_direccion is null or p_direccion = '{}'::jsonb then
    raise exception 'Falta la dirección de envío.';
  end if;

  -- Idempotencia: si el pago ya está registrado devolvemos ese pedido.
  select pe.id into v_existente
  from public.pedidos pe
  where pe.pago_id = p_pago_id
  limit 1;

  if found then
    return v_existente;
  end if;

  v_propietario := coalesce(v_uid, p_usuario_id);
  v_sesion := case
    when v_propietario is not null then null
    else nullif(btrim(coalesce(p_session_id, '')), '')
  end;

  if v_propietario is null and v_sesion is null then
    raise exception 'No se ha podido identificar el carrito del que crear el pedido.';
  end if;

  perform 1
  from public.carrito_items ci
  where (v_propietario is not null and ci.user_id = v_propietario)
     or (v_propietario is null and ci.session_id = v_sesion)
  limit 1;

  if not found then
    raise exception 'El carrito está vacío.';
  end if;

  select coalesce(sum(coalesce(var.precio, p.precio) * ci.cantidad), 0)
    into v_subtotal
  from public.carrito_items ci
  join public.productos p on p.id = ci.producto_id
  left join public.producto_variantes var on var.id = ci.variante_id
  where (v_propietario is not null and ci.user_id = v_propietario)
     or (v_propietario is null and ci.session_id = v_sesion);

  v_iva := round(v_subtotal * p_iva_porcentaje / 100, 2);

  -- El envío se calcula aquí y no se acepta de fuera: así la fila de `pedidos`
  -- y el `direccion_pago` que se imprime en la factura salen siempre de la
  -- misma fuente, aunque el llamador mande otro importe.
  v_coste_envio := public.coste_envio_variable(v_subtotal);

  v_total := v_subtotal + v_iva + v_coste_envio;

  insert into public.pedidos (
    usuario_id, session_id, status, subtotal, coste_envio, total, moneda,
    direccion_pedido, direccion_pago, metodo_pago, pago_id
  ) values (
    v_propietario,
    -- Para un invitado, la única forma de unir su recorrido de eventos con su
    -- pedido. Sin esta columna el tramo session_id -> order_id se rompía.
    v_sesion,
    'paid',
    v_subtotal,
    v_coste_envio,
    v_total,
    'EUR',
    p_direccion,
    jsonb_build_object(
      'subtotal', v_subtotal,
      'iva_porcentaje', p_iva_porcentaje,
      'iva', v_iva,
      'coste_envio', v_coste_envio,
      'total', v_total
    ),
    p_metodo_pago,
    p_pago_id
  )
  returning id into v_pedido_id;

  for v_item in
    select
      ci.producto_id,
      ci.variante_id,
      ci.cantidad,
      p.titulo,
      coalesce(var.precio, p.precio) as precio,
      (
        select pi.url
        from public.producto_imagenes pi
        where pi.producto_id = p.id
        order by pi.orden_cat, pi.id
        limit 1
      ) as imagen
    from public.carrito_items ci
    join public.productos p on p.id = ci.producto_id
    left join public.producto_variantes var on var.id = ci.variante_id
    where (v_propietario is not null and ci.user_id = v_propietario)
       or (v_propietario is null and ci.session_id = v_sesion)
    order by ci.created_at, ci.id
  loop
    v_precio := v_item.precio;

    insert into public.items_pedido (
      pedido_id, producto_id, variante_id, titulo_producto,
      img_producto, cantidad, precio
    ) values (
      v_pedido_id, v_item.producto_id, v_item.variante_id, v_item.titulo,
      v_item.imagen, v_item.cantidad, v_precio
    );

    -- El stock solo se descuenta en productos gestionados por stock.
    update public.productos
    set stock = greatest(0, stock - v_item.cantidad),
        updated_at = now()
    where id = v_item.producto_id
      and status = 'stock';
  end loop;

  -- Eventos de negocio. Van AQUÍ, después del bucle y no después del insert de
  -- `pedidos`: `lineas` solo se puede contar cuando las líneas ya existen.
  --
  -- Al estar dentro de la misma transacción que el pedido, no puede haber un
  -- pedido sin evento ni un evento de pedido que no exista.
  perform public.registrar_evento(
    'order.created', v_sesion,
    jsonb_build_object(
      'pedido_id', v_pedido_id,
      'lineas',    (select count(*) from public.items_pedido
                    where pedido_id = v_pedido_id),
      'subtotal',  v_subtotal,
      'iva',       v_iva,
      'coste_envio', v_coste_envio,
      'total',     v_total,
      'moneda',    'EUR'
    )
  );

  perform public.registrar_evento(
    'payment.simulated', v_sesion,
    jsonb_build_object(
      'pedido_id',   v_pedido_id,
      'pago_id',     p_pago_id,
      'metodo_pago', p_metodo_pago,
      'importe',     v_total
    )
  );

  if v_propietario is not null then
    delete from public.carrito_items where user_id = v_propietario;
  else
    delete from public.carrito_items where session_id = v_sesion;
  end if;

  return v_pedido_id;
end;
$$;

revoke execute on function public.crear_pedido(uuid, text, jsonb, text, text, numeric, numeric) from public;
grant execute on function public.crear_pedido(uuid, text, jsonb, text, text, numeric, numeric) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Verificación rápida (opcional, solo lectura)
--
--    select public.coste_envio_variable(129);  -- 5.95
--    select public.coste_envio_variable(258);  -- 2.95
--    select public.coste_envio_variable(387);  -- 0
-- ----------------------------------------------------------------------------
