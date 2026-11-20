import { siteConfig } from '@/config/site';

/** Construye un enlace wa.me válido a partir del número centralizado. */
export function whatsappUrl(message: string = siteConfig.reservationMessage): string {
  const phone = siteConfig.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** Enlace para el formulario de contacto. */
export function contactWhatsappUrl(name: string, email: string, message: string): string {
  const body = [
    siteConfig.contactMessagePrefix,
    '',
    `Nombre: ${name.trim()}`,
    `Correo: ${email.trim()}`,
    '',
    message.trim(),
  ].join('\n');

  return whatsappUrl(body);
}
