// Pulse 탭 — public social feed
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, typography } from '../../constants/theme';
import { Icon } from '../../components/ui/Icon';
import { PulseWorkoutSnapshotCard } from '../../components/pulse/PulseWorkoutSnapshotCard';
import { useAuthStore } from '../../stores/authStore';
import { useProfilePrefsStore, type ProfileFeedPost } from '../../stores/profilePrefsStore';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import {
  fetchPulsePosts,
  togglePulsePostLike,
  type PulsePost,
} from '../../lib/socialFeed';

type DisplayPost =
  | { source: 'remote'; post: PulsePost }
  | { source: 'local'; post: ProfileFeedPost };

export default function FeedScreen() {
  const lang = useLanguage();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const localPosts = useProfilePrefsStore((s) => s.feedPosts);
  const nickname = useProfilePrefsStore((s) => s.nickname);
  const toggleLocalLike = useProfilePrefsStore((s) => s.toggleFeedPostLike);
  const [remotePosts, setRemotePosts] = useState<PulsePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentWidth = width - layout.screenPadding * 2;
  const localDisplayName =
    nickname.trim() || profile?.displayName?.trim() || t('profileNicknamePlaceholder', lang);

  const loadRemotePosts = useCallback(async () => {
    try {
      setError(null);
      const posts = await fetchPulsePosts(user?.id);
      setRemotePosts(posts);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load Pulse';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadRemotePosts();
  }, [loadRemotePosts]);

  const displayPosts = useMemo<DisplayPost[]>(() => {
    if (remotePosts.length > 0) {
      return remotePosts.map((post) => ({ source: 'remote', post }));
    }
    return localPosts.map((post) => ({ source: 'local', post }));
  }, [localPosts, remotePosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadRemotePosts();
  };

  const handleLike = async (item: DisplayPost) => {
    if (item.source === 'local') {
      toggleLocalLike(item.post.id);
      return;
    }

    if (!user?.id) return;
    const post = item.post;
    setRemotePosts((prev) =>
      prev.map((candidate) =>
        candidate.id === post.id
          ? {
              ...candidate,
              likedByMe: !candidate.likedByMe,
              likeCount: Math.max(
                0,
                candidate.likeCount + (candidate.likedByMe ? -1 : 1)
              ),
            }
          : candidate
      )
    );

    try {
      await togglePulsePostLike({
        postId: post.id,
        userId: user.id,
        likedByMe: post.likedByMe,
      });
    } catch {
      void loadRemotePosts();
    }
  };

  const renderPost = ({ item }: { item: DisplayPost }) => {
    const isRemote = item.source === 'remote';
    const imageUri = isRemote ? item.post.imageUrl : item.post.uri;
    const caption = item.post.caption?.trim();
    const likes = isRemote ? item.post.likeCount : item.post.likes ?? 0;
    const liked = isRemote ? item.post.likedByMe : item.post.likedByMe ?? false;
    const displayName = isRemote ? item.post.author.displayName : localDisplayName;
    const avatarUrl = isRemote ? item.post.author.avatarUrl : null;
    const meta = isRemote ? 'Pulse post' : 'Local preview';
    const workoutSnapshot = item.post.workoutSnapshot;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.authorBlock}>
            <Text style={styles.authorName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.authorMeta}>{meta}</Text>
          </View>
        </View>

        <Image
          source={{ uri: imageUri }}
          style={[styles.postImage, { height: contentWidth }]}
          contentFit="cover"
          recyclingKey={`${item.source}-${item.post.id}`}
          transition={120}
        />

        <View style={styles.postBody}>
          <Pressable
            style={styles.likeRow}
            onPress={() => void handleLike(item)}
            hitSlop={8}
          >
            <Icon
              name="heart"
              size={20}
              color={liked ? colors.accent : colors.textPrimary}
              active={liked}
            />
            <Text style={[styles.likesText, liked && styles.likesTextActive]}>
              {likes} {t('profileFeedLikes', lang)}
            </Text>
          </Pressable>

          {caption ? (
            <Text style={styles.caption} numberOfLines={4}>
              <Text style={styles.captionName}>{displayName} </Text>
              {caption}
            </Text>
          ) : null}
          <PulseWorkoutSnapshotCard snapshot={workoutSnapshot} lang={lang} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={displayPosts}
        keyExtractor={(item) => `${item.source}-${item.post.id}`}
        renderItem={renderPost}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>PULSE</Text>
            <Text style={styles.subtitle}>Training moments moving through the Formé community</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            {loading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <>
                <Icon name="feed" size={28} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Pulse posts yet</Text>
                <Text style={styles.emptyText}>
                  Shared Formé posts will appear here once people publish.
                </Text>
              </>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 100,
    gap: 14,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    ...typography.sectionHeader,
    fontSize: 22,
  },
  subtitle: {
    ...typography.body,
    marginTop: 4,
  },
  errorText: {
    ...typography.caption,
    marginTop: 6,
    color: colors.danger,
  },
  postCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  postHeader: {
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  avatarText: {
    ...typography.listItem,
    fontSize: 14,
    color: colors.background,
  },
  authorBlock: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    ...typography.listItem,
    color: colors.textPrimary,
  },
  authorMeta: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textMuted,
  },
  postImage: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  postBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
  },
  likesText: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.textPrimary,
  },
  likesTextActive: {
    color: colors.accent,
  },
  caption: {
    ...typography.body,
    color: colors.textPrimary,
  },
  captionName: {
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
  },
  emptyCard: {
    minHeight: 180,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    ...typography.listItem,
    marginTop: 10,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.caption,
    marginTop: 4,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
