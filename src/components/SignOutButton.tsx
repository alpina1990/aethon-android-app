import React from 'react';
import { TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function SignOutButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      Alert.alert('Could not sign out', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={signOut} accessibilityLabel="Sign out">
      <Feather name="log-out" size={22} color={Colors.danger} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
