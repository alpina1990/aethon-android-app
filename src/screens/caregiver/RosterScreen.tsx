import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { SignOutButton } from '../../components/SignOutButton';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';
import { EmptyView } from '../../components/EmptyView';
import { useShift } from '../../context/ShiftContext';
import { getActiveShiftId, startShift } from '../../lib/shift';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Resident = {
  id: string;
  first_name: string;
  last_name: string;
  room_number: string | null;
  care_stage: string;
  lastNoteAt: string | null;
  lastNoteStatus: string | null;
  lastNoteReviewedAt: string | null;
};

function formatLastNote(createdAt: string | null, status: string | null, reviewedAt: string | null): string {
  if (!createdAt) return 'No notes yet';
  if (status === 'pending') return 'Transcribing';
  if (status === 'failed') return 'Transcription unavailable';
  if (status === 'complete' && !reviewedAt) return 'Needs checking';

  const noteDate = new Date(createdAt);
  const now = new Date();
  const time = noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(noteDate, now)) return `Last note: today ${time}`;
  if (isSameDay(noteDate, yesterday)) return `Last note: yesterday ${time}`;
  return `Last note: ${noteDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
}

export default function RosterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { togglePin, isPinned } = useShift();
  const [shiftActive, setShiftActive] = useState(false);

  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchResidents = useCallback(async () => {
    try {
      setError(false);
      const [residentsRes, notesRes] = await Promise.all([
        supabase
          .from('residents')
          .select('id, first_name, last_name, room_number, care_stage'),
        supabase
          .from('visit_notes')
          .select('resident_id, created_at, transcription_status, reviewed_at')
          .order('created_at', { ascending: false }),
      ]);

      if (residentsRes.error) throw residentsRes.error;
      if (notesRes.error) throw notesRes.error;

      const lastNoteByResident = new Map<
        string,
        { created_at: string; transcription_status: string | null; reviewed_at: string | null }
      >();
      for (const note of notesRes.data ?? []) {
        if (!lastNoteByResident.has(note.resident_id)) {
          lastNoteByResident.set(note.resident_id, note);
        }
      }

      const withNotes: Resident[] = (residentsRes.data ?? []).map(r => ({
        ...r,
        lastNoteAt: lastNoteByResident.get(r.id)?.created_at ?? null,
        lastNoteStatus: lastNoteByResident.get(r.id)?.transcription_status ?? null,
        lastNoteReviewedAt: lastNoteByResident.get(r.id)?.reviewed_at ?? null,
      }));

      withNotes.sort((a, b) => {
        if (!a.lastNoteAt && !b.lastNoteAt) return 0;
        if (!a.lastNoteAt) return 1;
        if (!b.lastNoteAt) return -1;
        return new Date(b.lastNoteAt).getTime() - new Date(a.lastNoteAt).getTime();
      });

      setResidents(withNotes);
    } catch (err) {
      console.error('Error fetching residents:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchResidents();
      getActiveShiftId().then(id => setShiftActive(!!id));
    }, [fetchResidents])
  );

  const handleShiftPress = async () => {
    if (shiftActive) {
      navigation.navigate('Handover');
      return;
    }
    const id = await startShift();
    if (id) setShiftActive(true);
    else Alert.alert('Could not start shift', 'Please check your connection and try again.');
  };

  const filteredResidents = residents.filter(r => {
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || (r.room_number?.toLowerCase().includes(query));
  });

  const pinnedResidents = filteredResidents.filter(r => isPinned(r.id));
  const unpinnedResidents = filteredResidents.filter(r => !isPinned(r.id));

  const renderResidentCard = (res: Resident) => (
    <TouchableOpacity
      key={res.id}
      style={styles.rosterCard}
      onPress={() =>
        navigation.navigate('ClientProfile', {
          clientId: res.id,
          clientName: `${res.first_name} ${res.last_name}`,
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {res.first_name[0]}{res.last_name[0]}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{res.first_name} {res.last_name}</Text>
        <View style={styles.detailsRow}>
          {res.lastNoteStatus === 'complete' && !res.lastNoteReviewedAt && (
            <View style={styles.amberDot} />
          )}
          <Text style={styles.details}>{formatLastNote(res.lastNoteAt, res.lastNoteStatus, res.lastNoteReviewedAt)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.pinButton}
        onPress={() => togglePin(res.id)}
      >
        <Feather
          name="star"
          size={22}
          color={isPinned(res.id) ? "#fbbf24" : "#cbd5e1"}
          style={isPinned(res.id) ? styles.starFilled : {}}
        />
      </TouchableOpacity>
      <Feather name="chevron-right" size={20} color="#94a3b8" style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Facility Roster</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.shiftButton} onPress={handleShiftPress}>
            <Text style={styles.shiftButtonText}>{shiftActive ? 'End shift' : 'Start shift'}</Text>
          </TouchableOpacity>
          <SignOutButton />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or room..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading && !refreshing ? (
        <LoadingView message="Loading clients" />
      ) : error ? (
        <ErrorView message="Could not load clients" onRetry={fetchResidents} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await fetchResidents();
                setRefreshing(false);
              }}
              tintColor="#7c3aed"
            />
          }
        >
          {filteredResidents.length === 0 ? (
            <EmptyView icon="users" message="No clients found" />
          ) : (
            <>
              {pinnedResidents.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>My Pinned Patients ({pinnedResidents.length})</Text>
                  {pinnedResidents.map(renderResidentCard)}
                  <View style={styles.divider} />
                </>
              )}

              <Text style={styles.sectionTitle}>All Residents ({unpinnedResidents.length})</Text>
              {unpinnedResidents.map(renderResidentCard)}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftButton: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  shiftButtonText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 24, paddingHorizontal: 16, height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0f172a' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },

  rosterCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, minHeight: 76, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  details: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  amberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
  pinButton: { padding: 8, marginRight: -8 },
  starFilled: { color: '#fbbf24' },

  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errorText: { fontSize: 17, color: '#64748b', marginBottom: 16 },
  retryButton: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  emptyText: { fontSize: 17, color: '#94a3b8', textAlign: 'center', marginTop: 40 },
});
