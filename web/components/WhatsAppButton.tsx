import { MessageCircle } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { whatsappUrl } from '@/lib/whatsapp';

export default function WhatsAppButton() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Reservar por WhatsApp: ${siteConfig.phoneDisplay}`}
      className="group fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_18px_40px_-12px_rgba(37,211,102,0.7)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-8 sm:right-8 sm:h-16 sm:w-16"
    >
      <MessageCircle size={26} strokeWidth={1.8} aria-hidden="true" />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-forest px-4 py-2 text-xs font-medium text-warm opacity-0 shadow-soft transition-opacity duration-300 group-hover:opacity-100 sm:block">
        Reserva por WhatsApp
      </span>
    </a>
  );
}
