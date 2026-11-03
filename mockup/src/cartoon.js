// Zerks-X6 cartoon mockup: a friendly, flat-coloured look for levels 1 and 3.
// States: #lvl1 (tutorial, ЕХО points at the rubble) and #lvl3 (dome, kitchen, workers).
// Same models as the first mockup: the CellCog Ark and carbon drill, the code-built buildings from models.js
// with flat cartoon materials instead of the scanned textures.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';
import * as K from './models.js';

const STATE = (location.hash || '#lvl1').slice(1);
const L3 = STATE === 'lvl3';
const DPR = Number(new URLSearchParams(location.search).get('dpr') || 1);
const W = 390, H = 844;
T.seed(L3 ? 33 : 11);
const rnd = () => T.rng();

// ---------- renderer and soft, bright light ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('view').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xee9f66);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
scene.add(new THREE.HemisphereLight(0xfff1e0, 0xe7925f, 1.05));
const sun = new THREE.DirectionalLight(0xfff0dc, 2.9);
sun.position.set(-34, 70, 30); sun.target.position.set(0, 0, -2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 6;
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 220 }); sun.shadow.camera.updateProjectionMatrix();

// ---------- flat cartoon palette for the code-built models ----------
const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...o });
const glow = (color, k = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });
Object.assign(K.M, {
  hull: flat(0xfbf3e6), hull2: flat(0xe9dfcf), ship: flat(0xd9dee6), metal: flat(0x55607a), steel: flat(0xa7b2c4),
  orange: flat(0xff8b3d), concrete: flat(0xf3e6d4), rubber: flat(0x3a3f4e), darkGlass: flat(0x2f4f78, { roughness: 0.25 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  teal: glow(0x33d1a8, 1.2), warm: glow(0xffd58a, 1.1), redLight: glow(0xff5d5d, 1.4), engineGlow: glow(0xff9a4a), blueGlow: glow(0x7fd6ff),
  solar: flat(0x3d6fb5, { roughness: 0.35 }), carbon: flat(0x2e2c33), ice: flat(0xd6f3ff, { roughness: 0.3 }), wood: flat(0xc98b55),
  leaf: flat(0x6cc94f), gold: flat(0xffc65c), white: flat(0xffffff),
});
const M = K.M;
const C = { ground: 0xee9f66, path: 0xf6c590, pad: 0xfff4e4, padEdge: 0xe8b285, cliff: 0xd9825a, cliffTop: 0xeba46f, rock: 0xcf7a52, rock2: 0xb9643f };

const add = (o, x = 0, y = 0, z = 0, ry = 0, s = 1) => { o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o; };
const shadowAll = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const rb = (w, h, d, mat, r = 0.4, seg = 3) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), mat); m.castShadow = true; m.receiveShadow = true; return m; };

