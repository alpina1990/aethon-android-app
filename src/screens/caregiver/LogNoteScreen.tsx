import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useShift } from '../../context/ShiftContext';

const MOODS = [
  { icon: 'smile', label: 'Good', color: '#10b981', bg: '#d1fae5', dbValue: 'good' },
  { icon: 'meh', label: 'Okay', color: '#f59e0b', bg: '#fef3c7', dbValue: 'okay' },
  { icon: 'frown', label: 'Poor', color: '#ef4444', bg: '#fee2e2', dbValue: 'poor' },
];

export default function LogNoteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { pinnedResidentIds } = useShift();
  
  const [residents, setResidents] = useState<any[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResidents();
  }, [pinnedResidentIds]);

  const fetchResidents = async () => {
    try {
      let query = supabase.from('residents').select('id, first_name, last_name, room_number').order('last_name', { ascending: true });
      if (pinnedResidentIds.length > 0) {
        query = query.in('id', pinnedResidentIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setResidents(data || []);
      if (data && data.length > 0) {
        setSelectedResidentId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading residents', err);
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleSave = async () => {
    if (!selectedResidentId) return Alert.alert('Error', 'Please select a resident.');
    
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('facility_id')
        .eq('id', userData.user?.id)
        .single();

      const { error } = await supabase.from('visit_notes').insert({
        resident_id: selectedResidentId,
        facility_id: profile?.facility_id,
        visit_type: 'Caregiver Log',
        tasks_completed: `[Mood: ${selectedMood.label}] - ${note}`
      });

      if (error) throw error;
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Failed to save note', err.message);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="x" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Visit Note</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Resident Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resident</Text>
          {loadingResidents ? (
            <ActivityIndicator />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
              {residents.map((r, index) => {
                const isSelected = selectedResidentId === r.id;
                return (
                  <TouchableOpacity 
                    key={r.id} 
                    style={[styles.pill, isSelected && styles.pillSelected, index === 0 && { marginLeft: 24 }, index === residents.length - 1 && { marginRight: 24 }]}
                    onPress={() => setSelectedResidentId(r.id)}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                      {r.first_name} {r.last_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Mood/Status Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 24 }]}>Overall Status</Text>
          <View style={[styles.moodContainer, { paddingHorizontal: 24 }]}>
            {MOODS.map(m => {
              const isSelected = selectedMood.label === m.label;
              return (
                <TouchableOpacity 
                  key={m.label}
                  style={[
                    styles.moodBtn,
                    { backgroundColor: m.bg },
                    isSelected && { borderWidth: 2, borderColor: m.color }
                  ]}
                  onPress={() => setSelectedMood(m)}
                >
                  <Feather name={m.icon as any} size={24} color={m.color} />
                  <Text style={[styles.moodText, { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Note Input */}
        <View style={[styles.section, { paddingHorizontal: 24, flex: 1 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Care Notes</Text>
            <View style={styles.micBadge}>
              <Feather name="mic" size={14} color="#7c3aed" />
              <Text style={styles.micText}>Tap mic on keyboard</Text>
            </View>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Document vital signs, administered meds, behavior..."
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            value={note}
            onChangeText={setNote}
          />
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity style={[styles.submitBtn, submitting && {opacity: 0.7}]} onPress={handleSave} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Save Note</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  scrollContent: { paddingVertical: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  pillContainer: { paddingRight: 24, gap: 8 },
  pill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  pillSelected: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  pillText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  pillTextSelected: { color: '#ffffff' },
  moodContainer: { flexDirection: 'row', gap: 12 },
  moodBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  moodText: { fontSize: 14, fontWeight: '700' },
  micBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  micText: { fontSize: 12, fontWeight: '600', color: '#7c3aed' },
  textInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, height: 160, fontSize: 16, color: '#0f172a' },
  footer: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed', paddingVertical: 16, borderRadius: 16, gap: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' }
});
