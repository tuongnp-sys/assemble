import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });
const svg = join(pub, 'favicon.svg');
const ico = join(pub, 'favicon.ico');
if (existsSync(svg)) {
  copyFileSync(svg, ico);
  console.log('favicon.ico created from favicon.svg');
}
