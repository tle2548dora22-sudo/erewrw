/* ═══════════════════════════════════════
   sentence.js — ประโยค / TTS / ประวัติ
   ═══════════════════════════════════════ */

import { t } from "./i18n.js";

export let sentence = "";
export let history  = [];

const sentenceEl    = document.getElementById("sentenceText");
const historyListEl = document.getElementById("historyList");
const statusEl      = document.getElementById("statusText");
const autoSpeakBtn  = document.getElementById("autoSpeakBtn");

export let autoSpeak = false;

export function setStatus(msg) { statusEl.textContent = msg; }

/* ─── Sentence ─── */
let _saveTimer = null;
export function updateSentence() {
  sentenceEl.textContent = sentence || "";
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem("asl_current_sentence", sentence); } catch(_) {}
  }, 500);
}

export function addSpace() {
  if (sentence && !sentence.endsWith(" ")) { sentence += " "; updateSentence(); }
}
export function deleteLast() {
  if (sentence.length > 0) { sentence = sentence.slice(0, -1); updateSentence(); }
}
export function clearSentence() { sentence = ""; updateSentence(); }

export function addLetterToSentence(letter) {
  sentence += letter;
  updateSentence();
  if (autoSpeak) speakText(letter);
  const el = document.getElementById("currentLetter");
  el.classList.add("pop");
  setTimeout(() => el.classList.remove("pop"), 150);
}

/* ─── TTS ─── */
export function speakSentence(lang) {
  if (!sentence.trim()) { setStatus(t(lang, "noTextSpeak")); return; }
  speakText(sentence, lang);
  saveToHistory(lang);
}
export function speakText(text, lang = window.__lang__ || "th") {
  if (!("speechSynthesis" in window)) { setStatus("TTS not supported"); return; }
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = lang === "th" ? "th-TH" : "en-US";
  utt.rate   = 0.9;
  window.speechSynthesis.speak(utt);
}
export function toggleAutoSpeak() {
  autoSpeak = !autoSpeak;
  autoSpeakBtn.textContent = autoSpeak ? "Auto Speak: On" : "Auto Speak: Off";
  autoSpeakBtn.className   = autoSpeak ? "btn-green" : "btn-yellow";
  try { localStorage.setItem("asl_auto_speak", autoSpeak ? "1" : "0"); } catch(_) {}
}

/* ─── History ─── */
export function saveToHistory(lang = window.__lang__ || "th") {
  const text = sentence.trim();
  if (!text) { setStatus(t(lang, "noTextSave")); return; }
  history.unshift({ text, time: new Date().toLocaleTimeString() });
  history = history.slice(0, 30);
  try { localStorage.setItem("asl_history", JSON.stringify(history)); } catch(_) {}
  renderHistory(lang);
  setStatus(t(lang, "saved"));
}
export function renderHistory(lang = window.__lang__ || "th") {
  historyListEl.innerHTML = "";
  if (!history.length) {
    historyListEl.innerHTML = `<div class="small">${t(lang, "noHistory")}</div>`;
    return;
  }
  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div>${item.text}</div><div class="small">${item.time}</div>`;
    div.onclick   = () => { sentence = item.text; updateSentence(); };
    historyListEl.appendChild(div);
  });
}

export function loadSentenceState() {
  try {
    sentence  = localStorage.getItem("asl_current_sentence") || "";
    history   = JSON.parse(localStorage.getItem("asl_history") || "[]");
    autoSpeak = localStorage.getItem("asl_auto_speak") === "1";
  } catch(_) {
    sentence = ""; history = []; autoSpeak = false;
  }
  autoSpeakBtn.textContent = autoSpeak ? "Auto Speak: On" : "Auto Speak: Off";
  autoSpeakBtn.className   = autoSpeak ? "btn-green" : "btn-yellow";
  updateSentence();
}

window.addSpace        = addSpace;
window.deleteLast      = deleteLast;
window.clearSentence   = clearSentence;
window.speakSentence   = () => speakSentence(window.__lang__);
window.toggleAutoSpeak = toggleAutoSpeak;
window.saveToHistory   = () => saveToHistory(window.__lang__);
