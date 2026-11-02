import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as T from './textures.js';
import * as K from './models.js';
import * as Wd from './world.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const STATE = (location.hash || '#early').slice(1);
const LATE = STATE.startsWith('late');
const PANEL = STATE.endsWith('panel');
const BUILD = STATE.endsWith('build'); // the Build button pressed: the build menu is open
const PLACE = STATE.endsWith('place'); // a building chosen: its spot glows on the map and ЕХО points at it
const ZOOM = STATE.endsWith('zoom');
const DPR = Number(new URLSearchParams(location.search).get('dpr') || 1);
const W = 390, H = 844;
T.seed(LATE ? 99 : 42);

// ---------- the build grid: 9 m plots, 2 m streets, three columns, each terrace a zone ----------
const PLOT = 9, STREET = 2, PITCH = PLOT + STREET;
const COLS = [-PITCH, 0, PITCH];
const ZONES = [[20, 9, -2, -13], [-31, -42, -53], [-67, -78, -89], [-103, -114, -125]];
const ROWS = ZONES.flat();

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(DPR); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = LATE ? 0.95 : 0.92;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = LATE ? { top: 0x5f9fe0, hor: 0xd9ecf8, gnd: 0x5d7a46, haze: 0xcfe2ef } : { top: 0xb8663e, hor: 0xf0c49a, gnd: 0x5a3122, haze: 0xd59b72 };
scene.background = new THREE.Color(SKY.haze);
scene.fog = new THREE.Fog(SKY.haze, LATE ? 190 : 150, LATE ? 380 : 300);
{
  const s = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { top: { value: new THREE.Color(SKY.top) }, hor: { value: new THREE.Color(SKY.hor) }, gnd: { value: new THREE.Color(SKY.gnd) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(hor, top, pow(y, 0.6)) : mix(hor, gnd, pow(-y, 0.4)); vec3 sun = normalize(vec3(-0.5, 0.6, 0.35)); c += vec3(1.0,0.9,0.75) * pow(max(dot(vP, sun), 0.0), 64.0) * 2.0; gl_FragColor = vec4(c, 1.0); }' });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat));
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(s, 0.02).texture;
  scene.environmentIntensity = LATE ? 0.75 : 0.7;
}
scene.add(new THREE.HemisphereLight(LATE ? 0xd6ecff : 0xffd2b0, LATE ? 0x4f6a3a : 0x5a3424, 0.55));
const sun = new THREE.DirectionalLight(LATE ? 0xfff1dc : 0xffdcb8, LATE ? 3.0 : 2.7);
scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;

const camera = new THREE.PerspectiveCamera(30, W / H, 1, 900);
const anchors = {};
const P = (name, x, y, z) => { anchors[name] = new THREE.Vector3(x, y, z); };
const put = (obj, x, z, ry = 0, s = 1, y) => { obj.position.set(x, y ?? Wd.gy(x, z), z); obj.rotation.y = ry; obj.scale.multiplyScalar(s); scene.add(obj); return obj; };

K.initMaterials();
// ---------- scanned PBR textures and a real sky from Poly Haven (CC0) ----------
const texLoader = new THREE.TextureLoader();
async function ph(name) {
  const [map, normalMap, roughnessMap] = await Promise.all(['diff', 'nor', 'rough'].map(k => texLoader.loadAsync(`ph/${name}_${k}.jpg`)));
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; }
  return { map, normalMap, roughnessMap };
}
const PH = {};
await Promise.all(['red_laterite_soil_stones', 'aerial_grass_rock', 'hangar_concrete_floor', 'aerial_asphalt_01', 'sandy_gravel_02', 'metal_plate'].map(async n => { PH[n] = await ph(n); }));
Object.assign(K.M.concrete, { normalMap: PH.hangar_concrete_floor.normalMap, roughnessMap: PH.hangar_concrete_floor.roughnessMap, roughness: 1 });
Object.assign(K.M.metal, { normalMap: PH.metal_plate.normalMap, roughnessMap: PH.metal_plate.roughnessMap, roughness: 0.9 });
K.M.concrete.needsUpdate = true; K.M.metal.needsUpdate = true;
if (LATE) {
  const hdr = await new RGBELoader().loadAsync('ph/kloofendal_48d_partly_cloudy_puresky_1k.hdr');
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 0.6;
}
// ---------- Kenney Space Kit (CC0, kenney.nl): its shapes, re-skinned with our panel materials ----------
const KIT = ['hangar_largeA', 'hangar_roundB', 'hangar_roundGlass', 'satelliteDish_large', 'satelliteDish_detailed', 'machine_generatorLarge', 'machine_barrelLarge', 'machine_wireless', 'rover', 'astronautA', 'rocket_fuelA', 'rocket_sidesA', 'rocket_finsA', 'rocket_topA', 'craterLarge', 'rocks_smallA', 'rocks_smallB', 'rock_largeA', 'rock_largeB', 'rock_crystals', 'rock_crystalsLargeA', 'rock_crystalsLargeB', 'craft_speederA', 'craft_speederB', 'craft_cargoA', 'barrels', 'pipe_straight'];
const crystalMat = new THREE.MeshStandardMaterial({ color: 0x78f1ca, emissive: 0x3fd9a8, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.1 });
const rockA = new THREE.MeshStandardMaterial({ color: LATE ? 0x9c8c7e : 0xb36f4d, roughness: 0.95 }), rockB = new THREE.MeshStandardMaterial({ color: LATE ? 0x857566 : 0x8f5438, roughness: 0.95 });
const hullDark = new THREE.MeshStandardMaterial({ ...T.panelSet([112, 122, 138]), roughness: 0.75, metalness: 0.35 });
const blueGlass = new THREE.MeshStandardMaterial({ color: 0x4b7896, roughness: 0.06, metalness: 0.75, envMapIntensity: 2.4 });
const MATMAP = { metal: K.M.hull, metalDark: K.M.hull2, metalRed: K.M.orange, dark: hullDark, _defaultMat: K.M.darkGlass, rock: rockA, rockDark: rockB, rockTrack: rockA, crystal: crystalMat, skin: new THREE.MeshStandardMaterial({ color: 0xf0c8a8, roughness: 0.6 }) };
const kitSrc = {}, gltf = new GLTFLoader();
await Promise.all(KIT.map(async n => {
  const root = (await gltf.loadAsync('models/' + n + '.glb')).scene, box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z);
  root.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry;
    if (!geo.userData.uvDone) { if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2)); T.worldUV(geo, 1.4); geo.userData.uvDone = true; }
    const pick = m => (n === 'hangar_roundGlass' && m.name === 'dark') ? blueGlass : (n === 'hangar_roundGlass' && m.name === '_defaultMat') ? K.M.warm : (MATMAP[m.name] || m);
    o.material = Array.isArray(o.material) ? o.material.map(pick) : pick(o.material);
    o.castShadow = true; o.receiveShadow = true;
  });
  const wrap = new THREE.Group(); wrap.add(root); kitSrc[n] = wrap;
}));
const kit = (n, s = 3) => { const o = kitSrc[n].clone(true); o.scale.setScalar(s); return o; };
// smooth models made with CellCog (art/3d, copied into models/ by fetch-assets.sh): origin on the ground at the centre of the footprint, 1 unit = 1 m
const smooth = {};
await Promise.all(['ark-v1', 'carbon-drill-v1'].map(async n => {
  const root = (await gltf.loadAsync('models/' + n + '.glb')).scene;
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  smooth[n] = root;
}));
const smoothModel = n => { const g = new THREE.Group(); g.add(smooth[n].clone(true)); return g; };
function rocket(s = 2.4) { const g = new THREE.Group(); let y = 0; for (const [n, h] of [['rocket_finsA', 0.7], ['rocket_fuelA', 0.5], ['rocket_sidesA', 1], ['rocket_sidesA', 1], ['rocket_topA', 0.8]]) { const p = kit(n, s); p.position.y = y * s; g.add(p); y += h; } return g; }
const cloud = T.cloudTex(), glow = T.glowTex();
function dust(x, y, z, size, color, opacity) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, color, transparent: true, opacity, depthWrite: false, rotation: T.rng() * 6 })); s.position.set(x, y, z); s.scale.set(size, size * 0.62, 1); scene.add(s); return s; }
function halo(x, y, z, size, color, opacity) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(x, y, z); s.scale.set(size, size, 1); scene.add(s); return s; }

