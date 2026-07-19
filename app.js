const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "wordyProject";
const AI_STORAGE_KEY = "wordyAiSettings";
const POINTS_PER_INCH = 72;

const trimPresets = {
  "5x8": [5, 8],
  "5.25x8": [5.25, 8],
  "5.5x8.5": [5.5, 8.5],
  "6x9": [6, 9],
  "7x10": [7, 10],
  "8.5x11": [8.5, 11]
};

const paperThickness = {
  whiteBw: 0.002252,
  creamBw: 0.0025,
  groundwood: 0.00235,
  color: 0.002347
};

const state = {
  meta: {
    title: "",
    subtitle: "",
    author: "",
    type: "nonfiction",
    targetReader: ""
  },
  format: {
    trimPreset: "5.5x8.5",
    width: 5.5,
    height: 8.5,
    bleedMode: "noBleed",
    paperType: "whiteBw",
    manualPages: "",
    fontSize: 11,
    lineHeight: 1.22
  },
  cover: {
    backHeadline: "",
    backBlurb: "",
    authorBio: ""
  },
  inspiration: "",
  activeChapter: 0,
  chapters: []
};

const sampleChapters = {
  nonfiction: [
    ["Introduction: The Promise", "Write the problem your reader feels, the standard your book defends, and the transformation the reader should expect. Keep it direct and serious."],
    ["Chapter One: The Pattern", "Define the pattern. Show how it appears in everyday life. Use concrete examples and clear claims."],
    ["Chapter Two: The Cost", "Explain what happens when the reader ignores the problem. Make the cost emotional, practical, financial, and spiritual if relevant."],
    ["Chapter Three: The Standard", "Lay out the principle. Give the reader a clean framework they can remember and use."],
    ["Chapter Four: The Practice", "Turn the principle into action steps. Use checklists, reflection questions, and plain assignments."],
    ["Conclusion: The Charge", "Close with conviction. Remind the reader what must change and what they must do next."]
  ],
  memoir: [
    ["Opening: Where It Started", "Begin with a real scene. Show the moment before everything changed."],
    ["Chapter One: The Weight", "Explain the pressure, conflict, or burden you carried."],
    ["Chapter Two: The Turning", "Show the decision, failure, lesson, or encounter that forced growth."],
    ["Chapter Three: The Rebuild", "Explain how you rebuilt your thinking, habits, faith, work, or family."],
    ["Final Chapter: What Remains", "Give the reader the lesson with honesty, restraint, and clarity."],
    ["Author Note", "Explain why you wrote the book and who it is meant to help."]
  ],
  story: [
    ["Page 1: The Ordinary Day", "Introduce the child, setting, and simple problem in clear language."],
    ["Page 2: The Discovery", "The child finds something unusual or faces a choice."],
    ["Page 3: The Challenge", "Make the obstacle understandable for young readers."],
    ["Page 4: The Helper", "Introduce a guide, friend, parent, elder, or lesson."],
    ["Page 5: The Brave Choice", "The child makes a wise or courageous decision."],
    ["Page 6: The Lesson", "End clearly and say what was learned."]
  ],
  journal: [
    ["Title Page", "Add title, subtitle, author, and edition."],
    ["How To Use This Journal", "Explain the daily rhythm, who it is for, and how often to write."],
    ["Section One: Reflection", "Create 10-20 prompts. Make them specific and useful."],
    ["Section Two: Planning", "Add checklists, weekly goals, and simple trackers."],
    ["Section Three: Review", "Add end-of-week and end-of-month review pages."],
    ["Closing Note", "Write a short final encouragement or instruction."]
  ],
  devotional: [
    ["Introduction", "Explain the purpose, scripture approach, and how readers should use the study."],
    ["Lesson One", "Add scripture reference, plain explanation, key lesson, and reflection questions."],
    ["Lesson Two", "Add scripture reference, plain explanation, key lesson, and reflection questions."],
    ["Lesson Three", "Add scripture reference, plain explanation, key lesson, and reflection questions."],
    ["Prayer / Reflection Pages", "Add guided prayer prompts and study notes."],
    ["Final Charge", "Close with a direct call to wisdom and action."]
  ]
};

const promptCards = [
  ["Sharper Hook", "Write the first 250 words as a serious opening that names the reader's problem quickly."],
  ["Chapter Expansion", "Expand this chapter with 5 more sections: cause, consequence, example, correction, action."],
  ["Premium Rewrite", "Rewrite the selected section with a mature, polished, grounded tone."],
  ["KDP Blurb", "Turn this book idea into a back-cover sales blurb with one strong headline and three promise bullets."],
  ["Workbook Questions", "Create 10 reflection questions that help the reader apply the chapter."],
  ["Quality Control", "Check for repetition, weak claims, vague language, stock phrases, and unsupported promises."]
];

const starterChapters = [
  { title: "Introduction", content: "Start with the reader's problem. State the promise of the book. Keep the voice serious, premium, and clear." },
  { title: "Chapter One", content: "Write the first chapter here." }
];

const aiSettings = {
  endpoint: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4o-mini",
  apiKey: "",
  temperature: 0.7,
  length: "standard"
};

let saveStatusTimer;

function cleanText(value) {
  return typeof value === "string" ? value : String(value || "");
}

