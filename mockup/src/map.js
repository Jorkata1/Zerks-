// Zerks-X6 map at level 10: the colony when the Ark becomes level 10, the end of chapter 1, seen from an angled
// top-down camera like a city builder. Only the buildings that docs/levels.md has by then, one of each (the panels are
// the exception), in the round style of art/3d/buildings; atmosphere 28%. States (map.html): #lvl10 and #lvl10-night.
// This is the only map we use (Joro, 06.11.2026); the older example maps at 20%, 50% and 85% are gone.
// The streets run on a grid of 16 m: 12 m blocks with 4 m streets between them. The camera looks
// along the grid's diagonal, so the streets cross the screen at an angle.
// The random numbers are drawn in a fixed order: anything added or removed above a builder moves every rock after it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from './textures.js';
import * as K from './models.js';
import * as B from './colony.js';

const NIGHT = (location.hash || '#lvl10').includes('-night'); // #lvl10-night: the same map at night
// #lvl10-ark-a, #lvl10-ark-b (also with -night): one of the two new ideas for the Ark (Joro, 06.11.2026) in place of the CellCog one
const ARK = (location.hash.match(/ark-([ab])/) || [])[1];
const ATM = 28;
const DPR = Number(new URLSearchParams(location.search).get('dpr') || 1);
const W = 390, H = 844;
T.seed(7);
const rnd = () => T.rng();
const pick = a => a[Math.floor(rnd() * a.length)];
B.useRng(rnd); B.setNight(NIGHT);

// ---------- the look of the dusty planet ----------
const LOOK = { bg: 0xee9f66, ground: '#ee9f66', tones: ['226,140,88', '246,184,124'], sky: 0xfff1e0, bounce: 0xe7925f, sun: 0xfff0dc, road: 0xf6c590 };
// at night the sun is a pale moon; lamps, windows and the teal strips give the light
if (NIGHT) Object.assign(LOOK, { bg: 0x1d2442, sky: 0x7d8cc4, bounce: 0x2a2f4a, sun: 0xa8b8ff });

// ---------- renderer and soft, bright light ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('view').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(LOOK.bg);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = NIGHT ? 0.14 : 0.35;
scene.add(new THREE.HemisphereLight(LOOK.sky, LOOK.bounce, NIGHT ? 0.4 : 1.05));
const sun = new THREE.DirectionalLight(LOOK.sun, NIGHT ? 0.62 : 2.8);
sun.position.set(-30, 80, 50); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 5;
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 300 }); sun.shadow.camera.updateProjectionMatrix();

// ---------- flat cartoon palette for the code-built models (ECHO, the lamps, benches and planters) ----------
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
if (NIGHT) for (const [m, k] of [[M.warm, 2.2], [M.teal, 2.2], [M.blueGlow, 2.4], [M.engineGlow, 2.6]]) m.emissiveIntensity = k;
const C = { pad: 0xfff4e4, padEdge: 0xe8b285, rock: 0xcf7a52, rock2: 0xb9643f };

const add = (o, x = 0, y = 0, z = 0, ry = 0, s = 1) => { o.position.set(x, y, z); o.rotation.y = ry; o.scale.multiplyScalar(s); scene.add(o); return o; };
const shadowAll = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const rb = (w, h, d, mat, r = 0.4, seg = 3) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.05, h / 2.05, d / 2.05)), mat); m.castShadow = true; m.receiveShadow = true; return m; };
const rockGeo = new THREE.IcosahedronGeometry(1, 2);

