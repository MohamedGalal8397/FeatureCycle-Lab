/* ═══════════════════════════════════════
   VIEWER.JS — View Mode Overlay
   ─────────────────────────────────────
   كل اللي يخص الـ View Mode:
   • openViewer() / closeViewer()
   • selectViewerEntry() + renderViewerDetail()
   • selectCentralMRsView()
═══════════════════════════════════════ */

let viewerSelectedEntryId = null;
let viewerSelectedTabId   = null;

// ─── OPEN / CLOSE ─────────────────────
function openViewer() {
  const body = document.getElementById('viewerBody');
  body.innerHTML = '';

  const stats = computeStats();

  // ── Dashboard ──
  const dashboard = document.createElement('div');
  dashboard.className = 'viewer-dashboard';
  dashboard.innerHTML = `
    <div class="viewer-dashboard-title">◈ PROJECT OVERVIEW</div>
    <div class="viewer-stats-grid">
      <div class="viewer-stat-card">
        <div class="viewer-stat-value">${stats.totalEntries}</div>
        <div class="viewer-stat-label">ENTRIES</div>
      </div>
      <div class="viewer-stat-card">
        <div class="viewer-stat-value">${stats.totalTabs}</div>
        <div class="viewer-stat-label">TOTAL TABS</div>
      </div>
      <div class="viewer-stat-card stat-bug">
        <div class="viewer-stat-value">${stats.totalBugs}</div>
        <div class="viewer-stat-label">BUGS</div>
        <div class="viewer-stat-sub">
          <span class="stat-pill pill-high">${stats.highBugs} HIGH</span>
          <span class="stat-pill pill-med">${stats.mediumBugs} MED</span>
          <span class="stat-pill pill-low">${stats.lowBugs} LOW</span>
        </div>
      </div>
      <div class="viewer-stat-card stat-mr">
        <div class="viewer-stat-value">${stats.totalMRs}</div>
        <div class="viewer-stat-label">MERGE REQUESTS</div>
        <div class="viewer-stat-sub">
          <span class="stat-pill pill-open">${stats.openMRs} OPEN</span>
          <span class="stat-pill pill-merged">${stats.mergedMRs} MERGED</span>
        </div>
      </div>
    </div>`;
  body.appendChild(dashboard);

  if (state.entries.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text-dim);padding:60px;font-family:var(--mono)';
    empty.textContent = 'No entries yet.';
    body.appendChild(empty);
    document.getElementById('viewerOverlay').style.display = '';
    return;
  }

  // ── Split layout ──
  const split = document.createElement('div');
  split.className = 'viewer-split-layout';

  split.appendChild(_buildViewerSidebar());

  const detailPanel = document.createElement('div');
  detailPanel.className = 'viewer-detail-panel';
  detailPanel.id = 'viewerDetailPanel';
  detailPanel.innerHTML = `
    <div class="viewer-placeholder">
      <div class="placeholder-icon">◈</div>
      <div class="placeholder-title">Select an entry</div>
      <div class="placeholder-text">Click on an entry from the list to view its details and tabs</div>
    </div>`;
  split.appendChild(detailPanel);

  body.appendChild(split);
  document.getElementById('viewerOverlay').style.display = '';
}

function closeViewer() {
  document.getElementById('viewerOverlay').style.display = 'none';
}

