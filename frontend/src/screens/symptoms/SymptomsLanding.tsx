import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { getWeeklyPlan, deleteWeeklyPlan, WeeklyPlan } from '../../api/symptoms';
import { buildSymptomQueue, WEEKLY_SYMPTOM_OPTIONS } from './weeklySymptomOptions';
import StressInfoModal from '../../components/symptoms/StressInfoModal';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomsLanding'>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatPlanSchedule(plan: WeeklyPlan): string {
  const [hours, minutes] = plan.time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `Every ${DAY_NAMES[plan.day_of_week]} at ${timeStr}`;
}

const SymptomsLanding: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { accessToken } = useAuth();

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [deleting, setDeleting] = useState(false);
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
      symptom_queue: buildSymptomQueue(WEEKLY_SYMPTOM_OPTIONS.map(o => o.key)),
      current_index: 0,
      weekly_plan_id: plan.id,
    });
  };

  const handleEditWeeklyPlan = () => {
    if (!plan) return;
    navigation.navigate('WeeklyReminderSetup', {
      selected_symptom_keys: plan.symptom_keys,
      existing_plan_id: plan.id,
    });
  };

  const handleDeleteWeeklyPlan = () => {
    if (!plan || !accessToken) return;
    Alert.alert(
      'Delete weekly check-in?',
      'This will remove your weekly check-in schedule. You can set up a new one anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteWeeklyPlan(accessToken);
              setPlan(null);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete weekly check-in.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
          <>
            {plan.completed_this_week ? (
              <View style={styles.completedCard}>
                <Ionicons name="checkmark-circle" size={22} color="#34C759" style={{ marginRight: 10 }} />
                <Text style={styles.completedCardText}>Check-in complete for this week</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.cardHighlight} onPress={handleStartWeeklyCheckIn} activeOpacity={0.7}>
                <View style={styles.cardIconCircleHighlight}>
                  <Ionicons name="play-circle" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardTitleHighlight}>Take this week's check-in now</Text>
                  <Text style={styles.cardSubtitleHighlight}>
                    Complete your {WEEKLY_SYMPTOM_OPTIONS.length} check-ins for this week.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <View style={styles.card}>
              <View style={styles.cardIconCircle}>
                <Ionicons name="calendar-outline" size={26} color="#007AFF" />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={styles.cardTitle}>Weekly check-in</Text>
                <Text style={styles.cardSubtitle}>{formatPlanSchedule(plan)}</Text>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={handleEditWeeklyPlan} activeOpacity={0.7}>
                <Ionicons name="pencil" size={14} color="#007AFF" style={{ marginRight: 4 }} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteWeeklyPlan}
                activeOpacity={0.7}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
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
                Get a short combined check-in once a week, with one reminder.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

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

  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: 18,
    marginBottom: 16,
  },
  completedCardText: { fontSize: 16, fontWeight: '600', color: '#166534' },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    marginLeft: 10,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },

  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginLeft: 8,
  },

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
