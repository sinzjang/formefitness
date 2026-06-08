#!/usr/bin/env node
/**
 * ExerciseDB 전체 운동 **메타데이터** export (GIF 파일 다운로드 없음)
 *
 * 출력:
 *   src/data/exercisedb_full.json      — 전체 JSON (instructions 포함)
 *   src/data/exercisedb_metadata.csv   — 엑셀/비교용 CSV
 *
 * GIF는 URL만 저장. 실제 이미지는 앱에서 id/URL로 on-demand 로드.
 *
 * 실행:
 *   npm run exercisedb:fetch              # GitHub 공개 데이터셋 (기본, API 키 불필요)
 *   npm run exercisedb:fetch -- --rapid   # RapidAPI Justin (EXPO_PUBLIC_RAPIDAPI_KEY 필요)
 *   npm run exercisedb:fetch -- --oss     # OSS API (id 형식 다름, 참고용)
 *   npm run exercisedb:fetch -- --force   # 기존 파일 덮어쓰기
 */
const fs = require('fs');
const path = require('path');
const { writeCSV } = require('./lib/csvUtils');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'data');
const OUT_JSON = path.join(OUT_DIR, 'exercisedb_full.json');
const OUT_CSV = path.join(OUT_DIR, 'exercisedb_metadata.csv');
const CACHE_JSON = path.join(__dirname, 'data', 'exercises_raw.json');

const GITHUB_URL =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';

const CSV_HEADERS = [
  'id',
  'name',
  'bodyPart',
  'target',
  'equipment',
  'secondaryMuscles',
  'category',
  'difficulty',
  'instructions_en',
  'gifUrl',
  'source',
];

