# Panel de reservaciones · Termas del Río

Sistema real de reservaciones para las cabañas de **Termas del Río**.
Base de datos, autenticación, permisos y API en **Supabase**; el panel es una
aplicación estática (HTML/CSS/JS) que se publica en GitHub Pages.

> La confirmación de una reservación **siempre es manual**. Una solicitud web
> entra como `nueva`; el personal revisa, verifica disponibilidad, confirma y
> registra el pago.

## 1. Crear el proyecto en Supabase

1. Entra a <https://supabase.com> y crea un proyecto (región recomendada:
   *East US*). Guarda la contraseña de la base de datos.
2. Abre **SQL Editor** y ejecuta los archivos **en este orden**:

   | Orden | Archivo | Contenido |
   |---|---|---|
   | 1 | `01_tables.sql` | Tablas, relaciones, secuencias, índices y restricción anti-traslape |
   | 2 | `02_functions.sql` | Validaciones, vista de reservaciones y RPC principales |
   | 3 | `03_rpc.sql` | Dashboard, calendario, triggers, bitácora y Realtime |
   | 4 | `04_rls.sql` | RLS, políticas y permisos (anon solo puede crear solicitudes) |
   | 5 | `05_seed.sql` | 2 tipos de cabaña, 14 cabañas y ajustes iniciales |

   Si algún archivo falla, corrígelo y vuelve a ejecutarlo: los scripts son
   idempotentes en su mayoría.

3. En **Authentication → Users → Add user** crea el usuario administrador con
   correo y contraseña. Después ejecuta (cambiando el correo):

   ```sql
   update public.perfiles
   set rol = 'admin', activo = true, nombre = 'Administrador'
   where email = 'CORREO_DEL_ADMIN';
   ```

   El perfil aparece automáticamente al crear el usuario, pero **inactivo**.
   Sin `activo = true` el panel rechaza el acceso.

4. En **Project Settings → API** copia:
   - `Project URL` (ej. `https://xxxxx.supabase.co`)
   - `anon public` key

   **Nunca** uses la clave `service_role` en el navegador.

## 2. Configurar el panel

Edita `admin/js/config.js`:

```js
export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
```

Mientras estén vacíos, el panel muestra la pantalla de configuración y no
intenta conectarse.

## 3. Publicar

El panel vive en `admin/` y no necesita compilación:

- GitHub Pages: `https://TU-USUARIO.github.io/termas-del-rio/admin/`
- También funciona abriendo `admin/index.html` con un servidor local
  (`python -m http.server`, Live Server, etc.). No uses `file://` porque los
  módulos ES y la sesión requieren HTTP/HTTPS.

En **Authentication → URL Configuration** agrega la URL del panel como
`Site URL` / `Redirect URL` si vas a usar recuperación de contraseña.

## 4. Roles

| Rol | Puede |
|---|---|
| `admin` | Todo: reservaciones, pagos, cabañas, tarifas, huéspedes, solicitudes, usuarios, ajustes y bitácora |
| `recepcion` | Reservaciones, pagos, huéspedes, solicitudes, consulta de cabañas y calendario |
| `consulta` | Solo lectura de reservaciones, calendario, huéspedes, pagos y solicitudes |

Los permisos se aplican **en la base de datos** (RLS + funciones), no solo en la
interfaz.

## 5. Seguridad y respaldo

- RLS activo en todas las tablas. `anon` solo puede ejecutar
  `crear_solicitud_publica` y `tipos_cabana_publicos`.
- El formulario público usa un campo trampa (*honeypot*), exige consentimiento,
  valida datos y limita solicitudes repetidas por teléfono.
- La restricción `reservaciones_no_overlap` impide traslapes incluso ante
  errores de la interfaz o llamadas directas a la API.
- La bitácora registra altas, cambios y bajas de reservaciones, pagos,
  huéspedes, cabañas, tarifas, solicitudes y perfiles.
- Respaldos: **Database → Backups** en Supabase (plan de pago) o
  `pg_dump` programado. No se guardan tarjetas ni datos bancarios.

## 6. Integración con el sitio público

`servicios/cabanas.html` lee `tipos_cabana_publicos()` y
`solicitar.html` envía la solicitud con `crear_solicitud_publica()`.
Ambos usan la misma `SUPABASE_URL` y `anon key` de `js/supabase-config.js`.
Si Supabase no responde, el formulario mantiene el envío por WhatsApp/correo.

## 7. Notificaciones

El panel prepara mensajes de WhatsApp y correo con plantillas editables
(`ajustes.plantillas`) y guarda cada envío en `notificaciones`. El envío
automático requiere un proveedor de correo (SMTP/Resend) o la API de WhatsApp
Business; hasta entonces el personal abre WhatsApp o su correo con el mensaje
listo y marca la notificación como enviada.

## 8. Puesta en marcha (checklist)

- [ ] Proyecto Supabase creado y scripts 01→05 ejecutados sin errores
- [ ] Usuario admin creado y perfil con `rol='admin'`, `activo=true`
- [ ] URL y anon key copiadas en `admin/js/config.js` y `js/supabase-config.js`
- [ ] Tarifas por noche cargadas en **Tarifas** (no hay precios inventados)
- [ ] Datos del negocio y plantillas revisados en **Ajustes**
- [ ] Inventario de cabañas verificado en **Cabañas**
- [ ] Prueba: crear solicitud web → aparece en el panel → confirmar → registrar pago
- [ ] Prueba: intentar reservar la misma cabaña en fechas traslapadas (debe fallar)
