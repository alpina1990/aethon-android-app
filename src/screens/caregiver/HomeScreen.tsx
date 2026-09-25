import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { SignOutButton } from '../../components/SignOutButton';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';
import { useShift } from '../../context/ShiftContext';
import type { Resident, Escalation } from '../../types/database';

function Badge({ label, variant }: { label: string; variant: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    medium: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    low: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  };
  const color = colors[variant] || colors.low;
  return (
    <View style={[{ backgroundColor: color.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.dot }} />
      <Text style={{ color: color.text, fontSize: 15, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

export default function CaregiverHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { pinnedResidentIds } = useShift();
  
  const [profile, setProfile] = useState<any>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [notesToCheckCount, setNotesToCheckCount] = useState(0);
  const [awaitingOutcomeCount, setAwaitingOutcomeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('user_profiles').select('full_name, nurse_id').eq('id', user.id).single();
        if (profileData) setProfile(profileData);
      }

      // 2. Fetch Residents
      let residentsQuery = supabase.from('residents').select('*');
      if (pinnedResidentIds.length > 0) residentsQuery = residentsQuery.in('id', pinnedResidentIds);
      else residentsQuery = residentsQuery.limit(3);

      // 3. Fetch Escalations
      let escalationsQuery = supabase.from('escalations').select('*, residents(first_name, last_name, room_number)').eq('is_resolved', false);
      if (pinnedResidentIds.length > 0) escalationsQuery = escalationsQuery.in('resident_id', pinnedResidentIds);
      else escalationsQuery = escalationsQuery.limit(3);

      // 4. Count notes needing review
      const notesToCheckQuery = supabase
        .from('visit_notes')
        .select('id', { count: 'exact', head: true })
        .eq('transcription_status', 'complete')
        .is('reviewed_at', null);

      const awaitingQuery = supabase
        .from('visit_notes')
        .select('id', { count: 'exact', head: true })
        .eq('physician_flagged', true)
        .is('flag_outcome', null);

      const [residentsRes, escalationsRes, notesToCheckRes, awaitingRes] = await Promise.all([
        residentsQuery,
        escalationsQuery,
        notesToCheckQuery,
        awaitingQuery,
      ]);

      if (residentsRes.error || escalationsRes.error) throw new Error('load failed');
      setError(false);
      if (residentsRes.data) setResidents(residentsRes.data as Resident[]);
      if (escalationsRes.data) setEscalations(escalationsRes.data as Escalation[]);
      setNotesToCheckCount(notesToCheckRes.count ?? 0);
      setAwaitingOutcomeCount(awaitingRes.count ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [pinnedResidentIds]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleResolve = async (id: string) => {
    // Optimistic UI update
    setEscalations(prev => prev.filter(e => e.id !== id));
    
    // Save to real database
    await supabase.from('escalations').update({ is_resolved: true }).eq('id', id);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingView message="Loading your shift" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorView
          message="Could not load your shift"
          onRetry={() => {
            setLoading(true);
            fetchData();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => {
              setRefreshing(true);
              await fetchData();
              setRefreshing(false);
            }}
            tintColor="#7c3aed"
          />
        }
      >
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</Text>
            <Text style={styles.greetingText}>{profile?.full_name ? `${profile.full_name.split(' ')[0]}'s Shift` : 'My Shift'}</Text>
            <Text style={styles.subtitle}>{residents.length} residents assigned • {escalations.length} alerts</Text>
            {awaitingOutcomeCount > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('AwaitingOutcome')}>
                <Text style={styles.awaitingText}>{awaitingOutcomeCount} escalations awaiting outcome</Text>
              </TouchableOpacity>
            )}
            {notesToCheckCount > 0 && (
              <TouchableOpacity style={styles.notesToCheckPill} onPress={() => navigation.navigate('UnreviewedNotes')}>
                <View style={styles.amberDot} />
                <Text style={styles.notesToCheckText}>
                  {notesToCheckCount} {notesToCheckCount === 1 ? 'note' : 'notes'} to check
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.profileButton}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=32' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
            <SignOutButton />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
            onPress={() => navigation.navigate('ScanQR')}
          >
            <Feather name="maximize" size={20} color="#2563eb" />
            <Text style={[styles.actionBtnText, { color: '#1d4ed8' }]}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}
            onPress={() => navigation.navigate('LogNote')}
          >
            <Feather name="file-text" size={20} color="#7c3aed" />
            <Text style={[styles.actionBtnText, { color: '#6d28d9' }]}>Log Note</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
            onPress={() => navigation.navigate('Escalation')}
          >
            <Feather name="alert-triangle" size={20} color="#dc2626" />
            <Text style={[styles.actionBtnText, { color: '#b91c1c' }]}>Escalate</Text>
          </TouchableOpacity>
        </View>

        {/* Open Escalations */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open Escalations</Text>
            {escalations.length > 0 && (
              <Text style={styles.badgeCount}>{escalations.length}</Text>
            )}
          </View>
          
          {escalations.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <Feather name="check-circle" size={32} color="#10b981" style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a' }}>All caught up!</Text>
              <Text style={{ fontSize: 15, color: '#64748b', marginTop: 4 }}>No open escalations.</Text>
            </View>
          ) : (
            escalations.map(esc => {
              const residentName = esc.residents ? `${esc.residents.first_name} ${esc.residents.last_name}` : 'Unknown';
              // Default to high priority for now, could be dynamic based on reason
              const priority = 'high';
              
              return (
                <View key={esc.id} style={styles.escalationCard}>
                  <View style={styles.escHeader}>
                    <View style={styles.escResidentInfo}>
                      <Text style={styles.escResidentName}>{residentName}</Text>
                      {/* Note: we'd need room_number on the nested query to show it properly if we want, or fall back */}
                      <Text style={styles.escRoom}>Needs attention</Text> 
                    </View>
                    <Badge label={priority} variant={priority as any} />
                  </View>
                  <Text style={styles.escReason}>{esc.reason}</Text>
                  <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolve(esc.id)}>
                    <Feather name="check" size={16} color="#0f172a" />
                    <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Resident Roster */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Residents</Text>
          </View>
          
          <View style={styles.rosterContainer}>
            {residents.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8' }}>No residents assigned.</Text>
              </View>
            ) : (
              residents.map((res, index) => {
                const fullName = `${res.first_name} ${res.last_name}`;
                const initials = `${res.first_name.charAt(0)}${res.last_name.charAt(0)}`;
                return (
                  <TouchableOpacity 
                    key={res.id} 
                    style={[
                      styles.residentRow, 
                      index === residents.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={styles.residentAvatar}>
                      <Text style={styles.residentInitials}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.residentName}>{fullName}</Text>
                      <Text style={styles.residentMeta}>Room {res.room_number || 'TBD'} • {res.care_stage || 'Standard Care'}</Text>
                    </View>
                    <View style={styles.residentRight}>
                      <Text style={styles.residentTime}>View</Text>
                      <Feather name="chevron-right" size={16} color="#cbd5e1" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 32,
  },
  headerTextWrap: {
    flex: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  greetingText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  awaitingText: { fontSize: 15, color: '#64748b', marginTop: 8 },
  notesToCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  amberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  notesToCheckText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 36,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  sectionWrap: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  badgeCount: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  escalationCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  escHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  escResidentInfo: {
    flex: 1,
  },
  escResidentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  escRoom: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  escReason: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 16,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    gap: 8,
  },
  resolveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  rosterContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  residentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  residentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  residentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  residentMeta: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  residentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  residentTime: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
