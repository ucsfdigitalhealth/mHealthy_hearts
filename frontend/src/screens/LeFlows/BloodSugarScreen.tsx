// BloodSugarFlowScreen.tsx
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
function getBloodGlucoseScore(testType: string | null, value: number | null): number | null {
  if (value === null || testType === null) return null;
  if (testType === 'HbA1c') {
    if (value < 5.7) return 100;
    if (value <= 6.4) return 60;
    if (value <= 6.9) return 40;
    if (value <= 7.9) return 25;
    if (value <= 8.9) return 20;
    if (value <= 9.9) return 10;
    return 0;
  }
  // Fasting Blood Glucose
  if (value < 100) return 100;
  if (value <= 125) return 60;
  if (value <= 154) return 40;
  if (value <= 182) return 30;
  if (value <= 212) return 20;
  if (value <= 240) return 10;
  return 0;
}

// ─── Result range helper ─────────────────────────────────────────────────────
type Range = 'in-range' | 'prediabetes' | 'diabetes';
function getRange(testType: string | null, value: number | null): Range | null {
  if (value === null || testType === null) return null;
  if (testType === 'HbA1c') {
    if (value < 5.7) return 'in-range';
    if (value <= 6.4) return 'prediabetes';
    return 'diabetes';
  }
  if (value < 100) return 'in-range';
  if (value <= 125) return 'prediabetes';
  return 'diabetes';
}

const RANGE_COLORS = {
  'in-range': '#369949',
  'prediabetes': '#d1ce1d',
  'diabetes': '#cd482f',
};

const RANGE_LABELS = {
  'in-range': 'in-range',
  'prediabetes': 'prediabetes',
  'diabetes': 'diabetes',
};

function getResultMessage(testType: string | null, value: number | null): string {
  if (!testType || value === null) return '';
  const range = getRange(testType, value);
  if (testType === 'HbA1c') {
    return `Your A1C is ${value}%. That falls in the ${RANGE_LABELS[range!]} category.`;
  }
  return `Your FBG is ${value} mg/dL. That falls in the ${RANGE_LABELS[range!]} category.`;
}

function getResultTip(testType: string | null, value: number | null): string {
  const range = getRange(testType, value);
  if (range === 'in-range') {
    return 'Tip: Keeping up with your current habits can help you stay on track. Small, steady routines often make the biggest difference over time.';
  }
  if (range === 'prediabetes') {
    return 'Tip: Even small changes—like adding a short walk or choosing one healthier meal a day—can support your overall well‑being. Starting gradually can feel more manageable.';
  }
  if (range === 'diabetes') {
    return 'Tip: Focusing on simple, daily steps—like staying active, eating balanced meals, and following your care plan—can support your health. Checking in with your healthcare team can also help you decide what\'s right for you.';
  }
  return '';
}

