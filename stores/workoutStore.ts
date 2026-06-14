// 진행 중인 운동 세션 상태 (Zustand)
import { create } from 'zustand';
import type {
  ExerciseRestSeconds,
  LocalizedText,
  MuscleGroup,
  ResistanceType,
  SetData,
  WorkoutExercise,
  WorkoutSession,
} from '../types';

// 새 세트 기본값 (저항 타입은 운동에 고정되므로 세트엔 없음)
const makeDefaultSet = (setNumber: number): SetData => ({
  setNumber,
  reps: 0,
  completed: false,
});

interface WorkoutState {
  session: WorkoutSession | null;
  /** 운동 로깅 화면 표시 여부 (false면 루틴 목록·다른 탭으로 이동 가능) */
  sessionScreenOpen: boolean;
  sessionPaused: boolean;
  sessionPausedAtMs: number | null;
  sessionAccumulatedPauseMs: number;
  startSession: (locationId: string, routineId?: string) => void;
  /** Progress 달력 + 버튼 — 특정 날짜로 수동 세션 시작 (루틴 없음) */
  startManualSession: (date: Date) => void;
  beginSession: () => void;
  openSessionScreen: () => void;
  closeSessionScreen: () => void;
  toggleSessionPause: () => void;
  endSession: () => void;
  reset: () => void;
  addExercise: (
    name: LocalizedText,
    muscleGroup: MuscleGroup,
    resistanceType: ResistanceType,
    restSeconds?: ExerciseRestSeconds,
    customId?: string
  ) => void;
  addSet: (exerciseId: string) => void;
  deleteSet: (exerciseId: string, setNumber: number) => void;
  updateSet: (exerciseId: string, setNumber: number, data: Partial<SetData>) => void;
  setRestSeconds: (exerciseId: string, seconds: ExerciseRestSeconds) => void;
  reorderExercises: (exercises: WorkoutExercise[]) => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  session: null,
  sessionScreenOpen: false,
  sessionPaused: false,
  sessionPausedAtMs: null,
  sessionAccumulatedPauseMs: 0,

  startSession: (locationId, routineId) =>
    set({
      session: {
        id: `session_${Date.now()}`,
        startedAt: new Date().toISOString(),
        locationId,
        routineId,
        exercises: [],
      },
      sessionScreenOpen: true,
      sessionPaused: false,
      sessionPausedAtMs: null,
      sessionAccumulatedPauseMs: 0,
    }),

  startManualSession: (date) => {
    // 선택 날짜의 정오(12:00)를 startedAt으로 설정 — 달력에서 해당 날짜로 표시됨
    const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    // saveManualSession과 동일한 ID 포맷 사용 → upsert 시 같은 레코드로 덮어씀
    const noonIso = noon.toISOString();
    set({
      session: {
        id: `manual_${noonIso}`,
        startedAt: noonIso,
        locationId: undefined,
        routineId: undefined,
        exercises: [],
      },
      sessionScreenOpen: true,
      sessionPaused: false,
      sessionPausedAtMs: null,
      sessionAccumulatedPauseMs: 0,
    });
  },

  beginSession: () =>
    set((state) => {
      if (!state.session || state.session.runningStartedAt) return state;
      const now = new Date().toISOString();
      return {
        session: {
          ...state.session,
          startedAt: now,
          runningStartedAt: now,
        },
        sessionScreenOpen: true,
      };
    }),

  openSessionScreen: () => set({ sessionScreenOpen: true }),

  closeSessionScreen: () => set({ sessionScreenOpen: false }),

  toggleSessionPause: () =>
    set((state) => {
      if (!state.session?.runningStartedAt) return state;

      if (state.sessionPaused) {
        const extra =
          state.sessionPausedAtMs != null ? Date.now() - state.sessionPausedAtMs : 0;
        return {
          sessionPaused: false,
          sessionPausedAtMs: null,
          sessionAccumulatedPauseMs: state.sessionAccumulatedPauseMs + extra,
        };
      }

      return {
        sessionPaused: true,
        sessionPausedAtMs: Date.now(),
      };
    }),

  endSession: () =>
    set((state) =>
      state.session
        ? { session: { ...state.session, endedAt: new Date().toISOString() } }
        : state
    ),

  reset: () =>
    set({
      session: null,
      sessionScreenOpen: false,
      sessionPaused: false,
      sessionPausedAtMs: null,
      sessionAccumulatedPauseMs: 0,
    }),

  addExercise: (name, muscleGroup, resistanceType, restSeconds, customId) =>
    set((state) => {
      if (!state.session) return state;
      const newExercise: WorkoutExercise = {
        id: `ex_${Date.now()}_${state.session.exercises.length}`,
        exerciseName: name,
        muscleGroup,
        resistanceType,
        exerciseOrder: state.session.exercises.length,
        defaultRestSeconds: restSeconds ?? 0,
        sets: [makeDefaultSet(1)],
        customId,
      };
      return { session: { ...state.session, exercises: [...state.session.exercises, newExercise] } };
    }),

  addSet: (exerciseId) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = state.session.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const nextNumber = ex.sets.length + 1;
        return { ...ex, sets: [...ex.sets, makeDefaultSet(nextNumber)] };
      });
      return { session: { ...state.session, exercises } };
    }),

  deleteSet: (exerciseId, setNumber) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = state.session.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        // 삭제 후 세트 번호 재정렬
        const remaining = ex.sets
          .filter((s) => s.setNumber !== setNumber)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...ex, sets: remaining };
      });
      return { session: { ...state.session, exercises } };
    }),

  updateSet: (exerciseId, setNumber, data) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = state.session.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.setNumber === setNumber ? { ...s, ...data } : s)),
            }
          : ex
      );
      return { session: { ...state.session, exercises } };
    }),

  setRestSeconds: (exerciseId, seconds) =>
    set((state) => {
      if (!state.session) return state;
      const exercises = state.session.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, defaultRestSeconds: seconds } : ex
      );
      return { session: { ...state.session, exercises } };
    }),

  reorderExercises: (exercises) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          exercises: exercises.map((ex, index) => ({ ...ex, exerciseOrder: index })),
        },
      };
    }),
}));
