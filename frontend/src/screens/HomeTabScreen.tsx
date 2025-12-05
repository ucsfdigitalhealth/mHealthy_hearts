import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TodayScreen from './TodayScreen';
import CardioVascularScreen from './CardioVascularScreen';
import ActivityScreen from './ActivityScreen';

type TabType = 'today' | 'activity' | 'health';

const HomeTabsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');

  const renderContent = () => {
    switch (activeTab) {
      case 'today':
        return <TodayScreen />;
      case 'activity':
        return <ActivityScreen />;
      case 'health':
        return <CardioVascularScreen />;
      default:
        return <TodayScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('today')}
        >
          <Ionicons
            name="sunny"
            size={24}
            color={activeTab === 'today' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'today' && styles.tabLabelActive,
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('activity')}
        >
          <Ionicons
            name="walk"
            size={24}
            color={activeTab === 'activity' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'activity' && styles.tabLabelActive,
            ]}
          >
            Activity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('health')}
        >
          <Ionicons
            name="heart"
            size={24}
            color={activeTab === 'health' ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'health' && styles.tabLabelActive,
            ]}
          >
            Health
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#007AFF',
  },
});

export default HomeTabsScreen;