/* ═══════════════════════════════════════
   camera.js — กล้อง + MediaPipe + API prediction
   ═══════════════════════════════════════ */

import {
  API_URL, USE_MIRROR_LANDMARKS,
  REQUIRED_SAME_COUNT, MIN_CONFIDENCE,
  SEND_INTERVAL_MS, ACCEPT_COOLDOWN_MS, API_TIMEOUT_MS,
} from "./config.js";
import { t }                             from "./i18n.js";
import { setStatus, addLetterToSentence } from "./sentence.js";

const video           = document.getElementById("video");
const outputCanvas    = document.getElementById("outputCanvas");
const outputCtx       = outputCanvas.getContext("2d");
const currentLetterEl = document.getElementById("currentLetter");
const confidenceEl    = document.getElementById("confidenceText");
const cameraStatusEl  = document.getElementById("cameraStatus");
const systemBadgeEl   = document.getElementById("systemBadge");
const startBtn        = document.getElementById("startBtn");
const overlayEl       = document.getElementById("permissionOverlay");

let cameraObj       = null;
let handsObj        = null;
export let isCameraRunning = false;

let lastSentTime    = 0;
let lastSeenLetter  = "";
let sameLetterCount = 0;
let acceptCooldown  = false;

function setBadge(key)     { systemBadgeEl.textContent = t(window.__lang__, key); }
function setCamStatus(key) { cameraStatusEl.textContent = t(window.__lang__, key); }

export async function startCameraFromOverlay() {
  const ok = await startCamera();
  if (ok) overlayEl.style.display = "none";
}

export async function startCamera() {
  if (isCameraRunning) { setStatus(t(window.__lang__, "cameraStarted")); return true; }
  setStatus(t(window.__lang__, "loading"));
  startBtn.disabled = true;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Browser/HTTPS not supported"); return false;
    }
    if (typeof Hands === "undefined" || typeof Camera === "undefined") {
      setStatus("MediaPipe not loaded – check internet connection"); return false;
    }

    await destroyMediaPipe();

    handsObj = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    handsObj.setOptions({
      maxNumHands: 1, modelComplexity: 1,
      minDetectionConfidence: 0.6, minTrackingConfidence: 0.6,
    });
    handsObj.onResults(onHandResults);

    cameraObj = new Camera(video, {
      onFrame: async () => { if (handsObj && isCameraRunning) await handsObj.send({ image: video }); },
      width: 640, height: 480,
    });

    await cameraObj.start();

    isCameraRunning = true;
    lastSentTime    = 0;
    sameLetterCount = 0;
    lastSeenLetter  = "";
    acceptCooldown  = false;

    setCamStatus("live");
    setBadge("running");
    setStatus(t(window.__lang__, "cameraStarted"));
    return true;

  } catch (err) {
    setCamStatus("blocked");
    setBadge("stopped");
    const errMap = { NotAllowedError:"denied", NotFoundError:"notFound", NotReadableError:"notReadable" };
    setStatus(t(window.__lang__, errMap[err.name] || "apiFailed") || err.message);
    return false;
  } finally {
    startBtn.disabled = false;
  }
}

export async function destroyMediaPipe() {
  isCameraRunning = false;
  if (cameraObj) { try { cameraObj.stop(); } catch(_) {} cameraObj = null; }
  if (handsObj)  { try { await handsObj.close(); } catch(_) {} handsObj = null; }
  await new Promise(r => setTimeout(r, 80));
}

export async function stopCamera() {
  await destroyMediaPipe();
  lastSentTime = 0; sameLetterCount = 0; lastSeenLetter = ""; acceptCooldown = false;
  currentLetterEl.textContent = "-";
  confidenceEl.textContent    = "Confidence: -";
  setCamStatus("cameraOff");
  setBadge("stopped");
  setStatus(t(window.__lang__, "cameraStopped"));
}

function onHandResults(results) {
  if (!isCameraRunning) return;

  outputCanvas.width  = results.image.width;
  outputCanvas.height = results.image.height;
  outputCtx.save();
  outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);

  if (results.multiHandLandmarks?.length > 0) {
    const lms = results.multiHandLandmarks[0];
    drawConnectors(outputCtx, lms, HAND_CONNECTIONS, { color: "#3b82f6", lineWidth: 4 });
    drawLandmarks(outputCtx, lms, { color: "#f59e0b", lineWidth: 2 });
    maybeSendToApi(lms);
  } else {
    currentLetterEl.textContent = "-";
    confidenceEl.textContent    = "Confidence: -";
    setStatus(t(window.__lang__, "noHand"));
    sameLetterCount = 0;
    lastSeenLetter  = "";
  }

  outputCtx.restore();
}

function normalizeLandmarks(raw) {
  const lms = USE_MIRROR_LANDMARKS ? raw.map(lm => ({ x: 1 - lm.x, y: lm.y, z: lm.z })) : raw;
  const wrist = lms[0];
  const arr = [];
  for (const lm of lms) arr.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
  return arr;
}

function maybeSendToApi(handLandmarks) {
  const now = Date.now();
  if (now - lastSentTime < SEND_INTERVAL_MS) return;
  lastSentTime = now;
  sendLandmarks(handLandmarks);
}

async function sendLandmarks(handLandmarks) {
  if (!isCameraRunning) return;
  const arr = normalizeLandmarks(handLandmarks);
  if (arr.length !== 63) { setStatus("Landmarks error: length=" + arr.length); return; }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const res = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ landmarks: arr }),
      signal:  controller.signal,
    });
    clearTimeout(timer);

    if (!isCameraRunning) return;

    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch(e) { throw new Error("Invalid JSON: " + raw.slice(0, 100)); }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const letter = String(data.prediction ?? data.letter ?? data.label ?? data.class ?? "-").trim().toUpperCase();
    let confidence = Number(data.confidence ?? data.score ?? data.probability ?? 0);
    if (confidence > 1) confidence /= 100;
    confidence = Math.min(1, Math.max(0, confidence));

    currentLetterEl.textContent = letter || "-";
    confidenceEl.textContent    = `Confidence: ${(confidence * 100).toFixed(1)}%`;

    if (letter && letter !== "-") {
      if (confidence >= MIN_CONFIDENCE) {
        setStatus(t(window.__lang__, "apiSuccess"));
        handlePrediction(letter);
      } else {
        setStatus(`${t(window.__lang__, "lowConfidence")} (${(confidence * 100).toFixed(1)}%)`);
        sameLetterCount = 0; lastSeenLetter = "";
      }
    }
  } catch (err) {
    if (!isCameraRunning) return;
    setStatus(err.name === "AbortError" ? "API timeout (8s)" : t(window.__lang__, "apiFailed"));
  }
}

function handlePrediction(letter) {
  if (acceptCooldown) return;
  if (letter === lastSeenLetter) { sameLetterCount++; }
  else { lastSeenLetter = letter; sameLetterCount = 1; }
  if (sameLetterCount >= REQUIRED_SAME_COUNT) {
    addLetterToSentence(letter);
    sameLetterCount = 0; lastSeenLetter = "";
    acceptCooldown  = true;
    setTimeout(() => { acceptCooldown = false; }, ACCEPT_COOLDOWN_MS);
  }
}

window.startCameraFromOverlay = startCameraFromOverlay;
window.startCamera            = startCamera;
window.stopCamera             = stopCamera;
