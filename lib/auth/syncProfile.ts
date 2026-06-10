// OAuth 로그인 후 profiles에 이메일·표시 이름 동기화
import { supabase } from '../supabase';

type OAuthProfilePatch = {
  email?: string | null;
  displayName?: string | null;
};

export async function syncProfileAfterOAuth(
  userId: string,
  patch: OAuthProfilePatch
): Promise<void> {
  const updates: Record<string, string> = {};

  const email = patch.email?.trim();
  if (email) updates.email = email;

  const displayName = patch.displayName?.trim();
  if (displayName) updates.display_name = displayName;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}
