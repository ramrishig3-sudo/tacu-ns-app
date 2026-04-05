/**
 * CyberShield Pro — Firebase Admin (Server-side)
 * Used by Vercel functions and Express server to send push notifications.
 * Uses Firebase Admin SDK — NEVER use on frontend.
 */
import admin from "firebase-admin";

let initialized = false;

function initFirebase() {
  if (initialized || admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.warn("[Firebase] Missing credentials — push notifications disabled");
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    initialized = true;
    console.log("[Firebase] Admin SDK initialized");
  } catch (err: any) {
    console.error("[Firebase] Init error:", err.message);
  }
}

// ── Send Push Notification ───────────────────────────────
export async function sendThreatNotification(
  tokens: string[],
  ip: string,
  riskLevel: string
) {
  initFirebase();

  if (!initialized || tokens.length === 0) {
    console.warn("[Firebase] Skipping notification — no tokens or not initialized");
    return { sent: 0, failed: 0 };
  }

  const message = {
    notification: {
      title: "⚠️ Threat Detected",
      body: `Scanned IP ${ip} is marked as ${riskLevel} risk. Take action immediately.`,
    },
    data: {
      type: "threat_alert",
      ip,
      risk_level: riskLevel,
      timestamp: new Date().toISOString(),
    },
    android: {
      priority: "high" as const,
      notification: {
        channelId: "threat_alerts",
        priority: "max" as const,
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
  };

  let sent = 0;
  let failed = 0;

  for (const token of tokens) {
    try {
      await admin.messaging().send({ ...message, token });
      sent++;
    } catch (err: any) {
      console.error(`[Firebase] Failed to send to token: ${err.message}`);
      failed++;
    }
  }

  console.log(`[Firebase] Notifications sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}
