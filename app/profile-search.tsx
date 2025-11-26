import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../constants/firebase';
import ScreenWrapper from '../components/ScreenWrapper';

const ProfileSearchScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const handleSearch = async () => {
    if (searchQuery.trim() === '') {
      setUsers([]);
      return;
    }

    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('displayName', '>=', searchQuery), where('displayName', '<=', searchQuery + '\uf8ff'));

    const querySnapshot = await getDocs(q);
    const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(usersData);
  };

  const handleProfilePress = (userId: string) => {
    router.push(`/profile?userId=${userId}`);
  };

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for users..."
            placeholderTextColor="#6E6E6E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleProfilePress(item.id)} style={styles.userItem}>
              <Image source={{ uri: item.photoURL || 'https://via.placeholder.com/50' }} style={styles.userAvatar} />
              <Text style={styles.userName}>{item.displayName}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});

export default ProfileSearchScreen;
