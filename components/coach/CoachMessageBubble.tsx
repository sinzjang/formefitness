// 채팅 메시지 버블
import { useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import type { CoachMessage, CoachName, Language, RestSeconds, RoutineExerciseEntry } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { EXERCISES, exerciseLocalizedName, exerciseName, type ExerciseDef } from '../../constants/exercises';
import { gearToResistance } from '../../constants/gears';
import { getExerciseKey } from '../../lib/exerciseKey';
import { resolveExerciseKoName } from '../../lib/exerciseKo';
import { t } from '../../lib/i18n';
import { CoachAvatar } from './CoachAvatar';
import { GoalImageCard } from './GoalImageCard';
import { RoutineWarningCard } from './RoutineWarningCard';
import { ChartPlaceholderCard } from './ChartPlaceholderCard';
import { useCoachWorkoutContextStore } from '../../stores/coachWorkoutContextStore';
import { useLanguage, useSettingsStore } from '../../stores/settingsStore';
import { useRoutineStore } from '../../stores/routineStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useLocationStore } from '../../stores/locationStore';

interface CoachMessageBubbleProps {
  message: CoachMessage;
  coachName: CoachName;
  lang: Language;
  goalImageUrl?: string;
}

const SENTENCE_RE = /[^.!?。！？]+[.!?。！？]+(?:["')\]]+)?|[^.!?。！？]+$/g;
const GREETING_RE =
  /^(welcome back|hey|hi|hello|good morning|good afternoon|good evening|안녕|좋은 아침|어서 와|돌아왔)/i;

interface TextSegment {
  text: string;
  bold: boolean;
}

interface ExerciseSuggestion {
  label: string;
  entry: RoutineExerciseEntry;
  matchedPhrase: string;
}

function splitCoachMessage(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const explicitParagraphs = trimmed
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (explicitParagraphs.length > 1) return explicitParagraphs;

  const sentences = (trimmed.match(SENTENCE_RE) ?? [trimmed])
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return [trimmed];

  const paragraphs: string[] = [];
  let cursor = 0;

  if (GREETING_RE.test(sentences[0]) && sentences[0].length <= 80) {
    paragraphs.push(sentences[0]);
    cursor = 1;
  }

  while (cursor < sentences.length) {
    const remaining = sentences.length - cursor;
    const shouldCloseStrong = remaining <= 2;
    const groupSize = shouldCloseStrong ? remaining : cursor <= 1 ? 1 : 2;
    paragraphs.push(sentences.slice(cursor, cursor + groupSize).join(' '));
    cursor += groupSize;
  }

  return paragraphs;
}

function splitBoldSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const parts = text.split('**');

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part) continue;
    segments.push({
      text: part,
      bold: index % 2 === 1 && index < parts.length - 1,
    });
  }

  return segments.length > 0 ? segments : [{ text, bold: false }];
}

