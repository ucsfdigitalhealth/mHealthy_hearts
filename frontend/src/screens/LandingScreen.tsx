import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HealthTile from '../components/HealthTile';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CvButton from '../components/CvButton';

export const LandingScreen: React.FC = () => {
  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.row}>
          <Text style={styles.heading}>Hi Ali</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Authorize Fitbit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <View style={styles.row}>
            <View style={styles.col}>
              <HealthTile title="Steps" value={8098} unit="steps" icon="walk" backgroundColor="#EAF2FF" />
            </View>
            <View style={styles.col}>
              <HealthTile title="BP" value="118/76" unit="mmHg" icon="fitness" backgroundColor="#F8F5FF" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <HealthTile title="Smoking" value="No" icon="leaf" backgroundColor="#F0FFF4" />
            </View>
            <View style={styles.col}>
              <HealthTile title="Heart Rate" value={72} unit="bpm" icon="heart" backgroundColor="#FFF5F5" />
            </View>
          </View>
        </View>
        <CvButton />
        {/* Physical Activity Section */}
        <View style={styles.sectionCol}>
          <View style={styles.sectionHeader}>
            <Icon name="directions-run" size={24} color="#000000" />
            <Text style={styles.sectionTitle}>Physical Activity</Text>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <View style={[styles.circle, { borderColor: '#00CC00', borderWidth: 10 }]}>
                <Text style={styles.metricValue}>149</Text>
              </View>
              <Text style={styles.metricLabel}>MVPA</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={[styles.circle, { borderColor: '#007AFF', borderWidth: 10 }]}>
                <Text style={styles.metricValue}>1345</Text>
              </View>
              <Text style={styles.metricLabel}>Steps</Text>
            </View>
          </View>
        </View>

        {/* Set Weekly Goal Button */}
        <TouchableOpacity style={styles.goalButton}>
          <Text style={styles.goalButtonText}>Set your weekly goal</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Educational Resources Section */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionHeader}>
            <Icon name="school" size={24} color="#000000" />
            <Text style={styles.sectionTitle}>Educational Resources</Text>
          </View>
          <View style={styles.resourceIcon}>
            <Icon name="play-circle-filled" size={24} color="#FF0000" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  button: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  col: {
    flex: 1,
  },
  sectionCol: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  sectionRow: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignContent: 'center'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: '#D3D3D3',
    borderWidth: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666666',
  },
  goalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resourceIcon: {
    alignItems: 'flex-end',
  },
});

export default LandingScreen;