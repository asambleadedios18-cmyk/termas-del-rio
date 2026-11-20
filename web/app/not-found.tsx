import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="grid min-h-[70vh] place-items-center bg-warm px-6 text-center">
      <div>
        <p className="eyebrow justify-center">Error 404</p>
        <h1 className="heading-serif mt-2">Esta página no existe</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink/70">
          La página que buscas no está disponible. Puedes volver al inicio para seguir explorando
          Termas del Río.
        </p>
        <Link href="/" className="btn-primary mt-8">
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
