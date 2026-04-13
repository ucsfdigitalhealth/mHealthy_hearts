// BloodLipidsFlowScreen.tsx
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { setCachedBloodLipids } from '../../utils/bloodLipidsCache';

const MASCOT_IMAGE = require('../../../assets/blood-lipids-mascot.png');

// ─── Scoring helper (mirrors backend/metricCalc.js) ──────────────────────────
function getNonHDLScoreLocal(value: number | null): number | null {
  if (value === null) return null;
  if (value < 130) return 100;
  if (value <= 159) return 60;
  if (value <= 189) return 40;
  if (value <= 219) return 20;
  return 0;
}

// ─── Range info ───────────────────────────────────────────────────────────────
type RangeInfo = {
  label: string;
  score: number;
  tip: string;
};

function getRangeInfo(value: number | null): RangeInfo | null {
  if (value === null) return null;
  if (value < 130) return {
    label: 'Healthy Range (<130 mg/dL)',
    score: 100,
    tip: 'Continue building meals around whole foods like vegetables, fruits, whole grains, and lean proteins to help maintain these strong numbers over time.',
  };
  if (value <= 159) return {
    label: 'Intermediate Range (130–159 mg/dL)',
    score: 60,
    tip: 'Improving your blood lipids can lower your risk for heart disease. Try eating more fiber-rich foods, choosing healthy fats, and staying active.',
  };
  if (value <= 189) return {
    label: 'Elevated Range (160–189 mg/dL)',
    score: 40,
    tip: 'Choosing foods lower in saturated fat and including more plant‑based meals during the week can help improve your cholesterol.',
  };
  if (value <= 219) return {
    label: 'High Range (190–219 mg/dL)',
    score: 20,
    tip: 'Improving your blood lipids can lower your risk for heart disease. Limiting fried and processed foods and cooking with healthier oils can support better cholesterol levels.',
  };
  return {
    label: 'Very High Range (≥ 220 mg/dL)',
    score: 0,
    tip: 'Heart‑healthy eating patterns, regular movement, and checking in with a healthcare professional can help you take meaningful next steps.',
  };
}

