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
import SymptomAssessmentScreen from './src/screens/SymptomsScreen';
import CardioHistoricalDataScreen from './src/screens/LeFlows/CardioHistoricalDataScreen';
import AssessmentLandingScreen from './src/screens/LeFlows/AssessmentLandingScreen';
import BloodLipidsLandingScreen from './src/screens/LeFlows/BloodLipidsLandingScreen';
import SmokingLandingScreen from './src/screens/LeFlows/SmokingLandingScreen';
import DailyCheckInStepScreen from './src/screens/GoalFlow/DailyCheckInStepScreen';
import YesterdayStepsStepScreen from './src/screens/GoalFlow/YesterdayStepsStepScreen';
import SymptomBurdenStepScreen from './src/screens/GoalFlow/SymptomBurdenStepScreen';
import GoalSelectionStepScreen from './src/screens/GoalFlow/GoalSelectionStepScreen';

export type RootStackParamList = {
  Login: undefined;
  FitbitConnect: undefined;
  HomeTabs: { fitbitConnectionResult?: 'success' | 'failed' } | undefined;
  AssessmentLanding: { title: string; targetScreen: string };
  BloodLipidsLanding: undefined;
  SmokingLanding: undefined;
  BloodSugar: undefined;
  BloodLipids: undefined;
  Bmi: undefined;
  Diet: undefined;
  Smoking: undefined;
  Settings: undefined;
  Symptoms: undefined;
  GoalsSetting: undefined;
  CardioHistoricalData: undefined;
  GoalStep1: undefined;
  GoalStep2: undefined;
  GoalStep3: { completedYesterday: boolean };
  GoalStep4: { completedYesterday: boolean; symptomRating: number };
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
            <Stack.Screen name="BloodSugar" component={BloodSugarScreen} />
            <Stack.Screen name="BloodLipids" component={BloodLipidsScreen} />
            <Stack.Screen name="Bmi" component={BmiScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Diet" component={DietAssessmentScreen} />
            <Stack.Screen name="Smoking" component={SmokingAssessmentScreen} />
            <Stack.Screen name="Symptoms" component={SymptomAssessmentScreen} />
            <Stack.Screen name="CardioHistoricalData" component={CardioHistoricalDataScreen} />
            <Stack.Screen name="GoalStep1" component={DailyCheckInStepScreen} />
            <Stack.Screen name="GoalStep2" component={YesterdayStepsStepScreen} />
            <Stack.Screen name="GoalStep3" component={SymptomBurdenStepScreen} />
            <Stack.Screen name="GoalStep4" component={GoalSelectionStepScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </FitbitAuthProvider>
    </AuthProvider>
  );
}