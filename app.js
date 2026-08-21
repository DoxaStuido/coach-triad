const viewLabels = {
  overview: "Overview",
  matching: "Matching studio",
  triads: "Triad operations",
  exceptions: "Exception queue",
  participants: "Participants",
  settings: "Rules & settings",
};

const state = {
  currentView: "overview",
  matchFilter: "all",
  triadFilter: "all",
  exceptionFilter: "all",
};

const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector("#overlay");
const triadDrawer = document.querySelector("#triad-drawer");
const aiDrawer = document.querySelector("#ai-drawer");
const currentViewLabel = document.querySelector("#current-view-label");
const toastRegion = document.querySelector("#toast-region");

function setView(viewName) {
  const target = document.querySelector(`[data-view-panel="${viewName}"]`);
  if (!target) return;

  state.currentView = viewName;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel === target);
  });
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === viewName);
  });
  currentViewLabel.textContent = viewLabels[viewName] || viewName;
  sidebar.classList.remove("is-open");
  document.querySelector(".mobile-menu")?.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", `#${viewName}`);
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-go-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.goView));
});

document.querySelector(".mobile-menu")?.addEventListener("click", (event) => {
  const isOpen = sidebar.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
});

document.querySelector(".mock-data-banner button")?.addEventListener("click", () => {
  document.querySelector(".mock-data-banner").remove();
});

function openLayer(layer) {
  [triadDrawer, aiDrawer].forEach((drawer) => {
    if (drawer !== layer) {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }
  });
  layer.classList.add("is-open");
  layer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  window.setTimeout(() => layer.querySelector("button")?.focus(), 220);
}

function closeLayers() {
  [triadDrawer, aiDrawer].forEach((drawer) => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  });
  sidebar.classList.remove("is-open");
  overlay.hidden = true;
  document.body.style.overflow = "";
}

overlay.addEventListener("click", closeLayers);
document.querySelector("#close-drawer").addEventListener("click", closeLayers);
document.querySelector("#close-ai").addEventListener("click", closeLayers);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLayers();
});

const drawerData = {
  "T-014": { score: 94, status: "Strong match", description: "All required rules pass. Three chapters and two time zones are represented." },
  "T-031": { score: 88, status: "Strong match", description: "English preference and comfortable APAC hours align across three chapters." },
  "T-044": { score: 79, status: "Needs attention", description: "November completion is missing. Coordinator follow-up is due today." },
  "T-052": { score: 82, status: "Rematching", description: "One participant withdrew. The two active members remain locked while a replacement is reviewed." },
  "T-067": { score: 71, status: "Language review", description: "Best available Japanese-language match. Two members are from the same chapter." },
  "T-L01": { score: 74, status: "Language exception", description: "Vietnamese is a hard requirement. No feasible three-Chapter combination exists in the current cohort." },
  "T-082": { score: 64, status: "Time risk", description: "Only one shared 60-minute slot was found. Confirm availability before approval." },
};

const defaultDrawerProfile = {
  members: [
    { initials: "ML", className: "avatar-maya", name: "Maya Lim", meta: "Singapore · English", timezone: "UTC+8" },
    { initials: "AR", className: "avatar-arjun", name: "Arjun Rao", meta: "Mumbai · English, Hindi", timezone: "UTC+5:30" },
    { initials: "MC", className: "avatar-mei", name: "Mei Chen", meta: "Taiwan · English, Mandarin", timezone: "UTC+8" },
  ],
  windows: [
    ["Singapore · Maya", "Tue 7:30 PM"],
    ["Mumbai · Arjun", "Tue 5:00 PM"],
    ["Taipei · Mei", "Tue 7:30 PM"],
  ],
  firstNames: ["Maya", "Arjun", "Mei"],
  breakdown: [[100, "30/30"], [100, "30/30"], [96, "24/25"], [67, "10/15"]],
};

const drawerProfiles = {
  "T-L01": {
    members: [
      { initials: "LT", className: "avatar-linh", name: "Linh Tran", meta: "Vietnam · Vietnamese", timezone: "UTC+7" },
      { initials: "MN", className: "avatar-hana", name: "Minh Nguyen", meta: "Vietnam · Vietnamese", timezone: "UTC+7" },
      { initials: "AP", className: "avatar-ravi", name: "Anh Pham", meta: "Vietnam · Vietnamese", timezone: "UTC+7" },
    ],
    windows: [
      ["Ho Chi Minh City · Linh", "Sat 10:00 AM"],
      ["Hanoi · Minh", "Sat 10:00 AM"],
      ["Da Nang · Anh", "Sat 10:00 AM"],
    ],
    firstNames: ["Linh", "Minh", "Anh"],
    breakdown: [[100, "30/30"], [0, "0/30"], [100, "25/25"], [100, "15/15"]],
  },
};

