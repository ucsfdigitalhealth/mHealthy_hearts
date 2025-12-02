import { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
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

// Deep linking configuration
const linking = {
  prefixes: ['mhealthyhearts://'],
  config: {
    screens: {
      Login: 'login',
      Landing: 'landing',
      CardioVascular: 'cardio',
    },
  },
};

export default function App() {
  const navigationRef = useRef<any>(null);
  const linkingRef = useRef<any>(null);

  useEffect(() => {
    // Handle deep links that come in while app is already running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep link that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async ({ url }: { url: string }) => {
    try {
      const parsedUrl = Linking.parse(url);
      
      // Handle OAuth callbacks
      if (parsedUrl.path === 'fitbit/callback' || parsedUrl.path === 'omron/callback') {
        const success = parsedUrl.queryParams?.success === 'true';
        const userId = parsedUrl.queryParams?.userId as string;
        const error = parsedUrl.queryParams?.error as string | undefined;
        
        const provider = parsedUrl.path.includes('fitbit') ? 'Fitbit' : 'Omron';
        
        if (success) {
          Alert.alert(
            'Success',
            `${provider} connected successfully!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to Landing screen if not already there
                  if (navigationRef.current) {
                    navigationRef.current.navigate('Landing');
                  }
                  // Optionally refresh data or update UI
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Connection Failed',
            `Failed to connect ${provider}: ${error || 'Unknown error'}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  return (
    <AuthProvider>
      <NavigationContainer 
        ref={navigationRef}
        linking={linking}
      >
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
