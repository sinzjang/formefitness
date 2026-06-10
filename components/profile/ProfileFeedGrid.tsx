// 프로필 이미지 피드 — 3열 그리드 + 추가
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from '../ui/Icon';
import { useProfilePrefsStore } from '../../stores/profilePrefsStore';
import { pickImageFromLibrary } from '../../lib/pickImage';
import { ImageCropModal } from '../ui/ImageCropModal';

const COLS = 3;
const GAP = 2;

interface ProfileFeedGridProps {
  lang: Language;
}

export function ProfileFeedGrid({ lang }: ProfileFeedGridProps) {
  const { width } = useWindowDimensions();
  const feedPosts = useProfilePrefsStore((s) => s.feedPosts);
  const addFeedPost = useProfilePrefsStore((s) => s.addFeedPost);
  const removeFeedPost = useProfilePrefsStore((s) => s.removeFeedPost);
  const [cropTarget, setCropTarget] = useState<{
    uri: string;
    width?: number;
    height?: number;
  } | null>(null);

  const contentWidth = width - layout.screenPadding * 2;
  const cellSize = (contentWidth - GAP * (COLS - 1)) / COLS;

  const handleAdd = () => {
    void pickImageFromLibrary().then((picked) => {
      if (picked) setCropTarget(picked);
    });
  };

  const handlePostPress = (id: string) => {
    Alert.alert(t('profileFeedDelete', lang), t('profileFeedDeleteConfirm', lang), [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: t('delete', lang),
        style: 'destructive',
        onPress: () => removeFeedPost(id),
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('profileFeed', lang)}</Text>

      <View style={[styles.grid, { gap: GAP }]}>
        <Pressable
          style={[styles.cell, styles.addCell, { width: cellSize, height: cellSize }]}
          onPress={handleAdd}
        >
          <Icon name="add" size={28} color={colors.textSecondary} />
        </Pressable>

        {feedPosts.map((post) => (
          <Pressable
            key={post.id}
            style={[styles.cell, { width: cellSize, height: cellSize }]}
            onPress={() => handlePostPress(post.id)}
          >
            <Image source={{ uri: post.uri }} style={styles.photo} contentFit="cover" />
          </Pressable>
        ))}
      </View>

      {feedPosts.length === 0 && (
        <Text style={styles.emptyHint}>{t('profileFeedEmpty', lang)}</Text>
      )}

      <ImageCropModal
        visible={!!cropTarget}
        imageUri={cropTarget?.uri ?? null}
        imageWidth={cropTarget?.width}
        imageHeight={cropTarget?.height}
        lang={lang}
        onCancel={() => setCropTarget(null)}
        onConfirm={(uri) => {
          addFeedPost(uri);
          setCropTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    fontSize: 14,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  addCell: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emptyHint: {
    ...typography.caption,
    marginTop: 10,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
