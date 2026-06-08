#!/usr/bin/env node
/**
 * Forme 34종 ↔ ExerciseDB 매핑 CSV 생성/갱신
 *
 * exercisedb_rapid.csv 로컬 검색 → forme_exercise_db_map.csv
 * verified=y 열은 자동 덮어쓰지 않음 (수동 확정값 보호)
 *
 * 실행: node scripts/buildFormeExerciseMap.js
 */
const fs = require('fs');
const path = require('path');
const { readCSV, writeCSV } = require('./lib/csvUtils');
const { FORMÉ_CATALOG } = require('./lib/formeExercises');
const { pickBestMatch } = require('./lib/exerciseMatch');

const DATA_DIR = path.join(__dirname, 'data');
const RAPID_CSV = path.join(DATA_DIR, 'exercisedb_rapid.csv');
const MAP_CSV = path.join(DATA_DIR, 'forme_exercise_db_map.csv');

const MAP_HEADERS = [
  'name_ko',
  'name_en',
  'muscle_group',
  'gear',
  'search_hint',
  'exercise_db_id',
  'exercise_db_name',
  'verified',
  'notes',
];

function loadExistingMap() {
  if (!fs.existsSync(MAP_CSV)) return new Map();
  const { rows } = readCSV(MAP_CSV);
  return new Map(rows.map((r) => [r.name_en.trim(), r]));
}

(async () => {
  if (!fs.existsSync(RAPID_CSV)) {
    console.error(`❌ ${RAPID_CSV} 없음 — 먼저 node scripts/exportExerciseDbCsv.js 실행`);
    process.exit(1);
  }

  const { rows: catalog } = readCSV(RAPID_CSV);
  const catalogForMatch = catalog.map((r) => ({
    id: r.id,
    name: r.name,
    bodyPart: r.bodyPart,
    equipment: r.equipment,
  }));

  console.log(`카탈로그 ${catalogForMatch.length}건 로드`);

  const existing = loadExistingMap();
  const outRows = [];
  let matched = 0;
  let skipped = 0;

  for (const ex of FORMÉ_CATALOG) {
    const prev = existing.get(ex.nameEn);
    const verified = (prev?.verified ?? '').toLowerCase() === 'y';

    if (verified && prev?.exercise_db_id) {
      outRows.push({
        name_ko: ex.nameKo,
        name_en: ex.nameEn,
        muscle_group: ex.muscleGroup,
        gear: ex.gear,
        search_hint: prev.search_hint || ex.searchHint,
        exercise_db_id: prev.exercise_db_id,
        exercise_db_name: prev.exercise_db_name ?? '',
        verified: 'y',
        notes: prev.notes ?? '수동 확정',
      });
      skipped++;
      console.log(`  ✓ ${ex.nameEn} — verified 유지 (${prev.exercise_db_id})`);
      continue;
    }

    const hint = prev?.search_hint?.trim() || ex.searchHint;
    const best = pickBestMatch(ex.nameEn, hint, catalogForMatch);

    if (best?.id) {
      matched++;
      outRows.push({
        name_ko: ex.nameKo,
        name_en: ex.nameEn,
        muscle_group: ex.muscleGroup,
        gear: ex.gear,
        search_hint: hint,
        exercise_db_id: best.id,
        exercise_db_name: best.name,
        verified: '',
        notes: prev?.notes ?? 'auto-match — 엑셀에서 확인 후 verified=y',
      });
      console.log(`  → ${ex.nameEn} = ${best.id} (${best.name})`);
    } else {
      outRows.push({
        name_ko: ex.nameKo,
        name_en: ex.nameEn,
        muscle_group: ex.muscleGroup,
        gear: ex.gear,
        search_hint: hint,
        exercise_db_id: prev?.exercise_db_id ?? '',
        exercise_db_name: prev?.exercise_db_name ?? '',
        verified: '',
        notes: '매칭 실패 — search_hint 수정 후 재실행',
      });
      console.log(`  ✗ ${ex.nameEn} — 매칭 실패`);
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  writeCSV(MAP_CSV, MAP_HEADERS, outRows);
  console.log(`\n✅ ${MAP_CSV}`);
  console.log(`   자동 매칭 ${matched}건, verified 유지 ${skipped}건`);
  console.log('\n다음: node scripts/generateExerciseCatalogIds.js');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
