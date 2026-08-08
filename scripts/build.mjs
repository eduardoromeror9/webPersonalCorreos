// Build script: minifica CSS/JS con esbuild y copia los assets estáticos a dist/.
// Netlify ejecuta `npm run build` y publica el contenido de `dist/`.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// Limpia dist/ y lo recrea
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Minifica JS (target es2018: compatible con los navegadores soportados)
await build({
  entryPoints: [join(root, 'js', 'main.js'), join(root, 'js', 'chatbot.js')],
  outdir: join(dist, 'js'),
  minify: true,
  target: ['es2018'],
  logLevel: 'info',
});

// Minifica CSS
await build({
  entryPoints: [
    join(root, 'css', 'normalize.css'),
    join(root, 'css', 'styles.css'),
    join(root, 'css', 'chatbot.css'),
  ],
  outdir: join(dist, 'css'),
  minify: true,
  logLevel: 'info',
});

// Copia el resto de archivos estáticos
const staticFiles = [
  'index.html',
  'sobre-mi.html',
  '404.html',
  'robots.txt',
  'sitemap.xml',
];

for (const file of staticFiles) {
  cpSync(join(root, file), join(dist, file));
}

cpSync(join(root, 'img'), join(dist, 'img'), { recursive: true });

console.log('✔ Build completado en dist/');
