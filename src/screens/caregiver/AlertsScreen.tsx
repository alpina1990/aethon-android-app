import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useShift } from '../../context/ShiftContext';

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { pinnedResidentIds } = useShift();
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from('escalations')
        .select('*, residents(first_name, last_name, room_number)')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (pinnedResidentIds.length > 0) {
        query = query.in('resident_id', pinnedResidentIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [pinnedResidentIds]);

  const dismissAlert = async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    await supabase.from('escalations').update({ is_resolved: true }).eq('id', id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Alerts</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator color="#0f172a" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="bell-off" size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No active alerts</Text>
              <Text style={styles.emptyDesc}>You are all caught up for this shift.</Text>
            </View>
          ) : (
            alerts.map(alert => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertType}>ESCALATION</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                
                <Text style={styles.alertResident}>
                  {alert.residents?.first_name} {alert.residents?.last_name} 
                  {alert.residents?.room_number ? ` (Rm ${alert.residents.room_number})` : ''}
                </Text>
                <Text style={styles.alertMessage}>{alert.reason}</Text>
                
                <TouchableOpacity style={styles.dismissBtn} onPress={() => dismissAlert(alert.id)}>
                  <Feather name="check" size={16} color="#0f172a" />
                  <Text style={styles.dismissBtnText}>Mark Resolved</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  alertResident: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});
