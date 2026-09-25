import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';
import { EmptyView } from '../../components/EmptyView';

import type { RootStackParamList } from '../../navigation/RootNavigator';

type UnreviewedNote = {
  id: string;
  transcript: string | null;
  created_at: string;
  residents: { first_name: string; last_name: string } | null;
};

export default function UnreviewedNotesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [notes, setNotes] = useState<UnreviewedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: queryError } = await supabase
        .from('visit_notes')
        .select('id, transcript, created_at, residents(first_name, last_name)')
        .eq('transcription_status', 'complete')
        .is('reviewed_at', null)
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setNotes((data ?? []) as unknown as UnreviewedNote[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notes to check</Text>
      </View>

      {loading ? (
        <LoadingView message="Loading notes" />
      ) : error ? (
        <ErrorView message="Could not load notes" onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {notes.length === 0 ? (
            <EmptyView icon="check-circle" message="No notes need checking" />
          ) : (
            notes.map(note => (
              <TouchableOpacity
                key={note.id}
                style={styles.card}
                onPress={() => navigation.navigate('NoteReview', { noteId: note.id })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.amberDot} />
                  <Text style={styles.clientName}>
                    {note.residents ? `${note.residents.first_name} ${note.residents.last_name}` : 'Unknown'}
                  </Text>
                  <Text style={styles.time}>
                    {new Date(note.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
                <Text style={styles.preview} numberOfLines={2}>{note.transcript}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  scrollContent: { padding: 16, paddingBottom: 100 },
  emptyText: { fontSize: 17, color: '#94a3b8', textAlign: 'center', marginTop: 40 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  amberDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  clientName: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  time: { fontSize: 15, color: '#94a3b8' },
  preview: { fontSize: 15, color: '#475569', lineHeight: 20 },
});
