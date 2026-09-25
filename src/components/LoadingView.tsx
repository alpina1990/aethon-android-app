import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export function LoadingView({ message, large }: { message?: string; large?: boolean }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message ? <Text style={[styles.message, large && styles.messageLarge]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 17, color: Colors.textMuted, marginTop: 16, textAlign: 'center' },
  messageLarge: { fontSize: 22 },
});
