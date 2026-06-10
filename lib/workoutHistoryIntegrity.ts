// 운동 히스토리 무결성 — 주문(SKU+스냅샷)처럼 카탈로그와 분리
// import·동기화·표시 시 스냅샷을 정규화하고, 매핑 실패는 폴백만 사용 (크래시 없음)
import type {
  BandLevel,
  LocalizedText,
  MuscleGroup,
  ResistanceType,
  SavedExerciseRecord,
  SavedWorkoutSession,
  SetData,
} from '../types';
import type { WorkoutImportPayload } from '../types/workoutImport';
import { muscleColors } from '../constants/theme';

const MUSCLE_GROUPS = new Set<MuscleGroup>([
  'chest',
  'shoulder',
  'back',
  'arms',
  'core',
  'legs',
]);

const RESISTANCE_TYPES = new Set<ResistanceType>(['weight', 'band', 'bodyweight']);
const BAND_LEVELS = new Set<BandLevel>(['Light', 'Medium', 'Heavy', 'X-Heavy']);

export interface IntegrityIssue {
  path: string;
  message: string;
}

export interface ImportIntegrityReport {
  sessionsIn: number;
  sessionsOut: number;
  exercisesIn: number;
  exercisesOut: number;
  exercisesDropped: number;
  sessionsDropped: number;
  repairedFields: number;
  issues: IntegrityIssue[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function bump(report: ImportIntegrityReport | undefined, count = 1) {
  if (report) report.repairedFields += count;
}

function issue(
  report: ImportIntegrityReport | undefined,
  path: string,
  message: string
) {
  if (report) report.issues.push({ path, message });
}

/** 히스토리 표시명 스냅샷 — 카탈로그 조회 없이 항상 문자열 반환 */
export function normalizeLocalizedText(
  raw: unknown,
  seed = 'Exercise',
  path = 'exerciseName',
  report?: ImportIntegrityReport
): LocalizedText {
  if (typeof raw === 'string') {
    const s = raw.trim() || seed;
    if (raw !== s) bump(report);
    return { ko: s, en: s };
  }

  if (isRecord(raw)) {
    const ko = asString(raw.ko ?? raw.name ?? raw.name_ko, '');
    const en = asString(raw.en ?? raw.nameEn ?? raw.name_en, '');
    const resolvedKo = ko || en || seed;
    const resolvedEn = en || ko || seed;
    if (!ko || !en) bump(report);
    return { ko: resolvedKo, en: resolvedEn };
  }

  issue(report, path, '운동 이름 스냅샷이 없어 기본값 사용');
  bump(report);
  return { ko: seed, en: seed };
}

/** 카탈로그 무관 히스토리 키 (기존 exerciseKey · legacy ko 키 우선) */
export function deriveHistoryExerciseKey(
  name: LocalizedText,
  customId?: string,
  existingKey?: string
): string {
  const key = existingKey?.trim();
  if (key) return key;
  if (customId?.trim()) return `custom:${customId.trim()}`;
  // 구 import/세션은 name.ko 가 키였음 — 유지
  if (name.ko.trim()) return name.ko.trim();
  if (name.en.trim()) return `hist:${name.en.trim().toLowerCase()}`;
  return 'hist:unknown';
}

export function normalizeMuscleGroup(
  raw: unknown,
  path = 'muscleGroup',
  report?: ImportIntegrityReport
): MuscleGroup {
  const mg = asString(raw, '');
  if (MUSCLE_GROUPS.has(mg as MuscleGroup)) return mg as MuscleGroup;
  issue(report, path, `알 수 없는 근육 그룹 "${mg}" → chest 폴백`);
  bump(report);
  return 'chest';
}

export function normalizeResistanceType(
  raw: unknown,
  path = 'resistanceType',
  report?: ImportIntegrityReport
): ResistanceType {
  const rt = asString(raw, '');
  if (RESISTANCE_TYPES.has(rt as ResistanceType)) return rt as ResistanceType;
  issue(report, path, `알 수 없는 저항 타입 "${rt}" → weight 폴백`);
  bump(report);
  return 'weight';
}

export function muscleGroupColorSafe(raw: unknown): string {
  return muscleColors[normalizeMuscleGroup(raw)];
}

function sanitizeSet(
  raw: unknown,
  index: number,
  report?: ImportIntegrityReport
): SetData | null {
  if (!isRecord(raw)) {
    issue(report, `sets[${index}]`, '세트 형식 오류 — 건너뜀');
    return null;
  }

  const reps = Math.max(0, Math.round(asNumber(raw.reps, 0)));
  const completed = asBool(raw.completed, reps > 0);
  if (reps <= 0 && !completed) return null;

  const set: SetData = {
    setNumber: Math.max(1, Math.round(asNumber(raw.setNumber, index + 1))),
    reps,
    completed,
  };

  const weightLb = asNumber(raw.weightLb, NaN);
  if (Number.isFinite(weightLb) && weightLb >= 0) set.weightLb = weightLb;

  const bwAddedLb = asNumber(raw.bwAddedLb, NaN);
  if (Number.isFinite(bwAddedLb) && bwAddedLb >= 0) set.bwAddedLb = bwAddedLb;

  const band = asString(raw.bandLevel, '');
  if (band && BAND_LEVELS.has(band as BandLevel)) {
    set.bandLevel = band as BandLevel;
  } else if (band) {
    issue(report, `sets[${index}].bandLevel`, `알 수 없는 밴드 레벨 "${band}"`);
    bump(report);
  }

  return set;
}

/** 단일 운동 스냅샷 정규화 — 카탈로그 매핑 불필요 */
export function sanitizeSavedExerciseRecord(
  raw: unknown,
  pathPrefix: string,
  report?: ImportIntegrityReport
): SavedExerciseRecord | null {
  if (!isRecord(raw)) {
    issue(report, pathPrefix, '운동 레코드 형식 오류 — 건너뜀');
    return null;
  }

  const name = normalizeLocalizedText(
    raw.exerciseName ?? raw.name,
    'Exercise',
    `${pathPrefix}.exerciseName`,
    report
  );
  const customId = asString(raw.customId, '') || undefined;

  const rawSets = Array.isArray(raw.sets) ? raw.sets : [];
  const sets = rawSets
    .map((s, i) => sanitizeSet(s, i, report))
    .filter((s): s is SetData => s !== null);

  if (sets.length === 0) {
    issue(report, pathPrefix, '유효한 세트 없음 — 운동 건너뜀');
    return null;
  }

  return {
    exerciseKey: deriveHistoryExerciseKey(
      name,
      customId,
      asString(raw.exerciseKey, '') || undefined
    ),
    exerciseName: name,
    muscleGroup: normalizeMuscleGroup(raw.muscleGroup, `${pathPrefix}.muscleGroup`, report),
    resistanceType: normalizeResistanceType(
      raw.resistanceType,
      `${pathPrefix}.resistanceType`,
      report
    ),
    sets,
  };
}

function sanitizeEndedAt(raw: unknown, path: string, report?: ImportIntegrityReport): string {
  const iso = asString(raw, '');
  const d = new Date(iso);
  if (iso && !Number.isNaN(d.getTime())) return d.toISOString();
  issue(report, path, 'endedAt 없음/오류 — 현재 시각 사용');
  bump(report);
  return new Date().toISOString();
}

function sanitizeSessionId(raw: unknown, path: string, report?: ImportIntegrityReport): string {
  const id = asString(raw, '');
  if (id) return id;
  issue(report, path, '세션 id 없음 — 자동 생성');
  bump(report);
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 단일 세션 정규화 */
export function sanitizeSavedWorkoutSession(
  raw: unknown,
  index: number,
  report?: ImportIntegrityReport
): SavedWorkoutSession | null {
  if (!isRecord(raw)) {
    issue(report, `sessions[${index}]`, '세션 형식 오류 — 건너뜀');
    return null;
  }

  const path = `sessions[${index}]`;
  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  if (report) report.exercisesIn += rawExercises.length;

  const exercises = rawExercises
    .map((ex, i) => sanitizeSavedExerciseRecord(ex, `${path}.exercises[${i}]`, report))
    .filter((ex): ex is SavedExerciseRecord => ex !== null);

  if (report) {
    report.exercisesOut += exercises.length;
    report.exercisesDropped += rawExercises.length - exercises.length;
  }

  if (exercises.length === 0) {
    issue(report, path, '유효한 운동 없음 — 세션 건너뜀');
    if (report) report.sessionsDropped += 1;
    return null;
  }

  const locationId = asString(raw.locationId, '') || undefined;
  const routineId = asString(raw.routineId, '') || undefined;
  const endedAt = sanitizeEndedAt(raw.endedAt ?? raw.ended_at, `${path}.endedAt`, report);
  const startedRaw = asString(raw.startedAt ?? raw.started_at, '');
  let startedAt = startedRaw;
  if (startedRaw) {
    const d = new Date(startedRaw);
    if (Number.isNaN(d.getTime())) {
      issue(report, `${path}.startedAt`, 'startedAt 오류 — endedAt 사용');
      startedAt = '';
      bump(report);
    } else {
      startedAt = d.toISOString();
    }
  }
  if (!startedAt) startedAt = endedAt;
  if (new Date(startedAt).getTime() > new Date(endedAt).getTime()) {
    issue(report, path, '시작이 종료보다 늦음 — endedAt으로 맞춤');
    startedAt = endedAt;
    bump(report);
  }

  return {
    id: sanitizeSessionId(raw.id ?? raw.client_id, `${path}.id`, report),
    startedAt,
    endedAt,
    locationId,
    routineId,
    exercises,
  };
}

/** 세션 배열 일괄 정규화 + 리포트 */
export function sanitizeSavedWorkoutSessions(
  raw: unknown,
  logTag = '[workout-history]'
): { sessions: SavedWorkoutSession[]; report: ImportIntegrityReport } {
  const report: ImportIntegrityReport = {
    sessionsIn: 0,
    sessionsOut: 0,
    exercisesIn: 0,
    exercisesOut: 0,
    exercisesDropped: 0,
    sessionsDropped: 0,
    repairedFields: 0,
    issues: [],
  };

  const list = Array.isArray(raw) ? raw : [];
  report.sessionsIn = list.length;

  const sessions = list
    .map((s, i) => sanitizeSavedWorkoutSession(s, i, report))
    .filter((s): s is SavedWorkoutSession => s !== null)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));

  report.sessionsOut = sessions.length;
  report.sessionsDropped += list.length - sessions.length;

  if (report.issues.length > 0 || report.repairedFields > 0) {
    console.warn(
      `${logTag} 무결성 처리: sessions ${report.sessionsIn}→${report.sessionsOut}, ` +
        `exercises ${report.exercisesIn}→${report.exercisesOut}, ` +
        `repaired=${report.repairedFields}, issues=${report.issues.length}`
    );
  }

  return { sessions, report };
}

/** workout_import.json 페이로드 검증 */
export function sanitizeWorkoutImportPayload(
  raw: WorkoutImportPayload
): WorkoutImportPayload & { integrity: ImportIntegrityReport } {
  const { sessions, report } = sanitizeSavedWorkoutSessions(
    raw.sessions,
    '[workout-import]'
  );

  return {
    ...raw,
    sessions,
    stats: {
      ...raw.stats,
      sessions: sessions.length,
    },
    integrity: report,
  };
}

/** 표시용 — 카탈로그 없어도 스냅샷 이름만으로 안전 표기 */
export function displayExerciseNameFromSnapshot(
  name: LocalizedText | unknown,
  lang: 'ko' | 'en'
): string {
  const snap = normalizeLocalizedText(name, 'Exercise');
  if (lang === 'en') return snap.en || snap.ko || 'Exercise';
  return snap.ko || snap.en || 'Exercise';
}
