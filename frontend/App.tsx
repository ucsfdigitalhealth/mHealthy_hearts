import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeTabsScreen from './src/screens/HomeTabScreen';
import BloodSugarScreen from './src/screens/BloodSugarScreen';
import BloodLipidsScreen from './src/screens/BloodLipidsScreen';

export type RootStackParamList = {
  Login: undefined;
  HomeTabs: undefined;
  BloodSugar: undefined;
  BloodLipids: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="HomeTabs" component={HomeTabsScreen} />
          <Stack.Screen name="BloodSugar" component={BloodSugarScreen} />
          <Stack.Screen name="BloodLipids" component={BloodLipidsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}