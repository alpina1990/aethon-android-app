import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, BackHandler, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/theme';
import { onboardingKey } from '../../lib/resident';
import type { Goal } from '../../lib/goals';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const STEPS = 6;

const GOAL_EXAMPLES = ['Cook my own dinner', 'Get to the market on Thursdays', 'Look after my own tablets'];

type Contact = { name: string; relationship: string; phone: string; priority: number };

// Resident-facing: no text below 22pt, no control below 80pt, no swipe,
// no menu. Android back steps back one screen and never leaves the flow.
export default function ResidentOnboarding() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [goalTexts, setGoalTexts] = useState(['', '', '']);
  const [goalVisible, setGoalVisible] = useState([false, false, false]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) return;
        const { data: profile } = await supabase.from('user_profiles').select('full_name, resident_id').eq('id', user.id).single();
        let found: Contact[] = [];
        if (profile?.resident_id) {
          const { data: resident } = await supabase.from('residents').select('emergency_contacts').eq('id', profile.resident_id).single();
          found = ((resident?.emergency_contacts ?? []) as Contact[]).slice().sort((a, b) => a.priority - b.priority);
        }
        if (!cancelled) {
          setUserId(user.id);
          setName(prev => prev || profile?.full_name || '');
          setContacts(found);
          setResidentId(profile?.resident_id ?? null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setStep(prev => Math.max(0, prev - 1));
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  const next = () => setStep(prev => Math.min(STEPS - 1, prev + 1));

  const saveName = async () => {
    if (userId && name.trim()) {
      const { error } = await supabase.from('user_profiles').update({ full_name: name.trim() }).eq('id', userId);
      if (error) Alert.alert('Could not save your name', error.message);
    }
    next();
  };

  const saveGoals = async () => {
    const goals: Goal[] = goalTexts
      .map((text, i) => ({ text: text.trim(), family_visible: goalVisible[i] }))
      .filter(g => g.text.length > 0);
    if (goals.length > 0 && residentId) {
      const { error } = await supabase.from('residents').update({ independence_goals: goals }).eq('id', residentId);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
    }
    next();
  };

  const allowReminders = async () => {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.requestPermissionsAsync();
    } catch {
      // Permission is asked again when reminders are set up; nothing to show.
    }
    next();
  };

  const finish = async () => {
    if (userId) await AsyncStorage.setItem(onboardingKey(userId), 'true');
    navigation.replace('ResidentHome');
  };

  const onColour = step === 0 || step === STEPS - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: onColour ? Colors.primary : '#fff' }]}>
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                onColour
                  ? { backgroundColor: i <= step ? '#fff' : 'rgba(255,255,255,0.4)' }
                  : { backgroundColor: i <= step ? Colors.primary : Colors.border },
              ]}
            />
          ))}
        </View>
        {step < STEPS - 1 && (
          <TouchableOpacity style={styles.skip} onPress={next}>
            <Text style={[styles.skipText, onColour && { color: '#fff' }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <View style={styles.center}>
              <Text style={styles.brand}>AETHON</Text>
              <Text style={styles.welcome}>Welcome</Text>
              <TouchableOpacity style={styles.whiteButton} onPress={next}>
                <Text style={styles.whiteButtonText}>Get started</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 1 && (
            <View style={styles.center}>
              <Text style={styles.title}>What is your name?</Text>
              <TextInput style={styles.nameInput} value={name} onChangeText={setName} textAlign="center" />
              <TouchableOpacity style={styles.primaryButton} onPress={saveName}>
                <Text style={styles.primaryButtonText}>That is my name</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.center}>
              <Feather name="bell" size={76} color={Colors.primary} />
              <Text style={styles.title}>Shall we remind you about your medication?</Text>
              <Text style={styles.text}>A gentle reminder at the right time each day.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={allowReminders}>
                <Text style={styles.primaryButtonText}>Yes, remind me</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton} onPress={next}>
                <Text style={styles.outlineButtonText}>Not now</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.center}>
              <Text style={styles.title}>Who should we contact if you need help?</Text>
              {contacts.length === 0 && <Text style={styles.text}>No contacts are on record yet.</Text>}
              {contacts.map((c, i) => (
                <View key={i} style={styles.contactCard}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.text}>{c.relationship}</Text>
                  <Text style={styles.text}>{c.phone}</Text>
                </View>
              ))}
              <Text style={styles.text}>If you use the assistance button, we contact them.</Text>
              <Text style={styles.smallPrint}>This is not an emergency service. In a medical emergency call 144.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={next}>
                <Text style={styles.primaryButtonText}>These are correct</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 4 && (
            <View style={styles.center}>
              <Text style={styles.title}>What do you want to keep doing yourself?</Text>
              <Text style={styles.text}>There are no wrong answers.</Text>
              {[0, 1, 2].map(i => (
                <View key={i} style={styles.goalBlock}>
                  <TextInput
                    style={styles.goalInput}
                    value={goalTexts[i]}
                    onChangeText={text => setGoalTexts(prev => prev.map((t, j) => (j === i ? text : t)))}
                    placeholder={GOAL_EXAMPLES[i]}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => setGoalVisible(prev => prev.map((v, j) => (j === i ? !v : v)))}
                  >
                    <Text style={styles.toggleLabel}>My family can see this</Text>
                    <Switch value={goalVisible[i]} onValueChange={v => setGoalVisible(prev => prev.map((x, j) => (j === i ? v : x)))} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.primaryButton} onPress={saveGoals}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 5 && (
            <View style={styles.center}>
              <View style={styles.tickCircle}>
                <Feather name="check" size={64} color="#fff" />
              </View>
              <Text style={styles.done}>Aethon is ready</Text>
              <TouchableOpacity style={styles.whiteButton} onPress={finish}>
                <Text style={styles.whiteButtonText}>Open Aethon</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 80 },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  skip: { minHeight: 80, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 22, fontWeight: '600', color: Colors.textSecondary },

  body: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  center: { alignItems: 'center', gap: 20 },

  brand: { fontSize: 46, fontWeight: '700', color: '#fff', textAlign: 'center' },
  welcome: { fontSize: 26, color: '#fff', textAlign: 'center', marginBottom: 20 },
  done: { fontSize: 32, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 },
  tickCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  text: { fontSize: 22, color: Colors.textSecondary, textAlign: 'center' },
  smallPrint: { fontSize: 22, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },

  nameInput: { alignSelf: 'stretch', fontSize: 28, height: 80, borderWidth: 2, borderColor: Colors.primary, borderRadius: 12, color: Colors.textPrimary },
  goalBlock: { alignSelf: 'stretch' },
  goalInput: { fontSize: 22, height: 80, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, color: Colors.textPrimary },
  toggleRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 22, color: Colors.textSecondary },
  contactCard: { alignSelf: 'stretch', backgroundColor: Colors.surfaceMuted, borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  contactName: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },

  whiteButton: { alignSelf: 'stretch', height: 80, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  whiteButtonText: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  primaryButton: { alignSelf: 'stretch', height: 80, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  outlineButton: { alignSelf: 'stretch', height: 80, borderRadius: 12, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { fontSize: 24, fontWeight: '700', color: Colors.primary },
});
