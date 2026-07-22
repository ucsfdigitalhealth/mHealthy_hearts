import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import Settings from '../components/Settings';
import { useSteps } from '../hooks/useSteps';
import { useActivityGoal } from '../hooks/useActivityGoal';
import { useFitbitAuth } from '../context/FitbitAuthContext';
import { formatDateLong } from '../utils/localDate';

const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { connectFitbit } = useFitbitAuth();
  const { steps, stepsNumber, fitbitDisconnected, refresh: refreshSteps } = useSteps();
  const { todayGoal, currentStreak, longestStreak, refresh: refreshGoal } = useActivityGoal();
  const { width } = useWindowDimensions();
  const progressSize = Math.min(width - 80, 200);

  useFocusEffect(
    useCallback(() => {
      refreshGoal();
      refreshSteps();
    }, [refreshGoal, refreshSteps])
  );

  const goalSteps = todayGoal?.stepTarget ?? 6000;
  const progressPct = goalSteps > 0 ? Math.min(100, (stepsNumber / goalSteps) * 100) : 0;
  const progressColor = progressPct < 33 ? '#DC2626' : progressPct < 66 ? '#F59E0B' : '#34C759';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Activity</Text>
        <Settings />
      </View>

      {fitbitDisconnected && (
        <TouchableOpacity style={styles.reconnectBanner} onPress={connectFitbit} activeOpacity={0.8}>
          <Ionicons name="warning-outline" size={18} color="#92400E" style={{ marginRight: 8 }} />
          <Text style={styles.reconnectText}>Fitbit connection expired. Tap to reconnect.</Text>
        </TouchableOpacity>
      )}

      {/* Goal Setting Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Goal</Text>
        {todayGoal ? (
          <View style={styles.goalStatusRow}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={styles.goalStatusText}>Today's goal: {todayGoal.stepTarget.toLocaleString()} steps</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.setGoalButton}
            onPress={() => navigation.navigate('GoalStep1')}
            activeOpacity={0.8}
          >
            <Text style={styles.setGoalButtonText}>Set Your Daily Goal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Streak Card - Duolingo style */}
      <View style={styles.card}>
        <View style={styles.streakRow}>
          <View style={styles.streakIconCircle}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
          <View style={styles.streakContent}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
          {longestStreak > currentStreak && (
            <Text style={styles.longestText}>Best: {longestStreak} days</Text>
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Steps today</Text>
        <View style={[styles.progressCircleWrap, { width: progressSize, height: progressSize }]}>
          <View
            style={[
              styles.progressCircleBg,
              {
                width: progressSize,
                height: progressSize,
                borderRadius: progressSize / 2,
                borderWidth: 10,
                borderColor: '#E5E7EB',
              },
            ]}
          />
          <View style={styles.progressCircleCenter}>
            <Text style={styles.progressNumber}>{steps}</Text>
            <Text style={styles.progressGoal}>of {goalSteps.toLocaleString()} steps</Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: '#E5E7EB' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPct}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
        <Text style={styles.dateText}>{formatDateLong()}</Text>
      </View>

      {/* From Your Coach */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.coachIcon}>
            <Text style={styles.coachEmoji}>👨‍⚕️</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>From your coach</Text>
            <Text style={styles.cardDescription}>
              Great sleep last! Try a 10-minute walk before noon to get a head start on your goal
            </Text>
          </View>
        </View>
      </View>

      {/* Daily Challenge */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.trophyIcon}>
            <Ionicons name="trophy" size={28} color="#FFF" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Daily Challenge</Text>
            <Text style={styles.cardDescription}>
              Meet your step goal to keep your streak going
            </Text>
          </View>
        </View>
      </View>

      {/* Let's Move */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Let's Move</Text>
        </View>
        <View style={styles.workoutRow}>
          <View style={styles.videoThumbnail}>
            <Ionicons name="play" size={32} color="#FFF" />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>Beginner Walking Warm-Up</Text>
            <Text style={styles.workoutDuration}>10 minutes</Text>
          </View>
          <View style={styles.videoPreview}>
            <Ionicons name="videocam" size={24} color="#8E8E93" />
          </View>
        </View>
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See All Workouts</Text>
        </TouchableOpacity>
      </View>

      {/* Explore & Learn */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.exploreIcon}>
            <Ionicons name="play" size={20} color="#FFF" />
            <Ionicons name="bulb" size={16} color="#FFD60A" style={styles.bulbIcon} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Explore & Learn</Text>
            <Text style={styles.cardDescription}>
              Videos and animations to support your heart health.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  cardContent: { flex: 1 },
  cardDescription: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
  },
  goalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalStatusText: { fontSize: 16, color: '#374151' },
  setGoalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  setGoalButtonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  fireEmoji: { fontSize: 32 },
  streakContent: { flex: 1 },
  streakNumber: { fontSize: 36, fontWeight: '800', color: '#111827' },
  streakLabel: { fontSize: 17, color: '#6B7280', marginTop: 2 },
  longestText: { fontSize: 14, color: '#9CA3AF' },
  progressCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  progressTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 16 },
  progressCircleWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressCircleBg: {
    position: 'absolute',
  },
  progressCircleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontSize: 42,
    fontWeight: '700',
    color: '#000',
  },
  progressGoal: { fontSize: 15, color: '#6B7280', marginTop: 4 },
  progressBar: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  dateText: { fontSize: 13, color: '#8E8E93' },
  coachIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachEmoji: { fontSize: 28 },
  trophyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exploreIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  bulbIcon: { position: 'absolute', top: 4, right: 4 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: '#5856D6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workoutInfo: { flex: 1 },
  workoutTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 4 },
  workoutDuration: { fontSize: 13, color: '#8E8E93' },
  videoPreview: {
    width: 60,
    height: 45,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllButton: { alignItems: 'center', paddingVertical: 8 },
  seeAllText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  reconnectText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    flex: 1,
  },
});

export default ActivityScreen;
