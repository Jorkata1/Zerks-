// The canyon, the ground and the details of the map (decided by Joro on 14.11.2026: "I like it … yes, make them
// permanent"; the ground made into real relief on the same day: "I want us to fix the terrain").
// They are always on; map.html?details=none#lvl10 shows the map as it was before them (for the before-and-now sheet).
//   the canyon   one surface: a floor that winds, three terraces of layered rock up to the plain above, a round head,
//                a mouth that opens to the plain; beside the mine the layers hold the iron ore and the quartz it digs
//   the ground   real relief, not a flat sheet: flat where the colony stands, low dunes beyond it, a rise to the foot
//                of the walls, a basin for the Ice Hollow, craters with rims; its colour does not repeat; on it are
//                painted the wind ripples, dry cracks, stony ground under the walls and the robot's tracks
//   the ice      the Ice Hollow at the low end of the canyon (the clay pit of level 13 stands on its shore)
//   the lines    a covered service channel along the streets for the water and the power, a box at every building
//   the robot    the collector robot coming home along its tracks
//   the zone     stakes with flags and a sign along the edge of the closed zone
//   the dust     a blanket of soft layers over the closed zone
//   the stones   lumpy boulders with flat faces, dust on top, pebbles round the big ones; also on the ledges
// The random numbers here are their own, so nothing of the map itself moves.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const R2 = Math.SQRT1_2;
// the canyon's own directions: a across it (to the right of the screen), t along it (towards the camera)
export const P = (a, t) => [(a + t) * R2, (t - a) * R2];
const AT = (x, z) => [(x - z) * R2, (x + z) * R2];
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const box = (w, h, d, mat, r = 0.3, seg = 3) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), mat); m.castShadow = m.receiveShadow = true; return m; };
// smooth noise between 0 and 1, and a few octaves of it
function noise2(seed) {
  const r = rng(seed), perm = Array.from({ length: 256 }, (_, i) => i), val = new Float32Array(256).map(() => r());
  for (let i = 255; i > 0; i--) { const k = r() * (i + 1) | 0; [perm[i], perm[k]] = [perm[k], perm[i]]; }
  const h = (i, j) => val[perm[(perm[i & 255] + j) & 255]];
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
const fbm = (n, x, y, oct = 4) => { let s = 0, a = 0.5, f = 1, w = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); w += a; a *= 0.5; f *= 2; } return s / w; };
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

const FLOOR = 52;             // about half the width of the canyon floor, metres
const HEAD = -100;            // where the round head of the canyon begins
const TOP = 23;               // how high the plain above the canyon lies
const RISE = 26, STEPS = 3;   // the walls climb to it over 26 m, in three terraces
const ICE = [-22, 76, 17, 9.5];                                                     // the Ice Hollow: across, along, half-width, half-length
const CRATERS = [[-30, 98, 5.2], [28, 86, 3.4], [40, -66, 4.2], [-42, 40, 2.6], [10, 116, 2.4]];   // across, along, radius
const TRACK = [[0, 58], [3, 66], [9, 76], [18, 90], [30, 104], [46, 122], [60, 136]];   // where the robot drives out to the plain
function along(pts, f) { const n = pts.length - 1, k = Math.min(n - 1, Math.floor(f * n)), u = f * n - k, [a1, t1] = pts[k], [a2, t2] = pts[k + 1]; return [a1 + (a2 - a1) * u, t1 + (t2 - t1) * u, Math.atan2(t2 - t1, a2 - a1)]; }

