// Zerks-X6 colony buildings in the style of the CellCog Ark and carbon drill: cream hulls, orange bands,
// navy rings, round windows and rounded grey bases. Each kind has its own shape so it reads at a glance:
// houses have pitched roofs, the research lab a dome, a dish and a glowing flask, the greenhouse a glass
// tunnel with plants, the kitchen an awning and tables outside, the furnace chimneys and a glowing mouth.
// The tier is the upgrade level: 0 basic (atmosphere 20%), 1 upgraded (50%), 2 modern (85%): each tier adds modules,
// panels, glass and light, so the colony looks more advanced as it grows.
// Every builder returns a group standing on y = 0; the camera sees the +x and +z sides, so the details are there.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...o });
const glow = (color, k = 1.4) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });
export const P = {
  cream: mat(0xfbf3e6), cream2: mat(0xefe2cf), orange: mat(0xff7a2e), navy: mat(0x2f3346), navy2: mat(0x4a5068),
  solar: mat(0x3d6fb5, { roughness: 0.35 }), pad: mat(0xd9d5de), padEdge: mat(0xbdb8c4), window: mat(0x2c4a72, { roughness: 0.25 }), teal: glow(0x5fe3d0), warm: glow(0xffd58a, 1.1),
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
  if (NIGHT && !lit) lit = rnd() < 0.75;
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
// solar panels in a grid, tilted to the sun
function panels(g, nx, nz, x, y, z, sw = 1.0, sd = 0.7) { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const p = box(g, sw, 0.08, sd, P.solar, x + (i - (nx - 1) / 2) * (sw + 0.12), y, z + (j - (nz - 1) / 2) * (sd + 0.12), 0.03); p.rotation.x = -0.25; } }
// a glass room with a navy frame on its edges
function glassRoom(g, w, h, d, x, y, z) {
  const room = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), P.glass); room.position.set(x, y + h / 2, z); g.add(room);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.16, h, 0.16, P.navy, x + sx * w / 2, y + h / 2, z + sz * d / 2, 0.05);
  for (const sy of [0, h]) { for (const sz of [-1, 1]) box(g, w, 0.16, 0.16, P.navy, x, y + sy, z + sz * d / 2, 0.05); for (const sx of [-1, 1]) box(g, 0.16, 0.16, d, P.navy, x + sx * w / 2, y + sy, z, 0.05); }
}
const done = g => { g.traverse(m => { if (m.isMesh) { m.castShadow = !m.material.transparent; m.receiveShadow = true; } }); return g; };
let rnd = Math.random, NIGHT = false;
export const useRng = f => { rnd = f; };
// at night more windows are lit
export const setNight = on => { NIGHT = on; if (on) for (const [m, k] of [[P.warm, 2.2], [P.teal, 2.2], [P.grow, 2.4], [P.fire, 3.2]]) m.emissiveIntensity = k; };

