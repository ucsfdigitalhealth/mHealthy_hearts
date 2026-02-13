import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';

const DailyCheckInStepScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="walk" size={40} color="#34C759" />
          </View>
        </View>
        <Text style={styles.title}>Daily Check-In</Text>
        <Text style={styles.headline}>Let's set your goal for today</Text>
        <Text style={styles.body}>
          We'll confirm your steps from yesterday and ask how you're feeling. This helps us recommend a safe and achievable step goal.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('GoalStep2')}
          activeOpacity={0.8}
        >
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
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  headline: { fontSize: 20, fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 16, color: '#4B5563', lineHeight: 24, textAlign: 'center', marginBottom: 32 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
});

export default DailyCheckInStepScreen;
