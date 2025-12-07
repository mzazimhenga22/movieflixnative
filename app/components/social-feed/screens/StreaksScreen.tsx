import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from '../../../../components/ScreenWrapper';

interface Streak {
  id: number;
  days: number;
  activity: string;
  lastUpdate: string;
}

const mockStreaks: Streak[] = [
  {
    id: 1,
    days: 7,
    activity: 'Movie Reviews',
    lastUpdate: 'Today',
  },
  {
    id: 2,
    days: 15,
    activity: 'Story Sharing',
    lastUpdate: 'Today',
  },
  {
    id: 3,
    days: 30,
    activity: 'Daily Login',
    lastUpdate: 'Today',
  },
];

export default function StreaksScreen() {
  const renderStreak = ({ item }: { item: Streak }) => (
    <LinearGradient
      colors={['#ff4b4b', '#ff8080']}
      style={styles.streakCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.streakContent}>
        <Text style={styles.streakDays}>{item.days}</Text>
        <Text style={styles.streakLabel}>days</Text>
      </View>
      <View style={styles.streakInfo}>
        <Text style={styles.streakActivity}>{item.activity}</Text>
        <Text style={styles.streakUpdate}>Last: {item.lastUpdate}</Text>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>Your Streaks</Text>
        </View>
        <FlatList
          data={mockStreaks}
          renderItem={renderStreak}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#630303ff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  streakCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  streakContent: {
    alignItems: 'center',
    marginRight: 16,
  },
  streakDays: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  streakInfo: {
    flex: 1,
  },
  streakActivity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  streakUpdate: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
});
