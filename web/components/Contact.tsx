'use client';

import { useState, type FormEvent } from 'react';
import { Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import { siteConfig } from '@/config/site';
import { contactWhatsappUrl } from '@/lib/whatsapp';

type Errors = {
  name?: string;
  email?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [opened, setOpened] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Errors = {};

    if (name.trim().length < 2) nextErrors.name = 'Escribe tu nombre.';
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = 'Escribe un correo válido.';
    if (message.trim().length < 10) nextErrors.message = 'Cuéntanos un poco más (mínimo 10 caracteres).';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    window.open(contactWhatsappUrl(name, email, message), '_blank', 'noopener,noreferrer');
    setOpened(true);
  };

  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(siteConfig.mapsQuery)}&output=embed`;

  return (
    <section id="contacto" className="section-pad bg-warm">
      <div className="container-luxe">
        <Reveal>
          <SectionHeading
            eyebrow="Ubicación y contacto"
            title="Nos encontramos en Gracias, Lempira"
            description="Escríbenos o acércate a Termas del Río. Estamos a 7 km de Gracias, sobre la carretera a Santa Rosa de Copán."
          />
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-forest/10 bg-white p-6">
                <MapPin size={20} className="text-forest-deep" strokeWidth={1.6} aria-hidden="true" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-forest-deep">
                  Dirección
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{siteConfig.address}</p>
              </div>
              <div className="rounded-2xl border border-forest/10 bg-white p-6">
                <Clock3 size={20} className="text-forest-deep" strokeWidth={1.6} aria-hidden="true" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-forest-deep">
                  Horarios
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{siteConfig.hours}</p>
              </div>
              <div className="rounded-2xl border border-forest/10 bg-white p-6">
                <Phone size={20} className="text-forest-deep" strokeWidth={1.6} aria-hidden="true" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-forest-deep">
                  WhatsApp
                </p>
                <p className="mt-2 text-sm text-ink/75">{siteConfig.phoneDisplay}</p>
              </div>
              <div className="rounded-2xl border border-forest/10 bg-white p-6">
                <Mail size={20} className="text-forest-deep" strokeWidth={1.6} aria-hidden="true" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-forest-deep">
                  Correo
                </p>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="mt-2 block break-all text-sm text-ink/75 hover:text-forest"
                >
                  {siteConfig.email}
                </a>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[26px] border border-forest/10 shadow-soft">
              <iframe
                title="Mapa de Termas del Río, Gracias, Lempira"
                src={mapsSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="h-72 w-full sm:h-80"
              />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-[26px] border border-forest/10 bg-white p-7 shadow-soft sm:p-9"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-forest/5 text-forest">
                  <MessageCircle size={20} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-serif text-2xl text-forest">Escríbenos</h3>
                  <p className="text-sm text-ink/60">Respondemos por WhatsApp.</p>
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-[0.16em] text-forest-deep">
                    Nombre
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    className="mt-2 w-full rounded-xl border border-forest/15 bg-warm/40 px-4 py-3 text-sm outline-none transition-colors focus:border-forest focus:bg-white"
                    placeholder="Tu nombre"
                  />
                  {errors.name && <p id="name-error" className="mt-1.5 text-xs text-red-700">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.16em] text-forest-deep">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className="mt-2 w-full rounded-xl border border-forest/15 bg-warm/40 px-4 py-3 text-sm outline-none transition-colors focus:border-forest focus:bg-white"
                    placeholder="nombre@correo.com"
                  />
                  {errors.email && <p id="email-error" className="mt-1.5 text-xs text-red-700">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-[0.16em] text-forest-deep">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'message-error' : undefined}
                    className="mt-2 w-full resize-none rounded-xl border border-forest/15 bg-warm/40 px-4 py-3 text-sm outline-none transition-colors focus:border-forest focus:bg-white"
                    placeholder="¿En qué podemos ayudarte?"
                  />
                  {errors.message && <p id="message-error" className="mt-1.5 text-xs text-red-700">{errors.message}</p>}
                </div>
              </div>

              <button type="submit" className="btn-primary mt-7 w-full">
                Enviar por WhatsApp
              </button>

              <p aria-live="polite" className="mt-4 min-h-5 text-center text-xs text-forest-deep">
                {opened
                  ? 'Se abrió WhatsApp con tu mensaje listo para enviar.'
                  : 'Al enviar, se abrirá WhatsApp con tu mensaje y la información completada.'}
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
