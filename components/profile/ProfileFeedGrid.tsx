// 프로필 피드 — Instagram형 카드 가상 리스트
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, layout, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from '../ui/Icon';
import { useAuthStore } from '../../stores/authStore';
import { useProfilePrefsStore, type ProfileFeedPost } from '../../stores/profilePrefsStore';
import { useHistoryStore } from '../../stores/historyStore';
import { pickImageFromLibrary } from '../../lib/pickImage';
import { publishPulsePost } from '../../lib/socialFeed';
import { buildTodayPulseWorkoutSnapshot } from '../../lib/pulseWorkoutSnapshot';
import { ImageCropModal } from '../ui/ImageCropModal';
import { PulseWorkoutSnapshotCard } from '../pulse/PulseWorkoutSnapshotCard';

const GAP = 14;
const GRID_COLS = 3;
const GRID_GAP = 2;

interface ProfileFeedGridProps {
  lang: Language;
  header?: ReactNode;
}

type FeedTile =
  | { type: 'post'; post: ProfileFeedPost };
type ViewMode = 'feed' | 'grid';

export function ProfileFeedGrid({ lang, header }: ProfileFeedGridProps) {
  const { width } = useWindowDimensions();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const sessions = useHistoryStore((s) => s.sessions);
  const feedPosts = useProfilePrefsStore((s) => s.feedPosts);
  const addFeedPost = useProfilePrefsStore((s) => s.addFeedPost);
  const removeFeedPost = useProfilePrefsStore((s) => s.removeFeedPost);
  const toggleFeedPostLike = useProfilePrefsStore((s) => s.toggleFeedPostLike);
  const nickname = useProfilePrefsStore((s) => s.nickname);
  const [cropTarget, setCropTarget] = useState<{
    uri: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [includeWorkout, setIncludeWorkout] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [publishing, setPublishing] = useState(false);

  const contentWidth = width - layout.screenPadding * 2;
  const gridCellSize = (contentWidth - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const displayName = nickname.trim() || profile?.displayName?.trim() || t('profileNicknamePlaceholder', lang);
  const tiles: FeedTile[] = feedPosts.map((post) => ({ type: 'post' as const, post }));
  const workoutSnapshot = useMemo(
    () =>
      buildTodayPulseWorkoutSnapshot({
        sessions,
        lang,
        weightUnit: profile?.weightUnit ?? 'kg',
      }),
    [lang, profile?.weightUnit, sessions]
  );

  useEffect(() => {
    if (pendingUri) setIncludeWorkout(true);
  }, [pendingUri]);

  const handleAdd = () => {
    void pickImageFromLibrary().then((picked) => {
      if (picked) setCropTarget(picked);
    });
  };

  const handleDeletePost = (id: string) => {
    Alert.alert(t('profileFeedDelete', lang), t('profileFeedDeleteConfirm', lang), [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: t('delete', lang),
        style: 'destructive',
        onPress: () => removeFeedPost(id),
      },
    ]);
  };

  const handlePublish = async () => {
    if (!pendingUri) return;
    const imageUri = pendingUri;
    const caption = captionDraft;
    const selectedSnapshot = includeWorkout ? workoutSnapshot ?? undefined : undefined;

    setPublishing(true);
    try {
      addFeedPost(imageUri, caption, selectedSnapshot);
      if (user?.id) {
        await publishPulsePost({
          userId: user.id,
          imageUri,
          caption,
          workoutSnapshot: selectedSnapshot,
        });
      }
      setPendingUri(null);
      setCaptionDraft('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pulse upload failed';
      Alert.alert('Pulse', message);
    } finally {
      setPublishing(false);
    }
  };

  const renderFeedTile = ({ item }: ListRenderItemInfo<FeedTile>) => {
    const likes = item.post.likes ?? 0;
    const liked = item.post.likedByMe ?? false;
    const caption = item.post.caption?.trim();

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Text style={styles.postAuthor} numberOfLines={1}>
            {displayName}
          </Text>
          <Pressable onPress={() => handleDeletePost(item.post.id)} hitSlop={8}>
            <Icon name="trash" size={17} color={colors.textMuted} />
          </Pressable>
        </View>

        <Image
          source={{ uri: item.post.uri }}
          style={[styles.postImage, { height: contentWidth }]}
          contentFit="cover"
          recyclingKey={item.post.id}
          transition={120}
        />

        <View style={styles.postBody}>
          <Pressable
            style={styles.likeRow}
            onPress={() => toggleFeedPostLike(item.post.id)}
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
            <Text style={styles.caption} numberOfLines={3}>
              <Text style={styles.captionName}>{displayName} </Text>
              {caption}
            </Text>
          ) : null}
          <PulseWorkoutSnapshotCard snapshot={item.post.workoutSnapshot} lang={lang} />
        </View>
      </View>
    );
  };

  const renderGridTile = ({ item }: ListRenderItemInfo<FeedTile>) => {
    return (
      <Pressable
        style={[styles.gridTile, { width: gridCellSize, height: gridCellSize }]}
        onLongPress={() => handleDeletePost(item.post.id)}
        onPress={() => setViewMode('feed')}
      >
        <Image
          source={{ uri: item.post.uri }}
          style={styles.gridImage}
          contentFit="cover"
          recyclingKey={`grid-${item.post.id}`}
          transition={100}
        />
        {(item.post.likes ?? 0) > 0 ? (
          <View style={styles.gridLikeBadge}>
            <Icon name="heart" size={11} color={colors.background} active />
            <Text style={styles.gridLikeText}>{item.post.likes}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderTile = viewMode === 'feed' ? renderFeedTile : renderGridTile;

  return (
    <View style={styles.container}>
      <FlatList
        key={viewMode}
        data={tiles}
        keyExtractor={(item) => item.post.id}
        renderItem={renderTile}
        numColumns={viewMode === 'grid' ? GRID_COLS : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        ListHeaderComponent={
          <View>
            {header}
            <View style={styles.feedHeaderRow}>
              <Pressable
                style={styles.addButton}
                onPress={handleAdd}
                accessibilityLabel={t('profileFeedEmpty', lang)}
              >
                <Icon name="add" size={19} color={colors.background} active />
              </Pressable>
              <View style={styles.feedHeaderActions}>
                <View style={styles.viewToggle}>
                  <Pressable
                    style={[styles.viewToggleButton, viewMode === 'feed' && styles.viewToggleButtonActive]}
                    onPress={() => setViewMode('feed')}
                    accessibilityLabel="Feed view"
                  >
                    <Icon
                      name="feed"
                      size={17}
                      color={viewMode === 'feed' ? colors.background : colors.textSecondary}
                      active={viewMode === 'feed'}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
                    onPress={() => setViewMode('grid')}
                    accessibilityLabel="Grid view"
                  >
                    <Icon
                      name="grid"
                      size={17}
                      color={viewMode === 'grid' ? colors.background : colors.textSecondary}
                      active={viewMode === 'grid'}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('profileFeedEmpty', lang)}</Text>
            <Text style={styles.emptyStateSub}>{t('profileFeedCaptionPlaceholder', lang)}</Text>
          </View>
        }
        contentContainerStyle={[styles.content, viewMode === 'grid' && styles.gridContent]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={viewMode === 'grid' ? 16 : 4}
        maxToRenderPerBatch={viewMode === 'grid' ? 12 : 4}
        windowSize={5}
        removeClippedSubviews
      />

      <ImageCropModal
        visible={!!cropTarget}
        imageUri={cropTarget?.uri ?? null}
        imageWidth={cropTarget?.width}
        imageHeight={cropTarget?.height}
        lang={lang}
        onCancel={() => setCropTarget(null)}
        onConfirm={(uri) => {
          setPendingUri(uri);
          setCropTarget(null);
        }}
      />

      <Modal visible={!!pendingUri} transparent animationType="fade" onRequestClose={() => setPendingUri(null)}>
        <KeyboardAvoidingView
          style={styles.captionOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.captionModal}>
            <Text style={styles.captionTitle}>{t('profileFeedCaptionTitle', lang)}</Text>
            {pendingUri ? (
              <Image source={{ uri: pendingUri }} style={styles.captionPreview} contentFit="cover" />
            ) : null}
            {workoutSnapshot ? (
              <Pressable
                style={styles.workoutToggle}
                onPress={() => setIncludeWorkout((value) => !value)}
              >
                <View style={[styles.checkbox, includeWorkout && styles.checkboxActive]}>
                  {includeWorkout ? <Icon name="check" size={13} color={colors.background} active /> : null}
                </View>
                <View style={styles.workoutToggleTextBlock}>
                  <Text style={styles.workoutToggleTitle}>
                    {lang === 'ko' ? '오늘 운동 포함' : "Include today's workout"}
                  </Text>
                  <Text style={styles.workoutToggleSub} numberOfLines={1}>
                    {workoutSnapshot.exercises.map((exercise) => exercise.line).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            <TextInput
              style={styles.captionInput}
              value={captionDraft}
              onChangeText={setCaptionDraft}
              placeholder={t('profileFeedCaptionPlaceholder', lang)}
              placeholderTextColor={colors.textMuted}
              maxLength={180}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.captionActions}>
              <Pressable
                style={styles.captionButton}
                onPress={() => {
                  setPendingUri(null);
                  setCaptionDraft('');
                }}
              >
                <Text style={styles.captionButtonText}>{t('cancel', lang)}</Text>
              </Pressable>
              <Pressable
                style={[styles.captionButton, styles.captionButtonPrimary, publishing && styles.captionButtonDisabled]}
                onPress={() => void handlePublish()}
                disabled={publishing}
              >
                <Text style={[styles.captionButtonText, styles.captionButtonPrimaryText]}>
                  {t('save', lang)}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 100,
    gap: GAP,
  },
  gridContent: {
    gap: 0,
  },
  feedHeaderRow: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  feedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  viewToggleButton: {
    width: 38,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: colors.textPrimary,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
  emptyState: {
    minHeight: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
  },
  emptyStateText: {
    ...typography.listItem,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyStateSub: {
    ...typography.caption,
    marginTop: 4,
    textAlign: 'center',
    color: colors.textMuted,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridTile: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridLikeBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    minHeight: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  gridLikeText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    color: colors.background,
  },
  postCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  postHeader: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postAuthor: {
    ...typography.listItem,
    flex: 1,
    marginRight: 12,
    color: colors.textPrimary,
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
  captionOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  captionModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: layout.screenPadding,
    gap: 12,
  },
  captionTitle: {
    ...typography.listItem,
    fontSize: 17,
  },
  captionPreview: {
    width: 86,
    height: 86,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  workoutToggle: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  workoutToggleTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  workoutToggleTitle: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.textPrimary,
  },
  workoutToggleSub: {
    ...typography.caption,
    marginTop: 1,
    color: colors.textSecondary,
  },
  captionInput: {
    ...typography.body,
    minHeight: 94,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  captionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  captionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionButtonPrimary: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  captionButtonDisabled: {
    opacity: 0.55,
  },
  captionButtonText: {
    ...typography.listItem,
    fontSize: 14,
    color: colors.textPrimary,
  },
  captionButtonPrimaryText: {
    color: colors.background,
  },
});
