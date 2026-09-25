import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export function EmptyView({ icon, message, detail, large }: { icon: React.ComponentProps<typeof Feather>['name']; message: string; detail?: string; large?: boolean }) {
  return (
    <View style={styles.container}>
      <Feather name={icon} size={72} color={Colors.border} />
      <Text style={[styles.message, large && styles.messageLarge]}>{message}</Text>
      {detail ? <Text style={[styles.detail, large && styles.detailLarge]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  message: { fontSize: 18, color: Colors.textMuted, textAlign: 'center', marginTop: 12 },
  messageLarge: { fontSize: 22 },
  detail: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },
  detailLarge: { fontSize: 22 },
});
