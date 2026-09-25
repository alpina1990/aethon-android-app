import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Image, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboardingKey } from '../../lib/resident';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

type Nav = NativeStackNavigationProp<RootStackParamList>;
type LoginMode = 'select' | 'family' | 'caregiver' | 'resident';

const GEMINI_PALETTES = [
  ['rgba(167,243,252,0.8)', 'rgba(191,219,254,0.9)'],
  ['rgba(249,168,212,0.8)', 'rgba(216,180,254,0.9)'],
];

function AuraFog() {
  const colorIndex = useRef(0);
  const [fadeOut] = useState(() => new Animated.Value(1));
  const [fadeIn] = useState(() => new Animated.Value(0));
  const [colors, setColors] = React.useState({
    current: GEMINI_PALETTES[0],
    next: GEMINI_PALETTES[1],
  });

  useEffect(() => {
    const cycle = () => {
      const nextIdx = (colorIndex.current + 1) % GEMINI_PALETTES.length;
      fadeOut.setValue(1);
      fadeIn.setValue(0);
      setColors({ current: GEMINI_PALETTES[colorIndex.current], next: GEMINI_PALETTES[nextIdx] });

      Animated.parallel([
        Animated.timing(fadeOut, { toValue: 0, duration: 6000, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 6000, useNativeDriver: true }),
      ]).start(() => {
        colorIndex.current = nextIdx;
        cycle();
      });
    };
    const timer = setTimeout(cycle, 4000);
    return () => clearTimeout(timer);
  }, []);

  const renderFogLayer = (colorLeft: string, colorRight: string, opacity: Animated.Value) => (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', colorLeft]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', colorRight]} locations={[0, 0.65, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );

  return (
    <View style={styles.auraContainer}>
      {renderFogLayer(colors.current[0], colors.current[1], fadeOut)}
      {renderFogLayer(colors.next[0], colors.next[1], fadeIn)}
    </View>
  );
}

