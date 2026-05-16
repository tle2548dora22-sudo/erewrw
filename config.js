/* ═══════════════════════════════════════
   config.js — ค่าคงที่และ API config
   ═══════════════════════════════════════ */

export const API_URL = "https://asl-api-yoo3.onrender.com/predict";
export const USE_MIRROR_LANDMARKS = true;
export const REQUIRED_SAME_COUNT  = 3;
export const MIN_CONFIDENCE       = 0.60;
export const SEND_INTERVAL_MS     = 350;
export const ACCEPT_COOLDOWN_MS   = 800;
export const API_TIMEOUT_MS       = 8000;

export const ADMIN_PASSWORD = "048061"; // DEMO ONLY

// ── Login system config ──
export const LOGIN_USERS = {
  // username: password  (DEMO ONLY – ใน production ใช้ backend auth)
  "user":  "asl2024",
  "admin": "048061",
};
export const SESSION_KEY = "asl_session";
