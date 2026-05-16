/* ═══════════════════════════════════════
   clips.js — Video clips: upload / render / delete / modal
   ═══════════════════════════════════════ */

import { dbPutClip, dbDeleteClip, dbGetAllClips } from "./db.js";
import { isAdmin }                                 from "./admin.js";

export let clips = [];
let dbInstance   = null;

export function setDB(db) { dbInstance = db; }

export async function loadClipsFromDB() {
  try {
    const rows = await dbGetAllClips(dbInstance);
    clips = rows.map(row => ({
      id:         row.id,
      name:       row.name,
      size:       row.size,
      uploadedAt: row.uploadedAt,
      blobUrl:    URL.createObjectURL(row.blob),
    }));
    renderClips();
  } catch (err) {
    console.error("loadClipsFromDB error", err);
    renderClips();
  }
}

export function handleFileUpload(e) {
  [...e.target.files].forEach(addClip);
  e.target.value = "";
}

export function onDragOver(e)  {
  e.preventDefault();
  document.getElementById("uploadZone").classList.add("drag-over");
}
export function onDragLeave(e) {
  document.getElementById("uploadZone").classList.remove("drag-over");
}
export function onDrop(e) {
  e.preventDefault();
  document.getElementById("uploadZone").classList.remove("drag-over");
  [...e.dataTransfer.files].filter(f => f.type.startsWith("video/")).forEach(addClip);
}

export async function addClip(file) {
  const id         = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const size       = (file.size / 1024 / 1024).toFixed(1) + " MB";
  const uploadedAt = new Date().toLocaleString();
  const row        = { id, name: file.name, size, uploadedAt, blob: file };
  await dbPutClip(dbInstance, row);
  const blobUrl = URL.createObjectURL(file);
  clips.push({ id, name: file.name, size, uploadedAt, blobUrl });
  renderClips();
}

export async function removeClip(id) {
  const clip = clips.find(c => c.id === id);
  if (clip?.blobUrl) URL.revokeObjectURL(clip.blobUrl);
  clips = clips.filter(c => c.id !== id);
  await dbDeleteClip(dbInstance, id);
  renderClips();
}

export function downloadClip(id) {
  const clip = clips.find(c => c.id === id);
  if (!clip) return;
  const a = document.createElement("a");
  a.href = clip.blobUrl; a.download = clip.name; a.click();
}

export function renderClips() {
  const lang       = window.__lang__ || "th";
  const grid       = document.getElementById("clipsGrid");
  const empty      = document.getElementById("emptyClips");
  const emptyMsg   = document.getElementById("emptyClipsMsg");
  const countBadge = document.getElementById("clipCountBadge");

  countBadge.textContent = clips.length;
  empty.style.display    = clips.length ? "none" : "block";

  if (!clips.length) {
    empty.querySelector("h3").textContent = lang === "th" ? "ยังไม่มีคลิปวิดีโอ" : "No video clips yet";
    emptyMsg.textContent = isAdmin
      ? (lang === "th" ? "อัปโหลดวิดีโอสอนภาษา ASL ด้านบน" : "Upload ASL videos above.")
      : (lang === "th" ? "Admin ยังไม่ได้อัปโหลดวิดีโอ"    : "No videos uploaded by admin yet.");
  }

  grid.querySelectorAll(".clip-card").forEach(el => el.remove());

  clips.forEach(clip => {
    const card = document.createElement("div");
    card.className = "clip-card";
    card.id = "clip-" + clip.id;

    const adminButtons = isAdmin ? `
      <button class="btn-red"  onclick="removeClip('${clip.id}')">🗑 ลบ</button>
      <button class="btn-dark" onclick="downloadClip('${clip.id}')">⬇ ดาวน์โหลด</button>
    ` : "";

    card.innerHTML = `
      <div class="clip-thumb" onclick="openVideoModal('${clip.id}')">
        <video src="${clip.blobUrl}" preload="metadata" muted></video>
        <div class="clip-play-btn" id="playbtn-${clip.id}">▶️</div>
      </div>
      <div class="clip-info">
        <div class="clip-title" title="${clip.name}">${clip.name}</div>
        <div class="clip-meta">🎞️ ${clip.size} · 📅 ${clip.uploadedAt || ""}</div>
        <div class="clip-actions">
          <button class="btn-dark" onclick="openVideoModal('${clip.id}')">▶ ดูวิดีโอ</button>
          ${adminButtons}
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* ─── Video Modal ─── */
const videoModal = document.getElementById("videoModal");
const modalVideo = document.getElementById("modalVideo");
const modalTitle = document.getElementById("modalVideoTitle");
let   currentModalClipId = null;

export function openVideoModal(id) {
  const clip = clips.find(c => c.id === id);
  if (!clip) return;
  currentModalClipId     = id;
  modalTitle.textContent = clip.name;
  modalVideo.src         = clip.blobUrl;
  modalVideo.muted       = false;
  videoModal.classList.add("open");
  modalVideo.play().catch(() => {});
}

export function closeVideoModal() {
  modalVideo.pause();
  modalVideo.src = "";
  videoModal.classList.remove("open");
  currentModalClipId = null;
}

export function modalVideoTogglePlay() {
  if (modalVideo.paused) modalVideo.play();
  else modalVideo.pause();
}

export function modalVideoFullscreen() {
  if (modalVideo.requestFullscreen)            modalVideo.requestFullscreen();
  else if (modalVideo.webkitRequestFullscreen) modalVideo.webkitRequestFullscreen();
  else if (modalVideo.mozRequestFullScreen)    modalVideo.mozRequestFullScreen();
}

videoModal.addEventListener("click", e => { if (e.target === videoModal) closeVideoModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeVideoModal(); });

window.handleFileUpload       = handleFileUpload;
window.onDragOver             = onDragOver;
window.onDragLeave            = onDragLeave;
window.onDrop                 = onDrop;
window.removeClip             = removeClip;
window.downloadClip           = downloadClip;
window.openVideoModal         = openVideoModal;
window.closeVideoModal        = closeVideoModal;
window.modalVideoTogglePlay   = modalVideoTogglePlay;
window.modalVideoFullscreen   = modalVideoFullscreen;
