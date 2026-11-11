// The catalogue of the chapter-1 buildings: each model alone on a plot, lit like map.html and seen by its camera
// (36 degrees above the ground, along the diagonal, so the door is on the left face).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const TILES = [
  ['kk/ark', 'Ковчегът'], ['carbon-drill-v1', 'Карбонова сонда (CellCog)'], ['kk/geolocator', 'Геолокатор'], ['kk/pump', 'Помпа за вода'],
  ['kk/processor', 'Атмосферен процесор'], ['kk/veglab', 'Лаборатория за зеленчуци'], ['kk/home-10', 'Дом на колонистите'], ['kk/kitchen', 'Обща кухня'],
  ['kk/research-10', 'Рисърч станция'], ['kk/mine-portal', 'Мина: в началото тунел'], ['kk/mine', 'Мина: по-късно шахта'], ['kk/warehouse', 'Склад'],
  ['kk/furnace', 'Силициева пещ'], ['kk/solar', 'Слънчеви панели'], ['kk/batteries', 'Батерии'], ['kk/greenhouse', 'Оранжерия'],
];
// #phone: the same tiles three to a row at phone width (mockup/screens/buildings-kk.jpg), only the buildings we made
const PHONE_TILES = [
  ['kk/ark', 'Ковчегът'], ['kk/home-10', 'Дом на колонистите'], ['kk/kitchen', 'Обща кухня'], ['kk/processor', 'Атмосферен процесор'],
  ['kk/veglab', 'Лаборатория за зеленчуци'], ['kk/greenhouse', 'Оранжерия'], ['kk/research-10', 'Рисърч станция'],
  ['kk/warehouse', 'Склад'], ['kk/furnace', 'Силициева пещ'], ['kk/mine', 'Мина'],
  ['kk/pump', 'Помпа за вода'], ['kk/solar', 'Слънчеви панели'], ['kk/batteries', 'Батерии'], ['kk/geolocator', 'Геолокатор'],
];
function views(m, title, k, right, left, extra = []) {
  return { title, k, tiles: [
    [m, 'Откъм камерата на картата', 0, 0], [m, 'Отзад', 0, Math.PI],
    [m, 'Отгоре', 0, Math.PI / 4, 88], [m, 'Отпред', 0, Math.PI / 4, 4],
    [m, `Отдясно (${right})`, 0, -Math.PI / 4, 4], [m, `Отляво (${left})`, 0, 3 * Math.PI / 4, 4], ...extra,
  ] };
}
// #set=<name>: ideas side by side, level 1 on the left and level 10 on the right (art/3d/buildings/ideas)
const SETS = {
  // k: one scale for the whole sheet (metres per Blender unit), so the level-10 building stands bigger than level 1
  research: { title: 'Рисърч станцията: три идеи, на ниво 1 и на ниво 10', k: 3.7, tiles: [
    ['kk/ideas/research-a-1', 'А, лаборатория с проби: ниво 1'], ['kk/ideas/research-a-10', 'А: ниво 10, втори слот и учен'],
    ['kk/research-1', 'Б, обсерватория и компютри: ниво 1 (избрана)'], ['kk/research-10', 'Б: ниво 10, втори слот и учен'],
    ['kk/ideas/research-c-1', 'В, работилница за прототипи: ниво 1'], ['kk/ideas/research-c-10', 'В: ниво 10, втори слот и учен'],
  ] },
  // the Ark (Joro, 06.11.2026): two new ideas, each from the map's corner and from the back corner, then the one we have;
  // [name, label, metres per unit, turn]: the ideas at the scale they stand on the map, the CellCog Ark at its map scale
  ark: { title: 'Ковчегът: две идеи, отпред и отзад, и сегашният', tiles: [
    ['kk/ideas/ark-a', 'А, изправеният кораб, по-голям: откъм камерата', 4.15, 0], ['kk/ideas/ark-a', 'А: отзад', 4.15, Math.PI],
    ['kk/ideas/ark-b', 'Б, корабът на корема: откъм камерата', 4.15, 0], ['kk/ideas/ark-b', 'Б: отзад', 4.15, Math.PI],
    ['ark-v1', 'Сегашният (CellCog): откъм камерата', 0.72, 0], ['ark-v1', 'Сегашният: отзад', 0.72, Math.PI],
  ] },
  // one new model checked from the map's corner, the back, the top and three sides (11.11.2026):
  // [name, label, metres per unit, turn, elevation in degrees]
  rover: views('kk/rover', 'Роботът събирач: откъм картата, отзад, отгоре и от три страни', 17, 'ръката', 'мачтата'),
  dock: views('kk/dock-4', 'Докът с рамата: готовата рама откъм картата, отзад, отгоре и от три страни; етапите; на парцела на Ковчега', 4.6, 'страната към Ковчега', 'външната страна', [
    ['kk/dock-0', 'Ниво 12: празният док', 0, 0], ['kk/dock-1', 'Етап 1 (ниво 12, 200 стомана): кил, кърма, три ребра', 0, 0],
    ['kk/dock-2', 'Етап 2 (ниво 14, 500): седем ребра', 0, 0], ['kk/dock-3', 'Етап 3 (ниво 17, 1 000): всички ребра, носът, долните надлъжни греди', 0, 0],
    ['kk/ark+kk/dock-1@2.32,-1.82', 'На парцела на Ковчега (етап 1), в мащаба на картата', 4.15, 0, 36, 28],
    ['kk/ark+kk/dock-4@2.32,-1.82', 'На парцела на Ковчега отгоре: кранът и мястото за частите', 4.15, 0, 88, 28]]),
  claypit: views('kk/claypit', 'Глиненият изкоп: откъм картата, отзад, отгоре и от три страни', 5.4, 'багерът и ледът', 'скатът и навесът'),
  smelter: views('kk/smelter', 'Топилнята: откъм картата, отзад, отгоре и от три страни', 5.2, 'мачтата и трансформаторът', 'бункерът и лентата',
    [['kk/smelter', 'Топилнята в мащаба на картата', 4.15, 0], ['kk/furnace', 'Силициевата пещ, до която стои, в същия мащаб', 4.15, 0]]),
};
const SET = SETS[(location.hash.match(/set=(\w+)/) || [])[1]];
const PHONE = location.hash.includes('phone') || !!SET;
if (SET) document.body.classList.add('pair');
if (PHONE) { document.body.classList.add('phone'); document.querySelector('h1').textContent = SET ? SET.title : 'Сградите на глава 1 в избрания стил'; }
const ONE = (location.hash.match(/tile=([\w/-]+)/) || [])[1];
const PX = 788; // one tile, drawn at twice the size it is shown

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(PX, PX);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const gltf = new GLTFLoader(), draco = new DRACOLoader();
draco.setDecoderPath('node_modules/three/examples/jsm/libs/draco/'); gltf.setDRACOLoader(draco);

