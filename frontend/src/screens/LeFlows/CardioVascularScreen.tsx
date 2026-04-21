// CardioVascularScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App'; // Update path as needed
import Settings from '../../components/Settings';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../utils/apiClient';
import { useFitbitAuth } from '../../context/FitbitAuthContext';
import { getCachedBloodSugar, setCachedBloodSugar } from '../../utils/bloodSugarCache';
import { getCachedBmi, setCachedBmi } from '../../utils/bmiCache';
import { getCachedDiet, setCachedDiet } from '../../utils/dietCache';
import { getCachedBloodLipids, setCachedBloodLipids } from '../../utils/bloodLipidsCache';
import { getCachedSmoking, setCachedSmoking } from '../../utils/smokingCache';
import { getDeviceTimezone } from '../../utils/localDate';

const HEALTH_SCORES_BASE = 'http://localhost:3000/api/health-scores';
const FITBIT_STEPS_BASE = 'http://localhost:3000/api/fitbitAuth/fitbit/steps';

// Define the navigation prop type
type CardioNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper function to get status based on score
const getStatusFromScore = (score: number | null): string | null => {
  if (score === null) return null;
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Fair';
  return 'Poor';
};

// Helper function to get status color
const getStatusColor = (status: string | null): string => {
  if (!status) return '#6B7280';
  switch (status) {
    case 'Excellent':
      return '#059669';
    case 'Good':
      return '#3B82F6';
    case 'Fair':
      return '#F59E0B';
    case 'Poor':
      return '#DC2626';
    case 'In-Range':
      return '#369949';
    case 'Prediabetes':
      return '#d1ce1d';
    case 'Diabetes':
      return '#cd482f';
    case 'Fair (Overweight)':
      return '#F59E0B';
    case 'Poor (Obese)':
      return '#DC2626';
    case 'Poor (Underweight)':
      return '#5AC8FA';
    // Smoking range labels
    case 'Optimal':
      return '#059669';
    case 'Low Risk':
      return '#3B82F6';
    case 'Moderate Risk':
      return '#F59E0B';
    case 'High Risk':
      return '#F97316';
    case 'Critical Risk':
      return '#DC2626';
    // Blood lipids range labels
    case 'Healthy Range (<130 mg/dL)':
      return '#34C759';
    case 'Intermediate Range (130–159 mg/dL)':
      return '#FFCC00';
    case 'Elevated Range (160–189 mg/dL)':
      return '#FF9500';
    case 'High Range (190–219 mg/dL)':
    case 'Very High Range (≥ 220 mg/dL)':
      return '#FF3B30';
    default:
      return '#6B7280';
  }
};

// Blood sugar range label derived from score (mirrors Figma color logic)
const getBloodSugarRangeLabel = (score: number | null): string | null => {
  if (score === null) return null;
  if (score === 100) return 'In-Range';
  if (score === 60) return 'Prediabetes';
  return 'Diabetes';
};

// BMI range label derived from BMI value
const getBMIRangeLabel = (bmiValue: number | null): string | null => {
  if (bmiValue === null) return null;
  if (bmiValue < 18.5) return 'Poor (Underweight)';
  if (bmiValue <= 24.9) return 'Excellent';
  if (bmiValue <= 29.9) return 'Fair (Overweight)';
  return 'Poor (Obese)';
};

// Diet range label derived from MEPA score (0-10): 8-10 excellent, 5-7 fair, 0-4 poor
const getDietRangeLabel = (mepaScore: number | null): string | null => {
  if (mepaScore === null) return null;
  if (mepaScore >= 8) return 'Excellent';
  if (mepaScore >= 5) return 'Fair';
  return 'Poor';
};

// Smoking range label derived from score
const getSmokingRangeLabel = (score: number | null): string | null => {
  if (score === null) return null;
  if (score === 0) return 'Critical Risk';
  if (score <= 25) return 'High Risk';
  if (score <= 50) return 'Moderate Risk';
  if (score <= 75) return 'Low Risk';
  return 'Optimal';
};

