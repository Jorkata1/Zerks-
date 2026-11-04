// Zerks-X6 colony buildings in the style of the CellCog Ark and carbon drill: cream hulls, orange bands,
// navy rings, round windows and rounded grey bases. Each kind has its own shape so it reads at a glance:
// houses have pitched roofs, the research lab a dome, a dish and a glowing flask, the greenhouse a glass
// tunnel with plants, the kitchen an awning and tables outside, the furnace chimneys and a glowing mouth.
// Every builder returns a group standing on y = 0; the camera sees the +x and +z sides, so the details are there.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...o });
const glow = (color, k = 1.4) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });
export const P = {
  cream: mat(0xfbf3e6), cream2: mat(0xefe2cf), orange: mat(0xff7a2e), navy: mat(0x2f3346), navy2: mat(0x4a5068),
  pad: mat(0xd9d5de), padEdge: mat(0xbdb8c4), window: mat(0x2c4a72, { roughness: 0.25 }), teal: glow(0x5fe3d0), warm: glow(0xffd58a, 1.1),
  fire: glow(0xff8a3a, 2.2), grow: glow(0xd38cff, 1.6), soil: mat(0x9a6440), wood: mat(0xc98b55), barn: mat(0xe8603c), white: mat(0xffffff),
  silicon: mat(0x9fb4d8, { roughness: 0.3 }), carbon: mat(0x2e2c33), tomato: mat(0xff5d4a), leaf: [mat(0x5fbf47), mat(0x7ad35a), mat(0x4aa83f)],
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
};
const ballGeo = new THREE.SphereGeometry(1, 16, 12);

// ---------- primitives ----------
function box(g, w, h, d, m, x, y, z, r = 0.3) { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), m); o.position.set(x, y, z); g.add(o); return o; }
function cyl(g, rt, rb, h, m, x, y, z, o = {}) { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 28, 1, !!o.open, o.ts || 0, o.tl || Math.PI * 2), m); c.position.set(x, y, z); g.add(c); return c; }
function ball(g, r, m, x, y, z, sy = 1) { const b = new THREE.Mesh(ballGeo, m); b.scale.set(r, r * sy, r); b.position.set(x, y, z); g.add(b); return b; }
function band(g, r, t, m, x, y, z) { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 40), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); g.add(o); return o; }
// a round window: a navy (or lit) disk with a cream rim, on the +z or the +x side
function port(g, x, y, z, r, face = 'z', lit = false) {
  const p = new THREE.Group();
  p.add(new THREE.Mesh(new THREE.CircleGeometry(r, 24), lit ? P.warm : P.window));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.2, 8, 24), P.cream); p.add(rim);
  p.position.set(x, y, z); if (face === 'x') p.rotation.y = Math.PI / 2; g.add(p); return p;
}
// a pitched roof: a rounded triangular prism, the gable towards +z
function roof(g, w, h, d, m, x, y, z) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14, bevelSegments: 3 }); geo.translate(0, 0, -d / 2);
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o;
}
// the rounded grey base the CellCog drill stands on
function base(g, w, d) { box(g, w, 0.3, d, P.padEdge, 0, 0.15, 0, 0.6); box(g, w - 0.4, 0.32, d - 0.4, P.pad, 0, 0.22, 0, 0.5); return 0.38; }
function door(g, x, z, face = 'z', y0 = 0) { const d = face === 'z' ? box(g, 0.95, 1.6, 0.14, P.navy, x, y0 + 0.85, z, 0.25) : box(g, 0.14, 1.6, 0.95, P.navy, x, y0 + 0.85, z, 0.25); return d; }
function light(g, x, y, z) { cyl(g, 0.04, 0.04, 0.8, P.navy2, x, y + 0.4, z, { seg: 6 }); ball(g, 0.12, P.teal, x, y + 0.85, z); }
const done = g => { g.traverse(m => { if (m.isMesh) { m.castShadow = !m.material.transparent; m.receiveShadow = true; } }); return g; };
let rnd = Math.random;
export const useRng = f => { rnd = f; };