// ─── SIDEBAR ──────────────────────────
function _buildViewerSidebar() {
  const sidebar = document.createElement('div');
  sidebar.className = 'viewer-sidebar';
  sidebar.innerHTML = '<div class="viewer-sidebar-title">ENTRIES</div>';

  const list = document.createElement('div');
  list.className = 'viewer-entries-list';

  state.entries.forEach((entry, idx) => {
    const item = document.createElement('div');
    item.className = 'viewer-entry-item';
    const bugs = entry.bugs?.length ?? 0;
    const mrs  = entry.mergeRequests?.length ?? 0;
    const tabs = entry.tabs?.length ?? 0;
    item.innerHTML = `
      <div class="viewer-entry-item-title">${escHtml(entry.title)}</div>
      <div class="viewer-entry-item-date">${entry.createdAt}</div>
      <div class="viewer-entry-item-badges">
        ${tabs ? `<span class="vbadge">${tabs} tabs</span>` : ''}
        ${bugs ? `<span class="vbadge vbadge-bug">🐛 ${bugs}</span>` : ''}
        ${mrs  ? `<span class="vbadge vbadge-mr">⎇ ${mrs}</span>`   : ''}
      </div>`;
    item.onclick = () => selectViewerEntry(entry.id, idx);
    list.appendChild(item);
  });

  // Centralized Bugs item
  const allBugs = state.entries.reduce((acc, e) => acc + (e.bugs?.length ?? 0), 0);
  if (allBugs > 0) {
    const centralBugsItem = document.createElement('div');
    centralBugsItem.className = 'viewer-entry-item';
    centralBugsItem.id = 'centralBugsItem';
    centralBugsItem.style.cssText = 'border-top:1px solid var(--border);margin-top:12px;padding-top:10px;';
    centralBugsItem.innerHTML = `
      <div class="viewer-entry-item-title" style="color:var(--accent3)">🐛 ALL BUGS</div>
      <div class="viewer-entry-item-date">Centralized View</div>
      <div class="viewer-entry-item-badges">
        <span class="vbadge vbadge-bug">🐛 ${allBugs}</span>
      </div>`;
    centralBugsItem.onclick = selectCentralBugsView;
    list.appendChild(centralBugsItem);
  }

  // Centralized MRs item
  const mrLinkSet = new Set();
  state.entries.forEach(entry => {
    if (entry.mergeRequests?.length) {
      entry.mergeRequests.forEach(mr => mrLinkSet.add(mr.link));
    }
  });
  if (state.mergeRequests?.length) {
    state.mergeRequests.forEach(mr => mrLinkSet.add(mr.link));
  }
  const totalMRs = mrLinkSet.size;
  if (totalMRs > 0) {
    const centralItem = document.createElement('div');
    centralItem.className = 'viewer-entry-item';
    centralItem.id = 'centralMRsItem';
    centralItem.style.cssText = 'border-top:1px solid var(--border);margin-top:8px;padding-top:10px;';
    centralItem.innerHTML = `
      <div class="viewer-entry-item-title" style="color:var(--accent2)">⎇ ALL MERGE REQUESTS</div>
      <div class="viewer-entry-item-date">Centralized View</div>
      <div class="viewer-entry-item-badges">
        <span class="vbadge vbadge-mr">⎇ ${totalMRs}</span>
      </div>`;
    centralItem.onclick = selectCentralMRsView;
    list.appendChild(centralItem);
  }

  sidebar.appendChild(list);
  return sidebar;
}

// ─── SELECT ENTRY ─────────────────────
function selectViewerEntry(entryId, entryIdx) {
  viewerSelectedEntryId = entryId;
  viewerSelectedTabId   = null;

  document.querySelectorAll('.viewer-entry-item').forEach((item, i) => {
    item.classList.toggle('active', i === entryIdx);
  });

  renderViewerDetail(entryId);
}

// ─── RENDER DETAIL ────────────────────
function renderViewerDetail(entryId) {
  const entry       = state.entries.find(e => e.id === entryId);
  if (!entry) return;
  const detailPanel = document.getElementById('viewerDetailPanel');
  detailPanel.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'viewer-detail-header';
  header.innerHTML = `
    <div class="viewer-detail-title">${escHtml(entry.title)}</div>
    <div class="viewer-detail-date">Created: ${entry.createdAt}</div>`;
  detailPanel.appendChild(header);

  // Tabs section
  if (entry.tabs?.length) {
    detailPanel.appendChild(_buildViewerTabsSection(entry));
  }

  // Bugs section
  if (entry.bugs?.length) {
    detailPanel.appendChild(_buildViewerBugsSection(entry.bugs));
  }

  // MRs section
  if (entry.mergeRequests?.length) {
    detailPanel.appendChild(_buildViewerMRsSection(entry.mergeRequests));
  }

  if (!entry.tabs?.length && !entry.bugs?.length && !entry.mergeRequests?.length) {
    const empty = document.createElement('div');
    empty.className = 'viewer-no-tabs';
    empty.textContent = 'No content available for this entry';
    detailPanel.appendChild(empty);
  }
}

