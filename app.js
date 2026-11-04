'use strict';
/* Logenplatz – persönliches Event-Tagebuch als installierbare Web-App.
   Alle Daten liegen lokal im Browser (IndexedDB). Backup über Einstellungen. */

const APP_VERSION = '1.0.1';

/* ================= Helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => iso(new Date());
const parseISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const fmtDate = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDateLong = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtDayMonth = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long' });
const fmtMonShort = new Intl.DateTimeFormat('de-AT', { month: 'short' });
const fmtMonLong = new Intl.DateTimeFormat('de-AT', { month: 'long' });
const fmtMonYear = new Intl.DateTimeFormat('de-AT', { month: 'short', year: 'numeric' });
const fmtWeekday = new Intl.DateTimeFormat('de-AT', { weekday: 'long' });
const fmtEUR = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' });
const fmtEUR0 = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat('de-AT');
const monShort = (d) => fmtMonShort.format(d).replace('.', '').toUpperCase();
const money = (v) => (v == null || isNaN(v) ? '–' : fmtEUR.format(v));
const plural = (n, one, many) => `${fmtNum.format(n)} ${n === 1 ? one : many}`;
const hashNum = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const flag = (cc) => (cc && /^[A-Za-z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))) : '');
const parseMoney = (v) => {
  const s = String(v ?? '').replace(/[€\s]/g, '').trim();
  if (!s) return null;
  const n = s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
};
const fmtMoneyInput = (v) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','));

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ================= Icons ================= */
const ICONS = {
  ticket: '<path d="M4 6h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 1 1-1z"/><path d="M15 6v2M15 11v2M15 16v2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M21 16l-5-5-9 8"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  bars: '<path d="M3 20.5h18"/><path d="M6.5 17v-5M12 17V5.5M17.5 17v-8"/>',
  pin: '<path d="M12 21s-6.5-5.8-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
  seat: '<path d="M7 12V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6"/><path d="M5 12h14v3H5zM7 15v5M17 15v5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M21 20a6 6 0 0 0-3.8-5.6"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 20h14"/>',
  share: '<path d="M12 15V3.5M8 7.5l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  note: '<path d="M9 18V5.5l11-2.2V16"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="17.5" cy="16" r="2.6"/>',
  mask: '<path d="M4.5 4.5h15v6.5a7.5 7.5 0 0 1-15 0z"/><path d="M8.5 9h1.5M14 9h1.5M9 13.5a4 4 0 0 0 6 0"/>',
  curtain: '<path d="M3 4h18M4.5 4v16M19.5 4v16M4.5 4c.5 6 3 9.5 6 10.5M19.5 4c-.5 6-3 9.5-6 10.5M3 20h18"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.5 4.5H9.7l-1.5-4.5z"/><path d="M12 7.5V3.2M15.8 10.3l4.4-1.4M14.3 14.8l2.6 3.9M9.7 14.8l-2.6 3.9M8.2 10.3L3.8 8.9"/>',
  tent: '<path d="M2.5 20L12 4l9.5 16z"/><path d="M9 20l3-5.5 3 5.5"/><path d="M12 4V1.8l3 .9-3 .9"/>',
  spark: '<path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z"/>',
};
const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ================= Kategorien ================= */
const CATS = {
  konzert: { label: 'Konzert', artist: 'Künstler:in / Band', icon: 'note' },
  musical: { label: 'Musical', artist: 'Ensemble / Produktion', icon: 'mask' },
  theater: { label: 'Theater & Kabarett', short: 'Theater', artist: 'Ensemble / Kabarettist:in', icon: 'curtain' },
  sport: { label: 'Sport', artist: 'Teams / Fahrer:innen', icon: 'ball' },
  festival: { label: 'Festival', artist: 'Headliner', icon: 'tent' },
  sonstiges: { label: 'Sonstiges', artist: 'Mitwirkende', icon: 'spark' },
};
const catKeys = Object.keys(CATS);
const catShort = (k) => CATS[k]?.short || CATS[k]?.label || 'Sonstiges';
const extraTags = (e) => e.tags.filter((t) => ![catShort(e.cat), CATS[e.cat]?.label].map((x) => String(x).toLowerCase()).includes(String(t).toLowerCase()));
const cvar = (k) => `var(--c-${CATS[k] ? k : 'sonstiges'})`;

/* ================= IndexedDB ================= */
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('logenplatz', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const s of ['events', 'venues', 'photos']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
      };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  store(name, mode = 'readonly') { return this.db.transaction(name, mode).objectStore(name); },
  all(name) { return reqP(this.store(name).getAll()); },
  keys(name) { return reqP(this.store(name).getAllKeys()); },
  get(name, id) { return reqP(this.store(name).get(id)); },
  put(name, v) { return reqP(this.store(name, 'readwrite').put(v)); },
  del(name, id) { return reqP(this.store(name, 'readwrite').delete(id)); },
  clear(name) { return reqP(this.store(name, 'readwrite').clear()); },
};

/* ================= State ================= */
const S = { events: [], venues: [], meta: {}, filter: 'alle', query: '', searchOpen: false, statsYear: 'alle', mapCat: 'alle' };
const venueById = (id) => S.venues.find((v) => v.id === id) || null;
const eventById = (id) => S.events.find((e) => e.id === id) || null;
const total = (e) => (e.price == null ? null : e.price * (e.qty || 1));
const byDateAsc = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));
const byDateDesc = (a, b) => byDateAsc(b, a);
const coverOf = (e) => (e.coverId && e.photoIds?.includes(e.coverId) ? e.coverId : e.photoIds?.[0] || null);

function normEvent(e) {
  return {
    id: e.id || 'e' + uid(),
    title: String(e.title || '').trim(),
    cat: CATS[e.cat] ? e.cat : 'sonstiges',
    artist: e.artist || '', result: e.result || '',
    date: e.date, time: e.time || '', dateEnd: e.dateEnd && e.dateEnd > e.date ? e.dateEnd : '',
    venueId: e.venueId || null,
    block: e.block || '', row: e.row || '', seat: e.seat || '', seatPos: e.seatPos || null,
    price: e.price === '' || e.price == null || isNaN(Number(e.price)) ? null : Number(e.price),
    qty: Math.max(1, parseInt(e.qty, 10) || 1),
    tags: Array.isArray(e.tags) ? e.tags : [], companions: Array.isArray(e.companions) ? e.companions : [],
    rating: Math.max(0, Math.min(5, Number(e.rating) || 0)),
    notes: e.notes || '', coverId: e.coverId || null, photoIds: Array.isArray(e.photoIds) ? e.photoIds : [],
    createdAt: e.createdAt || Date.now(), updatedAt: Date.now(),
  };
}
function normVenue(v) {
  return {
    id: v.id || 'v' + uid(), name: String(v.name || '').trim(), city: v.city || '', country: v.country || '', cc: (v.cc || '').toUpperCase(),
    lat: v.lat == null || v.lat === '' ? null : Number(v.lat), lon: v.lon == null || v.lon === '' ? null : Number(v.lon),
    planId: v.planId || null, createdAt: v.createdAt || Date.now(),
  };
}
async function loadAll() {
  S.events = await DB.all('events');
  S.venues = await DB.all('venues');
  const meta = await DB.all('meta');
  S.meta = Object.fromEntries(meta.map((m) => [m.key, m.value]));
}
async function setMeta(key, value) { S.meta[key] = value; await DB.put('meta', { key, value }); }
async function saveEvent(e) {
  const ev = normEvent(e);
  await DB.put('events', ev);
  const i = S.events.findIndex((x) => x.id === ev.id);
  if (i >= 0) S.events[i] = ev; else S.events.push(ev);
  return ev;
}
async function deleteEvent(id) {
  const ev = eventById(id);
  if (!ev) return;
  for (const p of ev.photoIds) await deletePhoto(p);
  await DB.del('events', id);
  S.events = S.events.filter((e) => e.id !== id);
}
async function saveVenue(v) {
  const ven = normVenue(v);
  await DB.put('venues', ven);
  const i = S.venues.findIndex((x) => x.id === ven.id);
  if (i >= 0) S.venues[i] = ven; else S.venues.push(ven);
  return ven;
}
async function deleteVenue(id) {
  const v = venueById(id);
  if (v?.planId) await deletePhoto(v.planId);
  await DB.del('venues', id);
  S.venues = S.venues.filter((x) => x.id !== id);
}
async function cleanupOrphans() {
  const used = new Set();
  S.events.forEach((e) => e.photoIds.forEach((p) => used.add(p)));
  S.venues.forEach((v) => v.planId && used.add(v.planId));
  for (const k of await DB.keys('photos')) if (!used.has(k)) await DB.del('photos', k);
}

/* ================= Fotos ================= */
const urlCache = new Map();
async function photoURL(id, kind = 'thumb') {
  if (!id) return null;
  const key = id + ':' + kind;
  if (urlCache.has(key)) return urlCache.get(key);
  const rec = await DB.get('photos', id);
  if (!rec) return null;
  const u = URL.createObjectURL(rec[kind] || rec.full);
  urlCache.set(key, u);
  return u;
}
function hydrate(root = document) {
  $$('img[data-photo]', root).forEach(async (img) => {
    const u = await photoURL(img.dataset.photo, img.dataset.kind || 'thumb');
    if (u) img.src = u;
  });
}
async function decodeImage(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* Fallback unten */ }
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Bild konnte nicht gelesen werden')); i.src = URL.createObjectURL(file); });
}
async function scaleTo(src, maxSide, quality) {
  const w0 = src.width, h0 = src.height;
  const s = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
  return { blob, w, h };
}
async function storePhoto(file, { maxSide = 1800, thumbSide = 640 } = {}) {
  const src = await decodeImage(file);
  const full = await scaleTo(src, maxSide, 0.86);
  const thumb = await scaleTo(src, thumbSide, 0.8);
  src.close?.();
  const id = 'p' + uid();
  await DB.put('photos', { id, full: full.blob, thumb: thumb.blob, w: full.w, h: full.h, created: Date.now() });
  return id;
}
async function storeFiles(files, opts) {
  const ids = [];
  for (const f of files) {
    try { ids.push(await storePhoto(f, opts)); } catch { toast('Ein Bild konnte nicht gelesen werden.'); }
  }
  return ids;
}
async function deletePhoto(id) {
  if (!id) return;
  await DB.del('photos', id);
  for (const k of ['thumb', 'full']) { const u = urlCache.get(id + ':' + k); if (u) { URL.revokeObjectURL(u); urlCache.delete(id + ':' + k); } }
}
function genCover(e) {
  const h = hashNum(e.id + e.title);
  return `<div class="gen" style="--c:${cvar(e.cat)};--ang:${110 + (h % 60)}deg;--ang2:${30 + (h % 120)}deg;--hx:${55 + (h % 40)}%">${ic(CATS[e.cat]?.icon || 'spark', 'gen-ic')}</div>`;
}
const fileInput = (id, { multiple = false } = {}) => `<input type="file" id="${id}" accept="image/*" ${multiple ? 'multiple' : ''} class="file-hidden">`;

/* ================= Navigation ================= */
const main = $('#view');
let currentHash = null;
let teardown = null;
const scrollMem = {};
history.scrollRestoration = 'manual';

function go(h) { history.pushState({ d: (history.state?.d || 0) + 1 }, '', '#' + h); render('push'); }
function replaceGo(h) { history.replaceState({ d: history.state?.d || 0 }, '', '#' + h); render('replace'); }
function back(fallback = 'chronik') { if ((history.state?.d || 0) > 0) history.back(); else replaceGo(fallback); }

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || a.getAttribute('href') === '#' || a.closest('.leaflet-control') || a.classList.contains('leaflet-popup-close-button')) return;
  e.preventDefault();
  const h = a.getAttribute('href').slice(1);
  if ('replace' in a.dataset) replaceGo(h); else go(h);
});
window.addEventListener('popstate', () => {
  if (overlays.length) { finishOverlay(overlays.pop()); return; }
  render('pop');
});
window.addEventListener('hashchange', () => { if (location.hash.slice(1) !== currentHash) render('push'); });

