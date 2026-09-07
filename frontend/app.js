const state = { apiKey: "", conversationId: null, history: [] };
const apiKeyInput = document.querySelector("#api-key");
const toggleKey = document.querySelector("#toggle-key");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const welcome = document.querySelector("#welcome");
const typing = document.querySelector("#typing");
const mobileMenu = document.querySelector("#mobile-menu");
const recentConversations = document.querySelector("#recent-conversations");
const connectionSection = document.querySelector("#connection-section");
const connectedState = document.querySelector("#connected-state");
const planner = document.querySelector("#planner");
const openPlanner = document.querySelector("#open-planner");
const closePlanner = document.querySelector("#close-planner");
const plannerForm = document.querySelector("#planner-form");

const ANIMAL_PAGES = {
  lion: "Lion",
  elephant: "African bush elephant",
  leopard: "Leopard",
  cheetah: "Cheetah",
  zebra: "Plains zebra",
  giraffe: "Giraffe",
  buffalo: "African buffalo",
  rhino: "Black rhinoceros",
};

const PLACE_MAPS = {
  serengeti: { name: "Serengeti National Park", marker: "-2.333,34.833", bbox: "33.9,-3.2,35.8,-1.0" },
  ngorongoro: { name: "Ngorongoro Conservation Area", marker: "-3.17,35.58", bbox: "35.3,-3.5,35.9,-2.7" },
  tarangire: { name: "Tarangire National Park", marker: "-3.833,36.0", bbox: "35.6,-4.5,36.6,-3.3" },
  zanzibar: { name: "Zanzibar", marker: "-6.165,39.202", bbox: "38.8,-6.5,39.6,-5.6" },
  arusha: { name: "Arusha", marker: "-3.3869,36.683", bbox: "36.3,-3.7,37.1,-3.0" },
  tanzania: { name: "Tanzania", marker: "-6.37,34.89", bbox: "29.2,-11.8,40.5,-1.0" },
};

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderMarkdown(text) {
  const lines = escapeHtml(text).split("\n");
  let html = "";
  let inList = false;
  let listType = "";
  let inTable = false;

  const inline = (line) => line
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");

  const closeList = () => {
    if (inList) html += `</${listType}>`;
    inList = false;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); if (inTable) { html += "</tbody></table>"; inTable = false; } return; }
    if (/^\|?\s*:?-{3,}/.test(trimmed)) return;
    if (trimmed.includes("|") && trimmed.split("|").length >= 3) {
      const cells = trimmed.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      if (!inTable) { html += "<table><tbody><tr>"; inTable = true; } else html += "<tr>";
      html += cells.map((cell) => `<td>${inline(cell)}</td>`).join("") + "</tr>";
      return;
    }
    if (inTable) { html += "</tbody></table>"; inTable = false; }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) { closeList(); html += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`; return; }
    const bullet = trimmed.match(/^[-*•]\s+(.+)/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (bullet || numbered) {
      const type = numbered ? "ol" : "ul";
      if (!inList || listType !== type) { closeList(); html += `<${type}>`; inList = true; listType = type; }
      html += `<li>${inline((bullet || numbered)[1])}</li>`;
      return;
    }
    closeList(); html += `<p>${inline(trimmed)}</p>`;
  });
  closeList();
  if (inTable) html += "</tbody></table>";
  return html;
}

mobileMenu.addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("mobile-open");
});

function showConnectedState() {
  if (!apiKeyInput.value.trim()) return;
  connectionSection.classList.add("connection-ready");
  connectedState.hidden = false;
}

apiKeyInput.addEventListener("input", showConnectedState);

openPlanner.addEventListener("click", () => {
  planner.classList.remove("hidden");
  welcome.classList.add("hidden");
  document.querySelector(".sidebar").classList.remove("mobile-open");
  planner.scrollIntoView({ behavior: "smooth", block: "center" });
});

closePlanner.addEventListener("click", () => {
  planner.classList.add("hidden");
  if (!state.history.length) welcome.classList.remove("hidden");
});

function renderMessage(role, text) {
  const element = document.createElement("div");
  element.className = `message ${role}`;
  const label = role === "user" ? "You" : "Safari Guide";
  element.innerHTML = `<span class="message-label">${label}</span>`;
  const content = document.createElement("div");
  content.innerHTML = role === "assistant" ? renderMarkdown(text) : escapeHtml(text);
  element.appendChild(content);
  messages.appendChild(element);
  element.scrollIntoView({ behavior: "smooth", block: "end" });
}

function findVisualData(query) {
  const normalized = query.toLowerCase();
  const animal = Object.keys(ANIMAL_PAGES).find((name) => new RegExp(`\\b${name}\\b`).test(normalized));
  const place = Object.keys(PLACE_MAPS).find((name) => normalized.includes(name)) || (animal ? "tanzania" : undefined);
  return { animal, place };
}

async function renderVisualContext(query, target = messages) {
  const { animal, place } = findVisualData(query);
  if (!animal && !place) return;

  const visual = document.createElement("section");
  visual.className = "visual-context";
  visual.innerHTML = `<div class="visual-heading">Visual field notes</div><div class="visual-grid"></div>`;
  const grid = visual.querySelector(".visual-grid");

  if (animal) {
    const animalCard = document.createElement("article");
    animalCard.className = "visual-card image-card";
    animalCard.innerHTML = `<div class="visual-card-label">Wildlife reference</div><div class="visual-loading">Loading image...</div>`;
    grid.appendChild(animalCard);
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(ANIMAL_PAGES[animal])}`);
      const data = await response.json();
      const image = data.thumbnail?.source;
      if (!image) throw new Error("No image");
      animalCard.innerHTML = `<img src="${escapeHtml(image)}" alt="${escapeHtml(data.title || animal)}" loading="lazy"><div class="visual-card-body"><div class="visual-card-label">Wildlife reference</div><strong>${escapeHtml(data.title || animal)}</strong><a href="${escapeHtml(data.content_urls?.desktop?.page || "https://en.wikipedia.org/")}" target="_blank" rel="noreferrer">Learn more ↗</a></div>`;
    } catch {
      animalCard.innerHTML = `<div class="visual-card-body"><div class="visual-card-label">Wildlife reference</div><strong>${escapeHtml(animal)}</strong><span>Image unavailable right now.</span></div>`;
    }
  }

  if (place) {
    const map = PLACE_MAPS[place];
    const mapCard = document.createElement("article");
    mapCard.className = "visual-card map-card";
    mapCard.innerHTML = `<iframe title="Map of ${escapeHtml(map.name)}" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${map.bbox}&layer=mapnik&marker=${map.marker}"></iframe><div class="visual-card-body"><div class="visual-card-label">Location guide</div><strong>${escapeHtml(map.name)}</strong><a href="https://www.openstreetmap.org/?mlat=${map.marker.split(",")[0]}&mlon=${map.marker.split(",")[1]}#map=9/${map.marker}" target="_blank" rel="noreferrer">Open full map ↗</a></div>`;
    grid.appendChild(mapCard);
  }

  target.appendChild(visual);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function loadRecentConversations() {
  const response = await fetch("/api/conversations");
  const data = await response.json();
  if (!data.conversations.length) return;
  recentConversations.innerHTML = data.conversations.map((conversation) => `
    <div class="recent-item" data-conversation-id="${conversation.id}">
      <button class="recent-open" type="button">
        <span class="recent-item-title">${escapeHtml(conversation.title === "New Chat" ? conversation.preview : conversation.title)}</span>
        <span class="recent-item-date">${formatDate(conversation.created_at)}</span>
      </button>
      <button class="delete-conversation" type="button" aria-label="Delete conversation" title="Delete conversation">×</button>
    </div>`).join("");
  recentConversations.querySelectorAll(".recent-open").forEach((button) => {
    button.addEventListener("click", () => loadConversation(button.closest(".recent-item").dataset.conversationId));
  });
  recentConversations.querySelectorAll(".delete-conversation").forEach((button) => {
    button.addEventListener("click", () => deleteConversation(button.closest(".recent-item").dataset.conversationId));
  });
}

