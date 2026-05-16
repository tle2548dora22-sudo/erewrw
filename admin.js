/* ═══════════════════════════════════════
   admin.js — Admin login / logout
   ═══════════════════════════════════════ */

import { ADMIN_PASSWORD } from "./config.js";
import { renderClips }    from "./clips.js";

export let isAdmin = false;

export function adminLogin(lang) {
  const pw  = document.getElementById("adminPasswordInput").value;
  const msg = document.getElementById("adminStatusMsg");

  if (pw === ADMIN_PASSWORD) {
    isAdmin = true;
    document.body.classList.add("admin-mode");
    document.getElementById("adminLoginBtn").style.display      = "none";
    document.getElementById("adminLogoutBtn").style.display     = "inline-block";
    document.getElementById("adminPasswordInput").style.display = "none";
    document.getElementById("adminLabel").textContent           = "👑 Admin Mode";
    document.getElementById("adminUploadSection").style.display = "block";
    msg.textContent = lang === "th" ? "เข้าสู่ระบบ Admin สำเร็จ" : "Admin login successful.";
    msg.className   = "admin-status-msg ok";
    renderClips();
  } else {
    msg.textContent = lang === "th" ? "รหัสผ่านไม่ถูกต้อง" : "Incorrect password.";
    msg.className   = "admin-status-msg err";
  }
}

export function adminLogout() {
  isAdmin = false;
  document.body.classList.remove("admin-mode");
  document.getElementById("adminLoginBtn").style.display      = "inline-block";
  document.getElementById("adminLogoutBtn").style.display     = "none";
  document.getElementById("adminPasswordInput").style.display = "inline-block";
  document.getElementById("adminPasswordInput").value         = "";
  document.getElementById("adminLabel").textContent           = "🔐 Admin Login:";
  document.getElementById("adminUploadSection").style.display = "none";
  document.getElementById("adminStatusMsg").textContent       = "";
  renderClips();
}

/** เรียกจาก main.js เมื่อ login ด้วย username "admin" */
export function autoAdminLogin() {
  isAdmin = true;
  document.body.classList.add("admin-mode");
  const loginBtn    = document.getElementById("adminLoginBtn");
  const logoutBtn   = document.getElementById("adminLogoutBtn");
  const pwInput     = document.getElementById("adminPasswordInput");
  const adminLabel  = document.getElementById("adminLabel");
  const uploadSec   = document.getElementById("adminUploadSection");
  const msg         = document.getElementById("adminStatusMsg");
  if (loginBtn)   loginBtn.style.display   = "none";
  if (logoutBtn)  logoutBtn.style.display  = "inline-block";
  if (pwInput)    pwInput.style.display    = "none";
  if (adminLabel) adminLabel.textContent   = "👑 Admin Mode";
  if (uploadSec)  uploadSec.style.display  = "block";
  if (msg)        msg.textContent          = "";
  renderClips();
}

window.adminLogin  = () => adminLogin(window.__lang__);
window.adminLogout = adminLogout;