// ---------- ground with soft cartoon blotches ----------
{
  const c = T.canvas(1024), x = c.getContext('2d');
  x.fillStyle = '#ee9f66'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) { const r = 30 + rnd() * 90, px = rnd() * 1024, py = rnd() * 1024; const g = x.createRadialGradient(px, py, 0, px, py, r); const tone = rnd() < 0.5 ? '226,140,88' : '246,184,124'; g.addColorStop(0, `rgba(${tone},.55)`); g.addColorStop(1, `rgba(${tone},0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(205,120,80,${0.25 + rnd() * 0.25})`; x.beginPath(); x.ellipse(rnd() * 1024, rnd() * 1024, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.anisotropy = 8;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
}

// ---------- canyon walls: stacked rounded terraces ----------
function cliffRow(x0, x1, z0, z1, h) {
  const n = Math.ceil(Math.abs(z1 - z0) / 7);
  for (let i = 0; i < n; i++) {
    const z = z0 + (z1 - z0) * (i + 0.5) / n, w = Math.abs(x1 - x0), hh = h * (0.85 + rnd() * 0.3), cx = (x0 + x1) / 2 + (rnd() - 0.5) * 2;
    add(rb(w + rnd() * 3, hh, 8 + rnd() * 2, flat(C.cliff), 1.6), cx, hh / 2, z);
    add(rb(w * 0.9, 1.2, 7.5, flat(C.cliffTop), 0.6), cx + (rnd() - 0.5), hh + 0.4, z + (rnd() - 0.5));
    add(rb(w * 0.55, hh * 0.45, 6, flat(C.cliff), 1.4), cx + Math.sign(x0) * (w * 0.25), hh + hh * 0.2, z + (rnd() - 0.5) * 2);
  }
}
cliffRow(-36, -19.5, 34, -70, 9);
cliffRow(19.5, 36, 34, -70, 9);
for (let i = 0; i < 6; i++) { const x = -26 + i * 10.4, hh = 10 + rnd() * 4; add(rb(11.5, hh, 9, flat(C.cliff), 1.8), x, hh / 2, -52 - rnd() * 3); add(rb(10, 1.3, 8, flat(C.cliffTop), 0.6), x, hh + 0.4, -52); }

// ---------- rounded rocks ----------
const rockGeo = new THREE.IcosahedronGeometry(1, 2);
function rock(x, z, s, mat = flat(rnd() < 0.5 ? C.rock : C.rock2)) { const m = new THREE.Mesh(rockGeo, mat); m.scale.set(s * (0.9 + rnd() * 0.4), s * (0.55 + rnd() * 0.3), s * (0.9 + rnd() * 0.4)); m.position.set(x, s * 0.25, z); m.rotation.y = rnd() * 6; m.castShadow = m.receiveShadow = true; scene.add(m); return m; }
for (let i = 0; i < 46; i++) { const side = rnd() < 0.5 ? -1 : 1, x = side * (17.6 + rnd() * 3), z = 30 - rnd() * 84; rock(x, z, 0.6 + rnd() * 1.4); }

// ---------- plots and paths on a 3 m grid: three columns, four rows ----------
const R = (x0, x1, za, zb) => ({ x0, x1, za, zb, cx: (x0 + x1) / 2, cz: (za + zb) / 2, w: x1 - x0, d: za - zb });
const COL = [[-16.5, -7.5], [-4.5, 4.5], [7.5, 16.5]];
const ROW = [[10, 1], [-2, -11], [-14, -23]];
const cell = (c, r) => R(COL[c][0], COL[c][1], ROW[r][0], ROW[r][1]);
const P = {
  ark: R(-12, 9, 23, 13.5), cargo: R(10.5, 16.5, 23, 13.5),
  pump: cell(0, 0), proc: cell(1, 0), drill: cell(2, 0),
  research: cell(0, 1), geo: cell(1, 1), veg: cell(2, 1),
  dome: cell(0, 2), kitchen: cell(1, 2), quarry: cell(2, 2),
};
const padMat = flat(C.pad), edgeMat = flat(C.padEdge);
function pad(r, kind = 'built') {
  if (kind === 'future') {
    const dash = flat(0xfff3e2, { transparent: true, opacity: 0.75 });
    const w = r.w - 0.6, d = r.d - 0.6;
    for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8; add(rb(w / 10, 0.12, 0.35, dash, 0.1), r.x0 + 0.3 + t * w, 0.06, r.za - 0.3); add(rb(w / 10, 0.12, 0.35, dash, 0.1), r.x0 + 0.3 + t * w, 0.06, r.zb + 0.3); add(rb(0.35, 0.12, d / 10, dash, 0.1), r.x0 + 0.3, 0.06, r.zb + 0.3 + t * d); add(rb(0.35, 0.12, d / 10, dash, 0.1), r.x1 - 0.3, 0.06, r.zb + 0.3 + t * d); }
    return;
  }
  add(rb(r.w - 0.2, 0.36, r.d - 0.2, edgeMat, 0.5), r.cx, 0.12, r.cz);
  add(rb(r.w - 0.8, 0.36, r.d - 0.8, padMat, 0.45), r.cx, 0.22, r.cz);
}
// paths between the rows and columns
const pathMat = flat(C.path);
for (const [x0, x1, za, zb] of [[-18, 18, 13, 10], [-18, 18, 1, -2], [-18, 18, -11, -14], [-7.5, -4.5, 13, -23], [4.5, 7.5, 13, -23]]) add(rb(x1 - x0, 0.1, za - zb, pathMat, 0.05, 1), (x0 + x1) / 2, 0.03, (za + zb) / 2);

// ---------- deposits ----------
function iceField(r) { for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(rockGeo, M.ice); const s = 0.4 + rnd() * 0.5; m.scale.set(s, s * 0.5, s); m.position.set(r.cx + 1.8 + rnd() * 2, 0.35, r.cz + 1.6 + rnd() * 2); m.castShadow = true; scene.add(m); } }
function carbonField(r) { for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + rnd() * 0.25, 0), M.carbon); m.position.set(r.cx - 3.4 + rnd() * 6.8, 0.5, r.za - 0.9 - rnd() * 0.9); m.rotation.set(rnd() * 3, rnd() * 3, 0); m.castShadow = true; scene.add(m); } }

