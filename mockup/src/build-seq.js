// The build sequence (proposal, 06.11.2026, reworked after an independent review): the build drone flies out of the
// Ark to the plot and surveys it with a line laser (a real laser line on the ground, no scanner: docs/levels.md rule 8),
// marks the building's footprint on the ground with its laser, as construction projectors do, while the game shows
// the plan as layers of light (the hologram is the interface, not something in the air). Then the drone extrudes a
// paste of crushed stone and a carbon binder layer by layer, like the drones that printed with cement (Aerial-AM,
// Imperial College and Empa, Nature 2022): the fresh layer is darker and wet and dries to cream. The arch gets a clear
// film pulled over its ribs (like ETFE greenhouses); the silicon pays for the sensors and the lights, which come on last.
// The beds stay empty: an agronomist plants them.
// map.html#lvl10-build loads it on top of the level-10 map; window.__buildAt(t) shows the moment t (seconds).
import * as THREE from 'three';

const clamp01 = x => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = x => x * x * (3 - 2 * x);
const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const TEAL = new THREE.Color('#3fe0d0'), WET = new THREE.Color('#c9ad86');

// the timeline, in seconds
// first the interface (U seconds): Build, the menu, the spot, Build here; then the drone
export const U = { tapBuild: 0.8, sheetIn: 1.0, tapCard: 2.3, sheetOut: 2.6, spot: 3.8, tapHere: 4.6, go: 5.2 };
const u = U.go;
export const T = { start: u, lift: u + 0.6, arrive: u + 3.0, scanEnd: u + 4.4, holoEnd: u + 6.0, printStart: u + 7.0, printEnd: u + 11.0, glassEnd: u + 12.2, lightsEnd: u + 12.8, leave: u + 13.0, end: u + 14.4 };

