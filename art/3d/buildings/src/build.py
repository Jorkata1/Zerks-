# Zerks-X6 buildings in the look Joro picked (05.11.2026, the CellCog first pass): warm cream soft bodies,
# a thin orange stripe, a charcoal plinth, mushroom vents, small teal lights, warm glowing windows.
# Where there is glass it is clear and shows a lit room behind it. Doors look along -y (the camera side).
#   python build.py -- <out_dir> [names]
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector
from kb import *
from kb import _done, _apply

OUT = sys.argv[sys.argv.index('--') + 1]
ONLY = sys.argv[sys.argv.index('--') + 2].split(',') if len(sys.argv) > sys.argv.index('--') + 2 else None

def pal():
    return dict(
        cream=mat('cream', '#f6e4c6', 0.62), cream2=mat('cream2', '#efd6b0', 0.7), orange=mat('orange', '#ef7433', 0.55),
        char=mat('charcoal', '#2e2a2a', 0.6), grey=mat('grey', '#8d8378', 0.6), teal=mat('teal', '#3fe0d0', 0.3, emit='#2fd8c8', strength=0.9),
        win=mat('window', '#fff2c2', 0.3, emit='#ffe7a0', strength=1.6), wingreen=mat('wingreen', '#c6f58a', 0.3, emit='#b3f070', strength=1.4),
        glass=mat('glass', '#d8f6f2', 0.04, alpha=0.26), glassb=mat('glassblue', '#bfe6ff', 0.04, alpha=0.3),
        water=mat('water', '#3fa9ff', 0.15, alpha=0.8), room=mat('room', '#fbe9cf', 0.8), floor=mat('floor', '#d9b48a', 0.85),
        leaf=mat('leaf', '#4fb54a', 0.6), leaf2=mat('leaf2', '#7fd35a', 0.6), soil=mat('soil', '#7a4a32', 0.95),
        fire=mat('fire', '#ffb040', 0.4, emit='#ff8a2a', strength=4.0), lampw=mat('lamp', '#fff3d0', 0.3, emit='#ffe08a', strength=3.0),
        navy=mat('panel', '#262b55', 0.25), rock=mat('rock', '#d4693b', 0.85), rock2=mat('rock2', '#b8532d', 0.85),
        ice=mat('ice', '#dff5ff', 0.15, alpha=0.9), ore=mat('ore', '#3a3634', 0.7), crystal=mat('crystal', '#7ff6f0', 0.2, emit='#5ff0e6', strength=1.2),
        steam=mat('steam', '#ffffff', 0.9, alpha=0.85), wood=mat('wood', '#c98a52', 0.8), tomato=mat('tomato', '#ff5a3c', 0.5))

# ---------- the shared vocabulary ----------
def cutter(w, d, h, loc, rot=(0, 0, 0), r=0.05):
    c = rbox(w, d, h, r, None, loc, rot, seg=3)
    return c

def cut(o, c):
    """boolean: take the cutter's shape out of o, then throw the cutter away"""
    m = o.modifiers.new('cut', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = c; m.solver = 'EXACT'
    _apply(o); bpy.data.objects.remove(c, do_unlink=True)
    for p in o.data.polygons: p.use_smooth = True
    return o

def plinth(p, w, d, r, z=0.0, h=0.12):
    return rbox(w + 0.1, d + 0.1, h, r + 0.05, p['char'], (0, 0, z))

def stripe_box(p, w, d, r, z, t=0.045):
    """a thin orange stripe around a rounded box at height z"""
    rbox(w + 0.025, d + 0.025, t, r, p['orange'], (0, 0, z))

def vent(p, at, r=0.13):
    cyl(r * 0.55, 0.12, p['cream2'], at, bev=0.03)
    ball(r, p['char'], (at[0], at[1], at[2] + 0.14), (1, 1, 0.55), seg=20)

def light(p, at, r=0.035):
    ball(r, p['teal'], at, seg=12)

def door(p, x, y, face_rot, w=0.32, h=0.56, z=0.1):
    """a charcoal door with an orange frame and a teal light; face_rot turns it to the wall it sits on"""
    rbox(w + 0.08, 0.06, h + 0.05, 0.05, p['orange'], (x, y, z), (0, 0, face_rot))
    rbox(w, 0.08, h, 0.04, p['char'], (x, y, z), (0, 0, face_rot))
    fx, fy = -math.sin(face_rot), math.cos(face_rot)
    light(p, (x - fx * 0.05 + math.cos(face_rot) * (w / 2 + 0.08), y - fy * 0.05 + math.sin(face_rot) * (w / 2 + 0.08), z + h + 0.03))

def porthole(p, at, n, r=0.075, mat_key='win'):
    """round glowing window; n = outward normal (x, y)"""
    a = math.atan2(n[1], n[0])
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=0.04, location=(at[0] + n[0] * 0.01, at[1] + n[1] * 0.01, at[2]), rotation=(math.pi / 2, 0, a + math.pi / 2))
    _done(bpy.context.object, p[mat_key])
    torus(r, r * 0.25, p['char'], (at[0] + n[0] * 0.025, at[1] + n[1] * 0.025, at[2]), (math.pi / 2, 0, a + math.pi / 2))

def lit_room(p, body, w, h, depth, x, y, z, face_rot, props, back='room'):
    """cut a window opening into the wall, fill it with a lit room and clear glass; props(cx, cy, floor_z) adds the furniture"""
    fx, fy = -math.sin(face_rot), math.cos(face_rot)          # outward normal of the wall (face_rot 0 -> -y wall)
    fx, fy = -fx, -fy
    c = cutter(w, depth * 2, h, (x, y, z), (0, 0, face_rot), 0.04)
    cut(body, c)
    # the room behind the glass: back wall, floor, ceiling light
    bx, by = x - fx * (depth - 0.02), y - fy * (depth - 0.02)
    rbox(w + 0.02, 0.04, h, 0.01, p[back], (bx, by, z), (0, 0, face_rot))
    rbox(w, depth, 0.03, 0.01, p['floor'], (x - fx * depth / 2, y - fy * depth / 2, z), (0, 0, face_rot))
    for sx in (-1, 1):
        sxv = (math.cos(face_rot) * sx * (w / 2 - 0.01), math.sin(face_rot) * sx * (w / 2 - 0.01))
        rbox(0.03, depth, h, 0.01, p['room'], (x + sxv[0] - fx * depth / 2, y + sxv[1] - fy * depth / 2, z), (0, 0, face_rot))
    ball(0.04, p['lampw'], (x - fx * depth * 0.5, y - fy * depth * 0.5, z + h - 0.06), seg=12)
    props(x - fx * depth * 0.55, y - fy * depth * 0.55, z + 0.03)
    # the glass with a charcoal frame and an orange sill
    rbox(w, 0.02, h, 0.02, p['glass'], (x + fx * 0.005, y + fy * 0.005, z), (0, 0, face_rot))
    rbox(w + 0.06, 0.07, 0.05, 0.02, p['orange'], (x + fx * 0.02, y + fy * 0.02, z - 0.05), (0, 0, face_rot))
    rbox(0.03, 0.05, h, 0.012, p['char'], (x + fx * 0.01, y + fy * 0.01, z), (0, 0, face_rot))

