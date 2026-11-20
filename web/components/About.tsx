import Image from 'next/image';
import { Leaf, Sparkles } from 'lucide-react';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';

export default function About() {
  return (
    <section id="nosotros" className="section-pad bg-warm">
      <div className="container-luxe grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-soft sm:aspect-[5/4] lg:aspect-[4/5]">
            <Image
              src="/images/cabanas-bosque-01.jpg"
              alt="Cabañas de Termas del Río entre el bosque"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          </div>
          <div className="absolute -bottom-6 -right-3 hidden w-56 rounded-2xl bg-forest p-6 text-warm shadow-lift sm:block lg:-right-8">
            <Leaf size={22} className="mb-3 text-beige" strokeWidth={1.5} aria-hidden="true" />
            <p className="font-serif text-2xl leading-tight">Naturaleza que se siente</p>
            <p className="mt-2 text-xs leading-relaxed text-warm/70">
              Gracias, Lempira, Honduras
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <SectionHeading
            eyebrow="Nosotros"
            title="Una experiencia de descanso y naturaleza"
            description="En Termas del Río, el paisaje de Gracias, Lempira, es parte de la experiencia. El agua termal, el bosque y una hospitalidad sencilla invitan a vivir el descanso a otro ritmo."
          />

          <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink/75">
            <p>
              Ven a pasar el día en familia, a quedarte una noche entre cabañas o a recorrer el canopy
              sobre el valle. Cada visita puede ser distinta: lo que permanece es la sensación de estar
              en un lugar hecho para detenerse.
            </p>
            <p>
              Preferimos cuidar lo que ya existe —el agua, el bosque, la calma— antes que llenar la
              experiencia de promesas. Por eso nuestra invitación es simple: llegar, respirar y
              disfrutar.
            </p>
          </div>

          <div className="mt-9 flex items-center gap-4 border-t border-forest/10 pt-7">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-forest/5 text-forest">
              <Sparkles size={21} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <p className="max-w-sm text-sm text-ink/70">
              Contenido editable: esta presentación se ajusta a la información que confirme el
              establecimiento.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
