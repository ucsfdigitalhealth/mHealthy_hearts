import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import Settings from '../../components/Settings';
import { useAuth } from '../../context/AuthContext';
import { useSleep } from '../../hooks/useSleep';
import { LE8_METRIC_DETAIL_CONFIG } from './le8MetricDetailConfig';
import type { Le8MetricId } from './le8MetricTypes';

const { width: SCREEN_W } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;

type HealthSnapshot = {
  activitySteps: number | null;
  activityScore: number | null;
  sleepHours: number | null;
  sleepScore: number | null;
  bloodSugarValue: number | null;
  bloodSugarScore: number | null;
  bloodLipidValue: number | null;
  bloodLipidScore: number | null;
  bmiValue: number | null;
  bmiScore: number | null;
  dietScore: number | null;
  dietMepa: number | null;
  smokingScore: number | null;
};

const emptySnapshot: HealthSnapshot = {
  activitySteps: null,
  activityScore: null,
  sleepHours: null,
  sleepScore: null,
  bloodSugarValue: null,
  bloodSugarScore: null,
  bloodLipidValue: null,
  bloodLipidScore: null,
  bmiValue: null,
  bmiScore: null,
  dietScore: null,
  dietMepa: null,
  smokingScore: null,
};

function formatSteps(n: number | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(Math.round(n));
}

function formatNum(n: number | null, decimals = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return String(Math.round(n * 10 ** decimals) / 10 ** decimals);
}

function measurementDisplay(
  metric: Le8MetricId,
  s: HealthSnapshot,
  sleepEfficiency: number,
  sleepFormatted: string,
): { first: string; second: string } {
  switch (metric) {
    case 'physicalActivity':
      return {
        first: formatSteps(s.activitySteps),
        second: '—',
      };
    case 'sleep':
      return {
        first: s.sleepHours !== null ? `${formatNum(s.sleepHours, 1)} hrs` : sleepFormatted !== '—' ? sleepFormatted : '—',
        second: sleepEfficiency > 0 ? `${sleepEfficiency}%` : '—',
      };
    case 'bloodPressure':
      return { first: '—', second: '—' };
    case 'bloodSugar':
      return {
        first: s.bloodSugarValue !== null ? `${formatNum(s.bloodSugarValue, 0)} mg/dL` : '—',
        second: s.bloodSugarScore !== null ? `${s.bloodSugarScore} pts` : '—',
      };
    case 'bloodLipids':
      return {
        first: s.bloodLipidValue !== null ? `${formatNum(s.bloodLipidValue, 0)} mg/dL` : '—',
        second: '—',
      };
    case 'bmi':
      return {
        first: s.bmiValue !== null ? formatNum(s.bmiValue, 1) : '—',
        second: s.bmiValue !== null ? formatNum(s.bmiValue, 1) : '—',
      };
    case 'diet':
      return {
        first: s.dietMepa !== null ? formatNum(s.dietMepa, 1) : '—',
        second: s.dietScore !== null ? String(s.dietScore) : '—',
      };
    case 'smoking':
      return {
        first: s.smokingScore !== null ? String(s.smokingScore) : '—',
        second: '—',
      };
  }
}

/** Deterministic placeholder bar heights 0–1 for chart demo */
function barSeries(metric: Le8MetricId, count: number): number[] {
  const seed = metric.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.sin(seed * 0.7 + i * 1.3) * 0.35 + 0.5;
    out.push(Math.min(1, Math.max(0.12, x)));
  }
  return out;
}

