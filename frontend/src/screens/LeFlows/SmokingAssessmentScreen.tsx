import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getCachedSmoking, setCachedSmoking } from '../../utils/smokingCache';

// ─── Step constants ────────────────────────────────────────────────────────────
const STEP_WELCOME      = 0;
const STEP_STATUS       = 1;  // current / former / never
const STEP_FREQUENCY    = 2;  // current: everyday / somedays / rarely
const STEP_PRODUCT_TYPE = 3;  // current: cigarettes / vaping / both
const STEP_INTEREST     = 4;  // current: interest in quitting
const STEP_TIME_QUIT    = 5;  // former: time since quitting
const STEP_SECONDHAND   = 6;  // all: secondhand smoke exposure
const STEP_COMMITMENT   = 7;  // all: commitment to change
const STEP_IMPORTANCE   = 8;  // commitment=yes
const STEP_CONFIDENCE   = 9;  // commitment=yes
const STEP_SCORE        = 10;
const STEP_RESOURCES    = 11;

const TOTAL_STEPS = 12; // 0–11

// ─── Local score mirror (matches backend getNicotineScore) ─────────────────────
function getNicotineScoreLocal(
  category: string | null,
  frequency: string | null,
  timeQuit: string | null,
  secondHandExposure: boolean | null,
): number | null {
  if (!category) return null;

  let base: number;
  if (category === 'never') {
    base = 100;
  } else if (category === 'former') {
    if (timeQuit === '5+') base = 100;
    else if (timeQuit === '1+') base = 75;
    else base = 50;
  } else if (category === 'current') {
    base = frequency === 'rarely' ? 25 : 0;
  } else {
    return null;
  }

  const penalty = secondHandExposure === true ? 20 : 0;
  return Math.max(0, base - penalty);
}

function getScoreMessage(score: number | null, category: string | null) {
  if (score === 100 && category === 'never')
    return { title: "You're on the right track!", body: 'Staying smoke-free for a lifetime brings major heart and lung health benefits.' };
  if (score === 100)
    return { title: 'Excellent!', body: 'Quitting smoking 5+ years ago has significantly reduced your cardiovascular risk.' };
  if (score === 75)
    return { title: "You're on the right track!", body: 'Staying smoke-free for a lifetime brings major health benefits. Keep it up!' };
  if (score === 50)
    return { title: 'Great start!', body: 'Keep going! Each smoke-free day reduces your cardiovascular risk.' };
  if (score === 25)
    return { title: 'Every reduction helps', body: 'Cutting back is a good step. Quitting completely will bring the most benefit.' };
  return { title: 'Take the first step', body: 'Quitting smoking is one of the best things you can do for your heart and lungs.' };
}

