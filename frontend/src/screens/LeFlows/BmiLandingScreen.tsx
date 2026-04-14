import React, { useState, useCallback } from 'react';
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

const TEAL      = '#41a39d';
const TEAL_DARK = '#65b2ad';

const BMI_BASE = 'http://localhost:3000/api/bmi';

const SCORING_ROWS = [
  { label: 'BMI 18.5–24.9',  sub: 'EXCELLENT (Healthy Weight)',  pts: 100, dot: '#059669' },
  { label: 'BMI 25.0–29.9',  sub: 'FAIR (Overweight)',           pts: 66,  dot: '#F59E0B' },
  { label: 'BMI ≥ 30',       sub: 'POOR (Obese)',                pts: 33,  dot: '#DC2626' },
  { label: 'BMI < 18.5',     sub: 'POOR (Underweight)',          pts: 33,  dot: '#5AC8FA' },
];

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getBmiCategory = (bmi: number | null): string => {
  if (bmi === null) return '—';
  if (bmi < 18.5) return 'Underweight';
  if (bmi <= 24.9) return 'Healthy Weight';
  if (bmi <= 29.9) return 'Overweight';
  return 'Obese';
};

const getScoreColor = (score: number): string => {
  if (score >= 75) return '#059669';
  if (score >= 50) return '#F59E0B';
  return '#DC2626';
};

type BmiRecord = { value: number; score: number; date: string };

const BmiLandingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const [mostRecent, setMostRecent] = useState<BmiRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<BmiRecord[]>([]);
  const [average, setAverage] = useState<number | null>(null);

  const fetchStats = useCallback(() => {
    if (!accessToken) return;
    fetch(`${BMI_BASE}/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        setMostRecent(data.mostRecent ?? null);
        setRecentRecords(data.recentRecords ?? []);
        setAverage(data.average ?? null);
      })
      .catch(err => console.error('Error fetching BMI stats:', err));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const trendLabel = (() => {
    if (!mostRecent || average === null) return null;
    if (mostRecent.value > average) return { arrow: '↑', text: 'Higher than avg (worse)' };
    if (mostRecent.value < average) return { arrow: '↓', text: 'Lower than avg (better)' };
    return { arrow: '–', text: 'Equal to average' };
  })();

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
            Your Body Mass Index (BMI) is calculated from your height and weight. It is a screening tool used to categorize weight status. A healthy BMI is between 18.5 and 24.9.
          </Text>
        </View>

        {/* Take Assessment button */}
        <TouchableOpacity
          style={styles.assessBtn}
          onPress={() => navigation.navigate('Bmi')}
          activeOpacity={0.8}
        >
          <Text style={styles.assessBtnText}>Take Assessment</Text>
        </TouchableOpacity>

        {/* YOUR STATS teal card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>

          {/* Most Recent BMI */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Most Recent BMI</Text>
              <Text style={styles.statSub}>
                {mostRecent
                  ? `${getBmiCategory(mostRecent.value)} · ${formatDate(mostRecent.date)}`
                  : 'No data yet'}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {mostRecent !== null ? mostRecent.value.toFixed(1) : '—'}
              </Text>
            </View>
          </View>

          {/* Average BMI */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>All-time Average BMI</Text>
              {trendLabel ? (
                <View style={styles.trendRow}>
                  <Text style={styles.trendArrow}>{trendLabel.arrow}</Text>
                  <Text style={styles.statSub}>{trendLabel.text}</Text>
                </View>
              ) : (
                <Text style={styles.statSub}>No data yet</Text>
              )}
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {average !== null ? average.toFixed(1) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Records */}
        <Text style={styles.sectionTitle}>BMI Assessments</Text>

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
                      <Text style={styles.recordMetricValue}>{record.value.toFixed(1)}</Text>
                      <Text style={styles.recordMetricLabel}>BMI</Text>
                    </View>
                    <View style={styles.recordRight}>
                      <Text style={styles.recordCategory}>{getBmiCategory(record.value)}</Text>
                      <View style={[styles.recordScorePill, { backgroundColor: scoreColor }]}>
                        <Text style={styles.recordScoreText}>{record.score} pts</Text>
                      </View>
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

        <Text style={styles.footnote}>BMI is a screening tool, not a diagnostic measure. Other factors like muscle mass may affect interpretation.</Text>

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
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  recordBody: {
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
  recordRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  recordCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  recordScorePill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  recordScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
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
    fontSize: 15,
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
    lineHeight: 19,
  },
});

export default BmiLandingScreen;