function escapeHtml(text = "") {
  return cleanText(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function slugify(text) {
  return (text || "wordy-book").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "wordy-book";
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function optionalPageCount(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Math.round(clampNumber(number, 24, 24, 828));
}

function normalizeChapters(chapters) {
  if (!Array.isArray(chapters)) return [];
  return chapters.map((chapter, index) => ({
    title: cleanText(chapter?.title || `Chapter ${index + 1}`).trim(),
    content: cleanText(chapter?.content)
  }));
}

function normalizeState() {
  state.meta.title = cleanText(state.meta.title).trim();
  state.meta.subtitle = cleanText(state.meta.subtitle).trim();
  state.meta.author = cleanText(state.meta.author).trim();
  state.meta.type = sampleChapters[state.meta.type] ? state.meta.type : "nonfiction";
  state.meta.targetReader = cleanText(state.meta.targetReader).trim();
  state.format.trimPreset = (trimPresets[state.format.trimPreset] || state.format.trimPreset === "custom") ? state.format.trimPreset : "5.5x8.5";
  state.format.width = clampNumber(state.format.width, 5.5, 4, 8.5);
  state.format.height = clampNumber(state.format.height, 8.5, 6, 11.69);
  state.format.bleedMode = state.format.bleedMode === "bleed" ? "bleed" : "noBleed";
  state.format.paperType = paperThickness[state.format.paperType] ? state.format.paperType : "whiteBw";
  state.format.manualPages = optionalPageCount(state.format.manualPages);
  state.format.fontSize = clampNumber(state.format.fontSize, 11, 7, 16);
  state.format.lineHeight = clampNumber(state.format.lineHeight, 1.22, 1, 2);
  state.cover.backHeadline = cleanText(state.cover.backHeadline).trim();
  state.cover.backBlurb = cleanText(state.cover.backBlurb).trim();
  state.cover.authorBio = cleanText(state.cover.authorBio).trim();
  state.inspiration = cleanText(state.inspiration);
  state.chapters = normalizeChapters(state.chapters);
  state.activeChapter = Math.round(clampNumber(state.activeChapter, 0, 0, Math.max(state.chapters.length - 1, 0)));
}

function applyProjectData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid Wordy project data");
  }
  Object.assign(state.meta, data.meta && typeof data.meta === "object" ? data.meta : {});
  Object.assign(state.format, data.format && typeof data.format === "object" ? data.format : {});
  Object.assign(state.cover, data.cover && typeof data.cover === "object" ? data.cover : {});
  state.inspiration = data.inspiration ?? state.inspiration;
  state.activeChapter = data.activeChapter ?? state.activeChapter;
  state.chapters = normalizeChapters(data.chapters ?? state.chapters);
  normalizeState();
}

function setSaveStatus(message, tone = "") {
  const status = $("saveStatus");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
  window.clearTimeout(saveStatusTimer);
  if (message !== "Ready") {
    saveStatusTimer = window.setTimeout(() => {
      status.textContent = "Saved";
      status.dataset.tone = "";
    }, 1800);
  }
}

function setAiStatus(message, tone = "") {
  const status = $("aiStatus");
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function loadAiSettings() {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return;
    const loaded = JSON.parse(raw);
    Object.assign(aiSettings, loaded && typeof loaded === "object" ? loaded : {});
  } catch (error) {
    console.warn("Could not load AI settings", error);
  }
}

function collectAiSettings() {
  if (!$("aiEndpoint")) return;
  aiSettings.endpoint = $("aiEndpoint").value.trim();
  aiSettings.model = $("aiModel").value.trim();
  aiSettings.apiKey = $("aiApiKey").value.trim();
  aiSettings.temperature = clampNumber($("aiTemperature").value, 0.7, 0, 1.2);
  aiSettings.length = $("aiLength").value;
}

function syncAiInputs() {
  if (!$("aiEndpoint")) return;
  $("aiEndpoint").value = aiSettings.endpoint || "";
  $("aiModel").value = aiSettings.model || "";
  $("aiApiKey").value = aiSettings.apiKey || "";
  $("aiTemperature").value = aiSettings.temperature ?? 0.7;
  $("aiLength").value = aiSettings.length || "standard";
}

function saveAiSettings() {
  collectAiSettings();
  localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(aiSettings));
  setAiStatus(aiSettings.endpoint && aiSettings.model ? "AI settings saved locally." : "Add an endpoint and model before calling AI.", aiSettings.endpoint && aiSettings.model ? "success" : "warn");
}

function setAiBusy(isBusy) {
  document.querySelectorAll("#ai button").forEach(button => {
    if (button.id !== "copyAiOutputBtn") button.disabled = isBusy;
  });
}

function lengthInstruction() {
  const instructions = {
    concise: "Keep the output compact and focused.",
    standard: "Use enough depth to feel complete without padding.",
    expanded: "Give the output more depth, examples, and connective tissue."
  };
  return instructions[$("aiLength")?.value || aiSettings.length] || instructions.standard;
}

function bookContextForAi() {
  return [
    `Title: ${state.meta.title || "Untitled Book"}`,
    `Subtitle: ${state.meta.subtitle || "None"}`,
    `Author: ${state.meta.author || "Author Name"}`,
    `Book type: ${state.meta.type}`,
    `Target reader: ${state.meta.targetReader || "Not specified"}`,
    `Trim: ${state.format.width} x ${state.format.height} in`,
    `Existing chapters: ${state.chapters.map(ch => ch.title).join(", ") || "None"}`,
    state.inspiration ? `Inspiration notes:\n${state.inspiration.slice(0, 5000)}` : ""
  ].filter(Boolean).join("\n");
}

function humanVoiceInstruction() {
  return [
    "Write like a thoughtful human author, not a generic AI assistant.",
    "Use natural sentence rhythm, concrete details, plain confidence, and emotionally believable transitions.",
    "Avoid robotic phrases, repetitive summaries, filler, hype, exaggerated promises, and generic motivational language.",
    "Preserve the author's intent while making the prose warmer, clearer, more mature, and more premium."
  ].join(" ");
}

function composeBookPrompt() {
  collectFromInputs();
  collectAiSettings();
  const chapterCount = clampNumber($("aiChapterCount").value, 8, 3, 30);
  const wordsPerChapter = clampNumber($("aiWordsPerChapter").value, 1200, 300, 5000);
  const brief = $("aiBookBrief").value.trim();
  const direction = $("aiBookDirection").value.trim();
  return `You are writing a complete KDP-ready book draft for Wordy.\n\n${humanVoiceInstruction()}\n\nBook context:\n${bookContextForAi()}\n\nUser brief:\n${brief || "Use the book setup fields and inspiration notes to create the strongest possible book concept."}\n\nDirection:\n${direction || "Make it useful, readable, practical, and polished."}\n\nStructure requirements:\n- Create ${Math.round(chapterCount)} chapters.\n- Aim for about ${Math.round(wordsPerChapter)} words per chapter in the final draft direction.\n- Include clear chapter titles.\n- Keep the voice human, specific, and premium.\n- ${lengthInstruction()}\n\nReturn strict JSON only, with this exact shape:\n{\n  "title": "Book title",\n  "subtitle": "Optional subtitle",\n  "backHeadline": "Short back-cover headline",\n  "backBlurb": "Back-cover blurb",\n  "authorBio": "Short author bio placeholder or suggested bio",\n  "chapters": [\n    { "title": "Chapter title", "content": "Full chapter content with paragraphs separated by blank lines" }\n  ]\n}`;
}

function selectedChapterText() {
  const textarea = $("chapterContent");
  if (!textarea || textarea.disabled) return "";
  return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();
}

function polishSourceText() {
  const source = $("aiPolishSource").value;
  const active = state.chapters[state.activeChapter];
  const pasted = $("aiSourceText").value.trim();
  if (source === "selected") return selectedChapterText() || (active?.content || "");
  if (source === "pasted") return pasted;
  if (source === "fullBook") return allText();
  return pasted || active?.content || "";
}

