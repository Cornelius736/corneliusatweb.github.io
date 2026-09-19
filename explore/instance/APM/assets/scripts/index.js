// Tabs

function initTabs(container, defaultTab) {
  const buttons = container.querySelectorAll('.tab-btn');
  const panels = container.querySelectorAll('.tab-panel');
 
  function activate(tabName) {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    panels.forEach(p => p.classList.toggle('active', p.dataset.tab === tabName));
  }
 
  buttons.forEach(b => b.addEventListener('click', () => activate(b.dataset.tab)));
  activate(defaultTab || buttons[0]?.dataset.tab);
}
 
document.querySelectorAll('.tabs-wrapper').forEach(el => initTabs(el));

// Storage

const STORAGE_KEYS = {
  checklist: 'checklist-items',
  notepad: 'notepad-documents',
  tally: 'tally-count',
  theme: 'theme'
};

const store = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  },
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(data, filename) {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

// Opens a file picker and hands the chosen files to onFiles.
function pickFiles(accept, multiple, onFiles) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  input.addEventListener('change', () => {
    if (input.files.length) onFiles([...input.files]);
  });
  input.click();
}

// Opens a file picker for a .json file and hands the parsed contents to onData.
function uploadJson(onData) {
  pickFiles('.json,application/json', false, async ([file]) => {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (err) {
      alert("That file couldn't be read as JSON.");
      return;
    }
    onData(data);
  });
}

// Checklist

let items = store.load(STORAGE_KEYS.checklist, []);

const listEl = document.getElementById('list');
const inputEl = document.getElementById('itemInput');
const addBtn = document.getElementById('addBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const downloadBtn = document.getElementById('checklistDownloadBtn');
const uploadBtn = document.getElementById('checklistUploadBtn');
const clearDataBtn = document.getElementById('checklistClearBtn');

function save() {
  store.save(STORAGE_KEYS.checklist, items);
}

function render() {
  listEl.innerHTML = '';
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => {
      items[index].checked = checkbox.checked;
      save();
      updateToolbar();
    });

    const p = document.createElement('p');
    p.textContent = item.text;

    div.appendChild(checkbox);
    div.appendChild(p);
    listEl.appendChild(div);
  });
  updateToolbar();
}

function updateToolbar() {
  const total = items.length;
  const selected = items.filter(i => i.checked).length;
  selectAllBtn.disabled = total === 0 || selected === total;
  deselectAllBtn.disabled = selected === 0;
  deleteSelectedBtn.disabled = selected === 0;
}

