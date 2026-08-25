// BloodSugarFlowScreen.tsx
import { API_ORIGIN } from '../../config/api';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { setCachedBloodSugar } from '../../utils/bloodSugarCache';

// ─── Scoring helper (mirrors backend/metricCalc.js) ─────────────────────────
// Implements LE8 7-tier scoring (Lloyd-Jones et al. 2022), bifurcated by diabetes status.
function getBloodGlucoseScore(
  testType: string | null,
  value: number | null,
  hasDiabetes: boolean,
): number | null {
  if (value === null || testType === null) return null;

  if (hasDiabetes) {
    // For people with diabetes, LE8 scores exclusively via HbA1c (max = 40)
    if (testType !== 'HbA1c') return null;
    if (value < 7.0)  return 40;
    if (value < 8.0)  return 30;
    if (value < 9.0)  return 20;
    if (value < 10.0) return 10;
    return 0;
  }

  // No diabetes — HbA1c path
  if (testType === 'HbA1c') {
    if (value < 5.7)  return 100;
    if (value <= 6.4) return 60;
    return 0;
  }

  // No diabetes — Fasting Blood Glucose (mg/dL)
  if (value < 100)  return 100;
  if (value <= 125) return 60;
  return 0;
}

// ─── Result range helpers ────────────────────────────────────────────────────
type Range = 'in-range' | 'prediabetes' | 'elevated';

function getRange(
  testType: string | null,
  value: number | null,
  hasDiabetes: boolean,
): Range | null {
  if (value === null || testType === null) return null;

  if (hasDiabetes) {
    // Diabetes path: result screen is not shown (flow skips step 5)
    return null;
  }

  if (testType === 'HbA1c') {
    if (value < 5.7)  return 'in-range';
    if (value <= 6.4) return 'prediabetes';
    return 'elevated';
  }

  // FBG, no diabetes
  if (value < 100)  return 'in-range';
  if (value <= 125) return 'prediabetes';
  return 'elevated';
}

const RANGE_COLORS: Record<Range, string> = {
  'in-range':   '#369949',
  'prediabetes': '#d1ce1d',
  'elevated':   '#cd482f',
};

function getResultMessage(
  testType: string | null,
  value: number | null,
  hasDiabetes: boolean,
): string {
  if (!testType || value === null) return '';
  const range = getRange(testType, value, hasDiabetes);
  if (!range) return '';

  if (testType === 'HbA1c') {
    if (range === 'in-range')   return `Your A1C is ${value}%. That falls in the healthy range.`;
    if (range === 'prediabetes') return `Your A1C is ${value}%. That falls in the prediabetes range.`;
    return `Your A1C is ${value}%, which is above the typical healthy range. We recommend discussing this result with your doctor.`;
  }

  // FBG
  if (range === 'in-range')   return `Your FBG is ${value} mg/dL. That falls in the healthy range.`;
  if (range === 'prediabetes') return `Your FBG is ${value} mg/dL. That falls in the prediabetes range.`;
  return `Your FBG is ${value} mg/dL, which is above the healthy range. We recommend discussing this result with your doctor.`;
}

function getResultTip(
  testType: string | null,
  value: number | null,
  hasDiabetes: boolean,
): string {
  const range = getRange(testType, value, hasDiabetes);
  if (range === 'in-range') {
    return 'Tip: Keeping up with your current habits can help you stay on track. Small, steady routines often make the biggest difference over time.';
  }
  if (range === 'prediabetes') {
    return 'Tip: Even small changes—like adding a short walk or choosing one healthier meal a day—can support your overall well‑being. Starting gradually can feel more manageable.';
  }
  if (range === 'elevated') {
    return 'Tip: A single reading above the healthy range doesn\'t confirm a diagnosis — a healthcare professional can help you understand what this means and what steps to consider next.';
  }
  return '';
}

