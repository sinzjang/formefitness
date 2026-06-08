// AI 코치 메타 + 프로필 이미지
import type { CoachName } from '../types';
import type { ImageSourcePropType } from 'react-native';

export interface CoachDef {
  id: CoachName;
  image: ImageSourcePropType;
}

export const COACHES: Record<CoachName, CoachDef> = {
  Kai: {
    id: 'Kai',
    // 파일명 Kal.jpg — 코치 이름 Kai
    image: require('../src/imgs/coaches/Kal.jpg'),
  },
  Alex: {
    id: 'Alex',
    image: require('../src/imgs/coaches/Alex.jpg'),
  },
  Jordan: {
    id: 'Jordan',
    image: require('../src/imgs/coaches/Jordan.jpg'),
  },
};

export const COACH_NAMES = Object.keys(COACHES) as CoachName[];

export const DEFAULT_COACH: CoachName = 'Kai';