def place(path, size, loc, rz=0, w=0.008):
    o = imp(path, (0, 0, 0), rz, 1.0)
    lo, hi = bbox(o); k = size / max(hi.x - lo.x, hi.y - lo.y)
    o.scale = (k, k, k); bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lo, hi = bbox(o)
    o.location = (o.location.x + loc[0] - (lo.x + hi.x) / 2, o.location.y + loc[1] - (lo.y + hi.y) / 2, o.location.z + loc[2] - lo.z)
    bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    if w: soften(o, w)
    return o

def bush(p, at, s=1.0):
    ball(0.11 * s, p['leaf'], (at[0], at[1], at[2] + 0.1 * s), seg=14)
    ball(0.08 * s, p['leaf2'], (at[0] + 0.06 * s, at[1] - 0.03 * s, at[2] + 0.16 * s), seg=12)
    ball(0.07 * s, p['leaf2'], (at[0] - 0.06 * s, at[1] + 0.02 * s, at[2] + 0.14 * s), seg=12)

def steam(p, at, s=0.12):
    puff(at, s, p['steam'])

def cut_half(o, zmin):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if (o.matrix_world @ v.co).z < zmin - 1e-4], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    return o

# ---------- the 9 from the picture ----------
def b_dome(p):
    R = 1.05
    cyl(R + 0.06, 0.1, p['char'], (0, 0, 0), bev=0.04)
    cyl(R, 0.26, p['cream'], (0, 0, 0.08), bev=0.05)
    torus(R + 0.005, 0.03, p['orange'], (0, 0, 0.24))
    dome(R, p['cream'], (0, 0, 0.32), seg=56, sz=0.74)
    for z, rr in ((0.5, R * 0.965), (0.84, R * 0.76)): torus(rr, 0.022, p['char'], (0, 0, z))
    # two rows of glowing portholes
    for row, (z, rr, n) in enumerate(((0.6, R * 0.935, 10), (0.92, R * 0.66, 7))):
        for i in range(n):
            a = i * 2 * math.pi / n + row * 0.3
            if abs(math.atan2(math.sin(a + math.pi / 2), math.cos(a + math.pi / 2))) < 0.35 and row == 0: continue
            nv = (math.cos(a), math.sin(a)); porthole(p, (nv[0] * rr, nv[1] * rr, z), nv, 0.06)
    # top cap with an orange ring, a mast and a light
    cyl(0.22, 0.08, p['char'], (0, 0, 1.08), bev=0.04); torus(0.23, 0.025, p['orange'], (0, 0, 1.11))
    cyl(0.018, 0.3, p['char'], (0, 0, 1.14), bev=0.006); rbox(0.16, 0.02, 0.02, 0.008, p['char'], (0, 0, 1.32)); light(p, (0, 0, 1.47))
    # the entrance tunnel at the front
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.36, depth=0.6, location=(0, -R + 0.05, 0.08), rotation=(math.pi / 2, 0, 0))
    t = bpy.context.object; bv = t.modifiers.new('b', 'BEVEL'); bv.width = 0.08; bv.segments = 4; bv.limit_method = 'ANGLE'; _apply(t); cut_half(t, 0.08); _done(t, p['cream'])
    t2 = torus(0.36, 0.045, p['orange'], (0, -R - 0.24, 0.08), (math.pi / 2, 0, 0)); cut_half(t2, 0.07)
    rbox(0.32, 0.06, 0.38, 0.12, p['char'], (0, -R - 0.27, 0.08)); light(p, (0.0, -R - 0.31, 0.5))
    rbox(0.5, 0.36, 0.04, 0.02, p['char'], (0, -R - 0.42, 0.0))
    # small utility box at the side with a vent
    rbox(0.42, 0.36, 0.3, 0.08, p['cream'], (R * 0.82, R * 0.35, 0.0)); vent(p, (R * 0.82, R * 0.35, 0.3), 0.11); light(p, (R * 0.82 - 0.22, R * 0.35 - 0.12, 0.22))

