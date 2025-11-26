
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { ThemedText } from '../components/themed-text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Media } from '../types';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const MyListScreen = () => {
  const [myList, setMyList] = useState<Media[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchMyList = async () => {
      try {
        const list = await AsyncStorage.getItem('myList');
        if (list) {
          setMyList(JSON.parse(list));
        }
      } catch (error) {
        console.error('Error fetching My List:', error);
      }
    };
    fetchMyList();
  }, []);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <ThemedText type="title">My List</ThemedText>
        </View>
        <FlatList
          data={myList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/details/${item.id}`)}>
              <View style={styles.movieContainer}>
                <ThemedText>{item.title}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  movieContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default MyListScreen;
