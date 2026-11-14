// Ideas for the map and its details (Joro, 14.11.2026: "now let's change the map, the details; propose some things").
// Nothing here is decided. map.html?ideas=all#lvl10 turns every idea on; ?ideas=canyon,ground picks some:
//   canyon  the walls of the canyon on both sides and at its head, in layers, with the quartz and iron the mine digs
//   ground  the bare ground: wind ripples, dry cracks, small craters, loose stones under the walls
//   ice     the Ice Hollow at the low end of the canyon (the clay pit of level 13 stands on its shore)
//   lines   a covered service channel along the streets for the water and the power, with a box at every building
//   rover   the collector robot on its way back, and the tracks it has worn into the plain
//   zone    the edge of the closed zone: stakes with flags and a sign
// The random numbers here are their own, so nothing of the map itself moves.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const R2 = Math.SQRT1_2;
// the canyon's own directions: a across it (to the right of the screen), t along it (towards the camera)
export const P = (a, t) => [(a + t) * R2, (t - a) * R2];
const AT = (x, z) => [(x - z) * R2, (x + z) * R2];
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const box = (w, h, d, mat, r = 0.3, seg = 3) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), mat); m.castShadow = m.receiveShadow = true; return m; };

const FLOOR = 52;   // half the width of the canyon floor, metres
const HEAD = -100;  // where the round head of the canyon begins

// ---------- the canyon: cliffs in layers on both sides and round its head, the land above them ----------
const TOP = 23;     // how high the land above the canyon lies
function canyon({ scene, flat, sun }) {
  const r = rng(11), layers = [flat(0xcf7a52), flat(0xe39a6a), flat(0xb9643f), flat(0xd98a5e)], top = flat(0xeaa878);
  let n = 0;
  // a stretch of cliff whose foot is at (a, t), facing (na, nt); its layers end at heights of their own, its top is the land
  const quartz = flat(0xf1e6ff, { roughness: 0.45 }), iron = flat(0x8a4a36);
  const piece = (a, t, na, nt, len, depth, h = TOP, low = false, ore = false) => {
    const g = new THREE.Group(), y1 = h * (0.24 + r() * 0.12), y2 = y1 + h * (0.07 + r() * 0.06), y3 = y2 + h * (0.2 + r() * 0.12);
    const cut = low ? [0, y1 + (h - y1) * 0.5, h] : [0, y1, y2, y3, h + (n++ % 7) * 0.03], back = [1, 0.95 - r() * 0.03, 0.87 - r() * 0.05, 0.76 - r() * 0.08];
    for (let k = 0; k + 1 < cut.length; k++) {
      const hh = cut[k + 1] - cut[k], last = k + 2 === cut.length, d = depth * back[k], l = len * (last && !low ? 1.28 : 1 - k * 0.04) * (0.96 + r() * 0.08);
      const m = box(l, hh + 1.6, d, last && !low ? top : ore && k === 1 ? quartz : ore && k === 2 ? iron : layers[low ? k * 2 : k], Math.min(3, hh / 2.1), 4);
      m.position.set((r() - 0.5) * 2, cut[k] + hh / 2 - 0.8, -depth + d / 2);   // the backs stay in line, the fronts step back
      g.add(m);
    }
    const [x, z] = P(a, t), [wx, wz] = P(na, nt);
    g.position.set(x, 0, z); g.rotation.y = Math.atan2(wx, wz) + (r() - 0.5) * 0.28; scene.add(g);
  };
  for (const side of [-1, 1]) for (let t = HEAD - 4; t < 150;) {
    const len = 18 + r() * 16, a = side * (FLOOR + r() * 9);
    piece(a, t + len / 2, -side, 0, len + 5, 34, TOP, false, side < 0 && t + len > -22 && t < 30);   // by the mine: what it digs
    if (r() < 0.38) piece(a - side * (4 + r() * 5), t + len / 2 + (r() - 0.5) * 8, -side, 0, 9 + r() * 9, 14, 8 + r() * 7, true);   // a lower step in front
    t += len;
  }
  for (let q = -86; q <= 86;) {
    const th = q * Math.PI / 180, s = Math.sin(th), c = Math.cos(th), R = 58 + r() * 12;
    piece(R * s, HEAD - R * c, -s, c, 28 + r() * 8, 34);
    if (r() < 0.3) piece((R - 6) * s, HEAD - (R - 6) * c, -s, c, 12, 14, 9 + r() * 6, true);
    q += 17 + r() * 8;
  }
  // the land above the canyon, behind the cliffs, and more ground beyond the edge of the map
  const land = (a, t, w, d) => { const m = box(w, 24, d, top, 3, 3); const [x, z] = P(a, t); m.position.set(x, TOP - 12.3, z); m.rotation.y = Math.PI / 4; m.castShadow = false; scene.add(m); };
  land(-(FLOOR + 28 + 300), 20, 600, 900); land(FLOOR + 28 + 300, 20, 600, 900); land(0, HEAD - 58 - 28 - 300, 900, 600);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), flat(0xee9f66, { roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.y = -0.03; far.receiveShadow = true; scene.add(far);
  // the morning shadow of the left wall reaches the floor: the sun's shadow has to see the walls too
  Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190, far: 520 }); sun.shadow.camera.updateProjectionMatrix();
  // loose stones at the foot of the cliffs
  const stone = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 110; i++) {
    const side = r() < 0.5 ? -1 : 1, s = 0.5 + r() * 1.6, m = new THREE.Mesh(stone, layers[r() < 0.5 ? 0 : 2]), [x, z] = P(side * (FLOOR - 1 - r() * 6), HEAD + r() * 240);
    m.scale.set(s * (0.9 + r() * 0.4), s * (0.5 + r() * 0.3), s * (0.9 + r() * 0.4)); m.position.set(x, s * 0.2, z); m.rotation.y = r() * 6; m.castShadow = m.receiveShadow = true; m.userData.idea = true; scene.add(m);
  }
}

