// 바디 목표 Tier (1–6)
import type { Language } from '../types';

export interface BodyGoalTierDef {
  id: number;
  nameEn: string;
  nameKo: string;
}

export const BODY_GOAL_TIERS: BodyGoalTierDef[] = [
  { id: 1, nameEn: 'Lean & Clean', nameKo: '린 & 클린' },
  { id: 2, nameEn: 'Everyday Fit', nameKo: '에브리데이 핏' },
  { id: 3, nameEn: 'Toned Up', nameKo: '톤드 업' },
  { id: 4, nameEn: 'Athletic', nameKo: '애슬레틱' },
  { id: 5, nameEn: 'Sculpted', nameKo: '스컬프티드' },
  { id: 6, nameEn: 'Elite', nameKo: '엘리트' },
];

const DEFAULT_TIER = 3;

export function resolveGoalTier(tier?: number | null): number {
  if (tier == null || tier < 1 || tier > 6) return DEFAULT_TIER;
  return Math.round(tier);
}

export function getTierDef(tier?: number | null): BodyGoalTierDef {
  const id = resolveGoalTier(tier);
  return BODY_GOAL_TIERS.find((t) => t.id === id) ?? BODY_GOAL_TIERS[2];
}

export function getTierName(tier: number | undefined | null, lang: Language): string {
  const def = getTierDef(tier);
  return lang === 'ko' ? def.nameKo : def.nameEn;
}
