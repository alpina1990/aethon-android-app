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

type FlaggedNote = {
  id: string;
  resident_id: string;
  flag_reason: string | null;
  physician_flagged_at: string | null;
  created_at: string;
  residents: { first_name: string; last_name: string } | null;
};

export default function AwaitingOutcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notes, setNotes] = useState<FlaggedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: queryError } = await supabase
        .from('visit_notes')
        .select('id, resident_id, flag_reason, physician_flagged_at, created_at, residents(first_name, last_name)')
        .eq('physician_flagged', true)
        .is('flag_outcome', null)
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setNotes((data ?? []) as unknown as FlaggedNote[]);
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
        <Text style={styles.title}>Escalations awaiting outcome</Text>
      </View>
      {loading ? (
        <LoadingView message="Loading escalations" />
      ) : error ? (
        <ErrorView message="Could not load escalations" onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {notes.length === 0 && <EmptyView icon="check-circle" message="None awaiting an outcome" />}
          {notes.map(note => {
            const name = note.residents ? `${note.residents.first_name} ${note.residents.last_name}` : 'Client';
            return (
              <TouchableOpacity
                key={note.id}
                style={styles.card}
                onPress={() => navigation.navigate('ClientProfile', { clientId: note.resident_id, clientName: name })}
              >
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.meta}>
                  Raised with physician on{' '}
                  {new Date(note.physician_flagged_at ?? note.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {note.flag_reason ? <Text style={styles.reason}>{note.flag_reason}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  scrollContent: { padding: 20 },
  none: { fontSize: 16, color: '#94a3b8', fontStyle: 'italic' },
  card: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 16, marginBottom: 10 },
  name: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 15, color: '#64748b', marginTop: 4 },
  reason: { fontSize: 15, color: '#0f172a', marginTop: 6 },
});
