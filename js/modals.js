/* ═══════════════════════════════════════
   MODALS.JS — Dialogs & Overlays
   ─────────────────────────────────────
   كل اللي يخص:
   • Confirmation modal (delete confirm)
   • Context menu (right-click)
   • Rename dialog
   • Import JSON dialog
   • Bug create modal + Bug detail modal
   • MR create modal
   • Landing screen
   • More menu toggle
═══════════════════════════════════════ */

// ─── MORE MENU ────────────────────────
function toggleMoreMenu(event) {
  event.stopPropagation();
  const menu = document.getElementById('moreMenu');
  if (!menu) return;
  menu.classList.toggle('open', !menu.classList.contains('open'));
}

document.addEventListener('click', function (e) {
  const menu = document.getElementById('moreMenu');
  const btn  = document.getElementById('btnMoreMenu');
  if (menu && !menu.contains(e.target) && e.target !== btn) {
    menu.classList.remove('open');
  }
});

// ─── LANDING SCREEN ───────────────────
function showLandingScreen() {
  const overlay = document.getElementById('landingOverlay');
  if (!overlay) return;
  overlay.style.display = '';
  const btnContinue = document.getElementById('btnContinue');
  if (btnContinue) btnContinue.style.display = hasSavedProjectData() ? '' : 'none';
}

function hideLandingScreen() {
  const overlay = document.getElementById('landingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function startNewProject() {
  resetState();
  autosaveLocal();
  markClean();
  hideLandingScreen();
  renderSidebar();
  renderEditor();
  showToast('New project started');
}

function saveAndStartNewProject() {
  const hasData = (state.entries?.length ?? 0) > 0 || (state.bugEntries?.length ?? 0) > 0 || (state.solvedBugEntries?.length ?? 0) > 0;

  if (hasData) {
    saveCheckpoint();
    const { filename, blob } = _buildExportBlob('worklog');
    _downloadBlob(blob, filename);
    showToast('Saved current project to ' + filename);
  }

  resetState();
  autosaveLocal();
  markClean();
  hideLandingScreen();
  renderSidebar();
  renderEditor();
  if (!hasData) showToast('Started new project');
}

function continuePreviousProject() {
  loadProjectState();
  hideLandingScreen();
  const firstEntry = state.entries[0] ?? state.solvedBugEntries?.[0];
  if (firstEntry) selectEntry(firstEntry.id);
  renderSidebar();
  renderEditor();
  showToast('Project resumed');
}

// ─── CONFIRMATION MODAL ───────────────
let pendingConfirmAction = null;
let pendingConfirmData   = null;

function showConfirmation(title, message, action, actionData) {
  document.getElementById('modalTitle').textContent   = title;
  document.getElementById('modalMessage').textContent = message;
  document.getElementById('confirmationModal').style.display = '';
  pendingConfirmAction = action;
  pendingConfirmData   = actionData;
}

function closeConfirmation() {
  document.getElementById('confirmationModal').style.display = 'none';
  pendingConfirmAction = null;
  pendingConfirmData   = null;
}

function executeConfirmedAction() {
  if (pendingConfirmAction === 'delete-entry') {
    const { id, isSolvedBug } = pendingConfirmData;
    if (isSolvedBug) {
      state.solvedBugEntries = state.solvedBugEntries.filter(e => e.id !== id);
    } else {
      state.entries = state.entries.filter(e => e.id !== id);
    }
    // Reset active selection
    if (state.activeEntryId === id) {
      const next = state.entries[0] ?? state.solvedBugEntries?.[0];
      state.activeEntryId         = next?.id ?? null;
      state.activeEntryIsSolvedBug = !!state.solvedBugEntries?.find(e => e.id === state.activeEntryId);
      state.activeTabId = null;
      if (state.activeEntryId) {
        const e = activeEntry();
        if (e?.tabs?.length) state.activeTabId = e.tabs[0].id;
      }
    }
    renderSidebar(); renderEditor();
    autosaveLocal(); markDirty();
    showToast('Entry deleted');

  } else if (pendingConfirmAction === 'delete-tab') {
    const tabId = pendingConfirmData;
    const entry = activeEntry();
    if (entry?.tabs?.length > 1) {
      entry.tabs = entry.tabs.filter(t => t.id !== tabId);
      if (state.activeTabId === tabId) state.activeTabId = entry.tabs[0].id;
      renderTabs(); renderTabContent();
      autosaveLocal(); markDirty();
      showToast('Tab deleted');
    }

  } else if (pendingConfirmAction === 'delete-bug') {
    const bugId = pendingConfirmData;
    const inActive = state.bugEntries.find(b => b.id === bugId);
    if (inActive) {
      state.bugEntries = state.bugEntries.filter(b => b.id !== bugId);
    } else {
      state.solvedBugEntries = state.solvedBugEntries.filter(b => b.id !== bugId);
    }
    renderBugSection(); autosaveLocal(); markDirty();
    showToast('Bug deleted');
  }

  closeConfirmation();
}

// ─── CONTEXT MENU ─────────────────────
let contextMenuTarget = null;
let contextMenuType   = null;

function showContextMenu(event, entryId, tabId, isBugEntry, bugId) {
  event.preventDefault();
  event.stopPropagation();

  contextMenuTarget = bugId || entryId || tabId;
  contextMenuType   = bugId ? 'bug' : (isBugEntry ? 'bugEntry' : (tabId ? 'tab' : 'entry'));

  const menu = document.getElementById('contextMenu');
  if (!menu) return;

  const isSolvedBug = isBugEntry && state.solvedBugEntries.find(b => b.id === contextMenuTarget);
  const ctxSolve    = document.getElementById('ctxSolve');
  const ctxDivider  = document.getElementById('ctxDivider');
  const ctxRename   = document.getElementById('ctxRename');
  const ctxEdit     = document.getElementById('ctxEdit');

  if (isBugEntry || bugId) {
    ctxSolve.style.display   = '';
    ctxDivider.style.display = '';
    ctxSolve.textContent     = isSolvedBug ? '↶ Reopen Bug' : '✓ Mark as Solved';
    ctxRename.style.display  = 'none';
    ctxEdit.style.display    = '';
  } else {
    ctxSolve.style.display   = 'none';
    ctxDivider.style.display = 'none';
    ctxRename.style.display  = '';
    ctxEdit.style.display    = 'none';
  }

  menu.style.display = '';
  menu.style.left    = event.pageX + 'px';
  menu.style.top     = event.pageY + 'px';
}

function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.style.display = 'none';
  contextMenuTarget = null;
}