// ---------- the shape of the land: everything else stands on it ----------
function canyonShape(blocks) {
  const n = noise2(17), n2 = noise2(23), n3 = noise2(31), n4 = noise2(53), RH = 62, S = TOP / STEPS, built = blocks.filter(b => b.built);
  // how wide the floor is on each side at a place along the canyon; past the colony the walls fall back (the mouth)
  const halfW = (t, side) => { let w = 53 + 4.5 * Math.sin(t * 0.031 + (side < 0 ? 0.6 : 2.4)) + 8 * (fbm(n, t * 0.02 + (side < 0 ? 10 : 50), 1.7, 3) - 0.5); if (t > 96) w += (t - 96) * 0.95; return w; };
  // how far outside the floor a point lies (negative on the floor); spurs and gullies break the line
  const outside = (a, t) => {
    const side = a < 0 ? -1 : 1; let d;
    if (t >= HEAD) d = Math.abs(a) - halfW(t, side);
    else { const w = halfW(HEAD, side); d = (Math.hypot(Math.abs(a) / w, (HEAD - t) / RH) - 1) * Math.min(w, RH); }
    return d + (fbm(n2, a * 0.045, t * 0.045, 3) - 0.5) * 9;
  };
  // metres to the nearest street of the colony, to the robot's track, and the place in the Ice Hollow (1 = its rim)
  const flatDist = (a, t) => { const [x, z] = P(a, t); let m = 1e9; for (const b of built) m = Math.min(m, Math.hypot(Math.max(Math.abs(x - b.cx) - 8.4, 0), Math.max(Math.abs(z - b.cz) - 8.4, 0))); return m; };
  const trackDist = (a, t) => { let m = 1e9; for (let i = 0; i <= 40; i++) { const [ta, tt] = along(TRACK, i / 40); m = Math.min(m, Math.hypot(a - ta, t - tt)); } return m; };
  const iceR = (a, t) => { const da = (a - ICE[0]) / ICE[2], dt = (t - ICE[1]) / ICE[3], q = Math.atan2(dt, da); return Math.hypot(da, dt) / (1 + 0.07 * Math.sin(q * 3 + 1) + 0.05 * Math.sin(q * 5 + 2)); };
  // The floor: flat where the colony stands and gentle where the robot drives; beyond, low dunes that lie across the
  // wind; it climbs a little to the foot of the walls; the Ice Hollow is a basin, the craters are bowls with rims.
  const floor = (a, t, d = outside(a, t)) => {
    const fd = flatDist(a, t), e = iceR(a, t);
    // how much of the dunes there is here: none by the streets, little on the robot's way, none round the Ice Hollow
    const w = smooth((fd - 4) / 16) * (0.3 + 0.7 * smooth((trackDist(a, t) - 1.5) / 5)) * smooth((e - 1.15) / 0.7);
    const ridge = 1 - Math.abs(2 * n4(a * 0.03 + 7, t * 0.085) - 1);
    let h = w * (1.9 * ridge * ridge + 1.1 * (fbm(n4, a * 0.022, t * 0.03, 3) - 0.5));
    h += 2.4 * smooth((d + 14) / 14) * smooth((fd - 3) / 8);
    if (e < 1.22) h -= 1.15 * smooth((1.22 - e) / 0.3);
    for (const [a0, t0, rad] of CRATERS) { const r = Math.hypot(a - a0, t - t0) / rad; if (r < 1.6) h += -0.8 * smooth((0.85 - r) / 0.85) + 0.34 * Math.exp(-(((r - 1) / 0.24) ** 2)); }
    return h;
  };
  // The walls: a steep face, then a ledge, three times; then the plain above, never quite flat.
  const wall = (a, t, d) => {
    const k = STEPS * clamp(d / RISE), fl = Math.floor(k);
    if (d > RISE) return TOP + (fbm(n, a * 0.03 + 40, t * 0.03, 3) - 0.5) * 2.4 * smooth((d - RISE) / 22);
    return (fl + smooth((k - fl) / 0.3)) * S + (fbm(n3, a * 0.16, t * 0.16, 2) - 0.5) * 0.7 * smooth(d / 2.5);
  };
  const land = (a, t) => { const d = outside(a, t), f = floor(a, t, d); return d > 0 ? Math.max(wall(a, t, d), f) : f; };
  return { halfW, outside, floor, wall, land, iceR, n3 };
}