const ROUTES = [
  [/^(chronik)?$/, () => viewChronik()],
  [/^karte$/, () => viewKarte()],
  [/^statistik$/, () => viewStats()],
  [/^orte$/, () => viewOrte()],
  [/^event-([\w-]+)$/, (m) => viewEvent(m[1])],
  [/^ort-([\w-]+)$/, (m) => viewOrt(m[1])],
  [/^neu$/, () => viewForm(null)],
  [/^bearbeiten-([\w-]+)$/, (m) => viewForm(m[1])],
  [/^einstellungen$/, () => viewSettings()],
];
const tabOf = (h) => (h.startsWith('karte') ? 'karte' : h.startsWith('statistik') ? 'statistik' : h === 'orte' || h.startsWith('ort-') ? 'orte' : 'chronik');

async function render(mode = 'force') {
  const h = location.hash.slice(1);
  if (mode === 'pop' && h === currentHash) return;
  const y0 = window.scrollY;
  if (currentHash !== null && currentHash !== h) scrollMem[currentHash] = y0;
  if (typeof teardown === 'function') { try { teardown(); } catch { /* ignore */ } }
  teardown = null;
  document.body.classList.toggle('form-mode', h === 'neu' || h.startsWith('bearbeiten-'));
  const route = ROUTES.find(([re]) => re.test(h));
  const prev = currentHash;
  currentHash = h;
  if (route) await route[1](h.match(route[0])); else await viewChronik();
  $$('#tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tabOf(h)));
  if (mode === 'force' && prev === h) window.scrollTo(0, y0);
  else if (mode === 'pop') window.scrollTo(0, scrollMem[h] || 0);
  else window.scrollTo(0, 0);
}
function renderTabbar() {
  const tabs = [['chronik', 'ticket', 'Chronik'], ['karte', 'globe', 'Karte'], ['statistik', 'bars', 'Statistik'], ['orte', 'pin', 'Orte']];
  $('#tabbar').innerHTML = `<div class="tabs">${tabs.map(([k, i, l]) => `<a href="#${k}" data-tab="${k}" data-replace><span class="pillbg">${ic(i)}</span>${l}</a>`).join('')}</div>`;
}

/* ================= Overlays ================= */
const overlays = [];
function openOverlay(node, { onClose } = {}) {
  document.body.appendChild(node);
  requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('open')));
  history.pushState({ ...(history.state || {}), ov: overlays.length + 1 }, '', location.href);
  const o = { node, onClose, done: null };
  overlays.push(o);
  document.body.classList.add('no-scroll');
  return o;
}
function closeOverlay() {
  return new Promise((res) => {
    const o = overlays[overlays.length - 1];
    if (!o) return res();
    o.done = res;
    history.back();
  });
}
function finishOverlay(o) {
  o.node.classList.remove('open');
  setTimeout(() => o.node.remove(), 230);
  if (!overlays.length) document.body.classList.remove('no-scroll');
  try { o.onClose?.(); } catch { /* ignore */ }
  o.done?.();
}
function sheet(title, { full = false } = {}) {
  const node = el(`<div class="overlay ${full ? 'full' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet">${full ? '' : '<div class="grabber"></div>'}
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Schließen">${ic('x')}</button></div>
      <div class="sheet-body"></div>
    </div></div>`);
  node.addEventListener('click', (e) => { if (e.target === node || e.target.closest('[data-close]')) closeOverlay(); });
  return { node, body: $('.sheet-body', node) };
}

/* ---------- Spielstätte auswählen ---------- */
function pickVenue(currentId) {
  return new Promise((resolve) => {
    let result = null;
    const { node, body } = sheet('Spielstätte');
    const counts = venueCounts();
    const draw = (q = '') => {
      const ql = q.trim().toLowerCase();
      const list = [...S.venues]
        .filter((v) => !ql || `${v.name} ${v.city} ${v.country}`.toLowerCase().includes(ql))
        .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.name.localeCompare(b.name, 'de'));
      $('#vplist', body).innerHTML = list.length ? list.map((v) => `
        <button class="vitem ${v.id === currentId ? 'sel' : ''}" type="button" data-id="${v.id}">
          <span class="flag">${flag(v.cc)}</span>
          <span class="grow"><span class="t">${esc(v.name)}</span><br><span class="s">${esc([v.city, v.country].filter(Boolean).join(', '))}</span></span>
          ${v.id === currentId ? ic('check') : `<span class="n">${counts[v.id] || 0}×</span>`}
        </button>`).join('') : `<div class="empty"><p class="muted">Keine Spielstätte gefunden.</p></div>`;
    };
    body.innerHTML = `
      <button class="btn primary block" type="button" id="vpnew">${ic('plus')} Neue Spielstätte anlegen</button>
      <input class="input" id="vpq" type="search" placeholder="Spielstätten durchsuchen" autocomplete="off">
      <div class="vlist" id="vplist"></div>`;
    draw();
    $('#vpq', body).addEventListener('input', (e) => draw(e.target.value));
    $('#vplist', body).addEventListener('click', async (e) => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      result = venueById(b.dataset.id);
      await closeOverlay();
    });
    $('#vpnew', body).addEventListener('click', async () => {
      const v = await editVenue(null, { prefill: $('#vpq', body).value });
      if (v) { result = v; await closeOverlay(); }
    });
    openOverlay(node, { onClose: () => resolve(result) });
  });
}

/* ---------- Spielstätte bearbeiten ---------- */
async function geoSearch(q) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '6', 'accept-language': 'de' });
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  return data.map((x) => {
    const a = x.address || {};
    return {
      name: x.name || String(x.display_name).split(',')[0],
      label: x.display_name,
      lat: Number(x.lat), lon: Number(x.lon),
      city: a.city || a.town || a.village || a.municipality || a.county || '',
      country: a.country || '', cc: (a.country_code || '').toUpperCase(),
    };
  });
}
function editVenue(venue, { prefill = '' } = {}) {
  return new Promise((resolve) => {
    let result = null;
    const d = venue ? { ...venue } : normVenue({ name: prefill });
    const { node, body } = sheet(venue ? 'Spielstätte bearbeiten' : 'Neue Spielstätte');
    body.innerHTML = `
      <div class="field"><span>Ort suchen (OpenStreetMap)</span>
        <div class="row"><input class="input grow" id="vq" type="search" placeholder="z. B. Ronacher Wien" value="${esc(prefill)}" autocomplete="off">
        <button class="btn primary" type="button" id="vsearch">${ic('search')}<span>Suchen</span></button></div>
        <div id="vres" class="stack"></div>
      </div>
      <label class="field"><span>Name <b class="req">*</b></span><input id="vname" value="${esc(d.name)}" autocomplete="off"></label>
      <div class="grid2">
        <label class="field"><span>Stadt</span><input id="vcity" value="${esc(d.city)}" autocomplete="off"></label>
        <label class="field"><span>Land</span><input id="vcountry" value="${esc(d.country)}" autocomplete="off"></label>
      </div>
      <div class="field"><span>Position auf der Karte</span>
        <div class="row wrap"><span id="vpos" class="grow muted small"></span><button class="btn sm ghost" type="button" id="vmap">${ic('crosshair', 'sm')} Auf Karte wählen</button></div>
      </div>
      <div class="field"><span>Sitzplan</span><div id="vplan"></div></div>
      <p class="err" id="verr" hidden></p>
      <button class="btn primary block" type="button" id="vsave">${ic('check')} Spielstätte speichern</button>`;
    const posText = () => { $('#vpos', body).textContent = d.lat != null ? `Gesetzt: ${d.lat.toFixed(4)}, ${d.lon.toFixed(4)}` : 'Noch nicht gesetzt. Ohne Position erscheint die Spielstätte nicht auf der Weltkarte.'; };
    const planUI = () => {
      $('#vplan', body).innerHTML = d.planId
        ? `<div class="plan"><img data-photo="${d.planId}" data-kind="full" alt="Sitzplan"><div class="plan-cap"><span>Sitzplan gespeichert</span><button class="btn sm danger" type="button" id="vplanrm">${ic('trash', 'sm')} Entfernen</button></div></div>`
        : `<p class="small muted">Screenshot vom Sitzplan, z. B. aus dem Ticketshop. Danach kannst du bei jedem Event deinen Platz antippen.</p>
           <label class="btn ghost block">${ic('image')} Sitzplan-Bild wählen${fileInput('vplanfile')}</label>`;
      hydrate($('#vplan', body));
      $('#vplanrm', body)?.addEventListener('click', () => { d.planId = null; planUI(); });
      $('#vplanfile', body)?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        toast('Sitzplan wird gespeichert …');
        const [id] = await storeFiles([f], { maxSide: 2400, thumbSide: 900 });
        if (id) { d.planId = id; planUI(); }
      });
    };
    posText(); planUI();
    const doSearch = async () => {
      const q = $('#vq', body).value.trim();
      const out = $('#vres', body);
      if (!q) return;
      out.innerHTML = `<p class="small muted">Suche läuft …</p>`;
      try {
        const res = await geoSearch(q);
        out.innerHTML = res.length ? `<div class="vlist">${res.map((r, i) => `<button class="vitem" type="button" data-i="${i}"><span class="flag">${flag(r.cc)}</span><span class="grow"><span class="t">${esc(r.name)}</span><br><span class="s">${esc(r.label)}</span></span></button>`).join('')}</div>` : `<p class="small muted">Nichts gefunden. Probier Name und Stadt, z. B. „Stadthalle Wien“, oder trag den Ort unten selbst ein.</p>`;
        $$('[data-i]', out).forEach((b) => b.addEventListener('click', () => {
          const r = res[+b.dataset.i];
          Object.assign(d, { name: d.name && venue ? d.name : r.name, city: r.city, country: r.country, cc: r.cc, lat: r.lat, lon: r.lon });
          $('#vname', body).value = d.name; $('#vcity', body).value = d.city; $('#vcountry', body).value = d.country;
          out.innerHTML = ''; posText();
        }));
      } catch {
        out.innerHTML = `<p class="small err">Die Suche braucht Internet. Du kannst den Ort trotzdem unten eintragen.</p>`;
      }
    };
    $('#vsearch', body).addEventListener('click', doSearch);
    $('#vq', body).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
    $('#vmap', body).addEventListener('click', async () => {
      const p = await pickOnMap(d.lat, d.lon);
      if (p) { d.lat = p.lat; d.lon = p.lon; posText(); }
    });
    $('#vsave', body).addEventListener('click', async () => {
      d.name = $('#vname', body).value.trim(); d.city = $('#vcity', body).value.trim(); d.country = $('#vcountry', body).value.trim();
      if (!d.name) { const er = $('#verr', body); er.hidden = false; er.textContent = 'Bitte gib der Spielstätte einen Namen.'; $('#vname', body).focus(); return; }
      if (venue?.planId && venue.planId !== d.planId) await deletePhoto(venue.planId);
      result = await saveVenue(d);
      await closeOverlay();
    });
    openOverlay(node, { onClose: () => resolve(result) });
    if (prefill) setTimeout(doSearch, 50);
  });
}

/* ---------- Karte: Position wählen ---------- */
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap-Mitwirkende</a>';
let leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET_CSS; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = LEAFLET_JS;
    const timer = setTimeout(() => { leafletP = null; rej(new Error('timeout')); }, 12000);
    s.onload = () => { clearTimeout(timer); res(window.L); };
    s.onerror = () => { clearTimeout(timer); leafletP = null; s.remove(); rej(new Error('offline')); };
    document.head.appendChild(s);
  });
  return leafletP;
}
function isDark() { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
// Kartenkacheln von OpenStreetMap (ohne API-Schlüssel). Dunkles Design per CSS-Filter.
function addTiles(L, map) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: TILE_ATTR, maxZoom: 19, className: 'osm-tiles' }).addTo(map);
}

