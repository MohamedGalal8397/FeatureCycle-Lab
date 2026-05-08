/* ═══════════════════════════════════════
   EXPORT.JS — Save / Export Functions
═══════════════════════════════════════ */

// ─── SAVE PROJECT BUTTON ──────────────
function saveForProject() {
  const btn   = document.getElementById('btnSaveProject');
  const label = btn?.querySelector('.btn-save-label');

  if (btn) btn.disabled = true;
  if (label) label.textContent = 'DOWNLOADING…';

  saveCheckpoint();

  const { filename, blob } = _buildExportBlob('worklog');
  _downloadBlob(blob, filename);

  if (btn) btn.disabled = false;
  if (label) label.textContent = 'SAVE PROJECT';

  markClean();
  showToast('Downloaded: ' + filename);
}

// ─── EXPORT JSON ──────────────────────
function exportToJSON() {
  const { filename, blob } = _buildExportBlob('worklog');
  _downloadBlob(blob, filename);

  showToast('✓ Exported to ' + filename);
  document.getElementById('moreMenu')?.classList.remove('open');
}

// ─── EXPORT HTML ──────────────────────
async function exportToHTML() {
  const now        = new Date();
  const ts         = _timestamp(now);
  const filename    = 'worklog_export_' + ts + '.html';
  const exportedAt  = now.toLocaleString('en-GB');
  const stats      = computeStats();

  // ✅ IMPORTANT FIX (await)
  const htmlDoc = await _buildHTMLExport(exportedAt, stats);

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  _downloadBlob(blob, filename);

  showToast('✓ Full project exported as HTML');
}

function printPage() {
  exportToHTML();
}

// ─── COMPUTE STATS ────────────────────
function computeStats() {
  let totalBugs = 0, highBugs = 0, mediumBugs = 0, lowBugs = 0;
  let openMRs = 0, mergedMRs = 0;

  state.entries.forEach(entry => {
    entry.bugs?.forEach(b => {
      totalBugs++;
      if (b.severity === 'high') highBugs++;
      else if (b.severity === 'low') lowBugs++;
      else mediumBugs++;
    });

    entry.mergeRequests?.forEach(mr => {
      mr.status === 'merged' ? mergedMRs++ : openMRs++;
    });
  });

  (state.mergeRequests || []).forEach(mr => {
    mr.status === 'merged' ? mergedMRs++ : openMRs++;
  });

  return {
    totalEntries: state.entries.length,
    totalTabs: state.entries.reduce((a, e) => a + (e.tabs?.length ?? 0), 0),
    totalBugs,
    highBugs,
    mediumBugs,
    lowBugs,
    totalMRs: (state.mergeRequests?.length ?? 0) + state.entries.reduce((a, e) => a + (e.mergeRequests?.length ?? 0), 0),
    openMRs,
    mergedMRs,
    solvedBugs: state.solvedBugEntries?.length ?? 0
  };
}

