import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const ButtonWithArrow: React.FC = () => {
  return (
    <View>
      <TouchableOpacity style={styles.button}>
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Track Cardio Vascular Health Measures</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8, // Space between text and icon
  },
});

export default ButtonWithArrow;