def b_kitchen(p):
    W, D, H, R = 1.7, 1.15, 0.85, 0.24
    plinth(p, W, D, R)
    body = rbox(W, D, H, R, p['cream'], (0, 0, 0.1), seg=6)
    # a big window on the front with the dining room inside
    def furn(cx, cy, fz):
        place(REST + 'table_round_A_small_decorated.gltf', 0.26, (cx - 0.18, cy, fz))
        place(REST + 'stove_multi_decorated.gltf', 0.3, (cx + 0.22, cy + 0.06, fz), rz=math.pi)
        place(REST + 'chair_A.gltf', 0.12, (cx - 0.02, cy - 0.06, fz), rz=0.5)
    lit_room(p, body, 0.78, 0.4, 0.38, -0.25, -D / 2 + 0.01, 0.38, 0.0, furn)
    stripe_box(p, W, D, R, 0.3)
    # door on the right of the front, under an orange awning
    door(p, 0.5, -D / 2 - 0.02, 0.0, 0.3, 0.52, 0.1)
    aw = rbox(0.5, 0.36, 0.04, 0.02, p['orange'], (0.5, -D / 2 - 0.16, 0.68), (math.radians(-18), 0, 0))
    # chimney with an orange band and a charcoal cap, a roof vent box, steam
    ch = (-0.45, 0.2, H + 0.05)
    cyl(0.1, 0.55, p['cream'], ch, bev=0.04); torus(0.1, 0.022, p['orange'], (ch[0], ch[1], ch[2] + 0.3))
    ball(0.16, p['char'], (ch[0], ch[1], ch[2] + 0.58), (1, 1, 0.45), seg=20)
    steam(p, (ch[0], ch[1], ch[2] + 0.85), 0.1)
    rbox(0.3, 0.3, 0.16, 0.05, p['cream2'], (0.45, 0.25, H + 0.06)); ball(0.08, p['char'], (0.45, 0.25, H + 0.24), (1, 1, 0.55), seg=16)
    # an orange barrel at the side and a picnic table in front
    cyl(0.15, 0.36, p['orange'], (W / 2 + 0.16, 0.0, 0.0), bev=0.05); torus(0.12, 0.012, p['char'], (W / 2 + 0.16, 0.0, 0.38), (0, math.pi / 2, 0))
    tx, ty = -0.25, -D / 2 - 0.75
    rbox(0.7, 0.32, 0.05, 0.02, p['cream2'], (tx, ty, 0.3))
    for s in (-1, 1):
        rbox(0.7, 0.12, 0.04, 0.02, p['orange'], (tx, ty + s * 0.3, 0.17))
        for e in (-1, 1): rbox(0.04, 0.04, 0.3, 0.01, p['char'], (tx + e * 0.28, ty + s * 0.1, 0.0))

def b_processor(p):
    # base drum with a door and dark slit windows, a big charcoal platform with a railing and a ladder,
    # a tall striped tower with portholes and a glowing top
    cyl(0.62, 0.08, p['char'], (0, 0, 0), bev=0.03)
    cyl(0.58, 0.5, p['cream'], (0, 0, 0.06), bev=0.06)
    door(p, 0.0, -0.6, 0.0, 0.26, 0.4, 0.06)
    for a in (-0.9, 0.9, 2.3):
        rbox(0.16, 0.05, 0.08, 0.035, p['char'], (math.cos(a - math.pi / 2) * 0.58, math.sin(a - math.pi / 2) * 0.58, 0.26), (0, 0, a))
    PR = 0.82
    cyl(PR, 0.06, p['char'], (0, 0, 0.56), bev=0.025)
    for k in range(18):
        a = k * math.pi / 9; cyl(0.011, 0.22, p['char'], (math.cos(a) * (PR - 0.03), math.sin(a) * (PR - 0.03), 0.6), bev=0.004)
    torus(PR - 0.03, 0.016, p['char'], (0, 0, 0.82)); torus(PR - 0.03, 0.01, p['char'], (0, 0, 0.71))
    for k in range(4): light(p, (math.cos(k * 1.57 + 0.4) * (PR - 0.03), math.sin(k * 1.57 + 0.4) * (PR - 0.03), 0.84), 0.028)
    for k in range(6): rbox(0.16, 0.03, 0.02, 0.008, p['char'], (PR, 0.15, 0.1 + k * 0.08), (0, 0, math.pi / 2))
    for s in (-1, 1): rbox(0.02, 0.02, 0.55, 0.008, p['char'], (PR, 0.15 + s * 0.08, 0.06))
    # the tower
    tiers = [(0.46, 0.4, 0.62), (0.39, 0.38, 1.0), (0.32, 0.34, 1.36)]
    for i, (r, h, z) in enumerate(tiers):
        cyl(r, h, p['cream'], (0, 0, z), bev=r * 0.16)
        torus(r * 0.98, 0.03, p['orange'] if i % 2 == 0 else p['char'], (0, 0, z + h * 0.55))
    for i in range(3):
        a = -math.pi / 2 - 0.5 + i * 0.5; porthole(p, (math.cos(a) * 0.46, math.sin(a) * 0.46, 0.8), (math.cos(a), math.sin(a)), 0.055)
    torus(0.27, 0.07, p['orange'], (0, 0, 1.72)); cyl(0.2, 0.05, p['lampw'], (0, 0, 1.7), bev=0.02)
    cyl(0.22, 0.04, p['teal'], (0, 0, 1.73), bev=0.015)

def b_veglab(p):
    W, D, H, R = 1.45, 1.05, 0.8, 0.24
    plinth(p, W, D, R)
    body = rbox(W, D, H, R, p['cream'], (0, 0, 0.1), seg=6)
    # three green-lit windows on the front: the grow room with plants behind clear glass
    def plants(cx, cy, fz):
        rbox(0.75, 0.16, 0.08, 0.03, p['soil'], (cx, cy + 0.05, fz))
        for i in range(4): bush(p, (cx - 0.3 + i * 0.2, cy + 0.05, fz + 0.05), 0.75)
        rbox(0.75, 0.03, 0.03, 0.01, p['wingreen'], (cx, cy, fz + 0.36))
    lit_room(p, body, 0.86, 0.38, 0.36, -0.2, -D / 2 + 0.01, 0.3, 0.0, plants, back='wingreen')
    for x in (-0.48, -0.2, 0.08): rbox(0.03, 0.04, 0.38, 0.01, p['char'], (x - 0.07, -D / 2 - 0.0, 0.3))
    stripe_box(p, W, D, R, 0.22)
    door(p, 0.48, -D / 2 - 0.02, 0.0, 0.28, 0.5, 0.1)
    # roof: a tilted solar panel and a mushroom vent
    rbox(0.55, 0.42, 0.04, 0.02, p['navy'], (-0.25, 0.15, H + 0.25), (math.radians(28), 0, 0))
    for x in (-0.45, -0.05): cyl(0.02, 0.18, p['char'], (x, 0.2, H + 0.08), bev=0.005)
    vent(p, (0.35, 0.15, H + 0.08), 0.15)
    # a capsule tank on legs with a teal level strip
    tx, ty = W / 2 + 0.38, 0.05
    for k in range(3):
        a = k * 2.094; cyl(0.02, 0.15, p['char'], (tx + math.cos(a) * 0.2, ty + math.sin(a) * 0.2, 0.0), bev=0.006)
    cyl(0.28, 0.78, p['cream'], (tx, ty, 0.12), bev=0.22)
    torus(0.3, 0.02, p['orange'], (tx, ty, 0.42))
    rbox(0.04, 0.03, 0.3, 0.015, p['teal'], (tx - 0.3, ty - 0.02, 0.22), (0, 0, math.pi / 2))
    tube([(tx - 0.3, ty, 0.3), (W / 2 + 0.02, ty, 0.3)], 0.03, p['char'])