function normalizeMatchText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/[()[\]{}.,!?;:/\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function withoutEquipmentPrefix(text: string): string {
  return text
    .replace(
      /^(alternate|alternating|assisted|band|barbell|bodyweight|cable|dumbbell|kettlebell|lever|machine|resistance band|smith|weighted|어시스티드|어시스트|밴드|바벨|덤벨|케이블|케틀벨|레버|머신|스미스|웨이티드|맨몸)\s+/,
      ''
    )
    .trim();
}

function singularizeToken(token: string): string {
  if (!/^[a-z]+$/.test(token) || token.length <= 3) return token;
  if (token.endsWith('ss')) return token;
  return token.endsWith('s') ? token.slice(0, -1) : token;
}

function normalizeForLooseMatch(text: string): string {
  return normalizeMatchText(text)
    .split(' ')
    .map(singularizeToken)
    .join(' ');
}

function exerciseMatchCandidates(exercise: ExerciseDef): string[] {
  const rawNames = [
    exercise.nameEn,
    exercise.name,
    resolveExerciseKoName(exercise),
  ];

  const candidates = rawNames
    .flatMap((name) => {
      const normalized = normalizeForLooseMatch(name);
      const withoutPrefix = withoutEquipmentPrefix(normalized);
      const windowCandidates = [normalized, withoutPrefix].flatMap((base) => {
        const tokens = base.split(' ').filter(Boolean);
        if (tokens.length < 3) return [];
        return [
          tokens.slice(0, 3).join(' '),
          tokens.slice(-2).join(' '),
          tokens.slice(-3).join(' '),
        ];
      });
      const tokens = normalized.split(' ').filter(Boolean);
      const aliasCandidates = [
        tokens.includes('incline') && tokens.includes('dumbbell') && tokens.includes('press')
          ? 'incline dumbbell press'
          : '',
        tokens.includes('incline') && tokens.includes('barbell') && tokens.includes('press')
          ? 'incline barbell press'
          : '',
        tokens.includes('cable') && tokens.includes('fly') ? 'cable fly' : '',
        tokens.some((token) => token === 'tricep' || token === 'triceps') && tokens.includes('dip')
          ? 'tricep dip'
          : '',
        tokens.includes('lateral') && tokens.includes('raise') ? 'lateral raise' : '',
        tokens.includes('hammer') && tokens.includes('curl') ? 'hammer curl' : '',
      ].filter(Boolean);
      const spaced = [normalized, withoutPrefix, ...windowCandidates, ...aliasCandidates];
      const compactKorean = spaced
        .filter((candidate) => /[^\x00-\x7F]/.test(candidate))
        .map((candidate) => candidate.replace(/\s+/g, ''));
      return [...spaced, ...compactKorean];
    })
    .filter((name) => name.length >= 4 && !/^[a-z]+$/.test(name));

  return [...new Set(candidates)];
}

function hasCandidateInText(normalizedText: string, candidate: string): boolean {
  if (normalizedText.includes(` ${candidate} `)) return true;

  const compactText = normalizedText.replace(/\s+/g, '');
  if (!candidate.includes(' ') && /[^\x00-\x7F]/.test(candidate)) {
    return compactText.includes(candidate);
  }

  return false;
}

function buildRoutineExerciseEntry(
  exercise: ExerciseDef,
  defaultRestSeconds: RestSeconds
): RoutineExerciseEntry {
  const localized = exerciseLocalizedName(exercise);
  return {
    exerciseKey: getExerciseKey(localized, exercise.customId),
    exerciseName: localized,
    muscleGroup: exercise.muscleGroup,
    resistanceType: gearToResistance(exercise.gear),
    defaultRestSeconds,
    customId: exercise.customId,
  };
}

function findExerciseSuggestions(
  text: string,
  lang: Language,
  existingKeys: Set<string>,
  defaultRestSeconds: RestSeconds
): ExerciseSuggestion[] {
  const normalizedText = ` ${normalizeForLooseMatch(text)} `;
  const matches = EXERCISES
    .filter((exercise) => !exercise.isCustom)
    .map((exercise) => {
      const entry = buildRoutineExerciseEntry(exercise, defaultRestSeconds);
      if (existingKeys.has(entry.exerciseKey)) return null;

      const candidates = exerciseMatchCandidates(exercise);

      const match = candidates.reduce(
        (best, candidate) => {
        if (!hasCandidateInText(normalizedText, candidate)) return best;
        const index = normalizedText.indexOf(` ${candidate} `);
        const safeIndex = index >= 0 ? index : normalizedText.indexOf(candidate.split(' ')[0] ?? candidate);
          return safeIndex >= 0 && (best.index < 0 || safeIndex < best.index)
            ? { index: safeIndex, phrase: candidate }
            : best;
        },
        { index: -1, phrase: '' }
      );

      if (match.index < 0) return null;
      return {
        foundAt: match.index,
        isInactive: exercise.is_active === false,
        suggestion: {
          label: exerciseName(exercise, lang),
          entry,
          matchedPhrase: match.phrase,
        },
      };
    })
    .filter(
      (match): match is { foundAt: number; isInactive: boolean; suggestion: ExerciseSuggestion } =>
        Boolean(match)
    )
    .sort(
      (a, b) =>
        a.foundAt - b.foundAt ||
        Number(a.isInactive) - Number(b.isInactive) ||
        b.suggestion.matchedPhrase.length - a.suggestion.matchedPhrase.length
    )
    .map((match) => match.suggestion);

  const seen = new Set<string>();
  const kept: ExerciseSuggestion[] = [];

  for (const suggestion of matches) {
    const key = suggestion.matchedPhrase || suggestion.entry.exerciseKey;
    if (seen.has(key)) continue;
    if (
      kept.some(
        (item) =>
          item.matchedPhrase.includes(suggestion.matchedPhrase) ||
          suggestion.matchedPhrase.includes(item.matchedPhrase)
      )
    ) {
      continue;
    }

    seen.add(key);
    kept.push(suggestion);
    if (kept.length >= 4) break;
  }

  return kept;
}

export function CoachMessageBubble({ message, coachName, lang, goalImageUrl }: CoachMessageBubbleProps) {
  const isUser = message.role === 'user';
  const coachParagraphs = isUser ? [] : splitCoachMessage(message.text);

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && <CoachAvatar coachName={coachName} size={32} />}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCoach]}>
        {isUser ? (
          <Text style={[styles.text, styles.singleText, styles.textUser]}>{message.text}</Text>
        ) : (
          coachParagraphs.map((paragraph, index) => (
            <Text
              key={`${message.id}-paragraph-${index}`}
              style={[
                styles.text,
                styles.paragraph,
                index === coachParagraphs.length - 1 && styles.paragraphLast,
              ]}
            >
              {splitBoldSegments(paragraph).map((segment, segmentIndex) => (
                <Text
                  key={`${message.id}-paragraph-${index}-segment-${segmentIndex}`}
                  style={segment.bold && styles.boldText}
                >
                  {segment.text}
                </Text>
              ))}
            </Text>
          ))
        )}

        {!isUser && message.showGoalImage && (
          <GoalImageCard lang={lang} imageUrl={goalImageUrl} />
        )}

        {!isUser && message.recommendedRoutine && (
          <RoutineWarningCard lang={lang} routine={message.recommendedRoutine} />
        )}

        {!isUser && message.chart && <ChartPlaceholderCard lang={lang} chart={message.chart} />}

        {!isUser && <CoachExerciseSuggestionActions messageText={message.text} />}
      </View>
    </View>
  );
}

