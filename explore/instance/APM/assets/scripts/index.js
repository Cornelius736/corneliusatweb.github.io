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
  whiteboard: 'whiteboard-documents',
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
      merged.push({ ...doc, title: `${doc.title} (${n})` });
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

// Whiteboard

const WB_W = 1600;
const WB_H = 1000;

const wbEls = {
  listView: document.getElementById('whiteboardListView'),
  editorView: document.getElementById('whiteboardEditorView'),
  list: document.getElementById('whiteboardList'),
  input: document.getElementById('whiteboardInput'),
  addBtn: document.getElementById('whiteboardAddBtn'),
  title: document.getElementById('whiteboardEditorTitle'),
  status: document.getElementById('whiteboardStatus'),
  back: document.getElementById('whiteboardBackLink'),
  canvas: document.getElementById('wbCanvas'),
  penBtn: document.getElementById('wbPenBtn'),
  eraserBtn: document.getElementById('wbEraserBtn'),
  bucketBtn: document.getElementById('wbBucketBtn'),
  color: document.getElementById('wbColor'),
  size: document.getElementById('wbSize'),
  sizeLabel: document.getElementById('wbSizeLabel'),
  clearBtn: document.getElementById('wbClearBtn'),
  undoBtn: document.getElementById('wbUndoBtn'),
  redoBtn: document.getElementById('wbRedoBtn'),
  viewport: document.getElementById('wbViewport'),
  zoomSlider: document.getElementById('wbZoom'),
  zoomLabel: document.getElementById('wbZoomLabel')
};

wbEls.canvas.width = WB_W;
wbEls.canvas.height = WB_H;
const wbCtx = wbEls.canvas.getContext('2d');

// Per-board tool settings saved with each board: { mode, color, sizes: { pen, eraser } }
function wbCleanTool(t) {
  if (!t || typeof t !== 'object') return undefined;
  const clampSize = (v, [min, max]) => Math.min(max, Math.max(min, Math.round(Number(v)) || min));
  const limits = { pen: [1, 40], eraser: [5, 120] };
  const sizes = t.sizes || {};
  return {
    mode: ['pen', 'eraser', 'bucket'].includes(t.mode) ? t.mode : 'pen',
    color: typeof t.color === 'string' && /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#000000',
    sizes: {
      pen: clampSize(sizes.pen, limits.pen),
      eraser: clampSize(sizes.eraser, limits.eraser)
    }
  };
}

function wbCleanDoc(d) {
  const doc = {
    title: d.title,
    content: typeof d.content === 'string' && d.content.startsWith('data:image/') ? d.content : ''
  };
  const tool = wbCleanTool(d.tool);
  if (tool) doc.tool = tool;
  return doc;
}

let wbDocs = (() => {
  const saved = store.load(STORAGE_KEYS.whiteboard, []);
  if (!Array.isArray(saved)) return [];
  return saved
    .filter(d => d && typeof d.title === 'string')
    .map(d => wbCleanDoc(d));
})();

let wbOpenTitle = null;
let wbDirty = false;
let wbSaveTimer = null;
let wbMaxWaitTimer = null;
let wbLoadToken = 0;

// Tool state: each tool remembers its own thickness
const wbTool = {
  mode: 'pen',
  color: '#000000',
  sizes: { pen: 4, eraser: 30 },
  limits: { pen: [1, 40], eraser: [5, 120] }
};

function saveWhiteboard() {
  try {
    store.save(STORAGE_KEYS.whiteboard, wbDocs);
    return true;
  } catch (err) {
    return false;
  }
}

// Autosave

function flushWhiteboard() {
  clearTimeout(wbSaveTimer);
  clearTimeout(wbMaxWaitTimer);
  wbSaveTimer = wbMaxWaitTimer = null;
  if (!wbDirty || wbOpenTitle === null) return;

  const doc = wbDocs.find(d => d.title === wbOpenTitle);
  if (!doc) return;
  doc.content = wbEls.canvas.toDataURL('image/png');
  doc.tool = { mode: wbTool.mode, color: wbTool.color, sizes: { ...wbTool.sizes } };

  if (saveWhiteboard()) {
    wbDirty = false;
    wbEls.status.textContent = 'Saved';
  } else {
    wbEls.status.textContent = 'Could not save (browser storage may be full)';
  }
}

function scheduleWbSave() {
  wbDirty = true;
  wbEls.status.textContent = 'Saving...';
  clearTimeout(wbSaveTimer);
  wbSaveTimer = setTimeout(flushWhiteboard, 600);
  if (!wbMaxWaitTimer) wbMaxWaitTimer = setTimeout(flushWhiteboard, 5000);
}

// Tools

function applyWbTool() {
  const mode = wbTool.mode;
  const limits = wbTool.limits[mode]; // the bucket has no thickness
  wbEls.penBtn.classList.toggle('active', mode === 'pen');
  wbEls.eraserBtn.classList.toggle('active', mode === 'eraser');
  wbEls.bucketBtn.classList.toggle('active', mode === 'bucket');
  wbEls.viewport.classList.toggle('bucket', mode === 'bucket');
  wbEls.color.value = wbTool.color;
  wbEls.color.disabled = mode === 'eraser';
  wbEls.size.disabled = !limits;
  if (limits) {
    wbEls.size.min = limits[0];
    wbEls.size.max = limits[1];
    wbEls.size.value = wbTool.sizes[mode];
    wbEls.sizeLabel.textContent = wbTool.sizes[mode] + 'px';
  } else {
    wbEls.sizeLabel.textContent = 'fill';
  }
  updateWbCursor();
}