// ---------- the bare ground, drawn once on a sheet that lies on it ----------
// 8 pixels to the metre, 128 m across and 272 m along; the streets and the plots lie over it
const PXM = 8, GW = 128, GL = 272;
const gx = a => (a + GW / 2) * PXM, gy = t => (t + GL / 2) * PXM;
function groundSheet({ scene }, draw) {
  const c = document.createElement('canvas'); c.width = GW * PXM; c.height = GL * PXM;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(GW, GL), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.renderOrder = 1;
  const g = new THREE.Group(); g.add(m); g.rotation.y = Math.PI / 4; g.position.y = 0.015; scene.add(g);
}
function drawGround(x, r) {
  // wind ripples: short waves in fields that fade at their edges
  for (const [a0, t0, w, l] of [[-14, 84, 30, 16], [22, 104, 34, 18], [-34, 112, 24, 14], [6, 124, 30, 12], [-46, -18, 10, 30], [47, 14, 9, 34], [46, 66, 10, 26], [-44, -84, 16, 22], [40, -96, 18, 20], [2, -118, 34, 14], [34, 84, 20, 14]]) {
    const turn = (r() - 0.5) * 0.5;
    for (let k = 0; k < l / 1.5; k++) {
      const v = k * 1.5 - l / 2, ph = r() * 6;
      for (let u = -w / 2; u < w / 2; u += 1) {
        const fade = Math.max(0, 1 - (2 * u / w) ** 2) * Math.max(0, 1 - (2 * v / l) ** 2);
        if (fade < 0.05) continue;
        const pt = uu => { const vv = v + Math.sin(uu * 0.45 + ph) * 0.5, c = Math.cos(turn), s = Math.sin(turn); return [gx(a0 + uu * c - vv * s), gy(t0 + uu * s + vv * c)]; };
        const [x1, y1] = pt(u), [x2, y2] = pt(u + 1.05);
        x.strokeStyle = `rgba(255,224,184,${0.42 * fade})`; x.lineWidth = 3.2; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
        x.strokeStyle = `rgba(186,104,66,${0.28 * fade})`; x.lineWidth = 2.2; x.beginPath(); x.moveTo(x1, y1 + 3.4); x.lineTo(x2, y2 + 3.4); x.stroke();
      }
    }
  }
  // dry cracks: a few patches of branching lines
  x.lineCap = 'round';
  for (const [a0, t0, n] of [[30, 70, 7], [-40, 62, 6], [14, 92, 6], [-8, 108, 7], [44, -40, 5], [-46, 22, 5], [-30, -70, 6], [24, -74, 6]]) {
    for (let k = 0; k < n; k++) {
      let a = a0 + (r() - 0.5) * 7, t = t0 + (r() - 0.5) * 7, dir = r() * 6.3;
      const walk = (a, t, dir, len, wd) => { for (let i = 0; i < len; i++) { const na = a + Math.cos(dir) * 0.9, nt = t + Math.sin(dir) * 0.9; x.strokeStyle = `rgba(160,86,54,${0.3 * (1 - i / len) + 0.08})`; x.lineWidth = wd; x.beginPath(); x.moveTo(gx(a), gy(t)); x.lineTo(gx(na), gy(nt)); x.stroke(); a = na; t = nt; dir += (r() - 0.5) * 0.9; if (r() < 0.12 && len > 3) walk(a, t, dir + (r() < 0.5 ? 1 : -1), len >> 1, wd * 0.8); } };
      walk(a, t, dir, 5 + (r() * 6 | 0), 1.7);
    }
  }
  // small craters: a darker bowl, a pale rim on the sunny side
  for (const [a0, t0, rad] of [[-30, 98, 5.2], [28, 86, 3.4], [40, -66, 4.2], [-42, 40, 2.6], [10, 116, 2.4]]) {
    const cx = gx(a0), cy = gy(t0), R = rad * PXM, g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
    g.addColorStop(0, 'rgba(176,96,62,.55)'); g.addColorStop(0.62, 'rgba(190,108,70,.42)'); g.addColorStop(0.8, 'rgba(255,222,180,.6)'); g.addColorStop(1, 'rgba(255,222,180,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, R * 1.25, R * 1.25 * 0.86, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(150,80,52,.35)'; x.lineWidth = 3; x.beginPath(); x.ellipse(cx, cy + R * 0.06, R * 0.66, R * 0.56, 0, 3.5, 6.0); x.stroke();
  }
  // darker, stony ground under the walls
  for (let i = 0; i < 2600; i++) { const side = r() < 0.5 ? -1 : 1, a = side * (FLOOR - 8 * r() * r()), t = -130 + r() * 262; x.fillStyle = `rgba(170,92,60,${0.16 + r() * 0.3})`; x.beginPath(); x.ellipse(gx(a), gy(t), 1.5 + r() * 5, 1 + r() * 3, r() * 3, 0, 7); x.fill(); }
}

// ---------- the Ice Hollow, at the low end of the canyon ----------
const ICE = [-22, 76, 17, 9.5];   // across, along, half-width, half-length
function drawIce(x, r) {
  const [a0, t0, ra, rt] = ICE, cx = gx(a0), cy = gy(t0), blob = k => { x.beginPath(); for (let i = 0; i <= 48; i++) { const q = i / 48 * Math.PI * 2, w = 1 + 0.07 * Math.sin(q * 3 + 1) + 0.05 * Math.sin(q * 5 + 2); x.lineTo(cx + Math.cos(q) * ra * PXM * w * k, cy + Math.sin(q) * rt * PXM * w * k); } x.closePath(); };
  x.fillStyle = 'rgba(160,86,56,.38)'; blob(1.16); x.fill();                       // the damp, darker bank
  x.fillStyle = 'rgba(255,236,208,.75)'; blob(1.06); x.fill();                     // frost on the shore
  const g = x.createRadialGradient(cx - 30, cy - 20, 10, cx, cy, ra * PXM); g.addColorStop(0, '#eefaff'); g.addColorStop(0.6, '#cfeeff'); g.addColorStop(1, '#a9d8f2');
  x.fillStyle = g; blob(1); x.fill();
  x.save(); blob(1); x.clip();
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineCap = 'round';
  for (let k = 0; k < 9; k++) { let a = a0 + (r() - 0.5) * ra * 1.4, t = t0 + (r() - 0.5) * rt * 1.4, dir = r() * 6.3; for (let i = 0; i < 9; i++) { const na = a + Math.cos(dir) * 1.3, nt = t + Math.sin(dir) * 1.3; x.lineWidth = 2.6 - i * 0.2; x.beginPath(); x.moveTo(gx(a), gy(t)); x.lineTo(gx(na), gy(nt)); x.stroke(); a = na; t = nt; dir += (r() - 0.5) * 1.1; } }
  x.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(cx + (r() - 0.5) * ra * PXM * 1.2, cy + (r() - 0.5) * rt * PXM * 1.1, 26 + r() * 30, 7 + r() * 6, -0.5, 0, 7); x.fill(); }
  x.restore();
}
function iceBlocks({ scene, flat }, r) {
  const ice = flat(0xdff5ff, { roughness: 0.25 }), [a0, t0, ra, rt] = ICE;
  for (let k = 0; k < 9; k++) { const q = r() * 6.3, s = 0.5 + r() * 0.9, m = box(s * 1.4, s, s * 1.1, ice, 0.25), [x, z] = P(a0 + Math.cos(q) * ra * (0.86 + r() * 0.2), t0 + Math.sin(q) * rt * (0.86 + r() * 0.2)); m.position.set(x, s * 0.4, z); m.rotation.set((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3); scene.add(m); }
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

// ---------- the collector robot coming home, and its tracks ----------
const TRACK = [[0, 58], [3, 66], [9, 76], [18, 90], [30, 104], [46, 122], [60, 136]];
function along(pts, f) { const n = pts.length - 1, k = Math.min(n - 1, Math.floor(f * n)), u = f * n - k, [a1, t1] = pts[k], [a2, t2] = pts[k + 1]; return [a1 + (a2 - a1) * u, t1 + (t2 - t1) * u, Math.atan2(t2 - t1, a2 - a1)]; }
function drawTracks(x, r) {
  x.lineCap = 'round';
  for (const off of [-0.85, 0.85]) for (let pass = 0; pass < 3; pass++) {
    const sway = (r() - 0.5) * 0.5;
    x.strokeStyle = pass ? 'rgba(176,96,62,.22)' : 'rgba(160,84,54,.5)'; x.lineWidth = pass ? 2.2 : 3.2; x.beginPath();
    for (let i = 0; i <= 120; i++) { const [a, t, q] = along(TRACK, i / 120), o = off + (pass ? sway + Math.sin(i * 0.3 + pass) * 0.25 : 0); x.lineTo(gx(a - Math.sin(q) * o), gy(t + Math.cos(q) * o)); }
    x.stroke();
  }
}
async function rover({ scene, gltf }) {
  const root = (await gltf.loadAsync('models/kk/rover.glb')).scene;
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m.metalness = 0; m.roughness = Math.max(0.5, m.roughness ?? 0.6); } } });
  const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3()), k = 3.4 / Math.max(s.x, s.z), c = b.getCenter(new THREE.Vector3());
  root.scale.setScalar(k); root.position.set(-c.x * k, -b.min.y * k, -c.z * k);
  const g = new THREE.Group(); g.add(root);
  const [a, t, q] = along(TRACK, 0.33), [x, z] = P(a, t), [hx, hz] = P(-Math.cos(q), -Math.sin(q));   // heading home, up the track
  g.position.set(x, 0.02, z); g.rotation.y = Math.atan2(hx, hz); g.name = 'rover'; scene.add(g);
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

