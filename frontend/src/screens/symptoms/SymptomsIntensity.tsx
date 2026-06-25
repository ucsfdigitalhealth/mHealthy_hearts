import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  PanResponder,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';
import { useAuth } from '../../context/AuthContext';
import { postSymptomEvent } from '../../api/symptoms';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SymptomsIntensity'>;
type RoutePropType = RouteProp<RootStackParamList, 'SymptomsIntensity'>;

const SLIDER_WIDTH = Dimensions.get('window').width - 80;

function getAnchorLabels(symptomKey: string): { low: string; high: string } {
  switch (symptomKey) {
    case 'fatigue':
      return { low: '0 = no fatigue', high: '10 = extremely severe fatigue' };
    case 'depression_mood':
      return { low: '0 = not depressed', high: '10 = extremely depressed' };
    case 'chest_pain':
      return { low: '0 = no pain', high: '10 = worst pain imaginable' };
    case 'leg_swelling':
      return { low: '0 = no swelling', high: '10 = extremely swollen' };
    default:
      return { low: '0 = none', high: '10 = worst imaginable' };
  }
}

// ── Intensity slider (PanResponder-based, 0–10) ──────────────────────────────

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
}

const IntensitySlider: React.FC<SliderProps> = ({ value, onChange }) => {
  const panX = useRef(new Animated.Value((value / 10) * SLIDER_WIDTH)).current;
  const lastX = useRef((value / 10) * SLIDER_WIDTH);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let x = lastX.current + gestureState.dx;
        x = Math.max(0, Math.min(SLIDER_WIDTH, x));
        panX.setValue(x);
        onChange(Math.round((x / SLIDER_WIDTH) * 10));
      },
      onPanResponderRelease: (_, gestureState) => {
        let x = lastX.current + gestureState.dx;
        x = Math.max(0, Math.min(SLIDER_WIDTH, x));
        lastX.current = x;
        panX.setValue(x);
        onChange(Math.round((x / SLIDER_WIDTH) * 10));
      },
    })
  ).current;

  const thumbX = panX.interpolate({
    inputRange: [0, SLIDER_WIDTH],
    outputRange: [0, SLIDER_WIDTH],
    extrapolate: 'clamp',
  });

  return (
    <View style={sliderStyles.wrapper}>
      <View style={sliderStyles.track}>
        <Animated.View
          style={[sliderStyles.fill, { width: thumbX }]}
        />
        <Animated.View
          style={[sliderStyles.thumb, { transform: [{ translateX: thumbX }] }]}
          {...panResponder.panHandlers}
        />
      </View>
      <View style={sliderStyles.tickRow}>
        {Array.from({ length: 11 }, (_, i) => (
          <Text key={i} style={sliderStyles.tick}>{i}</Text>
        ))}
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  track: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    width: SLIDER_WIDTH,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#007AFF',
    top: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  tickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
    alignSelf: 'center',
    marginTop: 10,
  },
  tick: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    width: 20,
    marginHorizontal: -4,
  },
});

// ── Main component ──────────────────────────────────────────────────────────

type WeightDirection = 'gained' | 'lost' | 'not_sure';

