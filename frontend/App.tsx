import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import LandingScreen from './src/screens/LandingScreen';
import CardioVascularScreen from './src/screens/CardioVascularScreen';

export type RootStackParamList = {
  Login: undefined;
  Landing: undefined;
  CardioVascular: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'mHealthyHearts', headerShown: false }} />
          <Stack.Screen name="Landing" component={LandingScreen} options={{ 
            title: 'mHealthyHearts', 
            headerLeft: () => null,
            gestureEnabled: false,
            headerBackVisible: false
          }} />
          <Stack.Screen name="CardioVascular" component={CardioVascularScreen} options={{ title: 'Life Essential 8' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
