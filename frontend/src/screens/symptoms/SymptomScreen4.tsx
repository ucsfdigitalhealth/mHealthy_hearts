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
import { postEmaEnrollment } from '../../api/symptoms';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomScreen4'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomScreen4'>;

// ─── Data types ──────────────────────────────────────────────────────────────

interface ScheduleSlot {
  id: string;            // local key for React list rendering
  day_of_week: number;   // 0=Sunday … 6=Saturday
  time: string;          // "HH:MM" — sent to API
  time_display: string;  // "9:00 AM" — shown in UI
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = [
  { label: 'Sun', full: 'Sunday',    plural: 'Sundays',    value: 0 },
  { label: 'Mon', full: 'Monday',    plural: 'Mondays',    value: 1 },
  { label: 'Tue', full: 'Tuesday',   plural: 'Tuesdays',   value: 2 },
  { label: 'Wed', full: 'Wednesday', plural: 'Wednesdays', value: 3 },
  { label: 'Thu', full: 'Thursday',  plural: 'Thursdays',  value: 4 },
  { label: 'Fri', full: 'Friday',    plural: 'Fridays',    value: 5 },
  { label: 'Sat', full: 'Saturday',  plural: 'Saturdays',  value: 6 },
];

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

function formatScheduleSummary(slots: ScheduleSlot[]): string {
  if (slots.length === 0) return '';
  const parts = slots.map(s => {
    const day = DAYS.find(d => d.value === s.day_of_week);
    return `${day?.plural ?? 'weekly'} at ${s.time_display}`;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

// ─── Component ───────────────────────────────────────────────────────────────

const SymptomScreen4: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_event_id, symptom_key, symptom_label } = route.params;
  const { accessToken } = useAuth();

  // Stress uses a separate grant-required protocol — skip Screen 4 entirely.
  useEffect(() => {
    if (symptom_key === 'stress') {
      navigation.replace('SymptomConfirmation');
    }
  }, [symptom_key, navigation]);

  // ── Frequency ──
  type Frequency = 'once' | 'ongoing' | null;
  const [frequency, setFrequency] = useState<Frequency>(null);

  // ── Saved slots ──
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);

  // ── Add-slot form state ──
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const [pendingTime, setPendingTime] = useState<Date>(defaultTime);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Submission ──
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSetUp = frequency === 'ongoing' && slots.length > 0;

  // ─── Add a slot ──────────────────────────────────────────────────────────
  const handleAddSlot = () => {
    if (pendingDay === null) return;
    const newSlot: ScheduleSlot = {
      id: `${pendingDay}-${Date.now()}`,
      day_of_week: pendingDay,
      time: toTimeApi(pendingTime),
      time_display: toTimeDisplay(pendingTime),
    };
    setSlots(prev => [...prev, newSlot]);
    // Reset the form but keep it open so another slot can be added easily
    setPendingDay(null);
    setPendingTime(defaultTime());
    setIsAdding(false);
    setSaveError(null);
  };

  const handleRemoveSlot = (id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  // ─── Time picker ─────────────────────────────────────────────────────────
  const handleTimeChange = (_event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (_event.type === 'dismissed') return;
    if (picked) setPendingTime(picked);
  };

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleOnce = async () => {
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

  const handleSetUpOngoing = async () => {
    if (!canSetUp || !accessToken) return;
    setSaving(true);
    setSaveError(null);
    try {
      await postEmaEnrollment(accessToken, {
        symptom_event_id,
        symptom_key,
        frequency: 'ongoing',
        schedule: slots.map(s => ({ day_of_week: s.day_of_week, time: s.time })),
      });
      navigation.navigate('SymptomConfirmation', {
        enrollmentSummary: formatScheduleSummary(slots),
      });
    } catch (err: any) {
      setSaveError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('SymptomConfirmation');
  };

  if (symptom_key === 'stress') return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
        <Text style={styles.screenTitle}>Once or ongoing?</Text>
        <Text style={styles.screenSubtitle}>
          Is{' '}
          <Text style={styles.symptomHighlight}>{symptom_label.toLowerCase()}</Text>
          {' '}a one-time thing, or something you experience regularly?
        </Text>

        {/* ─── Frequency tiles ─── */}
        <View style={styles.choiceGroup}>
          <TouchableOpacity
            style={[styles.choiceTile, frequency === 'once' && styles.choiceTileSelected]}
            onPress={() => { setFrequency('once'); setSaveError(null); }}
            activeOpacity={0.7}
          >
            <View style={[styles.radioCircle, frequency === 'once' && styles.radioCircleSelected]}>
              {frequency === 'once' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.choiceTextBlock}>
              <Text style={[styles.choiceTitle, frequency === 'once' && styles.choiceTitleSelected]}>
                Just this once
              </Text>
              <Text style={styles.choiceDesc}>Log it and move on — no follow-up check-ins.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceTile, frequency === 'ongoing' && styles.choiceTileSelected]}
            onPress={() => { setFrequency('ongoing'); setSaveError(null); }}
            activeOpacity={0.7}
          >
            <View style={[styles.radioCircle, frequency === 'ongoing' && styles.radioCircleSelected]}>
              {frequency === 'ongoing' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.choiceTextBlock}>
              <Text style={[styles.choiceTitle, frequency === 'ongoing' && styles.choiceTitleSelected]}>
                This is ongoing
              </Text>
              <Text style={styles.choiceDesc}>Set up recurring check-ins to track how you're doing.</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── "Just this once" confirm ─── */}
        {frequency === 'once' && (
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
            onPress={handleOnce}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.primaryButtonText}>Log it</Text>
            }
          </TouchableOpacity>
        )}

