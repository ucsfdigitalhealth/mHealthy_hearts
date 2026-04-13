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
import { getDeviceTimezone } from '../../utils/localDate';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TEAL      = '#41a39d';
const TEAL_DARK = '#65b2ad';

const BASE = 'http://localhost:3000/api/health-scores';

const CHART_H = 130;
const Y_TICKS = [100, 75, 50, 25, 0];

const PERIOD_LABEL: Record<'week' | 'month' | 'year', string> = {
  week:  'WEEK TO DATE',
  month: 'MONTH TO DATE',
  year:  'YEAR TO DATE',
};

const SCORING_ROWS = [
  { label: 'Score 75 – 100', sub: 'EXCELLENT', range: '75–100', dot: '#059669' },
  { label: 'Score 50 – 74',  sub: 'GOOD',      range: '50–74',  dot: '#3B82F6' },
  { label: 'Score 25 – 49',  sub: 'FAIR',      range: '25–49',  dot: '#F59E0B' },
  { label: 'Score 0 – 24',   sub: 'POOR',      range: '0–24',   dot: '#DC2626' },
];

type BarPoint = { score: number | null };

type Stats = {
  current: number | null;
  sevenDayAverage: number | null;
  monthAverage: number | null;
  yearAverage: number | null;
  trend: { arrow: string; text: string } | null;
};

const getScoreColor = (score: number | null): string => {
  if (score === null) return '#6B7280';
  if (score >= 75) return '#059669';
  if (score >= 50) return '#3B82F6';
  if (score >= 25) return '#F59E0B';
  return '#DC2626';
};

const getScoreLabel = (score: number | null): string => {
  if (score === null) return '—';
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Fair';
  return 'Poor';
};

const HeartScoreLandingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'year'>('week');
  const [stats, setStats] = useState<Stats>({ current: null, sevenDayAverage: null, monthAverage: null, yearAverage: null, trend: null });
  const [bars, setBars] = useState<BarPoint[]>([]);

  const fetchStats = useCallback(() => {
    if (!accessToken) return;
    const tz = getDeviceTimezone() || 'UTC';
    fetch(`${BASE}/stats?timezone=${encodeURIComponent(tz)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => setStats({
        current: data.current ?? null,
        sevenDayAverage: data.sevenDayAverage ?? null,
        monthAverage: data.monthAverage ?? null,
        yearAverage: data.yearAverage ?? null,
        trend: data.trend ?? null,
      }))
      .catch(err => console.error('Error fetching heart score stats:', err));
  }, [accessToken]);

  const fetchChart = useCallback((period: 'week' | 'month' | 'year') => {
    if (!accessToken) return;
    const tz = getDeviceTimezone() || 'UTC';
    fetch(`${BASE}/history?period=${period}&timezone=${encodeURIComponent(tz)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => setBars(data.bars ?? []))
      .catch(err => console.error('Error fetching heart score history:', err));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchChart(activePeriod);
    }, [fetchStats, fetchChart, activePeriod])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* About card */}
        <View style={styles.measureCard}>
          <Text style={styles.measureTitle}>Heart Health Score</Text>
          <Text style={styles.measureBody}>
            Your Heart Health Score is a composite of all eight Life's Essential 8 metrics — physical activity, sleep, blood pressure, blood sugar, blood lipids, body weight, diet, and smoking. Each metric is scored 0–100 and averaged together to produce your overall score.
          </Text>
        </View>

        {/* Stats card (teal) */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>

          {/* Current score */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Current Score</Text>
              <Text style={styles.statSub}>{getScoreLabel(stats.current)}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {stats.current !== null ? stats.current : '—'}
              </Text>
            </View>
          </View>

          {/* 7-day average */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>7-Day Average</Text>
              {stats.trend ? (
                <View style={styles.trendRow}>
                  <Text style={styles.trendArrow}>{stats.trend.arrow}</Text>
                  <Text style={styles.statSub}>{stats.trend.text}</Text>
                </View>
              ) : (
                <Text style={styles.statSub}>No data yet</Text>
              )}
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {stats.sevenDayAverage !== null ? stats.sevenDayAverage : '—'}
              </Text>
            </View>
          </View>

          {/* Month-to-date average */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Month-to-Date Avg</Text>
              {stats.monthAverage !== null && stats.current !== null ? (
                <View style={styles.trendRow}>
                  <Text style={styles.trendArrow}>
                    {stats.current > stats.monthAverage ? '↑' : stats.current < stats.monthAverage ? '↓' : '–'}
                  </Text>
                  <Text style={styles.statSub}>
                    {stats.current > stats.monthAverage ? 'Higher than monthly avg' : stats.current < stats.monthAverage ? 'Lower than monthly avg' : 'Equal to monthly avg'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.statSub}>No data yet</Text>
              )}
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {stats.monthAverage !== null ? stats.monthAverage : '—'}
              </Text>
            </View>
          </View>

          {/* Year-to-date average */}
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <View style={styles.statLeft}>
              <Text style={styles.statTitle}>Year-to-Date Avg</Text>
              {stats.yearAverage !== null && stats.current !== null ? (
                <View style={styles.trendRow}>
                  <Text style={styles.trendArrow}>
                    {stats.current > stats.yearAverage ? '↑' : stats.current < stats.yearAverage ? '↓' : '–'}
                  </Text>
                  <Text style={styles.statSub}>
                    {stats.current > stats.yearAverage ? 'Higher than yearly avg' : stats.current < stats.yearAverage ? 'Lower than yearly avg' : 'Equal to yearly avg'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.statSub}>No data yet</Text>
              )}
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {stats.yearAverage !== null ? stats.yearAverage : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Your Stats section */}
        <Text style={styles.sectionTitle}>Your Stats</Text>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          {/* Period selector */}
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
            {/* Y-axis */}
            <View style={styles.yAxisCol}>
              {Y_TICKS.map(v => (
                <Text key={v} style={styles.yTickLabel}>{v}</Text>
              ))}
            </View>

            {/* Bars */}
            <View style={styles.barsArea}>
              {bars.map((bar, i) => {
                const hasData = bar.score !== null;
                const h = hasData ? Math.max((bar.score! / 100) * CHART_H, 2) : 0;
                const barColor = hasData ? getScoreColor(bar.score) : 'transparent';
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height: h, backgroundColor: barColor }]} />
                  </View>
                );
              })}
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
                <Text style={styles.ptsText}>{row.range}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* How it's calculated */}
        <View style={styles.footnoteCard}>
          <Text style={styles.footnoteTitle}>How the score is calculated</Text>
          <Text style={styles.footnoteDesc}>
            Each of the 8 metrics is scored individually on a 0–100 scale based on the American Heart Association's Life's Essential 8 framework. Metrics with available data are averaged together to produce the composite score. As you complete more assessments, your score will reflect all eight dimensions of heart health.
          </Text>
          <View style={styles.metricsList}>
            {[
              'Physical Activity — steps toward your daily goal',
              'Sleep — hours of sleep per night',
              'Blood Pressure — systolic/diastolic mmHg (Omron)',
              'Blood Sugar — fasting glucose or HbA1c',
              'Blood Lipids — non-HDL cholesterol (mg/dL)',
              'Body Mass Index — weight relative to height',
              'Diet — MEPA dietary quality score (0–10)',
              'Smoking — tobacco and nicotine use status',
            ].map((item, i) => (
              <View key={i} style={styles.metricBullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
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

  // About card
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

  // Stats card (teal)
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

  // Section title
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },

  // Bar chart
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
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scoringRowLast: {
    borderBottomWidth: 0,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  ptsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },

  // How it's calculated footnote
  footnoteCard: {
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
  footnoteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  footnoteDesc: {
    fontSize: 14,
    color: '#13233e',
    lineHeight: 21,
    marginBottom: 12,
  },
  metricsList: {
    marginTop: 4,
  },
  metricBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 14,
    color: '#4B5563',
    width: 16,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#13233e',
    lineHeight: 21,
  },
});

export default HeartScoreLandingScreen;
