import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onTypingChange?: (typing: boolean) => void;
  disabled?: boolean;
  onPickMedia?: (uri: string, type: 'image' | 'video') => void;
  onPickAudio?: (uri: string) => void;
  replyLabel?: string;
  isEditing?: boolean;
}

const EMOJIS = ['😀', '😅', '😍', '🤔', '😭', '🔥', '✨', '👍', '👎', '❤️', '🎬', '🍿'];

const MessageInput = ({
  onSendMessage,
  onTypingChange,
  disabled,
  onPickMedia,
  onPickAudio,
  replyLabel,
  isEditing,
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const typingTimerRef = React.useRef<number | null>(null);
  const isTypingRef = React.useRef(false);
  const recordingTimerRef = React.useRef<number | null>(null);
  const waveAnimations = useRef(Array.from({ length: 5 }, () => new Animated.Value(1))).current;

  const hasText = message.trim().length > 0;

  const handleSend = () => {
    if (disabled) return;
    const text = message.trim();
    if (!text) return;
    onSendMessage(text);
    setMessage('');
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    isTypingRef.current = false;
    onTypingChange?.(false);
    Keyboard.dismiss();
  };

  const handleChange = (text: string) => {
    setMessage(text);
    const hasTextNow = !!text.trim();

    if (hasTextNow && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange?.(true);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // debounce stop typing after 1200ms of inactivity
    typingTimerRef.current = (setTimeout(() => {
      isTypingRef.current = false;
      typingTimerRef.current = null;
      onTypingChange?.(false);
    }, 1200) as unknown) as number;
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow microphone access to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start wave animations
      startWaveAnimations();

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Haptic feedback
      Vibration.vibrate(50);

    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording failed', 'Unable to start voice recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri && recordingDuration >= 1) {
        // Send the audio message
        if (onPickAudio) {
          onPickAudio(uri);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
      stopWaveAnimations();

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    }
  };

  const startWaveAnimations = () => {
    const animateWave = (index: number) => {
      Animated.sequence([
        Animated.timing(waveAnimations[index], {
          toValue: 1.5 + Math.random() * 0.5,
          duration: 300 + Math.random() * 200,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimations[index], {
          toValue: 1,
          duration: 300 + Math.random() * 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isRecording) {
          animateWave(index);
        }
      });
    };

    waveAnimations.forEach((_, index) => {
      setTimeout(() => animateWave(index), index * 100);
    });
  };

  const stopWaveAnimations = () => {
    waveAnimations.forEach((anim) => {
      anim.setValue(1);
    });
  };

  const handleMic = () => {
    if (disabled) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRightPress = () => {
    if (hasText) {
      handleSend();
    } else {
      handleMic();
    }
  };

  const handleEmojiPress = () => {
    if (disabled) return;
    setShowEmojis((prev) => !prev);
    if (!showEmojis) {
      setShowAttachSheet(false);
    }
    Keyboard.dismiss();
  };

  const appendEmoji = (emoji: string) => {
    const next = message + emoji;
    setMessage(next);
    onTypingChange?.(true);
  };

  const pickMedia = async () => {
    if (disabled) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow media access to attach photos or videos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const type = asset.type === 'video' ? 'video' : 'image';
        if (onPickMedia) {
          onPickMedia(asset.uri, type);
        } else {
          console.log('Picked media', asset.uri, type);
        }
      }
    } catch (e) {
      console.warn('pickMedia error', e);
    }
  };

  const pickAudio = async () => {
    if (disabled) return;
    Alert.alert('Coming soon', 'Audio attachments are not available yet in this build.');
  };

  const handlePlus = () => {
    if (disabled) return;
    setShowAttachSheet((prev) => !prev);
    if (!showAttachSheet) {
      setShowEmojis(false);
    }
    Keyboard.dismiss();
  };

  React.useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current as unknown as number);
        typingTimerRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.outer}>
      {replyLabel && (
        <View style={styles.replyBar}>
          <Text style={styles.replyLabel} numberOfLines={1}>
            Replying to: {replyLabel}
          </Text>
        </View>
      )}
      {isEditing && !replyLabel && (
        <View style={styles.replyBar}>
          <Text style={styles.replyLabel}>Editing message</Text>
        </View>
      )}
      <View style={[styles.container, disabled && styles.disabledContainer]}>
        <TouchableOpacity
          style={styles.iconButton}
          accessibilityLabel="Emoji"
          disabled={disabled}
          onPress={handleEmojiPress}
        >
          <Ionicons name="happy-outline" size={24} color={disabled ? '#9e9e9e' : '#f5f5f5'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.plusButton}
          accessibilityLabel="Add"
          disabled={disabled}
          onPress={handlePlus}
        >
          <Ionicons name="add-circle" size={28} color={disabled ? '#9e9e9e' : '#4D8DFF'} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={disabled ? 'Accept the request to chat' : 'Message...'}
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={message}
          onChangeText={handleChange}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!disabled}
        />

        <TouchableOpacity
          style={[styles.sendButton, disabled && styles.disabledSendButton]}
          onPress={handleRightPress}
          accessibilityLabel={hasText ? 'Send' : 'Voice'}
          disabled={disabled}
        >
          <Ionicons name={hasText ? 'send' : 'mic'} size={20} color="white" />
        </TouchableOpacity>
      </View>

      {showEmojis && !disabled && (
        <View style={styles.emojiKeyboard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.emojiScrollContent}
          >
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => appendEmoji(emoji)}
                style={styles.emojiButton}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showAttachSheet && !disabled && (
        <View style={styles.attachSheet}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attachScrollContent}
          >
            <TouchableOpacity style={styles.attachItem} onPress={pickMedia}>
              <View style={styles.attachIconCircle}>
                <Ionicons name="image-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.attachLabel}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachItem} onPress={pickMedia}>
              <View style={styles.attachIconCircle}>
                <Ionicons name="videocam-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.attachLabel}>Videos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachItem} onPress={pickAudio}>
              <View style={styles.attachIconCircle}>
                <Ionicons name="mic-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.attachLabel}>Audio</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachItem} onPress={pickMedia}>
              <View style={styles.attachIconCircle}>
                <Ionicons name="document-outline" size={22} color="#fff" />
              </View>
              <Text style={styles.attachLabel}>Files</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {isRecording && (
        <View style={styles.recordingOverlay}>
          <View style={styles.recordingContainer}>
            <View style={styles.waveContainer}>
              {waveAnimations.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      transform: [{ scaleY: anim }],
                      backgroundColor: '#ff4b4b',
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.recordingInfo}>
              <Ionicons name="mic" size={24} color="#ff4b4b" />
              <Text style={styles.recordingText}>
                Recording... {recordingDuration}s
              </Text>
            </View>
            <TouchableOpacity
              style={styles.stopRecordingButton}
              onPress={stopRecording}
            >
              <Ionicons name="stop" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  replyBar: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  replyLabel: {
    color: '#f5f5f5',
    fontSize: 14,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    minHeight: 56,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  plusButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f5f5f5',
    fontSize: 16,
    maxHeight: 120,
    minHeight: 20,
    paddingVertical: 4,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4D8DFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: '#333',
  },
  emojiKeyboard: {
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    maxHeight: 200,
  },
  emojiScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 24,
  },
  attachSheet: {
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 16,
  },
  attachScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  attachItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  attachIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4D8DFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachLabel: {
    color: '#f5f5f5',
    fontSize: 12,
    textAlign: 'center',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 16,
  },
  waveBar: {
    width: 4,
    height: 40,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingText: {
    color: '#f5f5f5',
    fontSize: 16,
    marginLeft: 8,
  },
  stopRecordingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff4b4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MessageInput;
