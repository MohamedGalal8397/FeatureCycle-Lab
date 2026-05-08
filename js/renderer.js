/* ═══════════════════════════════════════
   RENDERER.JS — DOM Rendering Layer
   ─────────────────────────────────────
   كل اللي يخص رسم الـ UI:
   • renderSidebar() + renderSolvedBugsSidebar()
   • renderEditor() + renderTabs() + renderTabsBar()
   • renderTabContent() — read-only vs edit mode
   • renderDetailPanel() + renderBugsPanel() + renderMRsPanel()
   • renderBugSection() (placeholder)
═══════════════════════════════════════ */

// ─── SIDEBAR ──────────────────────────
function renderSidebar() {
  const list = document.getElementById('entriesList');
  list.innerHTML = '';

  state.entries.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'entry-item' + (entry.id === state.activeEntryId ? ' active' : '');
    li.onclick = () => selectEntry(entry.id);
    li.oncontextmenu = e => showContextMenu(e, entry.id, null, false);

    const tabCount = entry.tabs?.length ?? 0;
    li.innerHTML =
      `<div class="entry-item-text">
        <div class="entry-item-title">${escHtml(entry.title)}</div>
        <div class="entry-item-meta">${tabCount} tab${tabCount !== 1 ? 's' : ''} · ${entry.createdAt}</div>
      </div>
      <button class="btn-delete-entry" onclick="deleteEntry('${entry.id}', event, false)" title="Delete">✕</button>`;

    list.appendChild(li);
  });

  renderSolvedBugsSidebar();
}

function renderSolvedBugsSidebar() {
  const list = document.getElementById('solvedBugsList');
  if (!list) return;
  list.innerHTML = '';
  if (!state.solvedBugEntries?.length) return;

  const label = document.querySelector('.solved-bugs-label');
  if (label) label.textContent = `SOLVED BUGS (${state.solvedBugEntries.length})`;

  state.solvedBugEntries.forEach(bug => {
    const li = document.createElement('li');
    li.className = 'solved-bug-item' + (bug.id === state.activeEntryId ? ' active' : '');
    li.onclick = () => selectEntry(bug.id);
    li.oncontextmenu = e => showContextMenu(e, bug.id, null, false);

    const tabCount = bug.tabs?.length ?? 0;
    li.innerHTML =
      `<div class="entry-item-text">
        <div class="entry-item-title">✓ ${escHtml(bug.title)}</div>
        <div class="entry-item-meta">${tabCount} tab${tabCount !== 1 ? 's' : ''}</div>
      </div>
      <button class="btn-delete-entry" onclick="deleteEntry('${bug.id}', event, true)" title="Delete">✕</button>`;

    list.appendChild(li);
  });
}

// ─── EDITOR ───────────────────────────
let tabDragSourceId = null;

function handleTabDragStart(event) {
  const target = event.currentTarget;
  tabDragSourceId = target.dataset.tabId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', tabDragSourceId);
  target.classList.add('dragging');
}

function handleTabDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.tab-btn.drop-target').forEach(el => el.classList.remove('drop-target'));
  tabDragSourceId = null;
}

function handleTabDragOver(event) {
  event.preventDefault();
  const target = event.currentTarget;
  if (!target.dataset.tabId || target.dataset.tabId === tabDragSourceId) return;
  target.classList.add('drop-target');
}

function handleTabDragLeave(event) {
  event.currentTarget.classList.remove('drop-target');
}

function handleTabDrop(event) {
  event.preventDefault();
  const target = event.currentTarget;
  const draggedId = event.dataTransfer.getData('text/plain');
  const targetId = target.dataset.tabId;
  target.classList.remove('drop-target');
  if (!draggedId || !targetId || draggedId === targetId) return;
  reorderEntryTabs(draggedId, targetId);
}

function reorderEntryTabs(draggedId, targetId) {
  const entry = activeEntry();
  if (!entry?.tabs?.length) return;
  const tabs = entry.tabs;
  const fromIndex = tabs.findIndex(t => t.id === draggedId);
  const toIndex = tabs.findIndex(t => t.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
  const [moved] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, moved);
  state.activeTabId = draggedId;
  autosaveLocal();
  renderTabsBar();
  renderTabContent();
  markDirty();
}

