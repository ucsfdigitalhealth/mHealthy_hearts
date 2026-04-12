import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../App';

type AssessmentLandingRouteProp = RouteProp<RootStackParamList, 'AssessmentLanding'>;
type AssessmentLandingNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AssessmentLandingScreen: React.FC = () => {
  const navigation = useNavigation<AssessmentLandingNavigationProp>();
  const route = useRoute<AssessmentLandingRouteProp>();
  const { title, targetScreen } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate(targetScreen as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Take Assessment</Text>
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
  backRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AssessmentLandingScreen;
