// MuscleBodyView 크기·영역별 scale + marginTop 크롭
// scale을 낮추면 클립 안에 더 많은 몸이 들어옴
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
  core: {
    thumb: { bodyScale: 0.38, marginTop: -42 },
    card: { bodyScale: 0.46, marginTop: -52 },
    hero: { bodyScale: 0.56, marginTop: -64 },
  },
  lower: {
    thumb: { bodyScale: 0.38, marginTop: -82 },
    card: { bodyScale: 0.46, marginTop: -98 },
    hero: { bodyScale: 0.56, marginTop: -120 },
  },
};

export function getBodyViewport(region: BodyRegion, size: MuscleBodySize): BodyViewport {
  return VIEWPORTS[region][size];
}