// ---------- the colour of the floor: one picture as big as the floor, so nothing repeats ----------
// 10 pixels to the metre, 168 m across and 324 m along. Big soft patches of lighter and darker dust, a stonier band
// under the walls and fine grain; on it the wind ripples, the dry cracks, the shade in the craters and under the
// stones, the frost on the bank of the Ice Hollow and the tracks of the robot. It lies on the relief like a cloth.
const PXM = 10, GA = 84, GT0 = -174, GT1 = 150, GW = 2 * GA, GL = GT1 - GT0;
const gx = a => (a + GA) * PXM, gy = t => (t - GT0) * PXM;
function floorField(shape) {
  const row = GW + 1, h = new Float32Array(row * (GL + 1)), d = new Float32Array(row * (GL + 1));
  for (let j = 0; j <= GL; j++) for (let i = 0; i <= GW; i++) { const q = j * row + i; d[q] = shape.outside(i - GA, GT0 + j); h[q] = shape.floor(i - GA, GT0 + j, d[q]); }
  return { h, d, row };
}
function paintFloor(shape, placed, field) {
  const w = GW * PXM, h = GL * PXM, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data, n1 = noise2(71), n2 = noise2(73), g = rng(79), r = rng(29), row = GW + 1;
  const tone = new Float32Array(row * (GL + 1));
  for (let j = 0; j <= GL; j++) for (let i = 0; i <= GW; i++) {
    const a = i - GA, t = GT0 + j, edge = smooth(Math.min(GA - Math.abs(a), t - GT0, GT1 - t) / 14);   // at its edge the picture is the plain colour of the land beyond
    const big = smooth((fbm(n1, a * 0.016, t * 0.016, 3) - 0.3) / 0.4) - 0.5, mid = fbm(n2, a * 0.08, t * 0.08, 2) - 0.5, q = j * row + i;
    // the slopes that face the sun (it stands to the left) are a little lighter, the ones turned away darker
    const i0 = Math.max(0, i - 1), i1 = Math.min(GW, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(GL, j + 1);
    const sunny = clamp(0.5 * (0.57 * (field.h[j * row + i1] - field.h[j * row + i0]) / (i1 - i0) - 0.14 * (field.h[j1 * row + i] - field.h[j0 * row + i]) / (j1 - j0)), -0.16, 0.16);
    tone[q] = edge * (big * 0.16 + mid * 0.07 - 0.06 * smooth((field.d[q] + 10) / 10)) + sunny;
  }
  for (let py = 0; py < h; py++) {
    const fy = py / PXM, j = Math.min(GL - 1, fy | 0), v = fy - j;
    for (let px = 0; px < w; px++) {
      const fx = px / PXM, i = Math.min(GW - 1, fx | 0), u = fx - i, o = j * row + i, q = (py * w + px) * 4;
      const tn = (tone[o] * (1 - u) + tone[o + 1] * u) * (1 - v) + (tone[o + row] * (1 - u) + tone[o + row + 1] * u) * v, gr = (g() - 0.5) * 0.034;
      const kg = tn > 0 ? 1.45 : 1.15, kb = tn > 0 ? 1.9 : 1.45;   // lighter dust is paler, darker dust a little redder
      d[q] = 238 * (1 + tn * 0.45 + gr); d[q + 1] = 159 * (1 + tn * kg + gr); d[q + 2] = 102 * (1 + tn * kb + gr); d[q + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  x.lineCap = 'round';
  // wind ripples: short waves in fields that fade at their edges
  for (const [a0, t0, fw, fl] of [[-14, 84, 30, 16], [22, 104, 34, 18], [-34, 112, 24, 14], [6, 124, 30, 12], [-46, -18, 10, 30], [47, 14, 9, 34], [46, 66, 10, 26], [-44, -84, 16, 22], [40, -96, 18, 20], [2, -118, 34, 14], [34, 84, 20, 14], [-52, 130, 26, 12], [56, 122, 22, 12]]) {
    const turn = (r() - 0.5) * 0.5;
    for (let k = 0; k < fl / 1.5; k++) {
      const v = k * 1.5 - fl / 2, ph = r() * 6;
      for (let u = -fw / 2; u < fw / 2; u += 1) {
        const fade = Math.max(0, 1 - (2 * u / fw) ** 2) * Math.max(0, 1 - (2 * v / fl) ** 2);
        if (fade < 0.05) continue;
        const pt = uu => { const vv = v + Math.sin(uu * 0.45 + ph) * 0.5, cs = Math.cos(turn), sn = Math.sin(turn); return [gx(a0 + uu * cs - vv * sn), gy(t0 + uu * sn + vv * cs)]; };
        const [x1, y1] = pt(u), [x2, y2] = pt(u + 1.05);
        x.strokeStyle = `rgba(255,226,188,${0.4 * fade})`; x.lineWidth = 4; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
        x.strokeStyle = `rgba(186,104,66,${0.26 * fade})`; x.lineWidth = 2.8; x.beginPath(); x.moveTo(x1, y1 + 4.2); x.lineTo(x2, y2 + 4.2); x.stroke();
      }
    }
  }
  // dry cracks: a few patches of thin branching lines
  for (const [a0, t0, cnt] of [[30, 70, 7], [-40, 62, 6], [14, 92, 6], [-8, 108, 7], [44, -40, 5], [-46, 22, 5], [-30, -70, 6], [24, -74, 6]]) {
    for (let k = 0; k < cnt; k++) {
      const walk = (a, t, dir, len, wd) => { for (let i = 0; i < len; i++) { const na = a + Math.cos(dir) * 0.9, nt = t + Math.sin(dir) * 0.9; x.strokeStyle = `rgba(160,86,54,${0.3 * (1 - i / len) + 0.08})`; x.lineWidth = wd; x.beginPath(); x.moveTo(gx(a), gy(t)); x.lineTo(gx(na), gy(nt)); x.stroke(); a = na; t = nt; dir += (r() - 0.5) * 0.9; if (r() < 0.12 && len > 3) walk(a, t, dir + (r() < 0.5 ? 1 : -1), len >> 1, wd * 0.8); } };
      walk(a0 + (r() - 0.5) * 7, t0 + (r() - 0.5) * 7, r() * 6.3, 5 + (r() * 6 | 0), 2.1);
    }
  }
  // the craters are real bowls now; here only the darker dust that gathers in them and the pale rim
  for (const [a0, t0, rad] of CRATERS) {
    const cx = gx(a0), cy = gy(t0), R = rad * PXM, gr = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
    gr.addColorStop(0, 'rgba(170,92,60,.38)'); gr.addColorStop(0.6, 'rgba(186,104,68,.22)'); gr.addColorStop(0.82, 'rgba(255,224,184,.42)'); gr.addColorStop(1, 'rgba(255,224,184,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R * 1.3, 0, 7); x.fill();
  }
  // stonier ground under the walls
  for (let i = 0; i < 3600; i++) { const side = r() < 0.5 ? -1 : 1, t = GT0 + 8 + r() * (GL - 16), a = side * (shape.halfW(t, side) - 10 * r() * r()); x.fillStyle = `rgba(166,90,58,${0.16 + r() * 0.3})`; x.beginPath(); x.ellipse(gx(a), gy(t), 2 + r() * 6, 1.3 + r() * 3.6, r() * 3, 0, 7); x.fill(); }
  // a soft shade where each stone sits
  for (const [a, t, k] of placed) {
    const cx = gx(a + k * 0.25), cy = gy(t + k * 0.12), R = k * 1.7 * PXM, gr = x.createRadialGradient(cx, cy, R * 0.25, cx, cy, R);
    gr.addColorStop(0, 'rgba(150,80,52,.34)'); gr.addColorStop(1, 'rgba(150,80,52,0)');
    x.fillStyle = gr; x.beginPath(); x.ellipse(cx, cy, R, R * 0.72, 0, 0, 7); x.fill();
  }
  // the bank of the Ice Hollow: damp and darker outside, frost towards the ice
  const [ia, it, ra, rt] = ICE, blob = k => { x.beginPath(); for (let i = 0; i <= 64; i++) { const q = i / 64 * Math.PI * 2, wv = 1 + 0.07 * Math.sin(q * 3 + 1) + 0.05 * Math.sin(q * 5 + 2); x.lineTo(gx(ia + Math.cos(q) * ra * wv * k), gy(it + Math.sin(q) * rt * wv * k)); } x.closePath(); };
  x.fillStyle = 'rgba(156,84,56,.28)'; blob(1.36); x.fill(); x.fillStyle = 'rgba(156,84,56,.2)'; blob(1.27); x.fill();
  x.fillStyle = 'rgba(255,240,220,.5)'; blob(1.19); x.fill(); x.fillStyle = 'rgba(255,248,238,.55)'; blob(1.14); x.fill();
  // the tracks of the robot: two ruts, and fainter ones beside them from other days
  const rt2 = rng(5);
  for (const off of [-0.85, 0.85]) for (let pass = 0; pass < 3; pass++) {
    const sway = (rt2() - 0.5) * 0.5;
    x.strokeStyle = pass ? 'rgba(176,96,62,.2)' : 'rgba(156,82,52,.5)'; x.lineWidth = pass ? 2.6 : 3.8; x.beginPath();
    for (let i = 0; i <= 260; i++) { const [a, t, q] = along(TRACK, i / 260), o = off + (pass ? sway + Math.sin(i * 0.14 + pass) * 0.25 : 0); x.lineTo(gx(a - Math.sin(q) * o), gy(t + Math.cos(q) * o)); }
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
function floorMesh({ scene }, field, tex) {
  const nx = GW + 1, nz = GL + 1, pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), ds = field.d;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const q = j * nx + i, [x, z] = P(i - GA, GT0 + j);
    pos[q * 3] = x; pos[q * 3 + 1] = field.h[q]; pos[q * 3 + 2] = z; uv[q * 2] = i / GW; uv[q * 2 + 1] = 1 - j / GL;
  }
  const idx = [];
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const p = j * nx + i, q = p + nx; if (Math.min(ds[p], ds[p + 1], ds[q], ds[q + 1]) < 3) idx.push(p, q, p + 1, p + 1, q, q + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })); m.receiveShadow = true; m.name = 'floor'; scene.add(m);
}

// ---------- the walls of the canyon and the plain above ----------
// Each face is a layer of rock in its own colour with thin lines of strata; the colour is painted by height, so the
// layers stay level and sharp whatever the shape of the wall, and dust lies on the ledges.
function strataTexture() {
  const H = 1024, c = document.createElement('canvas'); c.width = 2; c.height = H;
  const x = c.getContext('2d'), S = TOP / STEPS, yOf = h => (1 - (h + 1) / (TOP + 2)) * H, r = rng(47);
  const band = (col, h0, h1, colour) => { x.fillStyle = colour; x.fillRect(col, yOf(h1), 1, yOf(h0) - yOf(h1) + 1); };
  for (const col of [0, 1]) {
    band(col, -1, TOP + 1, '#ee9f66');
    ['#c8744e', '#b6603c', '#d0865c'].forEach((rock, k) => {
      band(col, k * S + 0.45, (k + 1) * S - 0.45, rock);
      for (let h = k * S + 0.9; h < (k + 1) * S - 0.7; h += 0.9 + r() * 1.3) band(col, h, h + 0.16 + r() * 0.2, r() < 0.5 ? 'rgba(90,40,20,.2)' : 'rgba(255,214,170,.28)');
    });
    if (col === 1) { band(col, 2.5, 4.5, '#8a4a36'); band(col, 3.3, 3.55, '#6f3a2a'); band(col, S + 2.2, S + 3.7, '#f1e6ff'); band(col, S + 2.8, S + 2.95, '#d9c8f5'); }
    for (let k = 1; k <= STEPS; k++) band(col, k * S - 0.45, k * S + 0.45, k === STEPS ? '#eaa878' : '#e6a274');   // the ledges: dust lies on them
    band(col, TOP + 0.45, TOP + 1, '#eaa878');
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}
function canyonLand({ scene, sun }, shape) {
  const STEP = 1.25, A0 = -170, A1 = 170, T0 = -310, T1 = 268, nx = Math.round((A1 - A0) / STEP) + 1, nz = Math.round((T1 - T0) / STEP) + 1, n3 = shape.n3;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), col = new Float32Array(nx * nz * 3), keep = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = A0 + i * STEP, t = T0 + j * STEP, d = shape.outside(a, t), f = shape.floor(a, t, d), q = j * nx + i, h = d > 0 ? Math.max(shape.wall(a, t, d), f) : f - 0.04;
    const [x, z] = P(a, t); pos[q * 3] = x; pos[q * 3 + 1] = h; pos[q * 3 + 2] = z;
    // the colour comes from the height (the layers waver a little); by the mine, from the column with the ore
    uv[q * 2] = a < 0 ? smooth((-a - 30) / 12) * smooth((t + 32) / 8) * smooth((40 - t) / 8) : 0;
    uv[q * 2 + 1] = d <= 0 ? 0.002 : d > RISE - 1 ? 0.998 : clamp((h + (fbm(n3, a * 0.07 + 9, t * 0.07, 2) - 0.5) * 0.7 + 1) / (TOP + 2), 0.002, 0.998);
    // big soft patches of lighter and darker rock, so no ledge and no stretch of the plain is one flat colour
    const tint = 1 + (fbm(n3, a * 0.022 + 3, t * 0.022, 3) - 0.5) * 0.2 * smooth(d / 4); col[q * 3] = tint; col[q * 3 + 1] = tint; col[q * 3 + 2] = tint;
    // inside the picture of the floor the floor is its own surface; this one starts at the foot of the walls
    keep[q] = d > 1.5 || Math.abs(a) > GA - 1 || t < GT0 + 1 || t > GT1 - 1 ? 1 : 0;
  }
  const idx = [];
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const p = j * nx + i, q = p + nx; if (keep[p] || keep[p + 1] || keep[q] || keep[q + 1]) idx.push(p, q, p + 1, p + 1, q, q + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: strataTexture(), roughness: 0.95, vertexColors: true }));
  m.castShadow = m.receiveShadow = true; m.name = 'canyon'; scene.add(m);
  // plain ground far beyond the land that is shaped, and the sun's shadow has to see the walls too
  const far = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshStandardMaterial({ color: 0xee9f66, roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.y = -2; scene.add(far);
  Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190, far: 520 }); sun.shadow.camera.updateProjectionMatrix();
}

