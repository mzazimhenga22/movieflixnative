import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
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
      <Text style={styles.noMessagesTitle}>No messages yet</Text>
      <Text style={styles.noMessagesSubtitle}>Tap someone below to start a conversation</Text>

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
    </View>
  );
};

const styles = StyleSheet.create({
  noMessagesContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
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
