import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { setCachedDiet } from '../../utils/dietCache';

type Question = {
  id: number;
  category: string;
  title: string;
  description: string;
  emoji: string;
  options: { label: string; value: number }[];
};

const questions: Question[] = [
  {
    id: 1,
    category: 'SWEETS',
    title: 'Sweets & Pastries',
    description: 'How many servings of sweets, candy bars, pastries, cookies, or cakes do you eat?',
    emoji: '🍰',
    options: [
      { label: '3+', value: 3 },
      { label: '2', value: 2 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 2,
    category: 'VEGETABLES',
    title: 'Vegetables',
    description: 'How many servings of vegetables (NOT including potatoes) do you eat per day?',
    emoji: '🥗',
    options: [
      { label: '4+', value: 4 },
      { label: '3', value: 3 },
      { label: '2', value: 2 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 3,
    category: 'FRUIT',
    title: 'Fruit',
    description: 'How many servings of fruit do you eat per day? (Not including juice)',
    emoji: '🍎',
    options: [
      { label: '4+', value: 4 },
      { label: '3', value: 3 },
      { label: '2', value: 2 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 4,
    category: 'BEANS',
    title: 'Beans',
    description: 'How many servings of beans do you eat?',
    emoji: '🫘',
    options: [
      { label: '4+', value: 4 },
      { label: '3', value: 3 },
      { label: '2', value: 2 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 5,
    category: 'FISH',
    title: 'Fish',
    description: 'How many servings of fish do you eat per week? (Not fried)',
    emoji: '🐟',
    options: [
      { label: '3+', value: 3 },
      { label: '2', value: 2 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 6,
    category: 'DAIRY',
    title: 'Butter or Cream',
    description: 'How many servings of butter, stick margarine, or cream do you eat per day?',
    emoji: '🧈',
    options: [
      { label: '3+', value: 3 },
      { label: '2', value: 2 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 7,
    category: 'WHOLE GRAINS',
    title: 'Whole Grains',
    description: 'How many servings of white bread, white rice, or other refined grains do you eat per day?',
    emoji: '🍞',
    options: [
      { label: '5+', value: 5 },
      { label: '4', value: 4 },
      { label: '3', value: 3 },
      { label: '2', value: 2 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 8,
    category: 'PROCESSED FOODS',
    title: 'Fast or Fried Food',
    description: 'How many servings of fast food or fried food do you eat per week?',
    emoji: '🍔',
    options: [
      { label: '7+', value: 7 },
      { label: '5', value: 5 },
      { label: '3', value: 3 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 9,
    category: 'MEAT',
    title: 'Red Meat',
    description: 'How many servings of red meat (beef, pork, lamb) or processed meat do you eat per week?',
    emoji: '🥩',
    options: [
      { label: '7+', value: 7 },
      { label: '5', value: 5 },
      { label: '3', value: 3 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
  {
    id: 10,
    category: 'BEVERAGES',
    title: 'Sugar Sweetened Beverages',
    description: 'How many sugar-sweetened beverages (soda, lemonade, fruit punch, sweet tea) do you drink per week?',
    emoji: '🥤',
    options: [
      { label: '7+', value: 7 },
      { label: '5', value: 5 },
      { label: '3', value: 3 },
      { label: '1', value: 1 },
      { label: '0', value: 0 },
    ],
  },
];

type Phase = 'intro' | 'questions' | 'commitment' | 'importance' | 'confidence' | 'resources' | 'results';

// Local MEPA score calculator — mirrors backend getDietScore
function calcDietScoreLocal(ans: { [key: number]: number }): { mepaScore: number; displayScore: number } {
  let mepa = 0;
  const vegsPerDay = ans[2] ?? null;
  const fruitPerDay = ans[3] ?? null;
  const redMeatPerWeek = ans[9] ?? null;
  const fishPerWeek = ans[5] ?? null;
  const butterPerWeek = ans[6] ? ans[6] * 7 : null;
  const beansPerWeek = ans[4] ?? null;
  const wholeGrainsPerDay = ans[7] ?? null;
  const sweetsPerWeek = ans[1] ?? null;
  const fastFoodPerWeek = ans[8] ?? null;
  const sugaryDrinksPerWeek = ans[10] ?? null;

  if (vegsPerDay != null && vegsPerDay >= 2) mepa++;
  if (fruitPerDay != null && fruitPerDay >= 1) mepa++;
  if (redMeatPerWeek != null && redMeatPerWeek <= 3) mepa++;
  if (fishPerWeek != null && fishPerWeek >= 1) mepa++;
  if (butterPerWeek != null && butterPerWeek <= 5) mepa++;
  if (beansPerWeek != null && beansPerWeek >= 3) mepa++;
  if (wholeGrainsPerDay != null && wholeGrainsPerDay >= 3) mepa++;
  if (sweetsPerWeek != null && sweetsPerWeek <= 4) mepa++;
  if (fastFoodPerWeek != null && fastFoodPerWeek <= 1) mepa++;
  if (sugaryDrinksPerWeek != null && sugaryDrinksPerWeek >= 7) mepa++;

  let displayScore: number;
  if (mepa >= 8) displayScore = 100;
  else if (mepa >= 6) displayScore = 80;
  else if (mepa >= 4) displayScore = 50;
  else if (mepa >= 2) displayScore = 25;
  else displayScore = 0;

  return { mepaScore: mepa, displayScore };
}

const SLIDER_WIDTH = Dimensions.get('window').width - 80;

const CustomSlider: React.FC<{ value: number; onValueChange: (v: number) => void }> = ({
  value,
  onValueChange,
}) => {
  const onChangeRef = useRef(onValueChange);
  onChangeRef.current = onValueChange;

  const posX = useRef((value / 10) * SLIDER_WIDTH);
  const animX = useRef(new Animated.Value((value / 10) * SLIDER_WIDTH)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        animX.setOffset(posX.current);
        animX.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        const clamped = Math.max(0, Math.min(SLIDER_WIDTH, posX.current + gs.dx));
        animX.setValue(gs.dx);
        onChangeRef.current(Math.round((clamped / SLIDER_WIDTH) * 10));
      },
      onPanResponderRelease: (_, gs) => {
        const clamped = Math.max(0, Math.min(SLIDER_WIDTH, posX.current + gs.dx));
        posX.current = clamped;
        animX.flattenOffset();
        animX.setValue(clamped);
        onChangeRef.current(Math.round((clamped / SLIDER_WIDTH) * 10));
      },
    })
  ).current;

  const thumbLeft = animX.interpolate({
    inputRange: [0, SLIDER_WIDTH],
    outputRange: [-14, SLIDER_WIDTH - 14],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrackWrapper}>
        <View style={styles.sliderTrackLine} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.sliderThumb, { left: thumbLeft }]}
        />
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{'0\nNot'}</Text>
        <Text style={styles.sliderLabel}>{'5\nSomewhat'}</Text>
        <Text style={styles.sliderLabel}>{'10\nVery'}</Text>
      </View>
    </View>
  );
};

const DietAssessmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const [phase, setPhase] = useState<Phase>('intro');
  const [introStep, setIntroStep] = useState<0 | 1>(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [commitment, setCommitment] = useState<boolean | null>(null);
  const [importanceVal, setImportanceVal] = useState(5);
  const [confidenceVal, setConfidenceVal] = useState(5);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleOptionSelect = (value: number) => {
    setSelectedOption(value);
  };

  const handleNext = () => {
    if (phase === 'questions') {
      if (selectedOption !== null) {
        const updatedAnswers = { ...answers, [question.id]: selectedOption };
        setAnswers(updatedAnswers);
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          const nextQuestionId = questions[currentQuestion + 1].id;
          setSelectedOption(answers[nextQuestionId] ?? null);
        } else {
          setPhase('commitment');
        }
      }
    } else if (phase === 'commitment') {
      if (commitment === null) return;
      setPhase(commitment ? 'importance' : 'resources');
    } else if (phase === 'importance') {
      setPhase('confidence');
    } else if (phase === 'confidence') {
      setPhase('resources');
    } else if (phase === 'resources') {
      setPhase('results');
    }
  };

  const handleBack = () => {
    if (phase === 'results') {
      setPhase('resources');
    } else if (phase === 'resources') {
      setPhase(commitment ? 'confidence' : 'commitment');
    } else if (phase === 'confidence') {
      setPhase('importance');
    } else if (phase === 'importance') {
      setPhase('commitment');
    } else if (phase === 'commitment') {
      setPhase('questions');
      setCurrentQuestion(questions.length - 1);
      setSelectedOption(answers[questions[questions.length - 1].id] ?? null);
    } else if (phase === 'questions') {
      if (currentQuestion > 0) {
        setCurrentQuestion(currentQuestion - 1);
        const prevQuestionId = questions[currentQuestion - 1].id;
        setSelectedOption(answers[prevQuestionId] ?? null);
      } else {
        setPhase('intro');
        setIntroStep(1);
      }
    } else {
      // intro phase
      if (introStep === 1) {
        setIntroStep(0);
      } else {
        navigation.goBack();
      }
    }
  };

  const handleDone = async () => {
    const { displayScore, mepaScore } = calcDietScoreLocal(answers);

    try {
      await fetch('http://localhost:3000/api/diet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          sweetsPerWeek: answers[1] ?? null,
          vegetablesPerDay: answers[2] ?? null,
          fruitPerDay: answers[3] ?? null,
          beansPerWeek: answers[4] ?? null,
          fishPerWeek: answers[5] ?? null,
          butterPerWeek: answers[6] ? answers[6] * 7 : null,
          wholeGrainsPerDay: answers[7] ?? null,
          fastFoodPerWeek: answers[8] ?? null,
          redMeatPerWeek: answers[9] ?? null,
          sugaryDrinksPerWeek: answers[10] ?? null,
          commitmentToChange: commitment === true,
          importance: commitment ? importanceVal : null,
          confidence: commitment ? confidenceVal : null,
        }),
      });
    } catch (error) {
      console.error('Error saving diet assessment:', error);
    }

    await setCachedDiet({ score: displayScore, mepaScore });
    navigation.goBack();
  };

  // ── Intro screens ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>
              {introStep === 0 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.introContent} showsVerticalScrollIndicator={false}>
          {introStep === 0 ? (
            <>
              <Text style={styles.introTitle}>Let's assess your eating habits</Text>
              <Text style={styles.introSubtitle}>
                This short screener asks about the types of foods you eat. It helps calculate your diet score for cardiovascular health.
              </Text>
              <View style={styles.introImageContainer}>
                <Text style={styles.introEmoji}>🥗</Text>
              </View>
              <TouchableOpacity style={styles.introStartButton} onPress={() => setIntroStep(1)}>
                <Text style={styles.introButtonText}>Start</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.introTitle}>Tip</Text>
              <Text style={styles.introSubtitle}>
                The following questions ask about your eating habits. Please answer based on either a typical day or a typical week.
              </Text>
              <View style={styles.introImageContainer}>
                <Text style={styles.introEmoji}>🥗</Text>
              </View>
              <TouchableOpacity
                style={styles.introNextButton}
                onPress={() => {
                  setPhase('questions');
                  setCurrentQuestion(0);
                  setSelectedOption(null);
                }}
              >
                <Text style={styles.introButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Commitment screen ──────────────────────────────────────────────────────
  if (phase === 'commitment') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.phaseContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.phaseTitle}>Commitment to Healthy Change</Text>
          <Text style={styles.phaseSubtitle}>
            Based on your diet assessment, are you committed to making healthy changes to your eating habits?
          </Text>
          <View style={styles.commitmentButtons}>
            <TouchableOpacity
              style={[styles.commitmentButton, commitment === true && styles.commitmentButtonSelected]}
              onPress={() => setCommitment(true)}
            >
              <Text style={[styles.commitmentButtonText, commitment === true && styles.commitmentButtonTextSelected]}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.commitmentButton, commitment === false && styles.commitmentButtonSelected]}
              onPress={() => setCommitment(false)}
            >
              <Text style={[styles.commitmentButtonText, commitment === false && styles.commitmentButtonTextSelected]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.blueButton, commitment === null && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={commitment === null}
          >
            <Text style={styles.blueButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Importance slider ──────────────────────────────────────────────────────
  if (phase === 'importance') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.phaseContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.phaseTitle}>Importance</Text>
          <Text style={styles.phaseSubtitle}>
            How important is improving your diet to you?
          </Text>
          <Text style={styles.sliderValue}>{importanceVal}</Text>
          <CustomSlider value={importanceVal} onValueChange={setImportanceVal} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.blueButton} onPress={handleNext}>
            <Text style={styles.blueButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Confidence slider ──────────────────────────────────────────────────────
  if (phase === 'confidence') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.phaseContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.phaseTitle}>Confidence</Text>
          <Text style={styles.phaseSubtitle}>
            How confident are you that you can improve your diet?
          </Text>
          <Text style={styles.sliderValue}>{confidenceVal}</Text>
          <CustomSlider value={confidenceVal} onValueChange={setConfidenceVal} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.blueButton} onPress={handleNext}>
            <Text style={styles.blueButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Resources screen ───────────────────────────────────────────────────────
  if (phase === 'resources') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.phaseContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.phaseTitle}>Resources</Text>
          <Text style={styles.phaseSubtitle}>
            You're on the right path! Here are some heart-healthy eating tips to help you along the way.
          </Text>
          <View style={styles.introImageContainer}>
            <Text style={styles.introEmoji}>🥦</Text>
          </View>
          <Text style={styles.resourcesBody}>
            Focus on eating more fruits, vegetables, whole grains, and legumes. Limit red meat, sweets, and sugary drinks to support your cardiovascular health.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.blueButton} onPress={handleNext}>
            <Text style={styles.blueButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  if (phase === 'results') {
    const { displayScore } = calcDietScoreLocal(answers);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Great Job!</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Based on your responses</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreEmoji}>🎉</Text>
              <Text style={styles.scoreNumber}>{displayScore}</Text>
              <Text style={styles.scoreMax}>out of 100</Text>
            </View>
          </View>

          <Text style={styles.resultsDescription}>
            Your diet score reflects your eating patterns. A higher score indicates better alignment with heart-healthy eating recommendations.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Questions screen ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.category}>{question.category}</Text>
        <Text style={styles.title}>{question.title}</Text>

        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{question.emoji}</Text>
        </View>

        <Text style={styles.description}>{question.description}</Text>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedOption === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => handleOptionSelect(option.value)}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.radioButton,
                    selectedOption === option.value && styles.radioButtonSelected,
                  ]}
                >
                  {selectedOption === option.value && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    selectedOption === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            selectedOption === null && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={selectedOption === null}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 24,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
    marginBottom: 24,
  },
  emojiContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  emoji: {
    fontSize: 120,
  },
  description: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8E8E93',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  optionTextSelected: {
    color: '#007AFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  nextButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  blueButton: {
    backgroundColor: '#224694',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  blueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
  scoreLabel: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 16,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: '700',
    color: '#000',
  },
  scoreMax: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 8,
  },
  resultsDescription: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Intro screens
  introContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
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
  introEmoji: {
    fontSize: 120,
  },
  introStartButton: {
    backgroundColor: '#000000',
    borderRadius: 17,
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  introNextButton: {
    backgroundColor: '#2084a4',
    borderRadius: 17,
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  introButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Commitment / slider / resources phases
  phaseContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
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
  commitmentButtons: {
    width: '100%',
    gap: 16,
  },
  commitmentButton: {
    backgroundColor: '#E5E5EA',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },
  commitmentButtonSelected: {
    backgroundColor: '#000',
  },
  commitmentButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
  },
  commitmentButtonTextSelected: {
    color: '#FFFFFF',
  },
  // Slider
  sliderContainer: {
    width: SLIDER_WIDTH,
    marginVertical: 16,
  },
  sliderTrackWrapper: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrackLine: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    top: 6,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  sliderValue: {
    fontSize: 64,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Resources
  resourcesBody: {
    fontSize: 16,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
});

export default DietAssessmentScreen;
