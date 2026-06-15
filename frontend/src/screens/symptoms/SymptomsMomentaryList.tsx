import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomsMomentaryList'>;

interface MomentarySymptom {
  key: string;
  label: string;
  tracking_type: 'event_log_only' | 'event_log_ema';
  acute: boolean;
}

const ACUTE_SYMPTOMS: MomentarySymptom[] = [
  { key: 'chest_pain', label: 'Chest pain', tracking_type: 'event_log_only', acute: true },
  { key: 'fainted', label: 'Fainted or near-fainted', tracking_type: 'event_log_only', acute: true },
  { key: 'irregular_heartbeat', label: 'Irregular heartbeat', tracking_type: 'event_log_only', acute: true },
  { key: 'racing_heart', label: 'Racing heart', tracking_type: 'event_log_only', acute: true },
  { key: 'light_headed', label: 'Light headed / dizzy', tracking_type: 'event_log_only', acute: true },
];

const OTHER_SYMPTOMS: MomentarySymptom[] = [
  { key: 'waking_sob_night', label: 'Waking short of breath at night', tracking_type: 'event_log_ema', acute: false },
  { key: 'leg_swelling', label: 'Leg swelling', tracking_type: 'event_log_ema', acute: false },
  { key: 'weight_change', label: 'Unintentional weight change', tracking_type: 'event_log_ema', acute: false },
];

const SymptomsMomentaryList: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const handlePress = (symptom: MomentarySymptom) => {
    navigation.navigate('SymptomScreen2', {
      symptom_key: symptom.key,
      symptom_label: symptom.label,
      tracking_type: symptom.tracking_type,
      safety_modal_shown: true,
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
        <Text style={styles.screenTitle}>How are you feeling?</Text>
        <Text style={styles.screenSubtitle}>Select the symptom you want to log right now.</Text>

        <View style={styles.symptomGroup}>
          {ACUTE_SYMPTOMS.map(symptom => (
            <TouchableOpacity
              key={symptom.key}
              style={[styles.symptomTile, styles.symptomTileAcute]}
              onPress={() => handlePress(symptom)}
              activeOpacity={0.7}
            >
              <View style={styles.symptomTileInner}>
                <View style={styles.acuteDot} />
                <Text style={styles.symptomLabel}>{symptom.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.groupDivider} />

        <View style={styles.symptomGroup}>
          {OTHER_SYMPTOMS.map(symptom => (
            <TouchableOpacity
              key={symptom.key}
              style={styles.symptomTile}
              onPress={() => handlePress(symptom)}
              activeOpacity={0.7}
            >
              <View style={styles.symptomTileInner}>
                <View style={styles.ongoingDot} />
                <Text style={styles.symptomLabel}>{symptom.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
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
  screenTitle: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  screenSubtitle: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  symptomGroup: { gap: 10 },
  symptomTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  symptomTileAcute: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F7',
  },
  symptomTileInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  acuteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 12 },
  ongoingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF', marginRight: 12 },
  symptomLabel: { fontSize: 16, fontWeight: '500', color: '#1F2937', flex: 1 },
  groupDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
});

export default SymptomsMomentaryList;
