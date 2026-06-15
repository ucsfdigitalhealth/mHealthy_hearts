import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { buildSymptomQueue } from './weeklySymptomOptions';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomConfirmation'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomConfirmation'>;

const SymptomConfirmation: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const enrollmentSummary = route.params?.enrollmentSummary;
  const completedWeeklyCheckIn = route.params?.completedWeeklyCheckIn;
  const weeklyPlan = route.params?.weeklyPlan;
  const hasSchedule = Boolean(enrollmentSummary);

  const handleDone = () => {
    navigation.navigate('HomeTabs');
  };

  const handleStartWeeklyCheckIn = () => {
    if (!weeklyPlan) return;
    navigation.navigate('SymptomsInstrument', {
      symptom_queue: buildSymptomQueue(weeklyPlan.symptom_keys),
      current_index: 0,
      weekly_plan_id: weeklyPlan.id,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
        </View>

        {completedWeeklyCheckIn ? (
          <>
            <Text style={styles.title}>All done!</Text>
            <Text style={styles.subtitle}>Thanks for completing this week's check-in.</Text>
            <Text style={styles.body}>
              Your responses have been recorded. If you are feeling unwell, please reach out to your care team.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Logged.</Text>
            {hasSchedule ? (
              <Text style={styles.subtitle}>
                {`We'll check in with you ${enrollmentSummary}.`}
              </Text>
            ) : (
              <Text style={styles.subtitle}>Take care of yourself.</Text>
            )}
            <Text style={styles.body}>
              Your symptom has been recorded. If you are feeling unwell, please reach out to your care team.
            </Text>
          </>
        )}

        {weeklyPlan && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleStartWeeklyCheckIn}>
            <Text style={styles.secondaryButtonText}>Start this week's check-in now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 28,
    maxWidth: 300,
  },
  body: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    maxWidth: 300,
  },
  doneButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default SymptomConfirmation;
