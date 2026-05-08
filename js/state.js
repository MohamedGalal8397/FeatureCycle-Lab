/* ═══════════════════════════════════════
   STATE.JS — App State & Storage Layer
   ─────────────────────────────────────
   كل اللي يخص:
   • الـ state object الرئيسي
   • الـ flags (edit mode, import mode)
   • localStorage (autosave, checkpoint, load)
   • الـ dirty/clean tracking
═══════════════════════════════════════ */

// ─── MAIN STATE ───────────────────────
let state = {
  entries: [],
  activeEntryId: null,
  activeTabId: null,
  activeDetailTab: 'bugs',
  collapsedTabs: {},
  bugEntries: [],
  solvedBugEntries: [],
  activeEntryIsSolvedBug: false,
  mergeRequests: []
};

const PROJECT_KEY = 'worklog_project_default';

// ─── MODE FLAGS ───────────────────────
let isEditMode = false;
let importedFromJson = false;

// ─── DIRTY TRACKING ──────────────────
let hasUnsavedChanges = false;

function markDirty() {
  hasUnsavedChanges = true;
  updateSaveButtonState();
}

function markClean() {
  hasUnsavedChanges = false;
  updateSaveButtonState();
}

function updateSaveButtonState() {
  const btn = document.getElementById('btnSaveProject');
  const dot = document.getElementById('saveStatusDot');
  if (!btn || !dot) return;
  if (hasUnsavedChanges) {
    btn.classList.add('has-changes');
    dot.classList.add('active');
  } else {
    btn.classList.remove('has-changes');
    dot.classList.remove('active');
  }
}

// ─── AUTOSAVE (draft on every change) ─
function autosaveLocal() {
  try {
    localStorage.setItem(PROJECT_KEY + '_draft', JSON.stringify({
      state: state,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('[WorkLog] autosave failed:', e);
  }
}

// ─── LOAD ON STARTUP ──────────────────
// Priority: checkpoint → draft → legacy key
function loadProjectState() {
  let chosen = null;
  let source = null;

  try {
    const raw = localStorage.getItem(PROJECT_KEY + '_checkpoint');
    if (raw) { chosen = JSON.parse(raw); source = 'checkpoint'; }
  } catch (e) {}

  if (!chosen) {
    try {
      const raw = localStorage.getItem(PROJECT_KEY + '_draft');
      if (raw) { chosen = JSON.parse(raw); source = 'draft'; }
    } catch (e) {}
  }

  if (chosen && chosen.state) {
    state = chosen.state;
    _normalizeState();
    if (source === 'checkpoint') {
      showToast('Restored · last saved ' + formatDate(chosen.savedAt));
    }
  } else {
    // Legacy fallback
    try {
      const legacy = localStorage.getItem('worklog_state');
      if (legacy) {
        state = JSON.parse(legacy);
        _normalizeState();
      }
    } catch (e) {}
  }

  markClean();
}

// ─── SAVE CHECKPOINT (manual save btn) ─
function saveCheckpoint() {
  try {
    localStorage.setItem(PROJECT_KEY + '_checkpoint', JSON.stringify({
      state: state,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('[WorkLog] checkpoint save failed:', e);
  }
}

// ─── CHECK IF SAVED DATA EXISTS ───────
function hasSavedProjectData() {
  try {
    for (const key of [PROJECT_KEY + '_checkpoint', PROJECT_KEY + '_draft']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.state?.entries?.length > 0 ||
          parsed?.state?.solvedBugEntries?.length > 0) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

// ─── RESET STATE (new project) ────────
function resetState() {
  state = {
    entries: [],
    activeEntryId: null,
    activeTabId: null,
    collapsedTabs: {},
    bugEntries: [],
    solvedBugEntries: [],
    activeEntryIsSolvedBug: false,
    mergeRequests: []
  };
  isEditMode = false;
  importedFromJson = false;
}

// ─── INTERNAL: normalize loaded state ─
function _normalizeState() {
  if (!state.bugEntries)             state.bugEntries = [];
  if (!state.solvedBugEntries)       state.solvedBugEntries = [];
  if (!state.mergeRequests)          state.mergeRequests = [];
  if (!state.collapsedTabs)          state.collapsedTabs = {};
  if (typeof state.activeEntryIsSolvedBug === 'undefined')
    state.activeEntryIsSolvedBug = false;
}

// ─── ENTRY HELPERS ────────────────────
function activeEntry() {
  if (!state.activeEntryId) return null;

  const regular = state.entries.find(e => e.id === state.activeEntryId);
  if (regular) { state.activeEntryIsSolvedBug = false; return regular; }

  const solved = (state.solvedBugEntries || []).find(e => e.id === state.activeEntryId);
  if (solved)  { state.activeEntryIsSolvedBug = true;  return solved; }

  return null;
}

function activeTab() {
  const entry = activeEntry();
  if (!entry) return null;
  return entry.tabs?.find(t => t.id === state.activeTabId) ?? null;
}

// ─── UPDATE EDIT MODE UI ──────────────
function updateEditModeUI() {
  const btn   = document.getElementById('btnEditMode');
  const label = document.getElementById('editModeLabel');
  if (isEditMode) {
    btn?.classList.add('active-mode');
    if (label) label.textContent = 'EDIT MODE: ON';
  } else {
    btn?.classList.remove('active-mode');
    if (label) label.textContent = 'EDIT MODE: OFF';
  }
}