const RAPID_BODY_PARTS = [
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

function loadEnvKey() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return '';
  const env = fs.readFileSync(envPath, 'utf8');
  return env.match(/EXPO_PUBLIC_RAPIDAPI_KEY=(.+)/)?.[1]?.trim() ?? '';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function padId(id) {
  const s = String(id ?? '').trim();
  if (/^\d+$/.test(s)) return s.padStart(4, '0');
  return s;
}

function pickInstructions(item) {
  if (Array.isArray(item.instruction_steps?.en) && item.instruction_steps.en.length) {
    return item.instruction_steps.en.map(String);
  }
  if (item.instructions?.en) {
    const text = String(item.instructions.en);
    return text.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(item.instructions)) {
    return item.instructions.map(String);
  }
  return [];
}

function joinSteps(steps) {
  return steps.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ');
}

/** GitHub 공개 JSON → Forme 공통 스키마 */
function normalizeGithubItem(item) {
  const steps = pickInstructions(item);
  const gifPath = item.gif_url ?? item.gifUrl ?? '';
  const gifUrl = gifPath.startsWith('http')
    ? gifPath
    : gifPath
      ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${gifPath.replace(/^\//, '')}`
      : '';

  return {
    id: padId(item.id),
    name: String(item.name ?? ''),
    bodyPart: String(item.body_part ?? item.category ?? ''),
    target: String(item.target ?? item.muscle_group ?? ''),
    equipment: String(item.equipment ?? ''),
    secondaryMuscles: Array.isArray(item.secondary_muscles)
      ? item.secondary_muscles.map(String)
      : [],
    category: String(item.category ?? ''),
    difficulty: String(item.difficulty ?? ''),
    instructions: steps,
    gifUrl,
    source: 'github',
  };
}

/** RapidAPI Justin → Forme 공통 스키마 */
function normalizeRapidItem(item) {
  return {
    id: padId(item.id),
    name: String(item.name ?? ''),
    bodyPart: String(item.bodyPart ?? ''),
    target: String(item.target ?? ''),
    equipment: String(item.equipment ?? ''),
    secondaryMuscles: Array.isArray(item.secondaryMuscles)
      ? item.secondaryMuscles.map(String)
      : [],
    category: String(item.category ?? ''),
    difficulty: String(item.difficulty ?? ''),
    instructions: Array.isArray(item.instructions) ? item.instructions.map(String) : [],
    gifUrl: '', // RapidAPI는 /image 엔드포인트로 on-demand
    source: 'rapidapi',
  };
}

/** OSS → Forme 공통 스키마 (id 형식 상이 — 참고용) */
function normalizeOssItem(item) {
  return {
    id: String(item.exerciseId ?? ''),
    name: String(item.name ?? ''),
    bodyPart: Array.isArray(item.bodyParts) ? item.bodyParts[0] ?? '' : '',
    target: Array.isArray(item.targetMuscles) ? item.targetMuscles[0] ?? '' : '',
    equipment: Array.isArray(item.equipments) ? item.equipments[0] ?? '' : '',
    secondaryMuscles: Array.isArray(item.secondaryMuscles)
      ? item.secondaryMuscles.map(String)
      : [],
    category: '',
    difficulty: '',
    instructions: Array.isArray(item.instructions) ? item.instructions.map(String) : [],
    gifUrl: String(item.gifUrl ?? ''),
    source: 'oss',
  };
}

function toCsvRow(record) {
  return {
    id: record.id,
    name: record.name,
    bodyPart: record.bodyPart,
    target: record.target,
    equipment: record.equipment,
    secondaryMuscles: record.secondaryMuscles.join('; '),
    category: record.category,
    difficulty: record.difficulty,
    instructions_en: joinSteps(record.instructions),
    gifUrl: record.gifUrl,
    source: record.source,
  };
}

async function downloadToFile(url, dest, timeoutMs = 180000) {
  console.log(`다운로드: ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`저장: ${dest} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
  return JSON.parse(buf.toString('utf8'));
}

async function fetchGithub(force) {
  if (!force && fs.existsSync(CACHE_JSON)) {
    try {
      const json = JSON.parse(fs.readFileSync(CACHE_JSON, 'utf8'));
      if (Array.isArray(json) && json.length > 500) {
        console.log(`캐시 사용: ${CACHE_JSON} (${json.length}건)`);
        return json.map(normalizeGithubItem);
      }
    } catch {
      // 재다운로드
    }
  }

  const raw = await downloadToFile(GITHUB_URL, CACHE_JSON);
  if (!Array.isArray(raw)) throw new Error('GitHub JSON이 배열이 아님');
  console.log(`GitHub ${raw.length}건 파싱`);
  return raw.map(normalizeGithubItem);
}

async function fetchRapid(key) {
  if (!key) throw new Error('EXPO_PUBLIC_RAPIDAPI_KEY 없음');

  const headers = {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
  };

  let all = [];
  for (const part of RAPID_BODY_PARTS) {
    process.stdout.write(`RapidAPI /bodyPart/${part} ... `);
    const url = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(part)}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
    const json = await res.json();
    if (!Array.isArray(json)) {
      console.log('실패');
      continue;
    }
    all = all.concat(json);
    console.log(`${json.length}건`);
    await sleep(300);
  }

  const byId = new Map();
  for (const item of all) {
    if (item?.id) byId.set(padId(item.id), normalizeRapidItem(item));
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchOss() {
  let all = [];
  const res = await fetch('https://oss.exercisedb.dev/api/v1/exercises?limit=2000', {
    signal: AbortSignal.timeout(120000),
  });
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error('OSS 응답 형식 오류');
  all = json.data.map(normalizeOssItem);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

function writeOutputs(records) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.writeFileSync(OUT_JSON, JSON.stringify(records, null, 2), 'utf8');
  console.log(`✅ JSON ${records.length}건 → ${OUT_JSON}`);

  const csvRows = records.map(toCsvRow).sort((a, b) => a.id.localeCompare(b.id));
  writeCSV(OUT_CSV, CSV_HEADERS, csvRows);
  console.log(`✅ CSV  ${records.length}건 → ${OUT_CSV}`);

  const withInstructions = records.filter((r) => r.instructions.length > 0).length;
  const withGifUrl = records.filter((r) => r.gifUrl).length;
  console.log(`\n요약: instructions ${withInstructions}건, gifUrl ${withGifUrl}건 (URL만, 파일 미다운로드)`);
}

(async () => {
  const args = process.argv.slice(2);
  const useRapid = args.includes('--rapid');
  const useOss = args.includes('--oss');
  const force = args.includes('--force');
  const source = useRapid ? 'rapidapi' : useOss ? 'oss' : 'github';

  if (!force && fs.existsSync(OUT_JSON) && fs.existsSync(OUT_CSV)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
      if (Array.isArray(existing) && existing.length > 500) {
        console.log(`이미 존재: ${OUT_JSON} (${existing.length}건)`);
        console.log('덮어쓰려면 --force 추가');
        return;
      }
    } catch {
      // continue
    }
  }

  let records;
  if (useRapid) {
    records = await fetchRapid(loadEnvKey());
  } else if (useOss) {
    records = await fetchOss();
  } else {
    records = await fetchGithub(force);
  }

  if (records.length === 0) {
    console.error('데이터 0건 — source/네트워크 확인');
    process.exit(1);
  }

  writeOutputs(records);
  console.log(`\n출처: ${source}`);
  console.log('다음: src/data/exercisedb_metadata.csv 를 엑셀에서 열어 Forme 카탈로그 설계');
})().catch((e) => {
  console.error('실패:', e.message ?? e);
  process.exit(1);
});