function _buildViewerTabsSection(entry) {
  const section = document.createElement('div');
  section.className = 'viewer-section';

  const label = document.createElement('div');
  label.className = 'viewer-section-label';
  label.textContent = 'CHANGES & API FLOWS';
  section.appendChild(label);

  const tabsNav     = document.createElement('div');
  tabsNav.className = 'viewer-detail-tabs-buttons';
  const tabContents = document.createElement('div');
  tabContents.className = 'viewer-detail-content';

  entry.tabs.forEach((tab, ti) => {
    const btn = document.createElement('button');
    btn.className = 'viewer-detail-tab-btn' + (ti === 0 ? ' active' : '');
    btn.innerHTML = `<span class="vtab-num">${ti+1}</span><span class="vtab-name">${escHtml(tab.name)}</span>`;
    btn.onclick = () => {
      tabsNav.querySelectorAll('.viewer-detail-tab-btn').forEach(b => b.classList.remove('active'));
      tabContents.querySelectorAll('.viewer-tab-content-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      tabContents.querySelectorAll('.viewer-tab-content-pane')[ti].classList.add('active');
    };
    tabsNav.appendChild(btn);

    const pane = document.createElement('div');
    pane.className = 'viewer-tab-content-pane' + (ti === 0 ? ' active' : '');
    pane.innerHTML = _buildTabFields(tab);
    tabContents.appendChild(pane);
  });

  section.appendChild(tabsNav);
  section.appendChild(tabContents);
  return section;
}

function _buildTabFields(tab) {
  const fields = [];
  if (tab.apiEndpoint) fields.push(`<div class="viewer-field"><div class="viewer-field-label">API ENDPOINT</div><div class="viewer-field-value code-val">${escHtml(tab.apiEndpoint)}</div></div>`);
  const rr = [];
  if (tab.request)  rr.push(`<div class="viewer-field"><div class="viewer-field-label">REQUEST</div><div class="viewer-field-value code-val">${escHtml(tab.request)}</div></div>`);
  if (tab.response) rr.push(`<div class="viewer-field"><div class="viewer-field-label">RESPONSE</div><div class="viewer-field-value code-val">${escHtml(tab.response)}</div></div>`);
  if (rr.length) fields.push(`<div class="viewer-fields-grid">${rr.join('')}</div>`);
  if (tab.dbRow) fields.push(`<div class="viewer-field"><div class="viewer-field-label">ROW IN DB</div><div class="viewer-field-value code-val">${escHtml(tab.dbRow)}</div></div>`);
  if (tab.note)  fields.push(`<div class="viewer-field"><div class="viewer-field-label">NOTE</div><div class="viewer-field-value">${escHtml(tab.note)}</div></div>`);
  return fields.length ? fields.join('') : '<div class="viewer-no-data">No data for this tab</div>';
}

function _buildViewerBugsSection(bugs) {
  const section = document.createElement('div');
  section.className = 'viewer-section viewer-bugs-section';
  section.innerHTML = `<div class="viewer-section-label">🐛 BUGS <span class="section-count">${bugs.length}</span></div>`;

  const colors = { high: 'var(--accent3)', medium: 'var(--accent)', low: '#78ffa0' };

  bugs.forEach(bug => {
    const color = colors[bug.severity] || 'var(--accent)';
    const card  = document.createElement('div');
    card.className = 'viewer-bug-card';

    const mrLink = bug.mergeRequest?.link
      ? `<div class="viewer-field"><div class="viewer-field-label">LINKED MR</div><div class="viewer-field-value"><a href="${escHtml(bug.mergeRequest.link)}" target="_blank" class="viewer-link">⎇ ${escHtml(bug.mergeRequest.repo || bug.mergeRequest.link)} ↗</a></div></div>` : '';

    card.innerHTML = `
      <div class="viewer-bug-header" onclick="this.parentElement.classList.toggle('expanded')">
        <span class="viewer-bug-icon">🐛</span>
        <span class="viewer-bug-title">${escHtml(bug.title)}</span>
        <span class="viewer-bug-severity" style="color:${color};border-color:${color}">${(bug.severity||'medium').toUpperCase()}</span>
        <span class="viewer-bug-toggle">▾</span>
      </div>
      <div class="viewer-bug-body">
        <div class="viewer-field"><div class="viewer-field-label">DESCRIPTION</div><div class="viewer-field-value">${escHtml(bug.description)}</div></div>
        <div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escHtml(bug.createdAt)}</div></div>
        ${mrLink}
      </div>`;
    section.appendChild(card);
  });
  return section;
}

function _buildViewerMRsSection(mrs) {
  const section = document.createElement('div');
  section.className = 'viewer-section viewer-mr-section';
  section.innerHTML = `<div class="viewer-section-label">⎇ MERGE REQUESTS <span class="section-count">${mrs.length}</span></div>`;

  const openCount = mrs.filter(m => m.status !== 'merged').length;
  const mergedCount = mrs.filter(m => m.status === 'merged').length;

  mrs.forEach((mr, idx) => {
    const sc   = 'vstatus-' + (mr.status || 'open');
    const card = document.createElement('div');
    card.className = 'viewer-mr-card';
    
    const statusColors = {
      'merged': '#78ffa0',
      'open': '#4da8ff',
      'review': '#ffa047',
      'draft': '#a8a8a8'
    };
    const statusColor = statusColors[mr.status] || '#4da8ff';

    card.innerHTML = `
      <div class="viewer-mr-top" onclick="this.parentElement.classList.toggle('expanded')" style="cursor:pointer;">
        <span class="viewer-mr-icon">⎇</span>
        <div class="viewer-mr-header-content">
          <span class="viewer-mr-title">${escHtml(mr.title || mr.repo)}</span>
          <span class="viewer-mr-status ${sc}" style="background-color:${statusColor}20;border-color:${statusColor}">${(mr.status||'open').toUpperCase()}</span>
        </div>
        <span class="viewer-mr-expand">▾</span>
      </div>
      <div class="viewer-mr-body">
        <div class="viewer-field"><div class="viewer-field-label">REPOSITORY</div><div class="viewer-field-value">📁 ${escHtml(mr.repo)}</div></div>
        <div class="viewer-field"><div class="viewer-field-label">STATUS</div><div class="viewer-field-value"><span class="viewer-mr-status ${sc}" style="background-color:${statusColor}30;border-color:${statusColor};padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;">${(mr.status||'open').toUpperCase()}</span></div></div>
        ${mr.link ? `<div class="viewer-field"><div class="viewer-field-label">MR LINK</div><div class="viewer-field-value"><a href="${escHtml(mr.link)}" target="_blank" class="viewer-link viewer-mr-link">🔗 Open in ${mr.link.includes('github') ? 'GitHub' : 'GitLab'} ↗</a></div></div>` : ''}
        ${mr.createdAt ? `<div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escHtml(mr.createdAt)}</div></div>` : ''}
      </div>`;
    section.appendChild(card);
  });
  return section;
}

