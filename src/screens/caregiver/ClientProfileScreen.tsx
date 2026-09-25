import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';
import { EmptyView } from '../../components/EmptyView';
import { TASK_DEFS, type Tasks } from '../../lib/visitNoteFields';
import { TrendCard, type RecentLog, type WeightLog } from '../../components/TrendCard';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
  priority: number;
};

type Resident = {
  id: string;
  independence_goals: { text: string; family_visible: boolean }[] | null;
  first_name: string;
  last_name: string;
  room_number: string | null;
  care_stage: string | null;
  care_stage_observed_at: string | null;
  care_stage_estimated_since: string | null;
  date_of_birth: string | null;
  allergies: string[];
  physician_name: string | null;
  physician_email: string | null;
  emergency_contacts: EmergencyContact[];
  baseline_age: number | null;
  baseline_lives_alone: boolean | null;
  baseline_condition_count: number | null;
  baseline_mobility_aid: string | null;
  baseline_support_note: string | null;
  baseline_recorded_at: string | null;
};

const MOBILITY_AID_LABELS: Record<string, string> = {
  none: 'None',
  stick: 'Walking stick',
  frame: 'Walking frame',
  wheelchair: 'Wheelchair',
};

const CARE_STAGE_LABELS: Record<string, string> = {
  independent: 'Living independently',
  family_supported: 'Supported by family',
  professionally_supported: 'Professional care at home',
  residential: 'In a care facility',
};

type Medication = {
  id: string;
  name: string;
  dose: string | null;
  scheduled_times: string[];
  active: boolean;
};

type CareStageTransition = {
  id: string;
  from_stage: string | null;
  to_stage: string;
  observed_at: string;
  estimated_since: string;
  note: string | null;
};

type VisitNote = {
  id: string;
  visit_type: string | null;
  transcript: string | null;
  transcription_status: string | null;
  reviewed_at: string | null;
  tasks: Partial<Tasks> | null;
  physician_flagged: boolean;
  physician_flagged_at: string | null;
  flag_outcome: string | null;
  flag_outcome_at: string | null;
  created_at: string;
};

const OUTCOMES = [
  'Physician reviewed, change made',
  'Physician reviewed, no change',
  'Raised, no response yet',
  'Not raised in the end',
];

function shortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

type Tab = 'Profile' | 'Notes' | 'History';

