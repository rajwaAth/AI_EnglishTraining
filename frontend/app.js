const els = {
  statusPill: document.getElementById("statusPill"),
  clearBtn: document.getElementById("clearBtn"),
  chatScroll: document.getElementById("chatScroll"),
  messages: document.getElementById("messages"),
  composer: document.getElementById("composer"),
  textInput: document.getElementById("textInput"),
  sendBtn: document.getElementById("sendBtn"),
  voiceBtn: document.getElementById("voiceBtn"),
  voiceIcon: document.getElementById("voiceIcon"),
  hint: document.getElementById("hint"),
};

const STORAGE_KEYS = {
  sessionId: "fp_session_id",
};

// Frontend ini tidak menampilkan input API base.
// Default akan mengarah ke host yang sama pada port 8000.
// Jika backend kamu beda host/port, ubah nilai ini.
const API_BASE = `http://${window.location.hostname}:8000`;

function createSessionId() {
  // reasonably unique, no dependencies
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId() {
  let id = localStorage.getItem(STORAGE_KEYS.sessionId);
  if (!id) {
    id = createSessionId();
    localStorage.setItem(STORAGE_KEYS.sessionId, id);
  }
  return id;
}

function setStatus(text, kind = "ready") {
  // kind: ready | busy | error
  const dot = kind === "busy" ? "bg-amber-400" : kind === "error" ? "bg-rose-400" : "bg-emerald-400";
  els.statusPill.innerHTML = `
    <span class="mr-2 inline-block h-1.5 w-1.5 rounded-full ${dot}" aria-hidden="true"></span>
    ${escapeHtml(text)}
  `;
}

function getApiBase() {
  return API_BASE.replace(/\/$/, "");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * messages in UI (not persisted)
 * type: 'user' | 'assistant' | 'system'
 */
let uiMessages = [];

function scrollToBottom() {
  els.chatScroll.scrollTop = els.chatScroll.scrollHeight;
}

function bubbleBase(role) {
  const isUser = role === "user";
  return {
    wrapperClass: `flex ${isUser ? "justify-end" : "justify-start"}`,
    bubbleClass: [
      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
      isUser
        ? "bg-slate-100 text-slate-950"
        : "border border-slate-800 bg-slate-900 text-slate-100",
    ].join(" "),
    metaClass: `mt-1 text-[11px] ${isUser ? "text-slate-400" : "text-slate-500"}`,
  };
}

function renderMessages() {
  els.messages.innerHTML = uiMessages
    .map((m) => {
      const { wrapperClass, bubbleClass, metaClass } = bubbleBase(m.role);
      const title = m.role === "user" ? "You" : m.role === "assistant" ? "AI" : "System";

      const extra = m.extra
        ? `<div class="mt-2 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-300">
            ${m.extra}
          </div>`
        : "";

      return `
        <div class="${wrapperClass}">
          <div class="${bubbleClass}">
            <div class="text-xs font-semibold ${m.role === "user" ? "text-slate-700" : "text-slate-300"}">${escapeHtml(title)}</div>
            <div class="mt-1 whitespace-pre-wrap break-words">${m.pending ? '<span class="inline-flex gap-1 text-slate-300"><span class="animate-pulse">•</span><span class="animate-pulse [animation-delay:120ms]">•</span><span class="animate-pulse [animation-delay:240ms]">•</span></span>' : escapeHtml(m.text)}</div>
            ${extra}
            <div class="${metaClass}">${escapeHtml(m.time)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  scrollToBottom();
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function pushMessage(role, text, extra = "") {
  const id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  uiMessages.push({ id, role, text, extra, time: nowTime(), pending: false });
  renderMessages();
  return id;
}

function pushPendingAssistant() {
  const id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  uiMessages.push({ id, role: "assistant", text: "", extra: "", time: nowTime(), pending: true });
  renderMessages();
  return id;
}

function resolvePending(id, text, extra = "") {
  const idx = uiMessages.findIndex((m) => m.id === id);
  if (idx === -1) return;
  uiMessages[idx] = { ...uiMessages[idx], text, extra, pending: false, time: nowTime() };
  renderMessages();
}

function setBusy(isBusy) {
  els.sendBtn.disabled = isBusy;
  els.voiceBtn.disabled = isBusy;
  els.textInput.disabled = isBusy;
  if (isBusy) setStatus("Working...", "busy");
  else setStatus("Ready", "ready");
}

async function postJson(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

async function postForm(url, formData) {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

function makeChatExtra(resp) {
  // Keep it minimal: only show if present
  const parts = [];
  if (typeof resp?.corrected_sentence === "string" && resp.corrected_sentence.trim()) {
    parts.push(`<div><span class="text-slate-500">Corrected:</span> ${escapeHtml(resp.corrected_sentence)}</div>`);
  }
  if (typeof resp?.explanation === "string" && resp.explanation.trim()) {
    parts.push(`<div class="mt-1"><span class="text-slate-500">Explain (ID):</span> ${escapeHtml(resp.explanation)}</div>`);
  }
  if (Array.isArray(resp?.error_categories) && resp.error_categories.length) {
    parts.push(`<div class="mt-1"><span class="text-slate-500">Category:</span> ${escapeHtml(resp.error_categories.join(", "))}</div>`);
  }
  if (!parts.length) return "";
  return parts.join("");
}

async function sendTextMessage(text) {
  const sessionId = getSessionId();
  const apiBase = getApiBase();

  pushMessage("user", text);
  const pendingId = pushPendingAssistant();
  setBusy(true);

  try {
    const resp = await postJson(`${apiBase}/chat`, { session_id: sessionId, user_input: text });
    const reply = resp?.chat_reply ?? "(no reply)";
    resolvePending(pendingId, reply, makeChatExtra(resp));
  } catch (err) {
    console.error(err);
    setStatus("Error", "error");
    // remove pending bubble and show error
    uiMessages = uiMessages.filter((m) => m.id !== pendingId);
    renderMessages();
    pushMessage("system", `Request gagal: ${String(err?.message || err)}`);
  } finally {
    setBusy(false);
  }
}

// ---- Voice recording ----
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartMs = null;
let recordingTimer = null;

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function setVoiceUi(isRecording) {
  if (isRecording) {
    els.voiceBtn.classList.add("border-rose-500");
    els.voiceIcon.textContent = "⏺";
    els.hint.textContent = "Recording... klik tombol lagi untuk stop.";
  } else {
    els.voiceBtn.classList.remove("border-rose-500");
    els.voiceIcon.textContent = "🎙";
    els.hint.textContent = "";
  }
}

function pickSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extensionFromMime(mime) {
  const m = (mime || "").toLowerCase();
  if (m.includes("ogg")) return ".ogg";
  if (m.includes("webm")) return ".webm";
  return ".audio";
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickSupportedMimeType();

  recordedChunks = [];
  recordingStartMs = Date.now();

  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  mediaRecorder.addEventListener("dataavailable", (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  });
  mediaRecorder.addEventListener("stop", () => {
    stream.getTracks().forEach((t) => t.stop());
  });

  mediaRecorder.start();

  recordingTimer = window.setInterval(() => {
    els.hint.textContent = `Recording... ${formatMs(Date.now() - recordingStartMs)} (klik lagi untuk stop)`;
  }, 250);

  setVoiceUi(true);
}

async function stopRecordingAndSend() {
  if (!mediaRecorder) return;

  setBusy(true);
  setVoiceUi(false);

  window.clearInterval(recordingTimer);
  recordingTimer = null;

  const mimeType = mediaRecorder.mimeType;
  const stopPromise = new Promise((resolve) => {
    mediaRecorder.addEventListener("stop", resolve, { once: true });
  });

  mediaRecorder.stop();
  await stopPromise;

  const blob = new Blob(recordedChunks, { type: mimeType || "audio/webm" });
  const sessionId = getSessionId();
  const apiBase = getApiBase();

  // UI placeholder message
  pushMessage("user", "(voice message)");
  const pendingId = pushPendingAssistant();

  try {
    const form = new FormData();
    const filename = `recording_${Date.now()}${extensionFromMime(mimeType)}`;
    form.append("audio_file", blob, filename);

    const url = new URL(`${apiBase}/voice`);
    url.searchParams.set("session_id", sessionId);

    const resp = await postForm(url.toString(), form);
    const reply = resp?.chat_reply ?? "(no reply)";
    resolvePending(pendingId, reply, makeChatExtra(resp));
  } catch (err) {
    console.error(err);
    setStatus("Error", "error");
    uiMessages = uiMessages.filter((m) => m.id !== pendingId);
    renderMessages();
    pushMessage("system", `Voice gagal: ${String(err?.message || err)}`);
  } finally {
    setBusy(false);
    mediaRecorder = null;
  }
}

async function toggleVoice() {
  if (!navigator.mediaDevices?.getUserMedia) {
    pushMessage("system", "Browser tidak mendukung audio recording (getUserMedia). Coba Chrome/Edge terbaru.");
    return;
  }

  if (mediaRecorder && mediaRecorder.state === "recording") {
    await stopRecordingAndSend();
    return;
  }

  try {
    await startRecording();
  } catch (err) {
    console.error(err);
    pushMessage("system", `Tidak bisa akses mic: ${String(err?.message || err)}`);
  }
}

// ---- wire up ----
function autoGrowTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.max(el.scrollHeight, 40) + "px";
}

function init() {
  const sessionId = getSessionId();
  pushMessage(
    "assistant",
    "Halo! Kirim kalimat English kamu, nanti aku bantu koreksi grammar dan balas dengan ramah. Kamu juga bisa pakai voice."
  );

  els.clearBtn.addEventListener("click", () => {
    uiMessages = [];
    renderMessages();
  });

  els.textInput.addEventListener("input", () => autoGrowTextarea(els.textInput));

  els.textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      els.composer.requestSubmit();
    }
  });

  els.composer.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (els.textInput.value || "").trim();
    if (!text) return;
    els.textInput.value = "";
    autoGrowTextarea(els.textInput);
    await sendTextMessage(text);
  });

  els.voiceBtn.addEventListener("click", toggleVoice);

  autoGrowTextarea(els.textInput);
  setStatus("Ready", "ready");
}

init();
