// The catalogue of the chapter-1 buildings: each model alone on a plot, lit like map.html and seen by its camera
// (36 degrees above the ground, along the diagonal, so the door is on the left face).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const TILES = [
  ['ark-v1', 'Ковчегът (CellCog)'], ['carbon-drill-v1', 'Карбонова сонда (CellCog)'], ['kk/geolocator', 'Геолокатор'], ['kk/pump', 'Помпа за вода'],
  ['kk/processor', 'Атмосферен процесор'], ['kk/veglab', 'Лаборатория за зеленчуци'], ['kk/home-10', 'Дом на колонистите'], ['kk/kitchen', 'Обща кухня'],
  ['kk/research', 'Рисърч станция'], ['kk/mine-portal', 'Мина: в началото тунел'], ['kk/mine', 'Мина: по-късно шахта'], ['kk/warehouse', 'Склад'],
  ['kk/furnace', 'Силициева пещ'], ['kk/solar', 'Слънчеви панели'], ['kk/batteries', 'Батерии'], ['kk/greenhouse', 'Оранжерия'],
];
// #phone: the same tiles three to a row at phone width (mockup/screens/buildings-kk.jpg), only the buildings we made
const PHONE_TILES = [
  ['kk/home-10', 'Дом на колонистите'], ['kk/kitchen', 'Обща кухня'], ['kk/processor', 'Атмосферен процесор'],
  ['kk/veglab', 'Лаборатория за зеленчуци'], ['kk/greenhouse', 'Оранжерия'], ['kk/research', 'Рисърч станция'],
  ['kk/warehouse', 'Склад'], ['kk/furnace', 'Силициева пещ'], ['kk/mine', 'Мина'],
  ['kk/pump', 'Помпа за вода'], ['kk/solar', 'Слънчеви панели'], ['kk/batteries', 'Батерии'], ['kk/geolocator', 'Геолокатор'],
];
// #set=<name>: ideas side by side, level 1 on the left and level 10 on the right (art/3d/buildings/ideas)
const SETS = {
  // k: one scale for the whole sheet (metres per Blender unit), so the level-10 building stands bigger than level 1
  research: { title: 'Рисърч станцията: три идеи, на ниво 1 и на ниво 10', k: 3.7, tiles: [
    ['kk/ideas/research-a-1', 'А, лаборатория с проби: ниво 1'], ['kk/ideas/research-a-10', 'А: ниво 10, втори слот и учен'],
    ['kk/ideas/research-b-1', 'Б, обсерватория и компютри: ниво 1'], ['kk/ideas/research-b-10', 'Б: ниво 10, втори слот и учен'],
    ['kk/ideas/research-c-1', 'В, работилница за прототипи: ниво 1'], ['kk/ideas/research-c-10', 'В: ниво 10, втори слот и учен'],
  ] },
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

const EL = THREE.MathUtils.degToRad(36);
const DIR = new THREE.Vector3(Math.cos(EL) * Math.SQRT1_2, Math.sin(EL), Math.cos(EL) * Math.SQRT1_2);
const FOOT = 9.6, PLOT = 14, VIEW = 16; // metres: the building's footprint, the plot, the width of the picture

async function tile(name, fixedK) {
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

  const root = (await gltf.loadAsync('models/' + name + '.glb')).scene;
  root.traverse(o => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material], clear = ms.some(m => m.transparent);
    o.castShadow = !clear; o.receiveShadow = true;
    for (const m of ms) { m.metalness = 0; if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; } else m.roughness = Math.max(0.5, m.roughness ?? 0.6); }
    if (clear) o.renderOrder = 2;
  });
  const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const k = fixedK || FOOT / Math.max(s.x, s.z);
  root.scale.setScalar(k); root.position.set(-c.x * k, -b.min.y * k, -c.z * k); scene.add(root);

  const h = s.y * k, cam = new THREE.OrthographicCamera(-VIEW / 2, VIEW / 2, VIEW / 2, -VIEW / 2, 1, 600);
  const look = new THREE.Vector3(0, h * 0.36, 0);
  cam.position.copy(look).addScaledVector(DIR, 300); cam.lookAt(look); cam.updateMatrixWorld();
  // a tall model (the carbon drill) gets a wider picture, so its top is not cut off
  const box = new THREE.Box3().setFromObject(root), top = new THREE.Vector3(0, box.max.y, 0).applyMatrix4(cam.matrixWorldInverse).y;
  if (top > VIEW / 2 * 0.9) {
    const v = (top + VIEW / 2) / 1.85; // keep the bottom edge, leave a margin above the top
    Object.assign(cam, { left: -v, right: v, top: v, bottom: -v }); cam.position.addScaledVector(cam.up.clone().applyQuaternion(cam.quaternion), v - VIEW / 2); cam.updateProjectionMatrix();
  }
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

const grid = document.getElementById('grid');
for (const [name, label] of ONE ? TILES.filter(t => t[0] === ONE) : SET ? SET.tiles : PHONE ? PHONE_TILES : TILES) {
  const card = document.createElement('div'); card.className = 'card';
  const img = new Image(); img.src = await tile(name, SET && SET.k); await img.decode();
  const cap = document.createElement('div'); cap.textContent = label;
  card.append(img, cap); grid.append(card);
}
await document.fonts.ready;
window.__ready = true;