addBtn.addEventListener('click', () => {
  const text = inputEl.value.trim();
  if (!text) return;
  items.push({ text, checked: false });
  inputEl.value = '';
  save();
  render();
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

selectAllBtn.addEventListener('click', () => {
  items.forEach(i => i.checked = true);
  save();
  render();
});

deselectAllBtn.addEventListener('click', () => {
  items.forEach(i => i.checked = false);
  save();
  render();
});

deleteSelectedBtn.addEventListener('click', () => {
  items = items.filter(i => !i.checked);
  save();
  render();
});

downloadBtn.addEventListener('click', () => downloadJson(items, 'checklist-data.json'));

clearDataBtn.addEventListener('click', () => {
  if (!confirm('This will delete all of your Checklist data. Continue?')) return;
  store.remove(STORAGE_KEYS.checklist);
  items = [];
  render();
});

// Merge: uploaded entries the list already has are skipped (matched one-to-one by text)
function cleanChecklist(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter(i => i && typeof i.text === 'string' && i.text.trim())
    .map(i => ({ text: i.text.trim(), checked: i.checked === true }));
}

function mergeChecklist(existing, incoming) {
  const merged = existing.slice();
  const unmatched = new Map();
  existing.forEach(i => unmatched.set(i.text, (unmatched.get(i.text) || 0) + 1));

  let added = 0;
  incoming.forEach(i => {
    const left = unmatched.get(i.text) || 0;
    if (left > 0) {
      unmatched.set(i.text, left - 1);
    } else {
      merged.push(i);
      added++;
    }
  });
  return { merged, added };
}

uploadBtn.addEventListener('click', () => uploadJson(data => {
  const incoming = cleanChecklist(data);
  if (incoming.length === 0) {
    alert("That file doesn't contain any Checklist entries.");
    return;
  }
  const { merged, added } = mergeChecklist(items, incoming);
  items = merged;
  save();
  render();
  alert(`Checklist: ${added} added, ${incoming.length - added} already in your list.`);
}));

render();

// Notepad

const notepadEls = {
  listView: document.getElementById('notepadListView'),
  editorView: document.getElementById('notepadEditorView'),
  list: document.getElementById('notepadList'),
  input: document.getElementById('notepadInput'),
  addBtn: document.getElementById('notepadAddBtn'),
  editor: document.getElementById('notepadEditor'),
  title: document.getElementById('notepadEditorTitle'),
  status: document.getElementById('notepadStatus'),
  back: document.getElementById('notepadBackLink')
};

let notepadDocs = (() => {
  const saved = store.load(STORAGE_KEYS.notepad, []);
  if (!Array.isArray(saved)) return [];
  return saved
    .filter(d => d && typeof d.title === 'string')
    .map(d => ({ title: d.title, content: typeof d.content === 'string' ? d.content : '' }));
})();

let openDocTitle = null;
let editorDirty = false;
let saveTimer = null;
let maxWaitTimer = null;

function saveNotepad() {
  try {
    store.save(STORAGE_KEYS.notepad, notepadDocs);
    return true;
  } catch (err) {
    return false;
  }
}

// Autosave

function flushEditor() {
  clearTimeout(saveTimer);
  clearTimeout(maxWaitTimer);
  saveTimer = maxWaitTimer = null;
  if (!editorDirty || openDocTitle === null) return;

  const doc = notepadDocs.find(d => d.title === openDocTitle);
  if (!doc) return;
  doc.content = notepadEls.editor.value;

  if (saveNotepad()) {
    editorDirty = false;
    notepadEls.status.textContent = 'Saved';
  } else {
    notepadEls.status.textContent = 'Could not save (browser storage may be full)';
  }
}

function scheduleSave() {
  editorDirty = true;
  notepadEls.status.textContent = 'Saving...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushEditor, 600);
  if (!maxWaitTimer) maxWaitTimer = setTimeout(flushEditor, 5000);
}

function showNotepadView(editing) {
  notepadEls.listView.hidden = editing;
  notepadEls.editorView.hidden = !editing;
}

function openEditor(title) {
  const doc = notepadDocs.find(d => d.title === title);
  if (!doc) return;
  openDocTitle = title;
  editorDirty = false;
  notepadEls.title.textContent = title;
  notepadEls.editor.value = doc.content;
  notepadEls.status.textContent = 'Saved';
  showNotepadView(true);
  notepadEls.editor.focus();
  notepadEls.editor.setSelectionRange(doc.content.length, doc.content.length);
}

function closeEditor() {
  flushEditor();
  openDocTitle = null;
  showNotepadView(false);
  renderNotepad();
}

function renderNotepad() {
  notepadEls.list.innerHTML = '';
  if (notepadDocs.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No documents yet.';
    empty.style.opacity = '0.6';
    notepadEls.list.appendChild(empty);
    return;
  }

  notepadDocs.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'item doc-item';

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = doc.title;
    link.addEventListener('click', e => {
      e.preventDefault();
      openEditor(doc.title);
    });

    const dl = document.createElement('button');
    dl.className = 'link-btn';
    dl.textContent = '[Download]';
    dl.addEventListener('click', () => {
      const name = doc.title.replace(/[\\/:*?"<>|]+/g, '_');
      downloadFile(doc.content, name + '.txt', 'text/plain;charset=utf-8');
    });

    const del = document.createElement('button');
    del.className = 'link-btn';
    del.textContent = '[Delete]';
    del.addEventListener('click', () => {
      if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
      notepadDocs = notepadDocs.filter(d => d !== doc);
      saveNotepad();
      renderNotepad();
    });

    row.append(link, dl, del);
    notepadEls.list.appendChild(row);
  });
}

function addDocument() {
  const title = notepadEls.input.value.trim();
  if (!title) return;
  if (notepadDocs.some(d => d.title.toLowerCase() === title.toLowerCase())) {
    alert(`A document named "${title}" already exists.`);
    return;
  }
  notepadDocs.push({ title, content: '' });
  notepadEls.input.value = '';
  saveNotepad();
  renderNotepad();
}

notepadEls.addBtn.addEventListener('click', addDocument);
notepadEls.input.addEventListener('keydown', e => {
  if (e.key === 'Enter') addDocument();
});
notepadEls.editor.addEventListener('input', scheduleSave);
notepadEls.back.addEventListener('click', e => {
  e.preventDefault();
  closeEditor();
});

window.addEventListener('pagehide', flushEditor);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushEditor();
});

document.getElementById('notepadDownloadBtn').addEventListener('click', () => {
  flushEditor();
  downloadJson(notepadDocs, 'notepad-data.json');
});

// Merge: new titles are added; a title clash with different text becomes "Title (2)", etc.
function cleanNotepad(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter(d => d && typeof d.title === 'string' && d.title.trim())
    .map(d => ({ title: d.title.trim(), content: typeof d.content === 'string' ? d.content : '' }));
}

