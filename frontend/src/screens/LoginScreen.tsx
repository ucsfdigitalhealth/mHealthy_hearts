import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useFitbitAuth } from '../context/FitbitAuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import ApiTester from '../components/ApiTester';

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface AuthResponse {
  accessToken: string;
  message: string;
}

interface UserInfoResponse {
  user: User;
}

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, user, accessToken, loading: authLoading } = useAuth();
  const { isConnected: fitbitConnected, checkConnectionStatus, isLoading: fitbitLoading } = useFitbitAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [hasCheckedFitbit, setHasCheckedFitbit] = useState(false);
  const [isFreshLogin, setIsFreshLogin] = useState(false);

  // Redirect logic for already logged-in users (app refresh/restart)
  useEffect(() => {
    const handleNavigation = async () => {
      if (!authLoading && user && accessToken && !hasCheckedFitbit) {
        // Check Fitbit connection status first
        await checkConnectionStatus();
        setHasCheckedFitbit(true);
      }
    };

    handleNavigation();
  }, [authLoading, user, accessToken, checkConnectionStatus, hasCheckedFitbit]);

  // Navigate after Fitbit status is checked
  useEffect(() => {
    if (!authLoading && user && accessToken && hasCheckedFitbit && !fitbitLoading) {
      if (isFreshLogin) {
        // Fresh login (user typed credentials) - always show FitbitConnect if not connected
        if (fitbitConnected) {
          navigation.replace('HomeTabs');
        } else {
          navigation.replace('FitbitConnect');
        }
        setIsFreshLogin(false); // Reset flag
      } else {
        // Already logged in (app refresh) - use 1/3 probability if not connected
        if (fitbitConnected) {
          navigation.replace('HomeTabs');
        } else {
          const shouldShowFitbitConnect = Math.random() < 1/3;
          if (shouldShowFitbitConnect) {
            navigation.replace('FitbitConnect');
          } else {
            navigation.replace('HomeTabs');
          }
        }
      }
    }
  }, [authLoading, user, accessToken, hasCheckedFitbit, fitbitConnected, fitbitLoading, isFreshLogin, navigation]);

  // Try this if localhost doesn't work: replace with your computer's IP address
  const API_BASE_URL = 'http://localhost:3000/api/auth';
  // Alternative: const API_BASE_URL = 'http://192.168.1.XXX:3000/api/auth';

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    if (!isLogin && !formData.username) {
      Alert.alert('Error', 'Please enter a username');
      return false;
    }
    return true;
  };

  const registerUser = async () => {
    try {
      console.log('Attempting registration with:', { 
        url: `${API_BASE_URL}/register`,
        data: { username: formData.username, email: formData.email, password: '[HIDDEN]' }
      });

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      console.log('Registration response status:', response.status);
      console.log('Registration response headers:', response.headers);

      const data = await response.json();
      console.log('Registration response data:', data);

      if (response.ok) {
        Alert.alert('Success', data.message, [
          { text: 'OK', onPress: () => setIsLogin(true) }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', `Network error: ${error.message || 'Please check if the server is running on localhost:3000'}`);
    }
  };

  const loginUser = async () => {
    try {
      console.log('Attempting login with:', { 
        url: `${API_BASE_URL}/login`,
        data: { email: formData.email, password: '[HIDDEN]' }
      });

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);

      const data: AuthResponse = await response.json();
      console.log('Login response data:', data);

      if (response.ok) {
        // Store the access token and user data
        const userInfo = await fetchUserInfo(data.accessToken);
        if (userInfo) {
          // Use the AuthContext to store the login data
          login(data.accessToken, userInfo);
          
          // Mark as fresh login and check Fitbit connection status
          setIsFreshLogin(true);
          setHasCheckedFitbit(false); // Reset to trigger check
          await checkConnectionStatus();
          setHasCheckedFitbit(true);
        }
      } else {
        Alert.alert('Error', data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', `Network error: ${error.message || 'Please check if the server is running on localhost:3000'}`);
    }
  };

  const fetchUserInfo = async (accessToken: string): Promise<User | null> => {
    try {
      console.log('Fetching user info with token:', accessToken.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}/userinfo`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('User info response status:', response.status);
      const data: UserInfoResponse = await response.json();
      console.log('User info response data:', data);

      if (response.ok) {
        // Store user info if needed
        console.log('User info:', data.user);
        return data.user;
      } else {
        Alert.alert('Error', 'Failed to fetch user information');
        return null;
      }
    } catch (error) {
      console.error('User info error:', error);
      Alert.alert('Error', `Failed to fetch user information: ${error.message}`);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        await loginUser();
      } else {
        await registerUser();
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ username: '', email: '', password: '' });
  };

  // Don't render login form if auth is still loading or user is already logged in
  if (authLoading || (user && accessToken)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>mHealthy Hearts</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </Text>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  placeholder="Enter your username"
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Enter your password"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Login' : 'Register'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
              <Text style={styles.toggleButtonText}>
                {isLogin 
                  ? "Don't have an account? Register" 
                  : "Already have an account? Login"
                }
              </Text>
            </TouchableOpacity>

            {/* Debug component - remove this after fixing the issue */}
            <ApiTester />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
