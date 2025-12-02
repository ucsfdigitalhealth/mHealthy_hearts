import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TodayScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Today</Text>

      {/* Steps Progress Circle */}
      <View style={styles.progressCard}>
        <View style={styles.progressCircle}>
          <Ionicons name="walk" size={32} color="#34C759" />
          <Text style={styles.progressNumber}>5,360</Text>
          <Text style={styles.progressGoal}>of 6,000 steps</Text>
        </View>
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
            <Text style={styles.metricValue}>6 h 20 m</Text>
            <Text style={styles.metricSubtext}>Last night's sleep</Text>
          </View>
          <View style={styles.badgeYellow}>
            <Text style={styles.badgeText}>Below Goal</Text>
          </View>
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

      {/* Symptom Check-In */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="clipboard" size={24} color="#007AFF" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Symptom Check-In</Text>
            <Text style={styles.metricSubtext}>Anything you want to report</Text>
          </View>
          <TouchableOpacity style={styles.checkInButton}>
            <Text style={styles.checkInButtonText}>Check In</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    marginLeft: 20,
    marginTop: 16,
    marginBottom: 16,
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
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
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
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  checkInButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
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
});

export default TodayScreen;