// ---------- homes: a cream house with a pitched roof, a navy ring, round windows and a door ----------
export function home(roofMat = P.orange, r = rnd) {
  const g = new THREE.Group(), w = 3.4 + r() * 0.5, h = 2.2 + r() * 0.5, d = 3.2;
  box(g, w, h, d, P.cream, 0, h / 2 + 0.1, 0, 0.45);
  box(g, w + 0.14, 0.22, d + 0.14, P.navy, 0, 0.42, 0, 0.1);
  roof(g, w + 0.5, 1.5, d + 0.3, roofMat, 0, h + 0.05, 0);
  door(g, -w * 0.22, d / 2 + 0.02);
  box(g, 1.3, 0.14, 0.6, P.cream2, -w * 0.22, 0.07, d / 2 + 0.3, 0.06);
  port(g, w * 0.22, h * 0.62, d / 2 + 0.02, 0.34, 'z', r() < 0.6);
  port(g, w / 2 + 0.02, h * 0.62, -0.6, 0.32, 'x', r() < 0.5); port(g, w / 2 + 0.02, h * 0.62, 0.6, 0.32, 'x');
  cyl(g, 0.2, 0.2, 1.0, P.navy, w * 0.25, h + 1.0, -0.5, { seg: 14 }); band(g, 0.22, 0.05, P.orange, w * 0.25, h + 1.4, -0.5);
  return done(g);
}

// ---------- blocks of flats: a rounded tower with a navy ring at every floor and round windows ----------
export function flats(floors, accent = P.orange, r = rnd) {
  const g = new THREE.Group(), w = 5, fh = 1.5, h = floors * fh + 0.7;
  box(g, w, h, w, P.cream, 0, h / 2 + 0.1, 0, 1.1);
  for (let f = 1; f < floors; f++) box(g, w + 0.1, 0.14, w + 0.1, P.navy, 0, 0.25 + f * fh, 0, 0.6);
  for (let f = 0; f < floors; f++) for (const t of [-1.45, 0, 1.45]) { const y = 1.05 + f * fh; port(g, t, y, w / 2 + 0.02, 0.36, 'z', r() < 0.35); port(g, w / 2 + 0.02, y, t, 0.36, 'x', r() < 0.35); }
  box(g, w + 0.2, 0.5, w + 0.2, accent, 0, h + 0.3, 0, 0.25);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), P.glass); dome.position.set(-0.6, h + 0.55, -0.6); g.add(dome);
  ball(g, 0.8, P.leaf[r() * 3 | 0], -0.6, h + 1.15, -0.6);
  box(g, 2.4, 0.16, 1.3, accent, 0, 2.05, w / 2 + 0.55, 0.06);
  door(g, 0, w / 2 + 0.02, 'z', 0.1);
  light(g, 1.4, h + 0.55, 1.4);
  return done(g);
}

// ---------- greenhouse: a glass tunnel with navy ribs over beds of plants, a service module at the end ----------
export function greenhouse(len = 8, r = rnd) {
  const g = new THREE.Group(), y0 = base(g, len + 3.2, 5.4), R = 2.0;
  box(g, len - 0.2, 0.3, 3.4, P.soil, -0.8, y0 + 0.15, 0, 0.1);
  for (const z of [-1.05, 0, 1.05]) for (let i = 0; i < Math.round(len / 0.8); i++) {
    const x = -0.8 - len / 2 + 0.5 + i * 0.8; ball(g, 0.36 + r() * 0.08, P.leaf[r() * 3 | 0], x, y0 + 0.6, z, 0.9);
    if (z !== 0 && r() < 0.5) ball(g, 0.11, P.tomato, x + 0.2, y0 + 0.75, z + 0.25);
  }
  const tun = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 32, 1, true, 0, Math.PI), P.glass);
  tun.rotation.order = 'YXZ'; tun.rotation.y = Math.PI / 2; tun.rotation.z = Math.PI / 2; tun.position.set(-0.8, y0, 0); g.add(tun);
  for (let i = 0; i <= Math.round(len / 1.6); i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.08, 8, 32, Math.PI), P.navy); rib.rotation.y = Math.PI / 2; rib.position.set(-0.8 - len / 2 + i * len / Math.round(len / 1.6), y0, 0); g.add(rib); }
  // the service module with the door, on the end the camera sees
  const mx = -0.8 + len / 2 + 0.95;
  box(g, 1.9, 2.6, 3.8, P.cream, mx, y0 + 1.3, 0, 0.55);
  box(g, 2.0, 0.45, 3.9, P.orange, mx, y0 + 1.9, 0, 0.2);
  door(g, mx + 0.96, 0, 'x', y0);
  port(g, mx, y0 + 1.25, 1.92, 0.3, 'z', true);
  light(g, mx, y0 + 2.6, -1.2);
  return done(g);
}

