import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import { whatsappUrl } from '@/lib/whatsapp';
import { siteConfig } from '@/config/site';

export default function Restaurant() {
  return (
    <section id="restaurante" className="section-pad bg-forest text-warm">
      <div className="container-luxe grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <Reveal>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-lift">
              <Image
                src="/images/camino-bosque.jpg"
                alt="Entorno natural de Termas del Río"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-forest/25" />
            </div>
            <div className="absolute -bottom-6 -left-4 rounded-2xl bg-warm px-5 py-4 text-forest shadow-lift sm:-left-8">
              <p className="text-[10px] font-semibold uppercase tracking-luxe text-forest-deep">
                Entorno
              </p>
              <p className="mt-1 font-serif text-xl">Río Grande, Gracias</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <SectionHeading
            eyebrow="Restaurante"
            title="El sabor también forma parte del descanso"
            description="En Termas del Río encontrarás un restaurante con comida típica hondureña. Sin carteles inventados ni platillos presumidos: mejor preguntar directamente y dejarse sorprender."
            inverted
          />

          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-beige/20 bg-white/5 p-5">
            <UtensilsCrossed size={22} className="mt-0.5 shrink-0 text-beige" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-warm">Menú y horarios</p>
              <p className="mt-1 text-sm leading-relaxed text-warm/70">
                Consulta la disponibilidad del día por WhatsApp. Fotografías y menú se publicarán
                cuando el establecimiento las proporcione.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl(siteConfig.restaurantMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-8"
          >
            Conocer el restaurante
          </a>
        </Reveal>
      </div>
    </section>
  );
}