function pickOnMap(lat, lon) {
  return new Promise((resolve) => {
    let result = null, pos = lat != null ? { lat, lon } : null, map = null;
    const { node, body } = sheet('Position wählen', { full: true });
    body.innerHTML = `<p class="small muted">Tippe auf die Karte, um die Spielstätte zu markieren.</p>
      <div class="mapsmall" style="height:60vh"><div class="map" id="pmap"></div><div class="map-msg" id="pmsg">Karte wird geladen …</div></div>
      <button class="btn primary block" type="button" id="pok" ${pos ? '' : 'disabled'}>${ic('check')} Position übernehmen</button>`;
    $('#pok', body).addEventListener('click', async () => { result = pos; await closeOverlay(); });
    openOverlay(node, { onClose: () => { map?.remove(); resolve(result); } });
    loadLeaflet().then((L) => {
      $('#pmsg', body).remove();
      map = L.map($('#pmap', body), { zoomControl: true, worldCopyJump: true });
      addTiles(L, map);
      const icon = L.divIcon({ className: 'mk pick', html: '<span>●</span>', iconSize: [26, 26], iconAnchor: [13, 13] });
      let mk = pos ? L.marker([pos.lat, pos.lon], { icon }).addTo(map) : null;
      if (pos) map.setView([pos.lat, pos.lon], 15);
      else {
        const pts = S.venues.filter((v) => v.lat != null);
        if (pts.length) map.fitBounds(pts.map((v) => [v.lat, v.lon]), { padding: [30, 30], maxZoom: 12 }); else map.setView([48.2, 14.3], 6);
      }
      map.on('click', (e) => {
        pos = { lat: Math.round(e.latlng.lat * 1e5) / 1e5, lon: Math.round(L.Util.wrapNum(e.latlng.lng, [-180, 180], true) * 1e5) / 1e5 };
        if (mk) mk.setLatLng(e.latlng); else mk = L.marker(e.latlng, { icon }).addTo(map);
        $('#pok', body).disabled = false;
      });
      setTimeout(() => map.invalidateSize(), 250);
    }).catch(() => { const m = $('#pmsg', body); if (m) m.textContent = 'Die Karte braucht eine Internetverbindung.'; });
  });
}

/* ---------- Sitzplan: Platz markieren ---------- */
function pickSeat(planId, pos, { title = 'Platz markieren' } = {}) {
  return new Promise((resolve) => {
    let result; // undefined = abgebrochen, null = entfernt
    let p = pos ? { ...pos } : null, z = 1;
    const { node, body } = sheet(title, { full: true });
    body.innerHTML = `
      <p class="small muted">Tippe auf deinen Platz. Mit + und − kannst du hineinzoomen.</p>
      <div class="zoombar"><button class="icon-btn filled" type="button" id="zout" aria-label="Verkleinern">${ic('minus')}</button><span class="z" id="zl">100 %</span><button class="icon-btn filled" type="button" id="zin" aria-label="Vergrößern">${ic('plus')}</button></div>
      <div class="planview" id="pv"><div class="inner" id="pvi"><img data-photo="${planId}" data-kind="full" alt="Sitzplan" draggable="false"><i class="pin pulse" id="ppin" hidden></i></div></div>
      <div class="row"><button class="btn ghost grow" type="button" id="prm" ${p ? '' : 'disabled'}>${ic('trash', 'sm')} Markierung entfernen</button><button class="btn primary grow" type="button" id="pok" ${p ? '' : 'disabled'}>${ic('check')} Übernehmen</button></div>`;
    hydrate(body);
    const pin = $('#ppin', body), inner = $('#pvi', body), pv = $('#pv', body);
    const drawPin = () => { pin.hidden = !p; if (p) { pin.style.left = p.x * 100 + '%'; pin.style.top = p.y * 100 + '%'; } };
    const setZoom = (nz) => {
      const cx = (pv.scrollLeft + pv.clientWidth / 2) / inner.offsetWidth, cy = (pv.scrollTop + pv.clientHeight / 2) / inner.offsetHeight;
      z = Math.max(1, Math.min(4, nz)); inner.style.setProperty('--z', z); $('#zl', body).textContent = Math.round(z * 100) + ' %';
      requestAnimationFrame(() => { pv.scrollLeft = cx * inner.offsetWidth - pv.clientWidth / 2; pv.scrollTop = cy * inner.offsetHeight - pv.clientHeight / 2; });
    };
    $('#zin', body).addEventListener('click', () => setZoom(z + 0.5));
    $('#zout', body).addEventListener('click', () => setZoom(z - 0.5));
    inner.addEventListener('click', (e) => {
      const r = inner.getBoundingClientRect();
      p = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
      p.x = Math.round(p.x * 10000) / 10000; p.y = Math.round(p.y * 10000) / 10000;
      drawPin(); $('#pok', body).disabled = false; $('#prm', body).disabled = false;
    });
    $('#pok', body).addEventListener('click', async () => { result = p; await closeOverlay(); });
    $('#prm', body).addEventListener('click', async () => { result = null; await closeOverlay(); });
    drawPin();
    openOverlay(node, { onClose: () => resolve(result) });
  });
}
/* Sitzplan nur ansehen (mehrere Pins) */
function viewPlan(planId, pins, title) {
  let z = 1;
  const { node, body } = sheet(title, { full: true });
  body.innerHTML = `
    <div class="zoombar"><button class="icon-btn filled" type="button" id="zout" aria-label="Verkleinern">${ic('minus')}</button><span class="z" id="zl">100 %</span><button class="icon-btn filled" type="button" id="zin" aria-label="Vergrößern">${ic('plus')}</button></div>
    <div class="planview" id="pv" style="max-height:78vh"><div class="inner" id="pvi"><img data-photo="${planId}" data-kind="full" alt="Sitzplan">${pins.map((p) => `<i class="pin" style="left:${p.x * 100}%;top:${p.y * 100}%"><span>${esc(p.label)}</span></i>`).join('')}</div></div>`;
  hydrate(body);
  const inner = $('#pvi', body);
  const setZoom = (nz) => { z = Math.max(1, Math.min(4, nz)); inner.style.setProperty('--z', z); $('#zl', body).textContent = Math.round(z * 100) + ' %'; };
  $('#zin', body).addEventListener('click', () => setZoom(z + 0.5));
  $('#zout', body).addEventListener('click', () => setZoom(z - 0.5));
  openOverlay(node);
}

/* ---------- Lightbox ---------- */
function openLightbox(ids, start, { onCover, onDelete, coverId, onClosed } = {}) {
  let i = start;
  const node = el(`<div class="lb" role="dialog" aria-modal="true" aria-label="Foto">
    <div class="lb-top"><span class="count" id="lbc"></span><button class="icon-btn" type="button" data-close aria-label="Schließen">${ic('x')}</button></div>
    <div class="lb-stage"><img id="lbi" alt="Foto"><button class="icon-btn nav l" type="button" id="lbp" aria-label="Vorheriges Foto">${ic('chevL')}</button><button class="icon-btn nav r" type="button" id="lbn" aria-label="Nächstes Foto">${ic('chevR')}</button></div>
    <div class="lb-bottom">${onCover ? `<button class="btn sm" type="button" id="lbcover">${ic('image', 'sm')} Als Titelbild</button>` : ''}${onDelete ? `<button class="btn sm danger" type="button" id="lbdel">${ic('trash', 'sm')} Löschen</button>` : ''}</div>
  </div>`);
  const show = async () => {
    const img = $('#lbi', node);
    img.src = (await photoURL(ids[i], 'full')) || '';
    $('#lbc', node).textContent = `${i + 1} / ${ids.length}${ids[i] === coverId ? ' · Titelbild' : ''}`;
    $('#lbp', node).hidden = ids.length < 2; $('#lbn', node).hidden = ids.length < 2;
    const del = $('#lbdel', node); if (del) { del.dataset.armed = ''; del.innerHTML = `${ic('trash', 'sm')} Löschen`; }
  };
  const step = (dlt) => { i = (i + dlt + ids.length) % ids.length; show(); };
  node.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeOverlay(); });
  $('#lbp', node).addEventListener('click', () => step(-1));
  $('#lbn', node).addEventListener('click', () => step(1));
  let sx = null;
  $('.lb-stage', node).addEventListener('touchstart', (e) => { if (e.touches.length === 1) sx = e.touches[0].clientX; }, { passive: true });
  $('.lb-stage', node).addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50 && ids.length > 1) step(dx < 0 ? 1 : -1); });
  $('#lbcover', node)?.addEventListener('click', async () => { coverId = ids[i]; await onCover(ids[i]); show(); toast('Titelbild geändert'); });
  $('#lbdel', node)?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.innerHTML = `${ic('trash', 'sm')} Wirklich löschen?`; return; }
    const id = ids[i];
    await onDelete(id);
    ids = ids.filter((x) => x !== id);
    if (!ids.length) { closeOverlay(); return; }
    i = Math.min(i, ids.length - 1); show();
  });
  openOverlay(node, { onClose: onClosed });
  show();
}

