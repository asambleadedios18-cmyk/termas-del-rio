import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';

const facilities = [
  {
    title: 'Piscinas',
    description:
      'Piscinas de aguas termales naturales, entre 35 y 42 °C, para pasar el día con calma.',
    image: '/images/piscina-principal.jpg',
    alt: 'Piscina principal de Termas del Río',
    span: 'lg:col-span-2',
  },
  {
    title: 'Aguas termales',
    description: 'Agua mineral caliente de origen volcánico en un entorno de valle abierto.',
    image: '/images/piscina-secundaria.jpg',
    alt: 'Piscina termal secundaria rodeada de vegetación',
    span: '',
  },
  {
    title: 'Áreas de descanso',
    description: 'Espacios para sentarse, conversar y dejar que el tiempo pase despacio.',
    image: '/images/cabanas-bosque-02.jpg',
    alt: 'Área natural junto a las cabañas de Termas del Río',
    span: '',
  },
  {
    title: 'Espacios naturales',
    description: 'El bosque y el valle de Río Grande como parte de la visita.',
    image: '/images/camino-bosque.jpg',
    alt: 'Camino entre el bosque en Termas del Río',
    span: '',
  },
  {
    title: 'Áreas recreativas',
    description:
      'Contenido pendiente de confirmación del establecimiento. Espacio reservado para futuras experiencias.',
    image: '/images/cabanas-bosque-01.jpg',
    alt: 'Entorno natural de las cabañas de Termas del Río',
    span: 'lg:col-span-2',
    pending: true,
  },
];

export default function Facilities() {
  return (
    <section id="instalaciones" className="section-pad bg-[#F1EEE5]">
      <div className="container-luxe">
        <Reveal>
          <SectionHeading
            eyebrow="Instalaciones"
            title="Espacios para quedarse un poco más"
            description="Una selección visual de los lugares que conforman la experiencia. El contenido marcado como pendiente se publicará solo cuando el establecimiento lo confirme."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((item, index) => (
            <Reveal key={item.title} delay={index * 80} className={item.span}>
              <article className="card-luxe group relative h-full min-h-[320px]">
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/95 via-forest/20 to-transparent" />
                {item.pending && (
                  <span className="absolute left-5 top-5 rounded-full border border-beige/60 bg-forest/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-beige backdrop-blur-sm">
                    Pendiente de confirmar
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-3xl text-warm">{item.title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-warm/75">
                        {item.description}
                      </p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-beige/50 text-beige transition-all duration-300 group-hover:rotate-45 group-hover:bg-beige group-hover:text-forest">
                      <ArrowUpRight size={18} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