const Le8MetricDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Le8MetricDetail'>>();
  const { accessToken } = useAuth();
  const { metric } = route.params;
  const config = LE8_METRIC_DETAIL_CONFIG[metric];
  const sleepHook = useSleep();

  const [range, setRange] = useState<'7' | '30'>('7');
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(emptySnapshot);

  const fetchScores = useCallback(async () => {
    if (!accessToken) {
      setSnapshot(emptySnapshot);
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/api/health-scores', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        setSnapshot(emptySnapshot);
        return;
      }
      const data = await response.json();
      setSnapshot({
        activitySteps: data.physicalActivity?.steps ?? null,
        activityScore: data.physicalActivity?.score ?? null,
        sleepHours: data.sleep?.hours ?? null,
        sleepScore: data.sleep?.score ?? null,
        bloodSugarValue: data.bloodSugar?.value ?? null,
        bloodSugarScore: data.bloodSugar?.score ?? null,
        bloodLipidValue: data.bloodLipids?.value ?? null,
        bloodLipidScore: data.bloodLipids?.score ?? null,
        bmiValue: data.bmi?.value ?? null,
        bmiScore: data.bmi?.score ?? null,
        dietScore: data.diet?.score ?? null,
        dietMepa: data.diet?.mepaScore ?? null,
        smokingScore: data.smoking?.score ?? null,
      });
    } catch {
      setSnapshot(emptySnapshot);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchScores();
    }, [fetchScores]),
  );

  const { first, second } = useMemo(
    () =>
      measurementDisplay(metric, snapshot, sleepHook.efficiency, sleepHook.formatted),
    [metric, snapshot, sleepHook.efficiency, sleepHook.formatted],
  );

  const bars = useMemo(() => barSeries(metric, range === '7' ? 7 : 30), [metric, range]);

  const chartInnerWidth = SCREEN_W - 40 - 36 - 12;
  const barGap = range === '7' ? 6 : 2;
  const n = bars.length;
  const totalGap = barGap * Math.max(0, n - 1);
  const barW = Math.max(4, (chartInnerWidth - totalGap) / n);

  const openAssessment = () => {
    const r = config.firstCardAssessmentRoute;
    if (r) navigation.navigate(r);
  };

  const FirstMeasurementWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (config.firstCardAssessmentRoute) {
      return (
        <TouchableOpacity style={styles.measureCard} onPress={openAssessment} activeOpacity={0.75}>
          {children}
        </TouchableOpacity>
      );
    }
    return <View style={[styles.measureCard, styles.measureCardDisabled]}>{children}</View>;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#0D9488" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>{config.screenTitle}</Text>
          <Text style={styles.headerSubtitle}>Assessment</Text>
        </View>
        <Settings />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.measurementsBlock}>
          <Text style={styles.measurementsLabel}>Measurements</Text>
          <View style={styles.measureRow}>
            <FirstMeasurementWrapper>
              <Text style={styles.measureCardLabel}>{config.firstCardLabel}</Text>
              <Text style={styles.measureCardValue}>{first}</Text>
            </FirstMeasurementWrapper>
            <View style={styles.measureCard}>
              <Text style={styles.measureCardLabel}>{config.secondCardLabel}</Text>
              <Text style={styles.measureCardValue}>{second}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, range === '7' && styles.segmentBtnOn]}
            onPress={() => setRange('7')}
          >
            <Text style={[styles.segmentTxt, range === '7' && styles.segmentTxtOn]}>7 Days</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, range === '30' && styles.segmentBtnOn]}
            onPress={() => setRange('30')}
          >
            <Text style={[styles.segmentTxt, range === '30' && styles.segmentTxtOn]}>30 Days</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.chartCaption}>{config.statsChartTitle}</Text>
        <View style={styles.chartRow}>
          <View style={styles.yLabels}>
            {config.yAxisLabels.map((label, i) => (
              <Text key={i} style={styles.yLabel}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.chartPlot}>
            <View style={styles.barsRow}>
              {bars.map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      width: barW,
                      marginRight: i < bars.length - 1 ? barGap : 0,
                      height: `${Math.round(h * 100)}%`,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Scoring System</Text>
        <View style={styles.scoringList}>
          {config.scoringRows.map((row, i) => (
            <View key={i} style={styles.scoringRow}>
              <View style={[styles.scoringDot, { backgroundColor: row.dotColor }]} />
              <Text style={styles.scoringLabel}>{row.label}</Text>
              <Text style={styles.scoringPts}>{row.points}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const CHART_H = 200;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  measurementsBlock: {
    marginTop: 20,
    backgroundColor: '#0D9488',
    borderRadius: 16,
    padding: 16,
  },
  measurementsLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ECFEFF',
    marginBottom: 12,
  },
  measureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  measureCard: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    minHeight: 88,
    justifyContent: 'center',
  },
  measureCardDisabled: {
    opacity: 0.95,
  },
  measureCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginBottom: 6,
  },
  measureCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#134E4A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 10,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    padding: 4,
    alignSelf: 'flex-start',
  },
  segmentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  segmentBtnOn: {
    backgroundColor: '#3B82F6',
  },
  segmentTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTxtOn: {
    color: '#FFFFFF',
  },
  chartCaption: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  chartRow: {
    flexDirection: 'row',
    minHeight: CHART_H,
  },
  yLabels: {
    width: 36,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  yLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  chartPlot: {
    flex: 1,
    marginLeft: 12,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: 8,
    paddingBottom: 4,
    height: CHART_H,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_H - 12,
  },
  bar: {
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  scoringList: {
    marginTop: 4,
    gap: 12,
  },
  scoringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoringDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoringLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  scoringPts: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default Le8MetricDetailScreen;
