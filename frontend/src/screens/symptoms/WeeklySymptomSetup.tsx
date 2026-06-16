import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { getWeeklyInstrumentKeys, getWeeklyPlan } from '../../api/symptoms';
import { WEEKLY_SYMPTOM_OPTIONS } from './weeklySymptomOptions';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'WeeklySymptomSetup'>;

const WeeklySymptomSetup: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { accessToken } = useAuth();

  const [availableKeys, setAvailableKeys] = useState<string[] | null>(null);
  const [existingPlanId, setExistingPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    const keysPromise = getWeeklyInstrumentKeys(accessToken);
    const planPromise = getWeeklyPlan(accessToken).catch(() => null);

    keysPromise
      .then(async keys => {
        if (cancelled) return;
        setAvailableKeys(keys);
        try {
          const plan = await planPromise;
          if (cancelled) return;
          if (plan) {
            if (plan.completed_this_week) {
              Alert.alert(
                "You're all set for this week",
                "You've already completed this week's check-in. Come back next week!",
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
              return;
            }
            setExistingPlanId(plan.id);
          }
        } catch {
          // plan fetch failed — treat as no existing plan, proceed with first-time setup
        }
      })
      .catch(err => {
        if (!cancelled) setLoadError(err.message || 'Failed to load weekly symptoms.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken]);

  const isEditing = existingPlanId !== null;

  const options = availableKeys
    ? WEEKLY_SYMPTOM_OPTIONS.filter(o => availableKeys.includes(o.key))
    : [];

  const handleNext = () => {
    if (!availableKeys) return;
    navigation.navigate('WeeklyReminderSetup', {
      selected_symptom_keys: availableKeys,
      ...(existingPlanId !== null ? { existing_plan_id: existingPlanId } : {}),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>
          {isEditing ? 'Your weekly check-in' : 'Set up weekly tracking'}
        </Text>
        <Text style={styles.screenSubtitle}>
          Once a week, you'll be asked a short combined questionnaire (about 5-6 minutes
          total) covering the symptoms below.
        </Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#9CA3AF" />
          </View>
        ) : loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        ) : (
          <View style={styles.optionGroup}>
            {options.map(option => (
              <View key={option.key} style={styles.optionRow}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" style={{ marginRight: 12 }} />
                <Text style={styles.optionLabel}>{option.label}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {isEditing ? 'Continue to reminder settings' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#007AFF', fontSize: 16, fontWeight: '500', marginLeft: 4 },
  content: { padding: 20, paddingBottom: 20 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  screenSubtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 24 },

  loadingRow: { paddingVertical: 32, alignItems: 'center' },

  optionGroup: { gap: 10 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionLabel: { fontSize: 16, fontWeight: '500', color: '#1F2937', flex: 1 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
  },
  errorBannerText: { flex: 1, fontSize: 14, color: '#DC2626', lineHeight: 20 },

  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  nextButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

export default WeeklySymptomSetup;