// ---------- homes: a cream house with a pitched roof, a navy ring, round windows and a door ----------
// modern (tier 2): a second floor with wide windows, a flat roof with solar panels, a balcony and plants
export function home(roofMat = P.orange, tier = 1, r = rnd) {
  const g = new THREE.Group(), w = 3.4 + r() * 0.5, h = 2.2 + r() * 0.5, d = 3.2;
  box(g, w, h, d, P.cream, 0, h / 2 + 0.1, 0, 0.45);
  box(g, w + 0.14, 0.22, d + 0.14, P.navy, 0, 0.42, 0, 0.1);
  door(g, -w * 0.22, d / 2 + 0.02);
  box(g, 1.3, 0.14, 0.6, P.cream2, -w * 0.22, 0.07, d / 2 + 0.3, 0.06);
  port(g, w * 0.22, h * 0.62, d / 2 + 0.02, 0.34, 'z', r() < 0.6);
  port(g, w / 2 + 0.02, h * 0.62, -0.6, 0.32, 'x', r() < 0.5); port(g, w / 2 + 0.02, h * 0.62, 0.6, 0.32, 'x');
  if (tier < 2) {
    roof(g, w + 0.5, 1.5, d + 0.3, roofMat, 0, h + 0.05, 0);
    cyl(g, 0.2, 0.2, 1.0, P.navy, w * 0.25, h + 1.0, -0.5, { seg: 14 }); band(g, 0.22, 0.05, P.orange, w * 0.25, h + 1.4, -0.5);
    return done(g);
  }
  const h2 = h + 0.1, uw = w * 0.86, ud = d * 0.8, uz = -0.3;
  box(g, w + 0.2, 0.25, d + 0.2, roofMat, 0, h2 + 0.12, 0, 0.1);
  box(g, uw, 1.7, ud, P.cream, -0.1, h2 + 1.1, uz, 0.4);
  box(g, uw * 0.8, 0.9, 0.1, P.window, -0.1, h2 + 1.15, uz + ud / 2 + 0.01, 0.15);
  box(g, 0.1, 0.9, ud * 0.7, P.window, -0.1 + uw / 2 + 0.01, h2 + 1.15, uz, 0.15);
  box(g, uw * 0.8, 0.07, 0.1, P.teal, -0.1, h2 + 0.6, uz + ud / 2 + 0.03, 0.03);
  box(g, uw + 0.2, 0.22, ud + 0.2, roofMat, -0.1, h2 + 2.05, uz, 0.1);
  panels(g, 2, 2, -0.1, h2 + 2.3, uz);
  box(g, w * 0.9, 0.07, 0.07, P.orange, 0, h2 + 0.75, d / 2 + 0.02, 0.03);
  for (const x of [-0.42, 0, 0.42]) box(g, 0.07, 0.5, 0.07, P.orange, x * w, h2 + 0.5, d / 2 + 0.02, 0.03);
  ball(g, 0.38, P.leaf[r() * 3 | 0], w / 2 - 0.35, h2 + 0.55, d / 2 - 0.3); ball(g, 0.3, P.leaf[r() * 3 | 0], -w / 2 + 0.35, h2 + 0.5, d / 2 - 0.3);
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
// modern (tier 2): a tall glass hall with two levels of beds and a sprinkler line; panels on the module from tier 1
export function greenhouse(len = 8, tier = 1, r = rnd) {
  const g = new THREE.Group(), y0 = base(g, len + 3.2, 5.4), R = 2.0, gx = -0.8;
  const bed = y => { for (const z of [-1.05, 0, 1.05]) for (let i = 0; i < Math.round(len / 0.8); i++) { const x = gx - len / 2 + 0.5 + i * 0.8; ball(g, 0.36 + r() * 0.08, P.leaf[r() * 3 | 0], x, y + 0.45, z, 0.9); if (z !== 0 && r() < 0.5) ball(g, 0.11, P.tomato, x + 0.2, y + 0.6, z + 0.25); } };
  box(g, len - 0.2, 0.3, 3.4, P.soil, gx, y0 + 0.15, 0, 0.1); bed(y0 + 0.15);
  if (tier < 2) {
    const tun = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 32, 1, true, 0, Math.PI), P.glass);
    tun.rotation.order = 'YXZ'; tun.rotation.y = Math.PI / 2; tun.rotation.z = Math.PI / 2; tun.position.set(gx, y0, 0); g.add(tun);
    for (let i = 0; i <= Math.round(len / 1.6); i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.08, 8, 32, Math.PI), P.navy); rib.rotation.y = Math.PI / 2; rib.position.set(gx - len / 2 + i * len / Math.round(len / 1.6), y0, 0); g.add(rib); }
  } else {
    box(g, len - 0.2, 0.12, 3.4, P.navy2, gx, y0 + 1.75, 0, 0.04); bed(y0 + 1.8);
    glassRoom(g, len, 3.6, 4.0, gx, y0, 0);
    box(g, len - 0.4, 0.1, 0.1, P.teal, gx, y0 + 3.45, 0, 0.04);
  }
  const mx = gx + len / 2 + 0.95, mh = tier < 2 ? 2.6 : 3.6;
  box(g, 1.9, mh, 3.8, P.cream, mx, y0 + mh / 2, 0, 0.55);
  box(g, 2.0, 0.45, 3.9, P.orange, mx, y0 + 1.9, 0, 0.2);
  door(g, mx + 0.96, 0, 'x', y0);
  port(g, mx, y0 + 1.25, 1.92, 0.3, 'z', true);
  if (tier >= 1) panels(g, 1, 3, mx, y0 + mh + 0.15, 0, 1.4, 0.9); else light(g, mx, y0 + mh, -1.2);
  return done(g);
}

