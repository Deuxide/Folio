export function notificationSupport(): "unsupported" | NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission !== "default") {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export function showSchedulerNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  const notification = new Notification(title, {
    body,
    tag: `folio-${title}-${body}`,
  });
  notification.onclick = () => {
    window.focus();
    if (!window.location.pathname.startsWith("/schedule")) {
      window.location.assign("/schedule");
    }
    notification.close();
  };
}