def b_greenhouse(p):
    L, R = 1.9, 0.62
    rbox(L + 0.15, 2 * R + 0.15, 0.08, 0.04, p['cream2'], (-0.35, 0, 0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=56, radius=R, depth=L, location=(-0.35, 0, 0.08), rotation=(0, math.pi / 2, 0))
    g = bpy.context.object; cut_half(g, 0.08); _done(g, p['glass'])
    for x in (-0.35 - L / 2, -0.35 + L / 2):
        e = cyl(R, 0.015, p['glass'], (x, 0, 0.08), (0, math.pi / 2, 0), bev=0.0); cut_half(e, 0.08)
    for k in range(8):
        x = -0.35 - L / 2 + 0.02 + k * (L - 0.04) / 7
        t = torus(R + 0.005, 0.025, p['cream'], (x, 0, 0.08), (0, math.pi / 2, 0)); cut_half(t, 0.07)
    for y in (-R * 0.95, R * 0.95): rbox(L, 0.04, 0.05, 0.02, p['cream'], (-0.35, y, 0.08))
    for y in (-0.25, 0.25):
        rbox(L - 0.25, 0.32, 0.1, 0.04, p['soil'], (-0.35, y, 0.08))
        for i in range(6): bush(p, (-0.35 - L / 2 + 0.3 + i * (L - 0.5) / 5, y, 0.15), 1.05)
    # the service module at the end, with a door, a porthole and a vent; a dark pipe up its side
    mx = -0.35 + L / 2 + 0.42
    plinth(p, 0.78, 0.9, 0.2, 0.0) if False else rbox(0.86, 0.98, 0.1, 0.24, p['char'], (mx, 0, 0))
    rbox(0.8, 0.92, 0.82, 0.24, p['cream'], (mx, 0, 0.08), seg=6)
    rbox(0.825, 0.945, 0.04, 0.24, p['orange'], (mx, 0, 0.62))
    door(p, mx - 0.12, -0.47, 0.0, 0.26, 0.48, 0.08)
    porthole(p, (mx + 0.4, -0.15, 0.48), (1, 0), 0.07)
    vent(p, (mx, 0.1, 0.9), 0.15)
    tube([(mx - 0.3, -0.35, 0.9), (mx - 0.38, -0.35, 1.05), (mx - 0.5, -0.32, 1.12)], 0.025, p['char'])

def b_research(p):
    W, D, H, R = 1.35, 1.2, 0.85, 0.24
    plinth(p, W, D, R)
    rbox(W, D, H, R, p['cream'], (0, 0, 0.1), seg=6)
    stripe_box(p, W, D, R, 0.6)
    for i in range(3): porthole(p, (-0.5 + i * 0.2, -D / 2 - 0.005, 0.5), (0, -1), 0.065)
    door(p, 0.25, -D / 2 - 0.02, 0.0, 0.28, 0.52, 0.1)
    # the observation turret: a clear window band with a lit console inside, a cream cap, an antenna
    tx, ty, tz = -0.2, 0.15, H + 0.1
    cyl(0.36, 0.12, p['cream'], (tx, ty, tz - 0.04), bev=0.04)
    cyl(0.3, 0.16, p['room'], (tx, ty, tz + 0.08), bev=0.0)
    rbox(0.22, 0.1, 0.1, 0.03, p['teal'], (tx, ty - 0.12, tz + 0.1))
    cyl(0.36, 0.2, p['glass'], (tx, ty, tz + 0.08), bev=0.02)
    torus(0.36, 0.03, p['char'], (tx, ty, tz + 0.08)); torus(0.36, 0.03, p['char'], (tx, ty, tz + 0.28))
    dome(0.36, p['cream'], (tx, ty, tz + 0.28), seg=40, sz=0.75)
    cyl(0.015, 0.4, p['char'], (tx, ty, tz + 0.5), bev=0.005)
    for k, z in enumerate((0.72, 0.8)): rbox(0.14 - k * 0.04, 0.015, 0.015, 0.006, p['char'], (tx, ty, tz + z))
    light(p, (tx, ty, tz + 0.92)); light(p, (tx - 0.1, ty - 0.3, tz + 0.48), 0.03)
    # the dish on a mast, facing the sky
    dx, dy = 0.42, 0.1
    cyl(0.045, 0.28, p['char'], (dx, dy, H + 0.08), bev=0.012)
    rot = (math.radians(70), 0, math.radians(-55))
    d = dome(0.36, p['cream'], (0, 0, 0), seg=40, sz=0.3); d.rotation_euler = (rot[0] + math.pi, 0, rot[2]); d.location = (dx, dy + 0.04, H + 0.62)
    torus(0.36, 0.04, p['orange'], (dx, dy + 0.04, H + 0.62), rot)
    import mathutils
    M = mathutils.Euler(rot).to_matrix()
    hub = Vector((dx, dy + 0.04, H + 0.62)) + M @ Vector((0, 0, 0.16))
    for k in range(3):
        a = k * 2.094 + 0.5; rim = Vector((dx, dy + 0.04, H + 0.62)) + M @ Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, 0))
        tube([tuple(rim), tuple(hub)], 0.012, p['char'])
    light(p, tuple(hub), 0.045)