// ---------- research: the main lab; from tier 1 an observatory dome and a flask of glowing liquid,
// modern (tier 2): a glass floor on the roof, a second flask, panels and a teal ring around the dome ----------
export function research(tier = 1) {
  const g = new THREE.Group(), y0 = base(g, 10, 9);
  box(g, 6.2, 2.8, 4.4, P.cream, -0.6, y0 + 1.4, -1.0, 0.6);
  box(g, 6.35, 0.5, 4.55, P.orange, -0.6, y0 + 2.1, -1.0, 0.2);
  box(g, 6.35, 0.2, 4.55, P.navy, -0.6, y0 + 0.4, -1.0, 0.1);
  door(g, 0.9, 1.22, 'z', y0);
  for (const x of [-3.0, -1.6, -0.2]) port(g, x, y0 + 1.35, 1.22, 0.36, 'z', x < -2);
  port(g, 2.52, y0 + 1.35, -0.4, 0.36, 'x', true); port(g, 2.52, y0 + 1.35, -2.0, 0.36, 'x');
  // the dish on a mast
  cyl(g, 0.12, 0.16, 1.8, P.navy2, 1.4, y0 + 3.6, -2.2, { seg: 10 });
  const dish = new THREE.Mesh(new THREE.SphereGeometry(tier ? 1.25 : 0.9, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), P.cream.clone()); dish.material.side = THREE.DoubleSide; dish.rotation.set(Math.PI + 0.7, 0, 0.5); dish.position.set(1.4, y0 + 4.9, -2.2); g.add(dish);
  band(g, 0.2, 0.06, P.orange, 1.4, y0 + 4.5, -2.2);
  if (tier === 0) { light(g, 2.2, y0 + 2.8, 0.6); return done(g); }
  // the observatory: a round tower and a white dome with a slit
  cyl(g, 1.55, 1.55, 1.1, P.cream2, -2.3, y0 + 3.3, -1.6, { seg: 36 });
  band(g, 1.58, 0.1, tier > 1 ? P.teal : P.navy, -2.3, y0 + 2.9, -1.6);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), P.white); dome.position.set(-2.3, y0 + 3.85, -1.6); g.add(dome);
  const slit = box(g, 0.45, 0.12, 2.6, P.navy, -2.3, y0 + 4.9, -1.2, 0.05); slit.rotation.x = -0.75;
  // the flask: a glass bottle with teal liquid, on its own ring
  const flask = (x, z, s) => {
    const pts = [[0, 0], [1.0, 0], [1.15, 0.3], [1.15, 2.2], [0.5, 3.0], [0.45, 3.8], [0.6, 4.0]].map(([a, b]) => new THREE.Vector2(a * s, b * s));
    const f = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), P.glass); f.position.set(x, y0, z); g.add(f);
    cyl(g, 1.0 * s, 1.0 * s, 1.9 * s, P.teal, x, y0 + 1.05 * s, z, { seg: 24 });
    band(g, 1.18 * s, 0.12, P.navy, x, y0 + 0.15, z); band(g, 1.18 * s, 0.1, P.orange, x, y0 + 2.2 * s, z);
    for (let i = 0; i < 5; i++) ball(g, 0.1 + rnd() * 0.07, P.white, x - 0.2 + rnd() * 0.5, y0 + 0.6 + i * 0.3 * s, z + rnd() * 0.4);
  };
  flask(2.8, 2.6, 1);
  if (tier > 1) {
    flask(-3.4, 2.9, 0.7);
    glassRoom(g, 2.6, 1.6, 3.6, 1.1, y0 + 2.8, -1.0);
    box(g, 1.6, 0.6, 1.0, P.cream2, 1.1, y0 + 3.1, -1.2, 0.15); ball(g, 0.3, P.teal, 1.4, y0 + 3.6, -1.2);
    box(g, 2.6, 0.08, 0.1, P.teal, 1.1, y0 + 2.95, 0.83, 0.03);
    panels(g, 3, 1, -0.9, y0 + 3.0, 0.6, 0.8, 0.6);
  }
  light(g, 2.2, y0 + 2.8, 0.6);
  return done(g);
}

// ---------- the vegetable lab: a cream module and a glass room with shelves of plants under purple grow lights;
// each tier adds shelves and height, the modern one a garden on the module's roof ----------
export function vegLab(tier = 1, r = rnd) {
  const g = new THREE.Group(), y0 = base(g, 10, 7);
  box(g, 2.8, 2.8, 5.2, P.cream, -3.2, y0 + 1.4, 0, 0.55);
  box(g, 2.95, 0.45, 5.35, P.orange, -3.2, y0 + 2.0, 0, 0.2);
  door(g, -3.2, 2.62, 'z', y0); port(g, -1.78, y0 + 1.4, -1.2, 0.32, 'x', true);
  const gx = 1.2, gw = 5.4, gd = 5.0, levels = [1, 3, 4][tier], gh = [1.4, 3.2, 4.2][tier];
  glassRoom(g, gw, gh, gd, gx, y0, 0);
  for (let lv = 0; lv < levels; lv++) {
    const y = y0 + 0.35 + lv * 0.95;
    for (const z of [-1.2, 1.2]) {
      box(g, gw - 0.8, 0.08, 1.2, P.navy2, gx, y, z, 0.03);
      box(g, gw - 0.8, 0.06, 0.12, P.grow, gx, y + 0.8, z, 0.03);
      for (let i = 0; i < 6; i++) ball(g, 0.24, P.leaf[r() * 3 | 0], gx - 2.0 + i * 0.8, y + 0.25, z, 0.8);
    }
  }
  if (tier > 1) { box(g, gw, 0.08, 0.1, P.teal, gx, y0 + gh + 0.12, gd / 2, 0.03); box(g, 2.5, 0.3, 4.8, P.soil, -3.2, y0 + 2.95, 0, 0.1); for (let i = 0; i < 6; i++) ball(g, 0.4, P.leaf[r() * 3 | 0], -3.8 + (i % 2) * 1.2, y0 + 3.35, -1.8 + Math.floor(i / 2) * 1.8); }
  return done(g);
}

