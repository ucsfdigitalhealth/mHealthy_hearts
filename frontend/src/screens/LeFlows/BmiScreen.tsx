import { API_ORIGIN } from '../../config/api';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getCachedBmi, setCachedBmi } from '../../utils/bmiCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_TRACK_WIDTH = SCREEN_WIDTH - 80;

// ─── Local scoring (mirrors backend metricCalc.js) ─────────────────────────
function getBMIScoreLocal(bmi: number | null): number | null {
  if (bmi === null || bmi === undefined) return null;
  const v = Number(bmi);
  if (isNaN(v)) return null;
  if (v < 25) return 100;
  if (v <= 29.9) return 70;
  if (v <= 34.9) return 30;
  if (v <= 39.9) return 15;
  return 0;
}

// ─── Imperial BMI formula ───────────────────────────────────────────────────
function calcBMI(weightLbs: number, heightIn: number): number {
  if (heightIn <= 0) return 0;
  return Math.round(((703 * weightLbs) / (heightIn * heightIn)) * 10) / 10;
}

// ─── Custom Slider ──────────────────────────────────────────────────────────
const CustomSlider: React.FC<{
  value: number;
  onValueChange: (v: number) => void;
}> = ({ value, onValueChange }) => {
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const clamped = Math.max(0, Math.min(SLIDER_TRACK_WIDTH, x));
        const newVal = Math.round((clamped / SLIDER_TRACK_WIDTH) * 10);
        onValueChangeRef.current(newVal);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const clamped = Math.max(0, Math.min(SLIDER_TRACK_WIDTH, x));
        const newVal = Math.round((clamped / SLIDER_TRACK_WIDTH) * 10);
        onValueChangeRef.current(newVal);
      },
    })
  ).current;

  const thumbPercent = (value / 10) * 100;

  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.valueText}>{value}</Text>
      <View style={sliderStyles.trackWrapper} {...panResponder.panHandlers}>
        <View style={sliderStyles.trackLine} />
        <View style={[sliderStyles.thumb, { left: `${thumbPercent}%` as any }]} />
      </View>
      <View style={sliderStyles.labelsRow}>
        <View style={sliderStyles.labelItem}>
          <Text style={sliderStyles.labelNumber}>0</Text>
          <Text style={sliderStyles.labelText}>Not</Text>
        </View>
        <View style={sliderStyles.labelItem}>
          <Text style={sliderStyles.labelNumber}>5</Text>
          <Text style={sliderStyles.labelText}>Somewhat</Text>
        </View>
        <View style={sliderStyles.labelItem}>
          <Text style={sliderStyles.labelNumber}>10</Text>
          <Text style={sliderStyles.labelText}>Very</Text>
        </View>
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', marginVertical: 16 },
  valueText: { fontSize: 64, fontWeight: '700', color: '#000', marginBottom: 8, textAlign: 'center' },
  trackWrapper: {
    width: SLIDER_TRACK_WIDTH,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackLine: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    top: 6,
    marginLeft: -14,
  },
  labelsRow: {
    width: SLIDER_TRACK_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  labelItem: { alignItems: 'center' },
  labelNumber: { fontSize: 12, color: '#666', fontWeight: '500' },
  labelText: { fontSize: 12, color: '#666' },
});

// ─── Step Identifiers ───────────────────────────────────────────────────────
type StepId =
  | 'intro'
  | 'knowsBmi'
  | 'directBmiInput'
  | 'heightWeightInput'
  | 'commitment'
  | 'importance'
  | 'confidence'
  | 'resources'
  | 'summary';

const TOTAL_STEPS = 8;

const STEP_NUMBERS: Record<StepId, number> = {
  intro: 1,
  knowsBmi: 2,
  directBmiInput: 3,
  heightWeightInput: 3,
  commitment: 4,
  importance: 5,
  confidence: 6,
  resources: 7,
  summary: 8,
};

