/// <reference types="vite/client" />

/**
 * CyberShield Pro — Centralized API Client
 * All frontend API calls MUST go through this client to ensure:
 * 1. Correct base URL for dev/production/mobile
 * 2. Consistent error handling
 * 3. Request timeouts
 */
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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
      return Promise.reject(new Error("Request timed out. Please try again."));
    }
    if (!error.response) {
      return Promise.reject(new Error("Network error. Please check your connection."));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
