import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type RecentLog = { mood: number | null; pain: number | null; created_at: string };
export type WeightLog = { weight_kg: number; created_at: string };

const PRIMARY = '#3b82f6';
const AMBER = '#f59e0b';
const DANGER = '#ef4444';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';

// Band colours for recorded mood/pain values are the documented display
// exception (guide 6.1/6.2). Weight has no bands, no colour, no direction.
function moodBandColor(value: number): string {
  if (value >= 4) return PRIMARY;
  if (value === 3) return AMBER;
  return DANGER;
}

function painBandColor(value: number): string {
  if (value <= 3) return PRIMARY;
  if (value <= 6) return AMBER;
  return DANGER;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// One slot per day for the last 14 days, oldest first. A day shows the
// latest entry that has a value for the field; no entry stays null.
function lastFourteenDays(logs: RecentLog[], field: 'mood' | 'pain'): (number | null)[] {
  const latestByDay = new Map<string, number>();
  for (const log of logs) {
    const value = log[field];
    const key = dayKey(new Date(log.created_at));
    if (value !== null && !latestByDay.has(key)) latestByDay.set(key, value);
  }

  const slots: (number | null)[] = [];
  for (let offset = 13; offset >= 0; offset--) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    slots.push(latestByDay.get(dayKey(day)) ?? null);
  }
  return slots;
}

function CircleRow({ values, colorFor }: { values: (number | null)[]; colorFor: (v: number) => string }) {
  return (
    <View style={styles.circleRow}>
      {values.map((value, index) => (
        <View
          key={index}
          style={[
            styles.circle,
            value === null ? styles.circleEmpty : { backgroundColor: colorFor(value), borderColor: colorFor(value) },
          ]}
        />
      ))}
    </View>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TrendCard({ recent, weights, askAbout }: { recent: RecentLog[]; weights: WeightLog[]; askAbout: string[] }) {
  const moods = lastFourteenDays(recent, 'mood');
  const pains = lastFourteenDays(recent, 'pain');
  const hasMood = moods.some(v => v !== null);
  const hasPain = pains.some(v => v !== null);

  // weights arrive newest first; the sparkline reads oldest to newest.
  const series = [...weights].reverse();
  const weightValues = series.map(w => w.weight_kg);
  const min = Math.min(...weightValues);
  const max = Math.max(...weightValues);
  const span = max - min;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Recent observations</Text>

      {!hasMood && !hasPain && series.length === 0 && (
        <Text style={styles.empty}>No observations recorded yet</Text>
      )}

      {hasMood && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Mood</Text>
          <CircleRow values={moods} colorFor={moodBandColor} />
          <Text style={styles.caption}>Last 14 days</Text>
        </View>
      )}

      {series.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Weight</Text>
          <View style={styles.sparkline}>
            {series.map((reading, index) => {
              const height = span === 0 ? 30 : 8 + ((reading.weight_kg - min) / span) * 52;
              const isLatest = index === series.length - 1;
              return (
                <View
                  key={index}
                  style={[styles.bar, { height, backgroundColor: isLatest ? TEXT : BORDER }]}
                />
              );
            })}
          </View>
          <Text style={styles.weightSummary}>
            First recorded {series[0].weight_kg} kg on {formatDate(series[0].created_at)}, most recent{' '}
            {series[series.length - 1].weight_kg} kg on {formatDate(series[series.length - 1].created_at)}
          </Text>
        </View>
      )}

      {askAbout.length > 0 && (
        <Text style={styles.flagged}>Flagged to ask about: {askAbout.join(', ')}</Text>
      )}

      {hasPain && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Pain</Text>
          <CircleRow values={pains} colorFor={painBandColor} />
          <Text style={styles.caption}>Last 14 days</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: BORDER },
  heading: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 10 },
  empty: { fontSize: 16, color: '#94a3b8', fontStyle: 'italic' },

  block: { marginBottom: 14 },
  blockLabel: { fontSize: 15, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  circleRow: { flexDirection: 'row', gap: 4 },
  circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  circleEmpty: { borderColor: BORDER, backgroundColor: 'transparent' },
  caption: { fontSize: 15, color: '#94a3b8', marginTop: 6 },

  sparkline: { height: 60, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { width: 6, borderRadius: 2 },
  flagged: { fontSize: 15, color: '#475569', marginBottom: 14 },
  weightSummary: { fontSize: 15, color: '#475569', marginTop: 8 },
});
