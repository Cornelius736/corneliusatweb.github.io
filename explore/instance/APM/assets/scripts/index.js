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

// Checklist

const STORAGE_KEY = 'checklist-items';

let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const listEl = document.getElementById('list');
const inputEl = document.getElementById('itemInput');
const addBtn = document.getElementById('addBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearDataBtn = document.getElementById('clearDataBtn');

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'checklist-data.json';
  a.click();
  URL.revokeObjectURL(url);
});

clearDataBtn.addEventListener('click', () => {
  if (!confirm('This will delete all cached data from this domain. Continue?')) return;
  localStorage.clear();
  items = [];
  render();
});

render();

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
  [state.hue, state.sat, state.val] = rgbToHsv(r, g, b);
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

const refDefaults = { rem: 16, em: 16, vw: 1920, vh: 1080, pct: 16 };

const factors = {
    length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, um: 1e-6, nm: 1e-9, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852 },
    mass: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318, ustn: 907.18474, uktn: 1016.0469088 },
    volume: { ml: 0.001, l: 1, m3: 1000, in3: 0.016387064, ft3: 28.316846592, ustsp: 0.00492892159375, ustbsp: 0.01478676478125, usfloz: 0.0295735295625, uscup: 0.2365882365, uspt: 0.473176473, usqt: 0.946352946, usgal: 3.785411784, ukfloz: 0.0284130625, ukpt: 0.56826125, ukgal: 4.54609 },
    area: { mm2: 1e-6, cm2: 0.0001, m2: 1, km2: 1000000, in2: 0.00064516, ft2: 0.09290304, yd2: 0.83612736, mi2: 2589988.110336, acre: 4046.8564224, hectare: 10000 },
    data: { bit: 0.125, B: 1, KB: 1000, MB: 1000000, GB: 1000000000, TB: 1000000000000, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776 },
    energy: { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3600000, eV: 1.602176634e-19, BTU: 1055.05585262 },
    pressure: { Pa: 1, kPa: 1000, bar: 100000, atm: 101325, psi: 6894.757293168, mmHg: 133.322387415, torr: 133.3223684210526 },
    speed: { mps: 1, kmph: 0.277777778, mph: 0.44704, knot: 0.514444444, ftps: 0.3048 },
    time: { s: 1, min: 60, h: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 },
    digital: {
        px: 1, pt: 1.3333333333333333, pc: 16, in: 96, cm: 37.795275590551185, mm: 3.7795275590551185,
        em: () => getRef("em"),
        rem: () => getRef("rem"),
        vw: () => getRef("vw") / 100,
        vh: () => getRef("vh") / 100,
        vmin: () => Math.min(getRef("vw"), getRef("vh")) / 100,
        vmax: () => Math.max(getRef("vw"), getRef("vh")) / 100,
        "%": () => getRef("pct") / 100
    }
};

const toKelvin = { c: v => v + 273.15, f: v => (v - 32) * 5 / 9 + 273.15, k: v => v };
const fromKelvin = { c: k => k - 273.15, f: k => (k - 273.15) * 9 / 5 + 32, k: k => k };

function getRef(name) {
    const input = document.querySelector(`[data-ref="${name}"]`);
    const value = parseFloat(input.value);
    return isNaN(value) ? refDefaults[name] : value;
}

function getFactor(category, unit) {
    const factor = factors[category][unit];
    return typeof factor === "function" ? factor() : factor;
}

function toBase(category, unit, value) {
    return category === "temperature" ? toKelvin[unit](value) : value * getFactor(category, unit);
}

function fromBase(category, unit, base) {
    return category === "temperature" ? fromKelvin[unit](base) : base / getFactor(category, unit);
}

const lastSource = new WeakMap();

function updateGroup(source) {
    const category = source.closest("section").dataset.category;
    const row = source.closest(".pair-row");
    const inputs = row.querySelectorAll("input");
    const value = parseFloat(source.value);

    lastSource.set(row, source);

    if (isNaN(value)) {
        inputs.forEach(input => input !== source && (input.value = ""));
        return;
    }

    const base = toBase(category, source.dataset.unit, value);
    inputs.forEach(input => {
        if (input === source) return;
        const result = fromBase(category, input.dataset.unit, base);
        input.value = Number(result.toPrecision(10));
    });
}

document.addEventListener("input", e => {
    if (e.target.matches("input[data-unit]")) {
        updateGroup(e.target);
    } else if (e.target.matches("input[data-ref]")) {
        document.querySelectorAll('section[data-category="digital"] .pair-row').forEach(row => {
            const source = lastSource.get(row);
            if (source && source.value !== "") updateGroup(source);
        });
    }
});

// Tally

let count = 0;
  const countEl = document.getElementById('count');
  document.getElementById('plus').onclick = () => { count++; countEl.textContent = count; };
  document.getElementById('minus').onclick = () => { count--; countEl.textContent = count; };
  document.getElementById('reset').onclick = () => { count = 0; countEl.textContent = count; };

// Theme

const body = document.body;
 
function setTheme(theme) {
  body.classList.remove('dark', 'darkest');
  if (theme === 'dark' || theme === 'darkest') {
    body.classList.add(theme);
  }
  localStorage.setItem('theme', theme);
}
 
document.getElementById('defaultTheme').onclick = () => setTheme('default');
document.getElementById('darkTheme').onclick = () => setTheme('dark');
document.getElementById('darkestTheme').onclick = () => setTheme('darkest');

setTheme(localStorage.getItem('theme') || 'default');