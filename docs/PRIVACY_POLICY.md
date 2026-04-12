# Privacy Policy — TacU-NS

**Last Updated:** April 12, 2026
**Version:** 1.0.0 (Production Release)

## 1. Overview
TacU-NS ("the App") is a professional-grade cybersecurity analysis and network intelligence tool. We prioritize data locality and transparency. This policy outlines our data processing practices for WiFi scanning, location services, and network diagnostics.

---

## 2. Data Collection & Usage

### 2.1 Network & WiFi Intelligence
To provide network analysis, the app scans for:
- **SSIDs/BSSIDs**: To identify local wireless networks and their security protocols.
- **Signal Strength (RSSI)**: For perimeter mapping and signal quality analysis.
- **Port Data**: Scanning internal and external IPs for open ports and services.
*Usage: This data is processed locally to visualize your security posture.*

### 2.2 Location Services (GPS) — Prominent Disclosure
The App requires location access ONLY while the app is in use for the following purposes:
- **WiFi SSID Discovery**: Modern mobile OSs (Android 10+) require location permissions to perform WiFi scanning.
- **Map Vector Integration**: Visualizing network nodes and WiFi signals on a geographical map.
*Usage: Location data is processed locally on your device, used only during active session mapping, and is NEVER stored on our servers or shared with third parties. We DO NOT track your location in the background.*

### 2.3 Threat Intelligence
- **IP Reputation**: When you query an IP address, it is proxied through encrypted TacU nodes to reach threat feeds (VirusTotal, AlienVault).
- **AI Assistant**: Conversations are processed in real-time to provide security advice and are not used for training models.

---

## 3. Data Locality & Security
- **Strict Device-First Policy**: All raw packet data and network topology remains on your device.
- **Zero-Logs VPN**: The Privacy Shield module does not log traffic destinations or content.
- **Encrypted Channels**: All communication between the app and intelligence nodes uses HTTPS/TLS 1.3.

---

## 4. User Rights & Permissions
You have full control over:
- **Location Access**: Can be disabled in system settings (may limit WiFi scanning).
- **Push Notifications**: Optional for high-risk threat alerts.
- **Data Deletion**: Since we store minimal data, clearing app cache removes all local session history.

---

## 5. Contact
For questions regarding your tactical data privacy:
- Email: support@tacuns.net
- Website: [tacuns.net](https://tacuns.net)

---

## 6. Consent
By using TacU-NS, you acknowledge and agree to the tactical data processing described in this policy.