// ---------- ground with soft blotches ----------
{
  const c = T.canvas(1024), x = c.getContext('2d');
  x.fillStyle = LOOK.ground; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 80; i++) { const r = 30 + rnd() * 90, px = rnd() * 1024, py = rnd() * 1024; const g = x.createRadialGradient(px, py, 0, px, py, r); const tone = pick(LOOK.tones); g.addColorStop(0, `rgba(${tone},.55)`); g.addColorStop(1, `rgba(${tone},0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
  for (let i = 0; i < 220; i++) { x.fillStyle = `rgba(205,120,80,${0.2 + rnd() * 0.25})`; x.beginPath(); x.ellipse(rnd() * 1024, rnd() * 1024, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); t.anisotropy = 8;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
}

// ---------- small builders: rocks and the colonists in their suits ----------
function rock(x, z, s, mat = flat(rnd() < 0.5 ? C.rock : C.rock2)) { const m = new THREE.Mesh(rockGeo, mat); m.scale.set(s * (0.9 + rnd() * 0.4), s * (0.55 + rnd() * 0.3), s * (0.9 + rnd() * 0.4)); m.position.set(x, s * 0.25, z); m.rotation.y = rnd() * 6; m.castShadow = m.receiveShadow = true; scene.add(m); return m; }
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
function people(cx, cz, n, off = 6.7) { for (let i = 0; i < n; i++) { const side = rnd() < 0.5, t = (rnd() - 0.5) * 12, o = (rnd() < 0.5 ? -1 : 1) * off; add(colonist(pick(suits)), cx + (side ? o : t), 0.15, cz + (side ? t : o), rnd() * 6, 1.25); } }

// ---------- the soft glow, dust and smoke sprites ----------
const cloudT = T.cloudTex();
const dust = (x, y, z, s, color = 0xffffff, op = 0.6) => { if (NIGHT) color = new THREE.Color(color).multiplyScalar(0.32); const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, color, transparent: true, opacity: op, depthWrite: false, rotation: rnd() * 6 })); m.position.set(x, y, z); m.scale.set(s, s * 0.62, 1); scene.add(m); return m; };

// a pool of light on the ground under a lamp or a lit building: only at night
const glowT = T.glowTex();
function pool(x, z, size, color = 0xffc77a, op = 0.5) {
  if (!NIGHT) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glowT, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.45, z); scene.add(m);
}

// ---------- the models: the Ark and the carbon drill from CellCog, the buildings from art/3d/buildings ----------
const gltf = new GLTFLoader(), glb = {};
await Promise.all(['ark-v1', 'carbon-drill-v1'].map(async n => {
  const root = (await gltf.loadAsync('models/' + n + '.glb')).scene;
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { m.metalness = 0; m.roughness = Math.max(0.55, m.roughness ?? 0.6); } } });
  glb[n] = root;
}));
const smooth = n => { const g = new THREE.Group(); g.add(glb[n].clone(true)); return g; };
// the soft buildings: Draco-compressed, glass stays see-through
const KK = ['ark', 'home-10', 'kitchen', 'veglab', 'research-1', 'warehouse', 'solar', 'batteries', 'pump', 'greenhouse', 'processor', 'furnace', 'mine', 'geolocator'];
if (ARK) KK.push('ideas/ark-' + ARK);
const kkGlb = {};
const draco = new DRACOLoader(); draco.setDecoderPath('node_modules/three/examples/jsm/libs/draco/'); gltf.setDRACOLoader(draco);
await Promise.all(KK.map(async n => {
  const root = (await gltf.loadAsync('models/kk/' + n + '.glb')).scene;
  root.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; const clear = ms.some(m => m.transparent); o.castShadow = !clear; o.receiveShadow = true; for (const m of ms) { m.metalness = 0; if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; } else m.roughness = Math.max(0.5, m.roughness ?? 0.6); } if (clear) o.renderOrder = 2; } });
  kkGlb[n] = root;
}));
// a building standing on its plot, centred: either scaled so its footprint is `size` metres wide (kk), or at a fixed
// scale (atScale) for the buildings that grow with their level, so a higher level stands bigger
const place = (n, k) => { const g = new THREE.Group(), m = kkGlb[n].clone(true); const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); k = k(s); m.scale.setScalar(k); m.position.set(-c.x * k, -b.min.y * k, -c.z * k); g.add(m); return g; };
const kk = (n, size = 9.6) => place(n, s => size / Math.max(s.x, s.z));
const HOME_K = 4.3;
const atScale = n => place(n, () => HOME_K);
const noSmoke = g => { g.traverse(o => { if (o.isMesh && o.material?.name === 'steam') o.visible = false; }); return g; };

// ---------- the street grid ----------
// d = i - j runs across the screen, s = i + j along it (positive = towards the camera).
const PITCH = 16;
// zone I at level 10: how far along the canyon the colony has grown, back (towards zone II) and front. Since the Ark
// took four plots (Joro, 06.11.2026) zone I reaches one row further to the front, so the buildings it moved have room.
const REACH = 3, FRONT = 4;
const blocks = [];
for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
  const d = i - j, s = i + j;
  if (Math.abs(d) > 3 || Math.abs(s) > 10) continue;
  blocks.push({ d, s, cx: i * PITCH, cz: j * PITCH, built: Math.abs(d) <= 2 && s >= -REACH && s <= FRONT });
}
// the Ark stands on a plot of 2x2 in the middle (Joro, 06.11.2026): the four blocks with i, j in {-1, 0}, without the
// streets between them, so it is 28 m across; its centre is (-8, -8), straight up the screen from the old one
const ARK_PLOTS = new Set(['0,-2', '-1,-1', '1,-1', '0,0']), ARK_AT = [-8, -8], ARK_HALF = 13.8;
const padMat = flat(C.pad), edgeMat = flat(C.padEdge), roadMat = flat(LOOK.road);
function plot(b) {
  // the street around the block, the pavement edge, and the plot itself
  add(rb(PITCH, 0.1, PITCH, roadMat, 0.05, 1), b.cx, 0.03, b.cz);
  add(rb(12.4, 0.36, 12.4, edgeMat, 0.5), b.cx, 0.12, b.cz);
  add(rb(11.6, 0.36, 11.6, padMat, 0.45), b.cx, 0.22, b.cz);
}
function futurePlot(b) {
  const dash = flat(0xfff3e2, { transparent: true, opacity: 0.75 });
  for (let i = 0; i < 8; i++) { const t = -5.25 + i * 1.5; for (const e of [-5.6, 5.6]) { add(rb(0.9, 0.12, 0.35, dash, 0.1), b.cx + t, 0.06, b.cz + e); add(rb(0.35, 0.12, 0.9, dash, 0.1), b.cx + e, 0.06, b.cz + t); } }
}

// what stands on each plot at level 10, by (d, s), following docs/levels.md. Every building is on a plot of its own
// (Joro, 05.11.2026), square to the street grid, so the camera sees it from its corner with the door on the left face.
// No quarry: the mine replaced it (docs/levels.md, 03.11.2026).
const built = {
  '1,1': b => { add(smooth('carbon-drill-v1'), b.cx, 0.4, b.cz, 0, 1.2); for (let i = 0; i < 10; i++) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rnd() * 0.25, 0), M.carbon), b.cx - 4 + rnd() * 8, 0.55, b.cz + 4 + rnd()); },
  '-1,1': b => { add(kk('pump', 8.2), b.cx, 0.4, b.cz, 0); },
  // the processor, the research station and the home moved when the Ark took the middle (06.11.2026)
  '0,4': b => { add(kk('processor', 7.6), b.cx, 0.4, b.cz); },
  // the research station (idea B, Joro 06.11.2026) before its upgrade: zone II is still under dust, so level 10 has only begun
  '-1,-3': b => add(atScale('research-1'), b.cx, 0.4, b.cz, 0),
  '0,2': b => add(kk('veglab', 9.6), b.cx, 0.4, b.cz, 0),
  // the colonists' home (idea C, Joro 06.11.2026) at level 10: the U around the winter garden, next to the Ark
  '1,-3': b => add(atScale('home-10'), b.cx, 0.4, b.cz, 0),
  '2,0': b => { add(kk('kitchen', 10.2), b.cx, 0.4, b.cz, 0); dust(b.cx - 1.4, 7.4, b.cz - 1.6, 2.4, 0xffffff, 0.45); },
  // the mine is level 10 and has become the shaft (the level of the change is a proposal)
  '-2,0': b => add(kk('mine', 10), b.cx, 0.4, b.cz, 0),
  // the silicon furnace (level 5) next to the mine, with the filter from level 6, so no smoke
  '-2,-2': b => add(noSmoke(kk('furnace', 8.8)), b.cx, 0.4, b.cz, 0),
  '2,-2': b => add(kk('warehouse', 10), b.cx, 0.4, b.cz, 0),
  '2,2': b => { add(kk('greenhouse', 10.4), b.cx, 0.4, b.cz, 0).name = 'greenhouse'; },
  // the geolocator, the seismic station (Joro, 05.11.2026), alone at the size of the other buildings
  '-2,2': b => add(kk('geolocator', 9.4), b.cx, 0.4, b.cz, 0),
  // the panels from level 5 and 6 on their plot by the greenhouse, the batteries (level 7) on the plot next to them
  // (since 11.11.2026 one plot that grows with its upgrades: solar.glb is its level 10, three rows)
  '1,3': b => add(kk('solar', 11.0), b.cx, 0.4, b.cz, 0),
  '-1,3': b => add(kk('batteries', 6.0), b.cx, 0.4, b.cz, 0),
};
const builtBlocks = [];
for (const b of blocks) {
  // the Ark's four blocks: only the streets round them here, the plot and the ship below
  if (ARK_PLOTS.has(`${b.d},${b.s}`)) { add(rb(PITCH, 0.1, PITCH, roadMat, 0.05, 1), b.cx, 0.03, b.cz); continue; }
  const fill = built[`${b.d},${b.s}`];
  if (b.built && fill) { plot(b); fill(b); builtBlocks.push(b); continue; }
  // the plots of zone I that are still empty show their outlines
  if (b.built) { plot(b); futurePlot(b); continue; }
  // outside the colony: bare rock on the dusty planet
  for (let i = 0; i < 6; i++) rock(b.cx - 6 + rnd() * 12, b.cz - 6 + rnd() * 12, 0.6 + rnd() * 1.4);
}
{
  const [x, z] = ARK_AT;
  add(rb(2 * ARK_HALF + 0.8, 0.36, 2 * ARK_HALF + 0.8, edgeMat, 0.5), x, 0.12, z);
  add(rb(2 * ARK_HALF, 0.36, 2 * ARK_HALF, padMat, 0.45), x, 0.22, z);
  // the Ark: idea A (Joro, 06.11.2026), made bigger for its plot of 2x2; #lvl10-ark-a / -ark-b show the two ideas
  add(ARK ? place('ideas/ark-' + ARK, () => 4.15) : place('ark', () => 4.15), x, 0.4, z, 0).name = 'ark';
  builtBlocks.unshift({ d: 0, s: -1, cx: x, cz: z, half: ARK_HALF + 0.15 });
}
// ten are awake and most of them work inside, so only a few walk outside
let outside = 5;
for (const b of builtBlocks) { people(b.cx, b.cz, outside-- > 0 ? 1 : 0, b.half ? b.half + 0.75 : 6.7); pool(b.cx, b.cz, b.half ? 30 : 13, 0xffd9a0, 0.22); }
// lamps on the corners; the air is still thin, so the plants live under glass; a bench in the middle of some sides
for (const b of builtBlocks) {
  const e = b.half || 5.95, y = 0.4, h = Math.abs(b.d * 3 + b.s);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { add(B.lamp(0), b.cx + sx * e, y, b.cz + sz * e); pool(b.cx + sx * e, b.cz + sz * e, 7); }
  [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([ax, az], side) => {
    const at = t => [b.cx + (ax ? ax * e : t), b.cz + (az ? az * e : t)];
    if (b.half) {
      // the Ark's big plot: a lamp in the middle of each side, planters along it, benches beside the lamp
      { const [x, z] = at(0); add(B.lamp(0), x, y, z); pool(x, z, 7); }
      for (const t of [-10.2, -6.8, 6.8, 10.2]) { const [x, z] = at(t); add(B.planter(0), x, y, z); }
      for (const t of [-3.4, 3.4]) { const [x, z] = at(t); add(B.bench(0), x, y, z, ax ? (ax > 0 ? Math.PI / 2 : -Math.PI / 2) : (az > 0 ? 0 : Math.PI)); }
      return;
    }
    for (const t of [-3.4, 3.4]) if ((h + side) % 2 === 0) { const [x, z] = at(t); add(B.planter(0), x, y, z); }
    if ((h + side) % 3 === 0) { const [x, z] = at(0); add(B.bench(0), x, y, z, ax ? (ax > 0 ? Math.PI / 2 : -Math.PI / 2) : (az > 0 ? 0 : Math.PI)); }
  });
}
const echo = add(shadowAll(K.echoBot()), 6.5, 6.2, 9, -0.6, 1.25); echo.name = 'echo';
// zone II, which the research opens at level 10, still lies under dust
for (const b of blocks) if (b.s < -REACH && Math.abs(b.d) <= 2) for (let k = 0; k < 2; k++) dust(b.cx - 4 + rnd() * 8, 2 + rnd() * 3, b.cz - 4 + rnd() * 8, 20 + rnd() * 8, 0xfde6d2, 0.85);

// ---------- camera: angled top-down like a city builder, looking along the diagonal of the grid ----------
const EL = THREE.MathUtils.degToRad(36); // angle above the ground
const DIR = new THREE.Vector3(Math.cos(EL) * Math.SQRT1_2, Math.sin(EL), Math.cos(EL) * Math.SQRT1_2);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 800);
function aim(view, x, z) { // view = metres across the screen width
  Object.assign(camera, { left: -view / 2, right: view / 2, top: view / 2 * H / W, bottom: -view / 2 * H / W }); camera.updateProjectionMatrix();
  camera.position.set(x, 0, z).addScaledVector(DIR, 300); camera.lookAt(x, 0, z);
}
// the close-ups: __aim(46, -6.5, 10.5) the left half, (46, 10.5, -6.5) the right half (both with the whole Ark), (20, -16, -32) the home, (40, -10, -10) the Ark
window.__aim = (view, x, z) => { aim(view, x, z); renderer.render(scene, camera); };
aim(68, 0, 0);
renderer.render(scene, camera);
for (const [x, z, s, c] of [[-32, -16, 8, 0x5fe3d0], [16, -16, 9, 0xffc77a], [16, 16, 8, 0xd38cff], [32, 32, 8, 0x5fe3d0], [-16, -32, 9, 0xffd58a], [-8, -8, 22, 0xffd58a]]) pool(x, z, s, c, 0.35);
window.__state = { atm: ATM, night: NIGHT };
// #lvl10-build: the build sequence (build-seq.js, proposal 06.11.2026) on top of the same map
if (location.hash.includes('build')) await (await import('./build-seq.js')).setup({ scene, renderer, camera, aim, gltf, NIGHT });
window.dispatchEvent(new Event('scene-ready'));
