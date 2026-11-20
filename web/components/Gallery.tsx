'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Maximize2, X } from 'lucide-react';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';

type Photo = {
  src: string;
  title: string;
  description: string;
  ratio: string;
};

const photos: Photo[] = [
  {
    src: '/images/piscina-principal.jpg',
    title: 'Piscina principal',
    description: 'Piscina de aguas termales del balneario.',
    ratio: 'aspect-[3/4]',
  },
  {
    src: '/images/cabanas-bosque-01.jpg',
    title: 'Cabañas entre el bosque',
    description: 'Cabañas rodeadas de vegetación dentro del balneario.',
    ratio: 'aspect-[4/3]',
  },
  {
    src: '/images/piscina-secundaria.jpg',
    title: 'Piscina secundaria',
    description: 'Otra de las piscinas termales del complejo.',
    ratio: 'aspect-[3/4]',
  },
  {
    src: '/images/camino-bosque.jpg',
    title: 'Camino al bosque',
    description: 'Sendero natural en los alrededores de Termas del Río.',
    ratio: 'aspect-[4/5]',
  },
  {
    src: '/images/cabanas-bosque-02.jpg',
    title: 'Entorno de las cabañas',
    description: 'Área natural que rodea las cabañas.',
    ratio: 'aspect-[4/3]',
  },
  {
    src: '/images/cabanas-interior.jpg',
    title: 'Interior de cabaña',
    description: 'Espacio interior de una cabaña.',
    ratio: 'aspect-[4/5]',
  },
  {
    src: '/images/cabanas-exterior.jpg',
    title: 'Exterior de cabaña',
    description: 'Fachada de una de las cabañas del establecimiento.',
    ratio: 'aspect-[3/4]',
  },
];

export default function Gallery() {
  const [active, setActive] = useState<Photo | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = active ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active]);

  return (
    <section id="galeria" className="section-pad bg-warm">
      <div className="container-luxe">
        <Reveal>
          <SectionHeading
            eyebrow="Galería"
            title="Un vistazo al lugar"
            description="Fotografías reales de las piscinas, las cabañas y el entorno natural de Termas del Río."
            centered
          />
        </Reveal>

        <div className="masonry mt-14 columns-1 sm:columns-2 lg:columns-3">
          {photos.map((photo, index) => (
            <Reveal key={photo.src} delay={(index % 3) * 70}>
              <button
                type="button"
                onClick={() => setActive(photo)}
                className={`group relative block w-full overflow-hidden rounded-2xl bg-forest ${photo.ratio}`}
                aria-label={`Ampliar fotografía: ${photo.title}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <span className="absolute inset-0 bg-forest/0 transition-colors duration-500 group-hover:bg-forest/35" />
                <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-warm/90 text-forest">
                    <Maximize2 size={20} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/85 to-transparent p-5 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="block font-serif text-xl text-warm">{photo.title}</span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-forest/95 p-4 backdrop-blur-sm sm:p-10"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full border border-white/30 text-warm transition-colors hover:bg-white hover:text-forest"
            aria-label="Cerrar galería"
          >
            <X size={22} aria-hidden="true" />
          </button>
          <div
            className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-forest"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full">
              <Image src={active.src} alt={active.title} fill sizes="90vw" className="object-contain" />
            </div>
            <div className="bg-forest px-6 py-5 text-warm">
              <p className="font-serif text-2xl">{active.title}</p>
              <p className="mt-1 text-sm text-warm/70">{active.description}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
