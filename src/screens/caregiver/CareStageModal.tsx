import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'independent', label: 'Living independently' },
  { value: 'family_supported', label: 'Supported by family' },
  { value: 'professionally_supported', label: 'Professional care at home' },
  { value: 'residential', label: 'In a care facility' },
];

const WHEN_OPTIONS: { label: string; monthsAgo: number }[] = [
  { label: 'This month', monthsAgo: 0 },
  { label: 'Last month', monthsAgo: 1 },
  { label: 'Two to three months ago', monthsAgo: 2.5 },
  { label: 'Longer ago', monthsAgo: 6 },
];

export default function CareStageModal() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CareStageModal'>>();
  const { clientId, clientName, currentStage } = route.params;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedWhen, setSelectedWhen] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const estimatedSinceFor = (monthsAgo: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - Math.floor(monthsAgo));
    if (monthsAgo % 1 !== 0) {
      date.setDate(date.getDate() - 15);
    }
    return date;
  };

  const handleSave = async () => {
    if (!selectedStage || selectedWhen === null) return;
    setSaving(true);

    const observedAt = new Date();
    const estimatedSince = estimatedSinceFor(selectedWhen);
    const { data: userData } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from('residents')
      .update({
        care_stage: selectedStage,
        care_stage_observed_at: observedAt.toISOString(),
        care_stage_estimated_since: estimatedSince.toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      Alert.alert('Could not save', updateError.message);
      setSaving(false);
      return;
    }

    const { error: historyError } = await supabase.from('care_stage_history').insert({
      resident_id: clientId,
      from_stage: currentStage,
      to_stage: selectedStage,
      observed_at: observedAt.toISOString(),
      estimated_since: estimatedSince.toISOString(),
      changed_by: userData.user?.id,
      note: note || null,
    });

    setSaving(false);

    if (historyError) {
      Alert.alert('Could not save history', historyError.message);
      return;
    }

    navigation.navigate('ClientProfile', { clientId, clientName, careStageJustSaved: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Living situation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <>
            <Text style={styles.stepQuestion}>What is the situation now?</Text>
            {STAGE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.stageButton, selectedStage === opt.value && styles.selectedButton]}
                onPress={() => {
                  setSelectedStage(opt.value);
                  setStep(2);
                }}
              >
                <Text style={[styles.buttonText, selectedStage === opt.value && styles.selectedButtonText]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepQuestion}>Roughly when did this change?</Text>
            {WHEN_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.whenButton, selectedWhen === opt.monthsAgo && styles.selectedButton]}
                onPress={() => {
                  setSelectedWhen(opt.monthsAgo);
                  setStep(3);
                }}
              >
                <Text style={[styles.buttonText, selectedWhen === opt.monthsAgo && styles.selectedButtonText]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepQuestion}>What changed?</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Optional note"
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  scrollContent: { padding: 20, paddingBottom: 100 },
  stepQuestion: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 20 },

  stageButton: { width: '100%', height: 64, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  whenButton: { width: '100%', height: 56, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },

  selectedButton: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  selectedButtonText: { color: '#fff' },

  noteInput: { height: 56, fontSize: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, color: '#0f172a', marginBottom: 24 },

  saveButton: { backgroundColor: '#3b82f6', height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
