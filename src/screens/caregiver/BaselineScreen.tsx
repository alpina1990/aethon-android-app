import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const CONDITION_COUNTS = ['0', '1', '2', '3', '4', '5+'];
const MOBILITY_AIDS: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'stick', label: 'Walking stick' },
  { value: 'frame', label: 'Walking frame' },
  { value: 'wheelchair', label: 'Wheelchair' },
];

export default function BaselineScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Baseline'>>();
  const { clientId, clientName } = route.params;

  const [age, setAge] = useState('');
  const [livesAlone, setLivesAlone] = useState<boolean | null>(null);
  const [conditionCount, setConditionCount] = useState<number | null>(null);
  const [mobilityAid, setMobilityAid] = useState<string | null>(null);
  const [supportNote, setSupportNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = age.length > 0 && livesAlone !== null && conditionCount !== null && mobilityAid !== null;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase
      .from('residents')
      .update({
        baseline_age: parseInt(age, 10),
        baseline_lives_alone: livesAlone,
        baseline_condition_count: conditionCount,
        baseline_mobility_aid: mobilityAid,
        baseline_support_note: supportNote || null,
        baseline_recorded_at: new Date().toISOString(),
      })
      .eq('id', clientId);
    setSaving(false);

    if (error) {
      Alert.alert('Could not save baseline', error.message);
      return;
    }

    navigation.navigate('ClientProfile', { clientId, clientName, baselineJustSaved: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Independence baseline</Text>
      </View>
      <Text style={styles.subtitle}>{clientName}</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.ageInput}
          keyboardType="number-pad"
          value={age}
          onChangeText={setAge}
          placeholder="Age at enrolment"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Lives alone</Text>
        <View style={styles.row}>
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.liveAloneButton, livesAlone === opt.value && styles.selectedButton]}
              onPress={() => setLivesAlone(opt.value)}
            >
              <Text style={[styles.buttonText, livesAlone === opt.value && styles.selectedButtonText]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Long-term conditions</Text>
        <View style={styles.row}>
          {CONDITION_COUNTS.map((label, index) => (
            <TouchableOpacity
              key={label}
              style={[styles.conditionButton, conditionCount === index && styles.selectedButton]}
              onPress={() => setConditionCount(index)}
            >
              <Text style={[styles.buttonText, conditionCount === index && styles.selectedButtonText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mobility aid</Text>
        {MOBILITY_AIDS.map(aid => (
          <TouchableOpacity
            key={aid.value}
            style={[styles.mobilityButton, mobilityAid === aid.value && styles.selectedButton]}
            onPress={() => setMobilityAid(aid.value)}
          >
            <Text style={[styles.buttonText, mobilityAid === aid.value && styles.selectedButtonText]}>{aid.label}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Support already in place</Text>
        <TextInput
          style={styles.supportInput}
          multiline
          value={supportNote}
          onChangeText={setSupportNote}
          placeholder="Family visits twice a week"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', paddingHorizontal: 24, marginTop: 4, marginBottom: 8 },

  scrollContent: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10, marginTop: 20 },

  ageInput: { height: 56, fontSize: 20, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, color: '#0f172a' },

  row: { flexDirection: 'row', gap: 12 },

  liveAloneButton: { flex: 1, height: 56, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },

  conditionButton: { width: 48, height: 52, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },

  mobilityButton: { width: '100%', height: 52, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },

  selectedButton: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  selectedButtonText: { color: '#fff' },

  supportInput: { height: 80, fontSize: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingTop: 12, color: '#0f172a', textAlignVertical: 'top' },

  saveButton: { backgroundColor: '#3b82f6', height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
