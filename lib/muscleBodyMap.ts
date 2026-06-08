// 해부학 근육명 → react-native-body-highlighter slug / 전·후면
import type { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import type { MuscleGroup } from '../types';

type BodyView = 'front' | 'back';

interface MuscleMapping {
  slug: Slug;
  view: BodyView;
}

/** exercises.ts / anatomy.ts 한글 키 → SVG 부위 */
const ANATOMY_TO_BODY: Record<string, MuscleMapping> = {
  대흉근: { slug: 'chest', view: 'front' },
  '대흉근 상부': { slug: 'chest', view: 'front' },
  '대흉근 하부': { slug: 'chest', view: 'front' },
  삼두근: { slug: 'triceps', view: 'back' },
  이두근: { slug: 'biceps', view: 'front' },
  삼각근: { slug: 'deltoids', view: 'front' },
  전면삼각근: { slug: 'deltoids', view: 'front' },
  측면삼각근: { slug: 'deltoids', view: 'front' },
  후면삼각근: { slug: 'deltoids', view: 'back' },
  회전근개: { slug: 'deltoids', view: 'back' },
  코어: { slug: 'abs', view: 'front' },
  전거근: { slug: 'chest', view: 'front' },
  승모근: { slug: 'trapezius', view: 'back' },
  '승모근 상부': { slug: 'trapezius', view: 'back' },
  능형근: { slug: 'upper-back', view: 'back' },
  척추기립근: { slug: 'lower-back', view: 'back' },
  둔근: { slug: 'gluteal', view: 'back' },
  햄스트링: { slug: 'hamstring', view: 'back' },
  광배근: { slug: 'upper-back', view: 'back' },
  전완: { slug: 'forearm', view: 'front' },
  상완근: { slug: 'biceps', view: 'front' },
  상완요골근: { slug: 'forearm', view: 'front' },
  복직근: { slug: 'abs', view: 'front' },
  '복직근 하부': { slug: 'abs', view: 'front' },
  복횡근: { slug: 'abs', view: 'front' },
  복사근: { slug: 'obliques', view: 'front' },
  장요근: { slug: 'abs', view: 'front' },
  대퇴사두근: { slug: 'quadriceps', view: 'front' },
  내전근: { slug: 'adductors', view: 'front' },
  비복근: { slug: 'calves', view: 'back' },
  가자미근: { slug: 'calves', view: 'back' },
  어깨: { slug: 'deltoids', view: 'front' },
};

/** 커스텀 운동 등 — 근육 그룹만 있을 때 기본 부위 */
const MUSCLE_GROUP_DEFAULT: Record<MuscleGroup, MuscleMapping> = {
  chest: { slug: 'chest', view: 'front' },
  shoulder: { slug: 'deltoids', view: 'front' },
  back: { slug: 'upper-back', view: 'back' },
  arms: { slug: 'biceps', view: 'front' },
  core: { slug: 'abs', view: 'front' },
  legs: { slug: 'quadriceps', view: 'front' },
};

function resolveMappings(keys: string[], fallbackGroup?: MuscleGroup): MuscleMapping[] {
  if (keys.length > 0) {
    return keys.map((k) => ANATOMY_TO_BODY[k]).filter((m): m is MuscleMapping => m != null);
  }
  if (fallbackGroup) return [MUSCLE_GROUP_DEFAULT[fallbackGroup]];
  return [];
}

function pickView(mappings: MuscleMapping[]): BodyView {
  let front = 0;
  let back = 0;
  for (const m of mappings) {
    if (m.view === 'front') front += 1;
    else back += 1;
  }
  return back > front ? 'back' : 'front';
}

function buildData(mappings: MuscleMapping[], side: BodyView, color: string): ExtendedBodyPart[] {
  const slugs = new Set<Slug>();
  for (const m of mappings) {
    if (m.view === side) slugs.add(m.slug);
  }
  // 선택한 면에 해당 slug가 없으면 반대 면 slug도 시도
  if (slugs.size === 0) {
    for (const m of mappings) slugs.add(m.slug);
  }
  return [...slugs].map((slug) => ({ slug, intensity: 1, color }));
}

export interface BodyHighlightResult {
  side: BodyView;
  data: ExtendedBodyPart[];
}

/** 크롭 영역 — 상체 / 코어 / 하체 */
export type BodyRegion = 'upper' | 'core' | 'lower';

const LOWER_SLUGS: Slug[] = [
  'quadriceps',
  'hamstring',
  'calves',
  'gluteal',
  'adductors',
  'tibialis',
  'knees',
  'ankles',
  'feet',
];

const CORE_SLUGS: Slug[] = ['abs', 'obliques', 'lower-back'];

const GROUP_REGION: Record<MuscleGroup, BodyRegion> = {
  chest: 'upper',
  shoulder: 'upper',
  back: 'upper',
  arms: 'upper',
  core: 'core',
  legs: 'lower',
};

function slugToRegion(slug: Slug): BodyRegion {
  if (LOWER_SLUGS.includes(slug)) return 'lower';
  if (CORE_SLUGS.includes(slug)) return 'core';
  return 'upper';
}

/** 하이라이트 대상에 맞는 크롭 영역 */
export function getBodyRegion(muscleKeys: string[], fallbackGroup?: MuscleGroup): BodyRegion {
  const mappings = resolveMappings(muscleKeys, fallbackGroup);
  if (mappings.length === 0) {
    return fallbackGroup ? GROUP_REGION[fallbackGroup] : 'upper';
  }
  return slugToRegion(mappings[0].slug);
}

/** 여러 근육을 한 번에 하이라이트 (주동근 카드) */
export function getBodyHighlightForMuscles(
  muscleKeys: string[],
  fallbackGroup?: MuscleGroup,
  highlightColor?: string
): BodyHighlightResult {
  const mappings = resolveMappings(muscleKeys, fallbackGroup);
  if (mappings.length === 0) return { side: 'front', data: [] };

  let side = pickView(mappings);
  let data = buildData(mappings, side, highlightColor ?? '');

  // 해당 면에 그릴 부위가 없으면 반대 면 사용
  if (data.length === 0) {
    side = side === 'front' ? 'back' : 'front';
    data = buildData(mappings, side, highlightColor ?? '');
  }

  return { side, data };
}

/** 단일 근육 하이라이트 (협동근 카드) */
export function getBodyHighlightForMuscle(
  muscleKey: string | undefined,
  fallbackGroup?: MuscleGroup,
  highlightColor?: string
): BodyHighlightResult {
  if (!muscleKey) return { side: 'front', data: [] };
  return getBodyHighlightForMuscles([muscleKey], fallbackGroup, highlightColor);
}