/* ================= Gemeinsame Bausteine ================= */
function venueCounts() { const c = {}; S.events.forEach((e) => { if (e.venueId) c[e.venueId] = (c[e.venueId] || 0) + 1; }); return c; }
const venueLine = (v) => (v ? [v.name, v.city && v.city !== v.name ? v.city : ''].filter(Boolean).join(' · ') : 'Ohne Spielstätte');
function starsRO(n) { return n ? `<span class="stars-ro" aria-label="${n} von 5 Sternen">${Array.from({ length: n }, () => ic('star')).join('')}</span>` : ''; }
function starsInput(n, id = 'stars') {
  return `<div class="stars" id="${id}" role="radiogroup" aria-label="Bewertung">${[1, 2, 3, 4, 5].map((k) => `<button type="button" class="${k <= n ? 'on' : ''}" data-v="${k}" aria-label="${k} ${k === 1 ? 'Stern' : 'Sterne'}">${ic('star')}</button>`).join('')}</div>`;
}
function bindStars(root, get, set) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const v = +b.dataset.v === get() ? 0 : +b.dataset.v;
    set(v);
    $$('[data-v]', root).forEach((x) => x.classList.toggle('on', +x.dataset.v <= v));
  });
}
function relText(e) {
  const t = todayISO();
  if (e.dateEnd && e.date <= t && t <= e.dateEnd) return 'Läuft gerade';
  const d = daysBetween(t, e.date);
  if (d === 0) return 'Heute';
  if (d === 1) return 'Morgen';
  if (d > 1) return `in ${fmtNum.format(d)} Tagen`;
  const past = -d;
  if (past === 1) return 'Gestern';
  if (past < 31) return `vor ${past} Tagen`;
  const months = Math.round(past / 30.44);
  if (months < 12) return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`;
  const years = Math.floor(past / 365.25);
  return years <= 1 ? 'vor einem Jahr' : `vor ${years} Jahren`;
}
function dateRangeText(e) {
  const a = parseISO(e.date);
  if (!e.dateEnd) return fmtDateLong.format(a);
  const b = parseISO(e.dateEnd);
  return a.getFullYear() === b.getFullYear() ? `${fmtDayMonth.format(a)} – ${fmtDate.format(b)}` : `${fmtDate.format(a)} – ${fmtDate.format(b)}`;
}
function ticketCard(e, { countdown = false } = {}) {
  const v = venueById(e.venueId), d = parseISO(e.date), cov = coverOf(e), tot = total(e);
  const end = e.dateEnd ? parseISO(e.dateEnd) : null;
  return `<a class="tk ${cov ? 'has-photo' : ''}" href="#event-${e.id}" style="--c:${cvar(e.cat)}">
    ${countdown ? `<span class="countdown">${esc(relText(e))}</span>` : ''}
    ${cov ? `<div class="tk-photo"><img data-photo="${cov}" alt="" loading="lazy"></div>` : ''}
    <div class="tk-row">
      <div class="tk-stub"><span class="d">${String(d.getDate()).padStart(2, '0')}</span><span class="m">${monShort(d)}</span><span class="y">${d.getFullYear()}</span>${end ? `<span class="range">bis ${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}.</span>` : ''}</div>
      <div class="tk-body">
        <span class="cat-label" style="--c:${cvar(e.cat)}">${esc(catShort(e.cat))}${extraTags(e)[0] ? ' · ' + esc(extraTags(e)[0]) : ''}</span>
        <h3 class="tk-title">${esc(e.title)}</h3>
        <p class="tk-venue">${esc(venueLine(v))}</p>
        <div class="tk-meta">${e.rating ? starsRO(e.rating) : ''}${tot != null ? `<span>${esc(money(tot))}</span>` : ''}${e.photoIds.length ? `<span>${ic('camera')}${e.photoIds.length}</span>` : ''}${e.seatPos || e.seat ? `<span>${ic('seat')}${esc([e.block && 'Bl. ' + e.block, e.row && 'R ' + e.row, e.seat && 'P ' + e.seat].filter(Boolean).join(' ') || 'Platz')}</span>` : ''}</div>
      </div>
    </div></a>`;
}
function matchesQuery(e, q) {
  if (!q) return true;
  const v = venueById(e.venueId);
  return [e.title, e.artist, e.notes, e.result, ...e.tags, ...e.companions, v?.name, v?.city, v?.country, catShort(e.cat)].join(' ').toLowerCase().includes(q.toLowerCase());
}
function eventNumber(e) { return [...S.events].sort(byDateAsc).findIndex((x) => x.id === e.id) + 1; }

/* ================= View: Chronik ================= */
function viewChronik() {
  const t = todayISO();
  const filtered = S.events.filter((e) => (S.filter === 'alle' || e.cat === S.filter) && matchesQuery(e, S.query));
  const upcoming = filtered.filter((e) => e.date >= t || (e.dateEnd && e.dateEnd >= t)).sort(byDateAsc);
  const past = filtered.filter((e) => !upcoming.includes(e)).sort(byDateDesc);
  const catCount = (k) => S.events.filter((e) => k === 'alle' || e.cat === k).length;
  const usedCats = catKeys.filter((k) => catCount(k) > 0);

  // Erinnerung: gleiche Woche in einem früheren Jahr
  let memory = '';
  if (!S.query && S.filter === 'alle') {
    const now = new Date(), y = now.getFullYear();
    const cands = S.events.filter((e) => e.date < t).map((e) => {
      const d = parseISO(e.date), same = new Date(y, d.getMonth(), d.getDate());
      return { e, diff: Math.round((same - new Date(y, now.getMonth(), now.getDate())) / 86400000), years: y - d.getFullYear() };
    }).filter((c) => c.years > 0 && Math.abs(c.diff) <= 7).sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
    if (cands.length) {
      const c = cands[0], v = venueById(c.e.venueId);
      memory = `<div class="pad section"><a class="memory" href="#event-${c.e.id}">
        <span class="eyebrow">${c.diff === 0 ? 'Heute' : 'Diese Woche'} vor ${c.years === 1 ? 'einem Jahr' : c.years + ' Jahren'}</span>
        <p class="t">${esc(c.e.title)}</p><p class="v">${esc(venueLine(v))} · ${esc(fmtDate.format(parseISO(c.e.date)))}</p></a></div>`;
    }
  }

  const years = {};
  past.forEach((e) => { const y = e.date.slice(0, 4); (years[y] ||= []).push(e); });
  const timeline = Object.keys(years).sort().reverse().map((y) => {
    const list = years[y], sum = list.reduce((s, e) => s + (total(e) || 0), 0);
    return `<div class="year-head pad"><span class="y">${y}</span><span class="s">${plural(list.length, 'Event', 'Events')}${sum ? '<br>' + esc(fmtEUR0.format(sum)) : ''}</span></div>
      <div class="list pad">${list.map((e) => ticketCard(e)).join('')}</div>`;
  }).join('');

  const welcome = !S.events.length ? `<div class="pad section"><div class="card welcome">
      <span class="eyebrow">Willkommen</span>
      <h2>Dein Logenplatz ist noch leer</h2>
      <p class="muted">Trag dein erstes Konzert, Musical, Spiel oder Festival ein. Oder lade eine Import-Datei bzw. ein Backup.</p>
      <a class="btn primary" href="#neu">${ic('plus')} Erstes Event eintragen</a>
      <label class="btn ghost">${ic('upload')} Datei importieren<input type="file" id="wimport" accept=".json,application/json" class="file-hidden"></label>
    </div></div>` : '';

  main.innerHTML = `
    <header class="topbar">
      <div class="wordmark"><span class="mark">${ic('ticket')}</span><span>Logenplatz</span></div>
      <button class="icon-btn" type="button" id="btnSearch" aria-label="Suchen">${ic('search')}</button>
      <a class="icon-btn" href="#einstellungen" aria-label="Einstellungen">${ic('sliders')}</a>
    </header>
    <div class="searchbar" id="sbar" ${S.searchOpen || S.query ? '' : 'hidden'}><input id="q" type="search" placeholder="Titel, Ort, Künstler:in, Begleitung …" value="${esc(S.query)}" autocomplete="off"></div>
    ${welcome}
    ${memory}
    ${S.events.length ? `<div class="chips" style="margin-top:8px">${['alle', ...usedCats].map((k) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${S.filter === k}" style="--c:${k === 'alle' ? 'var(--ink-3)' : cvar(k)}">${k === 'alle' ? '' : '<i class="dot"></i>'}${k === 'alle' ? 'Alle' : esc(catShort(k))} <span class="n">${catCount(k)}</span></button>`).join('')}</div>` : ''}
    ${upcoming.length ? `<div class="pad section"><div class="section-head"><h2 class="h2">Demnächst</h2><span class="eyebrow">${plural(upcoming.length, 'Event', 'Events')}</span></div><div class="list">${upcoming.map((e) => ticketCard(e, { countdown: true })).join('')}</div></div>` : ''}
    ${timeline}
    ${S.events.length && !filtered.length ? `<div class="empty"><span>${ic('search')}</span><p class="muted">Nichts gefunden für „${esc(S.query)}“.</p></div>` : ''}
    <a class="fab" href="#neu" aria-label="Neues Event eintragen">${ic('plus')}</a>`;
  hydrate(main);
  $('#btnSearch').addEventListener('click', () => {
    S.searchOpen = !S.searchOpen || !!S.query;
    $('#sbar').hidden = !S.searchOpen;
    if (S.searchOpen) $('#q').focus();
  });
  let qt;
  $('#q').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { S.query = e.target.value.trim(); S.searchOpen = true; viewChronik(); const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 220); });
  $$('[data-f]').forEach((b) => b.addEventListener('click', () => { S.filter = b.dataset.f; viewChronik(); }));
  $('#wimport')?.addEventListener('change', (e) => { const f = e.target.files?.[0]; if (f) importBackup(f); });
}

/* ================= View: Event-Detail ================= */
function viewEvent(id) {
  const e = eventById(id);
  if (!e) { main.innerHTML = `<header class="topbar"><button class="icon-btn" id="bk" aria-label="Zurück">${ic('back')}</button><h1>Nicht gefunden</h1></header><div class="empty"><p class="muted">Dieses Event gibt es nicht mehr.</p></div>`; $('#bk').onclick = () => back(); return; }
  const v = venueById(e.venueId), cov = coverOf(e), tot = total(e), nr = eventNumber(e);
  const isPast = e.date < todayISO();
  const seatBits = [['Block', e.block], ['Reihe', e.row], ['Platz', e.seat]];
  const hasSeatTxt = seatBits.some(([, x]) => x);
  main.innerHTML = `
    <div class="hero" style="--c:${cvar(e.cat)}">
      ${cov ? `<img data-photo="${cov}" data-kind="full" alt="Titelbild von ${esc(e.title)}">` : genCover(e)}
      <div class="hero-bar"><button class="icon-btn" type="button" id="bk" aria-label="Zurück">${ic('back')}</button><a class="icon-btn" href="#bearbeiten-${e.id}" aria-label="Bearbeiten">${ic('edit')}</a></div>
      ${cov ? '' : `<label class="btn sm hero-add">${ic('camera', 'sm')} Titelbild hinzufügen${fileInput('coverfile')}</label>`}
    </div>
    <div class="pad stack" style="gap:18px">
      <div class="detail-head">
        <span class="cat-label" style="--c:${cvar(e.cat)}">${esc(CATS[e.cat].label)}${extraTags(e).length ? ' · ' + esc(extraTags(e).join(' · ')) : ''}</span>
        <h1>${esc(e.title)}</h1>
        ${e.artist ? `<p class="artist">${esc(e.artist)}</p>` : ''}
        <p class="when">${esc(dateRangeText(e))}${e.time ? ` · ${esc(e.time)} Uhr` : ''}</p>
        <span class="rel">${esc(relText(e))}</span>
      </div>

      <section class="ticket" style="--c:${cvar(e.cat)}" aria-label="Ticket">
        <div class="ticket-main">
          <div class="kv"><span class="k">Spielstätte</span><span class="v">${v ? `<a href="#ort-${v.id}">${esc(v.name)}</a>` : '–'}</span>${v ? `<span class="small muted">${flag(v.cc)} ${esc([v.city, v.country].filter(Boolean).join(', '))}</span>` : ''}</div>
          ${e.result ? `<div class="kv"><span class="k">Ergebnis</span><span class="v mono">${esc(e.result)}</span></div>` : ''}
          <div class="seatgrid">${seatBits.map(([k, x]) => `<div class="kv"><span class="k">${k}</span><span class="v">${esc(x || '–')}</span></div>`).join('')}</div>
          ${e.companions.length ? `<div class="kv"><span class="k">Mit dabei</span><span class="v">${esc(e.companions.join(', '))}</span></div>` : ''}
        </div>
        <div class="ticket-stub">
          <div><div class="lbl">Preis</div><div class="big">${tot != null ? esc(fmtEUR0.format(tot)) : '–'}</div>${tot != null ? `<div class="sub">${e.qty > 1 ? `${e.qty} × ${esc(money(e.price))}` : esc(money(tot))}</div>` : ''}</div>
          <div><div class="lbl">Event Nr.</div><div class="big">${nr}</div><div class="sub">von ${S.events.length}</div></div>
        </div>
      </section>

      <section class="stack" aria-label="Sitzplan">
        <div class="section-head"><h2 class="h2">Mein Platz</h2>${v?.planId ? `<button class="btn sm ghost" type="button" id="seatedit">${ic('crosshair', 'sm')} ${e.seatPos ? 'Ändern' : 'Markieren'}</button>` : ''}</div>
        ${v?.planId ? `<button class="plan plan-btn" type="button" id="planbtn" aria-label="Sitzplan öffnen">
            <img data-photo="${v.planId}" data-kind="full" alt="Sitzplan ${esc(v.name)}">
            ${e.seatPos ? `<i class="pin pulse" style="left:${e.seatPos.x * 100}%;top:${e.seatPos.y * 100}%"></i>` : ''}
            <div class="plan-cap"><span>${e.seatPos ? (hasSeatTxt ? esc(seatBits.filter(([, x]) => x).map(([k, x]) => `${k} ${x}`).join(' · ')) : 'Dein Platz ist markiert') : 'Tippe auf „Markieren“, um deinen Platz einzuzeichnen'}</span>${ic('chevR', 'sm')}</div>
          </button>`
        : v ? `<div class="card hint-card">${ic('seat')}<div class="stack" style="gap:10px"><p>Für <b>${esc(v.name)}</b> ist noch kein Sitzplan hinterlegt. Lade einen Screenshot hoch, z. B. aus dem Ticketshop, und tippe dann auf deinen Platz.</p><label class="btn sm primary" style="align-self:flex-start">${ic('image', 'sm')} Sitzplan hochladen${fileInput('planfile')}</label></div></div>`
        : `<div class="card hint-card">${ic('pin')}<p class="muted">Wähle beim Bearbeiten eine Spielstätte, dann kannst du einen Sitzplan hinterlegen.</p></div>`}
      </section>

      <section class="stack" aria-label="Bewertung">
        <h2 class="h2">${isPast ? 'Wie war’s?' : 'Vorfreude'}</h2>
        ${starsInput(e.rating, 'dstars')}
        ${e.notes ? `<div class="card notes">${esc(e.notes)}</div>` : `<a class="card hint-card" href="#bearbeiten-${e.id}" style="text-decoration:none">${ic('edit')}<p class="muted">Halte fest, was besonders war: Zugaben, Stimmung, Anreise, wer dabei war.</p></a>`}
      </section>

      <section class="stack" aria-label="Fotos">
        <div class="section-head"><h2 class="h2">Fotos</h2><span class="eyebrow">${e.photoIds.length}</span></div>
        <div class="photos">
          <label class="ph add">${ic('camera')}<span>Fotos hinzufügen</span>${fileInput('photofile', { multiple: true })}</label>
          ${e.photoIds.map((p, i) => `<button class="ph" type="button" data-i="${i}" aria-label="Foto ${i + 1} öffnen"><img data-photo="${p}" alt="" loading="lazy">${p === cov ? '<span class="badge">Titel</span>' : ''}</button>`).join('')}
        </div>
      </section>

      <section class="stack" style="padding-top:12px">
        <div id="delwrap"><button class="btn danger block" type="button" id="del">${ic('trash')} Event löschen</button></div>
      </section>
    </div>`;
  hydrate(main);
  $('#bk').addEventListener('click', () => back('chronik'));
  const save = async (patch) => { Object.assign(e, patch); await saveEvent(e); };
  bindStars($('#dstars'), () => e.rating, (r) => save({ rating: r }));
  $('#coverfile')?.addEventListener('change', async (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    const [pid] = await storeFiles([f]);
    if (pid) { await save({ photoIds: [pid, ...e.photoIds], coverId: pid }); render('force'); }
  });
  $('#photofile').addEventListener('change', async (ev) => {
    const files = [...(ev.target.files || [])]; if (!files.length) return;
    toast(files.length > 1 ? `${files.length} Fotos werden gespeichert …` : 'Foto wird gespeichert …');
    const ids = await storeFiles(files);
    await save({ photoIds: [...e.photoIds, ...ids], coverId: e.coverId || ids[0] || null });
    render('force');
  });
  $$('.photos [data-i]').forEach((b) => b.addEventListener('click', () => {
    openLightbox([...e.photoIds], +b.dataset.i, {
      coverId: coverOf(e),
      onCover: async (pid) => { await save({ coverId: pid }); },
      onDelete: async (pid) => { await deletePhoto(pid); await save({ photoIds: e.photoIds.filter((x) => x !== pid), coverId: e.coverId === pid ? null : e.coverId }); },
      onClosed: () => { if (currentHash === 'event-' + e.id) render('force'); },
    });
  }));
  const editSeat = async () => {
    const r = await pickSeat(v.planId, e.seatPos, { title: 'Mein Platz' });
    if (r !== undefined) { await save({ seatPos: r }); render('force'); }
  };
  $('#seatedit')?.addEventListener('click', editSeat);
  $('#planbtn')?.addEventListener('click', () => (e.seatPos ? viewPlan(v.planId, [{ ...e.seatPos, label: '' }], v.name) : editSeat()));
  $('#planfile')?.addEventListener('change', async (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    toast('Sitzplan wird gespeichert …');
    const [pid] = await storeFiles([f], { maxSide: 2400, thumbSide: 900 });
    if (!pid) return;
    v.planId = pid; await saveVenue(v);
    render('force');
    const r = await pickSeat(pid, null, { title: 'Mein Platz' });
    if (r !== undefined) { await save({ seatPos: r }); render('force'); }
  });
  $('#del').addEventListener('click', () => {
    $('#delwrap').innerHTML = `<div class="card confirm-row"><span>„${esc(e.title)}“ samt Fotos löschen?</span><div class="row"><button class="btn sm ghost" type="button" id="delno">Abbrechen</button><button class="btn sm danger solid" type="button" id="delyes">Löschen</button></div></div>`;
    $('#delno').onclick = () => render('force');
    $('#delyes').onclick = async () => { await deleteEvent(e.id); toast('Event gelöscht'); back('chronik'); };
  });
}

