// 프로필 공개 정보 → Supabase profiles 동기화
import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';

export async function syncNicknameToRemote(nickname: string): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const trimmed = nickname.trim();
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed || null })
    .eq('id', userId);

  if (error) throw error;

  const profile = useAuthStore.getState().profile;
  if (profile) {
    useAuthStore.setState({
      profile: { ...profile, displayName: trimmed || undefined },
    });
  }
}

export async function syncPublicProfileToRemote(params: {
  nickname: string;
  bio: string;
}): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const nickname = params.nickname.trim();
  const bio = params.bio.trim();
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: nickname || null,
      bio: bio || null,
    })
    .eq('id', userId);

  if (error) throw error;

  const profile = useAuthStore.getState().profile;
  if (profile) {
    useAuthStore.setState({
      profile: { ...profile, displayName: nickname || undefined },
    });
  }
}