export default function ClientProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ClientProfile'>>();
  const { clientId, clientName, baselineJustSaved, careStageJustSaved, escalationJustRecorded } = route.params;

  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [resident, setResident] = useState<Resident | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [careStageHistory, setCareStageHistory] = useState<CareStageTransition[]>([]);
  const [visitNotes, setVisitNotes] = useState<VisitNote[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [askAbout, setAskAbout] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showBaselineConfirmation, setShowBaselineConfirmation] = useState(!!baselineJustSaved);
  const [showEscalationConfirmation, setShowEscalationConfirmation] = useState(!!escalationJustRecorded);

  useEffect(() => {
    if (!escalationJustRecorded) return;
    navigation.setParams({ escalationJustRecorded: undefined });
    setTimeout(() => setShowEscalationConfirmation(true), 0);
    setTimeout(() => setShowEscalationConfirmation(false), 3000);
  }, [escalationJustRecorded, navigation]);

  useEffect(() => {
    if (!baselineJustSaved) return;
    navigation.setParams({ baselineJustSaved: undefined });
    const timer = setTimeout(() => setShowBaselineConfirmation(false), 2000);
    return () => clearTimeout(timer);
  }, [baselineJustSaved]);

  useEffect(() => {
    if (!careStageJustSaved) return;
    navigation.setParams({ careStageJustSaved: undefined });
  }, [careStageJustSaved]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const since = new Date();
        since.setDate(since.getDate() - 14);
        const [residentRes, medicationsRes, careStageHistoryRes, visitNotesRes, recentLogsRes, weightLogsRes, askRes] = await Promise.all([
          supabase
            .from('residents')
            .select('id, first_name, last_name, room_number, care_stage, care_stage_observed_at, care_stage_estimated_since, date_of_birth, allergies, physician_name, physician_email, emergency_contacts, independence_goals, baseline_age, baseline_lives_alone, baseline_condition_count, baseline_mobility_aid, baseline_support_note, baseline_recorded_at')
            .eq('id', clientId)
            .single(),
          supabase
            .from('medications')
            .select('id, name, dose, scheduled_times, active')
            .eq('resident_id', clientId)
            .eq('active', true),
          supabase
            .from('care_stage_history')
            .select('id, from_stage, to_stage, observed_at, estimated_since, note')
            .eq('resident_id', clientId)
            .order('observed_at', { ascending: false }),
          supabase
            .from('visit_notes')
            .select('id, visit_type, transcript, transcription_status, reviewed_at, tasks, physician_flagged, physician_flagged_at, flag_outcome, flag_outcome_at, created_at')
            .eq('resident_id', clientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('health_logs')
            .select('mood, pain, created_at')
            .eq('resident_id', clientId)
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: false }),
          supabase
            .from('health_logs')
            .select('weight_kg, created_at')
            .eq('resident_id', clientId)
            .not('weight_kg', 'is', null)
            .order('created_at', { ascending: false })
            .limit(12),
          supabase
            .from('visit_notes')
            .select('ask_about_hearing, ask_about_vision, ask_about_continence')
            .eq('resident_id', clientId)
            .gte('created_at', ninetyDaysAgo.toISOString())
            .or('ask_about_hearing.eq.true,ask_about_vision.eq.true,ask_about_continence.eq.true'),
        ]);
        if (residentRes.error || medicationsRes.error || careStageHistoryRes.error || visitNotesRes.error) {
          throw new Error('load failed');
        }
        if (!recentLogsRes.error && recentLogsRes.data) setRecentLogs(recentLogsRes.data);
        if (!weightLogsRes.error && weightLogsRes.data) setWeightLogs(weightLogsRes.data);
        if (!askRes.error && askRes.data) {
          const flagged: string[] = [];
          if (askRes.data.some(n => n.ask_about_hearing)) flagged.push('hearing');
          if (askRes.data.some(n => n.ask_about_vision)) flagged.push('vision');
          if (askRes.data.some(n => n.ask_about_continence)) flagged.push('continence');
          setAskAbout(flagged);
        }
        if (!residentRes.error && residentRes.data) setResident(residentRes.data);
        if (!medicationsRes.error && medicationsRes.data) setMedications(medicationsRes.data);
        if (!careStageHistoryRes.error && careStageHistoryRes.data) setCareStageHistory(careStageHistoryRes.data);
        if (!visitNotesRes.error && visitNotesRes.data) setVisitNotes(visitNotesRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const channel = supabase
      .channel(`visit_notes:${clientId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visit_notes', filter: `resident_id=eq.${clientId}` },
        payload => {
          const updated = payload.new as VisitNote;
          setVisitNotes(prev => prev.map(note => (note.id === updated.id ? updated : note)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const chooseOutcome = async (noteId: string, outcome: string) => {
    const at = new Date().toISOString();
    const { error } = await supabase
      .from('visit_notes')
      .update({ flag_outcome: outcome, flag_outcome_at: at })
      .eq('id', noteId);
    if (error) {
      Alert.alert('Could not save outcome', error.message);
      return;
    }
    setVisitNotes(prev => prev.map(n => (n.id === noteId ? { ...n, flag_outcome: outcome, flag_outcome_at: at } : n)));
  };

  const age = calculateAge(resident?.date_of_birth ?? null);
  const sortedContacts = [...(resident?.emergency_contacts ?? [])].sort((a, b) => a.priority - b.priority);
  const currentTransition = careStageHistory[0];
  const previousTransition = careStageHistory[1];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{clientName}</Text>
        <TouchableOpacity
          style={[styles.recordButton, styles.observeButton]}
          onPress={() => navigation.navigate('Observation', { clientId, clientName, mode: 'carer' })}
        >
          <Feather name="activity" size={18} color="#2563eb" />
          <Text style={[styles.recordButtonText, { color: '#2563eb' }]}>Observe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={() => navigation.navigate('VoiceNote', { clientId, clientName })}
        >
          <Feather name="mic" size={18} color="#fff" />
          <Text style={styles.recordButtonText}>Record note</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {(['Profile', 'Notes', 'History'] as Tab[]).map(tab => (
          <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingView message="Loading profile" />
      ) : error ? (
        <ErrorView message="Could not load this profile" onRetry={load} />
      ) : activeTab === 'Notes' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {visitNotes.length === 0 ? (
            <EmptyView icon="file-text" message="No notes recorded yet" />
          ) : (
            visitNotes.map(note => {
              const needsChecking = note.transcription_status === 'complete' && !note.reviewed_at;
              return (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.card, { borderLeftColor: '#3b82f6' }]}
                  disabled={!needsChecking}
                  onPress={() => navigation.navigate('NoteReview', { noteId: note.id })}
                >
                  <View style={styles.noteHeaderRow}>
                    <Text style={styles.identitySub}>
                      {new Date(note.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                    {needsChecking && (
                      <View style={styles.needsCheckingRow}>
                        <View style={styles.amberDot} />
                        <Text style={styles.needsCheckingText}>Needs checking</Text>
                      </View>
                    )}
                  </View>
                  {note.physician_flagged && !note.flag_outcome && (
                    <View style={styles.outcomeBar}>
                      <Text style={styles.outcomeRaised}>
                        Raised with physician on {shortDate(note.physician_flagged_at ?? note.created_at)}
                      </Text>
                      <Text style={styles.outcomeQuestion}>What happened?</Text>
                      {OUTCOMES.map(label => (
                        <TouchableOpacity key={label} style={styles.outcomeButton} onPress={() => chooseOutcome(note.id, label)}>
                          <Text style={styles.outcomeButtonText}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {note.physician_flagged && note.flag_outcome && (
                    <Text style={styles.outcomeSummary}>
                      {note.flag_outcome} - {shortDate(note.flag_outcome_at ?? note.created_at)}
                    </Text>
                  )}
                  {note.transcription_status === 'pending' ? (
                    <View style={styles.pendingRow}>
                      <ActivityIndicator size="small" color="#94a3b8" />
                      <Text style={styles.pendingText}>Transcribing</Text>
                    </View>
                  ) : note.transcription_status === 'failed' ? (
                    <TouchableOpacity onPress={() => navigation.navigate('ManualNoteEdit', { noteId: note.id })}>
                      <Text style={styles.failedText}>Transcription unavailable. Tap to type the note.</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <Text style={styles.noteTranscript}>{note.transcript}</Text>
                      {note.visit_type && (
                        <View style={styles.visitTypeBadge}>
                          <Text style={styles.visitTypeBadgeText}>{note.visit_type}</Text>
                        </View>
                      )}
                      {note.tasks && Object.values(note.tasks).some(Boolean) && (
                        <Text style={styles.taskSummary}>
                          {TASK_DEFS.filter(t => note.tasks?.[t.key]).map(t => t.label).join(' · ')}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : activeTab === 'History' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.cardHeading}>Transitions</Text>
          {careStageHistory.length === 0 ? (
            <Text style={styles.noneRecorded}>No transitions recorded</Text>
          ) : (
            careStageHistory.map(transition => (
              <View key={transition.id} style={[styles.card, { borderLeftColor: '#94a3b8' }]}>
                <Text style={styles.transitionLabel}>
                  {transition.from_stage ? CARE_STAGE_LABELS[transition.from_stage] ?? transition.from_stage : 'Enrolled'}
                  {' → '}
                  {CARE_STAGE_LABELS[transition.to_stage] ?? transition.to_stage}
                </Text>
                <Text style={styles.identitySub}>Since {formatMonthYear(transition.estimated_since)}</Text>
                {transition.estimated_since !== transition.observed_at && (
                  <Text style={styles.baselineDate}>Recorded {new Date(transition.observed_at).toLocaleDateString()}</Text>
                )}
                {transition.note && <Text style={styles.identitySub}>{transition.note}</Text>}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {showEscalationConfirmation && (
            <View style={styles.confirmationBanner}>
              <Text style={styles.confirmationText}>Escalation recorded</Text>
            </View>
          )}

          {showBaselineConfirmation && (
            <View style={styles.confirmationBanner}>
              <Text style={styles.confirmationText}>Baseline saved</Text>
            </View>
          )}

          {/* Identity */}
          <View style={[styles.card, { borderLeftColor: '#3b82f6' }]}>
            {!resident?.baseline_recorded_at && (
              <TouchableOpacity onPress={() => navigation.navigate('Baseline', { clientId, clientName })}>
                <Text style={styles.baselinePrompt}>Baseline not yet recorded</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.identityName}>{resident?.first_name} {resident?.last_name}</Text>
            {resident?.date_of_birth && (
              <Text style={styles.identitySub}>
                {new Date(resident.date_of_birth).toLocaleDateString()} · Age {age}
              </Text>
            )}
            {resident?.room_number && (
              <Text style={styles.identitySub}>Room {resident.room_number}</Text>
            )}
          </View>

          {/* Care stage */}
          <View style={[styles.card, { borderLeftColor: '#3b82f6' }]}>
            <View style={styles.careStageHeaderRow}>
              <Text style={styles.cardHeading}>Living situation</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('CareStageModal', {
                    clientId,
                    clientName,
                    currentStage: resident?.care_stage ?? null,
                  })
                }
              >
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
            {resident?.care_stage ? (
              <>
                <View style={styles.careStagePill}>
                  <Text style={styles.careStagePillText}>
                    {CARE_STAGE_LABELS[resident.care_stage] ?? resident.care_stage}
                  </Text>
                </View>
                {resident.care_stage_estimated_since && (
                  <Text style={styles.identitySub}>Since {formatMonthYear(resident.care_stage_estimated_since)}</Text>
                )}
                {previousTransition && currentTransition && (
                  <Text style={styles.identitySub}>
                    Previously {CARE_STAGE_LABELS[previousTransition.to_stage] ?? previousTransition.to_stage} until{' '}
                    {new Date(currentTransition.observed_at).toLocaleDateString()}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.noneRecorded}>Not yet recorded</Text>
            )}
          </View>

          {/* Independence goals - the resident's own words, read-only */}
          {resident?.independence_goals && resident.independence_goals.length > 0 && (
            <View style={[styles.card, { borderLeftColor: '#f59e0b' }]}>
              <Text style={styles.cardHeading}>In their own words</Text>
              {resident.independence_goals.map((g, i) => (
                <Text key={i} style={styles.goalLine}>{g.text}</Text>
              ))}
            </View>
          )}

          {/* Allergies */}
          <View style={[styles.card, { borderLeftColor: '#ef4444' }]}>
            <Text style={[styles.cardHeading, { color: '#ef4444' }]}>Allergies</Text>
            {resident?.allergies && resident.allergies.length > 0 ? (
              <View style={styles.chipRow}>
                {resident.allergies.map(allergy => (
                  <View key={allergy} style={styles.allergyChip}>
                    <Text style={styles.allergyChipText}>{allergy}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noneRecorded}>None recorded</Text>
            )}
          </View>

          {/* Medications */}
          <View style={[styles.card, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.cardHeading}>Medications ({medications.length})</Text>
            {medications.map(med => (
              <View key={med.id} style={styles.medicationRow}>
                <Text style={styles.medicationName}>{med.name}</Text>
                {med.dose && <Text style={styles.medicationDose}>{med.dose}</Text>}
                <View style={styles.chipRow}>
                  {med.scheduled_times.map(time => (
                    <View key={time} style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{time}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.referenceNote}>Reference only. Not a medication administration record.</Text>
          </View>

          {/* Physician */}
          <View style={[styles.card, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.cardHeading}>Physician</Text>
            {resident?.physician_name ? (
              <>
                <Text style={styles.physicianName}>{resident.physician_name}</Text>
                {resident.physician_email && (
                  <Text style={styles.physicianEmail}>{resident.physician_email}</Text>
                )}
              </>
            ) : (
              <Text style={styles.noneRecorded}>None recorded</Text>
            )}
            <TouchableOpacity
              style={styles.raiseButton}
              onPress={() =>
                navigation.navigate('PhysicianEscalation', {
                  clientId,
                  clientName,
                  physicianName: resident?.physician_name ?? null,
                  physicianEmail: resident?.physician_email ?? null,
                })
              }
            >
              <Text style={styles.raiseButtonText}>Raise with physician</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency contacts */}
          <View style={[styles.card, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.cardHeading}>Contacts</Text>
            {sortedContacts.length > 0 ? (
              sortedContacts.map(contact => (
                <View key={`${contact.name}-${contact.priority}`} style={styles.contactRow}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactDetail}>{contact.relationship} · {contact.phone}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noneRecorded}>None recorded</Text>
            )}
          </View>

          <TrendCard recent={recentLogs} weights={weightLogs} askAbout={askAbout} />

          {/* Baseline at enrolment */}
          {resident?.baseline_recorded_at && (
            <View style={[styles.card, { borderLeftColor: '#94a3b8' }]}>
              <Text style={styles.cardHeading}>Baseline at enrolment</Text>
              <View style={styles.baselineRow}>
                <Text style={styles.baselineLabel}>Age</Text>
                <Text style={styles.baselineValue}>{resident.baseline_age}</Text>
              </View>
              <View style={styles.baselineRow}>
                <Text style={styles.baselineLabel}>Lives alone</Text>
                <Text style={styles.baselineValue}>{resident.baseline_lives_alone ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.baselineRow}>
                <Text style={styles.baselineLabel}>Long-term conditions</Text>
                <Text style={styles.baselineValue}>{resident.baseline_condition_count}</Text>
              </View>
              <View style={styles.baselineRow}>
                <Text style={styles.baselineLabel}>Mobility aid</Text>
                <Text style={styles.baselineValue}>
                  {resident.baseline_mobility_aid ? MOBILITY_AID_LABELS[resident.baseline_mobility_aid] : '—'}
                </Text>
              </View>
              <View style={styles.baselineRow}>
                <Text style={styles.baselineLabel}>Support in place</Text>
                <Text style={styles.baselineValue}>{resident.baseline_support_note || '—'}</Text>
              </View>
              <Text style={styles.baselineDate}>
                Recorded {new Date(resident.baseline_recorded_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  goalLine: { fontSize: 16, color: '#0f172a', marginBottom: 4 },
  outcomeBar: { marginBottom: 10 },
  outcomeRaised: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  outcomeQuestion: { fontSize: 15, color: '#475569', marginTop: 6, marginBottom: 6 },
  outcomeButton: { height: 52, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 12, marginBottom: 6 },
  outcomeButtonText: { fontSize: 15, color: '#0f172a' },
  outcomeSummary: { fontSize: 15, color: '#475569', marginBottom: 8 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', flexShrink: 1, flex: 1 },
  recordButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', borderRadius: 20, paddingHorizontal: 14, height: 52, gap: 6 },
  raiseButton: { marginTop: 14, height: 52, borderRadius: 10, borderWidth: 1.5, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  raiseButtonText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  observeButton: { backgroundColor: '#eff6ff', marginRight: 8 },
  recordButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  tabBar: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabItem: { marginRight: 24, paddingBottom: 10 },
  tabLabel: { fontSize: 15, fontWeight: '600', color: '#94a3b8' },
  tabLabelActive: { color: '#0f172a' },
  tabUnderline: { height: 2, backgroundColor: '#3b82f6', marginTop: 8, borderRadius: 1 },

  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 16, color: '#94a3b8' },

  scrollContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginBottom: 12, borderLeftWidth: 4 },
  cardHeading: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10 },

  identityName: { fontSize: 24, fontWeight: '700', color: '#2563eb', marginBottom: 6 },
  identitySub: { fontSize: 16, color: '#475569', marginBottom: 2 },
  baselinePrompt: { fontSize: 15, color: '#f59e0b', fontWeight: '600', marginBottom: 10 },

  confirmationBanner: { backgroundColor: '#d1fae5', borderRadius: 10, padding: 12, marginBottom: 12, alignItems: 'center' },
  confirmationText: { color: '#10b981', fontWeight: '700', fontSize: 15 },

  baselineRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  baselineLabel: { fontSize: 15, color: '#64748b' },
  baselineValue: { fontSize: 15, color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  baselineDate: { fontSize: 15, color: '#94a3b8', marginTop: 8 },

  careStageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeLink: { fontSize: 15, color: '#3b82f6', fontWeight: '600' },
  careStagePill: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6 },
  careStagePillText: { fontSize: 18, color: '#2563eb', fontWeight: '600' },
  transitionLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },

  noteHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  needsCheckingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amberDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  needsCheckingText: { fontSize: 15, color: '#f59e0b', fontWeight: '700' },

  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pendingText: { fontSize: 15, color: '#94a3b8', fontStyle: 'italic' },
  failedText: { fontSize: 15, color: '#f59e0b', fontWeight: '600', marginTop: 6 },
  noteTranscript: { fontSize: 16, color: '#0f172a', marginTop: 6, lineHeight: 22 },
  visitTypeBadge: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  visitTypeBadgeText: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  taskSummary: { fontSize: 15, color: '#64748b', marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyChip: { backgroundColor: '#fee2e2', borderRadius: 16, paddingHorizontal: 12, height: 32, alignItems: 'center', justifyContent: 'center' },
  allergyChipText: { color: '#ef4444', fontSize: 15 },
  noneRecorded: { fontSize: 16, color: '#94a3b8', fontStyle: 'italic' },

  medicationRow: { marginBottom: 12 },
  medicationName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  medicationDose: { fontSize: 16, color: '#475569', marginTop: 2, marginBottom: 6 },
  timeChip: { backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 10, height: 26, alignItems: 'center', justifyContent: 'center' },
  timeChipText: { color: '#64748b', fontSize: 15 },
  referenceNote: { fontSize: 15, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },

  physicianName: { fontSize: 17, color: '#0f172a' },
  physicianEmail: { fontSize: 16, color: '#3b82f6', marginTop: 2 },

  contactRow: { marginBottom: 10 },
  contactName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  contactDetail: { fontSize: 16, color: '#475569', marginTop: 2 },
});
