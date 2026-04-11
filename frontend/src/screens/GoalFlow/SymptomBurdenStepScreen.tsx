import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';

type GoalStep3Params = { completedYesterday: boolean };

const SymptomBurdenStepScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GoalStep3'>>();
  const params = route.params as GoalStep3Params | undefined;
  const completedYesterday = params?.completedYesterday ?? false;

  const [rating, setRating] = useState<number>(3);

  const handleNext = () => {
    navigation.navigate('GoalStep4', { completedYesterday, symptomRating: rating });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Symptom burden</Text>
        <Text style={styles.question}>
          To what extent are you able to carry out your everyday physical activities such as walking, climbing stairs,
          carrying groceries, or moving a chair?
        </Text>
        <Text style={styles.scaleLabel}>1 = Not at all · 5 = Fully able</Text>
        <View style={styles.sliderRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.sliderDot, rating === n && styles.sliderDotActive]}
              onPress={() => setRating(n)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sliderNum, rating === n && styles.sliderNumActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueText}>{rating}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Next</Text>
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
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  question: { fontSize: 18, color: '#374151', textAlign: 'center', marginBottom: 8 },
  scaleLabel: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  sliderDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderDotActive: { backgroundColor: '#007AFF' },
  sliderNum: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  sliderNumActive: { color: '#FFF' },
  valueBox: { alignItems: 'center', marginBottom: 24 },
  valueText: { fontSize: 48, fontWeight: '700', color: '#111827' },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
});

export default SymptomBurdenStepScreen;