// ---------- plots on a 3 m tile grid: every building takes as many tiles as it needs ----------
// rect(x0, x1, zFront, zBack): x0 < x1, zFront > zBack; all values sit on the 3 m tile lines (±1.5, ±4.5 … ±16.5)
const dashMat = new THREE.MeshStandardMaterial({ color: 0x4fd1a5, emissive: 0x4fd1a5, emissiveIntensity: 1.4 });
const lockMat = new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.9, transparent: true, opacity: 0.5 });
const selMat = new THREE.MeshBasicMaterial({ color: 0x4fd1a5 });
const R = (x0, x1, za, zb) => ({ x0, x1, za, zb, cx: (x0 + x1) / 2, cz: (za + zb) / 2, w: x1 - x0, d: za - zb });
const GAP = 0.5;
function corners(r, y, mat = K.M.orange) {
  const w = r.w - GAP, d = r.d - GAP, L = Math.min(1.4, Math.min(w, d) * 0.22);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    K.rbox(scene, L, 0.08, 0.2, mat, r.cx + sx * (w / 2 - L / 2 - 0.1), y, r.cz + sz * (d / 2 - 0.2), { r: 0.03, shadow: false });
    K.rbox(scene, 0.2, 0.08, L, mat, r.cx + sx * (w / 2 - 0.2), y, r.cz + sz * (d / 2 - L / 2 - 0.1), { r: 0.03, shadow: false });
  }
}
function frameBars(r, y, mat, t = 0.18, h = 0.08, inset = 0.25) {
  const w = r.w - GAP, d = r.d - GAP;
  for (const [a, b, c, e] of [[0, -d / 2 + inset, w - 2 * inset, t], [0, d / 2 - inset, w - 2 * inset, t], [-w / 2 + inset, 0, t, d - 2 * inset], [w / 2 - inset, 0, t, d - 2 * inset]]) K.rbox(scene, c, h, e, mat, r.cx + a, y, r.cz + b, { r: 0.02, shadow: false });
}
// kind: 'pad' (built), 'deposit' (frame only, the resource shows), 'empty' (free), 'rubble' (clear it first), 'locked'
function pad(r, kind = 'pad') {
  const y = Wd.gy(r.cx, r.cz), w = r.w - GAP, d = r.d - GAP;
  if (kind === 'locked') { frameBars(r, y + 0.05, lockMat, 0.25, 0.06, 0); return; }
  if (kind === 'deposit') {
    for (const [a, b, c, e] of [[0, -d / 2 + 0.35, w, 0.7], [0, d / 2 - 0.35, w, 0.7], [-w / 2 + 0.35, 0, 0.7, d], [w / 2 - 0.35, 0, 0.7, d]]) K.rbox(scene, c, 0.3, e, K.M.concrete, r.cx + a, y + 0.15, r.cz + b, { r: 0.06, tile: 6 });
    corners(r, y + 0.33); return;
  }
  if (kind === 'rubble') {
    frameBars(r, y + 0.05, new THREE.MeshStandardMaterial({ color: 0xc98a62, roughness: 0.9 }), 0.16, 0.05, 0.1);
    const nx = Math.max(1, Math.round(w / 3)), nz = Math.max(1, Math.round(d / 3)), crystals = r.crystals;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const names = crystals && (i + k) % 2 === 0 ? ['rock_crystalsLargeA', 'rock_crystalsLargeB', 'rock_crystals'] : ['rock_largeA', 'rock_largeB', 'rocks_smallA', 'rocks_smallB'];
      put(kit(names[Math.floor(T.rng() * names.length)], 2.4 + T.rng() * 0.8), r.cx + (i - (nx - 1) / 2) * (w / nx) + (T.rng() - 0.5) * 0.8, r.cz + (k - (nz - 1) / 2) * (d / nz) + (T.rng() - 0.5) * 0.8, T.rng() * 6.28);
    }
    return;
  }
  K.rbox(scene, w, 0.3, d, K.M.concrete, r.cx, y + 0.15, r.cz, { r: 0.12, tile: 6 });
  if (kind === 'empty') { frameBars(r, y + 0.33, dashMat, 0.14, 0.06, 0.4); return; }
  corners(r, y + 0.33);
}
function selectFrame(r) { frameBars(r, Wd.gy(r.cx, r.cz) + 0.38, selMat, 0.2, 0.08, -0.05); }
const at = (obj, r, s = 1, ry = 0, dx = 0, dz = 0) => put(obj, r.cx + dx, r.cz + dz, ry, s);
function streets(mat, list) {
  for (const [x0, x1, za, zb] of list) {
    const w = x1 - x0, d = za - zb;
    if (d >= w) Wd.ribbon(scene, [[(x0 + x1) / 2, za], [(x0 + x1) / 2, (za + zb) / 2], [(x0 + x1) / 2, zb]], w, mat, 0.07, 10);
    else Wd.ribbon(scene, [[x0, (za + zb) / 2], [(x0 + x1) / 2, (za + zb) / 2], [x1, (za + zb) / 2]], d, mat, 0.08, 10);
  }
}
// a street is 3 m wide and its texture repeats every 10 m: one canvas holds 3 m x 10 m of ground plus the markings
function pathMat(late) {
  const set = late ? PH.aerial_asphalt_01 : PH.sandy_gravel_02, img = set.map.image;
  const W = 384, Hh = 1280, c = T.canvas(W, Hh), ctx = c.getContext('2d');
  for (let y = 0; y < Hh; y += W) ctx.drawImage(img, 0, y, W, W);
  if (late) {
    ctx.fillStyle = 'rgba(240,240,236,0.9)'; ctx.fillRect(10, 0, 9, Hh); ctx.fillRect(W - 19, 0, 9, Hh);
    for (let y = 0; y < Hh; y += 256) { ctx.fillStyle = 'rgba(255,198,84,0.95)'; ctx.fillRect(W / 2 - 5, y + 40, 10, 150); }
  } else {
    ctx.fillStyle = 'rgba(214,130,90,0.2)'; ctx.fillRect(0, 0, W, Hh);
    ctx.fillStyle = 'rgba(255,236,214,0.55)'; ctx.fillRect(0, 0, 10, Hh); ctx.fillRect(W - 10, 0, 10, Hh);
  }
  const nor = set.normalMap.clone(), rough = set.roughnessMap.clone();
  for (const t of [nor, rough]) { t.repeat.set(1, 10 / 3); t.needsUpdate = true; }
  return new THREE.MeshStandardMaterial({ map: T.tex(c), normalMap: nor, roughnessMap: rough, roughness: 1 });
}
function landing(r) {
  pad(r);
  const y = Wd.gy(r.cx, r.cz);
  for (let i = 0; i < Math.floor(r.w / 2) - 1; i++) K.rbox(scene, 0.9, 0.06, 0.25, K.M.orange, r.x0 + 1.6 + i * 2, y + 0.33, r.zb + 0.7, { r: 0.03, shadow: false });
}
function solarArray(r) {
  pad(r); const y = Wd.gy(r.cx, r.cz), nx = Math.max(1, Math.floor((r.w - 1) / 2.7)), nz = Math.max(1, Math.floor((r.d - 1) / 2.0));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const x = r.cx + (i - (nx - 1) / 2) * 2.7, z = r.cz + (k - (nz - 1) / 2) * 2.0; K.rbox(scene, 2.3, 0.08, 1.4, K.M.solar, x, y + 1.0, z, { r: 0.02, rx: -0.35 }); K.cyl(scene, 0.06, 0.06, 0.7, K.M.steel, x, y + 0.65, z, { seg: 6 }); }
}
function batteryBank(r) {
  pad(r);
  put(kit('machine_generatorLarge', 2.5), r.cx - 1.35, r.cz, 0); put(kit('machine_generatorLarge', 2.5), r.cx + 1.35, r.cz, Math.PI);
}
function cargo(r) {
  pad(r); const n = Math.floor((r.d - 1) / 2.0);
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) if (r.w >= 7 || s < 0) put(K.container(false, (i + (s > 0 ? 1 : 0)) % 2 ? K.M.hull2 : K.M.orange), r.cx + (r.w >= 7 ? s * 1.7 : 0), r.cz + (i - (n - 1) / 2) * 2.0, 0, 0.9);
}
function houses(r) {
  pad(r); const nx = Math.floor(r.w / 3), nz = Math.floor(r.d / 3);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) put(K.house([K.M.metal, K.M.orange, K.M.hull2][(i + k) % 3]), r.x0 + 1.5 + i * 3, r.zb + 1.5 + k * 3, (i + k) % 2 ? 0 : Math.PI, 0.78);
}


