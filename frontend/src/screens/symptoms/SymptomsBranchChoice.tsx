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

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomsBranchChoice'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomsBranchChoice'>;

type Branch = 'momentary' | 'weekly' | null;

const SymptomsBranchChoice: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { symptom_key, symptom_label, tracking_type } = route.params;

  const [selected, setSelected] = useState<Branch>(null);

  const handleNext = () => {
    if (!selected) return;
    if (selected === 'momentary') {
      navigation.navigate('SymptomScreen2', {
        symptom_key,
        symptom_label,
        tracking_type,
        safety_modal_shown: false,
      });
    } else {
      navigation.navigate('SymptomsInstrument', {
        symptom_key,
        symptom_label,
      });
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Track your symptom</Text>
        <Text style={styles.screenSubtitle}>
          How would you like to track{' '}
          <Text style={styles.highlight}>{symptom_label.toLowerCase()}</Text>?
        </Text>

        <View style={styles.choiceGroup}>
          <TouchableOpacity
            style={[styles.choiceTile, selected === 'momentary' && styles.choiceTileSelected]}
            onPress={() => setSelected('momentary')}
            activeOpacity={0.7}
          >
            <View style={[styles.radioCircle, selected === 'momentary' && styles.radioCircleSelected]}>
              {selected === 'momentary' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.choiceTextBlock}>
              <Text style={[styles.choiceTitle, selected === 'momentary' && styles.choiceTitleSelected]}>
                Right now / momentary
              </Text>
              <Text style={styles.choiceDesc}>
                Log what you're experiencing right now — time, activity, and severity.
              </Text>
            </View>
            <Ionicons name="flash-outline" size={22} color={selected === 'momentary' ? '#007AFF' : '#9CA3AF'} style={styles.choiceIcon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceTile, selected === 'weekly' && styles.choiceTileSelected]}
            onPress={() => setSelected('weekly')}
            activeOpacity={0.7}
          >
            <View style={[styles.radioCircle, selected === 'weekly' && styles.radioCircleSelected]}>
              {selected === 'weekly' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.choiceTextBlock}>
              <Text style={[styles.choiceTitle, selected === 'weekly' && styles.choiceTitleSelected]}>
                Weekly check-in
              </Text>
              <Text style={styles.choiceDesc}>
                Complete a short validated questionnaire about the past week.
              </Text>
            </View>
            <Ionicons name="calendar-outline" size={22} color={selected === 'weekly' ? '#007AFF' : '#9CA3AF'} style={styles.choiceIcon} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !selected && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selected}
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
    marginBottom: 32,
  },
  highlight: {
    color: '#007AFF',
    fontWeight: '600',
  },
  choiceGroup: {
    gap: 14,
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
  choiceIcon: {
    marginLeft: 12,
    marginTop: 2,
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

export default SymptomsBranchChoice;
