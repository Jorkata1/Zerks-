# Zerks-X6 buildings, second pass: every body is soft and round in the Ark's colours (cream, an orange band,
# charcoal rings, round portholes); glass is clear and shows what is inside; KayKit (CC0) gives the furniture,
# the kitchen, the crates and the solar cells. All doors look along -y (the game's +z, towards the camera).
#   python build.py -- <out_dir> [names]
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector
from kb import *
from kb import _done, _apply

OUT = sys.argv[sys.argv.index('--') + 1]
ONLY = sys.argv[sys.argv.index('--') + 2].split(',') if len(sys.argv) > sys.argv.index('--') + 2 else None

def fit(o, size):
    lo, hi = bbox(o); k = size / max(hi.x - lo.x, hi.y - lo.y)
    o.scale = (k, k, k); bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return o

def place(path, size, loc, rz=0, w=0.012):
    o = imp(path, (0, 0, 0), rz, 1.0); fit(o, size)
    lo, hi = bbox(o)
    o.location = (o.location.x + loc[0] - (lo.x + hi.x) / 2, o.location.y + loc[1] - (lo.y + hi.y) / 2, o.location.z + loc[2] - lo.z)
    bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    if w: soften(o, w)
    return o

# ---------- shared soft parts ----------
def porthole(p, at, r, face, z):
    """a round window on a wall: a charcoal ring and warm glass that glows at night"""
    a = math.atan2(face[1], face[0])
    rot = (math.pi / 2, 0, a + math.pi / 2)
    cyl(r, 0.05, p['lamp'], (at[0], at[1], z - r), rot, bev=0.0)
    torus(r, r * 0.22, p['char'], (at[0] + face[0] * 0.01, at[1] + face[1] * 0.01, z), (math.pi / 2, 0, a + math.pi / 2))

def wall_point(R, ang):
    return (math.cos(ang) * R, math.sin(ang) * R), (math.cos(ang), math.sin(ang))

def body(p, R=1.0, H=0.9, door=True, windows=(-55, 55, 125, -125), band=0.45):
    """the round building body: a soft drum with an orange band, charcoal rings, portholes and a round door at -y"""
    cyl(R + 0.08, 0.1, p['char'], (0, 0, 0), bev=0.05)
    cyl(R, H, p['cream'], (0, 0, 0.06), bev=0.32)
    torus(R + 0.005, 0.055, p['orange'], (0, 0, band))
    torus(R - 0.02, 0.035, p['char'], (0, 0, 0.18))
    for deg in windows:
        (x, y), f = wall_point(R - 0.01, math.radians(deg - 90))
        porthole(p, (x, y), 0.11, f, 0.62)
    if door:
        rbox(0.5, 0.18, 0.62, 0.2, p['char'], (0, -R + 0.04, 0.06))
        rbox(0.6, 0.12, 0.7, 0.24, p['orange'], (0, -R - 0.0, 0.03))
        rbox(0.44, 0.16, 0.56, 0.18, p['char'], (0, -R - 0.03, 0.06))
        ball(0.035, p['teal'], (0.16, -R - 0.12, 0.38))
        rbox(0.7, 0.36, 0.06, 0.03, p['cream2'], (0, -R - 0.2, 0.0))
    return H + 0.06

def glass_dome(p, R, at, sz=0.8, ribs=3):
    g = dome(R, p['glass'], at, seg=48, sz=sz)
    torus(R, 0.045, p['orange'], at)
    for k in range(ribs):
        t = torus(R * 1.002, 0.022, p['cream'], at, (math.pi / 2, 0, k * math.pi / ribs))
        t.scale = (1, 1, sz) if False else (1, 1, 1)
        bm = bmesh.new(); bm.from_mesh(t.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.001], context='VERTS'); bm.to_mesh(t.data); bm.free()
        t.scale = (1, 1, 1)
        # squash the rib to follow the dome
        for v in t.data.vertices: pass
        t.location = at; t.scale.z = sz; bpy.context.view_layer.objects.active = t; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return g

