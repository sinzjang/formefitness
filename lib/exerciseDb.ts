// ExerciseDB 클라이언트 — OSS(무료) + RapidAPI ExerciseDB (exercisedb.p.rapidapi.com)
import type {
  ExerciseDbHealthResult,
  ExerciseDbItem,
  ExerciseDbProvider,
  ExerciseDbSearchResult,
  RapidApiGifResolution,
} from '../types/exerciseDb';

const OSS_BASE = 'https://oss.exercisedb.dev/api/v1';

/** RapidAPI — justin ExerciseDB (GET /status, /exercises/bodyPart/..., /image) */
export const RAPID_EXERCISEDB_HOST = 'exercisedb.p.rapidapi.com';

const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY?.trim() ?? '';

/** 연속 검색 시 /status 반복 호출 방지 */
let rapidHealthCache: { ok: boolean; at: number } | null = null;
const RAPID_HEALTH_TTL_MS = 60_000;

function normalizeOssItem(raw: Record<string, unknown>): ExerciseDbItem {
  return {
    exerciseId: String(raw.exerciseId ?? ''),
    name: String(raw.name ?? ''),
    gifUrl: String(raw.gifUrl ?? ''),
    bodyParts: Array.isArray(raw.bodyParts) ? raw.bodyParts.map(String) : [],
    equipments: Array.isArray(raw.equipments) ? raw.equipments.map(String) : [],
    targetMuscles: Array.isArray(raw.targetMuscles) ? raw.targetMuscles.map(String) : [],
    secondaryMuscles: Array.isArray(raw.secondaryMuscles)
      ? raw.secondaryMuscles.map(String)
      : [],
    instructions: Array.isArray(raw.instructions) ? raw.instructions.map(String) : [],
  };
}

/** RapidAPI ExerciseDB 응답 (id, bodyPart, equipment, target …) */
function normalizeRapidItem(raw: Record<string, unknown>): ExerciseDbItem {
  const exerciseId = String(raw.id ?? raw.exerciseId ?? '');
  return {
    exerciseId,
    name: String(raw.name ?? ''),
    gifUrl: getRapidApiGifUrl(exerciseId, 180) ?? '',
    bodyParts: raw.bodyPart ? [String(raw.bodyPart)] : [],
    equipments: raw.equipment ? [String(raw.equipment)] : [],
    targetMuscles: raw.target ? [String(raw.target)] : [],
    secondaryMuscles: Array.isArray(raw.secondaryMuscles)
      ? raw.secondaryMuscles.map(String)
      : [],
    instructions: Array.isArray(raw.instructions) ? raw.instructions.map(String) : [],
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ status: number; json: T }> {
  const res = await fetch(url, init);
  const json = (await res.json()) as T;
  return { status: res.status, json };
}

async function rapidFetch(path: string): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(`https://${RAPID_EXERCISEDB_HOST}${path}`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPID_EXERCISEDB_HOST,
      },
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // /status → plain text "online"
    }
    return { status: res.status, body };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return { status: 0, body: { message } };
  }
}

/** OSS — 무료, API 키 불필요 */
export async function searchExercisesOss(params: {
  name?: string;
  bodyParts?: string;
  limit?: number;
}): Promise<ExerciseDbSearchResult> {
  const qs = new URLSearchParams();
  if (params.name?.trim()) qs.set('name', params.name.trim());
  if (params.bodyParts?.trim()) qs.set('bodyParts', params.bodyParts.trim());
  qs.set('limit', String(params.limit ?? 12));

  try {
    const { status, json } = await fetchJson<{ success?: boolean; data?: Record<string, unknown>[] }>(
      `${OSS_BASE}/exercises?${qs.toString()}`
    );
    const data = (json.data ?? []).map(normalizeOssItem).filter((e) => e.exerciseId && e.gifUrl);
    return {
      provider: 'oss',
      data,
      httpStatus: status,
      error: status >= 400 ? `OSS HTTP ${status}` : undefined,
    };
  } catch (e) {
    return {
      provider: 'oss',
      data: [],
      error: e instanceof Error ? e.message : 'OSS 요청 실패',
    };
  }
}

async function ensureRapidApiOnline(): Promise<ExerciseDbHealthResult> {
  if (
    rapidHealthCache &&
    Date.now() - rapidHealthCache.at < RAPID_HEALTH_TTL_MS
  ) {
    return {
      provider: 'rapidapi',
      ok: rapidHealthCache.ok,
      httpStatus: rapidHealthCache.ok ? 200 : 503,
      message: rapidHealthCache.ok
        ? 'ExerciseDB online (cached)'
        : 'ExerciseDB unavailable (cached)',
    };
  }

  const health = await checkRapidApiHealth();
  rapidHealthCache = { ok: health.ok, at: Date.now() };
  return health;
}

