import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { logDisclaimer } from '../api/symptoms';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Symptoms'>;

interface Symptom {
  key: string;
  label: string;
  tracking_type: 'event_log_only' | 'event_log_ema';
  acute: boolean;
}

const SYMPTOMS: Symptom[] = [
  { key: 'chest_pain',                label: 'Chest pain',                        tracking_type: 'event_log_only', acute: true },
  { key: 'fainted',                   label: 'Fainted or near-fainted',            tracking_type: 'event_log_only', acute: true },
  { key: 'irregular_heartbeat',       label: 'Irregular heartbeat',                tracking_type: 'event_log_only', acute: true },
  { key: 'racing_heart',              label: 'Racing heart',                       tracking_type: 'event_log_only', acute: true },
  { key: 'light_headed',              label: 'Light headed / dizzy',               tracking_type: 'event_log_only', acute: true },
  { key: 'fatigue',                   label: 'Fatigue',                            tracking_type: 'event_log_ema',  acute: false },
  { key: 'anxiety',                   label: 'Anxiety',                            tracking_type: 'event_log_ema',  acute: false },
  { key: 'depression_mood',           label: 'Depression / mood changes',          tracking_type: 'event_log_ema',  acute: false },
  { key: 'sleep_disturbance',         label: 'Sleep disturbance',                  tracking_type: 'event_log_ema',  acute: false },
  { key: 'breathlessness_activity',   label: 'Breathlessness with activity',       tracking_type: 'event_log_ema',  acute: false },
  { key: 'waking_sob_night',          label: 'Waking short of breath at night',    tracking_type: 'event_log_ema',  acute: false },
  { key: 'reduced_exercise_tolerance',label: 'Reduced exercise tolerance',         tracking_type: 'event_log_ema',  acute: false },
  { key: 'leg_swelling',              label: 'Leg swelling',                       tracking_type: 'event_log_ema',  acute: false },
  { key: 'weight_change',             label: 'Unintentional weight change',        tracking_type: 'event_log_ema',  acute: false },
  { key: 'stress',                    label: 'Stress',                             tracking_type: 'event_log_ema',  acute: false },
];

const DISCLAIMER_TEXT_PARTS = {
  before911: 'In an emergency, ',
  link911: 'call 911',
  after911: ' first. This app does not contact your doctor or send help. Log your symptoms after you are safe.',
};

const DisclaimerBanner: React.FC = () => (
  <View style={styles.banner}>
    <Ionicons name="warning" size={18} color="#B45309" style={styles.bannerIcon} />
    <Text style={styles.bannerText}>
      {DISCLAIMER_TEXT_PARTS.before911}
      <Text
        style={styles.bannerLink}
        onPress={() => Linking.openURL('tel:911')}
      >
        {DISCLAIMER_TEXT_PARTS.link911}
      </Text>
      {DISCLAIMER_TEXT_PARTS.after911}
    </Text>
  </View>
);

const SymptomScreen1: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { accessToken } = useAuth();
  const [acuteModalVisible, setAcuteModalVisible] = useState(false);
  const [pendingSymptom, setPendingSymptom] = useState<Symptom | null>(null);

  useEffect(() => {
    logDisclaimer(accessToken, 'section_entry');
  }, [accessToken]);

  const handleSymptomPress = (symptom: Symptom) => {
    if (symptom.acute) {
      setPendingSymptom(symptom);
      setAcuteModalVisible(true);
      logDisclaimer(accessToken, 'acute_symptom_modal');
    } else {
      navigateToScreen2(symptom, false);
    }
  };

  const handleAcuteModalOk = () => {
    setAcuteModalVisible(false);
    if (pendingSymptom) {
      navigateToScreen2(pendingSymptom, true);
      setPendingSymptom(null);
    }
  };

  const navigateToScreen2 = (symptom: Symptom, safetyModalShown: boolean) => {
    navigation.navigate('SymptomScreen2', {
      symptom_key: symptom.key,
      symptom_label: symptom.label,
      tracking_type: symptom.tracking_type,
      safety_modal_shown: safetyModalShown,
    });
  };

  const acuteSymptoms = SYMPTOMS.filter(s => s.acute);
  const ongoingSymptoms = SYMPTOMS.filter(s => !s.acute);

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
        {/* Safety disclaimer banner — always visible */}
        <DisclaimerBanner />

        <Text style={styles.screenTitle}>How are you feeling?</Text>
        <Text style={styles.screenSubtitle}>Select the symptom you want to log.</Text>

        {/* Acute symptoms */}
        <View style={styles.symptomGroup}>
          {acuteSymptoms.map(symptom => (
            <TouchableOpacity
              key={symptom.key}
              style={[styles.symptomTile, styles.symptomTileAcute]}
              onPress={() => handleSymptomPress(symptom)}
              activeOpacity={0.7}
            >
              <View style={styles.symptomTileInner}>
                <View style={[styles.acuteDot]} />
                <Text style={styles.symptomLabel}>{symptom.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider between groups */}
        <View style={styles.groupDivider} />

        {/* Ongoing symptoms */}
        <View style={styles.symptomGroup}>
          {ongoingSymptoms.map(symptom => (
            <TouchableOpacity
              key={symptom.key}
              style={styles.symptomTile}
              onPress={() => handleSymptomPress(symptom)}
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

      {/* Acute symptom safety modal */}
      <Modal
        visible={acuteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRow}>
              <Ionicons name="warning" size={36} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Important Safety Notice</Text>
            <Text style={styles.modalBody}>
              {'In an emergency, '}
              <Text
                style={styles.modalLink}
                onPress={() => Linking.openURL('tel:911')}
              >
                call 911
              </Text>
              {' first. This app does not contact your doctor or send help. Log your symptoms after you are safe.'}
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleAcuteModalOk}>
              <Text style={styles.modalButtonText}>I Understand — Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  // --- Disclaimer banner ---
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  bannerIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  bannerLink: {
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // --- Screen title ---
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  // --- Symptom tiles ---
  symptomGroup: {
    gap: 10,
  },
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
  symptomTileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  acuteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 12,
  },
  ongoingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  symptomLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  groupDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  // --- Acute symptom modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalBody: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  modalLink: {
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default SymptomScreen1;
