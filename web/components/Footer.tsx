import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import Logo from '@/components/Logo';
import { siteConfig } from '@/config/site';

const links = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Instalaciones', href: '#instalaciones' },
  { label: 'Restaurante', href: '#restaurante' },
  { label: 'Galería', href: '#galeria' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Footer() {
  return (
    <footer className="bg-[#102A22] text-warm">
      <div className="container-luxe py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo inverted />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-warm/65">
              Aguas termales naturales, bosque y hospitalidad en Gracias, Lempira, Honduras.
            </p>
            <div className="mt-6 flex gap-3">
              {siteConfig.social.facebook && (
                <a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook de Termas del Río"
                  className="grid h-10 w-10 place-items-center rounded-full border border-beige/25 text-beige transition-colors hover:bg-beige hover:text-forest"
                >
                  <Facebook size={17} strokeWidth={1.6} aria-hidden="true" />
                </a>
              )}
              {siteConfig.social.instagram && (
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de Termas del Río"
                  className="grid h-10 w-10 place-items-center rounded-full border border-beige/25 text-beige transition-colors hover:bg-beige hover:text-forest"
                >
                  <Instagram size={17} strokeWidth={1.6} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-luxe text-beige">Navegación</p>
            <nav className="mt-6 grid grid-cols-2 gap-y-3" aria-label="Navegación del pie de página">
              {links.map((link) => (
                <a key={link.href} href={link.href} className="text-sm text-warm/70 transition-colors hover:text-beige">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-luxe text-beige">Contacto</p>
            <ul className="mt-6 space-y-4 text-sm text-warm/70">
              <li className="flex gap-3">
                <MapPin size={17} className="mt-0.5 shrink-0 text-beige" strokeWidth={1.5} aria-hidden="true" />
                <span>{siteConfig.address}</span>
              </li>
              <li className="flex gap-3">
                <Phone size={17} className="shrink-0 text-beige" strokeWidth={1.5} aria-hidden="true" />
                <span>{siteConfig.phoneDisplay}</span>
              </li>
              <li className="flex gap-3">
                <Mail size={17} className="shrink-0 text-beige" strokeWidth={1.5} aria-hidden="true" />
                <a href={`mailto:${siteConfig.email}`} className="break-all hover:text-beige">
                  {siteConfig.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-luxe text-beige">Horarios</p>
            <p className="mt-6 text-sm leading-relaxed text-warm/70">{siteConfig.hours}</p>
            <p className="mt-6 text-xs leading-relaxed text-warm/45">
              Horarios e información comercial sujetos a confirmación del establecimiento.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-7 text-xs text-warm/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.</p>
          <p>Hecho con calma en Gracias, Lempira, Honduras.</p>
        </div>
      </div>
    </footer>
  );
}