function renderDrawerProfile(profile) {
  document.querySelectorAll(".drawer-members > div").forEach((row, index) => {
    const member = profile.members[index];
    const avatar = row.querySelector("i");
    avatar.className = `avatar ${member.className}`;
    avatar.textContent = member.initials;
    row.querySelector("strong").textContent = member.name;
    row.querySelector("small").textContent = member.meta;
    row.querySelector("b").textContent = member.timezone;
  });

  document.querySelectorAll(".timezone-card > div").forEach((row, index) => {
    row.querySelector("span").textContent = profile.windows[index][0];
    row.querySelector("strong").textContent = profile.windows[index][1];
  });

  const rotations = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [1, 0, 2], [2, 1, 0]];
  document.querySelectorAll(".rotation-grid > div:not(:first-child)").forEach((row, index) => {
    const cells = row.querySelectorAll("span");
    rotations[index].forEach((memberIndex, roleIndex) => {
      cells[roleIndex + 1].textContent = profile.firstNames[memberIndex];
    });
  });

  document.querySelectorAll(".score-breakdown > div").forEach((row, index) => {
    const [width, score] = profile.breakdown[index];
    row.querySelector("i").style.width = `${width}%`;
    row.querySelector("b").textContent = score;
  });
}

document.querySelectorAll("[data-open-triad]").forEach((button) => {
  button.addEventListener("click", () => {
    const triadId = button.dataset.openTriad;
    const data = drawerData[triadId] || drawerData["T-014"];
    renderDrawerProfile(drawerProfiles[triadId] || defaultDrawerProfile);
    document.querySelector("#drawer-title").textContent = triadId;
    document.querySelector(".drawer-score .score-ring strong").textContent = data.score;
    document.querySelector(".drawer-score > div strong").textContent = data.status;
    document.querySelector(".drawer-score > div p").textContent = data.description;
    const ring = document.querySelector(".drawer-score .score-ring");
    ring.className = `score-ring ${data.score >= 80 ? "score-high" : data.score >= 70 ? "score-medium" : "score-low"}`;
    document.querySelector("#triad-drawer [data-approve]").dataset.approve = triadId;
    openLayer(triadDrawer);
  });
});

document.querySelectorAll("[data-open-ai]").forEach((button) => {
  button.addEventListener("click", () => openLayer(aiDrawer));
});

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 16.2-3.5-3.5L4 14.1l5 5 11-11-1.4-1.4L9 16.2Z"/></svg><span>${message}</span>`;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 3200);
}

document.querySelectorAll("[data-approve]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const id = button.dataset.approve;
    const card = document.querySelector(`[data-search^="${id} "]`);
    card?.classList.add("is-approved");
    const actionText = card?.querySelector(".candidate-actions span");
    if (actionText) actionText.textContent = "Approved and locked for this draft";
    button.textContent = "Approved";
    toast(`${id} approved for draft run #04`);
    if (triadDrawer.classList.contains("is-open")) closeLayers();
  });
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const messages = {
      "compare-runs": "Run comparison opened in demo mode",
      "save-rule-set": "Rule set saved as ‘APAC balanced v4’",
      "find-alternative": "Three alternative triads are ready to compare",
    };
    toast(messages[button.dataset.action] || "Demo action completed");
  });
});

document.querySelectorAll("[data-resolve-action]").forEach((button) => {
  button.addEventListener("click", () => toast(`${button.dataset.resolveAction} · preview only`));
});

const runButton = document.querySelector("#run-matching-button");
runButton?.addEventListener("click", () => {
  const original = runButton.innerHTML;
  runButton.disabled = true;
  runButton.textContent = "Evaluating 294 participants…";
  window.setTimeout(() => {
    runButton.innerHTML = original;
    runButton.disabled = false;
    toast("Draft run #05 generated · 98 provisional triads");
  }, 1200);
});

function applyMatchFilters() {
  const query = document.querySelector("#candidate-search").value.trim().toLowerCase();
  document.querySelectorAll(".candidate-card").forEach((card) => {
    const kindMatches = state.matchFilter === "all" || card.dataset.kind === state.matchFilter;
    const queryMatches = !query || card.dataset.search.toLowerCase().includes(query);
    card.hidden = !(kindMatches && queryMatches);
  });
}