def plant(p, at, kind, s=1.0):
    """bright, soft plants: lettuce, tomato, carrot, little bush"""
    x, y, z = at
    if kind == 'lettuce':
        for i in range(5):
            a = i * 1.26; ball(0.07 * s, p['leaf2'], (x + math.cos(a) * 0.05 * s, y + math.sin(a) * 0.05 * s, z + 0.05 * s), (1, 1, 0.7), seg=12)
        ball(0.06 * s, p['leaf'], (x, y, z + 0.08 * s), seg=12)
    elif kind == 'tomato':
        cyl(0.012 * s, 0.3 * s, p['leaf'], (x, y, z), bev=0.004)
        for i, h in enumerate((0.1, 0.18, 0.26)):
            ball(0.07 * s, p['leaf'], (x, y, z + h * s), (1, 1, 0.7), seg=12)
            ball(0.032 * s, p['tomato'], (x + 0.05 * s * (1 if i % 2 else -1), y + 0.03 * s, z + (h - 0.03) * s), seg=10)
    elif kind == 'carrot':
        for i in range(3):
            ball(0.03 * s, p['carrot'], (x + (i - 1) * 0.07 * s, y, z + 0.02 * s), (1, 1, 0.8), seg=10)
            for k in range(3): ball(0.03 * s, p['leaf2'], (x + (i - 1) * 0.07 * s + (k - 1) * 0.015 * s, y, z + (0.08 + k * 0.02) * s), (0.6, 0.6, 1.6), seg=8)
    else:
        ball(0.11 * s, p['leaf'], (x, y, z + 0.1 * s), seg=14); ball(0.08 * s, p['leaf2'], (x + 0.07 * s, y, z + 0.14 * s), seg=12)

def bed_row(p, at, n, length, dx, kinds, s=1.0):
    """a soft planter bed with plants"""
    rbox(length, 0.3 * s, 0.1, 0.06, p['soil'], at)
    for i in range(n):
        plant(p, (at[0] - length / 2 + (i + 0.5) * length / n, at[1], at[2] + 0.1), kinds[i % len(kinds)], s)

def water_tank(p, at, r=0.3, h=0.75):
    cyl(r, h, p['glassb'], at, bev=r * 0.45); cyl(r * 0.85, h * 0.6, p['water'], (at[0], at[1], at[2] + 0.05), bev=r * 0.3)
    cyl(r * 1.05, 0.08, p['orange'], (at[0], at[1], at[2] + h - 0.02), bev=0.04)
    cyl(r * 1.05, 0.08, p['char'], (at[0], at[1], at[2]), bev=0.04)

def lamp_inside(p, at):
    ball(0.06, p['lamp'], at, seg=14)

def puffs(p, at, s):
    puff(at, s, p['steam'])

# ---------- the buildings ----------
def b_dome(p):
    top = body(p, 1.0, 0.75, windows=(-60, 60, 180))
    glass_dome(p, 0.88, (0, 0, top - 0.02), 0.82, 3)
    cyl(0.86, 0.04, p['cream2'], (0, 0, top - 0.03), bev=0.02)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        place(FURN + 'bed_single_A.gltf', 0.46, (math.cos(a) * 0.5, math.sin(a) * 0.5, top), rz=a + math.pi / 2)
    place(FURN + 'table_small.gltf', 0.24, (0, 0, top))
    plant(p, (0.02, 0.0, top + 0.17), 'bush', 0.6)
    lamp_inside(p, (0, 0, top + 0.55))
    torus(0.1, 0.03, p['orange'], (0, 0, top + 0.7)); cyl(0.02, 0.2, p['grey'], (0, 0, top + 0.68), bev=0.008); ball(0.04, p['teal'], (0, 0, top + 0.92))

