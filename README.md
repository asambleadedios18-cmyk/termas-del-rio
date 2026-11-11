# Termas del Río 🌊♨️ — Plataforma turística integral

Plataforma turística de **Termas del Río** (balneario de aguas termales y canopy
en Gracias, Lempira, Honduras), desarrollada en fases en este repositorio.
También sirve de respaldo del contenido administrado en el panel del sitio oficial.

- **Sitio oficial (panel PHP, administrado por terceros):** https://www.termasdelrio.com
- **Vista previa de la plataforma (GitHub Pages):** https://asambleadedios18-cmyk.github.io/termas-del-rio/
- **Repositorio:** https://github.com/asambleadedios18-cmyk/termas-del-rio

## ⚠️ Regla de oro del contenido

> **Nunca inventar servicios, precios, horarios ni información comercial.**
> Todo el contenido real proviene del panel oficial (www.termasdelrio.com/admin)
> o de lo que confirme el establecimiento. Las categorías previstas pero NO
> confirmadas se guardan con `"estado": "borrador"` en `data/` y **no se publican**
> en el sitio hasta que el establecimiento las confirme.

## Estructura

```
termas-del-rio/
├── index.html                 → Portada cinematográfica del portal
├── servicios/                 → Una página por servicio confirmado
│   ├── balneario.html         → Balneario y piscinas termales
│   ├── canopy.html            → Canopy sobre el valle
│   ├── cabanas.html           → Cabañas y hospedaje
│   └── restaurante.html       → Restaurante (menú real)
├── galeria.html               → Galería (vacía hasta tener fotos)
├── ubicacion.html             → Ubicación y cómo llegar
├── contacto.html              → Contacto y canales
├── solicitar.html             → Formulario de solicitudes (Fase 3)
├── 404.html                   → Página de error
├── css/style.css              → Estilos (diseño oficial + estilos de la plataforma)
├── js/main.js                 → Comportamientos (menú, animaciones, lightbox)
├── js/solicitar.js            → Motor del formulario de solicitudes (WhatsApp/correo)
├── img/                       → Imágenes del sitio (favicon; fotos pendientes)
├── data/                      → CAPA DE DATOS: catálogo del contenido
│   ├── sitio.json             → Identidad, contacto, tarifas, horario, FAQ, SEO
│   ├── servicios.json         → Servicios: publicados y borradores
│   ├── galeria.json           → Esquema de fotos y videos (sin fotos aún)
│   └── solicitudes-tipos.json → Tipos de solicitud/reserva (activos y borradores)
├── robots.txt · sitemap.xml · .nojekyll
└── README.md
```

## Cómo se administra el contenido (sin tocar código)

La administración se hace con **GitHub + OpenCode** en lenguaje natural:

1. Abre OpenCode en este repositorio.
2. Pide el cambio en español, por ejemplo:
   - «Cambia el precio de entrada de adultos a L 120 en todo el sitio»
   - «Agrega una nueva promoción» (queda como borrador si no está confirmada)
   - «Actualiza el horario de atención»
   - «Sube estas fotos a la galería» (indicando las rutas de los archivos)
3. OpenCode actualiza `data/*.json` (catálogo) y las páginas HTML
   correspondientes, y hace el commit.
4. GitHub Pages publica el cambio automáticamente en la vista previa.

**Si usas GitHub Desktop:** puedes ver y confirmar los cambios desde la app,
pero la vía principal es pedirle los cambios a OpenCode.

## Contenido real actual (2026-11-10)

### Contacto
- **WhatsApp / Celular:** +504 9351-5778 (wa.me/50493515778)
- **Correo:** reservaciones@termasdelrio.com
- **Facebook:** https://www.facebook.com/termas.lodge.1/
- **Instagram:** https://www.instagram.com/termas_del_rio
- **TikTok:** https://www.tiktok.com/@termasdelriolodge
  *(nota: el panel oficial no tiene campo para TikTok por ahora)*

### Tarifas y horario (confirmados en el panel oficial)
- Entrada adultos: **L 100** · Entrada niños: **L 50** · Canopy: **L 300** (5 líneas)
- Horario: **todos los días de 7:00 a. m. a 9:00 p. m.** (uso de la piscina hasta las 11:00 p. m.)
- Cabañas por noche: **consultar**

### Servicios confirmados (publicados)
Balneario, canopy, cabañas, restaurante.

### Categorías previstas (borrador, NO publicar hasta confirmación)
Instalaciones, aventuras, naturaleza, eventos, promociones, paquetes, historia.

## Estado del panel oficial (www.termasdelrio.com)

- [x] Datos de contacto ingresados (WhatsApp, teléfono, correo, Facebook, Instagram)
- [x] Tarifas actualizadas (adultos L 100, niños L 50)
- [x] Horario actualizado en el panel
- [ ] Subir fotos (portada, balneario, canopy, cabañas, restaurante, galería)
- [ ] Quitar el modo mantenimiento y poner el sitio en línea

## Sistema de solicitudes (Fase 3)

La página **`solicitar.html`** permite pedir información o reservas:

1. El visitante elige el tipo de solicitud (hospedaje, visita de un día,
   canopy, grupos, piscinas) y completa sus datos.
2. Al enviar, **se abre WhatsApp con el mensaje ya redactado** (o puede
   enviarlo por correo). El sitio es estático: **no se envía ni guarda nada
   en un servidor**.
3. **La confirmación es MANUAL** por el personal autorizado del balneario.

Los tipos de solicitud, sus campos y el texto de cada mensaje se definen en
`data/solicitudes-tipos.json`. Los tipos `"estado": "borrador"`
(restaurante, eventos, paquetes) **no aparecen** en el formulario hasta que
el establecimiento los confirme.

## Fases del proyecto

1. **Fundación modular** ✅ *(estructura, portada, páginas de servicios, capa de datos)*
2. Páginas individuales de cada servicio ✅ *estructura lista; falta integrar fotos y videos cuando existan*
3. **Sistema de solicitudes por WhatsApp** ✅ *(solicitar.html + js/solicitar.js, confirmación manual)*
4. Portal completo
5. Administración 100 % sin código (GitHub + OpenCode)
6. Publicación en termasdelrio.com (solo con aprobación explícita)

## Notas técnicas

- Sitio 100 % estático: HTML + CSS + JS, sin paso de compilación.
- El diseño reutiliza la identidad visual del sitio oficial
  (verde termal `#123b3a`, agua `#2f8f8a`, dorado `#c8a24a`, Playfair Display + Montserrat).
- Mientras no haya fotos, las secciones usan marcadores de posición generados
  con CSS (no imágenes genéricas de banco). Cuando lleguen las fotos reales,
  se reemplazan los marcadores.
- Reservas y solicitudes: canal principal WhatsApp; la confirmación es manual
  por personal autorizado (no hay pagos ni reservas automáticas en línea).
- Los archivos `styles.css` e `images/` del respaldo inicial fueron retirados
  en la Fase 1 (quedan en el historial de Git si se necesitan).
