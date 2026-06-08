#!/usr/bin/env node
/** exercises_evaluated.json → CSV (엑셀 검토용) */
const fs = require('fs');
const path = require('path');
const { writeCSV } = require('./lib/csvUtils');

const ROOT = path.join(__dirname, '..');
const IN = path.join(ROOT, 'src/data/exercises_evaluated.json');
const OUT = path.join(ROOT, 'src/data/exercises_evaluated.csv');

const HEADERS = [
  'importance',
  'include',
  'id',
  'name',
  'type',
  'tier',
  'bodyPart',
  'target',
  'equipment',
  'reason',
  'gifUrl',
];

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
const rows = data
  .map((ex) => ({
    importance: String(ex.importance ?? ''),
    include: ex.include ? 'Y' : '',
    id: ex.id ?? '',
    name: ex.name ?? '',
    type: ex.type ?? '',
    tier: ex.tier ?? '',
    bodyPart: ex.bodyPart ?? '',
    target: ex.target ?? '',
    equipment: ex.equipment ?? '',
    reason: ex.reason ?? '',
    gifUrl: ex.gifUrl ?? '',
  }))
  .sort((a, b) => Number(b.importance) - Number(a.importance) || a.name.localeCompare(b.name));

writeCSV(OUT, HEADERS, rows);
console.log(`✅ ${rows.length}건 → ${OUT}`);
console.log(`   include=Y: ${rows.filter((r) => r.include === 'Y').length}건`);