def b_kitchen(p):
    top = body(p, 0.95, 0.85, door=False, windows=(-120, 120, 180))
    # the dining room in front: a soft glass room the door opens into
    W, D, H = 1.6, 0.95, 0.7
    c = (0, -0.95 - D / 2 + 0.2)
    rbox(W + 0.12, D + 0.12, 0.08, 0.04, p['cream2'], (c[0], c[1], 0))
    rbox(W, D, H, 0.3, p['glass'], (c[0], c[1], 0.08))
    rbox(W + 0.04, D + 0.04, 0.08, 0.04, p['orange'], (c[0], c[1], 0.08))
    for sx in (-1, 1):
        t = torus(0.34, 0.03, p['cream'], (c[0] + sx * 0.35, c[1], 0.08), (math.pi / 2, 0, math.pi / 2))
    place(REST + 'table_round_A_small_decorated.gltf', 0.36, (c[0] - 0.4, c[1] - 0.05, 0.08), w=0.006)
    place(REST + 'table_round_A_small_decorated.gltf', 0.36, (c[0] + 0.4, c[1] - 0.05, 0.08), w=0.006)
    place(REST + 'kitchencounter_straight_A_decorated.gltf', 0.6, (c[0], c[1] + D / 2 - 0.15, 0.08), rz=math.pi, w=0.006)
    lamp_inside(p, (c[0], c[1], H - 0.05))
    # chimney with steam and a round sign
    ch = (0.42, 0.25, top - 0.1)
    cyl(0.15, 0.6, p['cream'], ch, bev=0.07); torus(0.155, 0.035, p['orange'], (ch[0], ch[1], ch[2] + 0.3)); cyl(0.2, 0.07, p['char'], (ch[0], ch[1], ch[2] + 0.6), bev=0.035)
    puffs(p, (ch[0], ch[1], ch[2] + 0.95), 0.15)
    s = (c[0], c[1] - D / 2 - 0.02, H + 0.24)
    cyl(0.2, 0.05, p['orange'], (s[0], s[1] + 0.025, s[2] - 0.2), (math.pi / 2, 0, 0), bev=0.02)
    cyl(0.15, 0.06, p['cream'], (s[0], s[1] + 0.02, s[2] - 0.15), (math.pi / 2, 0, 0), bev=0.02)

def b_veglab(p):
    top = body(p, 1.0, 0.75, windows=(-70, 70))
    W, D, H = 1.5, 1.2, 0.6
    rbox(W + 0.08, D + 0.08, 0.06, 0.03, p['cream2'], (0, 0.05, top - 0.03))
    rbox(W, D, H, 0.28, p['glass'], (0, 0.05, top + 0.03))
    for k in (-0.3, 0.3): rbox(W - 0.35, 0.05, 0.03, 0.015, p['teal'], (0, 0.05 + k, top + H - 0.05))
    bed_row(p, (0, -0.22, top + 0.03), 4, W - 0.3, 0, ['lettuce', 'tomato', 'carrot', 'lettuce'])
    bed_row(p, (0, 0.32, top + 0.03), 4, W - 0.3, 0, ['tomato', 'lettuce', 'bush', 'carrot'])
    water_tank(p, (1.25, 0.35, 0), 0.32, 0.85)
    tube([(1.05, 0.35, 0.6), (0.85, 0.3, 0.6)], 0.045, p['grey'])