function saveWbTool() {
  if (wbOpenTitle !== null) scheduleWbSave();
}

wbEls.penBtn.addEventListener('click', () => { wbTool.mode = 'pen'; applyWbTool(); saveWbTool(); });
wbEls.eraserBtn.addEventListener('click', () => { wbTool.mode = 'eraser'; applyWbTool(); saveWbTool(); });
wbEls.bucketBtn.addEventListener('click', () => { wbTool.mode = 'bucket'; applyWbTool(); saveWbTool(); });
wbEls.color.addEventListener('input', () => { wbTool.color = wbEls.color.value; saveWbTool(); });
wbEls.size.addEventListener('input', () => {
  wbTool.sizes[wbTool.mode] = Number(wbEls.size.value);
  wbEls.sizeLabel.textContent = wbEls.size.value + 'px';
  saveWbTool();
});

wbEls.clearBtn.addEventListener('click', () => {
  if (wbDrawing) return;
  wbCommit({ type: 'clear' });
  wbRedraw();
  scheduleWbSave();
});

// Drawing + history
//
// The board is "base image + list of actions". Undo/redo replays the actions on top of
// the base, so history stays tiny in memory. Older actions get baked into the base.

const WB_MAX_ACTIONS = 100;

const wbBase = document.createElement('canvas');
wbBase.width = WB_W;
wbBase.height = WB_H;
const wbBaseCtx = wbBase.getContext('2d');

let wbActions = [];
let wbRedoStack = [];
let wbCurrent = null;
let wbDrawing = false;
let wbLast = null;
let wbMid = null;

function wbPoint(e) {
  const r = wbEls.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (WB_W / r.width),
    y: (e.clientY - r.top) * (WB_H / r.height)
  };
}