// ─── CENTRALIZED MRs VIEW ─────────────
function selectCentralMRsView() {
  document.querySelectorAll('.viewer-entry-item').forEach(el => el.classList.remove('active'));
  document.getElementById('centralMRsItem')?.classList.add('active');

  const detailPanel = document.getElementById('viewerDetailPanel');
  detailPanel.innerHTML = `
    <div class="viewer-detail-header">
      <div class="viewer-detail-title">⎇ All Merge Requests</div>
      <div class="viewer-detail-date">Centralized view of all MRs from the entire project</div>
    </div>`;

  // Collect all MRs from entries + standalone MRs with deduplication
  const allMRsMap = new Map(); // Use map to deduplicate by link
  
  state.entries.forEach(entry => {
    if (entry.mergeRequests?.length) {
      entry.mergeRequests.forEach(mr => {
        if (!allMRsMap.has(mr.link)) {
          allMRsMap.set(mr.link, {
            ...mr,
            entryTitle: entry.title,
            fromEntry: true
          });
        }
      });
    }
  });

  if (state.mergeRequests?.length) {
    state.mergeRequests.forEach(mr => {
      if (!allMRsMap.has(mr.link)) {
        allMRsMap.set(mr.link, {
          ...mr,
          fromEntry: false
        });
      }
    });
  }

  const allMRs = Array.from(allMRsMap.values());

  if (!allMRs.length) {
    const empty = document.createElement('div');
    empty.className = 'viewer-no-tabs';
    empty.textContent = 'No merge requests yet';
    detailPanel.appendChild(empty);
    return;
  }

  detailPanel.appendChild(_buildViewerAllMRsSection(allMRs));
}