        {/* ─── Ongoing: schedule builder ─── */}
        {frequency === 'ongoing' && (
          <View style={styles.scheduleSection}>
            <Text style={styles.scheduleSectionTitle}>When would you like us to check in?</Text>

            {/* Saved slots list */}
            {slots.length > 0 && (
              <View style={styles.slotList}>
                {slots.map((slot, idx) => {
                  const day = DAYS.find(d => d.value === slot.day_of_week);
                  return (
                    <View key={slot.id} style={styles.slotRow}>
                      <View style={styles.slotBadge}>
                        <View style={styles.slotNumberCircle}>
                          <Text style={styles.slotNumber}>{idx + 1}</Text>
                        </View>
                        <Ionicons name="calendar-outline" size={16} color="#007AFF" style={styles.slotIcon} />
                        <Text style={styles.slotText}>
                          {day?.full ?? 'Day'} at {slot.time_display}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveSlot(slot.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={22} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Add-slot form (collapsed/expanded) ── */}
            {!isAdding ? (
              <TouchableOpacity
                style={styles.addSlotButton}
                onPress={() => setIsAdding(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                <Text style={styles.addSlotButtonText}>
                  {slots.length === 0 ? 'Add a check-in time' : 'Add another time'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addForm}>
                {/* Form header */}
                <View style={styles.addFormHeader}>
                  <Text style={styles.addFormTitle}>New check-in time</Text>
                  <TouchableOpacity onPress={() => { setIsAdding(false); setPendingDay(null); }}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Day selector */}
                <Text style={styles.formFieldLabel}>Day</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayRow}
                >
                  {DAYS.map(day => {
                    const selected = pendingDay === day.value;
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[styles.dayTile, selected && styles.dayTileSelected]}
                        onPress={() => setPendingDay(day.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayTileLabel, selected && styles.dayTileLabelSelected]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Time picker */}
                <Text style={styles.formFieldLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color="#007AFF" />
                  <Text style={styles.timeButtonText}>{toTimeDisplay(pendingTime)}</Text>
                  <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {/* iOS time picker modal */}
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

                {/* Android time picker */}
                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={pendingTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}

                {/* Add time confirm */}
                <TouchableOpacity
                  style={[styles.addConfirmButton, pendingDay === null && styles.addConfirmButtonDisabled]}
                  onPress={handleAddSlot}
                  disabled={pendingDay === null}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={pendingDay === null ? '#9CA3AF' : '#FFFFFF'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.addConfirmButtonText, pendingDay === null && styles.addConfirmButtonTextDisabled]}>
                    Add this time
                  </Text>
                </TouchableOpacity>

                {pendingDay === null && (
                  <Text style={styles.addFormHint}>Select a day above to continue.</Text>
                )}
              </View>
            )}

            {/* Set up check-ins */}
            {slots.length > 0 && !isAdding && (
              <TouchableOpacity
                style={[styles.primaryButton, (!canSetUp || saving) && styles.primaryButtonDisabled]}
                onPress={handleSetUpOngoing}
                disabled={!canSetUp || saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.primaryButtonText}>
                      {`Set up ${slots.length === 1 ? '1 check-in' : `${slots.length} check-ins`}`}
                    </Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Error banner */}
        {saveError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        )}

        {/* Skip — always visible */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 52,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 28,
  },
  symptomHighlight: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // ── Frequency tiles ──────────────────────────────────────────────────────
  choiceGroup: {
    gap: 14,
    marginBottom: 28,
  },
  choiceTile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  choiceTileSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 14,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  choiceTextBlock: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  choiceTitleSelected: {
    color: '#1D4ED8',
  },
  choiceDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // ── Schedule section ─────────────────────────────────────────────────────
  scheduleSection: {
    marginBottom: 8,
  },
  scheduleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },

  // ── Saved slot rows ──────────────────────────────────────────────────────
  slotList: {
    gap: 10,
    marginBottom: 14,
  },
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
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slotNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  slotNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  slotIcon: {
    marginRight: 8,
  },
  slotText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D4ED8',
    flex: 1,
  },
  removeButton: {
    marginLeft: 8,
  },

  // ── Add slot button (collapsed state) ───────────────────────────────────
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
    marginBottom: 20,
  },
  addSlotButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },

  // ── Add slot form (expanded state) ──────────────────────────────────────
  addForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 20,
  },
  addFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFormTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  dayRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 20,
  },
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
  dayTileSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayTileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dayTileLabelSelected: {
    color: '#FFFFFF',
  },
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
    marginBottom: 16,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  addConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
  },
  addConfirmButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  addConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addConfirmButtonTextDisabled: {
    color: '#9CA3AF',
  },
  addFormHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // ── iOS picker modal ─────────────────────────────────────────────────────
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  iosPicker: {
    width: '100%',
  },

  // ── Primary button ───────────────────────────────────────────────────────
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
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  // ── Error banner ─────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },

  // ── Skip ─────────────────────────────────────────────────────────────────
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default SymptomScreen4;
