import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getDeviceTimezone } from '../../utils/localDate';

type GoalStep4Params = { completedYesterday: boolean; symptomRating: number };

const API_BASE = 'http://localhost:3000/api/activity';

const GoalSelectionStepScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GoalStep4'>>();
  const params = route.params as GoalStep4Params | undefined;
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ steps: number }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const completedYesterday = params?.completedYesterday ?? false;
  const symptomRating = params?.symptomRating ?? 3;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!accessToken) {
        setOptions([{ steps: 5000 }, { steps: 5500 }, { steps: 6000 }]);
        setOptionsLoading(false);
        return;
      }
      setOptionsLoading(true);
      setOptionsError(null);
      try {
        const tz = getDeviceTimezone();
        const url = `${API_BASE}/goal-options?symptomRating=${symptomRating}${tz ? `&timezone=${encodeURIComponent(tz)}` : ''}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(tz ? { 'X-Timezone': tz } : {}),
          },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.options) ? data.options : [];
          if (list.length > 0) {
            setOptions(list);
          } else {
            setOptions([{ steps: 5000 }, { steps: 5500 }, { steps: 6000 }]);
          }
        } else {
          setOptionsError('Could not load goal options.');
          setOptions([{ steps: 5000 }, { steps: 5500 }, { steps: 6000 }]);
        }
      } catch {
        if (!cancelled) {
          setOptionsError('Could not load goal options.');
          setOptions([{ steps: 5000 }, { steps: 5500 }, { steps: 6000 }]);
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [accessToken, symptomRating]);

  const handleSetGoal = async (stepTarget: number) => {
    if (!accessToken) {
      Alert.alert('Error', 'Please log in to set your goal.');
      return;
    }
    setLoading(true);
    try {
      const tz = getDeviceTimezone();
      const res = await fetch(`${API_BASE}/goal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(tz ? { 'X-Timezone': tz } : {}),
        },
        body: JSON.stringify({
          stepTarget,
          symptomRating,
          completedYesterday,
        }),
      });
      if (res.ok) {
        navigation.navigate('HomeTabs');
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Error', data.message || 'Failed to set goal.');
      }
    } catch {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Goal selection</Text>
        <Text style={styles.subtitle}>Choose your daily step goal based on how you feel today.</Text>
        {optionsLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : optionsError ? (
          <Text style={styles.errorText}>{optionsError}</Text>
        ) : null}
        {!optionsLoading && options.map((opt) => (
          <View key={opt.steps} style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{opt.steps.toLocaleString()} steps</Text>
              <TouchableOpacity
                style={[styles.setGoalBtn, loading && styles.setGoalBtnDisabled]}
                onPress={() => handleSetGoal(opt.steps)}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.setGoalBtnText}>Set Goal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {!optionsLoading && options.length > 0 && (
          <Text style={styles.hint}>Tap "Set Goal" on the option you want. Minimum goal is 3,000 steps.</Text>
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
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 18, fontWeight: '600', color: '#111827' },
  setGoalBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  setGoalBtnDisabled: { opacity: 0.6 },
  setGoalBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
  loader: { marginVertical: 24 },
  errorText: { fontSize: 14, color: '#DC2626', marginBottom: 12 },
});

export default GoalSelectionStepScreen;
