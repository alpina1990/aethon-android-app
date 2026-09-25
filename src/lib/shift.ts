import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ACTIVE_SHIFT_KEY = '@aethon_active_shift_id';

export async function getActiveShiftId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_SHIFT_KEY);
  } catch {
    return null;
  }
}

export async function clearActiveShift(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_SHIFT_KEY);
}

export async function startShift(): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single();
  const { data, error } = await supabase
    .from('shifts')
    .insert({ carer_id: user.id, carer_name: profile?.full_name ?? null })
    .select('id')
    .single();
  if (error || !data) return null;
  await AsyncStorage.setItem(ACTIVE_SHIFT_KEY, data.id);
  return data.id;
}