def b_research(p):
    top = body(p, 0.95, 0.9, windows=(-60, 60, 180))
    # dish on a soft arm
    cyl(0.16, 0.18, p['char'], (0, 0.25, top - 0.04), bev=0.06)
    cyl(0.05, 0.35, p['grey'], (0, 0.25, top + 0.1), bev=0.02)
    d = dome(0.42, p['cream'], (0, 0, 0), seg=32, sz=0.35); d.rotation_euler = (math.radians(145), 0, math.radians(25)); d.location = (0.05, 0.3, top + 0.62)
    torus(0.42, 0.035, p['orange'], (0.05, 0.3, top + 0.62), (math.radians(145), 0, math.radians(25)))
    cyl(0.018, 0.3, p['char'], (0.05, 0.3, top + 0.5), bev=0.006); ball(0.04, p['teal'], (0.05, 0.3, top + 0.82))
    # the study: a glass bubble beside the drum, with a desk, a chair and a telescope
    c = (1.25, 0.15, 0)
    cyl(0.6, 0.12, p['cream'], c, bev=0.06)
    glass_dome(p, 0.56, (c[0], c[1], 0.12), 0.9, 2)
    place(FURN + 'table_small.gltf', 0.32, (c[0] - 0.12, c[1] + 0.12, 0.12))
    place(FURN + 'lamp_table.gltf', 0.1, (c[0] - 0.12, c[1] + 0.12, 0.31), w=0.003)
    place(FURN + 'chair_A.gltf', 0.18, (c[0] + 0.14, c[1] - 0.08, 0.12), rz=2.4)
    cyl(0.05, 0.32, p['cream'], (c[0] + 0.18, c[1] + 0.25, 0.3), (0.7, 0, 0.6), bev=0.02)
    tube([(0.9, 0.15, 0.25), (0.7, 0.15, 0.25)], 0.06, p['cream2'])
    # mast
    m = (-0.75, 0.6, top - 0.05)
    cyl(0.03, 0.75, p['grey'], m, bev=0.01); ball(0.05, p['red'], (m[0], m[1], m[2] + 0.8))

def b_warehouse(p):
    # a soft half-capsule hangar along x with a round door at -y
    L, R = 1.9, 0.85
    rbox(L + 0.6, 2 * R + 0.3, 0.08, 0.04, p['cream2'], (0, 0, 0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=R, depth=L, location=(0, 0, 0.08), rotation=(0, math.pi / 2, 0))
    h = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(h.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if (h.matrix_world @ v.co).z < 0.08 - 1e-4], context='VERTS'); bm.to_mesh(h.data); bm.free()
    bv = h.modifiers.new('b', 'BEVEL'); bv.width = 0.2; bv.segments = 4; bv.limit_method = 'ANGLE'; _apply(h); _done(h, p['cream'])
    for x in (-L / 2 + 0.02, L / 2 - 0.02):
        t = torus(R, 0.05, p['char'], (x, 0, 0.08), (0, math.pi / 2, 0))
        bm = bmesh.new(); bm.from_mesh(t.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if (t.matrix_world @ v.co).z < 0.05], context='VERTS'); bm.to_mesh(t.data); bm.free()
    t = torus(R + 0.01, 0.045, p['orange'], (0, 0, 0.08), (0, math.pi / 2, 0))
    bm = bmesh.new(); bm.from_mesh(t.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if (t.matrix_world @ v.co).z < 0.05], context='VERTS'); bm.to_mesh(t.data); bm.free()
    # roll-up door on the camera side, with slats
    rbox(0.9, 0.12, 0.75, 0.12, p['char'], (0, -R + 0.15, 0.08))
    for k in range(5): rbox(0.82, 0.04, 0.03, 0.012, p['grey'], (0, -R + 0.08, 0.18 + k * 0.12))
    # crates in front and a soft crane
    for i, (x, y, z) in enumerate([(-1.0, -1.15, 0.08), (-0.62, -1.2, 0.08), (-0.82, -1.18, 0.4)]):
        rbox(0.36, 0.36, 0.32, 0.1, [p['orange'], p['tealsoft'], p['cream2']][i], (x, y, z))
    cr = (1.2, -0.95, 0.08)
    cyl(0.14, 0.08, p['char'], cr, bev=0.04); cyl(0.065, 1.35, p['orange'], cr, bev=0.03)
    rbox(1.0, 0.12, 0.12, 0.06, p['orange'], (cr[0] - 0.4, cr[1], 1.4))
    tube([(cr[0] - 0.8, cr[1], 1.4), (cr[0] - 0.8, cr[1], 0.95)], 0.014, p['char'])
    rbox(0.36, 0.3, 0.26, 0.1, p['tealsoft'], (cr[0] - 0.8, cr[1], 0.68))
    ball(0.04, p['lamp'], (cr[0], cr[1], 1.48))