// ---------- the kitchen: a round diner with a chimney; from tier 1 a striped awning and tables with umbrellas,
// modern (tier 2): a glass restaurant ring on the roof, lights along the awning and more tables ----------
export function kitchen(tier = 1, r = rnd) {
  const g = new THREE.Group(), y0 = base(g, 10.5, 10.5), cx = -1.6, cz = -1.6;
  cyl(g, 2.8, 2.8, 2.7, P.cream, cx, y0 + 1.35, cz, { seg: 40 });
  band(g, 2.82, 0.14, P.navy, cx, y0 + 0.3, cz);
  cyl(g, 3.05, 3.05, 0.5, P.orange, cx, y0 + 2.95, cz, { seg: 40 });
  if (tier < 2) { const cap = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), P.cream2); cap.position.set(cx, y0 + 2.4, cz); g.add(cap); }
  else {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.4, 32, 1, true), P.glass); ring.position.set(cx, y0 + 3.9, cz); g.add(ring);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(g, 0.14, 1.4, 0.14, P.navy, cx + Math.sin(a) * 2.3, y0 + 3.9, cz + Math.cos(a) * 2.3, 0.05); }
    cyl(g, 2.6, 2.6, 0.3, P.orange, cx, y0 + 4.7, cz, { seg: 40 }); band(g, 2.62, 0.07, P.teal, cx, y0 + 4.55, cz);
    for (let k = 0; k < 3; k++) { const a = k * 2.1; cyl(g, 0.45, 0.45, 0.08, P.white, cx + Math.sin(a) * 1.2, y0 + 3.75, cz + Math.cos(a) * 1.2, { seg: 14 }); }
  }
  if (tier >= 1) for (let i = 0; i < 10; i++) { const ts = -Math.PI / 3 + i * (Math.PI * 7 / 6) / 10; const a = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.75, 0.8, 4, 1, true, ts, (Math.PI * 7 / 6) / 10), (i % 2 ? P.white : P.orange).clone()); a.material.side = THREE.DoubleSide; a.position.set(cx, y0 + 2.2, cz); g.add(a); if (tier > 1) ball(g, 0.1, P.warm, cx + Math.sin(ts) * 3.8, y0 + 1.75, cz + Math.cos(ts) * 3.8); }
  for (const a of [0.15, 0.75, 1.35]) { const x = cx + Math.sin(a) * 2.82, z = cz + Math.cos(a) * 2.82; const p = port(g, x, y0 + 1.4, z, 0.34, 'z', true); p.rotation.y = a; }
  const d = door(g, cx + Math.sin(1.0) * 2.75, cz + Math.cos(1.0) * 2.75, 'z', y0); d.rotation.y = 1.0;
  cyl(g, 0.32, 0.36, 1.6, P.navy, cx - 1.0, y0 + (tier > 1 ? 5.3 : 3.6), cz - 1.2, { seg: 14 }); band(g, 0.36, 0.07, P.orange, cx - 1.0, y0 + (tier > 1 ? 5.8 : 4.1), cz - 1.2);
  // tables with umbrellas in front
  const tables = [[2.4, 0.2, P.orange], [0.6, 2.8, P.teal], [3.0, 3.2, P.orange], [3.6, -2.4, P.teal], [-2.4, 3.6, P.orange]].slice(0, [1, 3, 5][tier]);
  for (const [x, z, um] of tables) {
    cyl(g, 0.7, 0.7, 0.1, P.white, x, y0 + 0.85, z, { seg: 20 }); cyl(g, 0.08, 0.08, 0.85, P.navy2, x, y0 + 0.42, z, { seg: 8 });
    cyl(g, 0.05, 0.05, 2.2, P.navy2, x, y0 + 1.6, z, { seg: 6 });
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.55, 16), um); u.position.set(x, y0 + 2.75, z); g.add(u);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; cyl(g, 0.25, 0.25, 0.45, P.cream2, x + Math.cos(a) * 1.0, y0 + 0.23, z + Math.sin(a) * 1.0, { seg: 12 }); }
  }
  return done(g);
}

