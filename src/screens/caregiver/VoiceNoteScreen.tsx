import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import { supabase } from '../../lib/supabase';
import { transcribe } from '../../lib/transcription';
import type { RootStackParamList } from '../../navigation/RootNavigator';

const MAX_DURATION_SECONDS = 120;

type State = 'idle' | 'recording' | 'saving';

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function VoiceNoteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'VoiceNote'>>();
  const { clientId, clientName } = route.params;

  const [state, setState] = useState<State>('idle');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 1000);

  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Microphone permission needed', 'Aethon needs microphone access to record a voice note.');
        navigation.goBack();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  useEffect(() => {
    if (state !== 'recording') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state]);

  const elapsedSeconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  const start = useCallback(async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState('recording');
  }, [recorder]);

  const stop = useCallback(async () => {
    await recorder.stop();
    const path = recorder.uri;

    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('facility_id, full_name')
      .eq('id', userData.user?.id)
      .single();

    const { data: note, error } = await supabase
      .from('visit_notes')
      .insert({
        resident_id: clientId,
        facility_id: profile?.facility_id,
        carer_id: userData.user?.id,
        carer_name: profile?.full_name,
        visit_type: 'Voice note',
        transcript: null,
        transcription_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Could not save note', error.message);
      setState('idle');
      return;
    }

    // The carer may now leave — transcription continues in the background
    // and the note row updates itself when it completes.
    setState('saving');
    console.log('Audio recorded at', path);

    if (path) {
      transcribe(path).then(async text => {
        await supabase
          .from('visit_notes')
          .update({
            transcript: text ?? '',
            raw_transcript: text ?? '',
            transcription_status: text ? 'complete' : 'failed',
          })
          .eq('id', note.id);
      });
    }

    setTimeout(() => {
      navigation.goBack();
    }, 1200);
  }, [recorder, clientId, navigation]);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = setTimeout(() => {
      stop();
    }, MAX_DURATION_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [state, stop]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={10}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.clientName}>{clientName}</Text>
        <Text style={styles.deviceNote}>Transcribed on this device</Text>
      </View>

      <View style={styles.centre}>
        {state === 'idle' && (
          <TouchableOpacity onPress={start} activeOpacity={0.85}>
            <View style={styles.circleIdle}>
              <Feather name="mic" size={56} color="#fff" />
            </View>
            <Text style={styles.idleLabel}>Tap to record</Text>
            <Text style={styles.idleHint}>Speak normally. Up to two minutes.</Text>
          </TouchableOpacity>
        )}

        {state === 'recording' && (
          <TouchableOpacity onPress={stop} activeOpacity={0.85}>
            <Animated.View style={[styles.circleRecording, { transform: [{ scale: pulse }] }]}>
              <Feather name="square" size={48} color="#fff" />
            </Animated.View>
            <Text style={styles.elapsed}>{formatElapsed(elapsedSeconds)}</Text>
            <Text style={styles.recordingHint}>Tap to stop</Text>
          </TouchableOpacity>
        )}

        {state === 'saving' && (
          <View style={{ alignItems: 'center' }}>
            <View style={styles.circleSaving}>
              <Feather name="check" size={48} color="#2563eb" />
            </View>
            <Text style={styles.savedLabel}>Note saved</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563eb' },
  header: { alignItems: 'center', paddingTop: 8 },
  backButton: { position: 'absolute', left: 16, top: 8, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  deviceNote: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  circleIdle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  idleLabel: { fontSize: 20, color: '#fff', marginTop: 24, textAlign: 'center' },
  idleHint: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'center' },

  circleRecording: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#991b1b', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  elapsed: { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 24, textAlign: 'center' },
  recordingHint: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },

  circleSaving: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  savedLabel: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 20 },
});
