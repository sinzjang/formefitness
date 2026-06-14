// 구독 결제 Paywall 모달 — 로고 배너 + 3컬럼 비교표 + Monthly/Yearly 구매
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors, fonts, layout, typography } from '../../constants/theme';
import { Icon } from '../ui/Icon';
import {
  fetchOfferings,
  purchasePackage,
  restorePurchases,
  planIdFromCustomerInfo,
} from '../../lib/revenueCat';
import {
  REVENUECAT_PLANS,
  calcYearlySaving,
  fallbackPrice,
} from '../../lib/revenueCatPlans';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import type { Language } from '../../types';

const SCREEN_W = Dimensions.get('window').width;
// 로고 배너: 가로 전체, 세로는 가로의 2/3
const BANNER_H = Math.round(SCREEN_W * (2 / 3));

// ─────────────────────────────────────────────
// 비교 테이블 데이터
// ─────────────────────────────────────────────
type CellValue = 'check' | 'none' | string;

interface FeatureRow {
  label: { ko: string; en: string };
  free: CellValue;
  plus: CellValue;
  prime: CellValue;
}

const FEATURES: FeatureRow[] = [
  {
    label: { ko: 'AI 코치 메시지', en: 'AI Coach messages' },
    free: { ko: '5회/일', en: '5/day' },
    plus: { ko: '무제한', en: 'Unlimited' },
    prime: { ko: '무제한', en: 'Unlimited' },
  },
  {
    label: { ko: 'Goal 이미지 생성', en: 'Goal image gen' },
    free: 'none',
    plus: 'check',
    prime: 'check',
  },
  {
    label: { ko: '클라우드 동기화', en: 'Cloud sync' },
    free: 'check',
    plus: 'check',
    prime: 'check',
  },
  {
    label: { ko: '운동 영상 분석', en: 'Form check' },
    free: 'none',
    plus: 'check',
    prime: 'check',
  },
  {
    label: { ko: 'Pulse 소셜 피드', en: 'Pulse social feed' },
    free: 'none',
    plus: 'none',
    prime: 'check',
  },
  {
    label: { ko: 'AI 영상 자세 분석', en: 'AI video analysis' },
    free: 'none',
    plus: 'none',
    prime: 'check',
  },
  {
    label: { ko: '우선 고객 지원', en: 'Priority support' },
    free: 'none',
    plus: 'none',
    prime: 'check',
  },
];

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
interface PaywallModalProps {
  visible: boolean;
  lang: Language;
  onClose: () => void;
}

interface PkgMap {
  plus_monthly?: PurchasesPackage;
  plus_yearly?: PurchasesPackage;
  prime_monthly?: PurchasesPackage;
  prime_yearly?: PurchasesPackage;
}