// ---------- the silicon furnace: a hall under a navy vault, two chimneys, a glowing mouth, silicon slabs ----------
export function smelter(tier = 1, r = rnd) {
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
  // modern (tier 2): filters on the chimneys clean the smoke; a second hall with panels on the roof
  if (tier > 1) {
    for (const [x, z, h] of [[-2.6, -2.4, 7.5], [-1.2, -2.6, 6.2]]) { cyl(g, 0.7, 0.7, 0.9, P.cream, x, y0 + h + 0.3, z, { seg: 18 }); band(g, 0.72, 0.08, P.teal, x, y0 + h + 0.5, z); }
    box(g, 3.0, 2.0, 4.0, P.cream, -3.8, y0 + 1.0, -1.0, 0.45); box(g, 3.1, 0.3, 4.1, P.orange, -3.8, y0 + 2.05, -1.0, 0.12); panels(g, 2, 3, -3.8, y0 + 2.35, -1.0, 1.2, 0.9);
    box(g, 6.2, 0.08, 0.1, P.teal, -0.8, y0 + 0.75, 1.52, 0.03);
  }
  light(g, 1.6, y0 + 2.6, -2.6);
  return done(g);
}

// ---------- animals: a barn with a white X door and a hayloft window; a silo for the cows; a small coop for chickens ----------
export function barn(kind = 'cow', tier = 1) {
  const g = new THREE.Group(), s = kind === 'chicken' ? 0.7 : 1, w = 4.0 * s, h = 2.5 * s, d = 3.4 * s;
  box(g, w, h, d, P.barn, 0, h / 2 + 0.1, 0, 0.35);
  roof(g, w + 0.4, 1.5 * s, d + 0.3, P.navy, 0, h + 0.05, 0);
  box(g, w * 0.5, h * 0.62, 0.12, P.white, 0, h * 0.36 + 0.1, d / 2 + 0.02, 0.08);
  box(g, w * 0.42, h * 0.52, 0.12, P.barn, 0, h * 0.36 + 0.1, d / 2 + 0.05, 0.06);
  for (const a of [0.85, -0.85]) { const x = box(g, 0.14, h * 0.62, 0.1, P.white, 0, h * 0.36 + 0.1, d / 2 + 0.1, 0.04); x.rotation.z = a * 0.7; }
  port(g, 0, h + 0.55 * s, d / 2 + 0.2, 0.3 * s, 'z');
  if (kind === 'cow') { cyl(g, 0.95, 0.95, 4.4, P.cream, w / 2 + 1.3, 2.3, -0.6); ball(g, 0.95, P.orange, w / 2 + 1.3, 4.5, -0.6, 0.6); band(g, 0.97, 0.08, P.navy, w / 2 + 1.3, 1.0, -0.6); band(g, 0.97, 0.08, P.navy, w / 2 + 1.3, 3.2, -0.6); }
  if (tier > 1) { box(g, 1.2, 1.0, 1.0, P.cream, -w / 2 - 0.9, 0.6, d / 2 - 0.2, 0.3); box(g, 1.25, 0.2, 1.05, P.orange, -w / 2 - 0.9, 1.15, d / 2 - 0.2, 0.08); ball(g, 0.14, P.teal, -w / 2 - 0.9, 1.4, d / 2 - 0.2); box(g, w * 0.7, 0.06, 0.1, P.teal, 0, h - 0.1, d / 2 + 0.03, 0.03); }
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

// ---------- a battery for the night: a cream cabinet with an orange lid and teal charge bars ----------
export function battery() {
  const g = new THREE.Group();
  box(g, 2.4, 1.8, 1.6, P.cream, 0, 0.9, 0, 0.35);
  box(g, 2.5, 0.3, 1.7, P.orange, 0, 1.85, 0, 0.12);
  box(g, 2.5, 0.16, 1.7, P.navy, 0, 0.25, 0, 0.06);
  for (let i = 0; i < 4; i++) box(g, 0.34, 0.9, 0.08, i < 3 ? P.teal : P.navy2, -0.75 + i * 0.5, 1.0, 0.82, 0.06);
  return done(g);
}

// ---------- upgrade kit for the models that come from models.js and CellCog (used by map.js) ----------
export function tank(teal = false) {
  const g = new THREE.Group();
  cyl(g, 1.0, 1.0, 2.6, P.cream, 0, 1.3, 0, { seg: 28 }); ball(g, 1.0, teal ? P.teal : P.orange, 0, 2.6, 0, 0.45);
  band(g, 1.02, 0.08, P.navy, 0, 0.5, 0); band(g, 1.02, 0.08, P.navy, 0, 1.9, 0);
  return done(g);
}
export function conveyor(len = 5) {
  const g = new THREE.Group();
  box(g, len, 0.25, 0.8, P.navy, 0, 1.0, 0, 0.1);
  for (let i = 0; i < Math.round(len / 0.6); i++) box(g, 0.12, 0.08, 0.9, P.orange, -len / 2 + 0.3 + i * 0.6, 1.15, 0, 0.03);
  for (const x of [-len / 2 + 0.4, len / 2 - 0.4]) box(g, 0.2, 1.0, 0.6, P.navy2, x, 0.5, 0, 0.05);
  for (let i = 0; i < 4; i++) ball(g, 0.2, P.carbon, -len / 3 + i * len / 5, 1.35, 0, 0.7);
  return done(g);
}
// the mine's lift: an orange headframe with a wheel and a cream winding house
export function headframe() {
  const g = new THREE.Group();
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = cyl(g, 0.12, 0.12, 6.6, P.orange, x * 0.9, 3.2, z * 0.9, { seg: 8 }); l.rotation.set(-z * 0.08, 0, x * 0.08); }
  for (const y of [2, 4]) box(g, 1.8, 0.14, 1.8, P.orange, 0, y, 0, 0.05);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 24), P.navy); wheel.position.set(0, 6.8, 0); g.add(wheel);
  box(g, 2.4, 1.8, 2.0, P.cream, 2.4, 0.9, 0, 0.4); box(g, 2.5, 0.3, 2.1, P.orange, 2.4, 1.85, 0, 0.12); port(g, 2.4, 1.0, 1.02, 0.28, 'z', true);
  ball(g, 0.15, P.teal, 0, 7.8, 0);
  return done(g);
}
export function radome() {
  const g = new THREE.Group();
  cyl(g, 1.2, 1.4, 1.2, P.cream2, 0, 0.6, 0, { seg: 24 }); band(g, 1.25, 0.08, P.teal, 0, 1.1, 0);
  ball(g, 1.5, P.white, 0, 2.3, 0);
  return done(g);
}
export function warehouse() {
  const g = new THREE.Group();
  box(g, 7, 3.0, 4.4, P.cream, 0, 1.5, 0, 0.5);
  for (const y of [1.0, 2.0]) box(g, 7.1, 0.2, 4.5, P.orange, 0, y, 0, 0.08);
  box(g, 2.2, 2.2, 0.12, P.navy2, 1.6, 1.1, 2.22, 0.1);
  for (let i = 0; i < 6; i++) box(g, 2.0, 0.06, 0.1, P.cream2, 1.6, 0.3 + i * 0.35, 2.29, 0.02);
  panels(g, 5, 3, 0, 3.15, 0, 1.2, 1.2);
  box(g, 7.0, 0.08, 0.1, P.teal, 0, 2.7, 2.24, 0.03);
  return done(g);
}
// the modern atmosphere tower: tall, tapered, with glowing teal rings and a fan at the top
export function atmTower() {
  const g = new THREE.Group();
  const pts = [[1.8, 0], [1.6, 2], [1.2, 6], [1.1, 8.5], [1.5, 9.2], [1.5, 9.8]].map(([a, b]) => new THREE.Vector2(a, b));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), P.cream); g.add(body);
  for (const y of [2.5, 4.5, 6.5]) band(g, 1.55 - y * 0.06, 0.1, P.teal, 0, y, 0);
  band(g, 1.52, 0.12, P.orange, 0, 9.0, 0);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.1, 24), P.navy); fan.position.y = 9.7; g.add(fan);
  box(g, 2.4, 0.08, 0.2, P.cream2, 0, 9.78, 0, 0.03).rotation.y = 0.6; box(g, 2.4, 0.08, 0.2, P.cream2, 0, 9.78, 0, 0.03).rotation.y = -0.9;
  door(g, 0, 1.75, 'z');
  return done(g);
}

