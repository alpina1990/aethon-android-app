import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { SignOutButton } from '../../components/SignOutButton';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'family' | 'staff';
  time: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', text: 'Good morning! How is Martha doing today?', sender: 'family', time: '9:15 AM' },
  { id: '2', text: 'Hi! Martha had a wonderful morning. She ate her full breakfast and is now in the garden enjoying the sunshine.', sender: 'staff', time: '9:22 AM' },
  { id: '3', text: 'That\'s great to hear! Is she taking her new medication well?', sender: 'family', time: '9:25 AM' },
  { id: '4', text: 'Yes, she took all her meds on schedule. No side effects so far. We\'ll keep monitoring closely.', sender: 'staff', time: '9:30 AM' },
  { id: '5', text: 'Thank you so much for the updates. We really appreciate the care.', sender: 'family', time: '9:32 AM' },
];

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message.trim(),
      sender: 'family',
      time: 'Just now',
    }]);
    setMessage('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header - Stays fixed at top */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>AC</Text>
        </View>
        <View>
          <Text style={styles.headerName}>Aethon Care Team</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="phone" size={20} color="#0f172a" />
          </TouchableOpacity>
          <SignOutButton />
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messageList}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.sender === 'family' ? styles.bubbleFamily : styles.bubbleStaff,
            ]}
          >
            <Text style={[
              styles.bubbleText,
              msg.sender === 'family' ? styles.bubbleTextFamily : styles.bubbleTextStaff,
            ]}>
              {msg.text}
            </Text>
            <Text style={[
              styles.bubbleTime,
              msg.sender === 'family' ? styles.bubbleTimeFamily : undefined,
            ]}>
              {msg.time}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Feather name="paperclip" size={20} color="#94a3b8" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
          disabled={!message.trim()}
        >
          <Feather name="send" size={16} color="#ffffff" style={{ marginLeft: -2 }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
    zIndex: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  headerStatus: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  headerActions: {
    flex: 1,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
    backgroundColor: '#f8fafc', // Very light cool gray for message background
  },
  bubble: {
    maxWidth: '75%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  bubbleFamily: {
    backgroundColor: '#2563eb', // Rich Blue
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleStaff: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextFamily: {
    color: '#ffffff',
  },
  bubbleTextStaff: {
    color: '#0f172a',
  },
  bubbleTime: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  bubbleTimeFamily: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  attachBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: '#0f172a',
    maxHeight: 120,
    marginBottom: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
