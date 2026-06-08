// 휴식 타이머 완료 알림 (햅틱 + 진동)
import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

export const alertRestComplete = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // 햅틱 미지원 기기 무시
  }
  // Android 등 보조 진동
  Vibration.vibrate(400);
};