def b_solar(p):
    rbox(2.0, 1.5, 0.14, 0.07, p['cream2'], (0, 0, 0))
    for k, y in enumerate((-0.38, 0.38)):
        for x in (-0.5, 0.5):
            cyl(0.04, 0.35, p['grey'], (x, y + 0.1, 0.12), bev=0.015)
        tilt = (math.radians(-28), 0, 0)
        rbox(1.7, 0.62, 0.05, 0.03, p['solar'], (0, y, 0.38), tilt)
        rbox(1.78, 0.7, 0.035, 0.02, p['cream'], (0, y + 0.01, 0.355), tilt)
        for i in range(1, 4):
            rbox(0.018, 0.6, 0.02, 0.008, p['cream'], (-0.85 + i * 0.425, y, 0.425), tilt)
        rbox(1.7, 0.018, 0.02, 0.008, p['cream'], (0, y, 0.425), tilt)
    b = (1.25, -0.2, 0)
    rbox(0.42, 0.36, 0.48, 0.14, p['cream'], b); rbox(0.44, 0.38, 0.07, 0.035, p['orange'], (b[0], b[1], 0.44))
    for k in range(3): rbox(0.05, 0.03, 0.05, 0.02, p['teal'], (b[0] - 0.1 + k * 0.1, b[1] - 0.19, 0.28))
    tube([(b[0] - 0.2, b[1], 0.06), (0.85, -0.2, 0.06)], 0.035, p['char'])

def b_batteries(p):
    rbox(1.9, 1.4, 0.1, 0.05, p['cream2'], (0, 0, 0))
    for i, x in enumerate((-0.6, -0.2, 0.2, 0.6)):
        y = 0.15
        cyl(0.17, 0.85, p['cream'], (x, y, 0.1), bev=0.12)
        cyl(0.175, 0.07, p['char'], (x, y, 0.1), bev=0.03)
        for k in range(3 if i % 2 == 0 else 2): rbox(0.14, 0.06, 0.07, 0.03, p['teal'], (x, y - 0.155, 0.25 + k * 0.12))
        cyl(0.06, 0.08, p['orange'], (x, y, 0.93), bev=0.025)
        rbox(0.07, 0.016, 0.016, 0.006, p['char'], (x, y, 1.015)); rbox(0.016, 0.07, 0.016, 0.006, p['char'], (x, y, 1.015))
    tube([(-0.6, 0.15, 1.0), (-0.6, 0.15, 1.12), (0.6, 0.15, 1.12), (0.6, 0.15, 1.0)], 0.025, p['orange'])
    b = (0.0, -0.45, 0.1)
    rbox(0.6, 0.3, 0.4, 0.12, p['cream'], b); rbox(0.4, 0.04, 0.12, 0.04, p['teal'], (b[0], b[1] - 0.15, 0.3))

