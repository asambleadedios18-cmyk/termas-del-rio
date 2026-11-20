# Termas del Río — Sitio Next.js

Implementación moderna del sitio público con **Next.js App Router**, **TypeScript**,
**Tailwind CSS** y **Lucide React**. convive con el sitio estático de la raíz y
reutiliza sus datos confirmados y fotografías reales.

## Requisitos

- Node.js 20 o superior.

## Comandos

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run build        # genera web/out (static export)
npm run serve:static # sirve web/out en http://localhost:3000
```

## Configuración central

Toda la información editable está en `config/site.ts`:

- Nombre comercial y descripción.
- Número de WhatsApp y mensaje predefinido de reserva.
- Dirección, ciudad, consulta de Google Maps y horarios.
- Correo y redes sociales.
- Palabras clave SEO.

Variables de entorno opcionales:

```bash
NEXT_PUBLIC_WHATSAPP_NUMBER=50493515778
NEXT_PUBLIC_SITE_URL=https://termasdelrio.com
```

El número por defecto proviene del contenido confirmado del establecimiento.
No se inventan datos comerciales: menú, precios y fotografías de restaurante
quedan marcados como pendientes cuando no hay información confirmada.

## Estructura

```text
web/
├── app/
│   ├── layout.tsx      → metadata, fuentes, header/footer, JSON-LD
│   ├── page.tsx        → composición de la portada
│   ├── globals.css     → Tailwind + animaciones + reduced motion
│   ├── sitemap.ts
│   ├── robots.ts
│   └── not-found.tsx
├── components/         → componentes reutilizables
├── config/site.ts      → configuración general
├── lib/whatsapp.ts     → enlaces wa.me codificados
├── public/images/      → fotos reales copiadas desde img/cabanas
└── scripts/serve.mjs   → servidor local del export estático
```

## Notas de diseño

- Paleta: verde bosque `#183D32`, verde profundo `#244E40`, beige `#D8C7A1`,
  blanco cálido `#F8F7F2` y gris `#333333`.
- Tipografía: serif elegante para títulos y sans-serif moderna para textos.
- Animaciones sutiles con `IntersectionObserver` y respeto a
  `prefers-reduced-motion`.
- `next/image` con `unoptimized: true` porque el proyecto se exporta
  estáticamente para GitHub Pages.
- Formulario de contacto validado que abre WhatsApp con el mensaje completado.
