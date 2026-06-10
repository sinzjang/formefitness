// 프로필 UI 설정 — 아바타·닉네임·피드 (로컬 영속)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProfileFeedPost {
  id: string;
  uri: string;
  createdAt: string;
}

interface ProfilePrefsState {
  avatarUri?: string;
  nickname: string;
  hideEmail: boolean;
  country: string;
  region: string;
  hideWeight: boolean;
  feedPosts: ProfileFeedPost[];
  setAvatarUri: (uri: string | undefined) => void;
  setNickname: (name: string) => void;
  setHideEmail: (hide: boolean) => void;
  setCountry: (country: string) => void;
  setRegion: (region: string) => void;
  setHideWeight: (hide: boolean) => void;
  addFeedPost: (uri: string) => void;
  removeFeedPost: (id: string) => void;
}

function makeFeedId() {
  return `feed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const useProfilePrefsStore = create<ProfilePrefsState>()(
  persist(
    (set) => ({
      avatarUri: undefined,
      nickname: '',
      hideEmail: false,
      country: '',
      region: '',
      hideWeight: false,
      feedPosts: [],

      setAvatarUri: (avatarUri) => set({ avatarUri }),
      setNickname: (nickname) => set({ nickname }),
      setHideEmail: (hideEmail) => set({ hideEmail }),
      setCountry: (country) => set({ country }),
      setRegion: (region) => set({ region }),
      setHideWeight: (hideWeight) => set({ hideWeight }),

      addFeedPost: (uri) =>
        set((state) => ({
          feedPosts: [
            { id: makeFeedId(), uri, createdAt: new Date().toISOString() },
            ...state.feedPosts,
          ].slice(0, 60),
        })),

      removeFeedPost: (id) =>
        set((state) => ({
          feedPosts: state.feedPosts.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'forme-profile-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** 코치가 부를 사용자 이름 — 닉네임 우선 */
export function getCoachUserDisplayName(
  profileDisplayName?: string | null
): string | undefined {
  const nick = useProfilePrefsStore.getState().nickname.trim();
  if (nick) return nick;
  const fromProfile = profileDisplayName?.trim();
  return fromProfile || undefined;
}
