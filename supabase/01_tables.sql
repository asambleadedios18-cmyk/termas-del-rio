-- ============================================================
-- TERMAS DEL RÍO · Módulo de reservaciones
-- 01 · Tablas, relaciones, índices y restricciones
-- Ejecutar en Supabase → SQL Editor, en orden (01, 02, 03, 04).
-- ============================================================

create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

-- ---------- Fecha oficial del negocio (Honduras) ----------
create or replace function public.hoy()
returns date
language sql
stable
set search_path = public, pg_temp
as $$
    select (now() at time zone 'America/Tegucigalpa')::date;
$$;

-- ---------- Secuencias y generador de códigos únicos ----------
create sequence if not exists public.codigo_res_seq;
create sequence if not exists public.codigo_sol_seq;

create or replace function public.generar_codigo(prefijo text)
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
    v_num bigint;
begin
    if prefijo = 'RES' then
        v_num := nextval('public.codigo_res_seq');
    elsif prefijo = 'SOL' then
        v_num := nextval('public.codigo_sol_seq');
    else
        raise exception 'Prefijo de código no válido: %', prefijo;
    end if;
    return prefijo || '-' || to_char(public.hoy(), 'YYYYMMDD') || '-' || lpad(v_num::text, 4, '0');
end;
$$;

-- ---------- Perfiles de administración ----------
create table if not exists public.perfiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    nombre      text not null,
    email       text,
    rol         text not null default 'consulta' check (rol in ('admin','recepcion','consulta')),
    activo      boolean not null default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ---------- Tipos de cabaña ----------
