#!/usr/bin/env node
/**
 * exercises_essential_80.json → forme_exercise_catalog.json + exerciseDbCatalogIds.ts
 * 실행: npm run exercisedb:catalog:essential
 */
const fs = require('fs');
const path = require('path');
const { toFormeExercise } = require('./lib/exerciseDbToForme');

const ROOT = path.join(__dirname, '..');
const IN = path.join(ROOT, 'src/data/exercises_essential_80.json');
const OUT_CATALOG = path.join(ROOT, 'src/data/forme_exercise_catalog.json');
const OUT_IDS = path.join(ROOT, 'constants/exerciseDbCatalogIds.ts');

function buildIdsTs(map) {
  return `// AUTO-GENERATED — npm run exercisedb:catalog:essential
// 소스: src/data/exercises_essential_80.json
export const FORMÉ_EXERCISE_DB_IDS: Record<string, string> = ${JSON.stringify(map, null, 2)};

export function getCatalogExerciseDbId(nameEn: string): string | undefined {
  return FORMÉ_EXERCISE_DB_IDS[nameEn.trim()];
}
`;
}

(() => {
  if (!fs.existsSync(IN)) {
    console.error(`❌ ${IN} 없음`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(IN, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('JSON 배열 형식이 아닙니다');
    process.exit(1);
  }

  const catalog = raw
    .filter((r) => r?.id && r?.name)
    .map(toFormeExercise)
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  const byGroup = {};
  for (const ex of catalog) {
    byGroup[ex.muscleGroup] = (byGroup[ex.muscleGroup] ?? 0) + 1;
  }

  fs.writeFileSync(OUT_CATALOG, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`✅ 카탈로그 ${catalog.length}건 → ${OUT_CATALOG}`);
  console.log('   부위별:', byGroup);

  const idMap = {};
  for (const ex of catalog) {
    idMap[ex.nameEn] = ex.exerciseDbId;
  }
  fs.writeFileSync(OUT_IDS, buildIdsTs(idMap), 'utf8');
  console.log(`✅ ID 맵 → ${OUT_IDS}`);
})();