function composePolishPrompt() {
  collectFromInputs();
  collectAiSettings();
  const mode = $("aiPolishMode").value;
  const modeInstructions = {
    humanPremium: "Rewrite this so it sounds far more human, premium, emotionally grounded, and author-like.",
    preserveVoice: "Preserve the original voice and meaning, but clean up awkward phrasing, rhythm, repetition, and clarity.",
    lineEdit: "Line edit for clarity, flow, grammar, sentence rhythm, and stronger word choice.",
    expand: "Expand with more depth, examples, transitions, and substance while keeping the author's intent.",
    simplify: "Simplify, tighten, and make the ideas easier to understand without making the prose feel basic."
  };
  const text = polishSourceText();
  const direction = $("aiPolishDirection").value.trim();
  return `You are Wordy's premium manuscript editor.\n\n${humanVoiceInstruction()}\n\nBook context:\n${bookContextForAi()}\n\nTask:\n${modeInstructions[mode] || modeInstructions.humanPremium}\n${direction ? `Additional user direction: ${direction}` : ""}\n${lengthInstruction()}\n\nRules:\n- Return polished manuscript text only.\n- Keep paragraph breaks.\n- Do not add commentary before or after the rewrite.\n- Do not mention that AI edited the text.\n\nText to polish:\n${text || "No source text was provided. Ask for manuscript text if this were a chat, but for this app return a short note that text is needed."}`;
}

function extractAiText(data) {
  if (typeof data?.choices?.[0]?.message?.content === "string") return data.choices[0].message.content;
  if (typeof data?.output_text === "string") return data.output_text;
  const output = data?.output;
  if (Array.isArray(output)) {
    return output.flatMap(item => item.content || []).map(part => part.text || part.value || "").join("\n").trim();
  }
  return "";
}

