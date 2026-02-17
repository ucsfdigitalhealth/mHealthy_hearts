// CardioVascularScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App'; // Update path as needed
import Settings from '../../components/Settings';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';

// Define the navigation prop type
type CardioNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper function to get status based on score
const getStatusFromScore = (score: number | null): string | null => {
  if (score === null) return null;
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Fair';
  return 'Poor';
};

// Helper function to get status color
const getStatusColor = (status: string | null): string => {
  if (!status) return '#6B7280';
  switch (status) {
    case 'Excellent':
      return '#059669';
    case 'Good':
      return '#3B82F6';
    case 'Fair':
      return '#F59E0B';
    case 'Poor':
      return '#DC2626';
    default:
      return '#6B7280';
  }
};

const MetricItem: React.FC<{
  title: string;
  score: number | null;
  unit?: string;
  badge?: string;
  onPress?: () => void;
  status?: string;
  isFirstInSection?: boolean;
  showNotCalculated?: boolean;
}> = ({ title, score, unit, badge, onPress, status, isFirstInSection, showNotCalculated }) => {
  const calculatedStatus = status || getStatusFromScore(score !== null && score !== undefined ? score : null);
  const statusColor = getStatusColor(calculatedStatus || null);
  
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
        {score !== null && score !== undefined ? (
          <>
            <Text style={styles.metricValue}>{score}</Text>
            {unit && <Text style={styles.metricUnit}> {unit}</Text>}
          </>
        ) : (
          showNotCalculated && (
            <Text style={styles.notCalculatedText}>Calculate your score</Text>
          )
        )}
        {calculatedStatus && (
          <Text style={[styles.metricStatus, { color: statusColor }]}>{calculatedStatus}</Text>
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
  const { accessToken } = useAuth();
  const [hasSmoked, setHasSmoked] = useState<'Yes' | 'No'>('Yes');
  const [lastSmoked, setLastSmoked] = useState<'More than 5 years ago' | '1–5 years ago' | 'Within the past year' | 'I currently smoke/use'>('More than 5 years ago');
  const [bloodLipidScore, setBloodLipidScore] = useState<number | null>(null);
  const [bloodLipidValue, setBloodLipidValue] = useState<number | null>(null);
  const [bloodSugarScore, setBloodSugarScore] = useState<number | null>(null);
  const [bloodSugarValue, setBloodSugarValue] = useState<number | null>(null);
  const [bmiScore, setBmiScore] = useState<number | null>(null);
  const [bmiValue, setBmiValue] = useState<number | null>(null);
  const [dietScore, setDietScore] = useState<number | null>(null);
  const [smokingScore, setSmokingScore] = useState<number | null>(null);
  const [heartScore, setHeartScore] = useState<number | null>(null);
  
  // Calculate heart score as average of all LE8 scores
  const calculateHeartScore = useCallback(() => {
    const scores: number[] = [];
    
    // Physical Activity (placeholder - will be fetched from API later)
    // Sleep (placeholder - will be fetched from API later)
    // Blood Pressure (placeholder - will be fetched from API later)
    
    // Add scores that we have
    if (bloodSugarScore !== null) scores.push(bloodSugarScore);
    if (bloodLipidScore !== null) scores.push(bloodLipidScore);
    if (bmiScore !== null) scores.push(bmiScore);
    if (dietScore !== null) scores.push(dietScore);
    if (smokingScore !== null) scores.push(smokingScore);
    
    if (scores.length > 0) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      setHeartScore(Math.round(average));
    } else {
      setHeartScore(null);
    }
  }, [bloodSugarScore, bloodLipidScore, bmiScore, dietScore, smokingScore]);
  
  // Recalculate heart score whenever any score changes
  useEffect(() => {
    calculateHeartScore();
  }, [calculateHeartScore]);

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

  const handleViewHistoricalDataPress = () => {
    navigation.navigate('CardioHistoricalData');
  };

  // Fetch all health scores function
  const fetchAllHealthScores = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/health-scores', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Blood Lipids
        setBloodLipidScore(data.bloodLipids?.score ?? null);
        setBloodLipidValue(data.bloodLipids?.value ?? null);
        // Blood Sugar
        setBloodSugarScore(data.bloodSugar?.score ?? null);
        setBloodSugarValue(data.bloodSugar?.value ?? null);
        // BMI
        setBmiScore(data.bmi?.score ?? null);
        setBmiValue(data.bmi?.value ?? null);
        // Diet
        setDietScore(data.diet?.score ?? null);
        // Smoking
        setSmokingScore(data.smoking?.score ?? null);
        // Heart score will be recalculated by useEffect
      } else {
        const errorText = await response.text();
        console.error('Error fetching health scores:', response.status, errorText);
        // Reset all values on error
        setBloodLipidScore(null);
        setBloodLipidValue(null);
        setBloodSugarScore(null);
        setBloodSugarValue(null);
        setBmiScore(null);
        setBmiValue(null);
        setDietScore(null);
        setSmokingScore(null);
      }
    } catch (error) {
      console.error('Error fetching health scores:', error);
      // Reset all values on error
      setBloodLipidScore(null);
      setBloodLipidValue(null);
      setBloodSugarScore(null);
      setBloodSugarValue(null);
      setBmiScore(null);
      setBmiValue(null);
      setDietScore(null);
      setSmokingScore(null);
    }
  }, [accessToken]);

  // Fetch all health scores on mount and when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchAllHealthScores();
    }, [fetchAllHealthScores])
  );
  
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
              <Text style={styles.heartScoreNumber}>
                {heartScore !== null ? heartScore : '—'}
              </Text>
            </View>
            {heartScore !== null ? (
              (() => {
                const status = getStatusFromScore(heartScore);
                const statusColor = getStatusColor(status);
                let bgColor = '#D1FAE5';
                if (status === 'Good') bgColor = '#DBEAFE';
                else if (status === 'Fair') bgColor = '#FEF3C7';
                else if (status === 'Poor') bgColor = '#FEE2E2';
                
                return (
                  <View style={[styles.heartScoreStatus, { backgroundColor: bgColor }]}>
                    <Text style={[styles.heartScoreStatusText, { color: statusColor }]}>
                      {status}
                    </Text>
                  </View>
                );
              })()
            ) : (
              <View style={[styles.heartScoreStatus, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.heartScoreStatusText, { color: '#6B7280' }]}>
                  Calculate your score
                </Text>
              </View>
            )}
          </View>
        </View>

        

        {/* Divider */}
        <View style={styles.divider} />

        {/* View Historical Data Button */}
                <TouchableOpacity
          style={styles.historicalButton}
          onPress={handleViewHistoricalDataPress}
          activeOpacity={0.8}
        >
          <Text style={styles.historicalButtonText}>View Historical Data</Text>
        </TouchableOpacity>

        {/* All Metrics in List */}
        <View style={styles.metricsList}>
          <MetricItem 
            title="Physical Activity" 
            score={null}
            unit="min"
            showNotCalculated={true}
            isFirstInSection={true}
            onPress={handleBloodSugarPress}
          />
          
          <MetricItem 
            title="Sleep" 
            score={null}
            unit="hrs"
            showNotCalculated={true}
            onPress={handleBloodSugarPress}
          />
          
          <MetricItem 
            title="Blood Pressure" 
            score={null}
            unit="mmHg"
            showNotCalculated={true}
            onPress={handleBloodSugarPress}
          />
          
          <MetricItem 
            title="Blood Sugar" 
            score={bloodSugarValue !== null ? bloodSugarValue : null} 
            unit="mg/dL"
            badge={bloodSugarScore !== null ? String(bloodSugarScore) : undefined}
            showNotCalculated={bloodSugarScore === null}
            onPress={handleBloodSugarPress}
          />
          
          <MetricItem 
            title="Blood Lipids" 
            score={bloodLipidValue !== null ? bloodLipidValue : null} 
            unit="mg/dL"
            badge={bloodLipidScore !== null ? String(bloodLipidScore) : undefined}
            showNotCalculated={bloodLipidScore === null}
            onPress={handleBloodLipidsPress}
          />
          
          <MetricItem 
            title="Body Mass Index" 
            score={bmiValue !== null ? Math.round(bmiValue * 10) / 10 : null} 
            unit="BMI"
            badge={bmiScore !== null ? String(bmiScore) : undefined}
            showNotCalculated={bmiScore === null}
            onPress={handleBmiPress}
          />
          
          <MetricItem 
            title="Diet" 
            score={dietScore}
            badge={dietScore !== null ? String(dietScore) : undefined}
            showNotCalculated={dietScore === null}
            onPress={handleDietPress}
          />
          
          <MetricItem 
            title="Smoking" 
            score={smokingScore}
            badge={smokingScore !== null ? String(smokingScore) : undefined}
            showNotCalculated={smokingScore === null}
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  heartScoreStatusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricsList: {
    marginBottom: 24,
  },
  historicalButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  historicalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    textTransform: 'uppercase',
  },
  notCalculatedText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
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