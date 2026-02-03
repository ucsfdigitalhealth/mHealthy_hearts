// CardioHistoricalDataScreen.tsx – historical cardiovascular data (Figma design, charts blank)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const CHART_HEIGHT = 220;
const CHART_PADDING_LEFT = 28;
const CHART_PADDING_BOTTOM = 24;

type MetricKey = 'Sleep' | 'Diet' | 'Nico' | 'BMI' | 'PA' | 'BP';

const METRICS: { key: MetricKey; label: string; icon: keyof typeof Ionicons.glyphMap; chartTitle: string }[] = [
  { key: 'Sleep', label: 'Sleep', icon: 'moon', chartTitle: 'Hours of Sleep' },
  { key: 'Diet', label: 'Diet', icon: 'nutrition', chartTitle: 'Diet Score' },
  { key: 'Nico', label: 'Nico..', icon: 'ban', chartTitle: 'Nicotine' },
  { key: 'BMI', label: 'BMI', icon: 'body', chartTitle: 'BMI' },
  { key: 'PA', label: 'PA', icon: 'water', chartTitle: 'Physical Activity' },
  { key: 'BP', label: 'BP', icon: 'heart', chartTitle: 'Blood Pressure' },
];

const TIME_RANGES = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

// Y-axis labels for blank chart (e.g. sleep hours style)
const Y_LABELS = ['9', '7.5', '4.5', '4'];
const X_LABELS = ['Jan 1', 'Jan 7', 'Jan 13', 'Jan 19', 'Jan 31'];

const CardioHistoricalDataScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('Sleep');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('Monthly');

  const currentMetricConfig = METRICS.find((m) => m.key === selectedMetric)!;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric pills – horizontal */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricPillsRow}
          style={styles.metricPillsScroll}
        >
          {METRICS.map((m) => {
            const isSelected = selectedMetric === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setSelectedMetric(m.key)}
                style={[styles.metricPill, isSelected && styles.metricPillSelected]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={m.icon}
                  size={18}
                  color={isSelected ? '#FFFFFF' : '#374151'}
                />
                <Text style={[styles.metricPillText, isSelected && styles.metricPillTextSelected]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time range tabs */}
        <View style={styles.timeRangeRow}>
          {TIME_RANGES.map((range) => {
            const isSelected = selectedTimeRange === range;
            return (
              <TouchableOpacity
                key={range}
                onPress={() => setSelectedTimeRange(range)}
                style={styles.timeRangeTab}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeRangeText, isSelected && styles.timeRangeTextSelected]}>
                  {range}
                </Text>
                {isSelected && <View style={styles.timeRangeUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Chart title */}
        <Text style={styles.chartTitle}>{currentMetricConfig.chartTitle}</Text>

        {/* Blank chart – axes, labels, shaded band only (no line/points) */}
        <View style={styles.chartContainer}>
          <View style={styles.chartInner}>
            {/* Y-axis labels */}
            <View style={styles.yAxisLabels}>
              {Y_LABELS.map((label, i) => (
                <Text key={i} style={styles.yAxisLabel}>
                  {label}
                </Text>
              ))}
            </View>
            {/* Chart area: only shaded “healthy range” band, no data */}
            <View style={styles.chartArea}>
              <View style={styles.chartAreaInner}>
                {/* Green shaded band (e.g. 4.5–7.5 range) – no line, no points */}
                <View style={styles.healthyRangeBand} />
              </View>
            </View>
          </View>
          {/* X-axis labels */}
          <View style={styles.xAxisRow}>
            {X_LABELS.map((label, i) => (
              <Text key={i} style={styles.xAxisLabel}>
                {label}
              </Text>
            ))}
          </View>
        </View>

        {/* Update My Value button */}
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => {}}
          activeOpacity={0.8}
        >
          <Text style={styles.updateButtonText}>Update My Value</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  metricPillsScroll: {
    marginTop: 16,
    marginHorizontal: -20,
  },
  metricPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricPillSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  metricPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  metricPillTextSelected: {
    color: '#FFFFFF',
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  timeRangeTab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 8,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  timeRangeTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  timeRangeUnderline: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    height: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 1,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  chartContainer: {
    width: '100%',
    marginTop: 8,
  },
  chartInner: {
    flexDirection: 'row',
    width: '100%',
    minHeight: CHART_HEIGHT,
  },
  yAxisLabels: {
    width: CHART_PADDING_LEFT,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  chartArea: {
    flex: 1,
    marginLeft: 8,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: CHART_HEIGHT,
  },
  chartAreaInner: {
    flex: 1,
    minHeight: CHART_HEIGHT - 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'flex-end',
  },
  healthyRangeBand: {
    height: '40%',
    width: '100%',
    backgroundColor: 'rgba(167, 243, 208, 0.5)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: CHART_PADDING_LEFT + 8,
    paddingRight: 4,
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  updateButton: {
    marginTop: 32,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CardioHistoricalDataScreen;