/* ================= View: Formular ================= */
function chipField(root, arr, suggestions, placeholder) {
  const draw = () => {
    const sugg = suggestions.filter((s) => !arr.includes(s)).slice(0, 8);
    root.innerHTML = `<div class="chipinput">${arr.map((x, i) => `<span class="tag">${esc(x)}<button type="button" data-rm="${i}" aria-label="${esc(x)} entfernen">${ic('x', 'sm')}</button></span>`).join('')}<input type="text" placeholder="${esc(arr.length ? '' : placeholder)}" enterkeyhint="done" autocomplete="off"></div>
      ${sugg.length ? `<div class="sugg">${sugg.map((s) => `<button type="button" data-add="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div>` : ''}`;
    const inp = $('input', root);
    const commit = () => { const v = inp.value.replace(/,$/, '').trim(); if (v && !arr.includes(v)) { arr.push(v); draw(); $('input', root).focus(); } else inp.value = ''; };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !inp.value && arr.length) { arr.pop(); draw(); $('input', root).focus(); } });
    inp.addEventListener('input', () => { if (inp.value.endsWith(',')) commit(); });
    inp.addEventListener('blur', () => { if (inp.value.trim()) commit(); });
    $$('[data-rm]', root).forEach((b) => b.addEventListener('click', () => { arr.splice(+b.dataset.rm, 1); draw(); }));
    $$('[data-add]', root).forEach((b) => b.addEventListener('click', () => { arr.push(b.dataset.add); draw(); }));
  };
  draw();
}
function topValues(key) {
  const c = {};
  S.events.forEach((e) => e[key].forEach((x) => { c[x] = (c[x] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}
function viewForm(id) {
  const orig = id ? eventById(id) : null;
  if (id && !orig) { replaceGo('chronik'); return; }
  const F = orig ? structuredClone(orig) : normEvent({ cat: S.filter !== 'alle' ? S.filter : 'konzert', date: todayISO() });
  main.innerHTML = `
    <header class="topbar"><button class="icon-btn" type="button" id="cancel" aria-label="Abbrechen">${ic('x')}</button><h1>${orig ? 'Bearbeiten' : 'Neues Event'}</h1></header>
    <form class="form pad" id="evform" novalidate>
      <div class="cover-pick" id="coverbox"></div>
      <div class="field"><span class="flabel">Kategorie</span><div class="cat-pick" id="catpick">${catKeys.map((k) => `<button class="chip" type="button" data-cat="${k}" aria-pressed="${F.cat === k}" style="--c:${cvar(k)}"><i class="dot"></i>${esc(CATS[k].label)}</button>`).join('')}</div></div>
      <label class="field" id="f-title"><span>Titel <b class="req">*</b></span><input id="title" value="${esc(F.title)}" placeholder="z. B. Coldplay – Music of the Spheres" autocomplete="off"><span class="err" hidden>Bitte gib einen Titel ein.</span></label>
      <label class="field"><span id="artistlbl">${esc(CATS[F.cat].artist)}</span><input id="artist" value="${esc(F.artist)}" autocomplete="off"></label>
      <label class="field" id="f-result" ${F.cat === 'sport' ? '' : 'hidden'}><span>Ergebnis</span><input id="result" value="${esc(F.result)}" placeholder="z. B. 2:1" autocomplete="off"></label>
      <div class="grid2">
        <label class="field" id="f-date"><span>Datum <b class="req">*</b></span><input id="date" type="date" value="${esc(F.date)}"><span class="err" hidden>Bitte wähle ein Datum.</span></label>
        <label class="field"><span>Beginn</span><input id="time" type="time" value="${esc(F.time)}"></label>
      </div>
      <label class="toggle"><input type="checkbox" id="multi" ${F.dateEnd ? 'checked' : ''}> Mehrtägig (z. B. Festival)</label>
      <label class="field" id="f-end" ${F.dateEnd ? '' : 'hidden'}><span>Letzter Tag</span><input id="dateEnd" type="date" value="${esc(F.dateEnd)}" min="${esc(F.date)}"></label>
      <div class="field"><span class="flabel">Spielstätte</span><button class="pick-btn" type="button" id="venuebtn"></button></div>
      <div class="field"><span class="flabel">Platz</span>
        <div class="grid3">
          <label class="field"><span>Block</span><input id="block" value="${esc(F.block)}" autocomplete="off"></label>
          <label class="field"><span>Reihe</span><input id="row" value="${esc(F.row)}" autocomplete="off"></label>
          <label class="field"><span>Platz</span><input id="seat" value="${esc(F.seat)}" autocomplete="off"></label>
        </div>
        <div id="seatplanbox"></div>
      </div>
      <div class="grid2">
        <label class="field"><span>Preis pro Ticket (€)</span><input id="price" inputmode="decimal" value="${esc(fmtMoneyInput(F.price))}" placeholder="0,00" autocomplete="off"></label>
        <label class="field"><span>Anzahl Tickets</span><input id="qty" type="number" min="1" inputmode="numeric" value="${F.qty}"></label>
      </div>
      <p class="sum-line" id="sumline"></p>
      <div class="field"><span class="flabel">Genre / Tags</span><div id="tagsbox"></div></div>
      <div class="field"><span class="flabel">Mit wem warst du dort?</span><div id="compbox"></div></div>
      <div class="field"><span class="flabel">Bewertung</span>${starsInput(F.rating, 'fstars')}</div>
      <label class="field"><span>Notizen & Erinnerungen</span><textarea id="notes" placeholder="Zugaben, Stimmung, Anreise, Highlights …">${esc(F.notes)}</textarea></label>
      <div class="field"><span class="flabel">Fotos</span><div class="photos" id="photobox"></div></div>
    </form>
    <div class="form-actions"><div class="in"><button class="btn ghost" type="button" id="cancel2">Abbrechen</button><button class="btn primary" type="button" id="savebtn">${ic('check')} Speichern</button></div></div>`;

  const coverUI = () => {
    const cov = coverOf(F);
    $('#coverbox').style.setProperty('--c', cvar(F.cat));
    $('#coverbox').innerHTML = `${cov ? `<img data-photo="${cov}" data-kind="full" alt="Titelbild">` : genCover(F)}<label class="btn sm over">${ic('camera', 'sm')} ${cov ? 'Titelbild ändern' : 'Titelbild wählen'}${fileInput('fcover')}</label>`;
    hydrate($('#coverbox'));
    $('#fcover').addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const [pid] = await storeFiles([f]);
      if (pid) { F.photoIds.unshift(pid); F.coverId = pid; coverUI(); photosUI(); }
    });
  };
  const venueUI = () => {
    const v = venueById(F.venueId);
    $('#venuebtn').innerHTML = v
      ? `<span class="flag">${flag(v.cc) || ic('pin')}</span><span class="grow"><span class="t">${esc(v.name)}</span><br><span class="s">${esc([v.city, v.country].filter(Boolean).join(', '))}</span></span>${ic('chevR')}`
      : `${ic('pin')}<span class="grow"><span class="t">Spielstätte wählen</span><br><span class="s">oder neu anlegen</span></span>${ic('chevR')}`;
    seatUI();
  };
  const seatUI = () => {
    const v = venueById(F.venueId);
    const box = $('#seatplanbox');
    if (!v) { box.innerHTML = ''; return; }
    box.innerHTML = v.planId
      ? `<button class="btn ghost block" type="button" id="fseat" style="margin-top:4px">${ic('crosshair')} ${F.seatPos ? 'Platz am Sitzplan ändern' : 'Platz am Sitzplan markieren'}${F.seatPos ? ' ✓' : ''}</button>`
      : `<label class="btn ghost block" style="margin-top:4px">${ic('image')} Sitzplan für ${esc(v.name)} hochladen${fileInput('fplan')}</label>`;
    $('#fseat')?.addEventListener('click', async () => { const r = await pickSeat(v.planId, F.seatPos); if (r !== undefined) { F.seatPos = r; seatUI(); } });
    $('#fplan')?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      toast('Sitzplan wird gespeichert …');
      const [pid] = await storeFiles([f], { maxSide: 2400, thumbSide: 900 });
      if (!pid) return;
      v.planId = pid; await saveVenue(v); seatUI();
      const r = await pickSeat(pid, F.seatPos); if (r !== undefined) { F.seatPos = r; seatUI(); }
    });
  };
  const sumUI = () => { const t = total(F); $('#sumline').textContent = t != null && F.qty > 1 ? `Gesamt: ${money(t)}` : ''; };
  const photosUI = () => {
    const cov = coverOf(F);
    $('#photobox').innerHTML = `<label class="ph add">${ic('camera')}<span>Hinzufügen</span>${fileInput('fphotos', { multiple: true })}</label>` +
      F.photoIds.map((p, i) => `<button class="ph" type="button" data-i="${i}" aria-label="Foto ${i + 1}"><img data-photo="${p}" alt="">${p === cov ? '<span class="badge">Titel</span>' : ''}</button>`).join('');
    hydrate($('#photobox'));
    $('#fphotos').addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])]; if (!files.length) return;
      toast(files.length > 1 ? `${files.length} Fotos werden gespeichert …` : 'Foto wird gespeichert …');
      const ids = await storeFiles(files);
      F.photoIds.push(...ids); if (!F.coverId) F.coverId = ids[0] || null;
      photosUI(); coverUI();
    });
    $$('#photobox [data-i]').forEach((b) => b.addEventListener('click', () => openLightbox([...F.photoIds], +b.dataset.i, {
      coverId: coverOf(F),
      onCover: async (pid) => { F.coverId = pid; coverUI(); photosUI(); },
      onDelete: async (pid) => { F.photoIds = F.photoIds.filter((x) => x !== pid); if (F.coverId === pid) F.coverId = null; coverUI(); photosUI(); },
    })));
  };
  coverUI(); venueUI(); sumUI(); photosUI();
  chipField($('#tagsbox'), F.tags, topValues('tags'), 'z. B. Pop, Austropop, Fußball');
  chipField($('#compbox'), F.companions, topValues('companions'), 'Namen eingeben, mit Enter bestätigen');
  bindStars($('#fstars'), () => F.rating, (r) => { F.rating = r; });

  $('#catpick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    F.cat = b.dataset.cat;
    $$('#catpick [data-cat]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.cat === F.cat));
    $('#artistlbl').textContent = CATS[F.cat].artist;
    $('#f-result').hidden = F.cat !== 'sport';
    if (F.cat === 'festival' && !F.dateEnd) { $('#multi').checked = true; $('#f-end').hidden = false; }
    if (!coverOf(F)) coverUI();
  });
  const bindVal = (key, fn = (x) => x) => $('#' + key).addEventListener('input', (e) => { F[key] = fn(e.target.value); });
  ['title', 'artist', 'result', 'time', 'block', 'row', 'seat', 'notes', 'dateEnd'].forEach((k) => bindVal(k));
  $('#date').addEventListener('input', (e) => { F.date = e.target.value; $('#dateEnd').min = F.date; });
  $('#price').addEventListener('input', (e) => { F.price = parseMoney(e.target.value); sumUI(); });
  $('#qty').addEventListener('input', (e) => { F.qty = Math.max(1, parseInt(e.target.value, 10) || 1); sumUI(); });
  $('#multi').addEventListener('change', (e) => { $('#f-end').hidden = !e.target.checked; if (!e.target.checked) F.dateEnd = ''; });
  $('#venuebtn').addEventListener('click', async () => {
    const v = await pickVenue(F.venueId);
    if (v) { if (v.id !== F.venueId) F.seatPos = null; F.venueId = v.id; venueUI(); }
  });
  const cancel = () => back(orig ? 'event-' + orig.id : 'chronik');
  $('#cancel').addEventListener('click', cancel);
  $('#cancel2').addEventListener('click', cancel);
  $('#savebtn').addEventListener('click', async () => {
    let ok = true;
    const flagErr = (fid, bad) => { const f = $('#' + fid); f.classList.toggle('invalid', bad); $('.err', f).hidden = !bad; if (bad) ok = false; };
    flagErr('f-title', !F.title.trim());
    flagErr('f-date', !/^\d{4}-\d{2}-\d{2}$/.test(F.date || ''));
    if (!ok) { $('.invalid input')?.focus(); return; }
    if (!$('#multi').checked) F.dateEnd = '';
    const saved = await saveEvent(F);
    if (orig) {
      for (const p of orig.photoIds) if (!saved.photoIds.includes(p)) await deletePhoto(p);
      toast('Gespeichert'); back('event-' + saved.id);
    } else { toast('Event gespeichert'); replaceGo('event-' + saved.id); }
  });
}

/* ================= View: Spielstätten ================= */
function viewOrte() {
  const counts = venueCounts();
  const list = [...S.venues].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.name.localeCompare(b.name, 'de'));
  const withPlan = S.venues.filter((v) => v.planId).length;
  main.innerHTML = `
    <header class="topbar"><h1>Spielstätten</h1><button class="icon-btn filled" type="button" id="vadd" aria-label="Neue Spielstätte">${ic('plus')}</button></header>
    <div class="pad stack">
      <p class="muted small">${plural(S.venues.length, 'Spielstätte', 'Spielstätten')} · ${withPlan} mit Sitzplan</p>
      ${list.length ? `<div class="vlist">${list.map((v) => `<a class="vitem" href="#ort-${v.id}">
          <span class="flag">${flag(v.cc)}</span>
          <span class="grow"><span class="t">${esc(v.name)}</span><br><span class="s">${esc([v.city, v.country].filter(Boolean).join(', ') || 'Ort unbekannt')}</span></span>
          ${v.planId ? `<span title="Sitzplan vorhanden">${ic('seat', 'sm')}</span>` : ''}<span class="n">${counts[v.id] || 0}×</span>${ic('chevR', 'chev')}</a>`).join('')}</div>`
      : `<div class="card empty">${ic('pin')}<p class="muted">Noch keine Spielstätten. Sie entstehen automatisch, wenn du Events einträgst.</p></div>`}
    </div>`;
  $('#vadd').addEventListener('click', async () => { const v = await editVenue(null); if (v) go('ort-' + v.id); });
}
function viewOrt(id) {
  const v = venueById(id);
  if (!v) { replaceGo('orte'); return; }
  const evs = S.events.filter((e) => e.venueId === id).sort(byDateAsc);
  const sum = evs.reduce((s, e) => s + (total(e) || 0), 0);
  const seated = evs.filter((e) => e.seatPos);
  main.innerHTML = `
    <header class="topbar"><button class="icon-btn" type="button" id="bk" aria-label="Zurück">${ic('back')}</button><h1>${esc(v.name)}</h1><button class="icon-btn" type="button" id="vedit" aria-label="Bearbeiten">${ic('edit')}</button></header>
    <div class="pad stack" style="gap:18px">
      <p class="muted">${flag(v.cc)} ${esc([v.city, v.country].filter(Boolean).join(', ') || 'Ort unbekannt')}${v.lat == null ? ' · <span class="err">keine Kartenposition</span>' : ''}</p>
      <div class="mini-stats">
        <div class="kpi"><span class="k">Besuche</span><span class="v">${evs.length}</span></div>
        <div class="kpi"><span class="k">Ausgaben</span><span class="v">${esc(fmtEUR0.format(sum))}</span></div>
        <div class="kpi"><span class="k">Erstmals</span><span class="v">${evs[0] ? evs[0].date.slice(0, 4) : '–'}</span></div>
      </div>
      <section class="stack">
        <div class="section-head"><h2 class="h2">Sitzplan</h2>${v.planId ? `<span class="eyebrow">${plural(seated.length, 'Platz', 'Plätze')} markiert</span>` : ''}</div>
        ${v.planId ? `<button class="plan plan-btn" type="button" id="planbtn" aria-label="Sitzplan vergrößern"><img data-photo="${v.planId}" data-kind="full" alt="Sitzplan ${esc(v.name)}">${seated.map((e, i) => `<i class="pin" style="left:${e.seatPos.x * 100}%;top:${e.seatPos.y * 100}%"><span>${i + 1}</span></i>`).join('')}<div class="plan-cap"><span>Alle deine Plätze hier</span>${ic('chevR', 'sm')}</div></button>
            ${seated.length ? `<div class="vlist legend">${seated.map((e, i) => `<a class="vitem" href="#event-${e.id}"><span class="num">${i + 1}</span><span class="grow"><span class="t">${esc(e.title)}</span><br><span class="s">${esc(fmtDate.format(parseISO(e.date)))}${[e.block && 'Block ' + e.block, e.row && 'Reihe ' + e.row, e.seat && 'Platz ' + e.seat].filter(Boolean).map((x) => ' · ' + esc(x)).join('')}</span></span>${ic('chevR', 'chev')}</a>`).join('')}</div>` : `<p class="small muted">Öffne ein Event und tippe auf „Markieren“, um deinen Platz einzuzeichnen.</p>`}`
        : `<div class="card hint-card">${ic('seat')}<div class="stack" style="gap:10px"><p>Lade einen Screenshot vom Sitzplan hoch, z. B. aus dem Ticketshop. Danach kannst du bei jedem Event hier deinen Platz markieren.</p><label class="btn sm primary" style="align-self:flex-start">${ic('image', 'sm')} Sitzplan hochladen${fileInput('vplan2')}</label></div></div>`}
      </section>
      <section class="stack">
        <h2 class="h2">Deine Events hier</h2>
        ${evs.length ? `<div class="list">${[...evs].reverse().map((e) => ticketCard(e)).join('')}</div>` : `<p class="muted">Noch keine Events an diesem Ort.</p>`}
      </section>
      <section id="vdelwrap" style="padding-top:8px">${evs.length ? `<p class="small muted">Spielstätten mit Events können nicht gelöscht werden.</p>` : `<button class="btn danger block" type="button" id="vdel">${ic('trash')} Spielstätte löschen</button>`}</section>
    </div>`;
  hydrate(main);
  $('#bk').addEventListener('click', () => back('orte'));
  $('#vedit').addEventListener('click', async () => { const r = await editVenue(v); if (r) render('force'); });
  $('#planbtn')?.addEventListener('click', () => viewPlan(v.planId, seated.map((e, i) => ({ ...e.seatPos, label: String(i + 1) })), v.name));
  $('#vplan2')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    toast('Sitzplan wird gespeichert …');
    const [pid] = await storeFiles([f], { maxSide: 2400, thumbSide: 900 });
    if (pid) { v.planId = pid; await saveVenue(v); render('force'); }
  });
  $('#vdel')?.addEventListener('click', () => {
    $('#vdelwrap').innerHTML = `<div class="card confirm-row"><span>„${esc(v.name)}“ löschen?</span><div class="row"><button class="btn sm ghost" type="button" id="vno">Abbrechen</button><button class="btn sm danger solid" type="button" id="vyes">Löschen</button></div></div>`;
    $('#vno').onclick = () => render('force');
    $('#vyes').onclick = async () => { await deleteVenue(v.id); toast('Spielstätte gelöscht'); back('orte'); };
  });
}

/* ================= View: Weltkarte ================= */
function placeSummary(evs) {
  const countries = {}, cities = {};
  evs.forEach((e) => {
    const v = venueById(e.venueId); if (!v) return;
    const ck = v.country || 'Unbekannt';
    (countries[ck] ||= { n: 0, cc: v.cc, cities: new Set() }).n++;
    if (v.city) { countries[ck].cities.add(v.city); (cities[v.city + '|' + ck] ||= { n: 0, city: v.city, cc: v.cc }).n++; }
  });
  return { countries: Object.entries(countries).sort((a, b) => b[1].n - a[1].n), cities: Object.values(cities).sort((a, b) => b.n - a.n) };
}
async function viewKarte() {
  const evsAll = S.events.filter((e) => S.mapCat === 'alle' || e.cat === S.mapCat);
  const usedCats = catKeys.filter((k) => S.events.some((e) => e.cat === k));
  const { countries, cities } = placeSummary(evsAll);
  main.innerHTML = `
    <header class="topbar"><h1>Weltkarte</h1></header>
    <div class="chips">${['alle', ...usedCats].map((k) => `<button class="chip" type="button" data-mc="${k}" aria-pressed="${S.mapCat === k}" style="--c:${k === 'alle' ? 'var(--ink-3)' : cvar(k)}">${k === 'alle' ? 'Alle' : '<i class="dot"></i>' + esc(catShort(k))}</button>`).join('')}</div>
    <div class="mapwrap"><div class="map" id="map"></div><div class="map-msg" id="mapmsg">Karte wird geladen …</div><div class="map-sum" id="mapsum">${plural(countries.length, 'Land', 'Länder')} · ${plural(cities.length, 'Stadt', 'Städte')}</div></div>
    <div class="pad section">
      <div class="section-head"><h2 class="h2">Länder</h2><span class="eyebrow">${countries.length}</span></div>
      ${countries.length ? `<div class="vlist">${countries.map(([name, c]) => `<div class="vitem"><span class="flag">${flag(c.cc)}</span><span class="grow"><span class="t">${esc(name)}</span><br><span class="s">${esc([...c.cities].join(', '))}</span></span><span class="n">${plural(c.n, 'Event', 'Events')}</span></div>`).join('')}</div>` : `<p class="muted">Noch keine Orte mit Land.</p>`}
      <div class="section-head" style="margin-top:10px"><h2 class="h2">Städte</h2><span class="eyebrow">${cities.length}</span></div>
      ${cities.length ? `<div class="card" style="padding:4px 16px">${cities.map((c, i) => `<div class="barrow" style="--c:var(--accent)"><span class="lbl"><span class="flag">${flag(c.cc)}</span><span>${esc(c.city)}</span></span><span class="num">${c.n}</span><span class="track"><i style="width:${(c.n / cities[0].n) * 100}%"></i></span></div>`).join('')}</div>` : ''}
    </div>`;
  $$('[data-mc]').forEach((b) => b.addEventListener('click', () => { S.mapCat = b.dataset.mc; render('force'); }));
  let L;
  try { L = await loadLeaflet(); } catch { const m = $('#mapmsg'); if (m) m.textContent = 'Die Karte braucht eine Internetverbindung. Deine Länder und Städte siehst du unten.'; return; }
  const mapEl = $('#map');
  if (!mapEl || !document.body.contains(mapEl)) return;
  $('#mapmsg').remove();
  const map = L.map(mapEl, { zoomControl: false, worldCopyJump: true, minZoom: 1 });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  addTiles(L, map);
  const byVenue = {};
  evsAll.forEach((e) => { const v = venueById(e.venueId); if (v && v.lat != null) (byVenue[v.id] ||= { v, evs: [] }).evs.push(e); });
  const pts = [];
  Object.values(byVenue).forEach(({ v, evs }) => {
    const cc = {}; evs.forEach((e) => { cc[e.cat] = (cc[e.cat] || 0) + 1; });
    const domCat = Object.entries(cc).sort((a, b) => b[1] - a[1])[0][0];
    const size = Math.min(46, 28 + evs.length * 3);
    const icon = L.divIcon({ className: 'mk', html: `<span style="--c:${cvar(domCat)}">${evs.length}</span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
    const sorted = [...evs].sort(byDateDesc);
    const pop = `<div class="pop-t">${esc(v.name)}</div><div class="pop-s">${flag(v.cc)} ${esc([v.city, v.country].filter(Boolean).join(', '))}</div>
      <div class="pop-l">${sorted.slice(0, 6).map((e) => `<a href="#event-${e.id}"><span class="mono">${esc(e.date.slice(0, 4))}</span><span>${esc(e.title)}</span></a>`).join('')}${sorted.length > 6 ? `<span class="muted small">+ ${sorted.length - 6} weitere</span>` : ''}</div>
      <a class="pop-more" href="#ort-${v.id}">Spielstätte öffnen →</a>`;
    L.marker([v.lat, v.lon], { icon, title: v.name }).bindPopup(pop, { maxWidth: 260 }).addTo(map);
    pts.push([v.lat, v.lon]);
  });
  if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 12 });
  else if (pts.length === 1) map.setView(pts[0], 12);
  else map.setView([30, 10], 2);
  setTimeout(() => map.invalidateSize(), 200);
  teardown = () => map.remove();
}

