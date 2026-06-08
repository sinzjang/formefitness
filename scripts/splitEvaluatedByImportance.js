#!/usr/bin/env node
/**
 * exercises_evaluated.json → importance 5~1 별 5개 파일 분리
 *
 * 출력 (JSON + CSV):
 *   src/data/evaluated_by_importance/importance_5_essential.*
 *   src/data/evaluated_by_importance/importance_4_common.*
 *   ...
 *
 * 실행: npm run exercisedb:split-importance
 */
const fs = require('fs');
const path = require('path');
const { writeCSV } = require('./lib/csvUtils');

const ROOT = path.join(__dirname, '..');
const IN = path.join(ROOT, 'src/data/exercises_evaluated.json');
const OUT_DIR = path.join(ROOT, 'src/data/evaluated_by_importance');

const TIERS = [
  { score: 5, slug: 'essential', labelKo: '필수' },
  { score: 4, slug: 'common', labelKo: '흔함' },
  { score: 3, slug: 'useful', labelKo: '유용' },
  { score: 2, slug: 'variation', labelKo: '변형' },
  { score: 1, slug: 'exclude', labelKo: '제외' },
];

const CSV_HEADERS = [
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
if (!Array.isArray(data)) {
  console.error('exercises_evaluated.json 형식 오류');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const sortByName = (a, b) => String(a.name).localeCompare(String(b.name));

for (const tier of TIERS) {
  const items = data
    .filter((ex) => Number(ex.importance) === tier.score)
    .sort(sortByName);

  const base = `importance_${tier.score}_${tier.slug}`;
  const jsonPath = path.join(OUT_DIR, `${base}.json`);
  const csvPath = path.join(OUT_DIR, `${base}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8');

  const csvRows = items.map((ex) => ({
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
  }));
  writeCSV(csvPath, CSV_HEADERS, csvRows);

  const included = items.filter((ex) => ex.include).length;
  console.log(
    `✅ importance ${tier.score} (${tier.labelKo}): ${items.length}건 — ${base}.json / .csv (include ${included})`
  );
}

// 목록 인덱스
const index = {
  generatedAt: new Date().toISOString(),
  source: 'src/data/exercises_evaluated.json',
  total: data.length,
  tiers: TIERS.map((t) => ({
    importance: t.score,
    label: t.labelKo,
    slug: t.slug,
    count: data.filter((ex) => Number(ex.importance) === t.score).length,
    files: {
      json: `importance_${t.score}_${t.slug}.json`,
      csv: `importance_${t.score}_${t.slug}.csv`,
    },
  })),
};
fs.writeFileSync(path.join(OUT_DIR, 'README.json'), JSON.stringify(index, null, 2), 'utf8');
console.log(`\n📋 인덱스: ${OUT_DIR}/README.json`);