function zone1(late) {
  const L = {
    ark: R(-10.5, 10.5, 27, 18), geo: R(-16.5, -10.5, 27, 21), water: R(10.5, 16.5, 27, 21), rover: R(-16.5, -10.5, 21, 18), solarA: R(10.5, 16.5, 21, 18),
    proc: R(-16.5, -7.5, 15, 6), cargo: R(-7.5, -1.5, 15, 6), fab: R(1.5, 10.5, 15, 6), free: R(10.5, 16.5, 15, 6),
    solarB: R(-16.5, -7.5, 6, 0), batt: R(-7.5, -1.5, 6, 0), store: R(1.5, 10.5, 6, 0), rub1: R(10.5, 16.5, 6, 0),
    lab: R(-16.5, -7.5, -3, -12), rub2: R(-7.5, -1.5, -3, -12), hab: R(1.5, 7.5, -3, -9), solarC: R(1.5, 7.5, -9, -12), drill: R(7.5, 16.5, -3, -12),
    rub3: R(-16.5, -4.5, -12, -21), rub4: R(-4.5, -1.5, -12, -21), rub5: R(1.5, 16.5, -12, -21),
  };
  landing(L.ark); put(smoothModel('ark-v1'), L.ark.cx, L.ark.cz, 0, 0.8);
  pad(L.geo); at(kit('satelliteDish_large', 6.2), L.geo, 1, Math.PI * 0.8);
  pad(L.water, 'deposit'); at(K.waterExtractor(), L.water, 0.78, 0, -0.6, -0.8);
  pad(L.rover); at(kit('rover', 7), L.rover, 1, -Math.PI / 2);
  solarArray(L.solarA);
  pad(L.proc); at(K.processor(), L.proc, 1.0);
  cargo(L.cargo);
  pad(L.fab); at(K.research(true), L.fab, 0.95, 0, 0.4, 0.3); // no fabricator (decided 02.11.2026): this plot holds the research station
  solarArray(L.solarB); batteryBank(L.batt);
  pad(L.store); at(kit('hangar_largeA', 2.8), L.store, 1, Math.PI / 2); put(kit('barrels', 3), L.store.x1 - 1.2, L.store.zb + 1.0, 0.4);
  pad(L.lab); at(kit('hangar_roundGlass', 2.2), L.lab, 1, 0, 0.7, 1.2); at(kit('satelliteDish_detailed', 3.2), L.lab, 1, 0.7, -2.9, -2.9);
  pad(L.drill, 'deposit'); at(smoothModel('carbon-drill-v1'), L.drill, 1.1, 0, 0, -0.9);
  pad(L.hab); at(kit('hangar_roundB', 1.7), L.hab, 1, Math.PI);
  solarArray(L.solarC);
  if (!late) { pad(L.free, 'empty'); L.rub5.crystals = true; for (const k of ['rub1', 'rub2', 'rub3', 'rub4', 'rub5']) pad(L[k], 'rubble'); }
  else { houses(L.free); houses(L.rub1); houses(L.rub2); houses(L.rub3); pad(L.rub4); houses(L.rub5); }
  return L;
}
function zoneStreets(late) {
  // avenue up the middle from the Ark to the shipyard, cross streets between the blocks
  const list = [[-18, 18, 18, 15], [-18, 18, 0, -3], [-1.5, 1.5, 15, late ? -99 : -27]];
  if (late) list.push([-18, 18, -27, -30], [-18, 18, -42, -45], [-18, 18, -63, -66], [-18, 18, -78, -81], [-18, 18, -99, -102], [-18, 18, -117, -120]);
  streets(pathMat(late), list);
}

