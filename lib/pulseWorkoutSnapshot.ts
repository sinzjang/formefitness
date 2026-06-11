import { isoToLocalDateKey, toLocalDateKey } from './dates';
import type {
  BandLevel,
  Language,
  MuscleGroup,
  ResistanceType,
  SavedWorkoutSession,
} from '../types';

export interface PulseWorkoutExerciseSummary {
  exerciseKey: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  resistanceType: ResistanceType;
  line: string;
}

export interface PulseWorkoutSnapshot {
  sessionId: string;
  dateKey: string;
  title: string;
  exercises: PulseWorkoutExerciseSummary[];
}

const BAND_ORDER: BandLevel[] = ['Light', 'Medium', 'Heavy', 'X-Heavy'];

function formatRange(values: number[], suffix = '') {
  const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value)))).sort(
    (a, b) => a - b
  );
  if (unique.length === 0) return '';
  const first = unique[0];
  const last = unique[unique.length - 1];
  return first === last ? `${first}${suffix}` : `${first}-${last}${suffix}`;
}

function formatBandRange(values: BandLevel[]) {
  const indexes = values
    .map((value) => BAND_ORDER.indexOf(value))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (indexes.length === 0) return '';
  const first = BAND_ORDER[indexes[0]];
  const last = BAND_ORDER[indexes[indexes.length - 1]];
  return first === last ? first : `${first}-${last}`;
}

function localName(name: SavedWorkoutSession['exercises'][number]['exerciseName'], lang: Language) {
  return name[lang] || name.en || name.ko;
}

function formatExerciseLine(
  exercise: SavedWorkoutSession['exercises'][number],
  lang: Language,
  weightUnit: 'lb' | 'kg'
) {
  const completedSets = exercise.sets.filter((set) => set.completed || set.reps > 0);
  const reps = formatRange(completedSets.map((set) => set.reps).filter((value) => value > 0));
  const setCount = completedSets.length;
  const name = localName(exercise.exerciseName, lang);
  const repsPart = reps ? `${reps} reps` : lang === 'ko' ? 'reps 미기록' : 'reps not set';
  const setPart = `${setCount} sets`;

  if (exercise.resistanceType === 'band') {
    const level = formatBandRange(
      completedSets.map((set) => set.bandLevel).filter(Boolean) as BandLevel[]
    );
    return `${name} ${level ? `${level} · ` : ''}${repsPart} x ${setPart}`;
  }

  if (exercise.resistanceType === 'bodyweight') {
    const added = formatRange(
      completedSets
        .map((set) => set.bwAddedLb)
        .filter((value): value is number => value != null && value > 0),
      ` ${weightUnit}`
    );
    return `${name} ${added ? `BW +${added} · ` : ''}${repsPart} x ${setPart}`;
  }

  const weights = completedSets
    .map((set) => set.weightLb)
    .filter((value): value is number => value != null && value > 0)
    .map((value) => (weightUnit === 'kg' ? Math.round(value * 0.453592 * 10) / 10 : value));
  const weight = formatRange(weights, ` ${weightUnit}`);
  return `${name} ${weight ? `${weight} · ` : ''}${repsPart} x ${setPart}`;
}

export function buildTodayPulseWorkoutSnapshot(params: {
  sessions: SavedWorkoutSession[];
  lang: Language;
  weightUnit: 'lb' | 'kg';
  now?: Date;
}): PulseWorkoutSnapshot | null {
  const todayKey = toLocalDateKey(params.now ?? new Date());
  const session = params.sessions
    .filter((candidate) => isoToLocalDateKey(candidate.endedAt) === todayKey)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0];

  if (!session) return null;

  const exercises = session.exercises
    .map((exercise) => {
      const hasWork = exercise.sets.some((set) => set.completed || set.reps > 0);
      if (!hasWork) return null;
      return {
        exerciseKey: exercise.exerciseKey,
        exerciseName: localName(exercise.exerciseName, params.lang),
        muscleGroup: exercise.muscleGroup,
        resistanceType: exercise.resistanceType,
        line: formatExerciseLine(exercise, params.lang, params.weightUnit),
      };
    })
    .filter((exercise): exercise is PulseWorkoutExerciseSummary => exercise != null);

  if (exercises.length === 0) return null;

  return {
    sessionId: session.id,
    dateKey: todayKey,
    title: params.lang === 'ko' ? '오늘 운동' : "Today's workout",
    exercises,
  };
}
