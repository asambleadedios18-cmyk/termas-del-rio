import { Waves } from 'lucide-react';
import { siteConfig } from '@/config/site';

type LogoProps = {
  inverted?: boolean;
  compact?: boolean;
};

export default function Logo({ inverted = false, compact = false }: LogoProps) {
  const main = inverted ? 'text-warm' : 'text-forest';
  const sub = inverted ? 'text-beige' : 'text-forest-deep';

  return (
    <a href="#inicio" className="group inline-flex items-center gap-3" aria-label={`${siteConfig.name} — Inicio`}>
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
          inverted ? 'border-beige/70 text-beige group-hover:bg-beige group-hover:text-forest' : 'border-forest/25 text-forest group-hover:bg-forest group-hover:text-warm'
        }`}
      >
        <Waves size={21} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span className="leading-none">
        <span className={`block font-serif text-[22px] font-semibold tracking-tight ${main}`}>
          {siteConfig.name}
        </span>
        {!compact && (
          <span className={`mt-1.5 block text-[9px] font-semibold uppercase tracking-luxe ${sub}`}>
            Aguas termales
          </span>
        )}
      </span>
    </a>
  );
}
