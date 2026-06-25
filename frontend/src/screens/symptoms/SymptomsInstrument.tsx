import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { postInstrumentResponse } from '../../api/symptoms';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomsInstrument'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomsInstrument'>;

// ─────────────────────────────────────────────────────────────────────────────
// PROMIS T-score lookup tables (mirrors backend/config/instruments.js)
// ─────────────────────────────────────────────────────────────────────────────

const T_SCORE_TABLES: Record<string, Record<number, number>> = {
  promis_fatigue_4a: {
    4: 33.7, 5: 39.7, 6: 43.1, 7: 46.0, 8: 48.1,
    9: 50.2, 10: 52.0, 11: 54.0,
    12: 57.0, 13: 58.9, 14: 60.7, 15: 62.5, 16: 64.3,
    17: 66.1, 18: 67.9, 19: 70.0, 20: 72.8,
  },
  promis_anxiety_4a: {
    4: 40.3, 5: 48.0, 6: 51.2, 7: 53.7, 8: 55.8,
    9: 57.7, 10: 59.5, 11: 61.4, 12: 63.4, 13: 65.3,
    14: 67.3, 15: 69.3, 16: 71.2, 17: 73.3, 18: 75.4,
    19: 77.9, 20: 81.6,
  },
  promis_depression_4a: {
    4: 41.0, 5: 49.0, 6: 51.8, 7: 53.9, 8: 55.7,
    9: 57.3, 10: 58.9, 11: 60.5, 12: 62.2, 13: 63.9,
    14: 65.7, 15: 67.5, 16: 69.4, 17: 71.2, 18: 73.3,
    19: 75.7, 20: 79.4,
  },
  promis_sleep_4a: {
    4: 32.0, 5: 37.5, 6: 41.1, 7: 43.8, 8: 46.2,
    9: 48.3, 10: 50.5, 11: 52.4, 12: 54.3, 13: 56.2,
    14: 58.1, 15: 60.1, 16: 62.3, 17: 64.5, 18: 67.0,
    19: 69.9, 20: 73.3,
  },
  promis_physical_function_4a: {
    4: 22.5, 5: 26.6, 6: 28.9, 7: 30.5, 8: 31.9,
    9: 33.3, 10: 34.7, 11: 36.2, 12: 37.8, 13: 39.6,
    14: 41.6, 15: 43.8, 16: 46.4, 17: 49.2, 18: 52.4,
    19: 55.1, 20: 57.0,
  },
};

