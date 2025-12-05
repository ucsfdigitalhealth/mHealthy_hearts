import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface FitbitAuthContextType {
  isConnected: boolean;
  loading: boolean;
  // Starts the OAuth flow by requesting an auth URL from backend and opening it
  connect: () => Promise<void>;
  // Disconnects (revokes / clears tokens on backend and updates local state)
  disconnect: () => Promise<void>;
  // Allow manual state update (e.g., when deep link callback handled)
  setConnected: (value: boolean) => void;
}

const FitbitAuthContext = createContext<FitbitAuthContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const FitbitProvider: React.FC<Props> = ({ children }) => {
  const { accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Key used to persist quick local flag; server is the source of truth but this is convenient
  const STORAGE_KEY = 'fitbitConnected';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        setIsConnected(stored === 'true');
      } catch (err) {
        console.warn('Error reading fitbitConnected from storage', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setConnected = useCallback(async (value: boolean) => {
    try {
      if (value) {
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      setIsConnected(value);
    } catch (err) {
      console.error('Error setting fitbitConnected storage', err);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      // Backend returns a JSON with { authUrl } (see backend fitbit.connect route)
      const resp = await fetch('http://localhost:3000/api/fitbitAuth/fitbit/connect', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include Authorization header if your backend requires it for that endpoint;
          // the backend's connect route uses verifyTokenOrRefresh so include token if available
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Failed to get Fitbit auth url: ${resp.status} ${body}`);
      }

      const data = await resp.json();
      const authUrl = data.authUrl;
      if (!authUrl) throw new Error('No auth URL returned from server');

      // Open system browser to authUrl (deep link/callback handled by app)
      await Linking.openURL(authUrl);
      // Note: final connected state should be set when the app receives deep link callback.
    } catch (err) {
      console.error('Error starting Fitbit connect flow', err);
      Alert.alert('Unable to start Fitbit connection', String(err));
    }
  }, [accessToken]);

  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch('http://localhost:3000/api/fitbitAuth/fitbit/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(`Disconnect failed: ${resp.status} ${msg}`);
      }

      // Clear local flag
      await setConnected(false);
    } catch (err) {
      console.error('Error disconnecting Fitbit', err);
      Alert.alert('Unable to disconnect Fitbit', String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accessToken, setConnected]);

  const value: FitbitAuthContextType = {
    isConnected,
    loading,
    connect,
    disconnect,
    setConnected,
  };

  return <FitbitAuthContext.Provider value={value}>{children}</FitbitAuthContext.Provider>;
};

export const useFitbitAuth = (): FitbitAuthContextType => {
  const ctx = useContext(FitbitAuthContext);
  if (!ctx) throw new Error('useFitbitAuth must be used within FitbitProvider');
  return ctx;
};