// ─────────────────────────────────────────────
// 헬퍼 컴포넌트
// ─────────────────────────────────────────────
function Cell({ value, lang, highlight }: { value: CellValue; lang: Language; highlight: boolean }) {
  if (value === 'check') {
    return <Icon name="check" size={14} color={highlight ? colors.accent : colors.textPrimary} />;
  }
  if (value === 'none') {
    return <Text style={[styles.cellNone]}>—</Text>;
  }
  const text = typeof value === 'object' ? (value as { ko: string; en: string })[lang] : value;
  return (
    <Text style={[styles.cellText, highlight && styles.cellTextHighlight]} numberOfLines={1}>
      {text}
    </Text>
  );
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export function PaywallModal({ visible, lang, onClose }: PaywallModalProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const refreshSub = useSubscriptionStore((s) => s.refresh);

  const [pkgMap, setPkgMap] = useState<PkgMap>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null); // 'plus_monthly' | 'plus_yearly' | 'prime_monthly' | 'prime_yearly' | 'restore'

  const isKo = lang === 'ko';

  useEffect(() => {
    if (!visible) return;
    setLoading(true);

    const buildMap = (pkgs: PurchasesPackage[]): PkgMap => {
      const map: PkgMap = {};
      for (const pkg of pkgs) {
        const id = pkg.product.identifier.toLowerCase();
        // 패키지 ID에서 플랜과 기간을 파악하여 매핑
        if (id.includes('prime') && id.includes('monthly'))      map.prime_monthly = pkg;
        else if (id.includes('prime') && id.includes('yearly'))  map.prime_yearly = pkg;
        else if (id.includes('plus') && id.includes('monthly'))  map.plus_monthly = pkg;
        else if (id.includes('plus') && id.includes('yearly'))   map.plus_yearly = pkg;
        else if (id === 'monthly')                                map.plus_monthly = pkg;
        else if (id === 'yearly')                                 map.plus_yearly = pkg;
      }
      return map;
    };

    const load = async () => {
      const pkgs = await fetchOfferings();
      const map = buildMap(pkgs);
      setPkgMap(map);
      setLoading(false);

      // RC 캐시가 stale할 수 있어서 4개 미만이면 1.5초 후 재시도
      const filled = Object.keys(map).length;
      if (filled < 4) {
        await new Promise((r) => setTimeout(r, 1500));
        const pkgs2 = await fetchOfferings();
        const map2 = buildMap(pkgs2);
        if (Object.keys(map2).length > filled) {
          setPkgMap(map2);
        }
      }
    };

    void load();
  }, [visible]);

  const handleBuy = useCallback(
    async (planKey: 'plus' | 'prime', period: 'monthly' | 'yearly') => {
      const key: keyof PkgMap = `${planKey}_${period}`;
      const pkg = pkgMap[key];
      if (!pkg) {
        Alert.alert(
          isKo ? '상품 없음' : 'Not available',
          isKo ? '해당 플랜을 찾을 수 없습니다.' : 'This plan is not available.'
        );
        return;
      }
      setPurchasing(key);
      try {
        const info = await purchasePackage(pkg);
        if (info) {
          if (userId) await refreshSub(userId);
          Alert.alert(
            isKo ? '구독 완료 🎉' : 'Subscribed 🎉',
            isKo
              ? `${planKey === 'plus' ? 'Plus' : 'Prime'} 플랜이 활성화되었습니다.`
              : `${planKey === 'plus' ? 'Plus' : 'Prime'} plan is now active.`
          );
          onClose();
        }
      } catch (e) {
        Alert.alert(
          isKo ? '결제 실패' : 'Purchase failed',
          e instanceof Error ? e.message : String(e)
        );
      } finally {
        setPurchasing(null);
      }
    },
    [pkgMap, userId, refreshSub, onClose, isKo]
  );

  const handleRestore = useCallback(async () => {
    setPurchasing('restore');
    try {
      const info = await restorePurchases();
      if (info) {
        const planId = planIdFromCustomerInfo(info);
        if (userId) await refreshSub(userId);
        Alert.alert(
          isKo ? '복원 완료' : 'Restored',
          planId !== 'free'
            ? (isKo ? `${planId} 플랜이 복원되었습니다.` : `${planId} plan restored.`)
            : (isKo ? '복원할 구독이 없습니다.' : 'No active subscription found.')
        );
        if (planId !== 'free') onClose();
      }
    } catch (e) {
      Alert.alert(isKo ? '복원 실패' : 'Restore failed', String(e));
    } finally {
      setPurchasing(null);
    }
  }, [userId, refreshSub, onClose, isKo]);

  // config에서 플랜 정보 추출
  const plusCfg  = REVENUECAT_PLANS.find((p) => p.planId === 'plus')!;
  const primeCfg = REVENUECAT_PLANS.find((p) => p.planId === 'prime')!;

  // 각 패키지 가격 문자열 — RC 패키지 없으면 config 기준가 사용
  const plusMonthlyPrice  = pkgMap.plus_monthly?.product.priceString  ?? fallbackPrice(plusCfg.monthlyPriceUSD);
  const plusYearlyPrice   = pkgMap.plus_yearly?.product.priceString   ?? fallbackPrice(plusCfg.yearlyPriceUSD);
  const primeMonthlyPrice = pkgMap.prime_monthly?.product.priceString ?? fallbackPrice(primeCfg.monthlyPriceUSD);
  const primeYearlyPrice  = pkgMap.prime_yearly?.product.priceString  ?? fallbackPrice(primeCfg.yearlyPriceUSD);

  // 연간 할인율: RC 가격 우선, 없으면 config 기준가
  const plusSaving  = Math.round(
    (1 - (pkgMap.plus_yearly?.product.price  ?? plusCfg.yearlyPriceUSD)  / ((pkgMap.plus_monthly?.product.price  ?? plusCfg.monthlyPriceUSD)  * 12)) * 100
  );
  const primeSaving = Math.round(
    (1 - (pkgMap.prime_yearly?.product.price ?? primeCfg.yearlyPriceUSD) / ((pkgMap.prime_monthly?.product.price ?? primeCfg.monthlyPriceUSD) * 12)) * 100
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* 닫기 버튼 — 이미지 위에 오버레이 */}
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <View style={styles.closeBtnBg}>
            <Icon name="close" size={18} color={colors.background} />
          </View>
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── 상단 로고 배너 ── */}
          <View style={styles.bannerWrap}>
            <Image
              source={require('../../src/imgs/app_esse/Forme_Logo.jpg')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            {/* 하단 페이드 */}
            <View style={styles.bannerFade} pointerEvents="none" />
            <Text style={styles.bannerTitle}>KYNE</Text>
          </View>

          {/* ── 비교 테이블 ── */}
          <View style={styles.tableWrap}>
            {/* 헤더 행 */}
            <View style={styles.tableRow}>
              <View style={styles.labelCell} />
              <View style={[styles.planCell, styles.planCellHeader]}>
                <Text style={styles.planHeaderText}>FREE</Text>
              </View>
              <View style={[styles.planCell, styles.planCellHeader, styles.planCellPlus]}>
                <Text style={[styles.planHeaderText, styles.planHeaderTextPaid]}>PLUS</Text>
              </View>
              <View style={[styles.planCell, styles.planCellHeader, styles.planCellPrime]}>
                <Icon name="crown" size={11} color="#B8860B" />
                <Text style={[styles.planHeaderText, styles.planHeaderTextPrime]}>PRIME</Text>
              </View>
            </View>

            {/* 피처 행 */}
            {FEATURES.map((row, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
              >
                <View style={styles.labelCell}>
                  <Text style={styles.labelText} numberOfLines={2}>
                    {row.label[lang]}
                  </Text>
                </View>
                <View style={styles.planCell}>
                  <Cell value={row.free} lang={lang} highlight={false} />
                </View>
                <View style={[styles.planCell, styles.planCellPlusBody]}>
                  <Cell value={row.plus} lang={lang} highlight={false} />
                </View>
                <View style={[styles.planCell, styles.planCellPrimeBody]}>
                  <Cell value={row.prime} lang={lang} highlight={true} />
                </View>
              </View>
            ))}
          </View>

          {/* ── 구매 섹션 ── */}
          <View style={styles.buySection}>

            {/* ── Plus ── */}
            <View style={styles.planGroup}>
              <Text style={styles.planGroupLabel}>Plus</Text>
              <View style={styles.planBtnRow}>
                {/* Plus · Monthly */}
                <Pressable
                  style={[styles.periodCard, styles.periodCardPlus, (loading || !!purchasing) && styles.buyBtnDisabled]}
                  onPress={() => handleBuy('plus', 'monthly')}
                  disabled={loading || !!purchasing}
                >
                  {purchasing === 'plus_monthly' ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <>
                      <Text style={styles.periodCardPeriod}>{isKo ? '월간' : 'Monthly'}</Text>
                      <Text style={styles.periodCardPrice}>{plusMonthlyPrice}</Text>
                      <Text style={styles.periodCardSub}>{isKo ? '/ 월' : '/ mo'}</Text>
                    </>
                  )}
                </Pressable>

                {/* Plus · Yearly */}
                <Pressable
                  style={[styles.periodCard, styles.periodCardPlus, styles.periodCardYearly, (loading || !!purchasing) && styles.buyBtnDisabled]}
                  onPress={() => handleBuy('plus', 'yearly')}
                  disabled={loading || !!purchasing}
                >
                  {purchasing === 'plus_yearly' ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <>
                      {plusSaving > 0 && (
                        <View style={styles.savingBadge}>
                          <Text style={styles.savingBadgeText}>-{plusSaving}%</Text>
                        </View>
                      )}
                      <Text style={styles.periodCardPeriod}>{isKo ? '연간' : 'Yearly'}</Text>
                      <Text style={styles.periodCardPrice}>{plusYearlyPrice}</Text>
                      <Text style={styles.periodCardSub}>{isKo ? '/ 년' : '/ yr'}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* ── Prime ── */}
            <View style={styles.planGroup}>
              <View style={styles.planGroupLabelRow}>
                <Icon name="crown" size={13} color="#B8860B" />
                <Text style={[styles.planGroupLabel, styles.planGroupLabelPrime]}>Prime</Text>
              </View>
              <View style={styles.planBtnRow}>
                {/* Prime · Monthly */}
                <Pressable
                  style={[styles.periodCard, styles.periodCardPrime, (loading || !!purchasing) && styles.buyBtnDisabled]}
                  onPress={() => handleBuy('prime', 'monthly')}
                  disabled={loading || !!purchasing}
                >
                  {purchasing === 'prime_monthly' ? (
                    <ActivityIndicator color="#FFD700" size="small" />
                  ) : (
                    <>
                      <Text style={[styles.periodCardPeriod, styles.periodCardPeriodPrime]}>{isKo ? '월간' : 'Monthly'}</Text>
                      <Text style={[styles.periodCardPrice, styles.periodCardPricePrime]}>{primeMonthlyPrice}</Text>
                      <Text style={[styles.periodCardSub, styles.periodCardSubPrime]}>{isKo ? '/ 월' : '/ mo'}</Text>
                    </>
                  )}
                </Pressable>

                {/* Prime · Yearly */}
                <Pressable
                  style={[styles.periodCard, styles.periodCardPrime, styles.periodCardYearly, (loading || !!purchasing) && styles.buyBtnDisabled]}
                  onPress={() => handleBuy('prime', 'yearly')}
                  disabled={loading || !!purchasing}
                >
                  {purchasing === 'prime_yearly' ? (
                    <ActivityIndicator color="#FFD700" size="small" />
                  ) : (
                    <>
                      {primeSaving > 0 && (
                        <View style={[styles.savingBadge, styles.savingBadgePrime]}>
                          <Text style={styles.savingBadgeText}>-{primeSaving}%</Text>
                        </View>
                      )}
                      <Text style={[styles.periodCardPeriod, styles.periodCardPeriodPrime]}>{isKo ? '연간' : 'Yearly'}</Text>
                      <Text style={[styles.periodCardPrice, styles.periodCardPricePrime]}>{primeYearlyPrice}</Text>
                      <Text style={[styles.periodCardSub, styles.periodCardSubPrime]}>{isKo ? '/ 년' : '/ yr'}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

          </View>

          {/* 복원 */}
          <Pressable onPress={handleRestore} disabled={!!purchasing} style={styles.restoreBtn}>
            {purchasing === 'restore' ? (
              <ActivityIndicator color={colors.textMuted} size="small" />
            ) : (
              <Text style={styles.restoreText}>
                {isKo ? '이전 구독 복원' : 'Restore purchases'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
// 컬럼 너비
const TABLE_PADDING = layout.screenPadding;
const LABEL_W = 100;
const PLAN_W = Math.floor((SCREEN_W - TABLE_PADDING * 2 - LABEL_W) / 3);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
  },
  closeBtnBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── 배너 ──
  bannerWrap: {
    width: SCREEN_W,
    height: BANNER_H,
    overflow: 'hidden',
  },
  bannerImage: {
    width: SCREEN_W,
    height: BANNER_H,
  },
  bannerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BANNER_H * 0.4,
    background: 'transparent',
    // 순수 RN에서 gradient 대신 흰 반투명 레이어
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  bannerTitle: {
    position: 'absolute',
    bottom: 16,
    left: TABLE_PADDING,
    fontFamily: fonts.black900Italic,
    fontSize: 36,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },

  // ── 비교 테이블 ──
  tableWrap: {
    marginHorizontal: TABLE_PADDING,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    backgroundColor: colors.background,
  },
  tableRowAlt: {
    backgroundColor: colors.surface,
  },
  labelCell: {
    width: LABEL_W,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 4,
    justifyContent: 'center',
  },
  labelText: {
    fontFamily: fonts.regular400,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  planCell: {
    width: PLAN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  planCellHeader: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  planCellPlus: {
    backgroundColor: '#F5F5F5',
  },
  planCellPrime: {
    backgroundColor: '#FFFBF0',
  },
  planCellPlusBody: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  planCellPrimeBody: {
    backgroundColor: 'rgba(184,134,11,0.04)',
  },
  planHeaderText: {
    fontFamily: fonts.bold700,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  planHeaderTextPaid: {
    color: colors.textPrimary,
  },
  planHeaderTextPrime: {
    color: '#B8860B',
  },
  cellText: {
    fontFamily: fonts.semibold600,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cellTextHighlight: {
    color: '#B8860B',
  },
  cellNone: {
    fontFamily: fonts.regular400,
    fontSize: 13,
    color: colors.textMuted,
  },

  // ── 구매 섹션 ──
  buySection: {
    marginHorizontal: TABLE_PADDING,
    marginTop: 20,
    gap: 16,
  },
  planGroup: {
    gap: 8,
  },
  planGroupLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  planGroupLabel: {
    fontFamily: fonts.bold700,
    fontSize: 13,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planGroupLabelPrime: {
    color: '#B8860B',
  },
  planBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  periodCard: {
    flex: 1,
    borderRadius: layout.cardRadius,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    position: 'relative',
  },
  periodCardPlus: {
    backgroundColor: '#111111',
  },
  periodCardPrime: {
    backgroundColor: '#1A1200',
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  periodCardYearly: {
    // 연간 카드는 약간 강조
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buyBtnDisabled: {
    opacity: 0.45,
  },
  periodCardPeriod: {
    fontFamily: fonts.semibold600,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  periodCardPeriodPrime: {
    color: 'rgba(255,215,0,0.6)',
  },
  periodCardPrice: {
    fontFamily: fonts.bold700,
    fontSize: 17,
    color: colors.background,
  },
  periodCardPricePrime: {
    color: '#FFD700',
  },
  periodCardSub: {
    fontFamily: fonts.light300,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  periodCardSubPrime: {
    color: 'rgba(255,215,0,0.45)',
  },
  savingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.success,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  savingBadgePrime: {
    backgroundColor: '#B8860B',
  },
  savingBadgeText: {
    fontFamily: fonts.bold700,
    fontSize: 9,
    color: colors.background,
  },

  // ── 복원 ──
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  restoreText: {
    fontFamily: fonts.light300,
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
