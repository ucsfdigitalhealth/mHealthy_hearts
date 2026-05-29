import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { postWeeklyEnrollment } from '../../api/symptoms';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomsWeeklyReminder'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomsWeeklyReminder'>;

type NotificationChannel = 'text' | 'email';

const DAYS = [
  { label: 'Sun', full: 'Sunday',    plural: 'Sundays',    value: 0 },
  { label: 'Mon', full: 'Monday',    plural: 'Mondays',    value: 1 },
  { label: 'Tue', full: 'Tuesday',   plural: 'Tuesdays',   value: 2 },
  { label: 'Wed', full: 'Wednesday', plural: 'Wednesdays', value: 3 },
  { label: 'Thu', full: 'Thursday',  plural: 'Thursdays',  value: 4 },
  { label: 'Fri', full: 'Friday',    plural: 'Fridays',    value: 5 },
  { label: 'Sat', full: 'Saturday',  plural: 'Saturdays',  value: 6 },
];

function defaultReminderTime(): Date {
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

function nextOccurrence(dayOfWeek: number, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const result = new Date();
  result.setHours(h, m, 0, 0);
  const diff = (dayOfWeek - now.getDay() + 7) % 7;
  result.setDate(now.getDate() + (diff === 0 && result <= now ? 7 : diff));
  return result.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) +
    ' at ' + toTimeDisplay(result);
}

const SymptomsWeeklyReminder: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_key, symptom_label, instrument_response_id } = route.params;
  const { accessToken } = useAuth();

  const [wantsReminder, setWantsReminder] = useState<boolean | null>(null);
  const [channel, setChannel] = useState<NotificationChannel | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [reminderTime, setReminderTime] = useState<Date>(defaultReminderTime);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleTimeChange = (_event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (_event.type === 'dismissed') return;
    if (picked) setReminderTime(picked);
  };

  const canConfirm =
    wantsReminder === true && channel !== null && selectedDay !== null;

  const handleConfirm = async () => {
    if (!canConfirm || !accessToken) return;
    setSaving(true);
    setSaveError(null);
    try {
      await postWeeklyEnrollment(accessToken, {
        instrument_response_id,
        symptom_key,
        frequency: 'weekly',
        schedule: [{ day_of_week: selectedDay!, time: toTimeApi(reminderTime) }],
        notification_channel: channel!,
      });

      const dayObj = DAYS.find(d => d.value === selectedDay);
      const summary = `${dayObj?.plural ?? 'weekly'} at ${toTimeDisplay(reminderTime)}`;
      navigation.navigate('SymptomConfirmation', { enrollmentSummary: summary });
    } catch (err: any) {
      setSaveError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('SymptomConfirmation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>Weekly reminder</Text>
        <Text style={styles.screenSubtitle}>
          Would you like to set up a weekly reminder for your{' '}
          <Text style={styles.highlight}>{symptom_label.toLowerCase()}</Text>
          {' '}check-in?
        </Text>

        {/* Yes / No choice */}
        <View style={styles.yesNoGroup}>
          <TouchableOpacity
            style={[styles.yesNoTile, wantsReminder === true && styles.yesNoTileSelected]}
            onPress={() => setWantsReminder(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color={wantsReminder === true ? '#007AFF' : '#9CA3AF'} />
            <Text style={[styles.yesNoLabel, wantsReminder === true && styles.yesNoLabelSelected]}>
              Yes, remind me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.yesNoTile, wantsReminder === false && styles.yesNoTileSelected]}
            onPress={() => setWantsReminder(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={20} color={wantsReminder === false ? '#007AFF' : '#9CA3AF'} />
            <Text style={[styles.yesNoLabel, wantsReminder === false && styles.yesNoLabelSelected]}>
              No thanks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reminder setup — shown only if yes */}
        {wantsReminder === true && (
          <View style={styles.setupSection}>

            {/* Channel */}
            <Text style={styles.fieldLabel}>How would you like to be reminded?</Text>
            <View style={styles.channelGroup}>
              {(['text', 'email'] as NotificationChannel[]).map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.channelTile, channel === ch && styles.channelTileSelected]}
                  onPress={() => setChannel(ch)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={ch === 'text' ? 'chatbubble-outline' : 'mail-outline'}
                    size={20}
                    color={channel === ch ? '#007AFF' : '#9CA3AF'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.channelLabel, channel === ch && styles.channelLabelSelected]}>
                    {ch === 'text' ? 'Text message' : 'Email'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day of week */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Which day?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRow}
            >
              {DAYS.map(day => {
                const isSelected = selectedDay === day.value;
                return (
                  <TouchableOpacity
                    key={day.value}
                    style={[styles.dayTile, isSelected && styles.dayTileSelected]}
                    onPress={() => setSelectedDay(day.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>What time?</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color="#007AFF" />
              <Text style={styles.timeButtonText}>{toTimeDisplay(reminderTime)}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* iOS time picker */}
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
                      value={reminderTime}
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
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}

            {/* Preview next occurrence */}
            {selectedDay !== null && (
              <View style={styles.previewBox}>
                <Ionicons name="calendar-outline" size={16} color="#007AFF" style={{ marginRight: 8 }} />
                <Text style={styles.previewText}>
                  Next reminder: {nextOccurrence(selectedDay, toTimeApi(reminderTime))}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {saveError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {wantsReminder === true && (
          <TouchableOpacity
            style={[styles.confirmButton, (!canConfirm || saving) && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>Set reminder</Text>
            )}
          </TouchableOpacity>
        )}

        {wantsReminder === false && (
          <TouchableOpacity style={styles.confirmButton} onPress={handleSkip}>
            <Text style={styles.confirmButtonText}>Done</Text>
          </TouchableOpacity>
        )}

        {(wantsReminder === true || wantsReminder === null) && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
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
  screenSubtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 28 },
  highlight: { color: '#007AFF', fontWeight: '600' },

  yesNoGroup: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  yesNoTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  yesNoTileSelected: { backgroundColor: '#EFF6FF', borderColor: '#007AFF' },
  yesNoLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  yesNoLabelSelected: { color: '#1D4ED8' },

  setupSection: {},
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  channelGroup: { flexDirection: 'row', gap: 12 },
  channelTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  channelTileSelected: { backgroundColor: '#EFF6FF', borderColor: '#007AFF' },
  channelLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  channelLabelSelected: { color: '#1D4ED8' },

  dayRow: { gap: 8, paddingBottom: 4, marginBottom: 4 },
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
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dayLabelSelected: { color: '#FFFFFF' },

  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  timeButtonText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1F2937' },

  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
  },
  previewText: { flex: 1, fontSize: 14, color: '#1D4ED8', lineHeight: 20 },

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
    gap: 12,
  },
  confirmButton: {
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
  confirmButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
});

export default SymptomsWeeklyReminder;
