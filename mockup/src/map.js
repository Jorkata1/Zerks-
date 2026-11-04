// Zerks-X6 example map: the colony seen from an angled top-down camera, like a city builder,
// at three atmosphere levels. States (map.html): #atm20, #atm50, #atm85.
// The streets run on a grid of 16 m: 12 m blocks with 4 m streets between them. The camera looks
// along the grid's diagonal, so the streets cross the screen at an angle.
// Same cartoon look as cartoon.html: flat colours, the CellCog Ark and carbon drill, the code-built models.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';
import * as K from './models.js';
import * as B from './colony.js';

const STATE = (location.hash || '#atm20').slice(1);
const ATM = { atm20: 20, atm50: 50, atm85: 85 }[STATE] ?? 20;
const S = ATM >= 85 ? 2 : ATM >= 50 ? 1 : 0; // stage: 0 dust, 1 first green, 2 green planet
const DPR = Number(new URLSearchParams(location.search).get('dpr') || 1);
const W = 390, H = 844;
T.seed(7 + S);
const rnd = () => T.rng();
const pick = a => a[Math.floor(rnd() * a.length)];
B.useRng(rnd);

// ---------- the look of each stage ----------
const LOOK = [
  { bg: 0xee9f66, ground: '#ee9f66', tones: ['226,140,88', '246,184,124'], sky: 0xfff1e0, bounce: 0xe7925f, sun: 0xfff0dc, road: 0xf6c590 },
  { bg: 0xe2b98a, ground: '#e3ad78', tones: ['150,190,100', '240,182,128'], sky: 0xfff6ea, bounce: 0xc9a070, sun: 0xfff6e8, road: 0x8a8f9c },
  { bg: 0x9fd8ff, ground: '#8fcf6a', tones: ['110,186,84', '168,216,112'], sky: 0xf2fbff, bounce: 0x8fbf70, sun: 0xfffaf0, road: 0x7d8494 },
][S];

// ---------- renderer and soft, bright light ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('view').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(LOOK.bg);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
scene.add(new THREE.HemisphereLight(LOOK.sky, LOOK.bounce, 1.05));
const sun = new THREE.DirectionalLight(LOOK.sun, 2.8);
sun.position.set(-30, 80, 50); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 5;
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 300 }); sun.shadow.camera.updateProjectionMatrix();

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
const C = { pad: 0xfff4e4, padEdge: 0xe8b285, rock: 0xcf7a52, rock2: 0xb9643f, walk: [0xf0cfa6, 0xe9e2d6, 0xeef0f2][S], lawn: 0x7fcf5c, lawn2: 0x6bc04f, soil: 0xa9714a, water: 0x58b8f0, water2: 0x8fd6ff };

