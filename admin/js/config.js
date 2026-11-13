/* ============================================================
   Configuración del panel · TERMAS DEL RÍO
   ------------------------------------------------------------
   1. Crea el proyecto en Supabase y ejecuta los scripts SQL.
   2. Copia aquí la URL y la clave "anon public".
   3. Nunca escribas la clave "service_role" en este archivo.
   ============================================================ */

export const SUPABASE_URL = '';        // ej. 'https://abcdefgh.supabase.co'
export const SUPABASE_ANON_KEY = '';   // clave anon public

export const APP = {
    nombre: 'Termas del Río',
    panel: 'Reservaciones',
    version: '1.0.0',
    moneda: 'HNL',
    simbolo: 'L',
    zonaHoraria: 'America/Tegucigalpa',
    whatsapp: '50493515778',
    email: 'reservaciones@termasdelrio.com',
};

export function isConfigured() {
    return Boolean(
        SUPABASE_URL &&
        SUPABASE_ANON_KEY &&
        /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL.replace(/\/+$/, '')) &&
        SUPABASE_ANON_KEY.length > 40
    );
}