function CoachExerciseSuggestionActions({ messageText }: { messageText: string }) {
  const lang = useLanguage();
  const defaultRestSeconds = useSettingsStore((s) => s.defaultRestSeconds);
  const routines = useRoutineStore((s) => s.routines);
  const addRoutine = useRoutineStore((s) => s.addRoutine);
  const addExerciseToRoutine = useRoutineStore((s) => s.addExerciseToRoutine);
  const session = useWorkoutStore((s) => s.session);
  const startSession = useWorkoutStore((s) => s.startSession);
  const addSessionExercise = useWorkoutStore((s) => s.addExercise);
  const selectedLocationId = useLocationStore((s) => s.selectedLocationId);
  const viewingRoutine = useCoachWorkoutContextStore((s) => s.viewingRoutine);
  const setViewingRoutine = useCoachWorkoutContextStore((s) => s.setViewingRoutine);
  const [pendingSuggestion, setPendingSuggestion] = useState<ExerciseSuggestion | null>(null);
  const [newRoutineName, setNewRoutineName] = useState('');

  const routineId = session?.routineId ?? viewingRoutine?.routineId;
  const routine = useMemo(
    () => routines.find((item) => item.id === routineId),
    [routineId, routines]
  );
  const activeRoutines = useMemo(
    () => routines.filter((item) => item.is_active !== false),
    [routines]
  );

  const suggestions = useMemo(() => {
    const existingKeys = new Set(
      routine ? routine.exercises.map((exercise) => exercise.exerciseKey) : []
    );
    return findExerciseSuggestions(messageText, lang, existingKeys, defaultRestSeconds);
  }, [defaultRestSeconds, lang, messageText, routine]);

  if (suggestions.length === 0) return null;

  const addToSession = (suggestion: ExerciseSuggestion) => {
    let currentSession = useWorkoutStore.getState().session;
    if (!currentSession) {
      startSession(selectedLocationId);
      currentSession = useWorkoutStore.getState().session;
    }

    if (
      currentSession?.exercises.some(
        (exercise) => getExerciseKey(exercise.exerciseName, exercise.customId) === suggestion.entry.exerciseKey
      )
    ) {
      return;
    }

    addSessionExercise(
      suggestion.entry.exerciseName,
      suggestion.entry.muscleGroup,
      suggestion.entry.resistanceType,
      suggestion.entry.defaultRestSeconds,
      suggestion.entry.customId
    );
  };

  const addToRoutine = (targetRoutineId: string, suggestion: ExerciseSuggestion) => {
    const updated = addExerciseToRoutine(targetRoutineId, suggestion.entry);
    if (updated) setViewingRoutine(updated);

    const currentSession = useWorkoutStore.getState().session;
    if (
      currentSession?.routineId === targetRoutineId &&
      !currentSession.exercises.some(
        (exercise) => getExerciseKey(exercise.exerciseName, exercise.customId) === suggestion.entry.exerciseKey
      )
    ) {
      addSessionExercise(
        suggestion.entry.exerciseName,
        suggestion.entry.muscleGroup,
        suggestion.entry.resistanceType,
        suggestion.entry.defaultRestSeconds,
        suggestion.entry.customId
      );
    }
  };

  const closePicker = () => {
    setPendingSuggestion(null);
    setNewRoutineName('');
  };

  const handlePress = (suggestion: ExerciseSuggestion) => {
    if (!routine) {
      setPendingSuggestion(suggestion);
      setNewRoutineName('');
      return;
    }

    const title =
      lang === 'ko'
        ? `${suggestion.label} 추가`
        : `Add ${suggestion.label}`;
    const body =
      lang === 'ko'
        ? `이 운동을 ${routine.name} 루틴에 추가하시겠습니까?`
        : `Add this exercise to ${routine.name}?`;

    Alert.alert(title, body, [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: lang === 'ko' ? '추가' : 'Add',
        onPress: () => {
          addToRoutine(routine.id, suggestion);
        },
      },
    ]);
  };

  const handleCreateRoutine = () => {
    if (!pendingSuggestion) return;
    const name = newRoutineName.trim() || pendingSuggestion.label;
    const created = addRoutine(selectedLocationId, name, [pendingSuggestion.entry]);
    setViewingRoutine(created);
    closePicker();
  };

  return (
    <>
      <View style={styles.suggestionWrap}>
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion.entry.exerciseKey}
            style={({ pressed }) => [
              styles.suggestionBtn,
              pressed && styles.suggestionBtnPressed,
            ]}
            onPress={() => handlePress(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={!!pendingSuggestion}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View style={styles.actionModalRoot}>
          <Pressable style={styles.actionBackdrop} onPress={closePicker} />
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>
              {lang === 'ko'
                ? `${pendingSuggestion?.label ?? ''} 추가`
                : `Add ${pendingSuggestion?.label ?? ''}`}
            </Text>
            <Text style={styles.actionSubtitle}>
              {lang === 'ko'
                ? '이 운동을 어디에 추가할까요?'
                : 'Where should this exercise go?'}
            </Text>

            {pendingSuggestion && (
              <Pressable
                style={({ pressed }) => [styles.actionPrimary, pressed && styles.actionPressed]}
                onPress={() => {
                  addToSession(pendingSuggestion);
                  closePicker();
                }}
              >
                <Text style={styles.actionPrimaryText}>
                  {session ? (lang === 'ko' ? '오늘 세션에 추가' : "Add to today's session") : (lang === 'ko' ? '오늘 세션 만들고 추가' : "Start today's session")}
                </Text>
              </Pressable>
            )}

            {activeRoutines.length > 0 && (
              <>
                <Text style={styles.actionLabel}>
                  {lang === 'ko' ? '기존 루틴' : 'Existing routines'}
                </Text>
                <ScrollView style={styles.routineList} showsVerticalScrollIndicator={false}>
                  {activeRoutines.slice(0, 8).map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.routineTarget, pressed && styles.actionPressed]}
                      onPress={() => {
                        if (!pendingSuggestion) return;
                        addToRoutine(item.id, pendingSuggestion);
                        closePicker();
                      }}
                    >
                      <View style={styles.routineTargetTextWrap}>
                        <Text style={styles.routineTargetName}>{item.name}</Text>
                        <Text style={styles.routineTargetMeta}>
                          {item.exercises.length}
                          {t('routineExerciseSuffix', lang)}
                        </Text>
                      </View>
                      <Text style={styles.routineTargetAdd}>
                        {lang === 'ko' ? '추가' : 'Add'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.actionLabel}>
              {lang === 'ko' ? '새 루틴' : 'New routine'}
            </Text>
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                value={newRoutineName}
                onChangeText={setNewRoutineName}
                placeholder={pendingSuggestion?.label ?? ''}
                placeholderTextColor={colors.textMuted}
              />
              <Pressable
                style={({ pressed }) => [styles.createBtn, pressed && styles.actionPressed]}
                onPress={handleCreateRoutine}
              >
                <Text style={styles.createBtnText}>{lang === 'ko' ? '만들기' : 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function CoachTypingIndicator({ coachName }: { coachName: CoachName }) {
  return (
    <View style={styles.row}>
      <CoachAvatar coachName={coachName} size={32} />
      <View style={[styles.bubble, styles.bubbleCoach, styles.typing]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  rowUser: {
    flexDirection: 'row-reverse',
  },
  bubble: {
    flex: 1,
    maxWidth: '82%',
    borderRadius: layout.cardRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleCoach: {
    backgroundColor: colors.surface,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
  },
  bubbleUser: {
    backgroundColor: colors.textPrimary,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  singleText: {
    marginBottom: 0,
  },
  paragraph: {
    marginBottom: 8,
  },
  paragraphLast: {
    marginBottom: 0,
  },
  boldText: {
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  suggestionBtn: {
    borderWidth: layout.borderWidth,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.background,
  },
  suggestionBtnPressed: {
    opacity: 0.72,
  },
  suggestionText: {
    ...typography.button,
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'none',
  },
  actionModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 17, 0.28)',
  },
  actionSheet: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: layout.cardRadius + 4,
    borderTopRightRadius: layout.cardRadius + 4,
    backgroundColor: colors.background,
    borderTopWidth: layout.borderWidth,
    borderColor: colors.border,
  },
  actionTitle: {
    ...typography.sectionHeader,
    fontSize: 18,
    marginBottom: 4,
  },
  actionSubtitle: {
    ...typography.body,
    marginBottom: 14,
  },
  actionPrimary: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: colors.textPrimary,
    marginBottom: 14,
  },
  actionPrimaryText: {
    ...typography.button,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 8,
  },
  routineList: {
    maxHeight: 220,
    marginBottom: 14,
  },
  routineTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  routineTargetTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  routineTargetName: {
    ...typography.listItem,
  },
  routineTargetMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  routineTargetAdd: {
    ...typography.button,
    color: colors.accent,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createInput: {
    ...typography.listItem,
    flex: 1,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  createBtnText: {
    ...typography.button,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  textUser: {
    color: colors.background,
  },
  typing: {
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 56,
  },
});
