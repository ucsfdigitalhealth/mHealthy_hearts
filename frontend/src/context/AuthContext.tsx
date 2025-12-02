import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  fetchUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3000/api/auth';

  const login = async (token: string, userData: User) => {
    try {
      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setAccessToken(token);
      setUser(userData);
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('userData');
      setAccessToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }, []);

  const fetchUserInfo = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      console.log('No access token available to fetch user info');
      return;
    }

    try {
      // Don't set loading state when refreshing user info to avoid unmounting NavigationContainer
      console.log('Fetching user info with token:', accessToken.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}/userinfo`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('User info response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('User info data:', data);
        setUser(data.user);
        // Update stored user data
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      } else {
        console.error('Failed to fetch user info:', response.status);
        // If token is invalid, logout
        if (response.status === 401) {
          await logout();
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, [accessToken, logout]);

  // Load stored auth data on app start
  useEffect(() => {
    let isMounted = true;
    
    const loadStoredAuth = async () => {
      try {
        setLoading(true);
        const [storedToken, storedUserData] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('userData')
        ]);

        if (!isMounted) return;

        if (storedToken) {
          // Validate token by fetching user info directly (don't use fetchUserInfo to avoid dependencies)
          try {
            console.log('Validating stored token on app start...');
            const response = await fetch(`${API_BASE_URL}/userinfo`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedToken}`,
              },
            });

            if (!isMounted) return;

            if (response.ok) {
              const data = await response.json();
              console.log('Token is valid, restoring session');
              // Token is valid, restore session
              setAccessToken(storedToken);
              setUser(data.user);
              // Update stored user data with fresh data
              await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            } else {
              console.log('Token is invalid, clearing stored data');
              // Token is invalid, clear stored data
              await AsyncStorage.removeItem('accessToken');
              await AsyncStorage.removeItem('userData');
              setAccessToken(null);
              setUser(null);
            }
          } catch (error) {
            console.error('Error validating token:', error);
            if (!isMounted) return;
            // On error, clear auth state to be safe
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('userData');
            setAccessToken(null);
            setUser(null);
          }
        } else {
          // No stored token, ensure state is clear
          setAccessToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading stored auth data:', error);
        if (!isMounted) return;
        // On error, clear auth state to be safe
        setAccessToken(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStoredAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    loading,
    login,
    logout,
    fetchUserInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
