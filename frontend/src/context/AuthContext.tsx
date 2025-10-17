import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('userData');
      setAccessToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const fetchUserInfo = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
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
          logout();
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load stored auth data on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const [storedToken, storedUserData] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('userData')
        ]);

        if (storedToken && storedUserData) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUserData));
          // Fetch fresh user data
          await fetchUserInfo();
        }
      } catch (error) {
        console.error('Error loading stored auth data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
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