function buildEarly() {
  scene.add(Wd.terrainPBR(false, { ark: [0, 22.5], ice: [13.5, 24], carbon: [12, -5.5] }, PH.red_laterite_soil_stones, 6));
  Wd.scatterRocks(scene, false, 260, (x, z) => !(Math.abs(x) < 19 && z > -28 && z < 30));
  zoneStreets(false);
  const L = zone1(false);
  put(kit('astronautA', 2.3), 0, 13.2, 0.4);
  for (let i = 0; i < 8; i++) { const x = L.water.cx + 0.6 + T.rng() * 2, z = L.water.cz + 0.6 + T.rng() * 1.8; K.sph(scene, 0.22 + T.rng() * 0.35, K.M.ice, x, Wd.gy(x, z) + 0.05, z, { seg: 6, seg2: 4, s: [1, 0.5, 1] }); }
  for (let i = 0; i < 14; i++) { const x = L.drill.cx - 3.4 + T.rng() * 6.8, z = L.drill.cz + 2.4 + T.rng() * 1.4, r = 0.18 + T.rng() * 0.28; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), K.M.carbon); m.position.set(x, Wd.gy(x, z) + r * 0.5, z); m.rotation.set(T.rng() * 3, T.rng() * 3, 0); m.castShadow = true; scene.add(m); }
  // ЕХО hovers by the new hab and lights it up; in placement it lights the free spot for the chosen building
  const tgt = PLACE ? L.free : L.hab;
  const ex = tgt.cx - 2.6, ez = tgt.cz + 3.4, ey = Wd.gy(ex, ez) + 5.0;
  put(K.echoBot(), ex, ez, -0.6, 1.1, ey);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.4, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x4fd1a5, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(tgt.cx - 0.6, Wd.gy(0, tgt.cz) + 2.6, tgt.cz + 1.2); beam.lookAt(ex, ey, ez); beam.rotateX(Math.PI / 2); scene.add(beam);
  halo(ex, ey, ez, 2.2, 0x6ff2c4, 0.45);
  if (PANEL) { selectFrame(L.drill); beam.visible = false; }
  else if (BUILD) beam.visible = false;
  else if (PLACE) {
    selectFrame(L.free);
    // the chosen building stands on its spot as a see-through ghost until "Строй тук"
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0x4fd1a5, emissive: 0x4fd1a5, emissiveIntensity: 0.9, transparent: true, opacity: 0.6, depthWrite: false });
    const ghost = kit('hangar_roundB', 1.7); ghost.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
    at(ghost, L.free, 1, Math.PI);
    halo(L.free.cx, Wd.gy(0, L.free.cz) + 1.2, L.free.cz, 9, 0x6ff2c4, 0.35);
  } else selectFrame(L.hab);
  P('place', L.free.cx, Wd.gy(0, L.free.cz) + 6.5, L.free.cz);
  // zone 2 under dust: the outlines of its plots, in their different sizes
  for (const r of LATE_Z2) pad(r, 'locked');
  for (let i = 0; i < 16; i++) dust(-24 + i * 3.2 + T.rng() * 2, Wd.gy(0, -32) + 4 + T.rng() * 4, -33 - T.rng() * 5, 14 + T.rng() * 8, 0xe6b48e, 0.7);
  for (let i = 0; i < 14; i++) dust(-24 + i * 3.6 + T.rng() * 2, Wd.gy(0, -42) + 7 + T.rng() * 5, -42 - T.rng() * 8, 20 + T.rng() * 10, 0xdba57f, 0.9);
  for (let i = 0; i < 10; i++) dust(-26 + i * 5.5, Wd.gy(0, -60) + 12 + T.rng() * 5, -60 - T.rng() * 12, 30, 0xd39a74, 0.95);
  for (let i = 0; i < 6; i++) dust(-16 + T.rng() * 32, 1.5 + T.rng() * 2, -4 + T.rng() * 26, 7, 0xe8bc98, 0.1);
  dust(L.proc.cx, 11, L.proc.cz, 6, 0xf6eee8, 0.5); dust(L.proc.cx + 0.8, 14, L.proc.cz - 0.9, 8, 0xf6eee8, 0.3);
  P('drill', L.drill.cx + 2.8, Wd.gy(0, L.drill.cz) + 2.4, L.drill.cz + 2.8); P('water', L.water.cx + 0.4, Wd.gy(0, L.water.cz) + 1.4, L.water.cz + 1.6);
  P('hab', L.hab.cx, Wd.gy(0, L.hab.cz) + 3.6, L.hab.cz); P('empty', L.free.cx, Wd.gy(0, L.free.cz) + 0.4, L.free.cz); P('rubble', L.rub5.cx, Wd.gy(0, L.rub5.cz) + 1.0, L.rub5.cz);
  P('zone', 0, Wd.gy(0, -24) + 0.5, -24.5); P('echo', ex, ey + 1, ez);
  if (ZOOM) { camera.position.set(-1, 60, 62); camera.lookAt(-1, 0, 9); } else { camera.position.set(0, 118, 90); camera.lookAt(0, 0, 8); }
  frameSun(0, 2, 70, 90);
}