// ---------- the Ice Hollow: the ice lies in its basin, below the ground round it ----------
const ICE_Y = -0.5;
function iceSurface({ scene }) {
  const [a0, t0, ra, rt] = ICE, c = document.createElement('canvas'); c.width = 768; c.height = 448; const x = c.getContext('2d'), r = rng(3);
  const gr = x.createRadialGradient(300, 180, 20, 384, 224, 420); gr.addColorStop(0, '#f2fbff'); gr.addColorStop(0.55, '#cfeeff'); gr.addColorStop(1, '#a6d6f1');
  x.fillStyle = gr; x.fillRect(0, 0, 768, 448);
  x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineCap = 'round';
  for (let k = 0; k < 11; k++) { let px = 80 + r() * 608, py = 60 + r() * 328, dir = r() * 6.3; for (let i = 0; i < 10; i++) { const nxp = px + Math.cos(dir) * 26, nyp = py + Math.sin(dir) * 26; x.lineWidth = 5 - i * 0.4; x.beginPath(); x.moveTo(px, py); x.lineTo(nxp, nyp); x.stroke(); px = nxp; py = nyp; dir += (r() - 0.5) * 1.1; } }
  x.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(100 + r() * 568, 70 + r() * 308, 50 + r() * 60, 12 + r() * 10, -0.5, 0, 7); x.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const N = 64, K = 1.1, pos = [], uv = [], idx = [], [cx, cz] = P(a0, t0);
  pos.push(cx, ICE_Y, cz); uv.push(0.5, 0.5);
  for (let i = 0; i < N; i++) { const q = i / N * Math.PI * 2, wv = (1 + 0.07 * Math.sin(q * 3 + 1) + 0.05 * Math.sin(q * 5 + 2)) * K, da = Math.cos(q) * wv, dt = Math.sin(q) * wv, [px, pz] = P(a0 + da * ra, t0 + dt * rt); pos.push(px, ICE_Y, pz); uv.push(0.5 + da / 2.5, 0.5 - dt / 2.5); }
  for (let i = 0; i < N; i++) idx.push(0, 1 + (i + 1) % N, 1 + i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22 })); m.receiveShadow = true; m.name = 'ice'; scene.add(m);
}
function iceBlocks({ scene, flat }, shape, r) {
  const ice = flat(0xdff5ff, { roughness: 0.25 }), [a0, t0, ra, rt] = ICE;
  for (let k = 0; k < 10; k++) { const q = r() * 6.3, s = 0.5 + r() * 0.9, a = a0 + Math.cos(q) * ra * (0.78 + r() * 0.3), t = t0 + Math.sin(q) * rt * (0.78 + r() * 0.3), m = box(s * 1.4, s, s * 1.1, ice, 0.25), [x, z] = P(a, t); m.position.set(x, Math.max(shape.floor(a, t), ICE_Y) + s * 0.36, z); m.rotation.set((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3); scene.add(m); }
}

// ---------- the stones: lumpy boulders with flat faces, dust on top, pebbles round the big ones ----------
// A ball is pushed out and in by noise, then cut by a few planes, which leaves the flat faces a broken rock has; the
// edges stay soft. The top of every stone is paler (dust lies on it), the underside darker.
function rockShapes(r) {
  const shapes = [], n = noise2(61);
  for (let v = 0; v < 8; v++) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, 3)), p = g.attributes.position, q = new THREE.Vector3();
    const sx = 0.85 + r() * 0.45, sz = 0.85 + r() * 0.45, sy = 0.55 + r() * 0.32;
    const cuts = Array.from({ length: 4 + (r() * 4 | 0) }, () => { const c = new THREE.Vector3(r() - 0.5, r() * 0.9 - 0.15, r() - 0.5).normalize(); return [c, 0.6 + r() * 0.28]; });
    for (let i = 0; i < p.count; i++) {
      q.fromBufferAttribute(p, i);
      q.multiplyScalar(1 + 0.42 * (fbm(n, q.x * 1.5 + v * 9 + q.z * 0.8, q.y * 1.5 - q.z * 0.6, 3) - 0.5));
      for (const [c, d] of cuts) { const over = q.dot(c) - d; if (over > 0) q.addScaledVector(c, -over * 0.93); }
      q.set(q.x * sx, Math.max(q.y, -0.38) * sy + 0.38 * sy, q.z * sz);
      p.setXYZ(i, q.x, q.y, q.z);
    }
    g.computeVertexNormals();
    const nor = g.attributes.normal, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const up = nor.getY(i), shade = 0.74 + 0.34 * smooth((up + 0.25) / 1.1), dusty = smooth((up - 0.5) / 0.4) * 0.55;
      col[i * 3] = shade * (1 + dusty * 0.3); col[i * 3 + 1] = shade * (1 + dusty * 0.42); col[i * 3 + 2] = shade * (1 + dusty * 0.5);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    shapes.push(g);
  }
  return shapes;
}
function betterRocks({ scene }, shape) {
  const r = rng(73), shapes = rockShapes(r), tones = [0xc8744e, 0xb5613d, 0xd68a5f, 0xa9583a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, vertexColors: true }));
  const placed = [];
  const put = (x, z, k) => {
    const m = new THREE.Mesh(shapes[r() * shapes.length | 0], tones[r() * tones.length | 0]), [a, t] = AT(x, z);
    m.scale.set(k * (0.92 + r() * 0.2), k * (0.85 + r() * 0.35), k * (0.92 + r() * 0.2)); m.position.set(x, shape.land(a, t) - 0.07 * k, z); m.rotation.y = r() * 6.3;
    m.castShadow = m.receiveShadow = true; m.userData.detail = true; scene.add(m);
    if (shape.outside(a, t) < 0) placed.push([a, t, k]);
  };
  const around = (x, z, k) => { for (let i = 0, c = k > 1.05 ? 2 + (r() * 3 | 0) : r() < 0.45 ? 1 : 0; i < c; i++) { const q = r() * 6.3, d = k * (1.05 + r() * 0.9); put(x + Math.cos(q) * d, z + Math.sin(q) * d, k * (0.13 + r() * 0.2)); } };
  // every stone of the map gives its place to a new one; about a quarter are left out, so the ground breathes
  for (const m of [...scene.children]) {
    if (!m.isMesh || m.geometry.type !== 'IcosahedronGeometry' || m.userData.detail || !m.visible) continue;
    m.visible = false;
    if (r() < 0.26) continue;
    const k = m.scale.x * (0.8 + r() * 0.55);
    put(m.position.x, m.position.z, k); around(m.position.x, m.position.z, k);
  }
  // fallen stones under the walls, a few on the ledges and on the plain above
  for (let i = 0; i < 150; i++) {
    const side = r() < 0.5 ? -1 : 1, t = HEAD + r() * 190, [x, z] = P(side * (shape.halfW(t, side) - 2 - r() * r() * 9), t), k = 0.35 + r() * r() * 1.9;
    put(x, z, k); if (k > 1.2) around(x, z, k);
  }
  for (let i = 0; i < 110; i++) {
    const side = r() < 0.5 ? -1 : 1, t = HEAD + r() * 210, step = r() * 3 | 0, out = step < 2 ? RISE * (step + 0.5 + r() * 0.42) / STEPS : RISE + 5 + r() * 45;
    const [x, z] = P(side * (shape.halfW(t, side) + out), t), k = 0.3 + r() * r() * 1.5;
    put(x, z, k); if (k > 1.1) around(x, z, k);
  }
  return placed;
}

