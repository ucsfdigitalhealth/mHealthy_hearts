import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

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
    category: 'WHOLE GRAINS',
    title: 'Life Essential 8',
    description: 'How many servings of whole-grain foods do you eat per day? Examples include whole-grain bread, brown rice, oatmeal, quinoa',
    emoji: '🌾',
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
    category: 'NUTS',
    title: 'Nuts',
    description: 'How many servings of nuts, seeds, or legumes do you eat per week?',
    emoji: '🥜',
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

const DietAssessmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleOptionSelect = (value: number) => {
    setSelectedOption(value);
  };

  const handleNext = () => {
    if (selectedOption !== null) {
      setAnswers({ ...answers, [question.id]: selectedOption });
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        // Set selected option if user already answered this question
        const nextQuestionId = questions[currentQuestion + 1].id;
        setSelectedOption(answers[nextQuestionId] ?? null);
      } else {
        setShowResults(true);
      }
    }
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
      setSelectedOption(answers[question.id] ?? null);
    } else if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      const prevQuestionId = questions[currentQuestion - 1].id;
      setSelectedOption(answers[prevQuestionId] ?? null);
    } else {
      navigation.goBack();
    }
  };

  const calculateScore = () => {
    const maxScore = 100;
    let score = 0;
    
    for (let i = 1; i <= 5; i++) {
      if (answers[i]) {
        score += answers[i] * 3;
      }
    }
    
    for (let i = 6; i <= 10; i++) {
      if (answers[i]) {
        score -= answers[i] * 2;
      }
    }
    
    score = Math.max(0, Math.min(maxScore, score + 30));
    return Math.round(score);
  };

  const handleDone = async () => {
    // Map question IDs to API fields based on user requirements
    // Question mapping: 
    // id 1 = whole_grains_per_day, id 2 = vegetables_per_day, id 3 = fruit_per_day,
    // id 4 = beans_per_week (nuts/legumes), id 5 = fish_per_week, id 6 = butter_per_week,
    // id 7 = sweets_per_week (currently refined grains - mapping to sweets),
    // id 8 = fast_food_per_week, id 9 = red_meat_per_week, id 10 = sugary_drinks_per_week
    
    try {
      await fetch('http://localhost:3000/api/diet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          wholeGrainsPerDay: answers[1] ?? null,
          vegetablesPerDay: answers[2] ?? null,
          fruitPerDay: answers[3] ?? null,
          beansPerWeek: answers[4] ?? null, // nuts/legumes
          fishPerWeek: answers[5] ?? null,
          butterPerWeek: answers[6] ? answers[6] * 7 : null, // Convert per day to per week
          sweetsPerWeek: answers[7] ?? null, // Note: question is about refined grains, mapping to sweets
          fastFoodPerWeek: answers[8] ?? null,
          redMeatPerWeek: answers[9] ?? null,
          sugaryDrinksPerWeek: answers[10] ?? null,
        }),
      });
    } catch (error) {
      console.error('Error saving diet assessment:', error);
    }

    navigation.goBack();
  };

  if (showResults) {
    const score = calculateScore();
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
              <Text style={styles.scoreNumber}>{score}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>
            {currentQuestion === 0 ? 'Cancel' : 'Back'}
          </Text>
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
});

export default DietAssessmentScreen