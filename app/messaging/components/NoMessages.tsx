import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import SuggestedPerson from './SuggestedPerson';
import { useRouter } from 'expo-router';
import { Profile } from '../messagesController';

interface Props {
  suggestedPeople: Profile[];
  onStartChat: (person: Profile) => void;
  headerHeight: number;
}

const NoMessages = ({ suggestedPeople, onStartChat, headerHeight }: Props) => {
  const router = useRouter();

  const handleProfilePress = (userId: string) => {
    router.push(`/profile?userId=${userId}&from=social-feed`);
  };

  return (
    <View style={[styles.noMessagesContainer, { paddingTop: headerHeight + 20 }]}>
      <BlurView intensity={60} tint="dark" style={styles.card}>
        <Text style={styles.noMessagesTitle}>No messages yet</Text>
        <Text style={styles.noMessagesSubtitle}>
          Start with people you follow or those popular in Movieflix
        </Text>

        <FlatList
          data={suggestedPeople}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleProfilePress(item.id)}>
              <SuggestedPerson item={item} onStartChat={onStartChat} />
            </TouchableOpacity>
          )}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 12 }}
          showsVerticalScrollIndicator={false}
        />
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  noMessagesContainer: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    width: '92%',
    borderRadius: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#050915',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  noMessagesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  noMessagesSubtitle: {
    fontSize: 14,
    color: '#bdbdbd',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});

export default NoMessages;
