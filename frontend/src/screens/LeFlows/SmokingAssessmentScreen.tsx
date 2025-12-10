import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

type Question = {
  id: number;
  title: string;
  description?: string;
  emoji: string;
  type: 'yesno' | 'frequency' | 'timeline' | 'interest';
  options: { label: string; value: string | number }[];
};

const questions: Question[] = [
  {
    id: 1,
    title: "Let's assess your smoking habits",
    description: 'This quiz shows how to use AHA calculator tool about life cardiovascular disease',
    emoji: '🚭',
    type: 'yesno',
    options: [
      { label: 'Start', value: 'start' },
    ],
  },
  {
    id: 2,
    title: 'Do you currently smoke or use tobacco products?',
    description: '(Cigarette, e-cigs, or vaping)',
    emoji: '🚬',
    type: 'yesno',
    options: [
      { label: 'Yes, Im currently similar or vape', value: 'yes' },
      { label: 'No, Ive never smoked', value: 'never' },
      { label: 'I used to, but I quit', value: 'quit' },
    ],
  },
  {
    id: 3,
    title: 'Current Smokers',
    description: 'How often do you smoke or use tobacco?',
    emoji: '🚬',
    type: 'frequency',
    options: [
      { label: 'Everyday', value: 'everyday' },
      { label: 'Some Days', value: 'somedays' },
      { label: 'Rarely', value: 'rarely' },
    ],
  },
  {
    id: 4,
    title: 'Are you interested in cutting down or quitting?',
    emoji: '🚭',
    type: 'interest',
    options: [
      { label: 'Yes, in the next 30 days', value: '30days' },
      { label: 'Yes, maybe in the right near time', value: 'sometime' },
      { label: 'No, not at this time', value: 'no' },
    ],
  },
  {
    id: 5,
    title: 'Every step toward cutting back helps.',
    description: 'Even reducing use lowers heart and stroke risk. We can help you find resources when youre ready.',
    emoji: '💪',
    type: 'yesno',
    options: [
      { label: 'Great, I want to try it.', value: 'yes' },
      { label: 'Save Score', value: 'save' },
    ],
  },
  {
    id: 6,
    title: 'Former Smokers - How long has it been since you quit smoking',
    emoji: '📅',
    type: 'timeline',
    options: [
      { label: 'Less than 1 year ago', value: '<1' },
      { label: 'More than 1 year ago', value: '1+' },
      { label: 'More than 5 years ago', value: '5+' },
    ],
  },
];

type ScoreResult = {
  score: number;
  category: 'current' | 'former' | 'never';
  message: string;
  description: string;
};

const SmokingAssessmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string | number }>({});
  const [selectedOption, setSelectedOption] = useState<string | number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [userPath, setUserPath] = useState<'current' | 'former' | 'never' | null>(null);
  const [questionHistory, setQuestionHistory] = useState<number[]>([0]);

  const question = questions[currentQuestion];

  const handleOptionSelect = (value: string | number) => {
    setSelectedOption(value);
  };

  const handleNext = () => {
    if (selectedOption !== null) {
      setAnswers({ ...answers, [question.id]: selectedOption });

      if (question.id === 2) {
        if (selectedOption === 'yes') {
          setUserPath('current');
          setQuestionHistory([...questionHistory, 2]);
          setCurrentQuestion(2);
        } else if (selectedOption === 'quit') {
          setUserPath('former');
          setQuestionHistory([...questionHistory, 5]);
          setCurrentQuestion(5);
        } else if (selectedOption === 'never') {
          setUserPath('never');
          setShowResults(true);
        }
      } else if (question.id === 3) {
        setQuestionHistory([...questionHistory, 3]);
        setCurrentQuestion(3);
      } else if (question.id === 4 || question.id === 5) {
        setShowResults(true);
      } else if (question.id === 6) {
        setShowResults(true);
      } else {
        const nextIndex = currentQuestion + 1;
        setQuestionHistory([...questionHistory, nextIndex]);
        setCurrentQuestion(nextIndex);
      }

      setSelectedOption(null);
    }
  };

  const handleStart = () => {
    setQuestionHistory([...questionHistory, 1]);
    setCurrentQuestion(1);
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
      setSelectedOption(answers[question.id] ?? null);
    } else if (questionHistory.length > 1) {
      const newHistory = [...questionHistory];
      newHistory.pop();
      const prevIndex = newHistory[newHistory.length - 1];
      setQuestionHistory(newHistory);
      setCurrentQuestion(prevIndex);
      const prevQuestion = questions[prevIndex];
      setSelectedOption(answers[prevQuestion.id] ?? null);
    } else {
      navigation.goBack();
    }
  };

  const calculateScore = (): ScoreResult => {
    if (userPath === 'never') {
      return {
        score: 100,
        category: 'never',
        message: "You're on the right track!",
        description: 'Staying smoke-free for a lifetime brings major health benefits.',
      };
    }

    if (userPath === 'former') {
      const timeQuit = answers[6];
      if (timeQuit === '5+') {
        return {
          score: 100,
          category: 'former',
          message: 'Excellent!',
          description: 'Quitting smoking 5+ years ago has significantly reduced your cardiovascular risk.',
        };
      } else if (timeQuit === '1+') {
        return {
          score: 75,
          category: 'former',
          message: "You're on the right track!",
          description: 'Staying smoke-free for a lifetime brings major health benefits.',
        };
      } else {
        return {
          score: 50,
          category: 'former',
          message: 'Great start!',
          description: 'Keep going! Each smoke-free day reduces your risk.',
        };
      }
    }

    const frequency = answers[3];
    if (frequency === 'rarely') {
      return {
        score: 25,
        category: 'current',
        message: 'Every reduction helps',
        description: 'Cutting back is a good step. Quitting completely will bring the most benefit.',
      };
    } else if (frequency === 'somedays') {
      return {
        score: 0,
        category: 'current',
        message: 'Take the next step',
        description: 'Smoking even some days increases your risk. Resources are available to help you quit.',
      };
    } else {
      return {
        score: 0,
        category: 'current',
        message: 'Take the first step',
        description: 'Quitting smoking is one of the best things you can do for your heart and lungs.',
      };
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (showResults) {
    const result = calculateScore();
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.resultsCategory}>
            {result.category === 'never' ? 'Never Smokers' : 
             result.category === 'former' ? 'Former Smokers' : 
             'Current Smokers'}
          </Text>

          <Text style={styles.resultsTitle}>{result.message}</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Based on your responses you scored</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreEmoji}>
                {result.category === 'never' || result.score === 100 ? '🎉' : 
                 result.score >= 50 ? '👍' : '💪'}
              </Text>
              <Text style={styles.scoreNumber}>{result.score}</Text>
            </View>
          </View>

          <Text style={styles.resultsDescription}>{result.description}</Text>

          {result.category === 'never' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Not only! Not smoking is one of the best ways to protect your heart and lungs.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleDone}>
            <Text style={styles.saveButtonText}>Save Score</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentQuestion === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.category}>mHealthy Hearts</Text>
          <Text style={styles.title}>{question.title}</Text>

          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{question.emoji}</Text>
          </View>

          <Text style={styles.description}>{question.description}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleStart}>
            <Text style={styles.nextButtonText}>Start</Text>
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
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.category}>mHealthy Hearts</Text>
        <Text style={styles.title}>{question.title}</Text>

        {question.description && (
          <Text style={styles.subtitle}>{question.description}</Text>
        )}

        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{question.emoji}</Text>
        </View>

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
              <Text
                style={[
                  styles.optionText,
                  selectedOption === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
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
          <Text style={styles.nextButtonText}>Next</Text>
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
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 24,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 12,
  },
  emojiContainer: {
    alignItems: 'center',
    marginVertical: 32,
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
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#0051D5',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionTextSelected: {
    color: '#FFFFFF',
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
  resultsCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 24,
    letterSpacing: 0.5,
  },
  resultsTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
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
    marginBottom: 16,
    textAlign: 'center',
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
  resultsDescription: {
    fontSize: 17,
    color: '#3C3C43',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  infoText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SmokingAssessmentScreen;