// ---------- the service channel: water and power under covers along the streets, a box at every building ----------
function lines({ scene, flat, glow, blocks, NIGHT }) {
  const base = flat(0x6b4a36), cover = flat(0xf7e6cc), cream = flat(0xfbf3e6), orange = flat(0xff8b3d), teal = glow(0x33d1a8, NIGHT ? 2.2 : 1.2);
  const O = 1.35, RUNS = [   // [x1, z1, x2, z2]: beside the streets round the Ark and out to the panels and the batteries
    [8 - O, -24 - O, 8 - O, 40], [-24 - O, 8 - O, 40, 8 - O], [24 - O, 8 - O, 24 - O, 24], [-24 - O, -24 - O, 8 - O, -24 - O], [-24 - O, -24 - O, -24 - O, 8 - O],
  ];
  const run = (x1, z1, x2, z2, flush = false) => {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1), L = Math.hypot(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, turn = alongX ? 0 : Math.PI / 2;
    const b = box(L + 0.5, 0.08, 0.5, base, 0.03); b.position.set(mx, flush ? 0.09 : 0.11, mz); b.rotation.y = turn; scene.add(b);
    const n = Math.max(1, Math.round(L / 2));
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, p = box(L / n - 0.1, 0.08, 0.52, cover, 0.03); p.position.set(x1 + (x2 - x1) * f, flush ? 0.12 : 0.16, z1 + (z2 - z1) * f); p.rotation.y = turn; scene.add(p); }
  };
  for (const q of RUNS) run(...q);
  // the nearest point of the channel to a place, and a box at the kerb of every building that has work in it
  const near = (x, z) => { let best = null; for (const [x1, z1, x2, z2] of RUNS) { const dx = x2 - x1, dz = z2 - z1, f = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz))), px = x1 + dx * f, pz = z1 + dz * f, d = Math.hypot(px - x, pz - z); if (!best || d < best[2]) best = [px, pz, d]; } return best; };
  for (const b of blocks) {
    let [px, pz] = near(b.cx, b.cz);
    // the side of the plot that looks at the channel, and the box on its kerb
    const dx = px - b.cx, dz = pz - b.cz, half = b.half || 6.2, sideX = Math.abs(dx) > Math.abs(dz);
    const kx = sideX ? b.cx + Math.sign(dx) * half : Math.max(b.cx - half + 1.2, Math.min(b.cx + half - 1.2, px));
    const kz = sideX ? Math.max(b.cz - half + 1.2, Math.min(b.cz + half - 1.2, pz)) : b.cz + Math.sign(dz) * half;
    [px, pz] = near(kx, kz);
    if (Math.hypot(px - kx, pz - kz) > 0.7) run(px, pz, kx, kz, true);          // across the street, flush with it
    const g = new THREE.Group(), body = box(0.9, 0.7, 0.6, cream, 0.12), band = box(0.94, 0.1, 0.64, orange, 0.04), lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), teal);
    body.position.y = 0.35; band.position.y = 0.5; lamp.position.y = 0.76; g.add(body, band, lamp);
    g.position.set(kx, 0.3, kz); g.rotation.y = sideX ? Math.PI / 2 : 0; scene.add(g);
  }
}