/* ================= View: Statistik ================= */
function barChart(groups, keys, colorOf, valFmt, { height = 176 } = {}) {
  const W = 340, H = height, top = 18, bottom = 22;
  const n = Math.max(1, groups.length), slot = W / n, bw = Math.min(30, slot * 0.64);
  const totals = groups.map((g) => keys.reduce((s, k) => s + (g.values[k] || 0), 0));
  const max = Math.max(1, ...totals);
  const sc = (H - top - bottom) / max;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Balkendiagramm"><line class="grid" x1="0" x2="${W}" y1="${H - bottom + 0.5}" y2="${H - bottom + 0.5}"/>`;
  groups.forEach((g, i) => {
    const x = i * slot + (slot - bw) / 2;
    let y = H - bottom;
    keys.forEach((k) => {
      const v = g.values[k] || 0; if (!v) return;
      const hh = v * sc; y -= hh;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, hh - 1.2).toFixed(1)}" rx="3" style="fill:${colorOf(k)}"/>`;
    });
    if (totals[i]) s += `<text class="val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${esc(valFmt(totals[i]))}</text>`;
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(g.label)}</text>`;
  });
  return s + '</svg>';
}
const kFmt = (v) => (v >= 1000 ? (Math.round(v / 100) / 10).toString().replace('.', ',') + 'k' : String(Math.round(v)));
function viewStats() {
  const t = todayISO();
  const doneAll = S.events.filter((e) => e.date <= t);
  const years = [...new Set(doneAll.map((e) => e.date.slice(0, 4)))].sort().reverse();
  if (S.statsYear !== 'alle' && !years.includes(S.statsYear)) S.statsYear = 'alle';
  const Y = S.statsYear;
  const evs = doneAll.filter((e) => Y === 'alle' || e.date.startsWith(Y)).sort(byDateAsc);
  const upcoming = S.events.filter((e) => e.date > t);
  const priced = evs.filter((e) => e.price != null);
  const spent = priced.reduce((s, e) => s + total(e), 0);
  const { countries, cities } = placeSummary(evs);
  const usedCats = catKeys.filter((k) => evs.some((e) => e.cat === k));

  let chartEvents = '', chartMoney = '';
  if (evs.length) {
    let groups;
    if (Y === 'alle') {
      const ys = [...years].reverse();
      const span = ys.length ? Array.from({ length: +ys[ys.length - 1] - +ys[0] + 1 }, (_, i) => String(+ys[0] + i)) : [];
      groups = span.map((y) => ({ label: y, list: evs.filter((e) => e.date.startsWith(y)) }));
    } else {
      groups = Array.from({ length: 12 }, (_, m) => ({ label: fmtMonShort.format(new Date(2020, m, 1)).replace('.', '').slice(0, 3), list: evs.filter((e) => +e.date.slice(5, 7) === m + 1) }));
    }
    const cg = groups.map((g) => ({ label: g.label, values: Object.fromEntries(usedCats.map((k) => [k, g.list.filter((e) => e.cat === k).length])) }));
    const mg = groups.map((g) => ({ label: g.label, values: { m: g.list.reduce((s, e) => s + (total(e) || 0), 0) } }));
    chartEvents = barChart(cg, usedCats, (k) => cvar(k), (v) => String(v));
    chartMoney = barChart(mg, ['m'], () => 'var(--accent)', kFmt);
  }
  const countBy = (fn) => { const c = {}; evs.forEach((e) => [].concat(fn(e)).filter(Boolean).forEach((k) => { c[k] = (c[k] || 0) + 1; })); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
  const topVenues = countBy((e) => e.venueId).slice(0, 5);
  const topTags = countBy((e) => e.tags).slice(0, 6);
  const topComp = countBy((e) => e.companions).slice(0, 5);
  const catRows = usedCats.map((k) => { const l = evs.filter((e) => e.cat === k); return { k, n: l.length, sum: l.reduce((s, e) => s + (total(e) || 0), 0) }; }).sort((a, b) => b.n - a.n);
  const maxCat = Math.max(1, ...catRows.map((r) => r.n));

  // Rekorde
  const facts = [];
  if (priced.length) {
    const exp = [...priced].sort((a, b) => total(b) - total(a))[0];
    facts.push(['Teuerstes Event', exp, money(total(exp))]);
    const ch = [...priced].filter((e) => total(e) > 0).sort((a, b) => total(a) - total(b))[0];
    if (ch && ch !== exp) facts.push(['Günstigstes Event', ch, money(total(ch))]);
  }
  const rated = evs.filter((e) => e.rating);
  if (rated.length) { const best = [...rated].sort((a, b) => b.rating - a.rating || byDateDesc(a, b))[0]; facts.push(['Bestbewertet', best, '★'.repeat(best.rating)]); }
  if (evs.length) facts.push([Y === 'alle' ? 'Dein erstes Event' : `Erstes Event ${Y}`, evs[0], fmtDate.format(parseISO(evs[0].date))]);
  if (evs.length > 1) {
    let gap = { d: 0 };
    for (let i = 1; i < evs.length; i++) { const d = daysBetween(evs[i - 1].date, evs[i].date); if (d > gap.d) gap = { d, a: evs[i - 1], b: evs[i] }; }
    if (gap.d) facts.push(['Längste Pause', null, `${fmtNum.format(gap.d)} Tage`, `${fmtMonYear.format(parseISO(gap.a.date))} bis ${fmtMonYear.format(parseISO(gap.b.date))}`]);
    const wd = countBy((e) => fmtWeekday.format(parseISO(e.date)))[0];
    if (wd) facts.push(['Lieblingswochentag', null, wd[0], plural(wd[1], 'Event', 'Events')]);
    if (Y === 'alle' && years.length > 1) { const yc = countBy((e) => e.date.slice(0, 4)); const best = yc.filter(([, n]) => n === yc[0][1]).map(([y]) => y).sort(); facts.push([best.length > 1 ? 'Rekordjahre' : 'Rekordjahr', null, best.join(', '), plural(yc[0][1], 'Event', 'Events') + (best.length > 1 ? ' je Jahr' : '')]); }
    if (Y !== 'alle') { const mc = countBy((e) => fmtMonLong.format(parseISO(e.date)))[0]; facts.push(['Stärkster Monat', null, mc[0], plural(mc[1], 'Event', 'Events')]); }
  }

  main.innerHTML = `
    <header class="topbar"><h1>Statistik</h1></header>
    ${years.length ? `<div class="chips">${['alle', ...years].map((y) => `<button class="chip" type="button" data-y="${y}" aria-pressed="${Y === y}">${y === 'alle' ? 'Gesamt' : y}</button>`).join('')}</div>` : ''}
    <div class="pad">
    ${!evs.length ? `<div class="card empty" style="margin-top:16px">${ic('bars')}<p class="muted">Sobald du erlebte Events einträgst, erscheinen hier deine Zahlen.</p></div>` : `
      <div class="section">
        <div class="kpis">
          <div class="kpi"><span class="k">Events</span><span class="v">${evs.length}</span><span class="s">${plural(new Set(evs.map((e) => e.venueId).filter(Boolean)).size, 'Spielstätte', 'Spielstätten')}</span></div>
          <div class="kpi"><span class="k">Ausgegeben</span><span class="v">${esc(fmtEUR0.format(spent))}</span><span class="s">für Tickets</span></div>
          <div class="kpi"><span class="k">Ø pro Event</span><span class="v">${priced.length ? esc(fmtEUR0.format(spent / priced.length)) : '–'}</span><span class="s">${priced.length < evs.length ? `${priced.length} mit Preis` : 'alle mit Preis'}</span></div>
          <div class="kpi"><span class="k">Orte</span><span class="v">${cities.length}</span><span class="s">${plural(cities.length, 'Stadt', 'Städte')} in ${plural(countries.length, 'Land', 'Ländern')}</span></div>
        </div>
      </div>
      <div class="section"><div class="section-head"><h2 class="h2">Events pro ${Y === 'alle' ? 'Jahr' : 'Monat'}</h2></div>
        <div class="card">${chartEvents}<div class="legend-inline" style="margin-top:10px">${usedCats.map((k) => `<span style="--c:${cvar(k)}"><i></i>${esc(catShort(k))}</span>`).join('')}</div></div></div>
      <div class="section"><div class="section-head"><h2 class="h2">Ausgaben pro ${Y === 'alle' ? 'Jahr' : 'Monat'}</h2><span class="eyebrow">in Euro</span></div>
        <div class="card">${chartMoney}</div></div>
      <div class="section"><h2 class="h2">Kategorien</h2>
        <div class="card" style="padding:4px 16px">${catRows.map((r) => `<div class="barrow" style="--c:${cvar(r.k)}"><span class="lbl"><i class="dot" style="width:9px;height:9px;border-radius:50%;background:var(--c);flex:none"></i><span>${esc(CATS[r.k].label)}</span></span><span class="num">${r.n} · ${esc(fmtEUR0.format(r.sum))}</span><span class="track"><i style="width:${(r.n / maxCat) * 100}%"></i></span></div>`).join('')}</div></div>
      ${topVenues.length ? `<div class="section"><h2 class="h2">Top-Spielstätten</h2><div class="card" style="padding:4px 16px">${topVenues.map(([vid, n]) => { const v = venueById(vid); return `<a class="barrow" href="#ort-${vid}" style="--c:var(--accent)"><span class="lbl"><span class="flag">${flag(v?.cc)}</span><span>${esc(v?.name || '–')}</span></span><span class="num">${n}×</span><span class="track"><i style="width:${(n / topVenues[0][1]) * 100}%"></i></span></a>`; }).join('')}</div></div>` : ''}
      ${topTags.length ? `<div class="section"><h2 class="h2">Genres</h2><div class="row wrap">${topTags.map(([k, n]) => `<span class="tag">${esc(k)} <span class="mono muted">${n}</span></span>`).join('')}</div></div>` : ''}
      <div class="section"><h2 class="h2">Mit wem</h2>${topComp.length ? `<div class="card" style="padding:4px 16px">${topComp.map(([k, n]) => `<div class="barrow" style="--c:var(--c-theater)"><span class="lbl"><span>${esc(k)}</span></span><span class="num">${n}×</span><span class="track"><i style="width:${(n / topComp[0][1]) * 100}%"></i></span></div>`).join('')}</div>` : `<p class="muted small">Trag bei deinen Events unter „Mit wem warst du dort?“ deine Begleitung ein, dann siehst du hier, mit wem du am öftesten unterwegs warst.</p>`}</div>
      ${facts.length ? `<div class="section"><h2 class="h2">Rekorde</h2><div class="card facts" style="padding:4px 16px">${facts.map(([k, e, x, sub]) => e ? `<a class="fact" href="#event-${e.id}"><span class="k">${esc(k)}</span><span class="v">${esc(e.title)}</span><span class="x">${esc(x)}</span></a>` : `<div class="fact"><span class="k">${esc(k)}</span><span class="v">${esc(x)}</span><span class="x">${esc(sub || '')}</span></div>`).join('')}</div></div>` : ''}
    `}
    ${upcoming.length ? `<div class="section"><div class="card row"><span>${ic('calendar')}</span><span class="grow">${plural(upcoming.length, 'Event', 'Events')} demnächst${upcoming.some((e) => e.price != null) ? `, bereits ${esc(fmtEUR0.format(upcoming.reduce((s, e) => s + (total(e) || 0), 0)))} bezahlt` : ''}</span></div></div>` : ''}
    </div>`;
  $$('[data-y]').forEach((b) => b.addEventListener('click', () => { S.statsYear = b.dataset.y; render('force'); }));
}

/* ================= View: Einstellungen ================= */
async function viewSettings() {
  const theme = document.documentElement.dataset.theme || 'system';
  let est = '', persisted = null;
  try { const e = await navigator.storage?.estimate?.(); if (e) est = `${(e.usage / 1048576).toFixed(1).replace('.', ',')} MB belegt`; } catch { /* ignore */ }
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* ignore */ }
  const photos = (await DB.keys('photos')).length;
  if (currentHash !== 'einstellungen') return;
  const last = S.meta.lastBackup ? fmtDate.format(new Date(S.meta.lastBackup)) : null;
  main.innerHTML = `
    <header class="topbar"><button class="icon-btn" type="button" id="bk" aria-label="Zurück">${ic('back')}</button><h1>Einstellungen</h1></header>
    <div class="pad stack" style="gap:22px">
      <section class="stack"><h2 class="h2">Darstellung</h2>
        <div class="seg" role="group" aria-label="Farbschema">${[['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => `<button type="button" data-theme-set="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}</div>
      </section>
      <section class="stack"><h2 class="h2">Daten sichern</h2>
        <div class="card stack">
          <p>Deine Events und Fotos liegen nur auf diesem Gerät. Speichere regelmäßig ein Backup, z. B. in Google Drive.</p>
          <p class="small muted mono">${plural(S.events.length, 'Event', 'Events')} · ${plural(S.venues.length, 'Spielstätte', 'Spielstätten')} · ${plural(photos, 'Foto', 'Fotos')}${est ? ' · ' + est : ''}</p>
          <p class="small ${last ? 'muted' : 'err'}">${last ? `Letztes Backup: ${esc(last)}` : 'Noch kein Backup gespeichert.'}</p>
          <button class="btn primary" type="button" id="exp">${ic('download')} Backup speichern</button>
          <label class="btn ghost">${ic('upload')} Backup oder Import-Datei laden<input type="file" id="imp" accept=".json,application/json" class="file-hidden"></label>
          <p class="small muted">Beim Laden werden Events mit gleicher Kennung überschrieben, alle anderen bleiben erhalten.</p>
        </div>
        <div class="card row"><span>${ic(persisted ? 'check' : 'info')}</span><span class="grow small">${persisted ? 'Dauerhafter Speicher ist aktiv. Android löscht die Daten nicht von selbst.' : 'Dauerhafter Speicher ist nicht bestätigt. Installiere die App auf dem Startbildschirm, dann schützt Android die Daten besser.'}</span>${persisted ? '' : `<button class="btn sm ghost" type="button" id="persist">Anfragen</button>`}</div>
      </section>
      <section class="stack"><h2 class="h2">Alles löschen</h2>
        <div id="wipewrap"><button class="btn danger block" type="button" id="wipe">${ic('trash')} Alle Daten auf diesem Gerät löschen</button></div>
      </section>
      <section class="stack small muted" style="padding-bottom:8px">
        <p>Logenplatz ${APP_VERSION}. Karten © OpenStreetMap-Mitwirkende. Ortssuche über OpenStreetMap Nominatim.</p>
      </section>
    </div>`;
  $('#bk').addEventListener('click', () => back('chronik'));
  $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => { applyTheme(b.dataset.themeSet); render('force'); }));
  $('#exp').addEventListener('click', exportBackup);
  $('#imp').addEventListener('change', (e) => { const f = e.target.files?.[0]; if (f) importBackup(f); });
  $('#persist')?.addEventListener('click', async () => { const ok = await navigator.storage?.persist?.(); toast(ok ? 'Dauerhafter Speicher aktiv' : 'Android hat noch nicht zugestimmt. Installiere die App zuerst.'); render('force'); });
  $('#wipe').addEventListener('click', () => {
    $('#wipewrap').innerHTML = `<div class="card stack"><p><b>Wirklich alles löschen?</b> Events, Spielstätten und Fotos sind danach weg, außer du hast ein Backup.</p><div class="row"><button class="btn ghost grow" type="button" id="wno">Abbrechen</button><button class="btn danger solid grow" type="button" id="wyes">Alles löschen</button></div></div>`;
    $('#wno').onclick = () => render('force');
    $('#wyes').onclick = async () => {
      for (const s of ['events', 'venues', 'photos']) await DB.clear(s);
      urlCache.forEach((u) => URL.revokeObjectURL(u)); urlCache.clear();
      await loadAll(); toast('Alle Daten gelöscht'); replaceGo('chronik');
    };
  });
}
function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
  try { localStorage.setItem('lp-theme', t); } catch { /* ignore */ }
  updateThemeColor();
}
function updateThemeColor() { $('#themeColor')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#F2F3F7'); }

/* ================= Backup ================= */
const blobToDataURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
function dataURLToBlob(u) {
  const [h, b64] = String(u).split(',');
  const mime = (h.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b64 || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
async function exportBackup() {
  toast('Backup wird erstellt …');
  const photos = [];
  for (const p of await DB.all('photos')) photos.push({ id: p.id, w: p.w, h: p.h, full: await blobToDataURL(p.full), thumb: p.thumb ? await blobToDataURL(p.thumb) : null });
  const data = { app: 'logenplatz', version: 1, exportedAt: new Date().toISOString(), events: S.events, venues: S.venues, photos };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const name = `logenplatz-backup-${todayISO()}.json`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  await setMeta('lastBackup', Date.now());
  toast(`Backup „${name}“ gespeichert (Ordner Downloads)`, 4000);
  if (currentHash === 'einstellungen') render('force');
}
async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('Diese Datei ist kein Logenplatz-Backup.'); return; }
  if (data?.app !== 'logenplatz' || !Array.isArray(data.events)) { toast('Diese Datei ist kein Logenplatz-Backup.'); return; }
  toast('Wird geladen …');
  try {
    for (const p of data.photos || []) {
      if (!p?.id || !p.full) continue;
      const full = dataURLToBlob(p.full);
      await DB.put('photos', { id: p.id, full, thumb: p.thumb ? dataURLToBlob(p.thumb) : full, w: p.w, h: p.h, created: Date.now() });
    }
    for (const v of data.venues || []) await DB.put('venues', normVenue(v));
    for (const e of data.events) if (e?.date && e?.title) await DB.put('events', normEvent(e));
    await loadAll();
    toast(`${plural(data.events.length, 'Event', 'Events')} geladen`, 3200);
    replaceGo('chronik');
  } catch (err) {
    toast('Beim Laden ist ein Fehler passiert: ' + (err?.message || err));
  }
}

/* ================= Start ================= */
async function boot() {
  renderTabbar();
  updateThemeColor();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', updateThemeColor);
  try {
    await DB.open();
    await loadAll();
    cleanupOrphans().catch(() => {});
  } catch (err) {
    main.innerHTML = `<div class="pad section"><div class="card stack"><h2 class="h2">Speicher nicht verfügbar</h2><p>Der Browser erlaubt dieser App keinen lokalen Speicher (${esc(err?.message || err)}). Öffne die App nicht im Inkognito-Modus.</p></div></div>`;
    return;
  }
  if (!location.hash) history.replaceState({ d: 0 }, '', '#chronik');
  else if (!history.state) history.replaceState({ d: 0 }, '', location.href);
  render('replace');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (S.events.length) navigator.storage?.persist?.().catch?.(() => {});
}
boot();
