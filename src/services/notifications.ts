/**
 * TacU-NS — Push Notifications Service
 * Handles Capacitor Push Notifications for Android.
 * Registers device token with backend for FCM.
 */
import { registerDeviceToken } from "./supabase";

// Dynamic import to avoid issues when running in browser without Capacitor
let PushNotifications: any = null;

async function loadCapacitorPush() {
  try {
    const module = await import("@capacitor/push-notifications");
    PushNotifications = module.PushNotifications;
    return true;
  } catch {
    console.warn("[Push] Capacitor Push Notifications not available (browser mode)");
    return false;
  }
}

// ── Initialize Push Notifications ────────────────────────
export async function initPushNotifications() {
  const loaded = await loadCapacitorPush();
  if (!loaded || !PushNotifications) return;

  try {
    // Request permission
    const permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== "granted") {
        console.warn("[Push] Permission denied");
        return;
      }
    } else if (permStatus.receive !== "granted") {
      console.warn("[Push] Permission not granted");
      return;
    }

    // Register for push
    await PushNotifications.register();

    // Listen for registration success
    PushNotifications.addListener("registration", async (token: { value: string }) => {
      await registerDeviceToken(token.value);
    });

    // Listen for registration error
    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("[Push] Registration error:", error);
    });

    PushNotifications.addListener("pushNotificationReceived", (_notification: any) => {});
    PushNotifications.addListener("pushNotificationActionPerformed", (_action: any) => {});
  } catch (err) {
    console.error("[Push] Init error:", err);
  }
}

// ── Create Notification Channel (Android) ────────────────
export async function createNotificationChannel() {
  if (!PushNotifications) {
    await loadCapacitorPush();
  }
  if (!PushNotifications) return;

  try {
    await PushNotifications.createChannel({
      id: "threat_alerts",
      name: "Threat Alerts",
      description: "Notifications for detected security threats",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: "default",
    });
  } catch (err) {
    console.warn("[Push] Channel creation not supported:", err);
  }
}