def b_pump(p):
    # three thick soft legs with ball joints over the ice, a drill bit, a clear tank with water and a valve wheel
    rbox(2.0, 1.8, 0.08, 0.04, p['cream2'], (0, 0, 0))
    for i in range(3):
        a = i * 2.094 + math.pi / 6; fx, fy = math.cos(a) * 0.62, math.sin(a) * 0.62
        cyl(0.13, 0.07, p['char'], (fx, fy, 0.06), bev=0.03)
        tube([(fx, fy, 0.1), (fx * 0.55, fy * 0.55, 0.85)], 0.065, p['orange'])
        ball(0.09, p['char'], (fx * 0.55, fy * 0.55, 0.85))
    cyl(0.48, 0.42, p['cream'], (0, 0, 0.8), bev=0.18); torus(0.48, 0.045, p['orange'], (0, 0, 1.0))
    porthole(p, (0, -0.48), 0.09, (0, -1), 1.02)
    cyl(0.2, 0.25, p['char'], (0, 0, 1.22), bev=0.08); ball(0.05, p['teal'], (0, 0, 1.5))
    cyl(0.1, 0.5, p['grey'], (0, 0, 0.3), bev=0.04)
    for k in range(4): torus(0.1, 0.03, p['char'], (0, 0, 0.36 + k * 0.1))
    for i in range(7):
        a = i * 0.9; r = 0.3 + (i % 3) * 0.12
        ball(0.09 + (i % 2) * 0.04, p['ice'], (math.cos(a) * r, math.sin(a) * r, 0.08), (1, 1, 0.6), seg=12)
    t = (1.25, 0.3, 0.08)
    water_tank(p, t, 0.34, 0.85)
    tube([(0.4, 0.15, 0.95), (0.9, 0.3, 0.95)], 0.055, p['grey'])
    torus(0.1, 0.025, p['red'], (0.7, 0.24, 1.08), (0, math.pi / 2, 0.3))

def b_greenhouse(p):
    L, R = 2.2, 0.72
    rbox(L + 0.3, 2 * R + 0.25, 0.1, 0.05, p['cream2'], (0, 0, 0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=R, depth=L, location=(0, 0, 0.1), rotation=(0, math.pi / 2, 0))
    o = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if (o.matrix_world @ v.co).z < 0.1 - 1e-4], context='VERTS'); bm.to_mesh(o.data); bm.free(); _done(o, p['glass'])
    # end walls of glass (half discs)
    for x in (-L / 2, L / 2):
        e = cyl(R, 0.02, p['glass'], (x, 0, 0.1), (0, math.pi / 2, 0), bev=0.0)
        bm = bmesh.new(); bm.from_mesh(e.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if (e.matrix_world @ v.co).z < 0.1 - 1e-4], context='VERTS'); bm.to_mesh(e.data); bm.free()
    for k in range(6):
        x = -L / 2 + 0.03 + k * (L - 0.06) / 5
        t = torus(R + 0.01, 0.04, p['cream'] if 0 < k < 5 else p['orange'], (x, 0, 0.1), (0, math.pi / 2, 0))
        bm = bmesh.new(); bm.from_mesh(t.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if (t.matrix_world @ v.co).z < 0.08], context='VERTS'); bm.to_mesh(t.data); bm.free()
    for y in (-0.3, 0.3):
        bed_row(p, (0, y, 0.1), 6, L - 0.3, 0, ['lettuce', 'tomato', 'carrot', 'bush', 'lettuce', 'tomato'])
    for x in (-0.6, 0.0, 0.6): rbox(0.3, 0.05, 0.03, 0.015, p['teal'], (x, 0, 0.1 + R - 0.08))
    # the service module at the far end, round like the rest
    m = (L / 2 + 0.5, 0.0, 0.1)
    cyl(0.5, 0.85, p['cream'], m, bev=0.22); torus(0.5, 0.045, p['orange'], (m[0], m[1], 0.5))
    rbox(0.34, 0.12, 0.5, 0.15, p['char'], (m[0], m[1] - 0.45, 0.12))
    cyl(0.12, 0.2, p['char'], (m[0], m[1], 0.93), bev=0.05); ball(0.04, p['teal'], (m[0], m[1], 1.17))

