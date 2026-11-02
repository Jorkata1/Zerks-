// Procedural textures, painted on canvases at runtime. Every map that tiles is drawn so it repeats cleanly.
import * as THREE from 'three';

// ---------- noise ----------
let SEED = 1337;
export function seed(s) { SEED = s; }
export function rng() { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; }
const hash = (x, y) => { let h = x * 374761393 + y * 668265263 + 1442695041; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export function vnoise(x, y, period = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const w = (a) => (period ? ((a % period) + period) % period : a);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(w(xi), w(yi)), b = hash(w(xi + 1), w(yi)), c = hash(w(xi), w(yi + 1)), d = hash(w(xi + 1), w(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 5, period = 0) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f, period ? period * f : 0); norm += amp; amp *= 0.5; f *= 2; }
  return s / norm;
}

// ---------- canvas helpers ----------
export function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function tex(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// normal map from a greyscale height canvas (red channel)
export function normalFrom(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), ctx = out.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return tex(out, { srgb: false });
}
function paintNoise(ctx, w, h, fn) {
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3] ?? 255; }
  ctx.putImageData(img, 0, 0);
}

// ---------- hull panels: seams, rivets, vents, light grime ----------
export function panelSet(base = [228, 231, 236], size = 1024) {
  const col = canvas(size), hgt = canvas(size), rough = canvas(size);
  const c = col.getContext('2d'), hc = hgt.getContext('2d'), rc = rough.getContext('2d');
  paintNoise(c, size, size, (x, y) => { const n = fbm(x / 128, y / 128, 4, size / 128) * 0.08 - 0.04 + fbm(x / 16, y / 16, 2, size / 16) * 0.03; return base.map(v => Math.max(0, Math.min(255, v * (1 + n)))); });
  hc.fillStyle = '#fff'; hc.fillRect(0, 0, size, size);
  paintNoise(rc, size, size, (x, y) => { const r = 120 + fbm(x / 64, y / 64, 3, size / 64) * 60; return [r, r, r]; });
  const rects = [];
  (function split(x, y, w, h, depth) {
    if (depth > 4 || (w < 160 && h < 160) || (depth > 1 && rng() < 0.18)) { rects.push([x, y, w, h]); return; }
    if (w > h) { const s = Math.round(w * (0.35 + rng() * 0.3) / 32) * 32; split(x, y, s, h, depth + 1); split(x + s, y, w - s, h, depth + 1); }
    else { const s = Math.round(h * (0.35 + rng() * 0.3) / 32) * 32; split(x, y, w, s, depth + 1); split(x, y + s, w, h - s, depth + 1); }
  })(0, 0, size, size, 0);
  for (const [x, y, w, h] of rects) {
    const tint = rng() < 0.25 ? (rng() < 0.5 ? -10 : 8) : 0;
    if (tint) { c.fillStyle = `rgba(${tint > 0 ? '255,255,255' : '40,50,60'},${Math.abs(tint) / 100})`; c.fillRect(x, y, w, h); }
    c.strokeStyle = 'rgba(70,78,90,0.55)'; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
    hc.strokeStyle = '#000'; hc.lineWidth = 4; hc.strokeRect(x + 1, y + 1, w - 2, h - 2);
    rc.strokeStyle = '#e0e0e0'; rc.lineWidth = 4; rc.strokeRect(x + 1, y + 1, w - 2, h - 2);
    if (w > 120 && rng() < 0.6) for (let k = 10; k < w - 6; k += 22) for (const yy of [y + 10, y + h - 10]) {
      c.fillStyle = 'rgba(80,88,100,0.6)'; c.beginPath(); c.arc(x + k, yy, 2.2, 0, 7); c.fill();
      hc.fillStyle = '#ccc'; hc.beginPath(); hc.arc(x + k, yy, 3, 0, 7); hc.fill();
    }
    if (w > 180 && h > 120 && rng() < 0.25) { // vent grille
      const vx = x + w * 0.2, vy = y + h * 0.3, vw = w * 0.35;
      for (let k = 0; k < 7; k++) { c.fillStyle = 'rgba(40,46,56,0.75)'; c.fillRect(vx, vy + k * 9, vw, 4); hc.fillStyle = '#333'; hc.fillRect(vx, vy + k * 9, vw, 4); }
    }
    if (w > 150 && rng() < 0.2) { c.fillStyle = 'rgba(255,138,61,0.85)'; c.fillRect(x + 12, y + h - 26, Math.min(70, w * 0.3), 10); }
  }
  // soft grime that collects towards the panel edges
  const g = c.createLinearGradient(0, 0, 0, size); g.addColorStop(0, 'rgba(90,70,50,0)'); g.addColorStop(1, 'rgba(90,70,50,0.08)');
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  return { map: tex(col), normalMap: normalFrom(hgt, 3), roughnessMap: tex(rough, { srgb: false }) };
}