function wbApplyStyle(ctx, s) {
  const erasing = s.mode === 'eraser';
  ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
  const paint = erasing ? '#000000' : s.color;
  ctx.strokeStyle = paint;
  ctx.fillStyle = paint;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function wbDot(ctx, s, p) {
  wbApplyStyle(ctx, s);
  ctx.beginPath();
  ctx.arc(p.x, p.y, s.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Draws one smoothed segment towards p; pos holds the running { last, mid }
function wbSegment(ctx, s, pos, p) {
  wbApplyStyle(ctx, s);
  const mid = { x: (pos.last.x + p.x) / 2, y: (pos.last.y + p.y) / 2 };
  ctx.beginPath();
  ctx.moveTo(pos.mid.x, pos.mid.y);
  ctx.quadraticCurveTo(pos.last.x, pos.last.y, mid.x, mid.y);
  ctx.stroke();
  pos.mid = mid;
  pos.last = p;
}

// Bucket fill. Pixels are compared as they look on the white board (transparent = white), within a
// tolerance so anti-aliased edges are included. The fill is then grown 2px *underneath* the existing
// pixels, so no light halo is left around lines.
function wbFloodFill(ctx, sx, sy, hex) {
  sx = Math.floor(sx);
  sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= WB_W || sy >= WB_H) return;

  const img = ctx.getImageData(0, 0, WB_W, WB_H);
  const d = img.data;
  const T = 40;
  const fr = parseInt(hex.slice(1, 3), 16);
  const fg = parseInt(hex.slice(3, 5), 16);
  const fb = parseInt(hex.slice(5, 7), 16);

  const si = (sy * WB_W + sx) * 4;
  const sa = d[si + 3] / 255;
  const sk = 255 * (1 - sa);
  const sr = d[si] * sa + sk;
  const sg = d[si + 1] * sa + sk;
  const sb = d[si + 2] * sa + sk;

  const match = i => {
    const a = d[i + 3] / 255;
    const k = 255 * (1 - a);
    return Math.abs(d[i] * a + k - sr) <= T &&
           Math.abs(d[i + 1] * a + k - sg) <= T &&
           Math.abs(d[i + 2] * a + k - sb) <= T;
  };

  const N = WB_W * WB_H;
  let mask = new Uint8Array(N);
  const start = sy * WB_W + sx;
  const stack = [start];
  mask[start] = 1;
  while (stack.length) {
    const p = stack.pop();
    const x = p % WB_W;
    let n;
    if (x > 0 && !mask[n = p - 1] && match(n * 4)) { mask[n] = 1; stack.push(n); }
    if (x < WB_W - 1 && !mask[n = p + 1] && match(n * 4)) { mask[n] = 1; stack.push(n); }
    if (p >= WB_W && !mask[n = p - WB_W] && match(n * 4)) { mask[n] = 1; stack.push(n); }
    if (p < N - WB_W && !mask[n = p + WB_W] && match(n * 4)) { mask[n] = 1; stack.push(n); }
  }

  // Grow the region by 2px (marked 2)
  for (let iter = 0; iter < 2; iter++) {
    const next = mask.slice();
    for (let p = 0; p < N; p++) {
      if (!mask[p]) continue;
      const x = p % WB_W;
      if (x > 0 && !next[p - 1]) next[p - 1] = 2;
      if (x < WB_W - 1 && !next[p + 1]) next[p + 1] = 2;
      if (p >= WB_W && !next[p - WB_W]) next[p - WB_W] = 2;
      if (p < N - WB_W && !next[p + WB_W]) next[p + WB_W] = 2;
    }
    mask = next;
  }

  for (let p = 0; p < N; p++) {
    const m = mask[p];
    if (!m) continue;
    const i = p * 4;
    if (m === 1) {
      d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
    } else {
      // existing pixel composited over the fill colour
      const a = d[i + 3] / 255;
      d[i] = d[i] * a + fr * (1 - a);
      d[i + 1] = d[i + 1] * a + fg * (1 - a);
      d[i + 2] = d[i + 2] * a + fb * (1 - a);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// The smoothing leaves the stroke half a step short of the pointer; this closes that gap
function wbFinishStroke(ctx, s, pos) {
  wbApplyStyle(ctx, s);
  ctx.beginPath();
  ctx.moveTo(pos.mid.x, pos.mid.y);
  ctx.lineTo(pos.last.x, pos.last.y);
  ctx.stroke();
}

function wbReplay(ctx, action) {
  if (action.type === 'fill') {
    wbFloodFill(ctx, action.x, action.y, action.color);
    return;
  }
  if (action.type === 'clear') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, WB_W, WB_H);
    return;
  }
  const pts = action.pts;
  wbDot(ctx, action, pts[0]);
  const pos = { last: pts[0], mid: pts[0] };
  for (let i = 1; i < pts.length; i++) wbSegment(ctx, action, pos, pts[i]);
  if (pts.length > 1) wbFinishStroke(ctx, action, pos);
  ctx.globalCompositeOperation = 'source-over';
}

function wbRedraw() {
  wbCtx.globalCompositeOperation = 'source-over';
  wbCtx.clearRect(0, 0, WB_W, WB_H);
  wbCtx.drawImage(wbBase, 0, 0);
  wbActions.forEach(a => wbReplay(wbCtx, a));
  updateWbHistoryButtons();
}

function updateWbHistoryButtons() {
  wbEls.undoBtn.disabled = wbActions.length === 0;
  wbEls.redoBtn.disabled = wbRedoStack.length === 0;
}

function wbCommit(action) {
  wbActions.push(action);
  wbRedoStack = [];
  if (wbActions.length > WB_MAX_ACTIONS) {
    wbReplay(wbBaseCtx, wbActions.shift());
  }
  updateWbHistoryButtons();
}

function wbResetHistory() {
  wbActions = [];
  wbRedoStack = [];
  wbCurrent = null;
  wbDrawing = false;
  updateWbHistoryButtons();
}

function wbUndo() {
  if (wbDrawing || wbActions.length === 0) return;
  wbRedoStack.push(wbActions.pop());
  wbRedraw();
  scheduleWbSave();
}

function wbRedo() {
  if (wbDrawing || wbRedoStack.length === 0) return;
  wbActions.push(wbRedoStack.pop());
  wbRedraw();
  scheduleWbSave();
}

wbEls.undoBtn.addEventListener('click', wbUndo);
wbEls.redoBtn.addEventListener('click', wbRedo);

document.addEventListener('keydown', e => {
  if (wbEls.editorView.hidden || wbEls.editorView.offsetParent === null) return;
  if (!(e.ctrlKey || e.metaKey)) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    wbUndo();
  } else if (key === 'z' && e.shiftKey) {
    e.preventDefault();
    wbRedo();
  }
});

// Panning (Space + drag, or middle mouse button) and zoom

let wbSpace = false;
let wbPan = null;

function wbEditorVisible() {
  return !wbEls.editorView.hidden && wbEls.editorView.offsetParent !== null;
}

document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || !wbEditorVisible()) return;
  e.preventDefault();
  if (!wbSpace) {
    wbSpace = true;
    wbEls.viewport.classList.add('panning');
    updateWbCursor();
  }
});

function wbStopSpace() {
  if (!wbSpace) return;
  wbSpace = false;
  wbEls.viewport.classList.remove('panning');
  updateWbCursor();
}

document.addEventListener('keyup', e => { if (e.code === 'Space') wbStopSpace(); });
window.addEventListener('blur', wbStopSpace);

// The board frame stays a fixed size; zoom + pan are a view transform on the canvas inside it.
// Offsets are stored as fractions of the frame size so they survive window resizes.
const wbView = { z: 1, fx: 0, fy: 0, min: 0.25, max: 4 };

const wbZoomToSlider = z => 1000 * Math.log(z / wbView.min) / Math.log(wbView.max / wbView.min);
const wbSliderToZoom = s => wbView.min * Math.pow(wbView.max / wbView.min, s / 1000);