def b_processor(p):
    # a stout air machine: three big intake fans at the base, a clear band with the green filter, an outlet with clean air
    cyl(0.95, 0.1, p['char'], (0, 0, 0), bev=0.05)
    cyl(0.78, 0.55, p['cream'], (0, 0, 0.08), bev=0.22)
    for k in range(3):
        a = k * 2.094 - math.pi / 2; fx, fy = math.cos(a) * 0.78, math.sin(a) * 0.78
        rot = (math.pi / 2, 0, a + math.pi / 2)
        cyl(0.22, 0.08, p['char'], (fx - math.cos(a) * 0.04, fy - math.sin(a) * 0.04, 0.35 - 0.22), rot, bev=0.03)
        torus(0.22, 0.04, p['orange'], (fx, fy, 0.35), rot)
        for b in range(4):
            # a fan blade: a thin soft bar through the hub, turned in the plane of the fan
            bl = rbox(0.36, 0.02, 0.06, 0.012, p['grey'], (0, 0, -0.03), (b * math.pi / 4, 0, 0))
            bl.rotation_euler = (0, 0, a + math.pi / 2); bl.location = (fx + math.cos(a) * 0.035, fy + math.sin(a) * 0.035, 0.35)
            bpy.context.view_layer.objects.active = bl; bpy.ops.object.select_all(action='DESELECT'); bl.select_set(True)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        ball(0.05, p['orange'], (fx + math.cos(a) * 0.05, fy + math.sin(a) * 0.05, 0.35))
    torus(0.74, 0.05, p['orange'], (0, 0, 0.62))
    cyl(0.6, 0.45, p['glass'], (0, 0, 0.62), bev=0.08)
    cyl(0.42, 0.45, p['leaf'], (0, 0, 0.62), bev=0.12)
    for k in range(8):
        a = k * math.pi / 4; rbox(0.05, 0.16, 0.38, 0.025, p['leaf2'], (math.cos(a) * 0.45, math.sin(a) * 0.45, 0.66), (0, 0, a))
    torus(0.6, 0.05, p['orange'], (0, 0, 1.08))
    cyl(0.5, 0.3, p['cream'], (0, 0, 1.08), bev=0.14)
    cyl(0.28, 0.35, p['cream2'], (0, 0, 1.35), bev=0.1)
    torus(0.26, 0.06, p['char'], (0, 0, 1.68))
    puff((0, 0, 1.95), 0.17, p['steam'])
    rbox(0.42, 0.14, 0.55, 0.16, p['char'], (0, -0.75, 0.08))
    ball(0.04, p['teal'], (0.18, -0.85, 0.5))

def b_furnace(p):
    # a soft kiln: big body with a glowing fire window, a chimney with a teal filter, a conveyor bringing quartz
    rbox(2.0, 1.7, 0.1, 0.05, p['cream2'], (0, 0, 0))
    rbox(1.3, 1.1, 0.95, 0.38, p['cream'], (-0.15, 0.1, 0.1))
    torus_band = rbox(1.32, 1.12, 0.1, 0.05, p['orange'], (-0.15, 0.1, 0.5))
    rbox(1.34, 1.14, 0.14, 0.07, p['char'], (-0.15, 0.1, 0.1))
    # the fire window at the front (-y)
    ball(0.26, p['fire'], (-0.15, -0.28, 0.5), (1.2, 0.6, 0.8))
    rbox(0.6, 0.1, 0.4, 0.18, p['glass'], (-0.15, -0.46, 0.3))
    rbox(0.72, 0.08, 0.5, 0.22, p['char'], (-0.15, -0.43, 0.25))
    # chimney
    ch = (-0.45, 0.35, 1.0)
    cyl(0.18, 1.2, p['cream'], ch, bev=0.08)
    torus(0.185, 0.035, p['orange'], (ch[0], ch[1], ch[2] + 0.4))
    torus(0.2, 0.055, p['teal'], (ch[0], ch[1], ch[2] + 0.95))
    cyl(0.24, 0.08, p['char'], (ch[0], ch[1], ch[2] + 1.2), bev=0.04)
    puff((ch[0], ch[1], ch[2] + 1.55), 0.18, p['steam'])
    # conveyor with quartz from the right side
    rbox(1.0, 0.28, 0.08, 0.04, p['char'], (1.0, 0.2, 0.52), (0, math.radians(25), 0))
    for k in range(4):
        ball(0.07, p['quartz'], (0.6 + k * 0.2, 0.2, 0.75 - k * 0.09), seg=10)
    rbox(0.45, 0.45, 0.3, 0.14, p['orange'], (1.45, 0.2, 0.1))
    for x in (1.0, 1.3): cyl(0.035, 0.38 - (x - 1.0) * 0.5, p['grey'], (x, 0.2, 0.1), bev=0.012)

