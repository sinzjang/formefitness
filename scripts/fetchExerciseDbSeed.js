#!/usr/bin/env node
/**
 * ExerciseDB 공개 JSON → exercisedb_rapid.csv (Justin/RapidAPI id 형식 0001)
 * RapidAPI export 실패 시 오프라인 시드로 사용
 *
 * 실행: node scripts/fetchExerciseDbSeed.js
 */
const fs = require('fs');
const path = require('path');
const { writeCSV } = require('./lib/csvUtils');

const DATA_DIR = path.join(__dirname, 'data');
const RAPID_CSV = path.join(DATA_DIR, 'exercisedb_rapid.csv');
const SEED_JSON = path.join(DATA_DIR, 'exercises_seed.json');

const SEED_URL =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';

const HEADERS = [
  'id',
  'name',
  'bodyPart',
  'target',
  'equipment',
  'secondaryMuscles',
  'category',
  'difficulty',
];

async function loadJson() {
  if (fs.existsSync(SEED_JSON)) {
    console.log(`로컬 시드 사용: ${SEED_JSON}`);
    return JSON.parse(fs.readFileSync(SEED_JSON, 'utf8'));
  }

  console.log(`다운로드: ${SEED_URL}`);
  const res = await fetch(SEED_URL, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SEED_JSON, JSON.stringify(json), 'utf8');
  console.log(`저장: ${SEED_JSON}`);
  return json;
}

function toCsvRows(items) {
  return items
    .filter((item) => item?.id && item?.name)
    .map((item) => ({
      id: String(item.id).padStart(4, '0'),
      name: String(item.name),
      bodyPart: String(item.body_part ?? item.category ?? ''),
      target: String(item.target ?? item.muscle_group ?? ''),
      equipment: String(item.equipment ?? ''),
      secondaryMuscles: Array.isArray(item.secondary_muscles)
        ? item.secondary_muscles.join('; ')
        : '',
      category: String(item.category ?? ''),
      difficulty: String(item.difficulty ?? ''),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

(async () => {
  const json = await loadJson();
  if (!Array.isArray(json)) throw new Error('JSON 배열 아님');

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const rows = toCsvRows(json);
  writeCSV(RAPID_CSV, HEADERS, rows);
  console.log(`✅ ${rows.length}건 → ${RAPID_CSV}`);
  console.log('\n다음: node scripts/buildFormeExerciseMap.js');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
