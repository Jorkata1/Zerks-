// Detailed colony models built from bevelled parts, lattices, pipes and lit details.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';

export const M = {};
export function initMaterials() {
  const hull = T.panelSet([229, 232, 237]);
  const hull2 = T.panelSet([196, 203, 212]);
  const hullShip = T.panelSet([150, 160, 174]);
  const metal = T.metalSet([62, 68, 80]);
  const steel = T.metalSet([150, 158, 170]);
  const orange = T.paintSet([255, 138, 61]);
  const concrete = T.concreteSet();
  Object.assign(M, {
    hull: new THREE.MeshStandardMaterial({ ...hull, roughness: 0.9, metalness: 0.15 }),
    hull2: new THREE.MeshStandardMaterial({ ...hull2, roughness: 0.85, metalness: 0.2 }),
    ship: new THREE.MeshStandardMaterial({ ...hullShip, roughness: 0.7, metalness: 0.45 }),
    metal: new THREE.MeshStandardMaterial({ ...metal, roughness: 0.45, metalness: 0.75 }),
    steel: new THREE.MeshStandardMaterial({ ...steel, roughness: 0.35, metalness: 0.85 }),
    orange: new THREE.MeshStandardMaterial({ ...orange, roughness: 0.5, metalness: 0.1 }),
    concrete: new THREE.MeshStandardMaterial({ ...concrete, roughness: 0.95 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.9 }),
    darkGlass: new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.05, metalness: 0.9, envMapIntensity: 1.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xcdeaff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.28, envMapIntensity: 2.2, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    teal: new THREE.MeshStandardMaterial({ color: 0x4fd1a5, emissive: 0x4fd1a5, emissiveIntensity: 3.2, roughness: 0.3 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xffd6a0, emissive: 0xffb36b, emissiveIntensity: 2.4, roughness: 0.3 }),
    redLight: new THREE.MeshStandardMaterial({ color: 0xff5a4f, emissive: 0xff3b30, emissiveIntensity: 4 }),
    engineGlow: new THREE.MeshStandardMaterial({ color: 0xff9a4a, emissive: 0xff7a2a, emissiveIntensity: 2.5 }),
    blueGlow: new THREE.MeshStandardMaterial({ color: 0x8fdcff, emissive: 0x6fd6ff, emissiveIntensity: 3 }),
    solar: new THREE.MeshStandardMaterial({ ...T.solarSet(), roughness: 0.18, metalness: 0.6, envMapIntensity: 1.6 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: 0.35, metalness: 0.4 }),
    ice: new THREE.MeshPhysicalMaterial({ color: 0xd8f1ff, roughness: 0.15, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1, envMapIntensity: 1.5 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x9a6b45, roughness: 0.8 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.85 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc46b, roughness: 0.15, metalness: 1, emissive: 0x3a2400 }),
    white: new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: 0.5 }),
  });
}

// ---------- primitives ----------
const SCALE = 4; // metres per texture tile
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, o = {}) {
  if (mat && mat.map && geo.attributes.normal) T.worldUV(geo, o.tile || SCALE, [x, y, z]);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  if (o.s) m.scale.set(...o.s);
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
export const rbox = (p, w, h, d, mat, x, y, z, o = {}) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(o.r ?? 0.12, w / 2.1, h / 2.1, d / 2.1)), mat, p, x, y, z, o);
export const cyl = (p, rt, rb, h, mat, x, y, z, o = {}) => mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 24, 1, !!o.open, o.ts || 0, o.tl || Math.PI * 2), mat, p, x, y, z, o);
export const sph = (p, r, mat, x, y, z, o = {}) => mesh(new THREE.SphereGeometry(r, o.seg || 32, o.seg2 || 16, 0, Math.PI * 2, 0, o.half ? Math.PI / 2 : Math.PI), mat, p, x, y, z, o);
export const tor = (p, r, t, mat, x, y, z, o = {}) => mesh(new THREE.TorusGeometry(r, t, 8, o.seg || 40, o.arc || Math.PI * 2), mat, p, x, y, z, o);
export const lathe = (p, pts, mat, x, y, z, o = {}) => mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), o.seg || 40), mat, p, x, y, z, o);
const UP = new THREE.Vector3(0, 1, 0);
export function strut(p, a, b, r, mat, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.castShadow = true; m.receiveShadow = true; p.add(m); return m;
}
export function pipe(p, pts, r, mat, flanges = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(...q)), false, 'catmullrom', 0.1);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 10), r, 10, false), mat);
  m.castShadow = true; m.receiveShadow = true; p.add(m);
  if (flanges) for (let t = 0.1; t < 1; t += 0.2) { const q = curve.getPointAt(t), tg = curve.getTangentAt(t); const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.45, r * 1.45, r * 0.6, 12), M.metal); f.position.copy(q); f.quaternion.setFromUnitVectors(UP, tg); f.castShadow = true; p.add(f); }
  return m;
}
// square lattice tower: legs taper from w0 to w1, braced on every face
export function lattice(p, h, w0, w1, segs, r, mat, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
  const at = (i, k) => { const t = k / segs, w = (w0 + (w1 - w0) * t) / 2, sx = i === 0 || i === 3 ? -w : w, sz = i < 2 ? -w : w; return [sx, t * h, sz]; };
  for (let i = 0; i < 4; i++) strut(g, at(i, 0), at(i, segs), r * 1.4, mat);
  const order = [0, 1, 2, 3];
  for (let k = 0; k < segs; k++) for (let f = 0; f < 4; f++) {
    const a = order[f], b = order[(f + 1) % 4];
    strut(g, at(a, k + 1), at(b, k + 1), r, mat, 4);
    strut(g, at(a, k), at(b, k + 1), r * 0.8, mat, 4);
    strut(g, at(b, k), at(a, k + 1), r * 0.8, mat, 4);
  }
  return g;
}
// buildings sit on the plot pads laid by the grid, so they bring no pad of their own
export function hexPad() { return null; }
function light(p, x, y, z, mat = M.teal, r = 0.12) { return sph(p, r, mat, x, y, z, { seg: 10, seg2: 8, shadow: false }); }
const g0 = () => new THREE.Group();

