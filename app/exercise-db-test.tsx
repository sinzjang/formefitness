// ExerciseDB 연동 테스트 — OSS / RapidAPI GIF 프리뷰
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Icon } from '../components/ui/Icon';
import { colors, typography, layout } from '../constants/theme';
import { ExerciseDbGif } from '../components/workout/ExerciseDbGif';
import {
  checkRapidApiHealth,
  fetchRapidBodyPartList,
  hasRapidApiKey,
  searchExercises,
} from '../lib/exerciseDb';
import type { ExerciseDbItem, ExerciseDbProvider } from '../types/exerciseDb';

const OSS_BODY_PARTS = ['chest', 'back', 'shoulders', 'upper arms', 'waist', 'upper legs'];

export default function ExerciseDbTestScreen() {
  const [provider, setProvider] = useState<ExerciseDbProvider>(
    hasRapidApiKey() ? 'rapidapi' : 'oss'
  );
  const [query, setQuery] = useState('bench');
  const [bodyPart, setBodyPart] = useState('chest');
  const [items, setItems] = useState<ExerciseDbItem[]>([]);
  const [selected, setSelected] = useState<ExerciseDbItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rapidStatus, setRapidStatus] = useState<string>('확인 중…');
  const [bodyParts, setBodyParts] = useState<string[]>(OSS_BODY_PARTS);

  useEffect(() => {
    void (async () => {
      if (!hasRapidApiKey()) {
        setRapidStatus('RapidAPI 키 없음 (.env → EXPO_PUBLIC_RAPIDAPI_KEY)');
        return;
      }
      const health = await checkRapidApiHealth();
      setRapidStatus(`${health.httpStatus} — ${health.message}`);
      if (health.ok) {
        const list = await fetchRapidBodyPartList();
        if (list.length > 0) setBodyParts(list);
      }
    })();
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
    const result = await searchExercises(provider, {
      name: query.trim() || undefined,
      bodyParts: bodyPart,
      limit: 12,
    });
    setItems(result.data);
    setError(result.error ?? null);
    if (result.data.length > 0) setSelected(result.data[0]);
    setLoading(false);
  }, [provider, query, bodyPart]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>ExerciseDB 테스트</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>RapidAPI 상태</Text>
        <Text style={styles.status}>{rapidStatus}</Text>
        <Text style={styles.hint}>
          구독 API: exercisedb.p.rapidapi.com · GET /status → online
          {'\n'}
          GIF: GET /image?exerciseId=…&resolution=180
        </Text>

        <Text style={styles.label}>Provider</Text>
        <View style={styles.segment}>
          {(['oss', 'rapidapi'] as ExerciseDbProvider[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.segmentBtn, provider === p && styles.segmentBtnActive]}
              onPress={() => setProvider(p)}
            >
              <Text style={[styles.segmentText, provider === p && styles.segmentTextActive]}>
                {p === 'oss' ? 'OSS (무료)' : 'RapidAPI'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>검색어 (name)</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="bench press"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Body part</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {bodyParts.map((bp) => (
            <Pressable
              key={bp}
              style={[styles.chip, bodyPart === bp && styles.chipActive]}
              onPress={() => setBodyPart(bp)}
            >
              <Text style={[styles.chipText, bodyPart === bp && styles.chipTextActive]}>{bp}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable style={styles.searchBtn} onPress={() => void runSearch()}>
          <Text style={styles.searchBtnText}>검색</Text>
        </Pressable>

        {loading && <ActivityIndicator style={{ marginVertical: 16 }} color={colors.textPrimary} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {selected && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{selected.name}</Text>
            <Text style={styles.previewMeta}>ID: {selected.exerciseId}</Text>
            <ExerciseDbGif
              exerciseId={selected.exerciseId}
              gifUrl={provider === 'oss' ? selected.gifUrl : undefined}
              width={280}
              height={200}
              borderRadius={12}
              style={styles.previewGif}
            />
            <Text style={styles.previewMeta}>
              {selected.targetMuscles.join(', ')} · {selected.equipments.join(', ')}
            </Text>
          </View>
        )}

        <Text style={styles.label}>결과 ({items.length})</Text>
        {items.map((item) => (
          <Pressable
            key={item.exerciseId}
            style={[styles.row, selected?.exerciseId === item.exerciseId && styles.rowSelected]}
            onPress={() => setSelected(item)}
          >
            <ExerciseDbGif
              exerciseId={item.exerciseId}
              gifUrl={provider === 'oss' ? item.gifUrl : undefined}
              width={52}
              height={52}
            />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.bodyParts.join(', ')}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
  },
  title: { ...typography.sectionHeader, fontSize: 18 },
  scroll: { paddingHorizontal: layout.screenPadding, paddingBottom: 40 },
  label: {
    ...typography.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    color: colors.textMuted,
  },
  status: { ...typography.body, color: colors.textPrimary },
  hint: { ...typography.caption, marginTop: 6, lineHeight: 16 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  segmentText: { ...typography.listItem, fontSize: 13 },
  segmentTextActive: { color: colors.background },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.body,
    color: colors.textPrimary,
  },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.surface },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary },
  searchBtn: {
    marginTop: 12,
    backgroundColor: colors.textPrimary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBtnText: { ...typography.button, color: colors.background },
  error: { ...typography.body, color: colors.accent, marginTop: 8 },
  previewCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  previewTitle: { ...typography.listItem, fontSize: 17, textAlign: 'center' },
  previewMeta: { ...typography.caption, marginTop: 4, textAlign: 'center' },
  previewGif: { marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowSelected: { backgroundColor: colors.surface },
  rowText: { flex: 1 },
  rowTitle: { ...typography.listItem, fontSize: 15 },
  rowMeta: { ...typography.caption, marginTop: 2 },
});
