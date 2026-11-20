import Image from 'next/image';
import { ArrowDown, MapPin } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { whatsappUrl } from '@/lib/whatsapp';

export default function Hero() {
  return (
    <section id="inicio" className="relative flex min-h-[100svh] items-end overflow-hidden bg-forest">
      <Image
        src="/images/piscina-principal.jpg"
        alt="Piscinas termales de Termas del Río rodeadas de naturaleza en Gracias, Lempira"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-forest/85 via-forest/35 to-forest/95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,transparent,rgba(24,61,50,0.55))]" />

      <div className="container-luxe relative z-10 pb-20 pt-36 sm:pb-28 lg:pb-36">
        <div className="max-w-3xl">
          <div className="mb-7 flex items-center gap-3 text-beige">
            <MapPin size={16} strokeWidth={1.6} aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-luxe">{siteConfig.city}</span>
          </div>

          <p className="mb-3 font-serif text-lg tracking-[0.35em] text-beige/90 sm:text-xl">
            {siteConfig.name.toUpperCase()}
          </p>
          <h1 className="hero-title font-serif text-[clamp(3rem,8vw,6.5rem)] font-medium leading-[0.95] text-warm">
            Un lugar para desconectar y disfrutar
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-warm/80 sm:text-lg">
            Aguas termales naturales, bosque y calma en el corazón de Gracias, Lempira. Una invitación
            a bajar el ritmo y volver a lo esencial.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#instalaciones" className="btn-light">
              Descubre nuestras instalaciones
            </a>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Reserva tu visita
            </a>
          </div>
        </div>

        <a
          href="#nosotros"
          className="animate-float-down mt-16 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-luxe text-warm/70 transition-colors hover:text-beige"
        >
          Desliza para explorar
          <ArrowDown size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