export async function setup({ scene, renderer, camera, aim, gltf, NIGHT }) {
  renderer.localClippingEnabled = true;
  const target = scene.getObjectByName('greenhouse');
  const ark = scene.getObjectByName('ark');
  target.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(target), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const y0 = box.min.y, y1 = box.max.y, K = target.children[0].scale.x;
  const arkBox = ark ? new THREE.Box3().setFromObject(ark) : new THREE.Box3(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 4, 2));
  // the drone lives on the Ark's balcony (art/3d/buildings/ark.glb marks its pad 'drone_pad'); the parked one is hidden,
  // because this one flies out from there. An Ark without the pad sends it from the top, as before.
  const padNode = ark && ark.getObjectByName('drone_pad'), parked = ark && ark.getObjectByName('parked_drone');
  if (parked) parked.visible = false;
  const home = padNode ? padNode.getWorldPosition(new THREE.Vector3())
    : new THREE.Vector3((arkBox.min.x + arkBox.max.x) / 2, arkBox.max.y + 0.6, (arkBox.min.z + arkBox.max.z) / 2);

  // ---------- the building as it is printed: the walls below h, the hot fresh layer at h, the glass later ----------
  const below = new THREE.Plane(new THREE.Vector3(0, -1, 0), y0), bandLo = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0), bandHi = new THREE.Plane(new THREE.Vector3(0, -1, 0), y0);
  const glassCut = new THREE.Plane(new THREE.Vector3(-1, 0, 0), box.min.x);
  const lit = [], leaves = [];
  target.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material.clone(); o.material = m;
    if (m.transparent) m.clippingPlanes = [glassCut];
    else m.clippingPlanes = [below];
    if (m.emissive && m.emissiveIntensity > 0) { lit.push([m, m.emissiveIntensity]); m.emissiveIntensity = 0; }
    if (/leaf/.test(m.name)) leaves.push(o);
  });
  const band = target.clone(true);
  // the fresh layer: the same walls, darker and a little shiny while the paste is wet
  const wetMat = new THREE.MeshStandardMaterial({ color: WET, roughness: 0.35, metalness: 0, side: THREE.DoubleSide, clippingPlanes: [bandLo, bandHi] });
  band.traverse(o => { if (o.isMesh) { o.material = o.material.transparent || /leaf/.test(o.material.name) ? new THREE.MeshBasicMaterial({ visible: false }) : wetMat; o.castShadow = false; } });
  scene.add(band);
  // the leading edge of the clear film as the drone pulls it over the ribs
  const glassLo = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), glassHi = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const glassBand = target.clone(true);
  const paleHot = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff'), transparent: true, opacity: 0.7, side: THREE.DoubleSide, clippingPlanes: [glassLo, glassHi], depthWrite: false });
  glassBand.traverse(o => { if (o.isMesh) { o.material = o.material.transparent ? paleHot : new THREE.MeshBasicMaterial({ visible: false }); o.castShadow = false; o.renderOrder = 4; } });
  scene.add(glassBand);

  // ---------- the light model the laser draws: layers of light, brighter at the edges ----------
  const holoMat = new THREE.ShaderMaterial({
    uniforms: { uMin: { value: y0 }, uMax: { value: y0 }, uAlpha: { value: 0 }, uColor: { value: TEAL }, uLayers: { value: 1 / (0.12 * K) } },
    vertexShader: `varying vec3 vN; varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uMin, uMax, uAlpha, uLayers; uniform vec3 uColor; varying vec3 vN; varying vec3 vW;
      void main() {
        if (vW.y < uMin || vW.y > uMax) discard;
        vec3 v = normalize(cameraPosition - vW);
        float rim = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
        float layer = smoothstep(0.86, 1.0, fract(vW.y * uLayers));
        float top = smoothstep(0.25, 0.0, uMax - vW.y);
        gl_FragColor = vec4(uColor * (1.0 + 0.5 * layer), (0.08 + 0.5 * rim + 0.3 * layer + 0.4 * top) * uAlpha);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const holo = target.clone(true);
  holo.traverse(o => { if (o.isMesh) { o.material = /leaf/.test(o.material.name) ? new THREE.MeshBasicMaterial({ visible: false }) : holoMat; o.castShadow = false; o.receiveShadow = false; o.renderOrder = 5; } });
  scene.add(holo);

  // ---------- the drone ----------
  const droneRoot = (await gltf.loadAsync('models/kk/drone.glb')).scene;
  droneRoot.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const m = o.material; m.metalness = 0; if (!m.transparent) m.roughness = Math.max(0.5, m.roughness ?? 0.6); } });
  // a little bigger than true scale, so it reads on a phone
  const drone = new THREE.Group(); droneRoot.scale.setScalar(K * 1.25); drone.add(droneRoot); scene.add(drone);
  // the rotor blades (the grey parts) spin about their own centres once the drone is sent
  // the export puts every part's origin at the middle of the drone, so each pair of blades is moved to turn about its
  // own rotor: the geometry is shifted to the pair's centre and the mesh placed there instead
  const blades = []; droneRoot.traverse(o => { if (o.isMesh && /grey/.test(o.material.name)) blades.push([o, null]); });
  const centre = o => { o.geometry.computeBoundingBox(); return o.geometry.boundingBox.getCenter(new THREE.Vector3()); };
  for (let r = 0; r < blades.length / 2; r++) {
    const a = blades[2 * r][0], b = blades[2 * r + 1][0], m = centre(a).add(centre(b)).multiplyScalar(0.5);
    for (const o of [a, b]) { o.geometry = o.geometry.clone(); o.geometry.translate(-m.x, -m.y, -m.z); o.position.add(m.clone().applyQuaternion(o.quaternion).multiply(o.scale)); }
  }
  for (const bl of blades) bl[1] = bl[0].quaternion.clone();
  const spin = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  const NOZZLE = 0.0 * K; // the nozzle tip is at the drone's origin height
  const BAND = 0.28;      // the hot fresh layer, metres
  // the walls to follow: the printed meshes, without the glass and the plants
  const walls = []; target.traverse(o => { if (o.isMesh && !o.material.transparent && !/leaf/.test(o.material.name)) walls.push(o); });
  const glassMeshes = []; target.traverse(o => { if (o.isMesh && o.material.transparent) glassMeshes.push(o); });
  const ray = new THREE.Raycaster();
  // where the wall is at height h, seen from the side at angle a: a ray from far out towards the middle
  function wallAt(h, a) {
    const far = Math.max(size.x, size.z) * 1.5, o = new THREE.Vector3(c.x + Math.cos(a) * far, h, c.z + Math.sin(a) * far);
    ray.set(o, new THREE.Vector3(c.x, h, c.z).sub(o).normalize()); ray.far = far * 2;
    const hit = ray.intersectObjects(walls, false)[0];
    return hit ? hit.point : new THREE.Vector3(c.x + Math.cos(a) * rx, h, c.z + Math.sin(a) * rz);
  }
  // the outline of each layer: the extent of the walls at that height, smoothed from layer to layer, so the drone flies a
  // steady rounded loop instead of jumping between the ribs
  const N = 48, layers = [];
  { const pts = []; const v = new THREE.Vector3();
    for (const m of walls) { m.updateMatrixWorld(true); const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i += 2) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); pts.push(v.x, v.y, v.z); } }
    for (let i = 0; i <= N; i++) {
      const hy = y0 + (y1 - y0) * i / N; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let j = 0; j < pts.length; j += 3) if (pts[j + 1] > hy - 0.45 && pts[j + 1] < hy + 0.05) { x0 = Math.min(x0, pts[j]); x1 = Math.max(x1, pts[j]); z0 = Math.min(z0, pts[j + 2]); z1 = Math.max(z1, pts[j + 2]); }
      layers.push(isFinite(x0) ? [x0, x1, z0, z1] : (layers[i - 1] || [box.min.x, box.max.x, box.min.z, box.max.z]));
    }
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < N; i++) for (let q = 0; q < 4; q++) layers[i][q] = (layers[i - 1][q] + 2 * layers[i][q] + layers[i + 1][q]) / 4;
  }
  function layerPath(h, a) {
    const f = clamp01((h - y0) / (y1 - y0)) * N, i = Math.min(N - 1, Math.floor(f)), u = f - i, L = [0, 1, 2, 3].map(q => lerp(layers[i][q], layers[i + 1][q], u));
    const cx = (L[0] + L[1]) / 2, cz = (L[2] + L[3]) / 2, hx = Math.max(0.3, (L[1] - L[0]) / 2), hz = Math.max(0.3, (L[3] - L[2]) / 2);
    const ca = Math.cos(a), sa = Math.sin(a), e = 0.7;   // a rounded rectangle, rounder than a box so the speed stays even
    return new THREE.Vector3(cx + hx * Math.sign(ca) * Math.pow(Math.abs(ca), e), h, cz + hz * Math.sign(sa) * Math.pow(Math.abs(sa), e));
  }
  // the arch is the same height along its length, so the drone pulls the film at one height above it
  const glassBox = new THREE.Box3(); glassMeshes.forEach(m => glassBox.expandByObject(m));
  function glassTop(x) {
    ray.set(new THREE.Vector3(x, y1 + 5, c.z), new THREE.Vector3(0, -1, 0)); ray.far = 20;
    const hit = ray.intersectObjects(glassMeshes, false)[0];
    return hit ? hit.point : new THREE.Vector3(x, y1, c.z);
  }

  // the laser: thin beams that show in the dusty air
  const beamMat = (color, op) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, toneMapped: false });
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); beamGeo.translate(0, 0.5, 0);
  const beam = (mat, r) => { const m = new THREE.Mesh(beamGeo, mat); m.userData.r = r; m.renderOrder = 6; scene.add(m); return m; };
  const aimBeam = (m, a, b) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); m.visible = L > 0.01; m.position.copy(a); m.scale.set(m.userData.r, L, m.userData.r); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); };
  // the footprint the drone's laser marks on the ground, and the four beams that draw it
  const holoBeams = [0, 1, 2, 3].map(() => beam(beamMat(TEAL, 0.5), 0.025));
  const foot = new THREE.Group(), footMat = beamMat(TEAL, 0.95);
  for (const [w, d, x, z] of [[size.x, 0.1, 0, -size.z / 2], [size.x, 0.1, 0, size.z / 2], [0.1, size.z, -size.x / 2, 0], [0.1, size.z, size.x / 2, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), footMat); m.position.set(x, 0, z); m.renderOrder = 6; foot.add(m); }
  foot.position.set(c.x, y0 + 0.03, c.z); scene.add(foot);
  // the scan: a line of light that sweeps over the plot, and the thin sheet of light from the drone to it
  const scanLine = new THREE.Mesh(new THREE.BoxGeometry(size.x + 1.2, 0.05, 0.12), beamMat(TEAL, 0.95)); scanLine.renderOrder = 6; scene.add(scanLine);
  const sheetGeo = new THREE.BufferGeometry(); sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
  const sheet = new THREE.Mesh(sheetGeo, new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); sheet.renderOrder = 6; scene.add(sheet);

  // ---------- the flight: out of the Ark, over to the plot, around the walls while it prints, home again ----------
  const cruise = y1 + 4.5, hover = y1 + 3.2;
  const rx = size.x * 0.42, rz = size.z * 0.42;
  function rawPos(t) {
    if (t < T.lift) return home.clone().setY(home.y + 0.4 * smooth(seg(t, T.start, T.lift)));
    if (t < T.arrive) { const k = inOut(seg(t, T.lift, T.arrive)); const p = new THREE.Vector3().lerpVectors(home, new THREE.Vector3(c.x, 0, c.z), k); p.y = lerp(home.y + 0.4, hover, k) + Math.sin(k * Math.PI) * (cruise - hover + 1.5); return p; }
    if (t < T.printStart) { const k = seg(t, T.arrive, T.printStart); return new THREE.Vector3(c.x, hover + 0.15 * Math.sin(t * 2.2), c.z + lerp(0, size.z * 0.1, smooth(k))); }
    if (t < T.printEnd) {
      const k = seg(t, T.printStart, T.printEnd), h = y0 + (y1 - y0) * k + 0.01, a = Math.PI / 2 + k * Math.PI * 2;
      const w = layerPath(h, a);
      const ease = smooth(seg(t, T.printStart, T.printStart + 0.6));
      return new THREE.Vector3(lerp(c.x, w.x, ease), lerp(hover, h + 0.15, ease), lerp(c.z + size.z * 0.1, w.z, ease));
    }
    if (t < T.glassEnd) { const k = smooth(seg(t, T.printEnd, T.glassEnd)); return new THREE.Vector3(lerp(glassBox.min.x + 0.3, glassBox.max.x - 0.3, k), glassBox.max.y + 1.2, (glassBox.min.z + glassBox.max.z) / 2); }
    if (t < T.leave) return new THREE.Vector3(box.max.x, y1 + 1.6 + 0.4 * seg(t, T.glassEnd, T.leave), c.z);
    const k = inOut(seg(t, T.leave, T.end + 1.2)); const p = new THREE.Vector3().lerpVectors(new THREE.Vector3(box.max.x, 0, c.z), new THREE.Vector3(home.x, 0, home.z), k);
    p.y = lerp(y1 + 2.0, home.y, k) + Math.sin(k * Math.PI) * 3; return p;
  }

  // the phases meet without a jump: for half a second after each change the drone eases from where it was
  const joins = [T.printEnd, T.glassEnd, T.leave];
  function dronePos(t) {
    const p = rawPos(t);
    for (const b of joins) if (t >= b && t < b + 0.5) return rawPos(b - 1e-4).lerp(p, smooth((t - b) / 0.5));
    return p;
  }

  function at(t) {
    // the drone, tilted a little into its direction of flight
    const p = dronePos(t), q = dronePos(t + 0.05), v = new THREE.Vector3().subVectors(q, p).multiplyScalar(20);
    drone.position.copy(p);
    // 0.7 rad a frame at 30 fps reads as turning, not as a stopped wheel
    const ang = 21 * Math.max(0, t - T.start - 0.2);
    // two blades a rotor; the diagonal rotors turn the same way, the other two the other way
    blades.forEach(([o, q0], i) => { const r = Math.floor(i / 2); spin.setFromAxisAngle(UP, ang * (r === 0 || r === 3 ? 1 : -1)); o.quaternion.copy(q0).premultiply(spin); });
    drone.rotation.set(THREE.MathUtils.clamp(v.z * 0.025, -0.25, 0.25), Math.atan2(v.x, v.z) * 0 + 0.0, THREE.MathUtils.clamp(-v.x * 0.025, -0.25, 0.25));
    const nozzle = p.clone().add(new THREE.Vector3(0, NOZZLE, 0));

    // the scan sweeps the plot from the front to the back
    const ks = seg(t, T.arrive, T.scanEnd), scanning = t > T.arrive && t < T.scanEnd;
    scanLine.visible = sheet.visible = scanning;
    if (scanning) {
      const z = lerp(box.max.z + 0.6, box.min.z - 0.6, smooth(ks));
      scanLine.position.set(c.x, y0 + 0.05, z);
      const P = sheetGeo.attributes.position; P.setXYZ(0, nozzle.x, nozzle.y, nozzle.z); P.setXYZ(1, box.min.x - 0.6, y0 + 0.05, z); P.setXYZ(2, box.max.x + 0.6, y0 + 0.05, z); P.needsUpdate = true; sheetGeo.computeBoundingSphere();
    }

    // the light model rises from the ground, holds, then gives way to the print from below
    const kh = smooth(seg(t, T.scanEnd, T.holoEnd));
    const printing = t >= T.printStart && t < T.printEnd;
    const kp = seg(t, T.printStart, T.printEnd), h = y0 + (y1 - y0) * kp;
    holoMat.uniforms.uMax.value = lerp(y0, y1 + 0.05, kh);
    holoMat.uniforms.uMin.value = t < T.printStart ? y0 : h;
    holoMat.uniforms.uAlpha.value = t < T.scanEnd ? 0 : t < T.printEnd ? 1 : 0;
    const corners = [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.max.x, box.max.z], [box.min.x, box.max.z]];
    const drawing = t > T.scanEnd && t < T.holoEnd;
    // the laser marks the footprint on the ground corner by corner; the outline stays until the print covers it
    const kf = smooth(seg(t, T.scanEnd, T.scanEnd + 0.8));
    foot.visible = t > T.scanEnd && t < T.printStart + 0.6; foot.scale.set(Math.max(kf, 0.001), 1, Math.max(kf, 0.001));
    holoBeams.forEach((b, i) => { b.visible = drawing; if (drawing) aimBeam(b, nozzle, new THREE.Vector3(c.x + (corners[i][0] - c.x) * kf, y0 + 0.05, c.z + (corners[i][1] - c.z) * kf)); });

    // the walls, and the fresh wet layer the nozzle lays
    below.constant = t < T.printStart ? y0 - 1 : t >= T.printEnd ? y1 + 1 : h - BAND;
    bandLo.constant = -(h - BAND); bandHi.constant = h;
    band.visible = printing;
    const glazing = t >= T.printEnd && t < T.glassEnd;
    target.visible = t >= T.printStart;

    // the clear film, pulled over the ribs from one end of the arch to the other
    const kg = smooth(seg(t, T.printEnd, T.glassEnd));
    const gx = lerp(box.min.x + 0.3, box.max.x - 0.3, kg);
    glassCut.constant = t < T.printEnd ? box.min.x - 1 : t >= T.glassEnd ? box.max.x + 1 : gx;
    glassBand.visible = glazing; glassLo.constant = -(gx - 0.35); glassHi.constant = gx;

    // the lights come on; the beds stay empty until an agronomist plants them
    const kl = smooth(seg(t, T.glassEnd, T.lightsEnd));
    for (const [m, e] of lit) m.emissiveIntensity = e * kl;
    for (const o of leaves) o.visible = false;
    ui(t, p);
  }

  // the camera: from the Ark it follows the drone to the plot, then stays on the plot and steps back at the end
  function shoot(t) {
    const ks = inOut(seg(t, U.sheetOut, U.spot)), ki = inOut(seg(t, T.arrive - 0.6, T.arrive + 0.8)), ke = smooth(seg(t, T.lightsEnd, T.end));
    const view = lerp(lerp(lerp(34, 26, ks), 19, ki), 23, ke);
    const x = lerp(lerp(home.x + 12, c.x - 6, ks), c.x, ki), z = lerp(lerp(home.z + 2, c.z + 1, ks), c.z, ki);
    aim(view, x, z);
  }

  // ---------- the interface on top of the map, in the style of the HUD ----------
  const echo = scene.getObjectByName('echo'), echoHome = echo.position.clone();
  const echoSpot = new THREE.Vector3(box.min.x - 0.5, y1 + 2.4, box.max.z + 1.5);
  const outline = new THREE.Group();
  const lineMat = new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.9, toneMapped: false });
  const P = 11.8, PY = 0.45;
  for (const [w, d, x, z] of [[P, 0.22, 0, -P / 2], [P, 0.22, 0, P / 2], [0.22, P, -P / 2, 0], [0.22, P, P / 2, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), lineMat); m.position.set(x, 0, z); outline.add(m); }
  outline.position.set(target.position.x, PY, target.position.z); scene.add(outline);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(P, P), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }));
  fill.rotation.x = -Math.PI / 2; fill.position.set(target.position.x, PY - 0.02, target.position.z); scene.add(fill);

  const css = document.createElement('style');
  css.textContent = `
    #bui { position: absolute; inset: 0; pointer-events: none; overflow: hidden; font-family: 'Nunito', sans-serif; font-weight: 800; color: var(--ink); }
    #bui .sheet { position: absolute; left: 8px; right: 8px; bottom: 0; height: 452px; border-radius: 28px 28px 0 0; padding: 16px 16px 0; }
    #bui .grab { width: 44px; height: 5px; border-radius: 3px; background: rgba(107,66,38,.35); margin: 0 auto 10px; }
    #bui .hd { display: flex; align-items: center; gap: 10px; }
    #bui .hd .c { width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffb070, #ff7a2a 70%); border: 3px solid #fff; box-shadow: 0 0 0 2px var(--edge); display: grid; place-items: center; }
    #bui .hd h2 { margin: 0; font-size: 22px; font-weight: 900; } #bui .hd p { margin: 0; font-size: 12.5px; color: var(--muted); }
    #bui .x { margin-left: auto; width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--edge); display: grid; place-items: center; font-size: 18px; color: var(--edge); }
    #bui .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
    #bui .bc { position: relative; border-radius: 20px; border: 3px solid var(--edge); background: #fff; padding: 10px 10px 9px; min-height: 128px; }
    #bui .bc.pick { border-color: #22c19b; box-shadow: 0 0 0 4px rgba(34,193,155,.35); }
    #bui .bc.lock { background: #f3e8da; opacity: .62; }
    #bui .bc .art { height: 52px; border-radius: 14px; background: #f6ecdc; display: grid; place-items: center; }
    #bui .bc .nm { font-size: 14px; font-weight: 900; margin-top: 6px; }
    #bui .bc .co { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 12.5px; margin-top: 3px; }
    #bui .bc .co span { display: inline-flex; align-items: center; gap: 3px; }
    #bui .bc .tm { font-size: 12px; color: var(--muted); margin-top: 2px; }
    #bui .bc .rec { position: absolute; top: -10px; right: 10px; padding: 1px 8px; border-radius: 9px; background: #22c19b; color: #fff; font-size: 12px; border: 2px solid #fff; }
    #bui .dot { width: 16px; height: 16px; border-radius: 50%; display: inline-grid; place-items: center; }
    #bui .bar { position: absolute; left: 12px; right: 12px; bottom: 24px; height: 84px; border-radius: 26px; display: flex; align-items: center; gap: 10px; padding: 0 12px; }
    #bui .bar .ti { flex: 1; } #bui .bar .ti b { font-size: 16px; } #bui .bar .ti .co { display: flex; gap: 8px; font-size: 13px; margin-top: 2px; } #bui .bar .ti .co span { display: inline-flex; align-items: center; gap: 3px; }
    #bui .go { white-space: nowrap; height: 56px; padding: 0 14px; border-radius: 20px; background: linear-gradient(#3fe0b8, #22c19b); color: #fff; font-size: 17px; font-weight: 900; display: grid; place-items: center; border: 3px solid #fff; box-shadow: 0 0 0 2px #138a6c, 0 4px 0 rgba(19,138,108,.5); }
    #bui .timer { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; }
    #bui .timer .t { white-space: nowrap; display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 5px; border-radius: 16px; font-size: 13.5px; font-weight: 900; }
    #bui .timer .t .c { width: 24px; height: 24px; border-radius: 50%; background: #ff7a2a; display: grid; place-items: center; }
    #bui .timer .pb { width: 118px; height: 7px; border-radius: 4px; background: #f1dfcb; border: 2px solid var(--edge); margin-top: 3px; overflow: hidden; }
    #bui .timer .pb i { display: block; height: 100%; background: linear-gradient(90deg, #ff9a3c, #ffc46a); }
    #bui .timer .stem { width: 3px; height: 8px; background: var(--edge); border-radius: 2px; }
    #bui .hand { position: absolute; width: 46px; height: 52px; transform: translate(-14px, -4px); filter: drop-shadow(0 3px 2px rgba(60,30,10,.35)); }
    #bui .tap { position: absolute; border-radius: 50%; border: 3px solid rgba(255,255,255,.95); box-shadow: 0 0 0 3px rgba(34,193,155,.7); transform: translate(-50%, -50%); }
    #bui .bubble { bottom: 120px; }
  `;
  document.head.appendChild(css);
  const layer = document.createElement('div'); layer.id = 'bui'; document.body.appendChild(layer);
  const SI = '<svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 .8 11 6 6 11.2 1 6z" fill="#fff"/></svg>';
  const cost = (si, st, ca) => `<span><i class="dot" style="background:#8a6fd8">${SI}</i>${si}</span><span><i class="dot" style="background:#c98b55">${ICON.stone.replace(/width="16" height="16"/, 'width="11" height="11"')}</i>${st}</span><span><i class="dot" style="background:#3a3540">${ICON.carbon.replace(/width="16" height="16"/, 'width="11" height="11"')}</i>${ca}</span>`;
  const art = {
    greenhouse: '<svg width="58" height="40" viewBox="0 0 58 40"><path d="M6 34V22a16 16 0 0 1 32 0v12z" fill="#d8f6f2" stroke="#6b4226" stroke-width="2.4"/><path d="M14 34V21M22 34V8M30 34V21" stroke="#e8dcc6" stroke-width="2"/><rect x="36" y="18" width="16" height="16" rx="6" fill="#f6e4c6" stroke="#6b4226" stroke-width="2.4"/><circle cx="46" cy="27" r="2.5" fill="#fff2c2" stroke="#2e2a2a" stroke-width="1.4"/><path d="M4 36h50" stroke="#2e2a2a" stroke-width="3" stroke-linecap="round"/><path d="M12 30q3-5 6 0M20 30q3-5 6 0" stroke="#4fb54a" stroke-width="3" fill="none"/></svg>',
    solar: '<svg width="58" height="40" viewBox="0 0 58 40"><path d="M8 26 18 10h30L38 26z" fill="#262b55" stroke="#6b4226" stroke-width="2.4"/><path d="M16 18h28M28 10l-5 16" stroke="#5a64a8" stroke-width="1.6"/><path d="M23 26v8M33 26v8M6 35h46" stroke="#6b4226" stroke-width="2.6" stroke-linecap="round"/></svg>',
    smelter: '<svg width="58" height="40" viewBox="0 0 58 40"><rect x="10" y="14" width="26" height="20" rx="8" fill="#e9dccb" stroke="#9a7a62" stroke-width="2.4"/><rect x="38" y="4" width="8" height="30" rx="4" fill="#e9dccb" stroke="#9a7a62" stroke-width="2.4"/></svg>',
    shuttle: '<svg width="58" height="40" viewBox="0 0 58 40"><ellipse cx="29" cy="32" rx="20" ry="5" fill="#e9dccb" stroke="#9a7a62" stroke-width="2.4"/><path d="M29 4c5 6 6 14 5 24H24c-1-10 0-18 5-24z" fill="#e9dccb" stroke="#9a7a62" stroke-width="2.4"/></svg>',
  };
  const sheetHTML = pick => `<div class="sheet card"><div class="grab"></div>
    <div class="hd"><div class="c">${ICON.hammer.replace('width="36" height="36"', 'width="26" height="26"')}</div><div><h2>Build</h2><p>Pick a building. ECHO shows its spot.</p></div><div class="x">✕</div></div>
    <div class="grid">
      <div class="bc ${pick ? 'pick' : ''}"><span class="rec">ECHO</span><div class="art">${art.greenhouse}</div><div class="nm">Greenhouse</div><div class="co">${cost(400, 600, 900)}</div><div class="tm">Builds in 30m · more air</div></div>
      <div class="bc"><div class="art">${art.solar}</div><div class="nm">Solar panels</div><div class="co">${cost(60, 0, 120).replace(/<span><i class="dot" style="background:#c98b55">.*?<\/span>/, '')}</div><div class="tm">Builds in 40m · energy</div></div>
      <div class="bc lock"><div class="art">${art.smelter}</div><div class="nm">Steel smelter</div><div class="tm">Chapter 2</div></div>
      <div class="bc lock"><div class="art">${art.shuttle}</div><div class="nm">Shuttle pad</div><div class="tm">Level 60</div></div>
    </div></div>`;
  const RES0 = ['15k', '9.6k', '4.1k', '2.7k'], RES1 = ['14.1k', '9.6k', '3.5k', '2.7k'];
  const toScreen = v => { const q = v.clone().project(camera); return { x: (q.x + 1) / 2 * 390, y: (1 - q.y) / 2 * 844 }; };
  const BUILD_BTN = { x: 195, y: 750 }, CARD = { x: 105, y: 520 }, HERE = { x: 310, y: 778 };
  const tapAt = (a, k) => `<div class="tap" style="left:${a.x}px;top:${a.y}px;width:${26 + 30 * k}px;height:${26 + 30 * k}px;opacity:${1 - k}"></div>`;
  const handAt = (a, press) => `<div class="hand" style="left:${a.x}px;top:${a.y + (press ? 3 : 0)}px">${ICON.hand}</div>`;

  function ui(t, dronePos3) {
    let h = '';
    // the hand: to Build, to the card, to Build here
    const hand = t < U.tapBuild + 0.25 ? BUILD_BTN : t < U.tapCard + 0.25 ? (t < U.sheetIn + 0.4 ? BUILD_BTN : CARD) : t > U.spot - 0.1 && t < U.tapHere + 0.3 ? HERE : null;
    for (const [tt, a] of [[U.tapBuild, BUILD_BTN], [U.tapCard, CARD], [U.tapHere, HERE]]) { const k = seg(t, tt, tt + 0.45); if (t >= tt && k < 1) h += tapAt(a, k); }
    // the menu slides up from the dock and back down
    const up = smooth(seg(t, U.sheetIn, U.sheetIn + 0.3)) * (1 - smooth(seg(t, U.sheetOut, U.sheetOut + 0.3)));
    if (up > 0) h += `<div style="position:absolute;inset:0;background:rgba(40,20,10,${0.25 * up})"></div><div style="position:absolute;inset:0;transform:translateY(${(1 - up) * 470}px)">${sheetHTML(t >= U.tapCard)}</div>`;
    // the spot: the outline glows, ECHO points at it, the bar with Build here
    const onSpot = t >= U.sheetOut + 0.3 && t < U.go;
    const pulse = 0.55 + 0.45 * Math.sin(t * 6);
    outline.visible = fill.visible = t >= U.sheetOut + 0.2 && t < T.arrive + 0.3;
    lineMat.opacity = t < U.go ? 0.6 + 0.35 * pulse : 0.9 * (1 - seg(t, T.arrive - 0.4, T.arrive + 0.3));
    const ke = inOut(seg(t, U.sheetOut, U.spot)), kb = inOut(seg(t, T.lightsEnd, T.end));
    echo.position.lerpVectors(echoHome, echoSpot, ke * (1 - kb * 0)).add(new THREE.Vector3(0, Math.sin(t * 3) * 0.25, 0));
    if (onSpot && t >= U.spot - 0.2) {
      const barIn = smooth(seg(t, U.spot - 0.2, U.spot + 0.1)) * (1 - smooth(seg(t, U.tapHere + 0.2, U.go)));
      h += bubble(toScreen(echo.position), 'This is the spot for the greenhouse. Next to the panels, in the sun.').replace('class="bubble card"', `class="bubble card" style="--tx:${Math.min(Math.max(toScreen(echo.position).x - 21, 30), 330).toFixed(1)}px;opacity:${barIn};bottom:122px"`);
      h += `<div class="bar card" style="transform:translateY(${(1 - barIn) * 140}px)"><div class="art" style="width:62px;height:48px;border-radius:14px;background:#f6ecdc;display:grid;place-items:center">${art.greenhouse.replace('width="58" height="40"', 'width="50" height="34"')}</div><div class="ti"><b>Greenhouse</b><div class="co">${cost(400, 600, 900)}</div></div><div class="go" style="transform:scale(${t >= U.tapHere && t < U.tapHere + 0.15 ? 0.94 : 1})">Build here</div></div>`;
    }
    // the stock goes down when the build starts
    const pills = document.querySelectorAll('#hud .res .pill');
    if (pills.length) pills.forEach((p, i) => { p.lastChild.textContent = t < U.tapHere + 0.1 ? RES0[i] : RES1[i]; });
    // the timer over the plot while it is printed: the real build takes 2 hours, the film shows it fast
    if (t >= T.lift && t < T.lightsEnd) {
      const k = seg(t, T.printStart, T.glassEnd), left = Math.round((1 - k) * 30), s = toScreen(new THREE.Vector3(target.position.x + 5.6, y0 + 0.4, target.position.z + 5.6)); s.x = Math.min(Math.max(s.x, 90), 300); s.y = Math.max(s.y, 200);
      h += `<div class="timer" style="left:${s.x.toFixed(1)}px;top:${s.y.toFixed(1)}px"><div class="t card"><span class="c">${ICON.hammer.replace('width="36" height="36"', 'width="17" height="17"')}</span>Greenhouse · ${left >= 60 ? `${Math.floor(left / 60)}h ${String(left % 60).padStart(2, '0')}m` : `${left}m`}</div><div class="pb"><i style="width:${(k * 100).toFixed(1)}%"></i></div><div class="stem"></div></div>`;
    }
    // after Build here: ECHO sends the drone
    if (t >= U.go - 0.1 && t < T.arrive + 0.6) {
      const k = smooth(seg(t, U.go - 0.1, U.go + 0.2)) * (1 - smooth(seg(t, T.arrive + 0.2, T.arrive + 0.6)));
      h += bubble(toScreen(echo.position), 'The build drone is on its way from the Ark.').replace('class="bubble card"', `class="bubble card" style="--tx:${Math.min(Math.max(toScreen(echo.position).x - 21, 30), 330).toFixed(1)}px;opacity:${k};bottom:122px"`);
    }
    // done: ECHO says what it gives
    if (t >= T.lightsEnd) {
      const k = smooth(seg(t, T.lightsEnd, T.lightsEnd + 0.4));
      h += bubble(toScreen(echo.position), 'The greenhouse is ready. Send an agronomist to plant the beds.').replace('class="bubble card"', `class="bubble card" style="--tx:${Math.min(Math.max(toScreen(echo.position).x - 21, 30), 330).toFixed(1)}px;opacity:${k};bottom:122px"`);
    }
    if (hand) h += handAt(hand, Math.abs(t - U.tapBuild) < 0.12 || Math.abs(t - U.tapCard) < 0.12 || Math.abs(t - U.tapHere) < 0.12);
    layer.innerHTML = h;
  }
  window.__buildAt = (t, cam = true) => { if (cam) shoot(t); camera.updateMatrixWorld(); at(t); renderer.render(scene, camera); };
  window.__buildT = T;
  window.__dronePos = t => dronePos(t).toArray();   // for checking the flight path
  window.__buildAt(0);
}
