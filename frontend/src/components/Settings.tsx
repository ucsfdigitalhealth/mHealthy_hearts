import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Settings: React.FC = () => {
  const navigation = useNavigation<SettingsNavigationProp>();

  const handlePress = () => {
    navigation.navigate('Settings');
  };

  return (
    <TouchableOpacity 
      style={styles.settingsButton} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="settings-outline" size={24} color="#007AFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
});

export default Settings;

