-- ============================================================
-- TERMAS DEL RÍO · Módulo de reservaciones
-- 02 · Funciones de apoyo, validaciones, vista y RPC principales
-- ============================================================

set search_path = public, extensions;

-- ---------- Perfil y permisos ----------
create or replace function public.mi_perfil()
returns public.perfiles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select * from public.perfiles where id = auth.uid() and activo limit 1;
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.perfiles
        where id = auth.uid() and activo and rol = 'admin'
    );
$$;

create or replace function public.es_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.perfiles
        where id = auth.uid() and activo and rol in ('admin','recepcion')
    );
$$;

create or replace function public.puede_leer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1 from public.perfiles
        where id = auth.uid() and activo
    );
$$;

-- ---------- Alta automática de perfil (inactivo por defecto) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.perfiles (id, nombre, email, rol, activo)
    values (
        new.id,
        coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(coalesce(new.email, 'usuario'), '@', 1)),
        new.email,
        'consulta',
        false
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- ---------- updated_at / updated_by ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    new.updated_at := now();
    if tg_table_name in ('reservaciones','ajustes') then
        new.updated_by := auth.uid();
    end if;
    return new;
end;
$$;

-- ---------- Bitácora genérica ----------
create or replace function public.log_cambio()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_accion text;
    v_id text;
    v_detalle jsonb;
    v_email text;
begin
    v_email := nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email';

    if tg_op = 'INSERT' then
        v_accion := 'crear';
        v_id := new.id::text;
        v_detalle := jsonb_build_object('nuevo', to_jsonb(new));
    elsif tg_op = 'UPDATE' then
        v_accion := 'actualizar';
        v_id := new.id::text;
        v_detalle := jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new));
    else
        v_accion := 'eliminar';
        v_id := old.id::text;
        v_detalle := jsonb_build_object('anterior', to_jsonb(old));
    end if;

    insert into public.actividad (usuario_id, usuario_email, accion, entidad, entidad_id, detalle)
    values (auth.uid(), v_email, v_accion, tg_table_name, v_id, v_detalle);

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

-- ---------- Códigos inmutables ----------
create or replace function public.proteger_codigo()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if new.codigo is distinct from old.codigo then
        raise exception 'El código de la reservación no se puede modificar.';
    end if;
    return new;
end;
$$;

-- ---------- Protección de campos de cabaña ----------
create or replace function public.proteger_cabana()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is not null and not public.es_admin() then
        if new.codigo is distinct from old.codigo
           or new.tipo_id is distinct from old.tipo_id
           or new.activo is distinct from old.activo then
            raise exception 'Solo un administrador puede cambiar el código, el tipo o el estado activo de una cabaña.';
        end if;
    end if;
    return new;
end;
$$;

-- ---------- Validación de reservaciones ----------
create or replace function public.validar_reservacion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_cap integer;
    v_tipo uuid;
    v_estado text;
begin
    select capacidad_max into v_cap
    from public.tipos_cabana where id = new.tipo_id and activo;
    if v_cap is null then
        raise exception 'El tipo de cabaña no existe o está inactivo.';
    end if;

    if new.adultos + new.ninos > v_cap then
        raise exception 'La ocupación (% personas) supera la capacidad de la cabaña (% personas).',
            new.adultos + new.ninos, v_cap;
    end if;

    select tipo_id, estado into v_tipo, v_estado
    from public.cabanas where id = new.cabana_id and activo;
    if v_tipo is null then
        raise exception 'La cabaña no existe o está inactiva.';
    end if;
    if v_tipo <> new.tipo_id then
        raise exception 'La cabaña seleccionada no corresponde al tipo de cabaña.';
    end if;
    if v_estado <> 'disponible' and new.estado in ('pendiente','confirmada') then
        raise exception 'La cabaña está en mantenimiento o fuera de servicio.';
    end if;

    if tg_op = 'INSERT' and new.fecha_entrada < public.hoy() then
        raise exception 'La fecha de entrada no puede ser anterior a hoy.';
    end if;
    return new;
end;
$$;

-- ---------- Validación de pagos ----------
create or replace function public.validar_pago()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_total numeric;
    v_pagado numeric;