function wbApplyView() {
  const vw = wbEls.viewport.clientWidth;
  const vh = wbEls.viewport.clientHeight;
  if (!vw || !vh) return;

  const z = wbView.z;
  const cw = vw * z;
  const ch = vh * z;
  let x = wbView.fx * vw;
  let y = wbView.fy * vh;
  x = cw <= vw ? (vw - cw) / 2 : Math.min(0, Math.max(vw - cw, x));
  y = ch <= vh ? (vh - ch) / 2 : Math.min(0, Math.max(vh - ch, y));
  wbView.fx = x / vw;
  wbView.fy = y / vh;

  wbEls.canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
  wbEls.zoomLabel.textContent = Math.round(z * 100) + '%';
  wbEls.zoomSlider.value = Math.round(wbZoomToSlider(z));
  updateWbCursor();
}

// Sets the zoom while keeping the board point under (ax, ay) (screen coords) in place
function wbSetZoom(z, ax, ay) {
  z = Math.min(wbView.max, Math.max(wbView.min, z));
  const vr = wbEls.viewport.getBoundingClientRect();
  if (!vr.width || !vr.height) return;
  const px = ax - vr.left;
  const py = ay - vr.top;
  const bx = (px - wbView.fx * vr.width) / wbView.z;
  const by = (py - wbView.fy * vr.height) / wbView.z;
  wbView.z = z;
  wbView.fx = (px - bx * z) / vr.width;
  wbView.fy = (py - by * z) / vr.height;
  wbApplyView();
}

function wbViewCenter() {
  const vr = wbEls.viewport.getBoundingClientRect();
  return { x: vr.left + vr.width / 2, y: vr.top + vr.height / 2 };
}

function wbResetZoom() {
  wbView.z = 1;
  wbView.fx = wbView.fy = 0;
  wbEls.canvas.style.transform = '';
  wbEls.zoomLabel.textContent = '100%';
  wbEls.zoomSlider.value = 500;
}

wbEls.zoomSlider.addEventListener('input', () => {
  let z = wbSliderToZoom(Number(wbEls.zoomSlider.value));
  if (Math.abs(z - 1) < 0.04) z = 1; // snap to 100%
  const c = wbViewCenter();
  wbSetZoom(z, c.x, c.y);
});

wbEls.zoomLabel.addEventListener('click', () => {
  const c = wbViewCenter();
  wbSetZoom(1, c.x, c.y);
});

window.addEventListener('resize', wbApplyView);

wbEls.viewport.addEventListener('wheel', e => {
  // Ctrl/Cmd + wheel (also trackpad pinch) zooms towards the pointer
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    wbSetZoom(wbView.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
    return;
  }
  // While zoomed in, plain wheel / two-finger scroll pans the board
  if (wbView.z > 1.001) {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : 1;
    let dx = e.deltaX * k;
    let dy = e.deltaY * k;
    if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    wbView.fx -= dx / wbEls.viewport.clientWidth;
    wbView.fy -= dy / wbEls.viewport.clientHeight;
    wbApplyView();
  }
}, { passive: false });

wbEls.viewport.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
wbEls.viewport.addEventListener('pointerdown', e => {
  const middle = e.pointerType === 'mouse' && e.button === 1;
  if ((wbSpace && e.button === 0) || middle) {
    e.preventDefault();
    wbEls.viewport.setPointerCapture(e.pointerId);
    wbPan = { x: e.clientX, y: e.clientY, fx: wbView.fx, fy: wbView.fy };
    wbEls.viewport.classList.add('panning', 'panning-active');
    updateWbCursor();
    return;
  }
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  e.preventDefault();
  if (wbTool.mode === 'bucket') {
    const p = wbPoint(e);
    if (p.x < 0 || p.y < 0 || p.x >= WB_W || p.y >= WB_H) return;
    const action = { type: 'fill', x: Math.floor(p.x), y: Math.floor(p.y), color: wbTool.color };
    wbReplay(wbCtx, action);
    wbCommit(action);
    scheduleWbSave();
    return;
  }
  wbEls.viewport.setPointerCapture(e.pointerId);
  wbDrawing = true;
  const p = wbPoint(e);
  wbCurrent = {
    type: 'stroke',
    mode: wbTool.mode,
    color: wbTool.color,
    size: wbTool.sizes[wbTool.mode],
    pts: [p]
  };
  wbLast = wbMid = p;
  wbDot(wbCtx, wbCurrent, p);
});

wbEls.viewport.addEventListener('pointermove', e => {
  if (wbPan) {
    wbView.fx = wbPan.fx + (e.clientX - wbPan.x) / wbEls.viewport.clientWidth;
    wbView.fy = wbPan.fy + (e.clientY - wbPan.y) / wbEls.viewport.clientHeight;
    wbApplyView();
    return;
  }
  if (!wbDrawing) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  const pos = { last: wbLast, mid: wbMid };
  (events.length ? events : [e]).forEach(ev => {
    const p = wbPoint(ev);
    wbCurrent.pts.push(p);
    wbSegment(wbCtx, wbCurrent, pos, p);
  });
  wbLast = pos.last;
  wbMid = pos.mid;
});

