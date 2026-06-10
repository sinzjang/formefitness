// 로그아웃·계정 전환 시 로컬 운동 데이터 초기화
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocationStore } from '../../stores/locationStore';
import { useRoutineStore } from '../../stores/routineStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useCustomExerciseStore } from '../../stores/customExerciseStore';
import { useExerciseCatalogPrefsStore } from '../../stores/exerciseCatalogPrefsStore';

export const SYNC_USER_KEY = 'forme-workout-sync-user-id';

const DEFAULT_LOCATIONS = [
  { id: 'loc_gym', name: 'GYM', isSystem: true },
  { id: 'loc_home', name: 'HOME', isSystem: true },
] as const;

export async function clearLocalWorkoutData(): Promise<void> {
  useLocationStore.setState({
    locations: [...DEFAULT_LOCATIONS],
    selectedLocationId: 'loc_gym',
  });
  useRoutineStore.setState({ routines: [] });
  useHistoryStore.setState({ sessions: [] });
  useCustomExerciseStore.setState({ exercises: [] });
  useExerciseCatalogPrefsStore.setState({ prefs: {} });

  await AsyncStorage.removeItem(SYNC_USER_KEY);
}