// ---------- brushed dark metal ----------
export function metalSet(base = [64, 70, 82], size = 512) {
  const col = canvas(size), hgt = canvas(size);
  paintNoise(col.getContext('2d'), size, size, (x, y) => { const n = fbm(x / 2, y / 40, 3, size / 2) * 0.18 + fbm(x / 64, y / 64, 3, size / 64) * 0.12 - 0.15; return base.map(v => v * (1 + n)); });
  paintNoise(hgt.getContext('2d'), size, size, (x, y) => { const n = 200 + fbm(x / 1.5, y / 30, 2, size / 1.5) * 50; return [n, n, n]; });
  const c = col.getContext('2d');
  for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(200,210,220,${0.05 + rng() * 0.08})`; c.lineWidth = 1; c.beginPath(); const x = rng() * size, y = rng() * size; c.moveTo(x, y); c.lineTo(x + (rng() - 0.5) * 60, y + (rng() - 0.5) * 20); c.stroke(); }
  return { map: tex(col), normalMap: normalFrom(hgt, 1.2) };
}

// ---------- painted accent with chipped edges ----------
export function paintSet(base = [255, 138, 61], size = 512) {
  const col = canvas(size);
  paintNoise(col.getContext('2d'), size, size, (x, y) => {
    const n = fbm(x / 40, y / 40, 4, size / 40), chip = fbm(x / 6, y / 6, 3, size / 6);
    if (chip > 0.74) return [150, 150, 150];
    return base.map(v => v * (0.9 + n * 0.18));
  });
  return { map: tex(col) };
}

// ---------- solar cells ----------
export function solarSet(size = 512) {
  const col = canvas(size), c = col.getContext('2d'), em = canvas(size);
  const g = c.createLinearGradient(0, 0, size, size); g.addColorStop(0, '#1d3561'); g.addColorStop(0.5, '#28498a'); g.addColorStop(1, '#1a2f57');
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  const n = 8, s = size / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    c.fillStyle = `rgba(${40 + rng() * 15},${70 + rng() * 20},${130 + rng() * 30},0.6)`; c.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    c.strokeStyle = 'rgba(190,200,215,0.55)'; c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(i * s + 3, j * s + k * s / 4); c.lineTo(i * s + s - 3, j * s + k * s / 4); c.stroke(); }
  }
  c.strokeStyle = '#cfd6df'; c.lineWidth = 6; c.strokeRect(0, 0, size, size);
  return { map: tex(col) };
}

// ---------- tower facade: glass bands, mullions, some warm lit windows ----------
export function facadeSet(accent = '#4fd1a5', size = 512) {
  const col = canvas(size), em = canvas(size), c = col.getContext('2d'), e = em.getContext('2d');
  e.fillStyle = '#000'; e.fillRect(0, 0, size, size);
  c.fillStyle = '#e9ecf0'; c.fillRect(0, 0, size, size);
  const floors = 8, fh = size / floors;
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    const g = c.createLinearGradient(0, y, 0, y + fh * 0.62); g.addColorStop(0, '#5b7894'); g.addColorStop(1, '#2e435b');
    c.fillStyle = g; c.fillRect(0, y + fh * 0.18, size, fh * 0.6);
    for (let k = 0; k < 8; k++) {
      const x = k * size / 8;
      if (rng() < 0.32) { c.fillStyle = 'rgba(255,214,150,0.9)'; c.fillRect(x + 4, y + fh * 0.22, size / 8 - 8, fh * 0.5); e.fillStyle = 'rgba(255,190,120,1)'; e.fillRect(x + 4, y + fh * 0.22, size / 8 - 8, fh * 0.5); }
      c.fillStyle = '#d5dae1'; c.fillRect(x, y + fh * 0.18, 4, fh * 0.6);
    }
    c.fillStyle = '#f4f5f7'; c.fillRect(0, y + fh * 0.78, size, fh * 0.08);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, y + fh * 0.86, size, 3);
  }
  c.fillStyle = accent; c.fillRect(0, 0, size, 5);
  return { map: tex(col), emissiveMap: tex(em) };
}

// ---------- concrete pads ----------
export function concreteSet(size = 512) {
  const col = canvas(size), hgt = canvas(size);
  paintNoise(col.getContext('2d'), size, size, (x, y) => { const n = fbm(x / 50, y / 50, 5, size / 50), s = fbm(x / 6, y / 6, 2, size / 6); const v = 150 + n * 50 + s * 18; return [v * 1.0, v * 0.98, v * 0.95]; });
  const c = col.getContext('2d'), h = hgt.getContext('2d'); h.fillStyle = '#fff'; h.fillRect(0, 0, size, size);
  for (let k = 0; k <= 4; k++) { c.fillStyle = 'rgba(60,60,60,0.5)'; c.fillRect(k * size / 4 - 1, 0, 2, size); c.fillRect(0, k * size / 4 - 1, size, 2); h.fillStyle = '#000'; h.fillRect(k * size / 4 - 2, 0, 4, size); h.fillRect(0, k * size / 4 - 2, size, 4); }
  for (let i = 0; i < 6; i++) { const r = c.createRadialGradient(rng() * size, rng() * size, 0, rng() * size, rng() * size, 60 + rng() * 80); r.addColorStop(0, 'rgba(60,45,35,0.18)'); r.addColorStop(1, 'rgba(60,45,35,0)'); c.fillStyle = r; c.fillRect(0, 0, size, size); }
  return { map: tex(col), normalMap: normalFrom(hgt, 2) };
}

// ---------- asphalt with markings ----------
export function roadSet(size = 256) {
  const col = canvas(size, size * 4);
  paintNoise(col.getContext('2d'), size, size * 4, (x, y) => { const v = 78 + fbm(x / 8, y / 8, 3, size / 8) * 30; return [v, v, v * 1.03]; });
  const c = col.getContext('2d');
  c.fillStyle = 'rgba(235,235,235,0.85)'; c.fillRect(8, 0, 6, size * 4); c.fillRect(size - 14, 0, 6, size * 4);
  for (let y = 0; y < size * 4; y += 160) { c.fillStyle = 'rgba(255,196,80,0.9)'; c.fillRect(size / 2 - 3, y, 6, 90); }
  return { map: tex(col) };
}

// ---------- crops: rows of plants ----------
export function cropSet(a = [196, 170, 72], b = [120, 150, 62], size = 512) {
  const col = canvas(size), hgt = canvas(size);
  paintNoise(col.getContext('2d'), size, size, (x, y) => {
    const row = 0.5 + 0.5 * Math.sin(y / size * Math.PI * 2 * 16), n = fbm(x / 10, y / 10, 3, size / 10);
    const t = Math.min(1, Math.max(0, row * 1.4 - 0.2));
    const soil = [104, 76, 52];
    const plant = [a[0] + (b[0] - a[0]) * n, a[1] + (b[1] - a[1]) * n, a[2] + (b[2] - a[2]) * n];
    return soil.map((v, i) => v + (plant[i] - v) * t * (0.75 + n * 0.4));
  });
  paintNoise(hgt.getContext('2d'), size, size, (x, y) => { const v = 128 + 127 * Math.sin(y / size * Math.PI * 2 * 16); return [v, v, v]; });
  return { map: tex(col), normalMap: normalFrom(hgt, 1.5) };
}

// ---------- tiling micro detail for terrain ----------
export function detailNormal(size = 512, scale = 24) {
  const hgt = canvas(size);
  paintNoise(hgt.getContext('2d'), size, size, (x, y) => { const v = fbm(x / scale, y / scale, 5, size / scale) * 255; return [v, v, v]; });
  return normalFrom(hgt, 4);
}

// ---------- soft dust cloud with a ragged edge ----------
export function cloudTex(size = 256) {
  const c = canvas(size);
  paintNoise(c.getContext('2d'), size, size, (x, y) => {
    const dx = x / size - 0.5, dy = y / size - 0.5, r = Math.hypot(dx, dy) * 2;
    const n = fbm(x / 28 + 3, y / 28 + 7, 5);
    const a = Math.max(0, Math.min(1, (1 - r) * 1.6 * (0.45 + n)));
    return [255, 255, 255, a * a * 255];
  });
  return tex(c, { repeat: false });
}
export function glowTex(size = 128) {
  const c = canvas(size), g = c.getContext('2d'), r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  return tex(c, { repeat: false });
}

// ---------- world-scale UVs so a texture keeps the same density on every part ----------
export function worldUV(geo, scale = 4, offset = [0, 0, 0]) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  if (!uv || !n) return geo;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + offset[0], y = p.getY(i) + offset[1], z = p.getZ(i) + offset[2];
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x / scale, z / scale);
    else if (ax >= az) uv.setXY(i, z / scale, y / scale);
    else uv.setXY(i, x / scale, y / scale);
  }
  uv.needsUpdate = true;
  return geo;
}
