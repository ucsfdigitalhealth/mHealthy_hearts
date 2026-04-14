import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TEAL      = '#41a39d';
const TEAL_DARK = '#65b2ad';

const SCORING_ROWS = [
  { label: 'Systolic <120 and Diastolic <80',        sub: 'OPTIMAL',           pts: 100, dot: '#059669' },
  { label: 'Systolic 120–129 and Diastolic <80',     sub: 'ELEVATED',          pts: 75,  dot: '#3B82F6' },
  { label: 'Systolic 130–139 or Diastolic 80–89',    sub: 'HIGH STAGE 1',      pts: 50,  dot: '#F59E0B' },
  { label: 'Systolic 140–159 or Diastolic 90–99',    sub: 'HIGH STAGE 2',      pts: 25,  dot: '#F97316' },
  { label: 'Systolic ≥160 or Diastolic ≥100',        sub: 'HYPERTENSIVE CRISIS',pts: 0,  dot: '#DC2626' },
];

const BloodPressureLandingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Measurements card */}
        <View style={styles.measureCard}>
          <Text style={styles.measureTitle}>Measurements</Text>
          <Text style={styles.measureBody}>
            Your Blood Pressure score is measured using systolic (upper) and diastolic (lower) readings in mmHg, collected from your Omron blood pressure monitor. Optimal blood pressure is below 120/80 mmHg.
          </Text>
        </View>

        {/* Connect device card */}
        <View style={styles.connectCard}>
          <View style={styles.connectIconRow}>
            <View style={styles.connectIconCircle}>
              <Text style={styles.connectIconText}>🩺</Text>
            </View>
          </View>
          <Text style={styles.connectTitle}>Omron Device Not Connected</Text>
          <Text style={styles.connectBody}>
            Connect your Omron blood pressure monitor to automatically sync readings and track your blood pressure score over time.
          </Text>
          <View style={styles.connectBtnRow}>
            <View style={styles.connectBtnDisabled}>
              <Text style={styles.connectBtnText}>Connect Omron Device</Text>
            </View>
          </View>
          <Text style={styles.connectHint}>Coming soon — Omron integration is in progress.</Text>
        </View>

        {/* YOUR STATS teal card (placeholder) */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>

          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Most Recent Reading</Text>
              <Text style={styles.statSub}>Connect your Omron device</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillPlaceholder}>—</Text>
            </View>
          </View>

          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Average Blood Pressure</Text>
              <Text style={styles.statSub}>No data yet</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillPlaceholder}>—</Text>
            </View>
          </View>
        </View>

        {/* Scoring System */}
        <Text style={styles.sectionTitle}>Scoring System</Text>

        <View style={styles.scoringCard}>
          {SCORING_ROWS.map((row, i) => (
            <View
              key={i}
              style={[
                styles.scoringRow,
                i === SCORING_ROWS.length - 1 && styles.scoringRowLast,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: row.dot }]} />
              <View style={styles.scoringInfo}>
                <Text style={styles.scoringRange}>{row.label}</Text>
                <Text style={styles.scoringLabel}>{row.sub}</Text>
              </View>
              <View style={styles.ptsPill}>
                <Text style={styles.ptsText}>{row.pts} pts</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>*If taking antihypertensive medication, subtract 10 pts from your score.</Text>

        {/* About card */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>What is Blood Pressure?</Text>
          <Text style={styles.aboutBody}>
            Blood pressure is the force of blood pushing against artery walls, measured in two numbers: systolic (when your heart beats) over diastolic (between beats). High blood pressure strains your heart and arteries, increasing risk of heart disease and stroke. Regular monitoring helps catch changes early.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F1F3F9',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '500',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  measureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  measureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  measureBody: {
    fontSize: 15,
    color: '#13233e',
    lineHeight: 22,
  },

  // Connect device card
  connectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  connectIconRow: {
    marginBottom: 16,
  },
  connectIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F3F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectIconText: {
    fontSize: 36,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  connectBody: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  connectBtnRow: {
    width: '100%',
    marginBottom: 12,
  },
  connectBtnDisabled: {
    backgroundColor: '#D1D5DB',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  connectHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // YOUR STATS teal card
  statsCard: {
    backgroundColor: TEAL,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#31849a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  statsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statRow: {
    backgroundColor: TEAL_DARK,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#31849a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  statLeft: {
    flex: 1,
    marginRight: 12,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  statPill: {
    backgroundColor: TEAL_DARK,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    width: 90,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statPillPlaceholder: {
    fontSize: 28,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
  },

  // Section title
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },

  // Scoring system
  scoringCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  scoringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scoringRowLast: {
    borderBottomWidth: 0,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 14,
    flexShrink: 0,
  },
  scoringInfo: {
    flex: 1,
  },
  scoringRange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  scoringLabel: {
    fontSize: 11,
    color: '#8d8d8d',
    fontWeight: '500',
    marginTop: 1,
  },
  ptsPill: {
    backgroundColor: '#EBEEF3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  ptsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  footnote: {
    fontSize: 13,
    color: '#13233e',
    paddingHorizontal: 4,
    marginBottom: 20,
    lineHeight: 19,
  },

  // About card
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  aboutBody: {
    fontSize: 14,
    color: '#13233e',
    lineHeight: 21,
  },
});

export default BloodPressureLandingScreen;
