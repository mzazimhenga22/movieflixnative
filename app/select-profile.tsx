import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy'; // 👈 use legacy FS API
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type DocumentData,
  type Unsubscribe,
  updateDoc,
} from 'firebase/firestore';

import ScreenWrapper from '../components/ScreenWrapper';
import { authPromise, firestore } from '../constants/firebase';
import { supabase, supabaseConfigured } from '../constants/supabase';
import { useAccent } from './components/AccentContext';

type PlanTier = 'free' | 'plus' | 'premium';

type HouseholdProfile = {
  id: string;
  name: string;
  avatarColor: string;
  photoURL?: string | null;
  photoPath?: string | null;
  isKids?: boolean;
};

const PROFILE_LIMITS: Record<PlanTier, number> = {
  free: 1,
  plus: 3,
  premium: 5,
};

const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free Plan',
  plus: 'Plus Plan',
  premium: 'Premium Plan',
};

const palette = ['#e50914', '#ff914d', '#2ec4b6', '#6c5ce7', '#ff6bcb', '#00b8d9'];
const PROFILES_BUCKET = 'profiles';

const SelectProfileScreen = () => {
  const router = useRouter();
  const { accentColor } = useAccent();

  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [profiles, setProfiles] = useState<HouseholdProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isKidsProfile, setIsKidsProfile] = useState(false);
  const [selectedColor, setSelectedColor] = useState(palette[0]);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState<HouseholdProfile | null>(null);

  const profileLimit = PROFILE_LIMITS[planTier];
  const planLabel = PLAN_LABELS[planTier];
  const canAddProfile = profiles.length < profileLimit;
  const previewAvatarSource = avatarUri || editingProfile?.photoURL || null;
  const isEditing = Boolean(editingProfile);
  const profileCacheKey = currentUser ? `profileCache:${currentUser.uid}` : null;

  const loadPlanTier = useCallback(async () => {
    if (!currentUser) {
      setPlanTier('free');
      return;
    }

    let resolvedPlan: PlanTier = 'free';

    try {
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const rawPlan = (
        (userDocSnap.data()?.planTier as string | undefined) ?? 'free'
      ).toLowerCase() as PlanTier;

      if (rawPlan === 'premium' || rawPlan === 'plus' || rawPlan === 'free') {
        resolvedPlan = rawPlan;
      } else {
        resolvedPlan = 'free';
      }
    } catch (err) {
      console.warn('[select-profile] failed to read plan tier', err);
      resolvedPlan = 'free';
    }

    try {
      const override = await AsyncStorage.getItem('planTierOverride');
      if (
        override === 'premium' ||
        override === 'plus' ||
        override === 'free'
      ) {
        resolvedPlan = override;
      }
    } catch (err) {
      console.warn('[select-profile] failed to read plan override', err);
    }

    setPlanTier(resolvedPlan);
  }, [currentUser]);

  // 🔍 Debug: confirm Supabase config in the app
  useEffect(() => {
    console.log('[select-profile] supabaseConfigured:', supabaseConfigured);
    // @ts-ignore - debug only
    console.log('[select-profile] supabase client:', supabase);
  }, []);

  useEffect(() => {
    let unsubscribeAuth: Unsubscribe | undefined;
    authPromise
      .then((auth) => {
        setAuthChecked(true);
        setCurrentUser(auth.currentUser ?? null);
        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user ?? null);
        });
      })
      .catch((err) => {
        console.warn('[select-profile] auth init failed', err);
        setAuthChecked(true);
        setCurrentUser(null);
      });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (authChecked && !currentUser) {
      router.replace('/(auth)/login');
    }
  }, [authChecked, currentUser, router]);

  useEffect(() => {
    let isMounted = true;

    const hydrateProfilesFromCache = async () => {
      if (!profileCacheKey) {
        if (isMounted) {
          setProfiles([]);
          setLoadingProfiles(false);
        }
        return;
      }

      try {
        const cached = await AsyncStorage.getItem(profileCacheKey);
        if (!isMounted || !cached) return;
        const parsed = JSON.parse(cached) as HouseholdProfile[];
        if (Array.isArray(parsed)) {
          setProfiles(parsed);
          if (parsed.length === 0) {
            setShowCreateCard(true);
          }
          setLoadingProfiles(false);
        }
      } catch (err) {
        console.warn('[select-profile] failed to read cached profiles', err);
      }
    };

    void hydrateProfilesFromCache();

    return () => {
      isMounted = false;
    };
  }, [profileCacheKey]);

  useEffect(() => {
    void loadPlanTier();
  }, [loadPlanTier]);

  useFocusEffect(
    useCallback(() => {
      void loadPlanTier();
    }, [loadPlanTier])
  );

  useEffect(() => {
    if (!currentUser) {
      setProfiles([]);
      setLoadingProfiles(false);
      return;
    }

    let unsubProfiles: Unsubscribe | undefined;

    try {
      const profilesRef = collection(firestore, 'users', currentUser.uid, 'profiles');
      const q = query(profilesRef, orderBy('createdAt', 'asc'));
      unsubProfiles = onSnapshot(
        q,
        (snapshot) => {
          const nextProfiles = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as DocumentData;
            return {
              id: docSnap.id,
              name:
                typeof data.name === 'string' && data.name.trim().length > 0
                  ? data.name
                  : 'Profile',
              avatarColor:
                typeof data.avatarColor === 'string' && data.avatarColor.trim()
                  ? data.avatarColor
                  : palette[0],
              photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
              photoPath: typeof data.photoPath === 'string' ? data.photoPath : null,
              isKids: Boolean(data.isKids),
            };
          });
          setProfiles(nextProfiles);
          setErrorCopy(null);
          setLoadingProfiles(false);
          if (nextProfiles.length === 0) {
            setShowCreateCard(true);
          } else {
            setShowCreateCard(false);
          }
          if (profileCacheKey) {
            AsyncStorage.setItem(profileCacheKey, JSON.stringify(nextProfiles)).catch((err) => {
              console.warn('[select-profile] failed to cache profiles', err);
            });
          }
        },
        (error) => {
          console.error('[select-profile] profile snapshot failed', error);
          setLoadingProfiles(false);
          setErrorCopy('We could not load your profiles.');
        }
      );
    } catch (err) {
      console.error('[select-profile] failed to load profiles', err);
      setLoadingProfiles(false);
      setErrorCopy('We could not load your profiles.');
    }

    return () => {
      if (unsubProfiles) unsubProfiles();
    };
  }, [currentUser, profileCacheKey]);

  useEffect(() => {
    if (!loadingProfiles && profiles.length === 0) {
      setShowCreateCard(true);
    }
  }, [loadingProfiles, profiles.length]);

  const handleSelectProfile = async (profile: HouseholdProfile) => {
    try {
      await AsyncStorage.setItem(
        'activeProfile',
        JSON.stringify({
          id: profile.id,
          name: profile.name,
          avatarColor: profile.avatarColor,
          photoURL: profile.photoURL ?? null,
          photoPath: profile.photoPath ?? null,
          isKids: profile.isKids ?? false,
          planTier,
        })
      );
      router.replace('/(tabs)/movies');
    } catch (err) {
      console.error('[select-profile] failed to store active profile', err);
      Alert.alert('Error', 'Unable to select this profile. Please try again.');
    }
  };

  const resetForm = () => {
    setNewProfileName('');
    setIsKidsProfile(false);
    setSelectedColor(palette[0]);
    setAvatarUri(null);
    setEditingProfile(null);
    setShowCreateCard(false);
    setAvatarUploading(false);
  };

  const openNewProfileForm = () => {
    resetForm();
    setShowCreateCard(true);
  };

  const startEditingProfile = (profile: HouseholdProfile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setSelectedColor(profile.avatarColor || palette[0]);
    setIsKidsProfile(profile.isKids ?? false);
    setAvatarUri(null);
    setShowCreateCard(true);
  };

  const handleDeleteProfile = (profile: HouseholdProfile) => {
    if (!currentUser) return;

    Alert.alert(
      'Delete profile',
      `Are you sure you want to delete ${profile.name}? This removes their list and image.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'users', currentUser.uid, 'profiles', profile.id));
              if (supabaseConfigured && profile.photoPath) {
                await supabase.storage.from(PROFILES_BUCKET).remove([profile.photoPath]);
              }
              const stored = await AsyncStorage.getItem('activeProfile');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.id === profile.id) {
                  await AsyncStorage.removeItem('activeProfile');
                }
              }
            } catch (err) {
              console.error('[select-profile] failed to delete profile', err);
              Alert.alert('Error', 'Unable to delete this profile. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const uploadAvatarToSupabase = async (): Promise<{ url: string; path: string } | null> => {
    if (!avatarUri || !currentUser) return null;
    if (!supabaseConfigured) {
      console.warn('[select-profile] Supabase not configured, skipping avatar upload');
      return null;
    }

    try {
      console.log('[select-profile] starting avatar upload', { avatarUri });

      // 1) Read file as base64 from local URI (legacy API is fine here)
      const base64 = await FileSystem.readAsStringAsync(avatarUri, {
        encoding: 'base64',
      });

      // 2) Convert base64 -> ArrayBuffer (supported by Supabase in React Native)
      const arrayBuffer = decode(base64);

      // 3) Derive a safe file name + extension
      const uriExt = avatarUri.split('.').pop()?.split('?')[0];
      const extension = uriExt || 'jpg';

      const safeName = `${currentUser.uid}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;

      console.log('[select-profile] uploading to path', safeName);

      // 4) Upload ArrayBuffer instead of Blob
      const { error } = await supabase.storage
        .from(PROFILES_BUCKET)
        .upload(safeName, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        });

      if (error) {
        console.error('[select-profile] supabase upload error', error);
        throw error;
      }

      // 5) Get public URL
      const { data: urlData } = supabase.storage.from(PROFILES_BUCKET).getPublicUrl(safeName);

      console.log('[select-profile] upload success, public URL', urlData.publicUrl);

      return { url: urlData.publicUrl, path: safeName };
    } catch (err) {
      console.error('[select-profile] avatar upload failed', err);
      Alert.alert('Upload failed', 'Unable to upload the selected photo. Please try again.');
      return null;
    }
  };

  const handleCreateProfile = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to create a profile.');
      return;
    }
    if (!canAddProfile) {
      Alert.alert('Upgrade needed', 'You have reached the maximum number of profiles for your plan.');
      return;
    }
    const trimmedName = newProfileName.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please provide a name for this profile.');
      return;
    }

    setSavingProfile(true);
    let uploadResult: { url: string; path: string } | null = null;

    if (avatarUri) {
      setAvatarUploading(true);
      uploadResult = await uploadAvatarToSupabase();
    }

    try {
      const chosenColor = selectedColor || palette[0];
      const payload: Record<string, any> = {
        name: trimmedName,
        avatarColor: chosenColor,
        isKids: isKidsProfile,
      };

      if (!editingProfile) {
        payload.createdAt = serverTimestamp();
        payload.planTierAtCreation = planTier;
      }
      if (uploadResult) {
        payload.photoURL = uploadResult.url;
        payload.photoPath = uploadResult.path;
      }

      if (editingProfile) {
        const profileRef = doc(
          firestore,
          'users',
          currentUser.uid,
          'profiles',
          editingProfile.id
        );
        await updateDoc(profileRef, payload);
      } else {
        await addDoc(collection(firestore, 'users', currentUser.uid, 'profiles'), payload);
      }

      resetForm();
    } catch (err) {
      console.error('[select-profile] failed to create profile', err);
      Alert.alert('Error', 'We could not save this profile. Please try again.');
    } finally {
      setSavingProfile(false);
      setAvatarUploading(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to set a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setAvatarUri(result.assets[0].uri);
    } catch (err) {
      console.error('[select-profile] avatar pick failed', err);
      Alert.alert('Error', 'Could not open the photo library. Please try again.');
    }
  };

  const profileData = useMemo(() => profiles, [profiles]);

  const renderProfile = ({ item }: { item: HouseholdProfile }) => (
    <TouchableOpacity style={styles.profileCard} onPress={() => handleSelectProfile(item)}>
      <View style={styles.profileActions} pointerEvents="box-none">
        <TouchableOpacity style={styles.actionButton} onPress={() => startEditingProfile(item)}>
          <Ionicons name="pencil" size={16} color={accentColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteProfile(item)}>
          <Ionicons name="trash" size={16} color={accentColor} />
        </TouchableOpacity>
      </View>
      <View
        style={[
          styles.avatar,
          !item.photoURL && { backgroundColor: item.avatarColor || '#222' },
        ]}
      >
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <Text style={styles.profileName} numberOfLines={1}>
        {item.name}
      </Text>
      {item.isKids && <Text style={styles.kidsPill}>Kids</Text>}
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Who's watching?</Text>
          <Text style={styles.subtitle}>Pick a profile to load personalized recommendations.</Text>
        </View>

        <View style={styles.planRow}>
          <Text style={styles.planText}>
            {planLabel} • {profiles.length}/{profileLimit} used
          </Text>
          {planTier !== 'premium' && (
            <TouchableOpacity onPress={() => router.push('/premium?source=profiles')}>
              <Text style={[styles.upgradeLink, { color: accentColor }]}>Need more?</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingProfiles ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color={accentColor} size="small" />
            <Text style={styles.loaderText}>Loading profiles...</Text>
          </View>
        ) : errorCopy ? (
          <Text style={styles.errorText}>{errorCopy}</Text>
        ) : (
          <FlatList
            data={profileData}
            keyExtractor={(item) => item.id}
            renderItem={renderProfile}
            numColumns={2}
            contentContainerStyle={[
              styles.profileGrid,
              profileData.length === 0 && styles.profileGridEmpty,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Ionicons name="add-circle-outline" size={36} color="rgba(255,255,255,0.8)" />
                <Text style={styles.emptyTitle}>Create your first profile</Text>
                <Text style={styles.emptySubtitle}>
                  Add a profile for every person in your household so everyone gets their own list.
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.addButton,
              !canAddProfile && styles.addButtonDisabled,
              { backgroundColor: accentColor },
            ]}
            onPress={openNewProfileForm}
            disabled={!canAddProfile}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>
              {canAddProfile ? 'Add profile' : 'Limit reached'}
            </Text>
          </TouchableOpacity>
        </View>

        {showCreateCard && (
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>{isEditing ? 'Edit profile' : 'New profile'}</Text>
            <TextInput
              placeholder="Profile name"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.input}
              value={newProfileName}
              onChangeText={setNewProfileName}
              maxLength={20}
            />

            <View style={styles.uploadRow}>
              <TouchableOpacity
                style={styles.avatarUpload}
                onPress={handlePickAvatar}
                onLongPress={() => setAvatarUri(null)}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarUploadImage} />
                ) : previewAvatarSource ? (
                  <Image source={{ uri: previewAvatarSource }} style={styles.avatarUploadImage} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera" size={24} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.uploadHint}>
                      {avatarUploading ? 'Selecting photo…' : 'Add a profile photo'}
                    </Text>
                    <Text style={styles.uploadSubtext}>Optional (tap to change)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.colorRow}>
              {palette.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && { borderColor: '#fff', borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.kidsRow}>
              <Text style={styles.kidsLabel}>Kids profile</Text>
              <Switch
                value={isKidsProfile}
                onValueChange={setIsKidsProfile}
                thumbColor={isKidsProfile ? '#fff' : '#999'}
                trackColor={{ true: accentColor, false: 'rgba(255,255,255,0.2)' }}
              />
            </View>

            <View style={styles.createActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: accentColor }]}
                onPress={handleCreateProfile}
                disabled={savingProfile}
              >
                <Text style={styles.saveText}>
                  {savingProfile ? 'Saving…' : isEditing ? 'Save' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  upgradeLink: {
    fontWeight: '700',
    fontSize: 13,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loaderText: {
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 12,
  },
  errorText: {
    color: '#ff7675',
    textAlign: 'center',
    marginTop: 20,
  },
  profileGrid: {
    flexGrow: 1,
    paddingVertical: 12,
  },
  profileGridEmpty: {
    justifyContent: 'center',
  },
  profileCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    marginHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    zIndex: 2,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  kidsPill: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    marginTop: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#fff',
    marginLeft: 8,
  },
  createCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarUpload: {
    width: 90,
    height: 90,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  avatarUploadImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  uploadSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  createTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  kidsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kidsLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginLeft: 12,
  },
  saveText: {
    color: '#05060f',
    fontWeight: '700',
  },
});

export default SelectProfileScreen;
