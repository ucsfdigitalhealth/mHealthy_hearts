import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import LandingScreen from './src/screens/LandingScreen';
import CardioVascularScreen from './src/screens/CardioVascularScreen';

export type RootStackParamList = {
  Landing: undefined;
  CardioVascular: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator>
        <Stack.Screen name="Landing" component={LandingScreen} options={{ title: 'mHealthyHearts' }} />
        <Stack.Screen name="CardioVascular" component={CardioVascularScreen} options={{ title: 'Life Essential 8' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