// ─── CENTRALIZED BUGS VIEW ────────────
function selectCentralBugsView() {
  document.querySelectorAll('.viewer-entry-item').forEach(el => el.classList.remove('active'));
  document.getElementById('centralBugsItem')?.classList.add('active');

  const detailPanel = document.getElementById('viewerDetailPanel');
  detailPanel.innerHTML = `
    <div class="viewer-detail-header">
      <div class="viewer-detail-title">🐛 All Bugs</div>
      <div class="viewer-detail-date">Centralized view of all bugs from the entire project</div>
    </div>`;

  // Collect all bugs from all entries
  const allBugs = [];
  state.entries.forEach(entry => {
    if (entry.bugs?.length) {
      allBugs.push(...entry.bugs.map(bug => ({
        ...bug,
        entryTitle: entry.title
      })));
    }
  });

  if (!allBugs.length) {
    const empty = document.createElement('div');
    empty.className = 'viewer-no-tabs';
    empty.textContent = 'No bugs yet';
    detailPanel.appendChild(empty);
    return;
  }

  detailPanel.appendChild(_buildViewerAllBugsSection(allBugs));
}

// ─── BUILD ALL BUGS SECTION ───────────
function _buildViewerAllBugsSection(bugs) {
  const section = document.createElement('div');
  section.className = 'viewer-section viewer-bugs-section';

  const highCount = bugs.filter(b => b.severity === 'high').length;
  const medCount = bugs.filter(b => b.severity === 'medium').length;
  const lowCount = bugs.filter(b => b.severity === 'low').length;

  section.innerHTML = `<div class="viewer-section-label">🐛 BUGS <span class="section-count">${bugs.length}</span> <span style="font-size:11px;color:var(--text-dim);">(${highCount} HIGH, ${medCount} MED, ${lowCount} LOW)</span></div>`;

  const colors = { high: 'var(--accent3)', medium: 'var(--accent)', low: '#78ffa0' };

  bugs.forEach(bug => {
    const color = colors[bug.severity] || 'var(--accent)';
    const card  = document.createElement('div');
    card.className = 'viewer-bug-card';

    const mrLink = bug.mergeRequest?.link
      ? `<div class="viewer-field"><div class="viewer-field-label">LINKED MR</div><div class="viewer-field-value"><a href="${escHtml(bug.mergeRequest.link)}" target="_blank" class="viewer-link">⎇ ${escHtml(bug.mergeRequest.repo || bug.mergeRequest.link)} ↗</a></div></div>` : '';

    const entryRef = bug.entryTitle 
      ? `<div class="viewer-field"><div class="viewer-field-label">IN ENTRY</div><div class="viewer-field-value">${escHtml(bug.entryTitle)}</div></div>` : '';

    card.innerHTML = `
      <div class="viewer-bug-header" onclick="this.parentElement.classList.toggle('expanded')">
        <span class="viewer-bug-icon">🐛</span>
        <span class="viewer-bug-title">${escHtml(bug.title)}</span>
        <span class="viewer-bug-severity" style="color:${color};border-color:${color}">${(bug.severity||'medium').toUpperCase()}</span>
        <span class="viewer-bug-toggle">▾</span>
      </div>
      <div class="viewer-bug-body">
        <div class="viewer-field"><div class="viewer-field-label">DESCRIPTION</div><div class="viewer-field-value">${escHtml(bug.description)}</div></div>
        <div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escHtml(bug.createdAt)}</div></div>
        ${entryRef}
        ${mrLink}
      </div>`;
    section.appendChild(card);
  });
  return section;
}

