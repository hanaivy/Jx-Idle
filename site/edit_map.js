'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('mapCanvas'), ctx = canvas.getContext('2d');
  const select = $('mapSelect'), title = $('mapTitle'), stats = $('mapStats');
  const status = $('status'), loading = $('loading'), wrap = $('canvasWrap');
  const image = new Image();
  const maps = new Map(), labels = new Map();
  let currentId = '', meta = null, grid = null, original = null, connected = null;
  let mode = 1, strokeMode = 1, brush = 1, drawing = false, panning = false, spaceHeld = false, changedStroke = false;
  let undoStack = [], redoStack = [], mapRect = null, dpr = 1, cssW = 0, cssH = 0;
  let viewZoom = 1, panX = 0, panY = 0, panStart = null;

  const setStatus = (message, type = '') => { status.textContent = message; status.className = `status ${type}`; };
  const bit = (bytes, i) => (bytes[i >> 3] >> (i & 7)) & 1;
  const setBit = (bytes, i, v) => { if (v) bytes[i >> 3] |= 1 << (i & 7); else bytes[i >> 3] &= ~(1 << (i & 7)); };
  const decode = text => { const bin = atob(text), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
  const encode = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s); };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => v === b[i]);
  const dirty = () => !same(grid, original);

  function syncButtons() {
    const has = !!grid;
    for (const id of ['blockMode','walkMode','brushSize','undoBtn','redoBtn','resetBtn']) $(id).disabled = !has;
    $('undoBtn').disabled = !has || !undoStack.length;
    $('redoBtn').disabled = !has || !redoStack.length;
    $('resetBtn').disabled = !has || !dirty();
    $('saveBtn').disabled = !has || !dirty();
    select.disabled = !maps.size;
    $('blockMode').classList.toggle('active', mode === 1);
    $('walkMode').classList.toggle('active', mode === 0);
  }

  function analyze() {
    const gw = meta.gw, gh = meta.gh, total = gw * gh;
    const visited = new Uint8Array(total), regions = [];
    const q = new Int32Array(total);
    for (let start = 0; start < total; start++) {
      if (bit(grid, start) || visited[start]) continue;
      let h = 0, t = 0; q[t++] = start; visited[start] = 1;
      while (h < t) {
        const at = q[h++], x = at % gw, y = (at / gw) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ni = ny * gw + nx;
          if (visited[ni] || bit(grid, ni)) continue;
          if (dx && dy && (bit(grid, y * gw + nx) || bit(grid, ny * gw + x))) continue;
          visited[ni] = 1; q[t++] = ni;
        }
      }
      regions.push({ start, size: t });
    }
    regions.sort((a, b) => b.size - a.size);
    connected = visited;
    if (regions.length > 1) {
      // Mark all cells outside the largest walkable island for the amber overlay.
      const largest = new Uint8Array(total), start = regions[0].start;
      let h = 0, t = 0; q[t++] = start; largest[start] = 1;
      while (h < t) {
        const at = q[h++], x = at % gw, y = (at / gw) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ni = ny * gw + nx;
          if (largest[ni] || bit(grid, ni)) continue;
          if (dx && dy && (bit(grid, y * gw + nx) || bit(grid, ny * gw + x))) continue;
          largest[ni] = 1; q[t++] = ni;
        }
      }
      connected = largest;
    } else if (regions.length === 1) connected = new Uint8Array(total).fill(1);
    else connected = new Uint8Array(total);
    const blocked = grid.reduce((total, value) => { for (let b = value; b; b &= b - 1) total++; return total; }, 0);
    const orphan = regions.slice(1).reduce((n, r) => n + r.size, 0);
    stats.textContent = `${meta.gw} × ${meta.gh} ô · ${blocked.toLocaleString('vi-VN')} ô chặn · vùng đi lớn nhất ${regions[0]?.size.toLocaleString('vi-VN') || 0}${orphan ? ` · ${orphan.toLocaleString('vi-VN')} ô đi bị tách (game không dùng)` : ''}`;
    stats.classList.toggle('muted', !orphan);
  }

  function draw() {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    cssW = rect.width; cssH = rect.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = '#080d0b'; ctx.fillRect(0, 0, cssW, cssH);
    if (!meta || !grid) return;
    const scale = Math.min((cssW - 18) / meta.w, (cssH - 18) / meta.h) * viewZoom;
    const width = meta.w * scale, height = meta.h * scale;
    const left = (cssW - width) / 2 + panX, top = (cssH - height) / 2 + panY;
    mapRect = { left, top, width, height, scale };
    if (image.complete && image.naturalWidth) ctx.drawImage(image, left, top, width, height);
    else { ctx.fillStyle = '#26352c'; ctx.fillRect(left, top, width, height); }

    const overlay = document.createElement('canvas'); overlay.width = meta.gw; overlay.height = meta.gh;
    const octx = overlay.getContext('2d'), pixels = octx.createImageData(meta.gw, meta.gh);
    for (let i = 0; i < meta.gw * meta.gh; i++) {
      const k = i * 4;
      if (bit(grid, i)) { pixels.data[k] = 246; pixels.data[k + 1] = 62; pixels.data[k + 2] = 61; pixels.data[k + 3] = 155; }
      else if (connected && !connected[i]) { pixels.data[k] = 255; pixels.data[k + 1] = 190; pixels.data[k + 2] = 50; pixels.data[k + 3] = 125; }
    }
    octx.putImageData(pixels, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(overlay, left, top, width, height); ctx.imageSmoothingEnabled = true;

    if ($('showGrid').checked) {
      ctx.beginPath(); ctx.strokeStyle = 'rgba(240,235,215,.25)'; ctx.lineWidth = .55;
      const cw = meta.cw * scale, ch = meta.ch * scale;
      for (let x = 0; x <= meta.gw; x++) { const px = left + x * cw; ctx.moveTo(px, top); ctx.lineTo(px, top + height); }
      for (let y = 0; y <= meta.gh; y++) { const py = top + y * ch; ctx.moveTo(left, py); ctx.lineTo(left + width, py); }
      ctx.stroke();
    }
  }

  function loadMap(id) {
    currentId = String(id); meta = maps.get(currentId); if (!meta) return;
    viewZoom = 1; panX = 0; panY = 0; updateZoomLabel();
    grid = decode(meta.obs); original = grid.slice(); undoStack = []; redoStack = [];
    const def = labels.get(currentId), name = def?.n || `Bản đồ ${currentId}`;
    title.textContent = `${name} · ID ${currentId}`;
    image.onload = draw; image.onerror = draw;
    image.src = `${def?.bg || `img/z/${currentId}.jpg`}?map-preview=${currentId}`;
    analyze(); draw(); syncButtons(); loading.classList.add('off');
    setStatus('Kéo để vẽ block · cuộn để zoom · giữ Space rồi kéo để rê. Vùng vàng bị tách rời sẽ không đi được trong game.');
  }

  function addHistory(stack) { stack.push(grid.slice()); if (stack.length > 50) stack.shift(); }
  function updateZoomLabel() { $('zoomLabel').textContent = `${Math.round(viewZoom * 100)}%`; }
  function zoomAt(clientX, clientY, factor) {
    if (!meta || !mapRect) return;
    const rect = canvas.getBoundingClientRect(), px = clientX - rect.left, py = clientY - rect.top;
    const worldX = (px - mapRect.left) / mapRect.scale, worldY = (py - mapRect.top) / mapRect.scale;
    const next = Math.max(1, Math.min(12, viewZoom * factor)); if (next === viewZoom) return;
    viewZoom = next;
    if (viewZoom === 1) { panX = 0; panY = 0; }
    else {
      const base = Math.min((cssW - 18) / meta.w, (cssH - 18) / meta.h), scale = base * viewZoom;
      panX = px - worldX * scale - (cssW - meta.w * scale) / 2;
      panY = py - worldY * scale - (cssH - meta.h * scale) / 2;
    }
    updateZoomLabel(); draw();
  }
  function fitMap() { viewZoom = 1; panX = 0; panY = 0; updateZoomLabel(); draw(); }
  function applyAt(clientX, clientY) {
    if (!mapRect || !meta) return false;
    const rect = canvas.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
    if (x < mapRect.left || y < mapRect.top || x >= mapRect.left + mapRect.width || y >= mapRect.top + mapRect.height) return false;
    const col = Math.floor((x - mapRect.left) / (meta.cw * mapRect.scale));
    const row = Math.floor((y - mapRect.top) / (meta.ch * mapRect.scale));
    const r = (brush - 1) >> 1; let changed = false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const cx = col + dx, cy = row + dy; if (cx < 0 || cy < 0 || cx >= meta.gw || cy >= meta.gh) continue;
      const i = cy * meta.gw + cx; if (bit(grid, i) !== strokeMode) { setBit(grid, i, strokeMode); changed = true; }
    }
    if (changed) { changedStroke = true; draw(); syncButtons(); }
    return changed;
  }

  canvas.addEventListener('pointerdown', e => {
    if (!grid || (e.button !== 0 && e.button !== 1 && e.button !== 2)) return;
    if (e.button === 1 || e.shiftKey || spaceHeld) {
      panning = true; panStart = { x: e.clientX, y: e.clientY, panX, panY };
      canvas.setPointerCapture(e.pointerId); e.preventDefault(); return;
    }
    strokeMode = e.button === 2 ? 0 : mode;
    drawing = true; changedStroke = false; addHistory(undoStack); redoStack = [];
    canvas.setPointerCapture(e.pointerId); applyAt(e.clientX, e.clientY); syncButtons(); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (panning && panStart) { panX = panStart.panX + e.clientX - panStart.x; panY = panStart.panY + e.clientY - panStart.y; draw(); }
    else if (drawing) applyAt(e.clientX, e.clientY);
  });
  const endStroke = () => {
    if (panning) { panning = false; panStart = null; return; }
    if (!drawing) return; drawing = false; if (changedStroke) analyze(); else undoStack.pop(); draw(); syncButtons();
  };
  canvas.addEventListener('pointerup', endStroke); canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  $('zoomIn').onclick = () => zoomAt(canvas.getBoundingClientRect().left + cssW / 2, canvas.getBoundingClientRect().top + cssH / 2, 1.5);
  $('zoomOut').onclick = () => zoomAt(canvas.getBoundingClientRect().left + cssW / 2, canvas.getBoundingClientRect().top + cssH / 2, 1 / 1.5);
  $('fitMap').onclick = fitMap;

  function restoreFrom(bytes) { grid = bytes.slice(); analyze(); draw(); syncButtons(); }
  $('blockMode').onclick = () => { mode = 1; syncButtons(); };
  $('walkMode').onclick = () => { mode = 0; syncButtons(); };
  $('brushSize').onchange = e => { brush = +e.target.value; };
  $('showGrid').onchange = draw;
  $('undoBtn').onclick = () => { if (!undoStack.length) return; addHistory(redoStack); restoreFrom(undoStack.pop()); };
  $('redoBtn').onclick = () => { if (!redoStack.length) return; addHistory(undoStack); restoreFrom(redoStack.pop()); };
  $('resetBtn').onclick = () => { if (!dirty() || confirm('Khôi phục mask gốc của map này? Mọi thay đổi chưa lưu sẽ bị bỏ.')) { undoStack = []; redoStack = []; restoreFrom(original); } };
  select.onchange = () => {
    if (dirty() && !confirm('Bạn có thay đổi chưa lưu. Bỏ thay đổi để mở map khác?')) { select.value = currentId; return; }
    loadMap(select.value);
  };
  window.addEventListener('resize', draw);
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      const active = document.activeElement;
      const inputType = active?.tagName === 'INPUT' ? active.type : '';
      const editingText = !!active && (active.isContentEditable || active.tagName === 'TEXTAREA' ||
        (active.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|reset|color|file|image|hidden)$/.test(inputType)));
      if (spaceHeld) e.preventDefault();
      else if (!e.repeat && !editingText) { spaceHeld = true; canvas.classList.add('panning-mode'); e.preventDefault(); }
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? $('redoBtn') : $('undoBtn')).click(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); $('redoBtn').click(); }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' && spaceHeld) { spaceHeld = false; canvas.classList.remove('panning-mode'); e.preventDefault(); }
  });
  window.addEventListener('blur', () => { spaceHeld = false; canvas.classList.remove('panning-mode'); });

  $('saveBtn').onclick = async () => {
    if (!dirty()) return;
    if (!confirm(`Lưu thay đổi cho ${title.textContent}? Source jmo.js sẽ được sao lưu trước khi ghi.`)) return;
    $('saveBtn').disabled = true; setStatus('Đang sao lưu và ghi mask vào source…');
    try {
      const response = await fetch('__admin/maps/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: currentId, obs: encode(grid) }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Không lưu được map.');
      maps.get(currentId).obs = encode(grid); original = grid.slice();
      setStatus(`Đã lưu map ${currentId}. Bản backup: ${result.backup}`, 'success');
      syncButtons();
    } catch (error) {
      setStatus(`${error.message} Hãy mở trang qua server.py trên máy source; link Cloudflare chỉ xem được.`, 'error');
      syncButtons();
    }
  };

  async function init() {
    try {
      const response = await fetch(`jmo.js?map-editor=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Không tải được jmo.js (${response.status}).`);
      const source = await response.text(), marker = /window\.JMO\s*=\s*/.exec(source);
      if (!marker) throw new Error('Định dạng jmo.js không đúng.');
      const payload = source.slice(marker.index + marker[0].length).trim().replace(/;\s*$/, '');
      const data = JSON.parse(payload);
      const zoneById = new Map((window.JW?.zones || []).map(z => [String(z.id), z]));
      if (window.JW?.town) zoneById.set(String(window.JW.town.id), window.JW.town);
      for (const [id, map] of Object.entries(data)) {
        maps.set(id, map); const def = zoneById.get(id); if (def) labels.set(id, def);
      }
      select.replaceChildren(...[...maps.keys()].map(id => {
        const option = document.createElement('option'); option.value = id;
        option.textContent = `${labels.get(id)?.n || `Bản đồ ${id}`} · ${id}`; return option;
      }));
      const first = labels.has('37') ? '37' : maps.keys().next().value;
      select.value = first; loadMap(first);
    } catch (error) {
      loading.textContent = error.message; setStatus(error.message, 'error');
    }
  }
  init();
})();
