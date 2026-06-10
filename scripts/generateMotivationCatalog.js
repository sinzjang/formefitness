#!/usr/bin/env node
/** src/imgs/motivations 하위 jpg → constants/motivationImages.ts 생성 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const base = path.join(root, 'src/imgs/motivations');
const dirs = ['motivation_images', 'motivation_images_2', 'motivation_images_3'];
const entries = [];

for (const dir of dirs) {
  const full = path.join(base, dir);
  if (!fs.existsSync(full)) continue;
  for (const file of fs.readdirSync(full).filter((f) => /\.jpe?g$/i.test(f)).sort()) {
    entries.push(`  require('../src/imgs/motivations/${dir}/${file}'),`);
  }
}

const out = [
  '// 자동 생성 — npm run gen:motivation-catalog',
  '',
  'export const MOTIVATION_IMAGE_SOURCES = [',
  ...entries,
  '] as const;',
  '',
  `export const MOTIVATION_IMAGE_COUNT = ${entries.length};`,
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'constants/motivationImages.ts'), out);
console.log(`✅ ${entries.length}장 → constants/motivationImages.ts`);
