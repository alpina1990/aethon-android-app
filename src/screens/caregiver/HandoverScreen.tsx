import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';
import { EmptyView } from '../../components/EmptyView';

import { getActiveShiftId, clearActiveShift } from '../../lib/shift';
import { HANDOVER_FOOTER, buildHandoverHtml, buildHandoverText, groupNotesByClient, type HandoverData } from '../../lib/handover';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function HandoverScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData] = useState<HandoverData | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        const storedId = await getActiveShiftId();

        let start = new Date(Date.now() - TWELVE_HOURS);
        let foundShiftId: string | null = null;
        let carerName = '';
        if (storedId) {
          const { data: shift } = await supabase.from('shifts').select('id, carer_name, started_at').eq('id', storedId).single();
          if (shift) {
            start = new Date(shift.started_at);
            foundShiftId = shift.id;
            carerName = shift.carer_name ?? '';
          }
        }
        if (!carerName && user) {
          const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single();
          carerName = profile?.full_name ?? '';
        }

        const startIso = start.toISOString();
        const [notesRes, escalationsRes] = await Promise.all([
          supabase
            .from('visit_notes')
            .select('id, visit_type, transcript, created_at, residents(first_name, last_name)')
            .eq('carer_id', user?.id ?? '')
            .gte('created_at', startIso)
            .order('created_at', { ascending: true }),
          supabase
            .from('escalations')
            .select('reason, created_at, residents(first_name, last_name)')
            .eq('is_resolved', false)
            .gte('created_at', startIso)
            .order('created_at', { ascending: true }),
        ]);

        if (notesRes.error || escalationsRes.error) throw new Error('load failed');

        type NoteRow = { id: string; visit_type: string | null; transcript: string | null; created_at: string; residents: { first_name: string; last_name: string } | null };
        type EscRow = { reason: string; created_at: string; residents: { first_name: string; last_name: string } | null };
        const noteRows = ((notesRes.data ?? []) as unknown as NoteRow[]);
        const escRows = ((escalationsRes.data ?? []) as unknown as EscRow[]);
        const nameOf = (r: { first_name: string; last_name: string } | null) => (r ? `${r.first_name} ${r.last_name}` : 'Client');

        const notes = noteRows.map(n => ({
          id: n.id,
          clientName: nameOf(n.residents),
          visitType: n.visit_type,
          time: timeLabel(n.created_at),
          transcript: n.transcript ?? '(not transcribed)',
        }));
        const clients: HandoverData['clients'] = [];
        for (const n of notes) {
          if (!clients.some(c => c.name === n.clientName)) clients.push({ name: n.clientName, visitType: n.visitType, time: n.time });
        }

        setShiftId(foundShiftId);
        setData({
          carerName,
          dateLabel: start.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          startLabel: timeLabel(startIso),
          endLabel: timeLabel(new Date().toISOString()),
          clients,
          notes,
          escalations: escRows.map(e => ({ clientName: nameOf(e.residents), reason: e.reason, time: timeLabel(e.created_at) })),
        });
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

  const handleCopy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(buildHandoverText(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html: buildHandoverHtml(data) });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (e) {
      Alert.alert('Could not export PDF', e instanceof Error ? e.message : 'Please try "Copy as text" instead.');
    }
  };

  const handleClose = async () => {
    if (shiftId) {
      const { error } = await supabase.from('shifts').update({ ended_at: new Date().toISOString() }).eq('id', shiftId);
      if (error) {
        Alert.alert('Could not close shift', error.message);
        return;
      }
    }
    await clearActiveShift();
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Feather name="arrow-left" size={22} color="#0f172a" />
      </TouchableOpacity>

      {loading ? (
        <LoadingView message="Preparing handover" />
      ) : error || !data ? (
        <ErrorView message="Could not load the handover" onRetry={load} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Shift handover</Text>
            <Text style={styles.meta}>{data.carerName}</Text>
            <Text style={styles.meta}>{data.dateLabel}</Text>
            <Text style={styles.meta}>Shift {data.startLabel} - {data.endLabel}</Text>

            <View style={styles.strip}>
              {[
                { value: data.clients.length, label: 'clients seen' },
                { value: data.notes.length, label: 'notes recorded' },
                { value: data.escalations.length, label: 'escalations open' },
              ].map(box => (
                <View key={box.label} style={styles.box}>
                  <Text style={styles.boxValue}>{box.value}</Text>
                  <Text style={styles.boxLabel}>{box.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.section}>Clients seen</Text>
            {data.clients.length === 0 && <Text style={styles.none}>No clients seen</Text>}
            {data.clients.map(c => (
              <View key={c.name} style={styles.clientRow}>
                <Text style={styles.clientName}>{c.name}</Text>
                <Text style={styles.clientMeta}>{c.visitType ? `${c.visitType} · ` : ''}{c.time}</Text>
              </View>
            ))}

            <Text style={styles.section}>Notes</Text>
            {data.notes.length === 0 && <EmptyView icon="clipboard" message="No visits recorded this shift" />}
            {groupNotesByClient(data.notes).map(group => (
              <View key={group.clientName} style={styles.group}>
                <Text style={styles.clientName}>{group.clientName}</Text>
                {group.notes.map(note => (
                  <View key={note.id} style={styles.noteBlock}>
                    <Text style={styles.noteTime}>{note.time}</Text>
                    <Text style={styles.noteText} selectable>{note.transcript}</Text>
                  </View>
                ))}
              </View>
            ))}

            {data.escalations.length > 0 && (
              <>
                <Text style={styles.section}>Open escalations</Text>
                {data.escalations.map((e, index) => (
                  <View key={index} style={styles.escalationCard}>
                    <Text style={styles.clientName}>{e.clientName}</Text>
                    <Text style={styles.noteText}>{e.reason}</Text>
                    <Text style={styles.clientMeta}>{e.time}</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.footer}>{HANDOVER_FOOTER}</Text>
          </ScrollView>

          <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCopy}>
              <Text style={styles.secondaryText}>{copied ? 'Copied' : 'Copy as text'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleExport}>
              <Text style={styles.secondaryText}>Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
              <Text style={styles.primaryText}>Close shift</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 4, marginLeft: 20, marginTop: 16, alignSelf: 'flex-start' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#2563eb', marginBottom: 8 },
  meta: { fontSize: 16, color: '#0f172a', marginBottom: 2 },

  strip: { flexDirection: 'row', gap: 8, marginTop: 16 },
  box: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, alignItems: 'center' },
  boxValue: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  boxLabel: { fontSize: 15, color: '#94a3b8', marginTop: 2, textAlign: 'center' },

  section: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 24, marginBottom: 10 },
  none: { fontSize: 16, color: '#94a3b8', fontStyle: 'italic' },
  clientRow: { marginBottom: 10 },
  clientName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  clientMeta: { fontSize: 15, color: '#94a3b8', marginTop: 2 },
  group: { marginBottom: 14 },
  noteBlock: { marginTop: 8 },
  noteTime: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  noteText: { fontSize: 16, lineHeight: 24, color: '#0f172a' },
  escalationCard: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 14, marginBottom: 8 },

  footer: { fontSize: 15, color: '#94a3b8', fontStyle: 'italic', marginTop: 28 },

  controls: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  secondaryButton: { flex: 1, height: 52, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  primaryButton: { flex: 1, height: 52, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
