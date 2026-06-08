// 장소 탭 색상 프리셋
export const LOCATION_COLOR_PRESETS = [
  '#FF4D1C', // accent — GYM 기본
  '#3B82F6', // blue — HOME 기본
  '#22C55E',
  '#8B5CF6',
  '#FF8C42',
  '#111111',
  '#EC4899',
  '#14B8A6',
] as const;

export type LocationColor = (typeof LOCATION_COLOR_PRESETS)[number];

/** 시스템 장소 기본 색 */
export const DEFAULT_LOCATION_COLORS: Record<string, string> = {
  loc_gym: '#FF4D1C',
  loc_home: '#3B82F6',
};

/** 새 장소 추가 시 사용할 색 (프리셋 순환) */
export function pickNextLocationColor(existingCount: number): string {
  return LOCATION_COLOR_PRESETS[existingCount % LOCATION_COLOR_PRESETS.length];
}

/** 저장된 장소에 color 없을 때 마이그레이션용 */
export function resolveLocationColor(id: string, index: number): string {
  return DEFAULT_LOCATION_COLORS[id] ?? pickNextLocationColor(index);
}

/** 활성 탭·패널 배경 (흰색과 블렌드) */
export const LOCATION_SURFACE_ACTIVE = 0.14;
/** 비활성 탭 배경 */
export const LOCATION_SURFACE_INACTIVE = 0.08;

/** hex 색을 흰 배경과 블렌드해 불투명 틴트 생성 */
export function locationSurface(hex: string, ratio = LOCATION_SURFACE_ACTIVE): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '#FFFFFF';

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const blend = (c: number) => Math.round(255 * (1 - ratio) + c * ratio);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  return `#${toHex(blend(r))}${toHex(blend(g))}${toHex(blend(b))}`;
}
