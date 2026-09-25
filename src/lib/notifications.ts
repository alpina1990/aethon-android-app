// Local medication reminders only. No push tokens. expo-notifications is a
// native module, so it is loaded lazily and every call is safe to fail.

export type ReminderTap = { medicationId: string; name: string; dose: string | null; time: string };

type ReminderMedication = { id: string; name: string; dose: string | null; scheduled_times: string[] | null };

let handledResponseId: string | null = null;

async function load() {
  return await import('expo-notifications');
}

export async function setupNotifications(): Promise<void> {
  try {
    const Notifications = await load();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    await Notifications.setNotificationChannelAsync('medication', {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch {
    // Reminders are optional; the app works without them.
  }
}

// Replaces every scheduled medication reminder with one daily reminder per
// medication time, so a changed medication list never leaves duplicates.
export async function scheduleReminders(medications: ReminderMedication[]): Promise<void> {
  try {
    const Notifications = await load();
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (n.content.data?.type === 'medication') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    for (const med of medications) {
      for (const time of med.scheduled_times ?? []) {
        const [hour, minute] = time.split(':').map(Number);
        if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `med_${med.id}_${time}`,
          content: {
            title: 'Time for your medication',
            body: `${med.name}${med.dose ? ` - ${med.dose}` : ''}`,
            data: { type: 'medication', medicationId: med.id, name: med.name, dose: med.dose, time },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: 'medication',
          },
        });
      }
    }
  } catch {
    // Reminders are optional; the app works without them.
  }
}

function toTap(data: Record<string, unknown> | undefined): ReminderTap | null {
  if (!data || data.type !== 'medication' || typeof data.medicationId !== 'string') return null;
  return {
    medicationId: data.medicationId,
    name: String(data.name ?? ''),
    dose: typeof data.dose === 'string' ? data.dose : null,
    time: String(data.time ?? ''),
  };
}

// Calls onTap when a reminder is tapped, including the tap that launched the
// app. Returns an unsubscribe function.
export async function listenForReminderTaps(onTap: (tap: ReminderTap) => void): Promise<() => void> {
  try {
    const Notifications = await load();

    const last = await Notifications.getLastNotificationResponseAsync();
    if (last && last.notification.request.identifier + last.notification.date !== handledResponseId) {
      handledResponseId = last.notification.request.identifier + last.notification.date;
      const tap = toTap(last.notification.request.content.data);
      if (tap) onTap(tap);
    }

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      handledResponseId = response.notification.request.identifier + response.notification.date;
      const tap = toTap(response.notification.request.content.data);
      if (tap) onTap(tap);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
