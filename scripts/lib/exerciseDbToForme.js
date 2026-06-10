/**
 * ExerciseDB target / secondaryMuscle → anatomy.ts 한글 키
 */
const TARGET_TO_KO = {
  pectorals: '대흉근',
  lats: '광배근',
  abs: '복직근',
  delts: '삼각근',
  biceps: '이두근',
  triceps: '삼두근',
  quads: '대퇴사두근',
  quadriceps: '대퇴사두근',
  glutes: '둔근',
  hamstrings: '햄스트링',
  calves: '비복근',
  forearms: '전완',
  traps: '승모근',
  rhomboids: '능형근',
  'upper back': '능형근',
  'lower back': '척추기립근',
  spine: '척추기립근',
  adductors: '내전근',
  abductors: '외전근',
  obliques: '복사근',
  'serratus anterior': '전거근',
  'levator scapulae': '승모근',
  'cardiovascular system': '코어',
  'hip flexors': '장요근',
  groin: '내전근',
  'inner thighs': '내전근',
  'outer thighs': '외전근',
  shins: '비복근',
  ankles: '비복근',
  feet: '비복근',
  'ankle stabilizers': '비복근',
  'lower abs': '복직근 하부',
  back: '척추기립근',
  brachialis: '상완근',
  'brachioradialis': '상완요골근',
  soleus: '가자미근',
  'rear deltoids': '후면삼각근',
  'front delts': '전면삼각근',
  'side delts': '측면삼각근',
};

const SECONDARY_TO_KO = {
  ...TARGET_TO_KO,
  shoulders: '삼각근',
  triceps: '삼두근',
  biceps: '이두근',
  chest: '대흉근',
  'lower back': '척추기립근',
  'hip flexors': '장요근',
  'rotator cuff': '회전근개',
  core: '코어',
  'serratus anterior': '전거근',
  'gluteus maximus': '둔근',
  'gluteus medius': '둔근',
  quadriceps: '대퇴사두근',
  'quadriceps femoris': '대퇴사두근',
  gastrocnemius: '비복근',
  'soleus muscle': '가자미근',
  abductors: '외전근',
  ankles: '비복근',
  feet: '비복근',
  'ankle stabilizers': '비복근',
  'lower abs': '복직근 하부',
  back: '척추기립근',
};

/** bodyPart → Forme MuscleGroup */
const BODY_PART_TO_GROUP = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulder',
  'upper arms': 'arms',
  'lower arms': 'arms',
  waist: 'core',
  'upper legs': 'legs',
  'lower legs': 'legs',
  cardio: 'core',
  neck: 'shoulder',
};

/** equipment → Forme Gear */
const EQUIPMENT_TO_GEAR = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  'body weight': 'Body',
  cable: 'Machine',
  'leverage machine': 'Machine',
  'smith machine': 'Machine',
  'resistance band': 'Band',
  band: 'Band',
  'ez barbell': 'Barbell',
  weighted: 'Body',
  'medicine ball': 'Plate',
  'stability ball': 'Body',
  'olympic barbell': 'Barbell',
  'trap bar': 'Barbell',
  'sled machine': 'Machine',
  'upper body ergometer': 'Machine',
  'wheel roller': 'Body',
  assisted: 'Machine',
  'bosu ball': 'Body',
  rope: 'Body',
  'stationary bike': 'Machine',
  'elliptical machine': 'Machine',
  'stepmill machine': 'Machine',
  'skierg machine': 'Machine',
  tire: 'Body',
};

function mapTarget(target) {
  const key = String(target ?? '').toLowerCase().trim();
  return TARGET_TO_KO[key] ?? target;
}

function mapSecondary(muscles) {
  return (muscles ?? [])
    .map((m) => {
      const key = String(m).toLowerCase().trim();
      return SECONDARY_TO_KO[key] ?? m;
    })
    .filter((m, i, arr) => m && arr.indexOf(m) === i);
}

function mapBodyPart(bodyPart) {
  const key = String(bodyPart ?? '').toLowerCase().trim();
  return BODY_PART_TO_GROUP[key] ?? 'core';
}

function mapGear(equipment) {
  const key = String(equipment ?? '').toLowerCase().trim();
  return EQUIPMENT_TO_GEAR[key] ?? 'Machine';
}

/** ExerciseDB 레코드 → Forme ExerciseDef (ko.json id 키로 한글명 병합) */
function toFormeExercise(record, koById = {}) {
  const exerciseDbId = String(record.id ?? '').padStart(4, '0');
  const nameEn = String(record.name ?? '').trim();
  const ko = koById[exerciseDbId];
  const primaryKo = mapTarget(record.target);
  const synergistKo = mapSecondary(record.secondaryMuscles).filter((m) => m !== primaryKo);

  return {
    name: String(ko?.name_ko ?? '').trim() || nameEn,
    nameEn,
    muscleGroup: mapBodyPart(record.bodyPart),
    gear: mapGear(record.equipment),
    primary: primaryKo ? [primaryKo] : [],
    synergist: synergistKo.slice(0, 4),
    stabilizer: ['코어'],
    exerciseDbId,
    gifUrl: String(record.gifUrl ?? '').trim() || undefined,
    is_active: record.is_active === true,
    is_favorite: record.is_favorite === true,
  };
}

module.exports = {
  toFormeExercise,
  mapBodyPart,
  mapGear,
  mapTarget,
};
