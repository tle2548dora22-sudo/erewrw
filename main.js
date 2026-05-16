// ═══════════════════════════════════════════════════════════
//  main.js — ASL Detector  (Dynamic Gesture Edition)
//  รวมระบบเดิม (login, clips, admin, sentence, history, TTS)
//  + เพิ่ม dynamic gesture sequence ผ่าน gesture.js
// ═══════════════════════════════════════════════════════════
import {
  normalizeLandmarks,
  pushFrame,
  resetBuffer,
  getBufferProgress,
  setOnPrediction,
  setOnStatus,
} from './gesture.js';

// ════════════════════════════════════
//  AUTH
// ════════════════════════════════════
const USERS = { user: 'asl2024', admin: '048061' };

window.handleLogin = function () {
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');

  if (USERS[u] && USERS[u] === p) {
    currentUser = u;
    errEl.textContent = '';
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appShell').style.display = '';
    document.getElementById('loggedInUser').textContent = u;
    // แสดง admin badge เฉพาะ admin
    document.querySelector('.admin-topbar-badge').style.display =
      u === 'admin' ? '' : 'none';
    renderClips();
  } else {
    errEl.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  }
};

window.doLogout = function () {
  document.getElementById('loginOverlay').style.display = '';
  document.getElementById('appShell').style.display = 'none';
  stopCamera();
  currentUser = null;
};

let currentUser = null;

// Show login on load
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginOverlay').style.display = '';
  document.getElementById('appShell').style.display = 'none';
  document.querySelector('.admin-topbar-badge').style.display = 'none';

  // wire gesture callbacks
  setOnPrediction(handleGesturePrediction);
  setOnStatus(setStatusText);
  renderProgressBar();
});

// ════════════════════════════════════
//  NAV
// ════════════════════════════════════
window.toggleNav = function () {
  document.body.classList.toggle('nav-open');
};
document.addEventListener('click', e => {
  if (!e.target.closest('.sidenav') && !e.target.closest('.topbar-toggle')) {
    document.body.classList.remove('nav-open');
  }
});

window.goPage = function (page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.getElementById(`nav-${page}`)?.classList.add('active');
  document.body.classList.remove('nav-open');
};

// ════════════════════════════════════
//  LANGUAGE (i18n stub)
// ════════════════════════════════════
window.changeLanguage = function (lang) {
  // stub — extend as needed
  console.log('Language:', lang);
};

// ════════════════════════════════════
//  CAMERA + MEDIAPIPE
// ════════════════════════════════════
let handsModel = null;
let cameraUtil = null;
let cameraRunning = false;

const videoEl  = document.getElementById('video');
const canvasEl = document.getElementById('outputCanvas');
const ctx      = canvasEl?.getContext('2d');

window.startCameraFromOverlay = function () {
  document.getElementById('permissionOverlay').style.display = 'none';
  startCamera();
};

window.startCamera = async function () {
  if (cameraRunning) return;
  setStatusText('⏳ กำลังเปิดกล้อง...');

  try {
    if (!handsModel) {
      handsModel = new Hands({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      handsModel.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      });
      handsModel.onResults(onHandsResults);
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
    });
    videoEl.srcObject = stream;
    await videoEl.play();

    cameraUtil = new Camera(videoEl, {
      onFrame: async () => {
        if (canvasEl) {
          canvasEl.width  = videoEl.videoWidth  || 640;
          canvasEl.height = videoEl.videoHeight || 480;
        }
        await handsModel.send({ image: videoEl });
      },
      width: 640,
      height: 480,
    });
    await cameraUtil.start();

    cameraRunning = true;
    document.getElementById('cameraStatus').textContent = 'กล้องเปิดอยู่ 🟢';
    setStatusText('กล้องพร้อมใช้งาน — ทำท่ามือได้เลย');
    document.getElementById('systemBadge').textContent = 'กำลังทำงาน';
  } catch (err) {
    console.error(err);
    setStatusText('❌ ไม่สามารถเปิดกล้องได้: ' + err.message);
  }
};

window.stopCamera = function () {
  if (cameraUtil) { cameraUtil.stop(); cameraUtil = null; }
  if (videoEl?.srcObject) {
    videoEl.srcObject.getTracks().forEach(t => t.stop());
    videoEl.srcObject = null;
  }
  cameraRunning = false;
  document.getElementById('cameraStatus').textContent = 'ปิดกล้อง';
  document.getElementById('systemBadge').textContent = 'พร้อมใช้งาน';
  resetBuffer();
  setStatusText('หยุดกล้องแล้ว');
};