// zone 2 layout (used for its locked outlines early on and built later)
const LATE_Z2 = [R(-16.5, -7.5, -30, -42), R(-7.5, -1.5, -30, -42), R(1.5, 7.5, -30, -42), R(7.5, 16.5, -30, -42),
  R(-16.5, -7.5, -45, -51), R(-16.5, -7.5, -51, -57), R(-7.5, -1.5, -45, -57), R(1.5, 7.5, -45, -57), R(7.5, 16.5, -45, -51), R(7.5, 16.5, -51, -57)];

function buildLate() {
  scene.add(Wd.terrainPBR(true, {}, PH.aerial_grass_rock, 14));
  zoneStreets(true);
  Wd.scatterRocks(scene, true, 90, (x, z) => Wd.wallness(x, z) > 0.4);
  const spots = [];
  for (let i = 0; i < 1500; i++) { const z = 30 - T.rng() * 170, side = T.rng() < 0.5 ? -1 : 1, x = side * (19 + T.rng() * 30); if (Math.abs(x) > 62) continue; spots.push([x, Wd.heightAt(x, z), z, 0.8 + T.rng() * 0.9]); }
  const park = (r) => { pad(r); const y = Wd.gy(0, r.cz) + 0.3, nx = Math.floor(r.w / 3), nz = Math.floor(r.d / 3); for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) if ((i + k) % 2 === 0) spots.push([r.x0 + 1.5 + i * 3, y, r.zb + 1.5 + k * 3, 0.62, 1]); K.cyl(scene, 0.9, 1.0, 0.4, K.M.concrete, r.cx, y + 0.2, r.cz, { seg: 24 }); K.cyl(scene, 0.75, 0.75, 0.05, new THREE.MeshStandardMaterial({ color: 0x3b8fb0, roughness: 0.1, metalness: 0.2 }), r.cx, y + 0.42, r.cz, { seg: 24 }); };
  zone1(true);
  // zone 2: farms and the fish basin
  const [z2a, z2b, z2c, z2d, z2e, z2f, z2g, z2h, z2i, z2j] = LATE_Z2;
  pad(z2a); { const b = K.rbox(null, z2a.w - 1.4, 0.2, z2a.d - 1.4, new THREE.MeshPhysicalMaterial({ color: 0x2b7e9c, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.6, normalMap: T.detailNormal(256, 12), normalScale: new THREE.Vector2(0.25, 0.25) }), 0, 0, 0, { r: 0.1 }); put(b, z2a.cx, z2a.cz, 0, 1, Wd.gy(0, z2a.cz) + 0.28); for (const dz of [-3.4, 0, 3.4]) K.tor(scene, 1.4, 0.13, K.M.orange, z2a.cx, Wd.gy(0, z2a.cz) + 0.42, z2a.cz + dz, { rx: Math.PI / 2 }); }
  pad(z2b); at(K.greenhouse(10.4), z2b, 0.95, Math.PI / 2);
  const crop1 = new THREE.MeshStandardMaterial({ ...T.cropSet([206, 176, 70], [150, 160, 60]), roughness: 0.9 }), crop2 = new THREE.MeshStandardMaterial({ ...T.cropSet([92, 150, 60], [140, 180, 80]), roughness: 0.9 });
  const field = (r, m, rot = 0) => { pad(r); const f = K.rbox(null, r.w - 1.0, 0.12, r.d - 1.0, m, 0, 0, 0, { r: 0.04, tile: 6 }); put(f, r.cx, r.cz, 0, 1, Wd.gy(0, r.cz) + 0.36); const len = (rot ? r.d : r.w) - 1.6; const piv = new THREE.Group(); K.rbox(piv, len, 0.12, 0.12, K.M.steel, 0, 1.4, 0, { r: 0.03 }); for (let k = 0; k < 6; k++) K.cyl(piv, 0.04, 0.04, 1.1, K.M.steel, -len / 2 + (k + 0.5) * len / 6, 0.85, 0, { seg: 4 }); K.cyl(piv, 0.22, 0.22, 1.6, K.M.orange, -len / 2, 1.0, 0); put(piv, r.cx, r.cz, rot, 1, Wd.gy(0, r.cz) + 0.3); };
  { pad(z2c); const y = Wd.gy(0, z2c.cz); for (const s of [-1, 1]) for (let i = 0; i <= 6; i++) { K.cyl(scene, 0.06, 0.06, 0.8, K.M.wood, z2c.x0 + 0.6 + i * (z2c.w - 1.2) / 6, y + 0.7, z2c.cz + s * (z2c.d / 2 - 0.6), { seg: 4 }); } for (const s of [-1, 1]) for (let i = 0; i <= 10; i++) K.cyl(scene, 0.06, 0.06, 0.8, K.M.wood, z2c.cx + s * (z2c.w / 2 - 0.6), y + 0.7, z2c.zb + 0.6 + i * (z2c.d - 1.2) / 10, { seg: 4 });
    for (let i = 0; i < 6; i++) { const c = new THREE.Group(), m = i % 3 ? K.M.white : K.M.rubber; K.rbox(c, 1.0, 0.55, 0.45, m, 0, 0.75, 0, { r: 0.15 }); K.rbox(c, 0.35, 0.35, 0.3, m, 0.62, 0.95, 0, { r: 0.1 }); for (const [a, b] of [[-0.35, -0.15], [0.35, -0.15], [-0.35, 0.15], [0.35, 0.15]]) K.cyl(c, 0.05, 0.05, 0.5, m, a, 0.25, b, { seg: 5 }); put(c, z2c.cx - 1.2 + (i % 2) * 2.4, z2c.zb + 2 + Math.floor(i / 2) * 3.6, i % 2 ? 0.3 : Math.PI - 0.2, 1, y + 0.3); } }
  field(z2d, crop2, Math.PI / 2);
  houses(z2e); park(z2f); pad(z2g); at(K.greenhouse(10.4), z2g, 0.95, Math.PI / 2); field(z2h, crop1, Math.PI / 2); solarArray(z2i); houses(z2j);
  for (const z of [-31, -42, -53, -70]) put(K.turbine(z * 0.37), 24, z, 0, 1, Wd.heightAt(24, z) - 0.3);
  // zone 3: towers of different sizes, a dome park, the shuttle
  const t1 = R(-16.5, -7.5, -66, -78), t2 = R(-7.5, -1.5, -66, -72), h1 = R(-7.5, -1.5, -72, -78), dome = R(1.5, 13.5, -66, -78), strip = R(13.5, 16.5, -66, -78);
  const t3 = R(-16.5, -10.5, -81, -87), t4 = R(-16.5, -10.5, -87, -93), pk = R(-10.5, -1.5, -81, -93), lab2 = R(1.5, 7.5, -81, -87), h2 = R(1.5, 7.5, -87, -93), shuttle = R(7.5, 16.5, -81, -93);
  pad(t1); at(K.tower(24, 7.4, '#ff8a3d'), t1);
  pad(t2); at(K.tower(14, 4.8, '#4fd1a5'), t2);
  houses(h1);
  pad(dome); at(K.geoDome(5.4, g => { for (let i = 0; i < 16; i++) { const t = new THREE.Group(); K.cyl(t, 0.1, 0.15, 0.8, K.M.wood, 0, 0.4, 0, { seg: 6 }); K.sph(t, 0.6, K.M.leaf, 0, 1.15, 0, { seg: 10, seg2: 8 }); t.position.set(-3 + (i % 4) * 2, 0.5, -3 + Math.floor(i / 4) * 2); g.add(t); } }), dome);
  solarArray(strip);
  pad(t3); at(K.tower(19, 4.8, '#6f8fd8'), t3);
  pad(t4); at(K.tower(11, 4.8, '#4fd1a5'), t4);
  park(pk);
  pad(lab2); at(kit('hangar_roundGlass', 1.7), lab2);
  houses(h2);
  pad(shuttle); { const g = new THREE.Group(); g.add(rocket(2.6)); K.lattice(g, 10, 1.4, 1.0, 7, 0.05, K.M.orange, -3.4, 0.3, 0); K.rbox(g, 2.2, 0.2, 0.3, K.M.orange, -2.2, 7.6, 0, { r: 0.05 }); at(g, shuttle, 1, 0, 0.8, 0); }
  // zone 4: the shipyard across the whole width, industry behind it
  const yard = R(-16.5, 16.5, -102, -117), cool = R(-16.5, -7.5, -120, -129), sm1 = R(-4.5, 4.5, -120, -129), tanks = R(4.5, 7.5, -120, -129), sm2 = R(7.5, 16.5, -120, -129);
  pad(yard); at(K.warshipDock(), yard, 0.92);
  pad(cool); at(K.coolingTower(), cool, 0.62, 0, -1.4, 0);
  pad(sm1); at(K.smelter(), sm1, 1.1);
  pad(tanks); for (const dz of [-2.8, 0, 2.8]) put(kit('machine_barrelLarge', 3.4), tanks.cx, tanks.cz + dz, 0);
  pad(sm2); at(K.smelter(), sm2, 1.1, Math.PI);
  dust(cool.cx - 1.4, Wd.gy(0, cool.cz) + 10, cool.cz, 9, 0xffffff, 0.7); dust(cool.cx - 1, Wd.gy(0, cool.cz) + 13, cool.cz - 1, 12, 0xffffff, 0.45);
  Wd.scatterTrees(scene, spots);
  for (const [x, y, z] of [[0, 9, -36], [0, 11, -58], [-9, 10, -20]]) put(K.drone(), x, z, 0, 1.3, Wd.gy(x, z) + y);
  for (const [n, x, y, z, r] of [['craft_speederA', 0.6, 7, -71, 0], ['craft_speederB', -6, 9, -62, Math.PI / 2], ['craft_speederA', 9, 8, -44, -Math.PI / 2], ['craft_cargoA', -9, 14, -96, 0.3]]) put(kit(n, n === 'craft_cargoA' ? 2.4 : 1.3), x, z, r, 1, Wd.gy(x, z) + y);
  const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.16, 0.45, 3, 6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 170);
  const tones = [0xff8a3d, 0x4f7fd1, 0xeef1f5, 0x4fd1a5, 0xd9644a, 0x8b6fd1, 0xf2c14e], m4 = new THREE.Matrix4(), col = new THREE.Color();
  const crossZ = [16.5, -1.5, -28.5, -43.5, -64.5, -79.5, -100.5];
  for (let i = 0; i < 170; i++) { const along = T.rng() < 0.55; const z = along ? 15 - T.rng() * 112 : crossZ.at(Math.floor(T.rng() * crossZ.length)) + (T.rng() - 0.5) * 2; const x = along ? (T.rng() - 0.5) * 2.4 : -16 + T.rng() * 32; m4.makeTranslation(x, Wd.gy(x, z) + 0.45, z); people.setMatrixAt(i, m4); people.setColorAt(i, col.set(tones[i % tones.length])); }
  people.castShadow = true; scene.add(people);
  put(K.capsuleChute(), z2h.cx, z2h.cz, 0, 0.75, Wd.gy(0, z2h.cz) + 13);
  const ex = -0.2, ez = -50, ey = Wd.gy(0, ez) + 7.5; put(K.echoBot(), ex, ez, -0.5, 1.2, ey); halo(ex, ey, ez, 2.4, 0x6ff2c4, 0.4);
  for (const [x, z, s] of [[-24, -95, 32], [20, -132, 38], [-26, -45, 26]]) dust(x, 34, z, s, 0xffffff, 0.8);
  P('ship', -9, Wd.gy(0, yard.cz) + 8, yard.cz + 3); P('capsule', z2h.cx, Wd.gy(0, z2h.cz) + 17, z2h.cz); P('shuttle', shuttle.cx + 0.6, Wd.gy(0, shuttle.cz) + 10, shuttle.cz); P('field', z2d.cx, Wd.gy(0, z2d.cz) + 1.5, z2d.cz); P('echo', ex, ey + 1, ez);
  if (ZOOM) { camera.position.set(3, 80, -26); camera.lookAt(3, 6, -74); } else { camera.position.set(0, 172, 8); camera.lookAt(0, 4, -88); }
  frameSun(0, -88, 80, 130);
}