def b_warehouse(p):
    L, R = 1.7, 0.85
    rbox(L + 0.15, 2 * R + 0.15, 0.1, 0.08, p['cream2'], (0, 0, 0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=56, radius=R, depth=L, location=(0, 0, 0.1), rotation=(math.pi / 2, 0, 0))
    h = bpy.context.object; cut_half(h, 0.1); _done(h, p['cream'])
    for y, m in ((-L / 2 + 0.03, 'char'), (-0.25, 'orange'), (0.3, 'char'), (L / 2 - 0.03, 'char')):
        t = torus(R + 0.01, 0.04, p[m], (0, y, 0.1), (math.pi / 2, 0, 0)); cut_half(t, 0.09)
    # the front wall with a charcoal roll-up door in an orange frame
    fw = cyl(R, 0.04, p['cream2'], (0, -L / 2, 0.1), (math.pi / 2, 0, 0), bev=0.0); cut_half(fw, 0.1)
    rbox(0.84, 0.06, 0.72, 0.05, p['orange'], (0, -L / 2 - 0.03, 0.1))
    rbox(0.74, 0.07, 0.66, 0.03, p['char'], (0, -L / 2 - 0.05, 0.1))
    for k in range(7): rbox(0.72, 0.02, 0.02, 0.008, p['grey'], (0, -L / 2 - 0.09, 0.16 + k * 0.08))
    light(p, (0, -L / 2 - 0.06, 0.88))
    for y in (-0.55, -0.25): ball(0.1, p['char'], (0.0, y, R + 0.09), (1, 1, 0.55), seg=16)
    # the crane and the container hanging from it
    cx, cy = R + 0.35, 0.5
    cyl(0.12, 0.06, p['char'], (cx, cy, 0.0), bev=0.03)
    cyl(0.055, 1.2, p['orange'], (cx, cy, 0.05), bev=0.02)
    rbox(0.16, 0.16, 0.16, 0.04, p['char'], (cx, cy, 1.2))
    tube([(cx, cy, 1.15), (cx - 0.1, cy - 0.65, 0.95)], 0.04, p['orange'])
    tube([(cx - 0.1, cy - 0.65, 0.95), (cx - 0.1, cy - 0.65, 0.68)], 0.008, p['char'])
    ox, oy = cx - 0.1, cy - 0.65
    rbox(0.42, 0.38, 0.5, 0.05, p['cream'], (ox, oy, 0.12))
    rbox(0.43, 0.39, 0.22, 0.05, p['orange'], (ox, oy, 0.12))
    for k in range(4): rbox(0.02, 0.4, 0.5, 0.008, p['char'], (ox - 0.15 + k * 0.1, oy, 0.12))

def b_furnace(p):
    R = 0.62
    cyl(R + 0.06, 0.12, p['char'], (0, 0, 0), bev=0.05)
    cyl(R, 0.62, p['cream'], (0, 0, 0.1), bev=0.08)
    torus(R + 0.005, 0.035, p['orange'], (0, 0, 0.44))
    dome(R, p['cream'], (0, 0, 0.7), seg=48, sz=0.55)
    # the window: glass in front of the fire, an orange awning
    body = bpy.context.object
    rbox(0.34, 0.12, 0.2, 0.04, p['fire'], (-0.1, -R + 0.08, 0.16))
    rbox(0.34, 0.03, 0.2, 0.03, p['glass'], (-0.1, -R - 0.01, 0.16))
    for k in range(4): rbox(0.02, 0.04, 0.2, 0.008, p['char'], (-0.22 + k * 0.08, -R - 0.02, 0.16))
    rbox(0.44, 0.24, 0.035, 0.015, p['orange'], (-0.1, -R - 0.1, 0.4), (math.radians(-20), 0, 0))
    light(p, (0.22, -R - 0.02, 0.38))
    # chimney with an orange band, a charcoal top and teal lights
    cyl(0.15, 1.25, p['cream'], (0, 0.05, 0.85), bev=0.05)
    torus(0.15, 0.03, p['orange'], (0, 0.05, 1.45))
    cyl(0.2, 0.12, p['char'], (0, 0.05, 2.08), bev=0.04); cyl(0.12, 0.13, p['char'], (0, 0.05, 2.1), bev=0.02)
    for a in (0.4, 2.5): light(p, (math.cos(a) * 0.2, 0.05 + math.sin(a) * 0.2, 2.15), 0.028)
    steam(p, (0, 0.05, 2.45), 0.14)
    for (x, y) in ((-0.22, -0.2), (-0.05, -0.32)):
        cyl(0.03, 0.1, p['char'], (x, y, 0.95), bev=0.01); cyl(0.05, 0.04, p['orange'], (x, y, 1.04), bev=0.015)
    # conveyor with rollers into the side, a hopper at the foot, legs
    rbox(0.95, 0.24, 0.07, 0.035, p['char'], (0.95, -0.35, 0.42), (0, math.radians(32), math.radians(-30)))
    rbox(0.24, 0.26, 0.2, 0.04, p['char'], (0.55, -0.12, 0.6), (0, 0, math.radians(-30)))
    for k in range(4):
        t = k / 3; x, z = 0.62 + t * 0.62, 0.68 - t * 0.38
        ball(0.04, p['crystal'], (x * math.cos(math.radians(-30)) + 0.05, -0.35 + (x - 0.95) * math.sin(math.radians(-30)), z + 0.06), seg=8)
    rbox(0.32, 0.3, 0.18, 0.06, p['orange'], (1.42, -0.62, 0.0), (0, 0, math.radians(-30)))
    for k in range(3): cyl(0.015, 0.25 + k * 0.08, p['char'], (1.1 - k * 0.12, -0.45 + k * 0.07, 0.0), bev=0.005)

def cart(p, at, s=1.0):
    x, y, z = at
    rbox(0.5 * s, 0.62 * s, 0.26 * s, 0.09 * s, p['orange'], (x, y, z + 0.08 * s))
    rbox(0.52 * s, 0.64 * s, 0.04 * s, 0.02 * s, p['char'], (x, y, z + 0.32 * s))
    for (dx, dy, m) in ((-0.1, -0.14, 'ore'), (0.1, -0.08, 'ore'), (0.0, 0.1, 'ore'), (-0.12, 0.14, 'ore'), (0.12, 0.16, 'ore')):
        ball(0.1 * s, p[m], (x + dx * s, y + dy * s, z + 0.38 * s), seg=12)
    ball(0.065 * s, p['crystal'], (x + 0.03 * s, y + 0.02 * s, z + 0.47 * s), seg=10)
    for sx in (-0.2, 0.2):
        for sy in (-0.2, 0.2): cyl(0.07 * s, 0.05 * s, p['char'], (x + sx * s, y + sy * s, z + 0.08 * s), (0, math.pi / 2, 0), bev=0.02 * s)


def seg_tube(a, b, r, m):
    return tube([a, b], r, m)

def b_mine(p):
    """the mine as one machine: cage -> rails -> tipping cart -> bunker -> conveyor -> silo; rope from the wheel to the hoist"""
    dark = mat('dark', '#1b1817', 0.9)
    S = Vector((-0.7, 0.15, 0.0))                 # shaft centre
    RAIL_Y0, RAIL_Y1 = S.y, -1.15                   # the rails run from the cage straight to the front
    GROUND = 0.0

    # ---------- the shaft collar: a flush cream ring around a dark opening ----------
    cyl(0.5, 0.04, p['cream2'], (S.x, S.y, GROUND), bev=0.015)
    cyl(0.3, 0.045, dark, (S.x, S.y + 0.02, GROUND), bev=0.0)
    torus(0.5, 0.022, p['orange'], (S.x, S.y, 0.04))

    # ---------- headframe: four soft legs from the collar corners to a head deck ----------
    TOP = 1.45
    feet = [(S.x - 0.45, S.y - 0.32), (S.x + 0.45, S.y - 0.32), (S.x - 0.45, S.y + 0.38), (S.x + 0.45, S.y + 0.38)]
    heads = [(S.x - 0.24, S.y - 0.16), (S.x + 0.24, S.y - 0.16), (S.x - 0.24, S.y + 0.2), (S.x + 0.24, S.y + 0.2)]
    for (fx, fy), (hx, hy) in zip(feet, heads):
        cyl(0.075, 0.06, p['char'], (fx, fy, GROUND), bev=0.025)
        seg_tube((fx, fy, 0.05), (hx, hy, TOP), 0.05, p['orange'])
    for z, k in ((0.7, 0.62), (1.1, 0.35)):           # cross braces on the left and right sides only (the front stays open for the rails)
        for sx in (-1, 1):
            x = S.x + sx * (0.45 - (0.45 - 0.24) * (z / TOP))
            seg_tube((x, S.y - 0.32 + 0.16 * z / TOP, z), (x, S.y + 0.38 - 0.18 * z / TOP, z), 0.022, p['char'])
    rbox(0.56, 0.44, 0.08, 0.035, p['char'], (S.x, S.y + 0.02, TOP - 0.02))

    # the wheel: plane x-z (axle along y); its left edge sits right above the shaft centre, so the cage rope hangs straight
    WR = 0.3
    W = Vector((S.x + WR, S.y + 0.02, TOP + 0.08 + WR + 0.02))
    for dy in (-0.12, 0.12):
        seg_tube((W.x - 0.1, W.y + dy, TOP + 0.08), (W.x, W.y + dy, W.z), 0.025, p['char'])
        seg_tube((W.x + 0.1, W.y + dy, TOP + 0.08), (W.x, W.y + dy, W.z), 0.025, p['char'])
    torus(WR, 0.045, p['char'], tuple(W), (math.pi / 2, 0, 0))
    for k in range(6):
        a = k * math.pi / 3; seg_tube(tuple(W), (W.x + math.cos(a) * WR * 0.95, W.y, W.z + math.sin(a) * WR * 0.95), 0.016, p['char'])
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.06, depth=0.3, location=tuple(W), rotation=(math.pi / 2, 0, 0)); _done(bpy.context.object, p['orange'])
    light(p, (W.x, W.y, W.z + WR + 0.06))

    # ---------- the cage at the bottom of the frame, open to the front, with a full cart inside on a short rail ----------
    CW, CD, CH = 0.42, 0.5, 0.48
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(0.018, CH, p['orange'], (S.x + sx * CW / 2, S.y + sy * CD / 2, 0.045), bev=0.006)
    rbox(CW + 0.06, CD + 0.06, 0.05, 0.02, p['orange'], (S.x, S.y, 0.045 + CH))
    rbox(CW, CD, 0.03, 0.01, p['grey'], (S.x, S.y, 0.045))
    rbox(CW + 0.04, 0.03, 0.18, 0.012, p['char'], (S.x, S.y + CD / 2, 0.2))         # back gate
    seg_tube((S.x, S.y, 0.045 + CH + 0.05), (S.x, S.y, W.z), 0.009, p['char'])     # cage rope up to the wheel's left edge
    cart(p, (S.x, S.y - 0.02, 0.075), 0.62)

    # ---------- rails: from inside the cage straight to the front; sleepers flush on the ground ----------
    L = RAIL_Y0 - RAIL_Y1; yc = (RAIL_Y0 + RAIL_Y1) / 2
    for s in (-0.11, 0.11): rbox(0.03, L, 0.03, 0.01, p['grey'], (S.x + s, yc, 0.045))
    for k in range(9):
        y = RAIL_Y1 + 0.06 + k * (L - 0.5) / 8
        if y > S.y - CD / 2 - 0.02: break
        rbox(0.34, 0.05, 0.025, 0.01, p['char'], (S.x, y, 0.02))
    rbox(0.3, 0.06, 0.08, 0.03, p['orange'], (S.x, RAIL_Y1 - 0.02, 0.03))          # buffer stop

    # ---------- the bunker beside the end of the rails; the cart tips into it ----------
    B = Vector((S.x + 0.72, RAIL_Y1 + 0.3, 0.0))
    rbox(0.5, 0.56, 0.36, 0.08, p['cream'], tuple(B))
    rbox(0.52, 0.58, 0.04, 0.08, p['orange'], (B.x, B.y, 0.36))
    rbox(0.42, 0.48, 0.02, 0.02, dark, (B.x, B.y, 0.355))
    for (dx, dy) in ((-0.1, -0.1), (0.08, -0.06), (0.0, 0.1), (-0.08, 0.14), (0.1, 0.12)):
        ball(0.075, p['ore'], (B.x + dx, B.y + dy, 0.37), seg=10)
    ball(0.05, p['crystal'], (B.x + 0.02, B.y - 0.02, 0.42), seg=8)
    # the tipping cart at the end of the rails, leaning towards the bunker, ore falling out
    tip = Vector((S.x, RAIL_Y1 + 0.3, 0.075))
    before = set(bpy.data.objects)
    cart(p, tuple(tip), 0.62)
    parts = [o for o in bpy.data.objects if o not in before]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.transform.rotate(value=math.radians(-28), orient_axis='Y', center_override=(tip.x + 0.16, tip.y, tip.z))
    for k, (dx, dz) in enumerate(((0.3, 0.32), (0.36, 0.25))):
        ball(0.05, p['ore'], (tip.x + dx, tip.y + (k - 0.5) * 0.08, dz), seg=10)

    # ---------- covered conveyor from the bunker up into the silo ----------
    SI = Vector((B.x + 1.0, B.y + 0.1, 0.0)); SR = 0.34; SH = 0.95
    cyl(SR + 0.04, 0.06, p['char'], tuple(SI), bev=0.025)
    cyl(SR, SH, p['cream'], (SI.x, SI.y, 0.05), bev=0.24)
    torus(SR, 0.025, p['orange'], (SI.x, SI.y, 0.55)); vent(p, (SI.x, SI.y - 0.08, SH + 0.05), 0.1)
    for k in range(3): rbox(0.05, 0.03, 0.06, 0.015, p['teal'] if k < 2 else p['char'], (SI.x - SR + 0.01, SI.y - 0.05 + k * 0.07, 0.3), (0, 0, math.pi / 2))
    a = Vector((B.x + 0.18, B.y + 0.05, 0.3)); b = Vector((SI.x - 0.12, SI.y - 0.02, SH - 0.05))
    d = b - a; Lc = d.length; mid = (a + b) / 2
    ang_y = -math.atan2(d.z, math.hypot(d.x, d.y)); ang_z = math.atan2(d.y, d.x)
    o = rbox(Lc, 0.16, 0.12, 0.05, p['cream2'], (0, 0, -0.06))
    o.rotation_euler = (0, ang_y, ang_z); o.location = tuple(mid)
    bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o2 = rbox(Lc + 0.02, 0.17, 0.03, 0.015, p['orange'], (0, 0, 0.05))
    o2.rotation_euler = (0, ang_y, ang_z); o2.location = tuple(mid)
    bpy.context.view_layer.objects.active = o2; bpy.ops.object.select_all(action='DESELECT'); o2.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for t in (0.35, 0.7):
        q = a + d * t; cyl(0.025, q.z - 0.08, p['char'], (q.x, q.y, 0.0), bev=0.008)

    # ---------- hoist house behind the frame, in line with the wheel; the rope runs down to its drum ----------
    H = Vector((W.x + 1.15, W.y + 0.3, 0.0))
    rbox(0.86, 0.8, 0.1, 0.2, p['char'], tuple(H))
    rbox(0.8, 0.74, 0.62, 0.22, p['cream'], (H.x, H.y, 0.08), seg=6)
    rbox(0.825, 0.765, 0.04, 0.22, p['orange'], (H.x, H.y, 0.48))
    door(p, H.x + 0.05, H.y - 0.39, 0.0, 0.24, 0.42, 0.08)
    porthole(p, (H.x - 0.401, H.y + 0.12, 0.42), (-1, 0), 0.06)
    vent(p, (H.x + 0.15, H.y + 0.15, 0.72), 0.11)
    drum = Vector((H.x - 0.34, W.y, 0.74))
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.1, depth=0.26, location=tuple(drum), rotation=(math.pi / 2, 0, 0)); _done(bpy.context.object, p['char'])
    torus(0.1, 0.02, p['orange'], tuple(drum), (math.pi / 2, 0, 0))
    seg_tube((drum.x, drum.y, drum.z + 0.1), (W.x + WR * 0.7, W.y, W.z + WR * 0.7), 0.009, p['char'])   # hoist rope: drum -> top right of the wheel

    # ---------- a lamp post at the rails and a few loose rocks off the paths ----------
    lp = (S.x - 0.4, RAIL_Y1 + 0.35)
    cyl(0.02, 0.55, p['char'], (lp[0], lp[1], 0.0), bev=0.006); rbox(0.09, 0.07, 0.13, 0.02, p['cream'], (lp[0], lp[1], 0.55)); light(p, (lp[0], lp[1] - 0.045, 0.62), 0.028)
    for (x, y, r) in ((S.x - 0.75, S.y + 0.65, 0.12), (SI.x + 0.2, SI.y + 0.6, 0.1), (H.x + 0.55, H.y - 0.55, 0.09)):
        ball(r, p['rock2'], (x, y, 0.0), (1, 1, 0.7), seg=14)

