import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Settings from '../components/Settings';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSteps } from '../hooks/useSteps';
import { useSleep } from '../hooks/useSleep';
import { useActivityGoal } from '../hooks/useActivityGoal';
import { useFitbitAuth } from '../context/FitbitAuthContext';

const TodayScreen: React.FC = () => {
  const navigation = useNavigation();
  const { connectFitbit } = useFitbitAuth();
  const { steps, stepsNumber, fitbitDisconnected: stepsFitbitDisconnected, refresh: refreshSteps } = useSteps();
  const { formatted: sleepFormatted, sleepScore, isLoading: sleepLoading, error: sleepError, fitbitDisconnected: sleepFitbitDisconnected, refresh: refreshSleep } = useSleep();
  const { todayGoal, refresh: refreshGoal } = useActivityGoal();
  const fitbitReconnectNeeded = stepsFitbitDisconnected || sleepFitbitDisconnected;

  useFocusEffect(
    useCallback(() => {
      refreshSteps();
      refreshSleep();
      refreshGoal();
    }, [refreshSteps, refreshSleep, refreshGoal])
  );

  const goalSteps = todayGoal?.stepTarget ?? 0;
  const progressPct = goalSteps > 0 ? Math.min(100, (stepsNumber / goalSteps) * 100) : 0;
  const progressColor = progressPct < 33 ? '#DC2626' : progressPct < 66 ? '#F59E0B' : '#34C759';

  const handleSymptomCheckIn = () => {
    // Navigate to Symptom Assessment screen
    navigation.navigate('Symptoms' as never);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Today</Text>
        <Settings />
      </View>

      {fitbitReconnectNeeded && (
        <TouchableOpacity style={styles.reconnectBanner} onPress={connectFitbit} activeOpacity={0.8}>
          <Ionicons name="warning-outline" size={18} color="#92400E" style={{ marginRight: 8 }} />
          <Text style={styles.reconnectText}>Fitbit connection expired. Tap to reconnect.</Text>
        </TouchableOpacity>
      )}

      {/* Steps Progress Circle */}
      <View style={styles.progressCard}>
        <View style={styles.progressCircle}>
          <Ionicons name="walk" size={32} color="#34C759" />
          <Text style={styles.progressNumber}>{steps}</Text>
          <Text style={styles.progressGoal}>
            {todayGoal ? `of ${todayGoal.stepTarget.toLocaleString()} steps` : 'steps today'}
          </Text>
        </View>
        {todayGoal ? (
          <>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPct}%`, backgroundColor: progressColor },
                ]}
              />
            </View>
            <TouchableOpacity
              style={styles.editGoalButton}
              onPress={() => navigation.navigate('GoalStep1' as never)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color="#007AFF" />
              <Text style={styles.editGoalButtonText}>Edit Step Goal</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.setGoalButton}
            onPress={() => navigation.navigate('GoalStep1' as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.setGoalButtonText}>Set Your Daily Goal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Coach Message */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
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

      {/* Sleep Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="moon" size={24} color="#5856D6" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Sleep</Text>
            <Text style={styles.metricValue}>{sleepFormatted}</Text>
            <Text style={styles.metricSubtext}>
              {sleepError ? "Couldn't load sleep" : sleepLoading ? 'Checking…' : "Last night's sleep"}
            </Text>
          </View>
          {!sleepLoading && !sleepError && (
            <View style={sleepScore >= 70 ? styles.badgeGreen : styles.badgeYellow}>
              <Text style={styles.badgeText}>{sleepScore >= 70 ? 'On Goal' : 'Below Goal'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Blood Pressure Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="fitness" size={24} color="#FF3B30" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Blood Pressure</Text>
            <Text style={styles.metricValue}>118/76 mmHg</Text>
            <Text style={styles.metricSubtext}>Last taken: Today, 7:14 AM</Text>
          </View>
          <View style={styles.badgeGreen}>
            <Text style={styles.badgeText}>Normal</Text>
          </View>
        </View>
      </View>

      {/* Symptom Check-In Card - Updated with navigation */}
      <TouchableOpacity 
        style={styles.card}
        onPress={handleSymptomCheckIn}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, styles.symptomIcon]}>
            <Ionicons name="clipboard" size={24} color="#007AFF" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, styles.symptomTitle]}>Symptom Check-In</Text>
            <Text style={styles.metricSubtext}>Anything you want to report</Text>
          </View>
          <TouchableOpacity 
            style={styles.checkInButton}
            onPress={handleSymptomCheckIn}
          >
            <Text style={styles.checkInButtonText}>Check In</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Today's Movement */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="play-circle" size={28} color="#000" />
          <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Today's Movement</Text>
        </View>
        <View style={styles.workoutCard}>
          <View style={styles.videoThumbnail}>
            <Ionicons name="play" size={32} color="#FFF" />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>Beginner Walking Warm-Up</Text>
            <Text style={styles.workoutDuration}>10 minutes</Text>
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
  progressCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
  },
  progressGoal: {
    fontSize: 17,
    color: '#000',
    marginTop: 4,
  },
  progressBarTrack: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginTop: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  setGoalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  setGoalButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  editGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editGoalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachEmoji: {
    fontSize: 28,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  symptomIcon: {
    backgroundColor: '#E3F2FD', // Light blue background for symptom icon
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  symptomTitle: {
    color: '#007AFF', // Blue color for symptom title
  },
  cardDescription: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginTop: 2,
  },
  metricSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  badgeYellow: {
    backgroundColor: '#FFD60A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeGreen: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  checkInButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  checkInButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  workoutCard: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  videoThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: '#8E8E93',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  workoutDuration: {
    fontSize: 13,
    color: '#8E8E93',
  },
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

export default TodayScreen;