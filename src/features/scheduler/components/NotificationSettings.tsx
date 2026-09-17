import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  notificationSupport,
  requestNotificationPermission,
  showSchedulerNotification,
} from "@/features/scheduler/notifications";
import {
  notificationsEnabledPref,
  setNotificationsEnabledPref,
} from "@/features/scheduler/reminders";

export function NotificationSettings() {
  const [permission, setPermission] = useState(notificationSupport());
  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined" ? true : notificationsEnabledPref(),
  );

  useEffect(() => {
    setPermission(notificationSupport());
  }, []);

  async function enable() {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === "granted") {
      setNotificationsEnabledPref(true);
      setEnabled(true);
    }
  }

  function disable() {
    setNotificationsEnabledPref(false);
    setEnabled(false);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-sm">
      <h2 className="font-serif text-xl font-semibold">Notifications</h2>
      <p className="mt-2 text-muted-foreground">
        Folio can remind you about upcoming study events while this tab is open.
        Browsers cannot reliably notify you after the app is closed.
      </p>
      <p className="mt-3">
        Status:{" "}
        {permission === "unsupported"
          ? "Not supported in this browser"
          : permission === "granted"
            ? enabled
              ? "Allowed and enabled"
              : "Allowed, but turned off in Folio"
            : permission === "denied"
              ? "Blocked by the browser"
              : "Not requested yet"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {permission !== "granted" && permission !== "unsupported" ? (
          <Button type="button" size="sm" onClick={() => void enable()}>
            Enable notifications
          </Button>
        ) : null}
        {permission === "granted" && enabled ? (
          <Button type="button" size="sm" variant="outline" onClick={disable}>
            Disable in Folio
          </Button>
        ) : null}
        {permission === "granted" && !enabled ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setNotificationsEnabledPref(true);
              setEnabled(true);
            }}
          >
            Turn on in Folio
          </Button>
        ) : null}
        {permission === "granted" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              showSchedulerNotification("Study Session", "Math — 15 minutes from now")
            }
          >
            Send test notification
          </Button>
        ) : null}
      </div>
    </section>
  );
}