// ---------- the Ark: the lander that carried the colony ----------
export function ark() {
  const g = g0(), body = g0(); g.add(body);
  const prof = [[0, -0.4], [1.6, -0.2], [2.7, 0.4], [3.3, 2], [3.45, 4], [3.45, 11.5], [3.2, 13.5], [2.5, 15.6], [1.4, 17.2], [0.4, 17.9], [0, 18]];
  const hullM = lathe(body, prof, M.hull, 0, 0, 0, { seg: 48, tile: 3 });
  body.rotation.z = -Math.PI / 2; body.position.set(-8.5, 4.3, 0);
  for (const h of [2.2, 6, 10, 13.2]) cyl(body, 3.5, 3.5, 0.35, M.metal, 0, h, 0, { seg: 48 });
  cyl(body, 3.48, 3.48, 0.9, M.orange, 0, 8, 0, { seg: 48 });
  // canopy and lit window band
  const can = sph(g, 1.3, new THREE.MeshStandardMaterial({ color: 0x35586f, roughness: 0.08, metalness: 0.7, envMapIntensity: 2.2 }), 6.6, 6.75, 0, { s: [1.7, 0.55, 1.1] });
  for (let i = 0; i < 12; i++) { rbox(g, 0.55, 0.32, 0.12, M.warm, -5.5 + i * 0.95, 5.2, 3.36, { r: 0.08, shadow: false }); rbox(g, 0.55, 0.32, 0.12, M.warm, -5.5 + i * 0.95, 5.2, -3.36, { r: 0.08, shadow: false }); }
  // engines: three bells with hot throats
  for (const [dy, dz] of [[0.9, -1.5], [0.9, 1.5], [-1.0, 0]]) {
    const e = g0(); e.position.set(-9.2, 4.3 + dy, dz); e.rotation.z = Math.PI / 2; g.add(e);
    lathe(e, [[0.6, 0], [0.75, 0.4], [1.05, 1.2], [1.3, 1.9], [1.34, 2.0]], M.metal, 0, 0, 0, { seg: 28 });
    cyl(e, 0.6, 0.6, 0.05, M.engineGlow, 0, 0.3, 0, { seg: 20, shadow: false });
    tor(e, 1.32, 0.07, M.steel, 0, 2.0, 0, { rx: Math.PI / 2 });
  }
  // stub wings and the tail fin
  const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.lineTo(5.5, 0); wing.lineTo(4.2, 3.4); wing.lineTo(1.2, 3.4); wing.lineTo(0, 0);
  for (const s of [-1, 1]) {
    const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.35, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
    const w = mesh(wg, M.hull2, g, -7.5, 3.3, s * 2.6, { rx: s * Math.PI / 2 - s * 0.18, tile: 3 });
    light(g, -4.2, 3.0, s * 6.1, s > 0 ? M.blueGlow : M.redLight, 0.14);
    rbox(g, 3.2, 0.12, 0.4, M.orange, -5.4, 3.42, s * 4.4, { r: 0.04 });
  }
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(4.6, 0); fin.lineTo(3.0, 3.2); fin.lineTo(0.9, 3.2); fin.lineTo(0, 0);
  mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }), M.hull2, g, -8, 7.4, -0.15, { tile: 3 });
  rbox(g, 1.6, 0.4, 0.34, M.orange, -5.3, 9.6, 0, { r: 0.05 });
  // sensor mast and dish
  cyl(g, 0.08, 0.1, 2.2, M.steel, 2.5, 8.5, 0.8); sph(g, 0.55, M.white, 2.5, 9.7, 0.8, { half: true, rx: 2.4 }); light(g, 2.5, 9.7, 0.8, M.redLight, 0.08);
  // landing legs: strut, piston, foot pad
  for (const lx of [-4.5, 5]) for (const s of [-1, 1]) {
    strut(g, [lx, 2.6, s * 2.2], [lx + 0.6, 0.35, s * 4.4], 0.22, M.metal, 10);
    strut(g, [lx - 0.9, 2.2, s * 1.6], [lx + 0.4, 0.5, s * 4.1], 0.12, M.steel, 8);
    cyl(g, 0.95, 1.05, 0.25, M.metal, lx + 0.6, 0.13, s * 4.5);
    rbox(g, 0.6, 0.5, 0.6, M.orange, lx + 0.4, 1.0, s * 3.9, { r: 0.08 });
  }
  // open cargo door and ramp with rails towards the camera
  rbox(g, 4.2, 2.6, 0.3, M.rubber, 0.8, 2.6, 3.3, { r: 0.1 });
  rbox(g, 4.2, 0.18, 5.4, M.hull2, 0.8, 1.45, 5.5, { rx: 0.5, r: 0.05 });
  for (const s of [-1, 1]) { strut(g, [0.8 + s * 2, 2.6, 3.4], [0.8 + s * 2, 0.9, 7.9], 0.05, M.steel); strut(g, [0.8 + s * 2, 1.8, 3.4], [0.8 + s * 2, 0.15, 7.9], 0.07, M.orange); }
  light(g, -1.4, 4.0, 3.45, M.warm, 0.12); light(g, 3.0, 4.0, 3.45, M.warm, 0.12);
  return g;
}

// ---------- cargo container ----------
export function container(open, tint = M.orange) {
  const g = g0();
  rbox(g, 3.2, 1.5, 1.6, tint, 0, 0.8, 0, { r: 0.06 });
  for (let i = -3; i <= 3; i++) rbox(g, 0.08, 1.4, 1.66, M.metal, i * 0.45, 0.8, 0, { r: 0.02 });
  rbox(g, 3.3, 0.1, 1.7, tint, 0, 1.58, 0, { r: 0.03 }); for (const x of [-1.5, 1.5]) rbox(g, 0.12, 0.14, 1.72, M.metal, x, 1.6, 0, { r: 0.02 });
  if (open) { rbox(g, 1.6, 0.06, 1.5, tint, 2.3, 0.05, 0, { r: 0.02 }); for (let i = 0; i < 3; i++) rbox(g, 0.6, 0.5, 0.6, M.hull2, 2.2 + (i % 2) * 0.7, 0.35 + Math.floor(i / 2) * 0.5, -0.2 + i * 0.2, { r: 0.05 }); }
  return g;
}

