import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; // Update path as needed
import Settings from '../components/Settings';

// Define the navigation prop type
type CardioNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GradientBar: React.FC = () => {
  return (
    <View style={styles.gradientBar}>
      <View style={styles.gradientFill} />
      <View style={styles.indicator} />
      <Text style={styles.xpLabel}>Xp</Text>
    </View>
  );
};

const MetricTile: React.FC<{ 
  title: string; 
  value?: string | number; 
  unit?: string; 
  badge?: string;
  onPress?: () => void;
}> = ({ title, value, unit, badge, onPress }) => {
  const content = (
    <View style={styles.metricTile}>
      <View style={styles.metricHeaderRow}>
        <Text style={styles.metricTitle}>{title}</Text>
        {badge ? (
          <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
        ) : null}
      </View>
      {typeof value !== 'undefined' ? (
        <View style={styles.metricValueRow}>
          <Text style={styles.metricValueText}>{value}</Text>
          {unit ? <Text style={styles.metricUnitText}>{' '}{unit}</Text> : null}
        </View>
      ) : null}
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

const ChoiceButton: React.FC<{ label: string; selected?: boolean; onPress?: () => void }>
= ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.choiceButton, selected && styles.choiceButtonSelected]}>
        <Text style={[styles.choiceButtonText, selected && styles.choiceButtonTextSelected]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>Life Essential 8</Text>
        <Settings />
      </View>

      <View style={styles.card}>
        <Text style={styles.subdued}>Today</Text>
        <Text style={styles.date}>Wed 1 Sep</Text>
        <GradientBar />
        <Text style={styles.cardTitle}>Overall Cardiovascular Health</Text>
      </View>

      <MetricTile title="Physical Activity" value={148} unit="min of MVPA" />
      <MetricTile title="Sleep" value={6.5} unit="hrs" />
      <MetricTile title="Blood Pressure" value={"120/80"} unit="mmHg" />
      
      {/* Updated Blood Sugar MetricTile with navigation */}
      <MetricTile 
        title="Blood Sugar" 
        value={97} 
        unit="mg/dL" 
        badge="100 Point"
        onPress={handleBloodSugarPress}
      />
      
      <MetricTile 
        title="Blood Lipids" 
        value={128} 
        unit="mg/dL" 
        badge="100 Point" 
        onPress={handleBloodLipidsPress}
      />

      <View style={styles.metricTile}>
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricTitle}>Body Mass Index</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>100 Point</Text></View>
        </View>
        <View style={styles.bmiRow}>
          <View style={styles.bmiCol}>
            <Text style={styles.bmiLabel}>Height</Text>
            <View style={styles.metricValueRow}><Text style={styles.metricValueText}>4'11</Text><Text style={styles.metricUnitText}> in</Text></View>
          </View>
          <View style={styles.bmiBadge}><Text style={styles.bmiBadgeText}>{'21\nBMI'}</Text></View>
          <View style={styles.bmiCol}>
            <Text style={styles.bmiLabel}>Weight</Text>
            <View style={styles.metricValueRow}><Text style={styles.metricValueText}>104</Text><Text style={styles.metricUnitText}> lb</Text></View>
          </View>
        </View>
      </View>

      <View style={styles.metricTile}>
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricTitle}>Diet</Text>
          <View style={[styles.badge, styles.badgeMuted]}><Text style={styles.badgeText}>? Point</Text></View>
        </View>
        <TouchableOpacity style={styles.ctaHollow}>
          <Text style={styles.ctaHollowText}>Take the Assessment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricTile}>
        <Text style={styles.metricTitle}>Smoking</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>75 Point</Text></View>

        <Text style={styles.question}>Have you ever smoked cigarettes or used nicotine products?</Text>
        <View style={styles.choiceRow}>
          <ChoiceButton label="Yes" selected={hasSmoked === 'Yes'} onPress={() => setHasSmoked('Yes')} />
          <ChoiceButton label="No" selected={hasSmoked === 'No'} onPress={() => setHasSmoked('No')} />
        </View>

        <Text style={[styles.question, { marginTop: 12 }]}>When was the last time you smoked?</Text>
        <ChoiceButton label="More than 5 years ago" selected={lastSmoked === 'More than 5 years ago'} onPress={() => setLastSmoked('More than 5 years ago')} />
        <View style={styles.choiceRowWrap}>
          <ChoiceButton label="1–5 years ago" selected={lastSmoked === '1–5 years ago'} onPress={() => setLastSmoked('1–5 years ago')} />
          <ChoiceButton label="Within the past year" selected={lastSmoked === 'Within the past year'} onPress={() => setLastSmoked('Within the past year')} />
          <ChoiceButton label="I currently smoke/use" selected={lastSmoked === 'I currently smoke/use'} onPress={() => setLastSmoked('I currently smoke/use')} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Symptoms</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  subdued: { color: '#6B7280', fontSize: 12 },
  date: { marginTop: 4, marginBottom: 8, fontWeight: '700', color: '#111827' },
  cardTitle: { marginTop: 8, fontWeight: '700', color: '#111827' },

  gradientBar: {
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#eee'
  },
  gradientFill: {
    ...({} as any)
  },
  indicator: {
    position: 'absolute',
    left: '65%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#111827'
  },
  xpLabel: {
    position: 'absolute',
    top: -10,
    left: '60%',
    fontWeight: '700',
    color: '#111827'
  },

  metricTile: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  metricTitle: { fontWeight: '700', color: '#111827' },
  metricValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  metricValueText: { fontSize: 24, fontWeight: '700', color: '#111827' },
  metricUnitText: { color: '#6B7280', marginLeft: 4 },

  badge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20
  },
  badgeMuted: { backgroundColor: '#9CA3AF' },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  bmiCol: { flex: 1 },
  bmiLabel: { color: '#6B7280', marginBottom: 4 },
  bmiBadge: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8
  },
  bmiBadgeText: { fontWeight: '700', color: '#111827', textAlign: 'center' },

  question: { color: '#111827', marginTop: 8, marginBottom: 8, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', gap: 12 },
  choiceRowWrap: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  choiceButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  choiceButtonSelected: { backgroundColor: '#B91C1C' },
  choiceButtonText: { color: '#111827', fontWeight: '600' },
  choiceButtonTextSelected: { color: '#ffffff' },

  ctaHollow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  ctaHollowText: { fontWeight: '600', color: '#16A34A' }
});

export default CardioVascularScreen;