// ---------- small builders for what models.js does not have ----------
function vegLab() {
  const g = new THREE.Group();
  g.add(at(rb(7.2, 0.4, 4.2, M.concrete, 0.2), 0, 0.2, 0));
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.42 + rnd() * 0.12, 16, 12), flat(row === 1 ? 0x8fd65a : 0x5fbf47)); p.position.set(-2.8 + i * 1.12, 0.75, -1.2 + row * 1.2); p.castShadow = true; g.add(p); }
  const tun = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 7, 32, 1, true, 0, Math.PI), M.glass); tun.rotation.z = Math.PI / 2; tun.rotation.y = Math.PI / 2; tun.rotation.order = 'YXZ'; tun.position.y = 0.4; g.add(tun);
  for (let i = 0; i <= 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.07, 8, 32, Math.PI), M.orange); ring.rotation.y = Math.PI / 2; ring.position.set(-3.5 + i * 1.75, 0.4, 0); g.add(ring); }
  return shadowAll(g);
}
function colonist(suit = 0xffffff, stripe = 0xff8b3d, opts = {}) {
  const g = new THREE.Group();
  const s = flat(suit), st = flat(stripe);
  for (const x of [-0.13, 0.13]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 4, 10), s); l.position.set(x, 0.3, 0); g.add(l); }
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.36, 6, 14), s); body.position.y = 0.86; g.add(body);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 18), st); belt.position.y = 0.74; g.add(belt);
  const pack = rb(0.36, 0.42, 0.2, flat(0xd9dee6), 0.08); pack.position.set(0, 0.92, -0.26); g.add(pack);
  for (const x of [-0.33, 0.33]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.34, 4, 8), s); a.position.set(x, 0.85, 0.02); a.rotation.z = Math.sign(x) * 0.25; g.add(a); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), s); head.position.y = 1.42; g.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), flat(0x3a6db5, { roughness: 0.2 })); visor.rotation.x = Math.PI / 2; visor.position.set(0, 1.44, 0.11); visor.scale.set(1, 1, 0.75); g.add(visor);
  if (opts.chef) { const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.3, 16), flat(0xffffff)); hat.position.y = 1.78; g.add(hat); const puff = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), flat(0xffffff)); puff.position.y = 1.95; puff.scale.y = 0.7; g.add(puff); }
  return shadowAll(g);
}
function kitchen() {
  const g = new THREE.Group();
  g.add(at(rb(5.6, 3.0, 4.2, M.hull, 0.6), -0.6, 1.7, -1.2));
  g.add(at(rb(6.2, 0.7, 4.8, M.orange, 0.35), -0.6, 3.4, -1.2));
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.6, 16), M.steel); ch.position.set(1.0, 4.3, -2.0); g.add(ch);
  g.add(at(rb(1.4, 1.9, 0.12, M.darkGlass, 0.1), -1.6, 1.35, 0.92));
  for (const x of [0.3, 1.5]) g.add(at(rb(0.9, 0.7, 0.12, M.warm, 0.1), x, 2.0, 0.92));
  // canopy and two long tables outside
  g.add(at(rb(6.4, 0.18, 2.4, flat(0x33c5a2), 0.08), -0.6, 2.7, 2.1));
  for (const x of [-3.3, 2.1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), M.steel); p.position.set(x, 1.5, 3.1); g.add(p); }
  for (const z of [2.2, 3.5]) { g.add(at(rb(3.6, 0.15, 0.8, M.wood, 0.06), -0.6, 0.95, z)); for (const s of [-0.55, 0.55]) g.add(at(rb(3.6, 0.12, 0.3, M.wood, 0.05), -0.6, 0.55, z + s)); }
  return shadowAll(g);
}
function quarry() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(rockGeo, flat(i % 2 ? C.rock : C.rock2)); const s = 1.1 + rnd() * 0.8; m.scale.set(s, s * 0.8, s); m.position.set(1.6 + rnd() * 2.2, s * 0.4, -2.2 + rnd() * 2.5); m.castShadow = true; g.add(m); }
  for (let i = 0; i < 6; i++) g.add(at(rb(0.9, 0.7, 0.9, flat(0xd9b892), 0.15), -2.6 + (i % 3) * 1.0, 0.65 + Math.floor(i / 3) * 0.72, 2.0));
  g.add(at(rb(2.0, 1.6, 1.8, M.hull, 0.35), -2.2, 1.1, -1.4));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.2, 12), M.orange); mast.position.set(-0.6, 2.4, -0.4); g.add(mast);
  const arm = rb(4.4, 0.28, 0.28, M.orange, 0.1); arm.position.set(1.0, 4.4, -0.4); arm.rotation.z = -0.25; g.add(arm);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), M.metal); hook.position.set(2.9, 3.0, -0.4); g.add(hook);
  g.add(at(rb(0.7, 0.5, 0.7, flat(0xd9b892), 0.12), 2.9, 1.95, -0.4));
  return shadowAll(g);
}
function homeDome() {
  // 4 beds: four little rooms under the glass, a plant in the middle
  return K.geoDome(3.7, g => {
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const room = rb(1.5, 1.3, 1.5, i % 2 ? M.hull : flat(0xfff0d6), 0.35); room.position.set(Math.cos(a) * 2.0, 1.15, Math.sin(a) * 2.0); g.add(room); const roof = rb(1.6, 0.25, 1.6, M.orange, 0.12); roof.position.set(Math.cos(a) * 2.0, 1.9, Math.sin(a) * 2.0); g.add(roof); const win = rb(0.5, 0.4, 0.06, M.warm, 0.05); win.position.set(Math.cos(a) * 2.0 * 0.62, 1.2, Math.sin(a) * 2.0 * 0.62); win.lookAt(0, 1.2, 0); g.add(win); }
    const tree = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 14), M.leaf); tree.position.set(0, 2.2, 0); g.add(tree);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 8), M.wood); trunk.position.set(0, 1.2, 0); g.add(trunk);
  });
}

