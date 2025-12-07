import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../../../components/ScreenWrapper';

type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'streak';

interface Notification {
  id: number;
  type: NotificationType;
  user: string;
  avatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'like',
    user: 'Sarah Miller',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    content: 'liked your movie review of "The Dark Knight"',
    timestamp: '2h ago',
    read: false,
  },
  // Add more mock notifications here
];

export default function NotificationsScreen() {
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity style={[styles.notificationItem, !item.read && styles.unread]}>
      {item.avatar && (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      )}
      <View style={styles.content}>
        <Text style={styles.notificationText}>
          <Text style={styles.username}>{item.user}</Text> {item.content}
        </Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <FlatList
          data={mockNotifications}
          renderItem={renderNotification}
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
    paddingHorizontal: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  unread: {
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
  },
  username: {
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
});