function mergeNotepad(existing, incoming) {
  const merged = existing.slice();
  const stats = { added: 0, copies: 0, skipped: 0 };
  const titleTaken = title => merged.some(d => d.title.toLowerCase() === title.toLowerCase());

  incoming.forEach(doc => {
    const base = doc.title.toLowerCase();
    const alreadyHere = merged.some(d => {
      if (d.content !== doc.content) return false;
      const t = d.title.toLowerCase();
      return t === base || (t.startsWith(base + ' (') && /^\d+\)$/.test(t.slice(base.length + 2)));
    });

    if (alreadyHere) {
      stats.skipped++;
    } else if (!titleTaken(doc.title)) {
      merged.push(doc);
      stats.added++;
    } else {
      let n = 2;
      while (titleTaken(`${doc.title} (${n})`)) n++;
      merged.push({ title: `${doc.title} (${n})`, content: doc.content });
      stats.copies++;
    }
  });
  return { merged, stats };
}

// .txt files are single documents (title = file name); .json files are full Notepad backups
document.getElementById('notepadUploadBtn').addEventListener('click', () => {
  pickFiles('.txt,.json,text/plain,application/json', true, async files => {
    const incoming = [];
    let skippedFiles = 0;

    for (const file of files) {
      try {
        const text = await file.text();
        if (/\.json$/i.test(file.name)) {
          const docs = cleanNotepad(JSON.parse(text));
          if (docs.length === 0) skippedFiles++;
          incoming.push(...docs);
        } else if (/\.txt$/i.test(file.name)) {
          const title = file.name.replace(/\.txt$/i, '').trim();
          if (title) incoming.push({ title, content: text });
          else skippedFiles++;
        } else {
          skippedFiles++;
        }
      } catch (err) {
        skippedFiles++;
      }
    }

    if (incoming.length === 0) {
      alert("Nothing to import: the selected file(s) don't contain any Notepad documents.");
      return;
    }
    flushEditor();
    const { merged, stats } = mergeNotepad(notepadDocs, incoming);
    notepadDocs = merged;
    saveNotepad();
    renderNotepad();

    const parts = [];
    if (stats.added) parts.push(`${stats.added} added`);
    if (stats.copies) parts.push(`${stats.copies} added as a copy (the title already existed with different text)`);
    if (stats.skipped) parts.push(`${stats.skipped} already in your list`);
    if (skippedFiles) parts.push(`${skippedFiles} file(s) skipped (unsupported or unreadable)`);
    alert('Notepad: ' + parts.join(', ') + '.');
  });
});

document.getElementById('notepadClearBtn').addEventListener('click', () => {
  if (!confirm('This will delete all of your Notepad data. Continue?')) return;
  clearTimeout(saveTimer);
  clearTimeout(maxWaitTimer);
  saveTimer = maxWaitTimer = null;
  editorDirty = false;
  openDocTitle = null;
  store.remove(STORAGE_KEYS.notepad);
  notepadDocs = [];
  showNotepadView(false);
  renderNotepad();
});

renderNotepad();

// Color Picker

const state = { hue: 0, sat: 100, val: 100, alpha: 100 };
 
const dom = {
  svSquare: document.getElementById('svSquare'),
  svCursor: document.getElementById('svCursor'),
  hueSlider: document.getElementById('hueSlider'),
  alphaSlider: document.getElementById('alphaSlider'),
  alphaValue: document.getElementById('alphaValue'),
  swatchFill: document.getElementById('swatchFill'),
  hexInput: document.getElementById('hexInput'),
  rInput: document.getElementById('rInput'),
  gInput: document.getElementById('gInput'),
  bInput: document.getElementById('bInput'),
  aInputRgb: document.getElementById('aInputRgb'),
  hInput: document.getElementById('hInput'),
  sInput: document.getElementById('sInput'),
  lInput: document.getElementById('lInput'),
  aInputHsl: document.getElementById('aInputHsl'),
  cInput: document.getElementById('cInput'),
  mInput: document.getElementById('mInput'),
  yInput: document.getElementById('yInput'),
  kInput: document.getElementById('kInput'),
  filterOutput: document.getElementById('filterOutput'),
  copyBtn: document.getElementById('copyBtn')
};
 
function hsvToRgb(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
 
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s * 100, max * 100];
}
 
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}
 
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
 
function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return [0, 0, 0, 100];
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [c * 100, m * 100, y * 100, k * 100];
}
 
function cmykToRgb(c, m, y, k) {
  c /= 100; m /= 100; y /= 100; k /= 100;
  return [
    Math.round(255 * (1 - c) * (1 - k)),
    Math.round(255 * (1 - m) * (1 - k)),
    Math.round(255 * (1 - y) * (1 - k))
  ];
}
 
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}
 
