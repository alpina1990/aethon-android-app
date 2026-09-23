import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../constants/theme';

export function ConfigErrorScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Configuration missing</Text>
        <Text style={styles.body}>
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be
          set before the app can start. Add them to a .env file in the
          project root (see .env.example) and restart the dev server.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
    padding: Spacing['2xl'],
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.danger,
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.5,
  },
});
