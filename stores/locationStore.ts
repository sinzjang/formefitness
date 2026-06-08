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
        set((state) => ({
          locations: [...state.locations, { id, name: trimmed.toUpperCase() }],
          selectedLocationId: id,
        }));
      },

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
