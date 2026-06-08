// 표시용 포맷 헬퍼
import type { ResistanceType, SetData } from '../types';

// 세트의 저항(무게/밴드/맨몸)을 사람이 읽는 문자열로
// 저항 타입은 운동(WorkoutExercise)에 고정되므로 인자로 받음
export const displayWeight = (set: SetData, resistanceType: ResistanceType): string => {
  if (resistanceType === 'weight') {
    return set.weightLb != null ? `${set.weightLb} lb` : '-';
  }
  if (resistanceType === 'band') {
    return set.bandLevel ? `${set.bandLevel} 밴드` : '밴드';
  }
  // bodyweight
  return set.bwAddedLb ? `BW +${set.bwAddedLb} lb` : 'BW';
};