document.addEventListener('click', hideContextMenu);

function contextMenuDelete() {
  hideContextMenu();
  const actionMap = {
    entry:    ['Delete Entry?',    'This action cannot be undone. All tabs and data will be lost.', 'delete-entry'],
    tab:      ['Delete Tab?',      'This action cannot be undone.',                                 'delete-tab'],
    bugEntry: ['Delete Bug?',      'This action cannot be undone.',                                 'delete-bug']
  };
  const [title, msg, action] = actionMap[contextMenuType];
  showConfirmation(title, msg, action, contextMenuTarget);
}

function contextMenuRename() {
  hideContextMenu();
  renameTarget = contextMenuTarget;
  renameType   = contextMenuType;
  openRenameDialog();
}

function contextMenuEdit() {
  hideContextMenu();
  const bugId = contextMenuTarget;
  openBugEditModal(bugId);
}

function contextMenuSolve() {
  hideContextMenu();
  const bugId = contextMenuTarget;

  const activeBug = state.bugEntries.find(b => b.id === bugId);
  if (activeBug) {
    if (!activeBug.tabs?.length) {
      activeBug.tabs = [{ id: uid(), name: 'Test Case 1', apiEndpoint: '', request: '', response: '', dbRow: '', note: '' }];
    }
    state.bugEntries = state.bugEntries.filter(b => b.id !== bugId);
    state.solvedBugEntries.push(activeBug);
    renderBugSection(); renderSidebar();
    autosaveLocal(); markDirty();
    showToast('✓ Bug marked as solved');
    return;
  }

  const solvedBug = state.solvedBugEntries.find(b => b.id === bugId);
  if (solvedBug) {
    state.solvedBugEntries = state.solvedBugEntries.filter(b => b.id !== bugId);
    state.bugEntries.push(solvedBug);
    renderBugSection(); renderSidebar();
    autosaveLocal(); markDirty();
    showToast('↶ Bug reopened');
  }
}

