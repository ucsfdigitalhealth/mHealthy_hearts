import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { getWeeklyPlan, WeeklyPlan } from '../../api/symptoms';
import { buildSymptomQueue } from './weeklySymptomOptions';
import StressInfoModal from '../../components/symptoms/StressInfoModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomsLanding'>;

const SymptomsLanding: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { accessToken } = useAuth();

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [stressModalVisible, setStressModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) {
        setLoadingPlan(false);
        return;
      }
      let cancelled = false;
      setLoadingPlan(true);
      getWeeklyPlan(accessToken)
        .then(p => { if (!cancelled) setPlan(p); })
        .catch(() => { if (!cancelled) setPlan(null); })
        .finally(() => { if (!cancelled) setLoadingPlan(false); });
      return () => { cancelled = true; };
    }, [accessToken])
  );

  const handleStartWeeklyCheckIn = () => {
    if (!plan) return;
    navigation.navigate('SymptomsInstrument', {
      symptom_queue: buildSymptomQueue(plan.symptom_keys),
      current_index: 0,
      weekly_plan_id: plan.id,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Symptom tracking</Text>
        <Text style={styles.screenSubtitle}>Choose how you'd like to track today.</Text>

        {loadingPlan ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#9CA3AF" />
          </View>
        ) : plan ? (
          <TouchableOpacity style={styles.cardHighlight} onPress={handleStartWeeklyCheckIn} activeOpacity={0.7}>
            <View style={styles.cardIconCircleHighlight}>
              <Ionicons name="play-circle" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={styles.cardTitleHighlight}>Take this week's check-in now</Text>
              <Text style={styles.cardSubtitleHighlight}>
                Complete your {plan.symptom_keys.length === 1 ? 'check-in' : `${plan.symptom_keys.length} check-ins`} for this week.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('WeeklySymptomSetup')}
          activeOpacity={0.7}
        >
          <View style={styles.cardIconCircle}>
            <Ionicons name="calendar-outline" size={26} color="#007AFF" />
          </View>
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>Set up weekly symptom tracking</Text>
            <Text style={styles.cardSubtitle}>
              Choose up to 6 symptoms to check in on each week, with one reminder.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('SymptomsMomentaryList')}
          activeOpacity={0.7}
        >
          <View style={styles.cardIconCircle}>
            <Ionicons name="add-circle-outline" size={26} color="#007AFF" />
          </View>
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>Track a symptom right now</Text>
            <Text style={styles.cardSubtitle}>
              Log how you're feeling at this moment.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.stressLink} onPress={() => setStressModalVisible(true)}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
          <Text style={styles.stressLinkText}>About stress check-ins</Text>
        </TouchableOpacity>
      </ScrollView>

      <StressInfoModal visible={stressModalVisible} onClose={() => setStressModalVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#007AFF', fontSize: 16, fontWeight: '500', marginLeft: 4 },
  content: { padding: 20, paddingBottom: 40 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  screenSubtitle: { fontSize: 15, color: '#6B7280', marginBottom: 24 },

  loadingRow: { paddingVertical: 16, alignItems: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextGroup: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  cardHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cardIconCircleHighlight: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTitleHighlight: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  cardSubtitleHighlight: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },

  stressLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 12,
  },
  stressLinkText: { fontSize: 14, color: '#6B7280', fontWeight: '500', textDecorationLine: 'underline' },
});

export default SymptomsLanding;
