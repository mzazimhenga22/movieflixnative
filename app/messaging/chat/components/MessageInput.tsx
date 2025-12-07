import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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

  const hasText = message.trim().length > 0;

  const handleSend = () => {
    if (disabled) return;
    const text = message.trim();
    if (!text) return;
    onSendMessage(text);
    setMessage('');
    onTypingChange?.(false);
    Keyboard.dismiss();
  };

  const handleChange = (text: string) => {
    setMessage(text);
    onTypingChange?.(!!text.trim());
  };

  const handleMic = () => {
    if (disabled) return;
    console.log('Mic pressed');
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
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  disabledContainer: {
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  iconButton: {
    marginRight: 6,
  },
  plusButton: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    color: 'white',
    fontSize: 15,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  sendButton: {
    backgroundColor: '#4D8DFF',
    borderRadius: 999,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: '#9e9e9e',
  },
  replyBar: {
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  replyLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  emojiKeyboard: {
    marginTop: 6,
    paddingHorizontal: 6,
    maxHeight: 220,
  },
  emojiScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  attachSheet: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
  },
  attachScrollContent: {
    alignItems: 'center',
  },
  attachItem: {
    alignItems: 'center',
    marginRight: 14,
  },
  attachIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  attachLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  emojiButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  emojiText: {
    fontSize: 20,
  },
});

export default MessageInput;