async function deleteConversation(conversationId) {
  const response = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
  if (!response.ok) return;
  if (state.conversationId === Number(conversationId)) {
    state.conversationId = null;
    state.history = [];
    messages.innerHTML = "";
    welcome.classList.remove("hidden");
  }
  loadRecentConversations();
}

async function loadConversation(conversationId) {
  const response = await fetch(`/api/conversations/${conversationId}`);
  const data = await response.json();
  state.conversationId = Number(conversationId);
  state.history = data.messages;
  messages.innerHTML = "";
  welcome.classList.add("hidden");
  data.messages.forEach((message, index) => {
    renderMessage(message.role, message.content);
    if (message.role === "assistant" && data.messages[index - 1]?.role === "user") {
      renderVisualContext(data.messages[index - 1].content);
    }
  });
  document.querySelector(".sidebar").classList.remove("mobile-open");
}

function setLoading(isLoading) {
  typing.hidden = !isLoading;
  input.disabled = isLoading;
  form.querySelector("button").disabled = isLoading;
}

async function sendMessage(text) {
  state.apiKey = apiKeyInput.value.trim();
  if (!state.apiKey) {
    apiKeyInput.focus();
    apiKeyInput.style.borderColor = "#c97852";
    return;
  }
  renderMessage("user", text);
  document.querySelector(".sidebar").classList.remove("mobile-open");
  welcome.classList.add("hidden");
  input.value = "";
  input.style.height = "auto";
  setLoading(true);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: state.apiKey, message: text, history: state.history, conversation_id: state.conversationId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to reach the guide.");
    state.conversationId = data.conversation_id;
    state.history.push({ role: "user", content: text }, { role: "assistant", content: data.reply });
    renderMessage("assistant", data.reply);
    renderVisualContext(text);
    loadRecentConversations();
  } catch (error) {
    renderMessage("assistant", `I could not complete that request. ${error.message}`);
  } finally {
    setLoading(false);
    input.focus();
  }
}

toggleKey.addEventListener("click", () => {
  const showing = apiKeyInput.type === "text";
  apiKeyInput.type = showing ? "password" : "text";
  toggleKey.textContent = showing ? "Show" : "Hide";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (text) sendMessage(text);
});

plannerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  planner.classList.add("hidden");
  const prompt = `Create a practical ${document.querySelector("#trip-days").value} Tanzania itinerary. Travel style: ${document.querySelector("#travel-style").value}. Main interests: ${document.querySelector("#trip-interests").value}. Places to consider: ${document.querySelector("#trip-places").value || "Recommend the best route"}. Include a day-by-day plan, estimated travel flow, best experiences, and practical advice. Use clear headings and bullet points.`;
  sendMessage(prompt);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    input.focus();
    input.dispatchEvent(new Event("input"));
  });
});

document.querySelector("#new-chat").addEventListener("click", () => {
  state.conversationId = null;
  state.history = [];
  messages.innerHTML = "";
  welcome.classList.remove("hidden");
  input.value = "";
  input.focus();
});

loadRecentConversations().catch(() => {});