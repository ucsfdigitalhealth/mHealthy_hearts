// CardioHistoricalDataScreen.tsx – historical cardiovascular data with interactive time-series charts
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryScatter, VictoryArea } from 'victory-native';
import { useAuth } from '../../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 16;
const CHART_WIDTH = SCREEN_WIDTH - 40 - CARD_PADDING * 2; // screen minus scroll padding minus card padding
const API_BASE = 'http://localhost:3000';

type MetricKey = 'Sleep' | 'PA' | 'BloodSugar' | 'BloodLipids' | 'BMI' | 'Diet' | 'Smoking' | 'BP';

type ChartPoint = {
  x: number;
  y: number;
  xLabel: string;       // Short x-axis label — NOT named "label" to avoid Victory rendering it next to dots
  tooltipLabel: string; // Full human-readable label shown in tooltip on press
};

interface RawSleepPoint {
  date: string;
  minutesAsleep: number | null;
  efficiency: number | null;
}

interface RawActivityPoint {
  date: string;
  steps: number | null;
}

interface RawAssessmentPoint {
  date: string;
  score: number | null;
  value?: number | null;    // blood sugar / blood lipids raw measurement
  bmiValue?: number | null; // for BMI metric
}

const METRICS: {
  key: MetricKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  chartTitle: string;
}[] = [
  { key: 'Sleep',       label: 'Sleep',       icon: 'moon',          chartTitle: 'Hours of Sleep'     },
  { key: 'PA',          label: 'PA',          icon: 'walk',          chartTitle: 'Physical Activity'  },
  { key: 'BloodSugar',  label: 'Blood Sugar', icon: 'water',         chartTitle: 'Blood Sugar Score'  },
  { key: 'BloodLipids', label: 'Lipids',      icon: 'fitness',       chartTitle: 'Blood Lipids Score' },
  { key: 'BMI',         label: 'BMI',         icon: 'body',          chartTitle: 'Body Mass Index'    },
  { key: 'Diet',        label: 'Diet',        icon: 'nutrition',     chartTitle: 'Diet Score'         },
  { key: 'Smoking',     label: 'Smoking',     icon: 'ban',           chartTitle: 'Nicotine Score'     },
  { key: 'BP',          label: 'BP',          icon: 'heart-outline', chartTitle: 'Blood Pressure'     },
];