// ─── Main Component ─────────────────────────────────────────────────────────
const BMIFlowScreen: React.FC = () => {
  const navigation = useNavigation();
  const { accessToken } = useAuth();

  const [currentStep, setCurrentStep] = useState<StepId>('intro');

  // User inputs
  const [knowsBmi, setKnowsBmi] = useState<'Yes' | 'No' | null>(null);
  const [directBmiValue, setDirectBmiValue] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [commitment, setCommitment] = useState<'Yes' | 'No' | null>(null);
  const [importance, setImportance] = useState<number>(5);
  const [confidence, setConfidence] = useState<number>(5);

  // Previous BMI loaded from cache
  const [previousBmi, setPreviousBmi] = useState<number | null>(null);

  // Load previous BMI from cache on mount
  useEffect(() => {
    (async () => {
      const cached = await getCachedBmi();
      if (cached?.value != null) {
        setPreviousBmi(cached.value);
      }
    })();
  }, []);

  // Compute BMI from height/weight inputs
  const computedBmi = (() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!isNaN(w) && !isNaN(h) && h > 0) return calcBMI(w, h);
    return null;
  })();

  // Final BMI to display/submit
  const finalBmi: number | null =
    knowsBmi === 'Yes'
      ? parseFloat(directBmiValue) || null
      : computedBmi;

  const finalScore = getBMIScoreLocal(finalBmi);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goToStep = useCallback((step: StepId) => setCurrentStep(step), []);

  const handleBack = () => {
    switch (currentStep) {
      case 'intro':
        navigation.goBack();
        break;
      case 'knowsBmi':
        goToStep('intro');
        break;
      case 'directBmiInput':
        goToStep('knowsBmi');
        break;
      case 'heightWeightInput':
        goToStep('knowsBmi');
        break;
      case 'commitment':
        goToStep(knowsBmi === 'Yes' ? 'directBmiInput' : 'heightWeightInput');
        break;
      case 'importance':
        goToStep('commitment');
        break;
      case 'confidence':
        goToStep('importance');
        break;
      case 'resources':
        goToStep(commitment === 'Yes' ? 'confidence' : 'commitment');
        break;
      case 'summary':
        goToStep('resources');
        break;
    }
  };

  const handleDone = async () => {
    try {
      const body: Record<string, unknown> = {
        previousBmi: previousBmi ?? null,
        commitmentToChange: commitment === 'Yes',
        importance: commitment === 'Yes' ? importance : null,
        confidence: commitment === 'Yes' ? confidence : null,
      };

      if (knowsBmi === 'Yes') {
        body.bmiValue = directBmiValue;
      } else {
        body.weight = weight;
        body.height = height;
      }

      const response = await fetch(`${API_ORIGIN}/api/bmi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = response.ok ? await response.json() : null;
      const savedScore = data?.score ?? finalScore;
      const savedValue = data?.bmiValue ?? finalBmi;

      await setCachedBmi({ score: savedScore, value: savedValue });
    } catch (error) {
      console.error('Error saving BMI assessment:', error);
      await setCachedBmi({ score: finalScore, value: finalBmi });
    }

    navigation.goBack();
  };

  // ── Footer button props ────────────────────────────────────────────────────
  const getFooterButton = (): {
    label: string;
    onPress: () => void;
    disabled: boolean;
    dark: boolean;
    show: boolean;
  } | null => {
    switch (currentStep) {
      case 'intro':
        return { label: 'Start', onPress: () => goToStep('knowsBmi'), disabled: false, dark: false, show: true };
      case 'knowsBmi':
        return null; // auto-navigates on choice tap
      case 'directBmiInput':
        return { label: 'Next', onPress: () => goToStep('commitment'), disabled: !directBmiValue, dark: false, show: true };
      case 'heightWeightInput':
        return { label: 'Next', onPress: () => goToStep('commitment'), disabled: computedBmi === null, dark: false, show: true };
      case 'commitment':
        return {
          label: 'Next',
          onPress: () => commitment === 'Yes' ? goToStep('importance') : goToStep('resources'),
          disabled: commitment === null,
          dark: false,
          show: true,
        };
      case 'importance':
        return { label: 'Next', onPress: () => goToStep('confidence'), disabled: false, dark: false, show: true };
      case 'confidence':
        return { label: 'Next', onPress: () => goToStep('resources'), disabled: false, dark: false, show: true };
      case 'resources':
        return { label: 'Next', onPress: () => goToStep('summary'), disabled: false, dark: false, show: true };
      case 'summary':
        return { label: 'Done', onPress: handleDone, disabled: false, dark: true, show: true };
      default:
        return null;
    }
  };

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderIntro = () => (
    <View style={styles.introContent}>
      <Text style={styles.introTitle}>Let's calculate your Body Mass Index (BMI)</Text>
      <Text style={styles.introSubtitle}>
        We'll ask for your height and weight so we can calculate your BMI and determine your score.
      </Text>
      <View style={styles.introImageContainer}>
        <Text style={styles.introEmoji}>⚖️</Text>
      </View>
    </View>
  );

  const renderKnowsBmi = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Do you know your most recent BMI score?</Text>
      <View style={styles.commitmentButtons}>
        <TouchableOpacity
          style={[styles.commitmentButton, knowsBmi === 'Yes' && styles.commitmentButtonSelected]}
          onPress={() => { setKnowsBmi('Yes'); goToStep('directBmiInput'); }}
        >
          <Text style={[styles.commitmentButtonText, knowsBmi === 'Yes' && styles.commitmentButtonTextSelected]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.commitmentButton, knowsBmi === 'No' && styles.commitmentButtonSelected]}
          onPress={() => { setKnowsBmi('No'); goToStep('heightWeightInput'); }}
        >
          <Text style={[styles.commitmentButtonText, knowsBmi === 'No' && styles.commitmentButtonTextSelected]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDirectBmiInput = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Enter your most recent BMI result:</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.bigInput}
            value={directBmiValue}
            onChangeText={setDirectBmiValue}
            placeholder="21"
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={styles.unitColumn}>
          <Text style={styles.unitMain}>kg/m</Text>
          <Text style={styles.unitSuper}>2</Text>
        </View>
      </View>
    </View>
  );

  const renderHeightWeightInput = () => {
    const previewBmi = computedBmi;

    return (
      <View style={styles.phaseContent}>
        <Text style={styles.phaseTitle}>We'll use your height and weight to calculate your BMI.</Text>
        <View style={styles.inputCard}>
          <Text style={styles.cardLabel}>Enter your weight:</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.bigInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="128"
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            <Text style={styles.unitMainDark}>lb</Text>
          </View>
        </View>
        <View style={styles.inputCard}>
          <Text style={styles.cardLabel}>Enter your height:</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.bigInput}
                value={height}
                onChangeText={setHeight}
                placeholder="67"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            <Text style={styles.unitMainDark}>in</Text>
          </View>
        </View>
        <View style={styles.inputCard}>
          <View style={styles.bmiPreviewRow}>
            <Text style={styles.cardLabel}>Your BMI is</Text>
            <Text style={styles.bmiPreviewValue}>{previewBmi !== null ? previewBmi : '—'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCommitment = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Commitment to Healthy Change</Text>
      <Text style={styles.phaseSubtitle}>Do you plan to improve this area?</Text>
      <View style={styles.commitmentButtons}>
        <TouchableOpacity
          style={[styles.commitmentButton, commitment === 'Yes' && styles.commitmentButtonSelected]}
          onPress={() => setCommitment('Yes')}
        >
          <Text style={[styles.commitmentButtonText, commitment === 'Yes' && styles.commitmentButtonTextSelected]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.commitmentButton, commitment === 'No' && styles.commitmentButtonSelected]}
          onPress={() => setCommitment('No')}
        >
          <Text style={[styles.commitmentButtonText, commitment === 'No' && styles.commitmentButtonTextSelected]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderImportance = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Importance</Text>
      <Text style={styles.phaseSubtitle}>How important is this change to you right now?</Text>
      <CustomSlider value={importance} onValueChange={setImportance} />
    </View>
  );

  const renderConfidence = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Confidence</Text>
      <Text style={styles.phaseSubtitle}>How confident are you about making this change?</Text>
      <CustomSlider value={confidence} onValueChange={setConfidence} />
    </View>
  );

  const renderResources = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Resources</Text>
      <Text style={styles.phaseSubtitle}>
        You're on the right path! Here are some tips to help you along the way.
      </Text>
      <View style={styles.introImageContainer}>
        <Text style={styles.introEmoji}>🥦</Text>
      </View>
      <Text style={styles.resourcesBody}>
        Focus on staying active, eating balanced meals, and maintaining a healthy weight to support your cardiovascular health.
      </Text>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.resultsContainer}>
      <Text style={styles.resultsTitle}>Great Job!</Text>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Based on your responses</Text>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreEmoji}>🎉</Text>
          <Text style={styles.scoreNumber}>{finalScore !== null ? finalScore : '—'}</Text>
          <Text style={styles.scoreMax}>out of 100</Text>
        </View>
        {finalBmi !== null && (
          <Text style={styles.scoreBmi}>BMI: {finalBmi}</Text>
        )}
      </View>
      <Text style={styles.resultsDescription}>
        Your BMI score reflects your body mass index. A higher score indicates a BMI in the healthy range for cardiovascular health.
      </Text>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'intro':           return renderIntro();
      case 'knowsBmi':        return renderKnowsBmi();
      case 'directBmiInput':  return renderDirectBmiInput();
      case 'heightWeightInput': return renderHeightWeightInput();
      case 'commitment':      return renderCommitment();
      case 'importance':      return renderImportance();
      case 'confidence':      return renderConfidence();
      case 'resources':       return renderResources();
      case 'summary':         return renderSummary();
    }
  };

  const isCancelStep = currentStep === 'intro';
  const stepNumber = STEP_NUMBERS[currentStep];
  const progressPercent = ((stepNumber - 1) / (TOTAL_STEPS - 1)) * 100;
  const footerButton = getFooterButton();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>{isCancelStep ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
          </View>
          <Text style={styles.progressText}>Step {stepNumber} of {TOTAL_STEPS}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>

      {footerButton && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.footerButton,
              footerButton.dark && styles.footerButtonDark,
              footerButton.disabled && styles.footerButtonDisabled,
            ]}
            onPress={footerButton.onPress}
            disabled={footerButton.disabled}
          >
            <Text style={styles.footerButtonText}>{footerButton.label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backText: { color: '#007AFF', fontSize: 16, fontWeight: '500', marginLeft: 4 },
  progressBarContainer: { alignItems: 'center' },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#34C759', borderRadius: 3 },
  progressText: { fontSize: 14, color: '#6C757D', fontWeight: '500' },

  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerButton: {
    backgroundColor: '#2084a4',
    borderRadius: 17,
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerButtonDark: { backgroundColor: '#000000' },
  footerButtonDisabled: { backgroundColor: '#E5E5EA' },
  footerButtonText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },

  // Intro
  introContent: {
    flexGrow: 1,
    paddingTop: 8,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 44,
  },
  introSubtitle: {
    fontSize: 22,
    fontStyle: 'italic',
    color: '#000',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 40,
  },
  introImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  introEmoji: { fontSize: 120 },

  // Phase screens
  phaseContent: {
    flexGrow: 1,
    paddingTop: 8,
    alignItems: 'center',
    width: '100%',
  },
  phaseTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  phaseSubtitle: {
    fontSize: 18,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },

  // Commitment buttons
  commitmentButtons: { width: '100%', gap: 16 },
  commitmentButton: {
    backgroundColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },
  commitmentButtonSelected: { backgroundColor: '#000000' },
  commitmentButtonText: { fontSize: 20, fontWeight: '700', color: '#555' },
  commitmentButtonTextSelected: { color: '#FFFFFF' },

  // Input layout
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: '#c4c4c4',
    borderRadius: 10,
    width: 130,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bigInput: {
    fontSize: 44,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    width: '100%',
  },
  unitColumn: { alignItems: 'flex-start' },
  unitMain: { fontSize: 36, fontWeight: '700', color: '#212529' },
  unitSuper: { fontSize: 20, fontWeight: '700', color: '#212529', marginTop: -8 },
  unitMainDark: { fontSize: 36, fontWeight: '700', color: '#212529' },

  // Height/Weight input cards
  inputCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    width: '100%',
  },
  cardLabel: { fontSize: 18, color: '#3C3C43', marginBottom: 8 },
  bmiPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  bmiPreviewValue: { fontSize: 44, fontWeight: '700', color: '#212529', marginLeft: 12 },

  // Resources
  resourcesBody: {
    fontSize: 16,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  // Results / summary
  resultsContainer: { width: '100%' },
  resultsTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 32,
    marginVertical: 32,
    alignItems: 'center',
  },
  scoreLabel: { fontSize: 15, color: '#8E8E93', marginBottom: 16 },
  scoreCircle: { alignItems: 'center' },
  scoreEmoji: { fontSize: 60, marginBottom: 16 },
  scoreNumber: { fontSize: 72, fontWeight: '700', color: '#000' },
  scoreMax: { fontSize: 17, color: '#8E8E93', marginTop: 8 },
  scoreBmi: { fontSize: 15, color: '#8E8E93', marginTop: 12 },
  resultsDescription: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default BMIFlowScreen;
