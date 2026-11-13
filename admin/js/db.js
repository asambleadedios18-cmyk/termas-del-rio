/* ============================================================
   Capa de acceso a datos · Supabase
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';

export const configured = isConfigured();

export const db = configured
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: { headers: { 'x-application-name': 'termas-admin' } }
    })
    : null;

/* ---------- Mensajes de error legibles ---------- */
export function mensajeError(error) {
    if (!error) return 'Ocurrió un error inesperado.';
    const raw = String(error.message || error.error_description || error);
    const code = String(error.code || '');
    const texto = raw.toLowerCase();

    if (code === '23P01' || texto.includes('reservaciones_no_overlap') || texto.includes('conflicting key value')) {
        return 'La cabaña ya está reservada en esas fechas. Elige otras fechas o otra cabaña.';
    }
    if (code === '23505' || texto.includes('duplicate key')) {
        return 'Ya existe un registro con ese dato único (código, identidad o correo).';
    }
    if (code === '23503' || texto.includes('foreign key')) {
        return 'El registro está relacionado con otros datos y no se puede completar la operación.';
    }
    if (code === '42501' || texto.includes('permission denied') || texto.includes('row-level security')) {
        return 'No tienes permiso para realizar esta acción.';
    }
    if (code === 'PGRST301' || texto.includes('jwt expired') || texto.includes('invalid jwt')) {
        return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    }
    if (code === 'PGRST116') {
        return 'No se encontró la información solicitada.';
    }
    if (texto.includes('failed to fetch') || texto.includes('networkerror') || texto.includes('load failed')) {
        return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
    }
    if (texto.includes('captcha')) {
        return 'La verificación de seguridad falló. Intenta de nuevo.';
    }
    return raw;
}

/* ---------- RPC ---------- */
export async function rpc(nombre, params = {}) {
    if (!db) throw new Error('Supabase no está configurado.');
    const { data, error } = await db.rpc(nombre, params);
    if (error) throw new Error(mensajeError(error));
    return data;
}

/* ---------- Consultas ---------- */
export async function seleccionar(tabla, opciones = {}) {
    if (!db) throw new Error('Supabase no está configurado.');
    let query = db.from(tabla).select(opciones.select || '*');
    if (opciones.eq) Object.entries(opciones.eq).forEach(([k, v]) => { query = query.eq(k, v); });
    if (opciones.neq) Object.entries(opciones.neq).forEach(([k, v]) => { query = query.neq(k, v); });
    if (opciones.gte) Object.entries(opciones.gte).forEach(([k, v]) => { query = query.gte(k, v); });
    if (opciones.lte) Object.entries(opciones.lte).forEach(([k, v]) => { query = query.lte(k, v); });
    if (opciones.in) Object.entries(opciones.in).forEach(([k, v]) => { query = query.in(k, v); });
    if (opciones.or) query = query.or(opciones.or);
    if (opciones.order) {
        const list = Array.isArray(opciones.order) ? opciones.order : [opciones.order];
        list.forEach(o => { query = query.order(o.col, { ascending: o.asc !== false }); });
    }
    if (opciones.limit) query = query.limit(opciones.limit);
    if (opciones.single) query = query.single();
    if (opciones.maybeSingle) query = query.maybeSingle();
    const { data, error } = await query;
    if (error) throw new Error(mensajeError(error));
    return data;
}

export async function insertar(tabla, valores) {
    if (!db) throw new Error('Supabase no está configurado.');
    const { data, error } = await db.from(tabla).insert(valores).select();
    if (error) throw new Error(mensajeError(error));
    return data;
}

export async function actualizar(tabla, valores, filtros) {
    if (!db) throw new Error('Supabase no está configurado.');
    let query = db.from(tabla).update(valores);
    Object.entries(filtros).forEach(([k, v]) => { query = query.eq(k, v); });
    const { data, error } = await query.select();
    if (error) throw new Error(mensajeError(error));
    return data;
}

export async function eliminar(tabla, filtros) {
    if (!db) throw new Error('Supabase no está configurado.');
    let query = db.from(tabla).delete();
    Object.entries(filtros).forEach(([k, v]) => { query = query.eq(k, v); });
    const { error } = await query;
    if (error) throw new Error(mensajeError(error));
    return true;
}

/* ---------- Autenticación ---------- */
export async function iniciarSesion(email, password) {
    if (!db) throw new Error('Supabase no está configurado.');
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mensajeError(error));
    return data;
}

export async function cerrarSesion() {
    if (db) await db.auth.signOut();
}

export async function sesionActual() {
    if (!db) return null;
    const { data } = await db.auth.getSession();
    return data.session || null;
}

export async function recuperarContrasena(email) {
    if (!db) throw new Error('Supabase no está configurado.');
    const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href.split('#')[0]
    });
    if (error) throw new Error(mensajeError(error));
}

export async function cargarPerfil(userId) {
    if (!db || !userId) return null;
    const { data, error } = await db.from('perfiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(mensajeError(error));
    return data;
}

/* ---------- Ajustes y plantillas ---------- */
export async function cargarAjuste(clave) {
    const row = await seleccionar('ajustes', { eq: { clave }, maybeSingle: true });
    return row ? row.valor : null;
}

export async function guardarAjuste(clave, valor, userId) {
    if (!db) throw new Error('Supabase no está configurado.');
    const { error } = await db.from('ajustes').upsert({
        clave, valor, updated_by: userId || null
    }, { onConflict: 'clave' });
    if (error) throw new Error(mensajeError(error));
}
