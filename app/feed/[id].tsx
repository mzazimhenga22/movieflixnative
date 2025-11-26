import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { findOrCreateConversation, findUserByUsername } from '../messaging/controller';

const POSTS = Array.from({ length: 20 }, (_, i) => ({
  id: i.toString(),
  username: `user${i}`,
  avatar: `https://i.pravatar.cc/150?u=user${i}`,
  image: `https://picsum.photos/id/${i + 10}/400/400`,
  caption: `This is post number ${i + 1}`,
}));

const FeedScreen = () => {
  const { username } = useLocalSearchParams();
  const router = useRouter();

  const handleMessagePress = async (postUsername: string) => {
    const user = await findUserByUsername(postUsername);
    if (user) {
      const conversationId = await findOrCreateConversation(user);
      router.push(`/messaging/chat/${conversationId}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{`${username}'s Feed`}</Text>
      </View>
      <FlatList
        data={POSTS}
        renderItem={({ item }) => (
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <Text style={styles.username}>{item.username}</Text>
              <TouchableOpacity style={styles.messageButton} onPress={() => handleMessagePress(item.username)}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: item.image }} style={styles.postImage} />
            <Text style={styles.caption}>{item.caption}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  postContainer: {
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    flex: 1,
  },
  messageButton: {
    padding: 5,
  },
  postImage: {
    width: '100%',
    height: 400,
  },
  caption: {
    color: '#B3B3B3',
    padding: 10,
  },
});

export default FeedScreen;