function endWbStroke() {
  if (wbPan) {
    wbPan = null;
    wbEls.viewport.classList.remove('panning-active');
    if (!wbSpace) wbEls.viewport.classList.remove('panning');
    updateWbCursor();
    return;
  }
  if (!wbDrawing) return;
  wbDrawing = false;
  if (wbCurrent.pts.length > 1) wbFinishStroke(wbCtx, wbCurrent, { last: wbLast, mid: wbMid });
  wbCtx.globalCompositeOperation = 'source-over';
  wbCommit(wbCurrent);
  wbCurrent = null;
  scheduleWbSave();
}

wbEls.viewport.addEventListener('pointerup', endWbStroke);
wbEls.viewport.addEventListener('pointercancel', endWbStroke);

// Brush-size cursor ring (scaled from board pixels to on-screen pixels)

const wbCursor = document.createElement('div');
wbCursor.className = 'wb-cursor';
document.body.appendChild(wbCursor);
let wbCursorPos = null;

function updateWbCursor() {
  if (!wbCursorPos || wbSpace || wbPan) {
    wbCursor.style.display = 'none';
    return;
  }
  const rect = wbEls.canvas.getBoundingClientRect();
  const bucket = wbTool.mode === 'bucket';
  // The bucket gets a small fixed marker (ring + centre dot) showing the exact fill point
  const d = bucket ? 18 : Math.max(2, wbTool.sizes[wbTool.mode] * (rect.width / WB_W));
  wbCursor.classList.toggle('wb-cursor-fill', bucket);
  wbCursor.style.display = 'block';
  wbCursor.style.width = wbCursor.style.height = d + 'px';
  wbCursor.style.left = (wbCursorPos.x - d / 2) + 'px';
  wbCursor.style.top = (wbCursorPos.y - d / 2) + 'px';
}

function trackWbCursor(e) {
  if (e.pointerType === 'touch') {
    wbCursorPos = null;
  } else {
    wbCursorPos = { x: e.clientX, y: e.clientY };
  }
  updateWbCursor();
}

wbEls.viewport.addEventListener('pointerenter', trackWbCursor);
wbEls.viewport.addEventListener('pointermove', trackWbCursor);
wbEls.viewport.addEventListener('pointerleave', () => {
  wbCursorPos = null;
  updateWbCursor();
});
wbEls.size.addEventListener('input', updateWbCursor);
wbEls.penBtn.addEventListener('click', updateWbCursor);
wbEls.eraserBtn.addEventListener('click', updateWbCursor);

// Views

function showWhiteboardView(editing) {
  wbEls.listView.hidden = editing;
  wbEls.editorView.hidden = !editing;
}

function openWhiteboard(title) {
  const doc = wbDocs.find(d => d.title === title);
  if (!doc) return;
  wbOpenTitle = title;
  wbDirty = false;
  wbEls.title.textContent = title;
  wbEls.status.textContent = 'Saved';
  wbResetZoom();
  wbResetHistory();
  wbBaseCtx.clearRect(0, 0, WB_W, WB_H);
  wbRedraw();

  const token = ++wbLoadToken;
  if (doc.content) {
    const img = new Image();
    img.onload = () => {
      if (token !== wbLoadToken) return;
      wbBaseCtx.drawImage(img, 0, 0, WB_W, WB_H);
      wbRedraw();
    };
    img.src = doc.content;
  }
  if (doc.tool) {
    wbTool.mode = doc.tool.mode;
    wbTool.color = doc.tool.color;
    wbTool.sizes = { ...doc.tool.sizes };
  }
  applyWbTool();
  showWhiteboardView(true);
}

function closeWhiteboard() {
  flushWhiteboard();
  wbOpenTitle = null;
  wbLoadToken++;
  wbResetHistory();
  showWhiteboardView(false);
  renderWhiteboard();
}

// Renders a stored board onto an opaque white background and returns a PNG blob
function wbToPngBlob(doc) {
  return new Promise(resolve => {
    const c = document.createElement('canvas');
    c.width = WB_W;
    c.height = WB_H;
    const x = c.getContext('2d');
    x.fillStyle = '#FFFFFF';
    x.fillRect(0, 0, WB_W, WB_H);
    const finish = () => c.toBlob(resolve, 'image/png');
    if (!doc.content) return finish();
    const img = new Image();
    img.onload = () => { x.drawImage(img, 0, 0, WB_W, WB_H); finish(); };
    img.onerror = finish;
    img.src = doc.content;
  });
}

function renderWhiteboard() {
  wbEls.list.innerHTML = '';
  if (wbDocs.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No boards yet.';
    empty.style.opacity = '0.6';
    wbEls.list.appendChild(empty);
    return;
  }

  wbDocs.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'item doc-item';

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = doc.title;
    link.addEventListener('click', e => {
      e.preventDefault();
      openWhiteboard(doc.title);
    });

    const dl = document.createElement('button');
    dl.className = 'link-btn';
    dl.textContent = '[Download]';
    dl.addEventListener('click', async () => {
      const name = doc.title.replace(/[\\/:*?"<>|]+/g, '_');
      downloadFile(await wbToPngBlob(doc), name + '.png', 'image/png');
    });

    const del = document.createElement('button');
    del.className = 'link-btn';
    del.textContent = '[Delete]';
    del.addEventListener('click', () => {
      if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
      wbDocs = wbDocs.filter(d => d !== doc);
      saveWhiteboard();
      renderWhiteboard();
    });

    row.append(link, dl, del);
    wbEls.list.appendChild(row);
  });
}

