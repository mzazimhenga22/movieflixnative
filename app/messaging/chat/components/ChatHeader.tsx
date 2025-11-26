import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Profile } from '../../controller';

interface ChatHeaderProps {
  recipient: Profile;
}

const ChatHeader = ({ recipient }: ChatHeaderProps) => {
  const router = useRouter();

  const handleProfilePress = () => {
    router.push(`/story/${recipient.id}?photoURL=${recipient.photoURL}`);
  };

  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleProfilePress}>
          <Image source={{ uri: recipient.photoURL }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>{recipient.displayName}</Text>
          <Text numberOfLines={1} style={styles.headerSubtitle}>{recipient.status ?? 'Online'}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} accessibilityLabel="Call">
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} accessibilityLabel="Video call">
            <Ionicons name="videocam" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    // glass effect
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: {
    marginRight: 10,
    padding: 6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 10,
  },
});

export default ChatHeader;
