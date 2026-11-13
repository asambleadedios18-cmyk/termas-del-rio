/* ==========================================================
   Configuración pública de Supabase · TERMAS DEL RÍO
   ----------------------------------------------------------
   Copia aquí la URL del proyecto y la clave "anon public".
   Esta clave es pública por diseño: solo permite crear
   solicitudes y leer los tipos de cabaña. NUNCA escribas la
   clave "service_role" en un archivo del sitio.

   Si estos valores están vacíos, el formulario público sigue
   funcionando y envía la solicitud por WhatsApp o correo.
   ========================================================== */
window.TERMAS_SUPABASE = {
    url: '',       // ej. 'https://abcdefgh.supabase.co'
    anonKey: '',   // clave anon public

    configurado: function () {
        return Boolean(
            this.url &&
            this.anonKey &&
            /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(this.url).replace(/\/+$/, '')) &&
            String(this.anonKey).length > 40
        );
    }
};
