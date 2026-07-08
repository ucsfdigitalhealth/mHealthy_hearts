import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFitbitAuth } from '../context/FitbitAuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { logout, user } = useAuth();
  const { isConnected, disconnectFitbit, isLoading: fitbitLoading } = useFitbitAuth();
  
  const handleBack = () => {
    navigation.goBack();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const handleDisconnectFitbit = () => {
    Alert.alert(
      'Disconnect Fitbit',
      'Are you sure you want to disconnect your Fitbit account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectFitbit();
              Alert.alert('Disconnected', 'Your Fitbit has been disconnected.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to disconnect Fitbit. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleHelpPress = () => {
    // Handle help button press - can navigate to help screen or show alert
    Alert.alert('Help', 'Help content will be available here.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>
        
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userLabel}>Logged in as:</Text>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.helpButton}
          onPress={handleHelpPress}
          activeOpacity={0.7}
        >
          <View style={styles.helpContent}>
            <View style={styles.helpIconContainer}>
              <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpLabel}>Help</Text>
              <Text style={styles.helpTitle}>Get Support</Text>
              <Text style={styles.helpSubtitle}>Need assistance? Tap here</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {isConnected && (
          <TouchableOpacity
            style={[styles.logoutButton, styles.disconnectButton]}
            onPress={handleDisconnectFitbit}
            activeOpacity={0.8}
            disabled={fitbitLoading}
          >
            <Text style={styles.logoutButtonText}>
              {fitbitLoading ? 'Disconnecting…' : 'Disconnect Fitbit'}
            </Text>
          </TouchableOpacity>
        )}
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
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  userInfo: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  userLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  helpButton: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  disconnectButton: {
    marginTop: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SettingsScreen;

