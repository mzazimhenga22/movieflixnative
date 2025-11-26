import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Profile } from '../messagesController';

interface Props {
  item: Profile;
  onStartChat: (person: Profile) => void;
}

const SuggestedPerson = ({ item, onStartChat }: Props) => (
  <View style={styles.personItem}>
    <Image source={{ uri: item.photoURL }} style={styles.personAvatar} />
    <View style={styles.personDetails}>
      <View>
        <Text style={styles.personName}>{item.displayName}</Text>
        <Text style={styles.personSub}>Suggested</Text>
      </View>

      <TouchableOpacity style={styles.startChatButton} onPress={() => onStartChat(item)}>
        <Text style={styles.startChatButtonText}>Chat</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  personAvatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  personDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  personSub: {
    color: '#a8a8a8',
    fontSize: 12,
  },
  startChatButton: {
    backgroundColor: '#4D8DFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  startChatButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default SuggestedPerson;
