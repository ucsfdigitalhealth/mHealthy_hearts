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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';

// @react-native-community/datetimepicker is bundled with Expo SDK 54.
// If you get an import error, run: cd frontend && npx expo install @react-native-community/datetimepicker
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomScreen3'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomScreen3'>;

interface DurationOption {
  label: string;
  value: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { label: '1 min or less',    value: '1_min_or_less' },
  { label: '10 min or less',   value: '10_min_or_less' },
  { label: '1 hour or less',   value: '1_hour_or_less' },
  { label: 'More than 1 hour', value: 'more_than_1_hour' },
];

function formatDateTime(date: Date): string {
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today at ${timeStr}`;
  if (isYesterday) return `Yesterday at ${timeStr}`;

  const dateStr = date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  return `${dateStr} at ${timeStr}`;
}

const SymptomScreen3: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_key, symptom_label, tracking_type, safety_modal_shown, activities } = route.params;
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [isFuture, setIsFuture] = useState(false);
  const [durationBucket, setDurationBucket] = useState<string | null>(null);

  // DateTimePicker visibility — iOS shows inline, Android shows modally
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (_event.type === 'dismissed') return;
      if (selected) {
        // On Android, after date pick show time pick
        const merged = new Date(occurredAt);
        merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        if (merged > new Date()) {
          setIsFuture(true);
        } else {
          setIsFuture(false);
          setOccurredAt(merged);
          setShowTimePicker(true);
        }
      }
    } else {
      if (selected) {
        if (selected > new Date()) {
          setIsFuture(true);
        } else {
          setIsFuture(false);
          setOccurredAt(selected);
        }
      }
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(false);
    if (_event.type === 'dismissed') return;
    if (selected) {
      if (selected > new Date()) {
        setIsFuture(true);
      } else {
        setIsFuture(false);
        setOccurredAt(selected);
      }
    }
  };

  const canSave = durationBucket !== null && !isFuture;

  const handleSave = () => {
    if (!canSave) return;
    // Pass all data to SymptomsIntensity, which collects the intensity field
    // and submits the event so the payload is complete.
    navigation.navigate('SymptomsIntensity', {
      symptom_key,
      symptom_label,
      tracking_type,
      safety_modal_shown,
      activities,
      occurred_at: occurredAt.toISOString(),
      duration_bucket: durationBucket!,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>When? How long?</Text>

        {/* ─── When? ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>When did this happen?</Text>
          <TouchableOpacity
            style={[styles.dateTimeButton, isFuture && styles.dateTimeButtonError]}
            onPress={() => {
              if (Platform.OS === 'android') {
                setShowDatePicker(true);
              } else {
                setShowDatePicker(true);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={isFuture ? '#DC2626' : '#007AFF'} />
            <Text style={[styles.dateTimeText, isFuture && styles.dateTimeTextError]}>
              {formatDateTime(occurredAt)}
            </Text>
            <Ionicons name="pencil-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          {isFuture && (
            <Text style={styles.futureError}>
              Time cannot be in the future. Please choose a past time.
            </Text>
          )}

          {/* iOS: inline picker */}
          {Platform.OS === 'ios' && showDatePicker && (
            <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModalCard}>
                  <View style={styles.pickerModalHeader}>
                    <Text style={styles.pickerModalTitle}>Select Date & Time</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={occurredAt}
                    mode="datetime"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                    style={styles.iosPicker}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Android: native date picker */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={occurredAt}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={occurredAt}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* ─── How long? ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How long did it last?</Text>
          <View style={styles.durationGroup}>
            {DURATION_OPTIONS.map(opt => {
              const isSelected = durationBucket === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.durationTile, isSelected && styles.durationTileSelected]}
                  onPress={() => setDurationBucket(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>Next</Text>
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
    paddingBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 28,
  },
  // --- Sections ---
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 14,
  },
  // --- Date/time button ---
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dateTimeButtonError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  dateTimeTextError: {
    color: '#DC2626',
  },
  futureError: {
    marginTop: 8,
    fontSize: 13,
    color: '#DC2626',
    fontStyle: 'italic',
  },
  // --- iOS picker modal ---
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  iosPicker: {
    width: '100%',
  },
  // --- Duration ---
  durationGroup: {
    gap: 12,
  },
  durationTile: {
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
  durationTileSelected: {
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
    justifyContent: 'center',
    alignItems: 'center',
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
  durationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  durationLabelSelected: {
    color: '#1D4ED8',
  },
  // --- Footer ---
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  saveButton: {
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
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SymptomScreen3;
