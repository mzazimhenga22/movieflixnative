import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { signUpWithEmail } from '../messaging/controller';
import { updateProfile } from 'firebase/auth';
import { authPromise, firestore } from '../../constants/firebase';
import { doc, setDoc } from 'firebase/firestore';
import ScreenWrapper from '../../components/ScreenWrapper';

const SignupScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      return Alert.alert('Error', 'Please fill in all fields');
    }

    if (password !== confirmPassword) {
      return Alert.alert('Error', "Passwords don't match");
    }

    try {
      const user = await signUpWithEmail(email, password);
      if (user) {
        const auth = await authPromise;
        // ✅ Update user's display name in Firebase Auth
        await updateProfile(auth.currentUser!, { displayName: name });

        // ✅ Create user document in Firestore
        await setDoc(doc(firestore, 'users', user.uid), {
          displayName: name,
          email: email,
          planTier: 'free',
        });

        router.replace('/select-profile');
      } else {
        Alert.alert('Error', 'There was an issue signing up. Please try again.');
      }
    } catch (error: any) {
      console.error('Signup Error:', error);
      Alert.alert('Error', error.message || 'Something went wrong during signup.');
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <Text style={styles.title}>Create Your Account</Text>

            {/* ✅ Name Field */}
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Sign up</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.link}>Already have an account? Login</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 420,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  button: {
    width: '100%',
    maxWidth: 420,
    height: 50,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  link: {
    color: '#e50914',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default SignupScreen;
