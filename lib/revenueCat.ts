// RevenueCat SDK 초기화 · 구매 · 복원 헬퍼
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { REVENUECAT_PLANS } from './revenueCatPlans';
import type { PlanId } from '../types/subscription';

const API_KEY =
  Platform.OS === 'ios'
    ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
       process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
       '')
    : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ||
       process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
       '');

let _configured = false;

/** 네이티브 모듈 사용 가능 여부 (Expo Go / 재빌드 전이면 false) */
function isNativeAvailable(): boolean {
  // react-native-purchases 는 네이티브 링크 없으면 null 반환
  return Purchases != null && typeof Purchases.configure === 'function';
}

/** 앱 시작 시 1회 호출 */
export function configureRevenueCat() {
  if (_configured || !API_KEY) return;
  if (!isNativeAvailable()) {
    console.warn('[RC] 네이티브 모듈 없음 — dev 빌드 재빌드 필요');
    return;
  }
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: API_KEY });
    _configured = true;
  } catch (e) {
    console.warn('[RC] configure 실패:', e);
  }
}

/** 로그인 후 RC 사용자 연결 (Supabase UUID → RC app_user_id) */
export async function rcLogIn(userId: string): Promise<void> {
  if (!API_KEY || !isNativeAvailable()) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('[RC] logIn 실패:', e);
  }
}

/** 로그아웃 시 RC 익명 사용자로 전환
 *  익명 사용자 상태에서 logOut 호출 시 RC가 에러를 던지므로 사전 확인 */
export async function rcLogOut(): Promise<void> {
  if (!API_KEY || !isNativeAvailable()) return;
  try {
    // $RCAnonymousID 로 시작하면 이미 익명 상태 — logOut 불필요
    const appUserId = await Purchases.getAppUserID();
    if (appUserId.startsWith('$RCAnonymousID')) return;
    await Purchases.logOut();
  } catch (e) {
    console.warn('[RC] logOut 실패:', e);
  }
}

/** 현재 고객 정보에서 가장 높은 플랜 ID 반환 */
export function planIdFromCustomerInfo(info: CustomerInfo): PlanId {
  const ents = info.entitlements.active;
  if (ents['prime']) return 'prime';
  if (ents['plus']) return 'plus';
  return 'free';
}

/** RC Offerings 로드 → 패키지 목록 반환 */
export async function fetchOfferings(): Promise<PurchasesPackage[]> {
  if (!isNativeAvailable()) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages;
  } catch (e) {
    console.warn('[RC] fetchOfferings 실패:', e);
    return [];
  }
}

/** 패키지 구매 → CustomerInfo 반환 (실패 시 null) */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  if (!isNativeAvailable()) return null;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: unknown) {
    // 사용자가 취소한 경우 — 에러로 처리하지 않음
    if (
      typeof e === 'object' &&
      e !== null &&
      'userCancelled' in e &&
      (e as { userCancelled: boolean }).userCancelled
    ) {
      return null;
    }
    throw e;
  }
}

/** 이전 구매 복원 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isNativeAvailable()) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (e) {
    console.warn('[RC] restorePurchases 실패:', e);
    return null;
  }
}

/** 현재 CustomerInfo 조회 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isNativeAvailable()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('[RC] getCustomerInfo 실패:', e);
    return null;
  }
}

export { REVENUECAT_PLANS };
