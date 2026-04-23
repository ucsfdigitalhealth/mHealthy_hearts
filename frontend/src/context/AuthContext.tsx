import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearStepsCache } from '../utils/stepsCache';
import { clearSleepCache } from '../utils/sleepCache';

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
  login: (token: string, refreshToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = 'http://localhost:3000/api/auth';

export const FITBIT_STEPS_LOGIN_REFRESH_KEY = 'fitbit_steps_login_refresh';
export const FITBIT_SLEEP_LOGIN_REFRESH_KEY = 'fitbit_sleep_login_refresh';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (token: string, newRefreshToken: string, userData: User) => {
    try {
      await AsyncStorage.multiSet([
        ['accessToken', token],
        ['refreshToken', newRefreshToken],
        ['userData', JSON.stringify(userData)],
        // Flags that tell the steps/sleep hooks to bypass the backend DB cache
        // on their first fetch, going directly to Fitbit servers.
        [FITBIT_STEPS_LOGIN_REFRESH_KEY, 'true'],
        [FITBIT_SLEEP_LOGIN_REFRESH_KEY, 'true'],
      ]);
      setAccessToken(token);
      setRefreshToken(newRefreshToken);
      setUser(userData);
      await Promise.all([clearStepsCache(), clearSleepCache()]);
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const logout = useCallback(async () => {
    try {
      // Notify backend to invalidate the refresh token
      const storedRefreshToken = refreshToken || await AsyncStorage.getItem('refreshToken');
      if (storedRefreshToken) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        }).catch(() => {}); // Fire-and-forget — don't block logout on network error
      }

      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }, [refreshToken]);

  /**
   * Attempts to get a new access token using the stored refresh token.
   * Returns true on success, false on failure (which triggers logout).
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefreshToken = refreshToken || await AsyncStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        console.log('No refresh token available');
        return false;
      }

      console.log('Attempting token refresh...');
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Token refresh successful');
        await AsyncStorage.multiSet([
          ['accessToken', data.accessToken],
          ['refreshToken', data.refreshToken],
        ]);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return true;
      } else {
        console.log('Token refresh failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }, [refreshToken]);

  const fetchUserInfo = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      console.log('No access token available to fetch user info');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/userinfo`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      } else if (response.status === 401) {
        // Try to refresh and retry once
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await logout();
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, [accessToken, refreshAccessToken, logout]);

  // Load stored auth data on app start
  useEffect(() => {
    let isMounted = true;

    const loadStoredAuth = async () => {
      try {
        setLoading(true);
        const [storedToken, storedRefreshToken, storedUserData] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('refreshToken'),
          AsyncStorage.getItem('userData'),
        ]);

        if (!isMounted) return;

        if (storedToken) {
          // Try to validate the stored access token
          try {
            console.log('Validating stored token on app start...');
            const response = await fetch(`${API_BASE_URL}/userinfo`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${storedToken}` },
            });

            if (!isMounted) return;

            if (response.ok) {
              const data = await response.json();
              console.log('Token is valid, restoring session');
              setAccessToken(storedToken);
              setRefreshToken(storedRefreshToken);
              setUser(data.user);
              await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            } else if (response.status === 401 && storedRefreshToken) {
              // Access token expired — try to refresh silently
              console.log('Access token expired on startup, attempting refresh...');
              const refreshResponse = await fetch(`${API_BASE_URL}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
              });

              if (!isMounted) return;

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                console.log('Startup refresh successful, restoring session');
                await AsyncStorage.multiSet([
                  ['accessToken', refreshData.accessToken],
                  ['refreshToken', refreshData.refreshToken],
                ]);
                setAccessToken(refreshData.accessToken);
                setRefreshToken(refreshData.refreshToken);

                // Fetch user info with new token
                const userResponse = await fetch(`${API_BASE_URL}/userinfo`, {
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${refreshData.accessToken}` },
                });
                if (isMounted && userResponse.ok) {
                  const userData = await userResponse.json();
                  setUser(userData.user);
                  await AsyncStorage.setItem('userData', JSON.stringify(userData.user));
                } else if (isMounted && storedUserData) {
                  // Fall back to cached user data if fetch fails
                  setUser(JSON.parse(storedUserData));
                }
              } else {
                console.log('Refresh token also expired, clearing auth');
                await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                if (isMounted) {
                  setAccessToken(null);
                  setRefreshToken(null);
                  setUser(null);
                }
              }
            } else {
              console.log('Token invalid, clearing stored data');
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
              if (isMounted) {
                setAccessToken(null);
                setRefreshToken(null);
                setUser(null);
              }
            }
          } catch (error) {
            console.error('Error validating token:', error);
            if (!isMounted) return;
            // Network error — restore from cache so app works offline
            if (storedUserData) {
              console.log('Network error on startup, restoring from cache');
              setAccessToken(storedToken);
              setRefreshToken(storedRefreshToken);
              setUser(JSON.parse(storedUserData));
            } else {
              setAccessToken(null);
              setRefreshToken(null);
              setUser(null);
            }
          }
        } else {
          setAccessToken(null);
          setRefreshToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading stored auth data:', error);
        if (!isMounted) return;
        setAccessToken(null);
        setRefreshToken(null);
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
    refreshAccessToken,
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
