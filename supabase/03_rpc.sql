-- ============================================================
-- TERMAS DEL RÍO · Módulo de reservaciones
-- 03 · Dashboard, calendario, acciones y triggers
-- ============================================================

set search_path = public, extensions;

-- ---------- Resumen del dashboard ----------
create or replace function public.dashboard_resumen()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
    v_hoy date := public.hoy();
    v_mes date := date_trunc('month', public.hoy())::date;
    v_result jsonb;
begin
    select jsonb_build_object(
        'hoy', v_hoy,
        'pendientes', (select count(*) from public.v_reservaciones_detalle where estado = 'pendiente'),
        'confirmadas', (select count(*) from public.v_reservaciones_detalle where estado = 'confirmada'),
        'confirmadas_futuras', (select count(*) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_salida > v_hoy),
        'alojados', (select count(*) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_entrada <= v_hoy and fecha_salida > v_hoy),
        'alojados_personas', (select coalesce(sum(adultos + ninos), 0) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_entrada <= v_hoy and fecha_salida > v_hoy),
        'llegadas_hoy', (select count(*) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_entrada = v_hoy),
        'salidas_hoy', (select count(*) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_salida = v_hoy),
        'proximas_llegadas', (select count(*) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_entrada > v_hoy and fecha_entrada <= v_hoy + 7),
        'proximas_salidas', (select count(*) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_salida > v_hoy and fecha_salida <= v_hoy + 7),
        'disponibles_hoy', (select count(*) from public.cabanas c where c.activo and c.estado = 'disponible' and not exists (select 1 from public.reservaciones r where r.cabana_id = c.id and r.estado in ('pendiente','confirmada') and r.fecha_entrada <= v_hoy and r.fecha_salida > v_hoy)),
        'ocupadas_hoy', (select count(distinct cabana_id) from public.v_reservaciones_detalle where estado = 'confirmada' and fecha_entrada <= v_hoy and fecha_salida > v_hoy),
        'fuera_servicio', (select count(*) from public.cabanas where activo and estado <> 'disponible'),
        'ingresos_mes', (select coalesce(sum(monto), 0) from public.pagos where fecha_pago >= v_mes and fecha_pago <= v_hoy),
        'ingresos_total', (select coalesce(sum(monto), 0) from public.pagos),
        'saldo_pendiente', (select coalesce(sum(saldo), 0) from public.v_reservaciones_detalle where estado in ('pendiente','confirmada')),
        'ocupacion_pct', (
            select case when count(*) = 0 then 0
                else round(100.0 * count(*) filter (where exists (
                    select 1 from public.v_reservaciones_detalle r
                    where r.cabana_id = c.id and r.estado = 'confirmada'
                      and r.fecha_entrada <= v_hoy and r.fecha_salida > v_hoy
                )) / count(*))
            end
            from public.cabanas c where c.activo and c.estado = 'disponible'
        ),
        'llegadas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', id, 'codigo', codigo, 'huesped', huesped_nombre,
                'telefono', huesped_telefono, 'cabana', cabana_codigo,
                'tipo', tipo_nombre, 'fecha_entrada', fecha_entrada,
                'fecha_salida', fecha_salida, 'adultos', adultos,
                'ninos', ninos, 'estado', estado, 'saldo', saldo
            ) order by fecha_entrada, cabana_codigo)
            from public.v_reservaciones_detalle
            where estado = 'confirmada' and fecha_entrada between v_hoy and v_hoy + 7
        ), '[]'::jsonb),
        'salidas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', id, 'codigo', codigo, 'huesped', huesped_nombre,
                'telefono', huesped_telefono, 'cabana', cabana_codigo,
                'tipo', tipo_nombre, 'fecha_entrada', fecha_entrada,
                'fecha_salida', fecha_salida, 'adultos', adultos,
                'ninos', ninos, 'estado', estado, 'saldo', saldo
            ) order by fecha_salida, cabana_codigo)
            from public.v_reservaciones_detalle
            where estado = 'confirmada' and fecha_salida between v_hoy and v_hoy + 7
        ), '[]'::jsonb),
        'ocupacion_diaria', coalesce((
            select jsonb_agg(jsonb_build_object(
                'fecha', d::date,
                'ocupadas', (select count(distinct r.cabana_id) from public.reservaciones r
                             where r.estado = 'confirmada'
                               and r.fecha_entrada <= d::date and r.fecha_salida > d::date)
            ) order by d)
            from generate_series(v_hoy - 14, v_hoy + 15, interval '1 day') d
        ), '[]'::jsonb),
        'ingresos_mensuales', coalesce((
            select jsonb_agg(jsonb_build_object(
                'mes', to_char(m, 'YYYY-MM'),
                'total', (select coalesce(sum(p.monto), 0) from public.pagos p
                          where date_trunc('month', p.fecha_pago)::date = m::date)
            ) order by m)
            from generate_series(date_trunc('month', v_hoy) - interval '5 months',
                                 date_trunc('month', v_hoy), interval '1 month') m
        ), '[]'::jsonb)
    ) into v_result;
    return v_result;