// ════════════════════════════════════
//  MEDIAPIPE RESULTS
// ════════════════════════════════════
function onHandsResults(results) {
  // Draw
  if (ctx && canvasEl) {
    ctx.save();
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (results.image) ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

    if (results.multiHandLandmarks?.length) {
      for (const lms of results.multiHandLandmarks) {
        drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#60a5fa', lineWidth: 2 });
        drawLandmarks(ctx,   lms,                  { color: '#3b82f6', radius: 3 });
      }
    }
    ctx.restore();
  }

  if (!results.multiHandLandmarks?.length) {
    // มือหายออกไป — reset buffer
    resetBuffer();
    updateProgressBar(0);
    document.getElementById('currentLetter').textContent    = '-';
    document.getElementById('confidenceText').textContent   = 'Confidence: -';
    return;
  }

  // ─── Dynamic Gesture path ───────────────────────────────
  const lms    = results.multiHandLandmarks[0];
  const frame  = normalizeLandmarks(lms);   // 63 ค่า
  pushFrame(frame);

  // อัป progress bar
  const { current, total } = getBufferProgress();
  updateProgressBar(current / total);
}

// ════════════════════════════════════
//  GESTURE PREDICTION CALLBACK
// ════════════════════════════════════
function handleGesturePrediction({ prediction, confidence }) {
  const pct = Math.round(confidence * 100);

  // อัป UI
  document.getElementById('currentLetter').textContent  = prediction;
  document.getElementById('confidenceText').textContent = `Confidence: ${pct}%`;
  document.getElementById('labelCurrentLetter').textContent = 'ท่าที่ตรวจพบ';

  // เพิ่มลงประโยค
  const sentEl = document.getElementById('sentenceText');
  sentEl.textContent += prediction === 'Hello' ? 'Hello ' : prediction;

  // Auto-speak
  if (autoSpeak) speakText(prediction);
}

// ════════════════════════════════════
//  PROGRESS BAR (sequence buffer)
// ════════════════════════════════════
function renderProgressBar() {
  // สร้าง progress bar ใต้ camera-box ถ้ายังไม่มี
  const cameraCard = document.querySelector('#page-home .card');
  if (!cameraCard || document.getElementById('seqProgress')) return;

  const wrap = document.createElement('div');
  wrap.id = 'seqProgressWrap';
  wrap.style.cssText = `
    margin: 10px 0 -4px;
    display: flex; align-items: center; gap: 10px;
  `;
  wrap.innerHTML = `
    <span style="font-size:11px;color:var(--text-3);white-space:nowrap;font-weight:500;">
      Sequence
    </span>
    <div style="flex:1;background:var(--bg2);border-radius:99px;height:6px;overflow:hidden;border:1px solid var(--border);">
      <div id="seqProgress" style="
        height:100%; width:0%; border-radius:99px;
        background:linear-gradient(90deg,var(--accent),var(--purple));
        transition:width 0.1s ease;
      "></div>
    </div>
    <span id="seqProgressLabel" style="font-size:11px;color:var(--text-3);font-family:'DM Mono',monospace;min-width:36px;text-align:right;">
      0/30
    </span>
  `;
  const controls = cameraCard.querySelector('.controls');
  cameraCard.insertBefore(wrap, controls);
}

function updateProgressBar(ratio) {
  const bar   = document.getElementById('seqProgress');
  const label = document.getElementById('seqProgressLabel');
  if (!bar || !label) return;
  const frames = Math.round(ratio * 30);
  bar.style.width = `${Math.min(100, ratio * 100)}%`;
  label.textContent = `${frames}/30`;
  // เปลี่ยนสีเมื่อเต็ม
  bar.style.background = ratio >= 1
    ? 'linear-gradient(90deg,var(--green),#34d399)'
    : 'linear-gradient(90deg,var(--accent),var(--purple))';
}

// ════════════════════════════════════
//  SENTENCE / CONTROLS
// ════════════════════════════════════
window.addSpace    = function () { document.getElementById('sentenceText').textContent += ' '; };
window.deleteLast  = function () {
  const el = document.getElementById('sentenceText');
  el.textContent = el.textContent.slice(0, -1);
};
window.clearSentence = function () { document.getElementById('sentenceText').textContent = ''; };
window.speakSentence = function () { speakText(document.getElementById('sentenceText').textContent); };

let autoSpeak = false;
window.toggleAutoSpeak = function () {
  autoSpeak = !autoSpeak;
  document.getElementById('autoSpeakBtn').textContent =
    `Auto Speak: ${autoSpeak ? 'On' : 'Off'}`;
};

function speakText(text) {
  if (!text || !window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  speechSynthesis.speak(utt);
}

// ════════════════════════════════════
//  HISTORY
// ════════════════════════════════════
let history = [];

window.saveToHistory = function () {
  const text = document.getElementById('sentenceText').textContent.trim();
  if (!text) return;
  const entry = { text, time: new Date().toLocaleTimeString() };
  history.unshift(entry);
  renderHistory();
};

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = history.map(h => `
    <div class="history-item" onclick="restoreHistory('${encodeURIComponent(h.text)}')">
      <div>${h.text}</div>
      <div class="small">${h.time}</div>
    </div>
  `).join('');
}

