#!/usr/bin/env node
/**
 * ExerciseDB 전체 카탈로그 → CSV export
 *
 * RapidAPI (Justin) — GIF용 numeric id (앱 런타임에 사용)
 * OSS — 참고용 (이름/instructions, id는 RapidAPI와 다름)
 *
 * 실행:
 *   node scripts/exportExerciseDbCsv.js           # Rapid + OSS
 *   node scripts/exportExerciseDbCsv.js --rapid   # Rapid만
 *   node scripts/exportExerciseDbCsv.js --oss     # OSS만
 */
const fs = require('fs');
const path = require('path');
const { writeCSV } = require('./lib/csvUtils');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const RAPID_CSV = path.join(DATA_DIR, 'exercisedb_rapid.csv');
const OSS_CSV = path.join(DATA_DIR, 'exercisedb_oss.csv');

const RAPID_HEADERS = [
  'id',
  'name',
  'bodyPart',
  'target',
  'equipment',
  'secondaryMuscles',
  'category',
  'difficulty',
];

const OSS_HEADERS = [
  'exerciseId',
  'name',
  'bodyParts',
  'targetMuscles',
  'equipments',
  'secondaryMuscles',
  'gifUrl',
];

const BODY_PARTS = [
  'chest',
  'back',
  'shoulders',
  'upper arms',
  'lower arms',
  'upper legs',
  'lower legs',
  'waist',
  'cardio',
  'neck',
];

function loadRapidApiKey() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return '';
  const env = fs.readFileSync(envPath, 'utf8');
  return env.match(/EXPO_PUBLIC_RAPIDAPI_KEY=(.+)/)?.[1]?.trim() ?? '';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, init, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function exportRapid(key) {
  if (!key) {
    console.error('⚠️  EXPO_PUBLIC_RAPIDAPI_KEY 없음 — Rapid export 건너뜀');
    return false;
  }

  const headers = {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
  };

  let all = [];
  for (const part of BODY_PARTS) {
    process.stdout.write(`RapidAPI bodyPart/${part} ... `);
    const url = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(part)}`;
    const { ok, status, json } = await fetchJson(url, { headers }, 60000);
    if (!ok || !Array.isArray(json)) {
      console.log(`실패 (HTTP ${status})`);
      continue;
    }
    all = all.concat(json);
    console.log(`${json.length}건`);
    await sleep(250);
  }

  if (all.length === 0) {
    console.error('RapidAPI 데이터 없음 — GitHub 시드 fallback 시도');
    return false;
  }

  // id 기준 중복 제거
  const byId = new Map();
  for (const item of all) {
    if (item?.id) byId.set(String(item.id), item);
  }

  const rows = [...byId.values()]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      bodyPart: String(item.bodyPart ?? ''),
      target: String(item.target ?? ''),
      equipment: String(item.equipment ?? ''),
      secondaryMuscles: Array.isArray(item.secondaryMuscles)
        ? item.secondaryMuscles.join('; ')
        : '',
      category: String(item.category ?? ''),
      difficulty: String(item.difficulty ?? ''),
    }));

  writeCSV(RAPID_CSV, RAPID_HEADERS, rows);
  console.log(`✅ Rapid CSV: ${rows.length}건 → ${RAPID_CSV}`);
  return true;
}

async function exportOss() {
  let all = [];
  let offset = 0;
  const limit = 100;
  let page = 0;

  while (page < 30) {
    process.stdout.write(`OSS offset=${offset} ... `);
    const url = `https://oss.exercisedb.dev/api/v1/exercises?offset=${offset}&limit=${limit}`;
    const { ok, status, json } = await fetchJson(url, {}, 60000);

    if (!ok || !json?.data || !Array.isArray(json.data)) {
      // offset 미지원 시 단일 요청 fallback
      if (page === 0) {
        const fallback = await fetchJson(
          'https://oss.exercisedb.dev/api/v1/exercises?limit=2000',
          {},
          90000
        );
        if (fallback.ok && Array.isArray(fallback.json?.data)) {
          all = fallback.json.data;
          console.log(`${all.length}건 (single fetch)`);
          break;
        }
      }
      console.log(`실패 (HTTP ${status})`);
      break;
    }

    all = all.concat(json.data);
    console.log(`${json.data.length}건`);
    if (json.data.length < limit) break;
    offset += limit;
    page++;
    await sleep(150);
  }

  if (all.length === 0) {
    console.error('OSS 데이터 없음');
    return false;
  }

  const byId = new Map();
  for (const item of all) {
    if (item?.exerciseId) byId.set(String(item.exerciseId), item);
  }

  const rows = [...byId.values()]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((item) => ({
      exerciseId: String(item.exerciseId ?? ''),
      name: String(item.name ?? ''),
      bodyParts: Array.isArray(item.bodyParts) ? item.bodyParts.join('; ') : '',
      targetMuscles: Array.isArray(item.targetMuscles) ? item.targetMuscles.join('; ') : '',
      equipments: Array.isArray(item.equipments) ? item.equipments.join('; ') : '',
      secondaryMuscles: Array.isArray(item.secondaryMuscles)
        ? item.secondaryMuscles.join('; ')
        : '',
      gifUrl: String(item.gifUrl ?? ''),
    }));

  writeCSV(OSS_CSV, OSS_HEADERS, rows);
  console.log(`✅ OSS CSV: ${rows.length}건 → ${OSS_CSV}`);
  return true;
}

(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const rapidOnly = args.includes('--rapid');
  const ossOnly = args.includes('--oss');
  const both = !rapidOnly && !ossOnly;

  let ok = false;
  if (both || rapidOnly) ok = (await exportRapid(loadRapidApiKey())) || ok;
  if (both || ossOnly) ok = (await exportOss()) || ok;

  if (!ok && (both || rapidOnly)) {
    console.log('\n→ node scripts/fetchExerciseDbSeed.js 실행');
    const { spawnSync } = require('child_process');
    const seed = spawnSync('node', [path.join(__dirname, 'fetchExerciseDbSeed.js')], {
      stdio: 'inherit',
    });
    ok = seed.status === 0;
  }

  if (!ok) {
    console.error('\nexport 실패 — 네트워크 또는 API 키 확인 후 재시도');
    process.exit(1);
  }

  console.log('\n다음: node scripts/buildFormeExerciseMap.js');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