if (!LATE) buildEarly(); else buildLate();

function frameSun(cx, cz, w, d) {
  sun.position.set(cx - 40, 90, cz + 40); sun.target.position.set(cx, 0, cz);
  Object.assign(sun.shadow.camera, { left: -w / 2 - 10, right: w / 2 + 10, top: d / 2 + 10, bottom: -d / 2 - 10, near: 10, far: 300 });
  sun.shadow.camera.updateProjectionMatrix();
}

// ---------- render with ambient occlusion and a gentle bloom ----------
const rt = new THREE.WebGLRenderTarget(W * DPR, H * DPR, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(DPR); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, W * DPR, H * DPR);
ao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.2, thickness: 1.5, scale: 1.0, samples: 12 });
ao.blendIntensity = 0.85;
// sprites (dust, glow) are flat quads: keep them out of the occlusion pass
const aoRender = ao.render.bind(ao);
ao.render = (...args) => { const hidden = []; scene.traverse(o => { if (o.isSprite && o.visible) { o.visible = false; hidden.push(o); } }); aoRender(...args); hidden.forEach(o => { o.visible = true; }); };
composer.addPass(ao);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W * DPR, H * DPR), 0.3, 0.5, 0.9));
composer.addPass(new OutputPass());
composer.render();

const out = {};
for (const [k, v] of Object.entries(anchors)) { const p = v.clone().project(camera); out[k] = { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; }
window.__anchors = out;
window.__state = { late: LATE, panel: PANEL || BUILD || PLACE, build: BUILD, place: PLACE };
window.dispatchEvent(new Event('scene-ready'));