// the map's own stones that would lie on the ice or on the robot's tracks are put away
function clearStones(scene, ice, tracks) {
  for (const m of scene.children) {
    if (!m.isMesh || m.geometry.type !== 'IcosahedronGeometry' || m.userData.idea) continue;
    const [a, t] = AT(m.position.x, m.position.z);
    if (ice && ((a - ICE[0]) / (ICE[2] * 1.18)) ** 2 + ((t - ICE[1]) / (ICE[3] * 1.25)) ** 2 < 1) m.visible = false;
    if (tracks) for (let i = 0; i <= 60; i++) { const [ta, tt] = along(TRACK, i / 60); if (Math.hypot(a - ta, t - tt) < 2.6 + m.scale.x) { m.visible = false; break; } }
  }
}

export async function addIdeas(ctx, on) {
  const has = k => on.has('all') || on.has(k), r = rng(29);
  if (has('canyon')) canyon(ctx);
  if (has('ground') || has('ice') || has('rover')) groundSheet(ctx, x => { if (has('ground')) drawGround(x, r); if (has('rover')) drawTracks(x, rng(5)); if (has('ice')) drawIce(x, rng(3)); });
  if (has('ice')) iceBlocks(ctx, rng(7));
  if (has('lines')) lines(ctx);
  if (has('rover')) await rover(ctx);
  if (has('zone')) zone(ctx);
  clearStones(ctx.scene, has('ice'), has('rover'));
}
