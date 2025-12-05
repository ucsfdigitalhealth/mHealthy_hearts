// BloodLipidsFlowScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BloodLipidsFlowScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [measureType, setMeasureType] = useState<string>('total-cholesterol');
  const [totalCholesterol, setTotalCholesterol] = useState<string>('130');
  const [nonHDLCholesterol, setNonHDLCholesterol] = useState<string>('120');

  // Steps from the image
  const steps = [
    {
      id: 1,
      title: "Let's assess your blood lipids",
      type: 'intro',
      image: '🩺',
      subtitle: "LOOP LIPIDS"
    },
    {
      id: 2,
      title: "Which measure do you have available?",
      type: 'measure-type',
      options: [
        {
          id: 'total-cholesterol',
          title: "Total cholesterol",
          subtitle: "mg/dL"
        },
        {
          id: 'non-hdl-cholesterol',
          title: "Non-HDL cholesterol",
          subtitle: "mg/dL"
        },
        {
          id: 'no-results',
          title: "I don't have recent results",
          subtitle: null
        }
      ]
    },
    {
      id: 3,
      title: "Enter your most recent total cholesterol result",
      type: 'input',
      subtitle: "mg/dL",
      value: totalCholesterol,
      onChange: setTotalCholesterol,
      placeholder: "130"
    },
    {
      id: 4,
      title: "Thank you for sharing!",
      type: 'thank-you',
      subtitle: "This can lower your risk for heart disease by eating more fiber-rich foods, choosing healthy fats, and trying stress reduction techniques.",
      image: '📊'
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

  const handleMeasureSelect = (measureId: string) => {
    setMeasureType(measureId);
    
    // If user selects "no results", skip to step 4 (thank you)
    if (measureId === 'no-results') {
      setCurrentStep(4);
    } else {
      handleNext();
    }
  };

  const renderStep = (step: typeof steps[0]) => {
    switch (step.type) {
      case 'intro':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.introIconContainer}>
              <Text style={styles.introIcon}>{step.image}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Start Assessment</Text>
            </TouchableOpacity>
          </View>
        );

      case 'measure-type':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            
            <View style={styles.measureOptionsContainer}>
              {step.options?.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.measureOption,
                    measureType === option.id && styles.measureOptionSelected
                  ]}
                  onPress={() => handleMeasureSelect(option.id)}
                >
                  <View style={styles.measureOptionContent}>
                    <View style={styles.measureOptionTextContainer}>
                      <Text style={[
                        styles.measureOptionTitle,
                        measureType === option.id && styles.measureOptionTitleSelected
                      ]}>
                        {option.title}
                      </Text>
                      {option.subtitle && (
                        <Text style={styles.measureOptionSubtitle}>{option.subtitle}</Text>
                      )}
                    </View>
                    
                    {measureType === option.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            {measureType !== 'no-results' && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'input':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.measureUnit}>{step.subtitle}</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={step.value}
                onChangeText={step.onChange}
                placeholder={step.placeholder}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputUnitLabel}>{step.subtitle}</Text>
            </View>
            
            <View style={styles.referenceContainer}>
              <View style={styles.referenceRow}>
                <View style={styles.referenceIndicator}>
                  <View style={[styles.referenceBar, styles.referenceBarGood]} />
                  <Text style={styles.referenceLabel}>Good</Text>
                  <Text style={styles.referenceValue}>{'< 200'}</Text>
                </View>
                
                <View style={styles.referenceIndicator}>
                  <View style={[styles.referenceBar, styles.referenceBorderline]} />
                  <Text style={styles.referenceLabel}>Borderline</Text>
                  <Text style={styles.referenceValue}>200-239</Text>
                </View>
                
                <View style={styles.referenceIndicator}>
                  <View style={[styles.referenceBar, styles.referenceHigh]} />
                  <Text style={styles.referenceLabel}>High</Text>
                  <Text style={styles.referenceValue}>{'≥ 240'}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        );

      case 'thank-you':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.thankYouIconContainer}>
              <Text style={styles.thankYouIcon}>{step.image}</Text>
            </View>
            
            <Text style={styles.thankYouTitle}>{step.title}</Text>
            <Text style={styles.thankYouMessage}>{step.subtitle}</Text>
            
            <View style={styles.healthTipContainer}>
              <Text style={styles.healthTipTitle}>Improving your blood lipids</Text>
              <Text style={styles.healthTipText}>
                This can lower your risk for heart disease by eating more fiber-rich foods, choosing healthy fats, and trying stress reduction techniques.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => {
                // Navigate back or to main screen
                // navigation.goBack();
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
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
          <Text style={styles.backText}>Back</Text>
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
    justifyContent: 'center',
    minHeight: 500,
  },
  introIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'center',
  },
  introIcon: {
    fontSize: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
    lineHeight: 36,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 18,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '600',
    letterSpacing: 1,
  },
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
  measureOptionsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  measureOption: {
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
  measureOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  measureOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  measureOptionTextContainer: {
    flex: 1,
  },
  measureOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  measureOptionTitleSelected: {
    color: '#007AFF',
  },
  measureOptionSubtitle: {
    fontSize: 16,
    color: '#6C757D',
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
  measureUnit: {
    fontSize: 20,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 32,
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
    marginBottom: 40,
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
    width: 60,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  referenceBarGood: {
    backgroundColor: '#34C759',
  },
  referenceBorderline: {
    backgroundColor: '#FF9500',
  },
  referenceHigh: {
    backgroundColor: '#FF3B30',
  },
  referenceLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
    fontWeight: '500',
  },
  referenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  thankYouIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'center',
  },
  thankYouIcon: {
    fontSize: 48,
  },
  thankYouTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  thankYouMessage: {
    fontSize: 18,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  healthTipContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#D0E3FF',
    marginBottom: 40,
  },
  healthTipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0056B3',
    marginBottom: 12,
  },
  healthTipText: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 24,
  },
  doneButton: {
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
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default BloodLipidsFlowScreen;