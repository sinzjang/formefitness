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
  /** SVG abductors 미지원 → gluteal(후면)로 근사 */
  외전근: { slug: 'gluteal', view: 'back' },
  비복근: { slug: 'calves', view: 'front' },
  가자미근: { slug: 'calves', view: 'front' },
  어깨: { slug: 'deltoids', view: 'front' },
};

/** 카탈로그에 남은 ExerciseDB 영문 근육명 → 한글 키 */
const ENGLISH_TO_ANATOMY: Record<string, string> = {
  quadriceps: '대퇴사두근',
  quads: '대퇴사두근',
  glutes: '둔근',
  hamstrings: '햄스트링',
  calves: '비복근',
  gastrocnemius: '비복근',
  soleus: '가자미근',
  adductors: '내전근',
  abductors: '외전근',
  ankles: '비복근',
  feet: '비복근',
  'ankle stabilizers': '비복근',
  'lower abs': '복직근 하부',
  back: '척추기립근',
  core: '코어',
};

function normalizeMuscleKey(key: string): string {
  const trimmed = key.trim();
  if (ANATOMY_TO_BODY[trimmed]) return trimmed;
  const alias = ENGLISH_TO_ANATOMY[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

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
    return keys
      .map((k) => normalizeMuscleKey(k))
      .map((k) => ANATOMY_TO_BODY[k])
      .filter((m): m is MuscleMapping => m != null);
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

/** 크롭 영역 — 상체 / 팔 / 코어 / 하체 */
export type BodyRegion = 'upper' | 'arms' | 'core' | 'lower';

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

const ARM_SLUGS: Slug[] = ['biceps', 'triceps', 'forearm'];

const GROUP_REGION: Record<MuscleGroup, BodyRegion> = {
  chest: 'upper',
  shoulder: 'upper',
  back: 'upper',
  arms: 'arms',
  core: 'core',
  legs: 'lower',
};

function slugToRegion(slug: Slug): BodyRegion {
  if (LOWER_SLUGS.includes(slug)) return 'lower';
  if (CORE_SLUGS.includes(slug)) return 'core';
  if (ARM_SLUGS.includes(slug)) return 'arms';
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

/** MuscleGroup → 전·후면 SVG slug */
const MUSCLE_GROUP_SLUGS: Record<MuscleGroup, { front: Slug[]; back: Slug[] }> = {
  chest: { front: ['chest'], back: [] },
  shoulder: { front: ['deltoids'], back: ['deltoids', 'trapezius'] },
  back: { front: [], back: ['upper-back', 'trapezius', 'lower-back'] },
  arms: { front: ['biceps', 'forearm'], back: ['triceps', 'forearm'] },
  core: { front: ['abs', 'obliques'], back: ['lower-back'] },
  legs: { front: ['quadriceps', 'adductors'], back: ['hamstring', 'gluteal', 'calves'] },
};

/** 홈 대시보드 — 최근 운동 부위 여러 그룹 하이라이트 */
export function getBodyHighlightForMuscleGroups(
  groups: MuscleGroup[],
  side: BodyView,
  colorForGroup: (group: MuscleGroup) => string
): ExtendedBodyPart[] {
  const unique = [...new Set(groups)];
  const parts: ExtendedBodyPart[] = [];

  for (const group of unique) {
    const slugs = MUSCLE_GROUP_SLUGS[group][side];
    const color = colorForGroup(group);
    for (const slug of slugs) {
      parts.push({ slug, intensity: 1, color });
    }
  }

  if (parts.length > 0) return parts;

  // 선택 면에 slug 없으면 반대 면 포함
  for (const group of unique) {
    const color = colorForGroup(group);
    for (const slug of [...MUSCLE_GROUP_SLUGS[group].front, ...MUSCLE_GROUP_SLUGS[group].back]) {
      parts.push({ slug, intensity: 1, color });
    }
  }

  return parts;
}