def b_mine(p):
    # layered dark red rock, a big soft entrance with a lamp, rails and a bigger cart of ore
    r1 = mat('rock', '#b4532a', 0.9); r2 = mat('rock2', '#8f3f22', 0.9); r3 = mat('rock3', '#cf6a36', 0.9)
    for (x, y, z, r, sz, m) in [(0, 0.25, 0, 1.0, 0.55, r2), (0, 0.3, 0.35, 0.85, 0.5, r1), (0.05, 0.35, 0.68, 0.62, 0.5, r3),
                                (-0.85, 0.4, 0, 0.6, 0.6, r1), (0.85, 0.35, 0, 0.62, 0.55, r3), (0.6, 0.6, 0.3, 0.45, 0.6, r2)]:
        ball(r, m, (x, y, z), (1, 0.85, sz), seg=24)
    e = (0.0, -0.62, 0)
    rbox(0.8, 0.3, 0.75, 0.3, p['char'], (e[0], e[1] + 0.1, 0.02))
    t = torus(0.45, 0.07, p['orange'], (e[0], e[1] - 0.05, 0.32), (math.pi / 2, 0, 0))
    bm = bmesh.new(); bm.from_mesh(t.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if (t.matrix_world @ v.co).z < 0.3], context='VERTS'); bm.to_mesh(t.data); bm.free()
    for sx in (-0.45, 0.45): rbox(0.14, 0.14, 0.34, 0.06, p['orange'], (e[0] + sx, e[1] - 0.05, 0.0))
    ball(0.07, p['lamp'], (e[0], e[1] - 0.12, 0.9)); cyl(0.02, 0.12, p['char'], (e[0], e[1] - 0.1, 0.8), bev=0.008)
    for sx in (-0.16, 0.16): rbox(0.045, 1.2, 0.04, 0.018, p['grey'], (e[0] + sx, e[1] - 0.6, 0.02))
    for k in range(7): rbox(0.46, 0.08, 0.035, 0.015, p['wood'], (e[0], e[1] - 0.05 - k * 0.18, 0.0))
    c = (e[0], e[1] - 0.95, 0.08)
    rbox(0.5, 0.56, 0.3, 0.12, p['orange'], c)
    for (dx, dy, m) in [(-0.12, -0.12, 'quartz'), (0.1, -0.08, 'grey'), (0, 0.12, 'quartz'), (-0.1, 0.1, 'grey'), (0.12, 0.14, 'quartz'), (0.0, -0.02, 'grey')]:
        ball(0.1, p[m], (c[0] + dx, c[1] + dy, 0.4), seg=12)
    for sx in (-0.2, 0.2):
        for sy in (-0.18, 0.18): cyl(0.07, 0.05, p['char'], (c[0] + sx, c[1] + sy, 0.08), (0, math.pi / 2, 0), bev=0.02)

BUILD = {'dome': b_dome, 'kitchen': b_kitchen, 'veglab': b_veglab, 'research': b_research, 'warehouse': b_warehouse,
         'solar': b_solar, 'batteries': b_batteries, 'pump': b_pump, 'greenhouse': b_greenhouse, 'processor': b_processor,
         'furnace': b_furnace, 'mine': b_mine}
for name, fn in BUILD.items():
    if ONLY and name not in ONLY: continue
    reset(); p = P(); p['tomato'] = mat('tomato', '#ff5a3c', 0.5); p['carrot'] = mat('carrot', '#ff9a3a', 0.6)
    fn(p); export(f'{OUT}/{name}.glb'); print('built', name)
