-- ============================================================
-- TERMAS DEL RÍO · Módulo de reservaciones
-- 04 · Seguridad: RLS, permisos y concesiones
-- ============================================================

set search_path = public, extensions;

-- ---------- Activar RLS ----------
alter table public.perfiles      enable row level security;
alter table public.tipos_cabana  enable row level security;
alter table public.cabanas       enable row level security;
alter table public.tarifas       enable row level security;
alter table public.huespedes     enable row level security;
alter table public.solicitudes   enable row level security;
alter table public.reservaciones enable row level security;
alter table public.pagos         enable row level security;
alter table public.actividad     enable row level security;
alter table public.notificaciones enable row level security;
alter table public.ajustes       enable row level security;

-- ---------- Perfiles ----------
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
    for select to authenticated
    using (id = auth.uid() or public.es_admin());

drop policy if exists perfiles_insert on public.perfiles;
create policy perfiles_insert on public.perfiles
    for insert to authenticated
    with check (public.es_admin());

drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
    for update to authenticated
    using (public.es_admin())
    with check (public.es_admin());

drop policy if exists perfiles_delete on public.perfiles;
create policy perfiles_delete on public.perfiles
    for delete to authenticated
    using (public.es_admin());

-- ---------- Tipos de cabaña ----------
drop policy if exists tipos_select on public.tipos_cabana;
create policy tipos_select on public.tipos_cabana
    for select to authenticated using (public.puede_leer());

drop policy if exists tipos_insert on public.tipos_cabana;
create policy tipos_insert on public.tipos_cabana
    for insert to authenticated with check (public.es_admin());

drop policy if exists tipos_update on public.tipos_cabana;
create policy tipos_update on public.tipos_cabana
    for update to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists tipos_delete on public.tipos_cabana;
create policy tipos_delete on public.tipos_cabana
    for delete to authenticated using (public.es_admin());

-- ---------- Cabañas ----------
drop policy if exists cabanas_select on public.cabanas;
create policy cabanas_select on public.cabanas
    for select to authenticated using (public.puede_leer());

drop policy if exists cabanas_insert on public.cabanas;
create policy cabanas_insert on public.cabanas
    for insert to authenticated with check (public.es_admin());

drop policy if exists cabanas_update on public.cabanas;
create policy cabanas_update on public.cabanas
    for update to authenticated using (public.es_staff()) with check (public.es_staff());

drop policy if exists cabanas_delete on public.cabanas;
create policy cabanas_delete on public.cabanas
    for delete to authenticated using (public.es_admin());

-- ---------- Tarifas ----------
drop policy if exists tarifas_select on public.tarifas;
create policy tarifas_select on public.tarifas
    for select to authenticated using (public.puede_leer());

drop policy if exists tarifas_insert on public.tarifas;
create policy tarifas_insert on public.tarifas
    for insert to authenticated with check (public.es_admin());

drop policy if exists tarifas_update on public.tarifas;
create policy tarifas_update on public.tarifas
    for update to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists tarifas_delete on public.tarifas;
create policy tarifas_delete on public.tarifas
    for delete to authenticated using (public.es_admin());

-- ---------- Huéspedes ----------
drop policy if exists huespedes_select on public.huespedes;
create policy huespedes_select on public.huespedes
    for select to authenticated using (public.puede_leer());

drop policy if exists huespedes_insert on public.huespedes;
create policy huespedes_insert on public.huespedes
    for insert to authenticated with check (public.es_staff());

drop policy if exists huespedes_update on public.huespedes;
create policy huespedes_update on public.huespedes
    for update to authenticated using (public.es_staff()) with check (public.es_staff());

drop policy if exists huespedes_delete on public.huespedes;
create policy huespedes_delete on public.huespedes
    for delete to authenticated using (public.es_admin());

-- ---------- Solicitudes ----------
drop policy if exists solicitudes_select on public.solicitudes;
create policy solicitudes_select on public.solicitudes
    for select to authenticated using (public.puede_leer());

drop policy if exists solicitudes_insert on public.solicitudes;
create policy solicitudes_insert on public.solicitudes
    for insert to authenticated with check (public.es_staff());

drop policy if exists solicitudes_update on public.solicitudes;
create policy solicitudes_update on public.solicitudes
    for update to authenticated using (public.es_staff()) with check (public.es_staff());

drop policy if exists solicitudes_delete on public.solicitudes;
create policy solicitudes_delete on public.solicitudes
    for delete to authenticated using (public.es_admin());

-- ---------- Reservaciones ----------
drop policy if exists reservaciones_select on public.reservaciones;
create policy reservaciones_select on public.reservaciones
    for select to authenticated using (public.puede_leer());

drop policy if exists reservaciones_insert on public.reservaciones;
create policy reservaciones_insert on public.reservaciones
    for insert to authenticated with check (public.es_staff());

