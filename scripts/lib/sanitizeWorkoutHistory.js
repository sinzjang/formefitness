/**
 * Node import 스크립트용 히스토리 정규화 (앱 lib/workoutHistoryIntegrity.ts 와 동일 원칙)
 * 카탈로그 매핑 없이 스냅샷만 저장
 */
const MUSCLE_GROUPS = new Set(['chest', 'shoulder', 'back', 'arms', 'core', 'legs']);
const RESISTANCE_TYPES = new Set(['weight', 'band', 'bodyweight']);

function asString(v, fallback = '') {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return fallback;
}

function asNumber(v, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeName(raw, seed = 'Exercise') {
  if (typeof raw === 'string') return { ko: raw.trim() || seed, en: raw.trim() || seed };
  if (raw && typeof raw === 'object') {
    const ko = asString(raw.ko ?? raw.name ?? raw.name_ko, '');
    const en = asString(raw.en ?? raw.nameEn ?? raw.name_en, '');
    return { ko: ko || en || seed, en: en || ko || seed };
  }
  return { ko: seed, en: seed };
}

function deriveKey(name, customId, existingKey) {
  if (existingKey?.trim()) return existingKey.trim();
  if (customId?.trim()) return `custom:${customId.trim()}`;
  if (name.ko) return name.ko;
  if (name.en) return `hist:${name.en.toLowerCase()}`;
  return 'hist:unknown';
}

function normalizeMuscleGroup(raw) {
  const mg = asString(raw, '');
  return MUSCLE_GROUPS.has(mg) ? mg : 'chest';
}

function normalizeResistance(raw) {
  const rt = asString(raw, '');
  return RESISTANCE_TYPES.has(rt) ? rt : 'weight';
}

function sanitizeSet(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const reps = Math.max(0, Math.round(asNumber(raw.reps, 0)));
  if (reps <= 0 && !raw.completed) return null;
  const set = {
    setNumber: Math.max(1, Math.round(asNumber(raw.setNumber, index + 1))),
    reps,
    completed: Boolean(raw.completed ?? reps > 0),
  };
  const w = asNumber(raw.weightLb, NaN);
  if (Number.isFinite(w) && w >= 0) set.weightLb = w;
  const bw = asNumber(raw.bwAddedLb, NaN);
  if (Number.isFinite(bw) && bw >= 0) set.bwAddedLb = bw;
  return set;
}

function sanitizeExercise(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const name = normalizeName(raw.exerciseName ?? raw.name);
  const sets = (Array.isArray(raw.sets) ? raw.sets : [])
    .map((s, i) => sanitizeSet(s, i))
    .filter(Boolean);
  if (sets.length === 0) return null;
  return {
    exerciseKey: deriveKey(name, asString(raw.customId, ''), asString(raw.exerciseKey, '')),
    exerciseName: name,
    muscleGroup: normalizeMuscleGroup(raw.muscleGroup),
    resistanceType: normalizeResistance(raw.resistanceType),
    sets,
  };
}

function sanitizeSession(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const exercises = (Array.isArray(raw.exercises) ? raw.exercises : [])
    .map((ex, i) => sanitizeExercise(ex, i))
    .filter(Boolean);
  if (exercises.length === 0) return null;
  const endedAt = asString(raw.endedAt ?? raw.ended_at, '');
  const ended = endedAt && !Number.isNaN(new Date(endedAt).getTime())
    ? new Date(endedAt).toISOString()
    : new Date().toISOString();
  const id = asString(raw.id ?? raw.client_id, '') ||
    `session_${Date.now()}_${index}`;
  const startedRaw = asString(raw.startedAt ?? raw.started_at, '');
  let startedAt = startedRaw && !Number.isNaN(new Date(startedRaw).getTime())
    ? new Date(startedRaw).toISOString()
    : ended;
  if (new Date(startedAt).getTime() > new Date(ended).getTime()) startedAt = ended;
  const routineId = asString(raw.routineId ?? raw.routine_id, '') || undefined;
  const locationId = asString(raw.locationId ?? raw.location_id, '') || undefined;
  return { id, startedAt, endedAt: ended, exercises, routineId, locationId };
}

function sanitizeSessions(sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  const out = list.map((s, i) => sanitizeSession(s, i)).filter(Boolean);
  return { in: list.length, out: out.length, sessions: out };
}

module.exports = { sanitizeSessions };
