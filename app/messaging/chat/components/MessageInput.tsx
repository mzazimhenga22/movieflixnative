import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const MessageInput = ({ onSendMessage, disabled }: MessageInputProps) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (disabled) return;
    const text = message.trim();
    if (!text) return;
    onSendMessage(text);
    setMessage('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.outer}>
      <View style={[styles.container, disabled && styles.disabledContainer]}>
        <TouchableOpacity style={styles.plusButton} accessibilityLabel="Add" disabled={disabled}>
          <Ionicons name="add-circle" size={28} color={disabled ? '#9e9e9e' : '#4D8DFF'} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={disabled ? 'Accept the request to chat' : 'Message...'}
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={message}
          onChangeText={setMessage}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!disabled}
        />

        <TouchableOpacity style={[styles.sendButton, disabled && styles.disabledSendButton]} onPress={handleSend} accessibilityLabel="Send" disabled={disabled}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
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
});

export default MessageInput;
