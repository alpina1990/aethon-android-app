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
  ClientProfile: { clientId: string; clientName: string; baselineJustSaved?: boolean; careStageJustSaved?: boolean; escalationJustRecorded?: boolean };
  PhysicianEscalation: { clientId: string; clientName: string; physicianName: string | null; physicianEmail: string | null };
  Baseline: { clientId: string; clientName: string };
  CareStageModal: { clientId: string; clientName: string; currentStage: string | null };
  VoiceNote: { clientId: string; clientName: string };
  ManualNoteEdit: { noteId: string };
  NoteReview: { noteId: string };
  UnreviewedNotes: undefined;
  AwaitingOutcome: undefined;
  Handover: undefined;
  ResidentOnboarding: undefined;
  ResidentHome: undefined;
  Acknowledge: { medicationId: string; name: string; dose: string | null; time: string };
  Observation: { clientId: string; clientName: string; mode: 'carer' | 'resident' | 'family' };
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
        <Stack.Screen name="Baseline" component={require('../screens/caregiver/BaselineScreen').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="CareStageModal" component={require('../screens/caregiver/CareStageModal').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="VoiceNote" component={require('../screens/caregiver/VoiceNoteScreen').default} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="ManualNoteEdit" component={require('../screens/caregiver/ManualNoteEditScreen').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="NoteReview" component={require('../screens/caregiver/NoteReviewScreen').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="UnreviewedNotes" component={require('../screens/caregiver/UnreviewedNotesScreen').default} />
        <Stack.Screen name="ResidentOnboarding" component={require('../screens/resident/ResidentOnboarding').default} options={{ gestureEnabled: false }} />
        <Stack.Screen name="ResidentHome" component={require('../screens/resident/ResidentHomeScreen').default} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Acknowledge" component={require('../screens/resident/AcknowledgeScreen').default} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Handover" component={require('../screens/caregiver/HandoverScreen').default} />
        <Stack.Screen name="AwaitingOutcome" component={require('../screens/caregiver/AwaitingOutcomeScreen').default} />
        <Stack.Screen name="PhysicianEscalation" component={require('../screens/caregiver/PhysicianEscalationScreen').default} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Observation" component={require('../screens/shared/ObservationScreen').default} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