// ─── RENAME DIALOG ────────────────────
let renameTarget = null;
let renameType   = null;

function openRenameDialog() {
  document.getElementById('renameDialogOverlay').style.display = '';
  const input       = document.getElementById('renameInput');
  input.value       = _getCurrentName();
  input.focus();
  input.select();
}

function closeRenameDialog() {
  document.getElementById('renameDialogOverlay').style.display = 'none';
  renameTarget = null;
  renameType   = null;
}

function handleRenameKeyup(event) {
  if (event.key === 'Enter')  confirmRename();
  if (event.key === 'Escape') closeRenameDialog();
}

function confirmRename() {
  const newName = document.getElementById('renameInput').value.trim();
  if (!newName) { showToast('Name cannot be empty', true); return; }

  if (renameType === 'entry') {
    const entry = state.entries.find(e => e.id === renameTarget)
               ?? state.solvedBugEntries.find(e => e.id === renameTarget);
    if (entry) entry.title = newName;
    renderSidebar();
    if (state.activeEntryId === renameTarget) {
      const titleEl = document.getElementById('entryTitle');
      if (titleEl) titleEl.value = newName;
    }

  } else if (renameType === 'tab') {
    const allEntries = [...state.entries, ...(state.solvedBugEntries || [])];
    for (const e of allEntries) {
      const t = e.tabs?.find(t => t.id === renameTarget);
      if (t) { t.name = newName; break; }
    }
    renderTabsBar();

  } else if (renameType === 'bugEntry') {
    const bug = state.bugEntries.find(b => b.id === renameTarget)
             ?? state.solvedBugEntries.find(b => b.id === renameTarget);
    if (bug) bug.title = newName;
    renderBugSection(); renderSidebar();
  }

  autosaveLocal(); markDirty();
  closeRenameDialog();
  showToast('✓ Renamed');
}

function _getCurrentName() {
  if (renameType === 'entry') {
    return state.entries.find(e => e.id === renameTarget)?.title
        ?? state.solvedBugEntries.find(e => e.id === renameTarget)?.title
        ?? '';
  }
  if (renameType === 'tab') {
    const allEntries = [...state.entries, ...(state.solvedBugEntries || [])];
    for (const e of allEntries) {
      const t = e.tabs?.find(t => t.id === renameTarget);
      if (t) return t.name;
    }
    return '';
  }
  if (renameType === 'bugEntry') {
    return state.bugEntries.find(b => b.id === renameTarget)?.title
        ?? state.solvedBugEntries.find(b => b.id === renameTarget)?.title
        ?? '';
  }
  return '';
}

// ─── IMPORT DIALOG ────────────────────
let pendingImportData = null;

function openImportDialog() {
  document.getElementById('importDialogOverlay').style.display = '';
  document.getElementById('jsonPasteArea').value  = '';
  document.getElementById('fileStatus').textContent = '';
  document.getElementById('jsonPreview').innerHTML  = '';
  pendingImportData = null;
  switchMethod('file');
  document.getElementById('moreMenu')?.classList.remove('open');
  setTimeout(() => initAutoExpandTextareas(), 0);
}

function closeImportDialog() {
  document.getElementById('importDialogOverlay').style.display = 'none';
  pendingImportData = null;
}

function switchMethod(method) {
  const isFile = method === 'file';
  document.getElementById('methodFileBtn').classList.toggle('active', isFile);
  document.getElementById('methodPasteBtn').classList.toggle('active', !isFile);
  document.getElementById('fileContent').style.display  = isFile ? 'flex' : 'none';
  document.getElementById('pasteContent').style.display = isFile ? 'none' : 'flex';
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      pendingImportData = JSON.parse(e.target.result);
      const entryCount  = pendingImportData.entries?.length ?? 0;
      document.getElementById('fileStatus').innerHTML =
        `<div class="success-msg">✓ ${escHtml(file.name)} loaded (${entryCount} entries)</div>`;
      document.getElementById('jsonPreview').innerHTML =
        `<div class="preview-json">${escHtml(JSON.stringify(pendingImportData, null, 2).substring(0, 300))}...</div>`;
    } catch (err) {
      document.getElementById('fileStatus').innerHTML =
        `<div class="error-msg">✕ Invalid JSON: ${escHtml(err.message)}</div>`;
      pendingImportData = null;
    }
  };
  reader.readAsText(file);
}

