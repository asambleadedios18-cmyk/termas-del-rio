/**
 * Configuración central del sitio.
 *
 * Todos los datos editables viven aquí. El número de WhatsApp puede
 * sobrescribirse con NEXT_PUBLIC_WHATSAPP_NUMBER. El valor por defecto
 * proviene del contenido confirmado del establecimiento, no es inventado.
 */
export const siteConfig = {
  name: 'Termas del Río',
  shortName: 'Termas del Río',
  tagline: 'Aguas termales y canopy en Gracias, Lempira',
  description:
    'Termas del Río: balneario de aguas termales naturales y canopy a 7 km de Gracias, Lempira, Honduras. Cabañas y restaurante en el valle de Río Grande.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://termasdelrio.com',
  locale: 'es_HN',

  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '50493515778').replace(/\D/g, ''),
  phoneDisplay: '+504 9351-5778',
  email: 'reservaciones@termasdelrio.com',

  address:
    'Km 7, carretera Gracias – Santa Rosa de Copán, aldea Río Grande, Gracias, Lempira, Honduras',
  city: 'Gracias, Lempira, Honduras',
  mapsQuery: 'Termas del Rio, Gracias, Lempira, Honduras',

  hours:
    'Todos los días de 7:00 a. m. a 9:00 p. m. (uso de la piscina hasta las 11:00 p. m.)',

  social: {
    facebook: 'https://www.facebook.com/termas.lodge.1/',
    instagram: 'https://www.instagram.com/termas_del_rio',
  },

  reservationMessage:
    'Hola, quisiera obtener información sobre Termas del Río y realizar una reservación. ¿Podrían brindarme información?',
  restaurantMessage:
    'Hola, quisiera información sobre el restaurante de Termas del Río. ¿Podrían brindarme información?',
  contactMessagePrefix: 'Hola, quisiera contactar con Termas del Río.',

  seo: {
    title: 'Termas del Río | Aguas termales en Gracias, Lempira',
    keywords: [
      'Termas del Río',
      'Aguas termales en Gracias, Lempira',
      'Turismo en Gracias Honduras',
      'Lugares turísticos de Lempira',
      'Turismo en Honduras',
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;