drop policy if exists reservaciones_update on public.reservaciones;
create policy reservaciones_update on public.reservaciones
    for update to authenticated using (public.es_staff()) with check (public.es_staff());

drop policy if exists reservaciones_delete on public.reservaciones;
create policy reservaciones_delete on public.reservaciones
    for delete to authenticated using (public.es_admin());

-- ---------- Pagos ----------
drop policy if exists pagos_select on public.pagos;
create policy pagos_select on public.pagos
    for select to authenticated using (public.puede_leer());

drop policy if exists pagos_insert on public.pagos;
create policy pagos_insert on public.pagos
    for insert to authenticated with check (public.es_staff());

drop policy if exists pagos_update on public.pagos;
create policy pagos_update on public.pagos
    for update to authenticated using (public.es_staff()) with check (public.es_staff());

drop policy if exists pagos_delete on public.pagos;
create policy pagos_delete on public.pagos
    for delete to authenticated using (public.es_admin());

-- ---------- Actividad (solo administradores) ----------
drop policy if exists actividad_select on public.actividad;
create policy actividad_select on public.actividad
    for select to authenticated using (public.es_admin());

-- ---------- Notificaciones ----------
drop policy if exists notificaciones_select on public.notificaciones;
create policy notificaciones_select on public.notificaciones
    for select to authenticated using (public.puede_leer());

drop policy if exists notificaciones_insert on public.notificaciones;
create policy notificaciones_insert on public.notificaciones
    for insert to authenticated with check (public.es_staff());

drop policy if exists notificaciones_update on public.notificaciones;
create policy notificaciones_update on public.notificaciones
    for update to authenticated using (public.es_staff()) with check (public.es_staff());

drop policy if exists notificaciones_delete on public.notificaciones;
create policy notificaciones_delete on public.notificaciones
    for delete to authenticated using (public.es_admin());

-- ---------- Ajustes ----------
drop policy if exists ajustes_select on public.ajustes;
create policy ajustes_select on public.ajustes
    for select to authenticated using (public.puede_leer());

drop policy if exists ajustes_insert on public.ajustes;
create policy ajustes_insert on public.ajustes
    for insert to authenticated with check (public.es_admin());

drop policy if exists ajustes_update on public.ajustes;
create policy ajustes_update on public.ajustes
    for update to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists ajustes_delete on public.ajustes;
create policy ajustes_delete on public.ajustes
    for delete to authenticated using (public.es_admin());

-- ============================================================
-- Permisos de tablas, vistas, secuencias y funciones
-- ============================================================

grant usage on schema public to anon, authenticated;

revoke all on all tables in schema public from anon;

grant select, insert, update, delete on
    public.perfiles, public.tipos_cabana, public.cabanas, public.tarifas,
    public.huespedes, public.solicitudes, public.reservaciones, public.pagos,
    public.notificaciones, public.ajustes
to authenticated;

grant select on public.actividad to authenticated;
grant select on public.v_reservaciones_detalle to authenticated;

grant usage, select on sequence public.codigo_res_seq to authenticated;
grant usage, select on sequence public.codigo_sol_seq to authenticated;

-- Funciones: se revoca el acceso público y se concede solo lo necesario.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on function public.hoy() to authenticated, anon;
grant execute on function public.generar_codigo(text) to authenticated;

grant execute on function public.mi_perfil() to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.es_staff() to authenticated;
grant execute on function public.puede_leer() to authenticated;

grant execute on function public.crear_reservacion(uuid,uuid,date,date,integer,integer,numeric,numeric,text,text,text,uuid) to authenticated;
grant execute on function public.cabanas_disponibles(date,date,uuid) to authenticated;
grant execute on function public.verificar_disponibilidad(uuid,date,date,uuid) to authenticated;
grant execute on function public.dashboard_resumen() to authenticated;
grant execute on function public.calendario_reservas(date,date) to authenticated;
grant execute on function public.cambiar_estado_cabana(uuid,text,text,boolean) to authenticated;
grant execute on function public.registrar_actividad(text,text,text,jsonb) to authenticated;

-- RPC públicas (sin sesión): solo estas dos.
grant execute on function public.tipos_cabana_publicos() to anon, authenticated;
grant execute on function public.crear_solicitud_publica(text,text,text,text,text,uuid,date,date,integer,integer,text,boolean,text) to anon, authenticated;

-- Las funciones de trigger no se ejecutan como RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.log_cambio() from public, anon, authenticated;
revoke execute on function public.proteger_codigo() from public, anon, authenticated;
revoke execute on function public.proteger_cabana() from public, anon, authenticated;
revoke execute on function public.validar_reservacion() from public, anon, authenticated;
revoke execute on function public.validar_pago() from public, anon, authenticated;
