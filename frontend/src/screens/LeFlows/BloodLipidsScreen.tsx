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
        // Result screen — came from step 4 (value input)
        goToStep(4);
        break;
      case 6:
        // Medication — came from step 5 (result) or step 3 (no-results)
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
        // Confidence — came from step 8 (importance)
        goToStep(8);
        break;
      case 10:
        // Score summary — came from step 9 (confidence) or step 7 (commitment=No)
        if (commitment) goToStep(9);
        else goToStep(7);
        break;
      case 11:
        // Resources — came from step 2 (check later), step 10, or step 9/7
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
      goToStep(6); // skip value input and result screen, go to medication
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
      goToStep(8); // importance slider
    } else {
      // Skip sliders — go to score summary if value exists, else resources
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

  // ── Step renderers ───────────────────────────────────────────────────────────

  // Step 1: Welcome / intro
  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Let's assess your blood lipids</Text>
      <Text style={styles.welcomeSubtitle}>
        {"We'll ask about your most recent cholesterol or lipid panel so we can calculate your score"}
      </Text>
      <View style={styles.welcomeMascotContainer}>
        <Image
          source={MASCOT_IMAGE}
          style={styles.mascotImage}
          resizeMode="contain"
        />
        <Text style={styles.mascotLabel}>BLOOD LIPIDS</Text>
      </View>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => goToStep(2)}
      >
        <Text style={styles.startButtonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 2: I found my results / I'll check later
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Let's assess your blood lipids</Text>
      <Text style={styles.checkLaterDescription}>
        {"If you're not sure, that's totally fine. If you can check your latest blood test results from your doctor or online portal, the value is usually listed under 'non‑HDL cholesterol' or 'lipid panel."}
      </Text>
      <View style={styles.checkLaterButtons}>
        <TouchableOpacity
          style={styles.checkLaterButton}
          onPress={() => { setCheckLater(false); goToStep(3); }}
        >
          <Text style={styles.checkLaterButtonText}>I found my results</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkLaterButton}
          onPress={() => { setCheckLater(true); goToStep(11); }}
        >
          <Text style={styles.checkLaterButtonText}>I'll check later</Text>
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
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Which measure do you have available?</Text>
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
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
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
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Enter your most recent {typeLabel} result</Text>
        <Text style={styles.measureUnit}>mg/dL</Text>
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
        <TouchableOpacity
          style={[styles.primaryButton, !value && styles.buttonDisabled]}
          onPress={() => goToStep(5)}
          disabled={!value}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 6: Medication
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Medication</Text>
      <Text style={styles.stepTitle}>Are you currently taking medication to lower cholesterol?</Text>
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
      <TouchableOpacity
        style={[styles.navButton, medication === null && styles.buttonDisabled]}
        onPress={() => goToStep(7)}
        disabled={medication === null}
      >
        <Text style={styles.navButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 7: Commitment
  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Commitment to Healthy Change</Text>
      <Text style={styles.stepTitle}>Do you plan to improve this area?</Text>
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
      <TouchableOpacity
        style={[styles.navButton, commitment === null && styles.buttonDisabled]}
        onPress={handleCommitmentNext}
        disabled={commitment === null}
      >
        <Text style={styles.navButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 8: Importance
  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Importance</Text>
      <Text style={styles.stepTitle}>How important is this change to you right now?</Text>
      <CustomSlider value={importance} onValueChange={setImportance} />
      <TouchableOpacity style={styles.navButton} onPress={handleImportanceNext}>
        <Text style={styles.navButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 9: Confidence
  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Confidence</Text>
      <Text style={styles.stepTitle}>How confident are you about making this change?</Text>
      <CustomSlider value={confidence} onValueChange={setConfidence} />
      <TouchableOpacity style={styles.navButton} onPress={handleConfidenceNext}>
        <Text style={styles.navButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 5: Result screen (shown right after value entry)
  const renderStep8 = () => {
    const numericValue = value ? Number(value) : null;
    const rangeInfo = getRangeInfo(numericValue);
    const typeLabel = getMeasureTypeLabel(measureType);

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.resultTitle}>
          {`Your ${typeLabel} is ${value} mg/dL, that's in the `}
          <Text style={styles.resultRangeLabel}>{rangeInfo?.label ?? ''}</Text>
          {'.'}
        </Text>
        <View style={styles.mascotContainer}>
          <Text style={styles.mascotEmoji}>🩸</Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{rangeInfo?.tip ?? ''}</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleResultNext}>
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 10: Score summary
  const renderStep9 = () => {
    const numericValue = value ? Number(value) : null;
    const score = getNonHDLScoreLocal(numericValue);
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.summaryTitle}>Blood Lipids Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summarySubtitle}>{"Here's your blood lipids score:"}</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNumber}>{score ?? '--'}</Text>
            <Text style={styles.scorePoints}>Points</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.navButton} onPress={handleScoreSummaryNext}>
          <Text style={styles.navButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 11: Resources
  const renderStep10 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Resources</Text>
      <Text style={styles.resourcesMessage}>
        {"You're on the right path!\n\nCheck out the Stress Management video and additional links for more support!"}
      </Text>
      <View style={styles.videoCard}>
        <Text style={styles.videoEmoji}>🧘</Text>
        <Text style={styles.videoLabel}>Stress Management</Text>
      </View>
      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:  return renderWelcome();  // Welcome / intro
      case 2:  return renderStep1();    // I found my results / I'll check later
      case 3:  return renderStep2();    // Which measure?
      case 4:  return renderStep3();    // Enter value
      case 5:  return renderStep8();    // Result screen (right after value input)
      case 6:  return renderStep4();    // Medication
      case 7:  return renderStep5();    // Commitment
      case 8:  return renderStep6();    // Importance
      case 9:  return renderStep7();    // Confidence
      case 10: return renderStep9();    // Score summary
      case 11: return renderStep10();   // Resources
      default: return null;
    }
  };

  // Progress: show position relative to total logical steps
  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

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
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep} of {TOTAL_STEPS}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
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
  // Welcome screen
  welcomeSubtitle: {
    fontSize: 24,
    fontStyle: 'italic',
    color: '#212529',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 24,
  },
  welcomeMascotContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mascotImage: {
    width: 220,
    height: 220,
    marginBottom: 12,
  },
  mascotLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    letterSpacing: 1,
  },
  startButton: {
    backgroundColor: '#212529',
    borderRadius: 17,
    paddingVertical: 22,
    alignItems: 'center',
    alignSelf: 'center',
    width: '70%',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  // Check later screen
  checkLaterDescription: {
    fontSize: 24,
    fontStyle: 'italic',
    color: '#212529',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 48,
  },
  checkLaterButtons: {
    gap: 16,
  },
  checkLaterButton: {
    backgroundColor: '#212529',
    borderRadius: 17,
    paddingVertical: 22,
    alignItems: 'center',
    alignSelf: 'center',
    width: '80%',
  },
  checkLaterButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C757D',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
    lineHeight: 36,
    textAlign: 'center',
  },
  // Buttons
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  navButton: {
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
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#212529',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Measure type options
  optionsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  optionCard: {
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
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: '#007AFF',
  },
  optionSubtitle: {
    fontSize: 16,
    color: '#6C757D',
  },
  optionSubtitleSelected: {
    color: '#0056B3',
  },
  // Value input
  measureUnit: {
    fontSize: 20,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
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
    fontSize: 48,
    fontWeight: '700',
    color: '#212529',
    padding: 0,
    textAlign: 'center',
  },
  inputUnitLabel: {
    fontSize: 20,
    color: '#6C757D',
    marginLeft: 16,
    fontWeight: '500',
  },
  referenceContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  referenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  referenceIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  referenceBar: {
    width: 48,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  referenceLabel: {
    fontSize: 10,
    color: '#6C757D',
    marginBottom: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  referenceValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  // Yes/No
  yesNoContainer: {
    gap: 16,
    marginVertical: 32,
  },
  yesNoCard: {
    backgroundColor: '#E4E1E1',
    borderRadius: 17,
    paddingVertical: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  yesNoCardSelected: {
    backgroundColor: '#212529',
  },
  yesNoText: {
    fontSize: 40,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#212529',
  },
  yesNoTextSelected: {
    color: '#FFFFFF',
  },
  // Result screen
  resultTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#D74B31',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 24,
  },
  resultRangeLabel: {
    fontSize: 32,
    fontWeight: '700',
    color: '#D74B31',
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mascotEmoji: {
    fontSize: 80,
  },
  tipCard: {
    backgroundColor: 'rgba(243,243,243,0.95)',
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3.1,
    elevation: 4,
  },
  tipText: {
    fontSize: 20,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#212529',
    textAlign: 'center',
    lineHeight: 28,
  },
  // Score summary screen
  summaryTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#F0ECEC',
    borderRadius: 17,
    padding: 32,
    alignItems: 'center',
    marginBottom: 40,
  },
  summarySubtitle: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 32,
  },
  scoreBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C4C4C4',
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '700',
    color: '#212529',
  },
  scorePoints: {
    fontSize: 40,
    fontWeight: '700',
    color: '#212529',
  },
  // Resources screen
  resourcesMessage: {
    fontSize: 24,
    color: '#212529',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 32,
  },
  videoCard: {
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#212529',
    paddingVertical: 40,
    alignItems: 'center',
    marginBottom: 40,
  },
  videoEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  videoLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
});

export default BloodLipidsFlowScreen;