function renderEditor() {
  const emptyState = document.getElementById('emptyState');
  const editorForm = document.getElementById('editorForm');
  const entry      = activeEntry();

  if (!entry) {
    emptyState.style.display = '';
    editorForm.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  editorForm.style.display = '';
  document.getElementById('entryTitle').value = entry.title;

  renderBugSection();
  renderTabs();
  renderTabContent();
  renderDetailPanel();
}

// ─── TABS ─────────────────────────────
function renderTabs() {
  renderTabsBar();
  renderTabContent();
}

function renderTabsBar() {
  const entry  = activeEntry();
  const scroll = document.getElementById('tabsScroll');
  if (!entry) { scroll.innerHTML = ''; return; }

  scroll.innerHTML = '';
  if (!entry.tabs) return;

  entry.tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (tab.id === state.activeTabId ? ' active' : '');
    btn.draggable = true;
    btn.dataset.tabId = tab.id;
    btn.onclick = () => selectTab(tab.id);
    btn.oncontextmenu = e => showContextMenu(e, null, tab.id, false);
    btn.title = tab.name;
    btn.addEventListener('dragstart', handleTabDragStart);
    btn.addEventListener('dragend', handleTabDragEnd);
    btn.addEventListener('dragover', handleTabDragOver);
    btn.addEventListener('dragleave', handleTabDragLeave);
    btn.addEventListener('drop', handleTabDrop);

    const tabIndex = entry.tabs.indexOf(tab) + 1;
    btn.innerHTML =
      `<span class="tab-btn-number">${tabIndex}</span>
       <span class="tab-drag-handle" title="Drag to reorder">⋮</span>
       <span class="tab-btn-name">${escHtml(tab.name)}</span>
       <span class="tab-delete-btn" onclick="deleteTab('${tab.id}', event)" title="Delete tab">✕</span>`;

    scroll.appendChild(btn);
  });
}

// ─── TAB CONTENT ──────────────────────
function renderTabContent() {
  const container = document.getElementById('tabContent');
  const tab = activeTab();
  if (!tab) { container.innerHTML = ''; return; }

  const isCollapsed   = state.collapsedTabs?.[tab.id];
  const contentDisplay = isCollapsed ? 'none' : '';
  const collapseIcon   = isCollapsed ? '▸' : '▾';

  container.innerHTML = isEditMode
    ? _buildEditTabHTML(tab, collapseIcon, contentDisplay)
    : _buildReadonlyTabHTML(tab, collapseIcon, contentDisplay);
  
  setTimeout(() => initAutoExpandTextareas(), 0);
}

function _buildReadonlyTabHTML(tab, icon, display) {
  return `
    <div class="tab-panel">
      <div class="tab-collapse-header" onclick="toggleTabCollapse('${tab.id}')">
        <span class="collapse-icon">${icon}</span>
        <label class="field-label">TAB NAME</label>
        <input class="tab-name-input" value="${escHtml(tab.name)}" readonly>
      </div>
      <div class="tab-content-area" style="display:${display}">
        <div class="field-block">
          <div class="field-block-header"><span class="field-block-tag tag-api">API ENDPOINT</span></div>
          <div class="readonly-field">${escHtml(tab.apiEndpoint || '(empty)')}</div>
        </div>
        <div class="field-block">
          <div class="field-block-header">
            <span class="field-block-tag tag-curl">cURL</span>
          </div>
          <div class="readonly-field"><pre class="curl-preview">${escHtml(tab.curl || '(empty)')}</pre></div>
        </div>
        <div class="fields-grid">
          <div class="field-block">
            <div class="field-block-header"><span class="field-block-tag tag-req">REQUEST</span></div>
            <div class="readonly-field">${escHtml(tab.request || '(empty)')}</div>
          </div>
          <div class="field-block">
            <div class="field-block-header"><span class="field-block-tag tag-res">RESPONSE</span></div>
            <div class="readonly-field">${escHtml(tab.response || '(empty)')}</div>
          </div>
        </div>
        <div class="field-block">
          <div class="field-block-header"><span class="field-block-tag tag-db">ROW IN DB</span></div>
          <div class="readonly-field">${escHtml(tab.dbRow || '(empty)')}</div>
        </div>
        <div class="field-block">
          <div class="field-block-header"><span class="field-block-tag tag-note">NOTE</span></div>
          <div class="readonly-field">${escHtml(tab.note || '(empty)')}</div>
        </div>
      </div>
    </div>`;
}