// ---------- fabricator: printer bay with robot arm ----------
export function fabricator() {
  const g = g0(); hexPad(g, 3.4);
  rbox(g, 3.2, 1.3, 3.0, M.hull, 0, 0.95, 0, { r: 0.2 });
  rbox(g, 2.4, 0.08, 2.2, M.teal, 0, 1.63, 0, { r: 0.04, shadow: false });
  for (let i = 0; i < 4; i++) rbox(g, 1.1 - i * 0.18, 0.18, 0.9 - i * 0.12, M.hull2, -0.3, 1.75 + i * 0.18, 0.2, { r: 0.05 });
  for (const [x, z] of [[-1.5, -1.4], [1.5, -1.4], [-1.5, 1.4], [1.5, 1.4]]) cyl(g, 0.1, 0.1, 3.2, M.steel, x, 2.9, z, { seg: 10 });
  for (const z of [-1.4, 1.4]) rbox(g, 3.4, 0.22, 0.22, M.orange, 0, 4.5, z, { r: 0.04 });
  rbox(g, 0.5, 0.3, 3.0, M.metal, 0.4, 4.35, 0, { r: 0.05 });
  cyl(g, 0.04, 0.04, 1.6, M.steel, 0.4, 3.5, 0, { seg: 6 }); cyl(g, 0.16, 0.06, 0.3, M.teal, 0.4, 2.6, 0, { seg: 10, shadow: false });
  // robot arm beside the bay
  cyl(g, 0.45, 0.55, 0.5, M.metal, 2.4, 0.55, 1.6);
  const a1 = rbox(g, 0.35, 1.8, 0.35, M.orange, 2.4, 1.6, 1.6, { r: 0.1, rz: 0.35 });
  cyl(g, 0.22, 0.22, 0.5, M.metal, 2.1, 2.45, 1.6, { rx: Math.PI / 2 });
  rbox(g, 0.28, 1.5, 0.28, M.orange, 1.5, 2.8, 1.6, { r: 0.08, rz: 1.1 });
  cyl(g, 0.12, 0.05, 0.35, M.teal, 0.85, 2.6, 1.6, { rz: 1.4, shadow: false });
  // console and cables
  rbox(g, 0.8, 1.0, 0.5, M.hull2, -2.4, 0.8, 1.2, { r: 0.08 }); rbox(g, 0.6, 0.35, 0.05, M.blueGlow, -2.4, 1.1, 1.46, { r: 0.02, shadow: false });
  pipe(g, [[-2.4, 0.35, 0.9], [-2.2, 0.2, 0], [-1.6, 0.35, -0.6]], 0.06, M.rubber);
  return g;
}

// ---------- carbon drill rig: derrick, engine, conveyor, hopper ----------
export function drillRig() {
  const g = g0(); hexPad(g, 3.6);
  lattice(g, 7.5, 2.4, 0.7, 6, 0.05, M.orange, 0, 0.3, 0);
  rbox(g, 1.2, 0.5, 1.2, M.metal, 0, 7.9, 0, { r: 0.08 }); light(g, 0, 8.3, 0, M.redLight, 0.13);
  cyl(g, 0.12, 0.12, 7.2, M.steel, 0, 3.9, 0, { seg: 10 });
  cyl(g, 0.5, 0.5, 0.6, M.metal, 0, 0.6, 0, { seg: 16 });
  cyl(g, 0.32, 0.08, 1.2, M.steel, 0, 0.1, 0, { seg: 12 });
  // engine house
  rbox(g, 2.0, 1.4, 1.5, M.hull, -2.4, 1.0, -0.8, { r: 0.18 });
  for (let i = 0; i < 4; i++) rbox(g, 1.2, 0.06, 0.04, M.metal, -2.4, 0.7 + i * 0.18, -0.03, { r: 0.01 });
  cyl(g, 0.16, 0.16, 1.2, M.metal, -3.0, 2.2, -1.2, { seg: 10 }); light(g, -1.6, 1.6, -0.03, M.teal, 0.1);
  // conveyor to the hopper and the carbon pile
  rbox(g, 0.7, 0.12, 4.2, M.metal, 1.7, 1.2, 1.6, { r: 0.04, rx: -0.35, ry: -0.6 });
  rbox(g, 0.55, 0.06, 4.1, M.rubber, 1.7, 1.28, 1.6, { r: 0.02, rx: -0.35, ry: -0.6 });
  for (const t of [0, 1]) cyl(g, 0.06, 0.06, 1.2 + t * 0.9, M.steel, 0.7 + t * 2.1, 0.6 + t * 0.4, 0.2 + t * 2.8, { seg: 6 });
  cyl(g, 1.1, 0.5, 1.2, M.hull2, 3.2, 2.0, 3.4, { seg: 4, ry: Math.PI / 4 });
  for (const [x, z] of [[2.6, 2.8], [3.8, 2.8], [2.6, 4.0], [3.8, 4.0]]) cyl(g, 0.07, 0.07, 1.4, M.metal, x, 0.7, z, { seg: 6 });
  return g;
}

// ---------- water extractor: tanks, pump, pipes into the ice ----------
export function waterExtractor() {
  const g = g0(); hexPad(g, 3.2);
  for (const [x, z, h] of [[-0.9, -0.6, 3.2], [1.0, -0.9, 2.6]]) {
    cyl(g, 0.95, 0.95, h, M.hull, x, 0.3 + h / 2, z, { seg: 32 }); sph(g, 0.95, M.hull, x, 0.3 + h, z, { half: true });
    for (let k = 1; k < 3; k++) tor(g, 0.97, 0.05, M.metal, x, 0.3 + h * k / 3, z, { rx: Math.PI / 2 });
    tor(g, 0.98, 0.07, M.orange, x, 0.3 + h - 0.2, z, { rx: Math.PI / 2 });
  }
  rbox(g, 1.6, 1.0, 1.2, M.hull2, 0.3, 0.8, 1.4, { r: 0.12 });
  cyl(g, 0.38, 0.38, 0.1, M.metal, 0.3, 1.0, 2.02, { rx: Math.PI / 2, seg: 20 }); cyl(g, 0.1, 0.1, 0.12, M.steel, 0.3, 1.0, 2.05, { rx: Math.PI / 2 });
  light(g, 1.0, 1.25, 2.02, M.blueGlow, 0.08);
  pipe(g, [[0.3, 0.6, 2.0], [0.3, 0.45, 2.8], [1.6, 0.35, 3.3], [2.9, 0.1, 3.4]], 0.16, M.steel, true);
  pipe(g, [[-0.9, 0.9, 0.3], [-0.6, 0.8, 1.2], [-0.4, 0.8, 1.4]], 0.11, M.metal);
  return g;
}

