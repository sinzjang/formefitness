// Pulse social feed — Supabase Storage + public posts
import * as FileSystem from 'expo-file-system/legacy';
import { isSupabaseConfigured, supabase } from './supabase';
import type { PulseWorkoutSnapshot } from './pulseWorkoutSnapshot';

const PULSE_BUCKET = 'pulse-posts';

export interface PulseAuthor {
  id: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface PulsePost {
  id: string;
  authorId: string;
  author: PulseAuthor;
  imageUrl: string;
  imagePath: string;
  caption: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  workoutSnapshot?: PulseWorkoutSnapshot;
}

interface DbSocialPost {
  id: string;
  author_id: string;
  image_path: string;
  caption: string | null;
  workout_snapshot?: PulseWorkoutSnapshot | null;
  like_count: number | null;
  created_at: string;
}

interface DbPublicProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let bufferLength = (base64.length * 3) / 4;
  if (base64.endsWith('==')) bufferLength -= 2;
  else if (base64.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = BASE64_CHARS.indexOf(base64[i]);
    const encoded2 = BASE64_CHARS.indexOf(base64[i + 1]);
    const encoded3 = BASE64_CHARS.indexOf(base64[i + 2]);
    const encoded4 = BASE64_CHARS.indexOf(base64[i + 3]);

    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

    if (p < bufferLength) bytes[p++] = (bitmap >> 16) & 255;
    if (p < bufferLength) bytes[p++] = (bitmap >> 8) & 255;
    if (p < bufferLength) bytes[p++] = bitmap & 255;
  }

  return bytes.buffer;
}

function publicImageUrl(path: string) {
  return supabase.storage.from(PULSE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function makePostPath(userId: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}_${suffix}.jpg`;
}

export async function publishPulsePost(params: {
  userId: string;
  imageUri: string;
  caption: string;
  workoutSnapshot?: PulseWorkoutSnapshot;
}): Promise<PulsePost | null> {
  if (!isSupabaseConfigured) return null;

  const imageBase64 = await FileSystem.readAsStringAsync(params.imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const imageData = base64ToArrayBuffer(imageBase64);
  const imagePath = makePostPath(params.userId);

  const upload = await supabase.storage
    .from(PULSE_BUCKET)
    .upload(imagePath, imageData, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (upload.error) throw upload.error;

  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      author_id: params.userId,
      image_path: imagePath,
      caption: params.caption.trim(),
      workout_snapshot: params.workoutSnapshot ?? null,
      visibility: 'public',
    })
    .select('id, author_id, image_path, caption, workout_snapshot, like_count, created_at')
    .single();

  if (error) throw error;

  const [post] = await hydratePulsePosts([data as DbSocialPost], params.userId);
  return post ?? null;
}

export async function fetchPulsePosts(currentUserId?: string | null): Promise<PulsePost[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('social_posts')
    .select('id, author_id, image_path, caption, workout_snapshot, like_count, created_at')
    .eq('status', 'active')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return hydratePulsePosts((data ?? []) as DbSocialPost[], currentUserId);
}

export async function togglePulsePostLike(params: {
  postId: string;
  userId: string;
  likedByMe: boolean;
}) {
  if (!isSupabaseConfigured) return;

  if (params.likedByMe) {
    const { error } = await supabase
      .from('social_post_likes')
      .delete()
      .eq('post_id', params.postId)
      .eq('user_id', params.userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('social_post_likes')
    .insert({ post_id: params.postId, user_id: params.userId });
  if (error) throw error;
}

async function hydratePulsePosts(
  posts: DbSocialPost[],
  currentUserId?: string | null
): Promise<PulsePost[]> {
  if (posts.length === 0) return [];

  const authorIds = Array.from(new Set(posts.map((post) => post.author_id)));
  const postIds = posts.map((post) => post.id);

  const profilesRes = await supabase
    .from('public_profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', authorIds);

  if (profilesRes.error) throw profilesRes.error;

  const likedIds = new Set<string>();
  if (currentUserId) {
    const likesRes = await supabase
      .from('social_post_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds);

    if (likesRes.error) throw likesRes.error;
    for (const like of likesRes.data ?? []) {
      const postId = (like as { post_id?: string }).post_id;
      if (postId) likedIds.add(postId);
    }
  }

  const profileMap = new Map(
    ((profilesRes.data ?? []) as DbPublicProfile[]).map((profile) => [profile.id, profile])
  );

  return posts.map((post) => {
    const authorProfile = profileMap.get(post.author_id);
    const displayName = authorProfile?.display_name?.trim() || 'Guest';

    return {
      id: post.id,
      authorId: post.author_id,
      author: {
        id: post.author_id,
        displayName,
        username: authorProfile?.username,
        avatarUrl: authorProfile?.avatar_url,
      },
      imageUrl: publicImageUrl(post.image_path),
      imagePath: post.image_path,
      caption: post.caption?.trim() ?? '',
      likeCount: post.like_count ?? 0,
      likedByMe: likedIds.has(post.id),
      createdAt: post.created_at,
      workoutSnapshot: post.workout_snapshot ?? undefined,
    };
  });
}
