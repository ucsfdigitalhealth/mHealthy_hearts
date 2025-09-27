import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import LandingScreen from './src/screens/LandingScreen';

export type RootStackParamList = {
  Landing: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator>
        <Stack.Screen name="Landing" component={LandingScreen} options={{ title: 'mHealthyHearts' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
