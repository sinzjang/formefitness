// Forme 카탈로그 nameEn → ExerciseDB 미디어 (썸네일 / 모달 GIF 분리)
import { hasRapidApiKey, searchExercisesOss, searchExercisesRapidApi } from './exerciseDb';
import { getCatalogExerciseDbId } from '../constants/exerciseDbCatalogIds';

export interface ExerciseMediaRef {
  /** RapidAPI Justin id — 모달 GIF(360)용 */
  exerciseId?: string;
  /** OSS CDN URL — 리스트 정지 썸네일용 */
  thumbnailUrl?: string;
}

const mediaCache = new Map<string, ExerciseMediaRef | null>();
const thumbInflight = new Map<string, Promise<ExerciseMediaRef | null>>();
const gifInflight = new Map<string, Promise<ExerciseMediaRef | null>>();
const instructionsCache = new Map<string, string[] | null>();
const instructionsInflight = new Map<string, Promise<string[] | null>>();

/** ExerciseDB 검색어가 Forme nameEn과 다를 때 수동 지정 */
const SEARCH_OVERRIDES: Record<string, string> = {
  'bench press': 'barbell bench press',
  'incline bench press': 'barbell incline bench press',
  'overhead press': 'barbell overhead press',
  'barbell row': 'barbell bent over row',
  'squat': 'barbell squat',
  'deadlift': 'barbell deadlift',
  'dips': 'triceps dip',
  'push-up': 'push up',
  'pull-up': 'pull up',
  'band pull-apart': 'band pull apart',
};

let requestChain: Promise<unknown> = Promise.resolve();
const REQUEST_GAP_MS = 150;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = requestChain.then(fn, fn);
  requestChain = run.catch(() => undefined);
  return run;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(nameEn: string, exerciseDbId?: string): string {
  if (exerciseDbId?.trim()) return `id:${exerciseDbId.trim()}`;
  return nameEn.trim().toLowerCase();
}