// Custom NumPad Component
const NumPad = ({ onKeyPress, onBackspace }: { onKeyPress: (n: string) => void, onBackspace: () => void }) => {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'delete']
  ];

  return (
    <View style={styles.numpadContainer}>
      {rows.map((row, i) => (
        <View key={i} style={styles.numpadRow}>
          {row.map((key) => {
            if (key === '') return <View key="empty" style={styles.numKey} />;
            if (key === 'delete') {
              return (
                <TouchableOpacity key={key} style={styles.numKey} onPress={onBackspace}>
                  <Feather name="delete" size={24} color="#0f172a" />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={key} style={styles.numKey} onPress={() => onKeyPress(key)}>
                <Text style={styles.numKeyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  
  const [mode, setMode] = useState<LoginMode>('select');
  const [loading, setLoading] = useState(false);

  // Family State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Caregiver State
  const [caregiverStep, setCaregiverStep] = useState<'id' | 'pin'>('id');
  const [caregiverId, setCaregiverId] = useState('');
  const [caregiverPin, setCaregiverPin] = useState('');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '141003468817-d83e9mkfruh0f8i2lghv7n8jmvfe427q.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        setTimeout(() => setLoading(true), 0);
        supabase.auth.signInWithIdToken({ provider: 'google', token: id_token })
          .then(({ error }) => {
            if (error) Alert.alert('Google Login Error', error.message);
            setLoading(false);
          });
      }
    }
  }, [response]);

  const routeUserBasedOnRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (data?.role === 'caregiver' || data?.role === 'staff' || data?.role === 'admin' || data?.role === 'superadmin') {
        navigation.replace('CaregiverApp');
      } else if (data?.role === 'resident') {
        const done = await AsyncStorage.getItem(onboardingKey(userId));
        navigation.replace(done ? 'ResidentHome' : 'ResidentOnboarding');
      } else {
        navigation.replace('FamilyApp');
      }
    } catch (err) {
      console.error('Routing error', err);
      // Fallback
      navigation.replace('RoleSelector');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) routeUserBasedOnRole(session.user.id);
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        routeUserBasedOnRole(session.user.id);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // --- Handlers ---

  const handleEmailLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter both email and password.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    setLoading(false);
  };

  const handleNumKeyPress = async (key: string) => {
    if (caregiverStep === 'id') {
      if (caregiverId.length < 4) setCaregiverId(prev => prev + key);
    } else {
      if (caregiverPin.length < 4) {
        const newPin = caregiverPin + key;
        setCaregiverPin(newPin);
        
        // Auto-submit when PIN reaches 4 digits
        if (newPin.length === 4) {
          setLoading(true);
          // Map to Supabase Auth: ID -> email, PIN -> password
          const dummyEmail = `staff_${caregiverId}@aethon.local`;
          const dummyPassword = `PIN-${newPin}`;
          
          const { error } = await supabase.auth.signInWithPassword({ email: dummyEmail, password: dummyPassword });
          if (error) {
            Alert.alert('Login Failed', error.message + `\n(Attempted: ${dummyEmail})`);
            setCaregiverPin(''); // Reset PIN on failure
          }
          setLoading(false);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (caregiverStep === 'id') {
      setCaregiverId(prev => prev.slice(0, -1));
    } else {
      if (caregiverPin.length > 0) setCaregiverPin(prev => prev.slice(0, -1));
      else setCaregiverStep('id'); // Go back to ID step if PIN is empty
    }
  };

  // --- Renderers ---

  const renderSelectMode = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Who is using this device?</Text>
      
      <TouchableOpacity style={styles.roleCard} onPress={() => setMode('caregiver')}>
        <View style={[styles.roleIconBox, { backgroundColor: '#eff6ff' }]}>
          <Feather name="shield" size={28} color="#3b82f6" />
        </View>
        <View style={styles.roleTextWrap}>
          <Text style={styles.roleTitle}>Care Professional</Text>
          <Text style={styles.roleDesc}>Shift access via ID & PIN</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#cbd5e1" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.roleCard} onPress={() => setMode('family')}>
        <View style={[styles.roleIconBox, { backgroundColor: '#fdf2f8' }]}>
          <Feather name="heart" size={28} color="#ec4899" />
        </View>
        <View style={styles.roleTextWrap}>
          <Text style={styles.roleTitle}>Family Member</Text>
          <Text style={styles.roleDesc}>Secure consumer login</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#cbd5e1" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.roleCard} onPress={() => setMode('resident')}>
        <View style={[styles.roleIconBox, { backgroundColor: '#ecfdf5' }]}>
          <Feather name="user" size={28} color="#10b981" />
        </View>
        <View style={styles.roleTextWrap}>
          <Text style={styles.roleTitle}>Resident</Text>
          <Text style={styles.roleDesc}>Your daily summary</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#cbd5e1" />
      </TouchableOpacity>
    </View>
  );

  const renderCaregiverMode = () => (
    <View style={styles.caregiverContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={() => { setMode('select'); setCaregiverId(''); setCaregiverPin(''); setCaregiverStep('id'); }}>
        <Feather name="arrow-left" size={24} color="#0f172a" />
      </TouchableOpacity>
      
      <Text style={styles.caregiverTitle}>
        {caregiverStep === 'id' ? 'Enter Nurse ID' : 'Enter 4-Digit PIN'}
      </Text>
      <Text style={styles.caregiverSubtitle}>
        {caregiverStep === 'id' ? 'Your 4-digit facility identifier' : `Logging in as ID: ${caregiverId}`}
      </Text>

      {/* Dots Display */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map(i => {
          const val = caregiverStep === 'id' ? caregiverId[i] : caregiverPin[i];
          const isFilled = !!val;
          return (
            <View key={i} style={[styles.dotBox, isFilled && styles.dotBoxFilled]}>
              <Text style={[styles.dotText, isFilled && styles.dotTextFilled]}>
                {caregiverStep === 'id' ? val : (isFilled ? '•' : '')}
              </Text>
            </View>
          );
        })}
      </View>

      {caregiverStep === 'id' && (
        <TouchableOpacity 
          style={[styles.nextBtn, caregiverId.length === 4 ? styles.nextBtnActive : {}]}
          disabled={caregiverId.length < 4}
          onPress={() => setCaregiverStep('pin')}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      )}

      {loading && <Text style={{textAlign: 'center', marginTop: 10}}>Authenticating...</Text>}

      <NumPad onKeyPress={handleNumKeyPress} onBackspace={handleBackspace} />
    </View>
  );

  const renderEmailMode = (isResident: boolean) => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backBtnSmall} onPress={() => setMode('select')}>
        <Feather name="arrow-left" size={20} color="#64748b" />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.titleSmall}>{isResident ? 'Resident' : 'Family Portal'}</Text>

      {!isResident && (
        <>
          <TouchableOpacity style={styles.googleButton} onPress={() => promptAsync()} disabled={loading}>
            <Image source={require('../../../assets/google-icon.png')} style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>
        </>
      )}

      <View style={styles.inputWrap}>
        <Feather name="mail" size={20} color="#94a3b8" />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      </View>
      <View style={styles.inputWrap}>
        <Feather name="lock" size={20} color="#94a3b8" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#94a3b8" secureTextEntry value={password} onChangeText={setPassword} />
      </View>

      <TouchableOpacity style={[styles.loginBtn, loading && { opacity: 0.7 }]} onPress={handleEmailLogin} disabled={loading}>
        <Text style={styles.loginBtnText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <AuraFog />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        
        {mode === 'select' && (
          <View style={styles.header}>
            <Image source={require('../../../assets/logo.jpg')} style={styles.logoImage} resizeMode="contain" />
          </View>
        )}

        {mode === 'select' && renderSelectMode()}
        {mode === 'caregiver' && renderCaregiverMode()}
        {mode === 'family' && renderEmailMode(false)}
        {mode === 'resident' && renderEmailMode(true)}

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  auraContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  logoImage: { width: 80, height: 80, borderRadius: 20 },
  
  title: { fontSize: 32, fontWeight: '800', color: '#0f172a', letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', fontWeight: '500', marginBottom: 32 },
  titleSmall: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 24, marginTop: 12 },
  
  formContainer: { backgroundColor: 'rgba(255,255,255,0.9)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  
  // Select Mode
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  roleIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  roleTextWrap: { flex: 1 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  roleDesc: { fontSize: 15, color: '#64748b', marginTop: 2 },

  // Caregiver Mode
  caregiverContainer: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 24, borderRadius: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginTop: -40 },
  backBtn: { alignSelf: 'flex-start', padding: 8, marginLeft: -8, marginBottom: 16 },
  caregiverTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  caregiverSubtitle: { fontSize: 15, color: '#64748b', marginBottom: 32 },
  
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32 },
  dotBox: { width: 56, height: 64, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  dotBoxFilled: { backgroundColor: '#fff', borderColor: '#3b82f6', borderWidth: 2 },
  dotText: { fontSize: 24, fontWeight: '700', color: '#cbd5e1' },
  dotTextFilled: { color: '#0f172a' },
  
  nextBtn: { backgroundColor: '#e2e8f0', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 24, marginBottom: 24 },
  nextBtnActive: { backgroundColor: '#0f172a' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  numpadContainer: { width: '100%', maxWidth: 300, gap: 16 },
  numpadRow: { flexDirection: 'row', justifyContent: 'space-between' },
  numKey: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  numKeyText: { fontSize: 28, fontWeight: '600', color: '#0f172a' },

  // Family Mode
  backBtnSmall: { flexDirection: 'row', alignItems: 'center' },
  backBtnText: { marginLeft: 4, fontSize: 15, color: '#64748b', fontWeight: '600' },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  googleIcon: { width: 20, height: 20, marginRight: 12 },
  googleButtonText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: '#94a3b8' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, marginBottom: 12, height: 52 },
  input: { flex: 1, marginLeft: 12, fontSize: 15, color: '#0f172a' },
  loginBtn: { backgroundColor: '#0f172a', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