end;
$$;

-- ---------- Calendario ----------
create or replace function public.calendario_reservas(p_desde date, p_hasta date)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
    select jsonb_build_object(
        'cabanas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', c.id, 'codigo', c.codigo, 'tipo_id', c.tipo_id,
                'tipo', t.nombre, 'estado', c.estado, 'activo', c.activo
            ) order by t.orden, c.codigo)
            from public.cabanas c
            join public.tipos_cabana t on t.id = c.tipo_id
            where c.activo
        ), '[]'::jsonb),
        'reservaciones', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', r.id, 'codigo', r.codigo, 'cabana_id', r.cabana_id,
                'cabana', r.cabana_codigo, 'tipo', r.tipo_nombre,
                'huesped', r.huesped_nombre, 'telefono', r.huesped_telefono,
                'fecha_entrada', r.fecha_entrada, 'fecha_salida', r.fecha_salida,
                'estado', r.estado, 'adultos', r.adultos, 'ninos', r.ninos,
                'total', r.total, 'saldo', r.saldo, 'estado_pago', r.estado_pago
            ) order by r.fecha_entrada, r.cabana_codigo)
            from public.v_reservaciones_detalle r
            where r.estado in ('pendiente','confirmada')
              and daterange(r.fecha_entrada, r.fecha_salida, '[)')
                  && daterange(p_desde, p_hasta, '[)')
        ), '[]'::jsonb)
    );
$$;

