/* ═══════════════════════════════════════
   login.js — ระบบ Login / Logout
   ═══════════════════════════════════════ */

import { LOGIN_USERS, SESSION_KEY } from "./config.js";

/** ตรวจสอบว่า login อยู่หรือไม่ */
export function isLoggedIn() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    return s && s.username;
  } catch { return false; }
}

/** ดึง username ปัจจุบัน */
export function currentUser() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    return s?.username || "";
  } catch { return ""; }
}

/** Login — คืน true ถ้าสำเร็จ */
export function doLogin(username, password) {
  const u = username.trim().toLowerCase();
  if (LOGIN_USERS[u] && LOGIN_USERS[u] === password) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: u, ts: Date.now() }));
    return true;
  }
  return false;
}

/** Logout */
export function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  showLoginScreen();
}

/* ─── UI helpers ─── */
export function showLoginScreen() {
  document.getElementById("loginOverlay").style.display  = "flex";
  document.getElementById("appShell").style.display      = "none";
  document.getElementById("loginError").textContent      = "";
  document.getElementById("loginUsername").value         = "";
  document.getElementById("loginPassword").value         = "";
}

export function showApp() {
  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("appShell").style.display     = "block";
  document.getElementById("loggedInUser").textContent   = currentUser();
}

/* ─── Handle login form submit ─── */
export async function handleLogin() {
  const u  = document.getElementById("loginUsername").value;
  const p  = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginError");

  if (!u || !p) { err.textContent = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"; return; }

  if (doLogin(u, p)) {
    // ถ้า username === "admin" ให้เปิด admin mode อัตโนมัติ
    if (u === "admin") {
      window.__autoAdmin__ = true;
    }
    // เริ่ม init แอป (main.js expose ไว้)
    if (typeof window.__initApp__ === "function") {
      await window.__initApp__();
    } else {
      showApp();
    }
  } else {
    err.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
    document.getElementById("loginPassword").value = "";
  }
}

// expose
window.handleLogin  = handleLogin;
window.doLogout     = doLogout;
