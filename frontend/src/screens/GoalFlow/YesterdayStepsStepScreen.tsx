import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getDeviceTimezone } from '../../utils/localDate';

const API_BASE = 'http://localhost:3000/api/activity';

const YesterdayStepsStepScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accessToken } = useAuth();
  const [yesterdaySteps, setYesterdaySteps] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!accessToken) {
        setYesterdaySteps(0);
        setLoading(false);
        return;
      }
      try {
        const tz = getDeviceTimezone();
        const url = tz ? `${API_BASE}/yesterday-steps?timezone=${encodeURIComponent(tz)}` : `${API_BASE}/yesterday-steps`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setYesterdaySteps(typeof data.steps === 'number' ? data.steps : 0);
        } else {
          setYesterdaySteps(0);
        }
      } catch {
        if (!cancelled) setYesterdaySteps(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [accessToken]);

  const handleAnswer = (completed: boolean) => {
    navigation.navigate('GoalStep3', { completedYesterday: completed });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Yesterday's Steps</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <>
            <Text style={styles.question}>
              Did you complete your step goal yesterday?{'\n'}
              <Text style={styles.stepsHighlight}>({yesterdaySteps?.toLocaleString() ?? 0} steps)</Text>
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.optionButton, styles.yesButton]} onPress={() => handleAnswer(true)} activeOpacity={0.8}>
                <Text style={styles.optionButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, styles.noButton]} onPress={() => handleAnswer(false)} activeOpacity={0.8}>
                <Text style={styles.optionButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backText: { fontSize: 17, color: '#007AFF', marginLeft: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  question: { fontSize: 18, color: '#374151', textAlign: 'center', marginBottom: 32 },
  stepsHighlight: { fontWeight: '700', color: '#111827' },
  loader: { marginVertical: 24 },
  buttonRow: { flexDirection: 'row', gap: 16 },
  optionButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  yesButton: { backgroundColor: '#34C759' },
  noButton: { backgroundColor: '#E5E7EB' },
  optionButtonText: { fontSize: 17, fontWeight: '600', color: '#111827' },
});

export default YesterdayStepsStepScreen;