const dirAt = deg => { const e = THREE.MathUtils.degToRad(deg); return new THREE.Vector3(Math.cos(e) * Math.SQRT1_2, Math.sin(e), Math.cos(e) * Math.SQRT1_2); };
const FOOT = 9.6, PLOT = 14, VIEW = 16; // metres: the building's footprint, the plot, the width of the picture

async function tile(name, fixedK, turn = 0, el = 36, fit = false) {
  const DIR = dirAt(el);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9d39a);
  scene.environment = env; scene.environmentIntensity = 0.35;
  // a whiter bounce than on the map's orange ground, so the cream stays cream
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc2ad, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(-30, 80, 50); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 5;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 200 }); sun.shadow.camera.updateProjectionMatrix();
  const plot = new THREE.Mesh(new THREE.BoxGeometry(PLOT, 0.02, PLOT), new THREE.MeshStandardMaterial({ color: 0xe0d7c6, roughness: 0.9 }));
  plot.position.y = -0.01; plot.receiveShadow = true; scene.add(plot);

  // 'a+b@x,y': more models in one picture, b set at (x, y) Blender units from a (the dock on the Ark's plot)
  const root = new THREE.Group();
  for (const part of name.split('+')) {
    const [path, at] = part.split('@'), m = (await gltf.loadAsync('models/' + path + '.glb')).scene;
    if (at) { const [x, y] = at.split(',').map(Number); m.position.set(x, 0, -y); }
    root.add(m);
  }
  root.traverse(o => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material], clear = ms.some(m => m.transparent);
    o.castShadow = !clear; o.receiveShadow = true;
    for (const m of ms) { m.metalness = 0; if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; } else m.roughness = Math.max(0.5, m.roughness ?? 0.6); }
    if (clear) o.renderOrder = 2;
  });
  root.rotation.y = turn; root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const k = fixedK || FOOT / Math.max(s.x, s.z);
  root.scale.setScalar(k); root.position.set(-c.x * k, -b.min.y * k, -c.z * k); scene.add(root);

  // fit = the side of the first model's plot in metres (28 for the Ark's 2x2), drawn round its origin
  if (fit) { plot.scale.set(fit / PLOT, 1, fit / PLOT); plot.position.set(-c.x * k, -0.01, -c.z * k); sun.shadow.camera.left = sun.shadow.camera.bottom = -40; sun.shadow.camera.right = sun.shadow.camera.top = 40; sun.shadow.camera.updateProjectionMatrix(); }
  const h = s.y * k, cam = new THREE.OrthographicCamera(-VIEW / 2, VIEW / 2, VIEW / 2, -VIEW / 2, 1, 600);
  const look = new THREE.Vector3(0, h * 0.36, 0);
  cam.position.copy(look).addScaledVector(DIR, 300); cam.lookAt(look); cam.updateMatrixWorld();
  // a tall model (the carbon drill) gets a wider picture, so its top is not cut off
  const box = new THREE.Box3().setFromObject(root), top = new THREE.Vector3(0, box.max.y, 0).applyMatrix4(cam.matrixWorldInverse).y;
  if (fit) {
    // the whole group in the picture: fit the frustum round its projected box
    box.union(new THREE.Box3().setFromObject(plot));
    const pts = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse));
    const lo = { x: Math.min(...pts.map(q => q.x)), y: Math.min(...pts.map(q => q.y)) }, hi = { x: Math.max(...pts.map(q => q.x)), y: Math.max(...pts.map(q => q.y)) };
    const v = Math.max(hi.x - lo.x, hi.y - lo.y) / 2 * 1.08, cx = (lo.x + hi.x) / 2, cy = (lo.y + hi.y) / 2;
    Object.assign(cam, { left: cx - v, right: cx + v, top: cy + v, bottom: cy - v }); cam.updateProjectionMatrix();
  } else if (top > VIEW / 2 * 0.9) {
    const v = (top + VIEW / 2) / 1.85; // keep the bottom edge, leave a margin above the top
    Object.assign(cam, { left: -v, right: v, top: v, bottom: -v }); cam.position.addScaledVector(cam.up.clone().applyQuaternion(cam.quaternion), v - VIEW / 2); cam.updateProjectionMatrix();
  }
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

const grid = document.getElementById('grid');
for (const [name, label, k, turn, el, fit] of ONE ? TILES.filter(t => t[0] === ONE) : SET ? SET.tiles : PHONE ? PHONE_TILES : TILES) {
  const card = document.createElement('div'); card.className = 'card';
  const img = new Image(); img.src = await tile(name, k || (SET && SET.k), turn || 0, el ?? 36, fit || 0); await img.decode();
  const cap = document.createElement('div'); cap.textContent = label;
  card.append(img, cap); grid.append(card);
}
await document.fonts.ready;
window.__ready = true;
