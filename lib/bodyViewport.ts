// MuscleBodyView 크기·영역별 scale + marginTop 크롭
import type { Slug } from 'react-native-body-highlighter';
import type { BodyRegion } from './muscleBodyMap';

type MuscleBodySize = 'thumb' | 'card' | 'hero';

export interface BodyViewport {
  /** Body 컴포넌트 scale (SVG 높이 ≈ 400 × scale) */
  bodyScale: number;
  /** 위로 당겨 해당 부위 중심 (음수) — 절대값이 작을수록 더 많은 몸이 보임 */
  marginTop: number;
}

const VIEWPORTS: Record<BodyRegion, Record<MuscleBodySize, BodyViewport>> = {
  upper: {
    thumb: { bodyScale: 0.38, marginTop: 2 },
    card: { bodyScale: 0.46, marginTop: 4 },
    hero: { bodyScale: 0.56, marginTop: 6 },
  },
  /** 팔(biceps/triceps/forearm) — 몸을 아래로 내려 팔·어깨가 프레임에 들어오게 */
  arms: {
    thumb: { bodyScale: 0.35, marginTop: -36 },
    card: { bodyScale: 0.43, marginTop: -46 },
    hero: { bodyScale: 0.51, marginTop: -58 },
  },
  core: {
    thumb: { bodyScale: 0.38, marginTop: -42 },
    card: { bodyScale: 0.46, marginTop: -52 },
    hero: { bodyScale: 0.56, marginTop: -64 },
  },
  /** 하체 기본 — slug별 오버라이드는 LOWER_BY_SLUG */
  lower: {
    thumb: { bodyScale: 0.38, marginTop: -64 },
    card: { bodyScale: 0.46, marginTop: -78 },
    hero: { bodyScale: 0.56, marginTop: -96 },
  },
};

/** 하체 slug별 크롭 — 주동근 위치에 맞게 프레임 조정 */
const LOWER_BY_SLUG: Partial<Record<Slug, Partial<Record<MuscleBodySize, Pick<BodyViewport, 'marginTop'>>>>> = {
  quadriceps: {
    thumb: { marginTop: -56 },
    card: { marginTop: -68 },
    hero: { marginTop: -84 },
  },
  adductors: {
    thumb: { marginTop: -60 },
    card: { marginTop: -72 },
    hero: { marginTop: -88 },
  },
  tibialis: {
    thumb: { marginTop: -88 },
    card: { marginTop: -104 },
    hero: { marginTop: -124 },
  },
  knees: {
    thumb: { marginTop: -72 },
    card: { marginTop: -86 },
    hero: { marginTop: -104 },
  },
  hamstring: {
    thumb: { marginTop: -70 },
    card: { marginTop: -84 },
    hero: { marginTop: -102 },
  },
  gluteal: {
    thumb: { marginTop: -66 },
    card: { marginTop: -80 },
    hero: { marginTop: -96 },
  },
  calves: {
    thumb: { marginTop: -92 },
    card: { marginTop: -110 },
    hero: { marginTop: -132 },
  },
  ankles: {
    thumb: { marginTop: -98 },
    card: { marginTop: -116 },
    hero: { marginTop: -138 },
  },
  feet: {
    thumb: { marginTop: -104 },
    card: { marginTop: -122 },
    hero: { marginTop: -144 },
  },
};

export function getBodyViewport(
  region: BodyRegion,
  size: MuscleBodySize,
  highlightSlug?: Slug
): BodyViewport {
  const base = VIEWPORTS[region][size];
  if (region !== 'lower' || !highlightSlug) return base;

  const override = LOWER_BY_SLUG[highlightSlug]?.[size];
  if (!override) return base;

  return { ...base, ...override };
}