// ---------- atmosphere processor: tall ribbed tower with intake fans and a catwalk ----------
export function processor() {
  const g = g0(); hexPad(g, 3.6);
  lathe(g, [[2.3, 0.3], [2.3, 1.2], [1.8, 1.6], [1.6, 4], [1.45, 7.5], [1.1, 8.3], [1.25, 8.6], [1.25, 9.2], [0.9, 9.4], [0, 9.4]], M.hull, 0, 0, 0, { seg: 40, tile: 3 });
  for (const h of [2.2, 3.4, 4.6, 5.8, 7.0]) tor(g, 1.63 - h * 0.02, 0.05, M.metal, 0, h, 0, { rx: Math.PI / 2, seg: 40 });
  cyl(g, 1.27, 1.27, 0.12, M.teal, 0, 8.9, 0, { open: true, shadow: false });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; const fx = Math.cos(a) * 2.25, fz = Math.sin(a) * 2.25; cyl(g, 0.55, 0.55, 0.25, M.metal, fx, 0.8, fz, { rz: Math.PI / 2, ry: -a, seg: 20 }); cyl(g, 0.12, 0.12, 0.3, M.steel, fx, 0.8, fz, { rz: Math.PI / 2, ry: -a }); }
  tor(g, 2.05, 0.06, M.steel, 0, 5.0, 0, { rx: Math.PI / 2, seg: 48 }); cyl(g, 2.0, 2.0, 0.08, M.metal, 0, 4.9, 0, { open: false, seg: 48 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; cyl(g, 0.025, 0.025, 0.6, M.steel, Math.cos(a) * 2.05, 5.2, Math.sin(a) * 2.05, { seg: 4 }); }
  rbox(g, 0.35, 4.6, 0.08, M.steel, 1.62, 2.7, 0.2, { r: 0.02, ry: 0.1 });
  for (const s of [-1, 1]) { cyl(g, 0.55, 0.55, 2.2, M.hull2, s * 2.6, 0.9, 2.0, { rz: Math.PI / 2, seg: 20 }); pipe(g, [[s * 1.6, 0.9, 2.0], [s * 1.0, 1.4, 1.2], [s * 0.6, 1.8, 1.0]], 0.09, M.metal); }
  light(g, 0, 9.5, 0, M.redLight, 0.12);
  return g;
}

// ---------- research station: domes linked by corridors, dish, solar wings ----------
export function research(big = false) {
  const g = g0(); hexPad(g, 3.6);
  const dome = (x, z, r) => { sph(g, r, M.hull, x, 0.3, z, { half: true, seg: 40, seg2: 16, tile: 3 }); cyl(g, r + 0.05, r + 0.08, 0.35, M.metal, x, 0.45, z, { seg: 40 }); tor(g, r * 0.72, 0.06, M.teal, x, 0.3 + r * 0.68, z, { rx: Math.PI / 2, shadow: false }); };
  dome(0, 0, 2.3); dome(3.4, 1.6, 1.4);
  cyl(g, 0.55, 0.55, 2.0, M.hull2, 1.8, 0.9, 0.85, { rz: Math.PI / 2, ry: -0.45 });
  for (const t of [0.3, 1.0, 1.7]) tor(g, 0.58, 0.05, M.metal, 1.0 + t, 0.9, 0.5 + t * 0.45, { ry: Math.PI / 2 - 0.45 });
  if (big) { dome(-3.0, 1.9, 1.6); cyl(g, 0.55, 0.55, 1.8, M.hull2, -1.6, 0.9, 1.0, { rz: Math.PI / 2, ry: 0.55 }); }
  lattice(g, 4, 0.9, 0.35, 4, 0.035, M.steel, -1.6, 0.3, -2.2);
  const dish = g0(); dish.position.set(-1.6, 4.9, -2.2); dish.rotation.set(-0.8, 0.5, 0); g.add(dish);
  lathe(dish, [[0, 0], [0.6, 0.05], [1.2, 0.22], [1.6, 0.42]], M.white, 0, 0, 0, { seg: 32 }); cyl(dish, 0.03, 0.03, 1.1, M.steel, 0, 0.6, 0); light(dish, 0, 1.15, 0, M.redLight, 0.07);
  for (const s of [-1, 1]) { rbox(g, 2.4, 0.06, 1.2, M.solar, 2.9 + s * 0.0, 2.4, -1.8 + s * 1.3, { r: 0.02, rx: -0.4 }); cyl(g, 0.05, 0.05, 2.2, M.steel, 2.9, 1.3, -1.8 + s * 1.3); }
  return g;
}

// ---------- storage depot: ribbed hangar with crates and barrels ----------
export function storage() {
  const g = g0(); hexPad(g, 4.2);
  cyl(g, 2.1, 2.1, 6, M.hull2, 0, 0.3, 0, { rz: Math.PI / 2, tl: Math.PI, ts: -Math.PI / 2 + Math.PI / 2, seg: 32 });
  for (let i = 0; i <= 6; i++) tor(g, 2.14, 0.07, M.metal, -3 + i, 0.3, 0, { ry: Math.PI / 2, arc: Math.PI, seg: 24 });
  cyl(g, 2.0, 2.0, 0.1, M.rubber, 3.0, 0.3, 0, { rz: Math.PI / 2, tl: Math.PI, seg: 24 });
  rbox(g, 0.12, 1.8, 2.6, M.orange, 3.05, 1.2, 0, { r: 0.04 });
  for (let i = 0; i < 7; i++) rbox(g, 0.7, 0.7, 0.7, i % 3 === 0 ? M.orange : M.hull, -2.6 + (i % 4) * 0.85, 0.66 + Math.floor(i / 4) * 0.7, 2.8, { r: 0.06 });
  for (let i = 0; i < 5; i++) { cyl(g, 0.3, 0.3, 0.8, i % 2 ? M.metal : M.teal.clone ? M.hull2 : M.hull2, 1.6 + (i % 3) * 0.66, 0.7, 3.0 + Math.floor(i / 3) * 0.66, { seg: 16 }); }
  light(g, 3.1, 2.4, 0, M.warm, 0.12);
  return g;
}