-- ---------- Cambiar estado de una cabaña ----------
create or replace function public.cambiar_estado_cabana(
    p_cabana_id uuid,
    p_estado text,
    p_notas text default null,
    p_forzar boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_count integer;
begin
    if not public.es_staff() then
        raise exception 'No tienes permiso para cambiar el estado de una cabaña.';
    end if;
    if p_estado not in ('disponible','mantenimiento','fuera_servicio') then
        raise exception 'Estado de cabaña no válido.';
    end if;

    if p_estado <> 'disponible' and not coalesce(p_forzar, false) then
        select count(*) into v_count
        from public.reservaciones
        where cabana_id = p_cabana_id
          and estado in ('pendiente','confirmada')
          and fecha_salida > public.hoy();
        if v_count > 0 then
            raise exception 'La cabaña tiene % reservación(es) futura(s). Confirma que deseas ponerla fuera de servicio.', v_count;
        end if;
    end if;

    update public.cabanas
    set estado = p_estado,
        notas = coalesce(p_notas, notas)
    where id = p_cabana_id;

    if not found then
        raise exception 'Cabaña no encontrada.';
    end if;
end;
$$;

-- ---------- Bitácora manual ----------
create or replace function public.registrar_actividad(
    p_accion text,
    p_entidad text,
    p_entidad_id text default null,
    p_detalle jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.puede_leer() then
        raise exception 'No autorizado.';
    end if;
    insert into public.actividad (usuario_id, usuario_email, accion, entidad, entidad_id, detalle)
    values (
        auth.uid(),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email',
        p_accion, p_entidad, p_entidad_id, p_detalle
    );
end;
$$;

-- ---------- Triggers ----------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

drop trigger if exists trg_tipos_updated on public.tipos_cabana;
create trigger trg_tipos_updated before update on public.tipos_cabana
    for each row execute function public.set_updated_at();

drop trigger if exists trg_cabanas_updated on public.cabanas;
create trigger trg_cabanas_updated before update on public.cabanas
    for each row execute function public.set_updated_at();

drop trigger if exists trg_tarifas_updated on public.tarifas;
create trigger trg_tarifas_updated before update on public.tarifas
    for each row execute function public.set_updated_at();

drop trigger if exists trg_huespedes_updated on public.huespedes;
create trigger trg_huespedes_updated before update on public.huespedes
    for each row execute function public.set_updated_at();

drop trigger if exists trg_reservaciones_updated on public.reservaciones;
create trigger trg_reservaciones_updated before update on public.reservaciones
    for each row execute function public.set_updated_at();

drop trigger if exists trg_perfiles_updated on public.perfiles;
create trigger trg_perfiles_updated before update on public.perfiles
    for each row execute function public.set_updated_at();

drop trigger if exists trg_ajustes_updated on public.ajustes;
create trigger trg_ajustes_updated before update on public.ajustes
    for each row execute function public.set_updated_at();

drop trigger if exists trg_cabanas_protege on public.cabanas;
create trigger trg_cabanas_protege before update on public.cabanas
    for each row execute function public.proteger_cabana();

drop trigger if exists trg_reservaciones_valida on public.reservaciones;
create trigger trg_reservaciones_valida before insert or update on public.reservaciones
    for each row execute function public.validar_reservacion();

drop trigger if exists trg_pagos_valida on public.pagos;
create trigger trg_pagos_valida before insert or update on public.pagos
    for each row execute function public.validar_pago();

drop trigger if exists trg_reservaciones_codigo on public.reservaciones;
create trigger trg_reservaciones_codigo before update of codigo on public.reservaciones
    for each row execute function public.proteger_codigo();

drop trigger if exists trg_solicitudes_codigo on public.solicitudes;
create trigger trg_solicitudes_codigo before update of codigo on public.solicitudes
    for each row execute function public.proteger_codigo();

-- Bitácora automática
drop trigger if exists trg_reservaciones_log on public.reservaciones;
create trigger trg_reservaciones_log after insert or update or delete on public.reservaciones
    for each row execute function public.log_cambio();

drop trigger if exists trg_pagos_log on public.pagos;
create trigger trg_pagos_log after insert or update or delete on public.pagos
    for each row execute function public.log_cambio();

drop trigger if exists trg_cabanas_log on public.cabanas;
create trigger trg_cabanas_log after insert or update or delete on public.cabanas
    for each row execute function public.log_cambio();

drop trigger if exists trg_tipos_log on public.tipos_cabana;
create trigger trg_tipos_log after insert or update or delete on public.tipos_cabana
    for each row execute function public.log_cambio();

drop trigger if exists trg_tarifas_log on public.tarifas;
create trigger trg_tarifas_log after insert or update or delete on public.tarifas
    for each row execute function public.log_cambio();

drop trigger if exists trg_huespedes_log on public.huespedes;
create trigger trg_huespedes_log after insert or update or delete on public.huespedes
    for each row execute function public.log_cambio();

drop trigger if exists trg_solicitudes_log on public.solicitudes;
create trigger trg_solicitudes_log after insert or update or delete on public.solicitudes
    for each row execute function public.log_cambio();

drop trigger if exists trg_perfiles_log on public.perfiles;
create trigger trg_perfiles_log after insert or update or delete on public.perfiles
    for each row execute function public.log_cambio();

-- ---------- Realtime para avisos en el panel ----------
do $$
begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'solicitudes') then
        alter publication supabase_realtime add table public.solicitudes;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservaciones') then
        alter publication supabase_realtime add table public.reservaciones;
    end if;
end $$;

-- ---------- Perfiles para usuarios ya existentes ----------
insert into public.perfiles (id, nombre, email, rol, activo)
select
    u.id,
    coalesce(nullif(u.raw_user_meta_data->>'nombre', ''), split_part(coalesce(u.email, 'usuario'), '@', 1)),
    u.email, 'consulta', false
from auth.users u
on conflict (id) do nothing;
