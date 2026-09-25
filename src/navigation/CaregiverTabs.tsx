import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CaregiverHomeScreen from '../screens/caregiver/HomeScreen';
import AlertsScreen from '../screens/caregiver/AlertsScreen';
import RosterScreen from '../screens/caregiver/RosterScreen';
import ProfileScreen from '../screens/caregiver/ProfileScreen';
import { initTranscription } from '../lib/transcription';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  // Use professional Feather line icons
  const icons: Record<string, any> = {
    Shift: 'clock',
    Roster: 'users',
    Alerts: 'bell',
    Profile: 'user',
  };
  
  const iconName = icons[label] || 'circle';
  const color = focused ? '#7c3aed' : '#94a3b8'; // Violet for Caregivers

  return (
    <View style={{ marginBottom: -4 }}>
      <Feather name={iconName} size={24} color={color} />
    </View>
  );
}

export function CaregiverTabNavigator() {
  useEffect(() => {
    initTranscription().catch(err => console.error('Failed to load transcription model', err));
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 15,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
          elevation: 0,
        },
      })}
    >
      <Tab.Screen name="Shift" component={CaregiverHomeScreen} />
      <Tab.Screen name="Roster" component={RosterScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
