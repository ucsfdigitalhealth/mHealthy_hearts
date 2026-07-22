import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';

type GoalStep4Params = { completedYesterday: boolean; symptomRating: number };

const GOAL_OPTIONS = [
  { value: 5000, label: '5,000 steps' },
  { value: 5500, label: '5,500 steps' },
  { value: 6000, label: '6,000 steps' },
];

const GoalSelectionStepScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GoalStep4'>>();
  const params = route.params as GoalStep4Params | undefined;

  const completedYesterday = params?.completedYesterday ?? false;
  const symptomRating = params?.symptomRating ?? 5;

  const handleSelectGoal = (stepTarget: number) => {
    navigation.navigate('GoalStep5', { stepTarget, completedYesterday, symptomRating });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Goal Selection</Text>
        <Text style={styles.subtitle}>Choose your daily step goal</Text>
        {GOAL_OPTIONS.map((opt) => (
          <View key={opt.value} style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{opt.label}</Text>
              <TouchableOpacity
                style={styles.setGoalBtn}
                onPress={() => handleSelectGoal(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.setGoalBtnText}>Set Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <Text style={styles.hint}>Tap "Set Goal" on the option you want.</Text>
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
  setGoalBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
});

export default GoalSelectionStepScreen;
