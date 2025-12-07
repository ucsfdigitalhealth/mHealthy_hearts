// BMIFlowScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const BMIFlowScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Map to store all user selections
  const [selections, setSelections] = useState<Record<number, any>>({
    1: null, // Step 1: Intro (always starts)
    2: null, // Step 2: Knows BMI (Yes/No)
    3: null, // Step 3: BMI value
    4: { weight: '160', height: '67' }, // Step 4: Weight and height
    5: null, // Step 5: Summary
  });

  const [calculatedBMI, setCalculatedBMI] = useState<string>('21');

  // Steps from the image
  const steps = [
    {
      id: 1,
      title: "Let's calculate your Body Mass Index (BMI)",
      type: 'intro',
      image: '⚖️',
      key: 'intro'
    },
    {
      id: 2,
      title: "Do you know your most recent BMI?",
      type: 'bmi-knowledge',
      options: ['Yes', 'No'],
      key: 'knowsBMI'
    },
    {
      id: 3,
      title: "Enter your most recent BMI result",
      type: 'bmi-input',
      unit: "kg/m²",
      value: selections[3] || '21',
      placeholder: "21",
      key: 'bmiValue'
    },
    {
      id: 4,
      title: "We use your height and weight to calculate your BMI",
      type: 'height-weight-input',
      weightLabel: "For your weight",
      weightUnit: "lb",
      heightLabel: "Enter your height",
      heightUnit: "in",
      weightValue: selections[4]?.weight || '160',
      heightValue: selections[4]?.height || '67',
      key: 'heightWeight'
    },
    {
      id: 5,
      title: "BMI Summary",
      type: 'summary',
      subtitle: "Here's your BMI",
      score: 100,
      bmiValue: calculatedBMI || '21',
      key: 'summary'
    }
  ];

  const calculateBMI = () => {
    const weightNum = parseFloat(selections[4]?.weight || '160');
    const heightNum = parseFloat(selections[4]?.height || '67');
    
    if (weightNum && heightNum) {
      // Convert inches to meters: 1 inch = 0.0254 meters
      const heightMeters = heightNum * 0.0254;
      // Convert pounds to kg: 1 lb = 0.453592 kg
      const weightKg = weightNum * 0.453592;
      
      // BMI = weight(kg) / height(m)²
      const bmi = weightKg / (heightMeters * heightMeters);
      const roundedBMI = Math.round(bmi * 10) / 10;
      setCalculatedBMI(roundedBMI.toString());
    }
  };

  const handleNext = () => {
    if (currentStep === 4) {
      calculateBMI();
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // Navigate back to previous screen on first step
      navigation.goBack();
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelections(prev => ({
      ...prev,
      [2]: option
    }));
    
    // If user knows BMI, go to step 3, otherwise go to step 4
    if (option === 'Yes') {
      setCurrentStep(3);
    } else {
      setCurrentStep(4);
    }
  };

  const handleBMIChange = (value: string) => {
    setSelections(prev => ({
      ...prev,
      [3]: value
    }));
  };

  const handleWeightChange = (value: string) => {
    setSelections(prev => ({
      ...prev,
      [4]: {
        ...prev[4],
        weight: value
      }
    }));
  };

  const handleHeightChange = (value: string) => {
    setSelections(prev => ({
      ...prev,
      [4]: {
        ...prev[4],
        height: value
      }
    }));
  };

  const handleDone = () => {
    // Log all selections for debugging/API calls
    console.log('BMI User Selections:', selections);
    console.log('Calculated BMI:', calculatedBMI);
    
    // Navigate back to previous screen
    navigation.goBack();
    
    // You can also make an API call here with the selections
    // makeBMIApiCall(selections);
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
            
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        );

      case 'bmi-knowledge':
        const selectedOption = selections[2];
        
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            
            <View style={styles.optionsContainer}>
              {step.options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.largeOptionButton,
                    selectedOption === option && styles.largeOptionButtonSelected
                  ]}
                  onPress={() => handleOptionSelect(option)}
                >
                  <Text style={[
                    styles.largeOptionText,
                    selectedOption === option 
                      ? styles.largeOptionTextSelected 
                      : styles.largeOptionTextUnselected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'bmi-input':
        const bmiValue = selections[3] || '';
        
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.bmiInput}
                value={bmiValue}
                onChangeText={handleBMIChange}
                placeholder={step.placeholder}
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={styles.inputUnitLarge}>{step.unit}</Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.nextButton,
                !bmiValue && styles.nextButtonDisabled
              ]}
              onPress={handleNext}
              disabled={!bmiValue}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'height-weight-input':
        const weightValue = selections[4]?.weight || '';
        const heightValue = selections[4]?.height || '';
        
        // Calculate preview BMI
        const calculatePreviewBMI = () => {
          if (weightValue && heightValue) {
            const weightNum = parseFloat(weightValue);
            const heightNum = parseFloat(heightValue);
            const heightMeters = heightNum * 0.0254;
            const weightKg = weightNum * 0.453592;
            const bmi = weightKg / (heightMeters * heightMeters);
            return Math.round(bmi * 10) / 10;
          }
          return 21;
        };
        
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            
            <View style={styles.heightWeightContainer}>
              {/* Weight Input */}
              <View style={styles.weightSection}>
                <Text style={styles.sectionLabel}>{step.weightLabel}</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.numberInput}
                    value={weightValue}
                    onChangeText={handleWeightChange}
                    placeholder={step.weightValue}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text style={styles.unitLabel}>{step.weightUnit}</Text>
                </View>
              </View>
              
              {/* BMI Preview */}
              <View style={styles.bmiPreview}>
                <View style={styles.bmiCircle}>
                  <Text style={styles.bmiPreviewValue}>
                    {calculatePreviewBMI()}
                  </Text>
                  <Text style={styles.bmiPreviewLabel}>BMI</Text>
                </View>
              </View>
              
              {/* Height Input */}
              <View style={styles.heightSection}>
                <Text style={styles.sectionLabel}>{step.heightLabel}</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.numberInput}
                    value={heightValue}
                    onChangeText={handleHeightChange}
                    placeholder={step.heightValue}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text style={styles.unitLabel}>{step.heightUnit}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.nextButton,
                (!weightValue || !heightValue) && styles.nextButtonDisabled
              ]}
              onPress={handleNext}
              disabled={!weightValue || !heightValue}
            >
              <Text style={styles.nextButtonText}>Calculate BMI</Text>
            </TouchableOpacity>
          </View>
        );

      case 'summary':
        const bmiResult = selections[2] === 'Yes' ? selections[3] : calculatedBMI;
        const bmiCategory = getBMICategory(parseFloat(bmiResult || '21'));
        
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.summaryTitle}>{step.title}</Text>
            <Text style={styles.summarySubtitle}>{step.subtitle}</Text>
            
            <View style={styles.scoreContainer}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{step.score}</Text>
                <Text style={styles.scoreLabel}>Points</Text>
              </View>
              
              <View style={styles.bmiResultContainer}>
                <Text style={styles.bmiResultLabel}>Your BMI:</Text>
                <Text style={styles.bmiResultValue}>{bmiResult} kg/m²</Text>
                <Text style={styles.bmiCategoryText}>
                  Category: <Text style={[styles.bmiCategoryValue, { color: bmiCategory.color }]}>
                    {bmiCategory.label}
                  </Text>
                </Text>
              </View>
            </View>
            
            <View style={styles.bmiCategoryContainer}>
              <Text style={styles.categoryTitle}>BMI Categories:</Text>
              
              <View style={styles.categoryRow}>
                <View style={styles.categoryIndicator}>
                  <View style={[styles.categoryBar, styles.categoryUnderweight]} />
                  <Text style={styles.categoryLabel}>Underweight</Text>
                  <Text style={styles.categoryRange}>{'< 18.5'}</Text>
                </View>
                
                <View style={styles.categoryIndicator}>
                  <View style={[styles.categoryBar, styles.categoryNormal]} />
                  <Text style={styles.categoryLabel}>Normal</Text>
                  <Text style={styles.categoryRange}>18.5-24.9</Text>
                </View>
              </View>
              
              <View style={styles.categoryRow}>
                <View style={styles.categoryIndicator}>
                  <View style={[styles.categoryBar, styles.categoryOverweight]} />
                  <Text style={styles.categoryLabel}>Overweight</Text>
                  <Text style={styles.categoryRange}>25-29.9</Text>
                </View>
                
                <View style={styles.categoryIndicator}>
                  <View style={[styles.categoryBar, styles.categoryObese]} />
                  <Text style={styles.categoryLabel}>Obese</Text>
                  <Text style={styles.categoryRange}>{'≥ 30'}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={handleDone}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#5AC8FA' };
    if (bmi < 25) return { label: 'Normal', color: '#34C759' };
    if (bmi < 30) return { label: 'Overweight', color: '#FF9500' };
    return { label: 'Obese', color: '#FF3B30' };
  };

  const currentStepData = steps.find(step => step.id === currentStep);

  // Adjust step count for progress bar (skip steps based on user choice)
  const adjustedStepCount = selections[2] === 'Yes' ? 3 : (selections[2] === 'No' ? 4 : 5);
  const adjustedCurrentStep = currentStep === 2 ? 1 : 
                            (currentStep === 3 && selections[2] === 'Yes') ? 2 : 
                            (currentStep === 4 && selections[2] === 'No') ? 2 : currentStep - 1;

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
                { width: `${(adjustedCurrentStep / (adjustedStepCount - 1)) * 100}%` }
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'center',
  },
  introIcon: {
    fontSize: 48,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 40,
    lineHeight: 36,
    textAlign: 'center',
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
  optionsContainer: {
    gap: 16,
  },
  largeOptionButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  largeOptionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  largeOptionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  largeOptionTextSelected: {
    color: '#FFFFFF',
  },
  largeOptionTextUnselected: {
    color: '#212529', // Black text for unselected buttons
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  bmiInput: {
    fontSize: 64,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    width: 120,
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
    paddingBottom: 8,
  },
  inputUnitLarge: {
    fontSize: 24,
    color: '#6C757D',
    marginLeft: 16,
    fontWeight: '600',
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
  nextButtonDisabled: {
    backgroundColor: '#CED4DA',
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  heightWeightContainer: {
    marginBottom: 40,
  },
  weightSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heightSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  sectionLabel: {
    fontSize: 18,
    color: '#6C757D',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  numberInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    width: 80,
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
    paddingBottom: 8,
  },
  unitLabel: {
    fontSize: 24,
    color: '#6C757D',
    marginLeft: 8,
    fontWeight: '600',
  },
  bmiPreview: {
    alignItems: 'center',
  },
  bmiCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  bmiPreviewValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bmiPreviewLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 20,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 8,
  },
  bmiResultContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  bmiResultLabel: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 8,
  },
  bmiResultValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  bmiCategoryText: {
    fontSize: 16,
    color: '#6C757D',
  },
  bmiCategoryValue: {
    fontWeight: '700',
  },
  bmiCategoryContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryIndicator: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  categoryBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryUnderweight: {
    backgroundColor: '#5AC8FA',
  },
  categoryNormal: {
    backgroundColor: '#34C759',
  },
  categoryOverweight: {
    backgroundColor: '#FF9500',
  },
  categoryObese: {
    backgroundColor: '#FF3B30',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryRange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
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

export default BMIFlowScreen;