function getMeasureTypeLabel(measureType: string | null): string {
  if (measureType === 'total-cholesterol') return 'Total Cholesterol';
  if (measureType === 'non-hdl-cholesterol') return 'Non-HDL Cholesterol';
  return 'Cholesterol';
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
  container: {
    marginVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  valueDisplay: {
    fontSize: 64,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  trackWrapper: {
    width: '90%',
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
    backgroundColor: '#000',
    top: 6,
    marginLeft: -14,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 8,
  },
  labelItem: { alignItems: 'center' },
  labelNum: { fontSize: 12, color: '#666', fontWeight: '500' },
  labelText: { fontSize: 12, color: '#666' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
// Step map:
//  1  Welcome (mascot + Start)
//  2  I found my results / I'll check later
//  3  Which measure do you have?
//  4  Enter value
//  5  Result screen
//  6  Medication
//  7  Commitment
//  8  Importance slider
//  9  Confidence slider
//  10 Score summary
//  11 Resources
const BloodLipidsFlowScreen: React.FC = () => {
  const navigation = useNavigation();
  const { accessToken } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [checkLater, setCheckLater] = useState<boolean>(false);

  // Selections
  const [measureType, setMeasureType] = useState<string | null>(null);
  const [value, setValue] = useState<string>('');
  const [medication, setMedication] = useState<boolean | null>(null);
  const [commitment, setCommitment] = useState<boolean | null>(null);
  const [importance, setImportance] = useState<number>(5);
  const [confidence, setConfidence] = useState<number>(5);

  const TOTAL_STEPS = 11;

  const goToStep = (step: number) => setCurrentStep(step);

  // ── Back navigation ──────────────────────────────────────────────────────────
  const handleBack = () => {
    switch (currentStep) {
      case 1:
        navigation.goBack();
        break;
      case 2:
        goToStep(1);
        break;
      case 3:
        goToStep(2);
        break;
      case 4:
        goToStep(3);
        break;
      case 5:
        goToStep(4);
        break;
      case 6:
        if (measureType === 'no-results') goToStep(3);
        else goToStep(5);
        break;
      case 7:
        goToStep(6);
        break;
      case 8:
        goToStep(7);
        break;
      case 9:
        goToStep(8);
        break;
      case 10:
        if (commitment) goToStep(9);
        else goToStep(7);
        break;
      case 11:
        if (checkLater) {
          setCheckLater(false);
          goToStep(2);
        } else if (value) goToStep(10);
        else if (commitment) goToStep(9);
        else goToStep(7);
        break;
      default:
        goToStep(currentStep - 1);
    }
  };

  // ── Choice handlers ──────────────────────────────────────────────────────────
  const handleMeasureSelect = (type: string) => {
    setMeasureType(type);
    if (type === 'no-results') {
      goToStep(6);
    } else {
      goToStep(4);
    }
  };

  const handleMedicationSelect = (isYes: boolean) => {
    setMedication(isYes);
  };

  const handleCommitmentSelect = (isYes: boolean) => {
    setCommitment(isYes);
  };

  const handleCommitmentNext = () => {
    if (commitment) {
      goToStep(8);
    } else {
      if (value) goToStep(10);
      else goToStep(11);
    }
  };

  const handleImportanceNext = () => goToStep(9);

  const handleConfidenceNext = () => {
    if (value) goToStep(10);
    else goToStep(11);
  };

  const handleResultNext = () => goToStep(6);

  const handleScoreSummaryNext = () => goToStep(11);

  // ── Done (Resources screen) ──────────────────────────────────────────────────
  const handleDone = async () => {
    if (checkLater) {
      navigation.goBack();
      return;
    }

    const numericValue = value ? Number(value) : null;
    const score = getNonHDLScoreLocal(numericValue);

    try {
      await fetch('http://localhost:3000/api/blood-lipids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          measureType: measureType || 'no-results',
          value: numericValue,
          medication,
          commitmentToChange: commitment,
          importance: commitment ? importance : null,
          confidence: commitment ? confidence : null,
        }),
      });

      await setCachedBloodLipids({
        score,
        value: numericValue,
        measureType: measureType || 'no-results',
      });
    } catch (error) {
      console.error('Error saving blood lipids assessment:', error);
    }

    navigation.goBack();
  };

  // ── Footer button props ───────────────────────────────────────────────────────
  const getFooterButton = (): {
    label: string;
    onPress: () => void;
    disabled: boolean;
    dark: boolean;
    show: boolean;
  } | null => {
    switch (currentStep) {
      case 1:
        return { label: 'Start', onPress: () => goToStep(2), disabled: false, dark: false, show: true };
      case 2:
        return null; // auto-navigates on choice
      case 3:
        return null; // auto-navigates on measure select
      case 4:
        return { label: 'Next', onPress: () => goToStep(5), disabled: !value, dark: false, show: true };
      case 5:
        return { label: 'Next', onPress: handleResultNext, disabled: false, dark: false, show: true };
      case 6:
        return { label: 'Next', onPress: () => goToStep(7), disabled: medication === null, dark: false, show: true };
      case 7:
        return { label: 'Next', onPress: handleCommitmentNext, disabled: commitment === null, dark: false, show: true };
      case 8:
        return { label: 'Next', onPress: handleImportanceNext, disabled: false, dark: false, show: true };
      case 9:
        return { label: 'Next', onPress: handleConfidenceNext, disabled: false, dark: false, show: true };
      case 10:
        return { label: 'Next', onPress: handleScoreSummaryNext, disabled: false, dark: false, show: true };
      case 11:
        return { label: 'Done', onPress: handleDone, disabled: false, dark: true, show: true };
      default:
        return null;
    }
  };

  // ── Step renderers ───────────────────────────────────────────────────────────

  // Step 1: Welcome / intro
  const renderWelcome = () => (
    <View style={styles.introContent}>
      <Text style={styles.introTitle}>Let's assess your blood lipids</Text>
      <Text style={styles.introSubtitle}>
        {"We'll ask about your most recent cholesterol or lipid panel so we can calculate your score"}
      </Text>
      <View style={styles.introImageContainer}>
        <Image
          source={MASCOT_IMAGE}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  // Step 2: I found my results / I'll check later
  const renderStep1 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Let's assess your blood lipids</Text>
      <Text style={styles.phaseSubtitle}>
        {"If you're not sure, that's totally fine. If you can check your latest blood test results from your doctor or online portal, the value is usually listed under 'non‑HDL cholesterol' or 'lipid panel'."}
      </Text>
      <View style={styles.commitmentButtons}>
        <TouchableOpacity
          style={styles.commitmentButton}
          onPress={() => { setCheckLater(false); goToStep(3); }}
        >
          <Text style={styles.commitmentButtonText}>I found my results</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.commitmentButton}
          onPress={() => { setCheckLater(true); goToStep(11); }}
        >
          <Text style={styles.commitmentButtonText}>I'll check later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 3: Which measure do you have available?
  const renderStep2 = () => {
    const options = [
      { id: 'total-cholesterol', title: 'Total cholesterol', subtitle: 'mg/dL' },
      { id: 'non-hdl-cholesterol', title: 'Non-HDL cholesterol', subtitle: 'mg/dL' },
      { id: 'no-results', title: "I don't have recent results or not Sure", subtitle: null },
    ];
    return (
      <View style={styles.phaseContent}>
        <Text style={styles.phaseTitle}>Which measure do you have available?</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, measureType === opt.id && styles.optionCardSelected]}
              onPress={() => handleMeasureSelect(opt.id)}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionTitle, measureType === opt.id && styles.optionTitleSelected]}>
                    {opt.title}
                  </Text>
                  {opt.subtitle && (
                    <Text style={[styles.optionSubtitle, measureType === opt.id && styles.optionSubtitleSelected]}>
                      {opt.subtitle}
                    </Text>
                  )}
                </View>
                {measureType === opt.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Step 4: Enter value
  const renderStep3 = () => {
    const typeLabel = measureType === 'total-cholesterol' ? 'total cholesterol' : 'non-HDL cholesterol';
    return (
      <View style={styles.phaseContent}>
        <Text style={styles.phaseTitle}>Enter your most recent {typeLabel} result</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="130"
            keyboardType="numeric"
            maxLength={4}
          />
          <Text style={styles.inputUnitLabel}>mg/dL</Text>
        </View>
        <View style={styles.referenceContainer}>
          <View style={styles.referenceRow}>
            <View style={styles.referenceIndicator}>
              <View style={[styles.referenceBar, { backgroundColor: '#34C759' }]} />
              <Text style={styles.referenceLabel}>Healthy</Text>
              <Text style={styles.referenceValue}>{'< 130'}</Text>
            </View>
            <View style={styles.referenceIndicator}>
              <View style={[styles.referenceBar, { backgroundColor: '#FFCC00' }]} />
              <Text style={styles.referenceLabel}>Intermediate</Text>
              <Text style={styles.referenceValue}>130–159</Text>
            </View>
            <View style={styles.referenceIndicator}>
              <View style={[styles.referenceBar, { backgroundColor: '#FF9500' }]} />
              <Text style={styles.referenceLabel}>Elevated</Text>
              <Text style={styles.referenceValue}>160–189</Text>
            </View>
            <View style={styles.referenceIndicator}>
              <View style={[styles.referenceBar, { backgroundColor: '#FF3B30' }]} />
              <Text style={styles.referenceLabel}>High+</Text>
              <Text style={styles.referenceValue}>{'≥ 190'}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Step 6: Medication
  const renderStep4 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.categoryLabel}>MEDICATION</Text>
      <Text style={styles.phaseTitle}>Are you currently taking medication to lower cholesterol?</Text>
      <View style={styles.yesNoContainer}>
        <TouchableOpacity
          style={[styles.yesNoCard, medication === true && styles.yesNoCardSelected]}
          onPress={() => handleMedicationSelect(true)}
        >
          <Text style={[styles.yesNoText, medication === true && styles.yesNoTextSelected]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoCard, medication === false && styles.yesNoCardSelected]}
          onPress={() => handleMedicationSelect(false)}
        >
          <Text style={[styles.yesNoText, medication === false && styles.yesNoTextSelected]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 7: Commitment
  const renderStep5 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Commitment to Healthy Change</Text>
      <Text style={styles.phaseSubtitle}>Do you plan to improve this area?</Text>
      <View style={styles.yesNoContainer}>
        <TouchableOpacity
          style={[styles.yesNoCard, commitment === true && styles.yesNoCardSelected]}
          onPress={() => handleCommitmentSelect(true)}
        >
          <Text style={[styles.yesNoText, commitment === true && styles.yesNoTextSelected]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoCard, commitment === false && styles.yesNoCardSelected]}
          onPress={() => handleCommitmentSelect(false)}
        >
          <Text style={[styles.yesNoText, commitment === false && styles.yesNoTextSelected]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 8: Importance
  const renderStep6 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Importance</Text>
      <Text style={styles.phaseSubtitle}>How important is this change to you right now?</Text>
      <CustomSlider value={importance} onValueChange={setImportance} />
    </View>
  );

  // Step 9: Confidence
  const renderStep7 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Confidence</Text>
      <Text style={styles.phaseSubtitle}>How confident are you about making this change?</Text>
      <CustomSlider value={confidence} onValueChange={setConfidence} />
    </View>
  );

  // Step 5: Result screen (shown right after value entry)
  const renderStep8 = () => {
    const numericValue = value ? Number(value) : null;
    const rangeInfo = getRangeInfo(numericValue);
    const typeLabel = getMeasureTypeLabel(measureType);

    return (
      <View style={styles.phaseContent}>
        <Text style={styles.phaseTitle}>
          {`Your ${typeLabel} is ${value} mg/dL`}
        </Text>
        <Text style={styles.phaseSubtitle}>{rangeInfo?.label ?? ''}</Text>
        <View style={styles.introImageContainer}>
          <Text style={styles.introEmoji}>🩸</Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{rangeInfo?.tip ?? ''}</Text>
        </View>
      </View>
    );
  };

  // Step 10: Score summary
  const renderStep9 = () => {
    const numericValue = value ? Number(value) : null;
    const score = getNonHDLScoreLocal(numericValue);
    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Great Job!</Text>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Based on your responses</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreEmoji}>🎉</Text>
            <Text style={styles.scoreNumber}>{score ?? '--'}</Text>
            <Text style={styles.scoreMax}>out of 100</Text>
          </View>
        </View>
        <Text style={styles.resultsDescription}>
          Your blood lipids score reflects your cholesterol levels. A higher score indicates better alignment with heart-healthy ranges.
        </Text>
      </View>
    );
  };

  // Step 11: Resources
  const renderStep10 = () => (
    <View style={styles.phaseContent}>
      <Text style={styles.phaseTitle}>Resources</Text>
      <Text style={styles.phaseSubtitle}>
        You're on the right path! Here are some heart-healthy tips to support your cholesterol levels.
      </Text>
      <View style={styles.introImageContainer}>
        <Text style={styles.introEmoji}>🧘</Text>
      </View>
      <Text style={styles.resourcesBody}>
        Focus on eating more fiber-rich foods, choosing healthy fats, and staying active to support better cholesterol levels.
      </Text>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:  return renderWelcome();
      case 2:  return renderStep1();
      case 3:  return renderStep2();
      case 4:  return renderStep3();
      case 5:  return renderStep8();
      case 6:  return renderStep4();
      case 7:  return renderStep5();
      case 8:  return renderStep6();
      case 9:  return renderStep7();
      case 10: return renderStep9();
      case 11: return renderStep10();
      default: return null;
    }
  };

  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  const footerButton = getFooterButton();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>{currentStep === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep} of {TOTAL_STEPS}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  introContent: { flexGrow: 1, paddingTop: 8, alignItems: 'center' },
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
  mascotImage: { width: 220, height: 220 },

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
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Commitment / Yes-No buttons
  commitmentButtons: { width: '100%', gap: 16 },
  commitmentButton: {
    backgroundColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },
  commitmentButtonText: { fontSize: 20, fontWeight: '700', color: '#555' },

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

  // Option cards
  optionsContainer: { gap: 12, marginBottom: 8, width: '100%' },
  optionCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: { backgroundColor: '#212529', borderColor: '#212529' },
  optionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 17, fontWeight: '600', color: '#212529', marginBottom: 4 },
  optionTitleSelected: { color: '#FFFFFF' },
  optionSubtitle: { fontSize: 13, color: '#6C757D' },
  optionSubtitleSelected: { color: '#ADB5BD' },

  // Value input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700',
    color: '#212529',
    padding: 0,
    textAlign: 'center',
  },
  inputUnitLabel: { fontSize: 20, color: '#6C757D', marginLeft: 16, fontWeight: '500' },

  referenceContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  referenceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  referenceIndicator: { alignItems: 'center', flex: 1 },
  referenceBar: { width: 48, height: 8, borderRadius: 4, marginBottom: 6 },
  referenceLabel: { fontSize: 10, color: '#6C757D', marginBottom: 2, fontWeight: '500', textAlign: 'center' },
  referenceValue: { fontSize: 11, fontWeight: '600', color: '#212529', textAlign: 'center' },

  // Tip card (result screen)
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

  // Results / score summary
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
  resultsDescription: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default BloodLipidsFlowScreen;