// ---------- the collector robot coming home along its tracks ----------
async function rover({ scene, gltf }, shape) {
  const root = (await gltf.loadAsync('models/kk/rover.glb')).scene;
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m.metalness = 0; m.roughness = Math.max(0.5, m.roughness ?? 0.6); } } });
  const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3()), k = 3.4 / Math.max(s.x, s.z), c = b.getCenter(new THREE.Vector3());
  root.scale.setScalar(k); root.position.set(-c.x * k, -b.min.y * k, -c.z * k);
  const g = new THREE.Group(); g.add(root);
  const [a, t, q] = along(TRACK, 0.33), [x, z] = P(a, t), [hx, hz] = P(-Math.cos(q), -Math.sin(q));   // heading home, up the track
  g.position.set(x, shape.floor(a, t) + 0.02, z); g.rotation.y = Math.atan2(hx, hz); g.name = 'rover'; scene.add(g);
}

// ---------- the edge of the closed zone: stakes with flags along the last street, and a sign ----------
function zone({ scene, flat, glow, allBlocks, NIGHT }) {
  const pole = flat(0x2f3346), flag = flat(0xff8b3d), cream = flat(0xfbf3e6), teal = glow(0x33d1a8, NIGHT ? 2.2 : 1.2);
  const stake = (x, z) => {
    const g = new THREE.Group(), p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.9, 8), pole), f = box(0.62, 0.36, 0.04, flag, 0.02), l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), teal);
    p.position.y = 0.95; f.position.set(0.33, 1.62, 0); l.position.y = 1.95; p.castShadow = true; g.add(p, f, l); g.position.set(x, 0.05, z); g.rotation.y = Math.PI / 4; scene.add(g);
  };
  const key = (i, j) => `${i},${j}`, state = new Map(allBlocks.map(b => [key(Math.round(b.cx / 16), Math.round(b.cz / 16)), b]));
  for (const b of allBlocks) {
    if (!b.built) continue;
    const i = Math.round(b.cx / 16), j = Math.round(b.cz / 16);
    // a side that looks up the canyon at a block that is still closed
    for (const [di, dj] of [[-1, 0], [0, -1]]) { const n = state.get(key(i + di, j + dj)); if (n && !n.built) for (const u of [-5, 0, 5]) stake(b.cx + (di ? di * 8.7 : u), b.cz + (dj ? dj * 8.7 : u)); }
  }
  // the sign at the head of the street that runs up into the zone
  const c = document.createElement('canvas'); c.width = 512; c.height = 192; const x = c.getContext('2d');
  x.fillStyle = '#fbf3e6'; x.fillRect(0, 0, 512, 192); x.fillStyle = '#ff8b3d'; x.fillRect(0, 0, 512, 34);
  x.fillStyle = '#3b2618'; x.font = '900 78px Nunito, sans-serif'; x.textAlign = 'center'; x.fillText('ZONE II', 256, 112); x.font = '800 36px Nunito, sans-serif'; x.fillStyle = '#9a7a62'; x.fillText('opens with research', 256, 162);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(), board = box(3.2, 1.2, 0.14, cream, 0.06), face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  board.position.y = 2.0; face.position.set(0, 2.0, 0.08); g.add(board, face);
  for (const u of [-1.2, 1.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 8), pole); p.position.set(u, 0.8, 0); p.castShadow = true; g.add(p); }
  g.position.set(-24, 0.05, -42.5); g.rotation.y = Math.PI / 4; scene.add(g);
}

