import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const PRIMARY = '#3b82f6';
const AMBER = '#f59e0b';
const DANGER = '#ef4444';

const MOOD_FACES: React.ComponentProps<typeof MaterialCommunityIcons>['name'][] = [
  'emoticon-cry-outline',
  'emoticon-sad-outline',
  'emoticon-neutral-outline',
  'emoticon-happy-outline',
  'emoticon-excited-outline',
];

// Pain band colours are the documented display exception (guide 6.1/6.2).
function painBandColor(value: number): string {
  if (value <= 3) return PRIMARY;
  if (value <= 6) return AMBER;
  return DANGER;
}

function MoodButton({ value, selected, size, onPress }: { value: number; selected: boolean; size: number; onPress: () => void }) {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.spring(scale, { toValue: selected ? 1.15 : 1, useNativeDriver: true }).start();
  }, [selected, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.moodButton,
          { width: size, height: size, borderRadius: size / 2 },
          selected && styles.moodButtonSelected,
        ]}
      >
        <MaterialCommunityIcons name={MOOD_FACES[value - 1]} size={size * 0.6} color="#0f172a" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ObservationScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Observation'>>();
  const { clientId, clientName, mode } = route.params;
  const isResident = mode === 'resident';

  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const segmentWidth = (width - 40) / 11;

  const handleSave = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const parsedWeight = parseFloat(weight);

    const { error } = await supabase.from('health_logs').insert({
      resident_id: clientId,
      logged_by: userData.user?.id,
      mood,
      sleep,
      pain,
      weight_kg: Number.isNaN(parsedWeight) ? null : parsedWeight,
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Could not save observation', error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => navigation.goBack(), 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{clientName}</Text>
      </View>

      {saved ? (
        <View style={styles.savedState}>
          <Feather name="check-circle" size={isResident ? 80 : 56} color={PRIMARY} />
          <Text style={[styles.savedText, isResident && { fontSize: 28 }]}>Saved</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, isResident && styles.labelResident]}>
            {isResident ? 'How are you feeling today?' : 'Mood'}
          </Text>
          <View style={styles.moodRow}>
            {[1, 2, 3, 4, 5].map(value => (
              <MoodButton
                key={value}
                value={value}
                selected={mood === value}
                size={isResident ? 68 : 56}
                onPress={() => setMood(prev => (prev === value ? null : value))}
              />
            ))}
          </View>

          <Text style={[styles.label, isResident && styles.labelResident]}>
            {isResident ? 'How did you sleep?' : 'Sleep quality'}
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map(value => (
              <TouchableOpacity
                key={value}
                onPress={() => setSleep(prev => (prev === value ? null : value))}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons
                  name={sleep !== null && value <= sleep ? 'star' : 'star-outline'}
                  size={isResident ? 52 : 40}
                  color={AMBER}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, isResident && styles.labelResident]}>Any pain today?</Text>
          {pain !== null && (
            <View style={styles.painReadout}>
              <Text style={[styles.painValue, { color: painBandColor(pain) }]}>{pain}</Text>
              </View>
          )}
          <View style={styles.painRow}>
            {Array.from({ length: 11 }, (_, value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setPain(prev => (prev === value ? null : value))}
                style={[
                  styles.painSegment,
                  {
                    width: segmentWidth,
                    backgroundColor: painBandColor(value),
                    opacity: pain === value ? 1 : 0.35,
                  },
                ]}
              >
                <Text style={styles.painSegmentText}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isResident && (
            <>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.weightRow}>
                <TextInput
                  style={styles.weightInput}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0.0"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={styles.weightSuffix}>kg</Text>
              </View>
            </>
          )}

          <Text style={[styles.label, isResident && styles.labelResident]}>
            {isResident ? 'Anything else?' : 'Observations'}
          </Text>
          <TextInput
            style={styles.notesInput}
            multiline
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveButton, isResident && { height: 80 }, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={[styles.saveButtonText, isResident && { fontSize: 24 }]}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backButton: { minWidth: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  scrollContent: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginTop: 20, marginBottom: 12 },
  labelResident: { fontSize: 24 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  moodButtonSelected: { borderWidth: 3, borderColor: PRIMARY },

  starRow: { flexDirection: 'row' },

  painReadout: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 8 },
  painValue: { fontSize: 34, fontWeight: '800' },
  painRow: { flexDirection: 'row', marginHorizontal: -0 },
  painSegment: { height: 52, alignItems: 'center', justifyContent: 'center' },
  painSegmentText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightInput: { flex: 1, height: 56, fontSize: 20, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, color: '#0f172a' },
  weightSuffix: { fontSize: 20, color: '#64748b' },

  notesInput: { height: 90, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, color: '#0f172a' },

  saveButton: { backgroundColor: PRIMARY, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  savedState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  savedText: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
});