async function callAi(prompt, label) {
  collectAiSettings();
  if (!aiSettings.endpoint || !aiSettings.model) {
    $("aiOutput").value = prompt;
    setAiStatus("Prompt ready. Add an AI endpoint/model or copy the prompt into your AI tool.", "warn");
    return "";
  }
  if (!aiSettings.apiKey && /api\.openai\.com/i.test(aiSettings.endpoint)) {
    $("aiOutput").value = prompt;
    setAiStatus("Prompt ready. Add an API key, use a local AI endpoint, or copy this prompt into your AI tool.", "warn");
    return "";
  }

  setAiBusy(true);
  setAiStatus(`${label}...`, "success");
  try {
    const headers = { "Content-Type": "application/json" };
    if (aiSettings.apiKey) headers.Authorization = `Bearer ${aiSettings.apiKey}`;
    const response = await fetch(aiSettings.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: aiSettings.model,
        temperature: aiSettings.temperature,
        messages: [
          { role: "system", content: "You are Wordy, a premium KDP book writing and editing assistant." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!response.ok) throw new Error(await response.text());
    const content = extractAiText(await response.json());
    if (!content) throw new Error("The AI response did not include usable text.");
    $("aiOutput").value = content;
    setAiStatus("AI output ready. Review it before applying.", "success");
    return content;
  } catch (error) {
    console.warn("AI request failed", error);
    $("aiOutput").value = prompt;
    setAiStatus("AI request failed. The prompt is ready to copy, or use a CORS-enabled endpoint/local proxy.", "warn");
    return "";
  } finally {
    setAiBusy(false);
  }
}

async function copyTextToClipboard(text, successMessage = "Copied.") {
  try {
    await navigator.clipboard.writeText(text);
    setAiStatus(successMessage, "success");
  } catch (error) {
    $("aiOutput").value = text;
    $("aiOutput").focus();
    $("aiOutput").select();
    setAiStatus("Copy blocked by browser. The text is selected for manual copy.", "warn");
  }
}

function parseAiJson(text) {
  const raw = cleanText(text).trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw error;
  }
}

function applyGeneratedBookDraft() {
  const output = $("aiOutput").value.trim();
  if (!output) {
    setAiStatus("No AI output to apply yet.", "warn");
    return;
  }
  let draft;
  try {
    draft = parseAiJson(output);
  } catch (error) {
    setAiStatus("This output is not a structured book draft. Use Replace Current Chapter or Insert as New Chapter instead.", "warn");
    return;
  }
  const chapters = normalizeChapters(draft.chapters);
  if (!chapters.length) {
    setAiStatus("The draft did not include chapters.", "warn");
    return;
  }
  const hasWork = state.chapters.some(chapter => chapter.title.trim() || chapter.content.trim());
  if (hasWork && !confirm("Replace the current book with this AI draft?")) return;
  state.meta.title = cleanText(draft.title || state.meta.title).trim();
  state.meta.subtitle = cleanText(draft.subtitle || state.meta.subtitle).trim();
  state.cover.backHeadline = cleanText(draft.backHeadline || state.cover.backHeadline).trim();
  state.cover.backBlurb = cleanText(draft.backBlurb || state.cover.backBlurb).trim();
  state.cover.authorBio = cleanText(draft.authorBio || state.cover.authorBio).trim();
  state.chapters = chapters;
  state.activeChapter = 0;
  save({ collect: false });
  render();
  setAiStatus("AI book draft applied.", "success");
}

function replaceCurrentChapterWithAi() {
  const output = $("aiOutput").value.trim();
  const active = state.chapters[state.activeChapter];
  if (!output || !active) {
    setAiStatus("No AI output or active chapter to replace.", "warn");
    return;
  }
  active.content = output;
  save({ collect: false });
  render();
  setAiStatus("Current chapter replaced with AI-polished text.", "success");
}

function insertAiOutputAsChapter() {
  const output = $("aiOutput").value.trim();
  if (!output) {
    setAiStatus("No AI output to insert.", "warn");
    return;
  }
  state.chapters.push({ title: `AI Draft ${state.chapters.length + 1}`, content: output });
  state.activeChapter = state.chapters.length - 1;
  save({ collect: false });
  render();
  setAiStatus("AI output inserted as a new chapter.", "success");
}

function wordsOf(text) {
  return cleanText(text).trim().split(/\s+/).filter(Boolean).length;
}

function allText() {
  return state.chapters.map(ch => `${ch.title}\n${ch.content}`).join("\n\n");
}

function estimatedPages() {
  const manual = Number(state.format.manualPages);
  if (manual >= 24) return Math.min(828, Math.round(manual));
  const words = wordsOf(allText());
  return Math.max(24, Math.min(828, Math.ceil(words / 250) + 6));
}

function gutterForPages(pages) {
  if (pages <= 150) return 0.375;
  if (pages <= 300) return 0.5;
  if (pages <= 500) return 0.625;
  if (pages <= 700) return 0.75;
  return 0.875;
}

function outsideMargin() {
  return state.format.bleedMode === "bleed" ? 0.375 : 0.375;
}

function minimumOutsideMargin() {
  return state.format.bleedMode === "bleed" ? 0.375 : 0.25;
}

function spineWidth() {
  return estimatedPages() * (paperThickness[state.format.paperType] || paperThickness.whiteBw);
}

function coverDimensions() {
  const bleed = 0.125;
  const w = Number(state.format.width);
  const h = Number(state.format.height);
  const spine = spineWidth();
  return {
    width: bleed + w + spine + w + bleed,
    height: bleed + h + bleed,
    spine,
    bleed
  };
}

function collectFromInputs() {
  state.meta.title = $("bookTitle").value.trim();
  state.meta.subtitle = $("bookSubtitle").value.trim();
  state.meta.author = $("authorName").value.trim();
  state.meta.type = $("bookType").value;
  state.meta.targetReader = $("targetReader").value.trim();
  state.format.trimPreset = $("trimPreset").value;
  state.format.width = clampNumber($("trimWidth").value, 5.5, 4, 8.5);
  state.format.height = clampNumber($("trimHeight").value, 8.5, 6, 11.69);
  state.format.bleedMode = $("bleedMode").value;
  state.format.paperType = $("paperType").value;
  state.format.manualPages = optionalPageCount($("manualPages").value.trim());
  state.format.fontSize = clampNumber($("fontSize").value, 11, 7, 16);
  state.format.lineHeight = clampNumber($("lineHeight").value, 1.22, 1, 2);
  state.cover.backHeadline = $("backHeadline").value.trim();
  state.cover.backBlurb = $("backBlurb").value.trim();
  state.cover.authorBio = $("authorBio").value.trim();
  state.inspiration = $("inspirationText").value;
  const active = state.chapters[state.activeChapter];
  if (active) {
    active.title = $("chapterTitle").value.trim();
    active.content = $("chapterContent").value;
  }
  normalizeState();
}

function save({ announce = false, collect = true } = {}) {
  try {
    if (collect) collectFromInputs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (announce) setSaveStatus("Saved locally", "success");
  } catch (error) {
    console.warn("Could not save Wordy project", error);
    setSaveStatus("Save blocked", "warn");
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    applyProjectData(JSON.parse(raw));
  } catch (error) {
    console.warn("Could not load Wordy project", error);
    setSaveStatus("Could not load", "warn");
  }
}

function syncInputs() {
  $("bookTitle").value = state.meta.title || "";
  $("bookSubtitle").value = state.meta.subtitle || "";
  $("authorName").value = state.meta.author || "";
  $("bookType").value = state.meta.type || "nonfiction";
  $("targetReader").value = state.meta.targetReader || "";
  $("trimPreset").value = state.format.trimPreset || "5.5x8.5";
  $("trimWidth").value = state.format.width || 5.5;
  $("trimHeight").value = state.format.height || 8.5;
  $("bleedMode").value = state.format.bleedMode || "noBleed";
  $("paperType").value = state.format.paperType || "whiteBw";
  $("manualPages").value = state.format.manualPages || "";
  $("fontSize").value = state.format.fontSize || 11;
  $("lineHeight").value = state.format.lineHeight || 1.22;
  $("backHeadline").value = state.cover.backHeadline || "";
  $("backBlurb").value = state.cover.backBlurb || "";
  $("authorBio").value = state.cover.authorBio || "";
  $("inspirationText").value = state.inspiration || "";
}

function render() {
  normalizeState();
  syncInputs();
  syncAiInputs();
  renderChapterTabs();
  renderActiveChapter();
  renderPrompts();
  updateMetrics();
  updateSpecs();
  updateCover();
  updateExportDetails();
  renderPreview();
  injectPrintStyle();
}

function renderChapterTabs() {
  const container = $("chapterTabs");
  container.innerHTML = "";
  if (!state.chapters.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No chapters yet. Create a blueprint or add a chapter.";
    container.appendChild(empty);
    return;
  }
  state.chapters.forEach((chapter, index) => {
    const button = document.createElement("button");
    button.className = `chapter-tab ${index === state.activeChapter ? "active" : ""}`;
    button.textContent = `${index + 1}. ${chapter.title || "Untitled"}`;
    button.addEventListener("click", () => {
      save();
      state.activeChapter = index;
      render();
    });
    container.appendChild(button);
  });
}

function renderActiveChapter() {
  const chapter = state.chapters[state.activeChapter];
  const hasChapter = Boolean(chapter);
  $("activeChapterHeading").textContent = hasChapter ? chapter.title || "Untitled Chapter" : "No chapter selected";
  $("chapterTitle").disabled = !hasChapter;
  $("chapterContent").disabled = !hasChapter;
  $("moveUpBtn").disabled = !hasChapter || state.activeChapter === 0;
  $("moveDownBtn").disabled = !hasChapter || state.activeChapter >= state.chapters.length - 1;
  $("deleteChapterBtn").disabled = !hasChapter;
  $("chapterTitle").value = hasChapter ? chapter.title : "";
  $("chapterContent").value = hasChapter ? chapter.content : "";
}

function renderPrompts() {
  const grid = $("promptGrid");
  if (grid.dataset.rendered) return;
  promptCards.forEach(([title, prompt]) => {
    const card = document.createElement("div");
    card.className = "prompt-card";
    card.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(prompt)}</p><button class="ghost small">Insert prompt</button>`;
    card.querySelector("button").addEventListener("click", () => insertText(`\n\n[${title}]\n${prompt}\n`));
    grid.appendChild(card);
  });
  grid.dataset.rendered = "true";
}

function updateMetrics() {
  const words = wordsOf(allText());
  const pages = estimatedPages();
  $("wordCountMetric").textContent = words.toLocaleString();
  $("pageCountMetric").textContent = pages.toLocaleString();
  $("chapterCountMetric").textContent = state.chapters.length.toLocaleString();
  const title = state.meta.title || "Untitled Book";
  const subtitle = state.meta.subtitle || "A refined manuscript built for Amazon KDP.";
  const author = state.meta.author || "Author Name";
  $("coverTitleLive").textContent = title;
  $("coverSubtitleLive").textContent = subtitle;
  $("coverAuthorLive").textContent = `by ${author}`;
}

function updateSpecs() {
  const pages = estimatedPages();
  const gutter = gutterForPages(pages);
  const outside = outsideMargin();
  const cover = coverDimensions();
  const bleed = state.format.bleedMode === "bleed";
  const pageW = bleed ? state.format.width + 0.125 : state.format.width;
  const pageH = bleed ? state.format.height + 0.25 : state.format.height;
  const specRows = [
    ["Trim size", `${state.format.width.toFixed(3)} x ${state.format.height.toFixed(3)} in`],
    ["Interior page size", `${pageW.toFixed(3)} x ${pageH.toFixed(3)} in`],
    ["Estimated page count", `${pages} pages`],
    ["Inside / gutter margin", `${gutter.toFixed(3)} in minimum`],
    ["Outside margin", `${outside.toFixed(3)} in recommended (${minimumOutsideMargin().toFixed(3)} in minimum)`],
    ["Spine width", `${cover.spine.toFixed(3)} in`],
    ["Cover wrap size", `${cover.width.toFixed(3)} x ${cover.height.toFixed(3)} in`],
    ["Cover wrap at 300 DPI", `${Math.round(cover.width * 300)} x ${Math.round(cover.height * 300)} px`]
  ];
  $("specList").innerHTML = specRows.map(([label, value]) => `<div class="spec-item"><span>${label}</span><strong>${value}</strong></div>`).join("");

  const warnings = [];
  if (pages < 80) warnings.push("Do not put text on the spine. KDP only prints spine text above 79 pages.");
  if (state.format.width < 4 || state.format.width > 8.5 || state.format.height < 6 || state.format.height > 11.69) warnings.push("Your custom trim is outside KDP paperback custom-size limits.");
  if (Number(state.format.fontSize) < 7) warnings.push("Interior font size is below KDP's 7 pt minimum.");
  const status = $("statusBox");
  status.className = warnings.length ? "status-box warn" : "status-box";
  status.textContent = warnings.length ? warnings.join(" ") : "Looks clean for a normal KDP paperback setup. Still run the final PDF through KDP Previewer before publishing.";

  const list = [
    "Use single pages, not two-page spreads.",
    "Use PDF for interiors with bleed or full-page images.",
    "Keep live text inside the safe margin area.",
    "Use 300 DPI images for print interiors and covers.",
    "Export one continuous cover wrap: back + spine + front.",
    pages >= 80 ? "Spine text is allowed by page count; keep it safely inside the spine edges." : "No spine text at this page count. Leave the spine blank or use continuous art.",
    "Disclose AI-generated final text/images in KDP if AI created publishable content."
  ];
  $("kdpChecklist").innerHTML = list.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  $("previewLabel").textContent = `${state.format.width} x ${state.format.height} in - ${bleed ? "bleed" : "no bleed"}`;
  document.documentElement.style.setProperty("--preview-w", state.format.width);
  document.documentElement.style.setProperty("--preview-h", state.format.height);
  document.documentElement.style.setProperty("--preview-inside", gutter);
  document.documentElement.style.setProperty("--preview-outside", outside);
  document.documentElement.style.setProperty("--preview-top", 0.72);
  document.documentElement.style.setProperty("--preview-bottom", 0.72);
  document.documentElement.style.setProperty("--preview-font", `${state.format.fontSize}pt`);
  document.documentElement.style.setProperty("--preview-line", state.format.lineHeight);
}

function updateCover() {
  const title = state.meta.title || "Untitled Book";
  const subtitle = state.meta.subtitle || "Subtitle";
  $("frontTitleLive").textContent = title;
  $("frontSubtitleLive").textContent = subtitle;
  $("backHeadlineLive").textContent = state.cover.backHeadline || "Back-cover headline";
  $("backBlurbLive").textContent = state.cover.backBlurb || "Your blurb will appear here.";
  $("spineLive").textContent = estimatedPages() >= 80 ? title : "NO SPINE TEXT";
}

function interiorLabel() {
  const labels = {
    whiteBw: "Black & White",
    creamBw: "Black & White",
    groundwood: "Black & White",
    color: "Color"
  };
  return labels[state.format.paperType] || "Black & White";
}

function updateExportDetails() {
  const detailTitle = $("detailTitle");
  if (!detailTitle) return;
  detailTitle.textContent = state.meta.title || "Your Book Title";
  $("detailAuthor").textContent = state.meta.author || "Author Name";
  $("detailTrim").textContent = `${state.format.width} x ${state.format.height} in`;
  $("detailPages").textContent = estimatedPages().toLocaleString();
  $("detailInterior").textContent = interiorLabel();
  $("detailBleed").textContent = state.format.bleedMode === "bleed" ? "Bleed" : "No Bleed";
  $("exportReadyLabel").textContent = state.chapters.length ? "Ready for export." : "Add chapters before export.";
}

function renderPreview() {
  const title = state.meta.title || "Untitled Book";
  const subtitle = state.meta.subtitle || "A refined manuscript built for Amazon KDP.";
  const author = state.meta.author || "Author Name";
  const frontMatter = `
    <section class="preview-page preview-title-page">
      <p style="letter-spacing:0;text-transform:uppercase;font-size:9pt;">Wordy Edition</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
      <p style="margin-top:4rem;">${escapeHtml(author)}</p>
    </section>
    <section class="preview-page">
      <h2>Copyright</h2>
      <p>Copyright (c) ${new Date().getFullYear()} ${escapeHtml(author)}. All rights reserved.</p>
      <p>No part of this book may be reproduced, stored, or transmitted without written permission from the author, except for brief quotations used in reviews or commentary.</p>
    </section>
    <section class="preview-page">
      <h2>Table of Contents</h2>
      ${state.chapters.map((ch, i) => `<p>${i + 1}. ${escapeHtml(ch.title || "Untitled Chapter")}</p>`).join("")}
    </section>`;
  const chaptersHtml = state.chapters.map(ch => `
    <section class="preview-page">
      <h2>${escapeHtml(ch.title || "Untitled Chapter")}</h2>
      ${paragraphize(ch.content)}
    </section>`).join("");
  const backMatter = `
    <section class="preview-page">
      <h2>About the Author</h2>
      <p>${escapeHtml(state.cover.authorBio || "Add a short author bio in the Cover section.")}</p>
    </section>`;
  $("manuscriptPreview").innerHTML = frontMatter + chaptersHtml + backMatter;
}

function paragraphize(text = "") {
  if (!text.trim()) return "<p><em>Write chapter content here.</em></p>";
  return text.split(/\n{2,}/).map(block => {
    const lines = block.trim().split("\n");
    const safe = escapeHtml(block.trim()).replace(/\n/g, "<br>");
    if (/^\[.*\]$/.test(lines[0] || "")) {
      const label = escapeHtml(lines[0]);
      const body = escapeHtml(lines.slice(1).join("\n").trim()).replace(/\n/g, "<br>");
      return `<p><strong>${label}</strong>${body ? `<br>${body}` : ""}</p>`;
    }
    return `<p>${safe}</p>`;
  }).join("");
}

function injectPrintStyle() {
  let style = document.getElementById("wordyPrintPageStyle");
  if (!style) {
    style = document.createElement("style");
    style.id = "wordyPrintPageStyle";
    document.head.appendChild(style);
  }
  const bleed = state.format.bleedMode === "bleed";
  const width = bleed ? state.format.width + 0.125 : state.format.width;
  const height = bleed ? state.format.height + 0.25 : state.format.height;
  style.textContent = `@page { size: ${width}in ${height}in; margin: .72in ${outsideMargin()}in .72in ${gutterForPages(estimatedPages())}in; }`;
}

function insertText(text) {
  const textarea = $("chapterContent");
  if (textarea.disabled) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  collectFromInputs();
  save();
  renderPreview();
  updateMetrics();
  updateSpecs();
  updateCover();
  updateExportDetails();
  injectPrintStyle();
}

function hasCustomChapterWork() {
  if (state.chapters.length !== starterChapters.length) return state.chapters.length > 0;
  return state.chapters.some((chapter, index) => (
    chapter.title.trim() !== starterChapters[index].title ||
    chapter.content.trim() !== starterChapters[index].content
  ));
}

function createBlueprint() {
  save();
  if (hasCustomChapterWork() && !confirm("Replace the current chapter outline with a new blueprint?")) return;
  const type = state.meta.type || "nonfiction";
  state.chapters = (sampleChapters[type] || sampleChapters.nonfiction).map(([title, content]) => ({ title, content }));
  state.activeChapter = 0;
  save({ collect: false });
  render();
}

function addChapter() {
  save();
  const next = state.chapters.length + 1;
  state.chapters.push({ title: `Chapter ${next}`, content: "" });
  state.activeChapter = state.chapters.length - 1;
  save({ collect: false });
  render();
}

function deleteChapter() {
  if (!state.chapters.length) return;
  if (!confirm("Delete this chapter?")) return;
  state.chapters.splice(state.activeChapter, 1);
  state.activeChapter = Math.max(0, state.activeChapter - 1);
  save({ collect: false });
  render();
}

function moveChapter(direction) {
  save();
  const index = state.activeChapter;
  const target = index + direction;
  if (target < 0 || target >= state.chapters.length) return;
  [state.chapters[index], state.chapters[target]] = [state.chapters[target], state.chapters[index]];
  state.activeChapter = target;
  save({ collect: false });
  render();
}

function download(filename, content, type = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
}

function manuscriptHtmlDocument() {
  collectFromInputs();
  const title = state.meta.title || "Untitled Book";
  const bleed = state.format.bleedMode === "bleed";
  const width = bleed ? state.format.width + 0.125 : state.format.width;
  const height = bleed ? state.format.height + 0.25 : state.format.height;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:${width}in ${height}in;margin:.72in ${outsideMargin()}in .72in ${gutterForPages(estimatedPages())}in}
    body{font-family:Georgia,serif;font-size:${state.format.fontSize}pt;line-height:${state.format.lineHeight};color:#111;background:white}
    section{page-break-after:always} h1,h2{text-align:center;line-height:1.1}
  </style></head><body>${$("manuscriptPreview").innerHTML}</body></html>`;
}

function manuscriptMarkdown() {
  collectFromInputs();
  const lines = [];
  lines.push(`# ${state.meta.title || "Untitled Book"}`);
  if (state.meta.subtitle) lines.push(`\n## ${state.meta.subtitle}`);
  lines.push(`\nby ${state.meta.author || "Author Name"}\n`);
  lines.push("\n---\n");
  lines.push(`## Copyright\n\nCopyright (c) ${new Date().getFullYear()} ${state.meta.author || "Author Name"}. All rights reserved.\n`);
  state.chapters.forEach(ch => {
    lines.push(`\n---\n\n## ${ch.title || "Untitled Chapter"}\n\n${ch.content || ""}\n`);
  });
  if (state.cover.authorBio) lines.push(`\n---\n\n## About the Author\n\n${state.cover.authorBio}\n`);
  return lines.join("\n");
}

function escapeXml(text = "") {
  return cleanText(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  }[char]));
}