// ─── BUILD ALL MRs SECTION ────────────
function _buildViewerAllMRsSection(mrs) {
  const section = document.createElement('div');
  section.className = 'viewer-section viewer-mr-section';

  const openCount = mrs.filter(m => m.status !== 'merged').length;
  const mergedCount = mrs.filter(m => m.status === 'merged').length;

  section.innerHTML = `<div class="viewer-section-label">⎇ MERGE REQUESTS <span class="section-count">${mrs.length}</span> <span style="font-size:11px;color:var(--text-dim);">(${openCount} OPEN, ${mergedCount} MERGED)</span></div>`;

  const statusColors = {
    'merged': '#78ffa0',
    'open': '#4da8ff',
    'review': '#ffa047',
    'draft': '#a8a8a8'
  };

  mrs.forEach(mr => {
    const sc   = 'vstatus-' + (mr.status || 'open');
    const card = document.createElement('div');
    card.className = 'viewer-mr-card';
    const statusColor = statusColors[mr.status] || '#4da8ff';

    const entryRef = mr.entryTitle && mr.fromEntry
      ? `<div class="viewer-field"><div class="viewer-field-label">RELATED ENTRY</div><div class="viewer-field-value">📌 ${escHtml(mr.entryTitle)}</div></div>`
      : '';

    card.innerHTML = `
      <div class="viewer-mr-top" onclick="this.parentElement.classList.toggle('expanded')" style="cursor:pointer;">
        <span class="viewer-mr-icon">⎇</span>
        <div class="viewer-mr-header-content">
          <span class="viewer-mr-title">${escHtml(mr.title || mr.repo)}</span>
          <span class="viewer-mr-status ${sc}" style="background-color:${statusColor}20;border-color:${statusColor}">${(mr.status||'open').toUpperCase()}</span>
        </div>
        <span class="viewer-mr-expand">▾</span>
      </div>
      <div class="viewer-mr-body">
        <div class="viewer-field"><div class="viewer-field-label">REPOSITORY</div><div class="viewer-field-value">📁 ${escHtml(mr.repo)}</div></div>
        <div class="viewer-field"><div class="viewer-field-label">STATUS</div><div class="viewer-field-value"><span class="viewer-mr-status ${sc}" style="background-color:${statusColor}30;border-color:${statusColor};padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;">${(mr.status||'open').toUpperCase()}</span></div></div>
        ${mr.link ? `<div class="viewer-field"><div class="viewer-field-label">MR LINK</div><div class="viewer-field-value"><a href="${escHtml(mr.link)}" target="_blank" class="viewer-link viewer-mr-link">🔗 Open in ${mr.link.includes('github') ? 'GitHub' : 'GitLab'} ↗</a></div></div>` : ''}
        ${mr.createdAt ? `<div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escHtml(mr.createdAt)}</div></div>` : ''}
        ${entryRef}
      </div>`;
    section.appendChild(card);
  });
  return section;
}