// ---------- research: the main lab with an observatory dome, a dish and a tall flask of glowing liquid ----------
export function research() {
  const g = new THREE.Group(), y0 = base(g, 10, 9);
  box(g, 6.2, 2.8, 4.4, P.cream, -0.6, y0 + 1.4, -1.0, 0.6);
  box(g, 6.35, 0.5, 4.55, P.orange, -0.6, y0 + 2.1, -1.0, 0.2);
  box(g, 6.35, 0.2, 4.55, P.navy, -0.6, y0 + 0.4, -1.0, 0.1);
  door(g, 0.9, 1.22, 'z', y0);
  for (const x of [-3.0, -1.6, -0.2]) port(g, x, y0 + 1.35, 1.22, 0.36, 'z', x < -2);
  port(g, 2.52, y0 + 1.35, -0.4, 0.36, 'x', true); port(g, 2.52, y0 + 1.35, -2.0, 0.36, 'x');
  // the observatory: a round tower and a white dome with a slit
  cyl(g, 1.55, 1.55, 1.1, P.cream2, -2.3, y0 + 3.3, -1.6, { seg: 36 });
  band(g, 1.58, 0.1, P.navy, -2.3, y0 + 2.9, -1.6);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), P.white); dome.position.set(-2.3, y0 + 3.85, -1.6); g.add(dome);
  const slit = box(g, 0.45, 0.12, 2.6, P.navy, -2.3, y0 + 4.9, -1.2, 0.05); slit.rotation.x = -0.75;
  // the dish on a mast
  cyl(g, 0.12, 0.16, 1.8, P.navy2, 1.4, y0 + 3.6, -2.2, { seg: 10 });
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), P.cream); dish.material = P.cream.clone(); dish.material.side = THREE.DoubleSide; dish.rotation.set(Math.PI + 0.7, 0, 0.5); dish.position.set(1.4, y0 + 4.9, -2.2); g.add(dish);
  band(g, 0.2, 0.06, P.orange, 1.4, y0 + 4.5, -2.2);
  // the flask: a glass bottle with teal liquid, on its own ring
  const pts = [[0, 0], [1.0, 0], [1.15, 0.3], [1.15, 2.2], [0.5, 3.0], [0.45, 3.8], [0.6, 4.0]].map(([a, b]) => new THREE.Vector2(a, b));
  const flask = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), P.glass); flask.position.set(2.8, y0, 2.6); g.add(flask);
  cyl(g, 1.0, 1.0, 1.9, P.teal, 2.8, y0 + 1.05, 2.6, { seg: 24 });
  band(g, 1.18, 0.12, P.navy, 2.8, y0 + 0.15, 2.6); band(g, 1.18, 0.1, P.orange, 2.8, y0 + 2.2, 2.6);
  for (let i = 0; i < 5; i++) ball(g, 0.12 + rnd() * 0.08, P.white, 2.6 + rnd() * 0.5, y0 + 0.6 + i * 0.3, 2.6 + rnd() * 0.4);
  light(g, 2.2, y0 + 2.8, 0.6);
  return done(g);
}

// ---------- the vegetable lab: a cream module and a glass room with shelves of plants under purple grow lights ----------
export function vegLab(r = rnd) {
  const g = new THREE.Group(), y0 = base(g, 10, 7);
  box(g, 2.8, 2.8, 5.2, P.cream, -3.2, y0 + 1.4, 0, 0.55);
  box(g, 2.95, 0.45, 5.35, P.orange, -3.2, y0 + 2.0, 0, 0.2);
  door(g, -3.2, 2.62, 'z', y0); port(g, -1.78, y0 + 1.4, -1.2, 0.32, 'x', true);
  // the glass room with a navy frame
  const gx = 1.2, gw = 5.4, gh = 3.2, gd = 5.0;
  const room = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), P.glass); room.position.set(gx, y0 + gh / 2, 0); g.add(room);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.18, gh, 0.18, P.navy, gx + sx * gw / 2, y0 + gh / 2, sz * gd / 2, 0.06);
  for (const sz of [-1, 1]) box(g, gw, 0.18, 0.18, P.navy, gx, y0 + gh, sz * gd / 2, 0.06);
  for (const sx of [-1, 1]) box(g, 0.18, 0.18, gd, P.navy, gx + sx * gw / 2, y0 + gh, 0, 0.06);
  for (let lv = 0; lv < 3; lv++) {
    const y = y0 + 0.35 + lv * 0.95;
    for (const z of [-1.2, 1.2]) {
      box(g, gw - 0.8, 0.08, 1.2, P.navy2, gx, y, z, 0.03);
      box(g, gw - 0.8, 0.06, 0.12, P.grow, gx, y + 0.8, z, 0.03);
      for (let i = 0; i < 6; i++) ball(g, 0.24, P.leaf[r() * 3 | 0], gx - 2.0 + i * 0.8, y + 0.25, z, 0.8);
    }
  }
  return done(g);
}

