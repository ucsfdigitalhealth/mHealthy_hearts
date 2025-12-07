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

export type RootStackParamList = {
  Login: undefined;
  FitbitConnect: undefined;
  HomeTabs: { fitbitConnectionResult?: 'success' | 'failed' } | undefined;
  BloodSugar: undefined;
  BloodLipids: undefined;
  Bmi: undefined;
  Settings: undefined;
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
            <Stack.Screen name="BloodSugar" component={BloodSugarScreen} />
            <Stack.Screen name="BloodLipids" component={BloodLipidsScreen} />
            <Stack.Screen name="Bmi" component={BmiScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </FitbitAuthProvider>
    </AuthProvider>
  );
}