function lookupTScore(instrumentId: string, rawScore: number): number | null {
  return T_SCORE_TABLES[instrumentId]?.[rawScore] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Instrument definitions
// ─────────────────────────────────────────────────────────────────────────────

interface ResponseOption {
  value: number;
  label: string;
}

interface InstrumentQuestion {
  index: number;
  text: string;
  reverseScored: boolean;
  responseScale?: ResponseOption[];
}

interface InstrumentDef {
  instrumentId: string;
  stem: string | null;
  instructions: string | null;
  questions: InstrumentQuestion[];
  defaultScale: ResponseOption[];
  reverseScoreTransform?: Record<number, number>;
  scoring: 'sum_then_tscore' | 'single_item_grade' | 'sum_and_average';
}

const INSTRUMENTS: Record<string, InstrumentDef> = {
  fatigue: {
    instrumentId: 'promis_fatigue_4a',
    stem: 'In the past 7 days...',
    instructions: null,
    questions: [
      { index: 0, text: 'I feel fatigued.',                                   reverseScored: false },
      { index: 1, text: 'I have trouble starting things because I am tired.', reverseScored: false },
      { index: 2, text: 'How run-down did you feel on average?',              reverseScored: false },
      { index: 3, text: 'How fatigued were you on average?',                  reverseScored: false },
    ],
    defaultScale: [
      { value: 1, label: 'Not at all' },
      { value: 2, label: 'A little bit' },
      { value: 3, label: 'Somewhat' },
      { value: 4, label: 'Quite a bit' },
      { value: 5, label: 'Very much' },
    ],
    scoring: 'sum_then_tscore',
  },
  anxiety: {
    instrumentId: 'promis_anxiety_4a',
    stem: 'In the past 7 days...',
    instructions: null,
    questions: [
      { index: 0, text: 'I felt fearful.',                                              reverseScored: false },
      { index: 1, text: 'I found it hard to focus on anything other than my anxiety.', reverseScored: false },
      { index: 2, text: 'My worries overwhelmed me.',                                  reverseScored: false },
      { index: 3, text: 'I felt uneasy.',                                              reverseScored: false },
    ],
    defaultScale: [
      { value: 1, label: 'Never' },
      { value: 2, label: 'Rarely' },
      { value: 3, label: 'Sometimes' },
      { value: 4, label: 'Often' },
      { value: 5, label: 'Always' },
    ],
    scoring: 'sum_then_tscore',
  },
  depression_mood: {
    instrumentId: 'promis_depression_4a',
    stem: 'In the past 7 days...',
    instructions: null,
    questions: [
      { index: 0, text: 'I felt worthless.', reverseScored: false },
      { index: 1, text: 'I felt helpless.',  reverseScored: false },
      { index: 2, text: 'I felt depressed.', reverseScored: false },
      { index: 3, text: 'I felt hopeless.',  reverseScored: false },
    ],
    defaultScale: [
      { value: 1, label: 'Never' },
      { value: 2, label: 'Rarely' },
      { value: 3, label: 'Sometimes' },
      { value: 4, label: 'Often' },
      { value: 5, label: 'Always' },
    ],
    scoring: 'sum_then_tscore',
  },
  sleep_disturbance: {
    instrumentId: 'promis_sleep_4a',
    stem: 'In the past 7 days...',
    instructions: null,
    questions: [
      {
        index: 0,
        text: 'My sleep quality was...',
        reverseScored: true,
        responseScale: [
          { value: 1, label: 'Very poor' },
          { value: 2, label: 'Poor' },
          { value: 3, label: 'Fair' },
          { value: 4, label: 'Good' },
          { value: 5, label: 'Very good' },
        ],
      },
      { index: 1, text: 'My sleep was refreshing.',        reverseScored: true  },
      { index: 2, text: 'I had a problem with my sleep.',   reverseScored: false },
      { index: 3, text: 'I had difficulty falling asleep.', reverseScored: false },
    ],
    defaultScale: [
      { value: 1, label: 'Not at all' },
      { value: 2, label: 'A little bit' },
      { value: 3, label: 'Somewhat' },
      { value: 4, label: 'Quite a bit' },
      { value: 5, label: 'Very much' },
    ],
    reverseScoreTransform: { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 },
    scoring: 'sum_then_tscore',
  },
  reduced_exercise_tolerance: {
    instrumentId: 'promis_physical_function_4a',
    stem: 'Are you able to...',
    instructions: null,
    questions: [
      { index: 0, text: 'Do chores such as vacuuming or yard work?', reverseScored: false },
      { index: 1, text: 'Go up and down stairs at a normal pace?',   reverseScored: false },
      { index: 2, text: 'Go for a walk of at least 15 minutes?',     reverseScored: false },
      { index: 3, text: 'Run errands and shop?',                      reverseScored: false },
    ],
    defaultScale: [
      { value: 5, label: 'Without any difficulty' },
      { value: 4, label: 'With a little difficulty' },
      { value: 3, label: 'With some difficulty' },
      { value: 2, label: 'With much difficulty' },
      { value: 1, label: 'Unable to do' },
    ],
    scoring: 'sum_then_tscore',
  },
  breathlessness_activity: {
    instrumentId: 'mmrc',
    stem: null,
    instructions: null,
    questions: [
      {
        index: 0,
        text: 'Please select the description that best matches your experience of breathlessness:',
        reverseScored: false,
        responseScale: [
          { value: 0, label: 'Grade 0: I only get breathless with strenuous exercise.' },
          { value: 1, label: 'Grade 1: I get short of breath when hurrying on level ground or walking up a slight hill.' },
          { value: 2, label: 'Grade 2: I walk slower than most people my age on level ground because of breathlessness, or I have to stop to catch my breath when walking at my own pace.' },
          { value: 3, label: 'Grade 3: I stop for breath after walking about 100 metres or after a few minutes on level ground.' },
          { value: 4, label: 'Grade 4: I am too breathless to leave the house, or I get breathless when dressing or undressing.' },
        ],
      },
    ],
    defaultScale: [],
    scoring: 'single_item_grade',
  },
  hot_flashes: {
    instrumentId: 'hfrdis',
    stem: null,
    instructions: 'Please rate how much hot flashes have interfered with the following areas of your life during the past week. Use a scale from 0 to 10, where 0 means no interference and 10 means complete interference. If you are not experiencing hot flashes, mark 0.',
    questions: [
      { index: 0, text: 'Work (include work at home)',  reverseScored: false },
      { index: 1, text: 'Social activities',             reverseScored: false },
      { index: 2, text: 'Leisure activities',            reverseScored: false },
      { index: 3, text: 'Sleep',                         reverseScored: false },
      { index: 4, text: 'Mood',                          reverseScored: false },
      { index: 5, text: 'Concentration',                 reverseScored: false },
      { index: 6, text: 'Relations with others',         reverseScored: false },
      { index: 7, text: 'Sexuality',                     reverseScored: false },
      { index: 8, text: 'Enjoyment of life',             reverseScored: false },
      { index: 9, text: 'Overall quality of life',       reverseScored: false },
    ],
    defaultScale: [],
    scoring: 'sum_and_average',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HFRDIS item slider (0–10)
// ─────────────────────────────────────────────────────────────────────────────

const HFRDIS_SLIDER_WIDTH = Dimensions.get('window').width - 80;

interface HfrdisSliderProps {
  value: number;
  onChange: (v: number) => void;
}

const HfrdisSlider: React.FC<HfrdisSliderProps> = ({ value, onChange }) => {
  const lastX = useRef((value / 10) * HFRDIS_SLIDER_WIDTH);
  const panX = useRef(new Animated.Value(lastX.current)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        let x = Math.max(0, Math.min(HFRDIS_SLIDER_WIDTH, lastX.current + gs.dx));
        panX.setValue(x);
        onChange(Math.round((x / HFRDIS_SLIDER_WIDTH) * 10));
      },
      onPanResponderRelease: (_, gs) => {
        let x = Math.max(0, Math.min(HFRDIS_SLIDER_WIDTH, lastX.current + gs.dx));
        lastX.current = x;
        panX.setValue(x);
        onChange(Math.round((x / HFRDIS_SLIDER_WIDTH) * 10));
      },
    })
  ).current;

  const thumbX = panX.interpolate({ inputRange: [0, HFRDIS_SLIDER_WIDTH], outputRange: [0, HFRDIS_SLIDER_WIDTH], extrapolate: 'clamp' });

  return (
    <View style={hfrdisSliderStyles.wrapper}>
      <View style={hfrdisSliderStyles.track}>
        <Animated.View style={[hfrdisSliderStyles.fill, { width: thumbX }]} />
        <Animated.View
          style={[hfrdisSliderStyles.thumb, { transform: [{ translateX: thumbX }] }]}
          {...panResponder.panHandlers}
        />
      </View>
      <View style={hfrdisSliderStyles.labels}>
        <Text style={hfrdisSliderStyles.labelText}>0 — No interference</Text>
        <Text style={hfrdisSliderStyles.labelText}>10 — Complete interference</Text>
      </View>
    </View>
  );
};

