#!/usr/bin/env node
/**
 * exercisedb_full.json → Forme 운동 카탈로그 생성
 *
 * 출력:
 *   src/data/forme_exercise_catalog.json   — 앱 카탈로그 (ExerciseDef[])
 *   constants/exerciseDbCatalogIds.ts        — nameEn → id (GIF fallback)
 *
 * 실행: npm run exercisedb:catalog
 */
const fs = require('fs');
const path = require('path');
const { toFormeExercise } = require('./lib/exerciseDbToForme');

const ROOT = path.join(__dirname, '..');
const SRC_JSON = path.join(ROOT, 'src/data/exercisedb_full.json');
const OUT_CATALOG = path.join(ROOT, 'src/data/forme_exercise_catalog.json');
const OUT_IDS = path.join(ROOT, 'constants/exerciseDbCatalogIds.ts');
const LEGACY = path.join(ROOT, 'constants/exercises.legacy.ts');

function buildIdsTs(map) {
  return `// AUTO-GENERATED — npm run exercisedb:catalog
// forme_exercise_catalog.json 기준 nameEn → exerciseDbId
export const FORMÉ_EXERCISE_DB_IDS: Record<string, string> = ${JSON.stringify(map, null, 2)};

export function getCatalogExerciseDbId(nameEn: string): string | undefined {
  return FORMÉ_EXERCISE_DB_IDS[nameEn.trim()];
}
`;
}

(() => {
  if (!fs.existsSync(SRC_JSON)) {
    console.error(`❌ ${SRC_JSON} 없음 — 먼저 npm run exercisedb:fetch`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(SRC_JSON, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('exercisedb_full.json 형식 오류');
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
  console.log(`✅ ID 맵 ${Object.keys(idMap).length}건 → ${OUT_IDS}`);

  // 기존 exercises.ts 백업 (최초 1회)
  const exercisesPath = path.join(ROOT, 'constants/exercises.ts');
  if (!fs.existsSync(LEGACY) && fs.readFileSync(exercisesPath, 'utf8').includes('벤치프레스')) {
    fs.copyFileSync(exercisesPath, LEGACY);
    console.log(`📦 기존 34종 백업 → ${LEGACY}`);
  }
})();