// ---------- the soft glow and dust sprites ----------
const cloudT = T.cloudTex(), glowT = T.glowTex();
const dust = (x, y, z, s, color = 0xffffff, op = 0.6) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, color, transparent: true, opacity: op, depthWrite: false, rotation: rnd() * 6 })); m.position.set(x, y, z); m.scale.set(s, s * 0.62, 1); scene.add(m); return m; };
const halo = (x, y, z, s, color, op) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(x, y, z); m.scale.set(s, s, 1); scene.add(m); return m; };

// ---------- load the CellCog models ----------
const gltf = new GLTFLoader();
const glb = {};
await Promise.all(['ark-v1', 'carbon-drill-v1'].map(async n => {
  const root = (await gltf.loadAsync('models/' + n + '.glb')).scene;
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { m.metalness = 0; m.roughness = Math.max(0.55, m.roughness ?? 0.6); } } });
  glb[n] = root;
}));
const smooth = n => { const g = new THREE.Group(); g.add(glb[n].clone(true)); return g; };

// ---------- the base, the same in both levels ----------
const anchors = {};
const A = (name, x, y, z) => { anchors[name] = new THREE.Vector3(x, y, z); };
pad(P.ark); add(smooth('ark-v1'), P.ark.cx, 0.4, P.ark.cz, 0, 0.84);
for (let i = 0; i < 6; i++) add(rb(1.1, 0.08, 0.3, M.orange, 0.04), P.ark.x0 + 2 + i * 3.4, 0.42, P.ark.za - 0.8);
pad(P.cargo); add(shadowAll(K.container(true, M.orange)), P.cargo.cx - 0.6, 0.4, P.cargo.cz - 2.2, 0, 0.9); add(shadowAll(K.container(false, M.hull2)), P.cargo.cx - 0.6, 0.4, P.cargo.cz + 1.2, 0, 0.9);
pad(P.pump); add(shadowAll(K.waterExtractor()), P.pump.cx - 0.6, 0.4, P.pump.cz - 0.6, 0, 0.82); iceField(P.pump);
pad(P.proc); add(shadowAll(K.processor()), P.proc.cx, 0.4, P.proc.cz, 0, 0.74);
pad(P.drill); add(smooth('carbon-drill-v1'), P.drill.cx, 0.4, P.drill.cz - 0.5, 0, 1.22); carbonField(P.drill);
pad(P.veg); add(vegLab(), P.veg.cx, 0.4, P.veg.cz, 0, 1.0);
pad(P.geo); add(shadowAll(K.geolocator()), P.geo.cx, 0.4, P.geo.cz, 0, 0.78);
dust(P.proc.cx, 7.6, P.proc.cz, 3.5, 0xffffff, 0.55); dust(P.proc.cx + 0.6, 9.2, P.proc.cz - 0.6, 5, 0xffffff, 0.35);

