// ═══════════════════════════════════════════════════════════
//  gesture.js — Dynamic Gesture (Multi-Frame Sequence) Module
//  วางไฟล์นี้ในโฟลเดอร์เดียวกับ index.html และ main.js
// ═══════════════════════════════════════════════════════════

// ── Config ──────────────────────────────────────────────────
const SEQUENCE_LENGTH   = 30;          // จำนวนเฟรมต่อ 1 ท่า
const MIN_CONFIDENCE    = 0.70;        // threshold ขั้นต่ำ
const COOLDOWN_MS       = 1500;        // ms หลังทำนายสำเร็จ (ป้องกันซ้ำ)
const API_ENDPOINT      = '/predict_sequence'; // แก้ให้ตรงกับ backend ของคุณ

// ── Internal State ──────────────────────────────────────────
let sequenceBuffer   = [];   // [[63], [63], ...] สูงสุด SEQUENCE_LENGTH เฟรม
let isCooldown       = false;
let isRequesting     = false;
let cooldownTimer    = null;

// ── Callbacks (set จาก main.js) ─────────────────────────────
let onPredictionCallback = null;   // fn({ prediction, confidence })
let onStatusCallback     = null;   // fn(text)

/** ตั้ง callback สำหรับ prediction result */
export function setOnPrediction(fn) { onPredictionCallback = fn; }

/** ตั้ง callback สำหรับ status text */
export function setOnStatus(fn) { onStatusCallback = fn; }

// ── Normalize ────────────────────────────────────────────────
/**
 * รับ landmarks array จาก MediaPipe (21 จุด, แต่ละจุดมี x/y/z)
 * คืน flat array 63 ค่า normalized โดยลบ wrist (index 0)
 */
export function normalizeLandmarks(landmarks) {
  const wrist = landmarks[0];
  const flat = [];
  for (const lm of landmarks) {
    flat.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
  }
  return flat; // length = 63
}

// ── Push Frame ───────────────────────────────────────────────
/**
 * เรียกทุกเฟรมที่ตรวจเจอมือ
 * @param {number[]} frame63  — flat array 63 ค่า (normalized แล้ว)
 */
export function pushFrame(frame63) {
  if (isCooldown || isRequesting) return;

  sequenceBuffer.push(frame63);

  // ตัด buffer ให้ไม่เกิน SEQUENCE_LENGTH
  if (sequenceBuffer.length > SEQUENCE_LENGTH) {
    sequenceBuffer.shift();
  }

  // เมื่อครบ SEQUENCE_LENGTH เฟรม → ส่ง API
  if (sequenceBuffer.length === SEQUENCE_LENGTH) {
    _sendSequence([...sequenceBuffer]);
    sequenceBuffer = []; // reset buffer หลังส่ง
  }
}

/** Reset buffer เมื่อมือหายออกจากเฟรม */
export function resetBuffer() {
  sequenceBuffer = [];
  _setStatus('ไม่พบมือ — รอท่าใหม่');
}

/** คืนจำนวนเฟรมที่เก็บไว้ใน buffer (สำหรับ progress bar) */
export function getBufferProgress() {
  return { current: sequenceBuffer.length, total: SEQUENCE_LENGTH };
}

// ── API Call ─────────────────────────────────────────────────
async function _sendSequence(sequence) {
  if (isRequesting) return;
  isRequesting = true;
  _setStatus('🔄 กำลังวิเคราะห์ท่ามือ...');

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    // expected: { prediction: "Hello", confidence: 0.92 }

    _handleResult(data);
  } catch (err) {
    console.error('[gesture.js] API error:', err);
    _setStatus(`⚠️ API error: ${err.message}`);
  } finally {
    isRequesting = false;
  }
}

function _handleResult({ prediction, confidence }) {
  const pct = Math.round((confidence ?? 0) * 100);

  if (!prediction || confidence < MIN_CONFIDENCE) {
    _setStatus(`❓ ไม่แน่ใจ (${pct}%) — ทำท่าอีกครั้ง`);
    return;
  }

  // แจ้ง main.js
  if (onPredictionCallback) {
    onPredictionCallback({ prediction, confidence });
  }

  _setStatus(`✅ "${prediction}" — ${pct}% confidence`);
  _startCooldown();
}

function _startCooldown() {
  isCooldown = true;
  if (cooldownTimer) clearTimeout(cooldownTimer);
  cooldownTimer = setTimeout(() => {
    isCooldown = false;
    _setStatus('พร้อมรับท่าใหม่');
  }, COOLDOWN_MS);
}

function _setStatus(text) {
  if (onStatusCallback) onStatusCallback(text);
}