// ---------- the dust over the closed zone: a blanket of soft layers that lies on the ground ----------
// Each layer is a sheet at its own height with holes of its own; seen from the map's camera the upper ones slide over the
// lower ones, so the dust has depth, stones stand up out of it, and nothing is cut by the ground as the flat pictures were.
function dustBlanket({ scene, NIGHT }, shape) {
  const W = 2 * FLOOR + 40, T0 = -176, T1 = -30, L = T1 - T0, PX = 4, w = W * PX, h = L * PX;
  // Three thin layers of haze near the ground, then four of billows with real gaps between them. Under each layer of
  // billows lies its own shade, pushed away from the sun, so the billows look lit from the left like everything else.
  //   height, strength, gaps (0 = none), colour, seed, pushed by (across, along)
  const HAZE = [246, 208, 172], LIT = [[252, 226, 198], [254, 234, 210], [255, 240, 222], [255, 246, 232]], SHADE = [218, 164, 126];
  const layers = [[0.4, 0.3, 0, HAZE, 0, 0, 0], [1.1, 0.28, 0, HAZE, 1, 0, 0], [2.0, 0.26, 0, [249, 216, 184], 2, 0, 0]];
  [[3.2, 0.52, 0.47], [4.9, 0.5, 0.5], [6.8, 0.46, 0.53], [8.8, 0.38, 0.57]].forEach(([y, st, gaps], k) => {
    layers.push([y - 0.3, st * 0.78, gaps, SHADE, 3 + k, 2.8, 1.5], [y, st * 1.12, gaps, LIT[k], 3 + k, 0, 0]);
  });
  layers.forEach(([y, strength, gaps, col, seed, da, dt], order) => {
    const n = noise2(100 + seed * 13), c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const a = i / PX - W / 2 - da, t = T0 + j / PX - dt, side = a < 0 ? -1 : 1;
      // where the dust begins: a little beyond the last street, the higher layers further back, the edge wavy
      const front = -47 - seed * 2.2 + (fbm(n, a * 0.05 + 3, 1.3, 2) - 0.5) * 16;
      const dens = smooth((front - t) / 15) * smooth((shape.halfW(Math.max(t, HEAD), side) + 5 - Math.abs(a)) / 10) * smooth((t - T0) / 12);
      if (dens <= 0.002) continue;
      const f = fbm(n, a * 0.04 + seed * 7.3, t * 0.056 - seed * 3.1, 4);
      const wisp = clamp((f - 0.42 + dens * 0.95) * 3.6), body = gaps ? clamp((f - gaps) * 5.2 + 0.32) : 0.6 + 0.4 * clamp((f - 0.4) * 3 + 0.5);
      const o = (j * w + i) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255 * strength * Math.pow(dens, 0.7) * wisp * body;
    }
    x.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: NIGHT ? 0x56596e : 0xffffff }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 4 + order;
    const g = new THREE.Group(), [px, pz] = P(0, (T0 + T1) / 2); g.add(m); g.rotation.y = Math.PI / 4; g.position.set(px, y, pz); scene.add(g);
  });
}

