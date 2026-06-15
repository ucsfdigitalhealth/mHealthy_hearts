import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { logDisclaimer } from '../api/symptoms';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Symptoms'>;

// Single safety disclaimer gate, shown the moment the Symptoms section is
// entered — before either "set up weekly tracking" or "track right now".
const SymptomsDisclaimerGate: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { accessToken } = useAuth();

  const handleAck = () => {
    logDisclaimer(accessToken, 'section_entry');
    navigation.replace('SymptomsLanding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconRow}>
          <Ionicons name="shield-checkmark" size={48} color="#007AFF" />
        </View>
        <Text style={styles.title}>Before you log</Text>
        <Text style={styles.body}>
          {'In an emergency, '}
          <Text style={styles.link} onPress={() => Linking.openURL('tel:911')}>
            call 911
          </Text>
          {'. This app does not contact your doctor or send help. Log your symptoms after you are safe.'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleAck}>
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconRow: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 36,
    maxWidth: 340,
  },
  link: {
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 64,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SymptomsDisclaimerGate;