function textFileBytes(content) {
  return new TextEncoder().encode(content);
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach(chunk => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

let crcTable;

function crc32(bytes) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    });
  }
  let crc = 0xffffffff;
  bytes.forEach(byte => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function zipHeader(length) {
  const bytes = new Uint8Array(length);
  return { bytes, view: new DataView(bytes.buffer) };
}

function createZip(files, type = "application/zip") {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, date } = dosTimestamp();

  files.forEach(file => {
    const nameBytes = textFileBytes(file.name);
    const contentBytes = file.content instanceof Uint8Array ? file.content : textFileBytes(file.content);
    const crc = crc32(contentBytes);
    const local = zipHeader(30);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0x0800, true);
    local.view.setUint16(8, 0, true);
    local.view.setUint16(10, time, true);
    local.view.setUint16(12, date, true);
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, contentBytes.length, true);
    local.view.setUint32(22, contentBytes.length, true);
    local.view.setUint16(26, nameBytes.length, true);
    local.view.setUint16(28, 0, true);
    localParts.push(local.bytes, nameBytes, contentBytes);

    const central = zipHeader(46);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(8, 0x0800, true);
    central.view.setUint16(10, 0, true);
    central.view.setUint16(12, time, true);
    central.view.setUint16(14, date, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, contentBytes.length, true);
    central.view.setUint32(24, contentBytes.length, true);
    central.view.setUint16(28, nameBytes.length, true);
    central.view.setUint16(30, 0, true);
    central.view.setUint16(32, 0, true);
    central.view.setUint16(34, 0, true);
    central.view.setUint16(36, 0, true);
    central.view.setUint32(38, 0, true);
    central.view.setUint32(42, offset, true);
    centralParts.push(central.bytes, nameBytes);

    offset += local.bytes.length + nameBytes.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = zipHeader(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, centralDirectory.length, true);
  end.view.setUint32(16, offset, true);
  end.view.setUint16(20, 0, true);

  return new Blob([concatBytes(localParts), centralDirectory, end.bytes], { type });
}

