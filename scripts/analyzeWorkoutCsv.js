/**
 * workout_data.csv 분석 스크립트
 * 실행: node scripts/analyzeWorkoutCsv.js
 */
const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

const csvPath = path.join(__dirname, '../src/data/workout_data.csv');
const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.trim().split('\n');
const header = parseCSVLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const exercises = new Set();
const sessions = new Map();

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  const session = row[idx.title];
  const ex = row[idx.exercise_title];
  exercises.add(ex);
  if (!sessions.has(session)) sessions.set(session, new Set());
  sessions.get(session).add(ex);
}

const exFile = fs.readFileSync(path.join(__dirname, '../constants/exercises.ts'), 'utf8');
const appExercises = [...exFile.matchAll(/nameEn: '([^']+)'/g)].map((m) => m[1]);

const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function findMatch(csvName) {
  const n = normalize(csvName);
  for (const app of appExercises) {
    const a = normalize(app);
    const nCore = n.replace(/\s/g, '');
    const aCore = a.replace(/\s/g, '');
    if (nCore === aCore) return { type: 'exact', app };
    if (nCore.includes(aCore) || aCore.includes(nCore)) return { type: 'partial', app };
  }
  return null;
}

const catalog = [];
const variants = [];
const custom = [];

for (const ex of [...exercises].sort()) {
  const m = findMatch(ex);
  if (!m) custom.push(ex);
  else if (m.type === 'exact') catalog.push({ csv: ex, app: m.app });
  else variants.push({ csv: ex, app: m.app });
}

console.log('=== workout_data.csv 분석 ===');
console.log('총 세트 행:', lines.length - 1);
console.log('고유 운동:', exercises.size);
console.log('앱 카탈로그:', appExercises.length);
console.log('세션(루틴) 수:', sessions.size);
console.log('\n[카탈로그 일치]', catalog.length);
catalog.forEach((x) => console.log(' ✓', x.csv));
console.log('\n[변형/기구 suffix — 카탈로그 확장 후보]', variants.length);
variants.forEach((x) => console.log(' ~', x.csv, '→', x.app));
console.log('\n[커스텀 — 앱 MY EXERCISES로 추가]', custom.length);
custom.forEach((x) => console.log(' ★', x));

console.log('\n[세션 = 루틴/워크아웃 그룹]');
for (const [s, exs] of sessions) {
  console.log(` • ${s} (${exs.size} exercises)`);
}

console.log('\n--- CSV → 앱 매핑 ---');
console.log('title → WorkoutRoutine.name (장소별 루틴)');
console.log('exercise_title → ExerciseDef.nameEn 또는 CustomExercise.name');
console.log('weight_lbs / reps → SetData');
console.log('start_time / end_time → WorkoutSession.startedAt / endedAt');
