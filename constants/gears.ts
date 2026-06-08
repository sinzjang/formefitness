// 운동 기구(Gear) 정의 + 저항 타입 파생
import type { Gear, ResistanceType } from '../types';

export interface GearDef {
  id: Gear;
  label: string;
  // 추후 실제 기구 썸네일로 교체 (지금은 플레이스홀더)
  image?: number;
}

export const GEARS: GearDef[] = [
  { id: 'Body', label: 'Body' },
  { id: 'Barbell', label: 'Barbell' },
  { id: 'Dumbbell', label: 'Dumbbell' },
  { id: 'Kettlebell', label: 'Kettlebell' },
  { id: 'Machine', label: 'Machine' },
  { id: 'Plate', label: 'Plate' },
  { id: 'Band', label: 'Band' },
];

// Gear → 저항 타입 파생 (운동 입력 방식 결정)
export const gearToResistance = (gear: Gear): ResistanceType => {
  if (gear === 'Body') return 'bodyweight';
  if (gear === 'Band') return 'band';
  return 'weight';
};

// 저항 타입 → Gear (세션 운동 → 카탈로그 역매핑용, weight는 Barbell 기본)
export const resistanceToGear = (type: ResistanceType): Gear => {
  if (type === 'bodyweight') return 'Body';
  if (type === 'band') return 'Band';
  return 'Barbell';
};
