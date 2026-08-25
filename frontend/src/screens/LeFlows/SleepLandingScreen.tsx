import { API_ORIGIN } from '../../config/api';
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
import { useFitbitAuth } from '../../context/FitbitAuthContext';
import { getDeviceTimezone } from '../../utils/localDate';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TEAL      = '#41a39d';
const TEAL_DARK = '#65b2ad';

const HEALTH_SCORES_BASE = `${API_ORIGIN}/api/health-scores`;
const FITBIT_SLEEP_BASE  = `${API_ORIGIN}/api/fitbitAuth/fitbit/sleep`;

const CHART_H = 130;
const Y_TICKS = [100, 75, 50, 25, 0];

type BarPoint = { score: number | null };

const PERIOD_LABEL: Record<'week' | 'month' | 'year', string> = {
  week:  'WEEK TO DATE',
  month: 'MONTH TO DATE',
  year:  'YEAR TO DATE',
};

const SCORING_ROWS = [
  { label: '7–9 hours/night',    sub: 'EXCELLENT (Ideal Range)', pts: 100, dot: '#059669' },
  { label: '6–6.9 or 9–9.9 hrs', sub: 'GOOD',                   pts: 75,  dot: '#3B82F6' },
  { label: '5–5.9 or 10–10.9 hrs', sub: 'FAIR',                 pts: 50,  dot: '#F59E0B' },
  { label: '<5 or ≥11 hours',    sub: 'POOR',                    pts: 0,   dot: '#DC2626' },
];

const getScoreColor = (score: number | null): string => {
  if (score === null) return '#6B7280';
  if (score >= 75) return '#059669';
  if (score >= 50) return '#3B82F6';
  if (score >= 25) return '#F59E0B';
  return '#DC2626';
};

const SleepLandingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const { isConnected: fitbitConnected } = useFitbitAuth();

  const [lastNightHours, setLastNightHours] = useState<number | null>(null);
  const [lastNightScore, setLastNightScore] = useState<number | null>(null);
  const [weeklyAvgHours, setWeeklyAvgHours] = useState<number | null>(null);
  const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'year'>('week');
  const [bars, setBars] = useState<BarPoint[]>([]);

  const fetchTodayData = useCallback(() => {
    if (!accessToken) return;
    const tz = getDeviceTimezone();
    const url = tz
      ? `${FITBIT_SLEEP_BASE}?timezone=${encodeURIComponent(tz)}`
      : FITBIT_SLEEP_BASE;
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(data => {
        if (data.hours != null) setLastNightHours(Number(data.hours));
        if (data.score != null) setLastNightScore(Number(data.score));
        if (data.weeklyAvg != null) setWeeklyAvgHours(Number(data.weeklyAvg));
      })
      .catch(err => console.error('Error fetching sleep:', err));
  }, [accessToken]);

  const fetchChart = useCallback((period: 'week' | 'month' | 'year') => {
    if (!accessToken) return;
    const tz = getDeviceTimezone() || 'UTC';
    fetch(`${HEALTH_SCORES_BASE}/sleep/history?period=${period}&timezone=${encodeURIComponent(tz)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => setBars(data.bars ?? []))
      .catch(() => setBars([]));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchTodayData();
      fetchChart(activePeriod);
    }, [fetchTodayData, fetchChart, activePeriod])
  );

  const trendLabel = (() => {
    if (lastNightHours === null || weeklyAvgHours === null) return null;
    if (lastNightHours > weeklyAvgHours) return { arrow: '↑', text: 'More than 7-day average' };
    if (lastNightHours < weeklyAvgHours) return { arrow: '↓', text: 'Less than 7-day average' };
    return { arrow: '–', text: 'Equal to 7-day average' };
  })();

  const formatHours = (h: number) => `${h.toFixed(1)} hrs`;

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
            Your Sleep score is measured by your nightly sleep duration, synced automatically from your Fitbit device. The ideal range is 7–9 hours per night, as recommended by the American Heart Association's Life's Essential 8 framework.
          </Text>
        </View>


        {/* YOUR STATS teal card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>

          {/* Last Night */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Last Night</Text>
              <Text style={styles.statSub}>
                {!fitbitConnected
                  ? 'Connect your Fitbit device'
                  : lastNightHours === null
                    ? 'Update sleep on the Fitbit App'
                    : `Score: ${lastNightScore ?? '—'} pts`}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {lastNightHours !== null ? lastNightHours.toFixed(1) : '—'}
              </Text>
            </View>
          </View>

          {/* 7-day average */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>7-Day Avg Sleep</Text>
              {trendLabel ? (
                <View style={styles.trendRow}>
                  <Text style={styles.trendArrow}>{trendLabel.arrow}</Text>
                  <Text style={styles.statSub}>{trendLabel.text}</Text>
                </View>
              ) : (
                <Text style={styles.statSub}>
                  {!fitbitConnected ? 'Connect Fitbit to see averages' : 'No data yet'}
                </Text>
              )}
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {weeklyAvgHours !== null ? weeklyAvgHours.toFixed(1) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Your Stats section */}
        <Text style={styles.sectionTitle}>Your Stats</Text>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          <View style={styles.periodRow}>
            {(['week', 'month', 'year'] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, activePeriod === p && styles.periodBtnActive]}
                onPress={() => {
                  setActivePeriod(p);
                  fetchChart(p);
                }}
              >
                <Text style={[styles.periodText, activePeriod === p && styles.periodTextActive]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.periodSubLabel}>{PERIOD_LABEL[activePeriod]}</Text>

          <View style={styles.chartRow}>
            <View style={styles.yAxisCol}>
              {Y_TICKS.map(v => (
                <Text key={v} style={styles.yTickLabel}>{v}</Text>
              ))}
            </View>
            <View style={styles.barsArea}>
              {bars.length > 0 ? bars.map((bar, i) => {
                const hasData = bar.score !== null;
                const h = hasData ? Math.max((bar.score! / 100) * CHART_H, 2) : 0;
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height: h, backgroundColor: getScoreColor(bar.score) }]} />
                  </View>
                );
              }) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>
                    {!fitbitConnected ? 'Connect Fitbit to see data' : 'No historical data available'}
                  </Text>
                </View>
              )}
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

        <Text style={styles.footnote}>Sleep duration is synced automatically from your Fitbit device. Keep your device charged and synced for accurate nightly readings.</Text>

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
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  periodRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  periodBtnActive: {
    backgroundColor: '#BEC2D5',
    borderWidth: 1,
    borderColor: '#8791BF',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#1F2937',
  },
  periodSubLabel: {
    textAlign: 'center',
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 14,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yAxisCol: {
    height: CHART_H,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yTickLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '500',
    lineHeight: 11,
  },
  barsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_H,
    gap: 4,
  },
  barCol: {
    flex: 1,
    height: CHART_H,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  noDataContainer: {
    flex: 1,
    height: CHART_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
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

export default SleepLandingScreen;