create table if not exists public.tipos_cabana (
    id             uuid primary key default gen_random_uuid(),
    slug           text not null unique,
    nombre         text not null,
    descripcion    text,
    capacidad_max  integer not null default 2 check (capacidad_max > 0),
    camas          text,
    amenidades     jsonb not null default '[]'::jsonb,
    activo         boolean not null default true,
    orden          integer not null default 0,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

-- ---------- Cabañas físicas ----------
create table if not exists public.cabanas (
    id          uuid primary key default gen_random_uuid(),
    codigo      text not null unique,
    tipo_id     uuid not null references public.tipos_cabana(id) on delete restrict,
    estado      text not null default 'disponible'
                check (estado in ('disponible','mantenimiento','fuera_servicio')),
    notas       text,
    activo      boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ---------- Tarifas configurables por tipo y vigencia ----------
create table if not exists public.tarifas (
    id             uuid primary key default gen_random_uuid(),
    tipo_id        uuid not null references public.tipos_cabana(id) on delete cascade,
    nombre         text not null default 'Tarifa general',
    precio_noche   numeric(10,2) not null check (precio_noche >= 0),
    moneda         text not null default 'HNL',
    vigente_desde  date not null default current_date,
    vigente_hasta  date,
    activo         boolean not null default true,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);

-- ---------- Huéspedes ----------
create table if not exists public.huespedes (
    id               uuid primary key default gen_random_uuid(),
    nombre_completo  text not null,
    identidad        text,
    telefono         text not null,
    email            text,
    pais             text default 'Honduras',
    notas            text,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    created_by       uuid references public.perfiles(id) on delete set null
);

create unique index if not exists huespedes_identidad_uq
    on public.huespedes (lower(identidad))
    where identidad is not null and btrim(identidad) <> '';

-- ---------- Solicitudes recibidas desde la web ----------
create table if not exists public.solicitudes (
    id                uuid primary key default gen_random_uuid(),
    codigo            text not null unique default public.generar_codigo('SOL'),
    tipo              text not null default 'hospedaje'
                      check (tipo in ('hospedaje','visita-dia','canopy','grupos','piscinas','restaurante','eventos','paquetes')),
    nombre            text not null,
    telefono          text not null,
    email             text,
    pais              text,
    tipo_cabana_id    uuid references public.tipos_cabana(id) on delete set null,
    fecha_entrada     date,
    fecha_salida      date,
    adultos           integer not null default 0 check (adultos >= 0),
    ninos             integer not null default 0 check (ninos >= 0),
    mensaje           text,
    estado            text not null default 'nueva'
                      check (estado in ('nueva','en_revision','aprobada','rechazada','convertida')),
    origen            text not null default 'web',
    consentimiento    boolean not null default false,
    consentimiento_at timestamptz,
    atendida_por      uuid references public.perfiles(id) on delete set null,
    atendida_at       timestamptz,
    reservacion_id    uuid,
    notas_admin       text,
    created_at        timestamptz not null default now(),
    check (fecha_salida is null or fecha_entrada is null or fecha_salida > fecha_entrada)
);

-- ---------- Reservaciones ----------
create table if not exists public.reservaciones (
    id              uuid primary key default gen_random_uuid(),
    codigo          text not null unique default public.generar_codigo('RES'),
    huesped_id      uuid not null references public.huespedes(id) on delete restrict,
    cabana_id       uuid not null references public.cabanas(id) on delete restrict,
    tipo_id         uuid not null references public.tipos_cabana(id) on delete restrict,
    fecha_entrada   date not null,
    fecha_salida    date not null,
    adultos         integer not null default 1 check (adultos >= 1),
    ninos           integer not null default 0 check (ninos >= 0),
    estado          text not null default 'pendiente'
                    check (estado in ('pendiente','confirmada','cancelada','completada','no_show')),
    origen          text not null default 'manual'
                    check (origen in ('manual','web','whatsapp','telefono','presencial')),
    tarifa_noche    numeric(10,2) not null check (tarifa_noche >= 0),
    descuento       numeric(10,2) not null default 0 check (descuento >= 0),
    noches          integer generated always as (fecha_salida - fecha_entrada) stored,
    total           numeric(10,2) generated always as
                    ((fecha_salida - fecha_entrada) * tarifa_noche - descuento) stored,
    observaciones   text,
    solicitud_id    uuid unique references public.solicitudes(id) on delete set null,
    created_by      uuid references public.perfiles(id) on delete set null,
    updated_by      uuid references public.perfiles(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    check (fecha_salida > fecha_entrada),
    constraint reservaciones_no_overlap exclude using gist (
        cabana_id with =,
        daterange(fecha_entrada, fecha_salida, '[)') with &&
    ) where (estado in ('pendiente','confirmada'))
);

-- FK de solicitud → reservación (se agrega después de crear ambas tablas)
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'solicitudes_reservacion_fk') then
        alter table public.solicitudes
            add constraint solicitudes_reservacion_fk
            foreign key (reservacion_id) references public.reservaciones(id) on delete set null;
    end if;
end $$;

-- ---------- Pagos ----------
create table if not exists public.pagos (
    id              uuid primary key default gen_random_uuid(),
    reservacion_id  uuid not null references public.reservaciones(id) on delete cascade,
    monto           numeric(10,2) not null check (monto > 0),
    metodo          text not null check (metodo in ('efectivo','transferencia','tarjeta','deposito','otro')),
    fecha_pago      date not null default current_date,
    referencia      text,
    notas           text,
    created_by      uuid references public.perfiles(id) on delete set null,
    created_at      timestamptz not null default now()
);

-- ---------- Bitácora de actividad ----------
create table if not exists public.actividad (
    id             bigint generated always as identity primary key,
    usuario_id     uuid references public.perfiles(id) on delete set null,
    usuario_email  text,
    accion         text not null,
    entidad        text,
    entidad_id     text,
    detalle        jsonb,
    created_at     timestamptz not null default now()
);

-- ---------- Historial de mensajes preparados/enviados ----------
create table if not exists public.notificaciones (
    id              uuid primary key default gen_random_uuid(),
    reservacion_id  uuid references public.reservaciones(id) on delete set null,
    solicitud_id    uuid references public.solicitudes(id) on delete set null,
    canal           text not null check (canal in ('email','whatsapp')),
    tipo            text not null,
    destinatario    text,
    asunto          text,
    cuerpo          text not null,
    estado          text not null default 'preparada'
                    check (estado in ('preparada','enviada','fallida')),
    enviada_at      timestamptz,
    created_by      uuid references public.perfiles(id) on delete set null,
    created_at      timestamptz not null default now()
);

-- ---------- Ajustes del negocio y plantillas ----------
create table if not exists public.ajustes (
    clave       text primary key,
    valor       jsonb not null,
    updated_at  timestamptz not null default now(),
    updated_by  uuid references public.perfiles(id) on delete set null
);

-- ---------- Índices ----------
create index if not exists reservaciones_fechas_idx
    on public.reservaciones (fecha_entrada, fecha_salida);
create index if not exists reservaciones_cabana_idx
    on public.reservaciones (cabana_id, fecha_entrada, fecha_salida);
create index if not exists reservaciones_estado_idx
    on public.reservaciones (estado);
create index if not exists reservaciones_huesped_idx
    on public.reservaciones (huesped_id);
create index if not exists pagos_reservacion_idx
    on public.pagos (reservacion_id, fecha_pago);
create index if not exists solicitudes_estado_idx
    on public.solicitudes (estado, created_at desc);
create index if not exists solicitudes_telefono_idx
    on public.solicitudes (telefono);
create index if not exists actividad_fecha_idx
    on public.actividad (created_at desc);
create index if not exists cabanas_tipo_idx
    on public.cabanas (tipo_id);
create index if not exists tarifas_tipo_vigencia_idx
    on public.tarifas (tipo_id, vigente_desde desc);
