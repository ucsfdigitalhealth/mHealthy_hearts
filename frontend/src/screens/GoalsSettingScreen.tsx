import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

// all placeholder data right here
const GOAL_OPTIONS = [
  {
    value: 5360,
    label: '5,360 steps',
    description: "Maintain yesterday's level",
  },
  {
    value: 5900,
    label: '5,900 steps',
    description: 'Small Increase (10% more)',
  },
  {
    value: 6430,
    label: '6,430 steps',
    description: 'Bigger Challenge (20% more)',
  },
];


const GoalsSettingScreen: React.FC = () => {
  const [selected, setSelected] = useState<number>(GOAL_OPTIONS[0].value);
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSetGoal = async () => {
    if (!accessToken) {
      Alert.alert('Not logged in', 'Please log in to set your goal.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/user-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ step_goal: selected, sleep_goal: 0 }), // sleep_goal can be set from another input
      });
      if (response.ok) {
        Alert.alert('Success', 'Goal saved!');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to save goal');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Set Your Goal</Text>
        <View style={styles.card}>
          <Text style={styles.question}>What's your goal today?</Text>
          {GOAL_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                selected === option.value && styles.optionSelected,
              ]}
              activeOpacity={0.8}
              onPress={() => setSelected(option.value)}
            >
              <View style={styles.radioOuter}>
                {selected === option.value && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDesc}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSetGoal} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Set Goal</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#111827',
  },
  card: {
    backgroundColor: '#fafbfc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#222',
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f6ff',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#fff',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  optionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default GoalsSettingScreen;