/** RapidAPI GET /status → "online" */
export async function checkRapidApiHealth(): Promise<ExerciseDbHealthResult> {
  if (!RAPIDAPI_KEY) {
    return {
      provider: 'rapidapi',
      ok: false,
      httpStatus: 0,
      message: 'EXPO_PUBLIC_RAPIDAPI_KEY가 .env에 없습니다.',
    };
  }

  const { status, body } = await rapidFetch('/status');
  const statusText =
    typeof body === 'string' ? body.replace(/"/g, '') : String(body ?? '');

  if (status === 200 && statusText.toLowerCase() === 'online') {
    return {
      provider: 'rapidapi',
      ok: true,
      httpStatus: status,
      message: 'ExerciseDB online (exercisedb.p.rapidapi.com)',
    };
  }

  const msg =
    typeof body === 'object' && body && 'message' in body
      ? String((body as { message: string }).message)
      : statusText || `HTTP ${status}`;

  return {
    provider: 'rapidapi',
    ok: false,
    httpStatus: status,
    message: msg,
  };
}

function filterByName(items: ExerciseDbItem[], name?: string, limit = 12): ExerciseDbItem[] {
  const q = name?.trim().toLowerCase();
  let list = items;
  if (q) {
    list = items.filter((e) => e.name.toLowerCase().includes(q));
  }
  return list.slice(0, limit);
}

/** RapidAPI ExerciseDB 검색 */
export async function searchExercisesRapidApi(params: {
  name?: string;
  bodyParts?: string;
  limit?: number;
}): Promise<ExerciseDbSearchResult> {
  if (!RAPIDAPI_KEY) {
    return { provider: 'rapidapi', data: [], error: 'EXPO_PUBLIC_RAPIDAPI_KEY 없음' };
  }

  const health = await ensureRapidApiOnline();
  if (!health.ok) {
    return { provider: 'rapidapi', data: [], error: health.message, httpStatus: health.httpStatus };
  }

  const limit = params.limit ?? 12;
  let path: string;

  if (params.name?.trim()) {
    path = `/exercises/name/${encodeURIComponent(params.name.trim())}`;
  } else if (params.bodyParts?.trim()) {
    path = `/exercises/bodyPart/${encodeURIComponent(params.bodyParts.trim())}`;
  } else {
    path = `/exercises?limit=${limit}`;
  }

  const { status, body } = await rapidFetch(path);

  if (status !== 200 || !Array.isArray(body)) {
    const errMsg =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: string }).message)
        : `RapidAPI HTTP ${status}`;
    return { provider: 'rapidapi', data: [], error: errMsg, httpStatus: status };
  }

  let data = (body as Record<string, unknown>[]).map(normalizeRapidItem).filter((e) => e.exerciseId);

  // name 검색 후 bodyPart 추가 필터
  if (params.name?.trim() && params.bodyParts?.trim()) {
    const bp = params.bodyParts.trim().toLowerCase();
    data = data.filter((e) => e.bodyParts.some((b) => b.toLowerCase() === bp));
  }

  if (!params.name?.trim() && params.bodyParts?.trim()) {
    data = filterByName(data, undefined, limit);
  } else {
    data = data.slice(0, limit);
  }

  return { provider: 'rapidapi', data, httpStatus: 200 };
}

export async function getRapidExerciseById(exerciseId: string): Promise<ExerciseDbItem | null> {
  if (!RAPIDAPI_KEY || !exerciseId) return null;
  const { status, body } = await rapidFetch(`/exercises/exercise/${encodeURIComponent(exerciseId)}`);
  if (status !== 200 || typeof body !== 'object' || !body) return null;
  return normalizeRapidItem(body as Record<string, unknown>);
}

export async function searchExercises(
  provider: ExerciseDbProvider,
  params: { name?: string; bodyParts?: string; limit?: number }
): Promise<ExerciseDbSearchResult> {
  return provider === 'oss' ? searchExercisesOss(params) : searchExercisesRapidApi(params);
}

/** GET /image — GIF 스트림 URL (React Native Image src) */
export function getRapidApiGifUrl(
  exerciseId: string,
  resolution: RapidApiGifResolution = 180
): string | null {
  if (!RAPIDAPI_KEY || !exerciseId) return null;
  const qs = new URLSearchParams({
    exerciseId,
    resolution: String(resolution),
    'rapidapi-key': RAPIDAPI_KEY,
  });
  return `https://${RAPID_EXERCISEDB_HOST}/image?${qs.toString()}`;
}

export function hasRapidApiKey(): boolean {
  return RAPIDAPI_KEY.length > 0;
}

/** RapidAPI bodyPartList (GET /exercises/bodyPartList) */
export async function fetchRapidBodyPartList(): Promise<string[]> {
  const { status, body } = await rapidFetch('/exercises/bodyPartList');
  if (status === 200 && Array.isArray(body)) return body.map(String);
  return [];
}
