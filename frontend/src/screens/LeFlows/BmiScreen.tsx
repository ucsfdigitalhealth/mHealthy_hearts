import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getCachedBmi, setCachedBmi } from '../../utils/bmiCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_TRACK_WIDTH = SCREEN_WIDTH - 64;

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
  // Use ref so PanResponder always reads the latest callback (avoids stale closure)
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

  const thumbPosition = (value / 10) * SLIDER_TRACK_WIDTH - 18;

  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.valueText}>{value}</Text>
      <View style={sliderStyles.trackWrapper} {...panResponder.panHandlers}>
        <View style={sliderStyles.track} />
        <View style={[sliderStyles.thumb, { left: Math.max(0, thumbPosition) }]} />
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
  container: { width: '100%', alignItems: 'center', paddingHorizontal: 16, marginBottom: 24 },
  valueText: { fontSize: 72, fontWeight: '400', color: '#212529', marginBottom: 8 },
  trackWrapper: {
    width: SLIDER_TRACK_WIDTH,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    width: '100%',
    height: 36,
    backgroundColor: '#d9d9d9',
    borderRadius: 18,
  },
  thumb: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    top: 0,
  },
  labelsRow: {
    width: SLIDER_TRACK_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  labelItem: { alignItems: 'center' },
  labelNumber: { fontSize: 18, color: '#a2a2a2', fontWeight: '400' },
  labelText: { fontSize: 14, color: '#a2a2a2' },
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

      const response = await fetch('http://localhost:3000/api/bmi', {
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
      // Still cache locally if API fails
      await setCachedBmi({ score: finalScore, value: finalBmi });
    }

    navigation.goBack();
  };

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderIntro = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.mainTitle}>
        Let's calculate your Body Mass Index (BMI)
      </Text>
      <Text style={styles.subtitle}>
        We'll ask for your height and weight so we can calculate your BMI and determine your score.
      </Text>
      <TouchableOpacity style={styles.blackButton} onPress={() => goToStep('knowsBmi')}>
        <Text style={styles.blackButtonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );

  const renderKnowsBmi = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.subtitleItalic}>Let's check your BMI status.</Text>
      <Text style={styles.mainTitle}>Do you know your most recent BMI score?</Text>
      <View style={styles.optionsGap}>
        <TouchableOpacity
          style={[styles.orangeButton, knowsBmi === 'Yes' && styles.orangeButtonSelected]}
          onPress={() => {
            setKnowsBmi('Yes');
            goToStep('directBmiInput');
          }}
        >
          <Text style={styles.whiteButtonText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.outlineButton, knowsBmi === 'No' && styles.outlineButtonSelected]}
          onPress={() => {
            setKnowsBmi('No');
            goToStep('heightWeightInput');
          }}
        >
          <Text style={[styles.outlineButtonText, knowsBmi === 'No' && styles.whiteButtonText]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDirectBmiInput = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.questionTitle}>Enter your most recent BMI result:</Text>
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
      <TouchableOpacity
        style={[styles.blackButton, !directBmiValue && styles.disabledButton]}
        onPress={() => goToStep('commitment')}
        disabled={!directBmiValue}
      >
        <Text style={styles.blackButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeightWeightInput = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const previewBmi = !isNaN(w) && !isNaN(h) && h > 0 ? calcBMI(w, h) : null;
    const canProceed = !isNaN(w) && !isNaN(h) && h > 0;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.questionTitle}>
          We'll use your height and weight to calculate your BMI.
        </Text>
        <View style={styles.pinkCard}>
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
        <View style={styles.pinkCard}>
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
        <View style={styles.pinkCard}>
          <View style={styles.bmiPreviewRow}>
            <Text style={styles.cardLabel}>Your BMI is</Text>
            <Text style={styles.bmiPreviewValue}>
              {previewBmi !== null ? previewBmi : '—'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.blackButton, !canProceed && styles.disabledButton]}
          onPress={() => goToStep('commitment')}
          disabled={!canProceed}
        >
          <Text style={styles.blackButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCommitment = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.mainTitle}>
        Commitment to Healthy Change{'\n\n'}Do you plan to improve this area?
      </Text>
      <View style={styles.commitmentOptions}>
        <TouchableOpacity
          style={[
            styles.commitmentButton,
            commitment === 'Yes' ? styles.commitmentSelected : styles.commitmentUnselected,
          ]}
          onPress={() => setCommitment('Yes')}
        >
          <Text
            style={[
              styles.commitmentText,
              commitment === 'Yes' ? styles.commitmentTextSelected : styles.commitmentTextUnselected,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.commitmentButton,
            commitment === 'No' ? styles.commitmentSelected : styles.commitmentUnselected,
          ]}
          onPress={() => setCommitment('No')}
        >
          <Text
            style={[
              styles.commitmentText,
              commitment === 'No' ? styles.commitmentTextSelected : styles.commitmentTextUnselected,
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.blueButton, commitment === null && styles.disabledButton]}
        onPress={() => {
          if (commitment === 'Yes') {
            goToStep('importance');
          } else {
            goToStep('resources');
          }
        }}
        disabled={commitment === null}
      >
        <Text style={styles.whiteButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderImportance = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.mainTitle}>
        Importance{'\n\n'}How important is this change to you right now?
      </Text>
      <CustomSlider value={importance} onValueChange={setImportance} />
      <TouchableOpacity style={styles.blueButton} onPress={() => goToStep('confidence')}>
        <Text style={styles.whiteButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfidence = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.mainTitle}>
        Confidence{'\n\n'}How confident are you about making this change?
      </Text>
      <CustomSlider value={confidence} onValueChange={setConfidence} />
      <TouchableOpacity style={styles.blueButton} onPress={() => goToStep('resources')}>
        <Text style={styles.whiteButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResources = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.mainTitle}>Resources</Text>
      <Text style={styles.resourcesBody}>
        You're on the right path!{'\n\n'}Check out the Stress Management video and additional links for more support!
      </Text>
      <View style={styles.videoPlaceholder}>
        <View style={styles.videoInner}>
          <Text style={styles.videoPlayIcon}>▶</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.blueButton} onPress={() => goToStep('summary')}>
        <Text style={styles.whiteButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.summaryTitle}>BMI Summary</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Here's your BMI score:</Text>
        <View style={styles.summaryScoreBox}>
          <Text style={styles.summaryScoreNumber}>
            {finalScore !== null ? finalScore : '—'}
          </Text>
          <Text style={styles.summaryScoreLabel}> Points</Text>
        </View>
        {finalBmi !== null && (
          <Text style={styles.summaryBmiText}>BMI: {finalBmi}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.blackButton} onPress={handleDone}>
        <Text style={styles.blackButtonText}>Done</Text>
      </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>{isCancelStep ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#007AFF', fontSize: 16, fontWeight: '500', marginLeft: 4 },
  content: { flexGrow: 1, padding: 24 },
  stepContainer: { flex: 1, justifyContent: 'center', minHeight: 500 },

  // Typography
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 20,
    fontStyle: 'italic',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
  },
  subtitleItalic: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 12,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 32,
  },

  // Buttons
  blackButton: {
    backgroundColor: '#000000',
    borderRadius: 17,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  blackButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  blueButton: {
    backgroundColor: '#224694',
    borderRadius: 17,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  whiteButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  disabledButton: { opacity: 0.4 },

  // Yes/No options (knows BMI step)
  optionsGap: { gap: 16, marginBottom: 16 },
  orangeButton: {
    backgroundColor: '#e77517',
    borderRadius: 17,
    paddingVertical: 20,
    alignItems: 'center',
  },
  orangeButtonSelected: { backgroundColor: '#e77517' },
  outlineButton: {
    borderRadius: 17,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  outlineButtonSelected: { backgroundColor: '#000000' },
  outlineButtonText: { color: '#000000', fontSize: 22, fontWeight: '700' },

  // Input layout
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
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

  // Height/Weight pink cards
  pinkCard: {
    backgroundColor: 'rgba(212,68,58,0.15)',
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 20, color: '#212529', marginBottom: 8 },
  bmiPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  bmiPreviewValue: { fontSize: 44, fontWeight: '700', color: '#212529', marginLeft: 12 },

  // Commitment buttons
  commitmentOptions: { gap: 12, marginBottom: 16 },
  commitmentButton: {
    borderRadius: 17,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  commitmentSelected: { backgroundColor: '#000000' },
  commitmentUnselected: { backgroundColor: '#e4e1e1' },
  commitmentText: { fontSize: 28, fontWeight: '700', fontStyle: 'italic' },
  commitmentTextSelected: { color: '#FFFFFF' },
  commitmentTextUnselected: { color: '#000000' },

  // Resources
  resourcesBody: {
    fontSize: 22,
    color: '#212529',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 24,
  },
  videoPlaceholder: {
    backgroundColor: '#d9d9d9',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 8,
    height: 160,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  videoPlayIcon: { fontSize: 32, color: '#000000', marginLeft: 6 },

  // Summary
  summaryTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#f0ecec',
    borderRadius: 17,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  summaryCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryScoreBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#c4c4c4',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  summaryScoreNumber: { fontSize: 56, fontWeight: '700', color: '#212529' },
  summaryScoreLabel: { fontSize: 32, fontWeight: '700', color: '#212529', marginLeft: 8 },
  summaryBmiText: { fontSize: 18, color: '#6C757D', marginTop: 4 },
});

export default BMIFlowScreen;
