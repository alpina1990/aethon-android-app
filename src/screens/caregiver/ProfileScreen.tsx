import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { useShift } from '../../context/ShiftContext';

function SettingsRow({ icon, label, value, type = 'link', onToggle, isToggled, isLast = false, destructive = false, onPress }: any) {
  return (
    <TouchableOpacity 
      style={[styles.row, !isLast && styles.rowBorder]}
      disabled={type === 'toggle'}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, destructive && { backgroundColor: '#fee2e2' }]}>
          <Feather name={icon} size={18} color={destructive ? '#dc2626' : '#64748b'} />
        </View>
        <Text style={[styles.rowLabel, destructive && { color: '#dc2626' }]}>{label}</Text>
      </View>
      
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {type === 'link' && <Feather name="chevron-right" size={20} color="#cbd5e1" />}
        {type === 'toggle' && (
          <Switch 
            value={isToggled}
            onValueChange={onToggle}
            trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
            ios_backgroundColor="#e2e8f0"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { clearPins } = useShift();

  const [profile, setProfile] = useState<any>(null);
  const [biometrics, setBiometrics] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearPins(); // Ensure the next nurse doesn't inherit these pinned patients
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Loading...'}</Text>
          <Text style={styles.role}>
            {profile?.role ? profile.role.toUpperCase() : 'CAREGIVER'} 
            {profile?.nurse_id ? ` • ID: ${profile.nurse_id}` : ''}
          </Text>
          <View style={styles.badgeWrap}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>On Shift</Text>
          </View>
        </View>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon="user" label="Personal Information" />
          <SettingsRow icon="shield" label="Change Password" />
          <SettingsRow 
            icon="bell" 
            label="Push Notifications" 
            type="toggle" 
            isToggled={notifications} 
            onToggle={setNotifications} 
            isLast 
          />
        </View>

        {/* Work & Schedule */}
        <Text style={styles.sectionTitle}>Work & Schedule</Text>
        <View style={styles.card}>
          <SettingsRow icon="calendar" label="My Roster" value="View Schedule" />
          <SettingsRow icon="clock" label="Timesheets" />
          <SettingsRow icon="file-text" label="Handover Protocols" isLast />
        </View>

        {/* App Preferences */}
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <View style={styles.card}>
          <SettingsRow icon="globe" label="Language" value="English" />
          <SettingsRow 
            icon="smartphone" 
            label="Face ID / Biometrics" 
            type="toggle" 
            isToggled={biometrics} 
            onToggle={setBiometrics} 
            isLast 
          />
        </View>

        {/* Logout */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Aethon Care v1.0.0 (Build 42)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarFallback: {
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#ffffff',
    marginBottom: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  avatarFallbackText: { fontSize: 32, fontWeight: '800', color: '#7c3aed' },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  role: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowValue: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#ffffff',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 16,
  },
});
