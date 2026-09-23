import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useShift } from '../../context/ShiftContext';

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', icon: 'info' },
  { id: 'medium', label: 'Medium', color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: 'alert-circle' },
  { id: 'high', label: 'High', color: '#dc2626', bg: '#fee2e2', border: '#fecaca', icon: 'alert-triangle' },
];

const REASONS = [
  'Medical Attention',
  'Behavioral Issue',
  'Fall / Injury',
  'Equipment Failure',
  'Family Request',
  'Other',
];

export default function EscalationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { pinnedResidentIds } = useShift();
  
  const [residents, setResidents] = useState<any[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState('high'); // Default to High for escalations
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
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
      console.error('Error loading residents for escalation', err);
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedResidentId) return Alert.alert('Error', 'Please select a resident.');
    
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('facility_id')
        .eq('id', userData.user?.id)
        .single();

      const { error } = await supabase.from('escalations').insert({
        resident_id: selectedResidentId,
        facility_id: profile?.facility_id,
        reason: `${selectedPriority.toUpperCase()} Priority: ${selectedReason}${details ? ' - ' + details : ''}`,
        is_resolved: false
      });

      if (error) throw error;
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Escalation Failed', err.message);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="x" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raise Escalation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 24 }]}>Priority Level</Text>
          <View style={[styles.priorityContainer, { paddingHorizontal: 24 }]}>
            {PRIORITIES.map(p => {
              const isSelected = selectedPriority === p.id;
              return (
                <TouchableOpacity 
                  key={p.id}
                  style={[
                    styles.priorityBtn,
                    { backgroundColor: p.bg, borderColor: isSelected ? p.color : p.border },
                    isSelected && { borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedPriority(p.id)}
                >
                  <Feather name={p.icon as any} size={18} color={p.color} />
                  <Text style={[styles.priorityText, { color: p.color }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
            {REASONS.map((r, index) => {
              const isSelected = selectedReason === r;
              return (
                <TouchableOpacity 
                  key={r} 
                  style={[styles.pill, isSelected && styles.pillSelected, index === 0 && { marginLeft: 24 }, index === REASONS.length - 1 && { marginRight: 24 }]}
                  onPress={() => setSelectedReason(r)}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.section, { paddingHorizontal: 24, flex: 1 }]}>
          <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Add specific details about the escalation..."
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            value={details}
            onChangeText={setDetails}
          />
        </View>

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity style={[styles.submitBtn, submitting && {opacity: 0.7}]} onPress={handleEscalate} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="alert-triangle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Trigger Escalation</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    paddingVertical: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  pillContainer: {
    paddingRight: 24,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  pillTextSelected: {
    color: '#ffffff',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 15,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    height: 120,
    fontSize: 16,
    color: '#0f172a',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