function addWhiteboard() {
  const title = wbEls.input.value.trim();
  if (!title) return;
  if (wbDocs.some(d => d.title.toLowerCase() === title.toLowerCase())) {
    alert(`A board named "${title}" already exists.`);
    return;
  }
  wbDocs.push({ title, content: '' });
  wbEls.input.value = '';
  saveWhiteboard();
  renderWhiteboard();
}

wbEls.addBtn.addEventListener('click', addWhiteboard);
wbEls.input.addEventListener('keydown', e => {
  if (e.key === 'Enter') addWhiteboard();
});
wbEls.back.addEventListener('click', e => {
  e.preventDefault();
  closeWhiteboard();
});

window.addEventListener('pagehide', flushWhiteboard);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushWhiteboard();
});

// Data options

document.getElementById('whiteboardDownloadBtn').addEventListener('click', () => {
  flushWhiteboard();
  downloadJson(wbDocs, 'whiteboard-data.json');
});

function cleanWhiteboard(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter(d => d && typeof d.title === 'string' && d.title.trim())
    .map(d => wbCleanDoc({ ...d, title: d.title.trim() }));
}

// Fits an uploaded image onto a board-sized canvas (never upscaled) and returns it as a PNG data URL
function wbImportImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = WB_W;
      c.height = WB_H;
      const s = Math.min(1, WB_W / img.width, WB_H / img.height);
      const w = img.width * s;
      const h = img.height * s;
      c.getContext('2d').drawImage(img, (WB_W - w) / 2, (WB_H - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}

// .png files are single boards (title = file name); .json files are full Whiteboard backups
document.getElementById('whiteboardUploadBtn').addEventListener('click', () => {
  pickFiles('.png,.json,image/png,application/json', true, async files => {
    const incoming = [];
    let skippedFiles = 0;

    for (const file of files) {
      try {
        if (/\.json$/i.test(file.name)) {
          const docs = cleanWhiteboard(JSON.parse(await file.text()));
          if (docs.length === 0) skippedFiles++;
          incoming.push(...docs);
        } else if (/\.png$/i.test(file.name)) {
          const title = file.name.replace(/\.png$/i, '').trim();
          if (title) incoming.push({ title, content: await wbImportImage(file) });
          else skippedFiles++;
        } else {
          skippedFiles++;
        }
      } catch (err) {
        skippedFiles++;
      }
    }

    if (incoming.length === 0) {
      alert("Nothing to import: the selected file(s) don't contain any Whiteboard boards.");
      return;
    }
    flushWhiteboard();
    const { merged, stats } = mergeNotepad(wbDocs, incoming);
    wbDocs = merged;
    if (!saveWhiteboard()) alert('Could not save everything (browser storage may be full).');
    renderWhiteboard();

    const parts = [];
    if (stats.added) parts.push(`${stats.added} added`);
    if (stats.copies) parts.push(`${stats.copies} added as a copy (the title already existed with a different drawing)`);
    if (stats.skipped) parts.push(`${stats.skipped} already in your list`);
    if (skippedFiles) parts.push(`${skippedFiles} file(s) skipped (unsupported or unreadable)`);
    alert('Whiteboard: ' + parts.join(', ') + '.');
  });
});

document.getElementById('whiteboardClearBtn').addEventListener('click', () => {
  if (!confirm('This will delete all of your Whiteboard data. Continue?')) return;
  clearTimeout(wbSaveTimer);
  clearTimeout(wbMaxWaitTimer);
  wbSaveTimer = wbMaxWaitTimer = null;
  wbDirty = false;
  wbOpenTitle = null;
  wbLoadToken++;
  wbResetHistory();
  store.remove(STORAGE_KEYS.whiteboard);
  wbDocs = [];
  showWhiteboardView(false);
  renderWhiteboard();
});

renderWhiteboard();

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

// Encryptor / Decryptor

(function () {
  const SYM_START = 33;   // "!"
  const SYM_BASE = 94;    // "!" through "~" (no spaces)
  const SEED_LEN = 32;

  // Randomness

  function randBytes(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }

  function randInt(n) {
    const a = new Uint32Array(1);
    const limit = Math.floor(4294967296 / n) * n;
    do { crypto.getRandomValues(a); } while (a[0] >= limit);
    return a[0] % n;
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const ROUNDS = 8;

  function rotl32(v, k) {
    return ((v << k) | (v >>> (32 - k))) >>> 0;
  }

  function chachaBlock(inp) {
    const x = Uint32Array.from(inp);
    const qr = (a, b, c, d) => {
      x[a] = x[a] + x[b]; x[d] = rotl32(x[d] ^ x[a], 16);
      x[c] = x[c] + x[d]; x[b] = rotl32(x[b] ^ x[c], 12);
      x[a] = x[a] + x[b]; x[d] = rotl32(x[d] ^ x[a], 8);
      x[c] = x[c] + x[d]; x[b] = rotl32(x[b] ^ x[c], 7);
    };
    for (let i = 0; i < 10; i++) {
      qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15);
      qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14);
    }
    for (let i = 0; i < 16; i++) x[i] = x[i] + inp[i];
    return x;
  }

  // Hashes `data` down and stretches it back out to `outLen` bytes.
  function roundFn(keyWords, round, data, outLen) {
    const st = new Uint32Array(16);
    st.set([0x61707865, 0x3320646e, 0x79622d32, 0x6b206574, round + 1, data.length, outLen, 0]);
    st.set(keyWords, 8);

    const block = new Uint8Array(32);
    const blockView = new DataView(block.buffer);
    for (let i = 0; i < data.length; i += 32) {
      block.fill(0);
      block.set(data.subarray(i, Math.min(i + 32, data.length)));
      for (let j = 0; j < 8; j++) st[j] ^= blockView.getUint32(j * 4, true);
      st.set(chachaBlock(st));
    }

    const out = new Uint8Array(outLen);
    const tmp = new Uint32Array(16);
    const buf = new Uint8Array(64);
    const bufView = new DataView(buf.buffer);
    for (let off = 0, ctr = 1; off < outLen; off += 64, ctr++) {
      tmp.set(st);
      tmp[12] ^= ctr;
      const blk = chachaBlock(tmp);
      for (let j = 0; j < 16; j++) bufView.setUint32(j * 4, blk[j], true);
      out.set(buf.subarray(0, Math.min(64, outLen - off)), off);
    }
    return out;
  }

  function wideCipher(seed, input, inverse) {
    const seedView = new DataView(seed.buffer, seed.byteOffset, SEED_LEN);
    const keyWords = new Uint32Array(8);
    for (let i = 0; i < 8; i++) keyWords[i] = seedView.getUint32(i * 4, true);

    const h = input.length >> 1;
    const left = input.slice(0, h);
    const right = input.slice(h);
    const order = [];
    for (let r = 0; r < ROUNDS; r++) order.push(r);
    if (inverse) order.reverse();

    for (const r of order) {
      const [target, source] = r % 2 === 0 ? [left, right] : [right, left];
      const f = roundFn(keyWords, r, source, target.length);
      for (let i = 0; i < target.length; i++) target[i] ^= f[i];
    }

    const out = new Uint8Array(input.length);
    out.set(left);
    out.set(right, h);
    return out;
  }

  // Bytes <-> symbols (base 94, 3 bytes become 4 symbols)

  function toSymbols(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const r = Math.min(3, bytes.length - i);
      let v = 0;
      for (let j = 0; j < r; j++) v = v * 256 + bytes[i + j];
      let chunk = '';
      for (let d = 0; d <= r; d++) {
        chunk = String.fromCharCode(SYM_START + (v % SYM_BASE)) + chunk;
        v = Math.floor(v / SYM_BASE);
      }
      out += chunk;
    }
    return out;
  }

  function fromSymbols(text) {
    const str = text.replace(/\s+/g, '');
    const out = [];
    for (let i = 0; i < str.length; i += 4) {
      const s = Math.min(4, str.length - i);
      if (s < 2) break;
      let v = 0;
      for (let j = 0; j < s; j++) {
        const d = (((str.charCodeAt(i + j) - SYM_START) % SYM_BASE) + SYM_BASE) % SYM_BASE;
        v = v * SYM_BASE + d;
      }
      const r = s - 1;
      v = v % Math.pow(256, r);
      const chunk = [];
      for (let j = 0; j < r; j++) { chunk.unshift(v % 256); v = Math.floor(v / 256); }
      out.push(...chunk);
    }
    return Uint8Array.from(out);
  }

  // Core

  // The buffer is sized so that the random filler hidden in the messages outweighs everything
  // the key files could be compared on (so they can't be used against each other), and it gets
  // a large random extra on top so its size says almost nothing about the message length.
  const MIN_BUFFER = 1024;
  const MAX_EXTRA = 1024;
  const SLACK = 32;

  function encrypt(messages) {
    const enc = new TextEncoder();
    const bytes = messages.map(m => enc.encode(m));
    const longest = Math.max(...bytes.map(b => b.length));

    const n = Math.max(MIN_BUFFER, messages.length * (longest + 2) + SLACK) + randInt(MAX_EXTRA + 1);
    const cipher = randBytes(n);

    const keys = bytes.map((msg, index) => {
      const plain = randBytes(n);
      plain[0] = msg.length >> 8;
      plain[1] = msg.length & 255;
      plain.set(msg, 2);

      const seed = randBytes(SEED_LEN);
      const y = wideCipher(seed, plain, false);

      const key = new Uint8Array(SEED_LEN + n);
      key.set(seed);
      for (let k = 0; k < n; k++) key[SEED_LEN + k] = cipher[k] ^ y[k];
      return { text: toSymbols(key), real: index === 0 };
    });

    return { cipher: toSymbols(cipher), keys: shuffleInPlace(keys) };
  }

  function decrypt(keyText, cipherText) {
    const kb = fromSymbols(keyText);
    const cb = fromSymbols(cipherText);
    const n = kb.length - SEED_LEN;
    if (n < 2) return '';

    const y = new Uint8Array(n);
    for (let k = 0; k < n; k++) y[k] = (cb[k] || 0) ^ kb[SEED_LEN + k];

    const plain = wideCipher(kb.slice(0, SEED_LEN), y, true);
    const len = Math.min((plain[0] << 8) | plain[1], n - 2);
    return new TextDecoder().decode(plain.subarray(2, 2 + len));
  }

  // Random sentence file names

  const WORDS = {
    name: ['timothy', 'sarah', 'john', 'maria', 'oscar', 'lena', 'victor', 'nina', 'felix', 'clara', 'henry', 'ivy', 'marcus', 'elena', 'paul', 'rosa', 'daniel', 'alice', 'george', 'helen', 'bruno', 'tina', 'leo', 'vera', 'sam', 'joan', 'ethan', 'molly', 'arthur', 'zoe'],
    verb: ['wrote', 'found', 'lost', 'painted', 'borrowed', 'fixed', 'forgot', 'bought', 'sold', 'built', 'baked', 'opened', 'moved', 'cleaned', 'ordered', 'carried', 'sent', 'kept', 'finished', 'ruined'],
    noun: ['book', 'letter', 'bike', 'lamp', 'recipe', 'ticket', 'clock', 'map', 'photo', 'song', 'chair', 'sandwich', 'umbrella', 'jacket', 'puzzle', 'guitar', 'garden', 'poster', 'bottle', 'notebook'],
    plural: ['hills', 'clouds', 'birds', 'roads', 'lights', 'fields', 'doors', 'boats', 'trees', 'stars', 'rivers', 'windows', 'shops', 'walls', 'stones', 'streets'],
    adj: ['green', 'quiet', 'cold', 'old', 'bright', 'empty', 'heavy', 'wet', 'wide', 'soft', 'loud', 'dark', 'tall', 'slow', 'sharp', 'warm'],
    place: ['home', 'school', 'work', 'the_park', 'the_station', 'the_market', 'the_beach', 'the_office', 'the_library', 'the_shop', 'the_cafe', 'the_garage'],
    day: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'tomorrow', 'tonight']
  };

  const TEMPLATES = [
    w => `${w('name')}_${w('verb')}_a_${w('noun')}`,
    w => `the_${w('plural')}_are_${w('adj')}`,
    w => `tomorrow_is_${w('name')}_s_bday`,
    w => `${w('name')}_${w('verb')}_the_${w('noun')}_at_${w('place')}`,
    w => `we_met_${w('name')}_at_${w('place')}`,
    w => `the_${w('noun')}_is_${w('adj')}`,
    w => `${w('name')}_and_${w('name')}_${w('verb')}_the_${w('noun')}`,
    w => `don_t_forget_the_${w('noun')}`,
    w => `${w('name')}_s_${w('noun')}_is_${w('adj')}`,
    w => `call_${w('name')}_on_${w('day')}`,
    w => `${w('adj')}_${w('plural')}_on_${w('day')}`,
    w => `meet_at_${w('place')}_on_${w('day')}`
  ];

  function randomFileNames(count) {
    const pick = kind => WORDS[kind][randInt(WORDS[kind].length)];
    const names = new Set();
    while (names.size < count) {
      names.add(TEMPLATES[randInt(TEMPLATES.length)](pick) + '.txt');
    }
    return [...names];
  }

  // Encryptor panel

  const encFields = ['encReal', 'encFake1', 'encFake2', 'encFake3', 'encFake4'].map(id => document.getElementById(id));
  const encryptBtn = document.getElementById('encryptBtn');
  const encOutput = document.getElementById('encOutput');
  const encKeyNote = document.getElementById('encKeyNote');

  function updateEncryptBtn() {
    encryptBtn.disabled = !encFields.every(f => f.value.trim());
  }

  encFields.forEach(f => f.addEventListener('input', updateEncryptBtn));

  encryptBtn.addEventListener('click', () => {
    const { cipher, keys } = encrypt(encFields.map(f => f.value));
    const names = randomFileNames(keys.length);

    encOutput.value = cipher;
    encKeyNote.textContent = '(i) The correct key is: ' + names[keys.findIndex(k => k.real)];

    keys.forEach((k, i) => {
      setTimeout(() => downloadFile(k.text, names[i], 'text/plain'), i * 400);
    });
  });

  // Decryptor panel

  const decKeyBtn = document.getElementById('decKeyBtn');
  const decKeyStatus = document.getElementById('decKeyStatus');
  const decInput = document.getElementById('decInput');
  const decryptBtn = document.getElementById('decryptBtn');
  const decOutput = document.getElementById('decOutput');

  let uploadedKey = null;

  function updateDecryptBtn() {
    decryptBtn.disabled = !(uploadedKey && decInput.value.trim());
  }

  decKeyBtn.addEventListener('click', () => pickFiles('.txt,text/plain', false, async ([file]) => {
    uploadedKey = await file.text();
    decKeyStatus.textContent = file.name;
    updateDecryptBtn();
  }));

  decInput.addEventListener('input', updateDecryptBtn);

  decryptBtn.addEventListener('click', () => {
    decOutput.value = decrypt(uploadedKey, decInput.value);
  });
})();