if (!L3) {
  // ---------- level 1: the tutorial; a building lies under rubble, ЕХО shows it ----------
  pad(P.research);
  const rs = shadowAll(K.research(true)); add(rs, P.research.cx + 0.3, -0.6, P.research.cz + 0.2, 0, 0.82);
  const debrisRock = [flat(0xa9775b), flat(0x8f6650), flat(0xc28c6a)];
  for (let i = 0; i < 24; i++) rock(P.research.cx - 3.6 + rnd() * 7.2, P.research.cz - 3.4 + rnd() * 6.8, 0.5 + rnd() * 1.0, debrisRock[i % 3]);
  // bent hull plates and orange struts from the landing lie on top
  for (let i = 0; i < 7; i++) { const pl = rb(1.6 + rnd() * 1.4, 0.16, 0.9 + rnd() * 0.8, i % 3 ? M.hull : M.orange, 0.06); pl.position.set(P.research.cx - 3 + rnd() * 6, 1.0 + rnd() * 1.2, P.research.cz - 3 + rnd() * 6); pl.rotation.set(rnd() - 0.5, rnd() * 3, rnd() - 0.5); scene.add(pl); }
  for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8), M.steel); st.position.set(P.research.cx - 2.5 + rnd() * 5, 1.2, P.research.cz - 2.5 + rnd() * 5); st.rotation.set(rnd() * 1.4, rnd() * 3, 1.2); st.castShadow = true; scene.add(st); }
  for (let i = 0; i < 5; i++) dust(P.research.cx - 2 + rnd() * 4, 1.4 + rnd(), P.research.cz - 1 + rnd() * 3, 5, 0xfbe0c8, 0.45);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.18, 10, 64), glow(0x33d1a8, 1.4)); ring.rotation.x = Math.PI / 2; ring.position.set(P.research.cx, 0.55, P.research.cz); scene.add(ring);
  halo(P.research.cx, 1.2, P.research.cz, 13, 0x6ff2c4, 0.28);
  add(shadowAll(K.echoBot()), P.research.cx + 4.6, 5.4, P.research.cz + 3.0, 0.8, 1.25);
  halo(P.research.cx + 4.6, 5.4, P.research.cz + 3.0, 2.6, 0x6ff2c4, 0.45);
  // the future spots of level 2 and 3 are only outlined; the rest of the canyon is under dust
  for (const k of ['dome', 'kitchen', 'quarry']) pad(P[k], 'future');
  add(shadowAll(K.astronaut(1.7)), -1.5, 0.4, 12.2, 0.4);
  A('rubble', P.research.cx, 3.2, P.research.cz); A('echo', P.research.cx + 4.6, 6.6, P.research.cz + 3.0);
} else {
  // ---------- level 3: the first colonists, the dome, the kitchen, workers ----------
  pad(P.research); add(shadowAll(K.research(true)), P.research.cx + 0.3, 0.4, P.research.cz + 0.2, 0, 0.82);
  pad(P.dome); add(shadowAll(homeDome()), P.dome.cx, 0.4, P.dome.cz, 0, 1.0);
  halo(P.dome.cx, 2, P.dome.cz, 9, 0xffd58a, 0.22);
  pad(P.kitchen); add(kitchen(), P.kitchen.cx + 0.4, 0.4, P.kitchen.cz, 0, 1.0);
  dust(P.kitchen.cx + 1.4, 6.8, P.kitchen.cz - 2.0, 3, 0xffffff, 0.6); dust(P.kitchen.cx + 1.8, 8.2, P.kitchen.cz - 2.6, 4.2, 0xffffff, 0.35);
  pad(P.quarry); add(quarry(), P.quarry.cx, 0.4, P.quarry.cz, 0, 1.0);
  // workers by their buildings, the cook at the kitchen door, the Commander by the Ark
  const suits = [0x6fb7ff, 0x9a7cff, 0x33c5a2];
  add(colonist(0xffffff, suits[0]), P.drill.cx - 3.6, 0.4, P.drill.cz + 3.4, 0.6, 1.6);
  add(colonist(0xffffff, suits[1]), P.pump.cx + 2.6, 0.4, P.pump.cz + 3.4, -0.4, 1.6);
  add(colonist(0xffffff, suits[2]), P.veg.cx - 3.4, 0.4, P.veg.cz + 2.8, 0.8, 1.6);
  add(colonist(0xffffff, 0xff5d8a, { chef: true }), P.kitchen.cx - 1.6, 0.4, P.kitchen.cz + 1.4, 0.2, 1.6);
  add(shadowAll(K.astronaut(1.7)), -1.5, 0.4, 12.2, 0.4);
  // ЕХО by the processor, which still has an empty worker place
  add(shadowAll(K.echoBot()), P.proc.cx - 3.6, 6.2, P.proc.cz + 3.4, -0.6, 1.25);
  halo(P.proc.cx - 3.6, 6.2, P.proc.cz + 3.4, 2.6, 0x6ff2c4, 0.45);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.0, 0.16, 10, 64), glow(0x33d1a8, 1.4)); ring.rotation.x = Math.PI / 2; ring.position.set(P.proc.cx, 0.55, P.proc.cz); scene.add(ring);
  A('w-drill', P.drill.cx, 7.4, P.drill.cz); A('w-pump', P.pump.cx, 5.6, P.pump.cz); A('w-veg', P.veg.cx, 4.4, P.veg.cz);
  A('w-proc', P.proc.cx, 9.6, P.proc.cz); A('w-quarry', P.quarry.cx, 6.2, P.quarry.cz); A('cook', P.kitchen.cx, 6.4, P.kitchen.cz);
  A('dome', P.dome.cx + 2.4, 4.2, P.dome.cz + 2.6); A('echo', P.proc.cx - 3.6, 7.4, P.proc.cz + 3.4);
}
// the locked part of the canyon lies under dust in both levels
for (let i = 0; i < 12; i++) dust(-20 + i * 3.8 + rnd() * 2, 2 + rnd() * 2, -31 - rnd() * 4, 14 + rnd() * 5, 0xfde6d2, 0.75);
for (let i = 0; i < 8; i++) dust(-22 + i * 6.2, 5 + rnd() * 3, -42 - rnd() * 6, 24, 0xfbdcc4, 0.9);
A('zone', 0, 1.5, -27);

// ---------- camera: from above at a slight angle, portrait ----------
const camera = new THREE.PerspectiveCamera(30, W / H, 1, 600);
camera.position.set(0, 82, 92); camera.lookAt(0, 0, -3);
renderer.render(scene, camera);
const out = {};
for (const [k, v] of Object.entries(anchors)) { const p = v.clone().project(camera); out[k] = { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; }
window.__anchors = out; window.__state = { l3: L3 };
window.dispatchEvent(new Event('scene-ready'));
