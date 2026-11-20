import Hero from '@/components/Hero';
import About from '@/components/About';
import Facilities from '@/components/Facilities';
import Restaurant from '@/components/Restaurant';
import Gallery from '@/components/Gallery';
import CTA from '@/components/CTA';
import Contact from '@/components/Contact';

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Facilities />
      <Restaurant />
      <Gallery />
      <CTA />
      <Contact />
    </>
  );
}
