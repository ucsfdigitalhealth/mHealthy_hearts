// CardioVascularScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App'; // Update path as needed
import Settings from '../../components/Settings';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Define the navigation prop type
type CardioNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MetricItem: React.FC<{
  title: string;
  score: number;
  unit?: string;
  badge?: string;
  onPress?: () => void;
  status?: string;
  isFirstInSection?: boolean;
}> = ({ title, score, unit, badge, onPress, status, isFirstInSection }) => {
  const content = (
    <View style={[styles.metricItem, isFirstInSection && styles.firstMetricItem]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge} Point</Text>
          </View>
        )}
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricValue}>{score}</Text>
        {unit && <Text style={styles.metricUnit}> {unit}</Text>}
        {status && (
          <Text style={styles.metricStatus}>{status}</Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const CardioVascularScreen: React.FC = () => {
  const navigation = useNavigation<CardioNavigationProp>();
  const [hasSmoked, setHasSmoked] = useState<'Yes' | 'No'>('Yes');
  const [lastSmoked, setLastSmoked] = useState<'More than 5 years ago' | '1–5 years ago' | 'Within the past year' | 'I currently smoke/use'>('More than 5 years ago');

  const handleBloodSugarPress = () => {
    navigation.navigate('BloodSugar');
  };

  const handleBloodLipidsPress = () => {
    navigation.navigate('BloodLipids');
  };

  const handleBmiPress = () => {
    navigation.navigate('Bmi');
  };

  const handleDietPress = () => {
    navigation.navigate('Diet');
  };

  const handleSmokingPress = () => {
    navigation.navigate('Smoking');
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>mHealthy Hearts</Text>
          <Settings />
        </View>

        {/* Today's Date */}
        <View style={styles.dateSection}>
          <Text style={styles.todayLabel}>Today</Text>
          <Text style={styles.date}>Wed 1 Sep</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Heart Score */}
        <View style={styles.heartScoreContainer}>
          <Text style={styles.heartScoreLabel}>Heart Score</Text>
          <View style={styles.heartScoreMain}>
            <View style={styles.heartScoreCircle}>
              <Text style={styles.heartScoreNumber}>82</Text>
            </View>
            <View style={styles.heartScoreStatus}>
              <Text style={styles.heartScoreStatusText}>Ideal</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* All Metrics in List */}
        <View style={styles.metricsList}>
          <MetricItem 
            title="Physical Activity" 
            score={90} 
            unit="min"
            badge="100"
            status="Excellent"
            isFirstInSection={true}
          />
          
          <MetricItem 
            title="Sleep" 
            score={70} 
            unit="hrs"
            badge="100"
            status="Good"
          />
          
          <MetricItem 
            title="Blood Pressure" 
            score={75} 
            unit="mmHg"
            badge="100"
            status="Good"
          />
          
          <MetricItem 
            title="Blood Sugar" 
            score={60} 
            unit="mg/dL"
            badge="100"
            status="Fair"
            onPress={handleBloodSugarPress}
          />
          
          <MetricItem 
            title="Blood Lipids" 
            score={60} 
            unit="mg/dL"
            badge="100"
            onPress={handleBloodLipidsPress}
          />
          
          <MetricItem 
            title="Body Mass Index" 
            score={70} 
            unit="BMI"
            badge="100"
            onPress={handleBmiPress}
          />
          
          <MetricItem 
            title="Diet" 
            score={80} 
            badge="100"
            onPress={handleDietPress}
          />
          
          <MetricItem 
            title="Smoking" 
            score={75} 
            badge="100"
            onPress={handleSmokingPress}
          />
        </View>

        {/* Smoking Questions Section */}
        {/* <View style={styles.smokingSection}>
          <View style={styles.smokingHeader}>
            <Text style={styles.smokingTitle}>Smoking Details</Text>
          </View>

          <Text style={styles.question}>
            Have you ever smoked cigarettes or used nicotine products?
          </Text>
          <View style={styles.choiceRow}>
            <TouchableOpacity 
              style={[styles.choiceButton, hasSmoked === 'Yes' && styles.choiceButtonSelected]}
              onPress={() => setHasSmoked('Yes')}
            >
              <Text style={[styles.choiceButtonText, hasSmoked === 'Yes' && styles.choiceButtonTextSelected]}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.choiceButton, hasSmoked === 'No' && styles.choiceButtonSelected]}
              onPress={() => setHasSmoked('No')}
            >
              <Text style={[styles.choiceButtonText, hasSmoked === 'No' && styles.choiceButtonTextSelected]}>
                No
              </Text>
            </TouchableOpacity>
          </View>

          {hasSmoked === 'Yes' && (
            <>
              <Text style={[styles.question, { marginTop: 16 }]}>
                When was the last time you smoked?
              </Text>
              <View style={styles.smokingOptions}>
                <TouchableOpacity 
                  style={[styles.smokingOption, lastSmoked === 'More than 5 years ago' && styles.smokingOptionSelected]}
                  onPress={() => setLastSmoked('More than 5 years ago')}
                >
                  <Text style={[styles.smokingOptionText, lastSmoked === 'More than 5 years ago' && styles.smokingOptionTextSelected]}>
                    More than 5 years ago
                  </Text>
                </TouchableOpacity>
                <View style={styles.smokingOptionRow}>
                  <TouchableOpacity 
                    style={[styles.smokingOption, lastSmoked === '1–5 years ago' && styles.smokingOptionSelected]}
                    onPress={() => setLastSmoked('1–5 years ago')}
                  >
                    <Text style={[styles.smokingOptionText, lastSmoked === '1–5 years ago' && styles.smokingOptionTextSelected]}>
                      1–5 years ago
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smokingOption, lastSmoked === 'Within the past year' && styles.smokingOptionSelected]}
                    onPress={() => setLastSmoked('Within the past year')}
                  >
                    <Text style={[styles.smokingOptionText, lastSmoked === 'Within the past year' && styles.smokingOptionTextSelected]}>
                      Within the past year
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smokingOption, lastSmoked === 'I currently smoke/use' && styles.smokingOptionSelected]}
                    onPress={() => setLastSmoked('I currently smoke/use')}
                  >
                    <Text style={[styles.smokingOptionText, lastSmoked === 'I currently smoke/use' && styles.smokingOptionTextSelected]}>
                      I currently smoke/use
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View> */}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  dateSection: {
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  date: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  heartScoreContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  heartScoreLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 16,
  },
  heartScoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  heartScoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heartScoreStatus: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  heartScoreStatusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  metricsList: {
    marginBottom: 24,
  },
  metricItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  firstMetricItem: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  metricUnit: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
    marginBottom: 4,
    flex: 1,
  },
  metricStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  smokingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  smokingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  smokingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  choiceButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  choiceButtonSelected: {
    backgroundColor: '#B91C1C',
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  choiceButtonTextSelected: {
    color: '#FFFFFF',
  },
  smokingOptions: {
    marginTop: 8,
  },
  smokingOption: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  smokingOptionSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  smokingOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  smokingOptionTextSelected: {
    color: '#DC2626',
    fontWeight: '600',
  },
  smokingOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
});

export default CardioVascularScreen;