const hfrdisSliderStyles = StyleSheet.create({
  wrapper: { marginVertical: 8 },
  track: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    width: HFRDIS_SLIDER_WIDTH,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    backgroundColor: '#A855F7',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A855F7',
    top: -9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: HFRDIS_SLIDER_WIDTH,
    alignSelf: 'center',
    marginTop: 8,
  },
  labelText: { fontSize: 11, color: '#9CA3AF', maxWidth: '48%' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Scoring helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeHfrdisScore(responses: number[]): { rawScore: number; average: number; severityLabel: string } {
  const rawScore = responses.reduce((a, b) => a + b, 0);
  const average = rawScore / responses.length;
  const severityLabel = average <= 3.9 ? 'mild' : average <= 6.9 ? 'moderate' : 'severe';
  return { rawScore, average, severityLabel };
}

function computePromisScore(
  responses: number[],
  questions: InstrumentQuestion[],
  reverseTransform: Record<number, number> | undefined,
  instrumentId: string,
): { rawScore: number; tScore: number | null } {
  const processed = responses.map((r, i) => {
    if (questions[i].reverseScored && reverseTransform) {
      return reverseTransform[r] ?? r;
    }
    return r;
  });
  const rawScore = processed.reduce((a, b) => a + b, 0);
  const tScore = lookupTScore(instrumentId, rawScore);
  return { rawScore, tScore };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const SymptomsInstrument: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_queue, current_index, weekly_plan_id } = route.params;
  const { symptom_key, symptom_label } = symptom_queue[current_index];
  const totalCount = symptom_queue.length;
  const isLast = current_index + 1 >= totalCount;
  const { accessToken } = useAuth();

  const def = INSTRUMENTS[symptom_key];
  const [responses, setResponses] = useState<(number | null)[]>(
    () => new Array(def?.questions.length ?? 0).fill(null)
  );
  const [hfrdisValues, setHfrdisValues] = useState<number[]>(
    () => new Array(10).fill(0)
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!def) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ margin: 24, color: '#DC2626' }}>
          No instrument configured for {symptom_key}.
        </Text>
      </SafeAreaView>
    );
  }

  const isHfrdis = def.instrumentId === 'hfrdis';
  const isMmrc = def.instrumentId === 'mmrc';

  const allAnswered = isHfrdis
    ? true
    : responses.every(r => r !== null);

  const handleSubmit = async () => {
    if (!allAnswered || !accessToken) return;
    setSaving(true);
    setSaveError(null);

    try {
      let rawResponses: number[];
      let rawScore: number;
      let tScore: number | null = null;
      let severityLabel: string | null = null;

      if (isHfrdis) {
        rawResponses = hfrdisValues;
        const { rawScore: rs, severityLabel: sl } = computeHfrdisScore(hfrdisValues);
        rawScore = rs;
        severityLabel = sl;
      } else if (isMmrc) {
        rawResponses = [responses[0] as number];
        rawScore = responses[0] as number;
      } else {
        rawResponses = responses as number[];
        const { rawScore: rs, tScore: ts } = computePromisScore(
          rawResponses,
          def.questions,
          def.reverseScoreTransform,
          def.instrumentId,
        );
        rawScore = rs;
        tScore = ts;
      }

      await postInstrumentResponse(accessToken, {
        symptom_key,
        instrument_id: def.instrumentId,
        raw_responses: rawResponses,
        raw_score: rawScore,
        t_score: tScore,
        severity_label: severityLabel,
        weekly_plan_id: weekly_plan_id ?? null,
      });

      if (isLast) {
        navigation.navigate('SymptomConfirmation', { completedWeeklyCheckIn: true });
      } else {
        navigation.replace('SymptomsInstrument', {
          symptom_queue,
          current_index: current_index + 1,
          weekly_plan_id,
        });
      }
    } catch (err: any) {
      setSaveError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setResponse = (idx: number, val: number) => {
    setResponses(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const scale = (q: InstrumentQuestion) => q.responseScale ?? def.defaultScale;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        {totalCount > 1 && (
          <Text style={styles.progressText}>{`${current_index + 1} of ${totalCount}`}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Weekly check-in</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.screenSubtitle}>
            <Text style={styles.highlight}>{symptom_label}</Text>
          </Text>
          {isHfrdis && (
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          )}
        </View>

        {def.instructions ? (
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>{def.instructions}</Text>
          </View>
        ) : def.stem ? (
          <View style={styles.stemBox}>
            <Text style={styles.stemText}>{def.stem}</Text>
          </View>
        ) : null}

        {/* ── HFRDIS (0–10 sliders per item) ── */}
        {isHfrdis ? (
          <View style={styles.questionList}>
            {def.questions.map((q, i) => (
              <View key={q.index} style={styles.hfrdisItem}>
                <Text style={styles.hfrdisItemLabel}>
                  {i + 1}. {q.text}
                </Text>
                <Text style={styles.hfrdisScore}>{hfrdisValues[i]}</Text>
                <HfrdisSlider
                  value={hfrdisValues[i]}
                  onChange={v => {
                    setHfrdisValues(prev => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                  }}
                />
              </View>
            ))}
          </View>
        ) : (
          /* ── PROMIS / mMRC (radio buttons) ── */
          <View style={styles.questionList}>
            {def.questions.map((q, qi) => {
              const opts = scale(q);
              return (
                <View key={q.index} style={styles.questionBlock}>
                  <Text style={styles.questionText}>
                    {isMmrc ? q.text : `${qi + 1}. ${q.text}`}
                  </Text>
                  <View style={styles.optionList}>
                    {opts.map(opt => {
                      const isSelected = responses[qi] === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                          onPress={() => setResponse(qi, opt.value)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!allAnswered && (
          <Text style={styles.hintText}>Please answer all questions to continue.</Text>
        )}

        {saveError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!allAnswered || saving) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!allAnswered || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#007AFF', fontSize: 16, fontWeight: '500', marginLeft: 4 },
  progressText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  content: { padding: 20, paddingBottom: 20 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  screenSubtitle: { fontSize: 18, fontWeight: '500', color: '#374151' },
  highlight: { color: '#007AFF' },
  optionalBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  optionalBadgeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  instructionBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 14,
    marginBottom: 24,
  },
  instructionText: { fontSize: 14, color: '#0369A1', lineHeight: 20 },
  stemBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#93C5FD',
    padding: 14,
    marginBottom: 24,
  },
  stemText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E3A8A',
    lineHeight: 22,
  },

  questionList: { gap: 24 },
  questionBlock: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 14,
    lineHeight: 22,
  },
  optionList: { gap: 10 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  optionRowSelected: { backgroundColor: '#EFF6FF', borderColor: '#007AFF' },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: { borderColor: '#007AFF' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF' },
  optionLabel: { fontSize: 15, color: '#374151', flex: 1, lineHeight: 20 },
  optionLabelSelected: { color: '#1D4ED8', fontWeight: '500' },

  // HFRDIS
  hfrdisItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  hfrdisItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 20,
  },
  hfrdisScore: {
    fontSize: 28,
    fontWeight: '700',
    color: '#A855F7',
    textAlign: 'center',
    marginBottom: 4,
  },

  hintText: { marginTop: 20, fontSize: 14, color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  errorBannerText: { flex: 1, fontSize: 14, color: '#DC2626', lineHeight: 20 },

  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

export default SymptomsInstrument;
