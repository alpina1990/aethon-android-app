import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export function ErrorView({ message, onRetry, large }: { message: string; onRetry: () => void; large?: boolean }) {
  return (
    <View style={styles.container}>
      <Feather name="alert-circle" size={64} color={Colors.danger} />
      <Text style={[styles.message, large && styles.messageLarge]}>{message}</Text>
      <TouchableOpacity style={[styles.button, large && styles.buttonLarge]} onPress={onRetry}>
        <Text style={[styles.buttonText, large && styles.buttonTextLarge]}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 18, color: Colors.textPrimary, textAlign: 'center', marginTop: 16, marginBottom: 20 },
  messageLarge: { fontSize: 24 },
  button: { width: 180, height: 52, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonLarge: { height: 80 },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  buttonTextLarge: { fontSize: 24 },
});
