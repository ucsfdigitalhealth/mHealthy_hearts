import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/context/AuthContext';
import { FitbitAuthProvider } from './src/context/FitbitAuthContext';
import LoginScreen from './src/screens/LoginScreen';
import FitbitConnectScreen from './src/screens/FitbitConnectScreen';
import HomeTabsScreen from './src/screens/HomeTabScreen';
import BloodSugarScreen from './src/screens/LeFlows/BloodSugarScreen';
import BloodLipidsScreen from './src/screens/LeFlows/BloodLipidsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BmiScreen from './src/screens/LeFlows/BmiScreen';
import DietAssessmentScreen from './src/screens/LeFlows/DietAssessmentScreen';
import SmokingAssessmentScreen from './src/screens/LeFlows/SmokingAssessmentScreen';
import SymptomsDisclaimerGate from './src/screens/SymptomsScreen';
import SymptomsLanding from './src/screens/symptoms/SymptomsLanding';
import SymptomsMomentaryList from './src/screens/symptoms/SymptomsMomentaryList';
import SymptomScreen2 from './src/screens/symptoms/SymptomScreen2';
import SymptomScreen3 from './src/screens/symptoms/SymptomScreen3';
import SymptomConfirmation from './src/screens/symptoms/SymptomConfirmation';
import SymptomRecurringPrompt from './src/screens/symptoms/SymptomRecurringPrompt';
import DailyReminderSetup from './src/screens/symptoms/DailyReminderSetup';
import SymptomsIntensity from './src/screens/symptoms/SymptomsIntensity';
import SymptomsInstrument from './src/screens/symptoms/SymptomsInstrument';
import WeeklySymptomSetup from './src/screens/symptoms/WeeklySymptomSetup';
import WeeklyReminderSetup from './src/screens/symptoms/WeeklyReminderSetup';
import AssessmentLandingScreen from './src/screens/LeFlows/AssessmentLandingScreen';
import BloodLipidsLandingScreen from './src/screens/LeFlows/BloodLipidsLandingScreen';
import SmokingLandingScreen from './src/screens/LeFlows/SmokingLandingScreen';
import BloodSugarLandingScreen from './src/screens/LeFlows/BloodSugarLandingScreen';
import DietLandingScreen from './src/screens/LeFlows/DietLandingScreen';
import HeartScoreLandingScreen from './src/screens/LeFlows/HeartScoreLandingScreen';
import BmiLandingScreen from './src/screens/LeFlows/BmiLandingScreen';
import PhysicalActivityLandingScreen from './src/screens/LeFlows/PhysicalActivityLandingScreen';
import SleepLandingScreen from './src/screens/LeFlows/SleepLandingScreen';
import BloodPressureLandingScreen from './src/screens/LeFlows/BloodPressureLandingScreen';
import DailyCheckInStepScreen from './src/screens/GoalFlow/DailyCheckInStepScreen';
import YesterdayStepsStepScreen from './src/screens/GoalFlow/YesterdayStepsStepScreen';
import SymptomBurdenStepScreen from './src/screens/GoalFlow/SymptomBurdenStepScreen';
import GoalSelectionStepScreen from './src/screens/GoalFlow/GoalSelectionStepScreen';
import GoalConfirmStepScreen from './src/screens/GoalFlow/GoalConfirmStepScreen';

