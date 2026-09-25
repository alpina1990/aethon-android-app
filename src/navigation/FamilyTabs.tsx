import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import FamilyHomeScreen from '../screens/family/HomeScreen';
import MessagesScreen from '../screens/family/MessagesScreen';
import VitalsScreen from '../screens/family/VitalsScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  // Use professional Feather line icons
  const icons: Record<string, any> = {
    Home: 'home',
    Vitals: 'activity',
    Messages: 'message-circle',
    Profile: 'user',
  };
  
  const iconName = icons[label] || 'circle';
  const color = focused ? '#2563eb' : '#94a3b8'; // Rich Blue vs Slate Gray

  return (
    <View style={{ marginBottom: -4 }}>
      <Feather name={iconName} size={24} color={color} />
    </View>
  );
}

export function FamilyTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarHideOnKeyboard: true, // This fixes the chat layout on Android!
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
          elevation: 0, // Remove shadow
        },
      })}
    >
      <Tab.Screen name="Home" component={FamilyHomeScreen} />
      <Tab.Screen name="Vitals" component={VitalsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}
