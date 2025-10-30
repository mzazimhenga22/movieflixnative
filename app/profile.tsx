import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ScreenWrapper from '../components/ScreenWrapper';

const ProfileScreen = () => {
  const router = useRouter();

  const user = {
    name: 'Frank',
    avatar:
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=1780&ixlib=rb-4.0.3',
    memberSince: '2023',
    favoriteGenres: ['Sci-Fi', 'Action', 'Comedy'],
  };

  const handleEditProfile = () => {
    console.log('Edit profile pressed');
  };

  const handleSettings = () => {
    console.log('Settings pressed');
  };

  return (
    <ScreenWrapper>
      <StatusBar style="light" translucent={false} />
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.inner}>
          <View style={styles.profileHeader}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.memberSince}>
              Member since {user.memberSince}
            </Text>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>128</Text>
              <Text style={styles.statLabel}>Movies Watched</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>32</Text>
              <Text style={styles.statLabel}>Hours Spent</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Watchlists</Text>
            </View>
          </View>

          <View style={styles.favoriteGenresContainer}>
            <Text style={styles.sectionTitle}>Favorite Genres</Text>
            <View style={styles.genresList}>
              {user.favoriteGenres.map((genre) => (
                <View key={genre} style={styles.genreTag}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionItem} onPress={handleSettings}>
              <Ionicons name="settings-outline" size={24} color="white" />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="help-circle-outline" size={24} color="white" />
              <Text style={styles.actionText}>Help & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.replace('/')}
            >
              <Ionicons name="log-out-outline" size={24} color="red" />
              <Text style={[styles.actionText, { color: 'red' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
  },
  backButton: {
    position: 'absolute',
    top: 30,
    left: 15,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 8,
  },
  inner: {
    flex: 1,
    marginTop: 50,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF4500',
    marginBottom: 15,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 15,
  },
  editProfileButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  editProfileButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 30,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: '#BBBBBB',
    marginTop: 5,
  },
  favoriteGenresContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
  },
  genreText: {
    color: 'white',
    fontSize: 14,
  },
  actionsContainer: {},
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 15,
  },
});

export default ProfileScreen;
