import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '../../constants/theme';
import { SignOutButton } from '../../components/SignOutButton';

const MOCK_VITALS = [
  { day: 'Mon', mood: 4, sleep: 7, pain: 1 },
  { day: 'Tue', mood: 3, sleep: 6, pain: 2 },
  { day: 'Wed', mood: 5, sleep: 8, pain: 1 },
  { day: 'Thu', mood: 4, sleep: 7, pain: 0 },
  { day: 'Fri', mood: 5, sleep: 7.5, pain: 1 },
  { day: 'Sat', mood: 4, sleep: 8, pain: 0 },
  { day: 'Sun', mood: 5, sleep: 7, pain: 0 },
];

const MEDS = [
  { name: 'Paracetamol 500mg', time: '08:00', status: 'taken' },
  { name: 'Omeprazole 20mg', time: '08:00', status: 'taken' },
  { name: 'Vitamin D 1000IU', time: '12:00', status: 'taken' },
  { name: 'Amlodipine 5mg', time: '20:00', status: 'upcoming' },
];

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={miniStyles.track}>
      <View style={[miniStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const miniStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.surfaceMuted, flex: 1 },
  fill: { height: 6, borderRadius: 3 },
});

export default function VitalsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: insets.top + Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>Health & Wellness</Text>
          <SignOutButton />
        </View>
        <Text style={styles.subtitle}>Martha&apos;s 7-day trends and medication schedule</Text>
      </View>

      {/* Weekly Vitals */}
      <Text style={styles.sectionTitle}>Weekly Trends</Text>
      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <Text style={styles.trendLabel}>😊 Mood</Text>
          <Text style={styles.trendLabel}>😴 Sleep (hrs)</Text>
          <Text style={styles.trendLabel}>🩹 Pain</Text>
        </View>
        {MOCK_VITALS.map((v, i) => (
          <View key={i} style={styles.trendRow}>
            <Text style={styles.dayLabel}>{v.day}</Text>
            <View style={styles.barsWrap}>
              <MiniBar value={v.mood} max={5} color={Colors.primary} />
              <MiniBar value={v.sleep} max={10} color={Colors.accent} />
              <MiniBar value={v.pain} max={5} color={v.pain >= 3 ? Colors.danger : Colors.success} />
            </View>
          </View>
        ))}
      </View>

      {/* Medications */}
      <Text style={styles.sectionTitle}>Today&apos;s Medications</Text>
      {MEDS.map((med, i) => (
        <View key={i} style={styles.medRow}>
          <View style={[styles.medDot, { backgroundColor: med.status === 'taken' ? Colors.success : Colors.warning }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.medTime}>{med.time}</Text>
          </View>
          <View style={[styles.medBadge, { backgroundColor: med.status === 'taken' ? Colors.successLight : Colors.warningLight }]}>
            <Text style={[styles.medBadgeText, { color: med.status === 'taken' ? '#059669' : '#d97706' }]}>
              {med.status === 'taken' ? '✓ Taken' : '⏳ Upcoming'}
            </Text>
          </View>
        </View>
      ))}
      <Text style={styles.referenceNote}>Reference only. Not a medication administration record.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  referenceNote: { fontSize: 15, color: '#94a3b8', fontStyle: 'italic', marginTop: 12 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  trendCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
    paddingLeft: 36,
  },
  trendLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dayLabel: {
    width: 30,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
  },
  barsWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  medDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  medName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  medTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  medBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  medBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
  },
});
