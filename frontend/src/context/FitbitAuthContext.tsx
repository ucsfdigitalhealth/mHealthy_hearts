import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './AuthContext';

// Complete the auth flow when browser closes
WebBrowser.maybeCompleteAuthSession();

interface FitbitAuthContextType {
  isConnected: boolean;
  isLoading: boolean;
  connectFitbit: () => Promise<void>;
  disconnectFitbit: () => Promise<void>;
  checkConnectionStatus: () => Promise<void>;
}

const FitbitAuthContext = createContext<FitbitAuthContextType | undefined>(undefined);

interface FitbitAuthProviderProps {
  children: ReactNode;
}

export const FitbitAuthProvider: React.FC<FitbitAuthProviderProps> = ({ children }) => {
  const { accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3000/api/fitbitAuth';

  // Check if Fitbit is connected by trying to fetch steps data
  const checkConnectionStatus = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    // Set loading to true at the start of the check
    setIsLoading(true);

    try {
      // Try to fetch Fitbit steps - if it succeeds, we're connected
      // If it fails with "Fitbit not connected", we're not connected
      const response = await fetch(`${API_BASE_URL}/fitbit/steps`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error(`[FitbitAuthContext] Non-JSON response received for steps: Status ${response.status}, Content-Type: ${contentType}, Preview: ${text.substring(0, 200)}`);
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      // If request succeeds (200 OK), Fitbit is connected
      if (response.ok && response.status === 200) {
        setIsConnected(true);
        console.log('[FitbitAuthContext] Fitbit is connected - steps data fetched successfully.');
      } else {
        // Not connected - check if it's explicitly "Fitbit not connected"
        setIsConnected(false);
        if (data.message === 'Fitbit not connected') {
          console.log('[FitbitAuthContext] Fitbit not connected.');
        } else {
          console.log('[FitbitAuthContext] Fitbit connection check failed:', data.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('[FitbitAuthContext] Error checking Fitbit connection status:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Initialize connection status on mount and when accessToken changes
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  // Check connection status when app comes to foreground
  // This helps detect if user authorized while app was in background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && accessToken) {
        console.log('[FitbitAuthContext] App came to foreground, checking Fitbit connection...');
        // Small delay to ensure backend is ready
        setTimeout(() => {
          checkConnectionStatus();
        }, 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [accessToken, checkConnectionStatus]);

  // Initiate Fitbit OAuth connection
  const connectFitbit = useCallback(async (): Promise<void> => {
    console.log('[FitbitAuthContext] connectFitbit called');
    console.log('[FitbitAuthContext] accessToken exists:', !!accessToken);
    console.log('[FitbitAuthContext] accessToken preview:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null');
    console.log('[FitbitAuthContext] API_BASE_URL:', API_BASE_URL);

    if (!accessToken) {
      console.error('[FitbitAuthContext] No access token available');
      throw new Error('User must be logged in to connect Fitbit');
    }

    try {
      console.log('[FitbitAuthContext] Setting isLoading to true');
      setIsLoading(true);

      // Step 1: Call backend to get authorization URL
      const connectUrl = `${API_BASE_URL}/fitbit/connect`;
      console.log('[FitbitAuthContext] Requesting Fitbit authorization URL from:', connectUrl);
      
      const response = await fetch(connectUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('[FitbitAuthContext] Response status:', response.status);
      console.log('[FitbitAuthContext] Response ok:', response.ok);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('[FitbitAuthContext] Error response content-type:', contentType);
        
        let errorData;
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          console.error('[FitbitAuthContext] Non-JSON error response:', text.substring(0, 200));
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        console.error('[FitbitAuthContext] Error data:', errorData);
        throw new Error(errorData.message || 'Failed to get authorization URL');
      }

      const data = await response.json();
      console.log('[FitbitAuthContext] Response data received:', { ...data, authUrl: data.authUrl ? `${data.authUrl.substring(0, 50)}...` : 'missing' });
      
      const { authUrl } = data;

      if (!authUrl) {
        console.error('[FitbitAuthContext] No authUrl in response:', data);
        throw new Error('No authorization URL received from server');
      }

      console.log('[FitbitAuthContext] Opening Fitbit authorization in browser...');
      console.log('[FitbitAuthContext] Full authUrl:', authUrl);

      // Step 2: Open browser with authorization URL
      // User will authorize in browser, then close browser manually
      // AppState change will trigger connection status check
      console.log('[FitbitAuthContext] Calling WebBrowser.openBrowserAsync...');
      await WebBrowser.openBrowserAsync(authUrl, {
        showInRecents: true,
      });

      console.log('[FitbitAuthContext] Browser opened. User will authorize and close browser manually.');
      // Connection status will be checked when app comes to foreground (via AppState listener)
    } catch (error) {
      console.error('Error connecting Fitbit (OAuth2.0 Flow URL Error possibly):', error);
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkConnectionStatus]);

  // Disconnect Fitbit (clear local state, backend tokens remain until user reconnects)
  const disconnectFitbit = useCallback(async (): Promise<void> => {
    try {
      // Clear any local storage (if we were storing tokens locally)
      await AsyncStorage.removeItem('fitbitAccessToken');
      await AsyncStorage.removeItem('fitbitRefreshToken');
      await AsyncStorage.removeItem('fitbitTokenExpires');
      
      setIsConnected(false);
      console.log('Fitbit disconnected locally');
    } catch (error) {
      console.error('Error disconnecting Fitbit:', error);
      throw error;
    }
  }, []);

  const value: FitbitAuthContextType = {
    isConnected,
    isLoading,
    connectFitbit,
    disconnectFitbit,
    checkConnectionStatus,
  };

  return (
    <FitbitAuthContext.Provider value={value}>
      {children}
    </FitbitAuthContext.Provider>
  );
};

export const useFitbitAuth = (): FitbitAuthContextType => {
  const context = useContext(FitbitAuthContext);
  if (context === undefined) {
    throw new Error('useFitbitAuth must be used within a FitbitAuthProvider');
  }
  return context;
};