// ─── Custom Slider ─────────────────────────────────────────────────────────────
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
    width: '100%',
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
const SmokingAssessmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { accessToken } = useAuth();

  const [step, setStep] = useState(STEP_WELCOME);

  // Assessment state
  const [smokingStatus, setSmokingStatus] = useState<'current' | 'former' | 'never' | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [productType, setProductType] = useState<string | null>(null);
  const [interest, setInterest] = useState<string | null>(null);
  const [timeQuit, setTimeQuit] = useState<string | null>(null);
  const [secondHand, setSecondHand] = useState<boolean | null>(null);
  const [commitment, setCommitment] = useState<boolean | null>(null);
  const [importance, setImportance] = useState<number>(5);
  const [confidence, setConfidence] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);

  // Warm the smoking cache on mount if empty
  useEffect(() => {
    const warmCache = async () => {
      const cached = await getCachedSmoking();
      if (cached === null && accessToken) {
        try {
          const resp = await fetch('http://localhost:3000/api/smoking/score', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (resp.ok) {
            const data = await resp.json();
            await setCachedSmoking({ score: data.score, category: data.category });
          }
        } catch {}
      }
    };
    warmCache();
  }, []);

  const score = getNicotineScoreLocal(smokingStatus, frequency, timeQuit, secondHand);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const handleNext = () => {
    switch (step) {
      case STEP_WELCOME:
        setStep(STEP_STATUS);
        break;
      case STEP_STATUS:
        if (smokingStatus === 'current') setStep(STEP_FREQUENCY);
        else if (smokingStatus === 'former') setStep(STEP_TIME_QUIT);
        else if (smokingStatus === 'never') setStep(STEP_SECONDHAND);
        break;
      case STEP_FREQUENCY:
        setStep(STEP_PRODUCT_TYPE);
        break;
      case STEP_PRODUCT_TYPE:
        setStep(STEP_INTEREST);
        break;
      case STEP_INTEREST:
        setStep(STEP_SECONDHAND);
        break;
      case STEP_TIME_QUIT:
        setStep(STEP_SECONDHAND);
        break;
      case STEP_SECONDHAND:
        setStep(STEP_COMMITMENT);
        break;
      case STEP_COMMITMENT:
        if (commitment) setStep(STEP_IMPORTANCE);
        else setStep(STEP_SCORE);
        break;
      case STEP_IMPORTANCE:
        setStep(STEP_CONFIDENCE);
        break;
      case STEP_CONFIDENCE:
        setStep(STEP_SCORE);
        break;
      case STEP_SCORE:
        setStep(STEP_RESOURCES);
        break;
      case STEP_RESOURCES:
        handleDone();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case STEP_WELCOME:
        navigation.goBack();
        break;
      case STEP_STATUS:
        setStep(STEP_WELCOME);
        break;
      case STEP_FREQUENCY:
        setStep(STEP_STATUS);
        break;
      case STEP_PRODUCT_TYPE:
        setStep(STEP_FREQUENCY);
        break;
      case STEP_INTEREST:
        setStep(STEP_PRODUCT_TYPE);
        break;
      case STEP_TIME_QUIT:
        setStep(STEP_STATUS);
        break;
      case STEP_SECONDHAND:
        if (smokingStatus === 'current') setStep(STEP_INTEREST);
        else if (smokingStatus === 'former') setStep(STEP_TIME_QUIT);
        else setStep(STEP_STATUS);
        break;
      case STEP_COMMITMENT:
        setStep(STEP_SECONDHAND);
        break;
      case STEP_IMPORTANCE:
        setStep(STEP_COMMITMENT);
        break;
      case STEP_CONFIDENCE:
        setStep(STEP_IMPORTANCE);
        break;
      case STEP_SCORE:
        if (commitment) setStep(STEP_CONFIDENCE);
        else setStep(STEP_COMMITMENT);
        break;
      case STEP_RESOURCES:
        setStep(STEP_SCORE);
        break;
    }
  };

  // ── Submit (save to API + cache) ───────────────────────────────────────────────
  const handleDone = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/api/smoking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          category: smokingStatus,
          frequency: smokingStatus === 'current' ? frequency : null,
          productType: smokingStatus === 'current' ? productType : null,
          timeQuit: smokingStatus === 'former' ? timeQuit : null,
          interestInQuitting: smokingStatus === 'current' ? interest : null,
          secondHandExposure: secondHand,
          commitmentToChange: commitment,
          importance: commitment ? importance : null,
          confidence: commitment ? confidence : null,
        }),
      });

      if (response.ok) {
        await setCachedSmoking({ score, category: smokingStatus });
      }
    } catch (error) {
      console.error('Error saving smoking assessment:', error);
    } finally {
      setSubmitting(false);
    }
    navigation.goBack();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const isNextDisabled = (): boolean => {
    switch (step) {
      case STEP_STATUS:      return smokingStatus === null;
      case STEP_FREQUENCY:     return frequency === null;
      case STEP_PRODUCT_TYPE:  return productType === null;
      case STEP_INTEREST:      return interest === null;
      case STEP_TIME_QUIT:   return timeQuit === null;
      case STEP_SECONDHAND:  return secondHand === null;
      case STEP_COMMITMENT:  return commitment === null;
      case STEP_RESOURCES:   return submitting;
      default:               return false;
    }
  };

  // ── Step renderers ────────────────────────────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emojiLarge}>🚭</Text>
      </View>
      <Text style={styles.stepTitle}>{"Let's assess your\nsmoking habits"}</Text>
      <Text style={styles.stepSubtitle}>
        This assessment uses AHA Life's Essential 8 criteria to score your nicotine exposure and cardiovascular risk.
      </Text>
    </View>
  );

  const renderStatus = () => {
    const options: { label: string; subtitle: string; value: 'current' | 'former' | 'never' }[] = [
      { label: 'Yes, I currently smoke or vape', subtitle: 'Cigarettes, e-cigs, or other tobacco', value: 'current' },
      { label: "No, I've never smoked", subtitle: 'Never used tobacco products', value: 'never' },
      { label: 'I used to, but I quit', subtitle: 'Former smoker', value: 'former' },
    ];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Do you currently smoke or use tobacco products?</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, smokingStatus === opt.value && styles.optionCardSelected]}
              onPress={() => setSmokingStatus(opt.value)}
            >
              <Text style={[styles.optionTitle, smokingStatus === opt.value && styles.optionTitleSelected]}>
                {opt.label}
              </Text>
              <Text style={[styles.optionSubtitle, smokingStatus === opt.value && styles.optionSubtitleSelected]}>
                {opt.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderFrequency = () => {
    const options = [
      { label: 'Every day', value: 'everyday' },
      { label: 'Some days', value: 'somedays' },
      { label: 'Rarely', value: 'rarely' },
    ];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionLabel}>Current Smokers</Text>
        <Text style={styles.stepTitle}>How often do you smoke or use tobacco?</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, frequency === opt.value && styles.optionCardSelected]}
              onPress={() => setFrequency(opt.value)}
            >
              <Text style={[styles.optionTitle, frequency === opt.value && styles.optionTitleSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderProductType = () => {
    const options = [
      { label: 'Cigarettes', value: 'cigarettes' },
      { label: 'Vaping/e-cigarettes only', value: 'vaping' },
      { label: 'Both cigarettes and vaping/e-cigarettes', value: 'both' },
    ];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionLabel}>Current Smokers</Text>
        <Text style={styles.stepTitle}>What products do you currently use?</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, productType === opt.value && styles.optionCardSelected]}
              onPress={() => setProductType(opt.value)}
            >
              <Text style={[styles.optionTitleItalic, productType === opt.value && styles.optionTitleSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderInterest = () => {
    const options = [
      { label: 'Yes, in the next 30 days', value: '30days' },
      { label: 'Yes, maybe in the near future', value: 'sometime' },
      { label: 'No, not at this time', value: 'no' },
    ];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Are you interested in cutting down or quitting?</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, interest === opt.value && styles.optionCardSelected]}
              onPress={() => setInterest(opt.value)}
            >
              <Text style={[styles.optionTitle, interest === opt.value && styles.optionTitleSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTimeQuit = () => {
    const options = [
      { label: 'Less than 1 year ago', value: '<1' },
      { label: 'More than 1 year ago', value: '1+' },
      { label: 'More than 5 years ago', value: '5+' },
    ];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionLabel}>Former Smokers</Text>
        <Text style={styles.stepTitle}>How long has it been since you quit smoking?</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, timeQuit === opt.value && styles.optionCardSelected]}
              onPress={() => setTimeQuit(opt.value)}
            >
              <Text style={[styles.optionTitle, timeQuit === opt.value && styles.optionTitleSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderSecondhand = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Secondhand Exposure</Text>
      <Text style={styles.stepTitle}>Does anyone smoke inside your home?</Text>
      <View style={styles.yesNoContainer}>
        <TouchableOpacity
          style={[styles.yesNoCard, secondHand === true && styles.yesNoCardSelected]}
          onPress={() => setSecondHand(true)}
        >
          <Text style={[styles.yesNoText, secondHand === true && styles.yesNoTextSelected]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoCard, secondHand === false && styles.yesNoCardSelected]}
          onPress={() => setSecondHand(false)}
        >
          <Text style={[styles.yesNoText, secondHand === false && styles.yesNoTextSelected]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCommitment = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Commitment to Healthy Change</Text>
      <Text style={styles.stepTitle}>Do you plan to improve this area?</Text>
      <View style={styles.yesNoContainer}>
        <TouchableOpacity
          style={[styles.yesNoCard, commitment === true && styles.yesNoCardSelected]}
          onPress={() => setCommitment(true)}
        >
          <Text style={[styles.yesNoText, commitment === true && styles.yesNoTextSelected]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoCard, commitment === false && styles.yesNoCardSelected]}
          onPress={() => setCommitment(false)}
        >
          <Text style={[styles.yesNoText, commitment === false && styles.yesNoTextSelected]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderImportance = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Importance</Text>
      <Text style={styles.stepTitle}>How important is this change to you right now?</Text>
      <CustomSlider value={importance} onValueChange={setImportance} />
    </View>
  );

  const renderConfidence = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Confidence</Text>
      <Text style={styles.stepTitle}>How confident are you about making this change?</Text>
      <CustomSlider value={confidence} onValueChange={setConfidence} />
    </View>
  );

  const renderScore = () => {
    const msg = getScoreMessage(score, smokingStatus);
    const categoryLabel =
      smokingStatus === 'never' ? 'Never Smoker' :
      smokingStatus === 'former' ? 'Former Smoker' :
      'Current Smoker';

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.sectionLabel}>{categoryLabel}</Text>
        <Text style={styles.resultTitle}>{msg.title}</Text>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your nicotine score</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNumber}>{score ?? '--'}</Text>
            <Text style={styles.scorePoints}>Points</Text>
          </View>
        </View>
        <Text style={styles.resultBody}>{msg.body}</Text>
      </View>
    );
  };

  const renderResources = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionLabel}>Resources</Text>
      <Text style={styles.resourcesMessage}>
        {"You're on the right path!\n\nCheck out the Stress Management video and additional links for more support!"}
      </Text>
      <View style={styles.videoCard}>
        <Text style={styles.videoEmoji}>🧘</Text>
        <Text style={styles.videoLabel}>Stress Management</Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case STEP_WELCOME:      return renderWelcome();
      case STEP_STATUS:       return renderStatus();
      case STEP_FREQUENCY:    return renderFrequency();
      case STEP_PRODUCT_TYPE: return renderProductType();
      case STEP_INTEREST:     return renderInterest();
      case STEP_TIME_QUIT:    return renderTimeQuit();
      case STEP_SECONDHAND: return renderSecondhand();
      case STEP_COMMITMENT: return renderCommitment();
      case STEP_IMPORTANCE: return renderImportance();
      case STEP_CONFIDENCE: return renderConfidence();
      case STEP_SCORE:      return renderScore();
      case STEP_RESOURCES:  return renderResources();
      default:              return null;
    }
  };

  const progressPercent = (step / (TOTAL_STEPS - 1)) * 100;
  const nextLabel = step === STEP_RESOURCES ? 'Done' : step === STEP_WELCOME ? 'Start' : 'Next';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>{step === STEP_WELCOME ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
          </View>
          <Text style={styles.progressText}>Step {step + 1} of {TOTAL_STEPS}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      {/* Footer with Next button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, isNextDisabled() && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isNextDisabled()}
        >
          <Text style={styles.navButtonText}>{nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
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
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#224694',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  stepContainer: {
    flex: 1,
  },

  // Section label (e.g. "Secondhand Exposure", "Commitment to Healthy Change")
  sectionLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Main question title
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 34,
  },

  stepSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  // Welcome emoji
  emojiContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  emojiLarge: {
    fontSize: 90,
  },

  // Multi-option selector cards
  optionsContainer: {
    gap: 12,
    marginBottom: 8,
  },
  optionCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#212529',
    borderColor: '#212529',
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#212529',
  },
  optionTitleItalic: {
    fontSize: 17,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#212529',
    textAlign: 'center',
  },
  optionTitleSelected: {
    color: '#FFFFFF',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  optionSubtitleSelected: {
    color: '#ADB5BD',
  },

  // Yes/No binary buttons (Figma-matched)
  yesNoContainer: {
    gap: 14,
    marginBottom: 8,
  },
  yesNoCard: {
    height: 100,
    borderRadius: 17,
    backgroundColor: '#E4E1E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  yesNoCardSelected: {
    backgroundColor: '#212529',
  },
  yesNoText: {
    fontSize: 36,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#212529',
  },
  yesNoTextSelected: {
    color: '#FFFFFF',
  },

  // Navigation button (blue, matches Figma)
  navButton: {
    backgroundColor: '#224694',
    borderRadius: 17,
    paddingVertical: 20,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    backgroundColor: '#C5C5C5',
  },

  // Score screen
  resultTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 12,
    textAlign: 'center',
  },
  scoreBox: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: '700',
    color: '#212529',
  },
  scorePoints: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  resultBody: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Resources screen
  resourcesMessage: {
    fontSize: 20,
    color: '#212529',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 28,
  },
  videoCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#212529',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginBottom: 32,
  },
  videoEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  videoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
});

export default SmokingAssessmentScreen;
