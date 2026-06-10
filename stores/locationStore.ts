// 운동 장소 상태 (GYM, HOME, 사용자 추가) — AsyncStorage 영속
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutLocation } from '../types';

const DEFAULT_LOCATIONS: WorkoutLocation[] = [
  { id: 'loc_gym', name: 'GYM', isSystem: true },
  { id: 'loc_home', name: 'HOME', isSystem: true },
];

interface LocationState {
  locations: WorkoutLocation[];
  selectedLocationId: string;
  setSelectedLocation: (id: string) => void;
  addLocation: (name: string) => void;
  replaceAll: (locations: WorkoutLocation[], keepSelectedId?: string) => void;
  getSelectedLocation: () => WorkoutLocation | undefined;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      locations: DEFAULT_LOCATIONS,
      selectedLocationId: 'loc_gym',

      setSelectedLocation: (id) => set({ selectedLocationId: id }),

      addLocation: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const id = `loc_${Date.now()}`;
        const location: WorkoutLocation = { id, name: trimmed.toUpperCase() };
        set((state) => ({
          locations: [...state.locations, location],
          selectedLocationId: id,
        }));
        void import('../lib/sync/workoutSync').then((m) => m.pushLocation(location));
      },

      replaceAll: (locations, keepSelectedId) =>
        set((state) => {
          const nextLocations = locations.length > 0 ? locations : DEFAULT_LOCATIONS;
          const selectedStillExists = nextLocations.some((l) => l.id === keepSelectedId);
          return {
            locations: nextLocations,
            selectedLocationId: selectedStillExists
              ? keepSelectedId!
              : (nextLocations[0]?.id ?? 'loc_gym'),
          };
        }),

      getSelectedLocation: () =>
        get().locations.find((l) => l.id === get().selectedLocationId),
    }),
    {
      name: 'forme-locations',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<LocationState> | undefined;
        return {
          ...current,
          ...p,
          locations:
            p?.locations && p.locations.length > 0 ? p.locations : DEFAULT_LOCATIONS,
          selectedLocationId: p?.selectedLocationId ?? 'loc_gym',
        };
      },
    }
  )
);
