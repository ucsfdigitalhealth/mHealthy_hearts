import { API_ORIGIN } from '../../config/api';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getDeviceTimezone } from '../../utils/localDate';

type GoalStep5Params = { stepTarget: number; completedYesterday: boolean; symptomRating: number };

const API_BASE = `${API_ORIGIN}/api/activity`;

const GoalConfirmStepScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GoalStep5'>>();
  const params = route.params as GoalStep5Params;
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
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
          stepTarget: params.stepTarget,
          symptomRating: params.symptomRating,
          completedYesterday: params.completedYesterday,
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
        <Text style={styles.title}>Confirm Your Goal</Text>
        <Text style={styles.subtitle}>You're about to set your daily step goal to:</Text>
        <View style={styles.goalBox}>
          <Text style={styles.goalValue}>{params.stepTarget.toLocaleString()}</Text>
          <Text style={styles.goalUnit}>steps / day</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Confirm</Text>
          )}
        </TouchableOpacity>
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
  goalBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 32,
  },
  goalValue: { fontSize: 48, fontWeight: '700', color: '#111827' },
  goalUnit: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
});

export default GoalConfirmStepScreen;
