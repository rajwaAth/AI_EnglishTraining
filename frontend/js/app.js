const API_BASE = "http://127.0.0.1:8000/chat";

const chatBox = document.getElementById("chatBox");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const audioInput = document.getElementById("audioInput");
const voiceBtn = document.getElementById("voiceBtn");

// Session ID (persist)
let sessionId = localStorage.getItem("session_id");
if (!sessionId) {
  sessionId = "session-" + crypto.randomUUID();
  localStorage.setItem("session_id", sessionId);
}

// Utility: render message bubble
function addMessage(role, content) {
  const div = document.createElement("div");
  div.className = role === "user" ? "text-right" : "text-left";

  div.innerHTML = `
    <div class="inline-block max-w-xs px-4 py-2 rounded-lg
      ${role === "user" ? "bg-blue-500 text-white" : "bg-gray-200"}">
      ${content}
    </div>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send text message
async function sendText() {
  const text = textInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  textInput.value = "";

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      user_input: text
    })
  });

  if (!res.ok) {
    addMessage("ai", "❌ Server error");
    return;
  }

  const data = await res.json();
  renderAIResponse(data);
}

// Send voice message
async function sendVoice() {
  const file = audioInput.files[0];
  if (!file) return;

  addMessage("user", "🎤 Voice message");

  const formData = new FormData();
  formData.append("audio_file", file);

  const res = await fetch(
    `${API_BASE}/voice?session_id=${sessionId}`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!res.ok) {
    addMessage("ai", "❌ Voice processing error");
    return;
  }

  const data = await res.json();
  renderAIResponse(data);
}

// Render AI response
function renderAIResponse(data) {
  let html = "";

  if (data.corrected_sentence) {
    html += `<div class="font-semibold">✅ Corrected:</div>
             <div>${data.corrected_sentence}</div><br>`;
  }

  if (data.explanation) {
    html += `<div class="font-semibold">ℹ️ Explanation:</div>
             <div>${data.explanation}</div><br>`;
  }

  html += `<div class="italic">${data.chat_reply}</div>`;

  addMessage("ai", html);
}

// Event listeners
sendBtn.addEventListener("click", sendText);
voiceBtn.addEventListener("click", () => audioInput.click());
audioInput.addEventListener("change", sendVoice);
