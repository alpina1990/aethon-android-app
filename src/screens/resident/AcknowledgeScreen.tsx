import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';
import type { RootStackParamList } from '../../navigation/RootNavigator';

// Resident-facing: text >= 22pt, controls >= 80pt, no swipe, no menu.
export default function AcknowledgeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { medicationId, name, dose, time } = useRoute<RouteProp<RootStackParamList, 'Acknowledge'>>().params;
  const [recorded, setRecorded] = useState<'taken' | 'skipped' | null>(null);
  const saving = useRef(false);

  const leave = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('ResidentHome');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!saving.current) leave();
        return true;
      });
      return () => sub.remove();
    }, [leave])
  );

  useEffect(() => {
    if (!recorded) return;
    const timer = setTimeout(leave, 1500);
    return () => clearTimeout(timer);
  }, [recorded, leave]);

  const record = async (status: 'taken' | 'skipped') => {
    if (saving.current) return;
    saving.current = true;
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('user_profiles').select('resident_id').eq('id', userData.user?.id ?? '').single();
    if (!profile?.resident_id) {
      saving.current = false;
      Alert.alert('Could not save', 'Please try again.');
      return;
    }
    const { error } = await supabase
      .from('medication_acks')
      .insert({ medication_id: medicationId, resident_id: profile.resident_id, status });
    if (error) {
      saving.current = false;
      Alert.alert('Could not save', error.message);
      return;
    }
    setRecorded(status);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.back} onPress={leave} accessibilityLabel="Back">
        <Feather name="arrow-left" size={32} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.body}>
        <Text style={styles.name}>{name}</Text>
        {dose ? <Text style={styles.dose}>{dose}</Text> : null}
        {time ? <Text style={styles.time}>Scheduled for {time}</Text> : null}

        <View style={styles.controls}>
          <TouchableOpacity style={[styles.control, styles.took]} onPress={() => record('taken')}>
            <Feather name="check" size={40} color="#fff" />
            <Text style={styles.tookText}>I took it</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.control, styles.skipped]} onPress={() => record('skipped')}>
            <Feather name="x" size={40} color={Colors.textMuted} />
            <Text style={styles.skippedText}>I skipped it</Text>
          </TouchableOpacity>
        </View>
      </View>

      {recorded && (
        <View style={styles.overlay}>
          <View style={styles.circle}>
            <Feather name={recorded === 'taken' ? 'check' : 'x'} size={64} color={recorded === 'taken' ? Colors.primary : Colors.textMuted} />
          </View>
          <Text style={styles.recorded}>Recorded</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  back: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  name: { fontSize: 36, fontWeight: '700', color: Colors.primaryDark, textAlign: 'center' },
  dose: { fontSize: 28, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  time: { fontSize: 22, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
  controls: { flexDirection: 'row', marginTop: 40 },
  control: { flex: 1, height: 110, margin: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  took: { backgroundColor: Colors.primary },
  tookText: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 4 },
  skipped: { backgroundColor: Colors.surfaceMuted, borderWidth: 2, borderColor: Colors.border },
  skippedText: { fontSize: 22, fontWeight: '700', color: Colors.textMuted, marginTop: 4 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  circle: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  recorded: { fontSize: 30, fontWeight: '700', color: Colors.textPrimary, marginTop: 24 },
});
