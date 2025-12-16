// SymptomAssessmentScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SymptomAssessmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepCountConfirmed, setStepCountConfirmed] = useState<boolean | null>(null);
  const [symptomRating, setSymptomRating] = useState<number>(3); // Default to middle rating
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<number, any>>({
    1: null, // Step confirmation
    2: 3, // Symptom rating
    3: null, // Goal selection
  });

  const steps = [
    {
      id: 1,
      title: "Symptom Assessment Survey",
      type: 'intro',
    },
    {
      id: 2,
      title: "Steps",
      type: 'step-confirmation',
      stepCount: 7706,
      manualSteps: 0,
      date: "02/14/2020",
      question: "Did you take 7706 Fitbit steps (0 manual steps) on 02/14/2020?"
    },
    {
      id: 3,
      title: "Symptom Burden",
      type: 'symptom-rating',
      question: "To what extent are you able to carry out your everyday physical activities such as walking, climbing stairs, carrying groceries, or moving a chair?",
      ratingLabels: ["1", "2", "3", "4"],
      ratingDescriptions: ["Poor", "Fair", "Good", "Excellent"]
    },
    {
      id: 4,
      title: "Goal",
      type: 'goal-selection',
      question: "What's your goal for today?",
      options: [
        { steps: 7706, label: "7706 steps" },
        { steps: 8476, label: "8476 steps" },
        { steps: 9247, label: "9247 steps" }
      ]
    },
    {
      id: 5,
      title: "Ready to Go",
      type: 'completion',
      message: "Based on your responses, we'll help you track your progress today."
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleStepConfirmation = (confirmed: boolean) => {
    setStepCountConfirmed(confirmed);
    setSelections(prev => ({ ...prev, 1: confirmed }));
    handleNext();
  };

  const handleSymptomRating = (rating: number) => {
    setSymptomRating(rating);
    setSelections(prev => ({ ...prev, 2: rating }));
  };

  const handleGoalSelection = (goal: string) => {
    setSelectedGoal(goal);
    setSelections(prev => ({ ...prev, 3: goal }));
  };

  const handleGetStarted = () => {
    // Log all selections for API calls
    console.log('Symptom Assessment Selections:', selections);
    console.log('Selected Goal:', selectedGoal);
    console.log('Symptom Rating:', symptomRating);
    
    // Navigate to main screen or dashboard
    navigation.goBack();
  };

  const renderStep = (step: typeof steps[0]) => {
    switch (step.type) {
      case 'intro':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.introTitle}>{step.title}</Text>
            <Text style={styles.introText}>
              Please confirm your step count from the previous day. If your step count is incorrect, 
              please try syncing your Fitbit with the Fitbit app.
            </Text>
            <Text style={styles.introText}>
              You will also rate how you are feeling today. We want you to consider how you feel overall.
            </Text>
            <Text style={styles.introText}>
              Based on these two pieces of information, you will be given different recommendations 
              for today's step goal to choose from.
            </Text>
            <Text style={styles.noteText}>
              Please note: If you do not complete this survey, we will "assign" you a goal.
            </Text>
            
            <TouchableOpacity 
              style={styles.getStartedButton}
              onPress={handleNext}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );

      case 'step-confirmation':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{step.title}</Text>
            </View>
            
            <Text style={styles.questionText}>{step.question}</Text>
            
            <View style={styles.stepDetails}>
              <View style={styles.stepDetailRow}>
                <Text style={styles.stepDetailLabel}>Fitbit Steps:</Text>
                <Text style={styles.stepDetailValue}>{step.stepCount}</Text>
              </View>
              <View style={styles.stepDetailRow}>
                <Text style={styles.stepDetailLabel}>Manual Steps:</Text>
                <Text style={styles.stepDetailValue}>{step.manualSteps}</Text>
              </View>
              <View style={styles.stepDetailRow}>
                <Text style={styles.stepDetailLabel}>Date:</Text>
                <Text style={styles.stepDetailValue}>{step.date}</Text>
              </View>
            </View>
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={[styles.confirmationButton, stepCountConfirmed === true && styles.confirmationButtonSelected]}
                onPress={() => handleStepConfirmation(true)}
              >
                <Text style={[
                  styles.confirmationButtonText,
                  stepCountConfirmed === true && styles.confirmationButtonTextSelected
                ]}>
                  Yes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmationButton, stepCountConfirmed === false && styles.confirmationButtonSelected]}
                onPress={() => handleStepConfirmation(false)}
              >
                <Text style={[
                  styles.confirmationButtonText,
                  stepCountConfirmed === false && styles.confirmationButtonTextSelected
                ]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.syncHint}>
              If your step count is incorrect, please try syncing your Fitbit with the Fitbit app.
            </Text>
          </View>
        );

      case 'symptom-rating':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{step.title}</Text>
            </View>
            
            <Text style={styles.questionText}>{step.question}</Text>
            
            {/* Rating Scale */}
            <View style={styles.ratingContainer}>
              <View style={styles.ratingScale}>
                {step.ratingLabels.map((label, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.ratingPoint,
                      symptomRating === index + 1 && styles.ratingPointSelected
                    ]}
                    onPress={() => handleSymptomRating(index + 1)}
                  >
                    <Text style={[
                      styles.ratingNumber,
                      symptomRating === index + 1 && styles.ratingNumberSelected
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.ratingLabels}>
                {step.ratingDescriptions.map((desc, index) => (
                  <Text key={index} style={styles.ratingDescription}>
                    {desc}
                  </Text>
                ))}
              </View>
            </View>
            
            {/* Current Selection Display */}
            <View style={styles.currentRatingDisplay}>
              <Text style={styles.currentRatingText}>
                {symptomRating} of {step.ratingLabels.length}
              </Text>
              <Text style={styles.currentRatingDescription}>
                {step.ratingDescriptions[symptomRating - 1]}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'goal-selection':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{step.title}</Text>
            </View>
            
            <Text style={styles.questionText}>{step.question}</Text>
            
            <View style={styles.goalOptions}>
              {step.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.goalOption,
                    selectedGoal === option.label && styles.goalOptionSelected
                  ]}
                  onPress={() => handleGoalSelection(option.label)}
                >
                  <View style={styles.goalOptionContent}>
                    <View style={[
                      styles.radioCircle,
                      selectedGoal === option.label && styles.radioCircleSelected
                    ]}>
                      {selectedGoal === option.label && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[
                      styles.goalOptionText,
                      selectedGoal === option.label && styles.goalOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'completion':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.completionIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#34C759" />
            </View>
            
            <Text style={styles.completionTitle}>Ready to Go!</Text>
            <Text style={styles.completionMessage}>{step.message}</Text>
            
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Your Selections:</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Step Confirmation:</Text>
                <Text style={styles.summaryValue}>
                  {selections[1] === true ? 'Confirmed' : selections[1] === false ? 'Not Confirmed' : 'Not Answered'}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Symptom Rating:</Text>
                <Text style={styles.summaryValue}>
                  {selections[2]}/4 - {["Poor", "Fair", "Good", "Excellent"][selections[2] - 1]}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Selected Goal:</Text>
                <Text style={styles.summaryValue}>
                  {selections[3] || 'Not Selected'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.completeButtonText}>Complete Assessment</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps.find(step => step.id === currentStep);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Step {Math.min(currentStep, steps.length)} of {steps.length}
          </Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {currentStepData && renderStep(currentStepData)}
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
    minHeight: 500,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 20,
    lineHeight: 36,
  },
  introText: {
    fontSize: 16,
    color: '#6C757D',
    lineHeight: 24,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 14,
    color: '#DC2626',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 32,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  getStartedButton: {
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
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  questionText: {
    fontSize: 18,
    color: '#4B5563',
    lineHeight: 28,
    marginBottom: 32,
    fontWeight: '600',
  },
  stepDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepDetailLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  stepDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  confirmationButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  confirmationButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  confirmationButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmationButtonTextSelected: {
    color: '#FFFFFF',
  },
  syncHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  ratingContainer: {
    marginBottom: 40,
  },
  ratingScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingPoint: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  ratingPointSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  ratingNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B7280',
  },
  ratingNumberSelected: {
    color: '#FFFFFF',
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  ratingDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  currentRatingDisplay: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  currentRatingText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  currentRatingDescription: {
    fontSize: 18,
    color: '#1E40AF',
    fontWeight: '600',
  },
  goalOptions: {
    gap: 16,
    marginBottom: 40,
  },
  goalOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  goalOptionSelected: {
    backgroundColor: '#F0F7FF',
    borderColor: '#007AFF',
  },
  goalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  goalOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  goalOptionTextSelected: {
    color: '#007AFF',
  },
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
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  completionIconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 16,
  },
  completionMessage: {
    fontSize: 18,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  summaryContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  completeButton: {
    backgroundColor: '#34C759',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SymptomAssessmentScreen;