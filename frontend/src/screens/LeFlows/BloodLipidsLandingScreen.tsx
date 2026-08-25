import { API_ORIGIN } from '../../config/api';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCORING_ROWS = [
  { range: '<130',    label: 'EXCELLENT', pts: 100, dot: '#34C759' },
  { range: '130–159', label: 'GREAT',     pts: 75,  dot: '#3B82F6' },
  { range: '160–189', label: 'GOOD',      pts: 50,  dot: '#F59E0B' },
  { range: '190–219', label: 'FAIR',      pts: 25,  dot: '#F97316' },
  { range: '>220',    label: 'POOR',      pts: 0,   dot: '#DC2626' },
];

const BLOOD_LIPIDS_BASE = `${API_ORIGIN}/api/blood-lipids`;

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type BLRecord = { value: number; score: number; date: string };

const getScoreColor = (score: number): string => {
  if (score >= 100) return '#34C759';
  if (score >= 75)  return '#3B82F6';
  if (score >= 50)  return '#F59E0B';
  if (score >= 25)  return '#F97316';
  return '#DC2626';
};

const BloodLipidsLandingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const [mostRecentValue, setMostRecentValue] = useState<number | null>(null);
  const [mostRecentDate, setMostRecentDate] = useState<string | null>(null);
  // recentRecords contains the last 3 blood lipid records (with value, score, and date) for the user, used for showing trends and history
  const [recentRecords, setRecentRecords] = useState<BLRecord[]>([]);
  const [average, setAverage] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!accessToken) return;
      fetch(`${BLOOD_LIPIDS_BASE}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => r.json())
        .then(data => {
          setMostRecentValue(data.mostRecent?.value ?? null);
          setMostRecentDate(data.mostRecent?.date ?? null);
          setRecentRecords(data.recentRecords ?? []);
          setAverage(data.average ?? null);
        })
        .catch(err => console.error('Error fetching blood lipids stats:', err));
    }, [accessToken])
  );

  const trendLabel = (() => {
    if (mostRecentValue === null || average === null) return null;
    if (mostRecentValue > average) return { arrow: '↑', text: 'Higher than 3-record avg' };
    if (mostRecentValue < average) return { arrow: '↓', text: 'Lower than 3-record avg' };
    return { arrow: '–', text: 'Equal to 3-record avg' };
  })();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Measurements card */}
        <View style={styles.measureCard}>
          <Text style={styles.measureTitle}>Measurements</Text>
          <Text style={styles.measureBody}>
            Your Blood Lipids Score is measured by looking at your plasma total and Non-HDL cholesterol.
          </Text>
        </View>

        {/* Take Assessment button */}
        <TouchableOpacity
          style={styles.assessBtn}
          onPress={() => navigation.navigate('BloodLipids')}
          activeOpacity={0.8}
        >
          <Text style={styles.assessBtnText}>Take Assessment</Text>
        </TouchableOpacity>

        {/* YOUR STATS teal card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>

          {/* Most Recent BL */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Most Recent BL</Text>
              <Text style={styles.statSub}>
                {mostRecentDate ? formatDate(mostRecentDate) : 'No data yet'}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {mostRecentValue !== null ? mostRecentValue : '—'}
              </Text>
            </View>
          </View>

          {/* 3-Record Average */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>All-time Average</Text>
              {trendLabel && (
                <View style={styles.trendRow}>
                  <Text style={styles.trendArrow}>{trendLabel.arrow}</Text>
                  <Text style={styles.statSub}>{trendLabel.text}</Text>
                </View>
              )}
              {!trendLabel && (
                <Text style={styles.statSub}>No data yet</Text>
              )}
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {average !== null ? average : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Records */}
        <Text style={styles.sectionTitle}>Blood Lipids Assessments</Text>

        {recentRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No assessments recorded yet.</Text>
          </View>
        ) : (
          recentRecords.map((record, i) => {
            const scoreColor = getScoreColor(record.score);
            return (
              <View key={i} style={styles.recordTile}>
                <View style={styles.recordBody}>
                  <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                  <View style={styles.recordMetrics}>
                    <View style={styles.recordMetricBlock}>
                      <Text style={styles.recordMetricValue}>{record.value}</Text>
                      <Text style={styles.recordMetricLabel}>mg/dL</Text>
                    </View>
                    <View style={[styles.recordScorePill, { backgroundColor: scoreColor }]}>
                      <Text style={styles.recordScoreText}>{record.score} pts</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Scoring System */}
        <Text style={styles.sectionTitle}>Scoring System</Text>

        <View style={styles.scoringCard}>
          {SCORING_ROWS.map((row, i) => (
            <View
              key={i}
              style={[
                styles.scoringRow,
                i === 0 && styles.scoringRowFirst,
                i === SCORING_ROWS.length - 1 && styles.scoringRowLast,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: row.dot }]} />
              <View style={styles.scoringInfo}>
                <Text style={styles.scoringRange}>{row.range}</Text>
                <Text style={styles.scoringLabel}>{row.label}</Text>
              </View>
              <View style={styles.ptsPill}>
                <Text style={styles.ptsText}>{row.pts} pts</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>*If drug-treated level, subtract 20 pts.</Text>

      </ScrollView>
    </SafeAreaView>
  );
};

const TEAL = '#41a39d';
const TEAL_DARK = '#65b2ad';

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

  // Measurements card
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

  // Take Assessment button
  assessBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  assessBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // YOUR STATS teal card
  statsCard: {
    backgroundColor: TEAL,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#4459d5',
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
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendArrow: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
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
  statPillText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Section title
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },

  // Recent record tiles
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  recordTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  recordAccent: {
    width: 6,
  },
  recordBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  recordDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recordMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordMetricBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  recordMetricValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
  },
  recordMetricLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  recordScorePill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recordScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
  scoringRowFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  scoringRowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 14,
  },
  scoringInfo: {
    flex: 1,
  },
  scoringRange: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  scoringLabel: {
    fontSize: 12,
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
    marginBottom: 8,
  },
});

export default BloodLipidsLandingScreen;
