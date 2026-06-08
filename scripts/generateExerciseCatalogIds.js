#!/usr/bin/env node
/**
 * forme_exercise_db_map.csv → constants/exerciseDbCatalogIds.ts 생성
 *
 * 실행: node scripts/generateExerciseCatalogIds.js
 */
const fs = require('fs');
const path = require('path');
const { readCSV } = require('./lib/csvUtils');

const ROOT = path.join(__dirname, '..');
const MAP_CSV = path.join(__dirname, 'data', 'forme_exercise_db_map.csv');
const OUT_TS = path.join(ROOT, 'constants', 'exerciseDbCatalogIds.ts');
const OUT_EXERCISES = path.join(ROOT, 'constants', 'exercises.ts');

function buildTs(map) {
  return `// AUTO-GENERATED — node scripts/generateExerciseCatalogIds.js
// 소스: scripts/data/forme_exercise_db_map.csv
export const FORMÉ_EXERCISE_DB_IDS: Record<string, string> = ${JSON.stringify(map, null, 2)};

export function getCatalogExerciseDbId(nameEn: string): string | undefined {
  return FORMÉ_EXERCISE_DB_IDS[nameEn.trim()];
}
`;
}

/** exercises.ts 각 항목에 exerciseDbId 필드 주입 (name.ko/nameEn 유지) */
function injectExerciseDbIds(map) {
  let src = fs.readFileSync(OUT_EXERCISES, 'utf8');

  if (!src.includes('exerciseDbId?: string')) {
    src = src.replace(
      '  customId?: string;\n}',
      '  customId?: string;\n  /** RapidAPI ExerciseDB id (GIF) — scripts/data/forme_exercise_db_map.csv */\n  exerciseDbId?: string;\n}'
    );
  }

  for (const [nameEn, id] of Object.entries(map)) {
    const re = new RegExp(
      `(nameEn: '${nameEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\n(?:[^}]*\\n)*?)(  \\},)`,
      'm'
    );
    if (!re.test(src)) {
      console.warn(`  ⚠ exercises.ts 에서 "${nameEn}" 못 찾음`);
      continue;
    }
    src = src.replace(re, (full, body, closing) => {
      if (/exerciseDbId:/.test(body)) {
        return full.replace(/exerciseDbId: '[^']*',?\n?/, `    exerciseDbId: '${id}',\n`);
      }
      return `${body}    exerciseDbId: '${id}',\n${closing}`;
    });
  }

  fs.writeFileSync(OUT_EXERCISES, src, 'utf8');
}

(() => {
  if (!fs.existsSync(MAP_CSV)) {
    console.error(`❌ ${MAP_CSV} 없음`);
    console.error('   1) node scripts/exportExerciseDbCsv.js');
    console.error('   2) node scripts/buildFormeExerciseMap.js');
    process.exit(1);
  }

  const { rows } = readCSV(MAP_CSV);
  const map = {};
  let missing = 0;

  for (const row of rows) {
    const nameEn = row.name_en?.trim();
    const id = row.exercise_db_id?.trim();
    if (!nameEn) continue;
    if (id) {
      map[nameEn] = id;
    } else {
      missing++;
      console.warn(`  ⚠ ID 없음: ${nameEn}`);
    }
  }

  if (Object.keys(map).length === 0) {
    console.error('매핑된 exercise_db_id 가 없습니다');
    process.exit(1);
  }

  fs.writeFileSync(OUT_TS, buildTs(map), 'utf8');
  console.log(`✅ ${OUT_TS} (${Object.keys(map).length}건)`);

  injectExerciseDbIds(map);
  console.log(`✅ ${OUT_EXERCISES} exerciseDbId 주입`);

  if (missing > 0) {
    console.log(`\n⚠ ${missing}건 ID 미매핑 — CSV에서 수정 후 재실행`);
  }
})();
