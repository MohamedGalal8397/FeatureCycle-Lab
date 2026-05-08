/* ═══════════════════════════════════════
   UTILS.JS — Shared Helper Functions
   ─────────────────────────────────────
   كل اللي يخص:
   • uid() — توليد IDs عشوائية
   • nowStr() / formatDate() — التواريخ
   • escHtml() — HTML escaping
   • showToast() — إشعارات
═══════════════════════════════════════ */

// ─── UNIQUE ID ────────────────────────
function uid() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// ─── DATE HELPERS ─────────────────────
function nowStr() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDate(isoStr) {
  try {
    return new Date(isoStr).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) { return ''; }
}

// ─── HTML ESCAPING ────────────────────
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── TOAST NOTIFICATIONS ─────────────
function showToast(msg, isWarning) {
  const toast    = document.getElementById('saveToast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast) return;
  toastMsg.textContent = msg;
  toast.classList.toggle('warning', !!isWarning);
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function copyClosestTextareaValue(button) {
  const container = button.closest('.field-block');
  if (!container) return;
  const textarea = container.querySelector('textarea');
  if (!textarea) return;
  copyTextToClipboard(textarea.value);
}

function copyTextToClipboard(text) {
  if (!text) {
    showToast('Nothing to copy', true);
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard');
    }).catch(() => {
      showToast('Copy failed', true);
    });
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard');
  } catch (err) {
    showToast('Copy failed', true);
  }
  document.body.removeChild(textarea);
}

// ─── AUTO-EXPAND TEXTAREA ─────────────
function autoExpandTextarea(textarea, maxHeightPx = 300) {
  if (!textarea || textarea.dataset.autoExpandAttached) return;
  textarea.dataset.autoExpandAttached = 'true';

  function expand() {
    const scrollHeight = textarea.scrollHeight;
    if (scrollHeight > maxHeightPx) {
      textarea.style.height = maxHeightPx + 'px';
      textarea.classList.add('has-overflow');
    } else {
      textarea.style.height = 'auto';
      textarea.style.height = scrollHeight + 'px';
      textarea.classList.remove('has-overflow');
    }
  }

  textarea.addEventListener('input', expand);
  textarea.addEventListener('focus', expand);

  // Initial expansion if textarea already has content
  if (textarea.value) {
    setTimeout(expand, 0);
  }
}

function handleTabKey(event) {
  if (event.key !== 'Tab') return;
  const target = event.target;
  if (!target || !('selectionStart' in target)) return;

  event.preventDefault();
  const value = target.value;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const indent = '  ';

  if (target.tagName === 'TEXTAREA') {
    const selected = value.slice(start, end);
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', end);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;

    if (event.shiftKey) {
      const selectedLines = value.slice(lineStart, actualLineEnd).split('\n');
      const outdentedLines = selectedLines.map(line => line.replace(/^ {1,2}/, ''));
      const before = value.slice(0, lineStart);
      const after = value.slice(actualLineEnd);
      const newValue = before + outdentedLines.join('\n') + after;
      const removed = selectedLines.reduce((count, line, idx) => {
        const match = line.match(/^ {1,2}/);
        return count + (match ? match[0].length : 0);
      }, 0);
      target.value = newValue;
      target.selectionStart = Math.max(start - 2, lineStart);
      target.selectionEnd = Math.max(end - removed, lineStart);
    } else {
      const selectedLines = value.slice(lineStart, actualLineEnd).split('\n');
      const indentedLines = selectedLines.map(line => indent + line);
      const before = value.slice(0, lineStart);
      const after = value.slice(actualLineEnd);
      const newValue = before + indentedLines.join('\n') + after;
      target.value = newValue;
      target.selectionStart = start + indent.length;
      target.selectionEnd = end + indent.length * selectedLines.length;
    }
  } else {
    const before = value.slice(0, start);
    const after = value.slice(end);
    target.value = before + indent + after;
    target.selectionStart = target.selectionEnd = start + indent.length;
  }
}

function attachTabKeyBehavior(field) {
  if (!field || field.dataset.tabKeyAttached) return;
  field.dataset.tabKeyAttached = 'true';
  field.addEventListener('keydown', handleTabKey);
}

// ─── INIT ALL AUTO-EXPAND TEXTAREAS ──
function initAutoExpandTextareas() {
  // Form textareas (modals)
  document.querySelectorAll('.form-textarea').forEach(ta => {
    autoExpandTextarea(ta, 300);
    attachTabKeyBehavior(ta);
  });

  // JSON import textarea
  document.querySelectorAll('.json-textarea').forEach(ta => {
    autoExpandTextarea(ta, 350);
    attachTabKeyBehavior(ta);
  });

  // Tab panel textareas
  document.querySelectorAll('.tab-panel textarea').forEach(ta => {
    autoExpandTextarea(ta, 280);
    attachTabKeyBehavior(ta);
  });

  // Text inputs that should accept tabs/spaces while typing
  document.querySelectorAll('.form-input, .tab-name-input').forEach(input => {
    attachTabKeyBehavior(input);
  });
}
