import React, { useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { postEmaEnrollment } from '../../api/symptoms';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomRecurringPrompt'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomRecurringPrompt'>;

const SymptomRecurringPrompt: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_event_id, symptom_key, symptom_label } = route.params;
  const { accessToken } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleNo = async () => {
    if (!accessToken) return;
    setSaving(true);
    setSaveError(null);
    try {
      await postEmaEnrollment(accessToken, {
        symptom_event_id,
        symptom_key,
        frequency: 'once',
      });
      navigation.navigate('SymptomConfirmation');
    } catch (err: any) {
      setSaveError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleYes = () => {
    navigation.navigate('DailyReminderSetup', {
      symptom_event_id,
      symptom_key,
      symptom_label,
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
        <Text style={styles.screenTitle}>Track this regularly?</Text>
        <Text style={styles.screenSubtitle}>
          Would you like reminders to check in on{' '}
          <Text style={styles.highlight}>{symptom_label.toLowerCase()}</Text>
          {' '}on a regular schedule?
        </Text>

        <View style={styles.choiceGroup}>
          <TouchableOpacity
            style={styles.choiceTile}
            onPress={handleYes}
            activeOpacity={0.7}
            disabled={saving}
          >
            <View style={styles.choiceIconCircle}>
              <Ionicons name="notifications-outline" size={22} color="#007AFF" />
            </View>
            <View style={styles.choiceTextBlock}>
              <Text style={styles.choiceTitle}>Yes, set up reminders</Text>
              <Text style={styles.choiceDesc}>
                Choose times of day and a date range for check-in reminders.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceTile}
            onPress={handleNo}
            activeOpacity={0.7}
            disabled={saving}
          >
            <View style={styles.choiceIconCircle}>
              <Ionicons name="checkmark-outline" size={22} color="#007AFF" />
            </View>
            <View style={styles.choiceTextBlock}>
              <Text style={styles.choiceTitle}>No, just this once</Text>
              <Text style={styles.choiceDesc}>Log it and move on — no follow-up reminders.</Text>
            </View>
            {saving ? <ActivityIndicator color="#9CA3AF" /> : <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
          </TouchableOpacity>
        </View>

        {saveError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        )}
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  screenSubtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 28 },
  highlight: { color: '#007AFF', fontWeight: '600' },

  choiceGroup: { gap: 14 },
  choiceTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  choiceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  choiceTextBlock: { flex: 1 },
  choiceTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  choiceDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  errorBannerText: { flex: 1, fontSize: 14, color: '#DC2626', lineHeight: 20 },
});

export default SymptomRecurringPrompt;
