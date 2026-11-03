/* ═══════════════════════════════════════
   ACTIONS.JS — Business Logic / Commands
   ─────────────────────────────────────
   كل اللي يخص:
   • CRUD على entries + tabs
   • CRUD على bugs + merge requests
   • syncTitle / syncTabField
   • toggleTabCollapse / switchDetailTab
   • toggleEditMode
═══════════════════════════════════════ */

// ─── NEW ENTRY ────────────────────────
function newEntry() {
  const entry = {
    id: uid(),
    title: 'Untitled Entry',
    createdAt: nowStr(),
    tabs: [],
    bugs: [],
    mergeRequests: []
  };
  state.entries.push(entry);
  selectEntry(entry.id);
  addTab();
  autosaveLocal();
  markDirty();
  renderSidebar();
  isEditMode = true;
  importedFromJson = true;
  updateEditModeUI();
}

// ─── SELECT ENTRY ─────────────────────
function selectEntry(id) {
  state.activeEntryId = id;
  const entry = activeEntry();
  state.activeTabId = entry?.tabs?.length ? entry.tabs[0].id : null;
  renderSidebar();
  renderEditor();
  autosaveLocal();
}

// ─── DELETE ENTRY ─────────────────────
function deleteEntry(id, event, isSolvedBug) {
  event?.stopPropagation();
  showConfirmation(
    'Delete Entry?',
    'This action cannot be undone. All tabs and data will be lost.',
    'delete-entry',
    { id, isSolvedBug }
  );
}

// ─── ADD TAB ──────────────────────────
function addTab() {
  const entry = activeEntry();
  if (!entry) return;
  if (!entry.tabs) entry.tabs = [];

  const tab = {
    id: uid(),
    name: 'Change ' + (entry.tabs.length + 1),
    apiEndpoint: '',
    curl: '',
    request: '',
    response: '',
    dbRow: '',
    note: ''
  };
  entry.tabs.push(tab);
  state.activeTabId = tab.id;
  renderEditor();
  autosaveLocal();
  markDirty();
}

// ─── SELECT TAB ───────────────────────
function selectTab(id) {
  state.activeTabId = id;
  renderTabs();
  renderTabContent();
  autosaveLocal();
}

// ─── DELETE TAB ───────────────────────
function deleteTab(id, event) {
  event.stopPropagation();
  const entry = activeEntry();
  if (!entry || entry.tabs.length <= 1) {
    showToast('An entry must have at least one tab.', true);
    return;
  }
  showConfirmation('Delete Tab?', 'This action cannot be undone.', 'delete-tab', id);
}

// ─── TOGGLE COLLAPSE ──────────────────
function toggleTabCollapse(id) {
  if (!state.collapsedTabs) state.collapsedTabs = {};
  state.collapsedTabs[id] = !state.collapsedTabs[id];
  renderTabContent();
  autosaveLocal();
}

// ─── SYNC TITLE ───────────────────────
function syncTitle() {
  const entry = activeEntry();
  if (!entry) return;
  entry.title = document.getElementById('entryTitle').value || 'Untitled Entry';
  renderSidebar();
  autosaveLocal();
  markDirty();
}

// ─── SYNC TAB FIELD ───────────────────
function syncTabField(field, value) {
  const tab = activeTab();
  if (!tab) return;
  tab[field] = value;
  if (field === 'name') renderTabsBar();
  autosaveLocal();
  markDirty();
}

