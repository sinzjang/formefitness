// Supabase 클라이언트 — Expo + AsyncStorage 세션 유지
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log('[supabase] URL:', supabaseUrl || '(없음)');
console.log('[supabase] KEY set:', Boolean(supabaseAnonKey));
if (!isSupabaseConfigured) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL 또는 EXPO_PUBLIC_SUPABASE_ANON_KEY가 없습니다.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  }
);