// ---------- the quarry: an open pit dug in steps beside the mine, where the stone comes from ----------
// tier 0: workers with picks on a shallow pit; tier 1: a digger and a conveyor out of the pit;
// tier 2: a deeper pit, a big excavator, lights on the rim and a crane loading the cut blocks
const rockTone = [mat(0xe0a070), mat(0xcf8a5c), mat(0xb87550), mat(0xa06548), mat(0x8c5c44)];
const stone = mat(0xe3c9a2);
export function digger(big = false) {
  const g = new THREE.Group(), s = big ? 1.5 : 1;
  for (const z of [-0.55, 0.55]) box(g, 1.9 * s, 0.45 * s, 0.4 * s, P.navy, 0, 0.25 * s, z * s, 0.18);
  box(g, 1.5 * s, 0.6 * s, 1.2 * s, P.orange, 0, 0.75 * s, 0, 0.2);
  box(g, 0.8 * s, 0.75 * s, 0.9 * s, P.cream, -0.35 * s, 1.4 * s, 0, 0.2); box(g, 0.08, 0.4 * s, 0.6 * s, P.teal, 0.07 * s, 1.45 * s, 0, 0.05);
  const arm1 = box(g, 1.5 * s, 0.22 * s, 0.22 * s, P.navy2, 1.1 * s, 1.5 * s, 0, 0.08); arm1.rotation.z = 0.5;
  const arm2 = box(g, 1.2 * s, 0.2 * s, 0.2 * s, P.navy2, 2.0 * s, 1.35 * s, 0, 0.08); arm2.rotation.z = -0.9;
  const bucket = box(g, 0.6 * s, 0.45 * s, 0.7 * s, P.orange, 2.35 * s, 0.75 * s, 0, 0.1); bucket.rotation.z = 0.4;
  return done(g);
}
export function pickaxe() {
  const g = new THREE.Group();
  const h = box(g, 0.07, 1.0, 0.07, P.wood, 0, 0.5, 0, 0.03);
  const head = box(g, 0.7, 0.1, 0.1, P.navy, 0, 1.0, 0, 0.04); head.rotation.z = 0.15;
  return done(g);
}
export function quarry(tier = 0, r = rnd) {
  const g = new THREE.Group(), rings = tier > 1 ? 4 : 3, w = 1.1;
  // rings of rock, each one step lower and darker; the back walls stand higher than the front ones
  for (let k = 0; k < rings; k++) {
    const S = 11 - k * 2 * w, h = 1.3 - k * 0.35, m = rockTone[k];
    box(g, S, h, w, m, 0, h / 2, -S / 2 + w / 2, 0.25); box(g, w, h, S, m, -S / 2 + w / 2, h / 2, 0, 0.25);
    box(g, S, h * 0.55, w, m, 0, h * 0.275, S / 2 - w / 2, 0.25); box(g, w, h * 0.55, S, m, S / 2 - w / 2, h * 0.275, 0, 0.25);
  }
  const fl = 11 - rings * 2 * w;
  box(g, fl, 0.08, fl, rockTone[4], 0, 0.04, 0, 0.05);
  // loose stone on the floor and on the steps, cut blocks ready to go
  for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + r() * 0.2, 0), stone); c.position.set((r() - 0.5) * fl, 0.25, (r() - 0.5) * fl); c.rotation.set(r() * 3, r() * 3, 0); g.add(c); }
  for (let i = 0; i < 3 + tier * 2; i++) box(g, 0.7, 0.5, 0.7, stone, 4.2 - (i % 3) * 0.75, 1.0 + Math.floor(i / 3) * 0.5, 4.3, 0.06);
  if (tier >= 1) {
    const d = digger(tier > 1); d.position.set(-0.8, 0.08, -0.4); d.rotation.y = 0.6; g.add(d);
    const c = conveyor(6); c.position.set(1.8, 0.1, 2.6); c.rotation.y = 0.5; c.rotation.z = -0.18; g.add(c);
  }
  if (tier > 1) {
    for (const [x, z] of [[-5, -5], [5, -5], [-5, 5]]) light(g, x, 1.3, z);
    // a small crane on the rim lifts the cut blocks
    cyl(g, 0.2, 0.25, 4.5, P.orange, 4.6, 2.25, 2.6, { seg: 10 }); box(g, 4.2, 0.3, 0.3, P.orange, 3.0, 4.5, 2.6, 0.08); box(g, 0.8, 0.5, 0.6, P.cream, 4.9, 4.2, 2.6, 0.1);
    cyl(g, 0.02, 0.02, 2.2, P.navy, 1.3, 3.3, 2.6, { seg: 4 }); box(g, 0.7, 0.5, 0.7, stone, 1.3, 2.0, 2.6, 0.06);
  }
  return done(g);
}