function docxParagraph(text, style = "") {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function docxPageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function manuscriptDocxDocument() {
  collectFromInputs();
  const pageWidth = Math.round((state.format.width + (state.format.bleedMode === "bleed" ? 0.125 : 0)) * 1440);
  const pageHeight = Math.round((state.format.height + (state.format.bleedMode === "bleed" ? 0.25 : 0)) * 1440);
  const body = [];
  body.push(docxParagraph(state.meta.title || "Untitled Book", "Title"));
  if (state.meta.subtitle) body.push(docxParagraph(state.meta.subtitle, "Subtitle"));
  body.push(docxParagraph(`by ${state.meta.author || "Author Name"}`));
  body.push(docxPageBreak());
  body.push(docxParagraph("Copyright", "Heading1"));
  body.push(docxParagraph(`Copyright (c) ${new Date().getFullYear()} ${state.meta.author || "Author Name"}. All rights reserved.`));
  body.push(docxParagraph("No part of this book may be reproduced, stored, or transmitted without written permission from the author, except for brief quotations used in reviews or commentary."));
  body.push(docxPageBreak());
  body.push(docxParagraph("Table of Contents", "Heading1"));
  state.chapters.forEach((chapter, index) => body.push(docxParagraph(`${index + 1}. ${chapter.title || "Untitled Chapter"}`)));
  state.chapters.forEach(chapter => {
    body.push(docxPageBreak());
    body.push(docxParagraph(chapter.title || "Untitled Chapter", "Heading1"));
    const paragraphs = cleanText(chapter.content).split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    (paragraphs.length ? paragraphs : ["Write chapter content here."]).forEach(paragraph => {
      paragraph.split(/\n/).forEach(line => body.push(docxParagraph(line)));
    });
  });
  body.push(docxPageBreak());
  body.push(docxParagraph("About the Author", "Heading1"));
  body.push(docxParagraph(state.cover.authorBio || "Add a short author bio in the Cover section."));

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}"/><w:pgMar w:top="1037" w:right="${Math.round(outsideMargin() * 1440)}" w:bottom="1037" w:left="${Math.round(gutterForPages(estimatedPages()) * 1440)}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="${Math.round(state.format.fontSize * 2)}"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="56"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:i/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style></w:styles>`;
  return createZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", content: documentXml },
    { name: "word/styles.xml", content: stylesXml }
  ], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

function xhtmlPage(title, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>${escapeXml(title)}</title><meta charset="utf-8"/></head><body>${content}</body></html>`;
}

