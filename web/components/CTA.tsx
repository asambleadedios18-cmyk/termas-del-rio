import { ArrowUpRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { whatsappUrl } from '@/lib/whatsapp';

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-[#F1EEE5] py-20 sm:py-24">
      <div className="container-luxe">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] bg-forest px-7 py-14 text-center shadow-lift sm:px-14 sm:py-20">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-beige/20" />
            <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full border border-beige/10" />
            <div className="relative">
              <span className="eyebrow !text-beige">Reservaciones</span>
              <h2 className="mx-auto max-w-3xl font-serif text-4xl leading-tight text-warm sm:text-5xl lg:text-6xl">
                Tu próxima experiencia comienza aquí
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-warm/75">
                Escríbenos por WhatsApp para consultar disponibilidad, horarios y todo lo que
                necesitas saber antes de visitarnos.
              </p>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-9"
              >
                Reservar por WhatsApp
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