function confirmImport() {
  let data = pendingImportData;

  if (!data) {
    const pasteText = document.getElementById('jsonPasteArea').value.trim();
    if (!pasteText) { showToast('Please select a file or paste JSON', true); return; }
    try { data = JSON.parse(pasteText); }
    catch (err) { showToast('Invalid JSON: ' + err.message, true); return; }
  }

  if (!Array.isArray(data.entries)) {
    showToast('Invalid JSON structure: missing entries array', true);
    return;
  }

  importJsonData(data);
  closeImportDialog();
}

function importJsonData(jsonData) {
  state.entries = jsonData.entries.map(entry => ({
    id:            entry.id || uid(),
    title:         entry.title || 'Untitled Entry',
    createdAt:     entry.createdAt || nowStr(),
    tabs:          (entry.tabs || []).map(tab => ({
      id:          tab.id || uid(),
      name:        tab.name || 'Untitled Tab',
      apiEndpoint: tab.apiEndpoint || '',
      curl:        tab.curl || '',
      request:     tab.request || '',
      response:    tab.response || '',
      dbRow:       tab.dbRow || '',
      note:        tab.note || ''
    })),
    bugs:          entry.bugs || [],
    mergeRequests: entry.mergeRequests || []
  }));

  state.bugEntries       = jsonData.bugEntries || [];
  state.solvedBugEntries = (jsonData.solvedBugEntries || []).map(bug => ({
    ...bug, tabs: bug.tabs || []
  }));

  importedFromJson = true;
  isEditMode       = true;

  if (state.entries.length > 0) selectEntry(state.entries[0].id);

  autosaveLocal(); markDirty(); hideLandingScreen();
  renderSidebar(); renderEditor();
  showToast(`✓ Imported ${state.entries.length} entries from JSON`);
  updateEditModeUI();
}

// ─── BUG CREATE/EDIT MODAL ─────────────────
function openBugCreateModal() {
  openBugModal();
}

function openBugEditModal(bugId) {
  openBugModal(bugId);
}