// ---------- the kitchen: a round diner with a striped awning, a chimney and tables with umbrellas outside ----------
export function kitchen(r = rnd) {
  const g = new THREE.Group(), y0 = base(g, 10.5, 10.5), cx = -1.6, cz = -1.6;
  cyl(g, 2.8, 2.8, 2.7, P.cream, cx, y0 + 1.35, cz, { seg: 40 });
  band(g, 2.82, 0.14, P.navy, cx, y0 + 0.3, cz);
  cyl(g, 3.05, 3.05, 0.5, P.orange, cx, y0 + 2.95, cz, { seg: 40 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), P.cream2); cap.position.set(cx, y0 + 2.4, cz); g.add(cap);
  // the striped awning over the side the camera sees
  for (let i = 0; i < 10; i++) { const ts = -Math.PI / 3 + i * (Math.PI * 7 / 6) / 10; const a = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.75, 0.8, 4, 1, true, ts, (Math.PI * 7 / 6) / 10), i % 2 ? P.white : P.orange); a.material = a.material.clone(); a.material.side = THREE.DoubleSide; a.position.set(cx, y0 + 2.2, cz); g.add(a); }
  for (const a of [0.15, 0.75, 1.35]) { const x = cx + Math.sin(a) * 2.82, z = cz + Math.cos(a) * 2.82; const p = port(g, x, y0 + 1.4, z, 0.34, 'z', true); p.rotation.y = a; }
  const d = door(g, cx + Math.sin(1.0) * 2.75, cz + Math.cos(1.0) * 2.75, 'z', y0); d.rotation.y = 1.0;
  cyl(g, 0.32, 0.36, 1.6, P.navy, cx - 1.0, y0 + 3.6, cz - 1.2, { seg: 14 }); band(g, 0.36, 0.07, P.orange, cx - 1.0, y0 + 4.1, cz - 1.2);
  // tables with umbrellas in front
  for (const [x, z, um] of [[2.4, 0.2, P.orange], [0.6, 2.8, P.teal], [3.0, 3.2, P.orange]]) {
    cyl(g, 0.7, 0.7, 0.1, P.white, x, y0 + 0.85, z, { seg: 20 }); cyl(g, 0.08, 0.08, 0.85, P.navy2, x, y0 + 0.42, z, { seg: 8 });
    cyl(g, 0.05, 0.05, 2.2, P.navy2, x, y0 + 1.6, z, { seg: 6 });
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.55, 16), um); u.position.set(x, y0 + 2.75, z); g.add(u);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; cyl(g, 0.25, 0.25, 0.45, P.cream2, x + Math.cos(a) * 1.0, y0 + 0.23, z + Math.sin(a) * 1.0, { seg: 12 }); }
  }
  return done(g);
}