// ─── Custom Slider ────────────────────────────────────────────────────────────
const CustomSlider: React.FC<{
  value: number;
  onValueChange: (v: number) => void;
}> = ({ value, onValueChange }) => {
  const trackWidthRef = useRef<number>(0);
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX } = evt.nativeEvent;
        const newVal = Math.round((locationX / trackWidthRef.current) * 10);
        onValueChangeRef.current(Math.min(10, Math.max(0, newVal)));
      },
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        const newVal = Math.round((locationX / trackWidthRef.current) * 10);
        onValueChangeRef.current(Math.min(10, Math.max(0, newVal)));
      },
    })
  ).current;

  const thumbPercent = (value / 10) * 100;

  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.valueDisplay}>{value}</Text>
      <View
        style={sliderStyles.trackWrapper}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        <View style={sliderStyles.trackLine} />
        <View style={[sliderStyles.thumb, { left: `${thumbPercent}%` as any }]} />
      </View>
      <View style={sliderStyles.labels}>
        <View style={sliderStyles.labelItem}>
          <Text style={sliderStyles.labelNum}>0</Text>
          <Text style={sliderStyles.labelText}>Not</Text>
        </View>
        <View style={sliderStyles.labelItem}>
          <Text style={sliderStyles.labelNum}>5</Text>
          <Text style={sliderStyles.labelText}>Somewhat</Text>
        </View>
        <View style={sliderStyles.labelItem}>
          <Text style={sliderStyles.labelNum}>10</Text>
          <Text style={sliderStyles.labelText}>Very</Text>
        </View>
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: { marginVertical: 16, alignItems: 'center', width: '100%' },
  valueDisplay: { fontSize: 64, fontWeight: '700', color: '#000', marginBottom: 8, textAlign: 'center' },
  trackWrapper: {
    width: '90%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackLine: { width: '100%', height: 4, backgroundColor: '#E5E5EA', borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    top: 6,
    marginLeft: -14,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginTop: 8 },
  labelItem: { alignItems: 'center' },
  labelNum: { fontSize: 12, color: '#666', fontWeight: '500' },
  labelText: { fontSize: 12, color: '#666' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const BloodSugarFlowScreen: React.FC = () => {
  const navigation = useNavigation();
  const { accessToken } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(0);

  // selections keys match step numbers
  const [selections, setSelections] = useState<Record<number, any>>({
    1: null,  // knowsResult: 'Yes' | 'No'
    2: null,  // hasDiabetes: 'Yes' | 'No'
    3: null,  // testType: 'Fasting Blood Glucose' | 'HbA1c'
    4: null,  // value string
    6: null,  // commitment: 'Yes' | 'No'
    7: 5,     // importance 0-10
    8: 5,     // confidence 0-10
  });

  const goToStep = (step: number) => setCurrentStep(step);

  const setSelection = (stepId: number, value: any) => {
    setSelections(prev => ({ ...prev, [stepId]: value }));
  };

  // ── Derived booleans ────────────────────────────────────────────────────────
  const knowsResult  = selections[1] === 'Yes';
  const hasDiabetes  = selections[2] === 'Yes';
  const testType     = selections[3] as string | null;
  const rawValue     = selections[4];
  const numValue     = rawValue ? parseFloat(rawValue) : null;

  // ── Back navigation ─────────────────────────────────────────────────────────
  const handleBack = () => {
    switch (currentStep) {
      case 0:  navigation.goBack(); break;
      case 1:  goToStep(0); break;
      case 2:  goToStep(1); break;
      case 3:  goToStep(2); break;
      case 4:  goToStep(hasDiabetes ? 2 : 3); break;
      case 5:  goToStep(4); break;
      case 6:  goToStep(!knowsResult ? 2 : hasDiabetes ? 4 : 5); break;
      case 7:  goToStep(6); break;
      case 8:  goToStep(7); break;
      case 9:  goToStep(selections[6] === 'Yes' ? 8 : 6); break;
      case 10: goToStep(9); break;
      default: goToStep(currentStep - 1);
    }
  };

  // ── Choice handlers (auto-navigate) ────────────────────────────────────────
  const handleStep1Choice = (choice: string) => {
    setSelection(1, choice);
    goToStep(2);
  };

  const handleStep2Choice = (choice: string) => {
    setSelection(2, choice);
    const hasResult = selections[1] === 'Yes';
    const isDiabetic = choice === 'Yes';

    if (!hasResult) {
      // No lab result — skip test type, value entry, and result screen
      goToStep(6);
      return;
    }
    if (isDiabetic) {
      // Diabetes path — HbA1c only, skip test type selection
      setSelection(3, 'HbA1c');
      goToStep(4);
    } else {
      // No diabetes — show test type selection
      setSelection(3, null);
      goToStep(3);
    }
  };

  const handleStep6Choice = (choice: string) => {
    setSelection(6, choice);
  };

  const handleStep6Next = () => {
    goToStep(selections[6] === 'Yes' ? 7 : 9);
  };

  // ── Save on Done ────────────────────────────────────────────────────────────
  const handleDone = async () => {
    const commitmentToChange = selections[6] === 'Yes';
    const importance  = commitmentToChange ? selections[7] : null;
    const confidence  = commitmentToChange ? selections[8] : null;
    const score = getBloodGlucoseScore(testType, numValue, hasDiabetes);

    try {
      await fetch(`${API_ORIGIN}/api/blood-sugar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          testType,
          value: numValue !== null ? String(numValue) : undefined,
          hasDiabetes,
          commitmentToChange,
          importance,
          confidence,
        }),
      });
    } catch (error) {
      console.error('Error saving blood sugar assessment:', error);
    }

    await setCachedBloodSugar({ score, value: numValue, testType });
    navigation.goBack();
  };

  // ── Footer button props ─────────────────────────────────────────────────────
  const getFooterButton = (): {
    label: string;
    onPress: () => void;
    disabled: boolean;
    dark: boolean;
  } | null => {
    switch (currentStep) {
      case 0:  return { label: 'Start', onPress: () => goToStep(1), disabled: false, dark: false };
      case 1:  return null; // auto-navigates on choice
      case 2:  return null; // auto-navigates on choice
      case 3:  return { label: 'Next', onPress: () => goToStep(4), disabled: !selections[3], dark: false };
      case 4:  return { label: 'Next', onPress: () => goToStep(hasDiabetes ? 6 : 5), disabled: !selections[4], dark: false };
      case 5:  return { label: 'Next', onPress: () => goToStep(6), disabled: false, dark: false };
      case 6:  return { label: 'Next', onPress: handleStep6Next, disabled: !selections[6], dark: false };
      case 7:  return { label: 'Next', onPress: () => goToStep(8), disabled: false, dark: false };
      case 8:  return { label: 'Next', onPress: () => goToStep(9), disabled: false, dark: false };
      case 9:  return { label: 'Next', onPress: () => goToStep(10), disabled: false, dark: false };
      case 10: return { label: 'Done', onPress: handleDone, disabled: false, dark: true };
      default: return null;
    }
  };

  // ── Step renderers ──────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.introTitle}>Let's assess your blood sugar</Text>
      <Text style={styles.introSubtitle}>
        This short assessment helps calculate your blood sugar score for cardiovascular health.
      </Text>
      <View style={styles.introImageContainer}>
        <Text style={styles.introEmoji}>🩸</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Do you know your most recent blood sugar result?</Text>
      <View style={styles.yesNoContainer}>
        {['Yes', 'No'].map(choice => (
          <TouchableOpacity
            key={choice}
            style={[styles.yesNoCard, selections[1] === choice && styles.yesNoCardSelected]}
            onPress={() => handleStep1Choice(choice)}
          >
            <Text style={[styles.yesNoText, selections[1] === choice && styles.yesNoTextSelected]}>
              {choice}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Have you ever been told by a healthcare professional that you have diabetes?</Text>
      <View style={styles.yesNoContainer}>
        {['Yes', 'No'].map(choice => (
          <TouchableOpacity
            key={choice}
            style={[styles.yesNoCard, selections[2] === choice && styles.yesNoCardSelected]}
            onPress={() => handleStep2Choice(choice)}
          >
            <Text style={[styles.yesNoText, selections[2] === choice && styles.yesNoTextSelected]}>
              {choice}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Which type of blood sugar test do you have?</Text>
      <View style={styles.optionsContainer}>
        {[
          { title: 'Fasting Blood Glucose', subtitle: 'Usually taken after 8+ hours of fasting', value: 'Fasting Blood Glucose' },
          { title: 'HbA1c', subtitle: 'Average blood sugar over 2–3 months', value: 'HbA1c' },
        ].map(option => (
          <TouchableOpacity
            key={option.value}
            style={[styles.optionCard, selections[3] === option.value && styles.optionCardSelected]}
            onPress={() => setSelection(3, option.value)}
          >
            <Text style={[styles.optionTitle, selections[3] === option.value && styles.optionTitleSelected]}>
              {option.title}
            </Text>
            <Text style={[styles.optionSubtitle, selections[3] === option.value && styles.optionSubtitleSelected]}>
              {option.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => {
    const isHbA1c = selections[3] === 'HbA1c';
    const title = isHbA1c
      ? 'Please enter your most recent HbA1c result:'
      : 'Please enter your most recent fasting blood glucose result:';
    const unit = isHbA1c ? '%' : 'mg/dL';
    const placeholder = isHbA1c ? '5.7' : '100';

    return (
      <View style={styles.phaseContent}>
        <Text style={styles.phaseTitle}>{title}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={selections[4] || ''}
            onChangeText={v => setSelection(4, v)}
            placeholder={placeholder}
            keyboardType="decimal-pad"
          />
          <Text style={styles.inputUnit}>{unit}</Text>
        </View>
      </View>
    );
  };

  const renderStep5 = () => {
    const range  = getRange(testType, numValue, hasDiabetes);
    const color  = range ? RANGE_COLORS[range] : '#212529';
    const message = getResultMessage(testType, numValue, hasDiabetes);
    const tip    = getResultTip(testType, numValue, hasDiabetes);

    return (
      <View style={styles.phaseContent}>
        <Text style={[styles.resultMessage, { color }]}>{message}</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </View>
    );
  };

  const renderStep6 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Commitment to Healthy Change</Text>
      <Text style={styles.phaseSubtitle}>Do you plan to improve this area?</Text>
      <View style={styles.yesNoContainer}>
        {['Yes', 'No'].map(choice => (
          <TouchableOpacity
            key={choice}
            style={[styles.yesNoCard, selections[6] === choice && styles.yesNoCardSelected]}
            onPress={() => handleStep6Choice(choice)}
          >
            <Text style={[styles.yesNoText, selections[6] === choice && styles.yesNoTextSelected]}>
              {choice}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep7 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Importance</Text>
      <Text style={styles.phaseSubtitle}>How important is this change to you right now?</Text>
      <CustomSlider value={selections[7]} onValueChange={v => setSelection(7, v)} />
    </View>
  );

  const renderStep8 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Confidence</Text>
      <Text style={styles.phaseSubtitle}>How confident are you about making this change?</Text>
      <CustomSlider value={selections[8]} onValueChange={v => setSelection(8, v)} />
    </View>
  );

  const renderStep9 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Resources</Text>
      <Text style={styles.phaseSubtitle}>
        You're on the right path! Here are some resources to support your blood sugar health.
      </Text>
      <View style={styles.introImageContainer}>
        <Text style={styles.introEmoji}>🥦</Text>
      </View>
      <Text style={styles.resourcesBody}>
        Focus on balanced meals, regular activity, and staying connected with your healthcare team to support healthy blood sugar levels.
      </Text>
    </View>
  );

  const renderStep10 = () => {
    const score = getBloodGlucoseScore(testType, numValue, hasDiabetes);

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Great Job!</Text>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Based on your responses</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreEmoji}>🎉</Text>
            <Text style={styles.scoreNumber}>{score !== null ? score : '—'}</Text>
            <Text style={styles.scoreMax}>out of 100</Text>
          </View>
          {testType && numValue !== null && (
            <Text style={styles.scoreDetail}>
              {testType}: {numValue}{testType === 'HbA1c' ? '%' : ' mg/dL'}
            </Text>
          )}
        </View>
        <Text style={styles.resultsDescription}>
          Your blood sugar score reflects your glucose levels. A higher score indicates better alignment with heart-healthy ranges.
        </Text>
      </View>
    );
  };

  // ── Step rendering dispatch ─────────────────────────────────────────────────
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:  return renderStep0();
      case 1:  return renderStep1();
      case 2:  return renderStep2();
      case 3:  return renderStep3();
      case 4:  return renderStep4();
      case 5:  return renderStep5();
      case 6:  return renderStep6();
      case 7:  return renderStep7();
      case 8:  return renderStep8();
      case 9:  return renderStep9();
      case 10: return renderStep10();
      default: return null;
    }
  };

  const TOTAL_STEPS = 11;
  const progressPercent = (currentStep / (TOTAL_STEPS - 1)) * 100;
  const footerButton = getFooterButton();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>{currentStep === 0 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep + 1} of {TOTAL_STEPS}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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

  // Intro styles
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

  // Phase screens
  phaseContent: { flexGrow: 1, paddingTop: 8, alignItems: 'center', width: '100%' },
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

  // Intro image / emoji (used for intro and resources)
  introImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  introEmoji: { fontSize: 120 },

  // Yes/No buttons
  yesNoContainer: { gap: 16, marginBottom: 8, width: '100%' },
  yesNoCard: {
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    paddingVertical: 20,
  },
  yesNoCardSelected: { backgroundColor: '#000000' },
  yesNoText: { fontSize: 20, fontWeight: '700', color: '#555' },
  yesNoTextSelected: { color: '#FFFFFF' },

  // Option cards (test type)
  optionsContainer: { gap: 12, marginBottom: 8, width: '100%' },
  optionCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: { backgroundColor: '#212529', borderColor: '#212529' },
  optionTitle: { fontSize: 17, fontWeight: '600', color: '#212529', marginBottom: 4 },
  optionTitleSelected: { color: '#FFFFFF' },
  optionSubtitle: { fontSize: 13, color: '#6C757D' },
  optionSubtitleSelected: { color: '#ADB5BD' },

  // Value input (step 4)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 56,
    fontWeight: '700',
    color: '#212529',
    padding: 0,
    textAlign: 'center',
  },
  inputUnit: { fontSize: 24, color: '#6C757D', marginLeft: 16, fontWeight: '500' },

  // Result feedback (step 5)
  resultMessage: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 20,
    marginBottom: 32,
    width: '100%',
  },
  tipText: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    textAlign: 'center',
  },

  // Resources
  resourcesBody: {
    fontSize: 16,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  // Results / summary (step 10)
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
  scoreDetail: { fontSize: 15, color: '#8E8E93', marginTop: 12 },
  resultsDescription: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default BloodSugarFlowScreen;
