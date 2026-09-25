import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { chooseContact, requestAssistance, type AssistanceResult, type EmergencyContact } from '../../lib/assistance';

type Props = { visible: boolean; residentId: string | null; contacts: EmergencyContact[]; onClose: () => void };

// Resident-facing: text >= 22pt, controls >= 80pt. Reports the real result;
// never says help is coming when it could not be delivered.
export default function AssistanceModal({ visible, residentId, contacts, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<AssistanceResult | null>(null);
  const { contact, night } = chooseContact(contacts);

  const close = () => {
    if (sending) return;
    setResult(null);
    onClose();
  };

  const send = async () => {
    if (!residentId) return;
    setSending(true);
    const res = await requestAssistance(residentId, contacts);
    setSending(false);
    setResult(res);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {result === null ? (
            <>
              <Feather name="alert-triangle" size={56} color={Colors.danger} style={styles.glyph} />
              <Text style={styles.title}>Send a request for help?</Text>
              {contact ? (
                <Text style={styles.contactLine}>
                  {night ? 'It is night time. ' : ''}We will contact {contact.name} now.
                </Text>
              ) : (
                <Text style={styles.contactLine}>No contact is on record yet.</Text>
              )}
              <Text style={styles.smallPrint}>This is not an emergency service. In a medical emergency call 144.</Text>
              <TouchableOpacity style={styles.yes} onPress={send} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.yesText}>Yes, I need help</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.no} onPress={close} disabled={sending}>
                <Text style={styles.noText}>No, I am fine</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.failure}>
                {result.contact
                  ? `We could not reach ${result.contact.name} through the app. Please telephone them, or call 144 in an emergency.`
                  : 'We could not find a contact to reach. Please call 144 in an emergency.'}
              </Text>
              {result.contact?.phone ? (
                <TouchableOpacity style={styles.yes} onPress={() => Linking.openURL(`tel:${result.contact!.phone}`)}>
                  <Text style={styles.yesText}>Call {result.contact.name}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.no} onPress={close}>
                <Text style={styles.noText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.smallPrint}>This is not an emergency service. In a medical emergency call 144.</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 28 },
  glyph: { alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  contactLine: { fontSize: 22, color: Colors.textSecondary, textAlign: 'center', marginTop: 12 },
  smallPrint: { fontSize: 22, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginVertical: 16 },
  failure: { fontSize: 24, color: Colors.danger, textAlign: 'center', marginBottom: 20 },
  yes: { height: 80, borderRadius: 14, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  yesText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  no: { height: 80, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  noText: { fontSize: 24, fontWeight: '700', color: Colors.textSecondary },
});
