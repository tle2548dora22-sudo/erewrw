/* ═══════════════════════════════════════
   i18n.js — ระบบภาษา TH / EN
   ═══════════════════════════════════════ */

export const T = {
  th: {
    ready:          "พร้อมใช้งาน",
    running:        "กำลังทำงาน",
    stopped:        "หยุดแล้ว",
    cameraOff:      "ปิดกล้อง",
    live:           "กำลังทำงาน",
    blocked:        "ถูกบล็อก",
    loading:        "กำลังโหลดระบบตรวจจับมือ...",
    cameraStarted:  "เริ่มกล้องสำเร็จ วางมือให้อยู่ในกรอบได้เลย",
    cameraStopped:  "หยุดกล้องแล้ว",
    noHand:         "ยังไม่พบมือ กรุณาวางมือในกรอบกล้อง",
    apiSuccess:     "เชื่อมต่อ AI API สำเร็จ",
    apiTesting:     "กำลังทดสอบ API...",
    noTextSpeak:    "ยังไม่มีข้อความให้อ่าน",
    noTextSave:     "ยังไม่มีข้อความให้บันทึก",
    saved:          "บันทึกลงประวัติแล้ว",
    apiFailed:      "ส่งข้อมูลหา API ไม่สำเร็จ – ตรวจสอบ API และ CORS",
    lowConfidence:  "ความมั่นใจต่ำเกินไป ยังไม่เพิ่มลงประโยค",
    denied:         "ไม่ได้รับอนุญาตกล้อง กรุณากด Allow",
    notFound:       "ไม่พบกล้องบนอุปกรณ์นี้",
    notReadable:    "กล้องอาจถูกใช้โดยแอปอื่น",
    currentLetter:  "ตัวอักษรปัจจุบัน",
    noHistory:      "ยังไม่มีประวัติ",
  },
  en: {
    ready:          "Ready",
    running:        "Running",
    stopped:        "Stopped",
    cameraOff:      "Camera Off",
    live:           "Live",
    blocked:        "Blocked",
    loading:        "Loading hand detection...",
    cameraStarted:  "Camera started. Place your hand in frame.",
    cameraStopped:  "Camera stopped.",
    noHand:         "No hand detected. Place your hand in the frame.",
    apiSuccess:     "AI API connected successfully.",
    apiTesting:     "Testing API...",
    noTextSpeak:    "No text to speak.",
    noTextSave:     "No text to save.",
    saved:          "Saved to history.",
    apiFailed:      "API request failed – check API and CORS.",
    lowConfidence:  "Confidence too low – not added.",
    denied:         "Camera access denied. Please click Allow.",
    notFound:       "No camera found on this device.",
    notReadable:    "Camera may be used by another app.",
    currentLetter:  "Current Letter",
    noHistory:      "No history yet.",
  },
};

export function t(lang, key) {
  return (T[lang] && T[lang][key]) || key;
}