function xhtmlParagraphs(text) {
  const paragraphs = cleanText(text).split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return (paragraphs.length ? paragraphs : ["Write chapter content here."]).map(paragraph => `<p>${escapeXml(paragraph).replace(/\n/g, "<br/>")}</p>`).join("");
}

function manuscriptEpubDocument() {
  collectFromInputs();
  const bookTitle = state.meta.title || "Untitled Book";
  const author = state.meta.author || "Author Name";
  const chapterFiles = state.chapters.map((chapter, index) => ({
    id: `chapter-${index + 1}`,
    href: `chapter-${index + 1}.xhtml`,
    title: chapter.title || `Chapter ${index + 1}`,
    content: xhtmlPage(chapter.title || `Chapter ${index + 1}`, `<h1>${escapeXml(chapter.title || `Chapter ${index + 1}`)}</h1>${xhtmlParagraphs(chapter.content)}`)
  }));
  const manifestChapters = chapterFiles.map(file => `<item id="${file.id}" href="${file.href}" media-type="application/xhtml+xml"/>`).join("");
  const spineChapters = chapterFiles.map(file => `<itemref idref="${file.id}"/>`).join("");
  const navItems = chapterFiles.map(file => `<li><a href="${file.href}">${escapeXml(file.title)}</a></li>`).join("");
  const uniqueId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `wordy-${Date.now()}`;
  const files = [
    { name: "mimetype", content: "application/epub+zip" },
    { name: "META-INF/container.xml", content: `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>` },
    { name: "OEBPS/content.opf", content: `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">urn:uuid:${uniqueId}</dc:identifier><dc:title>${escapeXml(bookTitle)}</dc:title><dc:creator>${escapeXml(author)}</dc:creator><dc:language>en</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/><item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/><item id="about" href="about.xhtml" media-type="application/xhtml+xml"/>${manifestChapters}</manifest><spine><itemref idref="title"/><itemref idref="copyright"/>${spineChapters}<itemref idref="about"/></spine></package>` },
    { name: "OEBPS/nav.xhtml", content: xhtmlPage("Table of Contents", `<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>Table of Contents</h1><ol><li><a href="title.xhtml">Title Page</a></li><li><a href="copyright.xhtml">Copyright</a></li>${navItems}<li><a href="about.xhtml">About the Author</a></li></ol></nav>`) },
    { name: "OEBPS/title.xhtml", content: xhtmlPage(bookTitle, `<h1>${escapeXml(bookTitle)}</h1>${state.meta.subtitle ? `<p>${escapeXml(state.meta.subtitle)}</p>` : ""}<p>by ${escapeXml(author)}</p>`) },
    { name: "OEBPS/copyright.xhtml", content: xhtmlPage("Copyright", `<h1>Copyright</h1><p>Copyright (c) ${new Date().getFullYear()} ${escapeXml(author)}. All rights reserved.</p>`) },
    ...chapterFiles.map(file => ({ name: `OEBPS/${file.href}`, content: file.content })),
    { name: "OEBPS/about.xhtml", content: xhtmlPage("About the Author", `<h1>About the Author</h1>${xhtmlParagraphs(state.cover.authorBio || "Add a short author bio in the Cover section.")}`) }
  ];
  return createZip(files, "application/epub+zip");
}