function openBugModal(bugId = null) {
  const modal = document.getElementById('bugCreateModal');
  const title = document.getElementById('bugCreateModal').querySelector('.modal-title');
  const button = document.getElementById('bugCreateModal').querySelector('.btn-modal-confirm');

  if (bugId) {
    // Edit mode
    const entry = activeEntry();
    const bug = entry.bugs.find(b => b.id === bugId);
    if (!bug) return;

    title.textContent = 'EDIT BUG';
    button.textContent = 'UPDATE BUG';
    button.onclick = () => updateBugEntry(bugId);

    // Pre-fill fields
    document.getElementById('bugTitle').value = bug.title;
    document.getElementById('bugDescription').value = bug.description;
    document.getElementById('bugSeverity').value = bug.severity || 'medium';
    if (bug.mergeRequest) {
      document.getElementById('bugMRRepo').value = bug.mergeRequest.repo || '';
      document.getElementById('bugMRLink').value = bug.mergeRequest.link || '';
      document.getElementById('bugMRTitle').value = bug.mergeRequest.title || '';
      document.getElementById('bugMRStatus').value = bug.mergeRequest.status || 'open';
      toggleBugMRSection(); // show the section
    } else {
      document.getElementById('bugMRRepo').value = '';
      document.getElementById('bugMRLink').value = '';
      document.getElementById('bugMRTitle').value = '';
      document.getElementById('bugMRStatus').value = 'open';
    }
  } else {
    // Create mode
    title.textContent = 'CREATE BUG';
    button.textContent = 'CREATE BUG';
    button.onclick = createBugEntry;

    // Clear fields
    ['bugTitle', 'bugDescription', 'bugMRRepo', 'bugMRLink', 'bugMRTitle'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('bugSeverity').value = 'medium';
    document.getElementById('bugMRStatus').value = 'open';
  }

  modal.style.display = '';
  setTimeout(() => initAutoExpandTextareas(), 0);
  document.getElementById('bugTitle').focus();
}

function closeBugCreateModal() {
  document.getElementById('bugCreateModal').style.display = 'none';
  // Reset to create mode
  const title = document.getElementById('bugCreateModal').querySelector('.modal-title');
  const button = document.getElementById('bugCreateModal').querySelector('.btn-modal-confirm');
  title.textContent = 'CREATE BUG';
  button.textContent = 'CREATE BUG';
  button.onclick = createBugEntry;

  ['bugTitle', 'bugDescription', 'bugMRRepo', 'bugMRLink', 'bugMRTitle'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('bugSeverity').value = 'medium';
  document.getElementById('bugMRStatus').value = 'open';
  // Hide MR section
  document.getElementById('bugMRSection').style.display = 'none';
  document.getElementById('bugMRToggle').innerHTML = '<span style="font-size:11px">+</span> Link a Merge Request <span style="color:var(--text-dim);font-size:10px">(optional)</span>';
}

function toggleBugMRSection() {
  const section = document.getElementById('bugMRSection');
  const toggleBtn = document.getElementById('bugMRToggle');
  if (section.style.display === 'none' || !section.style.display) {
    section.style.display = '';
    toggleBtn.innerHTML = '<span style="font-size:11px">-</span> Link a Merge Request <span style="color:var(--text-dim);font-size:10px">(optional)</span>';
  } else {
    section.style.display = 'none';
    toggleBtn.innerHTML = '<span style="font-size:11px">+</span> Link a Merge Request <span style="color:var(--text-dim);font-size:10px">(optional)</span>';
  }
}

// ─── BUG DETAIL MODAL ─────────────────
function openBugDetailModal(bugId) {
  const entry = activeEntry();
  if (!entry?.bugs) return;
  const bug = entry.bugs.find(b => b.id === bugId);
  if (!bug) return;

  const modal = document.getElementById('bugDetailModal');
  if (!modal) return;

  const colors = { high: 'var(--accent3)', medium: 'var(--accent)', low: '#78ffa0' };
  const color  = colors[bug.severity] || 'var(--accent)';

  document.getElementById('bugDetailTitle').textContent = bug.title;

  let mrHtml = '';
  if (bug.mergeRequest) {
    const mr = bug.mergeRequest;
    mrHtml = `
      <div class="bug-detail-field">
        <div class="bug-detail-label">LINKED MERGE REQUEST</div>
        <div class="bug-detail-value">
          ${mr.link
            ? `<a href="${escHtml(mr.link)}" target="_blank" class="bug-detail-link">⎇ ${escHtml(mr.repo || mr.link)} ↗</a>`
            : escHtml(mr.repo || 'N/A')}
        </div>
      </div>`;
  }

  document.getElementById('bugDetailBody').innerHTML = `
    <div class="bug-detail-field">
      <div class="bug-detail-label">SEVERITY</div>
      <div class="bug-detail-value">
        <span class="bug-severity-badge" style="color:${color};border-color:${color}">
          ${(bug.severity || 'medium').toUpperCase()}
        </span>
      </div>
    </div>
    <div class="bug-detail-field">
      <div class="bug-detail-label">DESCRIPTION</div>
      <div class="bug-detail-value bug-detail-desc">${escHtml(bug.description)}</div>
    </div>
    <div class="bug-detail-field">
      <div class="bug-detail-label">CREATED</div>
      <div class="bug-detail-value">${escHtml(bug.createdAt)}</div>
    </div>
    ${mrHtml}`;

  modal.style.display = '';
}

function closeBugDetailModal() {
  document.getElementById('bugDetailModal')?.style.setProperty('display', 'none');
}

// ─── MR CREATE MODAL ──────────────────
function openMRCreateModal() {
  document.getElementById('mrCreateModal').style.display = '';
  setTimeout(() => initAutoExpandTextareas(), 0);
  document.getElementById('mrRepo').focus();
}

function closeMRCreateModal() {
  document.getElementById('mrCreateModal').style.display = 'none';
  ['mrRepo', 'mrLink', 'mrTitle'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('mrStatus').value = 'open';
}
