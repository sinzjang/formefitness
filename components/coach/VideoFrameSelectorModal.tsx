// Form Check 영상 프레임 선택기 — timeline flag → thumbnail frames
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import { Icon } from '../ui/Icon';
import { colors, layout, typography } from '../../constants/theme';
import type { Language } from '../../types';
import type { FormCheckFrame } from '../../lib/formCheck';

interface VideoFrameSelectorModalProps {
  visible: boolean;
  videoUri: string | null;
  durationMs?: number | null;
  lang: Language;
  onClose: () => void;
  onSend: (frames: FormCheckFrame[]) => void;
}

interface SelectedFrame extends FormCheckFrame {
  id: string;
  timestampMs: number;
}

const MAX_FRAMES = 5;

interface VideoModules {
  useVideoPlayer: typeof import('expo-video').useVideoPlayer;
  VideoView: typeof import('expo-video').VideoView;
  VideoThumbnails: typeof import('expo-video-thumbnails');
}

let videoModules: VideoModules | null | undefined;

function getVideoModules(): VideoModules | null {
  if (videoModules !== undefined) return videoModules;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core');
    requireNativeModule('ExpoVideo');
    requireNativeModule('ExpoVideoThumbnails');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const video = require('expo-video') as typeof import('expo-video');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const VideoThumbnails = require('expo-video-thumbnails') as typeof import('expo-video-thumbnails');
    videoModules = {
      useVideoPlayer: video.useVideoPlayer,
      VideoView: video.VideoView,
      VideoThumbnails,
    };
  } catch {
    videoModules = null;
  }

  return videoModules;
}

function formatTime(ms: number) {
  const sec = Math.max(0, ms / 1000);
  return `${sec.toFixed(1)}s`;
}

export function VideoFrameSelectorModal({
  visible,
  videoUri,
  durationMs,
  lang,
  onClose,
  onSend,
}: VideoFrameSelectorModalProps) {
  const modules = getVideoModules();
  const isKo = lang === 'ko';

  if (!modules) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <ModalSafeArea>
          <View style={styles.container}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Icon name="close" size={24} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.title}>Form Check</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.unavailable}>
              <Icon name="video" size={32} color={colors.textMuted} />
              <Text style={styles.unavailableTitle}>
                {isKo ? '영상 Form Check 준비 필요' : 'Video Form Check needs a rebuild'}
              </Text>
              <Text style={styles.unavailableText}>
                {isKo
                  ? '영상 프리뷰와 프레임 추출 모듈이 새로 추가되었습니다. 앱을 다시 빌드하면 사용할 수 있어요.\n\nnpx expo run:ios'
                  : 'Video preview and frame extraction were added as native modules. Rebuild the app to use this feature.\n\nnpx expo run:ios'}
              </Text>
            </View>
          </View>
        </ModalSafeArea>
      </Modal>
    );
  }

  return (
    <VideoFrameSelectorReady
      modules={modules}
      visible={visible}
      videoUri={videoUri}
      durationMs={durationMs}
      lang={lang}
      onClose={onClose}
      onSend={onSend}
    />
  );
}

