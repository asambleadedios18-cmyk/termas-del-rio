# Termas del Río 🌊♨️ — Sitio público rediseñado (v12)

Sitio público estático de **Termas del Río** (balneario de aguas termales y
canopy en Gracias, Lempira, Honduras), con portada cinematográfica, galería de
fotos reales y solicitudes de reserva por WhatsApp.

Este repositorio publica la capa pública en GitHub Pages y está configurado
para servirse desde el dominio propio. El sitio PHP oficial sigue siendo
administrado por terceros y **no se ha modificado**: no hay acceso a archivos
ni FTP de Hostinger.

- **Sitio público (destino):** https://termasdelrio.com
- **Vista previa temporal (GitHub Pages):** https://asambleadedios18-cmyk.github.io/termas-del-rio/
- **Panel oficial (PHP, administrado por terceros):** https://www.termasdelrio.com/admin/index.php
- **Repositorio:** https://github.com/asambleadedios18-cmyk/termas-del-rio

## ⚠️ Regla de oro del contenido

> **Nunca inventar servicios, precios, horarios ni información comercial.**
> Todo el contenido real proviene del panel oficial o de lo que confirme el
> establecimiento. Las categorías previstas pero NO confirmadas se guardan con
> `"estado": "borrador"` y **no se publican**.

**Servicios publicados:** balneario, restaurante, cabañas y canopy.

**No publicar:** salón de conferencias, áreas recreativas, campo de fútbol/vóley,
bungalós ni asados. Restaurante y canopy se muestran sin foto hasta recibir
material real del establecimiento.

## Estructura

```
termas-del-rio/
├── index.html                 → Portada cinematográfica (v12)
├── servicios/                 → Una página por servicio confirmado
│   ├── balneario.html
│   ├── canopy.html
│   ├── cabanas.html
│   └── restaurante.html
├── solicitar.html             → Motor de reservas por WhatsApp
├── galeria.html               → Galería de fotos reales con filtros y lightbox
├── contacto.html · ubicacion.html · 404.html
├── css/style.css              → Diseño v12 (intro, hero, tarjetas, reservas, responsive)
├── js/
│   ├── site-data.js           → Capa central: contacto, WhatsApp, servicios y galería
│   ├── intro.js               → Introducción animada, omitir y prefers-reduced-motion
│   ├── home.js                → Render data-driven de la portada
│   ├── galeria.js             → Filtros y render de la galería
│   ├── main.js                → Menú móvil, reveal, lightbox y enlaces
│   ├── solicitar.js           → Validación, resumen, wa.me y registro opcional
│   └── supabase-config.js     → URL y clave anon (vacías hasta configurar)
├── data/
│   ├── sitio.json             → Identidad, contacto, WhatsApp, FAQ, tarifas, tipos de cabaña
│   ├── servicios.json         → Servicios publicados y borradores
│   ├── galeria.json           → 7 fotos reales; secciones vacías declaradas
│   ├── menu.json              → Menú oficial del restaurante
│   └── solicitudes-tipos.json → Tipos de solicitud (activos y borradores)
├── admin/                     → Panel de reservaciones (SPA estática, sin cambios de diseño)
├── supabase/                  → SQL: tablas, funciones, RPC, RLS y datos iniciales
├── img/                       → Imágenes reales (incluye img/cabanas/)
├── robots.txt · sitemap.xml · .nojekyll
├── README.md
└── plan-facebook.md           → Plan de redes sociales (documento de trabajo, sin credenciales)
```

## Novedades de la v12

- **Introducción cinematográfica:** «BIENVENIDO A TERMAS DEL RÍO», logo real,
  transición entre fotografías del establecimiento, botón **Omitir**, tecla
  `Escape`, duración menor a 3 segundos y una sola vez por sesión. Se crea por
  JavaScript para no ocultar el contenido de SEO. Con
  `prefers-reduced-motion: reduce` no se muestra.
- **Portada data-driven:** hero con foto real, datos rápidos, experiencias,
  vista previa de galería, FAQ y banda de reserva. El contenido sale de
  `data/*.json`, no del HTML.
- **Reservas en dos pasos:** el visitante completa servicio, fecha, hora,
  adultos, niños, alojamiento, noches y notas; revisa un resumen y envía un
  mensaje ya redactado a WhatsApp. El estado es siempre **pendiente de
  confirmación**.
- **WhatsApp centralizado:** el número real `50493515778` vive únicamente en
  `data/sitio.json`. Todos los enlaces `data-wa` se construyen desde ahí con
  `js/site-data.js`; ya no hay `wa.me` escrito a mano en el HTML.
- **Galería real:** 7 fotografías de `img/cabanas/` organizadas por balneario,
  cabañas y entorno. Los filtros respetan el lightbox/carrusel y las secciones
  sin fotos muestran una nota, nunca imágenes genéricas.
- **SEO y responsive:** metadatos y `og:*` por página, `sitemap.xml` con
  `lastmod` al 2026-11-19, navegación móvil, imágenes con `alt` y `lazy`,
  enlaces de contacto accesibles.

## Cómo administrar el contenido (sin tocar código)

1. Abre OpenCode en este repositorio.
2. Pide el cambio en español, por ejemplo:
   - «Cambia el número de WhatsApp en todo el sitio» → edita `data/sitio.json`.
   - «Agrega una foto real a la galería» → edita `data/galeria.json`.
   - «Actualiza el horario o una respuesta de FAQ» → edita `data/sitio.json`.
   - «Publica/habilita un servicio confirmado» → edita `data/servicios.json`.
3. OpenCode actualiza los JSON y, si hace falta, las páginas y hace el commit.
4. GitHub Pages publica el cambio automáticamente en la vista previa.