// ---------- the silicon furnace: a hall under a navy vault, two chimneys, a glowing mouth, silicon slabs ----------
export function smelter(r = rnd) {
  const g = new THREE.Group(), y0 = base(g, 11, 9.5);
  box(g, 6.2, 2.6, 4.6, P.cream, -0.8, y0 + 1.3, -0.8, 0.5);
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 6.3, 28, 1, false, -Math.PI / 2, Math.PI), P.navy); vault.rotation.z = Math.PI / 2; vault.position.set(-0.8, y0 + 2.5, -0.8); g.add(vault);
  box(g, 6.35, 0.22, 4.75, P.orange, -0.8, y0 + 0.5, -0.8, 0.1);
  for (const [x, z, h] of [[-2.6, -2.4, 7.5], [-1.2, -2.6, 6.2]]) { cyl(g, 0.45, 0.55, h, P.navy2, x, y0 + h / 2, z, { seg: 16 }); band(g, 0.5, 0.1, P.orange, x, y0 + h - 0.6, z); band(g, 0.52, 0.1, P.cream, x, y0 + h - 1.0, z); }
  box(g, 2.0, 1.4, 0.3, P.navy, 0.4, y0 + 0.9, 1.55, 0.2); box(g, 1.5, 0.95, 0.2, P.fire, 0.4, y0 + 0.85, 1.66, 0.15);
  port(g, 2.32, y0 + 1.5, -0.8, 0.34, 'x', true);
  // carbon goes in on the left, silicon slabs come out on the right
  for (let i = 0; i < 8; i++) ball(g, 0.35 + r() * 0.25, P.carbon, -4.4 + r() * 1.4, y0 + 0.3, 1.5 + r() * 2, 0.7);
  for (let k = 0; k < 2; k++) { box(g, 1.5, 0.15, 1.2, P.wood, 3.4, y0 + 0.08, 0.6 + k * 1.8, 0.03); for (let i = 0; i < 3; i++) box(g, 1.3, 0.22, 1.0, P.silicon, 3.4, y0 + 0.3 + i * 0.26, 0.6 + k * 1.8, 0.05); }
  light(g, 1.6, y0 + 2.6, -2.6);
  return done(g);
}

// ---------- animals: a barn with a white X door and a hayloft window; a silo for the cows; a small coop for chickens ----------
export function barn(kind = 'cow') {
  const g = new THREE.Group(), s = kind === 'chicken' ? 0.7 : 1, w = 4.0 * s, h = 2.5 * s, d = 3.4 * s;
  box(g, w, h, d, P.barn, 0, h / 2 + 0.1, 0, 0.35);
  roof(g, w + 0.4, 1.5 * s, d + 0.3, P.navy, 0, h + 0.05, 0);
  box(g, w * 0.5, h * 0.62, 0.12, P.white, 0, h * 0.36 + 0.1, d / 2 + 0.02, 0.08);
  box(g, w * 0.42, h * 0.52, 0.12, P.barn, 0, h * 0.36 + 0.1, d / 2 + 0.05, 0.06);
  for (const a of [0.85, -0.85]) { const x = box(g, 0.14, h * 0.62, 0.1, P.white, 0, h * 0.36 + 0.1, d / 2 + 0.1, 0.04); x.rotation.z = a * 0.7; }
  port(g, 0, h + 0.55 * s, d / 2 + 0.2, 0.3 * s, 'z');
  if (kind === 'cow') { cyl(g, 0.95, 0.95, 4.4, P.cream, w / 2 + 1.3, 2.3, -0.6); ball(g, 0.95, P.orange, w / 2 + 1.3, 4.5, -0.6, 0.6); band(g, 0.97, 0.08, P.navy, w / 2 + 1.3, 1.0, -0.6); band(g, 0.97, 0.08, P.navy, w / 2 + 1.3, 3.2, -0.6); }
  if (kind === 'chicken') { const ramp = box(g, 0.6, 0.08, 1.6, P.wood, w * 0.3, 0.4, d / 2 + 0.7, 0.03); ramp.rotation.x = 0.45; }
  return done(g);
}

// ---------- the fish farm hut by the pond ----------
export function hatchery() {
  const g = new THREE.Group();
  cyl(g, 1.3, 1.3, 2.0, P.cream, 0, 1.1, 0, { seg: 28 });
  band(g, 1.32, 0.1, P.navy, 0, 0.35, 0);
  const c = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.2, 28), P.orange); c.position.set(0, 2.7, 0); g.add(c);
  port(g, 0.6, 1.3, 1.17, 0.28, 'z', true).rotation.y = 0.5;
  door(g, 1.25, -0.2, 'x');
  return done(g);
}

// ---------- the airlock that joins a dome to the street ----------
export function airlock() {
  const g = new THREE.Group();
  box(g, 2.0, 2.0, 2.6, P.cream, 0, 1.0, 0, 0.6);
  box(g, 2.15, 0.35, 2.75, P.orange, 0, 1.4, 0, 0.15);
  door(g, 0, 1.32, 'z');
  return done(g);
}