// ---------- geolocator: lattice mast, radar dish, scanning ring, guy wires ----------
export function geolocator() {
  const g = g0(); hexPad(g, 2.6);
  rbox(g, 1.8, 0.9, 1.8, M.hull, 0, 0.75, 0, { r: 0.15 });
  lattice(g, 6.5, 1.1, 0.4, 5, 0.04, M.steel, 0, 1.2, 0);
  const d = g0(); d.position.set(0, 8.1, 0); d.rotation.set(-0.9, 0.7, 0); g.add(d);
  lathe(d, [[0, 0], [0.8, 0.08], [1.5, 0.3], [2.0, 0.6]], M.white, 0, 0, 0, { seg: 40 }); cyl(d, 0.04, 0.04, 1.4, M.steel, 0, 0.75, 0); sph(d, 0.12, M.orange, 0, 1.45, 0);
  tor(g, 0.9, 0.05, M.teal, 0, 6.2, 0, { rx: Math.PI / 2, shadow: false });
  for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.3; strut(g, [0, 5.5, 0], [Math.cos(a) * 4, 0.3, Math.sin(a) * 4], 0.015, M.steel, 4); cyl(g, 0.15, 0.2, 0.3, M.metal, Math.cos(a) * 4, 0.15, Math.sin(a) * 4); }
  light(g, 0, 7.7, 0, M.redLight, 0.1);
  return g;
}

// ---------- housing module: hab capsules on struts with lit windows ----------
export function habModule(n = 2) {
  const g = g0(); hexPad(g, 3.6);
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * 2.6;
    const cap = mesh(new THREE.CapsuleGeometry(1.0, 3.4, 8, 24), M.hull, g, 0, 1.6, z, { rz: Math.PI / 2, tile: 3 });
    for (const x of [-1.8, -0.6, 0.6, 1.8]) tor(g, 1.02, 0.04, M.metal, x, 1.6, z, { ry: Math.PI / 2, seg: 32 });
    for (const x of [-1.2, 0, 1.2]) rbox(g, 0.6, 0.4, 0.1, M.warm, x, 1.75, z + 0.98, { r: 0.08, shadow: false });
    for (const x of [-1.4, 1.4]) for (const s of [-0.6, 0.6]) cyl(g, 0.07, 0.07, 0.9, M.steel, x, 0.65, z + s, { seg: 6 });
    rbox(g, 2.6, 0.05, 1.3, M.solar, 0, 2.75, z, { r: 0.02 });
  }
  rbox(g, 1.0, 1.6, 1.0, M.hull2, -2.7, 1.1, 0, { r: 0.15 }); rbox(g, 0.5, 1.0, 0.05, M.darkGlass, -2.7, 1.0, 0.52, { r: 0.04 });
  light(g, -2.7, 2.05, 0.4, M.warm, 0.1);
  rbox(g, 0.6, 0.12, 0.6, M.orange, -2.7, 2.0, 0, { r: 0.04 });
  return g;
}

// ---------- ground rover ----------
export function rover() {
  const g = g0();
  rbox(g, 2.6, 0.7, 1.4, M.hull, 0, 0.95, 0, { r: 0.2 });
  rbox(g, 1.1, 0.6, 1.2, M.darkGlass, 0.7, 1.5, 0, { r: 0.25 });
  rbox(g, 1.3, 0.05, 1.2, M.solar, -0.6, 1.33, 0, { r: 0.02 });
  for (const x of [-0.9, 0, 0.9]) for (const s of [-1, 1]) cyl(g, 0.38, 0.38, 0.3, M.rubber, x, 0.4, s * 0.8, { rx: Math.PI / 2, seg: 16 });
  rbox(g, 2.7, 0.12, 0.2, M.orange, 0, 0.85, 0.72, { r: 0.04 });
  cyl(g, 0.02, 0.02, 1, M.steel, -1.0, 1.8, -0.4, { seg: 4 }); light(g, 1.3, 1.0, 0.45, M.warm, 0.08); light(g, 1.3, 1.0, -0.45, M.warm, 0.08);
  return g;
}

// ---------- the Commander in his suit ----------
export function astronaut(scale = 1.5) {
  const g = g0(); g.scale.setScalar(scale);
  for (const s of [-1, 1]) mesh(new THREE.CapsuleGeometry(0.11, 0.45, 4, 10), M.white, g, s * 0.13, 0.35, 0);
  rbox(g, 0.5, 0.6, 0.32, M.white, 0, 0.95, 0, { r: 0.12 });
  rbox(g, 0.42, 0.5, 0.22, M.hull2, 0, 0.98, -0.25, { r: 0.08 });
  rbox(g, 0.52, 0.08, 0.34, M.orange, 0, 0.75, 0, { r: 0.03 });
  for (const s of [-1, 1]) mesh(new THREE.CapsuleGeometry(0.08, 0.42, 4, 8), M.white, g, s * 0.33, 0.92, 0.04, { rz: s * 0.25 });
  sph(g, 0.2, M.white, 0, 1.42, 0, { seg: 20 }); sph(g, 0.16, M.gold, 0, 1.43, 0.08, { seg: 16, s: [1, 0.8, 0.9] });
  return g;
}