begin
    select total into v_total from public.reservaciones where id = new.reservacion_id;
    if v_total is null then
        raise exception 'La reservación no existe.';
    end if;

    select coalesce(sum(monto), 0) into v_pagado
    from public.pagos
    where reservacion_id = new.reservacion_id and id is distinct from new.id;

    if v_pagado + new.monto > v_total + 0.01 then
        raise exception 'El pago supera el saldo pendiente (saldo actual: L %).',
            round(v_total - v_pagado, 2);
    end if;
    return new;
end;
$$;

-- ---------- Vista de reservaciones con huésped, cabaña y saldo ----------
create or replace view public.v_reservaciones_detalle
with (security_invoker = true)
as
select
    r.*,
    h.nombre_completo as huesped_nombre,
    h.telefono        as huesped_telefono,
    h.email           as huesped_email,
    h.identidad       as huesped_identidad,
    h.pais            as huesped_pais,
    c.codigo          as cabana_codigo,
    t.nombre          as tipo_nombre,
    t.slug            as tipo_slug,
    coalesce(p.pagado, 0) as pagado,
    (r.total - coalesce(p.pagado, 0)) as saldo,
    case
        when r.total <= 0 then 'pendiente'
        when coalesce(p.pagado, 0) >= r.total then 'pagado'
        when coalesce(p.pagado, 0) > 0 then 'parcial'
        else 'pendiente'
    end as estado_pago
from public.reservaciones r
join public.huespedes h on h.id = r.huesped_id
join public.cabanas c on c.id = r.cabana_id
join public.tipos_cabana t on t.id = r.tipo_id
left join lateral (
    select sum(monto) as pagado
    from public.pagos p
    where p.reservacion_id = r.id
) p on true;

