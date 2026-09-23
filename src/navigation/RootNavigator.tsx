import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FamilyTabNavigator } from './FamilyTabs';
import { CaregiverTabNavigator } from './CaregiverTabs';
import RoleSelectorScreen from '../screens/auth/RoleSelectorScreen';
import LoginScreen from '../screens/auth/LoginScreen';

export type RootStackParamList = {
  Login: undefined;
  RoleSelector: undefined;
  FamilyApp: undefined;
  CaregiverApp: undefined;
  LogNote: undefined;
  Escalation: undefined;
  ScanQR: undefined;
  ClientProfile: { clientId: string; clientName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RoleSelector" component={RoleSelectorScreen} />
        <Stack.Screen name="FamilyApp" component={FamilyTabNavigator} />
        <Stack.Screen name="CaregiverApp" component={CaregiverTabNavigator} />
        <Stack.Screen name="LogNote" component={require('../screens/caregiver/LogNoteScreen').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Escalation" component={require('../screens/caregiver/EscalationScreen').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ScanQR" component={require('../screens/caregiver/ScanQRScreen').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ClientProfile" component={require('../screens/caregiver/ClientProfileScreen').default} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