// ─── HELPERS ─────────────────────────
function _timestamp(now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}_${p(now.getHours())}-${p(now.getMinutes())}`;
}

function _buildExportBlob(prefix) {
  const now = new Date();

  const filename = `${prefix}_${_timestamp(now)}.json`;

  const data = {
    exportedAt: now.toISOString(),
    appVersion: '1.0',
    entries: state.entries,
    bugEntries: state.bugEntries || [],
    solvedBugEntries: state.solvedBugEntries || []
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  return { filename, blob };
}

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// ─── HTML EXPORT BUILDER ─────────────────
async function _buildHTMLExport(exportedAt, stats) {
  const res = await fetch('./export-template.html');
  let html = await res.text();

  const sidebarItems = _buildExportSidebarItems();
  const detailPanels = _buildExportDetailPanels();
  const statsCards   = _buildStatsCards(stats);

  const emptyStateHtml =
    state.entries.length === 0
      ? '<div class="viewer-placeholder">No entries yet</div>'
      : '';

  const mainContent =
    state.entries.length > 0
      ? `
    <div class="viewer-split-layout">
      <div class="viewer-sidebar">
        <div class="viewer-sidebar-title">ENTRIES</div>
        <div class="viewer-entries-list">
          ${sidebarItems}
        </div>
      </div>

      <div class="export-detail-wrapper">
        ${detailPanels}
      </div>
    </div>`
      : '';

  const meta = `Exported ${exportedAt} · ${state.entries.length} entries · ${stats.totalBugs} bugs · ${stats.totalMRs} MRs`;

  html = html.replaceAll('{{EXPORTED_AT}}', exportedAt);
  html = html.replaceAll('{{META}}', meta);
  html = html.replaceAll('{{STATS_CARDS}}', statsCards);
  html = html.replaceAll('{{EMPTY_STATE}}', emptyStateHtml);
  html = html.replaceAll('{{MAIN_CONTENT}}', mainContent);

  return html;
}

// ─── BUILD EXPORT SIDEBAR ITEMS ───────
function _buildExportSidebarItems() {
  let items = state.entries.map((entry, idx) => {
    const bugs = entry.bugs?.length ?? 0;
    const mrs  = entry.mergeRequests?.length ?? 0;
    const tabs = entry.tabs?.length ?? 0;
    return `
      <div class="viewer-entry-item ${idx === 0 ? 'active' : ''}" onclick="selectExportEntry(${idx})">
        <div class="viewer-entry-item-title">${escapeHtml(entry.title)}</div>
        <div class="viewer-entry-item-date">${entry.createdAt}</div>
        <div class="viewer-entry-item-badges">
          ${tabs ? `<span class="vbadge">${tabs} tabs</span>` : ''}
          ${bugs ? `<span class="vbadge vbadge-bug">🐛 ${bugs}</span>` : ''}
          ${mrs  ? `<span class="vbadge vbadge-mr">⎇ ${mrs}</span>`   : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add centralized Bugs view
  const allBugs = state.entries.reduce((acc, e) => acc + (e.bugs?.length ?? 0), 0);
  if (allBugs > 0) {
    items += `
      <div class="viewer-entry-item" data-id="all-bugs" style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px;" onclick="selectExportEntry('all-bugs')">
        <div class="viewer-entry-item-title" style="color:var(--accent3)">🐛 ALL BUGS</div>
        <div class="viewer-entry-item-date">Centralized View</div>
        <div class="viewer-entry-item-badges">
          <span class="vbadge vbadge-bug">🐛 ${allBugs}</span>
        </div>
      </div>
    `;
  }

  // Add centralized MRs view
  const allMRs = (state.mergeRequests?.length ?? 0) + state.entries.reduce((acc, e) => acc + (e.mergeRequests?.length ?? 0), 0);
  if (allMRs > 0) {
    items += `
      <div class="viewer-entry-item" data-id="all-mrs" style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px;" onclick="selectExportEntry('all-mrs')">
        <div class="viewer-entry-item-title" style="color:var(--accent2)">⎇ ALL MERGE REQUESTS</div>
        <div class="viewer-entry-item-date">Centralized View</div>
        <div class="viewer-entry-item-badges">
          <span class="vbadge vbadge-mr">⎇ ${allMRs}</span>
        </div>
      </div>
    `;
  }

  return items;
}

