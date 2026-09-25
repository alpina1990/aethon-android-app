import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';

import { levenshteinDistance } from '../../lib/text';
import { VISIT_TYPES, TASK_DEFS, EMPTY_TASKS, type Tasks } from '../../lib/visitNoteFields';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const ASK_DEFS: { key: 'hearing' | 'vision' | 'continence'; label: string }[] = [
  { key: 'hearing', label: 'Ask about hearing' },
  { key: 'vision', label: 'Ask about vision' },
  { key: 'continence', label: 'Ask about continence' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NoteWithResident = {
  id: string;
  transcript: string | null;
  raw_transcript: string | null;
  visit_type: string | null;
  tasks: Partial<Tasks> | null;
  ask_about_hearing: boolean;
  ask_about_vision: boolean;
  ask_about_continence: boolean;
  created_at: string;
  residents: { first_name: string; last_name: string } | null;
};

export default function NoteReviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NoteReview'>>();
  const { noteId } = route.params;

  const [note, setNote] = useState<NoteWithResident | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [detailExpanded, setDetailExpanded] = useState(false);
  const [visitType, setVisitType] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Tasks>(EMPTY_TASKS);
  const [askAbout, setAskAbout] = useState({ hearing: false, vision: false, continence: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
        const { data, error } = await supabase
          .from('visit_notes')
          .select('id, transcript, raw_transcript, visit_type, tasks, ask_about_hearing, ask_about_vision, ask_about_continence, created_at, residents(first_name, last_name)')
          .eq('id', noteId)
          .single();
        if (error || !data) throw error ?? new Error('missing');
        const typed = data as unknown as NoteWithResident;
        setNote(typed);
        setText(typed.transcript ?? '');
        setVisitType(VISIT_TYPES.includes(typed.visit_type ?? '') ? typed.visit_type : null);
        setTasks({ ...EMPTY_TASKS, ...(typed.tasks ?? {}) });
        setAskAbout({
          hearing: typed.ask_about_hearing,
          vision: typed.ask_about_vision,
          continence: typed.ask_about_continence,
        });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleDetailExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDetailExpanded(prev => !prev);
  };

  const selectVisitType = (type: string) => {
    setVisitType(prev => (prev === type ? null : type));
  };

  const toggleTask = (key: keyof Tasks) => {
    setTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = async () => {
    if (!note) return;
    setSaving(true);

    const rawTranscript = note.raw_transcript ?? '';
    const distance = levenshteinDistance(rawTranscript, text);

    const { error } = await supabase
      .from('visit_notes')
      .update({
        transcript: text,
        was_edited: distance > 0,
        raw_length: rawTranscript.length,
        edit_distance: distance,
        reviewed_at: new Date().toISOString(),
        tasks,
        ask_about_hearing: askAbout.hearing,
        ask_about_vision: askAbout.vision,
        ask_about_continence: askAbout.continence,
        ...(visitType ? { visit_type: visitType } : {}),
      })
      .eq('id', noteId);

    setSaving(false);

    if (error) {
      Alert.alert('Could not confirm note', error.message);
      return;
    }
    navigation.goBack();
  };

  const clientName = note?.residents ? `${note.residents.first_name} ${note.residents.last_name}` : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{clientName}</Text>
          {note && (
            <Text style={styles.headerTime}>
              {new Date(note.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <LoadingView message="Loading note" />
      ) : error || !note ? (
        <ErrorView message="Could not load this note" onRetry={load} />
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>Check and correct if needed</Text>
            <TextInput
              style={styles.input}
              multiline
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.detailToggle} onPress={toggleDetailExpanded}>
              <Text style={styles.detailToggleText}>Add detail (optional)</Text>
              <Feather name={detailExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
            </TouchableOpacity>

            {detailExpanded && (
              <View style={styles.detailSection}>
                <View style={styles.visitTypeGrid}>
                  {VISIT_TYPES.map(type => {
                    const selected = visitType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.visitTypeButton, selected && styles.visitTypeButtonSelected]}
                        onPress={() => selectVisitType(type)}
                      >
                        <Text style={[styles.visitTypeText, selected && styles.visitTypeTextSelected]}>{type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.taskList}>
                  {TASK_DEFS.map(task => {
                    const checked = tasks[task.key];
                    return (
                      <TouchableOpacity
                        key={task.key}
                        style={styles.taskRow}
                        onPress={() => toggleTask(task.key)}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <Feather name="check" size={16} color="#fff" />}
                        </View>
                        <Text style={styles.taskLabel}>{task.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.askHeading}>Worth asking about next visit</Text>
                <Text style={styles.askCaption}>
                  Not an assessment. These are common, usually treatable, and rarely raised by the person themselves.
                </Text>
                <View style={styles.taskList}>
                  {ASK_DEFS.map(item => {
                    const checked = askAbout[item.key];
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={styles.taskRow}
                        onPress={() => setAskAbout(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <Feather name="check" size={16} color="#fff" />}
                        </View>
                        <Text style={styles.taskLabel}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={saving}
          >
            <Text style={styles.confirmButtonText}>{saving ? 'Confirming...' : 'Confirm note'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerTime: { fontSize: 15, color: '#64748b', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  hint: { fontSize: 15, color: '#94a3b8', paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  input: { minHeight: 180, fontSize: 17, lineHeight: 26, backgroundColor: '#fff', padding: 16, color: '#0f172a' },

  detailToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  detailToggleText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },

  detailSection: { paddingHorizontal: 16 },
  visitTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 12 },
  visitTypeButton: { width: '50%', height: 64, margin: 4, maxWidth: '48%', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  visitTypeButtonSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  visitTypeText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  visitTypeTextSelected: { color: '#fff' },

  taskList: { marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 4, paddingHorizontal: 12, gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  askHeading: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  askCaption: { fontSize: 15, color: '#94a3b8', marginTop: 4, marginBottom: 12 },
  taskLabel: { fontSize: 16, color: '#0f172a' },

  confirmButton: { backgroundColor: '#3b82f6', height: 56, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