const TIME_RANGES = ['Weekly', 'Monthly', 'Yearly'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

// Navigation targets for "Update My Value" button
const NAV_TARGET_MAP: Partial<Record<MetricKey, string>> = {
  BloodSugar:  'BloodSugar',
  BloodLipids: 'BloodLipids',
  BMI:         'Bmi',
  Diet:        'Diet',
  Smoking:     'Smoking',
};

// Assessment history API endpoints
const ASSESSMENT_ENDPOINT_MAP: Partial<Record<MetricKey, string>> = {
  BloodSugar:  '/api/blood-sugar/history',
  BloodLipids: '/api/blood-lipids/history',
  BMI:         '/api/bmi/history',
  Diet:        '/api/diet/history',
  Smoking:     '/api/smoking/history',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function avgNonNull(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v != null && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleString('default', { weekday: 'short' });
}

function formatDayTooltipLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const weekday = d.toLocaleString('default', { weekday: 'long' });
  const date    = d.toLocaleString('default', { month: 'short', day: 'numeric' });
  return `${weekday}, ${date}`;
}

function formatValue(y: number, metric: MetricKey, isAverage: boolean): string {
  const avg = isAverage ? ' avg' : '';
  if (metric === 'Sleep') {
    const hrs  = Math.floor(y);
    const mins = Math.round((y - hrs) * 60);
    return mins === 0 ? `${hrs} hrs${avg}` : `${hrs} hrs ${mins} min${avg}`;
  }
  if (metric === 'PA') {
    return `${Math.round(y).toLocaleString()} steps${avg}`;
  }
  if (metric === 'BMI') {
    return `${y.toFixed(1)} BMI${avg}`;
  }
  // Score-based metrics (BloodSugar, BloodLipids, Diet, Smoking)
  return `Score: ${Math.round(y)}${avg}`;
}

// ── Fitbit aggregation (Monthly + Yearly views) ───────────────────────────────

// Group 30 daily points into 4 weekly-average buckets for the Monthly view
function aggregateIntoWeekBuckets(
  points: (RawSleepPoint | RawActivityPoint)[],
  isSleep: boolean,
): ChartPoint[] {
  if (points.length === 0) return [];
  const bucketSize = Math.ceil(points.length / 4);
  const result: ChartPoint[] = [];
  for (let i = 0; i < 4; i++) {
    const slice = points.slice(i * bucketSize, (i + 1) * bucketSize);
    if (slice.length === 0) continue;
    const vals = slice.map((p) =>
      isSleep
        ? ((p as RawSleepPoint).minutesAsleep != null ? (p as RawSleepPoint).minutesAsleep! / 60 : null)
        : ((p as RawActivityPoint).steps || null),
    );
    const y = Math.round(avgNonNull(vals) * 10) / 10;
    const startDate = new Date(slice[0].date + 'T12:00:00');
    const monthName = startDate.toLocaleString('default', { month: 'long' });
    const year      = startDate.getFullYear();
    result.push({
      x: i + 1,
      y,
      xLabel: `Wk ${i + 1}`,
      tooltipLabel: `Week ${i + 1} of ${monthName} ${year}`,
    });
  }
  return result;
}

// Group 365 daily points into up to 12 monthly averages for the Yearly view
function aggregateIntoMonthBuckets(
  points: (RawSleepPoint | RawActivityPoint)[],
  isSleep: boolean,
): ChartPoint[] {
  const monthMap = new Map<string, (number | null)[]>();
  for (const p of points) {
    const month = p.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(month)) monthMap.set(month, []);
    const val = isSleep
      ? ((p as RawSleepPoint).minutesAsleep != null ? (p as RawSleepPoint).minutesAsleep! / 60 : null)
      : ((p as RawActivityPoint).steps || null);
    monthMap.get(month)!.push(val);
  }
  return Array.from(monthMap.entries()).map(([month, vals], i) => {
    const y        = Math.round(avgNonNull(vals) * 10) / 10;
    const d        = new Date(month + '-15T12:00:00');
    const shortLbl = d.toLocaleString('default', { month: 'short' });
    const fullLbl  = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { x: i + 1, y, xLabel: shortLbl, tooltipLabel: fullLbl };
  });
}

// ── Assessment aggregation — mirrors Fitbit approach (full date range) ────────
// Backend now returns one point per day (null score for days without an assessment),
// so we can use the same bucket strategy as Sleep / PA.

// Monthly view: group the 30 daily points into 4 weekly-average buckets
function aggregateAssessmentIntoWeekBuckets(
  points: RawAssessmentPoint[],
  useBMI: boolean,
): ChartPoint[] {
  if (points.length === 0) return [];
  const bucketSize = Math.ceil(points.length / 4);
  const result: ChartPoint[] = [];
  for (let i = 0; i < 4; i++) {
    const slice = points.slice(i * bucketSize, (i + 1) * bucketSize);
    if (slice.length === 0) continue;
    const vals = slice.map((p) => (useBMI ? p.bmiValue : p.score) ?? null);
    const valid = vals.filter((v): v is number => v != null);
    if (valid.length === 0) continue; // no data in this bucket — skip
    const y         = Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
    const startDate = new Date(slice[0].date + 'T12:00:00');
    const monthName = startDate.toLocaleString('default', { month: 'long' });
    const year      = startDate.getFullYear();
    result.push({
      x:            result.length + 1,
      y,
      xLabel:       `Wk ${i + 1}`,
      tooltipLabel: `Week ${i + 1} of ${monthName} ${year}`,
    });
  }
  return result;
}

