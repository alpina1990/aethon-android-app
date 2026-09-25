import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import type { Goal } from '../../lib/goals';

// Minimal Badge Component
function Badge({ label, variant }: { label: string; variant: 'success' | 'warning' | 'info' }) {
  const colors = {
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef9c3', text: '#854d0e' },
    info: { bg: '#dbeafe', text: '#1e40af' },
  };
  const color = colors[variant];
  return (
    <View style={[{ backgroundColor: color.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }]}>
      <Text style={{ color: color.text, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [goals, setGoals] = useState<Goal[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { data: profile } = await supabase.from('user_profiles').select('resident_id').eq('id', userData.user.id).single();
        if (!profile?.resident_id) return;
        const { data: resident } = await supabase.from('residents').select('independence_goals').eq('id', profile.resident_id).single();
        const visible = ((resident?.independence_goals ?? []) as Goal[]).filter(g => g.family_visible);
        if (!cancelled) setGoals(visible);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error: any) {
      Alert.alert('Logout Error', error.message);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.dateText}>THURSDAY, SEP 21</Text>
            <Text style={styles.greetingText}>Hi, Sarah</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.profileButton}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=47' }} // Professional placeholder avatar
                style={styles.profileImage}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} hitSlop={8}>
              <Feather name="log-out" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.subtitle}>Here is Martha&apos;s daily health summary.</Text>

        {/* Crisp Minimal Vitals Strip */}
        <View style={styles.vitalsContainer}>
          <View style={styles.vitalCard}>
            <View style={[styles.vitalIconWrap, { backgroundColor: '#f0fdf4' }]}>
              <Feather name="smile" size={20} color="#16a34a" />
            </View>
            <Text style={styles.vitalValue}>Good</Text>
            <Text style={styles.vitalLabel}>Mood</Text>
          </View>
          
          <View style={styles.vitalCard}>
            <View style={[styles.vitalIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Feather name="moon" size={20} color="#2563eb" />
            </View>
            <Text style={styles.vitalValue}>7h 20m</Text>
            <Text style={styles.vitalLabel}>Sleep</Text>
          </View>

          <View style={styles.vitalCard}>
            <View style={[styles.vitalIconWrap, { backgroundColor: '#f8fafc' }]}>
              <Feather name="check-circle" size={20} color="#0f172a" />
            </View>
            <Text style={styles.vitalValue}>All Taken</Text>
            <Text style={styles.vitalLabel}>Meds</Text>
          </View>
        </View>

        {/* Activity Feed */}
        <View style={styles.feedContainer}>
          {goals.length > 0 && (
            <View style={styles.goalsCard}>
              <Text style={styles.goalsHeading}>What matters to them</Text>
              {goals.map((g, i) => (
                <Text key={i} style={styles.goalsText}>{g.text}</Text>
              ))}
            </View>
          )}
          <View style={styles.feedHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Activity Timeline Items */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineTrack} />
            <View style={[styles.timelineNode, { borderColor: '#2563eb' }]} />
            <View style={styles.timelineContent}>
              <View style={styles.activityTitleRow}>
                <Text style={styles.activityTitle}>Visit Note</Text>
                <Text style={styles.activityTime}>2h ago</Text>
              </View>
              <Text style={styles.activityDesc}>
                Martha enjoyed a full breakfast and participated in the morning garden walk. Mood is very positive today.
              </Text>
              <View style={styles.activityFooter}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerInitials}>S</Text>
                </View>
                <Text style={styles.providerName}>Nurse Sofia</Text>
              </View>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineTrack} />
            <View style={[styles.timelineNode, { borderColor: '#16a34a' }]} />
            <View style={styles.timelineContent}>
              <View style={styles.activityTitleRow}>
                <Text style={styles.activityTitle}>Medications Administered</Text>
                <Text style={styles.activityTime}>Yesterday</Text>
              </View>
              <Text style={styles.activityDesc}>
                Afternoon supplements and scheduled medications taken on time.
              </Text>
              <Text style={styles.referenceNote}>Reference only. Not a medication administration record.</Text>
              <View style={{ marginTop: 12 }}>
                <Badge label="Compliant" variant="success" />
              </View>
            </View>
          </View>

          <View style={[styles.timelineItem, { marginBottom: 0 }]}>
            <View style={[styles.timelineNode, { borderColor: '#ca8a04' }]} />
            <View style={styles.timelineContent}>
              <View style={styles.activityTitleRow}>
                <Text style={styles.activityTitle}>Wellbeing Check</Text>
                <Text style={styles.activityTime}>2 days ago</Text>
              </View>
              <Text style={styles.activityDesc}>
                Slight discomfort reported in lower back. Physiotherapy session scheduled for tomorrow.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  referenceNote: { fontSize: 15, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 },
  goalsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  goalsHeading: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  goalsText: { fontSize: 16, color: '#0f172a', marginBottom: 4 },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 4,
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
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    paddingHorizontal: 24,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 32,
  },
  vitalsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 36,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    // Ultra subtle shadow
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  vitalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  vitalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  feedContainer: {
    paddingHorizontal: 24,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineTrack: {
    position: 'absolute',
    left: 7,
    top: 24,
    bottom: -24,
    width: 2,
    backgroundColor: '#f1f5f9',
  },
  timelineNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: '#ffffff',
    marginTop: 4,
    marginRight: 16,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  activityTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activityDesc: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  providerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  providerInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563eb',
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
});
