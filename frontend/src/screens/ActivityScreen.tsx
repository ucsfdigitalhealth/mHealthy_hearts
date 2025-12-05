import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Settings from '../components/Settings';
import { useAuth } from '../context/AuthContext';

const ActivityScreen: React.FC = () => {
  const { accessToken } = useAuth();
  const [steps, setSteps] = useState<string>('—');

  useEffect(() => {
    const fetchSteps = async () => {
      if (!accessToken) return;
      try {
        const res = await fetch('http://localhost:3000/api/fitbitAuth/fitbit/activitySummary', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) {
          console.error('[ActivityScreen] Failed to fetch activity summary. Status:', res.status);
          return;
        }
        const data = await res.json();
        const lastDay = Array.isArray(data.data) && data.data.length > 0 ? data.data[data.data.length - 1] : null;
        const latestSteps = lastDay?.steps ?? 0;
        setSteps(Number(latestSteps).toLocaleString());
      } catch (err) {
        console.error('[ActivityScreen] Error fetching steps:', err);
      }
    };

    fetchSteps();
  }, [accessToken]);

  return (
    <ScrollView style={styles.container}>
      {/* Header with Date */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Activity</Text>
        <Settings />
      </View>
      
      {/* Steps Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressCircle}>
          <Ionicons name="walk" size={32} color="#34C759" />
          <Text style={styles.progressNumber}>{steps}</Text>
          <Text style={styles.progressGoal}>of 6,000 steps</Text>
        </View>
        <Text style={styles.dateText}>November 22nd, 2025</Text>
      </View>

      {/* Streaks Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Streaks</Text>
            <Text style={styles.cardDescription}>
              Ready to start your streak? Meet today's goal to begin
            </Text>
          </View>
        </View>
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
              Great sleep last! Try a 10-minute walk before noon to get a head start on your goal
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
    marginBottom: 12,
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
  dateText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fireEmoji: {
    fontSize: 28,
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
  bulbIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
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
  workoutInfo: {
    flex: 1,
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
  videoPreview: {
    width: 60,
    height: 45,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default ActivityScreen;