// BloodSugarFlowScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BloodSugarFlowScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fastingGlucose, setFastingGlucose] = useState<string>('100');
  const [hba1cValue, setHba1cValue] = useState<string>('5.7');

  // Steps from the image
  const steps = [
    {
      id: 1,
      title: "Do you know your most recent blood sugar result?",
      type: 'choice',
      choices: ['Yes', 'No']
    },
    {
      id: 2,
      title: "Which type of blood sugar test do you have?",
      type: 'test-type',
      options: [
        {
          title: "Fasting Blood Glucose",
          subtitle: "Usually taken after 8+ hours of fasting"
        },
        {
          title: "HbA1c",
          subtitle: "Average blood sugar over 2-3 months"
        }
      ]
    },
    {
      id: 3,
      title: "Please enter your most recent fasting blood glucose result:",
      type: 'input',
      unit: "mg/dL",
      value: fastingGlucose,
      onChange: setFastingGlucose,
      placeholder: "100"
    },
    {
      id: 4,
      title: "Have you ever been told by a healthcare professional that you have diabetes?",
      type: 'choice',
      choices: ['Yes', 'No']
    },
    {
      id: 5,
      title: "Blood Sugar Summary",
      subtitle: "Here's your Blood Sugar score:",
      type: 'summary',
      score: 60
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
    }
  };

  const renderStep = (step: typeof steps[0]) => {
    switch (step.type) {
      case 'choice':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <View style={styles.buttonGroup}>
              {step.choices?.map((choice, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.largeButton,
                    index === 0 ? styles.primaryButton : styles.secondaryButton
                  ]}
                  onPress={handleNext}
                >
                  <Text style={styles.largeButtonText}>{choice}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'test-type':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <View style={styles.choiceGroup}>
              {step.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.choiceButton,
                    index === 0 && styles.choiceButtonSelected
                  ]}
                  onPress={handleNext}
                >
                  <View style={styles.choiceContent}>
                    <View style={[
                      styles.radio,
                      index === 0 && styles.radioSelected
                    ]}>
                      {index === 0 && <View style={styles.radioInner} />}
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
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'input':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={step.value}
                onChangeText={step.onChange}
                placeholder={step.placeholder}
                keyboardType="numeric"
              />
              <Text style={styles.inputUnit}>{step.unit}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'summary':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.summaryTitle}>{step.title}</Text>
            <Text style={styles.summarySubtitle}>{step.subtitle}</Text>
            
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{step.score}</Text>
              <Text style={styles.scoreLabel}>Points</Text>
            </View>
            
            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Test Type:</Text>
                <Text style={styles.resultValue}>Fasting Blood Glucose</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Result:</Text>
                <Text style={styles.resultValue}>100 mg/dL</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Diabetes Diagnosis:</Text>
                <Text style={styles.resultValue}>No</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleNext}
            >
              <Text style={styles.submitButtonText}>Done</Text>
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
      {/* Header with Back Button and Progress */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepIndicator}>
              <View 
                style={[
                  styles.stepCircle,
                  currentStep >= step.id && styles.stepCircleActive
                ]}
              >
                <Text style={[
                  styles.stepNumber,
                  currentStep >= step.id && styles.stepNumberActive
                ]}>
                  {step.id}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[
                  styles.stepLine,
                  currentStep > step.id && styles.stepLineActive
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 14,
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
    marginHorizontal: 4,
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
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#DEE2E6',
  },
  largeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
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
  summaryTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 20,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 28,
  },
  scoreCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 8,
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
});

export default BloodSugarFlowScreen;