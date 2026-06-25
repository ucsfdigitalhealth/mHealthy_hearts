import React, { useState } from 'react';
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
import { postEmaEnrollment } from '../../api/symptoms';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'DailyReminderSetup'>;
type RoutePropType = RouteProp<RootStackParamList, 'DailyReminderSetup'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function timeApiToDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return toTimeDisplay(d);
}

function toDateApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDateDisplay(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDailyTimesSummary(times: string[], startDate: Date, endDate: Date | null): string {
  const timeDisplays = [...times].sort().map(timeApiToDisplay);
  let timesPart: string;
  if (timeDisplays.length === 1) timesPart = `at ${timeDisplays[0]}`;
  else if (timeDisplays.length === 2) timesPart = `at ${timeDisplays[0]} and ${timeDisplays[1]}`;
  else timesPart = `at ${timeDisplays.slice(0, -1).join(', ')}, and ${timeDisplays[timeDisplays.length - 1]}`;

  const datePart = endDate
    ? `from ${toDateDisplay(startDate)} through ${toDateDisplay(endDate)}`
    : `starting ${toDateDisplay(startDate)}`;

  return `daily ${timesPart}, ${datePart}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Component ───────────────────────────────────────────────────────────────

const DailyReminderSetup: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_event_id, symptom_key, symptom_label } = route.params;
  const { accessToken } = useAuth();

  // ── Time slots ──
  const [times, setTimes] = useState<string[]>([]);
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [pendingTime, setPendingTime] = useState<Date>(defaultTime);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Date range ──
  const [startDate, setStartDate] = useState<Date>(startOfToday);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date>(startOfToday);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // ── Submission ──
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const endDateValid = !hasEndDate || endDate.getTime() >= startDate.getTime();
  const canSubmit = times.length > 0 && endDateValid;

  // ─── Add a time slot ─────────────────────────────────────────────────────
  const handleAddTime = () => {
    const apiTime = toTimeApi(pendingTime);
    if (!times.includes(apiTime)) {
      setTimes(prev => [...prev, apiTime].sort());
    }
    setPendingTime(defaultTime());
    setIsAddingTime(false);
    setSaveError(null);
  };

  const handleRemoveTime = (time: string) => {
    setTimes(prev => prev.filter(t => t !== time));
  };

  // ─── Pickers ──────────────────────────────────────────────────────────────
  const handleTimeChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    if (picked) setPendingTime(picked);
  };

  const handleStartDateChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowStartDatePicker(false);
    if (event.type === 'dismissed') return;
    if (picked) {
      setStartDate(picked);
      setSaveError(null);
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowEndDatePicker(false);
    if (event.type === 'dismissed') return;
    if (picked) {
      setEndDate(picked);
      setSaveError(null);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || !accessToken) return;
    setSaving(true);
    setSaveError(null);
    try {
      await postEmaEnrollment(accessToken, {
        symptom_event_id,
        symptom_key,
        frequency: 'ongoing',
        schedule_type: 'daily_times',
        schedule: { times },
        start_date: toDateApi(startDate),
        ...(hasEndDate ? { end_date: toDateApi(endDate) } : {}),
      });
      navigation.navigate('SymptomConfirmation', {
        enrollmentSummary: formatDailyTimesSummary(times, startDate, hasEndDate ? endDate : null),
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
        <Text style={styles.screenTitle}>Set up reminders</Text>
        <Text style={styles.screenSubtitle}>
          We'll remind you to check in on{' '}
          <Text style={styles.highlight}>{symptom_label.toLowerCase()}</Text>
          {' '}at these times each day.
        </Text>

        {/* ── Times list ── */}
        <Text style={styles.sectionTitle}>Times of day</Text>
        {times.length > 0 && (
          <View style={styles.slotList}>
            {times.map(time => (
              <View key={time} style={styles.slotRow}>
                <View style={styles.slotBadge}>
                  <Ionicons name="time-outline" size={16} color="#007AFF" style={styles.slotIcon} />
                  <Text style={styles.slotText}>{timeApiToDisplay(time)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveTime(time)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {!isAddingTime ? (
          <TouchableOpacity
            style={styles.addSlotButton}
            onPress={() => setIsAddingTime(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.addSlotButtonText}>
              {times.length === 0 ? 'Add a reminder time' : 'Add another time'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addForm}>
            <View style={styles.addFormHeader}>
              <Text style={styles.addFormTitle}>New reminder time</Text>
              <TouchableOpacity onPress={() => setIsAddingTime(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color="#007AFF" />
              <Text style={styles.pickerButtonText}>{toTimeDisplay(pendingTime)}</Text>
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
                      value={pendingTime}
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
              <DateTimePicker value={pendingTime} mode="time" display="default" onChange={handleTimeChange} />
            )}

            <TouchableOpacity style={styles.addConfirmButton} onPress={handleAddTime}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addConfirmButtonText}>Add this time</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Date range ── */}
        <Text style={styles.sectionTitle}>Date range</Text>

        <Text style={styles.formFieldLabel}>Start date</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowStartDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color="#007AFF" />
          <Text style={styles.pickerButtonText}>{toDateDisplay(startDate)}</Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        {Platform.OS === 'ios' && showStartDatePicker && (
          <Modal transparent animationType="slide" visible onRequestClose={() => setShowStartDatePicker(false)}>
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Start Date</Text>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  minimumDate={startOfToday()}
                  onChange={handleStartDateChange}
                  style={styles.iosPicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'android' && showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={startOfToday()}
            onChange={handleStartDateChange}
          />
        )}

        <Text style={styles.formFieldLabel}>End date</Text>

        {!hasEndDate ? (
          <TouchableOpacity
            style={styles.setEndDateButton}
            onPress={() => {
              setHasEndDate(true);
              setShowEndDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color="#007AFF" />
            <Text style={styles.setEndDateButtonText}>Set end date</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.endDateRow}>
              <TouchableOpacity
                style={[styles.pickerButton, styles.endDatePickerButton]}
                onPress={() => setShowEndDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#007AFF" />
                <Text style={styles.pickerButtonText}>{toDateDisplay(endDate)}</Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeEndDateButton}
                onPress={() => setHasEndDate(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {Platform.OS === 'ios' && showEndDatePicker && (
              <Modal transparent animationType="slide" visible onRequestClose={() => setShowEndDatePicker(false)}>
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerCard}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>End Date</Text>
                      <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                        <Text style={styles.pickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="spinner"
                      minimumDate={startDate}
                      onChange={handleEndDateChange}
                      style={styles.iosPicker}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === 'android' && showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                minimumDate={startDate}
                onChange={handleEndDateChange}
              />
            )}

            {!endDateValid && (
              <Text style={styles.fieldError}>End date must be on or after the start date.</Text>
            )}
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
              {`Set up ${times.length === 1 ? '1 reminder' : `${times.length} reminders`} a day`}
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
  screenSubtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 24 },
  highlight: { color: '#007AFF', fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 8 },

  // ── Saved slot rows ──
  slotList: { gap: 10, marginBottom: 14 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  slotBadge: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  slotIcon: { marginRight: 8 },
  slotText: { fontSize: 15, fontWeight: '500', color: '#1D4ED8', flex: 1 },
  removeButton: { marginLeft: 8 },

  // ── Add slot button (collapsed) ──
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 24,
  },
  addSlotButtonText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },

  // ── Add slot form (expanded) ──
  addForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 24,
  },
  addFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFormTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  addConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
  },
  addConfirmButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // ── Date range ──
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  setEndDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  setEndDateButtonText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  endDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  endDatePickerButton: { flex: 1 },
  removeEndDateButton: { marginBottom: 16 },
  fieldError: { fontSize: 13, color: '#DC2626', marginTop: -4, marginBottom: 8 },

  // ── Shared picker button ──
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
    marginBottom: 16,
  },
  pickerButtonText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1F2937' },

  // ── iOS picker modal ──
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

  // ── Error banner ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  errorBannerText: { flex: 1, fontSize: 14, color: '#DC2626', lineHeight: 20 },

  // ── Footer ──
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

export default DailyReminderSetup;
