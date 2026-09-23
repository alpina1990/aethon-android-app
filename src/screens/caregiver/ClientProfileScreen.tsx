import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
  priority: number;
};

type Resident = {
  id: string;
  first_name: string;
  last_name: string;
  room_number: string | null;
  care_stage: string | null;
  date_of_birth: string | null;
  allergies: string[];
  physician_name: string | null;
  physician_email: string | null;
  emergency_contacts: EmergencyContact[];
};

type Medication = {
  id: string;
  name: string;
  dose: string | null;
  scheduled_times: string[];
  active: boolean;
};

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
  const { clientId, clientName } = route.params;

  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [resident, setResident] = useState<Resident | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const [residentRes, medicationsRes] = await Promise.all([
          supabase
            .from('residents')
            .select('id, first_name, last_name, room_number, care_stage, date_of_birth, allergies, physician_name, physician_email, emergency_contacts')
            .eq('id', clientId)
            .single(),
          supabase
            .from('medications')
            .select('id, name, dose, scheduled_times, active')
            .eq('resident_id', clientId)
            .eq('active', true),
        ]);
        if (!cancelled) {
          if (!residentRes.error && residentRes.data) setResident(residentRes.data);
          if (!medicationsRes.error && medicationsRes.data) setMedications(medicationsRes.data);
          setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [clientId])
  );

  const age = calculateAge(resident?.date_of_birth ?? null);
  const sortedContacts = [...(resident?.emergency_contacts ?? [])].sort((a, b) => a.priority - b.priority);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{clientName}</Text>
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
        <ActivityIndicator style={{ marginTop: 40 }} color="#0f172a" />
      ) : activeTab !== 'Profile' ? (
        <View style={styles.centeredState}>
          <Text style={styles.placeholderText}>{activeTab} coming soon</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Identity */}
          <View style={[styles.card, { borderLeftColor: '#3b82f6' }]}>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', flexShrink: 1 },

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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyChip: { backgroundColor: '#fee2e2', borderRadius: 16, paddingHorizontal: 12, height: 32, alignItems: 'center', justifyContent: 'center' },
  allergyChipText: { color: '#ef4444', fontSize: 15 },
  noneRecorded: { fontSize: 16, color: '#94a3b8', fontStyle: 'italic' },

  medicationRow: { marginBottom: 12 },
  medicationName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  medicationDose: { fontSize: 16, color: '#475569', marginTop: 2, marginBottom: 6 },
  timeChip: { backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 10, height: 26, alignItems: 'center', justifyContent: 'center' },
  timeChipText: { color: '#64748b', fontSize: 12 },
  referenceNote: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },

  physicianName: { fontSize: 17, color: '#0f172a' },
  physicianEmail: { fontSize: 16, color: '#3b82f6', marginTop: 2 },

  contactRow: { marginBottom: 10 },
  contactName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  contactDetail: { fontSize: 16, color: '#475569', marginTop: 2 },
});
