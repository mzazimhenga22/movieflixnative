import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ScreenWrapper from '../../components/ScreenWrapper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const ACCENT = '#E50914';

const ProfileScreen = () => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const user = {
    name: 'Current User',
    avatar:
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=1780&ixlib=rb-4.0.3',
    memberSince: '2023',
    favoriteGenres: ['Sci-Fi', 'Action', 'Comedy'],
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent={false} />
      <LinearGradient
        colors={['#2b0000', '#120206', '#06060a']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.gradient}
      >
        <BlurView intensity={20} tint="dark" style={styles.backgroundGlass} />

        <ScreenWrapper>
          <ScrollView contentContainerStyle={styles.container}>
            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Profile header (glassy card) */}
            <BlurView intensity={60} tint="dark" style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                {/* subtle ring */}
                <View style={styles.avatarRing} />
              </View>

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
            </BlurView>

            {/* Stats card (glassy) */}
            <BlurView intensity={48} tint="dark" style={styles.statsCard}>
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
            </BlurView>

            {/* Favorite genres (glassy) */}
            <BlurView intensity={44} tint="dark" style={styles.genresCard}>
              <Text style={styles.sectionTitle}>Favorite Genres</Text>
              <View style={styles.genresList}>
                {user.favoriteGenres.map((genre) => (
                  <View key={genre} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </BlurView>

            {/* padding bottom to avoid overlap with nav */}
            <View style={{ height: 80 }} />
          </ScrollView>
        </ScreenWrapper>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  backgroundGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 26,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 28,
    left: 18,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  /* Profile header card */
  profileCard: {
    marginTop: 6,
    marginBottom: 22,
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarRing: {
    position: 'absolute',
    left: -6,
    top: -6,
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    borderColor: 'rgba(229,9,20,0.14)',
    shadowColor: ACCENT,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  memberSince: {
    fontSize: 13,
    color: '#CFCFCF',
    marginBottom: 12,
  },
  editProfileButton: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: ACCENT,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  editProfileButtonText: {
    color: '#fff',
    fontWeight: '800',
  },

  /* Stats card */
  statsCard: {
    marginBottom: 18,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.015)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#CFCFCF',
    marginTop: 6,
  },

  /* Genres card */
  genresCard: {
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  genreText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default ProfileScreen;