export type RootStackParamList = {
  Login: undefined;
  FitbitConnect: undefined;
  HomeTabs: { fitbitConnectionResult?: 'success' | 'failed' } | undefined;
  AssessmentLanding: { title: string; targetScreen: string };
  BloodLipidsLanding: undefined;
  SmokingLanding: undefined;
  BloodSugarLanding: undefined;
  DietLanding: undefined;
  HeartScoreLanding: undefined;
  BmiLanding: undefined;
  PhysicalActivityLanding: undefined;
  SleepLanding: undefined;
  BloodPressureLanding: undefined;
  BloodSugar: undefined;
  BloodLipids: undefined;
  Bmi: undefined;
  Diet: undefined;
  Smoking: undefined;
  Settings: undefined;
  Symptoms: undefined;
  SymptomsLanding: undefined;
  SymptomsMomentaryList: undefined;
  SymptomScreen2: {
    symptom_key: string;
    symptom_label: string;
    tracking_type: string;
    safety_modal_shown: boolean;
  };
  SymptomScreen3: {
    symptom_key: string;
    symptom_label: string;
    tracking_type: string;
    safety_modal_shown: boolean;
    activities: string[];
  };
  SymptomRecurringPrompt: {
    symptom_event_id: number;
    symptom_key: string;
    symptom_label: string;
  };
  DailyReminderSetup: {
    symptom_event_id: number;
    symptom_key: string;
    symptom_label: string;
  };
  SymptomConfirmation: {
    enrollmentSummary?: string;
    completedWeeklyCheckIn?: boolean;
    weeklyPlan?: { id: number; symptom_keys: string[] };
  } | undefined;
  SymptomsIntensity: {
    symptom_key: string;
    symptom_label: string;
    tracking_type: string;
    safety_modal_shown: boolean;
    activities: string[];
    occurred_at: string;
    duration_bucket: string;
  };
  SymptomsInstrument: {
    symptom_queue: { symptom_key: string; symptom_label: string }[];
    current_index: number;
    weekly_plan_id?: number;
  };
  WeeklySymptomSetup: undefined;
  WeeklyReminderSetup: {
    selected_symptom_keys: string[];
    existing_plan_id?: number;
  };
  GoalsSetting: undefined;
  GoalStep1: undefined;
  GoalStep2: undefined;
  GoalStep3: { completedYesterday: boolean };
  GoalStep4: { completedYesterday: boolean; symptomRating: number };
  GoalStep5: { stepTarget: number; completedYesterday: boolean; symptomRating: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AuthProvider>
      <FitbitAuthProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="FitbitConnect" component={FitbitConnectScreen} />
            <Stack.Screen name="HomeTabs" component={HomeTabsScreen} />
            <Stack.Screen name="AssessmentLanding" component={AssessmentLandingScreen} />
            <Stack.Screen name="BloodLipidsLanding" component={BloodLipidsLandingScreen} />
            <Stack.Screen name="SmokingLanding" component={SmokingLandingScreen} />
            <Stack.Screen name="BloodSugarLanding" component={BloodSugarLandingScreen} />
            <Stack.Screen name="DietLanding" component={DietLandingScreen} />
            <Stack.Screen name="HeartScoreLanding" component={HeartScoreLandingScreen} />
            <Stack.Screen name="BmiLanding" component={BmiLandingScreen} />
            <Stack.Screen name="PhysicalActivityLanding" component={PhysicalActivityLandingScreen} />
            <Stack.Screen name="SleepLanding" component={SleepLandingScreen} />
            <Stack.Screen name="BloodPressureLanding" component={BloodPressureLandingScreen} />
            <Stack.Screen name="BloodSugar" component={BloodSugarScreen} />
            <Stack.Screen name="BloodLipids" component={BloodLipidsScreen} />
            <Stack.Screen name="Bmi" component={BmiScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Diet" component={DietAssessmentScreen} />
            <Stack.Screen name="Smoking" component={SmokingAssessmentScreen} />
            <Stack.Screen name="Symptoms" component={SymptomsDisclaimerGate} />
            <Stack.Screen name="SymptomsLanding" component={SymptomsLanding} />
            <Stack.Screen name="SymptomsMomentaryList" component={SymptomsMomentaryList} />
            <Stack.Screen name="SymptomScreen2" component={SymptomScreen2} />
            <Stack.Screen name="SymptomScreen3" component={SymptomScreen3} />
            <Stack.Screen name="SymptomConfirmation" component={SymptomConfirmation} />
            <Stack.Screen name="SymptomRecurringPrompt" component={SymptomRecurringPrompt} />
            <Stack.Screen name="DailyReminderSetup" component={DailyReminderSetup} />
            <Stack.Screen name="SymptomsIntensity" component={SymptomsIntensity} />
            <Stack.Screen name="SymptomsInstrument" component={SymptomsInstrument} />
            <Stack.Screen name="WeeklySymptomSetup" component={WeeklySymptomSetup} />
            <Stack.Screen name="WeeklyReminderSetup" component={WeeklyReminderSetup} />
            <Stack.Screen name="GoalStep1" component={DailyCheckInStepScreen} />
            <Stack.Screen name="GoalStep2" component={YesterdayStepsStepScreen} />
            <Stack.Screen name="GoalStep3" component={SymptomBurdenStepScreen} />
            <Stack.Screen name="GoalStep4" component={GoalSelectionStepScreen} />
            <Stack.Screen name="GoalStep5" component={GoalConfirmStepScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </FitbitAuthProvider>
    </AuthProvider>
  );
}