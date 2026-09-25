import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, ScrollView, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';
import { Card } from '../../components/ui';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';
import type { Goal } from '../../lib/goals';
import type { EmergencyContact } from '../../lib/assistance';
import AssistanceModal from './AssistanceModal';
import { listenForReminderTaps, scheduleReminders, setupNotifications } from '../../lib/notifications';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const MIN_FONT = 22;
const MIN_TAP = 80;
const font = (size: number) => Math.max(size, MIN_FONT);

type Medication = { id: string; name: string; dose: string | null; scheduled_times: string[] | null };
type Ack = { medication_id: string; status: string; acked_at: string };
type Message = { id: string; sender_name: string | null; content: string; image_url: string | null; acknowledged_at: string | null };

const MOOD_FACES: React.ComponentProps<typeof MaterialCommunityIcons>['name'][] = [
  'emoticon-cry-outline',
  'emoticon-sad-outline',
  'emoticon-neutral-outline',
  'emoticon-happy-outline',
  'emoticon-excited-outline',
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Consecutive days, ending today (or yesterday if today is not yet complete),
// on which every active medication has an acknowledgement. Display only.
function medicationStreak(meds: Medication[], acks: Ack[]): number {
  if (meds.length === 0) return 0;
  const byDay = new Map<string, Set<string>>();
  for (const a of acks) {
    const key = dayKey(new Date(a.acked_at));
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key)!.add(a.medication_id);
  }
  const complete = (d: Date) => {
    const set = byDay.get(dayKey(d));
    return !!set && meds.every(m => set.has(m.id));
  };
  const cursor = new Date();
  if (!complete(cursor)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (complete(cursor)) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Resident-facing: text >= 22pt, controls >= 80pt, no swipe, no menu.
// Android back does nothing on this screen.
export default function ResidentHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [firstName, setFirstName] = useState('');
  const [residentId, setResidentId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [acks, setAcks] = useState<Ack[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [moodDone, setMoodDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [assistanceOpen, setAssistanceOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('no user');
      const { data: profile } = await supabase.from('user_profiles').select('full_name, resident_id').eq('id', userData.user.id).single();
      const rid = profile?.resident_id as string | undefined;
      if (!rid) throw new Error('no resident');

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [residentRes, medsRes, acksRes, messagesRes, moodRes] = await Promise.all([
        supabase.from('residents').select('first_name, independence_goals, emergency_contacts').eq('id', rid).single(),
        supabase.from('medications').select('id, name, dose, scheduled_times').eq('resident_id', rid).eq('active', true),
        supabase.from('medication_acks').select('medication_id, status, acked_at').eq('resident_id', rid).gte('acked_at', sixtyDaysAgo.toISOString()),
        supabase
          .from('messages')
          .select('id, sender_name, content, image_url, acknowledged_at')
          .eq('resident_id', rid)
          .is('acknowledged_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('health_logs')
          .select('id')
          .eq('resident_id', rid)
          .eq('logged_by', userData.user.id)
          .not('mood', 'is', null)
          .gte('created_at', startOfToday.toISOString())
          .limit(1),
      ]);

      if (residentRes.error || medsRes.error || acksRes.error || messagesRes.error) throw new Error('load failed');
      setUserId(userData.user.id);
      setResidentId(rid);
      setFirstName(residentRes.data?.first_name ?? profile?.full_name ?? '');
      setGoals((residentRes.data?.independence_goals ?? []) as Goal[]);
      setContacts((residentRes.data?.emergency_contacts ?? []) as EmergencyContact[]);
      setMeds((medsRes.data ?? []) as Medication[]);
      scheduleReminders((medsRes.data ?? []) as Medication[]);
      setAcks((acksRes.data ?? []) as Ack[]);
      setMessages((messagesRes.data ?? []) as Message[]);
      setMoodDone((moodRes.data ?? []).length > 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      load();
      return () => sub.remove();
    }, [load])
  );

  useEffect(() => {
    setupNotifications();
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    listenForReminderTaps(tap => navigation.navigate('Acknowledge', tap)).then(fn => {
      if (cancelled) fn();
      else unsubscribe = fn;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [navigation]);

  useEffect(() => {
    if (!residentId) return;
    const channel = supabase
      .channel(`resident-messages-${residentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `resident_id=eq.${residentId}` },
        payload => setMessages(prev => [payload.new as Message, ...prev])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [residentId]);

  const acknowledgeMessage = async (id: string) => {
    const at = new Date().toISOString();
    const { error } = await supabase.from('messages').update({ acknowledged_at: at }).eq('id', id);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, acknowledged_at: at } : m)));
  };

  const recordMood = async (mood: number) => {
    if (!residentId || !userId) return;
    const { error } = await supabase.from('health_logs').insert({ resident_id: residentId, logged_by: userId, mood });
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setMoodDone(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const today = new Date();
  const todayKey = dayKey(today);
  const ackedToday = new Set(acks.filter(a => dayKey(new Date(a.acked_at)) === todayKey).map(a => a.medication_id));
  const allDone = meds.length > 0 && meds.every(m => ackedToday.has(m.id));
  const streak = medicationStreak(meds, acks);

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingView message="Loading your day" large />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorView message="We could not load your day. Please try again." onRetry={load} large />
        <TouchableOpacity style={[styles.signOut, { margin: 16 }]} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.greeting}>{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
          <Text style={styles.date}>
            {today.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.cards}>
          <Card style={{ ...styles.card, borderLeftColor: Colors.primary }}>
            <Text style={styles.cardTitle}>Your medications today</Text>
            {streak > 0 && (
              <View style={styles.streakPill}>
                <Text style={styles.streakText}>{streak} {streak === 1 ? 'day' : 'days'} in a row</Text>
              </View>
            )}
            {meds.length === 0 && <Text style={styles.muted}>No medications listed</Text>}
            {meds.map(med => (
              <TouchableOpacity
                key={med.id}
                style={styles.medRow}
                onPress={() =>
                  navigation.navigate('Acknowledge', {
                    medicationId: med.id,
                    name: med.name,
                    dose: med.dose,
                    time: (med.scheduled_times ?? []).join(', '),
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{med.name}</Text>
                  {med.dose ? <Text style={styles.medDose}>{med.dose}</Text> : null}
                </View>
                <Text style={styles.medMark}>{ackedToday.has(med.id) ? '✓' : '○'}</Text>
              </TouchableOpacity>
            ))}
            {allDone && <Text style={styles.allDone}>All done today</Text>}
            <Text style={styles.reference}>Reference only. Not a medication administration record.</Text>
          </Card>

          <Card style={{ ...styles.card, borderLeftColor: Colors.primary }}>
            <Text style={styles.cardTitle}>Messages from your family</Text>
            {messages.length === 0 && <Text style={styles.muted}>No new messages</Text>}
            {messages.map(msg => {
              const seen = !!msg.acknowledged_at;
              return (
                <View key={msg.id} style={styles.message}>
                  <Text style={styles.sender}>{msg.sender_name ?? 'Family'}</Text>
                  <Text style={styles.body}>{msg.content}</Text>
                  {msg.image_url ? <Image source={{ uri: msg.image_url }} style={styles.messageImage} /> : null}
                  <TouchableOpacity
                    style={[styles.heart, seen && styles.heartDone]}
                    disabled={seen}
                    onPress={() => acknowledgeMessage(msg.id)}
                  >
                    <MaterialCommunityIcons name="heart" size={32} color={seen ? Colors.textMuted : Colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </Card>

          <Card style={{ ...styles.card, borderLeftColor: Colors.primary }}>
            <Text style={styles.cardTitle}>How are you today?</Text>
            {moodDone ? (
              <Text style={styles.thanks}>Thank you</Text>
            ) : (
              <View style={styles.faces}>
                {MOOD_FACES.map((icon, i) => (
                  <TouchableOpacity key={icon} style={styles.face} onPress={() => recordMood(i + 1)}>
                    <MaterialCommunityIcons name={icon} size={52} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {goals.length > 0 && (
            <Card style={{ ...styles.card, borderLeftColor: Colors.warning }}>
              <Text style={styles.cardTitle}>What matters to you</Text>
              {goals.map((g, i) => (
                <Text key={i} style={styles.goalText}>{g.text}</Text>
              ))}
            </Card>
          )}

          <TouchableOpacity style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.assist, { bottom: insets.bottom + 16 }]}
        onPress={() => setAssistanceOpen(true)}
      >
        <Feather name="phone" size={30} color="#fff" />
        <Text style={styles.assistText}>I need help</Text>
      </TouchableOpacity>

      <AssistanceModal visible={assistanceOpen} residentId={residentId} contacts={contacts} onClose={() => setAssistanceOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 24 },
  greeting: { fontSize: 36, fontWeight: '700', color: '#fff' },
  date: { fontSize: font(22), color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  cards: { padding: 16 },
  card: { borderLeftWidth: 5, padding: 18, marginBottom: 16, borderRadius: 14 },
  cardTitle: { fontSize: 24, fontWeight: '700', color: Colors.primaryDark, marginBottom: 12 },
  muted: { fontSize: font(20), color: Colors.textMuted },

  streakPill: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12 },
  streakText: { fontSize: font(18), color: Colors.primaryDark },
  medRow: { minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center' },
  medName: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  medDose: { fontSize: font(20), color: Colors.textMuted },
  medMark: { fontSize: 34, color: Colors.primary },
  allDone: { fontSize: font(22), color: Colors.primary, marginTop: 8 },
  reference: { fontSize: font(15), color: Colors.textMuted, fontStyle: 'italic', marginTop: 12 },

  message: { marginBottom: 16 },
  sender: { fontSize: font(22), fontWeight: '700', color: Colors.textPrimary },
  body: { fontSize: font(20), lineHeight: 28, color: Colors.textPrimary, marginTop: 4 },
  messageImage: { height: 180, borderRadius: 10, marginTop: 10, width: '100%' },
  heart: { width: MIN_TAP, height: MIN_TAP, borderRadius: 40, backgroundColor: Colors.dangerLight, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  heartDone: { backgroundColor: Colors.surfaceMuted },

  faces: { flexDirection: 'row', justifyContent: 'space-between' },
  face: { width: 76, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  thanks: { fontSize: font(22), color: Colors.primary },

  goalText: { fontSize: font(22), color: Colors.textPrimary, marginBottom: 6 },

  signOut: { height: MIN_TAP, borderRadius: 14, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontSize: font(22), fontWeight: '700', color: Colors.primary },

  assist: { position: 'absolute', left: 16, right: 16, height: MIN_TAP, backgroundColor: Colors.danger, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  assistText: { fontSize: 26, fontWeight: '700', color: '#fff' },
});
