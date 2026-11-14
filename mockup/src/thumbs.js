// The pictures for the menus (menus.html): buildings and people on a clear background.
//   window.__building(name)      a model of art/3d/buildings from the map's camera (36 degrees, along the diagonal)
//   window.__portrait(person)    head and shoulders of a person of looks.json, a little from the side
//   window.__figure(person)      the whole person
// Each returns a WebP data URL (clear background); shot-thumbs.js writes them to ui/thumbs.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PX = 384;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(PX, PX); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.95;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const gltf = new GLTFLoader(), draco = new DRACOLoader();
draco.setDecoderPath('node_modules/three/examples/jsm/libs/draco/'); gltf.setDRACOLoader(draco);
const cache = {};
const load = async path => (cache[path] ??= (await gltf.loadAsync('models/' + path + '.glb')).scene).clone(true);
const LOOKS = await (await fetch('models/ch/looks.json')).json();
const OPTIONAL = ['hair_short', 'hair_bun', 'hair_full', 'beard', 'stripe', 'aerial'];

function stage() {
  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentIntensity = 0.35;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8b0, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-30, 80, 50); scene.add(sun);
  return scene;
}
function tidy(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      m.metalness = 0;
      if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; o.renderOrder = 2; } else m.roughness = Math.max(0.5, m.roughness ?? 0.6);
    }
  });
  return root;
}
// an orthographic camera looking from (turn, el) that frames the box of what is drawn, with a margin
function shoot(scene, root, el, turn, box = null, margin = 1.08) {
  const e = THREE.MathUtils.degToRad(el), dir = new THREE.Vector3(Math.cos(e) * Math.sin(turn), Math.sin(e), Math.cos(e) * Math.cos(turn));
  box ??= new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3()), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  cam.position.copy(c).addScaledVector(dir, 500); cam.lookAt(c); cam.updateMatrixWorld();
  const pts = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse));
  const lo = { x: Math.min(...pts.map(q => q.x)), y: Math.min(...pts.map(q => q.y)) }, hi = { x: Math.max(...pts.map(q => q.x)), y: Math.max(...pts.map(q => q.y)) };
  const v = Math.max(hi.x - lo.x, hi.y - lo.y) / 2 * margin, cx = (lo.x + hi.x) / 2, cy = (lo.y + hi.y) / 2;
  Object.assign(cam, { left: cx - v, right: cx + v, top: cy + v, bottom: cy - v }); cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/webp', 0.9);
}
window.__building = async name => {
  const scene = stage(), root = tidy(await load('kk/' + name));
  scene.add(root);
  return shoot(scene, root, 36, Math.PI / 4);
};
async function person(name) {
  const look = LOOKS.people[name], g = tidy(await load('ch/colonist'));
  const show = new Set(['hair_' + look.style, ...(look.beard ? ['beard'] : []), ...(look.profession === 'commander' ? ['stripe', 'aerial'] : [])]);
  const tint = { accent: LOOKS.accent[look.profession], skin: look.skin, hair: look.hair }, own = {};
  g.traverse(o => {
    if (OPTIONAL.includes(o.name)) o.visible = show.has(o.name);
    if (o.isMesh && tint[o.material.name]) { own[o.material.name] ??= Object.assign(o.material.clone(), { color: new THREE.Color(tint[o.material.name]) }); o.material = own[o.material.name]; }
  });
  return g;
}
window.__portrait = async name => {
  const scene = stage(), g = await person(name); scene.add(g);
  // the helmet and the shoulders
  return shoot(scene, g, 8, 0.38, new THREE.Box3(new THREE.Vector3(-0.42, 0.86, -0.3), new THREE.Vector3(0.42, 1.72, 0.3)), 1.0);
};
window.__figure = async name => {
  const scene = stage(), g = await person(name); scene.add(g);
  return shoot(scene, g, 10, 0.38, new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.3), new THREE.Vector3(0.5, 1.75, 0.3)), 1.04);
};
window.__echo = async () => {
  const scene = stage(), g = tidy(await load('ch/echo')); scene.add(g);
  return shoot(scene, g, 10, 0.3, null, 1.1);
};
window.__people = Object.keys(LOOKS.people);
window.__ready = true;
