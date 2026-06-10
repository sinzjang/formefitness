// 프로필 닉네임 → Supabase profiles 동기화
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