function VideoFrameSelectorReady({
  modules,
  visible,
  videoUri,
  durationMs,
  lang,
  onClose,
  onSend,
}: VideoFrameSelectorModalProps & { modules: VideoModules }) {
  const [currentMs, setCurrentMs] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(1);
  const [selected, setSelected] = useState<SelectedFrame[]>([]);
  const [extracting, setExtracting] = useState(false);
  const timelineLeftRef = useRef(0);
  const fallbackDurationMs = durationMs && durationMs > 0 ? durationMs : 10000;
  const isKo = lang === 'ko';

  const player = modules.useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
    p.pause();
  });

  useEffect(() => {
    if (!visible) {
      setCurrentMs(0);
      setSelected([]);
      return;
    }
    player.pause();
    player.currentTime = 0;
  }, [visible, player]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      const next = Math.max(0, Math.min(fallbackDurationMs, player.currentTime * 1000));
      setCurrentMs(next);
    }, 180);
    return () => clearInterval(timer);
  }, [visible, fallbackDurationMs, player]);

  const sortedSelected = useMemo(
    () => [...selected].sort((a, b) => a.timestampMs - b.timestampMs),
    [selected]
  );

  const seekToMs = (ms: number) => {
    const clamped = Math.max(0, Math.min(fallbackDurationMs, ms));
    player.pause();
    player.currentTime = clamped / 1000;
    setCurrentMs(clamped);
  };

  const seekFromPageX = (pageX: number) => {
    const x = pageX - timelineLeftRef.current;
    const pct = Math.max(0, Math.min(1, x / timelineWidth));
    seekToMs(pct * fallbackDurationMs);
  };

  const timelinePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          seekFromPageX(event.nativeEvent.pageX);
        },
        onPanResponderMove: (event) => {
          seekFromPageX(event.nativeEvent.pageX);
        },
      }),
    [fallbackDurationMs, timelineWidth]
  );

  const handleSelect = async () => {
    if (!videoUri || selected.length >= MAX_FRAMES || extracting) return;
    setExtracting(true);
    try {
      const { uri } = await modules.VideoThumbnails.getThumbnailAsync(videoUri, {
        time: Math.round(currentMs),
        quality: 0.7,
      });
      setSelected((prev) => [
        ...prev,
        {
          id: `frame_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          uri,
          timestampMs: Math.round(currentMs),
          label: `Flag ${prev.length + 1}`,
        },
      ]);
    } finally {
      setExtracting(false);
    }
  };

  const handleRemove = (id: string) => {
    setSelected((prev) => prev.filter((frame) => frame.id !== id));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.title}>Form Check</Text>
            <Pressable
              onPress={() => onSend(sortedSelected)}
              disabled={selected.length < 1}
              hitSlop={8}
            >
              <Text style={[styles.sendText, selected.length < 1 && styles.sendTextDisabled]}>
                {isKo ? '보내기' : 'Send'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.previewWrap}>
            {videoUri ? (
              <modules.VideoView
                player={player}
                style={styles.video}
                nativeControls={false}
                contentFit="contain"
              />
            ) : null}
            <Pressable style={styles.selectBubble} onPress={handleSelect} disabled={selected.length >= MAX_FRAMES}>
              {extracting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.selectBubbleText}>
                  {selected.length >= MAX_FRAMES ? 'Max 5' : 'Select'}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.controls}>
            <Text style={styles.timeText}>
              {formatTime(currentMs)} / {formatTime(fallbackDurationMs)}
            </Text>
            <View style={styles.nudgeRow}>
              <Pressable style={styles.nudgeBtn} onPress={() => seekToMs(currentMs - 250)}>
                <Text style={styles.nudgeText}>-0.25</Text>
              </Pressable>
              <Pressable
                style={styles.playBtn}
                onPress={() => {
                  if (player.playing) player.pause();
                  else player.play();
                }}
              >
                <Text style={styles.playText}>{player.playing ? 'Pause' : 'Play'}</Text>
              </Pressable>
              <Pressable style={styles.nudgeBtn} onPress={() => seekToMs(currentMs + 250)}>
                <Text style={styles.nudgeText}>+0.25</Text>
              </Pressable>
            </View>
          </View>

          <View
            style={styles.timeline}
            onLayout={(event) => {
              setTimelineWidth(Math.max(1, event.nativeEvent.layout.width));
              event.currentTarget.measure((_x, _y, _w, _h, pageX) => {
                timelineLeftRef.current = pageX;
              });
            }}
            {...timelinePan.panHandlers}
          >
            <View style={styles.timelineTrack} />
            <View
              style={[
                styles.scrubber,
                { left: `${Math.max(0, Math.min(100, (currentMs / fallbackDurationMs) * 100))}%` },
              ]}
            />
            {sortedSelected.map((frame) => (
              <View
                key={frame.id}
                style={[
                  styles.flag,
                  { left: `${Math.max(0, Math.min(100, (frame.timestampMs / fallbackDurationMs) * 100))}%` },
                ]}
              >
                <View style={styles.flagHead} />
                <View style={styles.flagLine} />
              </View>
            ))}
          </View>

          <Text style={styles.hint}>
            {isKo
              ? '타임라인을 터치하거나 드래그해서 프리뷰를 움직이고, Select로 코치가 볼 순간을 선택하세요. 최대 5개.'
              : 'Tap or drag the timeline to scrub, then Select the moments your coach should review. Max 5.'}
          </Text>

          <View style={styles.framesRow}>
            {sortedSelected.map((frame) => (
              <Pressable key={frame.id} style={styles.frameThumbWrap} onPress={() => handleRemove(frame.id)}>
                <Image source={{ uri: frame.uri }} style={styles.frameThumb} contentFit="cover" />
                <Text style={styles.frameTime}>{formatTime(frame.timestampMs)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 52,
    paddingHorizontal: layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.listItem,
    fontSize: 17,
  },
  sendText: {
    ...typography.listItem,
    color: colors.accent,
  },
  sendTextDisabled: {
    color: colors.textMuted,
  },
  headerSpacer: {
    width: 24,
  },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  unavailableTitle: {
    ...typography.listItem,
    marginTop: 12,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  unavailableText: {
    ...typography.body,
    marginTop: 8,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  previewWrap: {
    marginHorizontal: layout.screenPadding,
    marginTop: 18,
    aspectRatio: 0.72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.textPrimary,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  selectBubble: {
    position: 'absolute',
    left: '50%',
    bottom: 16,
    minWidth: 84,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    transform: [{ translateX: -42 }],
  },
  selectBubbleText: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.background,
  },
  controls: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 14,
    gap: 10,
  },
  timeText: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nudgeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nudgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  playBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.textPrimary,
  },
  playText: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.background,
  },
  timeline: {
    height: 72,
    marginHorizontal: layout.screenPadding,
    marginTop: 18,
    justifyContent: 'center',
  },
  timelineTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  scrubber: {
    position: 'absolute',
    top: 14,
    width: 2,
    height: 44,
    backgroundColor: colors.accent,
  },
  flag: {
    position: 'absolute',
    top: 3,
    alignItems: 'center',
  },
  flagHead: {
    width: 12,
    height: 9,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  flagLine: {
    width: 2,
    height: 48,
    backgroundColor: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    marginHorizontal: layout.screenPadding,
    color: colors.textMuted,
    textAlign: 'center',
  },
  framesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
  },
  frameThumbWrap: {
    width: 62,
    gap: 4,
  },
  frameThumb: {
    width: 62,
    height: 62,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  frameTime: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
});