// Yearly view: group the 365 daily points into monthly averages (up to 12 buckets)
function aggregateAssessmentIntoMonthBuckets(
  points: RawAssessmentPoint[],
  useBMI: boolean,
): ChartPoint[] {
  const monthMap = new Map<string, number[]>();
  for (const p of points) {
    const val = (useBMI ? p.bmiValue : p.score) ?? null;
    if (val == null) continue;
    const month = p.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(val);
  }
  return Array.from(monthMap.entries()).map(([month, vals], i) => {
    const avg      = vals.reduce((a, b) => a + b, 0) / vals.length;
    const d        = new Date(month + '-15T12:00:00');
    const shortLbl = d.toLocaleString('default', { month: 'short' });
    const fullLbl  = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { x: i + 1, y: Math.round(avg * 10) / 10, xLabel: shortLbl, tooltipLabel: fullLbl };
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

const CardioHistoricalDataScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();

  const [selectedMetric,    setSelectedMetric]    = useState<MetricKey>('Sleep');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('Weekly');
  const [chartData,         setChartData]         = useState<ChartPoint[]>([]);
  const [isLoading,         setIsLoading]         = useState(false);
  const [fetchError,        setFetchError]        = useState<string | null>(null);
  const [selectedPoint,     setSelectedPoint]     = useState<ChartPoint | null>(null);

  const currentMetric      = METRICS.find((m) => m.key === selectedMetric)!;
  const isFitbitMetric     = selectedMetric === 'Sleep' || selectedMetric === 'PA';
  const isAssessmentMetric = !isFitbitMetric && selectedMetric !== 'BP';
  const isBPMetric         = selectedMetric === 'BP';
  const isBMI              = selectedMetric === 'BMI';
  const isAverage          = selectedTimeRange === 'Monthly' || selectedTimeRange === 'Yearly';

  // Fetch history when metric or range changes
  useEffect(() => {
    setSelectedPoint(null);
    setChartData([]);
    setFetchError(null);

    if (isBPMetric || !accessToken) {
      return;
    }

    const rangeMap: Record<TimeRange, string> = { Weekly: 'weekly', Monthly: 'monthly', Yearly: 'yearly' };
    setIsLoading(true);

    if (isFitbitMetric) {
      const endpoint = selectedMetric === 'Sleep' ? 'sleep' : 'activity';
      const isSleep  = selectedMetric === 'Sleep';

      fetch(`${API_BASE}/api/fitbitAuth/fitbit/history/${endpoint}?range=${rangeMap[selectedTimeRange]}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => {
          const raw: any[] = data.points ?? [];
          let processed: ChartPoint[] = [];

          if (selectedTimeRange === 'Weekly') {
            processed = raw
              .map((p, i) => {
                const rawVal = isSleep ? p.minutesAsleep : p.steps;
                if (rawVal == null || rawVal === 0) return null;
                const y = isSleep ? Math.round((rawVal / 60) * 10) / 10 : rawVal;
                return { x: i + 1, y, xLabel: formatDayLabel(p.date), tooltipLabel: formatDayTooltipLabel(p.date) };
              })
              .filter((p): p is ChartPoint => p !== null);
          } else if (selectedTimeRange === 'Monthly') {
            processed = aggregateIntoWeekBuckets(raw, isSleep);
          } else {
            processed = aggregateIntoMonthBuckets(raw, isSleep);
          }

          setChartData(processed);
        })
        .catch(() => setFetchError('Could not load data. Please try again.'))
        .finally(() => setIsLoading(false));

    } else if (isAssessmentMetric) {
      const endpoint = ASSESSMENT_ENDPOINT_MAP[selectedMetric]!;

      fetch(`${API_BASE}${endpoint}?range=${rangeMap[selectedTimeRange]}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => {
          const raw: RawAssessmentPoint[] = data.points ?? [];
          let processed: ChartPoint[] = [];

          if (selectedTimeRange === 'Weekly') {
            // Mirror Fitbit weekly: one point per day (null = no data that day → skip)
            processed = raw
              .map((p, i) => {
                const rawVal = isBMI ? p.bmiValue : p.score;
                if (rawVal == null) return null;
                return {
                  x:            i + 1,
                  y:            Math.round(rawVal * 10) / 10,
                  xLabel:       formatDayLabel(p.date),
                  tooltipLabel: formatDayTooltipLabel(p.date),
                };
              })
              .filter((p): p is ChartPoint => p !== null);
          } else if (selectedTimeRange === 'Monthly') {
            processed = aggregateAssessmentIntoWeekBuckets(raw, isBMI);
          } else {
            processed = aggregateAssessmentIntoMonthBuckets(raw, isBMI);
          }

          setChartData(processed);
        })
        .catch(() => setFetchError('Could not load data. Please try again.'))
        .finally(() => setIsLoading(false));
    }
  }, [selectedMetric, selectedTimeRange, accessToken, isFitbitMetric, isAssessmentMetric, isBPMetric, isBMI]);

  // Sleep healthy range band (7–9 hrs) spanning full x range
  const sleepBand =
    selectedMetric === 'Sleep' && chartData.length >= 2
      ? [
          { x: chartData[0].x,                      y: 9, y0: 7 },
          { x: chartData[chartData.length - 1].x,   y: 9, y0: 7 },
        ]
      : [];

  // Chart left/right padding must match the VictoryChart padding values below
  const CHART_LEFT_PAD  = 52;
  const CHART_RIGHT_PAD = 12;

  const handleChartTouch = useCallback((e: { nativeEvent: { locationX: number } }) => {
    if (chartData.length === 0) return;
    const { locationX } = e.nativeEvent;
    const plotWidth = CHART_WIDTH - CHART_LEFT_PAD - CHART_RIGHT_PAD;
    const minX     = chartData[0].x;
    const maxX     = chartData[chartData.length - 1].x;
    const fraction = Math.max(0, Math.min(1, (locationX - CHART_LEFT_PAD) / plotWidth));
    const dataX    = minX + fraction * (maxX - minX);
    const nearest  = chartData.reduce((best, p) =>
      Math.abs(p.x - dataX) < Math.abs(best.x - dataX) ? p : best,
    );
    setSelectedPoint(nearest);
  }, [chartData]);

  const navTarget = NAV_TARGET_MAP[selectedMetric];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Health Trends</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricPillsRow}
          style={styles.metricPillsScroll}
        >
          {METRICS.map((m) => {
            const active = selectedMetric === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setSelectedMetric(m.key)}
                style={[styles.metricPill, active && styles.metricPillActive]}
                activeOpacity={0.75}
              >
                <Ionicons name={m.icon} size={15} color={active ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.metricPillText, active && styles.metricPillTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Segmented time-range control */}
        <View style={styles.segmentRow}>
          {TIME_RANGES.map((range) => {
            const active = selectedTimeRange === range;
            return (
              <TouchableOpacity
                key={range}
                onPress={() => setSelectedTimeRange(range)}
                style={[styles.segmentTab, active && styles.segmentTabActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Chart title */}
        <Text style={styles.chartTitle}>{currentMetric.chartTitle}</Text>

        {/* ── Loading ── */}
        {isLoading && (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}

        {/* ── Error ── */}
        {!isLoading && fetchError && (
          <View style={styles.stateBox}>
            <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            <Text style={[styles.stateTitle, { color: '#EF4444' }]}>Something went wrong</Text>
            <Text style={styles.stateSubtitle}>{fetchError}</Text>
          </View>
        )}

        {/* ── Blood Pressure: Coming Soon ── */}
        {!isLoading && !fetchError && isBPMetric && (
          <View style={styles.stateBox}>
            <Ionicons name="time-outline" size={36} color="#D1D5DB" />
            <Text style={styles.stateTitle}>Coming Soon</Text>
            <Text style={styles.stateSubtitle}>Historical data for this metric is on its way</Text>
          </View>
        )}

        {/* ── No data recorded ── */}
        {!isLoading && !fetchError && !isBPMetric && chartData.length === 0 && (
          <View style={styles.stateBox}>
            <Ionicons name="bar-chart-outline" size={36} color="#D1D5DB" />
            <Text style={styles.stateTitle}>No data available</Text>
            <Text style={styles.stateSubtitle}>
              {isFitbitMetric
                ? 'Sync your Fitbit device to start recording data'
                : 'Complete an assessment to see your trends here'}
            </Text>
          </View>
        )}

        {/* ── Live chart ── */}
        {!isLoading && !fetchError && !isBPMetric && chartData.length > 0 && (
          <View style={styles.chartCard}>

            {/* Tooltip row — visible only while a point is pressed */}
            <View style={styles.tooltipRow}>
              {selectedPoint && (
                <View style={styles.tooltipBubble}>
                  <Text style={styles.tooltipLabel}>{selectedPoint.tooltipLabel}</Text>
                  <Text style={styles.tooltipValue}>
                    {formatValue(selectedPoint.y, selectedMetric, isAverage)}
                  </Text>
                </View>
              )}
            </View>

            {/* Chart + transparent touch overlay in a relative container */}
            <View style={{ position: 'relative' }}>
              <VictoryChart
                width={CHART_WIDTH}
                height={190}
                padding={{ top: 12, bottom: 36, left: CHART_LEFT_PAD, right: CHART_RIGHT_PAD }}
              >
                {/* X-axis */}
                <VictoryAxis
                  tickValues={chartData.map((p) => p.x)}
                  tickFormat={chartData.map((p) => p.xLabel)}
                  style={{
                    axis:       { stroke: '#E5E7EB' },
                    ticks:      { stroke: '#E5E7EB', size: 4 },
                    tickLabels: { fontSize: 10, fill: '#9CA3AF', padding: 6 },
                    grid:       { stroke: 'transparent' },
                  }}
                />
                {/* Y-axis */}
                <VictoryAxis
                  dependentAxis
                  style={{
                    axis:       { stroke: 'transparent' },
                    ticks:      { stroke: 'transparent' },
                    tickLabels: { fontSize: 10, fill: '#9CA3AF', padding: 8 },
                    grid:       { stroke: '#F3F4F6', strokeDasharray: '4,4' },
                  }}
                />

                {/* Healthy range band (Sleep only) */}
                {selectedMetric === 'Sleep' && sleepBand.length === 2 && (
                  <VictoryArea
                    data={sleepBand}
                    style={{
                      data: {
                        fill: 'rgba(167, 243, 208, 0.35)',
                        stroke: 'rgba(34, 197, 94, 0.3)',
                        strokeWidth: 1,
                      },
                    }}
                  />
                )}

                {/* Line */}
                <VictoryLine
                  data={chartData}
                  interpolation="monotoneX"
                  style={{ data: { stroke: '#3B82F6', strokeWidth: 2.5 } }}
                />

                {/* Dots — unselected */}
                <VictoryScatter
                  data={chartData.filter((p) => p.x !== selectedPoint?.x)}
                  size={5}
                  style={{ data: { fill: '#3B82F6', stroke: '#FFFFFF', strokeWidth: 2 } }}
                />

                {/* Dot — selected / highlighted */}
                {selectedPoint && (
                  <VictoryScatter
                    data={[selectedPoint]}
                    size={7}
                    style={{ data: { fill: '#1D4ED8', stroke: '#DBEAFE', strokeWidth: 3 } }}
                  />
                )}
              </VictoryChart>

              {/*
                Transparent overlay that sits on top of the chart.
                onResponderGrant / onResponderMove → find nearest point → show tooltip
                onResponderRelease / onResponderTerminate → hide tooltip
              */}
              <View
                style={styles.chartOverlay}
                onStartShouldSetResponder={() => true}
                onResponderGrant={handleChartTouch}
                onResponderMove={handleChartTouch}
                onResponderRelease={() => setSelectedPoint(null)}
                onResponderTerminate={() => setSelectedPoint(null)}
              />
            </View>

            {/* Legend row */}
            <View style={styles.legendRow}>
              {selectedMetric === 'Sleep' && (
                <View style={styles.legendItem}>
                  <View style={styles.legendSwatch} />
                  <Text style={styles.legendText}>Healthy (7–9 hrs)</Text>
                </View>
              )}
              {isAverage && (
                <Text style={styles.avgNote}>
                  {selectedTimeRange === 'Monthly' ? 'Weekly averages' : 'Monthly averages'}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Update My Value button */}
        <TouchableOpacity
          style={[styles.updateButton, !navTarget && styles.updateButtonDisabled]}
          onPress={() => navTarget && navigation.navigate(navTarget as any)}
          activeOpacity={navTarget ? 0.8 : 1}
        >
          <Text style={styles.updateButtonText}>
            {isBPMetric ? 'Coming Soon' : 'Update My Value'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 16,
  },

  // Metric pills
  metricPillsScroll: {
    marginHorizontal: -20,
  },
  metricPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricPillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  metricPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  metricPillTextActive: {
    color: '#FFFFFF',
  },

  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#111827',
    fontWeight: '600',
  },

  // Chart section
  chartTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
  },

  // State boxes (loading / error / empty)
  stateBox: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  stateSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Chart card
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: CARD_PADDING,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Transparent overlay covering the chart for touch tracking
  chartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Tooltip row (fixed height so chart doesn't jump)
  tooltipRow: {
    height: 52,
    justifyContent: 'center',
    marginBottom: 4,
  },
  tooltipBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  tooltipLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
  tooltipValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 12,
    height: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(167, 243, 208, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
  avgNote: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Update button
  updateButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CardioHistoricalDataScreen;
