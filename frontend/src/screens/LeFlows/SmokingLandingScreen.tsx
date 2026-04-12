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

const SMOKING_BASE = 'http://localhost:3000/api/smoking';

const SCORING_ROWS = [
  { label: 'Never Smoked',          sub: 'OPTIMAL',       pts: 100, dot: '#059669' },
  { label: 'Former (5+ yrs ago)',   sub: 'OPTIMAL',       pts: 100, dot: '#059669' },
  { label: 'Former (1–5 yrs ago)',  sub: 'LOW RISK',      pts: 75,  dot: '#3B82F6' },
  { label: 'Former (<1 yr ago)',    sub: 'MODERATE RISK', pts: 50,  dot: '#F59E0B' },
  { label: 'Current (rarely)',      sub: 'HIGH RISK',     pts: 25,  dot: '#F97316' },
  { label: 'Current (regularly)',   sub: 'CRITICAL RISK', pts: 0,   dot: '#DC2626' },
];

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCategory = (category: string): string => {
  if (category === 'never') return 'Never Smoked';
  if (category === 'former') return 'Former Smoker';
  if (category === 'current') return 'Current Smoker';
  return category;
};

const getScoreColor = (score: number): string => {
  if (score >= 100) return '#059669';
  if (score >= 75)  return '#3B82F6';
  if (score >= 50)  return '#F59E0B';
  if (score >= 25)  return '#F97316';
  return '#DC2626';
};

type SmokingRecord = { category: string; score: number; date: string };

const SmokingLandingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const [mostRecent, setMostRecent] = useState<SmokingRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<SmokingRecord[]>([]);
  const [average, setAverage] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!accessToken) return;
      fetch(`${SMOKING_BASE}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => r.json())
        .then(data => {
          setMostRecent(data.mostRecent ?? null);
          setRecentRecords(data.recentRecords ?? []);
          setAverage(data.average ?? null);
        })
        .catch(err => console.error('Error fetching smoking stats:', err));
    }, [accessToken])
  );

  const trendLabel = (() => {
    if (!mostRecent || average === null) return null;
    if (mostRecent.score > average) return { arrow: '↑', text: 'Higher than 3-record avg' };
    if (mostRecent.score < average) return { arrow: '↓', text: 'Lower than 3-record avg' };
    return { arrow: '–', text: 'Equal to 3-record avg' };
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
            Your Smoking Score is based on your current or past tobacco and nicotine use status, as well as your nicotine exposure.
          </Text>
        </View>

        {/* Take Assessment button */}
        <TouchableOpacity
          style={styles.assessBtn}
          onPress={() => navigation.navigate('Smoking')}
          activeOpacity={0.8}
        >
          <Text style={styles.assessBtnText}>Take Assessment</Text>
        </TouchableOpacity>

        {/* YOUR STATS card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>

          {/* Most Recent */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Most Recent</Text>
              <Text style={styles.statSub}>
                {mostRecent
                  ? `${formatCategory(mostRecent.category)} · ${formatDate(mostRecent.date)}`
                  : 'No data yet'}
              </Text>
            </View>
            <View style={[
              styles.statPill,
              mostRecent ? { borderColor: getScoreColor(mostRecent.score) } : undefined,
            ]}>
              <Text style={styles.statPillText}>
                {mostRecent !== null ? mostRecent.score : '—'}
              </Text>
            </View>
          </View>

          {/* 3-Record Average */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>3-Record Average</Text>
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
                {average !== null ? average : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Records */}
        <Text style={styles.sectionTitle}>Smoking Assessments</Text>

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
                    <Text style={styles.recordCategory}>
                      {formatCategory(record.category)}
                    </Text>
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

        <Text style={styles.footnote}>*If user faces secondhand smoke exposure within household, subtract 20 pts.</Text>

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
    fontSize: 28,
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
  recordCategory: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
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
  },
});

export default SmokingLandingScreen;
