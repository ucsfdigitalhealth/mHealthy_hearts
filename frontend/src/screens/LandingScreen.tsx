import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HealthTile from '../components/HealthTile';

export const LandingScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Your health at a glance</Text>

        <View style={styles.grid}>
          <View style={styles.row}>
            <View style={styles.col}>
              <HealthTile title="Steps" value={8452} unit="steps" icon="walk" backgroundColor="#EAF2FF" />
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
      </ScrollView>
    </SafeAreaView>
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
  subheading: {
    fontSize: 14,
    color: '#6B7280',
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
});

export default LandingScreen;


