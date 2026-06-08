#!/usr/bin/env node
/**
 * exercisedb_full.json → 엑셀 솎아내기용 CSV
 *
 * 출력: src/data/exercisedb_curate.csv
 *   - 맨 앞 열: priority, include, name_ko, notes (직접 입력)
 *   - Forme 매핑 열: forme_muscle_group, forme_gear
 *
 * 실행: npm run exercisedb:csv
 */
const fs = require('fs');
const path = require('path');
const { writeCSV } = require('./lib/csvUtils');
const { mapBodyPart, mapGear } = require('./lib/exerciseDbToForme');

const ROOT = path.join(__dirname, '..');
const IN_JSON = path.join(ROOT, 'src/data/exercisedb_full.json');
const OUT_CSV = path.join(ROOT, 'src/data/exercisedb_curate.csv');
const OUT_METADATA = path.join(ROOT, 'src/data/exercisedb_metadata.csv');

const HEADERS = [
  'priority',
  'include',
  'id',
  'name',
  'name_ko',
  'bodyPart',
  'forme_muscle_group',
  'target',
  'equipment',
  'forme_gear',
  'secondaryMuscles',
  'category',
  'difficulty',
  'instruction_count',
  'instructions_en',
  'gifUrl',
  'notes',
];

function joinSteps(steps) {
  return (steps ?? [])
    .map((s) => String(s).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' | ');
}

function isLikelyStretch(name) {
  const n = name.toLowerCase();
  return /stretch|mobility|flexion|rotation|circles|hold/.test(n);
}

function isLikelyCardio(name, bodyPart) {
  return bodyPart === 'cardio' || /run|bike|elliptical|jump rope|burpee|sprint|walk/.test(name.toLowerCase());
}

function suggestPriority(record) {
  const name = String(record.name ?? '');
  const bodyPart = String(record.bodyPart ?? '');
  if (isLikelyCardio(name, bodyPart)) return '9';
  if (isLikelyStretch(name)) return '8';
  if (bodyPart === 'neck') return '7';
  if (record.equipment === 'assisted') return '6';
  return '';
}

function toRow(record, existing) {
  const id = String(record.id ?? '').padStart(4, '0');
  const prev = existing.get(id);
  const steps = Array.isArray(record.instructions) ? record.instructions : [];

  return {
    priority: prev?.priority ?? suggestPriority(record),
    include: prev?.include ?? '',
    id,
    name: String(record.name ?? ''),
    name_ko: prev?.name_ko ?? '',
    bodyPart: String(record.bodyPart ?? ''),
    forme_muscle_group: mapBodyPart(record.bodyPart),
    target: String(record.target ?? ''),
    equipment: String(record.equipment ?? ''),
    forme_gear: mapGear(record.equipment),
    secondaryMuscles: (record.secondaryMuscles ?? []).join('; '),
    category: String(record.category ?? ''),
    difficulty: String(record.difficulty ?? ''),
    instruction_count: String(steps.length),
    instructions_en: joinSteps(steps),
    gifUrl: String(record.gifUrl ?? ''),
    notes: prev?.notes ?? '',
  };
}

function loadExistingCurate() {
  if (!fs.existsSync(OUT_CSV)) return new Map();
  const { readCSV } = require('./lib/csvUtils');
  const { rows } = readCSV(OUT_CSV);
  return new Map(rows.map((r) => [r.id?.padStart(4, '0'), r]));
}

(() => {
  if (!fs.existsSync(IN_JSON)) {
    console.error(`❌ ${IN_JSON} 없음 — npm run exercisedb:fetch 먼저 실행`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(IN_JSON, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('JSON 배열 형식이 아닙니다');
    process.exit(1);
  }

  const existing = loadExistingCurate();
  const rows = raw
    .filter((r) => r?.id && r?.name)
    .map((r) => toRow(r, existing))
    .sort((a, b) => {
      const pa = a.priority === '' ? 999 : Number(a.priority);
      const pb = b.priority === '' ? 999 : Number(b.priority);
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });

  writeCSV(OUT_CSV, HEADERS, rows);
  console.log(`✅ ${rows.length}건 → ${OUT_CSV}`);

  // 기존 metadata CSV도 함께 갱신 (instructions 제외 간략版)
  const metaHeaders = [
    'id',
    'name',
    'bodyPart',
    'target',
    'equipment',
    'secondaryMuscles',
    'category',
    'difficulty',
    'instruction_count',
    'gifUrl',
    'source',
  ];
  const metaRows = rows.map((r) => ({
    id: r.id,
    name: r.name,
    bodyPart: r.bodyPart,
    target: r.target,
    equipment: r.equipment,
    secondaryMuscles: r.secondaryMuscles,
    category: r.category,
    difficulty: r.difficulty,
    instruction_count: r.instruction_count,
    gifUrl: r.gifUrl,
    source: 'github',
  }));
  writeCSV(OUT_METADATA, metaHeaders, metaRows);
  console.log(`✅ ${metaRows.length}건 → ${OUT_METADATA}`);

  console.log('\n엑셀 사용법:');
  console.log('  priority — 숫자 작을수록 우선 (1=필수, 빈칸=미정)');
  console.log('  include  — Y 입력 시 Forme 카탈로그 후보');
  console.log('  name_ko  — 한글명 직접 입력');
})();
