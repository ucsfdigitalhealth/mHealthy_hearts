import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type HealthTileProps = {
  title: string;
  value: string | number;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor?: string;
};

export const HealthTile: React.FC<HealthTileProps> = ({ title, value, unit, icon, backgroundColor = '#F2F6FF' }) => {
  return (
    <View style={[styles.card, { backgroundColor }]}> 
      <View style={styles.header}>
        <Ionicons name={icon} size={22} color="#3A6FF8" />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  unit: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
});

export default HealthTile;