function normalizePdfText(text = "") {
  return cleanText(text)
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/©/g, "(c)")
    .normalize("NFKD")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function escapePdfLiteral(text = "") {
  return normalizePdfText(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
}

function textWidth(text, size, font = "regular") {
  const weight = font === "bold" ? 0.58 : 0.52;
  return normalizePdfText(text).length * size * weight;
}

function wrapPdfText(text, size, maxWidth) {
  const words = normalizePdfText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach(word => {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth || !current) {
      current = candidate;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function pdfPageSize() {
  const bleed = state.format.bleedMode === "bleed";
  return {
    width: (bleed ? state.format.width + 0.125 : state.format.width) * POINTS_PER_INCH,
    height: (bleed ? state.format.height + 0.25 : state.format.height) * POINTS_PER_INCH
  };
}

function buildPdfLines() {
  collectFromInputs();
  const { width, height } = pdfPageSize();
  const marginTop = 0.72 * POINTS_PER_INCH;
  const marginBottom = 0.72 * POINTS_PER_INCH;
  const marginLeft = gutterForPages(estimatedPages()) * POINTS_PER_INCH;
  const marginRight = outsideMargin() * POINTS_PER_INCH;
  const maxWidth = width - marginLeft - marginRight;
  const bodySize = state.format.fontSize;
  const lineStep = Math.max(bodySize * state.format.lineHeight, bodySize + 2);
  const pages = [];
  let page = [];
  let y = height - marginTop;

  function newPage() {
    if (page.length) pages.push(page);
    page = [];
    y = height - marginTop;
  }

  function addLine(text, size = bodySize, font = "regular", align = "left", gapAfter = 0) {
    if (y - size < marginBottom) newPage();
    const safe = normalizePdfText(text);
    let x = marginLeft;
    if (align === "center") x = Math.max(marginLeft, (width - textWidth(safe, size, font)) / 2);
    page.push({ text: safe, x, y, size, font });
    y -= Math.max(size * 1.24, lineStep);
    y -= gapAfter;
  }

  function addWrapped(text, size = bodySize) {
    const paragraphs = normalizePdfText(text).split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (!paragraphs.length) {
      addLine("Write chapter content here.", size);
      return;
    }
    paragraphs.forEach(paragraph => {
      wrapPdfText(paragraph.replace(/\n/g, " "), size, maxWidth).forEach(line => addLine(line, size));
      y -= lineStep * 0.45;
    });
  }

  addLine("WORDY EDITION", 9, "bold", "center", 22);
  addLine(state.meta.title || "Untitled Book", 28, "bold", "center", 12);
  if (state.meta.subtitle) addWrapped(state.meta.subtitle, 13);
  y -= 42;
  addLine(`by ${state.meta.author || "Author Name"}`, 12, "regular", "center");
  newPage();

  addLine("Copyright", 22, "bold", "center", 18);
  addWrapped(`Copyright (c) ${new Date().getFullYear()} ${state.meta.author || "Author Name"}. All rights reserved.`);
  addWrapped("No part of this book may be reproduced, stored, or transmitted without written permission from the author, except for brief quotations used in reviews or commentary.");
  newPage();

  addLine("Table of Contents", 22, "bold", "center", 18);
  state.chapters.forEach((chapter, index) => addLine(`${index + 1}. ${chapter.title || "Untitled Chapter"}`, bodySize));
  newPage();

  state.chapters.forEach(chapter => {
    addLine(chapter.title || "Untitled Chapter", 22, "bold", "center", 18);
    addWrapped(chapter.content, bodySize);
    newPage();
  });

  addLine("About the Author", 22, "bold", "center", 18);
  addWrapped(state.cover.authorBio || "Add a short author bio in the Cover section.", bodySize);
  if (page.length) pages.push(page);
  return { pages, width, height };
}

function manuscriptPdfDocument() {
  const { pages, width, height } = buildPdfLines();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];
  const pageRefs = [];

  pages.forEach(lines => {
    const pageObjNum = objects.length + 1;
    const contentObjNum = objects.length + 2;
    pageRefs.push(`${pageObjNum} 0 R`);
    const content = lines.map(line => {
      const fontName = line.font === "bold" ? "F2" : "F1";
      return `BT /${fontName} ${line.size.toFixed(2)} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdfLiteral(line.text)}) Tj ET`;
    }).join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;

  let pdf = "%PDF-1.4\n% Wordy\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadPdf() {
  save();
  const filename = `${slugify(state.meta.title)}-manuscript.pdf`;
  download(filename, manuscriptPdfDocument(), "application/pdf");
  setSaveStatus("PDF downloaded", "success");
}

function downloadDocx() {
  save();
  const filename = `${slugify(state.meta.title)}-manuscript.docx`;
  download(filename, manuscriptDocxDocument(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  setSaveStatus("DOCX downloaded", "success");
}

function downloadEpub() {
  save();
  const filename = `${slugify(state.meta.title)}-book.epub`;
  download(filename, manuscriptEpubDocument(), "application/epub+zip");
  setSaveStatus("EPUB downloaded", "success");
}

async function readFiles(files) {
  const chunks = [];
  for (const file of Array.from(files || [])) {
    try {
      const text = await file.text();
      chunks.push(`\n\n--- ${file.name} ---\n${text}`);
    } catch (error) {
      console.warn(`Could not read ${file.name}`, error);
    }
  }
  if (!chunks.length) return;
  $("inspirationText").value += chunks.join("\n");
  collectFromInputs();
  save();
  setSaveStatus("Notes imported", "success");
}

function bindEvents() {
  document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("input", () => { collectFromInputs(); save(); updateMetrics(); updateSpecs(); updateCover(); updateExportDetails(); renderPreview(); injectPrintStyle(); });
    el.addEventListener("change", () => { collectFromInputs(); save(); updateMetrics(); updateSpecs(); updateCover(); updateExportDetails(); renderPreview(); injectPrintStyle(); });
  });

  $("trimPreset").addEventListener("change", () => {
    const preset = $("trimPreset").value;
    if (preset !== "custom" && trimPresets[preset]) {
      $("trimWidth").value = trimPresets[preset][0];
      $("trimHeight").value = trimPresets[preset][1];
    }
    collectFromInputs();
    save();
    render();
  });

  $("generateBlueprintBtn").addEventListener("click", createBlueprint);
  $("addChapterBtn").addEventListener("click", addChapter);
  $("deleteChapterBtn").addEventListener("click", deleteChapter);
  $("moveUpBtn").addEventListener("click", () => moveChapter(-1));
  $("moveDownBtn").addEventListener("click", () => moveChapter(1));
  $("saveNowBtn").addEventListener("click", () => save({ announce: true }));
  $("printBtn").addEventListener("click", () => { save(); renderPreview(); window.print(); });
  $("refreshPreviewBtn").addEventListener("click", () => { save(); renderPreview(); });
  $("saveAiSettingsBtn").addEventListener("click", saveAiSettings);
  $("aiGenerateBookBtn").addEventListener("click", () => callAi(composeBookPrompt(), "Generating book draft"));
  $("copyBookPromptBtn").addEventListener("click", () => {
    const prompt = composeBookPrompt();
    $("aiOutput").value = prompt;
    copyTextToClipboard(prompt, "Book prompt copied.");
  });
  $("aiPolishBtn").addEventListener("click", () => callAi(composePolishPrompt(), "Polishing text"));
  $("copyPolishPromptBtn").addEventListener("click", () => {
    const prompt = composePolishPrompt();
    $("aiOutput").value = prompt;
    copyTextToClipboard(prompt, "Polish prompt copied.");
  });
  $("applyBookDraftBtn").addEventListener("click", applyGeneratedBookDraft);
  $("replaceChapterBtn").addEventListener("click", replaceCurrentChapterWithAi);
  $("insertChapterBtn").addEventListener("click", insertAiOutputAsChapter);
  $("copyAiOutputBtn").addEventListener("click", () => copyTextToClipboard($("aiOutput").value, "AI output copied."));
  document.querySelectorAll("[data-download-pdf]").forEach(button => button.addEventListener("click", downloadPdf));
  $("downloadDocxBtn").addEventListener("click", downloadDocx);
  $("downloadEpubBtn").addEventListener("click", downloadEpub);
  $("resetBtn").addEventListener("click", () => {
    if (!confirm("Reset the whole Wordy project in this browser?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  document.querySelectorAll("[data-insert]").forEach(button => {
    button.addEventListener("click", () => {
      const snippets = {
        sectionBreak: "\n\n* * *\n\n",
        quoteBox: "\n\n[Pull Quote]\nPlace a short, memorable line here.\n",
        exercise: "\n\n[Reader Exercise]\n1. What must change?\n2. What is the next honest action?\n3. What will you do within 24 hours?\n",
        copyright: `\n\nCopyright (c) ${new Date().getFullYear()} ${state.meta.author || "Author Name"}. All rights reserved.\n`
      };
      insertText(snippets[button.dataset.insert] || "");
    });
  });

  const dropzone = $("dropzone");
  dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("dragover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    readFiles(event.dataTransfer.files);
  });
  $("fileInput").addEventListener("change", (event) => readFiles(event.target.files));

  $("downloadJsonBtn").addEventListener("click", () => {
    save();
    download(`${slugify(state.meta.title)}-wordy-backup.json`, JSON.stringify(state, null, 2), "application/json");
    setSaveStatus("Backup saved", "success");
  });
  $("importJsonBtn").addEventListener("click", () => $("jsonImportInput").click());
  $("jsonImportInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      applyProjectData(JSON.parse(await file.text()));
      render();
      save({ announce: true });
      event.target.value = "";
    } catch (error) {
      alert("That backup file could not be imported.");
    }
  });
}

function init() {
  load();
  loadAiSettings();
  if (!state.chapters.length) {
    state.chapters = starterChapters.map(chapter => ({ ...chapter }));
  }
  normalizeState();
  bindEvents();
  render();
  setSaveStatus("Saved");
}

init();
