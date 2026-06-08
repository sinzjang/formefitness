// 운동 종목 카탈로그 (근육 그룹 + 기구 + 주동근/협력근/안정근 매핑)
// 저항 타입은 gear에서 파생됨 (constants/gears.ts: gearToResistance)
// 근육명(primary/synergist/stabilizer)은 한글 키 → constants/anatomy.ts에서 다국어 변환
import type { Gear, Language, MuscleGroup } from '../types';

export interface ExerciseDef {
  name: string; // 운동 이름 (한글)
  nameEn: string; // 운동 이름 (영문)
  muscleGroup: MuscleGroup; // 타겟 부위 (Target 필터)
  gear: Gear; // 운동 기구 (Gear 필터)
  primary: string[]; // 주동근 (리스트에 표시)
  synergist: string[]; // 협력근 (리스트에 표시)
  stabilizer: string[]; // 안정근 (DB 전용, 화면 미표시)
  isCustom?: boolean; // 사용자 커스텀 운동
  customId?: string;
  /** RapidAPI ExerciseDB id (GIF) — scripts/data/forme_exercise_db_map.csv */
  exerciseDbId?: string;
}

export const EXERCISES: ExerciseDef[] = [
  // 가슴
  {
    name: '벤치프레스',
    nameEn: 'Bench Press',
    muscleGroup: 'chest',
    gear: 'Barbell',
    primary: ['대흉근'],
    synergist: ['삼두근', '전면삼각근'],
    stabilizer: ['회전근개', '코어'],
  },
  {
    name: '인클라인 벤치프레스',
    nameEn: 'Incline Bench Press',
    muscleGroup: 'chest',
    gear: 'Barbell',
    primary: ['대흉근 상부'],
    synergist: ['전면삼각근', '삼두근'],
    stabilizer: ['회전근개'],
  },
  {
    name: '덤벨 플라이',
    nameEn: 'Dumbbell Fly',
    muscleGroup: 'chest',
    gear: 'Dumbbell',
    primary: ['대흉근'],
    synergist: ['전면삼각근'],
    stabilizer: ['회전근개', '이두근'],
  },
  {
    name: '체스트 프레스 머신',
    nameEn: 'Chest Press Machine',
    muscleGroup: 'chest',
    gear: 'Machine',
    primary: ['대흉근'],
    synergist: ['삼두근', '전면삼각근'],
    stabilizer: ['코어'],
  },
  {
    name: '푸쉬업',
    nameEn: 'Push-up',
    muscleGroup: 'chest',
    gear: 'Body',
    primary: ['대흉근'],
    synergist: ['삼두근', '전면삼각근'],
    stabilizer: ['코어', '전거근'],
  },
  // 어깨
  {
    name: '오버헤드 프레스',
    nameEn: 'Overhead Press',
    muscleGroup: 'shoulder',
    gear: 'Barbell',
    primary: ['삼각근'],
    synergist: ['삼두근', '승모근 상부'],
    stabilizer: ['코어', '회전근개'],
  },
  {
    name: '사이드 레터럴 레이즈',
    nameEn: 'Side Lateral Raise',
    muscleGroup: 'shoulder',
    gear: 'Dumbbell',
    primary: ['측면삼각근'],
    synergist: ['승모근'],
    stabilizer: ['회전근개'],
  },
  {
    name: '프론트 레이즈',
    nameEn: 'Front Raise',
    muscleGroup: 'shoulder',
    gear: 'Dumbbell',
    primary: ['전면삼각근'],
    synergist: ['측면삼각근'],
    stabilizer: ['코어'],
  },
  {
    name: '리어 델트 플라이',
    nameEn: 'Rear Delt Fly',
    muscleGroup: 'shoulder',
    gear: 'Dumbbell',
    primary: ['후면삼각근'],
    synergist: ['능형근', '승모근'],
    stabilizer: ['회전근개'],
  },
  {
    name: '파이크 푸쉬업',
    nameEn: 'Pike Push-up',
    muscleGroup: 'shoulder',
    gear: 'Body',
    primary: ['삼각근'],
    synergist: ['삼두근'],
    stabilizer: ['코어', '전거근'],
  },
  {
    name: '플레이트 프론트 레이즈',
    nameEn: 'Plate Front Raise',
    muscleGroup: 'shoulder',
    gear: 'Plate',
    primary: ['전면삼각근'],
    synergist: ['측면삼각근'],
    stabilizer: ['코어'],
  },
  {
    name: '밴드 풀 어파트',
    nameEn: 'Band Pull-apart',
    muscleGroup: 'shoulder',
    gear: 'Band',
    primary: ['후면삼각근'],
    synergist: ['능형근', '승모근'],
    stabilizer: ['회전근개'],
  },
  // 등
  {
    name: '데드리프트',
    nameEn: 'Deadlift',
    muscleGroup: 'back',
    gear: 'Barbell',
    primary: ['척추기립근', '둔근', '햄스트링'],
    synergist: ['광배근', '승모근', '전완'],
    stabilizer: ['코어'],
  },
  {
    name: '랫풀다운',
    nameEn: 'Lat Pulldown',
    muscleGroup: 'back',
    gear: 'Machine',
    primary: ['광배근'],
    synergist: ['이두근', '능형근'],
    stabilizer: ['회전근개'],
  },
  {
    name: '바벨 로우',
    nameEn: 'Barbell Row',
    muscleGroup: 'back',
    gear: 'Barbell',
    primary: ['광배근'],
    synergist: ['능형근', '승모근', '이두근'],
    stabilizer: ['척추기립근', '코어'],
  },
  {
    name: '시티드 케이블 로우',
    nameEn: 'Seated Cable Row',
    muscleGroup: 'back',
    gear: 'Machine',
    primary: ['광배근'],
    synergist: ['능형근', '승모근', '이두근'],
    stabilizer: ['척추기립근'],
  },
  {
    name: '풀업',
    nameEn: 'Pull-up',
    muscleGroup: 'back',
    gear: 'Body',
    primary: ['광배근'],
    synergist: ['이두근', '능형근'],
    stabilizer: ['코어'],
  },
  // 팔
  {
    name: '바벨 컬',
    nameEn: 'Barbell Curl',
    muscleGroup: 'arms',
    gear: 'Barbell',
    primary: ['이두근'],
    synergist: ['상완근'],
    stabilizer: ['전면삼각근', '전완'],
  },
  {
    name: '덤벨 컬',
    nameEn: 'Dumbbell Curl',
    muscleGroup: 'arms',
    gear: 'Dumbbell',
    primary: ['이두근'],
    synergist: ['상완근'],
    stabilizer: ['전완'],
  },
  {
    name: '해머 컬',
    nameEn: 'Hammer Curl',
    muscleGroup: 'arms',
    gear: 'Dumbbell',
    primary: ['상완요골근', '이두근'],
    synergist: ['상완근'],
    stabilizer: ['전완'],
  },
  {
    name: '트라이셉스 푸쉬다운',
    nameEn: 'Triceps Pushdown',
    muscleGroup: 'arms',
    gear: 'Machine',
    primary: ['삼두근'],
    synergist: [],
    stabilizer: ['코어'],
  },
  {
    name: '딥스',
    nameEn: 'Dips',
    muscleGroup: 'arms',
    gear: 'Body',
    primary: ['삼두근'],
    synergist: ['대흉근 하부', '전면삼각근'],
    stabilizer: ['코어'],
  },
  {
    name: '밴드 트라이셉스 푸쉬다운',
    nameEn: 'Band Triceps Pushdown',
    muscleGroup: 'arms',
    gear: 'Band',
    primary: ['삼두근'],
    synergist: [],
    stabilizer: ['코어'],
  },
  // 코어
  {
    name: '플랭크',
    nameEn: 'Plank',
    muscleGroup: 'core',
    gear: 'Body',
    primary: ['복직근'],
    synergist: ['복횡근', '척추기립근'],
    stabilizer: ['둔근', '어깨'],
  },
  {
    name: '행잉 레그 레이즈',
    nameEn: 'Hanging Leg Raise',
    muscleGroup: 'core',
    gear: 'Body',
    primary: ['복직근 하부'],
    synergist: ['장요근'],
    stabilizer: ['전완', '광배근'],
  },
  {
    name: '크런치',
    nameEn: 'Crunch',
    muscleGroup: 'core',
    gear: 'Body',
    primary: ['복직근'],
    synergist: ['복사근'],
    stabilizer: [],
  },
  {
    name: '러시안 트위스트',
    nameEn: 'Russian Twist',
    muscleGroup: 'core',
    gear: 'Plate',
    primary: ['복사근'],
    synergist: ['복직근'],
    stabilizer: ['척추기립근'],
  },
  // 하체
  {
    name: '스쿼트',
    nameEn: 'Squat',
    muscleGroup: 'legs',
    gear: 'Barbell',
    primary: ['대퇴사두근', '둔근'],
    synergist: ['햄스트링', '내전근'],
    stabilizer: ['코어', '척추기립근'],
  },
  {
    name: '레그 프레스',
    nameEn: 'Leg Press',
    muscleGroup: 'legs',
    gear: 'Machine',
    primary: ['대퇴사두근'],
    synergist: ['둔근', '햄스트링'],
    stabilizer: ['코어'],
  },
  {
    name: '런지',
    nameEn: 'Lunge',
    muscleGroup: 'legs',
    gear: 'Dumbbell',
    primary: ['대퇴사두근', '둔근'],
    synergist: ['햄스트링'],
    stabilizer: ['코어'],
  },
  {
    name: '레그 익스텐션',
    nameEn: 'Leg Extension',
    muscleGroup: 'legs',
    gear: 'Machine',
    primary: ['대퇴사두근'],
    synergist: [],
    stabilizer: [],
  },
  {
    name: '레그 컬',
    nameEn: 'Leg Curl',
    muscleGroup: 'legs',
    gear: 'Machine',
    primary: ['햄스트링'],
    synergist: ['비복근'],
    stabilizer: [],
  },
  {
    name: '카프 레이즈',
    nameEn: 'Calf Raise',
    muscleGroup: 'legs',
    gear: 'Machine',
    primary: ['비복근', '가자미근'],
    synergist: [],
    stabilizer: [],
  },
  {
    name: '케틀벨 스윙',
    nameEn: 'Kettlebell Swing',
    muscleGroup: 'legs',
    gear: 'Kettlebell',
    primary: ['둔근', '햄스트링'],
    synergist: ['척추기립근', '광배근'],
    stabilizer: ['코어'],
  },
];

// 근육 그룹별로 그룹화된 운동 목록 (피커에서 사용)
export const exercisesByMuscle = (group: MuscleGroup): ExerciseDef[] =>
  EXERCISES.filter((e) => e.muscleGroup === group);

// 운동 이름 → 현재 언어
export const exerciseName = (ex: ExerciseDef, lang: Language): string =>
  lang === 'en' ? ex.nameEn : ex.name;