// ---------- street furniture, better with each tier ----------
export function bench(tier = 0) {
  const g = new THREE.Group();
  box(g, 1.5, 0.12, 0.5, tier > 1 ? P.wood : P.cream, 0, 0.45, 0, 0.05);
  box(g, 1.5, 0.4, 0.1, tier > 1 ? P.wood : P.cream, 0, 0.75, -0.22, 0.05);
  for (const x of [-0.6, 0.6]) box(g, 0.1, 0.45, 0.45, P.navy, x, 0.22, 0, 0.03);
  return done(g);
}
export function lamp(tier = 0) {
  const g = new THREE.Group(), h = tier > 1 ? 3.0 : 2.4;
  cyl(g, 0.07, 0.1, h, P.navy, 0, h / 2, 0, { seg: 8 });
  if (tier > 1) { box(g, 0.8, 0.12, 0.3, P.navy, 0.3, h, 0, 0.05); box(g, 0.5, 0.06, 0.2, P.warm, 0.4, h - 0.08, 0, 0.03); }
  else { ball(g, 0.22, tier ? P.warm : P.teal, 0, h + 0.15, 0); band(g, 0.2, 0.04, P.orange, 0, h - 0.02, 0); }
  return done(g);
}
// a planter: at 20% the plant needs a glass bell (the air outside is still too thin), later a bush, at the end a tree
export function planter(tier = 0, r = rnd) {
  const g = new THREE.Group();
  cyl(g, 0.55, 0.45, 0.5, P.cream, 0, 0.25, 0, { seg: 18 }); band(g, 0.56, 0.05, P.orange, 0, 0.42, 0);
  cyl(g, 0.48, 0.48, 0.05, P.soil, 0, 0.5, 0, { seg: 18 });
  if (tier === 0) { ball(g, 0.25, P.leaf[r() * 3 | 0], 0, 0.7, 0); const bell = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), P.glass); bell.position.y = 0.5; g.add(bell); }
  else if (tier === 1) { ball(g, 0.45, P.leaf[r() * 3 | 0], 0, 0.85, 0, 0.85); ball(g, 0.3, P.leaf[r() * 3 | 0], 0.25, 1.05, 0.1); }
  else { cyl(g, 0.08, 0.1, 1.4, P.wood, 0, 1.2, 0, { seg: 8 }); ball(g, 0.9, P.leaf[r() * 3 | 0], 0, 2.2, 0); ball(g, 0.6, P.leaf[r() * 3 | 0], 0.4, 1.9, 0.3); }
  return done(g);
}
const blooms = [mat(0xff6f91), mat(0xffd166), mat(0xffffff), mat(0xc77dff)];
export function flowers(w = 2.2, d = 0.8, r = rnd) {
  const g = new THREE.Group();
  box(g, w, 0.3, d, P.cream, 0, 0.15, 0, 0.1); box(g, w - 0.2, 0.06, d - 0.2, P.soil, 0, 0.31, 0, 0.03);
  for (let i = 0; i < Math.round(w * 4); i++) { ball(g, 0.14, P.leaf[r() * 3 | 0], -w / 2 + 0.2 + r() * (w - 0.4), 0.42, -d / 2 + 0.2 + r() * (d - 0.4)); ball(g, 0.09, blooms[r() * 4 | 0], -w / 2 + 0.2 + r() * (w - 0.4), 0.55, -d / 2 + 0.2 + r() * (d - 0.4)); }
  return done(g);
}
// a long trimmed hedge, like the ones along the pavements in the reference picture
export function hedge(len = 2, r = rnd) {
  const g = new THREE.Group(), m = P.leaf[r() * 3 | 0];
  box(g, len, 0.7, 0.55, m, 0, 0.4, 0, 0.26);
  for (let i = 0; i < Math.round(len / 0.55); i++) ball(g, 0.2, m, -len / 2 + 0.28 + i * 0.55, 0.72, (r() - 0.5) * 0.15, 0.7);
  return done(g);
}
// a small electric car of the colony: rounded body, glass cabin, headlights that light up at night
export function car(color = P.orange) {
  const g = new THREE.Group();
  box(g, 2.0, 0.6, 1.05, color, 0, 0.55, 0, 0.28);
  box(g, 1.1, 0.5, 0.95, P.cream, -0.15, 1.05, 0, 0.22); box(g, 1.12, 0.3, 0.97, P.window, -0.15, 1.08, 0, 0.12);
  for (const [x, z] of [[-0.62, -0.5], [0.62, -0.5], [-0.62, 0.5], [0.62, 0.5]]) { const w = cyl(g, 0.22, 0.22, 0.16, P.navy, x, 0.24, z, { seg: 14 }); w.rotation.x = Math.PI / 2; }
  for (const z of [-0.3, 0.3]) box(g, 0.08, 0.14, 0.22, P.warm, 1.0, 0.62, z, 0.04);
  return done(g);
}
export function fountain() {
  const g = new THREE.Group();
  cyl(g, 1.8, 1.9, 0.5, P.cream, 0, 0.25, 0, { seg: 32 }); band(g, 1.82, 0.06, P.orange, 0, 0.48, 0);
  cyl(g, 1.6, 1.6, 0.05, mat(0x58b8f0, { roughness: 0.2 }), 0, 0.46, 0, { seg: 32 });
  cyl(g, 0.25, 0.3, 1.2, P.cream, 0, 1.0, 0, { seg: 16 }); cyl(g, 0.7, 0.5, 0.2, P.cream, 0, 1.6, 0, { seg: 20 });
  ball(g, 0.35, mat(0x8fd6ff, { transparent: true, opacity: 0.7 }), 0, 1.9, 0, 0.8);
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
