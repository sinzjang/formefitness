// 프로필 UI 설정 — 아바타·닉네임·피드 (로컬 영속)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PulseWorkoutSnapshot } from '../lib/pulseWorkoutSnapshot';

export interface ProfileFeedPost {
  id: string;
  uri: string;
  caption: string;
  likes: number;
  likedByMe: boolean;
  createdAt: string;
  workoutSnapshot?: PulseWorkoutSnapshot;
}

interface ProfilePrefsState {
  avatarUri?: string;
  nickname: string;
  bio: string;
  hideEmail: boolean;
  country: string;
  region: string;
  hideWeight: boolean;
  followerCount: number;
  followingCount: number;
  feedPosts: ProfileFeedPost[];
  setAvatarUri: (uri: string | undefined) => void;
  setNickname: (name: string) => void;
  setBio: (bio: string) => void;
  setHideEmail: (hide: boolean) => void;
  setCountry: (country: string) => void;
  setRegion: (region: string) => void;
  setHideWeight: (hide: boolean) => void;
  addFeedPost: (uri: string, caption?: string, workoutSnapshot?: PulseWorkoutSnapshot) => void;
  removeFeedPost: (id: string) => void;
  toggleFeedPostLike: (id: string) => void;
  updateFeedPostCaption: (id: string, caption: string) => void;
}

function makeFeedId() {
  return `feed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const useProfilePrefsStore = create<ProfilePrefsState>()(
  persist(
    (set) => ({
      avatarUri: undefined,
      nickname: '',
      bio: '',
      hideEmail: false,
      country: '',
      region: '',
      hideWeight: false,
      followerCount: 0,
      followingCount: 0,
      feedPosts: [],

      setAvatarUri: (avatarUri) => set({ avatarUri }),
      setNickname: (nickname) => set({ nickname }),
      setBio: (bio) => set({ bio }),
      setHideEmail: (hideEmail) => set({ hideEmail }),
      setCountry: (country) => set({ country }),
      setRegion: (region) => set({ region }),
      setHideWeight: (hideWeight) => set({ hideWeight }),

      addFeedPost: (uri, caption = '', workoutSnapshot) =>
        set((state) => ({
          feedPosts: [
            {
              id: makeFeedId(),
              uri,
              caption: caption.trim(),
              likes: 0,
              likedByMe: false,
              createdAt: new Date().toISOString(),
              workoutSnapshot,
            },
            ...state.feedPosts,
          ].slice(0, 60),
        })),

      removeFeedPost: (id) =>
        set((state) => ({
          feedPosts: state.feedPosts.filter((p) => p.id !== id),
        })),

      toggleFeedPostLike: (id) =>
        set((state) => ({
          feedPosts: state.feedPosts.map((post) => {
            if (post.id !== id) return post;
            const likedByMe = !post.likedByMe;
            const currentLikes = post.likes ?? 0;
            return {
              ...post,
              likedByMe,
              likes: Math.max(0, currentLikes + (likedByMe ? 1 : -1)),
            };
          }),
        })),

      updateFeedPostCaption: (id, caption) =>
        set((state) => ({
          feedPosts: state.feedPosts.map((post) =>
            post.id === id ? { ...post, caption: caption.trim() } : post
          ),
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
