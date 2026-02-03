import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

const DailyCheckInScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleContinue = () => {
    // GoalsSetting screen is temporarily disabled
    // navigation.navigate('GoalsSetting');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Daily Check-In</Text>
        <View style={styles.iconContainer}>
          {/* Replace image as needed */}
          <Image
            source={require('../assets/shoe.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headline}>Let’s get your goal for today.</Text>
        <Text style={styles.body}>
          We’ll confirm your steps from yesterday and ask how you’re feeling.
        </Text>
        <Text style={styles.body}>
          This helps us recommend a safe and achievable step goal.
        </Text>
        <Text style={styles.body}>
          <Text style={styles.bold}>If you don’t complete this check-in we’ll assign a default goal.</Text>
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Continue</Text>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#111827',
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 80,
    height: 80,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
    color: '#111827',
  },
  body: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: '#111827',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DailyCheckInScreen;