**Regla:** si una categoría sigue en borrador, no se activa en el menú ni en el
formulario hasta confirmación del establecimiento.

## Contacto, tarifas y horario (confirmados en el panel oficial)

- **WhatsApp / celular:** +504 9351-5778 (`50493515778`)
- **Correo:** reservaciones@termasdelrio.com
- **Facebook:** https://www.facebook.com/termas.lodge.1/
- **Instagram:** https://www.instagram.com/termas_del_rio
- **Entrada adultos:** L 100 · **Entrada niños:** L 50 · **Canopy:** L 800 (5 líneas)
- **Cabañas:** precio por noche, a consultar
- **Horario:** todos los días de 7:00 a. m. a 9:00 p. m. (uso de piscina hasta las 11:00 p. m.)
- **Dirección:** Km 7, carretera Gracias – Santa Rosa de Copán, aldea Río Grande,
  Gracias, Lempira, Honduras

Los tipos reales publicados son **Cabaña Doble** (2 camas Queen, hasta 2
personas) y **Cabaña Triple** (2 camas Queen + 1 unipersonal, hasta 3 personas).
Están en `data/sitio.json` y se cargan también desde Supabase cuando esté
configurado.

### Galería

Fotos reales incluidas: piscina principal, piscina secundaria, cabañas en el
bosque (2), exterior e interior de cabaña y camino al bosque. Restaurante y
canopy quedan sin fotografías hasta que el establecimiento entregue material
real.

## Sistema de reservas (WhatsApp primero)

1. En `solicitar.html` se elige servicio, fecha, hora estimada, adultos, niños,
   tipo de cabaña, noches y notas, además de nombre y teléfono.
2. «Revisar solicitud» valida los campos y muestra el resumen antes de enviar.
3. «Confirmar reservación por WhatsApp» abre `wa.me` con el mensaje organizado y
   el número centralizado. Si no se abre, hay un enlace manual.
4. La solicitud queda **pendiente**. El personal autorizado confirma
   disponibilidad, horario y cualquier forma de pago directamente con el
   visitante. **Nunca hay confirmación ni cobro automático.**

Si Supabase está configurado, la misma solicitud se registra como pendiente en
el panel mediante `crear_solicitud_publica` y se muestra un código `SOL-...`. Si
no está configurado o falla, WhatsApp sigue funcionando igual.

Los tipos activos y sus mensajes se definen en `data/solicitudes-tipos.json`.
Los borradores (`restaurante`, `eventos`, `paquetes`) **no se activan** sin
confirmación.

## Panel de reservaciones y Supabase

El panel en `admin/` se conserva sin cambios de diseño: tablero, reservaciones,
calendario, cabañas, huéspedes, pagos, solicitudes, notificaciones y seguridad.

- **URL y clave `anon public` pendientes:** `admin/js/config.js` y
  `js/supabase-config.js` están vacíos a la espera del proyecto real.
- Hasta configurarlos, el flujo público funciona solo con WhatsApp.
- La clave `service_role` **nunca** se escribe en el repositorio.
- Instalación: seguir `supabase/README.md` (ejecutar `01` → `05`, crear el
  usuario administrador y promoverlo).
- No se ha probado el ciclo completo web → panel → confirmación → pago →
  notificación porque faltan las credenciales públicas del proyecto.

## Estado del sitio oficial

- El panel PHP sigue con el modo mantenimiento activo. **No se desactiva sin
  autorización explícita.**
- No hay acceso a archivos/FTP de Hostinger: el rediseño no puede aplicarse
  directamente al sitio PHP desde este repositorio.
- GitHub Pages ya tiene el dominio `termasdelrio.com` configurado en el repo
  (archivo `CNAME` y ajuste de la API). Falta aplicar los registros DNS en
  Cloudflare para que el dominio apunte a GitHub Pages.
- Al cambiar el DNS, el dominio dejará de servir el sitio PHP actual. El panel
  `/admin/index.php` debe migrarse o alojarse en otro hostname antes de hacerlo.

## Dominio propio (Cloudflare)

El dominio usa Cloudflare (`novalee.ns.cloudflare.com` y
`fred.ns.cloudflare.com`). En **DNS → Records** configurar:

| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only (nube gris) |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| CNAME | `www` | `asambleadedios18-cmyk.github.io` | DNS only |

Borrar los A/CNAME actuales de `@` y `www` que apuntan a Cloudflare/Hostinger.
Después marcar **Enforce HTTPS** en *Settings → Pages → Custom domain* cuando
GitHub termine de emitir el certificado.

## Fases del proyecto

1. **Fundación modular** ✅
2. **Páginas de servicios** ✅ *con foto real en balneario; restaurante y canopy sin foto*
3. **Solicitudes por WhatsApp** ✅ *(resumen, validación, pendiente y registro opcional)*
4. **Rediseño v12 y galería real** ✅ *(intro, portada, reservas, SEO y responsive)*
5. **Panel con Supabase** 🟡 *código listo; pendiente URL/anon key y prueba end-to-end*
6. Administración 100 % sin código 🟡 *(GitHub + OpenCode)*
7. Publicación en termasdelrio.com 🟡 *(GitHub listo; falta aplicar DNS en Cloudflare)*

## Notas técnicas

- Sitio 100 % estático: HTML + CSS + JS, sin compilación.
- Las rutas de `data/*.json` se calculan desde la etiqueta `<script>`, por lo que
  funcionan igual en la raíz, en `/servicios/` y bajo `/termas-del-rio/` en
  GitHub Pages.
- Caché de assets con sufijo `?v=12` (CSS), `?v=4` (JS principal/reservas) y
  `?v=2` (datos, intro, portada y galería).
- El lightbox filtra enlaces ocultos para que el carrusel respete los filtros de
  la galería.
- Sin credenciales ni `service_role` en el repositorio.