// Blood lipids (Non-HDL) range label derived from score
const nonHDLScoring: Record<string, number> = {
  'Healthy Range': 100,
  'Intermediate Range': 60,
  'Elevated Range ': 40,
  'High Range': 20,
  'Very High Range': 0,
};

const getBloodLipidRangeLabel = (score: number | null): string | null => {
  if (score === null) return null;
  const entry = Object.entries(nonHDLScoring).find(([, s]) => s === score);
  return entry ? entry[0] : null;
};

const DEFAULT_NOT_CALCULATED = 'Calculate your score';

// ─── HeartScoreGauge ────────────────────────────────────────────────────────

const HeartScoreGauge: React.FC<{ score: number | null }> = ({ score }) => {
  const size = 280;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  // Arc runs from 180° (left) to 0° (right) — top half only
  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 0 1 ${e.x} ${e.y}`;
  };

  const circumference = Math.PI * radius; // half-circle arc length
  const progress = score !== null ? Math.min(Math.max(score / 100, 0), 1) : 0;
  const progressLength = progress * circumference;

  const status = getStatusFromScore(score);
  const statusColor = getStatusColor(status);

  return (
    <View style={gaugeStyles.container}>
      <Svg width={size} height={size / 2 + 20}>
        {/* Background track */}
        <Path
          d={describeArc(180, 0)}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Coloured progress arc */}
        <Path
          d={describeArc(180, 0)}
          fill="none"
          stroke={score !== null ? '#3B82F6' : '#E5E7EB'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference}`}
        />
      </Svg>
      <View style={gaugeStyles.textOverlay}>
        <Text style={gaugeStyles.title}>Heart Health Score</Text>
        <Text style={gaugeStyles.score}>
          {score !== null ? `${score} out of 100` : '— out of 100'}
        </Text>
        {status && (
          <View style={[gaugeStyles.statusPill, { backgroundColor: statusColor + '1A' }]}>
            <Text style={[gaugeStyles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const gaugeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  textOverlay: {
    alignItems: 'center',
    marginTop: -20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  score: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
  },
  statusPill: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ─── MetricItem ─────────────────────────────────────────────────────────────

const MetricItem: React.FC<{
  title: string;
  score: number | null;
  unit?: string;
  badge?: string;
  onPress?: () => void;
  status?: string | null;
  showNotCalculated?: boolean;
  notCalculatedMessage?: string;
  colorValueByStatus?: boolean;
}> = ({
  title,
  score,
  unit,
  badge,
  onPress,
  status,
  showNotCalculated,
  notCalculatedMessage = DEFAULT_NOT_CALCULATED,
  colorValueByStatus,
}) => {
  const calculatedStatus = status || getStatusFromScore(score !== null && score !== undefined ? score : null);
  const statusColor = getStatusColor(calculatedStatus || null);
  const valueColor = colorValueByStatus && calculatedStatus ? statusColor : undefined;

  const inner = (
    <>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{badge} pts</Text>
          </View>
        )}
      </View>
      <View style={styles.metricContent}>
        {score !== null && score !== undefined ? (
          <View style={styles.metricValueRow}>
            <Text style={[styles.metricValue, valueColor ? { color: valueColor } : undefined]}>{score}</Text>
            {unit && <Text style={styles.metricUnit}> {unit}</Text>}
          </View>
        ) : (
          showNotCalculated && (
            <Text style={styles.notCalculatedText} numberOfLines={2}>{notCalculatedMessage}</Text>
          )
        )}
        {calculatedStatus && (
          <Text style={[styles.metricStatus, { color: statusColor }]}>{calculatedStatus}</Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.metricTile} onPress={onPress} activeOpacity={0.75}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={styles.metricTile}>{inner}</View>;
};

// ─── CardioVascularScreen ────────────────────────────────────────────────────

const CardioVascularScreen: React.FC = () => {
  const navigation = useNavigation<CardioNavigationProp>();
  const { accessToken, refreshAccessToken, logout } = useAuth();
  const { isConnected: fitbitConnected } = useFitbitAuth();
  const [hasSmoked, setHasSmoked] = useState<'Yes' | 'No'>('Yes');
  const [lastSmoked, setLastSmoked] = useState<'More than 5 years ago' | '1–5 years ago' | 'Within the past year' | 'I currently smoke/use'>('More than 5 years ago');
  const [bloodLipidScore, setBloodLipidScore] = useState<number | null>(null);
  const [bloodLipidValue, setBloodLipidValue] = useState<number | null>(null);
  const [bloodSugarScore, setBloodSugarScore] = useState<number | null>(null);
  const [bloodSugarValue, setBloodSugarValue] = useState<number | null>(null);
  const [bmiScore, setBmiScore] = useState<number | null>(null);
  const [bmiValue, setBmiValue] = useState<number | null>(null);
  const [dietScore, setDietScore] = useState<number | null>(null);
  const [dietMepaScore, setDietMepaScore] = useState<number | null>(null);
  const [smokingScore, setSmokingScore] = useState<number | null>(null);
  const [activityScore, setActivityScore] = useState<number | null>(null);
  const [activitySteps, setActivitySteps] = useState<number | null>(null);
  const [sleepScore, setSleepScore] = useState<number | null>(null);
  const [sleepDisplayHours, setSleepDisplayHours] = useState<number | null>(null);
  const [heartScore, setHeartScore] = useState<number | null>(null);

  // Calculate heart score as average of all LE8 scores
  const calculateHeartScore = useCallback(() => {
    const scores: number[] = [];

    if (activityScore !== null) scores.push(activityScore);
    if (sleepScore !== null) scores.push(sleepScore);
    if (bloodSugarScore !== null) scores.push(bloodSugarScore);
    if (bloodLipidScore !== null) scores.push(bloodLipidScore);
    if (bmiScore !== null) scores.push(bmiScore);
    if (dietScore !== null) scores.push(dietScore);
    if (smokingScore !== null) scores.push(smokingScore);

    if (scores.length > 0) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      setHeartScore(Math.round(average));
    } else {
      setHeartScore(null);
    }
  }, [activityScore, sleepScore, bloodSugarScore, bloodLipidScore, bmiScore, dietScore, smokingScore]);

  useEffect(() => {
    calculateHeartScore();
  }, [calculateHeartScore]);

  const handleHeartScorePress = () => navigation.navigate('HeartScoreLanding');
  const handleBloodSugarPress = () => navigation.navigate('BloodSugarLanding');
  const handleBloodLipidsPress = () => navigation.navigate('BloodLipidsLanding');
  const handleBmiPress = () => navigation.navigate('BmiLanding');
  const handleDietPress = () => navigation.navigate('DietLanding');
  const handleSmokingPress = () => navigation.navigate('SmokingLanding');
  const handlePhysicalActivityPress = () => navigation.navigate('PhysicalActivityLanding');
  const handleSleepPress = () => navigation.navigate('SleepLanding');
  const handleBloodPressurePress = () => navigation.navigate('BloodPressureLanding');
  const handleViewHistoricalDataPress = () => navigation.navigate('CardioHistoricalData');

  const fetchAllHealthScores = useCallback(async () => {
    if (!accessToken) return;

    const cachedBL = await getCachedBloodLipids();
    if (cachedBL) {
      setBloodLipidScore(cachedBL.score ?? null);
      setBloodLipidValue(cachedBL.value ?? null);
    }

    const cachedBS = await getCachedBloodSugar();
    if (cachedBS) {
      setBloodSugarScore(cachedBS.score ?? null);
      setBloodSugarValue(cachedBS.value ?? null);
    }

    const cachedBMI = await getCachedBmi();
    if (cachedBMI) {
      setBmiScore(cachedBMI.score ?? null);
      setBmiValue(cachedBMI.value ?? null);
    }

    const cachedDiet = await getCachedDiet();
    if (cachedDiet) {
      setDietScore(cachedDiet.score ?? null);
      setDietMepaScore(cachedDiet.mepaScore ?? null);
    }

    const cachedSmoking = await getCachedSmoking();
    if (cachedSmoking) {
      setSmokingScore(cachedSmoking.score ?? null);
    }

    try {
      const tz = getDeviceTimezone();
      const healthScoresUrl = tz
        ? `${HEALTH_SCORES_BASE}?timezone=${encodeURIComponent(tz)}`
        : HEALTH_SCORES_BASE;
      const response = await fetchWithAuth(
        healthScoresUrl,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        accessToken,
        refreshAccessToken,
        logout,
      );

      if (response.ok) {
        const data = await response.json();

        setBloodLipidScore(data.bloodLipids?.score ?? null);
        setBloodLipidValue(data.bloodLipids?.value ?? null);
        await setCachedBloodLipids({
          score: data.bloodLipids?.score ?? null,
          value: data.bloodLipids?.value ?? null,
          measureType: data.bloodLipids?.measureType ?? null,
        });

        setBloodSugarScore(data.bloodSugar?.score ?? null);
        setBloodSugarValue(data.bloodSugar?.value ?? null);
        await setCachedBloodSugar({
          score: data.bloodSugar?.score ?? null,
          value: data.bloodSugar?.value ?? null,
          testType: data.bloodSugar?.testType ?? null,
        });

        setBmiScore(data.bmi?.score ?? null);
        setBmiValue(data.bmi?.value ?? null);
        await setCachedBmi({
          score: data.bmi?.score ?? null,
          value: data.bmi?.value ?? null,
        });

        setDietScore(data.diet?.score ?? null);
        setDietMepaScore(data.diet?.mepaScore ?? null);
        await setCachedDiet({
          score: data.diet?.score ?? null,
          mepaScore: data.diet?.mepaScore ?? null,
        });

        setSmokingScore(data.smoking?.score ?? null);
        await setCachedSmoking({
          score: data.smoking?.score ?? null,
          category: data.smoking?.category ?? null,
        });

        setActivityScore(data.physicalActivity?.score ?? null);
        setActivitySteps(data.physicalActivity?.steps ?? null);
        if (data.physicalActivity?.steps == null) {
          try {
            const stepsUrl = tz
              ? `${FITBIT_STEPS_BASE}?timezone=${encodeURIComponent(tz)}`
              : FITBIT_STEPS_BASE;
            const stepsRes = await fetchWithAuth(
              stepsUrl,
              { method: 'GET' },
              accessToken,
              refreshAccessToken,
              logout,
            );
            if (stepsRes.ok) {
              const stepsData = await stepsRes.json();
              if (stepsData.steps != null) setActivitySteps(Number(stepsData.steps));
              if (stepsData.score != null) setActivityScore(Number(stepsData.score));
            }
          } catch (stepsErr) {
            console.error('Error fetching Fitbit steps for cardiovascular screen:', stepsErr);
          }
        }

        setSleepScore(data.sleep?.score ?? null);
        setSleepDisplayHours(data.sleep?.hours ?? null);
      } else {
        const errorText = await response.text();
        console.error('Error fetching health scores:', response.status, errorText);
        if (!cachedBL) { setBloodLipidScore(null); setBloodLipidValue(null); }
        if (!cachedBS) { setBloodSugarScore(null); setBloodSugarValue(null); }
        if (!cachedBMI) { setBmiScore(null); setBmiValue(null); }
        if (!cachedDiet) { setDietScore(null); setDietMepaScore(null); }
        setSmokingScore(null);
        setActivityScore(null);
        setActivitySteps(null);
        setSleepScore(null);
        setSleepDisplayHours(null);
      }
    } catch (error) {
      console.error('Error fetching health scores:', error);
      if (!cachedBL) { setBloodLipidScore(null); setBloodLipidValue(null); }
      if (!cachedBS) { setBloodSugarScore(null); setBloodSugarValue(null); }
      if (!cachedBMI) { setBmiScore(null); setBmiValue(null); }
      // cachedDiet already set above
      setSmokingScore(null);
      setActivityScore(null);
      setActivitySteps(null);
      setSleepScore(null);
      setSleepDisplayHours(null);
    }
  }, [accessToken, refreshAccessToken, logout]);

  useFocusEffect(
    React.useCallback(() => {
      fetchAllHealthScores();
    }, [fetchAllHealthScores])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>mHealthy Hearts</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <Settings />
        </View>

        {/* ── Gauge Card ── */}
        <TouchableOpacity style={styles.gaugeCard} onPress={handleHeartScorePress} activeOpacity={0.85}>
          <HeartScoreGauge score={heartScore} />
        </TouchableOpacity>

        {/* ── LE8 Metrics ── */}
        <Text style={styles.sectionTitle}>Life's Essential 8</Text>

        <MetricItem
          title="Physical Activity"
          score={activitySteps}
          unit="steps"
          badge={activityScore !== null ? String(activityScore) : undefined}
          status={getStatusFromScore(activityScore)}
          showNotCalculated={true}
          notCalculatedMessage={fitbitConnected ? 'No steps data for today' : 'Connect your Fitbit device'}
          onPress={handlePhysicalActivityPress}
        />

        <MetricItem
          title="Sleep"
          score={sleepDisplayHours !== null ? Math.round(sleepDisplayHours * 10) / 10 : null}
          unit="hrs"
          badge={sleepScore !== null ? String(sleepScore) : undefined}
          status={getStatusFromScore(sleepScore)}
          showNotCalculated={true}
          notCalculatedMessage={fitbitConnected ? 'Update sleep on the Fitbit App' : 'Connect your Fitbit device'}
          onPress={handleSleepPress}
        />

        <MetricItem
          title="Blood Pressure"
          score={null}
          unit="mmHg"
          showNotCalculated={true}
          notCalculatedMessage="Connect your Omron device"
          onPress={handleBloodPressurePress}
        />

        <MetricItem
          title="Blood Sugar"
          score={bloodSugarValue !== null ? bloodSugarValue : null}
          unit="mg/dL"
          badge={bloodSugarScore !== null ? String(bloodSugarScore) : undefined}
          status={getBloodSugarRangeLabel(bloodSugarScore)}
          showNotCalculated={bloodSugarScore === null}
          onPress={handleBloodSugarPress}
        />

        <MetricItem
          title="Blood Lipids"
          score={bloodLipidValue !== null ? bloodLipidValue : null}
          unit="mg/dL"
          badge={bloodLipidScore !== null ? String(bloodLipidScore) : undefined}
          status={getBloodLipidRangeLabel(bloodLipidScore)}
          showNotCalculated={bloodLipidScore === null}
          onPress={handleBloodLipidsPress}
        />

        <MetricItem
          title="Body Mass Index"
          score={bmiValue !== null ? Math.round(bmiValue * 10) / 10 : null}
          unit="BMI"
          badge={bmiScore !== null ? String(bmiScore) : undefined}
          showNotCalculated={bmiScore === null}
          onPress={handleBmiPress}
          status={getBMIRangeLabel(bmiValue)}
        />

        <MetricItem
          title="Diet"
          score={dietMepaScore}
          unit="(MEPA score out of 10)"
          badge={dietScore !== null ? String(dietScore) : undefined}
          status={getDietRangeLabel(dietMepaScore)}
          showNotCalculated={dietScore === null}
          onPress={handleDietPress}
        />

        <MetricItem
          title="Smoking"
          score={smokingScore}
          badge={smokingScore !== null ? String(smokingScore) : undefined}
          showNotCalculated={smokingScore === null}
          status={getSmokingRangeLabel(smokingScore)}
          onPress={handleSmokingPress}
        />

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F1F3F9',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  // Gauge card
  gaugeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // Section title
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },

  // Individual metric tile (card per metric, uniform height)
  metricTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 110,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 34,
  },
  metricUnit: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
    marginBottom: 3,
  },
  metricStatus: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  notCalculatedText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    flex: 1,
  },

  // Score badge pill
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CardioVascularScreen;