document.querySelectorAll("[data-match-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.matchFilter = button.dataset.matchFilter;
    document.querySelectorAll("[data-match-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    applyMatchFilters();
  });
});
document.querySelector("#candidate-search")?.addEventListener("input", applyMatchFilters);

function applyTriadFilters() {
  const query = document.querySelector("#triad-search").value.trim().toLowerCase();
  document.querySelectorAll("#triad-table-body tr").forEach((row) => {
    const kindMatches = state.triadFilter === "all" || row.dataset.kind === state.triadFilter;
    const queryMatches = !query || row.dataset.search.toLowerCase().includes(query);
    row.hidden = !(kindMatches && queryMatches);
  });
}

document.querySelectorAll("[data-triad-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.triadFilter = button.dataset.triadFilter;
    document.querySelectorAll("[data-triad-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    applyTriadFilters();
  });
});
document.querySelector("#triad-search")?.addEventListener("input", applyTriadFilters);

document.querySelectorAll("[data-exception-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.exceptionFilter = button.dataset.exceptionFilter;
    document.querySelectorAll("[data-exception-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelectorAll(".exception-card").forEach((card) => {
      card.hidden = state.exceptionFilter !== "all" && card.dataset.kind !== state.exceptionFilter;
    });
  });
});

const aiResponses = [
  {
    match: /urgent|attention|priority|prioritise/i,
    answer: "Start with 28 duplicate email groups, then verify 90 profiles with membership, timezone or location flags. Review the Vietnamese-only Chapter exception before publishing.",
    action: "Open exception queue",
    view: "exceptions",
  },
  {
    match: /unmatched|12 participant/i,
    answer: "The provisional simulation matched all 294 committed participants into 98 triads. 97 triads span different Chapters; one Vietnamese-only triad requires a Chapter exception.",
    action: "Review matching cases",
    view: "matching",
  },
  {
    match: /T-052|rematch|replacement/i,
    answer: "Lowest-impact option: keep Linh and Hana locked, then add backup participant P-311. They share English and Saturday 10:00 SGT. No healthy triad needs to be disturbed.",
    action: "Open exception",
    view: "exceptions",
  },
  {
    match: /verify|verification|chapter/i,
    answer: "Five chapters still have incomplete profiles. Singapore has the largest count at 11, followed by Jakarta at 8. A chapter-scoped reminder draft is ready for review.",
    action: "Open participants",
    view: "participants",
  },
];

function sendAiMessage(prompt) {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return;
  const messages = document.querySelector("#ai-messages");
  document.querySelector(".ai-intro")?.remove();
  document.querySelector(".prompt-suggestions")?.remove();

  const userMessage = document.createElement("div");
  userMessage.className = "chat-message user";
  const userText = document.createElement("p");
  userText.textContent = cleanPrompt;
  userMessage.append(userText);
  messages.append(userMessage);

  const response = aiResponses.find((item) => item.match.test(cleanPrompt)) || {
    answer: "I found 18 records that may need review. Try asking about unmatched participants, verification gaps, urgent cases or T-052’s rematch.",
    action: "View overview",
    view: "overview",
  };
  const assistantMessage = document.createElement("div");
  assistantMessage.className = "chat-message";
  const assistantText = document.createElement("p");
  assistantText.textContent = response.answer;
  assistantMessage.append(assistantText);
  messages.append(assistantMessage);

  const resultCard = document.createElement("div");
  resultCard.className = "chat-result-card";
  resultCard.innerHTML = `<strong>Suggested next step</strong><p>No data will change until you confirm an action.</p><button type="button">${response.action} →</button>`;
  resultCard.querySelector("button").addEventListener("click", () => {
    closeLayers();
    setView(response.view);
  });
  messages.append(resultCard);
  messages.scrollTop = messages.scrollHeight;
}

document.querySelectorAll("[data-ai-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendAiMessage(button.dataset.aiPrompt));
});

document.querySelector("#ai-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#ai-input");
  sendAiMessage(input.value);
  input.value = "";
});

document.querySelector("#ai-input")?.addEventListener("input", (event) => {
  event.currentTarget.style.height = "auto";
  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 90)}px`;
});

const initialView = window.location.hash.replace("#", "");
if (viewLabels[initialView]) setView(initialView);
