import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { getWeeklyInstrumentKeys, getWeeklyPlan } from '../../api/symptoms';
import { WEEKLY_SYMPTOM_OPTIONS, MAX_WEEKLY_SYMPTOMS } from './weeklySymptomOptions';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'WeeklySymptomSetup'>;

const WeeklySymptomSetup: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { accessToken } = useAuth();

  const [availableKeys, setAvailableKeys] = useState<string[] | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [existingPlanId, setExistingPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getWeeklyInstrumentKeys(accessToken), getWeeklyPlan(accessToken)])
      .then(([keys, plan]) => {
        if (cancelled) return;
        setAvailableKeys(keys);
        if (plan) {
          setExistingPlanId(plan.id);
          setSelectedKeys(plan.symptom_keys);
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

  const atCap = selectedKeys.length >= MAX_WEEKLY_SYMPTOMS;

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= MAX_WEEKLY_SYMPTOMS) return prev;
      return [...prev, key];
    });
  };

  const handleNext = () => {
    if (selectedKeys.length === 0) return;
    navigation.navigate('WeeklyReminderSetup', {
      selected_symptom_keys: selectedKeys,
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
          {isEditing ? 'Edit your weekly check-in' : 'Set up weekly tracking'}
        </Text>
        <Text style={styles.screenSubtitle}>
          Choose up to {MAX_WEEKLY_SYMPTOMS} symptoms to check in on each week. A short
          questionnaire for each one (about 5-6 minutes total) will be combined into a
          single weekly session.
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
          <>
            <View style={styles.optionGroup}>
              {options.map(option => {
                const isSelected = selectedKeys.includes(option.key);
                const disabled = !isSelected && atCap;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionTile,
                      isSelected && styles.optionTileSelected,
                      disabled && styles.optionTileDisabled,
                    ]}
                    onPress={() => toggleKey(option.key)}
                    activeOpacity={0.7}
                    disabled={disabled}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {atCap && (
              <Text style={styles.capHint}>
                You've selected the maximum of {MAX_WEEKLY_SYMPTOMS} symptoms. Unselect one to choose a different symptom.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, selectedKeys.length === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={selectedKeys.length === 0}
        >
          <Text style={styles.nextButtonText}>
            {`Next${selectedKeys.length > 0 ? ` (${selectedKeys.length} selected)` : ''}`}
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
  optionTile: {
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
  optionTileSelected: { backgroundColor: '#EFF6FF', borderColor: '#007AFF' },
  optionTileDisabled: { opacity: 0.4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  optionLabel: { fontSize: 16, fontWeight: '500', color: '#1F2937', flex: 1 },
  optionLabelSelected: { color: '#1D4ED8' },

  capHint: { fontSize: 13, color: '#9CA3AF', marginTop: 14, lineHeight: 18, fontStyle: 'italic' },

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
