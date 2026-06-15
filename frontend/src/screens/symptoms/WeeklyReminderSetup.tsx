import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { getWeeklyPlan, postWeeklyPlan, putWeeklyPlan } from '../../api/symptoms';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'WeeklyReminderSetup'>;
type RoutePropType = RouteProp<RootStackParamList, 'WeeklyReminderSetup'>;

// ─── Constants & helpers ─────────────────────────────────────────────────────

const DAYS = [
  { label: 'Sun', full: 'Sunday',    plural: 'Sundays',    value: 0 },
  { label: 'Mon', full: 'Monday',    plural: 'Mondays',    value: 1 },
  { label: 'Tue', full: 'Tuesday',   plural: 'Tuesdays',   value: 2 },
  { label: 'Wed', full: 'Wednesday', plural: 'Wednesdays', value: 3 },
  { label: 'Thu', full: 'Thursday',  plural: 'Thursdays',  value: 4 },
  { label: 'Fri', full: 'Friday',    plural: 'Fridays',    value: 5 },
  { label: 'Sat', full: 'Saturday',  plural: 'Saturdays',  value: 6 },
];

function defaultTime(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

function toTimeDisplay(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function toTimeApi(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function timeApiToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatWeeklySummary(dayOfWeek: number, time: string): string {
  const day = DAYS.find(d => d.value === dayOfWeek);
  return `on ${day?.plural ?? 'a weekly basis'} at ${toTimeDisplay(timeApiToDate(time))}`;
}

type NotificationChannel = 'text' | 'email';

// ─── Component ───────────────────────────────────────────────────────────────

const WeeklyReminderSetup: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { selected_symptom_keys, existing_plan_id } = route.params;
  const { accessToken } = useAuth();

  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [time, setTime] = useState<Date>(defaultTime);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>('text');

  const [loading, setLoading] = useState(existing_plan_id != null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (existing_plan_id == null || !accessToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getWeeklyPlan(accessToken)
      .then(plan => {
        if (cancelled || !plan) return;
        setDayOfWeek(plan.day_of_week);
        setTime(timeApiToDate(plan.time));
        setNotificationChannel(plan.notification_channel);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, existing_plan_id]);

  const handleTimeChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    if (picked) setTime(picked);
  };

  const canSubmit = dayOfWeek !== null;

  const handleSubmit = async () => {
    if (!canSubmit || !accessToken || dayOfWeek === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        symptom_keys: selected_symptom_keys,
        day_of_week: dayOfWeek,
        time: toTimeApi(time),
        notification_channel: notificationChannel,
      };
      const plan = existing_plan_id != null
        ? await putWeeklyPlan(accessToken, payload)
        : await postWeeklyPlan(accessToken, payload);

      navigation.navigate('SymptomConfirmation', {
        enrollmentSummary: formatWeeklySummary(plan.day_of_week, plan.time),
        weeklyPlan: { id: plan.id, symptom_keys: plan.symptom_keys },
      });
    } catch (err: any) {
      setSaveError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>
          {existing_plan_id != null ? 'Update your reminder' : 'Set your weekly reminder'}
        </Text>
        <Text style={styles.screenSubtitle}>
          Choose one day and time each week for your combined check-in.
        </Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#9CA3AF" />
          </View>
        ) : (
          <>
            <Text style={styles.formFieldLabel}>Day of week</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRow}
            >
              {DAYS.map(day => {
                const selected = dayOfWeek === day.value;
                return (
                  <TouchableOpacity
                    key={day.value}
                    style={[styles.dayTile, selected && styles.dayTileSelected]}
                    onPress={() => { setDayOfWeek(day.value); setSaveError(null); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayTileLabel, selected && styles.dayTileLabelSelected]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.formFieldLabel}>Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color="#007AFF" />
              <Text style={styles.pickerButtonText}>{toTimeDisplay(time)}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {Platform.OS === 'ios' && showTimePicker && (
              <Modal transparent animationType="slide" visible onRequestClose={() => setShowTimePicker(false)}>
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerCard}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Select Time</Text>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={time}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      style={styles.iosPicker}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker value={time} mode="time" display="default" onChange={handleTimeChange} />
            )}

            <Text style={styles.formFieldLabel}>How should we remind you?</Text>
            <View style={styles.channelGroup}>
              {(['text', 'email'] as NotificationChannel[]).map(channel => {
                const selected = notificationChannel === channel;
                return (
                  <TouchableOpacity
                    key={channel}
                    style={[styles.channelTile, selected && styles.channelTileSelected]}
                    onPress={() => setNotificationChannel(channel)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                    <Ionicons
                      name={channel === 'text' ? 'chatbubble-outline' : 'mail-outline'}
                      size={18}
                      color={selected ? '#007AFF' : '#6B7280'}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.channelLabel, selected && styles.channelLabelSelected]}>
                      {channel === 'text' ? 'Text message' : 'Email'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {saveError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, (!canSubmit || saving) && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {existing_plan_id != null ? 'Update reminder' : 'Save weekly plan'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  screenSubtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 28 },

  loadingRow: { paddingVertical: 32, alignItems: 'center' },

  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  dayRow: { gap: 8, paddingBottom: 4, marginBottom: 24 },
  dayTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayTileSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  dayTileLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dayTileLabelSelected: { color: '#FFFFFF' },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  pickerButtonText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1F2937' },

  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pickerDone: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  iosPicker: { width: '100%' },

  channelGroup: { gap: 10 },
  channelTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  channelTileSelected: { backgroundColor: '#EFF6FF', borderColor: '#007AFF' },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: { borderColor: '#007AFF' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF' },
  channelLabel: { fontSize: 16, fontWeight: '500', color: '#374151' },
  channelLabelSelected: { color: '#1D4ED8' },

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

  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
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
  primaryButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

export default WeeklyReminderSetup;
