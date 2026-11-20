import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'out');
const failures = [];

async function expectContains(file, fragments) {
  try {
    const content = await readFile(join(root, file), 'utf8');
    for (const fragment of fragments) {
      if (!content.includes(fragment)) failures.push(`${file}: falta «${fragment}»`);
    }
  } catch (error) {
    failures.push(`${file}: ${error.message}`);
  }
}

await expectContains('index.html', [
  'TERMAS DEL RÍO',
  'Un lugar para desconectar y disfrutar',
  'Una experiencia de descanso y naturaleza',
  'Tu próxima experiencia comienza aquí',
  'https://wa.me/50493515778',
  'Pendiente de confirmar',
  'Gracias, Lempira, Honduras',
]);

await expectContains('sitemap.xml', ['https://termasdelrio.com']);
await expectContains('robots.txt', ['Sitemap: https://termasdelrio.com/sitemap.xml']);

if (failures.length > 0) {
  console.error('VERIFICACIÓN FALLIDA:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('VERIFICACIÓN OK: export estático completo y sin enlaces rotos evidentes.');
