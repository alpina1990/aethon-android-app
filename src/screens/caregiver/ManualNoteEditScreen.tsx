import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export default function ManualNoteEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ManualNoteEdit'>>();
  const { noteId } = route.params;

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('visit_notes')
      .update({
        transcript: text.trim(),
        transcription_status: 'complete',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', noteId);
    setSaving(false);

    if (error) {
      Alert.alert('Could not save note', error.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Type note</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.hint}>Transcription was unavailable for this note. Type it instead.</Text>
        <TextInput
          style={styles.input}
          multiline
          autoFocus
          value={text}
          onChangeText={setText}
          placeholder="What happened during the visit"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity
          style={[styles.saveButton, (!text.trim() || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!text.trim() || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  body: { padding: 20, flex: 1 },
  hint: { fontSize: 15, color: '#64748b', marginBottom: 16 },
  input: { flex: 1, fontSize: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, color: '#0f172a', textAlignVertical: 'top', marginBottom: 20 },

  saveButton: { backgroundColor: '#3b82f6', height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