# ---------- the 4 that were missing, in the same style ----------
def b_pump(p):
    # pump house over the ice, a clear water tank, ice blocks, a pipe with a red valve
    W, D, H, R = 1.0, 0.9, 0.7, 0.22
    plinth(p, W, D, R)
    body = rbox(W, D, H, R, p['cream'], (0, 0, 0.1), seg=6)
    stripe_box(p, W, D, R, 0.45)
    door(p, -0.18, -D / 2 - 0.02, 0.0, 0.26, 0.46, 0.1)
    porthole(p, (0.25, -D / 2 - 0.005, 0.5), (0, -1), 0.06)
    # the well head on the roof: a drum with a charcoal cap and a slowly turning wheel
    cyl(0.22, 0.3, p['cream2'], (0, 0.05, H + 0.08), bev=0.06); torus(0.22, 0.025, p['orange'], (0, 0.05, H + 0.25))
    ball(0.26, p['char'], (0, 0.05, H + 0.42), (1, 1, 0.45), seg=24); light(p, (0, 0.05, H + 0.56))
    # clear water tank on legs, joined by a pipe with a valve
    tx, ty = W / 2 + 0.5, 0.1
    for k in range(3):
        a = k * 2.094; cyl(0.02, 0.15, p['char'], (tx + math.cos(a) * 0.25, ty + math.sin(a) * 0.25, 0.0), bev=0.006)
    cyl(0.36, 0.7, p['glassb'], (tx, ty, 0.12), bev=0.3); cyl(0.31, 0.42, p['water'], (tx, ty, 0.16), bev=0.2)
    cyl(0.37, 0.06, p['orange'], (tx, ty, 0.12), bev=0.03); torus(0.33, 0.025, p['char'], (tx, ty, 0.66))
    rbox(0.04, 0.03, 0.34, 0.015, p['teal'], (tx - 0.36, ty - 0.04, 0.22), (0, 0, math.pi / 2))
    tube([(W / 2, ty, 0.3), (tx - 0.35, ty, 0.3)], 0.04, p['char'])
    torus(0.07, 0.018, mat('red', '#ff5a3c', 0.4), (W / 2 + 0.17, ty, 0.42), (0, math.pi / 2, 0)); cyl(0.012, 0.1, p['char'], (W / 2 + 0.17, ty, 0.32), bev=0.004)
    for i, (x, y, r) in enumerate(((-0.75, -0.55, 0.13), (-0.55, -0.75, 0.1), (-0.85, -0.25, 0.09), (0.7, -0.6, 0.11))):
        rbox(r * 2, r * 1.8, r * 1.4, r * 0.4, p['ice'], (x, y, 0.0), (0, 0, i * 0.7))