function toHexByte(percent) {
  return Math.round(percent / 100 * 255).toString(16).padStart(2, '0').toUpperCase();
}
 
function hexToRgba(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6 && hex.length !== 8) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;
  return [r, g, b, Math.round(a / 255 * 100)];
}
 
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
 
function syncCursorAndSliders() {
  dom.svSquare.style.backgroundColor = `hsl(${state.hue}, 100%, 50%)`;
  dom.svCursor.style.left = state.sat + '%';
  dom.svCursor.style.top = (100 - state.val) + '%';
  dom.hueSlider.value = state.hue;
}
 
function setFromHsv() {
  const [r, g, b] = hsvToRgb(state.hue, state.sat, state.val);
  applyRgb(r, g, b);
  syncCursorAndSliders();
}
 
function setFromRgb(r, g, b) {
  const [h, s, v] = rgbToHsv(r, g, b);
  if (s > 0) state.hue = h;
  state.sat = s;
  state.val = v;
  applyRgb(r, g, b);
  syncCursorAndSliders();
}
 
function applyRgb(r, g, b) {
  dom.swatchFill.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${state.alpha / 100})`;
 
  let hex = rgbToHex(r, g, b);
  if (state.alpha < 100) hex += toHexByte(state.alpha);
  dom.hexInput.value = hex;
 
  dom.rInput.value = r;
  dom.gInput.value = g;
  dom.bInput.value = b;
  dom.aInputRgb.value = state.alpha;
 
  const [h, s, l] = rgbToHsl(r, g, b);
  dom.hInput.value = Math.round(h);
  dom.sInput.value = Math.round(s);
  dom.lInput.value = Math.round(l);
  dom.aInputHsl.value = state.alpha;
 
  const [c, m, y, k] = rgbToCmyk(r, g, b);
  dom.cInput.value = Math.round(c);
  dom.mInput.value = Math.round(m);
  dom.yInput.value = Math.round(y);
  dom.kInput.value = Math.round(k);
 
  dom.alphaSlider.value = state.alpha;
  dom.alphaValue.textContent = state.alpha + '%';
  dom.alphaSlider.style.background =
    `linear-gradient(to top, transparent, rgb(${r}, ${g}, ${b})), ` +
    `repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / var(--tile) var(--tile)`;
 
  scheduleFilter(r, g, b);
}
 
let filterTimeout = null;
function scheduleFilter(r, g, b) {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    dom.filterOutput.value = `filter: ${solveFilter(r / 255, g / 255, b / 255)};`;
  }, 200);
}
 
function setSvFromEvent(e) {
  const rect = dom.svSquare.getBoundingClientRect();
  const x = clamp(e.clientX - rect.left, 0, rect.width);
  const y = clamp(e.clientY - rect.top, 0, rect.height);
  state.sat = (x / rect.width) * 100;
  state.val = 100 - (y / rect.height) * 100;
  setFromHsv();
}
 
let dragging = false;
dom.svSquare.addEventListener('pointerdown', e => { dragging = true; setSvFromEvent(e); });
window.addEventListener('pointermove', e => { if (dragging) setSvFromEvent(e); });
window.addEventListener('pointerup', () => dragging = false);
window.addEventListener('pointercancel', () => dragging = false);
 
dom.hueSlider.addEventListener('input', () => {
  state.hue = Number(dom.hueSlider.value);
  setFromHsv();
});
 
dom.alphaSlider.addEventListener('input', () => {
  state.alpha = Number(dom.alphaSlider.value);
  applyRgb(Number(dom.rInput.value), Number(dom.gInput.value), Number(dom.bInput.value));
});
 
dom.hexInput.addEventListener('change', () => {
  const parsed = hexToRgba(dom.hexInput.value);
  if (!parsed) return;
  const [r, g, b, a] = parsed;
  state.alpha = a;
  setFromRgb(r, g, b);
});
 
[dom.rInput, dom.gInput, dom.bInput, dom.aInputRgb].forEach(input =>
  input.addEventListener('change', () => {
    const r = clamp(dom.rInput.value, 0, 255);
    const g = clamp(dom.gInput.value, 0, 255);
    const b = clamp(dom.bInput.value, 0, 255);
    state.alpha = clamp(dom.aInputRgb.value, 0, 100);
    setFromRgb(r, g, b);
  })
);
 
[dom.hInput, dom.sInput, dom.lInput, dom.aInputHsl].forEach(input =>
  input.addEventListener('change', () => {
    const h = clamp(dom.hInput.value, 0, 360);
    const s = clamp(dom.sInput.value, 0, 100);
    const l = clamp(dom.lInput.value, 0, 100);
    state.alpha = clamp(dom.aInputHsl.value, 0, 100);
    setFromRgb(...hslToRgb(h, s, l));
  })
);
 
[dom.cInput, dom.mInput, dom.yInput, dom.kInput].forEach(input =>
  input.addEventListener('change', () => {
    const c = clamp(dom.cInput.value, 0, 100);
    const m = clamp(dom.mInput.value, 0, 100);
    const y = clamp(dom.yInput.value, 0, 100);
    const k = clamp(dom.kInput.value, 0, 100);
    setFromRgb(...cmykToRgb(c, m, y, k));
  })
);
 
dom.copyBtn.addEventListener('click', async () => {
  const text = dom.filterOutput.value;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      dom.filterOutput.select();
      document.execCommand('copy');
    }
  } catch (err) {
    dom.filterOutput.select();
    document.execCommand('copy');
  }
  const original = dom.copyBtn.textContent;
  dom.copyBtn.textContent = 'Copied!';
  setTimeout(() => dom.copyBtn.textContent = original, 1200);
});
dom.filterOutput.addEventListener('click', () => dom.filterOutput.select());
 
function applyFilterChain(p) {
  let r = 0, g = 0, b = 0;
 
  const inv = p[0];
  r += inv * (1 - 2 * r); g += inv * (1 - 2 * g); b += inv * (1 - 2 * b);
 
  const sep = p[1];
  const sr = 0.393 * r + 0.769 * g + 0.189 * b;
  const sg = 0.349 * r + 0.686 * g + 0.168 * b;
  const sb = 0.272 * r + 0.534 * g + 0.131 * b;
  r += (sr - r) * sep; g += (sg - g) * sep; b += (sb - b) * sep;
 
  const sat = p[2];
  const lr = 0.213, lg = 0.715, lb = 0.072;
  const sr2 = (lr + (1 - lr) * sat) * r + (lg - lg * sat) * g + (lb - lb * sat) * b;
  const sg2 = (lr - lr * sat) * r + (lg + (1 - lg) * sat) * g + (lb - lb * sat) * b;
  const sb2 = (lr - lr * sat) * r + (lg - lg * sat) * g + (lb + (1 - lb) * sat) * b;
  r = sr2; g = sg2; b = sb2;
 
  const angle = p[3] * Math.PI / 180;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const hr = (0.213 + cosA * 0.787 - sinA * 0.213) * r + (0.715 - cosA * 0.715 - sinA * 0.715) * g + (0.072 - cosA * 0.072 + sinA * 0.928) * b;
  const hg = (0.213 - cosA * 0.213 + sinA * 0.143) * r + (0.715 + cosA * 0.285 + sinA * 0.140) * g + (0.072 - cosA * 0.072 - sinA * 0.283) * b;
  const hb = (0.213 - cosA * 0.213 - sinA * 0.787) * r + (0.715 - cosA * 0.715 + sinA * 0.715) * g + (0.072 + cosA * 0.928 + sinA * 0.072) * b;
  r = hr; g = hg; b = hb;
 
  const bri = p[4];
  r *= bri; g *= bri; b *= bri;
 
  const con = p[5];
  r = (r - 0.5) * con + 0.5; g = (g - 0.5) * con + 0.5; b = (b - 0.5) * con + 0.5;
 
  return [clamp(r * 255, 0, 255) / 255, clamp(g * 255, 0, 255) / 255, clamp(b * 255, 0, 255) / 255];
}
 
function filterLoss(p, target) {
  const [r, g, b] = applyFilterChain(p);
  return (r - target[0]) ** 2 + (g - target[1]) ** 2 + (b - target[2]) ** 2;
}
 
const FILTER_RANGES = [[0, 1], [0, 1], [0, 3], [0, 360], [0, 2], [0, 2]];
 
function clampFilterParams(p) {
  return p.map((v, i) => Math.min(FILTER_RANGES[i][1], Math.max(FILTER_RANGES[i][0], v)));
}
 
function randomFilterParams() {
  return FILTER_RANGES.map(([lo, hi]) => lo + Math.random() * (hi - lo));
}
 
function optimizeFilter(target, initial) {
  let p = initial.slice();
  const eps = 1e-4;
  let stepScale = 0.02;
  for (let iter = 0; iter < 800; iter++) {
    const grad = p.map((_, i) => {
      const plus = p.slice(); plus[i] += eps;
      const minus = p.slice(); minus[i] -= eps;
      return (filterLoss(clampFilterParams(plus), target) - filterLoss(clampFilterParams(minus), target)) / (2 * eps);
    });
    const gradNorm = Math.sqrt(grad.reduce((s, v) => s + v * v, 0)) || 1;
    for (let i = 0; i < p.length; i++) {
      p[i] -= (grad[i] / gradNorm) * (FILTER_RANGES[i][1] - FILTER_RANGES[i][0]) * stepScale;
    }
    p = clampFilterParams(p);
    stepScale *= 0.995;
  }
  return { params: p, loss: filterLoss(p, target) };
}
 
function solveFilter(r, g, b) {
  const target = [r, g, b];
 
  if (r > 0.99 && g > 0.99 && b > 0.99) return 'invert(100%)';
  if (r < 0.01 && g < 0.01 && b < 0.01) return 'none';
 
  let best = null;
  for (let s = 0; s < 40; s++) {
    const result = optimizeFilter(target, randomFilterParams());
    if (!best || result.loss < best.loss) best = result;
  }
 
  const [inv, sep, sat, hueDeg, bri, con] = best.params;
  return [
    `invert(${Math.round(inv * 100)}%)`,
    `sepia(${Math.round(sep * 100)}%)`,
    `saturate(${Math.round(sat * 100)}%)`,
    `hue-rotate(${Math.round(hueDeg)}deg)`,
    `brightness(${Math.round(bri * 100)}%)`,
    `contrast(${Math.round(con * 100)}%)`
  ].join(' ');
}
 
setFromHsv();

// Converters

const CONVERTERS = [
    { key: 'length', title: 'Length', units: [
        ['nm', 'nm', 1e-9], ['um', 'μm', 1e-6], ['mm', 'mm', 0.001], ['cm', 'cm', 0.01], ['m', 'm', 1], ['km', 'km', 1000],
        ['in', 'in', 0.0254], ['ft', 'ft', 0.3048], ['yd', 'yd', 0.9144], ['mi', 'mi', 1609.344], ['nmi', 'nmi', 1852]
    ] },
    { key: 'mass', title: 'Mass', units: [
        ['mg', 'mg', 1e-6], ['g', 'g', 0.001], ['kg', 'kg', 1], ['t', 't', 1000],
        ['oz', 'oz', 0.028349523125], ['lb', 'lb', 0.45359237], ['st', 'st', 6.35029318],
        ['ustn', 'US tn', 907.18474], ['uktn', 'UK tn', 1016.0469088]
    ] },
    { key: 'volume', title: 'Volume', units: [
        ['ml', 'ml', 0.001], ['l', 'l', 1], ['m3', 'm³', 1000], ['in3', 'in³', 0.016387064], ['ft3', 'ft³', 28.316846592],
        ['ustsp', 'US tsp', 0.00492892159375], ['ustbsp', 'US tbsp', 0.01478676478125], ['usfloz', 'US fl oz', 0.0295735295625],
        ['uscup', 'US cup', 0.2365882365], ['uspt', 'US pt', 0.473176473], ['usqt', 'US qt', 0.946352946], ['usgal', 'US gal', 3.785411784],
        ['ukfloz', 'UK fl oz', 0.0284130625], ['ukpt', 'UK pt', 0.56826125], ['ukgal', 'UK gal', 4.54609]
    ] },
    { key: 'temperature', title: 'Temperature', units: [
        ['c', '°C', { to: v => v + 273.15, from: k => k - 273.15 }],
        ['f', '°F', { to: v => (v - 32) * 5 / 9 + 273.15, from: k => (k - 273.15) * 9 / 5 + 32 }],
        ['k', 'K', { to: v => v, from: k => k }],
        ['r', '°R', { to: v => v * 5 / 9, from: k => k * 9 / 5 }]
    ] },
    { key: 'area', title: 'Area', units: [
        ['mm2', 'mm²', 1e-6], ['cm2', 'cm²', 0.0001], ['m2', 'm²', 1], ['hectare', 'ha', 10000], ['km2', 'km²', 1e6],
        ['in2', 'in²', 0.00064516], ['ft2', 'ft²', 0.09290304], ['yd2', 'yd²', 0.83612736], ['acre', 'acre', 4046.8564224], ['mi2', 'mi²', 2589988.110336]
    ] },
    { key: 'data', title: 'Data', units: [
        ['bit', 'bit', 0.125], ['B', 'B', 1],
        ['KB', 'KB', 1e3], ['MB', 'MB', 1e6], ['GB', 'GB', 1e9], ['TB', 'TB', 1e12], ['PB', 'PB', 1e15],
        ['KiB', 'KiB', 1024], ['MiB', 'MiB', 1048576], ['GiB', 'GiB', 1073741824], ['TiB', 'TiB', 1099511627776], ['PiB', 'PiB', 1125899906842624]
    ] },
    { key: 'datarate', title: 'Data Rate', units: [
        ['bps', 'bit/s', 1], ['kbps', 'kbit/s', 1e3], ['Mbps', 'Mbit/s', 1e6], ['Gbps', 'Gbit/s', 1e9],
        ['Bps', 'B/s', 8], ['KBps', 'KB/s', 8e3], ['MBps', 'MB/s', 8e6], ['GBps', 'GB/s', 8e9]
    ] },
    { key: 'energy', title: 'Energy', units: [
        ['eV', 'eV', 1.602176634e-19], ['J', 'J', 1], ['kJ', 'kJ', 1000], ['cal', 'cal', 4.184], ['kcal', 'kcal', 4184],
        ['Wh', 'Wh', 3600], ['kWh', 'kWh', 3.6e6], ['BTU', 'BTU', 1055.05585262], ['ftlbf', 'ft·lbf', 1.3558179483314004]
    ] },
    { key: 'power', title: 'Power', units: [
        ['mW', 'mW', 0.001], ['W', 'W', 1], ['kW', 'kW', 1000], ['MW', 'MW', 1e6],
        ['hp', 'hp', 745.6998715822702], ['ps', 'PS', 735.49875], ['btuh', 'BTU/h', 0.29307107017222]
    ] },
    { key: 'force', title: 'Force', units: [
        ['dyn', 'dyn', 1e-5], ['N', 'N', 1], ['kN', 'kN', 1000], ['kgf', 'kgf', 9.80665], ['lbf', 'lbf', 4.4482216152605]
    ] },
    { key: 'pressure', title: 'Pressure', units: [
        ['Pa', 'Pa', 1], ['hPa', 'hPa', 100], ['kPa', 'kPa', 1000], ['MPa', 'MPa', 1e6], ['bar', 'bar', 1e5], ['atm', 'atm', 101325],
        ['psi', 'psi', 6894.757293168], ['mmHg', 'mmHg', 133.322387415], ['torr', 'torr', 101325 / 760], ['inHg', 'inHg', 25.4 * 133.322387415]
    ] },
    { key: 'speed', title: 'Speed', units: [
        ['mps', 'm/s', 1], ['kmph', 'km/h', 1 / 3.6], ['mph', 'mph', 0.44704], ['knot', 'knot', 1852 / 3600], ['ftps', 'ft/s', 0.3048], ['c', 'c', 299792458]
    ] },
    { key: 'time', title: 'Time', units: [
        ['ns', 'ns', 1e-9], ['us', 'μs', 1e-6], ['ms', 'ms', 0.001], ['s', 's', 1], ['min', 'min', 60], ['h', 'h', 3600],
        ['day', 'day', 86400], ['week', 'week', 604800], ['month', 'month', 2629800], ['year', 'year', 31557600]
    ] },
    { key: 'frequency', title: 'Frequency', units: [
        ['rpm', 'rpm', 1 / 60], ['Hz', 'Hz', 1], ['kHz', 'kHz', 1e3], ['MHz', 'MHz', 1e6], ['GHz', 'GHz', 1e9]
    ] },
    { key: 'angle', title: 'Angle', units: [
        ['arcsec', 'arcsec', 1 / 3600], ['arcmin', 'arcmin', 1 / 60], ['deg', 'deg', 1], ['rad', 'rad', 180 / Math.PI], ['grad', 'grad', 0.9], ['turn', 'turn', 360]
    ] },
    { key: 'digital', title: 'Digital',
        refs: [
            { key: 'rem', label: 'Root font size (rem)', value: 16 },
            { key: 'em', label: 'Parent font size (em)', value: 16 },
            { key: 'vw', label: 'Viewport width (vw)', value: 1920 },
            { key: 'vh', label: 'Viewport height (vh)', value: 1080 },
            { key: 'pct', label: 'Reference size (%)', value: 16 }
        ],
        units: [
            ['px', 'px', 1], ['pt', 'pt', 96 / 72], ['pc', 'pc', 16], ['in', 'in', 96], ['cm', 'cm', 96 / 2.54], ['mm', 'mm', 96 / 25.4],
            ['em', 'em', () => getRef('em')],
            ['rem', 'rem', () => getRef('rem')],
            ['vw', 'vw', () => getRef('vw') / 100],
            ['vh', 'vh', () => getRef('vh') / 100],
            ['vmin', 'vmin', () => Math.min(getRef('vw'), getRef('vh')) / 100],
            ['vmax', 'vmax', () => Math.max(getRef('vw'), getRef('vh')) / 100],
            ['%', '%', () => getRef('pct') / 100]
        ] }
];

const converterGroups = {};
const refInputs = {};

function getRef(name) {
    const input = refInputs[name];
    const value = parseFloat(input.value);
    return value > 0 ? value : parseFloat(input.defaultValue);
}

function makeConverter(spec) {
    if (typeof spec === "object") return spec;
    const factor = () => typeof spec === "function" ? spec() : spec;
    return { to: v => v * factor(), from: b => b / factor() };
}

function convertGroup(group, sourceId) {
    const source = group.inputs[sourceId];
    const value = parseFloat(source.value);
    group.last = sourceId;

    const base = isNaN(value) ? NaN : group.conv[sourceId].to(value);
    for (const id in group.inputs) {
        if (id === sourceId) continue;
        const result = group.conv[id].from(base);
        group.inputs[id].value = isFinite(result) ? Number(result.toPrecision(10)) : "";
    }
}

function buildConverters() {
    const nav = document.getElementById("converterNav");
    const list = document.getElementById("converterList");
    const br = () => document.createElement("br");

    CONVERTERS.forEach(cat => {
        const anchor = "conv-" + cat.key;

        const link = document.createElement("a");
        link.href = "#" + anchor;
        link.textContent = cat.title;
        const navBtn = document.createElement("button");
        navBtn.appendChild(link);
        navBtn.addEventListener("click", e => { if (e.target !== link) link.click(); });
        nav.appendChild(navBtn);

        const heading = document.createElement("h2");
        heading.id = anchor;
        const back = document.createElement("a");
        back.href = "#top";
        back.textContent = "[Back]";
        heading.append(back, " " + cat.title);

        const section = document.createElement("section");
        section.className = "category";
        section.dataset.category = cat.key;

        if (cat.refs) {
            const title = document.createElement("p");
            title.innerHTML = "<b>Reference Values</b>";
            section.appendChild(title);
            cat.refs.forEach(ref => {
                const row = document.createElement("div");
                row.className = "ref-row";
                const label = document.createElement("label");
                label.textContent = ref.label;
                const input = document.createElement("input");
                input.type = "number";
                input.dataset.ref = ref.key;
                input.defaultValue = ref.value;
                input.value = ref.value;
                refInputs[ref.key] = input;
                row.append(label, input);
                section.appendChild(row);
            });
            section.appendChild(br());
            section.appendChild(br());
        }

        const group = { conv: {}, inputs: {}, last: null };
        const grid = document.createElement("div");
        grid.className = "unit-grid";
        cat.units.forEach(([id, label, spec]) => {
            const field = document.createElement("label");
            field.className = "unit-field";
            const name = document.createElement("span");
            name.textContent = label;
            const input = document.createElement("input");
            input.type = "number";
            input.step = "any";
            input.dataset.unit = id;
            field.append(name, input);
            grid.appendChild(field);
            group.conv[id] = makeConverter(spec);
            group.inputs[id] = input;
        });
        section.appendChild(grid);
        converterGroups[cat.key] = group;

        list.append(heading, br(), section, br(), br());
    });

    list.addEventListener("input", e => {
        const group = converterGroups[e.target.closest("section").dataset.category];
        if (e.target.dataset.unit) convertGroup(group, e.target.dataset.unit);
        else if (e.target.dataset.ref && group.last) convertGroup(group, group.last);
    });
}

buildConverters();

// Tally

let count = Number(store.load(STORAGE_KEYS.tally, 0));
if (!Number.isInteger(count)) count = 0;

const countEl = document.getElementById('count');

function setCount(value) {
  count = value;
  countEl.textContent = count;
  store.save(STORAGE_KEYS.tally, count);
}

countEl.textContent = count;
document.getElementById('plus').onclick = () => setCount(count + 1);
document.getElementById('minus').onclick = () => setCount(count - 1);
document.getElementById('reset').onclick = () => setCount(0);

document.getElementById('tallyDownloadBtn').addEventListener('click', () => {
  downloadJson({ count }, 'tally-data.json');
});

// Overwrites the current value (after asking, if there is one)
document.getElementById('tallyUploadBtn').addEventListener('click', () => uploadJson(data => {
  const value = typeof data === 'number' ? data : data && data.count;
  if (!Number.isSafeInteger(value)) {
    alert("That file doesn't contain a valid Tally value.");
    return;
  }
  if (count !== 0 && !confirm(`(!) Warning: this will overwrite your current Tally value (${count}) with the uploaded one (${value}). The current value will be lost and can't be recovered. Continue?`)) return;
  setCount(value);
}));

document.getElementById('tallyClearBtn').addEventListener('click', () => {
  if (!confirm('This will delete your saved Tally value. Continue?')) return;
  store.remove(STORAGE_KEYS.tally);
  count = 0;
  countEl.textContent = count;
});

// Theme

const body = document.body;
 
function setTheme(theme) {
  body.classList.remove('dark', 'dark2');
  if (theme === 'dark' || theme === 'dark2') {
    body.classList.add(theme);
  }
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}
 
document.getElementById('defaultTheme').onclick = () => setTheme('default');
document.getElementById('darkTheme').onclick = () => setTheme('dark');
document.getElementById('dark2Theme').onclick = () => setTheme('dark2');

const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
setTheme(savedTheme === 'darkest' ? 'dark2' : savedTheme || 'default');