// ─── SWITCH DETAIL TAB ────────────────
function switchDetailTab(tab) {
  state.activeDetailTab = tab;

  document.querySelectorAll('.detail-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });

  renderDetailPanel();
}

// ─── TOGGLE EDIT MODE ─────────────────
function toggleEditMode() {
  isEditMode = !isEditMode;
  importedFromJson = true;
  updateEditModeUI();
  renderEditor();
  document.getElementById('moreMenu')?.classList.remove('open');
}

// ─── BUG ACTIONS ──────────────────────
function deleteBugEntry(bugId) {
  const entry = activeEntry();
  if (!entry?.bugs) return;
  entry.bugs = entry.bugs.filter(b => b.id !== bugId);
  renderDetailPanel();
  autosaveLocal();
  markDirty();
  showToast('✓ Bug deleted');
}

function deleteMREntry(mrId) {
  const entry = activeEntry();
  if (!entry?.mergeRequests) return;
  entry.mergeRequests = entry.mergeRequests.filter(m => m.id !== mrId);
  renderDetailPanel();
  autosaveLocal();
  markDirty();
  showToast('✓ Merge Request deleted');
}

// ─── CREATE BUG ───────────────────────
function createBugEntry() {
  const title       = document.getElementById('bugTitle').value.trim();
  const description = document.getElementById('bugDescription').value.trim();
  const severity    = document.getElementById('bugSeverity').value;
  const mrRepo      = document.getElementById('bugMRRepo').value.trim();
  const mrLink      = document.getElementById('bugMRLink').value.trim();
  const mrTitle     = document.getElementById('bugMRTitle').value.trim();
  const mrStatus    = document.getElementById('bugMRStatus').value;

  if (!title)       { showToast('Bug title is required', true); return; }
  if (!description) { showToast('Bug description is required', true); return; }

  const entry = activeEntry();
  if (!entry) { showToast('Please select an entry first', true); return; }

  if (!entry.bugs) entry.bugs = [];

  const bug = {
    id: uid(),
    title,
    description,
    severity,
    createdAt: nowStr(),
    mergeRequest: null
  };

  if (mrRepo || mrLink) {
    bug.mergeRequest = { repo: mrRepo || 'Unknown Repo', link: mrLink || '', title: mrTitle || '', status: mrStatus || 'open' };
    _addToCentralMRs({ repo: mrRepo || 'Unknown Repo', link: mrLink || '', title: mrTitle || title, status: mrStatus, source: 'bug', bugId: bug.id, entryId: entry.id });
  }

  entry.bugs.push(bug);
  closeBugCreateModal();
  renderDetailPanel();
  autosaveLocal();
  markDirty();
  showToast('✓ Bug created');
}

function updateBugEntry(bugId) {
  const title       = document.getElementById('bugTitle').value.trim();
  const description = document.getElementById('bugDescription').value.trim();
  const severity    = document.getElementById('bugSeverity').value;
  const mrRepo      = document.getElementById('bugMRRepo').value.trim();
  const mrLink      = document.getElementById('bugMRLink').value.trim();
  const mrTitle     = document.getElementById('bugMRTitle').value.trim();
  const mrStatus    = document.getElementById('bugMRStatus').value;

  if (!title)       { showToast('Bug title is required', true); return; }
  if (!description) { showToast('Bug description is required', true); return; }

  const entry = activeEntry();
  if (!entry?.bugs) { showToast('Bug not found', true); return; }

  const bug = entry.bugs.find(b => b.id === bugId);
  if (!bug) { showToast('Bug not found', true); return; }

  bug.title = title;
  bug.description = description;
  bug.severity = severity;

  if (mrRepo || mrLink) {
    bug.mergeRequest = { repo: mrRepo || 'Unknown Repo', link: mrLink || '', title: mrTitle || '', status: mrStatus || 'open' };
    _addToCentralMRs({ repo: mrRepo || 'Unknown Repo', link: mrLink || '', title: mrTitle || title, status: mrStatus, source: 'bug', bugId: bug.id, entryId: entry.id });
  } else {
    bug.mergeRequest = null;
  }

  closeBugCreateModal();
  renderDetailPanel();
  autosaveLocal();
  markDirty();
  showToast('✓ Bug updated');
}

// ─── CREATE MERGE REQUEST ─────────────
function createMREntry() {
  const repo   = document.getElementById('mrRepo').value.trim();
  const link   = document.getElementById('mrLink').value.trim();
  const title  = document.getElementById('mrTitle').value.trim();
  const status = document.getElementById('mrStatus').value;

  if (!repo) { showToast('Repository name is required', true); return; }
  if (!link) { showToast('Merge Request link is required', true); return; }

  const entry = activeEntry();
  if (!entry) { showToast('Please select an entry first', true); return; }

  if (!entry.mergeRequests) entry.mergeRequests = [];

  const mr = { id: uid(), repo, link, title: title || repo, status, createdAt: nowStr() };
  entry.mergeRequests.push(mr);

  _addToCentralMRs({ repo, link, title: title || repo, status, source: 'direct', entryId: entry.id });

  closeMRCreateModal();
  renderDetailPanel();
  autosaveLocal();
  markDirty();
  showToast('✓ Merge Request created');
}

// ─── INTERNAL: sync to central MRs ───
function _addToCentralMRs({ repo, link, title, status = 'open', source, bugId, entryId }) {
  if (!state.mergeRequests) state.mergeRequests = [];
  const exists = state.mergeRequests.some(mr => mr.link === link && mr.repo === repo);
  if (!exists) {
    state.mergeRequests.push({ id: uid(), repo, link, title, status, createdAt: nowStr(), source, bugId, entryId });
  }
}

// ─── SOLVED BUGS ──────────────────────
function solveBugDirectly(bugId) {
  const bug = state.bugEntries.find(b => b.id === bugId);
  if (!bug) return;

  if (!bug.tabs?.length) {
    bug.tabs = [{ id: uid(), name: 'Test Case 1', apiEndpoint: '', request: '', response: '', dbRow: '', note: '' }];
  }

  state.bugEntries = state.bugEntries.filter(b => b.id !== bugId);
  state.solvedBugEntries.push(bug);
  renderBugSection();
  renderSidebar();
  autosaveLocal();
  markDirty();
  showToast('✓ Bug marked as solved');
}

function toggleSolvedBugsSidebar() {
  const list   = document.getElementById('solvedBugsList');
  const toggle = document.getElementById('solvedBugsToggle');
  if (!list) return;
  const isHidden = list.style.display === 'none';
  list.style.display = isHidden ? '' : 'none';
  if (toggle) toggle.textContent = isHidden ? '▾' : '▸';
}