// ─── BUILD EXPORT DETAIL PANELS ───────
function _buildExportDetailPanels() {
  let panels = state.entries.map((entry, idx) => `
    <div class="export-detail-panel ${idx === 0 ? 'active' : ''}" id="detail-panel-${idx}">
      <div class="viewer-detail-header">
        <div class="viewer-detail-title">${escapeHtml(entry.title)}</div>
        <div class="viewer-detail-date">Created: ${entry.createdAt}</div>
      </div>
      
      ${entry.tabs?.length ? `
        <div class="viewer-section">
          <div class="viewer-section-label">CHANGES & API FLOWS</div>
          <div class="viewer-detail-tabs-buttons">
            ${entry.tabs.map((tab, ti) => `
              <button class="viewer-detail-tab-btn ${ti === 0 ? 'active' : ''}" onclick="selectExportTab(${idx}, ${ti})">
                <span class="vtab-num">${ti+1}</span>
                <span class="vtab-name">${escapeHtml(tab.name)}</span>
              </button>
            `).join('')}
          </div>
          <div class="viewer-detail-content">
            ${entry.tabs.map((tab, ti) => `
              <div class="viewer-tab-content-pane ${ti === 0 ? 'active' : ''}" id="tab-pane-${idx}-${ti}">
                ${tab.apiEndpoint ? `<div class="viewer-field"><div class="viewer-field-label">API ENDPOINT</div><div class="viewer-field-value code-val">${escapeHtml(tab.apiEndpoint)}</div></div>` : ''}
                ${(tab.request || tab.response) ? `<div class="viewer-fields-grid">
                  ${tab.request ? `<div class="viewer-field"><div class="viewer-field-label">REQUEST</div><div class="viewer-field-value code-val">${escapeHtml(tab.request)}</div></div>` : ''}
                  ${tab.response ? `<div class="viewer-field"><div class="viewer-field-label">RESPONSE</div><div class="viewer-field-value code-val">${escapeHtml(tab.response)}</div></div>` : ''}
                </div>` : ''}
                ${tab.dbRow ? `<div class="viewer-field"><div class="viewer-field-label">ROW IN DB</div><div class="viewer-field-value code-val">${escapeHtml(tab.dbRow)}</div></div>` : ''}
                ${tab.note ? `<div class="viewer-field"><div class="viewer-field-label">NOTE</div><div class="viewer-field-value">${escapeHtml(tab.note)}</div></div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${entry.bugs?.length ? `
        <div class="viewer-section viewer-bugs-section">
          <div class="viewer-section-label">🐛 BUGS <span class="section-count">${entry.bugs.length}</span></div>
          ${entry.bugs.map(bug => {
            const colors = { high: '#ff4766', medium: '#e8ff47', low: '#78ffa0' };
            const color = colors[bug.severity] || '#e8ff47';
            const mrLink = bug.mergeRequest?.link ? `<div class="viewer-field"><div class="viewer-field-label">LINKED MR</div><div class="viewer-field-value"><a href="${escapeHtml(bug.mergeRequest.link)}" target="_blank" class="viewer-link">⎇ ${escapeHtml(bug.mergeRequest.repo || bug.mergeRequest.link)} ↗</a></div></div>` : '';
            return `
              <div class="viewer-bug-card">
                <div class="viewer-bug-header" onclick="(function(){const c=this.closest('.viewer-bug-card');if(c)c.classList.toggle('expanded')}).call(this)">
                  <span class="viewer-bug-icon">🐛</span>
                  <span class="viewer-bug-title">${escapeHtml(bug.title)}</span>
                  <span class="viewer-bug-severity" style="color:${color};border-color:${color}">${(bug.severity||'medium').toUpperCase()}</span>
                  <span class="viewer-bug-toggle">▾</span>
                </div>
                <div class="viewer-bug-body">
                  <div class="viewer-field"><div class="viewer-field-label">DESCRIPTION</div><div class="viewer-field-value">${escapeHtml(bug.description)}</div></div>
                  <div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escapeHtml(bug.createdAt)}</div></div>
                  ${mrLink}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${entry.mergeRequests?.length ? `
        <div class="viewer-section viewer-mr-section">
          <div class="viewer-section-label">⎇ MERGE REQUESTS <span class="section-count">${entry.mergeRequests.length}</span></div>
          ${entry.mergeRequests.map(mr => {
            const sc = 'vstatus-' + (mr.status || 'open');
            const statusColors = { 'merged': '#78ffa0', 'open': '#4da8ff', 'review': '#ffa047', 'draft': '#a8a8a8' };
            const statusColor = statusColors[mr.status] || '#4da8ff';
            return `
              <div class="viewer-mr-card">
                <div class="viewer-mr-top" onclick="(function(){const c=this.closest('.viewer-mr-card');if(c)c.classList.toggle('expanded')}).call(this)" style="cursor:pointer;">
                  <span class="viewer-mr-icon">⎇</span>
                  <div class="viewer-mr-header-content">
                    <span class="viewer-mr-title">${escapeHtml(mr.title || mr.repo)}</span>
                    <span class="viewer-mr-status ${sc}" style="background-color:${statusColor}20;border-color:${statusColor}">${(mr.status||'open').toUpperCase()}</span>
                  </div>
                  <span class="viewer-mr-expand">▾</span>
                </div>
                <div class="viewer-mr-body">
                  <div class="viewer-field"><div class="viewer-field-label">REPOSITORY</div><div class="viewer-field-value">📁 ${escapeHtml(mr.repo)}</div></div>
                  <div class="viewer-field"><div class="viewer-field-label">STATUS</div><div class="viewer-field-value"><span class="viewer-mr-status ${sc}" style="background-color:${statusColor}30;border-color:${statusColor};padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;">${(mr.status||'open').toUpperCase()}</span></div></div>
                  ${mr.link ? `<div class="viewer-field"><div class="viewer-field-label">MR LINK</div><div class="viewer-field-value"><a href="${escapeHtml(mr.link)}" target="_blank" class="viewer-link viewer-mr-link">🔗 Open in ${mr.link.includes('github') ? 'GitHub' : 'GitLab'} ↗</a></div></div>` : ''}
                  ${mr.createdAt ? `<div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escapeHtml(mr.createdAt)}</div></div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  // Add centralized Bugs panel
  const allBugs = [];
  state.entries.forEach(entry => {
    if (entry.bugs?.length) {
      allBugs.push(...entry.bugs.map(bug => ({
        ...bug,
        entryTitle: entry.title
      })));
    }
  });

  if (allBugs.length > 0) {
    const highCount = allBugs.filter(b => b.severity === 'high').length;
    const medCount = allBugs.filter(b => b.severity === 'medium').length;
    const lowCount = allBugs.filter(b => b.severity === 'low').length;

    panels += `
      <div class="export-detail-panel" id="detail-panel-all-bugs">
        <div class="viewer-detail-header">
          <div class="viewer-detail-title">🐛 All Bugs</div>
          <div class="viewer-detail-date">Centralized view of all bugs from the entire project</div>
        </div>
        <div class="viewer-section viewer-bugs-section">
          <div class="viewer-section-label">🐛 BUGS <span class="section-count">${allBugs.length}</span> <span style="font-size:11px;color:var(--text-dim);">(${highCount} HIGH, ${medCount} MED, ${lowCount} LOW)</span></div>
          ${allBugs.map(bug => {
            const colors = { high: '#ff4766', medium: '#e8ff47', low: '#78ffa0' };
            const color = colors[bug.severity] || '#e8ff47';
            const mrLink = bug.mergeRequest?.link ? `<div class="viewer-field"><div class="viewer-field-label">LINKED MR</div><div class="viewer-field-value"><a href="${escapeHtml(bug.mergeRequest.link)}" target="_blank" class="viewer-link">⎇ ${escapeHtml(bug.mergeRequest.repo || bug.mergeRequest.link)} ↗</a></div></div>` : '';
            const entryRef = bug.entryTitle ? `<div class="viewer-field"><div class="viewer-field-label">IN ENTRY</div><div class="viewer-field-value">${escapeHtml(bug.entryTitle)}</div></div>` : '';
            return `
              <div class="viewer-bug-card">
                <div class="viewer-bug-header" onclick="(function(){const c=this.closest('.viewer-bug-card');if(c)c.classList.toggle('expanded')}).call(this)">
                  <span class="viewer-bug-icon">🐛</span>
                  <span class="viewer-bug-title">${escapeHtml(bug.title)}</span>
                  <span class="viewer-bug-severity" style="color:${color};border-color:${color}">${(bug.severity||'medium').toUpperCase()}</span>
                  <span class="viewer-bug-toggle">▾</span>
                </div>
                <div class="viewer-bug-body">
                  <div class="viewer-field"><div class="viewer-field-label">DESCRIPTION</div><div class="viewer-field-value">${escapeHtml(bug.description)}</div></div>
                  <div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escapeHtml(bug.createdAt)}</div></div>
                  ${entryRef}
                  ${mrLink}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Add centralized MRs panel
  const allMRs = [];
  state.entries.forEach(entry => {
    if (entry.mergeRequests?.length) {
      allMRs.push(...entry.mergeRequests.map(mr => ({
        ...mr,
        entryTitle: entry.title,
        fromEntry: true
      })));
    }
  });

  if (state.mergeRequests?.length) {
    allMRs.push(...state.mergeRequests.map(mr => ({
      ...mr,
      fromEntry: false
    })));
  }

  if (allMRs.length > 0) {
    const openCount = allMRs.filter(m => m.status !== 'merged').length;
    const mergedCount = allMRs.filter(m => m.status === 'merged').length;

    panels += `
      <div class="export-detail-panel" id="detail-panel-all-mrs">
        <div class="viewer-detail-header">
          <div class="viewer-detail-title">⎇ All Merge Requests</div>
          <div class="viewer-detail-date">Centralized view of all MRs from the entire project</div>
        </div>
        <div class="viewer-section viewer-mr-section">
          <div class="viewer-section-label">⎇ MERGE REQUESTS <span class="section-count">${allMRs.length}</span> <span style="font-size:11px;color:var(--text-dim);">(${openCount} OPEN, ${mergedCount} MERGED)</span></div>
          ${allMRs.map(mr => {
            const sc = 'vstatus-' + (mr.status || 'open');
            const statusColors = { 'merged': '#78ffa0', 'open': '#4da8ff', 'review': '#ffa047', 'draft': '#a8a8a8' };
            const statusColor = statusColors[mr.status] || '#4da8ff';
            const entryRef = mr.entryTitle && mr.fromEntry ? `<div class="viewer-field"><div class="viewer-field-label">RELATED ENTRY</div><div class="viewer-field-value">📌 ${escapeHtml(mr.entryTitle)}</div></div>` : '';
            return `
              <div class="viewer-mr-card">
                <div class="viewer-mr-top" onclick="(function(){const c=this.closest('.viewer-mr-card');if(c)c.classList.toggle('expanded')}).call(this)" style="cursor:pointer;">
                  <span class="viewer-mr-icon">⎇</span>
                  <div class="viewer-mr-header-content">
                    <span class="viewer-mr-title">${escapeHtml(mr.title || mr.repo)}</span>
                    <span class="viewer-mr-status ${sc}" style="background-color:${statusColor}20;border-color:${statusColor}">${(mr.status||'open').toUpperCase()}</span>
                  </div>
                  <span class="viewer-mr-expand">▾</span>
                </div>
                <div class="viewer-mr-body">
                  <div class="viewer-field"><div class="viewer-field-label">REPOSITORY</div><div class="viewer-field-value">📁 ${escapeHtml(mr.repo)}</div></div>
                  <div class="viewer-field"><div class="viewer-field-label">STATUS</div><div class="viewer-field-value"><span class="viewer-mr-status ${sc}" style="background-color:${statusColor}30;border-color:${statusColor};padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;">${(mr.status||'open').toUpperCase()}</span></div></div>
                  ${mr.link ? `<div class="viewer-field"><div class="viewer-field-label">MR LINK</div><div class="viewer-field-value"><a href="${escapeHtml(mr.link)}" target="_blank" class="viewer-link viewer-mr-link">🔗 Open in ${mr.link.includes('github') ? 'GitHub' : 'GitLab'} ↗</a></div></div>` : ''}
                  ${mr.createdAt ? `<div class="viewer-field"><div class="viewer-field-label">CREATED</div><div class="viewer-field-value">${escapeHtml(mr.createdAt)}</div></div>` : ''}
                  ${entryRef}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  return panels;
}

// ─── BUILD STATS CARDS ─────────────────
function _buildStatsCards(stats) {
  return `
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
  `;
}

// ─── ESCAPE HTML ───────────────────────
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}