// ---------- ЕХО: the little tutorial robot ----------
export function echoBot() {
  const g = g0();
  sph(g, 0.5, M.white, 0, 0, 0, { seg: 32 });
  rbox(g, 0.6, 0.22, 0.2, M.darkGlass, 0, 0.05, 0.42, { r: 0.1 });
  rbox(g, 0.4, 0.08, 0.05, M.teal, 0, 0.05, 0.53, { r: 0.03, shadow: false });
  tor(g, 0.68, 0.05, M.teal, 0, -0.12, 0, { rx: Math.PI / 2, shadow: false });
  for (const s of [-1, 1]) rbox(g, 0.12, 0.35, 0.3, M.hull2, s * 0.55, 0, 0, { r: 0.05 });
  cyl(g, 0.02, 0.02, 0.4, M.steel, 0.15, 0.6, 0, { seg: 4 }); light(g, 0.15, 0.82, 0, M.teal, 0.05);
  return g;
}

// ---------- late game ----------
export function tower(h, w = 4.2, accentHex = '#4fd1a5') {
  const g = g0();
  const fac = T.facadeSet(accentHex);
  fac.map.repeat.set(1, 1); fac.emissiveMap.repeat.set(1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: fac.map, emissiveMap: fac.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2, envMapIntensity: 1.2 });
  const h1 = h * 0.62;
  rbox(g, w, h1, w, mat, 0, h1 / 2, 0, { r: 0.5, tile: 20 });
  rbox(g, w * 0.78, h - h1, w * 0.78, mat, -0.2, h1 + (h - h1) / 2, -0.2, { r: 0.45, tile: 20 });
  rbox(g, w + 0.2, 0.25, w + 0.2, M.white, 0, h1, 0, { r: 0.1 });
  rbox(g, w * 0.7, 0.35, w * 0.7, M.leaf, -0.2, h + 0.18, -0.2, { r: 0.12 });
  for (let i = 0; i < 3; i++) { sph(g, 0.45, M.leaf, -1 + i * 0.9, h + 0.6, 0.3 - i * 0.3, { seg: 10, seg2: 8 }); }
  rbox(g, w * 0.82, 0.08, 0.12, M.teal, -0.2, h + 0.02, w * 0.39 - 0.2, { r: 0.03, shadow: false });
  rbox(g, w * 0.3, 0.06, w * 0.3, M.solar, w * 0.2, h1 + 0.2, w * 0.3, { r: 0.02 });
  cyl(g, 0.04, 0.04, 2, M.steel, 0.6, h + 1.0, -0.8, { seg: 4 }); light(g, 0.6, h + 2.05, -0.8, M.redLight, 0.09);
  return g;
}
export function house(roofMat) {
  const g = g0();
  rbox(g, 3.2, 1.8, 2.6, M.white, 0, 0.9, 0, { r: 0.15 });
  rbox(g, 1.8, 1.4, 2.0, M.wood, 1.1, 2.4, -0.2, { r: 0.12 });
  rbox(g, 3.3, 0.14, 2.7, roofMat || M.metal, 0, 1.86, 0, { r: 0.05 });
  rbox(g, 1.4, 0.05, 1.0, M.solar, -0.7, 1.95, 0, { r: 0.02, rx: -0.2 });
  rbox(g, 1.6, 1.0, 0.06, M.darkGlass, -0.5, 0.95, 1.31, { r: 0.04 }); rbox(g, 0.5, 0.4, 0.06, M.warm, 1.1, 1.0, 1.31, { r: 0.04, shadow: false });
  return g;
}
export function geoDome(r, fill) {
  const g = g0();
  cyl(g, r + 0.2, r + 0.3, 0.5, M.concrete, 0, 0.25, 0, { seg: 40, tile: 6 });
  const ico = new THREE.IcosahedronGeometry(r, 2), pos = ico.attributes.position, seen = new Set(), mat = M.steel;
  for (let i = 0; i < pos.count; i += 3) for (let k = 0; k < 3; k++) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i + k), b = new THREE.Vector3().fromBufferAttribute(pos, i + (k + 1) % 3);
    if (a.y < -0.05 && b.y < -0.05) continue;
    const key = [a, b].map(v => v.toArray().map(n => n.toFixed(2)).join(',')).sort().join('|'); if (seen.has(key)) continue; seen.add(key);
    a.y = Math.max(0, a.y); b.y = Math.max(0, b.y);
    strut(g, [a.x, a.y + 0.5, a.z], [b.x, b.y + 0.5, b.z], 0.045, mat, 4);
  }
  sph(g, r, M.glass, 0, 0.5, 0, { half: true, seg: 40, seg2: 16, shadow: false });
  if (fill) fill(g);
  return g;
}
export function greenhouse(len = 7) {
  const g = g0();
  rbox(g, len, 0.3, 3.6, M.concrete, 0, 0.15, 0, { r: 0.05 });
  const crop = new THREE.MeshStandardMaterial({ ...T.cropSet([92, 160, 70], [140, 190, 80]), roughness: 0.9 });
  rbox(g, len - 0.4, 0.2, 3.0, crop, 0, 0.4, 0, { r: 0.04, tile: 3 });
  cyl(g, 1.8, 1.8, len, M.glass, 0, 0.3, 0, { rz: Math.PI / 2, tl: Math.PI, ts: 0, seg: 24, shadow: false, open: true });
  for (let i = 0; i <= len; i += 1) tor(g, 1.82, 0.05, M.steel, -len / 2 + i, 0.3, 0, { ry: Math.PI / 2, arc: Math.PI, seg: 24 });
  return g;
}
export function turbine(rot = 0) {
  const g = g0();
  cyl(g, 0.18, 0.42, 12, M.white, 0, 6, 0, { seg: 16 });
  rbox(g, 0.9, 0.8, 2.0, M.white, 0, 12.2, 0.2, { r: 0.35 });
  sph(g, 0.35, M.orange, 0, 12.2, 1.25, { seg: 16 });
  for (let i = 0; i < 3; i++) {
    const b = g0(); b.position.set(0, 12.2, 1.35); b.rotation.z = rot + i * Math.PI * 2 / 3; g.add(b);
    const shp = new THREE.Shape(); shp.moveTo(-0.25, 0.3); shp.lineTo(0.3, 0.3); shp.lineTo(0.12, 6.2); shp.lineTo(-0.05, 6.3); shp.lineTo(-0.25, 0.3);
    mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), M.white, b, 0, 0, 0);
  }
  return g;
}
export function coolingTower() {
  const g = g0();
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([4.2 - 2.0 * Math.sin(t * Math.PI * 0.78) + 0.3 * t, t * 11]); }
  lathe(g, pts, M.hull2, 0, 0, 0, { seg: 40, tile: 4 });
  for (const h of [9.6, 10.3]) { const r = pts[Math.round(h / 11 * 14)][0]; cyl(g, r + 0.05, r + 0.05, 0.4, M.orange, 0, h, 0, { open: true, seg: 40 }); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; strut(g, [Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2], [Math.cos(a + 0.3) * 4.1, 1.4, Math.sin(a + 0.3) * 4.1], 0.12, M.concrete); }
  const reactor = g0(); reactor.position.set(7, 0, 1); g.add(reactor);
  cyl(reactor, 2.4, 2.5, 3, M.hull, 0, 1.5, 0, { seg: 40 }); sph(reactor, 2.4, M.hull, 0, 3, 0, { half: true, seg: 40 });
  tor(reactor, 2.42, 0.08, M.teal, 0, 2.2, 0, { rx: Math.PI / 2, shadow: false });
  rbox(reactor, 3, 2.2, 2.6, M.hull2, 3.2, 1.1, 0, { r: 0.2 });
  pipe(g, [[4.6, 1.8, 1], [3.4, 2.4, 0.8], [2.4, 2.4, 0.6]], 0.25, M.steel, true);
  return g;
}
export function smelter() {
  const g = g0();
  rbox(g, 6, 3.4, 4.4, M.hull2, 0, 1.7, 0, { r: 0.2 });
  for (let i = 0; i < 4; i++) { rbox(g, 1.4, 0.9, 4.4, M.hull2, -2.2 + i * 1.5, 3.6, 0, { r: 0.05, rz: 0.5 }); rbox(g, 0.08, 0.7, 4.3, M.blueGlow, -1.75 + i * 1.5, 3.55, 0, { r: 0.02, rz: 0.5, shadow: false }); }
  for (const [x, z, h] of [[1.8, -1.3, 7], [0.4, -1.3, 6]]) { cyl(g, 0.45, 0.55, h, M.metal, x, h / 2, z, { seg: 16 }); for (const t of [0.85, 0.92]) cyl(g, 0.47, 0.47, 0.25, t > 0.9 ? M.orange : M.white, x, h * t, z, { open: true, seg: 16 }); }
  rbox(g, 2.2, 1.0, 0.08, M.engineGlow, -1.2, 1.2, 2.21, { r: 0.04, shadow: false });
  rbox(g, 0.8, 0.14, 5, M.metal, -3.9, 1.6, 1.5, { r: 0.04, rx: -0.25, ry: 0.3 });
  for (let i = 0; i < 6; i++) sph(g, 0.5 + rng01() * 0.4, M.carbon, -4.6 + rng01() * 1.5, 0.2, 3.6 + rng01() * 1.2, { seg: 6, seg2: 4 });
  return g;
}
function rng01() { return T.rng(); }
export function shuttleOnPad() {
  const g = g0(); hexPad(g, 4.4);
  lattice(g, 10, 1.4, 1.0, 7, 0.05, M.orange, -3.2, 0.3, 0);
  rbox(g, 2.4, 0.2, 0.3, M.orange, -2.0, 7.5, 0, { r: 0.05 });
  const s = g0(); s.position.set(0, 0.3, 0); g.add(s);
  lathe(s, [[0, 0], [0.9, 0.2], [1.25, 1.2], [1.3, 6.5], [1.0, 8.2], [0.5, 9.4], [0, 9.8]], M.hull, 0, 0.6, 0, { seg: 36, tile: 3 });
  cyl(s, 1.32, 1.32, 0.6, M.orange, 0, 5.4, 0, { open: true, seg: 36 });
  rbox(s, 1.0, 0.5, 0.1, M.darkGlass, 0, 8.2, 0.95, { r: 0.1 });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(1.4, 0); fin.lineTo(0.2, 2.6); fin.lineTo(0, 2.6); mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.12, bevelEnabled: false }), M.hull2, s, Math.cos(a) * 1.15, 0.6, Math.sin(a) * 1.15, { ry: -a }); }
  for (const a of [0, 2.1, 4.2]) lathe(s, [[0.25, 0], [0.4, 0.4], [0.5, 0.6]], M.metal, Math.cos(a) * 0.5, 0.0, Math.sin(a) * 0.5, { seg: 16, rx: Math.PI });
  return g;
}
// battleship in its dock: angular hull in layers, engine block, bridge, open frame where plates are still missing
export function warshipDock() {
  const g = g0();
  rbox(g, 34, 0.6, 16, M.concrete, 0, 0.3, 0, { r: 0.1, tile: 6 });
  for (const z of [-5.5, 5.5]) rbox(g, 30, 0.12, 0.3, M.orange, 0, 0.62, z, { r: 0.02 });
  const ship = g0(); ship.position.set(0, 3.2, 0); g.add(ship);
  const deck = (len, wid, nose, h, y, mat) => {
    const sh = new THREE.Shape();
    sh.moveTo(-len / 2, -wid / 2 + 0.6); sh.lineTo(-len / 2 + 0.6, -wid / 2); sh.lineTo(len / 2 - nose, -wid / 2); sh.lineTo(len / 2, -wid * 0.12); sh.lineTo(len / 2, wid * 0.12); sh.lineTo(len / 2 - nose, wid / 2); sh.lineTo(-len / 2 + 0.6, wid / 2); sh.lineTo(-len / 2, wid / 2 - 0.6); sh.lineTo(-len / 2, -wid / 2 + 0.6);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    return mesh(geo, mat, ship, 0, y, 0, { tile: 5 });
  };
  deck(26, 7.2, 7, 2.2, -1.2, M.ship);
  deck(20, 5.4, 5.5, 1.6, 1.2, M.ship);
  deck(9, 3.4, 2.5, 1.4, 3.0, M.hull2).position.x = -4;
  rbox(ship, 3.0, 1.2, 2.4, M.hull, -5, 5.0, 0, { r: 0.2 });
  rbox(ship, 2.2, 0.35, 2.3, M.darkGlass, -4.0, 5.2, 0, { r: 0.12 });
  rbox(ship, 26.6, 0.3, 0.2, M.orange, 0, 0.4, 3.75, { r: 0.05 }); rbox(ship, 26.6, 0.3, 0.2, M.orange, 0, 0.4, -3.75, { r: 0.05 });
  for (let i = 0; i < 14; i++) rbox(ship, 0.5, 0.18, 0.06, M.blueGlow, -9 + i * 1.3, 0.05, 3.78, { r: 0.03, shadow: false });
  // engine block
  rbox(ship, 3, 4.2, 6.6, M.metal, -13.6, 0.6, 0, { r: 0.3 });
  for (const [y, z] of [[1.6, -1.8], [1.6, 1.8], [-0.4, -1.8], [-0.4, 1.8]]) { const e = g0(); e.position.set(-15.1, y, z); e.rotation.z = Math.PI / 2; ship.add(e); lathe(e, [[0.5, 0], [0.7, 0.4], [1.0, 1.4], [1.05, 1.5]], M.steel, 0, 0, 0, { seg: 24 }); cyl(e, 0.5, 0.5, 0.05, M.blueGlow, 0, 0.3, 0, { seg: 16, shadow: false }); }
  // empty turret rings: the guns arrive with the next sketch
  for (const x of [-1, 4.5, 9]) { cyl(ship, 0.9, 1.0, 0.35, M.metal, x, 3.0, 0, { seg: 24 }); tor(ship, 0.9, 0.06, M.orange, x, 3.2, 0, { rx: Math.PI / 2 }); }
  // the nose is still bare frame
  for (let i = 0; i < 5; i++) { const x = 8 + i * 1.1, w = 3.4 - i * 0.55; tor(ship, w, 0.08, M.steel, x, 1.0, 0, { ry: Math.PI / 2, arc: Math.PI, seg: 16, rz: 0 }); }
  // scaffold and two gantry cranes
  for (const z of [-6.6, 6.6]) for (let x = -14; x <= 14; x += 7) { cyl(g, 0.07, 0.07, 8.5, M.steel, x, 4.25, z, { seg: 6 }); }
  for (const z of [-6.6, 6.6]) for (const y of [4, 8]) rbox(g, 28.5, 0.1, 0.5, M.steel, 0, y, z, { r: 0.03 });
  for (const x of [-7, 6]) {
    for (const z of [-7.6, 7.6]) rbox(g, 0.6, 14, 0.6, M.orange, x, 7, z, { r: 0.08 });
    rbox(g, 1.0, 1.0, 16.2, M.orange, x, 14.2, 0, { r: 0.1 });
    rbox(g, 1.6, 0.9, 1.4, M.metal, x, 13.3, x > 0 ? 2.5 : -2.0, { r: 0.12 });
    cyl(g, 0.03, 0.03, 6, M.steel, x, 10.3, x > 0 ? 2.5 : -2.0, { seg: 4 });
    rbox(g, 1.2, 0.6, 1.2, M.hull2, x, 7.2, x > 0 ? 2.5 : -2.0, { r: 0.1 });
    light(g, x, 14.8, 7.6, M.redLight, 0.15);
  }
  return g;
}
export function capsuleChute() {
  const g = g0();
  cyl(g, 0.45, 0.6, 1.1, M.hull, 0, 0, 0, { seg: 20 }); cyl(g, 0.62, 0.62, 0.2, M.orange, 0, -0.45, 0, { seg: 20 }); light(g, 0, 0.62, 0, M.teal, 0.1);
  const c = T.canvas(256, 64), x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff8a3d'; x.fillRect(i * 32, 0, 32, 64); }
  const chute = new THREE.MeshStandardMaterial({ map: T.tex(c), side: THREE.DoubleSide, roughness: 0.8 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), chute); dome.position.y = 3.6; dome.castShadow = true; g.add(dome);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; strut(g, [0, 0.5, 0], [Math.cos(a) * 1.75, 4.1, Math.sin(a) * 1.75], 0.012, M.white, 3); }
  return g;
}
export function drone() {
  const g = g0();
  rbox(g, 0.7, 0.22, 0.7, M.hull, 0, 0, 0, { r: 0.08 });
  for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { cyl(g, 0.26, 0.26, 0.03, M.glass, a, 0.12, b, { seg: 16, shadow: false }); cyl(g, 0.05, 0.05, 0.1, M.metal, a, 0.06, b); }
  light(g, 0, -0.14, 0.32, M.teal, 0.06);
  rbox(g, 0.55, 0.45, 0.55, M.orange, 0, -0.45, 0, { r: 0.06 });
  return g;
}
export function monorail(p, pts, y = 4.5) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, gy, z]) => new THREE.Vector3(x, gy + y, z)));
  const beam = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.22, 8, false), M.steel); beam.castShadow = true; beam.receiveShadow = true; beam.scale.y = 1; p.add(beam);
  for (let t = 0; t <= 1.0001; t += 0.08) { const q = curve.getPointAt(Math.min(1, t)); cyl(p, 0.16, 0.24, y, M.white, q.x, q.y - y / 2, q.z, { seg: 10 }); rbox(p, 0.7, 0.24, 0.5, M.metal, q.x, q.y - 0.3, q.z, { r: 0.06 }); }
  const t0 = 0.42, train = g0(); p.add(train);
  const q = curve.getPointAt(t0), tg = curve.getTangentAt(t0);
  train.position.copy(q).add(new THREE.Vector3(0, 0.55, 0)); train.rotation.y = Math.atan2(tg.x, tg.z);
  for (let i = 0; i < 3; i++) { mesh(new THREE.CapsuleGeometry(0.5, 2.4, 6, 20), M.hull, train, 0, 0, i * 3.5 - 3.5, { rx: Math.PI / 2, tile: 3 }); rbox(train, 0.06, 0.22, 2.4, M.blueGlow, 0.5, 0.1, i * 3.5 - 3.5, { r: 0.03, shadow: false }); rbox(train, 0.9, 0.16, 2.6, M.orange, 0, -0.42, i * 3.5 - 3.5, { r: 0.05 }); }
  return train;
}