def b_solar(p):
    # two rows of navy panels in cream frames on soft stands, an inverter box with lights, a cable
    rbox(1.9, 1.5, 0.08, 0.05, p['cream2'], (0, 0, 0))
    for y in (-0.35, 0.35):
        for x in (-0.55, 0.55):
            cyl(0.035, 0.3, p['char'], (x, y + 0.12, 0.06), bev=0.012); cyl(0.07, 0.04, p['char'], (x, y + 0.12, 0.05), bev=0.015)
        tilt = (math.radians(-30), 0, 0)
        rbox(1.6, 0.6, 0.05, 0.035, p['cream'], (0, y, 0.33), tilt)
        rbox(1.5, 0.52, 0.03, 0.02, p['navy'], (0, y, 0.37), tilt)
        for i in range(1, 4): rbox(0.012, 0.52, 0.012, 0.005, p['cream'], (-0.75 + i * 0.375, y, 0.397), tilt)
        rbox(0.012, 0.012, 0.012, 0.004, p['orange'], (0.0, y, 0.33), tilt)
        rbox(1.62, 0.04, 0.03, 0.015, p['orange'], (0, y - 0.27, 0.2), tilt)
    bx, by = 1.15, -0.25
    rbox(0.36, 0.3, 0.45, 0.1, p['cream'], (bx, by, 0.0)); rbox(0.38, 0.32, 0.04, 0.1, p['orange'], (bx, by, 0.32))
    vent(p, (bx, by, 0.45), 0.08)
    for k in range(3): light(p, (bx - 0.18, by - 0.08 + k * 0.08, 0.22), 0.025)
    tube([(bx - 0.18, by, 0.06), (0.75, -0.2, 0.06)], 0.03, p['char'])

