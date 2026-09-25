import { supabase } from './supabase';

export type EmergencyContact = { name: string; relationship: string; phone: string; priority: number };

export type AssistanceResult = {
  recorded: boolean;
  delivered: boolean;
  contact: EmergencyContact | null;
};

// Priority two at night (22:00-07:59), priority one otherwise; falls back to
// the first contact when that priority is missing.
export function chooseContact(contacts: EmergencyContact[], now: Date = new Date()): { contact: EmergencyContact | null; night: boolean } {
  const hour = now.getHours();
  const night = hour >= 22 || hour < 8;
  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);
  const contact = sorted.find(c => c.priority === (night ? 2 : 1)) ?? sorted[0] ?? null;
  return { contact, night };
}

// No notification channel to contacts exists yet, so delivered is always
// false and the screen tells the resident to telephone.
export async function requestAssistance(residentId: string, contacts: EmergencyContact[]): Promise<AssistanceResult> {
  const { contact } = chooseContact(contacts);
  if (!contact) return { recorded: false, delivered: false, contact: null };

  const { error } = await supabase.from('assistance_requests').insert({
    resident_id: residentId,
    contacted_name: contact.name,
    contacted_phone: contact.phone,
    escalation_level: 1,
    delivered: false,
  });
  return { recorded: !error, delivered: false, contact };
}