const add = (o, x = 0, y = 0, z = 0, ry = 0, s = 1) => { o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o; };
const shadowAll = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const rb = (w, h, d, mat, r = 0.4, seg = 3) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), mat); m.castShadow = true; m.receiveShadow = true; return m; };
const rockGeo = new THREE.IcosahedronGeometry(1, 2), ballGeo = new THREE.SphereGeometry(1, 16, 12);
const ball = (mat, x, y, z, sx, sy = sx, sz = sx) => { const m = new THREE.Mesh(ballGeo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; };

// ---------- ground with soft blotches; the green comes in with the atmosphere ----------
{
  const c = T.canvas(1024), x = c.getContext('2d');
  x.fillStyle = LOOK.ground; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 80; i++) { const r = 30 + rnd() * 90, px = rnd() * 1024, py = rnd() * 1024; const g = x.createRadialGradient(px, py, 0, px, py, r); const tone = pick(LOOK.tones); g.addColorStop(0, `rgba(${tone},.55)`); g.addColorStop(1, `rgba(${tone},0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
  for (let i = 0; i < 220; i++) { x.fillStyle = S === 2 ? `rgba(80,150,60,${0.2 + rnd() * 0.2})` : `rgba(205,120,80,${0.2 + rnd() * 0.25})`; x.beginPath(); x.ellipse(rnd() * 1024, rnd() * 1024, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); t.anisotropy = 8;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
}

// ---------- small builders ----------
function rock(x, z, s, mat = flat(rnd() < 0.5 ? C.rock : C.rock2)) { const m = new THREE.Mesh(rockGeo, mat); m.scale.set(s * (0.9 + rnd() * 0.4), s * (0.55 + rnd() * 0.3), s * (0.9 + rnd() * 0.4)); m.position.set(x, s * 0.25, z); m.rotation.y = rnd() * 6; m.castShadow = m.receiveShadow = true; scene.add(m); return m; }
const leafMats = [flat(0x5fbf47), flat(0x7ad35a), flat(0x4aa83f), flat(0x8fd65a)];
function tree(x, z, s = 1, mat = pick(leafMats)) {
  const g = new THREE.Group();
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.4, 8), M.wood), 0, 0.7, 0));
  for (const [dx, dy, dz, r] of [[0, 2.0, 0, 1.0], [0.45, 1.65, 0.25, 0.7], [-0.4, 1.7, -0.2, 0.7]]) g.add(ball(mat, dx, dy, dz, r));
  return add(shadowAll(g), x, 0, z, rnd() * 6, s);
}
function lawn(cx, cz, w, d, mat = flat(C.lawn)) { return add(rb(w, 0.3, d, mat, 0.3, 2), cx, 0.15, cz); }
function colonist(stripe) {
  const g = new THREE.Group(), s = flat(0xffffff), st = flat(stripe);
  for (const x of [-0.13, 0.13]) g.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 4, 8), s), x, 0.3, 0));
  g.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.36, 6, 12), s), 0, 0.86, 0));
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 16), st), 0, 0.74, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), s), 0, 1.42, 0));
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), flat(0x3a6db5, { roughness: 0.2 })); visor.rotation.x = Math.PI / 2; visor.position.set(0, 1.44, 0.11); visor.scale.set(1, 1, 0.75); g.add(visor);
  return shadowAll(g);
}
const suits = [0x6fb7ff, 0x9a7cff, 0x33c5a2, 0xff8b3d, 0xff5d8a, 0xffc65c];
function people(cx, cz, n) { for (let i = 0; i < n; i++) { const side = rnd() < 0.5, t = (rnd() - 0.5) * 12, o = (rnd() < 0.5 ? -1 : 1) * 6.7; add(colonist(pick(suits)), cx + (side ? o : t), 0.15, cz + (side ? t : o), rnd() * 6, 1.25); } }

// houses and blocks of flats in the style of the Ark (colony.js)
const roofMats = [B.P.orange, flat(0x33c5a2), flat(0x4aa8ff), flat(0xff5d5d), B.P.navy2];
const home = (x, z, ry = 0) => add(B.home(pick(roofMats)), x, 0.2, z, ry);
const flats = (x, z, floors) => add(B.flats(floors, pick(roofMats)), x, 0.2, z);
// crops in rows on brown soil: instanced so a field of hundreds of plants stays cheap
function field(cx, cz, color) {
  add(rb(11, 0.35, 11, flat(C.soil), 0.3, 2), cx, 0.17, cz);
  const n = 8 * 14, im = new THREE.InstancedMesh(ballGeo, flat(color), n), m = new THREE.Matrix4(); let k = 0;
  for (let r = 0; r < 8; r++) for (let i = 0; i < 14; i++) { const s = 0.36 + rnd() * 0.08; m.makeScale(s, s * 0.9, s).setPosition(cx - 4.6 + i * 0.71, 0.55, cz - 4.4 + r * 1.26); im.setMatrixAt(k++, m); }
  im.castShadow = im.receiveShadow = true; scene.add(im);
}
function fence(cx, cz, w, d) {
  const post = flat(0xfff4e4);
  for (const [x0, z0, x1, z1] of [[-w, -d, w, -d], [-w, d, w, d], [-w, -d, -w, d], [w, -d, w, d]]) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.5);
    for (let i = 0; i <= n; i++) add(rb(0.18, 0.9, 0.18, post, 0.05, 1), cx + x0 + (x1 - x0) * i / n, 0.45, cz + z0 + (z1 - z0) * i / n);
    const rail = rb(x0 === x1 ? 0.1 : len, 0.12, x0 === x1 ? len : 0.1, post, 0.04, 1); add(rail, cx + (x0 + x1) / 2, 0.7, cz + (z0 + z1) / 2);
  }
}
function animal(kind) {
  const g = new THREE.Group();
  if (kind === 'chicken') {
    g.add(ball(flat(0xffffff), 0, 0.35, 0, 0.3, 0.28, 0.36));
    g.add(ball(flat(0xffffff), 0, 0.6, 0.22, 0.16));
    g.add(ball(flat(0xff5d5d), 0, 0.78, 0.22, 0.07));
    return shadowAll(g);
  }
  const cow = kind === 'cow', body = flat(cow ? 0xffffff : 0xffb3c1);
  g.add(at(rb(0.8, 0.75, 1.5, body, 0.3), 0, 0.85, 0));
  g.add(at(rb(0.55, 0.5, 0.5, body, 0.2), 0, 1.05, 0.9));
  for (const [x, z] of [[-0.25, -0.5], [0.25, -0.5], [-0.25, 0.5], [0.25, 0.5]]) g.add(at(rb(0.18, 0.5, 0.18, body, 0.06, 1), x, 0.25, z));
  if (cow) for (let i = 0; i < 3; i++) g.add(ball(flat(0x3a3540), (rnd() - 0.5) * 0.6, 1.0 + rnd() * 0.2, (rnd() - 0.5) * 1.0, 0.22, 0.2, 0.26));
  else g.add(at(rb(0.3, 0.2, 0.1, flat(0xff8fa6), 0.06), 0, 1.0, 1.17));
  return shadowAll(g);
}
function pen(cx, cz, kind, n) {
  lawn(cx, cz, 11.5, 11.5, flat(C.lawn2)); fence(cx, cz, 5.4, 5.4);
  add(B.barn(kind), cx - 2.6, 0.25, cz - 3.0);
  for (let i = 0; i < n; i++) add(animal(kind), cx - 1.5 + rnd() * 6, 0.3, cz + rnd() * 4.5, rnd() * 6, kind === 'chicken' ? 1.4 : 1.1);
}
function pond(cx, cz, rx, rz, fish = false) {
  const shape = (r, mat, y) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat); m.rotation.x = -Math.PI / 2; m.scale.set(rx * r, rz * r, 1); m.position.set(cx, y, cz); m.receiveShadow = true; scene.add(m); };
  shape(1.08, flat(0xf3e6d4), 0.33); shape(1.0, flat(C.water2, { roughness: 0.3 }), 0.35); shape(0.8, flat(C.water, { roughness: 0.2 }), 0.37);
  if (fish) { add(B.hatchery(), cx + rx * 0.62, 0.3, cz + rz * 0.62); add(rb(1.2, 0.2, rz * 0.9, M.wood, 0.05), cx + rx * 0.55, 0.3, cz - rz * 0.2); for (let i = 0; i < 5; i++) add(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 24), M.orange), cx - rx * 0.4 + rnd() * rx * 0.6, 0.18, cz - rz * 0.4 + rnd() * rz * 0.8).rotation.x = Math.PI / 2; }
}
function solarField(cx, cz) { for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) { const p = rb(3.0, 0.15, 2.0, M.solar, 0.05, 1); p.rotation.x = -0.35; add(p, cx - 3.6 + i * 3.6, 1.0, cz - 3.4 + r * 3.4); add(rb(0.15, 0.9, 0.15, M.steel, 0.04, 1), cx - 3.6 + i * 3.6, 0.45, cz - 3.4 + r * 3.4); } }
function mineHill() {
  const g = new THREE.Group();
  for (const [x, z, s] of [[-3, -3, 2.1], [-1, -3.4, 2.5], [1.4, -3.3, 2.3], [3.3, -2.6, 1.8], [-3.9, -1.4, 1.3], [3.8, -0.9, 1.2]]) { const m = new THREE.Mesh(rockGeo, flat(rnd() < 0.5 ? C.rock : C.rock2)); m.scale.set(s * 1.15, s * 0.85, s); m.position.set(x, s * 0.55, z); g.add(m); }
  g.add(at(rb(1.9, 2.1, 1.2, flat(0x3a2a33), 0.25), -0.8, 1.05, -0.7));
  g.add(at(rb(2.9, 0.36, 0.5, M.orange, 0.08), -0.8, 2.6, -0.15));
  g.add(at(rb(1.3, 0.75, 1.0, M.orange, 0.14), -0.8, 0.72, 1.5));
  for (let i = 0; i < 6; i++) g.add(at(rb(0.9, 0.7, 0.9, flat(0xd9b892), 0.15), 1.4 + (i % 3), 0.4 + Math.floor(i / 3) * 0.72, 1.2));
  return shadowAll(g);
}
function homeDome() {
  return K.geoDome(3.7, g => {
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.add(at(rb(1.5, 1.3, 1.5, i % 2 ? M.hull : flat(0xfff0d6), 0.35), Math.cos(a) * 2, 1.15, Math.sin(a) * 2)); g.add(at(rb(1.6, 0.25, 1.6, M.orange, 0.12), Math.cos(a) * 2, 1.9, Math.sin(a) * 2)); }
    g.add(ball(M.leaf, 0, 2.2, 0, 0.9));
    g.add(at(B.airlock(), 0, 0, 4.3));
  });
}
// ---------- the soft glow, dust and smoke sprites ----------
const cloudT = T.cloudTex();
const dust = (x, y, z, s, color = 0xffffff, op = 0.6) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, color, transparent: true, opacity: op, depthWrite: false, rotation: rnd() * 6 })); m.position.set(x, y, z); m.scale.set(s, s * 0.62, 1); scene.add(m); return m; };

// ---------- load the CellCog models ----------
const gltf = new GLTFLoader(), glb = {};
await Promise.all(['ark-v1', 'carbon-drill-v1'].map(async n => {
  const root = (await gltf.loadAsync('models/' + n + '.glb')).scene;
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { m.metalness = 0; m.roughness = Math.max(0.55, m.roughness ?? 0.6); } } });
  glb[n] = root;
}));
const smooth = n => { const g = new THREE.Group(); g.add(glb[n].clone(true)); return g; };

// ---------- the street grid ----------
// d = i - j runs across the screen, s = i + j along it (positive = towards the camera).
const PITCH = 16;
const REACH = [2, 5, 8][S]; // how far along the canyon the colony has grown
const blocks = [];
for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
  const d = i - j, s = i + j;
  if (Math.abs(d) > 3 || Math.abs(s) > 10) continue;
  blocks.push({ d, s, cx: i * PITCH, cz: j * PITCH, built: Math.abs(d) <= 2 && Math.abs(s) <= REACH });
}
const padMat = flat(C.pad), edgeMat = flat(C.padEdge), roadMat = flat(LOOK.road), walkMat = flat(C.walk), dashMat = flat(0xffffff);
function plot(b) {
  // the street around the block, the pavement, and the plot itself
  add(rb(PITCH, 0.1, PITCH, roadMat, 0.05, 1), b.cx, 0.03, b.cz);
  if (S > 0) {
    add(rb(13.4, 0.26, 13.4, walkMat, 0.5, 2), b.cx, 0.1, b.cz);
    for (let k = -1; k <= 1; k++) { add(rb(1.4, 0.04, 0.3, dashMat, 0.05, 1), b.cx + k * 4.5, 0.1, b.cz + 8); add(rb(0.3, 0.04, 1.4, dashMat, 0.05, 1), b.cx + 8, 0.1, b.cz + k * 4.5); }
  } else {
    add(rb(12.4, 0.36, 12.4, edgeMat, 0.5), b.cx, 0.12, b.cz);
    add(rb(11.6, 0.36, 11.6, padMat, 0.45), b.cx, 0.22, b.cz);
  }
}
function futurePlot(b) {
  const dash = flat(0xfff3e2, { transparent: true, opacity: 0.75 });
  for (let i = 0; i < 8; i++) { const t = -5.25 + i * 1.5; for (const e of [-5.6, 5.6]) { add(rb(0.9, 0.12, 0.35, dash, 0.1), b.cx + t, 0.06, b.cz + e); add(rb(0.35, 0.12, 0.9, dash, 0.1), b.cx + e, 0.06, b.cz + t); } }
}

// what stands in each block, by (d, s); later stages keep what the earlier ones built
const base = {
  '0,0': b => { add(smooth('ark-v1'), b.cx, 0.4, b.cz, 0, 0.72); },
  '1,1': b => { add(smooth('carbon-drill-v1'), b.cx, 0.4, b.cz, 0, 1.2); for (let i = 0; i < 10; i++) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rnd() * 0.25, 0), M.carbon), b.cx - 4 + rnd() * 8, 0.55, b.cz + 4 + rnd()); },
  '-1,1': b => { add(shadowAll(K.waterExtractor()), b.cx - 0.6, 0.4, b.cz - 0.6, 0, 0.82); for (let i = 0; i < 8; i++) add(new THREE.Mesh(rockGeo, M.ice), b.cx + 2 + rnd() * 2, 0.4, b.cz + 2 + rnd() * 2).scale.set(0.6, 0.3, 0.6); },
  '1,-1': b => { add(shadowAll(K.processor()), b.cx, 0.4, b.cz, 0, 0.74); dust(b.cx, 7.6, b.cz, 3.5, 0xffffff, 0.5); },
  '-1,-1': b => add(B.research(), b.cx, 0.3, b.cz, 0, 1.0),
  '0,2': b => add(B.vegLab(), b.cx, 0.3, b.cz, 0, 1.0),
  '0,-2': b => add(shadowAll(homeDome()), b.cx, 0.4, b.cz, 0, 1.1),
  '2,0': b => { add(B.kitchen(), b.cx, 0.3, b.cz, 0, 1.0); dust(b.cx - 2.6, 6.4, b.cz - 2.8, 2.6, 0xffffff, 0.55); },
  '-2,0': b => add(mineHill(), b.cx, 0.4, b.cz, 0, 1.1),
  '2,2': b => { add(B.greenhouse(8), b.cx, 0.3, b.cz - 2.8, 0, 0.95); add(B.greenhouse(8), b.cx, 0.3, b.cz + 2.8, 0, 0.95); },
  '-2,2': b => { add(shadowAll(K.geolocator()), b.cx - 2, 0.4, b.cz - 2, 0, 0.7); for (let i = 0; i < 3; i++) { const p = rb(3.0, 0.15, 2.0, M.solar, 0.05, 1); p.rotation.x = -0.35; add(p, b.cx + 3, 1.0, b.cz - 3.5 + i * 3.4); } },
};
const housing = b => { for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) home(b.cx + x, b.cz + z); if (S === 2) for (let i = 0; i < 3; i++) tree(b.cx - 5 + rnd() * 10, b.cz - 5 + rnd() * 10, 0.6); };
const park = (b, big) => { lawn(b.cx, b.cz, 12, 12); for (let i = 0; i < (big ? 10 : 5); i++) tree(b.cx - 4.6 + rnd() * 9.2, b.cz - 4.6 + rnd() * 9.2, big ? 0.9 + rnd() * 0.5 : 0.55); };
const towers = b => { flats(b.cx - 3, b.cz - 3, 7 + Math.floor(rnd() * 4)); flats(b.cx + 3, b.cz + 3, 4 + Math.floor(rnd() * 3)); lawn(b.cx + 3, b.cz - 3, 5, 5); tree(b.cx + 3, b.cz - 3, 0.8); lawn(b.cx - 3, b.cz + 3, 5, 5); tree(b.cx - 3, b.cz + 3, 0.8); };
const grown = {
  '2,-2': b => add(shadowAll(homeDome()), b.cx, 0.4, b.cz, 0, 1.1),
  '-2,-2': b => { add(shadowAll(K.turbine(0.3)), b.cx - 3, 0.4, b.cz - 3, 0.8, 0.6); add(shadowAll(K.turbine(1.2)), b.cx + 3, 0.4, b.cz + 3, 0.8, 0.6); },
  '1,3': b => field(b.cx, b.cz, 0x8fd65a), '-1,3': housing,
  '1,-3': b => { lawn(b.cx, b.cz, 12, 12, flat(C.lawn2)); pond(b.cx, b.cz, 4.8, 4.2, true); }, '-1,-3': b => pen(b.cx, b.cz, 'chicken', 14),
  '0,4': b => park(b, S === 2), '2,4': housing, '-2,4': b => { add(B.greenhouse(8), b.cx, 0.2, b.cz - 2.8, 0, 0.95); add(B.greenhouse(8), b.cx, 0.2, b.cz + 2.8, 0, 0.95); },
  '0,-4': housing, '2,-4': b => field(b.cx, b.cz, 0xffc65c), '-2,-4': b => solarField(b.cx, b.cz),
  '1,5': housing, '-1,5': b => field(b.cx, b.cz, 0x6cc94f),
  // the silicon furnace smokes: the smoke is what pulls the atmosphere down
  '1,-5': b => { add(B.smelter(), b.cx, 0.2, b.cz, 0, 1.0); for (let i = 0; i < 3; i++) dust(b.cx - 2.6 + i * 0.4, 8.8 + i * 2.2, b.cz - 2.4 - i, 3 + i * 1.6, 0xd8d0c8, 0.55 - i * 0.12); },
  '-1,-5': housing,
};
const green = {
  '0,6': towers, '2,6': b => park(b, true), '-2,6': b => pen(b.cx, b.cz, 'cow', 5),
  '0,-6': b => { lawn(b.cx, b.cz, 14, 14, flat(C.lawn2)); pond(b.cx, b.cz, 7.5, 6.5); }, '2,-6': towers, '-2,-6': b => park(b, true),
  '1,7': housing, '-1,7': b => pen(b.cx, b.cz, 'pig', 6), '1,-7': b => field(b.cx, b.cz, 0xffc65c), '-1,-7': towers,
  '0,8': b => park(b, true), '2,8': housing, '-2,8': housing, '0,-8': b => park(b, true), '2,-8': housing, '-2,-8': towers,
};

const builtBlocks = [];
for (const b of blocks) {
  const key = `${b.d},${b.s}`;
  const fill = base[key] || (S >= 1 && grown[key]) || (S === 2 && green[key]);
  if (b.built && fill) { plot(b); fill(b); builtBlocks.push(b); continue; }
  if (b.built && S === 0) { plot(b); futurePlot(b); continue; }
  // outside the colony: bare rock on the dusty planet, bushes and young trees later, forest at the end
  if (S === 0) { for (let i = 0; i < 6; i++) rock(b.cx - 6 + rnd() * 12, b.cz - 6 + rnd() * 12, 0.6 + rnd() * 1.4); }
  else if (S === 1) { for (let i = 0; i < 5; i++) rock(b.cx - 6 + rnd() * 12, b.cz - 6 + rnd() * 12, 0.5 + rnd()); for (let i = 0; i < 4; i++) tree(b.cx - 6 + rnd() * 12, b.cz - 6 + rnd() * 12, 0.45 + rnd() * 0.2); }
  else { for (let i = 0; i < 14; i++) tree(b.cx - 7 + rnd() * 14, b.cz - 7 + rnd() * 14, 0.9 + rnd() * 0.6); }
}
// colonists on the pavements: more of them wake up as the colony grows
for (const b of builtBlocks) people(b.cx, b.cz, [1, 2, 3][S]);
const echo = add(shadowAll(K.echoBot()), 6.5, 6.2, 9, -0.6, 1.25);
// the part of the canyon that is still locked lies under dust
if (S < 2) for (const b of blocks) if (b.s < -REACH && Math.abs(b.d) <= 2) for (let k = 0; k < 2; k++) dust(b.cx - 4 + rnd() * 8, 2 + rnd() * 3, b.cz - 4 + rnd() * 8, 20 + rnd() * 8, S ? 0xf6e2cc : 0xfde6d2, 0.85);

// ---------- camera: angled top-down like a city builder, looking along the diagonal of the grid ----------
const EL = THREE.MathUtils.degToRad(36); // angle above the ground
const DIR = new THREE.Vector3(Math.cos(EL) * Math.SQRT1_2, Math.sin(EL), Math.cos(EL) * Math.SQRT1_2);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 800);
function aim(view, x, z) { // view = metres across the screen width
  Object.assign(camera, { left: -view / 2, right: view / 2, top: view / 2 * H / W, bottom: -view / 2 * H / W }); camera.updateProjectionMatrix();
  camera.position.set(x, 0, z).addScaledVector(DIR, 300); camera.lookAt(x, 0, z);
}
// the clip (clip.js): from the overview the camera glides in towards what grew at this stage
const SHOT = [[6, -6], [-26, -26], [42, 42]][S];
window.__frame = t => { const e = t * t * (3 - 2 * t); aim(56 - 22 * e, SHOT[0] * e, SHOT[1] * e); echo.position.y = 6.2 + Math.sin(t * 12) * 0.3; renderer.render(scene, camera); };
aim(56, 0, 0);
renderer.render(scene, camera);
window.__state = { atm: ATM, stage: S };
window.dispatchEvent(new Event('scene-ready'));