def b_batteries(p):
    # four upright cells with teal charge strips and orange tops, joined by a cable, a small control box
    rbox(1.8, 1.2, 0.08, 0.05, p['cream2'], (0, 0, 0))
    for i, x in enumerate((-0.6, -0.2, 0.2, 0.6)):
        y = 0.15
        cyl(0.18, 0.08, p['char'], (x, y, 0.06), bev=0.03)
        cyl(0.16, 0.72, p['cream'], (x, y, 0.1), bev=0.12)
        torus(0.16, 0.02, p['orange'], (x, y, 0.55))
        for k in range(4 if i != 2 else 2): rbox(0.11, 0.05, 0.06, 0.025, p['teal'], (x, y - 0.15, 0.2 + k * 0.08))
        cyl(0.08, 0.06, p['orange'], (x, y, 0.8), bev=0.025); cyl(0.03, 0.06, p['char'], (x, y, 0.85), bev=0.01)
    tube([(-0.6, 0.15, 0.9), (-0.6, 0.15, 0.98), (0.6, 0.15, 0.98), (0.6, 0.15, 0.9)], 0.02, p['char'])
    bx, by = 0.0, -0.42
    rbox(0.5, 0.26, 0.3, 0.09, p['cream'], (bx, by, 0.06)); rbox(0.52, 0.28, 0.035, 0.09, p['orange'], (bx, by, 0.24))
    rbox(0.26, 0.03, 0.08, 0.02, p['teal'], (bx, by - 0.13, 0.13)); vent(p, (bx + 0.15, by, 0.36), 0.06)

def b_geolocator(p):
    # a small round station with a rotating scanner arm and a glowing screen
    cyl(0.52, 0.08, p['char'], (0, 0, 0), bev=0.03)
    cyl(0.48, 0.42, p['cream'], (0, 0, 0.06), bev=0.12)
    torus(0.48, 0.025, p['orange'], (0, 0, 0.3))
    door(p, 0.0, -0.5, 0.0, 0.22, 0.32, 0.06)
    rbox(0.24, 0.06, 0.14, 0.04, p['teal'], (0.3, -0.38, 0.22), (0, 0, 0.6))
    dome(0.4, p['cream2'], (0, 0, 0.48), seg=40, sz=0.5)
    cyl(0.05, 0.3, p['char'], (0, 0, 0.6), bev=0.015)
    rbox(0.62, 0.05, 0.04, 0.02, p['orange'], (0.0, 0.0, 0.88), (0, 0, 0.5))
    d = dome(0.13, p['cream'], (0, 0, 0), seg=24, sz=0.4); d.rotation_euler = (math.radians(110), 0, 0.5 + math.pi / 2); d.location = (0.28 * math.cos(0.5), 0.28 * math.sin(0.5), 0.95)
    torus(0.13, 0.02, p['orange'], (0.28 * math.cos(0.5), 0.28 * math.sin(0.5), 0.95), (math.radians(110), 0, 0.5 + math.pi / 2))
    light(p, (-0.3 * math.cos(0.5), -0.3 * math.sin(0.5), 0.92), 0.035)
    light(p, (0, 0, 0.95), 0.03)

BUILD = {'dome': b_dome, 'kitchen': b_kitchen, 'processor': b_processor, 'veglab': b_veglab, 'greenhouse': b_greenhouse,
         'research': b_research, 'warehouse': b_warehouse, 'furnace': b_furnace, 'mine': b_mine,
         'pump': b_pump, 'solar': b_solar, 'batteries': b_batteries, 'geolocator': b_geolocator}
for name, fn in BUILD.items():
    if ONLY and name not in ONLY: continue
    reset(); p = pal(); fn(p); export(f'{OUT}/{name}.glb'); print('built', name)
