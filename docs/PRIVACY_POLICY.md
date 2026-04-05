# Privacy Policy — CyberShield Pro

**Last Updated:** April 5, 2026

## Overview

CyberShield Pro ("the App") is a cybersecurity analysis tool developed for educational and security monitoring purposes. This privacy policy explains what data we collect, how we use it, and how we protect it.

---

## 1. Data We Collect

### 1.1 User-Provided Data
- **IP Addresses**: When you scan an IP address, it is sent to our backend for threat analysis.
- **Text Input**: Messages sent to the AI Assistant for security advice.
- **Email Headers**: Raw email header text pasted for analysis (processed locally, not stored).

### 1.2 Automatically Collected Data
- **Device Token**: If you enable push notifications, your device's FCM token is stored to deliver security alerts.
- **Scan History**: IP scan results are stored in our database for caching (24-hour dedup) and history display.
- **Audit Logs**: Anonymized logs of scan requests for performance monitoring.

### 1.3 Data We Do NOT Collect
- Personal identification information (name, email, phone)
- Location data
- Contacts, photos, or files (file analysis is processed in-memory only)
- Browsing history

---

## 2. How We Use Data

| Data | Purpose | Retention |
|------|---------|-----------|
| IP Addresses | Threat analysis via VirusTotal and AlienVault OTX | 30 days |
| AI Messages | Processed by Groq AI for security advice | Not stored |
| Device Tokens | Push notifications for threat alerts | Until unregistered |
| Scan Logs | Performance monitoring and abuse prevention | 30 days |

---

## 3. Third-Party Services

We use the following third-party APIs to provide threat intelligence:

- **VirusTotal** ([virustotal.com](https://www.virustotal.com)) — IP reputation and malware scanning
- **AlienVault OTX** ([otx.alienvault.com](https://otx.alienvault.com)) — Threat intelligence feeds
- **Groq** ([groq.com](https://groq.com)) — AI-powered security assistant
- **Supabase** ([supabase.com](https://supabase.com)) — Database for scan results
- **Firebase** ([firebase.google.com](https://firebase.google.com)) — Push notifications

Each service has its own privacy policy. IP addresses are shared with VirusTotal and OTX solely for threat analysis purposes.

---

## 4. Data Security

- All API keys are stored server-side and never exposed to the client application
- Communication between the app and backend uses HTTPS encryption
- Database access is controlled via Row Level Security (RLS) policies
- No sensitive user data is stored on the device

---

## 5. Push Notifications

- Push notifications are optional and require explicit user consent
- Notifications are sent only when a scanned IP is classified as HIGH RISK
- You can disable notifications at any time through your device settings

---

## 6. Children's Privacy

This application is not directed at children under the age of 13. We do not knowingly collect personal information from children.

---

## 7. Data Deletion

To request deletion of your scan history or device token:
- Contact: [your-email@domain.com]
- Or clear app data through your device settings

---

## 8. Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected by updating the "Last Updated" date at the top of this document.

---

## 9. Contact

For questions about this privacy policy, please contact:
- Email: [your-email@domain.com]
- App: CyberShield Pro

---

## 10. Consent

By using CyberShield Pro, you consent to this privacy policy and agree to its terms.