function _buildEditTabHTML(tab, icon, display) {
  return `
    <div class="tab-panel edit-panel">
      <div class="tab-collapse-header edit-header" onclick="toggleTabCollapse('${tab.id}')">
        <span class="collapse-icon">${icon}</span>
        <label class="field-label">TAB NAME</label>
        <input class="tab-name-input" value="${escHtml(tab.name)}"
               oninput="syncTabField('name', this.value)"
               onclick="event.stopPropagation()"
               placeholder="Change description...">
      </div>
      <div class="tab-content-area" style="display:${display}">
        <div class="field-block">
          <div class="field-block-header">
            <span class="field-block-tag tag-api">API ENDPOINT</span>
          </div>
          <textarea placeholder="e.g. POST /api/v1/transactions"
                    oninput="syncTabField('apiEndpoint', this.value)">${escHtml(tab.apiEndpoint)}</textarea>
        </div>
        <div class="field-block">
          <div class="field-block-header field-block-header--with-action">
            <span class="field-block-tag tag-curl">cURL</span>
            <button type="button" class="btn-copy-curl" onclick="copyClosestTextareaValue(this)">COPY</button>
          </div>
          <textarea placeholder="curl -X POST https://api.example.com/v1/txn -H 'Content-Type: application/json' -d '{\"amount\": 100}'"
                    oninput="syncTabField('curl', this.value)">${escHtml(tab.curl)}</textarea>
        </div>
        <div class="fields-grid">
          <div class="field-block">
            <div class="field-block-header"><span class="field-block-tag tag-req">REQUEST</span></div>
            <textarea style="min-height:140px" placeholder='{ "amount": 100 }'
                      oninput="syncTabField('request', this.value)">${escHtml(tab.request)}</textarea>
          </div>
          <div class="field-block">
            <div class="field-block-header"><span class="field-block-tag tag-res">RESPONSE</span></div>
            <textarea style="min-height:140px" placeholder='{ "status": "success" }'
                      oninput="syncTabField('response', this.value)">${escHtml(tab.response)}</textarea>
          </div>
        </div>
        <div class="field-block">
          <div class="field-block-header"><span class="field-block-tag tag-db">ROW IN DB</span></div>
          <textarea placeholder="id | amount | status&#10;1  | 100    | pending"
                    oninput="syncTabField('dbRow', this.value)">${escHtml(tab.dbRow)}</textarea>
        </div>
        <div class="field-block">
          <div class="field-block-header"><span class="field-block-tag tag-note">NOTE</span></div>
          <textarea placeholder="Any comments, edge cases, or observations..."
                    oninput="syncTabField('note', this.value)">${escHtml(tab.note)}</textarea>
        </div>
      </div>
    </div>`;
}

// ─── DETAIL PANEL (Bugs / MRs) ────────
function renderDetailPanel() {
  const entry = activeEntry();
  if (!entry) return;

  const tab      = state.activeDetailTab || 'bugs';
  const bugsPanel = document.getElementById('bugsPanel');
  const mrPanel   = document.getElementById('mergeRequestsPanel');

  if (tab === 'bugs') {
    bugsPanel?.style.setProperty('display', '');
    mrPanel?.style.setProperty('display', 'none');
    renderBugsPanel();
  } else {
    bugsPanel?.style.setProperty('display', 'none');
    mrPanel?.style.setProperty('display', '');
    renderMRsPanel();
  }
}

function renderBugsPanel() {
  const entry   = activeEntry();
  const content = document.getElementById('bugsPanelContent');
  if (!content) return;

  if (!entry?.bugs?.length) {
    content.innerHTML = '<div class="detail-empty">No bugs yet</div>';
    return;
  }

  content.innerHTML = entry.bugs.map(bug => {
    const severityClass = 'severity-' + (bug.severity || 'medium');
    const mrBadge = bug.mergeRequest?.link
      ? '<span class="detail-item-tag tag-mr">⎇ MR</span>' : '';

    return `
      <div class="detail-item" onclick="openBugDetailModal('${bug.id}')" style="cursor:pointer">
        <div class="detail-item-title">🐛 ${escHtml(bug.title)}</div>
        <div class="detail-item-meta">
          <span class="detail-item-tag ${severityClass}">${(bug.severity || 'medium').toUpperCase()}</span>
          ${mrBadge}
        </div>
        <button class="detail-item-delete"
                onclick="event.stopPropagation(); deleteBugEntry('${bug.id}')">✕</button>
      </div>`;
  }).join('');
}

function renderMRsPanel() {
  const entry   = activeEntry();
  const content = document.getElementById('mrPanelContent');
  if (!content) return;

  if (!entry?.mergeRequests?.length) {
    content.innerHTML = '<div class="detail-empty">No MRs yet</div>';
    return;
  }

  content.innerHTML = entry.mergeRequests.map(mr => {
    const statusClass = 'status-' + (mr.status || 'open');
    return `
      <div class="detail-item"
           onclick="window.open('${escHtml(mr.link)}', '_blank')" style="cursor:pointer">
        <div class="detail-item-title">⎇ ${escHtml(mr.title || mr.repo)}</div>
        <div class="detail-item-meta">
          <span class="detail-item-tag ${statusClass}">${(mr.status || 'open').toUpperCase()}</span>
          <span style="font-size:9px;color:var(--text-dim)">${escHtml(mr.repo)}</span>
        </div>
        <button class="detail-item-delete"
                onclick="event.stopPropagation(); deleteMREntry('${mr.id}')">✕</button>
      </div>`;
  }).join('');
}

function renderBugSection() {
  const container = document.getElementById('bugSectionContainer');
  if (container) container.innerHTML = '';
}