// the map's own stones that would lie on the ice or on the robot's tracks are put away
function clearStones(scene) {
  for (const m of scene.children) {
    if (!m.isMesh || m.geometry.type !== 'IcosahedronGeometry' || m.userData.detail) continue;
    const [a, t] = AT(m.position.x, m.position.z);
    if (((a - ICE[0]) / (ICE[2] * 1.4)) ** 2 + ((t - ICE[1]) / (ICE[3] * 1.5)) ** 2 < 1) m.visible = false;
    for (let i = 0; i <= 60; i++) { const [ta, tt] = along(TRACK, i / 60); if (Math.hypot(a - ta, t - tt) < 2.6 + m.scale.x) { m.visible = false; break; } }
  }
}

export async function addDetails(ctx) {
  const shape = canyonShape(ctx.allBlocks), flatGround = ctx.scene.getObjectByName('ground');
  if (flatGround) flatGround.visible = false;                    // the flat sheet the map had for ground
  clearStones(ctx.scene);
  const placed = betterRocks(ctx, shape);
  const field = floorField(shape);
  floorMesh(ctx, field, paintFloor(shape, placed, field));
  canyonLand(ctx, shape);
  iceSurface(ctx); iceBlocks(ctx, shape, rng(7));
  dustBlanket(ctx, shape);
  lines(ctx);
  await rover(ctx, shape);
  zone(ctx);
}