// ─── Custom Slider ────────────────────────────────────────────────────────────
const CustomSlider: React.FC<{
  value: number;
  onValueChange: (v: number) => void;
}> = ({ value, onValueChange }) => {
  const trackWidthRef = useRef<number>(0);
  // Keep a ref to onValueChange so the panResponder (created once) always
  // calls the latest callback, even when the component is reused across steps.
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
        style={sliderStyles.track}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
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
  container: {
    marginBottom: 40,
    alignItems: 'center',
  },
  valueDisplay: {
    fontSize: 80,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
  },
  track: {
    width: '90%',
    height: 34,
    backgroundColor: '#D9D9D9',
    borderRadius: 17,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#212529',
    top: -1,
    marginLeft: -18,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 8,
  },
  labelItem: {
    alignItems: 'center',
  },
  labelNum: {
    fontSize: 18,
    color: '#A2A2A2',
    fontWeight: '500',
  },
  labelText: {
    fontSize: 13,
    color: '#A2A2A2',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const BloodSugarFlowScreen: React.FC = () => {
  const navigation = useNavigation();
  const { accessToken } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Selections keyed by step id
  const [selections, setSelections] = useState<Record<number, any>>({
    1: null,  // knowsResult: 'Yes' | 'No'
    2: 'Fasting Blood Glucose', // testType
    3: null,  // value string
    4: null,  // hasDiabetes: 'Yes' | 'No'
    6: null,  // commitment: 'Yes' | 'No'
    7: 5,     // importance 0-10
    8: 5,     // confidence 0-10
  });

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const goToStep = (step: number) => setCurrentStep(step);

  const handleNext = () => {
    if (currentStep < 10) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigation.goBack();
      return;
    }
    // Reverse the conditional skips
    if (currentStep === 4 && selections[1] === 'No') {
      setCurrentStep(1);
      return;
    }
    if (currentStep === 6 && selections[1] === 'Yes') {
      setCurrentStep(5);
      return;
    }
    if (currentStep === 6 && selections[1] === 'No') {
      setCurrentStep(4);
      return;
    }
    if (currentStep === 9 && selections[6] === 'No') {
      setCurrentStep(6);
      return;
    }
    setCurrentStep(currentStep - 1);
  };

  const setSelection = (stepId: number, value: any) => {
    setSelections(prev => ({ ...prev, [stepId]: value }));
  };

  // ── Choice handlers ─────────────────────────────────────────────────────────
  const handleStep1Choice = (choice: string) => {
    setSelection(1, choice);
    if (choice === 'No') {
      goToStep(4); // skip test type + value + result feedback
    } else {
      goToStep(2);
    }
  };

  const handleStep4Choice = (choice: string) => {
    setSelection(4, choice);
    if (selections[1] === 'Yes') {
      goToStep(5); // show result feedback
    } else {
      goToStep(6); // skip result feedback
    }
  };

  const handleStep6Choice = (choice: string) => {
    setSelection(6, choice);
  };

  const handleStep6Next = () => {
    if (selections[6] === 'Yes') {
      goToStep(7);
    } else {
      goToStep(9); // skip importance + confidence
    }
  };

  // ── Save on Done ────────────────────────────────────────────────────────────
  const handleDone = async () => {
    const testType = selections[2] as string | null;
    const rawValue = selections[3];
    const numValue = rawValue ? parseFloat(rawValue) : null;
    const hasDiabetes = selections[4] === 'Yes';
    const commitmentToChange = selections[6] === 'Yes';
    const importance = commitmentToChange ? selections[7] : null;
    const confidence = commitmentToChange ? selections[8] : null;

    const score = getBloodGlucoseScore(testType, numValue);

    try {
      await fetch('http://localhost:3000/api/blood-sugar', {
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

    // Update AsyncStorage immediately so CardioVascularScreen reflects new data
    await setCachedBloodSugar({
      score,
      value: numValue,
      testType,
    });

    navigation.goBack();
  };

  // ── Step renderers ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Do you know your most recent blood sugar result?</Text>
      <View style={styles.buttonGroup}>
        {['Yes', 'No'].map(choice => (
          <TouchableOpacity
            key={choice}
            style={[
              styles.largeButton,
              selections[1] === choice ? styles.primaryButton : styles.secondaryButton,
            ]}
            onPress={() => handleStep1Choice(choice)}
          >
            <Text style={[
              styles.largeButtonText,
              selections[1] === choice ? styles.primaryButtonText : styles.secondaryButtonText,
            ]}>
              {choice}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Which type of blood sugar test do you have?</Text>
      <View style={styles.choiceGroup}>
        {[
          { title: 'Fasting Blood Glucose', subtitle: 'Usually taken after 8+ hours of fasting', value: 'Fasting Blood Glucose' },
          { title: 'HbA1c', subtitle: 'Average blood sugar over 2–3 months', value: 'HbA1c' },
        ].map(option => (
          <TouchableOpacity
            key={option.value}
            style={[styles.choiceButton, selections[2] === option.value && styles.choiceButtonSelected]}
            onPress={() => setSelection(2, option.value)}
          >
            <View style={styles.choiceContent}>
              <View style={[styles.radio, selections[2] === option.value && styles.radioSelected]}>
                {selections[2] === option.value && <View style={styles.radioInner} />}
              </View>
              <View style={styles.choiceTextContainer}>
                <Text style={styles.choiceTitle}>{option.title}</Text>
                <Text style={styles.choiceSubtitle}>{option.subtitle}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.nextButton, !selections[2] && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!selections[2]}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => {
    const isHbA1c = selections[2] === 'HbA1c';
    const title = isHbA1c
      ? 'Please enter your most recent HbA1c result:'
      : 'Please enter your most recent fasting blood glucose result:';
    const unit = isHbA1c ? '%' : 'mg/dL';
    const placeholder = isHbA1c ? '5.7' : '100';

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{title}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={selections[3] || ''}
            onChangeText={v => setSelection(3, v)}
            placeholder={placeholder}
            keyboardType="decimal-pad"
          />
          <Text style={styles.inputUnit}>{unit}</Text>
        </View>
        <TouchableOpacity
          style={[styles.nextButton, !selections[3] && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selections[3]}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Have you ever been told by a healthcare professional that you have diabetes?</Text>
      <View style={styles.buttonGroup}>
        {['Yes', 'No'].map(choice => (
          <TouchableOpacity
            key={choice}
            style={[
              styles.largeButton,
              selections[4] === choice ? styles.primaryButton : styles.secondaryButton,
            ]}
            onPress={() => handleStep4Choice(choice)}
          >
            <Text style={[
              styles.largeButtonText,
              selections[4] === choice ? styles.primaryButtonText : styles.secondaryButtonText,
            ]}>
              {choice}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep5 = () => {
    const testType = selections[2] as string | null;
    const numValue = selections[3] ? parseFloat(selections[3]) : null;
    const range = getRange(testType, numValue);
    const color = range ? RANGE_COLORS[range] : '#212529';
    const message = getResultMessage(testType, numValue);
    const tip = getResultTip(testType, numValue);

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.resultMessage, { color }]}>{message}</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.commitTitle}>Commitment to Healthy Change</Text>
      <Text style={styles.commitQuestion}>Do you plan to improve this area?</Text>
      <View style={styles.commitButtonGroup}>
        {['Yes', 'No'].map(choice => (
          <TouchableOpacity
            key={choice}
            style={[
              styles.commitButton,
              selections[6] === choice && styles.commitButtonSelected,
            ]}
            onPress={() => handleStep6Choice(choice)}
          >
            <Text style={[
              styles.commitButtonText,
              selections[6] === choice && styles.commitButtonTextSelected,
            ]}>
              {choice}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.blueButton, !selections[6] && styles.nextButtonDisabled]}
        onPress={handleStep6Next}
        disabled={!selections[6]}
      >
        <Text style={styles.blueButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sliderSectionTitle}>Importance</Text>
      <Text style={styles.sliderQuestion}>How important is this change to you right now?</Text>
      <CustomSlider
        value={selections[7]}
        onValueChange={v => setSelection(7, v)}
      />
      <TouchableOpacity style={styles.blueButton} onPress={handleNext}>
        <Text style={styles.blueButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep8 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sliderSectionTitle}>Confidence</Text>
      <Text style={styles.sliderQuestion}>How confident are you about making this change?</Text>
      <CustomSlider
        value={selections[8]}
        onValueChange={v => setSelection(8, v)}
      />
      <TouchableOpacity style={styles.blueButton} onPress={handleNext}>
        <Text style={styles.blueButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep9 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.resourcesTitle}>Resources</Text>
      <Text style={styles.resourcesBody}>
        {"You're on the right path!\n\nCheck out the Stress Management video and additional links for more support!"}
      </Text>
      <View style={styles.videoPlaceholder}>
        <View style={styles.playButton}>
          <Ionicons name="play" size={40} color="#212529" />
        </View>
      </View>
      <TouchableOpacity style={styles.blueButton} onPress={handleNext}>
        <Text style={styles.blueButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep10 = () => {
    const testType = selections[2] as string | null;
    const numValue = selections[3] ? parseFloat(selections[3]) : null;
    const score = getBloodGlucoseScore(testType, numValue);

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.summaryTitle}>Blood Sugar Summary</Text>
        <Text style={styles.summarySubtitle}>{`Here's your Blood Sugar score:`}</Text>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreValue}>{score !== null ? score : '—'}</Text>
          <Text style={styles.scoreLabel}>Points</Text>
        </View>
        <View style={styles.resultDetails}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Test Type:</Text>
            <Text style={styles.resultValue}>{testType || '—'}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Result:</Text>
            <Text style={styles.resultValue}>
              {numValue !== null ? `${numValue} ${testType === 'HbA1c' ? '%' : 'mg/dL'}` : '—'}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Diabetes Diagnosis:</Text>
            <Text style={styles.resultValue}>{selections[4] || '—'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={handleDone}>
          <Text style={styles.submitButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Step rendering dispatch ─────────────────────────────────────────────────
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      case 9: return renderStep9();
      case 10: return renderStep10();
      default: return null;
    }
  };

  // ── Progress indicator ──────────────────────────────────────────────────────
  // Visible steps for progress bar (steps that always appear in the main flow)
  const VISIBLE_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>{currentStep === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        {/* Progress dots */}
        <View style={styles.progressContainer}>
          {VISIBLE_STEPS.map((stepId, index) => (
            <View key={stepId} style={styles.stepIndicator}>
              <View style={[
                styles.stepCircle,
                currentStep >= stepId && styles.stepCircleActive,
              ]}>
                <Text style={[
                  styles.stepNumber,
                  currentStep >= stepId && styles.stepNumberActive,
                ]}>
                  {index + 1}
                </Text>
              </View>
              {index < VISIBLE_STEPS.length - 1 && (
                <View style={[
                  styles.stepLine,
                  currentStep > stepId && styles.stepLineActive,
                ]} />
              )}
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6C757D',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E9ECEF',
    marginHorizontal: 2,
  },
  stepLineActive: {
    backgroundColor: '#007AFF',
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 500,
  },
  // ── Choice / Large buttons ──────────────────────────────────────────────────
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 40,
    lineHeight: 36,
  },
  buttonGroup: {
    gap: 16,
  },
  largeButton: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#212529',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#DEE2E6',
  },
  largeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#212529',
  },
  // ── Radio / choice options ──────────────────────────────────────────────────
  choiceGroup: {
    gap: 16,
    marginBottom: 40,
  },
  choiceButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  choiceButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CED4DA',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
  },
  choiceSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    lineHeight: 22,
  },
  // ── Next / Submit buttons ───────────────────────────────────────────────────
  nextButton: {
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
  nextButtonDisabled: {
    backgroundColor: '#CED4DA',
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  blueButton: {
    backgroundColor: '#224694',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // ── Input ───────────────────────────────────────────────────────────────────
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 56,
    fontWeight: '700',
    color: '#212529',
    padding: 0,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 24,
    color: '#6C757D',
    marginLeft: 16,
    fontWeight: '500',
  },
  // ── Result / Feedback (step 5) ──────────────────────────────────────────────
  resultMessage: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#212529',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  tipText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#212529',
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '600',
  },
  // ── Commitment (step 6) ─────────────────────────────────────────────────────
  commitTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 16,
  },
  commitQuestion: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 36,
  },
  commitButtonGroup: {
    gap: 16,
    marginBottom: 40,
  },
  commitButton: {
    backgroundColor: '#E4E1E1',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commitButtonSelected: {
    backgroundColor: '#212529',
  },
  commitButtonText: {
    fontSize: 28,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#212529',
  },
  commitButtonTextSelected: {
    color: '#FFFFFF',
  },
  // ── Slider steps (7 & 8) ───────────────────────────────────────────────────
  sliderSectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 16,
  },
  sliderQuestion: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 40,
  },
  // ── Resources (step 9) ──────────────────────────────────────────────────────
  resourcesTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 24,
  },
  resourcesBody: {
    fontSize: 28,
    color: '#212529',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 32,
  },
  videoPlaceholder: {
    backgroundColor: '#D9D9D9',
    borderWidth: 2,
    borderColor: '#212529',
    borderRadius: 12,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    opacity: 0.85,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#212529',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  // ── Summary (step 10) ───────────────────────────────────────────────────────
  summaryTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C4C4C4',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    alignSelf: 'center',
    width: '80%',
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '700',
    color: '#212529',
    marginRight: 16,
  },
  scoreLabel: {
    fontSize: 48,
    fontWeight: '700',
    color: '#212529',
  },
  resultDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  resultLabel: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
});

export default BloodSugarFlowScreen;
