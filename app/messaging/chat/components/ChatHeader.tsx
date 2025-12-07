import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Profile, Conversation } from '../../controller';

interface ChatHeaderProps {
  recipient: Profile | null;
  conversation?: Conversation | null;
  isTyping?: boolean;
  onEditGroup?: () => void;
}

const ChatHeader = ({ recipient, conversation, isTyping, onEditGroup }: ChatHeaderProps) => {
  const router = useRouter();

  const handleProfilePress = () => {
    if (!recipient) return;
    if (conversation?.isGroup) {
      onEditGroup?.();
      return;
    }
    router.push(`/story/${recipient.id}?photoURL=${recipient.photoURL}`);
  };

  return (
    <View style={styles.headerWrap}>
      <LinearGradient
        colors={['rgba(229,9,20,0.22)', 'rgba(10,12,24,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          {conversation?.isGroup ? (
            <TouchableOpacity onPress={handleProfilePress}>
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>
                  {(conversation.name || 'G')
                    .split(' ')
                    .map((p: string) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleProfilePress}>
              <Image source={{ uri: recipient?.photoURL }} style={styles.avatar} />
            </TouchableOpacity>
          )}

          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {conversation?.isGroup ? conversation.name || 'Group' : recipient?.displayName}
            </Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {conversation?.isGroup
                ? `${conversation.members?.length || 0} members`
                : isTyping
                  ? 'Typing…'
                  : recipient?.status ?? 'Online'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {conversation?.isGroup && (
              <TouchableOpacity
                style={styles.actionButton}
                accessibilityLabel="Group options"
                onPress={onEditGroup}
              >
                <Ionicons name="settings-outline" size={18} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionButton} accessibilityLabel="Call">
              <Ionicons name="call" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} accessibilityLabel="Video call">
              <Ionicons name="videocam" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
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
  headerGradient: {
    borderRadius: 18,
    padding: 1,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
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
  groupAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: 'rgba(229,9,20,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  groupAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
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
