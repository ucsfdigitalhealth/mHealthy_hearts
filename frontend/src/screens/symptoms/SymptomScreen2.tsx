import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomScreen2'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomScreen2'>;

const ACTIVITIES = [
  'Sitting',
  'Standing',
  'Walking',
  'Lying down',
  'Sleeping',
  'Exercising',
  'Other',
];

const SymptomScreen2: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_key, symptom_label, tracking_type, safety_modal_shown } = route.params;

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleActivity = (activity: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(activity)) {
        next.delete(activity);
      } else {
        next.add(activity);
      }
      return next;
    });
  };

  const canProceed = selected.size > 0;

  const handleNext = () => {
    navigation.navigate('SymptomScreen3', {
      symptom_key,
      symptom_label,
      tracking_type,
      safety_modal_shown,
      activities: Array.from(selected),
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
        <Text style={styles.screenTitle}>What were you doing?</Text>
        <Text style={styles.screenSubtitle}>
          Select all that apply when you noticed{' '}
          <Text style={styles.symptomHighlight}>{symptom_label.toLowerCase()}</Text>.
        </Text>

        <View style={styles.activityList}>
          {ACTIVITIES.map(activity => {
            const isSelected = selected.has(activity);
            return (
              <TouchableOpacity
                key={activity}
                style={[styles.activityTile, isSelected && styles.activityTileSelected]}
                onPress={() => toggleActivity(activity)}
                activeOpacity={0.7}
              >
                <Text style={[styles.activityLabel, isSelected && styles.activityLabelSelected]}>
                  {activity}
                </Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {!canProceed && (
          <Text style={styles.hintText}>Select at least one activity to continue.</Text>
        )}
      </ScrollView>

      {/* Footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>Next</Text>
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
  activityList: {
    gap: 12,
  },
  activityTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityTileSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  activityLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: '#374151',
  },
  activityLabelSelected: {
    color: '#1D4ED8',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  hintText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
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
  nextButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SymptomScreen2;