window.restoreHistory = function (encoded) {
  document.getElementById('sentenceText').textContent = decodeURIComponent(encoded);
};

// ════════════════════════════════════
//  STATUS TEXT
// ════════════════════════════════════
function setStatusText(text) {
  const el = document.getElementById('statusText');
  if (el) el.textContent = text;
}

// ════════════════════════════════════
//  CLIPS PAGE
// ════════════════════════════════════
let clips         = JSON.parse(localStorage.getItem('asl_clips') || '[]');
let isAdminClips  = false;

window.adminLogin = function () {
  const pw  = document.getElementById('adminPasswordInput').value;
  const msg = document.getElementById('adminStatusMsg');
  if (pw === '048061') {
    isAdminClips = true;
    document.getElementById('adminUploadSection').style.display = '';
    document.getElementById('adminLogoutBtn').style.display     = '';
    document.getElementById('adminLoginBtn').style.display      = 'none';
    msg.className = 'admin-status-msg ok';
    msg.textContent = '✅ Admin mode เปิดใช้งาน';
  } else {
    isAdminClips = false;
    msg.className = 'admin-status-msg err';
    msg.textContent = '❌ รหัสผ่านไม่ถูกต้อง';
  }
};

window.adminLogout = function () {
  isAdminClips = false;
  document.getElementById('adminUploadSection').style.display = 'none';
  document.getElementById('adminLogoutBtn').style.display     = 'none';
  document.getElementById('adminLoginBtn').style.display      = '';
  document.getElementById('adminStatusMsg').textContent       = '';
  document.getElementById('adminPasswordInput').value         = '';
};

window.onDragOver  = e => { e.preventDefault(); document.getElementById('uploadZone').classList.add('drag-over'); };
window.onDragLeave = ()  => document.getElementById('uploadZone').classList.remove('drag-over');
window.onDrop      = e  => {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  handleFileUpload({ target: { files: e.dataTransfer.files } });
};

window.handleFileUpload = function (event) {
  const files = Array.from(event.target.files || []);
  files.forEach(file => {
    const url   = URL.createObjectURL(file);
    const entry = { id: Date.now() + Math.random(), name: file.name, url, size: file.size, date: new Date().toLocaleDateString() };
    clips.unshift(entry);
  });
  saveClips();
  renderClips();
  document.getElementById('clipCountBadge').textContent = clips.length;
};

function saveClips() {
  // ไม่บันทึก blob URL ลง localStorage (blob URL หมดอายุหลัง reload)
  // production ควรอัปโหลดไปเซิร์ฟเวอร์แทน
}

function renderClips() {
  const grid  = document.getElementById('clipsGrid');
  const empty = document.getElementById('emptyClips');
  document.getElementById('clipCountBadge').textContent = clips.length;

  if (!clips.length) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  // Re-render cards (keep existing empty slot)
  const existingCards = grid.querySelectorAll('.clip-card');
  existingCards.forEach(c => c.remove());

  clips.forEach(clip => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML = `
      <div class="clip-thumb" onclick="openVideoModal('${clip.url}','${clip.name}')">
        <video src="${clip.url}" preload="metadata" muted></video>
        <div class="clip-play-btn">▶</div>
      </div>
      <div class="clip-info">
        <div class="clip-title">${clip.name}</div>
        <div class="clip-meta">${clip.date} · ${(clip.size/1024/1024).toFixed(1)} MB</div>
        <div class="clip-actions">
          <button class="btn-blue"  onclick="openVideoModal('${clip.url}','${clip.name}')">▶ ดู</button>
          ${isAdminClips ? `<button class="btn-red" onclick="deleteClip('${clip.id}')">🗑 ลบ</button>` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.deleteClip = function (id) {
  clips = clips.filter(c => String(c.id) !== String(id));
  renderClips();
};

// ════════════════════════════════════
//  VIDEO MODAL
// ════════════════════════════════════
window.openVideoModal = function (url, title) {
  document.getElementById('modalVideo').src     = url;
  document.getElementById('modalVideoTitle').textContent = title || 'วิดีโอ';
  document.getElementById('videoModal').classList.add('open');
};
window.closeVideoModal = function () {
  const mv = document.getElementById('modalVideo');
  mv.pause();
  mv.src = '';
  document.getElementById('videoModal').classList.remove('open');
};
window.modalVideoTogglePlay = function () {
  const v = document.getElementById('modalVideo');
  v.paused ? v.play() : v.pause();
};
window.modalVideoFullscreen = function () {
  document.getElementById('modalVideo').requestFullscreen?.();
};
