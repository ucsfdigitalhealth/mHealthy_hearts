import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useFitbitAuth } from '../context/FitbitAuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type FitbitConnectScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FitbitConnect'>;

const FitbitConnectScreen: React.FC = () => {
  const navigation = useNavigation<FitbitConnectScreenNavigationProp>();
  const { connectFitbit, isConnected, isLoading, checkConnectionStatus } = useFitbitAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const appState = useRef(AppState.currentState);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[FitbitConnectScreen] State update:', {
      isConnected,     // true if Fitbit account is connected (user authorized successfully)
      isLoading,       // true while connection check or authorization is in progress (from context)
      isConnecting,    // true while the user is actively going through the Fitbit connect flow (local UI flag)
    });
  }, [isConnected, isLoading, isConnecting]);

  // Check connection status when screen comes into focus
  // This helps detect if user authorized while on this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log('[FitbitConnectScreen] Screen focused, checking connection status...');
      if (!isConnecting) {
        checkConnectionStatus(); // Check if Fitbit is connected (checks fitbit/steps endpoint)
      }
    }, [isConnecting, checkConnectionStatus])
  );

  // Listen for app state changes to check connection when returning from browser
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isConnecting
      ) {
        console.log('[FitbitConnectScreen] App returned from background, checking connection...');
        // User likely returned from browser, check if connection succeeded
        // Give backend a moment to process the callback
        setTimeout(async () => {
          await checkConnectionStatus();
        }, 1000);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isConnecting, checkConnectionStatus]);

  // Update isConnecting when connection status changes
  useEffect(() => {
    if (isConnecting) {
      // If we're connected, stop the connecting state
      if (isConnected) {
        console.log('[FitbitConnectScreen] Connection successful, setting isConnecting to false');
        setIsConnecting(false);
      }
      // If loading is done and we're still not connected, stop connecting state
      else if (!isLoading) {
        console.log('[FitbitConnectScreen] Connection check completed, setting isConnecting to false');
        setIsConnecting(false);
      }
    }
  }, [isConnected, isLoading, isConnecting]);

  // Navigate to HomeTabs when Fitbit connection is successful
  useEffect(() => {
    if (isConnected && !isLoading && !isConnecting) {
      console.log('[FitbitConnectScreen] Connection successful, navigating to HomeTabs');
      // Connection was successful, navigate to homepage with success param
      navigation.replace('HomeTabs', { fitbitConnectionResult: 'success' });
    }
  }, [isConnected, isLoading, isConnecting, navigation]);

  const handleConnectFitbit = async () => {
    console.log('[FitbitConnectScreen] handleConnectFitbit called');
    console.log('[FitbitConnectScreen] Current state:', {
      isConnecting,
      isLoading,
      isConnected,
    });

    try {
      console.log('[FitbitConnectScreen] Setting isConnecting to true');
      setIsConnecting(true);
      
      // This will:
      // 1. Call backend to get authorization URL
      // 2. Open browser with the URL
      // 3. User authorizes on Fitbit
      // 4. Backend callback redirects to deep link
      // 5. Deep link handler in FitbitAuthContext updates connection status
      // 6. useEffect above will detect isConnected = true and navigate
      console.log('[FitbitConnectScreen] Calling connectFitbit()...');
      await connectFitbit();
      console.log('[FitbitConnectScreen] connectFitbit() completed - browser should have opened');
      // Don't set isConnecting to false here - let AppState handler or connection check handle it
      // The browser will close and AppState will change, triggering a connection check
    } catch (error) {
      console.error('[FitbitConnectScreen] Error connecting Fitbit:', error);
      console.error('[FitbitConnectScreen] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      setIsConnecting(false);
      // Navigate to homepage with failure param
      navigation.replace('HomeTabs', { fitbitConnectionResult: 'failed' });
    }
  };

  const handleSkip = () => {
    navigation.replace('HomeTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect Your Fitbit</Text>
          <Text style={styles.description}>
            Connect your Fitbit device to sync your health data and get personalized insights.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.connectButton, (isConnecting || isLoading) && styles.connectButtonDisabled]}
            onPress={() => {
              console.log('[FitbitConnectScreen] Button pressed!');
              console.log('[FitbitConnectScreen] Button disabled?', isConnecting || isLoading);
              handleConnectFitbit();
            }}
            activeOpacity={0.8}
            disabled={isConnecting || isLoading}
          >
            {isConnecting || isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.connectButtonText}>Connect to Fitbit</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FitbitConnectScreen;

