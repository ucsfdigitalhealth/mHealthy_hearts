import { API_ORIGIN } from '../../config/api';
import React, { useState, useEffect } from 'react';
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
const PURPLE    = '#686d9e';
const PURPLE_LT = '#7f7eaf';

const DIET_BASE = `${API_ORIGIN}/api/diet`;

const FOOD_TEMPLATE = [
  { emoji: '🥦', name: 'Vegetables',               rec: 'Recommended ≥2 servings/day',   key: 'vegetables'   },
  { emoji: '🍎', name: 'Fruit',                    rec: 'Recommended ≥1 serving/day',    key: 'fruits'       },
  { emoji: '🥩', name: 'Red Meat',                 rec: 'Recommended ≤3 servings/week',  key: 'redMeat'      },
  { emoji: '🐟', name: 'Fish',                     rec: 'Recommended ≥1 serving/week',   key: 'fish'         },
  { emoji: '🧈', name: 'Butter or Cream',          rec: 'Recommended ≤5 servings/week',  key: 'butter'       },
  { emoji: '🫘', name: 'Beans',                    rec: 'Recommended ≥3 servings/week',  key: 'beans'        },
  { emoji: '🌾', name: 'Whole Grains',             rec: 'Recommended ≥3 servings/day',   key: 'grains'       },
  { emoji: '🍰', name: 'Sweets & Pastries',        rec: 'Recommended ≤4 servings/week',  key: 'sweets'       },
  { emoji: '🍔', name: 'Fast or Fried Food',       rec: 'Recommended ≤1 meal/week',      key: 'fastFood'     },
  { emoji: '🥤', name: 'Sugary Beverages',         rec: 'Recommended ≤7 servings/week',  key: 'sugaryDrinks' },
];

const CHART_H = 130; // px height of the bar area
const Y_TICKS = [100, 75, 50, 25, 0];

type BarPoint = { score: number | null };

const PERIOD_LABEL: Record<'month' | 'year', string> = {
  month: 'MONTH TO DATE',
  year:  'YEAR TO DATE',
};

const SCORING_ROWS = [
  { label: 'Above the 95th percentile', sub: 'IDEAL DIET', pts: 100, dot: '#34C759' },
  { label: '75th–94th percentile',      sub: 'GREAT DIET', pts: 80,  dot: '#3B82F6' },
  { label: '50th–74th percentile',      sub: 'GOOD DIET',  pts: 50,  dot: '#F59E0B' },
  { label: '25th–49th percentile',      sub: 'FAIR DIET',  pts: 25,  dot: '#F97316' },
  { label: '0 hours',                   sub: 'POOR DIET',  pts: 0,   dot: '#DC2626' },
];

const getDietBarColor = (score: number | null): string => {
  if (score === null) return 'transparent';
  if (score >= 100) return '#34C759';
  if (score >= 80)  return '#3B82F6';
  if (score >= 50)  return '#F59E0B';
  if (score >= 25)  return '#F97316';
  return '#DC2626';
};

type ServingsData = {
  vegetables: number; fruits: number; redMeat: number; fish: number;
  butter: number; beans: number; grains: number; sweets: number;
  fastFood: number; sugaryDrinks: number;
};

const DEFAULT_SERVINGS: ServingsData = {
  vegetables: 0, fruits: 0, redMeat: 0, fish: 0,
  butter: 0, beans: 0, grains: 0, sweets: 0,
  fastFood: 0, sugaryDrinks: 0,
};

const DietLandingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const [activePeriod, setActivePeriod] = useState<'month' | 'year'>('month');
  const [servings, setServings]         = useState<ServingsData>(DEFAULT_SERVINGS);
  const [bars, setBars]                 = useState<BarPoint[]>([]);

  const fetchServings = React.useCallback(() => {
    if (!accessToken) return;
    const tz = getDeviceTimezone() || 'UTC';
    fetch(`${DIET_BASE}/today?timezone=${encodeURIComponent(tz)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        setServings({
          vegetables:   data.vegetables   ?? 0,
          fruits:       data.fruits       ?? 0,
          redMeat:      data.redMeat      ?? 0,
          fish:         data.fish         ?? 0,
          butter:       data.butter       ?? 0,
          beans:        data.beans        ?? 0,
          grains:       data.grains       ?? 0,
          sweets:       data.sweets       ?? 0,
          fastFood:     data.fastFood     ?? 0,
          sugaryDrinks: data.sugaryDrinks ?? 0,
        });
      })
      .catch(err => console.error('Error fetching diet today:', err));
  }, [accessToken]);

  const fetchChart = React.useCallback((period: 'month' | 'year') => {
    if (!accessToken) return;
    const tz = getDeviceTimezone() || 'UTC';
    fetch(`${DIET_BASE}/history?period=${period}&timezone=${encodeURIComponent(tz)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(data => setBars(data.bars ?? []))
      .catch(err => console.error('Error fetching diet history:', err));
  }, [accessToken]);

  // Re-fetch servings + chart on screen focus (picks up new form submissions)
  useFocusEffect(
    React.useCallback(() => {
      fetchServings();
      fetchChart(activePeriod);
    }, [fetchServings, fetchChart, activePeriod])
  );

  // Re-fetch chart when period selector changes
  useEffect(() => {
    fetchChart(activePeriod);
  }, [activePeriod, fetchChart]);

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
            Your nutrition is self-reported and measured by the daily intake of a DASH-style eating pattern. This diet assessment tracks the number of servings of vegetables, fruit, red meat, fish, butter or cream, beans, whole grains, sweets, fast food, and sweetened beverages you consume.
          </Text>
        </View>

        {/* Take Assessment button */}
        <TouchableOpacity
          style={styles.assessBtn}
          onPress={() => navigation.navigate('Diet')}
          activeOpacity={0.8}
        >
          <Text style={styles.assessBtnText}>Take Assessment</Text>
        </TouchableOpacity>

        {/* YOUR DAILY SERVINGS */}
        <View style={styles.servingsCard}>
          <Text style={styles.servingsLabel}>YOUR DAILY SERVINGS</Text>
          {FOOD_TEMPLATE.map((row, i) => (
            <View key={i} style={styles.foodRow}>
              <Text style={styles.foodEmoji}>{row.emoji}</Text>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{row.name}</Text>
                <Text style={styles.foodRec}>{row.rec}</Text>
              </View>
              <View style={styles.foodValueBox}>
                <Text style={styles.foodValueText}>{Math.round(servings[row.key as keyof ServingsData])}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Your Stats */}
        <Text style={styles.sectionTitle}>Your Stats</Text>

        {/* Bar chart */}
        <View style={styles.chartCard}>
          {/* Period selector */}
          <View style={styles.periodRow}>
            {(['month', 'year'] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, activePeriod === p && styles.periodBtnActive]}
                onPress={() => setActivePeriod(p)}
              >
                <Text style={[styles.periodText, activePeriod === p && styles.periodTextActive]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.periodSubLabel}>{PERIOD_LABEL[activePeriod]}</Text>

          {/* Chart area */}
          <View style={styles.chartRow}>
            {/* Y-axis tick labels */}
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
                return (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: h,
                          backgroundColor: getDietBarColor(bar.score),
                        },
                      ]}
                    />
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
                <Text style={styles.ptsText}>{row.pts} pts</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.footnoteCard}>
          <Text style={styles.footnoteTitle}>Dietary Quality Score (Range: 0–10)</Text>
          <Text style={styles.footnoteDesc}>
            Each criterion is scored 1 if the condition is met, 0 if not met.
          </Text>
          <View style={styles.olist}>
            {[
              'Consumed ≥2 servings of vegetables per day',
              'Consumed ≥1 serving of fruit per day',
              'Consumed ≤3 servings of red meat, hamburger, bacon, or sausage per week',
              'Consumed ≥1 serving of fish per week',
              'Consumed ≤5 servings of butter or cream per week',
              'Consumed ≥3 servings of beans per week',
              'Consumed ≥3 servings of whole grains per day',
              'Consumed ≤4 servings of commercial sweets, candy bars, pastries, cookies, or cakes per week',
              'Consumed ≤1 meal at a fast food restaurant per week',
              'Consumed ≤7 servings per week of sweetened beverages',
            ].map((item, i) => (
              <View key={i} style={styles.olistItem}>
                <Text style={styles.olistIndex}>{i + 1}.</Text>
                <Text style={styles.olistText}>{item}</Text>
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

  // Measurements
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

  // Take Assessment
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

  // YOUR DAILY SERVINGS
  servingsCard: {
    backgroundColor: TEAL,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#4459d5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  servingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  foodRow: {
    backgroundColor: TEAL_DARK,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    shadowColor: '#31849a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  foodEmoji: {
    fontSize: 28,
    marginRight: 12,
    width: 36,
    textAlign: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  foodRec: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  foodValueBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#31849a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  foodValueText: {
    fontSize: 26,
    fontWeight: '900',
    color: TEAL,
  },

  // WEEKLY POINTS EARNED
  pointsCard: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#4459d5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  pointsLeft: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 60,
  },
  pointsPill: {
    backgroundColor: PURPLE_LT,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 110,
  },
  pointsPillTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  pointsPillValue: {
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
    marginBottom: 0,
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

  // Period selector
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
  olist: {
    marginTop: 4,
  },
  olistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  olistIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    width: 28,
    marginRight: 6,
    lineHeight: 21,
  },
  olistText: {
    flex: 1,
    fontSize: 14,
    color: '#13233e',
    lineHeight: 21,
  },
});

export default DietLandingScreen;
