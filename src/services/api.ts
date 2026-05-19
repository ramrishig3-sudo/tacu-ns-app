/// <reference types="vite/client" />

/**
 * TacU-NS: Network Security Pro — Centralized API Client
 * All frontend API calls MUST go through this client to ensure:
 * 1. Correct base URL for dev/production/mobile (Capacitor Android)
 * 2. Consistent error handling
 * 3. Request timeouts
 *
 * IMPORTANT: The production API URL is hardcoded as the fallback.
 * This ensures the Android APK always has a valid backend URL even if
 * VITE_API_BASE_URL was not available at build time.
 */
import axios from "axios";

const PRODUCTION_API = "https://api.tacuns.net";

// Auto-detect environment: Use localhost if origin is localhost, otherwise use PRODUCTION_API
// This allows local dev/testing of server.ts without manual .env changes.
let API_BASE = PRODUCTION_API;

if (typeof window !== "undefined") {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocal && import.meta.env.DEV) {
    API_BASE = "http://localhost:3000";
  }
}

// Override with env var if explicitly set
if (import.meta.env.VITE_API_BASE_URL) {
  API_BASE = import.meta.env.VITE_API_BASE_URL;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out. Mobile signal may be weak."));
    }
    
    // Check for common signs of carrier blocking (ERR_CONNECTION_REFUSED or DNS failures)
    if (!error.response) {
      const isMobile = /Android|iPhone/i.test(navigator.userAgent);
      let msg = "Network error. Please check your connection.";
      if (isMobile) {
        msg = "Unable to reach security server. This is common on mobile data (Airtel/Jio/VI). Try using a VPN or WiFi.";
      }
      return Promise.reject(new Error(msg));
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
