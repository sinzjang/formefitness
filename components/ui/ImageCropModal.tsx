// Safe Area 안 자유 비율 크롭 — 원본 전체 표시(contain) + 크롭 박스 이동·리사이즈
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { colors, typography } from '../../constants/theme';
import { cropImageRect } from '../../lib/imageManipulator';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from './Icon';
import { ModalSafeArea } from './ModalSafeArea';

const HEADER_HEIGHT = 52;
const FOOTER_HEIGHT = 44;
const HORIZONTAL_MARGIN = 24;
const MAX_SCALE_FACTOR = 4;
const MIN_CROP = 48;
const CORNER_HIT = 32;
const CORNER_ARM = 22;
const GUIDE_COLOR = 'rgba(255,255,255,0.42)';
const GRID_LINE = 1;
const CORNER_LINE = 4;

const AnimatedImage = Animated.createAnimatedComponent(RNImage);

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  imageWidth?: number;
  imageHeight?: number;
  lang: Language;
  onCancel: () => void;
  onConfirm: (uri: string) => void;
}

interface ImageSize {
  width: number;
  height: number;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function containScale(workspaceW: number, workspaceH: number, imageW: number, imageH: number) {
  return Math.min(workspaceW / imageW, workspaceH / imageH);
}

function getImageBoundsWorklet(
  wsW: number,
  wsH: number,
  fitDisplayW: number,
  fitDisplayH: number,
  userScale: number,
  tx: number,
  ty: number
) {
  'worklet';
  const displayW = fitDisplayW * userScale;
  const displayH = fitDisplayH * userScale;
  const imgL = wsW / 2 - displayW / 2 + tx;
  const imgT = wsH / 2 - displayH / 2 + ty;
  return { imgL, imgT, imgR: imgL + displayW, imgB: imgT + displayH, displayW, displayH };
}

function clampCropInImageWorklet(
  cropL: number,
  cropT: number,
  cropW: number,
  cropH: number,
  imgL: number,
  imgT: number,
  imgR: number,
  imgB: number
) {
  'worklet';
  let w = Math.max(MIN_CROP, cropW);
  let h = Math.max(MIN_CROP, cropH);
  let l = cropL;
  let t = cropT;

  const maxW = imgR - imgL;
  const maxH = imgB - imgT;
  w = Math.min(w, maxW);
  h = Math.min(h, maxH);

  l = Math.min(Math.max(l, imgL), imgR - w);
  t = Math.min(Math.max(t, imgT), imgB - h);

  return { l, t, w, h };
}

function clampImagePanWorklet(
  wsW: number,
  wsH: number,
  fitDisplayW: number,
  fitDisplayH: number,
  userScale: number,
  cropL: number,
  cropT: number,
  cropW: number,
  cropH: number,
  nextX: number,
  nextY: number
) {
  'worklet';
  const displayW = fitDisplayW * userScale;
  const displayH = fitDisplayH * userScale;
  const minX = cropL + cropW - wsW / 2 - displayW / 2;
  const maxX = cropL - wsW / 2 + displayW / 2;
  const minY = cropT + cropH - wsH / 2 - displayH / 2;
  const maxY = cropT - wsH / 2 + displayH / 2;
  return {
    x: Math.min(maxX, Math.max(minX, nextX)),
    y: Math.min(maxY, Math.max(minY, nextY)),
  };
}

export function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  lang,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [processing, setProcessing] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);

  const workspaceW = screenWidth - HORIZONTAL_MARGIN * 2;
  const workspaceH = Math.max(220, bodyHeight > 0 ? bodyHeight - 8 : screenWidth * 0.72);

  const fitScale = useMemo(() => {
    if (!imageSize) return 1;
    return containScale(workspaceW, workspaceH, imageSize.width, imageSize.height);
  }, [imageSize, workspaceW, workspaceH]);

  const fitDisplayW = imageSize ? imageSize.width * fitScale : 0;
  const fitDisplayH = imageSize ? imageSize.height * fitScale : 0;

  const userScale = useSharedValue(1);
  const savedUserScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const cropL = useSharedValue(0);
  const cropT = useSharedValue(0);
  const cropW = useSharedValue(0);
  const cropH = useSharedValue(0);
  const savedCropL = useSharedValue(0);
  const savedCropT = useSharedValue(0);
  const savedCropW = useSharedValue(0);
  const savedCropH = useSharedValue(0);

  const wsWSv = useSharedValue(0);
  const wsHSv = useSharedValue(0);
  const fitDisplayWSv = useSharedValue(0);
  const fitDisplayHSv = useSharedValue(0);

  const resetTransforms = useCallback(() => {
    userScale.value = 1;
    savedUserScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [userScale, savedUserScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const initCropRect = useCallback(() => {
    const dw = fitDisplayW;
    const dh = fitDisplayH;
    const il = (workspaceW - dw) / 2;
    const it = (workspaceH - dh) / 2;
    cropL.value = il;
    cropT.value = it;
    cropW.value = dw;
    cropH.value = dh;
    savedCropL.value = il;
    savedCropT.value = it;
    savedCropW.value = dw;
    savedCropH.value = dh;
  }, [
    fitDisplayW,
    fitDisplayH,
    workspaceW,
    workspaceH,
    cropL,
    cropT,
    cropW,
    cropH,
    savedCropL,
    savedCropT,
    savedCropW,
    savedCropH,
  ]);

  useEffect(() => {
    wsWSv.value = workspaceW;
    wsHSv.value = workspaceH;
    fitDisplayWSv.value = fitDisplayW;
    fitDisplayHSv.value = fitDisplayH;
  }, [workspaceW, workspaceH, fitDisplayW, fitDisplayH, wsWSv, wsHSv, fitDisplayWSv, fitDisplayHSv]);

  useEffect(() => {
    if (!visible || !imageUri) {
      setImageSize(null);
      resetTransforms();
      return;
    }

    if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
      setImageSize({ width: imageWidth, height: imageHeight });
      resetTransforms();
      return;
    }

    let cancelled = false;
    RNImage.getSize(
      imageUri,
      (width, height) => {
        if (!cancelled) {
          setImageSize({ width, height });
          resetTransforms();
        }
      },
      () => {
        if (!cancelled) setImageSize(null);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [visible, imageUri, imageWidth, imageHeight, resetTransforms]);

  useEffect(() => {
    if (imageSize && fitDisplayW > 0 && fitDisplayH > 0) {
      initCropRect();
    }
  }, [imageSize, fitDisplayW, fitDisplayH, initCropRect]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const cropWv = cropW.value;
      const cropHv = cropH.value;
      const minScale = Math.max(
        1,
        cropWv / fitDisplayWSv.value,
        cropHv / fitDisplayHSv.value
      );
      const next = Math.min(MAX_SCALE_FACTOR, Math.max(minScale, savedUserScale.value * event.scale));
      userScale.value = next;

      const pan = clampImagePanWorklet(
        wsWSv.value,
        wsHSv.value,
        fitDisplayWSv.value,
        fitDisplayHSv.value,
        next,
        cropL.value,
        cropT.value,
        cropW.value,
        cropH.value,
        translateX.value,
        translateY.value
      );
      translateX.value = pan.x;
      translateY.value = pan.y;
    })
    .onEnd(() => {
      savedUserScale.value = userScale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const imagePanGesture = Gesture.Pan()
    .minDistance(4)
    .onUpdate((event) => {
      const nextX = savedTranslateX.value + event.translationX;
      const nextY = savedTranslateY.value + event.translationY;
      const pan = clampImagePanWorklet(
        wsWSv.value,
        wsHSv.value,
        fitDisplayWSv.value,
        fitDisplayHSv.value,
        userScale.value,
        cropL.value,
        cropT.value,
        cropW.value,
        cropH.value,
        nextX,
        nextY
      );
      translateX.value = pan.x;
      translateY.value = pan.y;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const workspaceGesture = Gesture.Simultaneous(imagePanGesture, pinchGesture);

  const moveCropGesture = Gesture.Pan()
    .onStart(() => {
      savedCropL.value = cropL.value;
      savedCropT.value = cropT.value;
    })
    .onUpdate((event) => {
      const bounds = getImageBoundsWorklet(
        wsWSv.value,
        wsHSv.value,
        fitDisplayWSv.value,
        fitDisplayHSv.value,
        userScale.value,
        translateX.value,
        translateY.value
      );
      const nextL = savedCropL.value + event.translationX;
      const nextT = savedCropT.value + event.translationY;
      const clamped = clampCropInImageWorklet(
        nextL,
        nextT,
        cropW.value,
        cropH.value,
        bounds.imgL,
        bounds.imgT,
        bounds.imgR,
        bounds.imgB
      );
      cropL.value = clamped.l;
      cropT.value = clamped.t;
    })
    .onEnd(() => {
      savedCropL.value = cropL.value;
      savedCropT.value = cropT.value;
    });

  const makeResizeGesture = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
    Gesture.Pan()
      .onStart(() => {
        savedCropL.value = cropL.value;
        savedCropT.value = cropT.value;
        savedCropW.value = cropW.value;
        savedCropH.value = cropH.value;
      })
      .onUpdate((event) => {
        const bounds = getImageBoundsWorklet(
          wsWSv.value,
          wsHSv.value,
          fitDisplayWSv.value,
          fitDisplayHSv.value,
          userScale.value,
          translateX.value,
          translateY.value
        );

        let l = savedCropL.value;
        let t = savedCropT.value;
        let w = savedCropW.value;
        let h = savedCropH.value;

        if (corner === 'br') {
          w = savedCropW.value + event.translationX;
          h = savedCropH.value + event.translationY;
        } else if (corner === 'bl') {
          l = savedCropL.value + event.translationX;
          w = savedCropW.value - event.translationX;
          h = savedCropH.value + event.translationY;
        } else if (corner === 'tr') {
          t = savedCropT.value + event.translationY;
          w = savedCropW.value + event.translationX;
          h = savedCropH.value - event.translationY;
        } else {
          l = savedCropL.value + event.translationX;
          t = savedCropT.value + event.translationY;
          w = savedCropW.value - event.translationX;
          h = savedCropH.value - event.translationY;
        }

        const clamped = clampCropInImageWorklet(
          l,
          t,
          w,
          h,
          bounds.imgL,
          bounds.imgT,
          bounds.imgR,
          bounds.imgB
        );
        cropL.value = clamped.l;
        cropT.value = clamped.t;
        cropW.value = clamped.w;
        cropH.value = clamped.h;
      })
      .onEnd(() => {
        savedCropL.value = cropL.value;
        savedCropT.value = cropT.value;
        savedCropW.value = cropW.value;
        savedCropH.value = cropH.value;
      });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    width: fitDisplayWSv.value * userScale.value,
    height: fitDisplayHSv.value * userScale.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const cropFrameStyle = useAnimatedStyle(() => ({
    left: cropL.value,
    top: cropT.value,
    width: cropW.value,
    height: cropH.value,
    borderWidth: GRID_LINE,
    borderColor: GUIDE_COLOR,
  }));

  const handleConfirm = async () => {
    if (!imageUri || !imageSize || processing) return;

    setProcessing(true);
    try {
      const totalScale = fitScale * userScale.value;
      const displayW = fitDisplayW * userScale.value;
      const displayH = fitDisplayH * userScale.value;
      const imgL = workspaceW / 2 - displayW / 2 + translateX.value;
      const imgT = workspaceH / 2 - displayH / 2 + translateY.value;

      const relX = cropL.value - imgL;
      const relY = cropT.value - imgT;

      const originX = clampValue(relX / totalScale, 0, imageSize.width - 1);
      const originY = clampValue(relY / totalScale, 0, imageSize.height - 1);
      const cropWNat = clampValue(cropW.value / totalScale, MIN_CROP, imageSize.width - originX);
      const cropHNat = clampValue(cropH.value / totalScale, MIN_CROP, imageSize.height - originY);

      const cropped = await cropImageRect(
        imageUri,
        { originX, originY, width: cropWNat, height: cropHNat },
        { showAlert: true }
      );

      onConfirm(cropped ?? imageUri);
    } catch {
      onConfirm(imageUri);
    } finally {
      setProcessing(false);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.root}>
        <ModalSafeArea style={styles.safe}>
          <View style={styles.header}>
            <Pressable onPress={onCancel} hitSlop={8} disabled={processing}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.title}>{t('imageCropTitle', lang)}</Text>
            <Pressable
              onPress={() => void handleConfirm()}
              hitSlop={8}
              disabled={processing || !imageSize}
            >
              {processing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.doneText, !imageSize && styles.doneDisabled]}>
                  {t('save', lang)}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.body} onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
            <View style={[styles.workspace, { width: workspaceW, height: workspaceH }]}>
              {imageSize ? (
                <>
                  <View style={styles.imageLayer} pointerEvents="none">
                    <AnimatedImage
                      source={{ uri: imageUri }}
                      style={[styles.previewImage, imageAnimatedStyle]}
                      resizeMode="contain"
                    />
                  </View>

                  <GestureDetector gesture={workspaceGesture}>
                    <View style={styles.workspaceTouch} />
                  </GestureDetector>

                  <Animated.View style={[styles.cropFrame, cropFrameStyle]}>
                    <GestureDetector gesture={moveCropGesture}>
                      <View style={styles.cropMoveArea} />
                    </GestureDetector>

                    {/* 3×3 그리드 가이드 */}
                    <View pointerEvents="none" style={styles.gridOverlay}>
                      <View style={[styles.gridLineV, { left: '33.33%' }]} />
                      <View style={[styles.gridLineV, { left: '66.66%' }]} />
                      <View style={[styles.gridLineH, { top: '33.33%' }]} />
                      <View style={[styles.gridLineH, { top: '66.66%' }]} />
                    </View>

                    <View pointerEvents="none" style={[styles.corner, styles.cornerTL]} />
                    <View pointerEvents="none" style={[styles.corner, styles.cornerTR]} />
                    <View pointerEvents="none" style={[styles.corner, styles.cornerBL]} />
                    <View pointerEvents="none" style={[styles.corner, styles.cornerBR]} />

                    <GestureDetector gesture={makeResizeGesture('tl')}>
                      <View style={[styles.cornerHit, styles.cornerHitTL]} />
                    </GestureDetector>
                    <GestureDetector gesture={makeResizeGesture('tr')}>
                      <View style={[styles.cornerHit, styles.cornerHitTR]} />
                    </GestureDetector>
                    <GestureDetector gesture={makeResizeGesture('bl')}>
                      <View style={[styles.cornerHit, styles.cornerHitBL]} />
                    </GestureDetector>
                    <GestureDetector gesture={makeResizeGesture('br')}>
                      <View style={[styles.cornerHit, styles.cornerHitBR]} />
                    </GestureDetector>
                  </Animated.View>
                </>
              ) : (
                <ActivityIndicator color={colors.textSecondary} />
              )}
            </View>
          </View>

          <Text style={styles.hint}>{t('imageCropHint', lang)}</Text>
        </ModalSafeArea>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { backgroundColor: colors.background },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { ...typography.listItem, color: colors.textPrimary },
  doneText: { ...typography.listItem, color: colors.accent },
  doneDisabled: { color: colors.textMuted },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingTop: 8,
  },
  workspace: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    position: 'relative',
  },
  imageLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceTouch: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  previewImage: { backgroundColor: 'transparent' },
  cropFrame: {
    position: 'absolute',
    zIndex: 2,
    overflow: 'visible',
  },
  cropMoveArea: { ...StyleSheet.absoluteFillObject },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: GRID_LINE,
    backgroundColor: GUIDE_COLOR,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: GRID_LINE,
    backgroundColor: GUIDE_COLOR,
  },
  corner: {
    position: 'absolute',
    width: CORNER_ARM,
    height: CORNER_ARM,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_LINE,
    borderLeftWidth: CORNER_LINE,
    borderColor: GUIDE_COLOR,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_LINE,
    borderRightWidth: CORNER_LINE,
    borderColor: GUIDE_COLOR,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_LINE,
    borderLeftWidth: CORNER_LINE,
    borderColor: GUIDE_COLOR,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_LINE,
    borderRightWidth: CORNER_LINE,
    borderColor: GUIDE_COLOR,
  },
  cornerHit: {
    position: 'absolute',
    width: CORNER_HIT,
    height: CORNER_HIT,
  },
  cornerHitTL: { top: -CORNER_HIT / 2, left: -CORNER_HIT / 2 },
  cornerHitTR: { top: -CORNER_HIT / 2, right: -CORNER_HIT / 2 },
  cornerHitBL: { bottom: -CORNER_HIT / 2, left: -CORNER_HIT / 2 },
  cornerHitBR: { bottom: -CORNER_HIT / 2, right: -CORNER_HIT / 2 },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    minHeight: FOOTER_HEIGHT,
  },
});