-- ---------- Crear reservación con validación de disponibilidad ----------
create or replace function public.crear_reservacion(
    p_huesped_id uuid,
    p_cabana_id uuid,
    p_fecha_entrada date,
    p_fecha_salida date,
    p_adultos integer,
    p_ninos integer,
    p_tarifa_noche numeric,
    p_descuento numeric default 0,
    p_estado text default 'pendiente',
    p_origen text default 'manual',
    p_observaciones text default null,
    p_solicitud_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_tipo_id uuid;
    v_row public.reservaciones;
begin
    if not public.es_staff() then
        raise exception 'No tienes permiso para crear reservaciones.';
    end if;
    if p_fecha_salida <= p_fecha_entrada then
        raise exception 'La fecha de salida debe ser posterior a la de entrada.';
    end if;
    if coalesce(p_adultos, 0) < 1 then
        raise exception 'Debe haber al menos un adulto.';
    end if;
    if p_estado not in ('pendiente','confirmada') then
        raise exception 'Estado inicial no válido.';
    end if;

    select tipo_id into v_tipo_id
    from public.cabanas where id = p_cabana_id and activo;
    if v_tipo_id is null then
        raise exception 'La cabaña no existe o está inactiva.';
    end if;

    if exists (
        select 1 from public.reservaciones r
        where r.cabana_id = p_cabana_id
          and r.estado in ('pendiente','confirmada')
          and daterange(r.fecha_entrada, r.fecha_salida, '[)')
              && daterange(p_fecha_entrada, p_fecha_salida, '[)')
    ) then
        raise exception 'La cabaña ya está reservada en esas fechas.' using errcode = '23P01';
    end if;

    insert into public.reservaciones (
        huesped_id, cabana_id, tipo_id, fecha_entrada, fecha_salida,
        adultos, ninos, tarifa_noche, descuento, estado, origen,
        observaciones, solicitud_id, created_by
    ) values (
        p_huesped_id, p_cabana_id, v_tipo_id, p_fecha_entrada, p_fecha_salida,
        p_adultos, coalesce(p_ninos, 0), p_tarifa_noche, coalesce(p_descuento, 0),
        p_estado, p_origen, p_observaciones, p_solicitud_id, auth.uid()
    ) returning * into v_row;

    if p_solicitud_id is not null then
        update public.solicitudes
        set estado = 'convertida',
            reservacion_id = v_row.id,
            atendida_por = auth.uid(),
            atendida_at = now()
        where id = p_solicitud_id
          and estado in ('nueva','en_revision','aprobada');
        if not found then
            raise exception 'La solicitud no existe o ya fue convertida.';
        end if;
    end if;

    return jsonb_build_object(
        'id', v_row.id,
        'codigo', v_row.codigo,
        'noches', v_row.noches,
        'total', v_row.total,
        'estado', v_row.estado
    );
end;
$$;

-- ---------- Solicitud pública desde la web (sin exponer datos) ----------
create or replace function public.crear_solicitud_publica(
    p_tipo text,
    p_nombre text,
    p_telefono text,
    p_email text default null,
    p_pais text default null,
    p_tipo_cabana_id uuid default null,
    p_fecha_entrada date default null,
    p_fecha_salida date default null,
    p_adultos integer default 0,
    p_ninos integer default 0,
    p_mensaje text default null,
    p_consentimiento boolean default false,
    p_honeypot text default ''
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_codigo text;
    v_existente text;
    v_recientes integer;
    v_tipo text := btrim(coalesce(p_tipo, 'hospedaje'));
    v_nombre text := btrim(coalesce(p_nombre, ''));
    v_telefono text := btrim(coalesce(p_telefono, ''));
    v_email text := nullif(btrim(coalesce(p_email, '')), '');
    v_pais text := nullif(btrim(coalesce(p_pais, '')), '');
    v_mensaje text := nullif(btrim(coalesce(p_mensaje, '')), '');
begin
    if btrim(coalesce(p_honeypot, '')) <> '' then
        return 'SOL-' || to_char(public.hoy(), 'YYYYMMDD') || '-9999';
    end if;

    if v_tipo not in ('hospedaje','visita-dia','canopy','grupos','piscinas','restaurante','eventos','paquetes') then
        raise exception 'Tipo de solicitud no válido.';
    end if;
    if char_length(v_nombre) < 3 or char_length(v_nombre) > 120 then
        raise exception 'Escribe tu nombre completo (entre 3 y 120 caracteres).';
    end if;
    if char_length(v_telefono) < 7 or char_length(v_telefono) > 25 then
        raise exception 'Escribe un teléfono válido.';
    end if;
    if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'El correo electrónico no es válido.';
    end if;
    if not coalesce(p_consentimiento, false) then
        raise exception 'Debes autorizar el uso de tus datos para atender la solicitud.';
    end if;
    if v_mensaje is not null and char_length(v_mensaje) > 2000 then
        raise exception 'El mensaje es demasiado largo (máximo 2000 caracteres).';
    end if;

    if v_tipo = 'hospedaje' then
        if p_tipo_cabana_id is null then
            raise exception 'Selecciona el tipo de cabaña.';
        end if;
        if not exists (select 1 from public.tipos_cabana where id = p_tipo_cabana_id and activo) then
            raise exception 'El tipo de cabaña no es válido.';
        end if;
        if p_fecha_entrada is null or p_fecha_salida is null then
            raise exception 'Indica las fechas de llegada y salida.';
        end if;
        if p_fecha_entrada < public.hoy() then
            raise exception 'La fecha de llegada no puede ser anterior a hoy.';
        end if;
        if p_fecha_salida <= p_fecha_entrada then
            raise exception 'La fecha de salida debe ser posterior a la de llegada.';
        end if;
        if p_fecha_salida > p_fecha_entrada + 60 then
            raise exception 'La solicitud no puede superar 60 noches.';
        end if;
        if coalesce(p_adultos, 0) < 1 then
            raise exception 'Indica al menos un adulto.';
        end if;
        if coalesce(p_adultos, 0) + coalesce(p_ninos, 0) > 12 then
            raise exception 'El número de personas no es válido.';
        end if;
    elsif p_fecha_entrada is not null and p_fecha_salida is not null
          and p_fecha_salida <= p_fecha_entrada then
        raise exception 'La fecha de salida debe ser posterior a la de entrada.';
    end if;

    select s.codigo into v_existente
    from public.solicitudes s
    where s.telefono = v_telefono
      and s.tipo = v_tipo
      and coalesce(s.fecha_entrada, '1900-01-01'::date) = coalesce(p_fecha_entrada, '1900-01-01'::date)
      and coalesce(s.fecha_salida, '1900-01-01'::date) = coalesce(p_fecha_salida, '1900-01-01'::date)
      and s.created_at > now() - interval '10 minutes'
    order by s.created_at desc
    limit 1;
    if v_existente is not null then
        return v_existente;
    end if;

    select count(*) into v_recientes
    from public.solicitudes s
    where s.telefono = v_telefono and s.created_at > now() - interval '1 hour';
    if v_recientes >= 5 then
        raise exception 'Hemos recibido varias solicitudes de este teléfono. Escríbenos por WhatsApp para continuar.';
    end if;

    insert into public.solicitudes (
        tipo, nombre, telefono, email, pais, tipo_cabana_id,
        fecha_entrada, fecha_salida, adultos, ninos, mensaje,
        estado, origen, consentimiento, consentimiento_at
    ) values (
        v_tipo, v_nombre, v_telefono, v_email, v_pais, p_tipo_cabana_id,
        p_fecha_entrada, p_fecha_salida,
        greatest(coalesce(p_adultos, 0), 0),
        greatest(coalesce(p_ninos, 0), 0),
        v_mensaje, 'nueva', 'web', true, now()
    ) returning codigo into v_codigo;

    return v_codigo;
end;
$$;

-- ---------- Tipos de cabaña públicos (sin datos de huéspedes) ----------
create or replace function public.tipos_cabana_publicos()
returns table (
    id uuid,
    slug text,
    nombre text,
    descripcion text,
    capacidad_max integer,
    camas text,
    amenidades jsonb,
    precio_desde numeric,
    moneda text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select
        t.id, t.slug, t.nombre, t.descripcion, t.capacidad_max, t.camas, t.amenidades,
        case
            when coalesce((select (a.valor->>'mostrar_tarifas')::boolean
                           from public.ajustes a where a.clave = 'reservas'), true)
            then (select tr.precio_noche
                  from public.tarifas tr
                  where tr.tipo_id = t.id and tr.activo
                    and tr.vigente_desde <= public.hoy()
                    and (tr.vigente_hasta is null or tr.vigente_hasta >= public.hoy())
                  order by tr.vigente_desde desc limit 1)
            else null
        end as precio_desde,
        'HNL'::text as moneda
    from public.tipos_cabana t
    where t.activo
    order by t.orden, t.nombre;
$$;

-- ---------- Disponibilidad ----------
create or replace function public.cabanas_disponibles(
    p_desde date,
    p_hasta date,
    p_tipo_id uuid default null
)
returns table (
    id uuid,
    codigo text,
    tipo_id uuid,
    tipo_nombre text,
    capacidad_max integer,
    precio_noche numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
    select
        c.id, c.codigo, t.id, t.nombre, t.capacidad_max,
        coalesce((
            select tr.precio_noche from public.tarifas tr
            where tr.tipo_id = t.id and tr.activo
              and tr.vigente_desde <= p_desde
              and (tr.vigente_hasta is null or tr.vigente_hasta >= p_desde)
            order by tr.vigente_desde desc limit 1
        ), 0)
    from public.cabanas c
    join public.tipos_cabana t on t.id = c.tipo_id
    where c.activo and c.estado = 'disponible' and t.activo
      and (p_tipo_id is null or t.id = p_tipo_id)
      and p_hasta > p_desde
      and not exists (
          select 1 from public.reservaciones r
          where r.cabana_id = c.id
            and r.estado in ('pendiente','confirmada')
            and daterange(r.fecha_entrada, r.fecha_salida, '[)')
                && daterange(p_desde, p_hasta, '[)')
      )
    order by t.orden, c.codigo;
$$;

create or replace function public.verificar_disponibilidad(
    p_cabana_id uuid,
    p_desde date,
    p_hasta date,
    p_excluir_reserva uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
    select p_hasta > p_desde and not exists (
        select 1 from public.reservaciones r
        where r.cabana_id = p_cabana_id
          and r.id is distinct from p_excluir_reserva
          and r.estado in ('pendiente','confirmada')
          and daterange(r.fecha_entrada, r.fecha_salida, '[)')
              && daterange(p_desde, p_hasta, '[)')
    );
$$;
