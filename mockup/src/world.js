// Terrain with a painted ground texture, scattered rocks and trees, water, roads and fields.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

export const EDGES = [24, 60, 96, 132];
export const halfW = z => { const t = -z; return 20 + 1.2 * Math.sin(t * 0.045) + 0.8 * Math.sin(t * 0.13 + 1); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function floorH(z) { const t = -z; let h = 0; for (const e of EDGES) h += 2.4 * smooth(e - 1.8, e + 1.8, t); return h; }
export const gy = (x, z) => floorH(z);
let LAKE = null;
export function setLake(l) { LAKE = l; }
export function lakeMask(x, z) { if (!LAKE) return 0; const dx = (x - LAKE.x) / LAKE.rx, dz = (z - LAKE.z) / LAKE.rz; return smooth(1.08, 0.7, Math.sqrt(dx * dx + dz * dz) + (T.fbm(x / 3, z / 3, 2) - 0.5) * 0.15); }
export function wallness(x, z) { return smooth(-0.5, 3, Math.abs(x) - halfW(z)); }
export function heightAt(x, z) {
  const d = Math.abs(x) - halfW(z);
  let h = floorH(z) + (T.fbm(x / 7, z / 7, 3) - 0.5) * 0.25;
  if (d > 0) h += 16 * smooth(0, 9, d) + 6 * smooth(9, 32, d) + (T.fbm(x / 4, z / 4, 4) - 0.5) * 3.2 * smooth(0, 3, d) + Math.sin(h * 1.1) * 0.25;
  h -= 1.8 * lakeMask(x, z);
  return h;
}

// world rectangle covered by the terrain and its painted texture
const X0 = -75, X1 = 75, Z0 = -190, Z1 = 50, PPM = 12;
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function paintGround(late, extras) {
  const W = (X1 - X0) * PPM, H = (Z1 - Z0) * PPM, c = T.canvas(W, H), ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H), d = img.data;
  for (let py = 0; py < H; py++) {
    const z = Z0 + py / PPM;
    const hw = halfW(z), fh = floorH(z);
    for (let px = 0; px < W; px++) {
      const x = X0 + px / PPM;
      const n1 = T.fbm(x / 9, z / 9, 4), n2 = T.fbm(x / 2.2, z / 2.2, 3), n3 = T.fbm(x / 30, z / 30, 3);
      const wall = smooth(-0.5, 3, Math.abs(x) - hw);
      const hh = wall > 0.01 ? heightAt(x, z) : fh;
      let col;
      if (!late) {
        const ripple = Math.sin((x * 0.9 + z * 0.35) * 2.6 + n1 * 6) * 0.035;
        let sand = mix([170, 104, 70], [204, 142, 102], n1 * 0.8 + n2 * 0.4 - 0.1);
        sand = sand.map(v => v * (1 + ripple));
        sand = mix(sand, [150, 92, 64], smooth(0.5, 0.8, n3) * 0.5);
        const strata = 0.5 + 0.5 * Math.sin(hh * 2.1 + n1 * 3.2);
        const rock = mix([112, 64, 46], [176, 110, 78], strata * 0.8 + n2 * 0.3);
        col = mix(sand, rock, wall);
        col = col.map(v => v * (1 - 0.22 * smooth(0.66, 0.8, n2) * (1 - wall)));
        // landing scorch under the Ark
        const sc = Math.hypot((x - extras.ark[0]) / 1.7, z - extras.ark[1]);
        col = mix(col, [74, 48, 38], smooth(9.5, 4, sc + (n2 - 0.5) * 3) * 0.75);
        // ice in the shade of the right wall
        const di = Math.hypot(x - extras.ice[0], z - extras.ice[1]) + (n1 - 0.5) * 2.4;
        if (di < 4.6) { const crack = Math.abs(n2 - 0.5) < 0.025 ? 0.75 : 1; col = mix(col, [214 * crack, 232 * crack, 242 * crack], smooth(4.6, 3.2, di)); }
        // carbon seam
        const dc = Math.hypot(x - extras.carbon[0], z - extras.carbon[1]) + (n2 - 0.5) * 2.6;
        if (dc < 4.2) col = mix(col, [34, 31, 34], smooth(4.2, 2.6, dc));
      } else {
        let grass = mix([80, 128, 56], [122, 166, 74], n1 * 0.9 + n2 * 0.35 - 0.15);
        grass = mix(grass, [68, 108, 48], smooth(0.6, 0.8, n3) * 0.5);
        if (n2 > 0.78) grass = mix(grass, [200, 196, 110], 0.35);
        const strata = 0.5 + 0.5 * Math.sin(hh * 2.1 + n1 * 3.2);
        const rock = mix([118, 98, 84], [170, 146, 124], strata * 0.8 + n2 * 0.3);
        const moss = mix(rock, [86, 120, 62], smooth(0.45, 0.7, n1) * (1 - smooth(0.4, 0.9, wall)) + (hh > 16 ? 0.55 : 0));
        col = mix(grass, moss, wall);
        const lm = lakeMask(x, z);
        if (lm > 0.02) col = mix(col, [212, 196, 150], smooth(0.02, 0.25, lm));
        if (lm > 0.45) col = mix(col, [70, 98, 92], smooth(0.45, 0.9, lm));
      }
      const i = (py * W + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // tracks and paths drawn on top
  const P = (x, z) => [(x - X0) * PPM, (z - Z0) * PPM];
  ctx.lineCap = 'round';
  for (const path of extras.tracks || []) {
    for (const off of [-0.55, 0.55]) {
      ctx.strokeStyle = late ? 'rgba(150,124,92,0.9)' : 'rgba(96,58,40,0.38)'; ctx.lineWidth = late ? 1.6 * PPM : 0.35 * PPM; ctx.setLineDash(late ? [] : [6, 3]);
      ctx.beginPath(); path.forEach(([x, z], k) => { const [a, b] = P(x + (late ? 0 : off), z); k ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke();
      if (late) break;
    }
  }
  ctx.setLineDash([]);
  for (const [x, z, r] of extras.plazas || []) { const [a, b] = P(x, z); ctx.fillStyle = 'rgba(196,192,184,0.95)'; ctx.beginPath(); ctx.roundRect(a - r * PPM, b - r * PPM, 2 * r * PPM, 2 * r * PPM, 1.2 * PPM); ctx.fill(); ctx.strokeStyle = 'rgba(150,146,140,0.6)'; ctx.lineWidth = 2; for (let k = -r; k <= r; k += 1.5) { ctx.beginPath(); ctx.moveTo(a + k * PPM, b - r * PPM); ctx.lineTo(a + k * PPM, b + r * PPM); ctx.stroke(); } }
  const t = T.tex(c, { repeat: false }); t.anisotropy = 16;
  return t;
}

export function terrain(late, extras) {
  const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, 300, 480);
  geo.rotateX(-Math.PI / 2);
  geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const detail = T.detailNormal(512, 20); detail.repeat.set(60, 96);
  const mat = new THREE.MeshStandardMaterial({ map: paintGround(late, extras), normalMap: detail, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.96, metalness: 0 });
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = true;
  return m;
}

// Terrain with a real scanned PBR texture (Poly Haven, CC0) tiled across it; the large-scale
// story (scorch, ice, carbon seam, cliffs) rides on top as vertex colours.
export function terrainPBR(late, extras, set, tileM) {
  const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, 300, 480);
  geo.rotateX(-Math.PI / 2);
  geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = heightAt(x, z);
    p.setY(i, h);
    const n1 = T.fbm(x / 9, z / 9, 4), n3 = T.fbm(x / 30, z / 30, 3), wall = wallness(x, z);
    let c;
    if (!late) {
      const b = 1 + 0.2 * n1 - 0.14 * n3;
      c = [1.42 * b, 1.18 * b, 1.0 * b];
      const strata = 0.5 + 0.5 * Math.sin(h * 2.1 + n1 * 3);
      c = mix(c, [0.72 + 0.16 * strata, 0.6 + 0.12 * strata, 0.56 + 0.1 * strata], wall);
      const sc = Math.hypot((x - extras.ark[0]) / 1.7, z - extras.ark[1]);
      c = mix(c, [0.38, 0.32, 0.3], smooth(10, 4, sc + (n1 - 0.5) * 3) * 0.8);
      const di = Math.hypot(x - extras.ice[0], z - extras.ice[1]) + (n1 - 0.5) * 2;
      c = mix(c, [1.35, 1.5, 1.65], smooth(4.4, 2.8, di));
      const dc = Math.hypot(x - extras.carbon[0], z - extras.carbon[1]) + (n1 - 0.5) * 2.4;
      c = mix(c, [0.16, 0.15, 0.16], smooth(4.2, 2.6, dc));
    } else {
      const b = 1 + 0.14 * n1 - 0.1 * n3;
      c = [0.86 * b, 1.16 * b, 0.74 * b];
      c = mix(c, [0.9, 0.86, 0.8], wall * 0.6);
    }
    col.set(c, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  for (const t of [set.map, set.normalMap, set.roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((X1 - X0) / tileM, (Z1 - Z0) / tileM); t.anisotropy = 16; }
  const mat = new THREE.MeshStandardMaterial({ ...set, vertexColors: true, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(1.2, 1.2) });
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = true;
  return m;
}

// ---------- rocks ----------
function rockGeo(seedOff) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = T.fbm(v.x * 1.3 + seedOff, v.y * 1.3 + v.z * 0.7 + seedOff, 3); v.multiplyScalar(0.72 + n * 0.6); v.y *= 0.62; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return g;
}
export function scatterRocks(scene, late, count, filter) {
  const geos = [rockGeo(1), rockGeo(7), rockGeo(13)];
  const detail = T.detailNormal(256, 10);
  const mat = new THREE.MeshStandardMaterial({ color: late ? 0x9a8a7c : 0xa86a4c, roughness: 0.92, normalMap: detail, normalScale: new THREE.Vector2(1.4, 1.4) });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  geos.forEach((geo, gi) => {
    const inst = new THREE.InstancedMesh(geo, mat, count); let n = 0;
    for (let k = 0; k < count * 6 && n < count; k++) {
      const z = 45 - T.rng() * 200, side = T.rng() < 0.5 ? -1 : 1;
      const x = side * (halfW(z) - 4 + T.rng() * 26);
      if (filter && !filter(x, z)) continue;
      const w = wallness(x, z); if (T.rng() > 0.25 + w * 0.75) continue;
      const sz = (0.25 + T.rng() * T.rng() * 2.4) * (1 + w * 1.6);
      pos.set(x, heightAt(x, z) - sz * 0.15, z); q.setFromEuler(new THREE.Euler(T.rng() * 0.5, T.rng() * 6.28, T.rng() * 0.5)); s.set(sz, sz * (0.7 + T.rng() * 0.6), sz);
      m4.compose(pos, q, s); inst.setMatrixAt(n, m4);
      const v = 0.85 + T.rng() * 0.3; inst.setColorAt(n, col.setRGB(v, v * (0.96 + T.rng() * 0.06), v * 0.95)); n++;
    }
    inst.count = n; inst.castShadow = true; inst.receiveShadow = true; scene.add(inst);
  });
}

// ---------- trees: conifers and broadleaf, instanced ----------
function coniferGeo() {
  const parts = [];
  for (let i = 0; i < 4; i++) { const c = new THREE.ConeGeometry(1.25 - i * 0.24, 1.6, 9, 2); c.translate(0, 1.3 + i * 0.85, 0); parts.push(c); }
  const g = mergeGeometries(parts.map(p => p.toNonIndexed())), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = T.fbm(x * 2 + 3, z * 2 + y, 2) - 0.5; p.setXYZ(i, x * (1 + n * 0.35), y + n * 0.15, z * (1 + n * 0.35)); }
  g.computeVertexNormals(); return g;
}
function broadleafGeo() {
  const parts = [];
  for (const [x, y, z, r] of [[0, 2.4, 0, 1.25], [0.7, 2.0, 0.3, 0.9], [-0.6, 2.1, -0.2, 0.95], [0.1, 3.1, -0.2, 0.85]]) { const s = new THREE.IcosahedronGeometry(r, 1); s.translate(x, y, z); parts.push(s); }
  const g = mergeGeometries(parts.map(p => p.toNonIndexed())), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = T.fbm(x * 1.6 + 9, y * 1.6 + z, 2) - 0.5; p.setXYZ(i, x + n * 0.3, y + n * 0.25, z + n * 0.3); }
  g.computeVertexNormals(); return g;
}
export function scatterTrees(scene, spots) {
  const leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.9 });
  const kinds = [coniferGeo(), broadleafGeo()], trunk = new THREE.CylinderGeometry(0.14, 0.22, 1.6, 6); trunk.translate(0, 0.8, 0);
  const palette = [[0.2, 0.42, 0.18], [0.27, 0.5, 0.2], [0.33, 0.56, 0.22], [0.22, 0.38, 0.2], [0.42, 0.6, 0.24]];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  const insts = kinds.map(g => new THREE.InstancedMesh(g, leaf, spots.length)), tr = new THREE.InstancedMesh(trunk, trunkM, spots.length);
  const counts = [0, 0]; let tn = 0;
  for (const [x, y, z, sc, kind] of spots) {
    const k = kind ?? (T.rng() < 0.55 ? 0 : 1), sz = sc;
    pos.set(x, y - 0.1, z); q.setFromEuler(new THREE.Euler(0, T.rng() * 6.28, 0)); s.set(sz, sz * (0.85 + T.rng() * 0.35), sz);
    m4.compose(pos, q, s); insts[k].setMatrixAt(counts[k], m4); tr.setMatrixAt(tn++, m4);
    const c = palette[Math.floor(T.rng() * palette.length)]; insts[k].setColorAt(counts[k], col.setRGB(c[0], c[1], c[2]).convertSRGBToLinear()); counts[k]++;
  }
  insts.forEach((m, i) => { m.count = counts[i]; m.castShadow = true; m.receiveShadow = true; scene.add(m); });
  tr.count = tn; tr.castShadow = true; scene.add(tr);
}

// ---------- road ribbon that follows the ground ----------
export function ribbon(scene, pts, width, mat, lift = 0.06, tile = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.2);
  const N = Math.max(20, Math.round(curve.getLength() * 1.5)), pos = [], uv = [], idx = [];
  let acc = 0, prev = null;
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t), nx = -tg.z, nz = tg.x;
    if (prev) acc += p.distanceTo(prev); prev = p.clone();
    for (const s of [-1, 1]) { const x = p.x + nx * s * width / 2, z = p.z + nz * s * width / 2; pos.push(x, Math.max(heightAt(x, z), floorH(z)) + lift, z); uv.push(s < 0 ? 0 : 1, acc / tile); }
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
}