function resolveCatalogId(nameEn: string, exerciseDbId?: string): string | undefined {
  return exerciseDbId?.trim() || getCatalogExerciseDbId(nameEn);
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchTermFor(nameEn: string): string {
  const key = cacheKey(nameEn);
  return SEARCH_OVERRIDES[key] ?? nameEn.trim();
}

function pickBestMatch<T extends { name: string }>(nameEn: string, items: T[]): T | null {
  if (items.length === 0) return null;

  const query = normalizeForMatch(nameEn);
  const words = query.split(' ').filter(Boolean);

  let best: T | null = null;
  let bestScore = -1;

  for (const item of items) {
    const normalized = normalizeForMatch(item.name);
    const matchedWords = words.filter((w) => normalized.includes(w)).length;
    const exactBonus = normalized === query ? 100 : normalized.includes(query) ? 40 : 0;
    const score = matchedWords * 10 + exactBonus - normalized.length * 0.001;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

function mergeCache(key: string, partial: ExerciseMediaRef): ExerciseMediaRef {
  const prev = mediaCache.get(key) ?? {};
  const merged = { ...prev, ...partial };
  mediaCache.set(key, merged);
  return merged;
}

/** 메모리 캐시 동기 조회 — API 호출 없음 */
export function getCachedExerciseMedia(
  nameEn: string,
  exerciseDbId?: string
): ExerciseMediaRef | null {
  if (!nameEn.trim() && !exerciseDbId?.trim()) return null;

  const key = cacheKey(nameEn, exerciseDbId);
  const cached = mediaCache.get(key);
  if (cached?.exerciseId || cached?.thumbnailUrl) return cached;

  const catalogId = resolveCatalogId(nameEn, exerciseDbId);
  if (catalogId) return { exerciseId: catalogId };

  return cached ?? null;
}

/** 카탈로그 gifUrl·exerciseDbId를 메모리 캐시에 시드 (네트워크 없음) */
export function seedCatalogMediaCache(
  items: Array<{ nameEn: string; exerciseDbId?: string; gifUrl?: string }>
): number {
  let seeded = 0;
  for (const item of items) {
    const nameEn = item.nameEn.trim();
    if (!nameEn) continue;

    const patch: ExerciseMediaRef = {};
    const catalogId = resolveCatalogId(nameEn, item.exerciseDbId);
    if (catalogId) patch.exerciseId = catalogId;
    if (item.gifUrl?.trim()) patch.thumbnailUrl = item.gifUrl.trim();

    if (!patch.exerciseId && !patch.thumbnailUrl) continue;

    mergeCache(cacheKey(nameEn, item.exerciseDbId), patch);
    seeded++;
  }
  return seeded;
}

/** 리스트용 — 로컬 id → RapidAPI 180 정지 프레임 (별도 PNG 없음) */
async function lookupThumbnail(
  nameEn: string,
  exerciseDbId?: string
): Promise<ExerciseMediaRef | null> {
  const catalogId = resolveCatalogId(nameEn, exerciseDbId);
  if (catalogId) return { exerciseId: catalogId };

  const term = searchTermFor(nameEn);

  if (hasRapidApiKey()) {
    try {
      await delay(REQUEST_GAP_MS);
      const rapid = await searchExercisesRapidApi({ name: term, limit: 12 });
      const match = pickBestMatch(nameEn, rapid.data);
      if (match?.exerciseId) return { exerciseId: match.exerciseId };
    } catch {
      // OSS fallback
    }
  }

  try {
    const oss = await searchExercisesOss({ name: term, limit: 12 });
    const match = pickBestMatch(nameEn, oss.data);
    if (match?.gifUrl) return { thumbnailUrl: match.gifUrl };
  } catch {
    return null;
  }

  return null;
}

/** 모달용 — RapidAPI Justin id (고해상도 GIF) */
async function lookupGifExerciseId(
  nameEn: string,
  exerciseDbId?: string
): Promise<string | undefined> {
  const catalogId = resolveCatalogId(nameEn, exerciseDbId);
  if (catalogId) return catalogId;

  if (!hasRapidApiKey()) return undefined;

  const term = searchTermFor(nameEn);
  try {
    await delay(REQUEST_GAP_MS);
    const rapid = await searchExercisesRapidApi({ name: term, limit: 12 });
    const match = pickBestMatch(nameEn, rapid.data);
    return match?.exerciseId || undefined;
  } catch {
    return undefined;
  }
}

/** 리스트 썸네일 — 카탈로그 id 우선, 없으면 OSS fallback */
export async function resolveExerciseThumbnail(
  nameEn: string,
  exerciseDbId?: string
): Promise<ExerciseMediaRef | null> {
  if (!nameEn.trim() && !exerciseDbId?.trim()) return null;

  const key = cacheKey(nameEn, exerciseDbId);
  const cached = mediaCache.get(key);
  if (cached?.exerciseId || cached?.thumbnailUrl) return cached;
  if (thumbInflight.has(key)) return thumbInflight.get(key) ?? Promise.resolve(null);

  const task: Promise<ExerciseMediaRef | null> = enqueue(async (): Promise<ExerciseMediaRef | null> => {
    try {
      const cachedAgain = mediaCache.get(key);
      if (cachedAgain?.exerciseId || cachedAgain?.thumbnailUrl) return cachedAgain;

      const thumb = await lookupThumbnail(nameEn, exerciseDbId);
      if (!thumb) {
        if (!mediaCache.has(key)) mediaCache.set(key, null);
        return mediaCache.get(key) ?? null;
      }
      return mergeCache(key, thumb);
    } catch {
      if (!mediaCache.has(key)) mediaCache.set(key, null);
      return null;
    } finally {
      thumbInflight.delete(key);
    }
  });

  thumbInflight.set(key, task);
  return task;
}

/** 모달 GIF — 모달 열릴 때만 호출 (RapidAPI) */
export async function resolveExerciseGifMedia(
  nameEn: string,
  exerciseDbId?: string
): Promise<ExerciseMediaRef | null> {
  if (!nameEn.trim() && !exerciseDbId?.trim()) return null;

  const key = cacheKey(nameEn, exerciseDbId);
  const cached = mediaCache.get(key);
  if (cached?.exerciseId) return cached;
  if (gifInflight.has(key)) return gifInflight.get(key)!;

  const task = enqueue(async () => {
    try {
      const cachedAgain = mediaCache.get(key);
      if (cachedAgain?.exerciseId) return cachedAgain;

      const exerciseId = await lookupGifExerciseId(nameEn, exerciseDbId);
      if (!exerciseId) return mediaCache.get(key) ?? null;
      return mergeCache(key, { exerciseId });
    } catch {
      return mediaCache.get(key) ?? null;
    } finally {
      gifInflight.delete(key);
    }
  });

  gifInflight.set(key, task);
  return task;
}

/** @deprecated resolveExerciseThumbnail / resolveExerciseGifMedia 사용 */
export async function resolveExerciseMedia(
  nameEn: string,
  exerciseDbId?: string
): Promise<ExerciseMediaRef | null> {
  const thumb = await resolveExerciseThumbnail(nameEn, exerciseDbId);
  const gif = await resolveExerciseGifMedia(nameEn, exerciseDbId);
  if (!thumb && !gif) return null;
  return { ...thumb, ...gif };
}

export async function resolveExerciseDbId(
  nameEn: string,
  exerciseDbId?: string
): Promise<string | null> {
  const media = await resolveExerciseGifMedia(nameEn, exerciseDbId);
  return media?.exerciseId ?? null;
}

export interface ExerciseThumbnailPrefetch {
  nameEn: string;
  exerciseDbId?: string;
}

/** 피커 오픈 시 리스트 썸네일 순차 prefetch */
export function prefetchExerciseThumbnails(items: ExerciseThumbnailPrefetch[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    const nameEn = item.nameEn.trim();
    if (!nameEn) continue;
    const dedupeKey = `${nameEn}|${item.exerciseDbId ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const catalogId = resolveCatalogId(nameEn, item.exerciseDbId);
    if (catalogId) {
      mergeCache(cacheKey(nameEn, item.exerciseDbId), { exerciseId: catalogId });
    }
    void resolveExerciseThumbnail(nameEn, item.exerciseDbId).catch(() => null);
  }
}

/** ExerciseDB API에서 instructions 조회 (Forme 카탈로그에는 없음 — 클릭 시 lazy fetch) */
async function lookupInstructions(nameEn: string): Promise<string[]> {
  const term = searchTermFor(nameEn);

  try {
    const oss = await searchExercisesOss({ name: term, limit: 12 });
    const ossMatch = pickBestMatch(nameEn, oss.data);
    if (ossMatch?.instructions?.length) return ossMatch.instructions;
  } catch {
    // OSS 실패 시 RapidAPI 시도
  }

  if (!hasRapidApiKey()) return [];

  try {
    await delay(REQUEST_GAP_MS);
    const rapid = await searchExercisesRapidApi({ name: term, limit: 12 });
    const rapidMatch = pickBestMatch(nameEn, rapid.data);
    if (rapidMatch?.instructions?.length) return rapidMatch.instructions;
  } catch {
    return [];
  }

  return [];
}

/** instructions 문자열 정리 (Step:1 접두어 제거) */
export function formatInstructionStep(text: string): string {
  return text.replace(/^Step:\d+\s*/i, '').trim() || text.trim();
}

export async function resolveExerciseInstructions(nameEn: string): Promise<string[] | null> {
  if (!nameEn.trim()) return null;

  const key = cacheKey(nameEn);
  if (instructionsCache.has(key)) return instructionsCache.get(key)!;
  if (instructionsInflight.has(key)) return instructionsInflight.get(key)!;

  const task = enqueue(async () => {
    try {
      const steps = await lookupInstructions(nameEn);
      const cleaned = steps.map(formatInstructionStep).filter(Boolean);
      instructionsCache.set(key, cleaned.length > 0 ? cleaned : null);
      return instructionsCache.get(key)!;
    } catch {
      instructionsCache.set(key, null);
      return null;
    } finally {
      instructionsInflight.delete(key);
    }
  });

  instructionsInflight.set(key, task);
  return task;
}