const SymptomsIntensity: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const {
    symptom_key,
    symptom_label,
    tracking_type,
    safety_modal_shown,
    activities,
    occurred_at,
    duration_bucket,
  } = route.params;
  const { accessToken } = useAuth();

  const isWeightChange = symptom_key === 'weight_change';

  // Intensity slider state (non-weight symptoms)
  const [intensityScore, setIntensityScore] = useState(5);

  // Weight change state
  const [weightDirection, setWeightDirection] = useState<WeightDirection | null>(null);
  const [weightLbs, setWeightLbs] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canProceed = isWeightChange ? weightDirection !== null : true;

  const handleConfirm = async () => {
    if (!canProceed || !accessToken) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Parameters<typeof postSymptomEvent>[1] = {
        symptom_key,
        symptom_label,
        tracking_type,
        occurred_at,
        duration_bucket,
        activities,
        safety_modal_shown,
      };

      if (isWeightChange) {
        payload.weight_change_direction = weightDirection!;
        const lbs = parseFloat(weightLbs);
        if (!isNaN(lbs) && lbs > 0) {
          payload.weight_change_lbs = lbs;
        }
      } else {
        payload.intensity_score = intensityScore;
      }

      const result = await postSymptomEvent(accessToken, payload);

      navigation.navigate('SymptomRecurringPrompt', {
        symptom_event_id: result.id,
        symptom_key,
        symptom_label,
      });
    } catch (err: any) {
      setSaveError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const anchors = getAnchorLabels(symptom_key);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {isWeightChange ? (
          <>
            <Text style={styles.screenTitle}>Weight change</Text>
            <Text style={styles.screenSubtitle}>
              Have you noticed any unintentional weight change recently?
            </Text>

            <View style={styles.optionGroup}>
              {(['gained', 'lost', 'not_sure'] as WeightDirection[]).map(dir => {
                const label = dir === 'gained' ? 'Gained weight' : dir === 'lost' ? 'Lost weight' : 'Not sure';
                const isSelected = weightDirection === dir;
                return (
                  <TouchableOpacity
                    key={dir}
                    style={[styles.optionTile, isSelected && styles.optionTileSelected]}
                    onPress={() => setWeightDirection(dir)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(weightDirection === 'gained' || weightDirection === 'lost') && (
              <View style={styles.lbsSection}>
                <Text style={styles.lbsLabel}>Approximately how much? (lbs)</Text>
                <TextInput
                  style={styles.lbsInput}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 3"
                  placeholderTextColor="#9CA3AF"
                  value={weightLbs}
                  onChangeText={setWeightLbs}
                  maxLength={5}
                />
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.screenTitle}>How severe?</Text>
            <Text style={styles.screenSubtitle}>
              How severe is{' '}
              <Text style={styles.highlight}>{symptom_label.toLowerCase()}</Text>
              {' '}right now?
            </Text>

            <View style={styles.sliderCard}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>{intensityScore}</Text>
                <Text style={styles.scoreLabel}>/ 10</Text>
              </View>

              <IntensitySlider value={intensityScore} onChange={setIntensityScore} />

              <View style={styles.anchorRow}>
                <Text style={styles.anchorText}>{anchors.low}</Text>
                <Text style={[styles.anchorText, styles.anchorRight]}>{anchors.high}</Text>
              </View>
            </View>
          </>
        )}

        {saveError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{saveError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, (!canProceed || saving) && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!canProceed || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: { padding: 20, paddingBottom: 20 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  screenSubtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 28 },
  highlight: { color: '#007AFF', fontWeight: '600' },

  // ── Slider card ──
  sliderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  scoreValue: { fontSize: 56, fontWeight: '700', color: '#007AFF', lineHeight: 64 },
  scoreLabel: { fontSize: 22, color: '#9CA3AF', marginLeft: 4 },
  anchorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
    marginTop: 12,
  },
  anchorText: { fontSize: 14, color: '#9CA3AF', maxWidth: '48%' },
  anchorRight: { textAlign: 'right' },

  // ── Weight options ──
  optionGroup: { gap: 12, marginBottom: 24 },
  optionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionTileSelected: { backgroundColor: '#EFF6FF', borderColor: '#007AFF' },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: { borderColor: '#007AFF' },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#007AFF' },
  optionLabel: { fontSize: 17, fontWeight: '500', color: '#374151' },
  optionLabelSelected: { color: '#1D4ED8' },

  // ── Weight lbs input ──
  lbsSection: { marginBottom: 24 },
  lbsLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  lbsInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },

  // ── Error banner ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  errorBannerText: { flex: 1, fontSize: 14, color: '#DC2626', lineHeight: 20 },

  // ── Footer ──
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

export default SymptomsIntensity;
