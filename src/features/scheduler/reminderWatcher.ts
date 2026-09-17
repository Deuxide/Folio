import {
  dueReminders,
  loadFiredReminders,
  notificationsEnabledPref,
  reminderLabel,
  saveFiredReminders,
} from "@/features/scheduler/reminders";
import { showSchedulerNotification } from "@/features/scheduler/notifications";
import { StudyEventRepository } from "@/repositories/StudyEventRepository";

let intervalId: number | null = null;
let ticking = false;

async function tick() {
  if (ticking || document.visibilityState === "hidden") {
    return;
  }
  if (!notificationsEnabledPref()) {
    return;
  }
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  ticking = true;
  try {
    const events = await StudyEventRepository.getAll();
    const fired = loadFiredReminders();
    const due = dueReminders(events, Date.now(), fired);
    for (const reminder of due) {
      const subject = reminder.occurrence.source.subject;
      const when = reminderLabel(reminder.minutes);
      showSchedulerNotification(
        reminder.occurrence.source.title,
        subject ? `${subject} — ${when}` : when,
      );
      fired.add(reminder.id);
    }
    if (due.length > 0) {
      saveFiredReminders(fired);
    }
  } catch {
    // Keep the study app usable if reminder checks fail.
  } finally {
    ticking = false;
  }
}

export function startReminderWatcher() {
  if (intervalId !== null) {
    return;
  }
  void tick();
  intervalId = window.setInterval(() => {
    void tick();
  }, 60_000);
}

export function stopReminderWatcher() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}
