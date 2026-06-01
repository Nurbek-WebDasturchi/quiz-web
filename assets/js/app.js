/**
 * TestPlatform — Global Utility Functions
 */

// Show alert
function showAlert(type, message) {
  const alertEl = document.createElement("div");
  alertEl.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg rounded-pill z-3`;
  alertEl.style.minWidth = "300px";
  alertEl.style.zIndex = "9999";
  alertEl.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertEl);
  setTimeout(() => alertEl.remove(), 4000);
}

// Auth guard
function checkAuth() {
  const user = localStorage.getItem("currentUser");
  if (!user) {
    window.location.href = "login.html";
  }
  return JSON.parse(user);
}

function getUserRole(user) {
  return user?.role || "student";
}

function getRoleLabel(role) {
  return role === "teacher" ? "Ustoz" : "Talaba";
}

// Format date
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Share function
function shareLink(testId) {
  const url = window.location.origin + "/test.html?share=" + testId;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    showAlert("success", "Havola nusxalandi!");
  } else {
    prompt("Havolani nusxalang:", url);
  }
}

// Test initialization for shared links
function loadSharedTest() {
  const params = new URLSearchParams(window.location.search);
  const share = params.get("share");
  if (share) {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (user) {
      const tests = JSON.parse(
        localStorage.getItem("tests_" + user.email) || "[]"
      );
      const test = tests.find((t) => t.id === share);
      if (test) {
        localStorage.setItem("currentTest", JSON.stringify(test));
      }
    }
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadSharedTest();
  initAiAssistant();
});

function initAiAssistant() {
  if (document.getElementById("aiAssistantWidget")) return;

  const widget = document.createElement("div");
  widget.id = "aiAssistantWidget";
  widget.innerHTML = `
    <button class="ai-fab" type="button" aria-label="AI assistant">
      <i class="fas fa-wand-magic-sparkles"></i>
    </button>
    <div class="ai-panel shadow-lg d-none">
      <div class="ai-panel-header">
        <div>
          <strong>AI assistant</strong>
          <small>Test va shablon yordamchisi</small>
        </div>
        <button type="button" class="btn-close btn-close-white ai-close" aria-label="Yopish"></button>
      </div>
      <div class="ai-messages">
        <div class="ai-msg ai-msg-bot">Assalomu alaykum! Test formati, ustoz roli yoki savollarni shablonga aylantirish bo'yicha yordam beraman.</div>
      </div>
      <form class="ai-form">
        <textarea class="form-control" rows="2" placeholder="Savol yozing yoki test matnini tashlang..."></textarea>
        <button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i></button>
      </form>
    </div>
  `;
  document.body.appendChild(widget);

  const panel = widget.querySelector(".ai-panel");
  const fab = widget.querySelector(".ai-fab");
  const close = widget.querySelector(".ai-close");
  const form = widget.querySelector(".ai-form");
  const input = widget.querySelector("textarea");
  const messages = widget.querySelector(".ai-messages");

  fab.addEventListener("click", () => panel.classList.toggle("d-none"));
  close.addEventListener("click", () => panel.classList.add("d-none"));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendAiMessage(messages, message, "user");
    input.value = "";

    try {
      const response = await fetch("/api/tests/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      appendAiMessage(messages, data.reply || "Javob tayyor emas.", "bot");
    } catch (error) {
      appendAiMessage(
        messages,
        "Serverga ulana olmadim. Savollarni yuklash sahifasidagi AI tahlil maydonida ham sinab ko'ring.",
        "bot"
      );
    }
  });
}

function appendAiMessage(container, text, type) {
  const message = document.createElement("div");
  message.className = `ai-msg ai-msg-${type}`;
  message.textContent = text;
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
}
