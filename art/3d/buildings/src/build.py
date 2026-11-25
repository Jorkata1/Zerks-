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
        steam=mat('steam', '#ffffff', 0.9, alpha=0.85), wood=mat('wood', '#c98a52', 0.8), tomato=mat('tomato', '#ff5a3c', 0.5),
        steel=mat('steel', '#b9c3cc', 0.35), clay=mat('clay', '#c9967a', 0.85), clay2=mat('clay2', '#a9785d', 0.85),
        brick=mat('brick', '#a8452f', 0.8), copper=mat('copper', '#c8743a', 0.35), cuore=mat('cuore', '#5d8a78', 0.75),
        cusol=mat('cusol', '#29a3c9', 0.1, alpha=0.8), brickwall=mat('brickwall', '#c4704f', 0.85))

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

def cut_below(o, z):
    """cut a solid along the plane z and keep the top, with the caps cut in half rather than deleted
    (cut_half drops every face that has a vertex below zmin, so a cylinder lost its end walls)"""
    bpy.context.view_layer.update()
    bm = bmesh.new(); bm.from_mesh(o.data)
    mw = o.matrix_world.copy(); bm.transform(mw)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)
    bm.transform(mw.inverted())
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

def b_kitchen(p, lvl=10):
    """the common kitchen (level 3, docs/levels.md) at its own level 1, 10 and 20: 8, 10 and 20 places; one cook, the
    others eat here. The look of the first one stays (11.11.2026, Joro: variant A, with our own furniture); like the
    canteen, the tables and the stools behind the glass count the places: level 1 the cook's stove and two tables of
    four in the big window; level 10 a small wing on the left with a table for two, plants under glass in front;
    level 20 a bigger wing on the left with two tables of four and a small one on the right with another table of four,
    herbs under glass on the roof"""
    W, D, H, R = 1.7, 1.15, 0.85, 0.24
    plinth(p, W, D, R)
    body = rbox(W, D, H, R, p['cream'], (0, 0, 0.1), seg=6)
    # the big window on the front: the cook's stove on the right, two tables of four on the left
    def furn(cx, cy, fz):
        tables(p, 2, 4)(cx - 0.11, cy, fz)
        L = frame(cx, cy, 0.0)
        rbox(0.12, 0.09, 0.09, 0.012, p['char'], (*L(0.28, 0.06), fz), seg=2)
        rbox(0.09, 0.06, 0.006, 0.01, p['fire'], (*L(0.28, 0.06), fz + 0.09), seg=1)
        cyl(0.026, 0.04, p['grey'], (*L(0.26, 0.06), fz + 0.096), bev=0.008)
        rbox(0.12, 0.04, 0.008, 0.003, p['cream2'], (*L(0.28, 0.15), fz + 0.2), seg=1)
        for k in range(3): cyl(0.012, 0.03, [p['tomato'], p['leaf'], p['wood']][k], (*L(0.24 + k * 0.04, 0.15), fz + 0.208), bev=0.004)
    lit_room(p, body, 0.78, 0.4, 0.38, -0.25, -D / 2 + 0.01, 0.38, 0.0, furn)
    stripe_box(p, W, D, R, 0.3)
    # door on the right of the front, under an orange awning
    door(p, 0.5, -D / 2 - 0.02, 0.0, 0.3, 0.52, 0.1)
    rbox(0.5, 0.36, 0.04, 0.02, p['orange'], (0.5, -D / 2 - 0.16, 0.68), (math.radians(-18), 0, 0))
    # chimney with an orange band and a charcoal cap, a roof vent box, steam
    ch = (-0.45, 0.2, H + 0.05)
    cyl(0.1, 0.55, p['cream'], ch, bev=0.04); torus(0.1, 0.022, p['orange'], (ch[0], ch[1], ch[2] + 0.3))
    ball(0.16, p['char'], (ch[0], ch[1], ch[2] + 0.58), (1, 1, 0.45), seg=20)
    steam(p, (ch[0], ch[1], ch[2] + 0.85), 0.1)
    rbox(0.3, 0.3, 0.16, 0.05, p['cream2'], (0.45, 0.25, H + 0.06)); ball(0.08, p['char'], (0.45, 0.25, H + 0.24), (1, 1, 0.55), seg=16)
    # the wings as the kitchen grows: (width, window, tables, seats) on the left, and at level 20 one on the right
    def wing(cx, ww, win, n, seats):
        WD, WH = 0.9, 0.6
        rbox(ww + 0.08, WD + 0.08, 0.1, 0.16, p['char'], (cx, 0.0, 0.0))
        wb = rbox(ww, WD, WH, 0.16, p['cream'], (cx, 0.0, 0.1), seg=5)
        lit_room(p, wb, win, 0.28, 0.3, cx, -WD / 2 + 0.01, 0.24, 0.0, tables(p, n, seats))
        rbox(ww + 0.02, WD + 0.02, 0.035, 0.16, p['orange'], (cx, 0.0, 0.1 + WH - 0.14))
        light(p, (cx, 0.15, 0.1 + WH + 0.01), 0.02)
    if lvl >= 20:
        wing(-W / 2 - 0.4 + 0.05, 0.8, 0.6, 2, 4)
        wing(W / 2 + 0.25 - 0.05, 0.5, 0.36, 1, 4)
    elif lvl >= 10:
        wing(-W / 2 - 0.3 + 0.05, 0.6, 0.36, 1, 2)
    # an orange barrel at the side (behind, once the right wing stands there) and a picnic table in front
    bx, by = (W / 2 + 0.16, 0.0) if lvl < 20 else (W / 2 - 0.05, D / 2 + 0.2)
    cyl(0.15, 0.36, p['orange'], (bx, by, 0.0), bev=0.05); torus(0.12, 0.012, p['char'], (bx, by, 0.38), (0, math.pi / 2, 0))
    tx, ty = -0.25, -D / 2 - 0.75
    rbox(0.7, 0.32, 0.05, 0.02, p['cream2'], (tx, ty, 0.3))
    for s_ in (-1, 1):
        rbox(0.7, 0.12, 0.04, 0.02, p['orange'], (tx, ty + s_ * 0.3, 0.17))
        for e in (-1, 1): rbox(0.04, 0.04, 0.3, 0.01, p['char'], (tx + e * 0.28, ty + s_ * 0.1, 0.0))
    if lvl >= 10:
        for x in (-0.7, 0.15): bell(p, (x, -D / 2 - 0.2, 0.0), 0.8)
    if lvl >= 20:
        px, py, RZ = -0.05, -0.1, 0.1 + H
        rbox(0.5, 0.4, 0.06, 0.04, p['orange'], (px, py, RZ))
        rbox(0.46, 0.36, 0.02, 0.03, p['soil'], (px, py, RZ + 0.05))
        bush(p, (px - 0.1, py - 0.06, RZ + 0.06), 0.55); bush(p, (px + 0.1, py + 0.06, RZ + 0.06), 0.45)
        dome(0.26, p['glass'], (px, py, RZ + 0.06), seg=32, sz=0.7)

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

def gh_arch(p, xc, yc, L, R, kind, ins=False):
    """one glass arch of the greenhouse along x: cream ribs, glass ends, two beds; kind 'air' (green plants for the air)
    or 'food' (tomatoes on one bed, the seedling bed with small green trays on the other); lamps under the ridge"""
    bpy.ops.mesh.primitive_cylinder_add(vertices=56, radius=R, depth=L, location=(xc, yc, 0.08), rotation=(0, math.pi / 2, 0))
    g = bpy.context.object; cut_below(g, 0.08); _done(g, p['glass'])
    for x in (xc - L / 2, xc + L / 2):
        e = cyl(R, 0.015, p['glass'], (x, yc, 0.08 - 0.0075), (0, math.pi / 2, 0), bev=0.0); cut_below(e, 0.08)
    if ins:
        # the insulation (level 29): the back end becomes a solid wall with wool inside, an orange rim; inside, the
        #    night curtain is rolled up under the ridge (it comes down over the plants at night)
        e = cyl(R + 0.02, 0.06, p['cream'], (xc - L / 2 - 0.035, yc, 0.08 - 0.03), (0, math.pi / 2, 0), bev=0.02); cut_below(e, 0.08)
        t = torus(R + 0.02, 0.016, p['orange'], (xc - L / 2 - 0.068, yc, 0.08), (0, math.pi / 2, 0)); cut_half(t, 0.07)
        light(p, (xc - L / 2 - 0.07, yc, 0.08 + R + 0.03), 0.018)
        hcyl(0.035, L - 0.12, mat('curtain', '#cdd3da', 0.45), (xc, yc + 0.08, 0.08 + R - 0.07), 'x', bev=0.012)
    nr = max(3, int(round(L / 0.27)) + 1)
    for k in range(nr):
        x = xc - L / 2 + 0.02 + k * (L - 0.04) / (nr - 1)
        t = torus(R + 0.005, 0.025, p['cream'], (x, yc, 0.08), (0, math.pi / 2, 0)); cut_half(t, 0.07)
    for y in (-R * 0.95, R * 0.95): rbox(L, 0.04, 0.05, 0.02, p['cream'], (xc, yc + y, 0.08))
    nb = max(3, int(L / 0.3))
    for j, y in enumerate((-0.25, 0.25)):
        rbox(L - 0.25, 0.32, 0.1, 0.04, p['soil'], (xc, yc + y, 0.08))
        for i in range(nb):
            x = xc - L / 2 + 0.3 + i * (L - 0.5) / max(1, nb - 1)
            if kind == 'food' and j == 1 and i < 2:                      # the seedling bed: trays of small seedlings
                rbox(0.22, 0.26, 0.03, 0.01, p['orange'], (x, yc + y, 0.18), seg=1)
                for a in range(3):
                    for b in range(3): ball(0.022, p['leaf2'], (x - 0.07 + a * 0.07, yc + y - 0.08 + b * 0.08, 0.215), seg=8)
                continue
            bush(p, (x, yc + y, 0.15), 1.05)
            if kind == 'food' and j == 0:
                for (dx, dy, dz) in ((0.0, -0.125, 0.25), (0.095, -0.08, 0.2), (-0.1, -0.07, 0.29), (0.07, 0.07, 0.33)):
                    ball(0.03, p['tomato'], (x + dx, yc + y + dy, dz), seg=10)      # on the outside of the plant, where they show
    for k in range(max(2, nr // 2)):                                       # the lamps for the night under the ridge
        x = xc - L / 2 + 0.2 + k * (L - 0.4) / max(1, max(2, nr // 2) - 1)
        tube([(x, yc, 0.08 + R - 0.03), (x, yc, 0.08 + R - 0.12)], 0.005, p['char'])
        ball(0.025, p['lampw'], (x, yc, 0.08 + R - 0.14), seg=10)

def b_greenhouse(p, lvl=10, ins=False):
    """the greenhouse (level 8, docs/levels.md) at its level 1, 10 and 20: first air only, from its level 16 food too
    (the switch "air only" / "air and food"), from level 17 a seedling bed; an agronomist works it; at night it works
    and its lamps are on. Level 1 a short arch; level 10 the arch as long as the plot; level 20 a second arch beside
    it with the tomatoes and the seedling bed, and the switch with two lights on the service module"""
    R = 0.62
    L = {1: 1.2, 10: 1.9, 20: 1.9}[lvl]
    arches = [(0.0, 'air')] if lvl < 20 else [(0.65, 'air'), (-0.65, 'food')]
    xc = -0.35 + (1.9 - L) / 2
    span = (2 * R + 0.15) if lvl < 20 else (4 * R + 0.2)
    rbox(L + 0.15, span, 0.08, 0.04, p['cream2'], (xc, 0, 0))
    if ins:                                          # the insulated base: a thicker skirt round it with an orange stripe
        rbox(L + 0.2, span + 0.05, 0.11, 0.05, p['cream'], (xc, 0, 0))
        rbox(L + 0.215, span + 0.065, 0.025, 0.05, p['orange'], (xc, 0, 0.06))
    for yc, kind in arches: gh_arch(p, xc, yc, L, R, kind, ins)
    # the service module at the end, with a door, a porthole and a vent; a dark pipe up its side
    mx = xc + L / 2 + 0.42
    MD = 0.92 if lvl < 20 else 2.4
    rbox(0.86, MD + 0.06, 0.1, 0.24, p['char'], (mx, 0, 0))
    mod = rbox(0.8, MD, 0.82, 0.24, p['cream'], (mx, 0, 0.08), seg=6)
    rbox(0.825, MD + 0.025, 0.04, 0.24, p['orange'], (mx, 0, 0.62))
    door(p, mx - 0.12, -MD / 2 - 0.01, 0.0, 0.26, 0.48, 0.08)
    porthole(p, (mx + 0.4, -0.15, 0.48), (1, 0), 0.07)
    vent(p, (mx, 0.1, 0.9), 0.15)
    tube([(mx - 0.3, -0.35, 0.9), (mx - 0.38, -0.35, 1.05), (mx - 0.5, -0.32, 1.12)], 0.025, p['char'])
    if lvl >= 20:
        # the switch "air only" / "air and food": a panel with a lever, a teal light for the air, an orange one for food
        sx_, sy_ = mx + 0.17, -MD / 2 - 0.01
        rbox(0.2, 0.03, 0.14, 0.02, p['char'], (sx_, sy_, 0.3), seg=2)
        light(p, (sx_ - 0.05, sy_ - 0.02, 0.41), 0.016)
        ball(0.016, p['fire'], (sx_ + 0.05, sy_ - 0.02, 0.41), seg=10)
        tube([(sx_, sy_ - 0.02, 0.34), (sx_ + 0.04, sy_ - 0.06, 0.38)], 0.008, p['orange'])

def b_research_old(p):
    """the first research station (05.11.2026): a rounded box with an observation turret and a dish; replaced by idea B"""
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

def b_warehouse(p, lvl=10):
    """the store (level 4, docs/levels.md) at its level 1, 10 and 20: 1 000, about 20 000 and about 68 000 of each
    resource, so it grows plainly: level 1 a short hangar with its roll-up door and the crane with one container on its
    rope; level 10 a longer hangar and a stack of containers by the crane; level 20 a longer one still, a second door at
    the side, a taller crane and more stacks"""
    L = {1: 1.1, 10: 1.7, 20: 2.4}[lvl]; R = 0.85
    X = -0.25 if lvl >= 20 else 0.0                  # at level 20 the hangar moves left, to leave room for the stacks
    rbox(L + 0.15, 2 * R + 0.15, 0.1, 0.08, p['cream2'], (X, 0, 0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=56, radius=R, depth=L, location=(X, 0, 0.1), rotation=(math.pi / 2, 0, 0))
    h = bpy.context.object; cut_below(h, 0.1); _done(h, p['cream'])
    nin = {1: 1, 10: 2, 20: 3}[lvl]
    ribs = [(-L / 2 + 0.03, 'char'), (L / 2 - 0.03, 'char')] + [(-L / 2 + (k + 1) * L / (nin + 1), 'orange' if k == 0 else 'char') for k in range(nin)]
    for y, m in ribs:
        t = torus(R + 0.01, 0.04, p[m], (X, y, 0.1), (math.pi / 2, 0, 0)); cut_half(t, 0.09)
    # the front wall with a charcoal roll-up door in an orange frame
    fw = cyl(R, 0.04, p['cream2'], (X, -L / 2, 0.08), (math.pi / 2, 0, 0), bev=0.0); cut_below(fw, 0.1)
    rbox(0.84, 0.06, 0.72, 0.05, p['orange'], (X, -L / 2 - 0.03, 0.1))
    rbox(0.74, 0.07, 0.66, 0.03, p['char'], (X, -L / 2 - 0.05, 0.1))
    for k in range(7): rbox(0.72, 0.02, 0.02, 0.008, p['grey'], (X, -L / 2 - 0.09, 0.16 + k * 0.08))
    light(p, (X, -L / 2 - 0.06, 0.88))
    # the roof vents between the ribs
    ys = sorted(y for y, _ in ribs)
    for a, b in zip(ys, ys[1:]): ball(0.1, p['char'], (X, (a + b) / 2, R + 0.09), (1, 1, 0.55), seg=16)
    if lvl >= 20:
        # a second door on the left side, for the carts: a small vestibule out of the curved wall, the door on its face
        vx = X - R - 0.02
        rbox(0.34, 0.56, 0.62, 0.08, p['cream'], (vx, 0.45, 0.1))
        rbox(0.36, 0.58, 0.03, 0.08, p['orange'], (vx, 0.45, 0.6))
        rbox(0.06, 0.4, 0.46, 0.03, p['orange'], (vx - 0.17, 0.45, 0.1))
        rbox(0.07, 0.32, 0.42, 0.02, p['char'], (vx - 0.19, 0.45, 0.1))
        light(p, (vx - 0.18, 0.45 + 0.24, 0.6), 0.02)
    # the crane and the container hanging from it; the crane stands far enough out that the container clears the ribs
    CH = 1.2 if lvl < 20 else 1.5
    cx, cy = X + R + 0.4, (0.35 if lvl >= 20 else min(0.5, L / 2 - 0.05))
    cyl(0.12, 0.06, p['char'], (cx, cy, 0.0), bev=0.03)
    cyl(0.055, CH, p['orange'], (cx, cy, 0.05), bev=0.02)
    rbox(0.16, 0.16, 0.16, 0.04, p['char'], (cx, cy, CH))
    jz = CH - 0.25
    tube([(cx, cy, CH - 0.05), (cx - 0.1, cy - 0.65, jz)], 0.04, p['orange'])
    tube([(cx - 0.1, cy - 0.65, jz), (cx - 0.1, cy - 0.65, 0.635)], 0.008, p['char'])
    rbox(0.06, 0.06, 0.025, 0.01, p['char'], (cx - 0.1, cy - 0.65, 0.615))
    ox, oy = cx - 0.1, cy - 0.65
    rbox(0.42, 0.38, 0.5, 0.05, p['cream'], (ox, oy, 0.12))
    rbox(0.43, 0.39, 0.22, 0.05, p['orange'], (ox, oy, 0.12))
    for k in range(4): rbox(0.02, 0.4, 0.5, 0.008, p['char'], (ox - 0.15 + k * 0.1, oy, 0.12))
    # the stacks of containers by the crane, behind the hanging one
    def stack(x, y, n):
        for k in range(n):
            before = set(bpy.data.objects)
            container(p, (x, y), math.pi / 2, 0.4, 0.34, 0.32, eye=(k == n - 1))
            for o in bpy.data.objects:
                if o not in before: o.location.z += k * 0.32
    if lvl >= 10:
        stack(cx + 0.05, cy + 0.42, 2)
    if lvl >= 20:
        stack(cx + 0.05, cy + 0.88, 2)
        stack(cx + 0.05, cy - 1.1, 3)

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

def b_solar(p, lvl=10):
    """the solar panels (level 5, docs/levels.md): one plot that grows with its upgrades, row by row (Joro, 11.11.2026);
    one worker for them all keeps them clean of dust (+20%). Rows fill the plot from the back: level 1 one row,
    level 10 three, level 20 five; the footings of the rows to come wait in the empty part. Each row: navy cells in a
    cream frame on dark posts, tilted to the sun, an orange edge. At the front right the inverter with its lights and
    the cable to the batteries; the cleaning cart with its brush and water tank parked at the end of the front row."""
    rows = {1: 1, 10: 3, 20: 5}[lvl]
    PW, PD = 2.6, 2.4
    rbox(PW, PD, 0.06, 0.08, p['cream2'], (0, 0, 0))
    RL, RD = 2.0, 0.44                              # a row: its length along x and the depth of its panels
    ys = [0.9 - k * 0.48 for k in range(5)]          # from the back to the front
    tilt = (math.radians(30), 0, 0)                  # the cells face the front, where the sun and the map's camera are
    for k, y in enumerate(ys):
        if k >= rows:
            for x in (-0.85, 0.0, 0.85): cyl(0.05, 0.02, p['char'], (x - 0.15, y + 0.08, 0.06), bev=0.008)   # a footing to come
            continue
        for x in (-0.85, 0.0, 0.85):
            cyl(0.03, 0.24, p['char'], (x - 0.15, y + 0.08, 0.05), bev=0.01); cyl(0.055, 0.03, p['char'], (x - 0.15, y + 0.08, 0.05), bev=0.012)
        rbox(RL, RD, 0.04, 0.03, p['cream'], (-0.15, y, 0.27), tilt)
        rbox(RL - 0.08, RD - 0.07, 0.025, 0.018, p['navy'], (-0.15, y, 0.3), tilt)
        for i in range(1, 6): rbox(0.01, RD - 0.07, 0.01, 0.004, p['cream'], (-0.15 - (RL - 0.08) / 2 + i * (RL - 0.08) / 6, y, 0.322), tilt)
        rbox(RL + 0.02, 0.03, 0.025, 0.012, p['orange'], (-0.15, y - RD / 2 * math.cos(math.radians(30)) + 0.01, 0.16), tilt)
        if k: tube([(-0.15 + RL / 2, y + 0.05, 0.08), (-0.15 + RL / 2 + 0.06, y + 0.05, 0.07), (-0.15 + RL / 2 + 0.06, ys[k - 1] + 0.05, 0.07)], 0.012, p['char'])
    # the inverter at the front right, its lights, and the cable that goes off to the batteries
    bx, by = 1.05, -0.95
    rbox(0.34, 0.28, 0.42, 0.09, p['cream'], (bx, by, 0.05)); rbox(0.36, 0.3, 0.035, 0.09, p['orange'], (bx, by, 0.32))
    vent(p, (bx, by, 0.47), 0.07)
    for k in range(3): light(p, (bx - 0.172, by - 0.08 + k * 0.08, 0.24), 0.02)
    front = ys[rows - 1]
    tube([(-0.15 + RL / 2 + 0.06, front + 0.05, 0.07), (bx - 0.1, front + 0.05, 0.07), (bx - 0.1, by + 0.14, 0.07)], 0.014, p['char'])
    tube([(bx + 0.12, by + 0.1, 0.08), (PW / 2 + 0.05, by + 0.3, 0.03), (PW / 2 + 0.3, by + 0.4, 0.012)], 0.022, p['char'])
    # the cleaning cart: the worker pushes it along the rows; a soft orange brush, a water tank, small wheels
    cx, cy = -0.15 - RL / 2 - 0.2, front - 0.05
    rbox(0.16, 0.24, 0.1, 0.035, p['cream'], (cx, cy, 0.08), seg=3)
    cyl(0.05, 0.1, p['cream2'], (cx, cy + 0.04, 0.18), bev=0.015)
    light(p, (cx, cy + 0.04, 0.29), 0.012)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.035, depth=0.2, location=(cx + 0.11, cy, 0.15), rotation=(math.pi / 2, 0, 0))
    _done(bpy.context.object, p['orange'])
    for sy in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.025, depth=0.014, location=(cx - 0.05, cy + sy * 0.1, 0.085), rotation=(0, math.pi / 2, 0))
        _done(bpy.context.object, p['char'])
    tube([(cx - 0.08, cy, 0.18), (cx - 0.16, cy, 0.32)], 0.008, p['char'])

def b_batteries(p, lvl=10):
    """the batteries (level 7, docs/levels.md): the power for the night, no worker; they grow with their cells, so the
    night lasts with the smelter and the kilns too. Upright cells with teal charge strips and orange tops on a pale
    pad, a control box. Level 1 two cells; level 10 four in a row; level 20 eight in two rows joined by copper bus bars
    (from level 18 the smelter makes them, and the night lasts longer) and a cooler with fans, because so many cells
    get warm"""
    rows = [(0.15, 2)] if lvl < 10 else ([(0.15, 4)] if lvl < 20 else [(0.45, 4), (-0.15, 4)])
    PW, PD = (1.0, 1.1) if lvl < 10 else ((1.8, 1.2) if lvl < 20 else (1.9, 1.95))
    PY = 0.0 if lvl < 20 else 0.05
    rbox(PW, PD, 0.08, 0.05, p['cream2'], (0, PY, 0))
    bus = p['copper'] if lvl >= 20 else p['char']
    for r, (y, n) in enumerate(rows):
        xs = [(-(n - 1) / 2 + i) * 0.4 for i in range(n)]
        for i, x in enumerate(xs):
            cyl(0.18, 0.08, p['char'], (x, y, 0.06), bev=0.03)
            cyl(0.16, 0.72, p['cream'], (x, y, 0.1), bev=0.12)
            torus(0.16, 0.02, p['orange'], (x, y, 0.55))
            full = 4 if (i + r) % 3 else 2
            for k in range(full): rbox(0.11, 0.05, 0.06, 0.025, p['teal'], (x, y - 0.15, 0.2 + k * 0.08))
            cyl(0.08, 0.06, p['orange'], (x, y, 0.8), bev=0.025); cyl(0.03, 0.06, p['char'], (x, y, 0.85), bev=0.01)
        if lvl >= 20:
            rbox(xs[-1] - xs[0] + 0.06, 0.04, 0.025, 0.01, p['copper'], ((xs[0] + xs[-1]) / 2, y, 0.93), seg=1)
            for x in xs: rbox(0.03, 0.03, 0.05, 0.008, p['copper'], (x, y, 0.89), seg=1)
        else:
            tube([(xs[0], y, 0.9), (xs[0], y, 0.98), (xs[-1], y, 0.98), (xs[-1], y, 0.9)], 0.02, p['char'])
    if lvl >= 20:
        tube([(rows[0][1] * 0.2 - 0.2 + 0.03, rows[0][0], 0.94), (0.82, rows[0][0], 0.94), (0.82, rows[1][0], 0.94), (0.63, rows[1][0], 0.94)], 0.014, p['copper'])
    # the control box in front, its cable to the cells
    bx, by = (0.0, -0.42) if lvl < 20 else (-0.45, -0.68)
    rbox(0.5, 0.26, 0.3, 0.09, p['cream'], (bx, by, 0.06)); rbox(0.52, 0.28, 0.035, 0.09, p['orange'], (bx, by, 0.24))
    rbox(0.26, 0.03, 0.08, 0.02, p['teal'], (bx, by - 0.13, 0.13)); vent(p, (bx + 0.15, by, 0.36), 0.06)
    front = rows[-1][0]
    tube([(bx, by + 0.13, 0.12), (bx, front - 0.2, 0.1)], 0.018, bus)
    if lvl >= 20:
        # the cooler: so many cells get warm; a box with two fans and a light, a pipe along the rows
        cxx, cyy = 0.45, -0.68
        rbox(0.42, 0.26, 0.16, 0.05, p['cream2'], (cxx, cyy, 0.06))
        for sgn in (-1, 1):
            cyl(0.07, 0.02, p['char'], (cxx + sgn * 0.1, cyy, 0.22), bev=0.005)
            torus(0.07, 0.012, p['orange'], (cxx + sgn * 0.1, cyy, 0.24))
            rbox(0.12, 0.012, 0.008, 0.004, p['grey'], (cxx + sgn * 0.1, cyy, 0.24), (0, 0, D2R(30 * sgn)))
        light(p, (cxx, cyy - 0.13, 0.17), 0.016)
        tube([(cxx, cyy + 0.13, 0.12), (cxx, front - 0.22, 0.1), (-0.65, front - 0.22, 0.1)], 0.016, p['char'])

def b_geolocator_round(p):
    # the first geolocator, until 05.11.2026 (too bare; replaced by the seismic station below): a small round station with a rotating scanner arm and a glowing screen
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

def apply_all(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def locomotive(p, at, s=1.0):
    """a small soft electric locomotive facing -y: cream body, orange stripe, cab window, headlight, wheels"""
    x, y, z = at
    rbox(0.42 * s, 0.62 * s, 0.08 * s, 0.03 * s, p['char'], (x, y, z + 0.07 * s))
    rbox(0.38 * s, 0.36 * s, 0.26 * s, 0.1 * s, p['cream'], (x, y - 0.1 * s, z + 0.14 * s))
    rbox(0.38 * s, 0.24 * s, 0.38 * s, 0.1 * s, p['cream'], (x, y + 0.17 * s, z + 0.14 * s))
    rbox(0.39 * s, 0.62 * s, 0.035 * s, 0.1 * s, p['orange'], (x, y, z + 0.27 * s))
    rbox(0.3 * s, 0.03 * s, 0.12 * s, 0.03 * s, p['win'], (x, y + 0.045 * s, z + 0.36 * s))
    rbox(0.42 * s, 0.28 * s, 0.04 * s, 0.03 * s, p['orange'], (x, y + 0.17 * s, z + 0.52 * s))
    ball(0.045 * s, p['lampw'], (x, y - 0.29 * s, z + 0.3 * s), seg=12)
    ball(0.03 * s, p['teal'], (x, y + 0.17 * s, z + 0.58 * s), seg=10)
    for sy in (-0.18, 0.18):
        for sx in (-0.2, 0.2): cyl(0.07 * s, 0.05 * s, p['char'], (x + sx * s, y + sy * s, z + 0.08 * s), (0, math.pi / 2, 0), bev=0.02 * s)

def b_mine_portal(p):
    """mine idea A: a tunnel in the canyon wall; locomotive -> rails -> tipping cart -> bunker -> conveyor -> silo; a fan blows air into the tunnel"""
    dark = mat('dark', '#1b1817', 0.9)
    X0 = -0.55                                   # the line of the rails
    TUNNEL_Y = -0.12                             # the face of the portal
    RAIL_Y1 = -1.25                              # the end of the rails (buffer stop)

    # ---------- the canyon wall: stepped soft rock behind the portal ----------
    for i, (w, d, z, h, m) in enumerate(((2.7, 1.1, 0.0, 0.5, 'rock2'), (2.5, 0.95, 0.48, 0.44, 'rock'), (2.2, 0.8, 0.9, 0.36, 'rock2'), (1.6, 0.62, 1.24, 0.28, 'rock'))):
        rbox(w, d, h, 0.1, p[m], (0.0, 0.62 + i * 0.08, z), seg=4)
    for (x, y, z) in ((0.85, 0.06, 0.62), (0.35, 0.2, 1.0), (-1.1, 0.08, 0.3), (1.15, 0.06, 0.25)):
        ball(0.06, p['crystal'], (x, y, z), seg=10)

    # ---------- the portal: a cream block set into the rock, a dark arched tunnel, orange trim ----------
    PW, PD, PH = 0.95, 0.5, 0.9
    py = TUNNEL_Y + PD / 2
    rbox(PW + 0.1, PD + 0.1, 0.1, 0.2, p['char'], (X0, py, 0.0))
    rbox(PW, PD, PH, 0.22, p['cream'], (X0, py, 0.08), seg=6)
    rbox(PW + 0.025, PD + 0.025, 0.04, 0.22, p['orange'], (X0, py, 0.78))
    fy = TUNNEL_Y - 0.005
    rbox(0.54, 0.04, 0.32, 0.02, dark, (X0, fy, 0.08))
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.27, depth=0.04, location=(X0, fy, 0.4), rotation=(math.pi / 2, 0, 0)); _done(bpy.context.object, dark)
    t = torus(0.31, 0.05, p['orange'], (X0, fy - 0.02, 0.4), (math.pi / 2, 0, 0)); cut_half(t, 0.39)
    for sx in (-0.31, 0.31): rbox(0.1, 0.1, 0.34, 0.03, p['orange'], (X0 + sx, fy - 0.02, 0.06))
    ball(0.05, p['lampw'], (X0, fy - 0.08, 0.82), seg=12); cyl(0.015, 0.1, p['char'], (X0, fy - 0.06, 0.86), bev=0.004)
    light(p, (X0 + 0.42, fy - 0.01, 0.62))
    # a little sign with a pick on the portal side
    rbox(0.24, 0.03, 0.16, 0.04, p['cream2'], (X0 + 0.62, TUNNEL_Y + 0.02, 0.5))
    rbox(0.14, 0.035, 0.035, 0.015, p['orange'], (X0 + 0.62, TUNNEL_Y + 0.0, 0.6), (0, 0.5, 0)); rbox(0.03, 0.035, 0.1, 0.012, p['char'], (X0 + 0.64, TUNNEL_Y + 0.0, 0.54), (0, 0.5, 0))

    # ---------- fresh air: a fan on top of the cliff, a duct down to the portal roof ----------
    F = Vector((X0 + 0.15, 0.85, 1.52))
    cyl(0.24, 0.24, p['cream'], tuple(F), bev=0.08); torus(0.24, 0.025, p['orange'], (F.x, F.y, F.z + 0.12))
    cyl(0.2, 0.03, p['char'], (F.x, F.y, F.z + 0.23), bev=0.01)
    for k in range(3):
        a = k * 2.094; rbox(0.16, 0.05, 0.015, 0.008, p['grey'], (F.x + math.cos(a) * 0.08, F.y + math.sin(a) * 0.08, F.z + 0.26), (0, 0, a))
    ball(0.035, p['orange'], (F.x, F.y, F.z + 0.27), seg=10)
    # the duct leaves the fan forwards, through the air above the lower steps, then straight down onto the portal roof
    tube([(F.x, F.y - 0.22, F.z + 0.12), (F.x, 0.3, F.z + 0.12), (F.x, 0.3, PH + 0.1)], 0.05, p['cream2'])
    cyl(0.08, 0.04, p['orange'], (F.x, 0.3, PH + 0.08), bev=0.015)
    light(p, (F.x + 0.2, F.y - 0.12, F.z + 0.2), 0.03)

    # ---------- rails: from inside the tunnel straight to the front ----------
    y0 = TUNNEL_Y + 0.05; L = y0 - RAIL_Y1; yc = (y0 + RAIL_Y1) / 2
    for s in (-0.11, 0.11): rbox(0.03, L, 0.03, 0.01, p['grey'], (X0 + s, yc, 0.025))
    n = 11
    for k in range(n): rbox(0.34, 0.05, 0.025, 0.01, p['char'], (X0, RAIL_Y1 + 0.08 + k * (L - 0.2) / (n - 1), 0.0))
    rbox(0.3, 0.06, 0.08, 0.03, p['orange'], (X0, RAIL_Y1 - 0.02, 0.0))

    # ---------- the train coming out: locomotive in front, a full cart behind it, coupled ----------
    locomotive(p, (X0, -0.52, 0.025), 0.62)
    cart(p, (X0, -0.12 + 0.03, 0.025), 0.6)
    tube([(X0, -0.33, 0.12), (X0, -0.27, 0.12)], 0.012, p['char'])

    # ---------- the tipping cart at the end of the rails and the bunker beside it ----------
    B = Vector((X0 + 0.72, RAIL_Y1 + 0.3, 0.0))
    rbox(0.5, 0.56, 0.36, 0.08, p['cream'], tuple(B))
    rbox(0.52, 0.58, 0.04, 0.08, p['orange'], (B.x, B.y, 0.36))
    rbox(0.42, 0.48, 0.02, 0.02, dark, (B.x, B.y, 0.355))
    for (dx, dy) in ((-0.1, -0.1), (0.08, -0.06), (0.0, 0.1), (-0.08, 0.14), (0.1, 0.12)):
        ball(0.075, p['ore'], (B.x + dx, B.y + dy, 0.37), seg=10)
    ball(0.05, p['crystal'], (B.x + 0.02, B.y - 0.02, 0.42), seg=8)
    tip = Vector((X0, RAIL_Y1 + 0.3, 0.05))
    before = set(bpy.data.objects)
    cart(p, tuple(tip), 0.6)
    parts = [o for o in bpy.data.objects if o not in before]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.transform.rotate(value=math.radians(-28), orient_axis='Y', center_override=(tip.x + 0.16, tip.y, tip.z))
    for k, (dx, dz) in enumerate(((0.3, 0.32), (0.36, 0.25))):
        ball(0.05, p['ore'], (tip.x + dx, tip.y + (k - 0.5) * 0.08, dz), seg=10)

    # ---------- covered conveyor from the bunker up into the silo ----------
    SI = Vector((B.x + 1.0, B.y + 0.15, 0.0)); SR = 0.34; SH = 0.95
    cyl(SR + 0.04, 0.06, p['char'], tuple(SI), bev=0.025)
    cyl(SR, SH, p['cream'], (SI.x, SI.y, 0.05), bev=0.24)
    torus(SR, 0.025, p['orange'], (SI.x, SI.y, 0.55)); vent(p, (SI.x, SI.y - 0.08, SH + 0.05), 0.1)
    for k in range(3): rbox(0.05, 0.03, 0.06, 0.015, p['teal'] if k < 2 else p['char'], (SI.x - SR + 0.01, SI.y - 0.05 + k * 0.07, 0.3), (0, 0, math.pi / 2))
    a = Vector((B.x + 0.18, B.y + 0.05, 0.3)); b = Vector((SI.x - 0.12, SI.y - 0.02, SH - 0.05))
    d = b - a; Lc = d.length; mid = (a + b) / 2
    ang_y = -math.atan2(d.z, math.hypot(d.x, d.y)); ang_z = math.atan2(d.y, d.x)
    for (w, h, zoff, m) in ((0.16, 0.12, -0.06, 'cream2'), (0.17, 0.03, 0.05, 'orange')):
        o = rbox(Lc, w, h, 0.05 if m == 'cream2' else 0.015, p[m], (0, 0, zoff))
        o.rotation_euler = (0, ang_y, ang_z); o.location = tuple(mid); apply_all([o])
    for tt in (0.35, 0.7):
        q = a + d * tt; cyl(0.025, q.z - 0.08, p['char'], (q.x, q.y, 0.0), bev=0.008)

    # ---------- a lamp post by the rails and a few loose rocks off the paths ----------
    lp = (X0 - 0.42, RAIL_Y1 + 0.4)
    cyl(0.02, 0.55, p['char'], (lp[0], lp[1], 0.0), bev=0.006); rbox(0.09, 0.07, 0.13, 0.02, p['cream'], (lp[0], lp[1], 0.55)); light(p, (lp[0], lp[1] - 0.045, 0.62), 0.028)
    for (x, y, r) in ((-1.2, -0.5, 0.11), (SI.x + 0.35, SI.y + 0.45, 0.1), (0.95, -0.05, 0.12)):
        ball(r, p['rock2'], (x, y, 0.0), (1, 1, 0.7), seg=14)

# ---------- shared bits of the survey buildings ----------
def flag(p, at, h=0.32):
    cyl(0.012, h, p['char'], at, bev=0.004)
    rbox(0.1, 0.012, 0.06, 0.01, p['orange'], (at[0] + 0.05, at[1], at[2] + h - 0.07))
    ball(0.02, p['teal'], (at[0], at[1], at[2] + h + 0.015), seg=8)

def hcyl(r, length, m, center, axis='x', bev=None):
    """a lying cylinder centred on `center`, its axis along x or y"""
    rot = (0, math.pi / 2, 0) if axis == 'x' else (math.pi / 2, 0, 0)
    return cyl(r, length, m, (center[0], center[1], center[2] - length / 2), rot, bev=bev)

def anemometer(p, at, h=0.5):
    """the weather mast that measures the air: three cups, a vane, a light"""
    x, y, z = at
    cyl(0.05, 0.06, p['char'], (x, y, z), bev=0.02); cyl(0.016, h, p['grey'], (x, y, z), bev=0.005)
    top = z + h
    for k in range(3):
        a = k * 2.094
        tube([(x, y, top), (x + math.cos(a) * 0.11, y + math.sin(a) * 0.11, top)], 0.008, p['char'])
        ball(0.032, p['orange'], (x + math.cos(a) * 0.11, y + math.sin(a) * 0.11, top), (1, 1, 0.8), seg=10)
    rbox(0.22, 0.015, 0.012, 0.005, p['char'], (x, y, top - 0.12), (0, 0, 0.6))
    rbox(0.07, 0.012, 0.065, 0.01, p['orange'], (x - 0.1 * math.cos(0.6), y - 0.1 * math.sin(0.6), top - 0.15), (0, 0, 0.6))
    light(p, (x, y, top + 0.045), 0.028)

# ---------- the geolocator (Joro picked idea G5, 05.11.2026): the seismic station: a weight drops on a plate, the stakes in a line hear the echo from the layers ----------
def b_geolocator(p):
    C = Vector((-0.45, 0.35, 0.0)); W, D, H, R = 1.0, 0.8, 0.62, 0.22
    rbox(W + 0.1, D + 0.1, 0.1, R + 0.05, p['char'], (C.x, C.y, 0.0))
    body = rbox(W, D, H, R, p['cream'], (C.x, C.y, 0.08), seg=5)
    rbox(W + 0.025, D + 0.025, 0.045, R, p['orange'], (C.x, C.y, 0.08 + H * 0.68))
    # inside the window: a screen with the wave the stakes heard
    def wave(cx, cy, fz):
        rbox(0.36, 0.14, 0.1, 0.03, p['cream2'], (cx, cy + 0.04, fz))
        rbox(0.3, 0.03, 0.16, 0.02, p['char'], (cx, cy + 0.11, fz + 0.1))
        pts = [(cx - 0.12 + k * 0.012, cy + 0.093, fz + 0.18 + 0.05 * math.sin(k * 0.9) * math.exp(-abs(k - 8) * 0.15)) for k in range(21)]
        tube(pts, 0.006, p['teal'])
    lit_room(p, body, 0.46, 0.3, 0.3, C.x - 0.18, C.y - D / 2 + 0.01, 0.28, 0.0, wave)
    door(p, C.x + 0.27, C.y - D / 2 - 0.02, 0.0, 0.24, 0.44, 0.08)
    # on the roof: a small antenna dish and the weather mast that measures the air
    RZ = 0.08 + H
    cyl(0.12, 0.06, p['cream2'], (C.x - 0.22, C.y + 0.05, RZ), bev=0.03)
    d = dome(0.16, p['cream'], (0, 0, 0), seg=28, sz=0.35); d.rotation_euler = (math.radians(130), 0, math.radians(-30)); d.location = (C.x - 0.22, C.y + 0.05, RZ + 0.2)
    t = torus(0.16, 0.018, p['orange'], (C.x - 0.22, C.y + 0.05, RZ + 0.2), (math.radians(130), 0, math.radians(-30)))
    cyl(0.025, 0.14, p['char'], (C.x - 0.22, C.y + 0.05, RZ + 0.05), bev=0.008)
    anemometer(p, (C.x + 0.25, C.y + 0.15, RZ), 0.45)

    # the thumper: a heavy weight between two posts, lifted by a cable, drops onto the steel plate on the ground
    T = Vector((0.6, 0.38, 0.0))
    rbox(0.86, 0.5, 0.06, 0.05, p['char'], (T.x, T.y, 0.0))
    cyl(0.2, 0.05, p['grey'], (T.x, T.y, 0.06), bev=0.015)
    torus(0.2, 0.012, p['orange'], (T.x, T.y, 0.1))
    PH = 1.12
    for sx in (-1, 1):
        cyl(0.06, 0.05, p['char'], (T.x + sx * 0.28, T.y, 0.06), bev=0.02)
        cyl(0.032, PH, p['orange'], (T.x + sx * 0.28, T.y, 0.06), bev=0.01)
    rbox(0.66, 0.1, 0.08, 0.03, p['cream'], (T.x, T.y, 0.06 + PH))
    rbox(0.2, 0.16, 0.12, 0.04, p['orange'], (T.x, T.y, 0.06 + PH + 0.08))
    light(p, (T.x + 0.06, T.y - 0.085, 0.06 + PH + 0.16), 0.022)
    vent(p, (T.x - 0.03, T.y + 0.02, 0.06 + PH + 0.2), 0.06)
    WZ = 0.52
    cyl(0.17, 0.2, p['cream'], (T.x, T.y, WZ), bev=0.06)
    torus(0.17, 0.02, p['orange'], (T.x, T.y, WZ + 0.1))
    for sx in (-1, 1):
        torus(0.05, 0.014, p['char'], (T.x + sx * 0.28, T.y, WZ + 0.1))
        hcyl(0.025, 0.08, p['char'], (T.x + sx * 0.215, T.y, WZ + 0.1), 'x', bev=0.008)
    cyl(0.03, 0.04, p['char'], (T.x, T.y, WZ + 0.2), bev=0.01)
    tube([(T.x, T.y, WZ + 0.24), (T.x, T.y, 0.06 + PH)], 0.008, p['char'])
    # the cable from the thumper to the station
    tube([(T.x - 0.28, T.y + 0.18, 0.075), (T.x - 0.44, T.y + 0.18, 0.075), (C.x + W / 2 + 0.085, T.y + 0.18, 0.04), (C.x + W / 2 + 0.085, T.y + 0.18, 0.25), (C.x + W / 2 - 0.02, T.y + 0.18, 0.25)], 0.014, p['char'])

    # the line of stakes (geophones) in front, joined by one cable that runs back to the station
    stakes = [(-1.0 + k * 0.4, -0.55) for k in range(6)]
    for (x, y) in stakes:
        cyl(0.028, 0.1, p['char'], (x, y, 0.0), bev=0.008)
        cyl(0.045, 0.05, p['orange'], (x, y, 0.1), bev=0.015)
        ball(0.022, p['teal'], (x, y, 0.165), seg=8)
    tube([(x, y, 0.015) for (x, y) in stakes], 0.01, p['char'])
    tube([(stakes[0][0], stakes[0][1], 0.015), (C.x - W / 2 - 0.12, stakes[0][1] + 0.1, 0.015), (C.x - W / 2 - 0.12, C.y - 0.1, 0.02), (C.x - W / 2 - 0.12, C.y - 0.1, 0.25), (C.x - W / 2 + 0.02, C.y - 0.1, 0.25)], 0.012, p['char'])
    for (x, y) in ((0.85, -0.95), (0.5, -1.1)): flag(p, (x, y, 0.0))

# ---------- shared bits of the homes ----------
D2R = math.radians

def tangent(fr): return (math.cos(fr), math.sin(fr))
def inward(fr): return (-math.sin(fr), math.cos(fr))

def beds(p, fr):
    """props for lit_room: two small beds against the back wall, side by side, each with a sheet and a pillow"""
    sheet, pillow = mat('bedsheet', '#7fc8ff', 0.85), mat('pillow', '#ffffff', 0.9)
    def f(cx, cy, fz):
        t, i = tangent(fr), inward(fr)
        for k in (-1, 1):
            bx, by = cx + t[0] * k * 0.065 + i[0] * 0.01, cy + t[1] * k * 0.065 + i[1] * 0.01
            rbox(0.11, 0.2, 0.05, 0.02, p['cream2'], (bx, by, fz), (0, 0, fr), seg=2)
            rbox(0.104, 0.13, 0.022, 0.01, sheet, (bx - i[0] * 0.03, by - i[1] * 0.03, fz + 0.045), (0, 0, fr), seg=2)
            rbox(0.08, 0.045, 0.026, 0.012, pillow, (bx + i[0] * 0.065, by + i[1] * 0.065, fz + 0.045), (0, 0, fr), seg=2)
    return f

def room(p, body, x, y, z, fr, w=0.28, h=0.24, depth=0.26):
    lit_room(p, body, w, h, depth, x, y, z, fr, beds(p, fr))

def bell(p, at, s=1.0):
    """a plant under a glass bell: outside the air is still thin, so the plants live under glass"""
    cyl(0.1 * s, 0.07 * s, p['orange'], at, bev=0.02 * s)
    bush(p, (at[0], at[1], at[2] + 0.04 * s), 0.55 * s)
    dome(0.12 * s, p['glass'], (at[0], at[1], at[2] + 0.07 * s), seg=24, sz=1.5)

def bench(p, at, rz=0.0):
    x, y, z = at
    for k in (-1, 1): rbox(0.03, 0.08, 0.06, 0.01, p['char'], (x + math.cos(rz) * k * 0.1, y + math.sin(rz) * k * 0.1, z), (0, 0, rz))
    rbox(0.28, 0.09, 0.025, 0.01, p['wood'], (x, y, z + 0.06), (0, 0, rz))

def tank(p, at, r=0.12, h=0.38):
    """the water tank on short legs: water for the people inside"""
    x, y, z = at
    for k in range(3):
        a = k * 2.094 + 0.5
        cyl(0.014, 0.08, p['char'], (x + math.cos(a) * r * 0.7, y + math.sin(a) * r * 0.7, z), bev=0.004)
    cyl(r, h, p['cream'], (x, y, z + 0.07), bev=r * 0.45)
    for zz in (0.35, 0.7): torus(r, 0.014, p['orange'], (x, y, z + 0.07 + h * zz))
    light(p, (x, y, z + 0.07 + h + 0.02), 0.022)

def air_unit(p, at, fr=0.0, s=1.0):
    """the air unit: it pulls in the thin air, cleans it and keeps the pressure inside; a fan grille on the front"""
    x, y, z = at; n = (math.sin(fr), -math.cos(fr))
    rbox(0.28 * s, 0.22 * s, 0.24 * s, 0.06 * s, p['cream2'], (x, y, z), (0, 0, fr))
    fx, fy = x + n[0] * 0.11 * s, y + n[1] * 0.11 * s
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.075 * s, depth=0.02, location=(fx, fy, z + 0.12 * s), rotation=(math.pi / 2, 0, fr))
    _done(bpy.context.object, p['char'])
    torus(0.075 * s, 0.012 * s, p['orange'], (fx + n[0] * 0.01, fy + n[1] * 0.01, z + 0.12 * s), (math.pi / 2, 0, fr))
    for k in (-1, 0, 1): rbox(0.13 * s, 0.012, 0.01, 0.004, p['grey'], (fx + n[0] * 0.012, fy + n[1] * 0.012, z + (0.115 + k * 0.035) * s), (0, 0, fr))
    light(p, (x + math.cos(fr) * 0.1 * s + n[0] * 0.1 * s, y + math.sin(fr) * 0.1 * s + n[1] * 0.1 * s, z + 0.21 * s), 0.018)


# ======================================================================================
# the colonists' home (Joro picked idea C, 06.11.2026): the block of flats around a winter garden. At first one block with two rooms and a glass hall; by level 10
#    two wings come forward and the yard between them is roofed with glass: a warm garden with a tree and benches,
#    the common room of the house. At level 11 the second floor goes on all three wings.
# ======================================================================================
def b_home(p, lvl):
    two = lvl >= 11
    FH = 0.5; H = FH * (2 if two else 1) + 0.04
    rbox_r = 0.15
    if lvl < 5:
        W, D = 1.4, 0.7; y0 = 0.15
        rbox(W + 0.1, D + 0.1, 0.08, rbox_r + 0.05, p['char'], (0, y0, 0))
        body = rbox(W, D, H, rbox_r, p['cream'], (0, y0, 0.08), seg=5)
        rbox(W + 0.02, D + 0.02, 0.04, rbox_r, p['orange'], (0, y0, 0.08 + H - 0.14))
        for x in (-0.42, 0.42): room(p, body, x, y0 - D / 2 + 0.01, 0.2, 0.0)
        # the glass hall at the front with the airlock door
        rbox(0.46, 0.34, 0.06, 0.06, p['char'], (0, y0 - D / 2 - 0.15, 0.0))
        rbox(0.42, 0.3, 0.46, 0.08, p['glass'], (0, y0 - D / 2 - 0.15, 0.06))
        rbox(0.46, 0.34, 0.035, 0.06, p['orange'], (0, y0 - D / 2 - 0.15, 0.52))
        door(p, 0, y0 - D / 2 - 0.31, 0.0, 0.2, 0.32, 0.06)
        bush(p, (0.1, y0 - D / 2 - 0.12, 0.06), 0.5)
        air_unit(p, (0.3, y0 + 0.1, 0.08 + H), 0.0, 0.9)
        vent(p, (-0.35, y0 + 0.05, 0.08 + H), 0.09)
        tank(p, (W / 2 + 0.2, y0 + 0.1, 0.0))
        tube([(W / 2 + 0.1, y0 + 0.1, 0.3), (W / 2 - 0.02, y0 + 0.1, 0.3)], 0.016, p['char'])
        return
    # the back wing and the two side wings
    BW, BD, SW, SD = 2.3, 0.62, 0.62, 0.98
    yb = 0.36; ys = -0.33
    rbox(BW + 0.1, BD + 0.1, 0.08, rbox_r + 0.05, p['char'], (0, yb, 0))
    for sx in (-1, 1): rbox(SW + 0.1, SD + 0.1, 0.08, rbox_r + 0.05, p['char'], (sx * (BW / 2 - SW / 2), ys, 0))
    back = rbox(BW, BD, H, rbox_r, p['cream'], (0, yb, 0.08), seg=5)
    wings = {sx: rbox(SW, SD, H, rbox_r, p['cream'], (sx * (BW / 2 - SW / 2), ys, 0.08), seg=5) for sx in (-1, 1)}
    for z in ((0.08 + FH, 0.08 + H - 0.14) if two else (0.08 + H - 0.14,)):
        rbox(BW + 0.02, BD + 0.02, 0.035, rbox_r, p['orange'], (0, yb, z))
        for sx in (-1, 1): rbox(SW + 0.02, SD + 0.02, 0.035, rbox_r, p['orange'], (sx * (BW / 2 - SW / 2), ys, z))
    wx = BW / 2 - SW / 2
    yf = ys - SD / 2
    for fl in ((0, 1) if two else (0,)):
        z = 0.2 + fl * FH
        for sx in (-1, 1):
            room(p, wings[sx], sx * wx, yf + 0.01, z, 0.0)                      # the front end of the wing
            for yy in ((-0.5, -0.12) if sx > 0 else (-0.3,)):                     # the outer side
                fr = math.pi / 2 if sx > 0 else -math.pi / 2
                room(p, wings[sx], sx * (BW / 2 - 0.01), yy, z, fr)
    # the winter garden between the wings: glass walls and roof, a tree, plants and benches inside
    GW = BW - 2 * SW; gy0, gy1 = yf, yb - BD / 2
    gyc, gd = (gy0 + gy1) / 2, gy1 - gy0
    gh = H - 0.06
    rbox(GW + 0.1, gd + 0.06, 0.08, 0.04, p['char'], (0, gyc, 0.0))
    rbox(GW + 0.04, gd, 0.02, 0.01, p['floor'], (0, gyc, 0.08))
    cyl(0.18, 0.03, p['soil'], (0, gyc + 0.08, 0.1), bev=0.0)
    cyl(0.03, 0.22 + (0.3 if two else 0), p['wood'], (0, gyc + 0.08, 0.12), bev=0.008)
    for (dx, dz, r) in ((0, 0.36, 0.15), (0.1, 0.31, 0.11), (-0.1, 0.32, 0.11)):
        ball(r * (1.3 if two else 1), p['leaf'] if r > 0.12 else p['leaf2'], (dx, gyc + 0.08, dz + (0.3 if two else 0)), seg=16)
    for sx in (-1, 1):
        bush(p, (sx * 0.3, gyc - 0.22, 0.1), 0.6)
        bench(p, (sx * 0.28, gyc + 0.1, 0.1), D2R(90))
    rbox(GW + 0.04, 0.03, gh, 0.01, p['glass'], (0, gy0 + 0.01, 0.1))
    rbox(GW + 0.04, gd, 0.025, 0.01, p['glass'], (0, gyc, 0.08 + gh))
    for xx in (-GW / 4, GW / 4): rbox(0.025, 0.04, gh, 0.01, p['char'], (xx, gy0 + 0.0, 0.1))
    rbox(GW + 0.06, 0.05, 0.035, 0.01, p['orange'], (0, gy0, 0.08 + gh - 0.02))
    # the airlock door in the middle of the glass front
    rbox(0.36, 0.2, 0.44, 0.08, p['cream2'], (0, gy0 - 0.08, 0.08))
    door(p, 0, gy0 - 0.19, 0.0, 0.2, 0.32, 0.08)
    rbox(0.4, 0.12, 0.03, 0.02, p['orange'], (0, gy0 - 0.2, 0.52))
    # on the roof of the back wing: the air unit, solar tiles, a vent; at level 20 planters on the wings
    RZ = 0.08 + H
    air_unit(p, (-0.6, yb + 0.05, RZ), 0.0, 1.0)
    for k in range(3): rbox(0.26, 0.22, 0.025, 0.02, p['navy'], (0.1 + k * 0.3, yb + 0.06, RZ + 0.03), (D2R(-12), 0, 0))
    for k in range(3): rbox(0.03, 0.03, 0.03, 0.01, p['char'], (0.1 + k * 0.3, yb + 0.06, RZ))
    vent(p, (-0.95, yb + 0.06, RZ), 0.08)
    tank(p, (BW / 2 + 0.2, yb + 0.1, 0.0))
    tube([(BW / 2 + 0.1, yb + 0.1, 0.3), (BW / 2 - 0.02, yb + 0.1, 0.3)], 0.016, p['char'])
    if lvl >= 10:
        for sx in (-1, 1): bell(p, (sx * 0.3, gy0 - 0.2, 0.0), 0.8)
    if lvl >= 20:
        for sx in (-1, 1):
            rbox(0.4, 0.5, 0.06, 0.04, p['orange'], (sx * wx, ys - 0.1, RZ))
            rbox(0.36, 0.46, 0.02, 0.03, p['soil'], (sx * wx, ys - 0.1, RZ + 0.05))
            bush(p, (sx * wx - 0.08, ys - 0.2, RZ + 0.06), 0.6); bush(p, (sx * wx + 0.08, ys + 0.02, RZ + 0.06), 0.5)
            dome(0.26, p['glass'], (sx * wx, ys - 0.1, RZ + 0.06), seg=32, sz=0.7)


# ---------- the research station's rooms; (u, v) is across the window and into the room ----------
def frame(cx, cy, fr):
    t, i = tangent(fr), inward(fr)
    return lambda u, v: (cx + t[0] * u + i[0] * v, cy + t[1] * u + i[1] * v)

def chair(p, at, fr, z):
    """a small chair facing into the room (towards the desk); its back is on the window side"""
    x, y = at; i = inward(fr)
    cyl(0.008, 0.06, p['char'], (x, y, z), bev=0.003)
    rbox(0.07, 0.065, 0.018, 0.008, p['orange'], (x, y, z + 0.06), (0, 0, fr), seg=2)
    rbox(0.07, 0.016, 0.07, 0.008, p['orange'], (x - i[0] * 0.03, y - i[1] * 0.03, z + 0.075), (0, 0, fr), seg=2)

def screen(p, at, fr, z, w=0.1, h=0.065):
    """a screen on a short stand; the teal face looks out of the room, towards whoever sits at it"""
    x, y = at; i = inward(fr)
    cyl(0.006, 0.03, p['char'], (x, y, z), bev=0.002)
    rbox(w, 0.012, h, 0.008, p['char'], (x, y, z + 0.025), (0, 0, fr), seg=2)
    rbox(w - 0.014, 0.004, h - 0.014, 0.003, p['teal'], (x - i[0] * 0.007, y - i[1] * 0.007, z + 0.032), (0, 0, fr), seg=1)

def desk(p, L, fr, fz, u=0.0, v=0.03, w=0.24, top=0.085):
    """a desk with a screen and a chair: the place where someone works"""
    rbox(w, 0.1, 0.018, 0.008, p['cream2'], (*L(u, v), fz + top), (0, 0, fr), seg=2)
    for s in (-1, 1): rbox(0.018, 0.08, top, 0.005, p['char'], (*L(u + s * (w / 2 - 0.02), v), fz), (0, 0, fr), seg=1)
    screen(p, L(u, v + 0.03), fr, fz + top + 0.018)
    chair(p, L(u, v - 0.095), fr, fz)

def jars(p, L, fr, z, u, v, n=3):
    """sample jars: glass with rock, soil and a seedling inside"""
    fill = [p['ore'], p['soil'], p['leaf'], p['rock']]
    for k in range(n):
        x, y = L(u + (k - (n - 1) / 2) * 0.045, v)
        cyl(0.017, 0.035, fill[k % 4], (x, y, z), bev=0.006)
        cyl(0.02, 0.055, p['glass'], (x, y, z), bev=0.008)
        cyl(0.02, 0.01, p['orange'], (x, y, z + 0.055), bev=0.004)

def servers(p, fr, racks=3):
    """slot of the computer room: racks with blinking lights along the back wall, a console with two screens"""
    def f(cx, cy, fz):
        L = frame(cx, cy, fr)
        for k in range(racks):
            u = (k - (racks - 1) / 2) * 0.12
            rbox(0.1, 0.08, 0.2, 0.015, p['char'], (*L(u, 0.06), fz), (0, 0, fr), seg=2)
            for r in range(5):
                rbox(0.06, 0.006, 0.008, 0.003, p['teal'] if (r + k) % 2 else p['win'], (*L(u - 0.005, 0.017), fz + 0.04 + r * 0.03), (0, 0, fr), seg=1)
        rbox(0.22, 0.08, 0.018, 0.008, p['cream2'], (*L(0, -0.03), fz + 0.08), (0, 0, fr), seg=2)
        for s in (-1, 1): rbox(0.018, 0.06, 0.08, 0.005, p['char'], (*L(s * 0.09, -0.03), fz), (0, 0, fr), seg=1)
        for s in (-1, 1): screen(p, L(s * 0.055, -0.01), fr, fz + 0.098, 0.09, 0.055)
        chair(p, L(0, -0.11), fr, fz)
    return f

def office(p, fr):
    """the scientist's office: a desk with a screen and a chair, a shelf of sample jars on the back wall"""
    def f(cx, cy, fz):
        L = frame(cx, cy, fr)
        desk(p, L, fr, fz, -0.04, 0.03)
        rbox(0.1, 0.05, 0.012, 0.004, p['cream2'], (*L(0.13, 0.07), fz + 0.13), (0, 0, fr), seg=1)
        for s in (-1, 1): rbox(0.01, 0.04, 0.13, 0.003, p['char'], (*L(0.13 + s * 0.045, 0.07), fz), (0, 0, fr), seg=1)
        jars(p, L, fr, fz + 0.142, 0.13, 0.07, 2)
        bush(p, (*L(0.14, 0.0), fz), 0.32)
    return f

def dish(p, at, r=0.3, tilt=70, turn=-55):
    """a dish on a short mast, facing the sky, with three struts to the feed"""
    import mathutils
    x, y, z = at
    cyl(0.04, 0.24, p['char'], (x, y, z), bev=0.012)
    rot = (math.radians(tilt), 0, math.radians(turn)); c = Vector((x, y, z + 0.2 + r * 0.85))
    d = dome(r, p['cream'], (0, 0, 0), seg=40, sz=0.3)
    sm = d.modifiers.new('shell', 'SOLIDIFY'); sm.thickness = 0.02; _apply(d)   # a shell, so it is solid from the front too
    d.rotation_euler = (rot[0] + math.pi, 0, rot[2]); d.location = tuple(c)
    torus(r, 0.035, p['orange'], tuple(c), rot)
    M = mathutils.Euler(rot).to_matrix(); hub = c + M @ Vector((0, 0, r * 0.45))
    for k in range(3):
        a = k * 2.094 + 0.5; rim = c + M @ Vector((math.cos(a) * r * 0.97, math.sin(a) * r * 0.97, 0))
        tube([tuple(rim), tuple(hub)], 0.01, p['char'])
    light(p, tuple(hub), 0.035)

# ======================================================================================
# the research station (Joro picked idea B, 06.11.2026): the observatory and the computer room. The telescope in the dome looks at the sky (the orbit, the moon, the
#    weather); the racks in the computer room work out the projects, and the dish on its roof talks to the Ark and
#    the orbit. The computers get warm, so a cooler with two fans sits next to the dish. At level 10 the computer room
#    is longer with a second console and its racks (slot 2), and the scientist's office is in the drum.
# ======================================================================================
def b_research(p, lvl):
    two = lvl >= 10
    DX, DY, DR, DH = -0.48, 0.18, 0.5, 0.56
    cyl(DR + 0.06, 0.1, p['char'], (DX, DY, 0.0), bev=0.03, verts=56)
    drum = cyl(DR, DH, p['cream'], (DX, DY, 0.08), bev=0.05, verts=56)
    torus(DR + 0.004, 0.024, p['orange'], (DX, DY, 0.2))
    TZ = 0.08 + DH
    torus(DR - 0.01, 0.03, p['char'], (DX, DY, TZ - 0.005))
    dm = dome(DR - 0.02, p['cream'], (DX, DY, TZ - 0.005), seg=48, sz=0.92)
    # the open shutter: a dark band from the top of the dome down its front, the telescope looking out of it
    az = D2R(-135)   # to the front left, so the map camera sees the telescope from the side
    band = ball(DR - 0.012, p['char'], (DX, DY, TZ - 0.005), (1, 1, 0.92), seg=48)
    sl = cutter(0.2, DR + 0.2, DR + 0.1, (DX + math.cos(az) * (DR + 0.2) / 2, DY + math.sin(az) * (DR + 0.2) / 2, TZ + 0.02), (0, 0, az + math.pi / 2), 0.02)
    m = band.modifiers.new('slit', 'BOOLEAN'); m.operation = 'INTERSECT'; m.object = sl; m.solver = 'EXACT'
    from kb import _apply as _ap
    _ap(band); bpy.data.objects.remove(sl, do_unlink=True)
    for poly in band.data.polygons: poly.use_smooth = True
    # the telescope leaves the dome about 0.31 along its axis, so most of the tube is out in the open slit
    el = D2R(40); dvec = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    piv = Vector((DX, DY, TZ + 0.18))
    a, b = piv - dvec * 0.1, piv + dvec * 0.7
    tube([tuple(a), tuple(b)], 0.08, p['cream2'])
    tube([tuple(piv + dvec * 0.42), tuple(piv + dvec * 0.5)], 0.088, p['orange'])
    c = piv + dvec * 0.71
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.065, depth=0.02, location=tuple(c), rotation=Vector((0, 0, 1)).rotation_difference(dvec).to_euler())
    _done(bpy.context.object, p['glassb'])
    light(p, (DX + math.cos(az + 0.9) * (DR - 0.01), DY + math.sin(az + 0.9) * (DR - 0.01), TZ + 0.03), 0.026)
    # the drum: portholes at level 1; at level 10 the scientist's office looks out of it
    if two:
        th = D2R(-105); fr = th + math.pi / 2
        lit_room(p, drum, 0.36, 0.26, 0.3, DX + math.cos(th) * (DR - 0.025), DY + math.sin(th) * (DR - 0.025), 0.3, fr, office(p, fr))
    else:
        for k, th in enumerate((D2R(-110), D2R(-140))):
            porthole(p, (DX + math.cos(th) * DR, DY + math.sin(th) * DR, 0.42), (math.cos(th), math.sin(th)), 0.06)
    # the computer room in front of the drum, to the right
    AW = 1.62 if two else 1.2
    AX, AY, AD, AH, AR = (0.56 if two else 0.36), -0.14, 0.86, 0.66, 0.18
    rbox(AW + 0.1, AD + 0.1, 0.1, AR + 0.05, p['char'], (AX, AY, 0.0))
    room_box = rbox(AW, AD, AH, AR, p['cream'], (AX, AY, 0.08), seg=6)
    slots = (AX - 0.4, AX + 0.1) if two else (AX - 0.15,)
    for k, x in enumerate(slots):
        lit_room(p, room_box, 0.44, 0.34, 0.32, x, AY - AD / 2 + 0.01, 0.26, 0.0, servers(p, 0.0, 3), back='char')
    rbox(AW + 0.025, AD + 0.025, 0.045, AR, p['orange'], (AX, AY, 0.16))
    door(p, AX + (0.48 if two else 0.25), AY - AD / 2 - 0.02, 0.0, 0.22, 0.44, 0.08)
    RZ = 0.08 + AH
    # on its roof: the dish that talks to the Ark and the orbit, and the cooler for the racks
    dish(p, (AX + AW / 2 - 0.3, AY + 0.12, RZ - 0.01), 0.28, 70, -50)
    coolers = (AX - 0.4, AX + 0.05) if two else (AX - 0.2,)
    for x in coolers:
        rbox(0.38, 0.24, 0.12, 0.05, p['cream2'], (x, AY + 0.08, RZ - 0.01))
        for s in (-1, 1):
            cyl(0.065, 0.02, p['char'], (x + s * 0.09, AY + 0.08, RZ + 0.1), bev=0.005)
            torus(0.065, 0.012, p['orange'], (x + s * 0.09, AY + 0.08, RZ + 0.12))
            rbox(0.1, 0.012, 0.008, 0.004, p['grey'], (x + s * 0.09, AY + 0.08, RZ + 0.12), (0, 0, D2R(30 * s)))
        light(p, (x, AY - 0.03, RZ + 0.12), 0.02)

# ---------- the build drone (06.11.2026, proposal; docs/build-sequence.md): it flies out of the Ark, surveys the plot with a
# line laser, marks the footprint on the ground and prints the building layer by layer from a paste of crushed stone and a
# carbon binder, the way drones printed with cement in the lab (Aerial-AM, Imperial College and Empa, 2022). Big ducted
# rotors, because the air is thin. A camera at the front (no scanner: docs/levels.md rule 8); under the body the nozzle on a
# gimbal with the small survey laser beside it; on top the orange cartridge with the paste.
def b_drone(p):
    import mathutils
    BW, BD = 0.26, 0.2
    rbox(BW, BD, 0.1, 0.05, p['cream'], (0, 0, 0.06), seg=4)
    rbox(BW + 0.006, BD + 0.006, 0.018, 0.05, p['orange'], (0, 0, 0.095))
    # the cartridge with the paste, and its cap
    cyl(0.055, 0.065, p['orange'], (0, 0.03, 0.155), bev=0.02)
    cyl(0.058, 0.014, p['char'], (0, 0.03, 0.218), bev=0.006)
    # the camera at the front: a dark glass eye in a teal ring
    ball(0.032, p['char'], (0, -BD / 2 + 0.012, 0.11), seg=16)
    torus(0.034, 0.006, p['teal'], (0, -BD / 2 + 0.006, 0.11), (math.pi / 2, 0, 0))
    # four ducted rotors on short arms
    for sx in (-1, 1):
        for sy in (-1, 1):
            c = Vector((sx * 0.215, sy * 0.19, 0.13)); R = 0.075
            root = Vector((sx * (BW / 2 - 0.02), sy * (BD / 2 - 0.02), 0.13))
            d = (c - root); d.z = 0; d.normalize()
            tube([tuple(root), tuple(c - d * (R + 0.012))], 0.013, p['char'])
            torus(R, 0.014, p['cream'], tuple(c))
            torus(R + 0.004, 0.006, p['orange'], (c.x, c.y, c.z + 0.012))
            # the hub hangs on a cross strut inside the duct, below the blades
            rbox(2 * R, 0.01, 0.008, 0.003, p['char'], (c.x, c.y, c.z - 0.012), (0, 0, math.atan2(d.y, d.x)))
            cyl(0.014, 0.022, p['char'], (c.x, c.y, c.z - 0.006), bev=0.005)
            for a in (0.4, 0.4 + math.pi / 2):
                rbox(0.118, 0.016, 0.004, 0.003, p['grey'], (c.x, c.y, c.z + 0.012), (0, 0, a + (0.3 if sx * sy > 0 else -0.3)))
            light(p, (c.x + d.x * (R + 0.012), c.y + d.y * (R + 0.012), c.z + 0.016), 0.012)
    # the print head on a gimbal under the body: the nozzle and the survey laser beside it
    cyl(0.032, 0.02, p['char'], (0, 0, 0.04), bev=0.008)
    ball(0.026, p['char'], (0, 0, 0.038), seg=14)
    cyl(0.012, 0.03, p['orange'], (0, 0, 0.012), bev=0.004)
    cyl(0.006, 0.012, p['char'], (0, 0, 0.002), bev=0.002)
    ball(0.01, p['teal'], (0.026, -0.012, 0.024), seg=10)
    # landing skids
    for sx in (-1, 1):
        rbox(0.016, 0.22, 0.012, 0.006, p['char'], (sx * 0.085, 0, 0.0))
        for sy in (-1, 1): cyl(0.006, 0.05, p['char'], (sx * 0.085, sy * 0.07, 0.012), bev=0.002)

# ======================================================================================
# the collector rover (Joro, 11.11.2026: it replaces the capsules): from level 2 a small rover drives round the canyon and
#    comes back with stone, carbon or a boost; the player taps it to unload, and while nobody plays it waits full at the
#    base. Six wheels on a rocker-bogie, like the rovers on Mars, so it climbs over stones; the camera mast with two eyes
#    and the radio whip at the front left (from level 18 the Ark's antenna guides it further); the arm at the front right
#    has just lifted a stone over the bin; a small solar panel between them; the bin at the back is full of stone and
#    carbon, tips back on its hinge to unload, and three teal lights on its side show how full it is. About 2.2 m long
#    at the map's 4.15 m a unit. Front = -y, like the doors of the buildings.
# ======================================================================================
def b_rover(p):
    BW, BD, BZ, BH = 0.30, 0.46, 0.14, 0.13          # the body: width (x), length (y), its bottom and its height
    TOP = BZ + BH
    rbox(BW + 0.01, BD + 0.01, 0.035, 0.05, p['char'], (0, 0, BZ - 0.01))          # the dark base
    rbox(BW, BD, BH, 0.05, p['cream'], (0, 0, BZ))
    rbox(BW + 0.008, BD + 0.008, 0.016, 0.05, p['orange'], (0, 0, BZ + 0.085))   # the orange stripe
    # the front: two warm headlights for the night and an orange bumper; the back: two teal lights
    for sx in (-1, 1):
        ball(0.016, p['lampw'], (sx * 0.09, -BD / 2 - 0.002, BZ + 0.06), seg=14)
        torus(0.018, 0.004, p['char'], (sx * 0.09, -BD / 2 - 0.004, BZ + 0.06), (math.pi / 2, 0, 0))
        light(p, (sx * 0.1, BD / 2 + 0.002, BZ + 0.06), 0.012)
    rbox(0.2, 0.03, 0.022, 0.01, p['orange'], (0, -BD / 2 - 0.006, BZ + 0.004))
    # six wheels on a rocker-bogie each side: the rocker turns on a pivot on the body, carries the front wheel and,
    # at its back end, the bogie with the middle and rear wheels
    WR, WW, WX = 0.065, 0.05, 0.215                  # wheel radius, width, centre off the middle
    AX = BW / 2 + 0.022                              # where the arms run, between the body and the wheels
    for sx in (-1, 1):
        P_ = (sx * AX, -0.02, 0.178); B_ = (sx * AX, 0.1, 0.155)
        for c, r in ((P_, 0.022), (B_, 0.017)):    # the pivots: a disc on the body, a smaller one on the bogie
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=0.014, location=(c[0] - sx * 0.008, c[1], c[2]), rotation=(0, math.pi / 2, 0))
            _done(bpy.context.object, p['cream2'])
        for (wy, knee) in ((-0.2, 0.125), (0.0, 0.112), (0.2, 0.112)):
            top = P_ if wy < -0.1 else B_
            k = (sx * AX, wy, knee); hub = (sx * AX, wy, WR)
            tube([top, k, hub], 0.01, p['char'])
            tube([hub, (sx * (WX - WW / 2 + 0.004), wy, WR)], 0.009, p['char'])          # the axle stub
            # the tyre, the cream hub with an orange ring
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=WR, depth=WW, location=(sx * WX, wy, WR), rotation=(0, math.pi / 2, 0))
            o = bpy.context.object; bv = o.modifiers.new('b', 'BEVEL'); bv.width = 0.016; bv.segments = 3; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
            _apply(o); _done(o, p['char'])
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.03, depth=0.012, location=(sx * (WX + WW / 2 - 0.002), wy, WR), rotation=(0, math.pi / 2, 0))
            _done(bpy.context.object, p['cream'])
            torus(0.03, 0.005, p['orange'], (sx * (WX + WW / 2 + 0.004), wy, WR), (0, math.pi / 2, 0))
        tube([P_, B_], 0.01, p['char'])
    # the bin at the back: open on top, full of stone and carbon; it tips back on the hinge to unload
    GW, GD, GH, G0, G1 = 0.26, 0.2, 0.12, 0.0, 0.2
    gy = (G0 + G1) / 2
    bin_ = rbox(GW, GD, GH, 0.035, p['cream2'], (0, gy, TOP))
    cut(bin_, cutter(GW - 0.04, GD - 0.04, GH, (0, gy, TOP + 0.03), r=0.02))
    rbox(GW + 0.008, GD + 0.008, 0.014, 0.035, p['orange'], (0, gy, TOP + GH - 0.03))
    rbox(GW - 0.044, GD - 0.044, 0.004, 0.015, p['char'], (0, gy, TOP + 0.03))       # the dark floor inside
    ball(1.0, p['rock2'], (0, gy, TOP + 0.078), (0.104, 0.074, 0.046), seg=16)       # the heap
    for (x, y, r, m) in ((-0.06, 0.07, 0.024, 'rock'), (-0.02, 0.12, 0.022, 'ore'), (0.02, 0.085, 0.02, 'rock'),
                         (-0.07, 0.14, 0.019, 'ore'), (0.03, 0.14, 0.018, 'rock2'), (-0.03, 0.06, 0.017, 'ore')):
        ball(r, p[m], (x, y, TOP + 0.112), (1.15, 0.9, 0.75), seg=10)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.01, depth=0.2, location=(0, G1 + 0.006, TOP + 0.012), rotation=(0, math.pi / 2, 0))
    _done(bpy.context.object, p['char'])                 # the hinge
    for k in range(3):                                   # how full it is: three teal lights on the side the camera sees
        light(p, (GW / 2 + 0.001, G0 + 0.05 + k * 0.05, TOP + 0.06), 0.01)
    # the solar panel on the front deck, and a small vent behind it that cools the battery
    rbox(0.115, 0.13, 0.012, 0.012, p['cream2'], (0, -0.135, TOP - 0.002))
    rbox(0.1, 0.115, 0.006, 0.006, p['navy'], (0, -0.135, TOP + 0.008), seg=2)
    cyl(0.016, 0.022, p['cream2'], (0, -0.035, TOP - 0.002), bev=0.006)
    ball(0.028, p['char'], (0, -0.035, TOP + 0.026), (1, 1, 0.55), seg=16)
    # the camera mast at the front left: two dark eyes in teal rings, an orange band, the radio whip with a teal tip
    MX, MY = -0.09, -0.17
    cyl(0.012, 0.2, p['char'], (MX, MY, TOP - 0.002), bev=0.004, verts=16)
    rbox(0.1, 0.055, 0.05, 0.02, p['cream'], (MX, MY, TOP + 0.198))
    rbox(0.104, 0.059, 0.01, 0.02, p['orange'], (MX, MY, TOP + 0.206))
    for dx in (-0.024, 0.024):
        ball(0.014, p['char'], (MX + dx, MY - 0.026, TOP + 0.226), seg=14)
        torus(0.015, 0.0035, p['teal'], (MX + dx, MY - 0.03, TOP + 0.226), (math.pi / 2, 0, 0))
    tube([(MX - 0.035, MY + 0.01, TOP + 0.246), (MX - 0.035, MY + 0.01, TOP + 0.34)], 0.004, p['char'])
    ball(0.009, p['teal'], (MX - 0.035, MY + 0.01, TOP + 0.345), seg=10)
    # the arm at the front right: turret, shoulder, elbow, wrist, and the scoop held over the bin with a stone in it
    AXx, AY = 0.095, -0.17
    cyl(0.022, 0.026, p['char'], (AXx, AY, TOP - 0.002), bev=0.008)
    sh, el, wr = (AXx, AY, TOP + 0.036), (AXx, -0.13, TOP + 0.16), (0.08, -0.025, TOP + 0.185)
    tube([sh, el], 0.014, p['cream']); tube([el, wr], 0.012, p['cream'])
    for c, r in ((sh, 0.019), (el, 0.019), (wr, 0.015)): ball(r, p['char'], c, seg=14)
    sc = (0.07, 0.03, TOP + 0.175)
    tube([wr, (sc[0] + 0.004, sc[1] - 0.03, sc[2] + 0.002)], 0.008, p['char'])
    s = dome(0.034, p['orange'], (0, 0, 0), seg=20); s.rotation_euler = (math.pi + 0.35, 0, 0); s.location = sc
    bpy.context.view_layer.objects.active = s; bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    ball(0.016, p['rock'], (sc[0], sc[1] + 0.003, sc[2] - 0.006), (1.1, 1, 0.8), seg=10)

# ======================================================================================
# the smelter (level 11, docs/levels.md): iron ore + carbon + power -> steel, next to the silicon furnace. An electric
#    furnace, the way small steelworks melt today: a round vessel with a lid, three thick graphite electrodes (graphite is
#    carbon) down through the lid on orange arms from a mast, fat cables from the arms to the transformer, because it eats
#    a lot of power. The way of the material: the hopper at the back left holds iron ore and carbon, a belt tips them into
#    the lid; the melt runs out of the spout at the front into a ladle, and the cast steel bars wait on a pallet. The
#    fumes go from the top of the lid through a duct into the filter tower (the filter is studied on the same level), so
#    no smoke rises. The engineer works in the cabin at the front left, at a desk behind a lit window.
# ======================================================================================
def b_smelter(p):
    FX, FY, R = 0.15, 0.1, 0.5
    LZ = 0.08 + 0.45                                     # the top of the vessel, where the lid sits
    cyl(R + 0.06, 0.1, p['char'], (FX, FY, 0.0), bev=0.03, verts=56)
    cyl(R, 0.45, p['cream'], (FX, FY, 0.08), bev=0.05, verts=56)
    torus(R + 0.004, 0.026, p['orange'], (FX, FY, 0.36))
    torus(R - 0.01, 0.03, p['char'], (FX, FY, LZ - 0.005))
    LR, LS = R - 0.02, 0.45
    dome(LR, p['cream'], (FX, FY, LZ - 0.005), seg=48, sz=LS)
    lid_z = lambda r: LZ - 0.005 + LR * LS * math.sqrt(max(0.0, 1 - (r / LR) ** 2))
    light(p, (FX + math.cos(D2R(-60)) * (R + 0.01), FY + math.sin(D2R(-60)) * (R + 0.01), 0.45), 0.024)
    # the mast with the three electrode arms, each at its own height, so they pass over one another
    MX, MY = 0.88, -0.1
    cyl(0.1, 0.06, p['char'], (MX, MY, 0.0), bev=0.02)
    cyl(0.075, 1.3, p['cream'], (MX, MY, 0.05), bev=0.03)
    torus(0.076, 0.016, p['orange'], (MX, MY, 0.5))
    light(p, (MX, MY, 1.37), 0.026)
    for ang, az in ((330, 1.06), (90, 1.13), (210, 1.2)):
        a = D2R(ang); ex, ey = FX + math.cos(a) * 0.19, FY + math.sin(a) * 0.19
        z0 = lid_z(0.19)
        cyl(0.085, 0.05, p['orange'], (ex, ey, z0 - 0.02), bev=0.015)          # the collar where it goes through the lid
        cyl(0.055, az + 0.06 - z0, p['char'], (ex, ey, z0), bev=0.01, verts=24) # the graphite electrode
        torus(0.06, 0.016, p['cream2'], (ex, ey, az))                          # the clamp
        tube([(MX, MY, az), (ex, ey, az)], 0.032, p['orange'])                 # the arm
    # the transformer behind the mast, the fat cables from the mast to it, and the line to the panels and batteries
    TX, TY = 1.08, 0.3
    rbox(0.36, 0.38, 0.06, 0.05, p['char'], (TX, TY, 0.0))
    rbox(0.32, 0.34, 0.34, 0.06, p['cream'], (TX, TY, 0.05))
    rbox(0.325, 0.345, 0.03, 0.06, p['orange'], (TX, TY, 0.27))
    for k in range(4): rbox(0.012, 0.26, 0.2, 0.005, p['char'], (TX + 0.163, TY - 0.09 + k * 0.06, 0.07), (0, 0, 0), seg=1)
    for k in range(2): light(p, (TX - 0.06 + k * 0.12, TY - 0.172, 0.33), 0.018)
    for k in range(3):
        tube([(MX + 0.02, MY + 0.07, 0.95 - k * 0.05), (MX + 0.1 + k * 0.02, MY + 0.25, 0.7 - k * 0.04), (TX - 0.08 + k * 0.08, TY - 0.06, 0.38)], 0.016, p['char'])
        cyl(0.026, 0.03, p['cream2'], (TX - 0.08 + k * 0.08, TY - 0.06, 0.37), bev=0.008)
    tube([(TX + 0.05, TY + 0.17, 0.12), (TX + 0.12, TY + 0.36, 0.04), (TX + 0.16, TY + 0.5, 0.012)], 0.02, p['char'])
    # the fumes: a port on top of the lid, the duct to the filter tower with its mushroom vent; no smoke comes out
    FTX, FTY, FTR, FTH = 0.74, 0.66, 0.17, 0.95
    cyl(0.08, 0.06, p['char'], (FX, FY, lid_z(0) - 0.03), bev=0.015)
    cyl(FTR + 0.04, 0.06, p['char'], (FTX, FTY, 0.0), bev=0.02)
    cyl(FTR, FTH, p['cream'], (FTX, FTY, 0.05), bev=0.04)
    torus(FTR + 0.003, 0.018, p['orange'], (FTX, FTY, 0.35))
    torus(FTR + 0.003, 0.018, p['orange'], (FTX, FTY, 0.75))
    vent(p, (FTX, FTY, 0.05 + FTH - 0.01), 0.12)
    light(p, (FTX + math.cos(D2R(-120)) * (FTR + 0.005), FTY + math.sin(D2R(-120)) * (FTR + 0.005), 0.6), 0.02)
    d = Vector((FTX - FX, FTY - FY, 0)).normalized()
    side = (FTX - d.x * (FTR - 0.01), FTY - d.y * (FTR - 0.01), 0.92)
    tube([(FX, FY, lid_z(0) + 0.02), (FX, FY, 0.92), side], 0.052, p['cream2'])
    torus(0.058, 0.012, p['orange'], (FX + d.x * 0.32, FY + d.y * 0.32, 0.92), (math.pi / 2, 0, math.atan2(d.y, d.x) + math.pi / 2))
    # the hopper at the back left: iron ore in one half, carbon in the other; the belt tips them into the lid
    HX, HY = -0.75, 0.42
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.018, 0.3, p['char'], (HX + sx * 0.18, HY + sy * 0.12, 0.0), bev=0.006)
    hop = rbox(0.46, 0.34, 0.22, 0.05, p['orange'], (HX, HY, 0.28))
    cut(hop, cutter(0.42, 0.3, 0.22, (HX, HY, 0.32), r=0.03))
    rbox(0.02, 0.3, 0.17, 0.008, p['orange'], (HX, HY, 0.31), seg=1)               # the wall between the two
    for k, (m, xs) in enumerate((('ore', -1), ('char', 1))):
        ball(1.0, p[m], (HX + xs * 0.105, HY, 0.43), (0.095, 0.13, 0.06), seg=14)
        for j in range(3):
            ball(0.03, p[m], (HX + xs * (0.06 + 0.04 * j), HY - 0.07 + 0.07 * j, 0.47), (1.1, 1, 0.8), seg=10)
    S, E = Vector((-0.5, 0.38, 0.33)), Vector((-0.13, 0.33, 0.85))
    dv = E - S; L = dv.length; yaw = math.atan2(dv.y, dv.x); pitch = math.atan2(dv.z, math.hypot(dv.x, dv.y))
    mid = (S + E) / 2
    rbox(L, 0.15, 0.04, 0.02, p['char'], (mid.x, mid.y, mid.z - 0.02), (0, -pitch, yaw))
    for t in (0.3, 0.55, 0.8):
        q = S + dv * t
        ball(0.026, p['ore' if t != 0.55 else 'char'], (q.x, q.y, q.z + 0.045), (1.1, 1, 0.8), seg=10)
    for t in (0.35, 0.75):
        q = S + dv * t
        cyl(0.016, q.z - 0.02, p['char'], (q.x, q.y, 0.0), bev=0.005)
    px, py = -0.1, 0.33
    cyl(0.062, 0.07, p['char'], (px, py, lid_z(math.hypot(px - FX, py - FY)) - 0.025), bev=0.015)  # the feed port
    # the spout at the front: the melt runs into the ladle; the cast bars wait on a pallet for the store
    sy0 = FY - R + 0.02
    sp_s, sp_e = Vector((FX, sy0, 0.36)), Vector((FX, -0.6, 0.31))
    dv = sp_e - sp_s; L = dv.length; pitch = math.atan2(dv.z, -dv.y)
    rbox(0.1, L, 0.045, 0.02, p['orange'], ((sp_s.x + sp_e.x) / 2, (sp_s.y + sp_e.y) / 2, (sp_s.z + sp_e.z) / 2 - 0.02), (pitch, 0, 0))
    rbox(0.06, L - 0.02, 0.012, 0.005, p['fire'], ((sp_s.x + sp_e.x) / 2, (sp_s.y + sp_e.y) / 2, (sp_s.z + sp_e.z) / 2 + 0.018), (pitch, 0, 0), seg=1)
    LX, LY = FX, -0.67
    tube([(FX, -0.6, 0.305), (FX, -0.64, 0.24), (LX, LY + 0.01, 0.17)], 0.018, p['fire'])
    cyl(0.11, 0.16, p['char'], (LX, LY, 0.0), bev=0.02)
    torus(0.111, 0.014, p['orange'], (LX, LY, 0.1))
    cyl(0.088, 0.012, p['fire'], (LX, LY, 0.145), bev=0.003)
    BX, BY = 0.66, -0.6
    rbox(0.42, 0.26, 0.04, 0.015, p['char'], (BX, BY, 0.0))
    for k in range(3): rbox(0.38, 0.065, 0.05, 0.015, p['steel'], (BX, BY - 0.08 + k * 0.08, 0.04), seg=2)
    for k in range(3): rbox(0.065, 0.24, 0.05, 0.015, p['steel'], (BX - 0.12 + k * 0.12, BY, 0.09), seg=2)
    for k in range(2): rbox(0.36, 0.065, 0.05, 0.015, p['steel'], (BX, BY - 0.04 + k * 0.08, 0.14), seg=2)
    # the engineer's cabin at the front left: a door, and a lit window with the desk and a screen
    CX, CY, CW, CD, CH = -0.72, -0.3, 0.6, 0.42, 0.62
    rbox(CW + 0.08, CD + 0.08, 0.08, 0.14, p['char'], (CX, CY, 0.0))
    cab = rbox(CW, CD, CH, 0.12, p['cream'], (CX, CY, 0.06), seg=5)
    lit_room(p, cab, 0.24, 0.22, 0.2, CX + 0.13, CY - CD / 2 + 0.01, 0.28, 0.0, lambda cx, cy, fz: desk(p, frame(cx, cy, 0.0), 0.0, fz, 0.0, 0.0, 0.18))
    rbox(CW + 0.02, CD + 0.02, 0.035, 0.12, p['orange'], (CX, CY, 0.17))
    door(p, CX - 0.14, CY - CD / 2 - 0.02, 0.0, 0.2, 0.44, 0.06)
    vent(p, (CX + 0.12, CY + 0.06, 0.06 + CH - 0.01), 0.1)
    light(p, (CX - 0.18, CY + 0.08, 0.06 + CH + 0.01), 0.022)

# ======================================================================================
# the clay pit (level 13, docs/levels.md): on the shore of the ice in the Ice Hollow, a geologist works it. A clay quarry
#    dug down into the ground (Joro, 11.11.2026: a pit goes down, not up): a bench half way down and the floor about 2 m
#    deep, so the layers show in the walls: the red regolith on top, then light and dark clay. A ramp down the right side,
#    the way the excavator came. On the floor the small electric excavator digs at the back wall (the geologist drives it
#    from the lit cab) and tips the clay into the hopper; a belt carries it up and over the rim to the awning on the
#    ground, where it waits in a heap and as blocks on a pallet for the brick kiln (level 15, next door). Water from the
#    ice seeps into a corner of the floor, and a small pump sends it out by a hose. A stake with an orange flag on the
#    rim marks the layer. The model reaches 0.6 below the ground; a flat mesh with the material 'hole' marks the opening,
#    so the map can cut its ground there (catalog.js does it with the stencil). The ice is the map's (Joro, 11.11.2026).
# ======================================================================================
def excavator(p, at, yaw, z=0.0):
    """the small electric excavator, built facing +y at the origin, then turned by yaw and set at `at` (on ground z);
    returns the bucket's place (local 0, 0.47)"""
    before = set(bpy.data.objects)
    for sx in (-1, 1):                                              # the tracks with their rollers
        rbox(0.075, 0.36, 0.075, 0.035, p['char'], (sx * 0.11, 0, 0.0), seg=3)
        for ty in (-0.12, 0.0, 0.12):
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.022, depth=0.01, location=(sx * 0.15, ty, 0.037), rotation=(0, math.pi / 2, 0))
            _done(bpy.context.object, p['cream2'])
    cyl(0.1, 0.03, p['char'], (0, 0, 0.075), bev=0.01)              # the turntable
    rbox(0.26, 0.24, 0.11, 0.05, p['cream'], (0, -0.02, 0.1))
    rbox(0.265, 0.245, 0.014, 0.05, p['orange'], (0, -0.02, 0.165))
    rbox(0.24, 0.07, 0.07, 0.03, p['char'], (0, -0.145, 0.11))      # the counterweight (the battery)
    cyl(0.016, 0.02, p['cream2'], (-0.06, -0.07, 0.205), bev=0.005)          # a small vent that cools the battery
    ball(0.028, p['char'], (-0.06, -0.07, 0.232), (1, 1, 0.55), seg=14)
    # the cab on the right: a warm window to the front and to the side, a teal light on its roof, a lamp at the front
    cab = rbox(0.11, 0.12, 0.15, 0.04, p['cream'], (0.07, 0.04, 0.2))
    rbox(0.088, 0.012, 0.075, 0.02, p['win'], (0.07, 0.096, 0.255), seg=2)
    rbox(0.012, 0.088, 0.075, 0.02, p['win'], (0.122, 0.04, 0.255), seg=2)
    for (w_, d_, x_, y_) in ((0.094, 0.006, 0.07, 0.103), (0.006, 0.094, 0.129, 0.04)):
        rbox(w_, d_, 0.081, 0.02, p['glass'], (x_, y_, 0.252), seg=2)
    light(p, (0.07, 0.04, 0.355), 0.014)
    ball(0.012, p['lampw'], (0.105, 0.102, 0.33), seg=10)
    # the boom, the stick and the bucket full of clay, with the rams that move them
    piv, elb, wri = Vector((-0.03, 0.1, 0.2)), Vector((-0.03, 0.27, 0.5)), Vector((-0.03, 0.44, 0.27))
    tube([tuple(piv), tuple(elb)], 0.026, p['orange']); tube([tuple(elb), tuple(wri)], 0.02, p['orange'])
    for c, r in ((piv, 0.028), (elb, 0.026), (wri, 0.02)): ball(r, p['char'], tuple(c), seg=12)
    tube([(-0.03, 0.06, 0.17), tuple(piv.lerp(elb, 0.55) + Vector((0, 0.0, -0.03)))], 0.011, p['char'])
    tube([tuple(piv.lerp(elb, 0.75) + Vector((0, 0, 0.03))), tuple(elb.lerp(wri, 0.45) + Vector((0, 0.02, 0.02)))], 0.009, p['char'])
    bk = dome(0.055, p['char'], (0, 0, 0), seg=18); bk.rotation_euler = (math.pi + D2R(35), 0, 0); bk.location = (-0.03, 0.47, 0.24)
    bpy.context.view_layer.objects.active = bk; bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    sm = bk.modifiers.new('shell', 'SOLIDIFY'); sm.thickness = 0.008; _apply(bk)
    ball(0.04, p['clay'], (-0.03, 0.47, 0.235), (1, 0.9, 0.6), seg=12)
    import mathutils
    R = mathutils.Matrix.Translation((at[0], at[1], z)) @ mathutils.Matrix.Rotation(yaw, 4, 'Z')
    for o in [o for o in bpy.data.objects if o not in before]:
        o.matrix_world = R @ o.matrix_world
        bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return R @ Vector((-0.03, 0.47, 0.24))

def b_claypit(p):
    import mathutils
    # the ground block in layers, from the surface down
    layers = ((-0.08, -0.003, 'rock'), (-0.2, -0.08, 'clay'), (-0.33, -0.2, 'clay2'), (-0.45, -0.33, 'clay'), (-0.6, -0.45, 'clay2'))
    OX, OY, OW, OD = 0.05, 0.1, 1.8, 1.3                    # the opening
    FX_, FY_, FW, FD = 0.0, 0.22, 1.25, 0.85                # the floor
    BZ, FZ = -0.22, -0.45                                    # the bench and the floor
    # the ramp down the right side: from the ground at y = -0.95 to the floor at y = 0.6
    RX0, RX1, RY0, RY1 = 0.62, 0.92, -0.95, 0.6
    th = math.atan2(-FZ, RY1 - RY0); L = math.hypot(RY1 - RY0, FZ); RH = 0.7
    mid = Vector(((RX0 + RX1) / 2, (RY0 + RY1) / 2, FZ / 2))
    up = Vector((0, math.sin(th), math.cos(th)))
    def cutter_box(w, d, h, loc, rot=(0, 0, 0), r=0.06):
        return rbox(w, d, h, r, None, loc, rot, seg=4)
    # the block reaches only 0.1 past the pit and the head of the ramp: the map's ground covers the rest
    gx0, gx1, gy0, gy1 = OX - OW / 2 - 0.1, max(OX + OW / 2, RX1) + 0.1, RY0 - 0.1, OY + OD / 2 + 0.1
    for z0, z1, mk in layers:
        o = rbox(gx1 - gx0, gy1 - gy0, z1 - z0, 0.0001, p[mk], ((gx0 + gx1) / 2, (gy0 + gy1) / 2, z0), seg=1)
        for c in (cutter_box(OW, OD, 0.6, (OX, OY, BZ)),                       # down to the bench
                  cutter_box(FW, FD, 0.9, (FX_, FY_, FZ)),                     # down to the floor
                  cutter_box(RX1 - RX0, L + 0.2, RH, tuple(mid + up * RH / 2 - Vector((0, 0, RH / 2))), (-th, 0, 0), 0.04)):
            m = o.modifiers.new('c', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = c; m.solver = 'EXACT'
            _apply(o); bpy.data.objects.remove(c, do_unlink=True)
        for f in o.data.polygons: f.use_smooth = True
    # the opening, for the map's ground: the pit and the head of the ramp
    hole = mat('hole', '#000000', 1.0)
    rbox(OW, OD, 0.002, 0.06, hole, (OX, OY, -0.002), seg=2)
    rbox(RX1 - RX0, 0.5, 0.002, 0.04, hole, ((RX0 + RX1) / 2, RY0 + 0.2, -0.002), seg=2)
    # the excavator on the floor digs at the back wall; the hopper waits at its left
    excavator(p, (0.05, 0.15), 0.0, FZ)
    HX, HY = -0.36, 0.0
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.012, 0.24, p['char'], (HX + sx * 0.09, HY + sy * 0.07, FZ), bev=0.004)
    hop = rbox(0.24, 0.2, 0.14, 0.04, p['orange'], (HX, HY, FZ + 0.22))
    cut(hop, cutter(0.2, 0.16, 0.14, (HX, HY, FZ + 0.26), r=0.03))
    ball(1.0, p['clay'], (HX, HY, FZ + 0.32), (0.09, 0.07, 0.045), seg=12)
    light(p, (HX - 0.125, HY - 0.06, FZ + 0.32), 0.014)
    # the belt from the hopper up and over the front rim to the heap under the awning
    S, E = Vector((HX - 0.04, HY - 0.12, FZ + 0.2)), Vector((-0.78, -0.8, 0.3))
    dv = E - S; L2 = dv.length; yaw = math.atan2(dv.y, dv.x); pitch = math.atan2(dv.z, math.hypot(dv.x, dv.y)); mb = (S + E) / 2
    rbox(L2, 0.1, 0.03, 0.015, p['char'], (mb.x, mb.y, mb.z - 0.015), (0, -pitch, yaw))
    for t in (0.2, 0.5, 0.8):
        q = S + dv * t
        ball(0.022, p['clay'], (q.x, q.y, q.z + 0.03), (1.1, 1, 0.7), seg=10)
    for t in (0.25, 0.8):
        q = S + dv * t
        floor_z = FZ if (abs(q.x - FX_) < FW / 2 and abs(q.y - FY_) < FD / 2) else (BZ if (abs(q.x - OX) < OW / 2 and abs(q.y - OY) < OD / 2) else 0.0)
        cyl(0.01, q.z - 0.015 - floor_z, p['char'], (q.x, q.y, floor_z), bev=0.003)
    # the awning on the ground at the front left: the heap of clay and a pallet of clay blocks
    AX_, AY_, AW_, AD_, AZ_ = -0.76, -0.8, 0.6, 0.36, 0.5
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.018, AZ_, p['char'], (AX_ + sx * AW_ / 2, AY_ + sy * AD_ / 2, 0.0), bev=0.006)
    rbox(AW_ + 0.08, AD_ + 0.08, 0.04, 0.03, p['cream2'], (AX_, AY_, AZ_))
    rbox(AW_ + 0.09, AD_ + 0.09, 0.016, 0.03, p['orange'], (AX_, AY_, AZ_ + 0.006))
    light(p, (AX_ + AW_ / 2, AY_ - AD_ / 2 - 0.045, AZ_ + 0.02), 0.016)
    ball(1.0, p['clay'], (-0.86, -0.8, 0.0), (0.15, 0.13, 0.11), seg=16)
    rbox(0.22, 0.18, 0.03, 0.01, p['char'], (-0.58, -0.86, 0.0), seg=2)
    for i in range(2):
        for j in range(2):
            for k in range(2): rbox(0.095, 0.075, 0.048, 0.012, p['clay2'], (-0.628 + i * 0.096, -0.897 + j * 0.078, 0.03 + k * 0.05), seg=2)
    # the water in the corner of the floor and the pump that sends it out, up the back wall and over the rim
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1.0, depth=0.01, location=(0.42, 0.52, FZ + 0.004))
    o = bpy.context.object; o.scale = (0.16, 0.1, 1); bpy.ops.object.transform_apply(scale=True); _done(o, p['water'])
    rbox(0.1, 0.08, 0.08, 0.03, p['cream'], (0.5, 0.42, FZ), seg=3)
    rbox(0.104, 0.084, 0.014, 0.03, p['orange'], (0.5, 0.42, FZ + 0.05), seg=3)
    light(p, (0.5, 0.375, FZ + 0.085), 0.012)
    tube([(0.42, 0.52, FZ + 0.01), (0.47, 0.44, FZ + 0.04)], 0.008, p['char'])
    tube([(0.53, 0.45, FZ + 0.06), (0.55, FY_ + FD / 2 - 0.02, FZ + 0.06), (0.55, FY_ + FD / 2 - 0.02, BZ + 0.02),
          (0.55, OY + OD / 2 - 0.02, BZ + 0.02), (0.55, OY + OD / 2 - 0.02, 0.02), (0.55, OY + OD / 2 + 0.25, 0.012)], 0.012, p['char'])
    # the stake with the orange flag on the rim, where the geologist marked the layer
    cyl(0.008, 0.22, p['char'], (-0.6, 0.86, 0.0), bev=0.003, verts=12)
    rbox(0.07, 0.006, 0.045, 0.004, p['orange'], (-0.565, 0.86, 0.17), seg=1)

# ======================================================================================
# the brick kiln (level 15, docs/levels.md): electric, clay + power -> bricks, no smoke; next to the clay pit; an engineer
#    works it. A tunnel kiln, the way bricks are fired today: the clay goes into the hopper on the press at the back left,
#    the press pushes it out as a band that is cut into raw bricks, and they are stacked on a small kiln car; the car rolls
#    on rails into the long arched tunnel, hot inside (the round sight glasses on the front glow), and out at the right
#    with red fired bricks, which wait on a pallet. No chimney: only vents for the hot air on the arch, and the power
#    cabinet at the back. The engineer's booth at the front left: a door and a lit window with a desk.
# ======================================================================================
def kiln_car(p, x, y, m):
    """a kiln car on the rails: dark chassis on four wheels, a fireproof deck, three layers of bricks"""
    for sx in (-1, 1):
        for sy in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.03, depth=0.016, location=(x + sx * 0.11, y + sy * 0.09, 0.03), rotation=(math.pi / 2, 0, 0))
            _done(bpy.context.object, p['char'])
    rbox(0.34, 0.26, 0.03, 0.012, p['char'], (x, y, 0.04), seg=2)
    rbox(0.32, 0.24, 0.035, 0.012, p['cream2'], (x, y, 0.07), seg=2)
    for k in range(3):
        for i in range(3):
            for j in range(2):
                rbox(0.09, 0.07, 0.034, 0.008, p[m], (x - 0.1 + i * 0.1, y - 0.04 + j * 0.08, 0.105 + k * 0.038), seg=1)

def b_brickkiln(p):
    TX0, TX1, TY0, TY1 = -0.65, 0.85, -0.1, 0.4
    TW, TD = TX1 - TX0, TY1 - TY0; tx, ty = (TX0 + TX1) / 2, (TY0 + TY1) / 2
    plinth_ = rbox(TW + 0.04, TD + 0.04, 0.06, 0.08, p['char'], (tx, ty, 0.0))
    body = rbox(TW, TD, 0.3, 0.08, p['cream'], (tx, ty, 0.05))
    # the portals at both ends, where the cars go in and come out
    for ex in (TX0, TX1):
        for o in (plinth_, body):
            cut(o, cutter(0.5, 0.3, 0.27, (ex, ty, -0.02), r=0.04))
    # the arched roof (a lying cylinder cut along its middle), the stripe, the dark inside of the portals with the glow
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=TD / 2, depth=TW, location=(tx, ty, 0.35), rotation=(0, math.pi / 2, 0))
    arch = bpy.context.object
    bv = arch.modifiers.new('b', 'BEVEL'); bv.width = 0.05; bv.segments = 4; bv.limit_method = 'ANGLE'; bv.angle_limit = D2R(40); _apply(arch)
    _done(arch, p['cream']); cut_below(arch, 0.35)
    rbox(TW + 0.02, TD + 0.02, 0.03, 0.08, p['orange'], (tx, ty, 0.25))
    for ex, s_ in ((TX0, 1), (TX1, -1)):
        rbox(0.02, 0.3, 0.26, 0.01, p['char'], (ex + s_ * 0.24, ty, 0.0), seg=1)
        rbox(0.012, 0.24, 0.03, 0.006, p['fire'], (ex + s_ * 0.228, ty, 0.21), seg=1)
    # the sight glasses along the front: the heat inside
    for x in (-0.35, -0.05, 0.25, 0.55):
        porthole(p, (x, TY0, 0.17), (0, -1), 0.045, 'fire')
    light(p, (TX1 - 0.05, TY0 - 0.01, 0.31), 0.018)
    # vents for the hot air on the arch (no chimney: nothing burns), the power cabinet at the back with its cables
    for x in (-0.2, 0.45): vent(p, (x, ty, 0.35 + TD / 2 - 0.02), 0.085)
    CX, CY = 0.5, 0.62
    rbox(0.34, 0.22, 0.05, 0.04, p['char'], (CX, CY, 0.0))
    rbox(0.3, 0.18, 0.3, 0.05, p['cream'], (CX, CY, 0.04))
    rbox(0.305, 0.185, 0.025, 0.05, p['orange'], (CX, CY, 0.24))
    for k in range(2): light(p, (CX - 0.06 + k * 0.12, CY - 0.092, 0.3), 0.016)
    for k in range(2):
        xk = CX - 0.06 + k * 0.12
        tube([(xk, CY - 0.02, 0.33), (xk, CY - 0.08, 0.46), (xk, ty + 0.18, 0.35 + math.sqrt((TD / 2) ** 2 - 0.18 ** 2) - 0.01)], 0.014, p['char'])
    tube([(CX + 0.1, CY + 0.09, 0.1), (CX + 0.16, CY + 0.25, 0.03), (CX + 0.2, CY + 0.36, 0.012)], 0.018, p['char'])
    # the rails through the tunnel, the car going in with raw bricks and the car coming out with fired ones
    for y in (ty - 0.09, ty + 0.09): rbox(TW + 0.6, 0.022, 0.018, 0.006, p['char'], (tx + 0.0, y, 0.0), seg=1)
    kiln_car(p, TX0 - 0.05, ty, 'clay')
    kiln_car(p, TX1 + 0.06, ty, 'brick')
    # the press at the back left: the hopper on its barrel, the motor, the band of clay out of the mouth onto the table,
    #    where it is cut into raw bricks next to the car
    EX = -0.84
    for yy in (0.56, 0.74): rbox(0.1, 0.04, 0.09, 0.015, p['char'], (EX, yy, 0.0), seg=2)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.075, depth=0.3, location=(EX, 0.65, 0.16), rotation=(math.pi / 2, 0, 0))
    o = bpy.context.object; bv = o.modifiers.new('b', 'BEVEL'); bv.width = 0.02; bv.segments = 3; bv.limit_method = 'ANGLE'; bv.angle_limit = D2R(40); _apply(o); _done(o, p['cream'])
    torus(0.077, 0.012, p['orange'], (EX, 0.6, 0.16), (math.pi / 2, 0, 0))
    rbox(0.13, 0.11, 0.13, 0.03, p['char'], (EX, 0.855, 0.095))
    light(p, (EX + 0.066, 0.855, 0.2), 0.014)
    hop = rbox(0.2, 0.17, 0.12, 0.035, p['orange'], (EX, 0.7, 0.225))
    cut(hop, cutter(0.16, 0.13, 0.12, (EX, 0.7, 0.26), r=0.025))
    ball(1.0, p['clay'], (EX, 0.7, 0.32), (0.075, 0.06, 0.035), seg=12)
    torus(0.05, 0.014, p['char'], (EX, 0.5, 0.16), (math.pi / 2, 0, 0))
    rbox(0.14, 0.17, 0.025, 0.01, p['char'], (EX + 0.04, 0.39, 0.12), seg=2)
    for sx in (-1, 1):
        for yy in (0.32, 0.46): cyl(0.008, 0.12, p['char'], (EX + 0.04 + sx * 0.06, yy, 0.0), bev=0.003)
    rbox(0.08, 0.09, 0.05, 0.012, p['clay'], (EX, 0.445, 0.145), seg=2)
    for j in range(2): rbox(0.08, 0.05, 0.035, 0.008, p['clay'], (EX + 0.04, 0.37 - j * 0.03 + 0.03, 0.145), seg=1)
    # the fired bricks on a pallet by the exit
    PX, PY = 1.12, -0.36
    rbox(0.28, 0.2, 0.03, 0.01, p['char'], (PX, PY, 0.0), seg=2)
    for k in range(3):
        for i in range(3):
            for j in range(2):
                rbox(0.085, 0.085, 0.034, 0.008, p['brick'], (PX - 0.09 + i * 0.09, PY - 0.045 + j * 0.09, 0.03 + k * 0.036), seg=1)
    light(p, (PX + 0.16, PY - 0.08, 0.02), 0.014)
    # the engineer's booth at the front left
    BX, BY, BW, BD, BH = -0.86, -0.38, 0.42, 0.34, 0.56
    rbox(BW + 0.06, BD + 0.06, 0.06, 0.12, p['char'], (BX, BY, 0.0))
    booth = rbox(BW, BD, BH, 0.1, p['cream'], (BX, BY, 0.05), seg=5)
    lit_room(p, booth, 0.17, 0.2, 0.16, BX + 0.1, BY - BD / 2 + 0.01, 0.25, 0.0, lambda cx, cy, fz: desk(p, frame(cx, cy, 0.0), 0.0, fz, 0.0, 0.0, 0.14))
    rbox(BW + 0.02, BD + 0.02, 0.03, 0.1, p['orange'], (BX, BY, 0.16))
    door(p, BX - 0.1, BY - BD / 2 - 0.02, 0.0, 0.17, 0.42, 0.05)
    light(p, (BX + 0.12, BY + 0.05, 0.05 + BH + 0.01), 0.018)

# ======================================================================================
# the copper works (level 19, docs/levels.md): copper ore -> cables, next to the smelter; an engineer works it. The ore is
#    not melted (that gives off sulphur gas): it is dissolved in acid, the clean copper is gathered on plates by current
#    (electrolysis), drawn into wire and dressed in a carbon insulation. The way of the copper: the ore hopper at the back
#    left tips into the two leach tanks, where the blue solution shows through a glass band; pipes take it into the hall,
#    where the big lit window shows the cell with its copper plates; the wire comes out of the right wall into the drawing
#    machine and the coater, and the black cable is wound on reels. The rectifier at the back gives the cell its current;
#    vents on the roof take the acid mist out. No smoke.
# ======================================================================================
def cable_reel(p, at):
    """a reel of cable lying flat: cream flanges with an orange rim, the black cable wound between, copper at its end"""
    x, y, z = at
    for dz in (0.0, 0.085):
        cyl(0.1, 0.016, p['cream2'], (x, y, z + dz), bev=0.005, verts=32)
        torus(0.1, 0.006, p['orange'], (x, y, z + dz + 0.008))
    cyl(0.08, 0.07, p['char'], (x, y, z + 0.016), bev=0.01, verts=32)
    cyl(0.02, 0.012, p['char'], (x, y, z + 0.101), bev=0.004, verts=16)
    ball(0.01, p['copper'], (x + 0.07, y - 0.04, z + 0.07), seg=10)

def b_copperworks(p):
    # the hall with the lit window on the cell, the door, the stripe, the vents and a light on the roof
    HX, HY, HW, HD, HH = 0.15, 0.15, 1.3, 0.7, 0.55
    rbox(HW + 0.08, HD + 0.08, 0.06, 0.18, p['char'], (HX, HY, 0.0))
    hall = rbox(HW, HD, HH, 0.15, p['cream'], (HX, HY, 0.05), seg=5)
    def cell(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        rbox(0.42, 0.17, 0.09, 0.02, p['char'], (*L(-0.04, -0.02), fz), seg=2)
        rbox(0.4, 0.15, 0.006, 0.01, p['cusol'], (*L(-0.04, -0.02), fz + 0.082), seg=1)
        for k in range(7): rbox(0.012, 0.12, 0.12, 0.004, p['copper'], (*L(-0.2 + k * 0.053, -0.02), fz + 0.03), seg=1)
        for v in (-0.07, 0.03): rbox(0.42, 0.012, 0.012, 0.004, p['copper'], (*L(-0.04, v), fz + 0.15), seg=1)
        for k in range(3): rbox(0.08, 0.1, 0.012, 0.004, p['copper'], (*L(0.25, -0.02), fz + k * 0.014), seg=1)   # the plates taken off
    lit_room(p, hall, 0.66, 0.26, 0.42, HX - 0.17, HY - HD / 2 + 0.01, 0.2, 0.0, cell)
    rbox(HW + 0.02, HD + 0.02, 0.035, 0.15, p['orange'], (HX, HY, 0.14))
    door(p, HX + 0.42, HY - HD / 2 - 0.02, 0.0, 0.2, 0.44, 0.05)
    RZ = 0.05 + HH
    for x in (HX - 0.35, HX + 0.15): vent(p, (x, HY + 0.12, RZ - 0.01), 0.1)
    light(p, (HX + 0.45, HY + 0.1, RZ + 0.01), 0.02)
    # the two leach tanks at the left: the blue solution through a glass band; the pipes into the hall
    TX = -0.85
    for ty in (0.0, 0.4):
        cyl(0.19, 0.05, p['char'], (TX, ty, 0.0), bev=0.015)
        cyl(0.16, 0.3, p['cream'], (TX, ty, 0.04), bev=0.03)
        torus(0.161, 0.012, p['orange'], (TX, ty, 0.16))
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.16, depth=0.1, location=(TX, ty, 0.39), end_fill_type='NOTHING')
        _done(bpy.context.object, p['glass'])
        cyl(0.15, 0.09, p['cusol'], (TX, ty, 0.34), bev=0.0)
        cyl(0.165, 0.025, p['cream2'], (TX, ty, 0.44), bev=0.01)
        torus(0.165, 0.01, p['orange'], (TX, ty, 0.465))
        tube([(TX + 0.15, ty, 0.1), (HX - HW / 2 - 0.02, ty * 0.6 + 0.08, 0.1)], 0.016, p['char'])
    tube([(TX, 0.3, 0.466), (TX, 0.3, 0.52), (TX, 0.1, 0.52), (TX, 0.1, 0.466)], 0.012, p['char'])        # the back tank into the front one
    light(p, (TX + 0.11, -0.12, 0.3), 0.015)
    # the ore hopper behind them, on legs, tipping into the back tank
    OY = 0.8
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.014, 0.5, p['char'], (TX + sx * 0.1, OY + sy * 0.07, 0.0), bev=0.005)
    hop = rbox(0.26, 0.2, 0.14, 0.04, p['orange'], (TX, OY, 0.5))
    cut(hop, cutter(0.22, 0.16, 0.14, (TX, OY, 0.54), r=0.03))
    ball(1.0, p['cuore'], (TX, OY, 0.6), (0.1, 0.075, 0.045), seg=12)
    for (dx, dy) in ((-0.04, 0.02), (0.04, -0.02), (0.0, 0.03)): ball(0.022, p['cuore'], (TX + dx, OY + dy, 0.64), (1.1, 1, 0.8), seg=10)
    tube([(TX, OY - 0.1, 0.52), (TX, 0.5, 0.5)], 0.02, p['char'])
    # the rectifier at the back: the current for the cell
    RX_, RY_ = 0.5, 0.75
    rbox(0.34, 0.22, 0.05, 0.04, p['char'], (RX_, RY_, 0.0))
    rbox(0.3, 0.18, 0.3, 0.05, p['cream'], (RX_, RY_, 0.04))
    rbox(0.305, 0.185, 0.025, 0.05, p['orange'], (RX_, RY_, 0.24))
    for k in range(2): light(p, (RX_ - 0.06 + k * 0.12, RY_ - 0.092, 0.3), 0.016)
    for k in range(2):
        xk = RX_ - 0.05 + k * 0.1
        tube([(xk, RY_ - 0.02, 0.33), (xk, RY_ - 0.1, 0.5), (xk, HY + HD / 2 - 0.08, RZ - 0.01)], 0.014, p['char'])
    tube([(RX_ + 0.1, RY_ + 0.09, 0.1), (RX_ + 0.16, RY_ + 0.25, 0.03), (RX_ + 0.2, RY_ + 0.36, 0.012)], 0.018, p['char'])
    # the wire out of the right wall: the drawing machine, the coater, the black cable onto the drum; a full drum waits
    WX = HX + HW / 2
    tube([(WX - 0.01, 0.32, 0.2), (WX + 0.11, 0.32, 0.2)], 0.008, p['copper'])
    rbox(0.2, 0.16, 0.22, 0.04, p['cream'], (WX + 0.2, 0.32, 0.0))
    rbox(0.205, 0.165, 0.02, 0.04, p['orange'], (WX + 0.2, 0.32, 0.15))
    for dx in (-0.05, 0.05):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.04, depth=0.02, location=(WX + 0.2 + dx, 0.32 - 0.085, 0.13), rotation=(math.pi / 2, 0, 0))
        _done(bpy.context.object, p['copper'])
    light(p, (WX + 0.2, 0.32 - 0.082, 0.2), 0.012)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.035, depth=0.14, location=(WX + 0.2, 0.17, 0.13), rotation=(math.pi / 2, 0, 0))
    _done(bpy.context.object, p['char'])                                                                     # the coater
    torus(0.036, 0.008, p['orange'], (WX + 0.2, 0.2, 0.13), (math.pi / 2, 0, 0))
    # the winder: a reel turning on its motor; then two full reels on a pallet
    cyl(0.07, 0.06, p['char'], (WX + 0.2, -0.12, 0.0), bev=0.015)
    light(p, (WX + 0.2 + 0.07, -0.12, 0.04), 0.012)
    cable_reel(p, (WX + 0.2, -0.12, 0.06))
    tube([(WX + 0.2, 0.1, 0.13), (WX + 0.2, 0.0, 0.13), (WX + 0.2, -0.04, 0.11)], 0.008, p['char'])
    rbox(0.26, 0.48, 0.03, 0.01, p['char'], (WX + 0.22, -0.55, 0.0), seg=2)
    for yy in (-0.43, -0.67): cable_reel(p, (WX + 0.22, yy, 0.03))

# ======================================================================================
# the brick home (the second home, level 20, docs/levels.md): the drone prints it from a paste with crushed bricks in it,
#    so its walls are reddish, stronger and warmer; it starts at level 1 with 4 beds and grows with the people to level 20
#    with 20, like the first home. Its own look (Joro, 11.11.2026: the brick homes look different), in the family of the
#    first: a long house with a soft gable roof (idea B of 06.11.2026). A room for two behind every front window, with a
#    cream lintel over it; the airlock porch in the row; solar tiles on the front slope, the air unit and the water tank at
#    the back. Level 1: two rooms; level 10: five rooms, plants under glass in front and a bench; level 20: the upper floor
#    with small balconies (ten rooms) and the winter garden at the end, where everyone sits in the evening.
# ======================================================================================
def gable(p, W, D, zb, m, pitch=0.55):
    """a soft gable roof over a W x D body standing at zb; returns its height"""
    s_ = (D + 0.16) / math.sqrt(2)
    roof = rbox(W, s_, s_, 0.07, m, (0, 0, zb - s_ / 2), (D2R(45), 0, 0), seg=4)
    apply_all([roof])
    for v in roof.data.vertices: v.co.z = zb + (v.co.z - zb) * pitch
    cut_half(roof, zb)
    return (D + 0.16) / 2 * pitch

def b_brickhome(p, lvl, ins=False):
    rooms = 2 if lvl < 5 else 5
    two = lvl >= 11
    SL, D, FH = 0.4, 0.9, 0.5
    W = (rooms + 1) * SL + 0.14
    if ins: D += 0.06                                # the insulation (level 29): wool slabs and a printed skin make the walls thicker
    door_slot = 1 if rooms == 2 else 2
    xs = [-W / 2 + 0.07 + SL * (k + 0.5) for k in range(rooms + 1)]
    H = FH * (2 if two else 1) + 0.04
    rbox(W + 0.1, D + 0.1, 0.08, 0.14, p['char'], (0, 0, 0))
    if ins: W += 0.06
    body = rbox(W, D, H, 0.12, p['brickwall'], (0, 0, 0.08), seg=5)
    if ins: rbox(W + 0.02, D + 0.02, 0.035, 0.12, p['orange'], (0, 0, 0.11))   # the new orange stripe where the skin starts
    for z in ((0.08 + FH,) if two else ()): rbox(W + 0.02, D + 0.02, 0.035, 0.12, p['cream'], (0, 0, z))
    for fl in ((0, 1) if two else (0,)):
        for k, x in enumerate(xs):
            if k == door_slot and fl == 0: continue
            z = 0.2 + fl * FH
            room(p, body, x, -D / 2 + 0.01, z, 0.0)
            rbox(0.36, 0.05, 0.04, 0.015, p['cream'], (x, -D / 2 - 0.01, z + 0.25), seg=2)          # the lintel
            if fl == 1:
                rbox(0.32, 0.12, 0.03, 0.02, p['cream2'], (x, -D / 2 - 0.05, 0.08 + FH + 0.035))
                tube([(x - 0.15, -D / 2 - 0.1, 0.08 + FH + 0.065), (x - 0.15, -D / 2 - 0.1, 0.08 + FH + 0.15), (x + 0.15, -D / 2 - 0.1, 0.08 + FH + 0.15), (x + 0.15, -D / 2 - 0.1, 0.08 + FH + 0.065)], 0.008, p['orange'])
    # the airlock porch in the row, with a canopy and a light
    xd = xs[door_slot]
    rbox(0.34, 0.24, 0.48, 0.1, p['cream2'], (xd, -D / 2 - 0.08, 0.08))
    door(p, xd, -D / 2 - 0.21, 0.0, 0.22, 0.34, 0.08)
    rbox(0.42, 0.18, 0.03, 0.02, p['orange'], (xd, -D / 2 - 0.2, 0.56))
    # the roof: a soft cream gable with an orange ridge, a vent on the ridge, a light at the end
    zb = 0.08 + H
    rh = gable(p, W + 0.12, D, zb, p['cream'])
    hcyl(0.035, W + 0.14, p['orange'], (0, 0, zb + rh - 0.02), 'x', bev=0.012)
    vent(p, (W / 2 - 0.3, 0.0, zb + rh - 0.03), 0.09)
    light(p, (-W / 2 + 0.05, 0.0, zb + rh + 0.03), 0.026)
    half = (D + 0.16) / 2; ang = math.atan2(rh, half)
    for x in ((-0.24, 0.24) if rooms == 2 else (-0.9, -0.45, 0.0, 0.45)):
        rbox(0.38, 0.28, 0.02, 0.02, p['navy'], (x, -half / 2 - math.sin(ang) * 0.02, zb + rh / 2 + math.cos(ang) * 0.02 - 0.01), (ang, 0, 0))
    porthole(p, (W / 2 + 0.06, 0.0, zb + rh * 0.38), (1, 0), 0.06)
    # the air unit and the water tank at the back, their pipes into the back wall
    air_unit(p, (-W / 4, D / 2 + 0.17, 0.0), math.pi, 1.0)
    tube([(-W / 4, D / 2 + 0.06, 0.16), (-W / 4, D / 2 - 0.02, 0.16)], 0.02, p['char'])
    tank(p, (W / 4, D / 2 + 0.18, 0.0))
    tube([(W / 4, D / 2 + 0.05, 0.3), (W / 4, D / 2 - 0.02, 0.3)], 0.016, p['char'])
    if lvl >= 10:
        for k, x in enumerate(xs):
            if k != door_slot and k % 2 == 0: bell(p, (x, -D / 2 - 0.16, 0.0), 0.8)
        bench(p, (xs[door_slot + 1], -D / 2 - 0.2, 0.0), 0.0)
    if lvl >= 20:
        gx = W / 2 + 0.26
        rbox(0.44, 0.66, 0.08, 0.06, p['char'], (gx, 0.0, 0.0))
        rbox(0.4, 0.62, 0.02, 0.02, p['floor'], (gx, 0.0, 0.08))
        bush(p, (gx - 0.06, 0.1, 0.1), 1.0); bush(p, (gx + 0.08, -0.12, 0.1), 0.8)
        bench(p, (gx, -0.18, 0.1), D2R(90))
        rbox(0.4, 0.62, 0.42, 0.08, p['glass'], (gx, 0.0, 0.1))
        rbox(0.44, 0.66, 0.035, 0.06, p['orange'], (gx, 0.0, 0.52))

# ======================================================================================
# the canteen (level 20, docs/levels.md): the second food building, for the colonists from 21 to 40; it starts at level 1
#    with 8 places and grows with the people to level 20 with 20, one level for each new colonist; a cook works in it,
#    the others eat there; it needs cables from the copper works. Like the homes, whose windows count the beds, its big
#    windows show the tables and the seats count the places: level 1 two tables of four (8); level 10 the hall is longer,
#    with a small table for two (10); level 20 five tables of four (20) and herbs under glass on the roof. At the back on
#    the right the cook's kitchen: the stove and the pot behind its window, steam from its flue. The airlock door at the
#    front, the air unit and the water tank at the back, as at the homes.
# ======================================================================================
def tables(p, n, seats):
    """dining tables along a window, their long side to the glass, with stools on both long sides:
    four at a table of four, two at a small one; plates and a little food on top"""
    def f(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        for k in range(n):
            u = (k - (n - 1) / 2) * 0.27
            small = seats == 2
            tl = 0.12 if small else 0.22
            rbox(tl, 0.1, 0.016, 0.01, p['cream2'], (*L(u, 0.0), fz + 0.085), seg=2)
            for su in ((0.0,) if small else (-1, 1)):
                cyl(0.009, 0.085, p['char'], (*L(u + su * (tl / 2 - 0.03), 0.0), fz), bev=0.003)
            for uu in ((0.0,) if small else (-0.055, 0.055)):
                for sv in (-1, 1):
                    cyl(0.022, 0.05, p['orange'], (*L(u + uu, sv * 0.085), fz), bev=0.007)
                    cyl(0.014, 0.004, p['room'], (*L(u + uu, sv * 0.03), fz + 0.101), bev=0.002)
            ball(0.014, p['tomato'], (*L(u - 0.02, 0.0), fz + 0.108), seg=8)
            ball(0.014, p['leaf2'], (*L(u + 0.02, 0.0), fz + 0.108), seg=8)
    return f

def stove(p):
    """the cook's corner: a stove with a warm top, a pot, a shelf of jars on the back wall"""
    def f(cx, cy, fz):
        fr = math.pi / 2; L = frame(cx, cy, fr)
        rbox(0.16, 0.09, 0.08, 0.012, p['char'], (*L(0.0, 0.05), fz), (0, 0, fr), seg=2)
        rbox(0.12, 0.06, 0.006, 0.01, p['fire'], (*L(0.0, 0.05), fz + 0.08), (0, 0, fr), seg=1)
        cyl(0.03, 0.04, p['grey'], (*L(-0.025, 0.05), fz + 0.086), bev=0.008)
        rbox(0.14, 0.04, 0.008, 0.003, p['cream2'], (*L(0.0, 0.09), fz + 0.17), (0, 0, fr), seg=1)
        for k in range(3): cyl(0.012, 0.03, [p['tomato'], p['leaf'], p['wood']][k], (*L(-0.04 + k * 0.04, 0.09), fz + 0.178), bev=0.004)
    return f

def b_canteen(p, lvl, ins=False):
    wins = {1: [(0.6, 2, 4)], 10: [(0.6, 2, 4), (0.36, 1, 2)], 20: [(0.6, 2, 4), (0.6, 2, 4), (0.36, 1, 4)]}[lvl]
    HW = {1: 1.1, 10: 1.5, 20: 2.2}[lvl]; HD, HH, HY = 0.8, 0.5, 0.1
    if ins: HW += 0.06; HD += 0.06                     # the insulation (level 29): thicker walls
    rbox(HW + 0.1, HD + 0.1, 0.08, 0.2, p['char'], (0, HY, 0.0))
    hall = rbox(HW, HD, HH, 0.15, p['cream'], (0, HY, 0.08), seg=5)
    if ins: rbox(HW + 0.02, HD + 0.02, 0.035, 0.15, p['orange'], (0, HY, 0.11))   # the new orange stripe
    x = -HW / 2 + 0.1
    for (w, n, seats) in wins:
        lit_room(p, hall, w, 0.26, 0.4, x + w / 2, HY - HD / 2 + 0.01, 0.2, 0.0, tables(p, n, seats))
        x += w + 0.08
    rbox(HW + 0.02, HD + 0.02, 0.035, 0.15, p['orange'], (0, HY, 0.08 + HH - 0.14))
    # the airlock porch with the door at the front right
    xd = HW / 2 - 0.2
    rbox(0.34, 0.24, 0.46, 0.1, p['cream2'], (xd, HY - HD / 2 - 0.08, 0.08))
    door(p, xd, HY - HD / 2 - 0.21, 0.0, 0.2, 0.34, 0.08)
    rbox(0.42, 0.18, 0.03, 0.02, p['orange'], (xd, HY - HD / 2 - 0.2, 0.54))
    # the cook's kitchen at the back right: its window on the right side, the flue with steam
    KX, KY, KW, KD, KH = HW / 2 - 0.3, HY + HD / 2 + 0.17, 0.5, 0.4, 0.45
    if ins: KW += 0.04; KD += 0.04
    rbox(KW + 0.08, KD + 0.08, 0.08, 0.12, p['char'], (KX, KY, 0.0))
    kit = rbox(KW, KD, KH, 0.12, p['cream'], (KX, KY, 0.08), seg=5)
    if ins: rbox(KW + 0.02, KD + 0.02, 0.03, 0.12, p['orange'], (KX, KY, 0.11))
    lit_room(p, kit, 0.2, 0.2, 0.22, KX + KW / 2 - 0.01, KY, 0.2, math.pi / 2, stove(p))
    rbox(KW + 0.02, KD + 0.02, 0.03, 0.12, p['orange'], (KX, KY, 0.08 + KH - 0.12))
    cyl(0.05, 0.22, p['cream2'], (KX - 0.1, KY + 0.06, 0.08 + KH - 0.01), bev=0.015)
    cyl(0.065, 0.04, p['char'], (KX - 0.1, KY + 0.06, 0.08 + KH + 0.2), bev=0.012)
    steam(p, (KX - 0.1, KY + 0.06, 0.08 + KH + 0.36), 0.08)
    light(p, (KX + 0.15, KY - 0.05, 0.08 + KH + 0.01), 0.018)
    # on the hall's roof: a vent and a light; the air unit and the water tank at the back on the left
    RZ = 0.08 + HH
    vent(p, (-HW / 2 + 0.3, HY + 0.12, RZ - 0.01), 0.09)
    light(p, (-HW / 2 + 0.12, HY - 0.2, RZ + 0.01), 0.02)
    air_unit(p, (-HW / 2 + 0.25, HY + HD / 2 + 0.17, 0.0), math.pi, 0.9)
    tube([(-HW / 2 + 0.25, HY + HD / 2 + 0.07, 0.15), (-HW / 2 + 0.25, HY + HD / 2 - 0.02, 0.15)], 0.02, p['char'])
    tank(p, (-HW / 2 + 0.6, HY + HD / 2 + 0.17, 0.0))
    tube([(-HW / 2 + 0.6, HY + HD / 2 + 0.05, 0.3), (-HW / 2 + 0.6, HY + HD / 2 - 0.02, 0.3)], 0.016, p['char'])
    if lvl >= 10:
        for k, (w, n, seats) in enumerate(wins[:2]):
            bell(p, (-HW / 2 + 0.1 + k * 0.68 + 0.08, HY - HD / 2 - 0.16, 0.0), 0.8)
    if lvl >= 20:
        for k in range(2):
            px = -HW / 2 + 0.55 + k * 0.6
            rbox(0.44, 0.4, 0.06, 0.04, p['orange'], (px, HY - 0.1, RZ))
            rbox(0.4, 0.36, 0.02, 0.03, p['soil'], (px, HY - 0.1, RZ + 0.05))
            bush(p, (px - 0.08, HY - 0.16, RZ + 0.06), 0.55); bush(p, (px + 0.08, HY - 0.02, RZ + 0.06), 0.45)
            dome(0.24, p['glass'], (px, HY - 0.1, RZ + 0.06), seg=32, sz=0.7)

# ======================================================================================
# the carbon drill (level 1, docs/levels.md): the second building of the tutorial, over the carbon the geolocator found;
#    a geologist works it from level 3; the first study is "hardened drill bits". In our style instead of the CellCog one
#    (11.11.2026). The way of the carbon: a tower over the borehole, the motor (top drive) turns the drill string and the
#    auger brings the crushed black carbon up into the housing at the collar; a chute tips it into the bin, a screw
#    conveyor lifts it into the silo, where a glass strip shows how full it is. Beside the tower the rack of drill rods
#    and the spare bits with their orange (hardened) tips; at the front left the geologist's booth with a lit window.
#    It grows with its level: the deeper it drills, the taller the tower and the more rods on the rack; the silo grows,
#    and at level 20 there are two silos.
# ======================================================================================
def b_drill(p, lvl=10):
    TH = {1: 1.3, 10: 1.7, 20: 2.0}[lvl]
    nrods = {1: 3, 10: 6, 20: 9}[lvl]
    HX, HY = -0.1, 0.15
    rbox(0.8, 0.8, 0.05, 0.1, p['char'], (HX, HY, 0.0))                    # the dark base of the rig
    # the tower: four soft legs leaning in, orange braces, the crown block with a light on top
    for sx in (-1, 1):
        for sy in (-1, 1):
            tube([(HX + sx * 0.3, HY + sy * 0.3, 0.05), (HX + sx * 0.12, HY + sy * 0.12, TH)], 0.035, p['cream'])
            cyl(0.06, 0.04, p['char'], (HX + sx * 0.3, HY + sy * 0.3, 0.04), bev=0.012)
    for f in (0.33, 0.66):
        hw = 0.3 - 0.18 * f; z = 0.05 + (TH - 0.05) * f
        pts = [(HX - hw, HY - hw, z), (HX + hw, HY - hw, z), (HX + hw, HY + hw, z), (HX - hw, HY + hw, z), (HX - hw, HY - hw, z)]
        tube(pts, 0.014, p['orange'])
    rbox(0.34, 0.34, 0.1, 0.04, p['cream2'], (HX, HY, TH - 0.02))
    light(p, (HX, HY, TH + 0.1), 0.026)
    # the top drive half way down, on its cables from the crown; the drill string and the auger down to the collar
    DZ = TH * 0.5
    rbox(0.2, 0.2, 0.18, 0.05, p['cream'], (HX, HY, DZ))
    rbox(0.205, 0.205, 0.025, 0.05, p['orange'], (HX, HY, DZ + 0.12))
    light(p, (HX + 0.1, HY - 0.1, DZ + 0.09), 0.014)
    for sx in (-1, 1): tube([(HX + sx * 0.06, HY, DZ + 0.18), (HX + sx * 0.06, HY, TH - 0.02)], 0.006, p['char'])
    if lvl >= 20:
        rbox(0.16, 0.16, 0.12, 0.04, p['cream'], (HX, HY, DZ + 0.2))
        vent(p, (HX, HY, DZ + 0.31), 0.06)
    cyl(0.035, DZ - 0.2, p['char'], (HX, HY, 0.2), bev=0.008, verts=20)
    tube([(HX + 0.065 * math.cos(t / 6), HY + 0.065 * math.sin(t / 6), 0.22 + t * 0.0045) for t in range(0, 57)], 0.012, p['char'])
    # the housing at the collar, carbon chips round it, the chute into the bin
    cyl(0.15, 0.2, p['cream'], (HX, HY, 0.0), bev=0.04)
    torus(0.151, 0.014, p['orange'], (HX, HY, 0.12))
    for (dx, dy) in ((-0.22, -0.12), (-0.18, 0.2), (0.05, 0.3), (-0.28, 0.05)):
        ball(0.03, p['char'], (HX + dx, HY + dy, 0.05), (1.2, 1, 0.7), seg=8)
    BX, BY = 0.42, 0.05
    S, E = Vector((HX + 0.13, HY - 0.03, 0.18)), Vector((BX - 0.06, BY + 0.0, 0.14))
    dv = E - S; L_ = dv.length; yaw = math.atan2(dv.y, dv.x); pitch = math.atan2(dv.z, math.hypot(dv.x, dv.y)); mid = (S + E) / 2
    rbox(L_, 0.08, 0.025, 0.012, p['orange'], (mid.x, mid.y, mid.z - 0.012), (0, -pitch, yaw), seg=2)
    bin_ = rbox(0.24, 0.22, 0.13, 0.04, p['orange'], (BX, BY, 0.0))
    cut(bin_, cutter(0.2, 0.18, 0.13, (BX, BY, 0.04), r=0.03))
    ball(1.0, p['char'], (BX, BY, 0.11), (0.09, 0.08, 0.04), seg=12)
    # the silo(s), the screw conveyor up from the bin, the glass strip that shows the carbon inside
    SH = {1: 0.55, 10: 0.8, 20: 0.8}[lvl]
    silos = [(0.85, 0.42)] if lvl < 20 else [(0.85, 0.55), (0.85, 0.12)]
    for (sx_, sy_) in silos:
        cyl(0.21, 0.05, p['char'], (sx_, sy_, 0.0), bev=0.015)
        cyl(0.18, SH, p['cream'], (sx_, sy_, 0.04), bev=0.04)
        torus(0.181, 0.012, p['orange'], (sx_, sy_, 0.04 + SH * 0.3))
        cone(0.19, 0.05, 0.14, p['cream2'], (sx_, sy_, 0.04 + SH + 0.07))
        cyl(0.03, 0.05, p['char'], (sx_, sy_, 0.04 + SH + 0.13), bev=0.01)
        rbox(0.05, 0.012, SH * 0.8, 0.012, p['glass'], (sx_ - 0.04, sy_ - 0.177, 0.1), (0, 0, D2R(-12)), seg=1)
        rbox(0.036, 0.006, SH * 0.55, 0.01, p['char'], (sx_ - 0.04, sy_ - 0.172, 0.11), (0, 0, D2R(-12)), seg=1)
        light(p, (sx_ + 0.12, sy_ - 0.13, 0.04 + SH - 0.04), 0.014)
        tube([(BX + 0.09, BY + 0.06, 0.08), (sx_ - 0.05, sy_ - 0.02, 0.04 + SH + 0.1), (sx_, sy_, 0.04 + SH + 0.1)], 0.03, p['char'])
    # the rack of drill rods on the left, and the spare bits with their hardened orange tips
    RX, RY = -0.82, 0.35
    for yy in (RY - 0.18, RY + 0.18):
        rbox(0.2, 0.035, 0.18, 0.012, p['char'], (RX, yy, 0.0), seg=2)
    for k in range(nrods):
        i, j = k % 3, k // 3
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.022, depth=0.5, location=(RX - 0.05 + i * 0.05, RY, 0.2 + j * 0.045), rotation=(math.pi / 2, 0, 0))
        _done(bpy.context.object, p['steel'])
    for k in range(3):
        bxk = RX - 0.06 + k * 0.06
        cone(0.028, 0.006, 0.08, p['char'], (bxk, RY - 0.36, 0.06))
        cyl(0.012, 0.02, p['orange'], (bxk, RY - 0.36, 0.09), bev=0.004)
    rbox(0.22, 0.08, 0.02, 0.008, p['cream2'], (RX, RY - 0.36, 0.0), seg=2)
    # the geologist's booth at the front left: a door and a lit window with a desk
    CX, CY, CW, CD, CH = -0.74, -0.42, 0.38, 0.32, 0.52
    rbox(CW + 0.06, CD + 0.06, 0.06, 0.11, p['char'], (CX, CY, 0.0))
    booth = rbox(CW, CD, CH, 0.09, p['cream'], (CX, CY, 0.05), seg=5)
    lit_room(p, booth, 0.15, 0.18, 0.15, CX + 0.09, CY - CD / 2 + 0.01, 0.24, 0.0, lambda cx, cy, fz: desk(p, frame(cx, cy, 0.0), 0.0, fz, 0.0, 0.0, 0.13))
    rbox(CW + 0.02, CD + 0.02, 0.03, 0.09, p['orange'], (CX, CY, 0.16))
    door(p, CX - 0.09, CY - CD / 2 - 0.02, 0.0, 0.16, 0.4, 0.05)
    light(p, (CX + 0.1, CY + 0.05, 0.05 + CH + 0.01), 0.016)
    tube([(CX + CW / 2 - 0.02, CY + 0.08, 0.1), (HX - 0.3, HY - 0.3, 0.06), (HX - 0.12, HY - 0.12, 0.06)], 0.012, p['char'])

# ======================================================================================
# the dock and the frame of the ship (levels 12-19, docs/levels.md): an open platform on the Ark's plot, in front of it on
#    the right (the side of the crane), where the parts of the ship grow before the player's eyes. The Ark's fabricator
#    makes the parts from steel and its crane lowers each one onto the marked pad in the corner of the dock nearest to it
#    (the crane's jib reaches about 3.7 m); a small gantry on rails along the dock (proposal) carries it to its place.
#    The frame is a ship's skeleton on keel blocks, bow to the front (-y): the keel, U-shaped ribs, the stem and the
#    stringers. Four stages (200, 500, 1 000 and 1 500 steel): 1 the keel, the transom and three ribs; 2 seven ribs;
#    3 all ten ribs, the stem and the lower stringers; 4 the stringers and the deck beams: the frame is ready.
#    Stage 0 is the empty dock. Set on the Ark's plot with its centre at (2.32, -1.82) from the Ark, unturned:
#    the pad is then 0.87 from the crane's foot (the jib reaches 0.9) and the dock 0.1 clear of the Ark's leg. About 5.4 x 12.5 m.
# ======================================================================================
def b_dock(p, stage, hull=0):
    PW, PL, PZ = 1.26, 3.0, 0.07
    rbox(PW + 0.04, PL + 0.04, 0.03, 0.12, p['char'], (0, 0, 0.0))
    rbox(PW, PL, 0.05, 0.12, p['cream2'], (0, 0, 0.02))
    rbox(PW + 0.012, PL + 0.012, 0.012, 0.12, p['orange'], (0, 0, 0.042))
    for sx in (-1, 1):
        for sy in (-1, 1): light(p, (sx * (PW / 2 - 0.05), sy * (PL / 2 - 0.05), PZ + 0.004), 0.018)
    RX = 0.5
    for sx in (-1, 1): rbox(0.04, PL - 0.1, 0.022, 0.008, p['char'], (sx * RX, 0, PZ), seg=2)
    # the pad where the Ark's crane puts the parts down: an orange edge round a dark square, a teal light by it
    PDX, PDY = -0.24, 1.38
    rbox(0.4, 0.3, 0.006, 0.02, p['orange'], (PDX, PDY, PZ), seg=2)
    rbox(0.34, 0.24, 0.009, 0.015, p['char'], (PDX, PDY, PZ), seg=2)
    light(p, (PDX + 0.23, PDY - 0.16, PZ + 0.004), 0.016)
    # the hull's lines: half-width and depth below the deck line, bow at y = -1.3, transom at 1.2
    ZT = 0.67
    def w(y):
        if y >= -0.2: return 0.37 - 0.03 * max(0.0, (y - 0.4) / 0.8)
        return 0.37 * max(0.0, (y + 1.3) / 1.1) ** 0.6
    def h(y):
        if y >= -0.3: return 0.42 - 0.04 * max(0.0, (y - 0.4) / 0.8)
        return 0.42 - 0.3 * ((-0.3 - y) / 1.0) ** 1.5
    def rib_pts(y, n=13, lift=0.0):
        return [(w(y) * math.sin(t), y, ZT + lift - h(y) * math.cos(t)) for t in [-math.pi / 2 + k * math.pi / (n - 1) for k in range(n)]]
    RIBS = [1.05, 0.83, 0.61, 0.39, 0.17, -0.05, -0.27, -0.49, -0.71, -0.93]
    nribs = {0: 0, 1: 3, 2: 7, 3: 10, 4: 10}[stage]
    # the keel blocks: dark blocks with orange saddles, between the ribs
    for cy in (0.94, 0.5, 0.06, -0.38):
        kb_ = ZT - h(cy) - 0.03
        rbox(0.26, 0.1, kb_ - PZ - 0.024, 0.02, p['char'], (0, cy, PZ), seg=2)
        rbox(0.2, 0.12, 0.024, 0.01, p['orange'], (0, cy, kb_ - 0.024), seg=2)
    if stage >= 1:
        ky = [y / 20 for y in range(24, -19, -1)]                     # 1.2 down to -0.9
        tube([(0, y, ZT - h(y)) for y in ky], 0.03, p['steel'])                                    # the keel
        tube(rib_pts(1.2), 0.022, p['steel'])                                                      # the transom
        tube([(-w(1.2), 1.2, ZT), (w(1.2), 1.2, ZT)], 0.02, p['steel'])
        for y in RIBS[:nribs]: tube(rib_pts(y), 0.022, p['steel'])
    if stage >= 3:
        sp = [(0, -0.9, ZT - h(-0.9)), (0, -1.08, ZT - h(-1.08) + 0.02), (0, -1.2, ZT - 0.18), (0, -1.28, ZT - 0.04), (0, -1.3, ZT + 0.04)]
        tube(sp, 0.026, p['steel'])                                                                # the stem
        def stem_y(z):
            for a, b in zip(sp, sp[1:]):
                if a[2] <= z <= b[2]: return a[1] + (b[1] - a[1]) * (z - a[2]) / (b[2] - a[2])
            return sp[-1][1]
        ts = [0.9] if stage == 3 else [0.9, 0.45, math.pi / 2]
        for t in ts:
            for sx in (-1, 1):
                pts = [(sx * w(y) * math.sin(t), y, ZT - h(y) * math.cos(t)) for y in [1.2] + RIBS]
                zb = pts[-1][2]; pts.append((sx * 0.02, stem_y(zb) + 0.02, zb))
                tube(pts, 0.018, p['steel'])
    if stage >= 4:
        for y in RIBS: tube([(-w(y), y, ZT), (w(y), y, ZT)], 0.016, p['steel'])                   # the deck beams
        rbox(0.16, 0.012, 0.07, 0.008, p['orange'], (0, 1.2 + 0.03, ZT - 0.16), seg=1)              # an orange plate on the transom
    # ---- the hull (levels 22, 24, 27, 29): steel plates welded on the frame, outside the ribs. Stage 1 the middle of
    #      the sides (proposal: levels.md does not say), stage 2 the sides, stage 3 the bottom and the back (sandwich
    #      panels: steel, wool, steel), stage 4 the bow and the stern with their hatches; then the hull is whole.
    if hull:
        o_ = 0.03
        plate = mat('hullplate', '#c3ccd4', 0.4); seam = mat('seam', '#8e99a3', 0.5)
        def P(y, t, off=o_):
            return (math.sin(t) * (w(y) + off), y, ZT - math.cos(t) * (h(y) + off))
        def surf(f, nu, nv, m):
            bm = bmesh.new()
            vs = [[bm.verts.new(f(i, j)) for j in range(nv)] for i in range(nu)]
            for i in range(nu - 1):
                for j in range(nv - 1): bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
            me = bpy.data.meshes.new('skin'); bm.to_mesh(me); bm.free()
            ob = bpy.data.objects.new('skin', me); bpy.context.collection.objects.link(ob)
            return _done(ob, m)
        def side(y0, y1, t0, t1, nu=None):
            nu = nu or max(3, int(abs(y1 - y0) / 0.05) + 1); nv = max(3, int(abs(t1 - t0) / 0.12) + 1)
            surf(lambda i, j: P(y0 + (y1 - y0) * i / (nu - 1), t0 + (t1 - t0) * j / (nv - 1)), nu, nv, plate)
            for y in [1.2] + RIBS:                                                     # the welds over the ribs
                if min(y0, y1) + 1e-3 < y < max(y0, y1) - 1e-3:
                    tube([P(y, t0 + (t1 - t0) * k / 8, o_ + 0.004) for k in range(9)], 0.006, seam)
        def deck(y0, y1):
            nu = max(3, int(abs(y1 - y0) / 0.05) + 1)
            surf(lambda i, j: ((2 * j - 1) * (w(y0 + (y1 - y0) * i / (nu - 1)) + o_), y0 + (y1 - y0) * i / (nu - 1), ZT + 0.025), nu, 2, plate)
        TS = 0.55                                                                   # where the sides meet the bottom
        YB, YS = -0.93, 1.05                                                        # the bow and the stern pieces start here
        if hull == 1:
            for sg in (-1, 1): side(-0.27, 0.39, sg * TS, sg * math.pi / 2)
        if hull >= 2:
            for sg in (-1, 1): side(YB, YS, sg * TS, sg * math.pi / 2)
        if hull >= 3:
            side(YB, YS, -TS, TS)
            deck(YB, YS)
            for (y0_, y1_) in ((-0.12, -0.11), (0.33, 0.34)):                          # the removable panel in the middle
                rbox(0.5, 0.025, 0.012, 0.006, p['orange'], (0, (y0_ + y1_) / 2, ZT + 0.025), seg=1)
            for sx in (-0.25, 0.25): rbox(0.025, 0.47, 0.012, 0.006, p['orange'], (sx, 0.11, ZT + 0.025), seg=1)
        if hull >= 4:
            side(-1.29, YB, -math.pi / 2, math.pi / 2, 9)
            side(YS, 1.2, -math.pi / 2, math.pi / 2, 3)
            deck(-1.29, YB); deck(YS, 1.2)
            # the transom: a flat face at the stern, with the cargo hatch
            bm = bmesh.new()
            ring = [bm.verts.new((math.sin(t) * (w(1.2) + o_), 1.2 + 0.001, ZT + 0.025 - math.cos(t) * (h(1.2) + o_ + 0.025))) for t in [-math.pi / 2 + k * math.pi / 16 for k in range(17)]]
            bm.faces.new(ring)
            me = bpy.data.meshes.new('transom'); bm.to_mesh(me); bm.free()
            ob = bpy.data.objects.new('transom', me); bpy.context.collection.objects.link(ob); _done(ob, plate)
            rbox(0.26, 0.03, 0.2, 0.03, p['orange'], (0, 1.2 + o_, ZT - 0.26), seg=2)
            rbox(0.21, 0.035, 0.16, 0.025, p['char'], (0, 1.2 + o_, ZT - 0.24), seg=2)
            light(p, (0.16, 1.2 + o_ + 0.01, ZT - 0.05), 0.016)
            # the round hatch on the back near the bow, and the orange stripe along the sides
            cyl(0.07, 0.02, p['char'], (0, -1.05, ZT + 0.02), bev=0.008, verts=28)
            torus(0.072, 0.012, p['orange'], (0, -1.05, ZT + 0.04))
            for sg in (-1, 1):
                tube([P(y, sg * 1.25, o_ + 0.006) for y in [1.2 - k * 0.1 for k in range(24)]], 0.012, p['orange'])
    # the gantry: legs on the rails, the orange beam, the trolley and the hook with the next part
    GZ = 0.98
    if hull:
        gy, tx, load = {1: (0.17, 0.0, 'plate'), 2: (-0.71, 0.0, 'plate'), 3: (PDY, 0.0, 'panels'), 4: (PDY, 0.0, None)}[hull]
    else:
        gy, tx, load = {0: (PDY, PDX, 'pad'), 1: (RIBS[3], 0.0, 'rib'), 2: (RIBS[7], 0.0, 'rib'), 3: (PDY, 0.0, 'beams'), 4: (PDY, 0.0, None)}[stage]
    for sx in (-1, 1):
        rbox(0.08, 0.2, 0.05, 0.02, p['char'], (sx * RX, gy, PZ + 0.02), seg=2)
        for sy in (-1, 1): cyl(0.022, 0.012, p['char'], (sx * RX + sx * 0.045, gy + sy * 0.06, PZ + 0.02), (0, math.pi / 2, 0), bev=0.004)
        rbox(0.06, 0.1, GZ - PZ - 0.07, 0.025, p['cream'], (sx * RX, gy, PZ + 0.07), seg=3)
        light(p, (sx * (RX + 0.07), gy, GZ + 0.04), 0.016)
    rbox(2 * RX + 0.14, 0.1, 0.08, 0.03, p['orange'], (0, gy, GZ), seg=3)
    rbox(0.14, 0.14, 0.06, 0.02, p['char'], (tx, gy, GZ - 0.06), seg=2)
    ball(0.02, p['lampw'], (tx + 0.1, gy, GZ - 0.01), seg=10)
    hz = {'pad': PZ + 0.2, 'rib': ZT + 0.2, 'beams': GZ - 0.14, 'plate': ZT + 0.2, 'panels': GZ - 0.14, None: GZ - 0.14}[load]
    tube([(tx, gy, GZ - 0.06), (tx, gy, hz + 0.03)], 0.007, p['char'])
    torus(0.022, 0.007, p['char'], (tx, gy, hz), (math.pi / 2, 0, 0))
    if load == 'rib':
        hung = rib_pts(gy, lift=0.12)
        tube(hung, 0.022, p['steel'])
        for e in (hung[0], hung[-1]): tube([(tx, gy, hz - 0.02), e], 0.005, p['char'])
    elif load == 'plate':                                 # the next side plate on the hook, curved like the hull
        sg = 1 if hull == 1 else -1
        pl = [P(gy + dy, sg * t, o_) for dy in (-0.09, 0.09) for t in (0.75, 1.0, 1.25, 1.5)]
        bm = bmesh.new(); vv = [bm.verts.new((x_, y_, z_ + 0.14)) for (x_, y_, z_) in pl]
        for j in range(3): bm.faces.new((vv[j], vv[j + 1], vv[j + 5], vv[j + 4]))
        me = bpy.data.meshes.new('hung'); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new('hung', me); bpy.context.collection.objects.link(ob); _done(ob, plate)
        for e in (pl[0], pl[3]): tube([(tx, gy, hz - 0.02), (e[0], e[1], e[2] + 0.14)], 0.005, p['char'])
    elif load == 'panels':                                # the sandwich panels for stage 4 wait on the pad: steel, wool, steel
        for k in range(3):
            rbox(0.34, 0.06, 0.012, 0.005, plate, (PDX, PDY - 0.07 + k * 0.07, PZ + 0.009), seg=1)
            rbox(0.33, 0.055, 0.02, 0.005, mat('wool', '#d9c48c', 0.95), (PDX, PDY - 0.07 + k * 0.07, PZ + 0.021), seg=1)
            rbox(0.34, 0.06, 0.012, 0.005, plate, (PDX, PDY - 0.07 + k * 0.07, PZ + 0.041), seg=1)
    elif load == 'beams':                                 # the stringers for stage 4 wait on the pad, the hook is up
        for k in range(3): rbox(0.34, 0.05, 0.04, 0.012, p['steel'], (PDX, PDY - 0.07 + k * 0.07, PZ + 0.009), seg=2)
    # two floodlight masts at the front corners, for work at night
    for sx in (-1, 1):
        mx, my = sx * 0.58, -1.38
        cyl(0.035, 0.03, p['char'], (mx, my, PZ), bev=0.01)
        cyl(0.02, 0.82, p['cream'], (mx, my, PZ + 0.02), bev=0.008, verts=16)
        rbox(0.1, 0.07, 0.05, 0.02, p['char'], (mx - sx * 0.02, my + 0.02, PZ + 0.84), (D2R(-25), 0, D2R(sx * 30)), seg=2)
        ball(0.022, p['lampw'], (mx - sx * 0.035, my + 0.05, PZ + 0.855), seg=10)

# ======================================================================================
# the Ark (Joro picked idea A, 06.11.2026, and wanted it bigger and plainly a rescue ship, on a plot of 2x2):
#    the ship we came in, standing upright on four legs where it landed. All 100 colonists are aboard, in four pod decks
#    of 25 behind glass round a column that brings the pods power and cold; at level 10 ten pods are open (those people
#    are awake), the next one in the row glows (it has power, its sleeper is next) and the rest are dark (docs/levels.md).
#    Below the decks: the reactor, the airlock with the lift down to the ground, the hold with the
#    cargo hatch, the crane and the containers. Above: the bridge with searchlights round it, the drone's balcony with
#    its hatch, and the orange top of a lifeboat with reflective tape and a beacon. About 33 m high at 4.15 m a unit.
#    The parked drone is its own mesh ('parked_drone') and an empty marks its pad ('drone_pad'), so the build sequence
#    can send that drone out.
# ======================================================================================
D2R = math.radians

def pod(p, at, fr, z, state, s=1.0, seg=3):
    """a life pod standing with its glass lid towards the window (-inward(fr)).
    state: 'sleep' (has power, its sleeper is next: teal), 'dark' (no power yet), 'open' (the lid is open, the person is awake)"""
    x, y = at; t, i = tangent(fr), inward(fr)
    L = frame(x, y, fr)
    W, D, H = 0.17 * s, 0.13 * s, 0.46 * s
    rbox(W, D, H, 0.06 * s, p['cream'], (x, y, z), (0, 0, fr), seg=seg)
    if seg > 2: rbox(W + 0.012, D + 0.012, 0.045 * s, 0.03 * s, p['char'], (x, y, z), (0, 0, fr), seg=2)   # the dark foot (left off the Ark's 100, to keep it light)
    fv = -D / 2
    inner = {'sleep': p['teal'], 'dark': p['char'], 'open': p['win']}[state]
    rbox(W * 0.62, 0.012, H * 0.62, 0.03 * s, inner, (*L(0, fv - 0.004), z + H * 0.2), (0, 0, fr), seg=min(seg, 2) if seg > 2 else 1)
    lw, lh = W * 0.72, H * 0.7
    if state != 'open':
        rbox(lw, 0.016, lh, 0.035 * s, p['glass'], (*L(0, fv - 0.014), z + H * 0.16), (0, 0, fr), seg=2)
    else:
        # the lid has swung open on its hinge at one side, out towards the window
        th = D2R(75)
        hx, hy = L(lw / 2, fv - 0.014)
        d = (-t[0] * math.cos(th) - i[0] * math.sin(th), -t[1] * math.cos(th) - i[1] * math.sin(th))
        rbox(lw, 0.016, lh, 0.035 * s, p['glass'], (hx + d[0] * lw / 2, hy + d[1] * lw / 2, z + H * 0.16), (0, 0, math.atan2(d[1], d[0])), seg=2)
    # the status light on top: teal = power and a sleeper, warm = open and empty, none = no power
    if state != 'dark':
        ball(0.018 * s, p['teal'] if state == 'sleep' else p['win'], (*L(0, fv + 0.01), z + H + 0.005), seg=10)

def hatch(p, x, y, fr, w=0.4, h=0.46, z=0.1):
    """the cargo hatch: a roll-up door in an orange frame, with a light over it"""
    n = (math.sin(fr), -math.cos(fr)); t = tangent(fr)
    rbox(w + 0.08, 0.06, h + 0.05, 0.04, p['orange'], (x, y, z), (0, 0, fr))
    rbox(w, 0.08, h, 0.03, p['char'], (x, y, z), (0, 0, fr))
    for k in range(int(h / 0.07)):
        rbox(w - 0.03, 0.012, 0.012, 0.004, p['grey'], (x + n[0] * 0.042, y + n[1] * 0.042, z + 0.05 + k * 0.07), (0, 0, fr), seg=1)
    light(p, (x + n[0] * 0.03 + t[0] * (w / 2 + 0.07), y + n[1] * 0.03 + t[1] * (w / 2 + 0.07), z + h + 0.02), 0.026)

def container(p, at, rz=0.0, w=0.4, d=0.34, h=0.32, eye=True):
    """a cargo container from the Ark's hold: cream with an orange lower half, charcoal ribs, a lifting eye on the lid"""
    x, y = at
    rbox(w, d, h, 0.05, p['cream'], (x, y, 0.0), (0, 0, rz))
    rbox(w + 0.01, d + 0.01, h * 0.42, 0.05, p['orange'], (x, y, 0.0), (0, 0, rz))
    for k in range(4):
        u = -w / 2 + 0.07 + k * (w - 0.14) / 3
        rbox(0.02, d + 0.02, h, 0.008, p['char'], (x + math.cos(rz) * u, y + math.sin(rz) * u, 0.0), (0, 0, rz), seg=1)
    if eye:
        torus(0.025, 0.008, p['char'], (x, y, h + 0.022), (math.pi / 2, 0, rz))

def drone_at(p, at, s):
    """the building drone (b_drone), scaled and parked at `at`; returns its parts"""
    before = set(bpy.data.objects)
    b_drone(p)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        o.location = (o.location.x * s + at[0], o.location.y * s + at[1], o.location.z * s + at[2])
        o.scale = (o.scale.x * s, o.scale.y * s, o.scale.z * s)
    return new

def pad(p, at, r=0.3):
    """the drone's pad: a dark disc with an orange ring and lights round its edge"""
    x, y, z = at
    cyl(r, 0.045, p['char'], (x, y, z), bev=0.015)
    torus(r - 0.05, 0.012, p['orange'], (x, y, z + 0.045))
    for k in range(6):
        a = k * math.pi / 3 + 0.3
        light(p, (x + math.cos(a) * (r - 0.015), y + math.sin(a) * (r - 0.015), z + 0.05), 0.016)

def cone(r1, r2, h, m, loc, rot=(0, 0, 0), verts=40):
    """a cone from radius r1 at the bottom to r2 at the top; loc is its centre"""
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    bv = o.modifiers.new('b', 'BEVEL'); bv.width = min(0.02, h / 4); bv.segments = 3; bv.limit_method = 'ANGLE'; bv.angle_limit = D2R(30)
    _apply(o)
    return _done(o, m)

def radiator(p, a, r0, r1, z0, z1, mounts):
    """a radiator panel standing out from a round hull along the direction a (radians), on its coolant pipes:
    a plain cream panel with an orange outer edge and the charcoal manifold along the inner edge"""
    rc = (r0 + r1) / 2; c, s_ = math.cos(a), math.sin(a)
    rbox(r1 - r0, 0.03, z1 - z0, 0.015, p['cream'], (c * rc, s_ * rc, z0), (0, 0, a), seg=2)
    rbox(0.035, 0.045, z1 - z0, 0.015, p['orange'], (c * (r1 - 0.012), s_ * (r1 - 0.012), z0), (0, 0, a), seg=2)
    cyl(0.022, z1 - z0 - 0.04, p['char'], (c * (r0 + 0.01), s_ * (r0 + 0.01), z0 + 0.02), bev=0.008)
    for (zm, rh) in mounts:
        tube([(c * rh, s_ * rh, zm), (c * (r0 + 0.01), s_ * (r0 + 0.01), zm)], 0.022, p['char'])

def ring(R, r, m, loc, major=64, minor=8):
    """a thin torus lying flat, lighter than kb.torus"""
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=major, minor_segments=minor, location=loc)
    return _done(bpy.context.object, m)

def deck(p, R, z0, z1, states, pr=None, core=0.2, mullions=None, seg=3):
    """a pod deck: a glass ring with the pods round a column that brings them power and cold"""
    pr = pr or R * 0.65
    torus_ = torus if seg > 2 else (lambda RR, rr, m, loc: ring(RR, rr, m, loc, 72 if RR > 1 else 40))
    cyl(R - 0.02, 0.03, p['floor'], (0, 0, z0), bev=0.005, verts=72)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=R, depth=z1 - z0, location=(0, 0, (z0 + z1) / 2), end_fill_type='NOTHING')
    _done(bpy.context.object, p['glass'])
    for zr in (z0, z1):
        torus_(R + 0.005, 0.032, p['char'], (0, 0, zr))
    nm = mullions or len(states)
    for k in range(nm):
        a = 2 * math.pi * (k + 0.5) / nm
        rbox(0.032, 0.032, z1 - z0, 0.012, p['char'], (math.cos(a) * R, math.sin(a) * R, z0), (0, 0, a), seg=1)
    cyl(core, z1 - z0 - 0.03, p['cream2'], (0, 0, z0 + 0.03), bev=0.03, verts=48)
    for zr in (z0 + 0.2, z0 + 0.42):
        torus_(core + 0.005, 0.013, p['teal'], (0, 0, zr))
    torus_((pr + core) / 2, 0.012, p['lampw'], (0, 0, z1 - 0.03))
    n = len(states)
    for k, st in enumerate(states):
        ar = 2 * math.pi * k / n
        pod(p, (math.cos(ar) * pr, math.sin(ar) * pr), ar + math.pi / 2, z0 + 0.03, st, seg=seg)

def join_all(keep=()):
    """one mesh with a part per material, so the file stays light; the objects in `keep` stay apart"""
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o not in keep]
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    objs = [o for o in objs if o.type == 'MESH']
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    return o

def export_light(path):
    """like kb.export, without texture coordinates (nothing here has a texture) and with positions to about a millimetre"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, use_selection=False,
                              export_texcoords=False, export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=7, export_draco_position_quantization=12)

ARK_KEEP = []
def ark_dish(p, at, state, outward=D2R(330)):
    """the Ark's dish (level 18, docs/levels.md) on its base at `at`: 'folded' as it was stowed for the landing and broken
    there (eight cream petals closed like an umbrella round the mast, no light); 'open' after the repair (the dish about
    3.5 m across, an orange rim, the receiver on three struts, its light on), looking up at the containers in orbit"""
    x, y, z = at
    cyl(0.12, 0.06, p['cream2'], (x, y, z - 0.02), bev=0.02)
    if state == 'open':
        import mathutils
        cyl(0.04, 0.24, p['char'], (x, y, z + 0.03), bev=0.012)
        G = Vector((x, y, z + 0.3)); ball(0.06, p['char'], tuple(G), seg=14)                 # the gimbal on the mast
        el = D2R(50); n = Vector((math.cos(outward) * math.cos(el), math.sin(outward) * math.cos(el), math.sin(el)))
        r = 0.42; c = G + n * 0.19                                     # the dish's back just touches the gimbal
        d = dome(r, p['cream'], (0, 0, 0), seg=40, sz=0.3)
        sm = d.modifiers.new('shell', 'SOLIDIFY'); sm.thickness = 0.02; _apply(d)
        q = (-n).to_track_quat('Z', 'Y')                                                      # the dome's top is the dish's back
        d.matrix_world = mathutils.Matrix.Translation(c) @ q.to_matrix().to_4x4()
        bpy.context.view_layer.objects.active = d; bpy.ops.object.select_all(action='DESELECT'); d.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
        rq = n.to_track_quat('Z', 'Y').to_euler()
        torus(r, 0.035, p['orange'], tuple(c), tuple(rq))
        M = n.to_track_quat('Z', 'Y').to_matrix(); hub = c + n * (r * 0.45)
        for k in range(3):
            a = k * 2.094 + 0.5; rim = c + M @ Vector((math.cos(a) * r * 0.97, math.sin(a) * r * 0.97, 0))
            tube([tuple(rim), tuple(hub)], 0.01, p['char'])
        light(p, tuple(hub), 0.035)
        return
    cyl(0.04, 0.24, p['char'], (x, y, z + 0.03), bev=0.012)
    hub = Vector((x, y, z + 0.3))
    ball(0.06, p['char'], tuple(hub), seg=14)
    ax = Vector((math.cos(outward) * math.sin(D2R(25)), math.sin(outward) * math.sin(D2R(25)), math.cos(D2R(25))))
    import mathutils
    q = ax.to_track_quat('Z', 'Y')
    for k in range(8):
        a = k * math.pi / 4
        rad = q @ Vector((math.cos(a), math.sin(a), 0))
        base = hub + rad * 0.07 + ax * 0.03
        tip = hub + rad * 0.03 + ax * 0.5
        L_ = (tip - base).length; zc = (tip - base).normalized()
        xc = ax.cross(rad).normalized(); yc = zc.cross(xc)
        o = rbox(0.1, 0.014, L_, 0.006, p['cream'], (0, 0, -L_ / 2), seg=2)       # centred on the origin
        M = mathutils.Matrix((xc, yc, zc)).transposed().to_4x4(); M.translation = (base + tip) / 2
        o.matrix_world = M
        bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    cyl(0.03, 0.04, p['orange'], tuple(hub + ax * 0.5), bev=0.01)

def b_arkdish(p, state):
    """the dish alone on a piece of the Ark's orange top, for the close look"""
    dome(1.3, p['orange'], (0, 0, -1.0), seg=64, sz=0.95)
    zt = -1.0 + 1.3 * 0.95 * math.sqrt(1 - (0.0 / 1.3) ** 2)
    ark_dish(p, (0, 0, zt), state, D2R(-45))

def b_ark(p, dish_state='folded'):
    R = 1.3
    Z_SKIRT, Z_HULL, Z_DECKS, DECK, RING = 0.75, 1.2, 2.65, 0.65, 0.2
    Z_UP = Z_DECKS + 4 * DECK + 3 * RING
    Z_NOSE = Z_UP + 0.7
    beacon = mat('beacon', '#ff6a3a', 0.3, emit='#ff4a1a', strength=3.0)
    tape = mat('reflective', '#ffffff', 0.25)
    # the engines under the skirt, the skirt (dark: the base of the ship), four landing legs between the doors
    for a, rr in ((0, 0.55), (90, 0.55), (180, 0.55), (270, 0.55), (0, 0.0)):
        cone(0.2, 0.1, 0.32, p['char'], (math.cos(D2R(a)) * rr, math.sin(D2R(a)) * rr, 0.59))
    cone(1.08, R + 0.015, Z_HULL - Z_SKIRT + 0.02, p['char'], (0, 0, (Z_SKIRT + Z_HULL + 0.02) / 2), verts=96)
    for a in (45, 135, 225, 315):
        c, s_ = math.cos(D2R(a)), math.sin(D2R(a))
        top, foot = Vector((c * 1.15, s_ * 1.15, 1.05)), Vector((c * 1.95, s_ * 1.95, 0.13))
        tube([tuple(top), tuple(foot)], 0.07, p['char'])
        tube([tuple(top.lerp(foot, 0.33)), tuple(top.lerp(foot, 0.6))], 0.092, p['orange'])
        ball(0.095, p['char'], tuple(foot), seg=16)
        cyl(0.2, 0.07, p['char'], (foot.x, foot.y, 0.0), bev=0.03)
    # the lower hull: the reactor, the airlock and the hold
    cyl(R, Z_DECKS - Z_HULL, p['cream'], (0, 0, Z_HULL), bev=0.05, verts=96)
    cyl(R + 0.014, 0.07, p['orange'], (0, 0, 2.42), bev=0.014, verts=96)
    door(p, 0.0, -R + 0.01, 0.0, w=0.36, h=0.6, z=1.28)
    rbox(0.44, 0.12, 0.035, 0.012, p['char'], (0.0, -R - 0.05, 1.245))
    hatch(p, R - 0.012, 0.0, math.pi / 2, w=0.6, h=0.62, z=1.28)
    for a in (290, 315, 340, 20, 65, 115, 160, 200, 250):
        c, s_ = math.cos(D2R(a)), math.sin(D2R(a))
        porthole(p, (c * R, s_ * R, 2.08), (c, s_), r=0.07)
    # the lift: two rails up the hull, the cage down on the ground, the hoist on top
    ly = -R - 0.1
    for sx in (-1, 1):
        cyl(0.032, 2.2, p['char'], (sx * 0.3, ly, 0.0), bev=0.012)
        for zb in (1.4, 2.0):
            rbox(0.05, 0.2, 0.05, 0.018, p['char'], (sx * 0.3, -R - 0.03, zb), seg=2)
    rbox(0.72, 0.15, 0.13, 0.035, p['char'], (0.0, ly - 0.01, 2.15))
    light(p, (0.0, ly - 0.09, 2.23), 0.028)
    rbox(0.56, 0.46, 0.05, 0.022, p['cream2'], (0.0, ly - 0.25, 0.0), seg=2)
    for sx in (-1, 1):
        side = sx * 0.26
        tube([(side, ly - 0.04, 0.36), (side, ly - 0.46, 0.36), (sx * 0.1, ly - 0.46, 0.36)], 0.016, p['orange'])
        for py in (ly - 0.04, ly - 0.46):
            cyl(0.014, 0.31, p['char'], (side, py, 0.05), bev=0.005)
    # no radiators on the sides of the reactor: Joro took them off (15.11.2026)
    # the crane over the cargo hatch, a container on its hook, and the Ark's little store of containers beside it
    rbox(0.18, 0.18, 0.12, 0.035, p['char'], (R + 0.02, 0.0, 2.16))
    tube([(R + 0.07, 0.0, 2.23), (1.62, 0.0, 2.56), (2.22, 0.0, 2.56)], 0.045, p['orange'])
    rbox(0.1, 0.1, 0.07, 0.025, p['char'], (2.22, 0.0, 2.49))
    tube([(2.22, 0.0, 2.49), (2.22, 0.0, 0.445)], 0.01, p['char'])
    container(p, (2.22, 0.0), 0.0, 0.5, 0.42, 0.4)
    torus(0.03, 0.01, p['char'], (2.22, 0.0, 0.43), (math.pi / 2, 0, 0))
    for y in (0.62, 1.1):
        container(p, (2.2, y), 0.0, 0.5, 0.42, 0.4, eye=False)
    bpy.ops.object.select_all(action='DESELECT')
    top = [o for o in bpy.data.objects]
    container(p, (2.2, 0.86), 0.0, 0.5, 0.42, 0.4, eye=False)
    for o in bpy.data.objects:
        if o not in top: o.location.z += 0.4
    # four pod decks of 25 with a ring of hull between them: all 100 colonists
    order = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21]          # the ten awake, in the order they woke
    for d in range(4):
        z0 = Z_DECKS + d * (DECK + RING)
        states = ['dark'] * 25
        if d == 0:
            for k in order: states[k] = 'open'
            states[22] = 'sleep'
        deck(p, R, z0, z0 + DECK, states, pr=0.86, core=0.35, mullions=16, seg=2)
        if d < 3:
            cyl(R, RING, p['cream'], (0, 0, z0 + DECK), bev=0.0, verts=96)
    # the upper hull: the bridge with its round windows and the searchlights that light the ground round the ship
    cyl(R, Z_NOSE - Z_UP, p['cream'], (0, 0, Z_UP), bev=0.0, verts=96)
    for k in range(12):
        a = D2R(k * 30)
        if 205 <= k * 30 <= 245: continue                       # the drone's hatch is here
        c, s_ = math.cos(a), math.sin(a)
        porthole(p, (c * R, s_ * R, Z_UP + 0.34), (c, s_), r=0.075)
    for a in (22.5, 112.5, 187.5, 292.5):
        ar = D2R(a); c, s_ = math.cos(ar), math.sin(ar)
        zl = Z_NOSE - 0.12
        tube([(c * (R - 0.01), s_ * (R - 0.01), zl), (c * (R + 0.1), s_ * (R + 0.1), zl)], 0.022, p['char'])
        tilt = D2R(35)
        d = Vector((c * math.cos(tilt), s_ * math.cos(tilt), -math.sin(tilt)))
        q = d.to_track_quat('Z', 'Y').to_euler()
        hc = Vector((c * (R + 0.16), s_ * (R + 0.16), zl - 0.03))
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.075, depth=0.15, location=tuple(hc), rotation=q)
        _done(bpy.context.object, p['cream2'])
        bpy.ops.mesh.primitive_torus_add(major_radius=0.075, minor_radius=0.014, major_segments=24, minor_segments=8, location=tuple(hc + d * 0.075), rotation=q)
        _done(bpy.context.object, p['orange'])
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.062, depth=0.01, location=tuple(hc + d * 0.077), rotation=q)
        _done(bpy.context.object, p['lampw'])
    # the orange top, like the canopy of a lifeboat, with reflective tape, the beacon and the antenna
    dome(R, p['orange'], (0, 0, Z_NOSE), seg=64, sz=0.95)
    torus(R + 0.005, 0.036, p['char'], (0, 0, Z_NOSE + 0.01))
    for k in range(10):
        az, el = D2R(k * 36 + 18), D2R(36)
        n = Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)))
        pt = Vector((n.x * R, n.y * R, Z_NOSE + n.z * R * 0.95))
        rbox(0.1, 0.26, 0.016, 0.007, tape, tuple(pt - n * 0.005), tuple(n.to_track_quat('Z', 'Y').to_euler()), seg=1)
    TOPZ = Z_NOSE + R * 0.95
    cyl(0.14, 0.06, p['cream2'], (0, 0, TOPZ - 0.035), bev=0.025)
    ball(0.06, beacon, (0, 0, TOPZ + 0.09), seg=16)
    dome(0.09, p['glass'], (0, 0, TOPZ + 0.025), seg=20, sz=1.3)
    mx, my = math.cos(D2R(150)) * 0.8, math.sin(D2R(150)) * 0.8
    mz = Z_NOSE + R * 0.95 * math.sqrt(1 - (0.8 / R) ** 2)
    cyl(0.016, 0.5, p['char'], (mx, my, mz - 0.04), bev=0.005)
    light(p, (mx, my, mz + 0.47), 0.026)
    # the dish at the front right of the top, where the map's camera sees it: folded until level 18, open after
    dr = 0.75; da = D2R(330)
    ark_dish(p, (math.cos(da) * dr, math.sin(da) * dr, Z_NOSE + R * 0.95 * math.sqrt(1 - (dr / R) ** 2)), dish_state, da)
    # the drone's balcony on the upper hull, with the small hatch it goes in by (for paste and charge)
    a = D2R(225); c, s_ = math.cos(a), math.sin(a)
    bz = Z_UP + 0.03
    rbox(0.5, 0.18, 0.07, 0.025, p['char'], (c * (R + 0.14), s_ * (R + 0.14), bz - 0.07), (0, 0, a), seg=2)
    pad(p, (c * (R + 0.44), s_ * (R + 0.44), bz), 0.4)
    pz = bz + 0.045
    # the parked drone is as big as the one that flies in the build sequence (1.1 here x 4.15 m = 4.6 m a unit)
    ARK_KEEP[:] = [join(drone_at(p, (c * (R + 0.44), s_ * (R + 0.44), pz), 1.1), 'parked_drone')]
    e = bpy.data.objects.new('drone_pad', None); bpy.context.collection.objects.link(e)
    e.location = (c * (R + 0.44), s_ * (R + 0.44), pz)
    door(p, c * (R - 0.012), s_ * (R - 0.012), a + math.pi / 2, w=0.26, h=0.3, z=bz + 0.09)

# ======================================================================================
# the purification station (level 23, docs/levels.md): the water from the homes, the kitchen and the canteen runs down
#    by itself to the lowest place under the homes and goes through the steps of a station on Earth, left to right:
#    the screen, the round settler (its sludge into a skip), the basin where bacteria with air break the dirt down
#    (a blower behind it), then in the hall the sand filter and the UV lamp. Out comes water for the patches on the
#    Green Belt, not for drinking: into the clean tank, and a pump lifts it up the slope. One engineer, at his desk.
# ======================================================================================
def b_pstation(p):
    dirty = mat('sewage', '#a89c6c', 0.25, alpha=0.92)
    mixed = mat('aerated', '#b7d4a0', 0.25, alpha=0.9)
    uv = mat('uv', '#d2c4ff', 0.3, emit='#a98bff', strength=2.6)
    sludge = mat('sludge', '#6b5a40', 0.9)
    # ---- the hall on the right: the filter, the UV channel and the engineer's desk behind the front window
    HX, HY, HW, HD, HH = 0.52, 0.05, 0.95, 0.75, 0.55
    rbox(HW + 0.08, HD + 0.08, 0.06, 0.18, p['char'], (HX, HY, 0.0))
    hall = rbox(HW, HD, HH, 0.15, p['cream'], (HX, HY, 0.05), seg=5)
    def inside(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        # the UV channel: a dark trough with the lamps across it, glowing violet
        rbox(0.2, 0.18, 0.07, 0.02, p['char'], (*L(0.02, 0.02), fz), seg=2)
        for k in range(4): rbox(0.18, 0.016, 0.016, 0.006, uv, (*L(0.02, -0.04 + k * 0.03), fz + 0.07), seg=1)
        # the sand filter: a cream vessel with an orange ring and a gauge
        cyl(0.065, 0.2, p['cream2'], (*L(0.2, 0.05), fz), bev=0.03)
        torus(0.066, 0.008, p['orange'], (*L(0.2, 0.05), fz + 0.13))
        light(p, (*L(0.2, -0.02), fz + 0.17), 0.012)
        # the engineer's desk with a screen
        desk(p, L, 0.0, fz, u=-0.19, v=0.05, w=0.15)
    lit_room(p, hall, 0.6, 0.27, 0.42, HX - 0.1, HY - HD / 2 + 0.01, 0.17, 0.0, inside)
    rbox(HW + 0.02, HD + 0.02, 0.035, 0.15, p['orange'], (HX, HY, 0.14))
    door(p, HX + 0.33, HY - HD / 2 - 0.02, 0.0, 0.2, 0.44, 0.05)
    for yy in (HY - 0.12, HY + 0.15): porthole(p, (HX + HW / 2, yy, 0.38), (1, 0), r=0.06)
    RZ = 0.05 + HH
    for x in (HX - 0.25, HX + 0.15): vent(p, (x, HY + 0.15, RZ - 0.01), 0.1)
    light(p, (HX + 0.38, HY - 0.15, RZ + 0.01), 0.02)
    # ---- the round settler at the front left: the dirty water lies still and the sludge sinks; the bridge turns slowly
    SX, SY, SR = -0.6, -0.25, 0.36
    cyl(SR + 0.04, 0.04, p['char'], (SX, SY, 0.0), bev=0.015, verts=48)
    cyl(SR, 0.16, p['cream'], (SX, SY, 0.03), bev=0.02, verts=48)
    torus(SR + 0.002, 0.012, p['orange'], (SX, SY, 0.1))
    cyl(SR - 0.03, 0.012, dirty, (SX, SY, 0.18), bev=0.004, verts=48)
    torus(SR - 0.015, 0.018, p['cream2'], (SX, SY, 0.192))
    cyl(0.05, 0.08, p['char'], (SX, SY, 0.17), bev=0.015)                       # the centre pillar
    rbox(0.1, 0.08, 0.06, 0.02, p['cream2'], (SX, SY, 0.25))                     # its motor
    light(p, (SX, SY, 0.33), 0.014)
    rbox(SR, 0.05, 0.025, 0.01, p['orange'], (SX + SR / 2, SY - 0.04, 0.24), seg=2)   # the bridge to the rim
    for k in (0.12, 0.24): cyl(0.008, 0.07, p['char'], (SX + k, SY - 0.06, 0.26), bev=0.003)
    rbox(0.22, 0.006, 0.006, 0.003, p['char'], (SX + 0.18, SY - 0.06, 0.33), seg=1)   # its handrail
    # the sludge goes from the settler into a skip at the side
    KX, KY = -1.1, -0.6
    rbox(0.2, 0.16, 0.1, 0.03, p['char'], (KX, KY, 0.0))
    rbox(0.17, 0.13, 0.02, 0.02, sludge, (KX, KY, 0.09))
    tube([(SX - SR + 0.02, SY - 0.12, 0.12), (KX + 0.06, KY + 0.02, 0.16)], 0.016, p['char'])
    # ---- the screen at the left: the inflow from the homes comes down the slope and passes a grid of bars
    GX, GY = -1.06, 0.15
    rbox(0.24, 0.22, 0.05, 0.04, p['char'], (GX, GY, 0.0))
    scr = rbox(0.2, 0.18, 0.2, 0.05, p['cream'], (GX, GY, 0.04))
    rbox(0.205, 0.185, 0.02, 0.05, p['orange'], (GX, GY, 0.15))
    for k in range(5): rbox(0.008, 0.012, 0.11, 0.003, p['char'], (GX - 0.06 + k * 0.03, GY - 0.093, 0.06), seg=1)
    light(p, (GX + 0.07, GY - 0.093, 0.21), 0.012)
    tube([(GX - 0.06, 1.05, 0.05), (GX - 0.06, GY + 0.1, 0.05), (GX - 0.06, GY + 0.07, 0.09)], 0.025, p['char'])   # from the homes
    torus(0.03, 0.008, p['orange'], (GX - 0.06, 0.95, 0.05), (math.pi / 2, 0, 0))
    tube([(GX + 0.06, GY - 0.09, 0.1), (GX + 0.1, GY - 0.13, 0.12), (SX - 0.25, SY + 0.25, 0.12)], 0.02, p['char'])   # into the settler
    # ---- the basin with air at the back left: bacteria eat the dirt; the blower pushes air through the bottom
    BX, BY, BW, BD = -0.55, 0.5, 0.74, 0.42
    rbox(BW + 0.06, BD + 0.06, 0.04, 0.05, p['char'], (BX, BY, 0.0))
    rbox(BW, BD, 0.16, 0.05, p['cream'], (BX, BY, 0.03))
    rbox(BW + 0.005, BD + 0.005, 0.02, 0.05, p['orange'], (BX, BY, 0.09))
    rbox(BW - 0.07, BD - 0.07, 0.012, 0.02, mixed, (BX, BY, 0.183), seg=2)
    for i in range(4):
        for j in range(3):
            ball(0.018 + 0.006 * ((i + j) % 2), p['steam'], (BX - 0.24 + i * 0.16 + 0.03 * (j % 2), BY - 0.11 + j * 0.11, 0.198), (1, 1, 0.5), seg=10)
    for (dx, dy) in ((-BW / 2 + 0.02, -BD / 2 + 0.02), (BW / 2 - 0.02, -BD / 2 + 0.02)): light(p, (BX + dx, BY + dy, 0.2), 0.012)
    air_unit(p, (BX + 0.05, BY + BD / 2 + 0.2, 0.0), 0.0, 0.8)
    tube([(BX + 0.05, BY + BD / 2 + 0.11, 0.2), (BX + 0.05, BY + BD / 2 + 0.11, 0.26), (BX + 0.05, BY + 0.1, 0.26), (BX + 0.05, BY + 0.1, 0.17)], 0.014, p['char'])
    tube([(SX + 0.15, SY + 0.33, 0.12), (SX + 0.15, BY - BD / 2 - 0.01, 0.12)], 0.018, p['char'])   # settler -> basin
    # ---- the basin -> the hall (into the filter and the UV)
    tube([(BX + BW / 2 + 0.01, HY + 0.25, 0.12), (HX - HW / 2 - 0.01, HY + 0.25, 0.12)], 0.02, p['char'])
    # ---- the clean water: out of the back of the hall into the tank (blue through the glass band), the pump lifts it
    #      up to the Green Belt along the ground
    TX, TY = HX + 0.3, HY + HD / 2 + 0.28
    cyl(0.17, 0.05, p['char'], (TX, TY, 0.0), bev=0.015)
    cyl(0.14, 0.26, p['cream'], (TX, TY, 0.04), bev=0.03)
    torus(0.141, 0.012, p['orange'], (TX, TY, 0.14))
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.14, depth=0.1, location=(TX, TY, 0.35), end_fill_type='NOTHING')
    _done(bpy.context.object, p['glass'])
    cyl(0.13, 0.09, p['water'], (TX, TY, 0.3), bev=0.0)
    cyl(0.145, 0.025, p['cream2'], (TX, TY, 0.4), bev=0.01)
    torus(0.145, 0.01, p['orange'], (TX, TY, 0.425))
    light(p, (TX, TY, 0.44), 0.014)
    tube([(TX - 0.12, HY + HD / 2 + 0.01, 0.12), (TX - 0.12, TY - 0.08, 0.12)], 0.018, p['char'])
    PX, PY = TX + 0.32, TY - 0.05
    rbox(0.18, 0.14, 0.04, 0.03, p['char'], (PX, PY, 0.0))
    rbox(0.16, 0.12, 0.13, 0.04, p['cream2'], (PX, PY, 0.035))
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.04, depth=0.1, location=(PX, PY - 0.03, 0.1), rotation=(0, math.pi / 2, 0))
    _done(bpy.context.object, p['char'])
    light(p, (PX + 0.05, PY - 0.065, 0.15), 0.012)
    tube([(TX + 0.14, TY - 0.05, 0.1), (PX - 0.08, PY, 0.1)], 0.018, p['char'])
    tube([(PX + 0.08, PY, 0.1), (PX + 0.2, PY, 0.1), (PX + 0.2, 1.05, 0.05)], 0.022, p['char'])   # up to the Green Belt
    torus(0.032, 0.008, p['orange'], (PX + 0.2, 0.95, 0.058), (math.pi / 2, 0, 0))


# ======================================================================================
# the field station (level 25, docs/levels.md): a small building on the edge of the Green Belt, with a store for seeds,
#    tools and a mast that measures the moisture and the wind; one agronomist. He sows the patches (the drone sprays the
#    grass), gathers the grass seed when it is ripe (the seed bin at the back) and lays the drip hoses: the water from the
#    purification station comes up the slope to the valves at the side and goes out to the patches. A small test bed of
#    grass in front, the tools and the barrow under the canopy, sacks of seed by the wall.
# ======================================================================================
def straw():
    return mat('straw', '#e8c86a', 0.7)

def hose():
    return mat('hose', '#3f9a4a', 0.5)

def tuft(p, at, s=1.0, seed=False):
    """a tuft of grass: three blades leaning out; a ripe one has a seed head"""
    x, y, z = at
    for k, (dx, dy) in enumerate(((0, 0), (0.012, 0.008), (-0.01, 0.01))):
        ball(1.0, p['leaf'] if k else p['leaf2'], (x + dx * s, y + dy * s, z + 0.03 * s), (0.012 * s, 0.012 * s, 0.045 * s), seg=8)
    if seed: ball(1.0, straw(), (x, y, z + 0.075 * s), (0.011 * s, 0.011 * s, 0.022 * s), seg=8)

def sack(p, at, rz=0.0):
    x, y, z = at
    rbox(0.13, 0.09, 0.07, 0.035, mat('sack', '#ead6a8', 0.9), (x, y, z), (0, 0, rz), seg=3)
    rbox(0.02, 0.095, 0.02, 0.008, p['orange'], (x + 0.035 * math.cos(rz), y + 0.035 * math.sin(rz), z + 0.055), (0, 0, rz), seg=1)

def b_fieldstation(p):
    W, D, H = 0.9, 0.62, 0.46
    rbox(W + 0.1, D + 0.1, 0.07, 0.14, p['char'], (0, 0, 0))
    body = rbox(W, D, H, 0.12, p['cream'], (0, 0, 0.06), seg=5)
    def inside(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        # the seed shelf on the back wall: jars of seed and soil; the sorting table with trays of sprouts
        rbox(0.26, 0.05, 0.012, 0.004, p['cream2'], (*L(0.0, 0.11), fz + 0.12), seg=1)
        jars(p, L, 0.0, fz + 0.132, 0.0, 0.11, 4)
        rbox(0.2, 0.09, 0.012, 0.006, p['cream2'], (*L(0.0, -0.01), fz + 0.07), seg=1)
        for sx in (-1, 1): rbox(0.012, 0.07, 0.07, 0.004, p['char'], (*L(sx * 0.085, -0.01), fz), seg=1)
        for k in (-1, 1):
            rbox(0.08, 0.06, 0.016, 0.006, p['soil'], (*L(k * 0.05, -0.01), fz + 0.082), seg=1)
            for j in range(3): ball(0.01, p['leaf2'], (*L(k * 0.05 - 0.02 + j * 0.02, -0.01), fz + 0.1), seg=8)
    lit_room(p, body, 0.36, 0.22, 0.3, -0.18, -D / 2 + 0.01, 0.17, 0.0, inside)
    rbox(W + 0.02, D + 0.02, 0.035, 0.12, p['orange'], (0, 0, 0.14))
    door(p, 0.25, -D / 2 - 0.02, 0.0, 0.2, 0.38, 0.06)
    porthole(p, (W / 2, 0.08, 0.32), (1, 0), r=0.055)
    # the roof: a soft cream gable with an orange ridge, a solar panel on the front slope, a vent and a light
    zb = 0.06 + H
    rh = gable(p, W + 0.1, D, zb, p['cream'])
    hcyl(0.03, W + 0.12, p['orange'], (0, 0, zb + rh - 0.02), 'x', bev=0.01)
    half = (D + 0.16) / 2; ang = math.atan2(rh, half)
    rbox(0.32, 0.22, 0.02, 0.02, p['navy'], (0.16, -half / 2 - math.sin(ang) * 0.02, zb + rh / 2 + math.cos(ang) * 0.02 - 0.01), (ang, 0, 0))
    vent(p, (-0.22, 0.08, zb + rh * 0.55), 0.08)
    light(p, (W / 2 + 0.02, 0.0, zb + rh + 0.02), 0.022)
    # the canopy on the left: the tools on the wall and the barrow with a sack of seed
    CX0, CX1 = -W / 2 - 0.02, -W / 2 - 0.42
    for yy in (-0.22, 0.24): cyl(0.016, 0.42, p['char'], (CX1 + 0.03, yy, 0.0), bev=0.005)
    rbox(0.44, 0.56, 0.025, 0.02, p['orange'], ((CX0 + CX1) / 2, 0.01, 0.42), (0, D2R(-8), 0), seg=2)
    for k, yy in enumerate((-0.12, -0.04, 0.04)):                              # a rake, a spade, a hoe leaning on the wall
        tube([(CX0 - 0.03, yy, 0.05), (CX0 - 0.005, yy, 0.36)], 0.007, p['wood'])
        if k == 1: rbox(0.012, 0.05, 0.07, 0.006, p['grey'], (CX0 - 0.032, yy, 0.0), seg=1)
        else: rbox(0.012, 0.07, 0.014, 0.004, p['char'], (CX0 - 0.03, yy, 0.04), seg=1)
    BX, BY = CX1 + 0.18, 0.16                                                   # the barrow
    rbox(0.16, 0.12, 0.07, 0.03, p['orange'], (BX, BY, 0.07))
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.035, depth=0.02, location=(BX - 0.1, BY, 0.035), rotation=(math.pi / 2, 0, 0))
    _done(bpy.context.object, p['char'])
    for dy in (-0.04, 0.04): tube([(BX + 0.06, BY + dy, 0.09), (BX + 0.17, BY + dy, 0.05)], 0.007, p['char'])
    sack(p, (BX, BY, 0.13), 0.3)
    # the seed bin at the back right: the ripe grass seed goes in at the top, a chute into the store
    SX, SY = W / 2 - 0.05, D / 2 + 0.2
    cyl(0.16, 0.04, p['char'], (SX, SY, 0.0), bev=0.015)
    cyl(0.13, 0.36, p['cream'], (SX, SY, 0.03), bev=0.03)
    for zz in (0.12, 0.3): torus(0.131, 0.01, p['orange'], (SX, SY, zz))
    dome(0.13, p['cream2'], (SX, SY, 0.39), seg=24, sz=0.6)
    light(p, (SX, SY, 0.48), 0.014)
    tube([(SX - 0.1, SY - 0.06, 0.12), (SX - 0.14, D / 2 + 0.01, 0.2)], 0.018, p['char'])
    # sacks of seed on a pallet by the right wall
    rbox(0.3, 0.2, 0.03, 0.01, p['wood'], (W / 2 + 0.2, -0.12, 0.0), seg=1)
    for (dx, dy, dz, r) in ((-0.06, -0.04, 0.03, 0.1), (0.07, -0.04, 0.03, -0.1), (0.0, 0.05, 0.03, 0.05), (0.0, 0.0, 0.1, 0.2)):
        sack(p, (W / 2 + 0.2 + dx, -0.12 + dy, dz), r)
    # the mast for the moisture and the wind, with the moisture probe in the ground at its foot
    MX, MY = W / 2 + 0.22, -D / 2 - 0.22
    anemometer(p, (MX, MY, 0.0), 0.62)
    # the test bed in front: thin soil, grass in rows, some ripe; the drip hose along it
    TX, TY = -0.42, -D / 2 - 0.26
    rbox(0.5, 0.26, 0.05, 0.03, p['soil'], (TX, TY, 0.0), seg=2)
    for i in range(6):
        for j in range(3):
            tuft(p, (TX - 0.2 + i * 0.08 + 0.02 * (j % 2), TY - 0.08 + j * 0.08, 0.045), 1.0, seed=(i + j) % 3 == 0)
    cyl(0.008, 0.08, p['char'], (MX + 0.07, MY + 0.03, 0.0), bev=0.003)     # the moisture probe at the mast's foot
    light(p, (MX + 0.07, MY + 0.03, 0.09), 0.012)
    # the water from the purification station comes up the slope to the valves; the green drip hoses go out to the patches
    VX, VY = -W / 2 - 0.2, D / 2 + 0.22
    tube([(-1.05, D / 2 + 0.5, 0.05), (VX - 0.08, VY + 0.04, 0.05)], 0.022, p['char'])
    rbox(0.18, 0.12, 0.12, 0.03, p['cream2'], (VX, VY, 0.0))
    for k in range(3):
        torus(0.018, 0.005, p['orange'], (VX - 0.05 + k * 0.05, VY - 0.065, 0.09), (math.pi / 2, 0, 0))
    hz = 0.012
    tube([(VX - 0.05, VY - 0.06, 0.03), (VX - 0.05, VY - 0.12, hz), (-1.05, VY - 0.12, hz)], 0.009, hose())
    tube([(VX, VY - 0.06, 0.03), (VX, VY - 0.18, hz), (-1.05, VY - 0.3, hz)], 0.009, hose())
    tube([(VX + 0.05, VY - 0.06, 0.03), (VX + 0.07, VY - 0.25, hz), (CX1 - 0.06, -0.2, hz), (TX - 0.27, TY + 0.06, hz), (TX - 0.27, TY - 0.04, hz), (TX + 0.24, TY - 0.04, 0.052)], 0.008, hose())


# ======================================================================================
# the nursery (level 26, docs/levels.md): next to the field station; a small glass house where the seeds of the sea
#    buckthorn sprout on benches (warm air from a heater at the back, water from the tank), and a yard under a net where
#    the saplings in pots get used to the cold and the wind before they go out (hardening, as in nurseries on Earth):
#    a net over them and a net on the windward side. One male to every eight females, so the males have an orange tag.
#    The agronomist takes them out in the barrow and plants them by hand. One agronomist.
# ======================================================================================
def sapling(p, at, s=1.0, male=False):
    x, y, z = at
    cyl(0.03 * s, 0.045 * s, p['orange'], (x, y, z), bev=0.008 * s, verts=16, seg=2)
    cyl(0.026 * s, 0.006, p['soil'], (x, y, z + 0.042 * s), bev=0.002, verts=16, seg=1)
    tube([(x, y, z + 0.045 * s), (x, y, z + 0.13 * s)], 0.004 * s, p['wood'])
    sea = mat('buckthorn', '#9dbb87', 0.75)
    for (dx, dy, dz, r) in ((0, 0, 0.13, 0.03), (0.022, 0.01, 0.105, 0.022), (-0.02, -0.01, 0.1, 0.022)):
        ball(r * s, sea, (x + dx * s, y + dy * s, z + dz * s), (1, 1, 1.2), seg=8)
    if male: rbox(0.03 * s, 0.006, 0.018 * s, 0.003, p['orange'], (x + 0.012 * s, y, z + 0.07 * s), seg=1)

def b_nursery(p):
    netm = mat('net', '#3d4d3a', 0.8, alpha=0.38)
    W, D, Z0, ZW = 0.9, 0.62, 0.06, 0.46
    # ---- the glass house: a low cream base, glass walls on cream posts, a glass gable roof with cream rafters
    rbox(W + 0.1, D + 0.1, Z0, 0.1, p['char'], (0, 0, 0))
    rbox(W, D, 0.11, 0.05, p['cream'], (0, 0, Z0), seg=3)
    rbox(W + 0.012, D + 0.012, 0.03, 0.05, p['orange'], (0, 0, Z0 + 0.08))
    zg = Z0 + 0.11
    for (w_, d_, x_, y_) in ((W - 0.04, 0.012, 0, -D / 2 + 0.01), (W - 0.04, 0.012, 0, D / 2 - 0.01), (0.012, D - 0.04, -W / 2 + 0.01, 0), (0.012, D - 0.04, W / 2 - 0.01, 0)):
        rbox(w_, d_, ZW - zg, 0.004, p['glass'], (x_, y_, zg), seg=1)
    for x_ in (-W / 2 + 0.02, -0.15, 0.15, W / 2 - 0.02):
        for y_ in (-D / 2 + 0.02, D / 2 - 0.02): rbox(0.035, 0.035, ZW - zg, 0.012, p['cream'], (x_, y_, zg), seg=2)
    for y_ in (-D / 2 + 0.02, D / 2 - 0.02): rbox(W, 0.04, 0.035, 0.012, p['cream'], (0, y_, ZW - 0.01), seg=2)
    for x_ in (-W / 2 + 0.02, W / 2 - 0.02): rbox(0.04, D, 0.035, 0.012, p['cream'], (x_, 0, ZW - 0.01), seg=2)
    rh = gable(p, W + 0.06, D - 0.12, ZW + 0.02, p['glass'], pitch=0.7)
    hcyl(0.022, W + 0.1, p['cream'], (0, 0, ZW + 0.02 + rh - 0.015), 'x', bev=0.008)
    half = (D - 0.12 + 0.16) / 2; ang = math.atan2(rh, half)
    for x_ in (-W / 2 + 0.03, -0.15, 0.15, W / 2 - 0.03):
        for sg in (-1, 1):
            rbox(0.022, half * 1.02 / math.cos(ang), 0.016, 0.006, p['cream'], (x_, sg * half / 2, ZW + 0.02 + rh / 2 - 0.006), (-sg * ang, 0, 0), seg=1)
    door(p, 0.27, -D / 2 - 0.02, 0.0, 0.18, 0.34, Z0)
    light(p, (-W / 2 + 0.02, -D / 2 - 0.02, ZW + 0.05), 0.016)
    # inside: two benches of seed trays under lamps, the potting table at the back with pots and a sack
    for y_ in (-0.13, 0.13):
        for sx in (-0.33, 0.07): rbox(0.02, 0.02, 0.14, 0.005, p['char'], (sx, y_, zg), seg=1)
        rbox(0.5, 0.17, 0.02, 0.008, p['cream2'], (-0.13, y_, zg + 0.14), seg=1)
        for k in range(3):
            xt = -0.3 + k * 0.17
            rbox(0.14, 0.13, 0.022, 0.006, p['orange'], (xt, y_, zg + 0.16), seg=1)
            rbox(0.125, 0.115, 0.006, 0.004, p['soil'], (xt, y_, zg + 0.177), seg=1)
            for a in range(3):
                for b in range(2): ball(0.012, p['leaf2'], (xt - 0.04 + a * 0.04, y_ - 0.025 + b * 0.05, zg + 0.19), seg=6)
    for x_ in (-0.3, 0.04): ball(0.022, p['lampw'], (x_, 0, ZW - 0.06), seg=10)
    rbox(0.18, 0.4, 0.02, 0.008, p['wood'], (0.3, 0.05, zg + 0.12), seg=1)
    for sy in (-0.15, 0.15): rbox(0.02, 0.02, 0.12, 0.005, p['char'], (0.3, 0.05 + sy, zg), seg=1)
    for k in range(3): cyl(0.022, 0.035, p['orange'], (0.27 + 0.03 * (k % 2), -0.06 + k * 0.08, zg + 0.14), bev=0.006)
    sack(p, (0.31, 0.2, zg + 0.14), 1.57)
    # the heater at the back keeps the glass house warm for the sprouting; the water tank, its pipe to the benches
    air_unit(p, (-0.2, D / 2 + 0.17, 0.0), math.pi, 0.8)
    tube([(-0.2, D / 2 + 0.08, 0.13), (-0.2, D / 2 + 0.005, 0.13)], 0.016, p['char'])
    tank(p, (0.28, D / 2 + 0.2, 0.0), r=0.1, h=0.3)
    tube([(0.28, D / 2 + 0.1, 0.25), (0.28, D / 2 + 0.005, 0.25)], 0.012, p['char'])
    # ---- the yard under the net on the left: the saplings in pots harden in the cold and the wind
    YX0, YX1, YY0, YY1 = -W / 2 - 0.12, -W / 2 - 0.86, -0.42, 0.42
    rbox(abs(YX1 - YX0) + 0.04, YY1 - YY0 + 0.04, 0.025, 0.02, p['cream2'], ((YX0 + YX1) / 2, 0, 0.0), seg=2)
    for x_ in (YX0, YX1):
        for y_ in (YY0, YY1): cyl(0.015, 0.4, p['char'], (x_, y_, 0.0), bev=0.005)
    rbox(abs(YX1 - YX0), YY1 - YY0, 0.012, 0.004, netm, ((YX0 + YX1) / 2, 0, 0.39), seg=1)
    rbox(abs(YX1 - YX0), 0.012, 0.36, 0.004, netm, ((YX0 + YX1) / 2, YY1, 0.03), seg=1)        # the windward side
    rbox(0.012, YY1 - YY0, 0.36, 0.004, netm, (YX1, 0, 0.03), seg=1)
    for (x_, y_) in ((YX0, YY0), (YX1, YY1)): light(p, (x_, y_, 0.42), 0.014)
    n = 0
    for i in range(4):
        for j in range(4):
            sapling(p, (YX1 + 0.12 + i * 0.16, YY0 + 0.12 + j * 0.19, 0.025), 1.0, male=(n % 9 == 4)); n += 1
    # the barrow with saplings for the planting, ready by the yard; the crate of seed from the Ark's bank by the door
    BX, BY = YX0 - 0.1, YY0 - 0.2
    rbox(0.28, 0.18, 0.03, 0.01, p['cream2'], (BX, BY, 0.06), seg=1)
    for sx in (-0.1, 0.1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.035, depth=0.02, location=(BX + sx, BY - 0.1, 0.035), rotation=(math.pi / 2, 0, 0))
        _done(bpy.context.object, p['char'])
    tube([(BX + 0.14, BY, 0.08), (BX + 0.25, BY, 0.16)], 0.008, p['char'])
    for k in range(3): sapling(p, (BX - 0.08 + k * 0.08, BY, 0.09), 0.9)
    container(p, (W / 2 + 0.2, -0.12), 0.0, 0.2, 0.15, 0.13)
    # the drip line from the tank along the pots
    tube([(0.18, D / 2 + 0.12, 0.02), (YX0 + 0.05, D / 2 + 0.12, 0.012), (YX0 + 0.05, YY0 + 0.05, 0.012)], 0.007, hose())


# ======================================================================================
# the stone-wool workshop (level 27, docs/levels.md): next to the smelters, one engineer. As stone wool is made on Earth:
#    stone from the mine goes up a belt into an electric melter (three electrodes, about 1 500 C, no smoke but a lot of
#    power from the transformer behind it); the glowing melt runs down a spout onto spinning wheels that throw it into
#    thin fibres (seen through the window), the fibres settle into a mat, the mat comes out of the right wall on rollers,
#    is cut and rolled; the rolls wait on a pallet. The air of the spinning room goes out through a filter on the roof.
# ======================================================================================
def belt(p, S, E, w=0.12, m=None):
    """a covered belt from S to E (Vectors): a cream box along the line with an orange edge, on two dark legs"""
    d = E - S; L = d.length; mid = (S + E) / 2
    q = d.normalized().to_track_quat('Y', 'Z').to_euler()
    rbox(w, L, 0.05, 0.02, m or p['cream2'], (mid.x, mid.y, mid.z - 0.025), tuple(q), seg=2)
    for t in (0.25, 0.75):
        pt = S + d * t
        cyl(0.012, max(0.02, pt.z - 0.03), p['char'], (pt.x, pt.y, 0.0), bev=0.004)

def b_woolworks(p):
    wool = mat('wool', '#d9c48c', 0.95)
    # ---- the hall: the spinning room behind the front window, the door, the filter on the roof
    HX, HY, HW, HD, HH = 0.38, 0.05, 1.0, 0.7, 0.55
    rbox(HW + 0.08, HD + 0.08, 0.06, 0.18, p['char'], (HX, HY, 0.0))
    hall = rbox(HW, HD, HH, 0.15, p['cream'], (HX, HY, 0.05), seg=5)
    def spin(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        rbox(0.08, 0.05, 0.03, 0.01, p['orange'], (*L(-0.2, 0.06), fz + 0.2), (0, 0, 0), seg=1)          # the spout
        cyl(0.009, 0.08, p['fire'], (*L(-0.17, 0.06), fz + 0.12), bev=0.003, verts=12)                  # the melt falling
        for k, (dx, dz) in enumerate(((-0.17, 0.09), (-0.12, 0.07), (-0.13, 0.13))):                   # the spinning wheels
            x, y = L(dx, 0.07)
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.032, depth=0.02, location=(x, y, fz + dz), rotation=(math.pi / 2, 0, 0))
            _done(bpy.context.object, p['char'])
            torus(0.032, 0.006, p['orange'], (x, y - 0.012, fz + dz), (math.pi / 2, 0, 0))
        for k in range(6):                                                                            # the fibres blown away
            ball(0.03 + 0.008 * (k % 2), wool, (*L(-0.06 + k * 0.045, 0.06 - 0.01 * (k % 3)), fz + 0.1 - k * 0.01), (1.2, 1, 0.8), seg=10)
        rbox(0.26, 0.12, 0.025, 0.01, wool, (*L(0.12, 0.04), fz + 0.03), seg=1)                         # the mat on the belt
        for k in range(4): hcyl(0.012, 0.13, p['char'], (*L(0.02 + k * 0.07, 0.04), fz + 0.02), 'y', bev=0.003)
    lit_room(p, hall, 0.62, 0.28, 0.42, HX - 0.1, HY - HD / 2 + 0.01, 0.17, 0.0, spin)
    rbox(HW + 0.02, HD + 0.02, 0.035, 0.15, p['orange'], (HX, HY, 0.14))
    door(p, HX + 0.36, HY - HD / 2 - 0.02, 0.0, 0.2, 0.44, 0.05)
    RZ = 0.05 + HH
    rbox(0.3, 0.24, 0.16, 0.05, p['cream2'], (HX + 0.15, HY + 0.12, RZ - 0.02))                          # the filter for the air
    rbox(0.305, 0.245, 0.02, 0.05, p['orange'], (HX + 0.15, HY + 0.12, RZ + 0.08))
    vent(p, (HX + 0.15, HY + 0.12, RZ + 0.13), 0.09)
    vent(p, (HX - 0.3, HY + 0.15, RZ - 0.01), 0.08)
    light(p, (HX + 0.42, HY - 0.15, RZ + 0.01), 0.02)
    # ---- the electric melter on the left: three electrodes through the lid, a peek of fire, the spout into the hall
    MX, MY, MR = -0.42, 0.12, 0.25
    LZ = 0.06 + 0.42
    cyl(MR + 0.05, 0.08, p['char'], (MX, MY, 0.0), bev=0.025, verts=48)
    cyl(MR, 0.42, p['cream'], (MX, MY, 0.06), bev=0.04, verts=48)
    torus(MR + 0.003, 0.02, p['orange'], (MX, MY, 0.3))
    dome(MR - 0.015, p['char'], (MX, MY, LZ - 0.01), seg=40, sz=0.3)
    porthole(p, (MX + math.cos(D2R(-110)) * MR, MY + math.sin(D2R(-110)) * MR, 0.2), (math.cos(D2R(-110)), math.sin(D2R(-110))), r=0.05, mat_key='fire')
    for ang in (90, 210, 330):
        a = D2R(ang); ex, ey = MX + math.cos(a) * 0.11, MY + math.sin(a) * 0.11
        cyl(0.045, 0.04, p['orange'], (ex, ey, LZ + 0.02), bev=0.012)
        cyl(0.03, 0.26, p['char'], (ex, ey, LZ + 0.04), bev=0.008, verts=20)
        torus(0.034, 0.01, p['cream2'], (ex, ey, LZ + 0.24))
    tube([(MX + MR - 0.02, MY - 0.05, 0.26), (HX - HW / 2 - 0.01, MY - 0.05, 0.24)], 0.026, p['orange'])   # the spout
    light(p, (MX - MR - 0.005, MY, 0.36), 0.016)
    # the transformer behind the melter, its fat cables to the electrodes
    TX, TY = -0.42, 0.62
    rbox(0.34, 0.24, 0.05, 0.05, p['char'], (TX, TY, 0.0))
    rbox(0.3, 0.2, 0.3, 0.05, p['cream'], (TX, TY, 0.04))
    rbox(0.305, 0.205, 0.025, 0.05, p['orange'], (TX, TY, 0.24))
    for k in range(4): rbox(0.04, 0.012, 0.18, 0.005, p['char'], (TX - 0.165, TY - 0.06 + k * 0.04, 0.07), seg=1)   # the cooling fins
    for k in range(2): light(p, (TX - 0.06 + k * 0.12, TY - 0.102, 0.31), 0.016)
    for ang in (90, 210, 330):
        a = D2R(ang); ex, ey = MX + math.cos(a) * 0.11, MY + math.sin(a) * 0.11
        tube([(ex, ey, LZ + 0.24), (ex + (TX - ex) * 0.5, ey + (TY - ey) * 0.5, LZ + 0.3), (TX + (ex - MX) * 0.4, TY - 0.04, 0.36)], 0.014, p['char'])
    # ---- the stone: the hopper on legs at the back left, the belt up into the melter's lid
    PX, PY = -1.0, 0.18
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.016, 0.26, p['char'], (PX + sx * 0.11, PY + sy * 0.09, 0.0), bev=0.006)
    hop = rbox(0.3, 0.24, 0.18, 0.04, p['orange'], (PX, PY, 0.24))
    cut(hop, cutter(0.26, 0.2, 0.18, (PX, PY, 0.28), r=0.03))
    ball(1.0, p['rock'], (PX, PY, 0.38), (0.12, 0.09, 0.05), seg=14)
    for (dx, dy) in ((-0.06, 0.03), (0.05, -0.02), (0.0, 0.05)): ball(0.026, p['rock2'], (PX + dx, PY + dy, 0.42), (1.1, 1, 0.8), seg=10)
    belt(p, Vector((PX + 0.12, PY, 0.3)), Vector((MX - 0.09, MY, LZ + 0.07)))
    # ---- the wool out of the right wall on rollers, the cutter, the rolls on a pallet
    WX = HX + HW / 2
    rbox(0.42, 0.18, 0.04, 0.02, p['char'], (WX + 0.21, HY - 0.1, 0.1), seg=1)
    for k in range(5): hcyl(0.014, 0.17, p['grey'], (WX + 0.04 + k * 0.085, HY - 0.1, 0.15), 'y', bev=0.004)
    for sx in (0.05, 0.37): cyl(0.014, 0.1, p['char'], (WX + sx, HY - 0.1, 0.0), bev=0.005)
    rbox(0.3, 0.15, 0.025, 0.01, wool, (WX + 0.15, HY - 0.1, 0.165), seg=1)
    CX = WX + 0.3
    rbox(0.14, 0.24, 0.2, 0.04, p['cream2'], (CX, HY - 0.1, 0.14))                                          # the cutter over the belt
    rbox(0.145, 0.245, 0.02, 0.04, p['orange'], (CX, HY - 0.1, 0.27))
    light(p, (CX, HY - 0.225, 0.3), 0.014)
    rbox(0.34, 0.3, 0.03, 0.01, p['wood'], (CX + 0.05, HY + 0.32, 0.0), seg=1)
    for (dx, dy, dz) in ((-0.07, -0.07, 0.0), (0.07, -0.07, 0.0), (-0.07, 0.07, 0.0), (0.07, 0.07, 0.0), (0.0, 0.0, 0.11)):
        hcyl(0.055, 0.12, wool, (CX + 0.05 + dx, HY + 0.32 + dy, 0.085 + dz), 'x', bev=0.02)
        torus(0.056, 0.007, p['orange'], (CX + 0.05 + dx, HY + 0.32 + dy, 0.085 + dz), (0, math.pi / 2, 0))


# ======================================================================================
# the slag mill (level 28, docs/levels.md): next to the smelters, two lines and two places. The slag heap from the
#    smelters at the back; a short belt feeds the jaw crusher; the crushed slag goes on a belt under a hanging magnet
#    that pulls out the drops and bits of iron into a bin (back to the smelters) - the geologist works this line from
#    his booth. The rest goes into the hall, where the ball mill grinds it to a powder with lime, silicon and a little
#    phosphorus (the engineer): sacks of fertilizer for the patches, and from level 30 the lime silo for the glass.
# ======================================================================================
def b_slagmill(p):
    slag = mat('slag', '#5d5652', 0.8)
    powder = mat('powder', '#cfc6b8', 0.95)
    # ---- the hall on the right with the ball mill behind the window
    HX, HY, HW, HD, HH = 0.48, 0.02, 0.92, 0.66, 0.55
    rbox(HW + 0.08, HD + 0.08, 0.06, 0.18, p['char'], (HX, HY, 0.0))
    hall = rbox(HW, HD, HH, 0.15, p['cream'], (HX, HY, 0.05), seg=5)
    def mill(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        for u in (-0.17, 0.11): rbox(0.05, 0.12, 0.08, 0.01, p['char'], (*L(u, 0.05), fz), seg=1)       # the cradle
        x, y = L(-0.03, 0.05)
        hcyl(0.085, 0.3, p['orange'], (x, y, fz + 0.14), 'x', bev=0.02)                                   # the drum
        for u in (-0.1, 0.0, 0.1): torus(0.087, 0.008, p['char'], (*L(-0.03 + u, 0.05), fz + 0.14), (0, math.pi / 2, 0))
        for u in (-0.19, 0.13): hcyl(0.04, 0.03, p['char'], (*L(u, 0.05), fz + 0.14), 'x', bev=0.008)    # the trunnions
        rbox(0.07, 0.09, 0.07, 0.015, p['cream2'], (*L(0.2, 0.05), fz), seg=2)                            # the motor
        light(p, (*L(0.2, 0.0), fz + 0.08), 0.01)
    lit_room(p, hall, 0.58, 0.28, 0.42, HX - 0.1, HY - HD / 2 + 0.01, 0.17, 0.0, mill)
    rbox(HW + 0.02, HD + 0.02, 0.035, 0.15, p['orange'], (HX, HY, 0.14))
    door(p, HX + 0.33, HY - HD / 2 - 0.02, 0.0, 0.2, 0.44, 0.05)
    RZ = 0.05 + HH
    rbox(0.28, 0.22, 0.14, 0.05, p['cream2'], (HX + 0.12, HY + 0.1, RZ - 0.02))                  # the dust filter
    rbox(0.285, 0.225, 0.02, 0.05, p['orange'], (HX + 0.12, HY + 0.1, RZ + 0.07))
    vent(p, (HX + 0.12, HY + 0.1, RZ + 0.11), 0.08)
    light(p, (HX - 0.3, HY - 0.15, RZ + 0.01), 0.02)
    porthole(p, (HX + HW / 2, HY + 0.12, 0.38), (1, 0), r=0.055)
    # ---- the slag heap from the smelters at the back left, and the short belt to the crusher
    SX, SY = -0.95, 0.5
    for (dx, dy, r, sz) in ((0, 0, 0.26, 0.55), (0.16, -0.08, 0.17, 0.5), (-0.12, 0.1, 0.16, 0.45), (0.06, 0.14, 0.14, 0.5)):
        dome(r, slag, (SX + dx, SY + dy, 0.0), seg=20, sz=sz)
    for (dx, dy) in ((-0.2, -0.16), (0.22, -0.2), (0.0, -0.24)): ball(0.04, slag, (SX + dx, SY + dy, 0.03), (1.2, 1, 0.7), seg=8)
    CX, CY = -0.6, 0.02
    belt(p, Vector((SX + 0.12, SY - 0.2, 0.08)), Vector((CX - 0.08, CY + 0.1, 0.36)))
    # ---- the jaw crusher: a cream box, the dark jaws in the opening on top, a flywheel at the side
    rbox(0.28, 0.26, 0.05, 0.04, p['char'], (CX, CY, 0.0))
    cr = rbox(0.24, 0.22, 0.32, 0.05, p['cream'], (CX, CY, 0.04))
    cut(cr, cutter(0.14, 0.12, 0.1, (CX, CY + 0.02, 0.3), r=0.02))
    rbox(0.245, 0.225, 0.025, 0.05, p['orange'], (CX, CY, 0.22))
    for dx in (-0.035, 0.035): rbox(0.03, 0.1, 0.08, 0.01, p['char'], (CX + dx, CY + 0.02, 0.27), (0, D2R(-12 if dx < 0 else 12), 0), seg=1)
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.09, depth=0.03, location=(CX - 0.14, CY, 0.2), rotation=(0, math.pi / 2, 0))
    _done(bpy.context.object, p['char'])
    torus(0.09, 0.01, p['orange'], (CX - 0.155, CY, 0.2), (0, math.pi / 2, 0))
    light(p, (CX + 0.08, CY - 0.112, 0.31), 0.012)
    # ---- the belt from the crusher to the hall, under the hanging magnet; the iron drops into the bin beside it
    BY = CY - 0.05
    rbox(HX - HW / 2 - (CX + 0.12) - 0.01, 0.12, 0.04, 0.015, p['char'], ((CX + 0.12 + HX - HW / 2) / 2, BY, 0.16), seg=1)
    rbox(HX - HW / 2 - (CX + 0.12) - 0.03, 0.1, 0.012, 0.005, slag, ((CX + 0.12 + HX - HW / 2) / 2, BY, 0.2), seg=1)
    for k in range(3): ball(0.02, slag, (CX + 0.2 + k * 0.12, BY, 0.215), (1.2, 1, 0.7), seg=8)
    for x_ in (CX + 0.2, HX - HW / 2 - 0.08): cyl(0.012, 0.16, p['char'], (x_, BY, 0.0), bev=0.004)
    MGX = -0.22
    for sy in (-1, 1): cyl(0.014, 0.42, p['char'], (MGX + 0.12, BY + sy * 0.13, 0.0), bev=0.005)
    tube([(MGX + 0.12, BY - 0.13, 0.42), (MGX + 0.12, BY + 0.13, 0.42), (MGX, BY + 0.13, 0.42)], 0.012, p['char'])
    rbox(0.2, 0.15, 0.08, 0.03, p['cream2'], (MGX, BY, 0.28))                       # the magnet over the belt
    rbox(0.205, 0.155, 0.025, 0.03, p['orange'], (MGX, BY, 0.28))
    tube([(MGX, BY + 0.075, 0.33), (MGX, BY + 0.13, 0.42)], 0.008, p['char'])
    light(p, (MGX - 0.1, BY - 0.075, 0.34), 0.012)
    rbox(0.12, 0.05, 0.015, 0.006, p['char'], (MGX, BY - 0.12, 0.25), (D2R(35), 0, 0), seg=1)   # the chute off the side
    IBX, IBY = MGX, BY - 0.3
    rbox(0.22, 0.16, 0.12, 0.03, p['orange'], (IBX, IBY, 0.0))                           # the bin of iron for the smelters
    rbox(0.19, 0.13, 0.01, 0.01, p['char'], (IBX, IBY, 0.115), seg=1)
    for (dx, dy) in ((-0.05, 0.02), (0.04, -0.02), (0.0, 0.04), (0.06, 0.03)): ball(0.022, p['steel'], (IBX + dx, IBY + dy, 0.13), (1.2, 1, 0.7), seg=8)
    # the geologist's booth by the line: a window towards the belt, a door
    GX, GY = -0.62, -0.42
    rbox(0.3, 0.26, 0.05, 0.05, p['char'], (GX, GY, 0.0))
    booth = rbox(0.26, 0.22, 0.32, 0.07, p['cream'], (GX, GY, 0.04))
    lit_room(p, booth, 0.14, 0.12, 0.1, GX + 0.13, GY + 0.02, 0.18, D2R(90), lambda cx, cy, fz: screen(p, (cx, cy), D2R(90), fz + 0.02))
    rbox(0.265, 0.225, 0.02, 0.07, p['orange'], (GX, GY, 0.12))
    door(p, GX - 0.05, GY - 0.12, 0.0, 0.12, 0.22, 0.04)
    vent(p, (GX, GY + 0.03, 0.35), 0.06)
    # ---- out of the hall: the sacks of fertilizer at the right; the lime silo at the back (for the glass, level 30)
    rbox(0.32, 0.22, 0.03, 0.01, p['wood'], (HX + HW / 2 + 0.2, HY - 0.15, 0.0), seg=1)
    for (dx, dy, dz, r) in ((-0.07, -0.05, 0.03, 0.1), (0.07, -0.05, 0.03, -0.1), (0.0, 0.05, 0.03, 0.05), (0.0, -0.01, 0.1, 0.2)):
        rbox(0.13, 0.09, 0.07, 0.035, powder, (HX + HW / 2 + 0.2 + dx, HY - 0.15 + dy, dz), (0, 0, r), seg=3)
        rbox(0.02, 0.095, 0.02, 0.008, p['orange'], (HX + HW / 2 + 0.2 + dx + 0.035 * math.cos(r), HY - 0.15 + dy + 0.035 * math.sin(r), dz + 0.055), (0, 0, r), seg=1)
    LX, LY = HX + 0.25, HY + HD / 2 + 0.24
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.014, 0.29, p['char'], (LX + sx * 0.085, LY + sy * 0.085, 0.0), bev=0.005)
    cone(0.04, 0.13, 0.12, p['cream2'], (LX, LY, 0.16 + 0.06))
    cyl(0.13, 0.4, p['cream'], (LX, LY, 0.28), bev=0.03)
    for zz in (0.42, 0.6): torus(0.131, 0.01, p['orange'], (LX, LY, zz))
    dome(0.13, p['cream2'], (LX, LY, 0.68), seg=24, sz=0.5)
    light(p, (LX, LY, 0.76), 0.014)
    tube([(LX - 0.06, HY + HD / 2 + 0.01, 0.45), (LX - 0.06, LY - 0.13, 0.5)], 0.016, p['char'])          # from the mill up into the silo
    tube([(LX, LY, 0.16), (LX, LY + 0.3, 0.1), (LX + 0.35, LY + 0.3, 0.05)], 0.016, p['char'])          # to the glass furnace


# ======================================================================================
# the glass furnace (level 30, docs/levels.md): next to the silicon furnace, two engineers. Quartz from the mine (the
#    hopper) and lime from the slag mill (its pipe comes into the lime bin) are mixed in a drum and go up a belt into the
#    hall; there the electric melting tank glows at about 1 500 C without soda, no smoke (first engineer); the melt
#    runs out between two rollers into a glowing ribbon (second engineer), which goes slowly through the warm tunnel
#    (the lehr) so it does not crack; at the end the clear sheets are cut and stand on a rack, ready for the store.
# ======================================================================================
def b_glassworks(p):
    quartz = mat('quartz', '#efe4ff', 0.25)
    lime = mat('lime', '#f4f1ea', 0.9)
    # ---- the hall on the left: the melting tank and the rollers behind the front window
    HX, HY, HW, HD, HH = -0.28, 0.02, 0.95, 0.72, 0.55
    rbox(HW + 0.08, HD + 0.08, 0.06, 0.18, p['char'], (HX, HY, 0.0))
    hall = rbox(HW, HD, HH, 0.15, p['cream'], (HX, HY, 0.05), seg=5)
    def melt(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        rbox(0.26, 0.16, 0.1, 0.02, p['char'], (*L(-0.12, 0.06), fz), seg=2)                 # the melting tank
        rbox(0.22, 0.12, 0.012, 0.01, p['fire'], (*L(-0.12, 0.06), fz + 0.095), seg=1)        # the glowing melt
        for u in (-0.2, -0.04): cyl(0.01, 0.1, p['steel'], (*L(u, 0.06), fz + 0.1), bev=0.003)   # the electrodes
        for v in (0.02, 0.1): hcyl(0.022, 0.14, p['steel'], (*L(0.07, v), fz + 0.07), 'x', bev=0.006)   # the rollers
        rbox(0.2, 0.08, 0.008, 0.004, p['fire'], (*L(0.12, 0.06), fz + 0.06), seg=1)          # the ribbon, still glowing
        screen(p, L(0.18, 0.11), 0.0, fz + 0.1)
    lit_room(p, hall, 0.58, 0.28, 0.42, HX - 0.05, HY - HD / 2 + 0.01, 0.17, 0.0, melt)
    rbox(HW + 0.02, HD + 0.02, 0.035, 0.15, p['orange'], (HX, HY, 0.14))
    door(p, HX + 0.36, HY - HD / 2 - 0.02, 0.0, 0.2, 0.44, 0.05)
    RZ = 0.05 + HH
    for x in (HX - 0.28, HX + 0.05): vent(p, (x, HY + 0.15, RZ - 0.01), 0.09)
    light(p, (HX + 0.4, HY - 0.18, RZ + 0.01), 0.02)
    porthole(p, (HX - HW / 2, HY - 0.1, 0.36), (-1, 0), r=0.06, mat_key='fire')
    # the transformer at the back of the hall, its cables into the roof
    TX, TY = HX + 0.22, HY + HD / 2 + 0.2
    rbox(0.3, 0.2, 0.05, 0.05, p['char'], (TX, TY, 0.0))
    rbox(0.26, 0.16, 0.28, 0.05, p['cream'], (TX, TY, 0.04))
    rbox(0.265, 0.165, 0.025, 0.05, p['orange'], (TX, TY, 0.22))
    for k in range(4): rbox(0.04, 0.012, 0.16, 0.005, p['char'], (TX + 0.145, TY - 0.06 + k * 0.04, 0.07), seg=1)
    light(p, (TX - 0.07, TY - 0.082, 0.3), 0.014)
    for k in range(2): tube([(TX - 0.05 + k * 0.1, TY - 0.03, 0.33), (TX - 0.05 + k * 0.1, TY - 0.12, RZ - 0.04)], 0.014, p['char'])
    # ---- the batch: the quartz hopper and the lime bin at the back left, the mixing drum, the belt into the hall
    QX, QY = HX - 0.3, HY + HD / 2 + 0.3
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.014, 0.26, p['char'], (QX + sx * 0.1, QY + sy * 0.08, 0.0), bev=0.005)
    hop = rbox(0.28, 0.22, 0.16, 0.04, p['orange'], (QX, QY, 0.24))
    cut(hop, cutter(0.24, 0.18, 0.16, (QX, QY, 0.28), r=0.03))
    ball(1.0, quartz, (QX, QY, 0.36), (0.11, 0.085, 0.045), seg=14)
    for (dx, dy) in ((-0.05, 0.03), (0.05, -0.02)): ball(0.022, quartz, (QX + dx, QY + dy, 0.4), (1.1, 1, 0.8), seg=8)
    LBX = QX + 0.32
    cyl(0.1, 0.04, p['char'], (LBX, QY + 0.02, 0.0), bev=0.012)
    cyl(0.08, 0.3, p['cream'], (LBX, QY + 0.02, 0.03), bev=0.02)
    torus(0.081, 0.008, p['orange'], (LBX, QY + 0.02, 0.2))
    dome(0.08, lime, (LBX, QY + 0.02, 0.33), seg=16, sz=0.35)
    tube([(LBX, QY + 0.5, 0.05), (LBX, QY + 0.12, 0.05), (LBX, QY + 0.1, 0.2)], 0.016, p['char'])        # the lime from the slag mill
    MXX, MXY = QX + 0.14, QY - 0.2
    for sx in (-1, 1): rbox(0.03, 0.12, 0.1, 0.01, p['char'], (MXX + sx * 0.08, MXY, 0.0), seg=1)
    hcyl(0.07, 0.2, p['orange'], (MXX, MXY, 0.15), 'x', bev=0.02)                                         # the mixing drum
    for u in (-0.06, 0.06): torus(0.072, 0.007, p['char'], (MXX + u, MXY, 0.15), (0, math.pi / 2, 0))
    tube([(QX, QY - 0.08, 0.24), (MXX - 0.05, MXY + 0.05, 0.2)], 0.014, p['char'])
    tube([(LBX - 0.05, QY - 0.04, 0.1), (MXX + 0.06, MXY + 0.05, 0.2)], 0.014, p['char'])
    belt(p, Vector((MXX + 0.12, MXY, 0.18)), Vector((HX + 0.0, HY + HD / 2 - 0.02, RZ - 0.06)), 0.1)
    # ---- the lehr: the warm tunnel out of the right wall; small windows glow, warmer near the furnace
    LX0, LX1, LY = HX + HW / 2, 0.95, HY - 0.06
    LW = LX1 - LX0
    rbox(LW + 0.04, 0.32, 0.04, 0.04, p['char'], (LX0 + LW / 2, LY, 0.0))
    rbox(LW, 0.28, 0.22, 0.08, p['cream'], (LX0 + LW / 2, LY, 0.035), seg=4)
    rbox(LW + 0.01, 0.285, 0.025, 0.08, p['orange'], (LX0 + LW / 2, LY, 0.12))
    for k, m in enumerate(('fire', 'fire', 'win')):
        porthole(p, (LX0 + 0.15 + k * 0.22, LY - 0.14, 0.18), (0, -1), r=0.04, mat_key=m)
    vent(p, (LX0 + 0.2, LY + 0.04, 0.25), 0.06)
    light(p, (LX1 - 0.04, LY - 0.13, 0.26), 0.014)
    # ---- at the end: the clear sheet on the rollers, the cutting table, the rack of sheets
    for k in range(3): hcyl(0.016, 0.24, p['grey'], (LX1 + 0.05 + k * 0.08, LY, 0.13), 'y', bev=0.004)
    rbox(0.3, 0.26, 0.008, 0.004, p['glass'], (LX1 + 0.13, LY, 0.15), seg=1)
    for x_ in (LX1 + 0.03, LX1 + 0.27): cyl(0.014, 0.13, p['char'], (x_, LY, 0.0), bev=0.005)
    RX, RY = 0.98, 0.3
    rbox(0.36, 0.16, 0.03, 0.01, p['char'], (RX, RY, 0.0), seg=1)
    for sgn in (-1, 1):
        for x_ in (RX - 0.15, RX + 0.15): rbox(0.02, 0.012, 0.36, 0.005, p['char'], (x_, RY + sgn * 0.04, 0.02), (D2R(-12 * sgn), 0, 0), seg=1)
        for k in range(3):
            rbox(0.3, 0.008, 0.3, 0.004, p['glass'], (RX, RY + sgn * (0.06 + k * 0.02), 0.03), (D2R(-12 * sgn), 0, 0), seg=1)
    rbox(0.34, 0.03, 0.02, 0.008, p['orange'], (RX, RY, 0.37), seg=1)


# ======================================================================================
# the university (level 31, docs/levels.md): next to the brick home, one place for a scientist who teaches. The lecture
#    hall is under a roof of our glass from level 30, the first building of our glass: through it the rows of seats
#    stepping up, the teacher's desk and the glowing board. Two colonists learn each other's work in the evenings, so
#    the hall is lit and there is a lamp by the porch. On the left the small library with its shelves of books.
# ======================================================================================
def b_university(p):
    W, D, H, Z0, T = 1.2, 0.84, 0.4, 0.07, 0.06
    rbox(W + 0.1, D + 0.1, Z0, 0.14, p['char'], (0, 0, 0))
    rbox(W - 0.04, D - 0.04, 0.02, 0.03, p['floor'], (0, 0, Z0), seg=1)
    walls = [rbox(W, T, H, 0.03, p['cream'], (0, -D / 2 + T / 2, Z0), seg=3), rbox(W, T, H, 0.03, p['cream'], (0, D / 2 - T / 2, Z0), seg=3),
             rbox(T, D, H, 0.03, p['cream'], (-W / 2 + T / 2, 0, Z0), seg=3), rbox(T, D, H, 0.03, p['cream'], (W / 2 - T / 2, 0, Z0), seg=3)]
    # two tall windows in the front wall (the library is against the left wall); the hall behind them is lit
    for x_ in (-0.35, 0.02):
        cut(walls[0], cutter(0.22, 0.2, 0.22, (x_, -D / 2 + T / 2, Z0 + 0.1), r=0.03))
        rbox(0.22, 0.012, 0.22, 0.02, p['glass'], (x_, -D / 2 + 0.01, Z0 + 0.1), seg=1)
        rbox(0.27, 0.06, 0.03, 0.01, p['orange'], (x_, -D / 2 - 0.01, Z0 + 0.075), seg=1)
    for (w_, d_, x_, y_) in ((W + 0.02, 0.025, 0, -D / 2), (W + 0.02, 0.025, 0, D / 2), (0.025, D + 0.02, -W / 2, 0), (0.025, D + 0.02, W / 2, 0)):
        rbox(w_, d_, 0.035, 0.012, p['orange'], (x_, y_, Z0 + 0.05), seg=1)            # the stripe, in pieces so the hall stays open
    # inside: the board on the right wall, the teacher's desk, four rows of seats stepping up to the left
    BX = W / 2 - T - 0.01
    rbox(0.02, 0.46, 0.22, 0.01, p['char'], (BX, 0.05, Z0 + 0.12), seg=1)
    rbox(0.006, 0.42, 0.18, 0.006, p['teal'], (BX - 0.012, 0.05, Z0 + 0.14), seg=1)
    rbox(0.1, 0.22, 0.08, 0.02, p['cream2'], (BX - 0.15, 0.05, Z0 + 0.02), seg=2)
    screen(p, (BX - 0.15, 0.1), D2R(90), Z0 + 0.1)
    for k in range(4):
        x_ = BX - 0.36 - k * 0.17; zt = Z0 + 0.02 + k * 0.035
        rbox(0.17, D - 0.16, zt - Z0, 0.01, p['cream2'], (x_, 0.02, Z0), seg=1)
        for j in range(4):
            y_ = -0.22 + j * 0.15
            rbox(0.06, 0.09, 0.035, 0.012, p['orange'], (x_ + 0.03, y_, zt), seg=2)
            rbox(0.015, 0.09, 0.05, 0.006, p['orange'], (x_ + 0.065, y_, zt + 0.03), seg=1)
            rbox(0.04, 0.1, 0.012, 0.004, p['cream'], (x_ - 0.04, y_, zt + 0.07), seg=1)      # the desk shelf in front
    for x_ in (-0.3, 0.2): ball(0.03, p['lampw'], (x_, 0.0, Z0 + H + 0.1), seg=10)
    # the roof of our glass: a glass gable on cream rafters, a cream ridge
    zb = Z0 + H
    for (w_, d_, x_, y_) in ((W, 0.05, 0, -D / 2 + 0.025), (W, 0.05, 0, D / 2 - 0.025), (0.05, D, -W / 2 + 0.025, 0), (0.05, D, W / 2 - 0.025, 0)):
        rbox(w_, d_, 0.04, 0.015, p['cream'], (x_, y_, zb - 0.01), seg=2)
    rh = gable(p, W + 0.06, D - 0.1, zb + 0.02, p['glass'], pitch=0.62)
    hcyl(0.026, W + 0.1, p['cream'], (0, 0, zb + 0.02 + rh - 0.015), 'x', bev=0.01)
    half = (D - 0.1 + 0.16) / 2; ang = math.atan2(rh, half)
    for x_ in (-W / 2 + 0.03, -0.3, 0.0, 0.3, W / 2 - 0.03):
        for sg in (-1, 1):
            rbox(0.026, half * 1.02 / math.cos(ang), 0.018, 0.006, p['cream'], (x_, sg * half / 2, zb + 0.02 + rh / 2 - 0.006), (-sg * ang, 0, 0), seg=1)
    light(p, (W / 2 + 0.02, 0.0, zb + rh + 0.02), 0.02)
    # the porch at the front right: an orange canopy on two posts over the door, a lamp for the evenings
    PX = 0.4
    door(p, PX, -D / 2 - 0.02, 0.0, 0.2, 0.3, Z0)
    for sx in (-1, 1): cyl(0.022, 0.38, p['cream'], (PX + sx * 0.17, -D / 2 - 0.2, 0.0), bev=0.008)
    rbox(0.44, 0.26, 0.03, 0.02, p['orange'], (PX, -D / 2 - 0.12, 0.38), seg=2)
    cyl(0.012, 0.42, p['char'], (PX + 0.38, -D / 2 - 0.25, 0.0), bev=0.004)
    ball(0.03, p['lampw'], (PX + 0.38, -D / 2 - 0.25, 0.44), seg=10)
    # the library on the left: shelves of books behind its window, a reading lamp
    LX, LY, LW, LD, LH = -W / 2 - 0.24, 0.08, 0.42, 0.56, 0.46
    rbox(LW + 0.08, LD + 0.08, 0.07, 0.12, p['char'], (LX, LY, 0.0))
    lib = rbox(LW, LD, LH, 0.12, p['cream'], (LX, LY, 0.06), seg=5)
    def books(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        cols = [p['orange'], p['teal'], p['wood'], p['navy'], p['leaf'], p['cream2']]
        for r_ in range(2):
            rbox(0.22, 0.04, 0.008, 0.003, p['wood'], (*L(0.0, 0.09), fz + 0.04 + r_ * 0.07), seg=1)
            for k in range(7): rbox(0.022, 0.035, 0.05 - 0.006 * (k % 3), 0.003, cols[(k + r_) % 6], (*L(-0.09 + k * 0.03, 0.09), fz + 0.048 + r_ * 0.07), seg=1)
        cyl(0.006, 0.07, p['char'], (*L(0.07, 0.0), fz), bev=0.002)
        ball(0.02, p['lampw'], (*L(0.07, 0.0), fz + 0.08), seg=8)
    lit_room(p, lib, 0.26, 0.2, 0.26, LX, LY - LD / 2 + 0.01, 0.18, 0.0, books)
    rbox(LW + 0.02, LD + 0.02, 0.03, 0.12, p['orange'], (LX, LY, 0.13))
    vent(p, (LX, LY + 0.1, 0.06 + LH - 0.01), 0.07)
    bench(p, (LX - 0.02, LY - LD / 2 - 0.22, 0.0), 0.0)
    bell(p, (LX + 0.25, LY - LD / 2 - 0.2, 0.0), 0.7)


# ---- the university, idea B (Joro asked for a second one, 25.11.2026): a round hall under a glass dome of our glass,
#      like the old university rotundas; inside the seats step up in a horseshoe round the teacher's floor, the board
#      stands at the back; a portico on columns at the front; the library is a small wing joined by a glass passage.
def b_university_b(p):
    R, H, Z0, T = 0.55, 0.42, 0.07, 0.06
    cyl(R + 0.06, Z0, p['char'], (0, 0, 0), bev=0.03, verts=64)
    cyl(R - 0.02, 0.02, p['floor'], (0, 0, Z0), bev=0.005, verts=48)
    wall = cyl(R, H, p['cream'], (0, 0, Z0), bev=0.02, verts=64)
    cut(wall, cyl(R - T, H + 0.2, None, (0, 0, Z0 - 0.1), bev=0.0, verts=64))
    # tall windows round the hall (not where the door and the passage are); the hall is lit inside
    for a in (-150, -30, 0, 135, 180):
        ar = D2R(a); c, s_ = math.cos(ar), math.sin(ar)
        cut(wall, cutter(0.16, 0.3, 0.22, (c * (R - T / 2), s_ * (R - T / 2), Z0 + 0.1), (0, 0, ar + math.pi / 2), r=0.03))
        rbox(0.16, 0.012, 0.22, 0.02, p['glass'], (c * (R - 0.01), s_ * (R - 0.01), Z0 + 0.1), (0, 0, ar + math.pi / 2), seg=1)
        rbox(0.2, 0.05, 0.025, 0.01, p['orange'], (c * (R + 0.012), s_ * (R + 0.012), Z0 + 0.08), (0, 0, ar + math.pi / 2), seg=1)
    torus(R + 0.004, 0.016, p['orange'], (0, 0, Z0 + 0.05))
    torus(R + 0.004, 0.022, p['cream2'], (0, 0, Z0 + H))
    # inside: the teacher's floor, the board at the back, the horseshoe of seats stepping up to the front and the sides
    cyl(0.15, 0.03, p['cream2'], (0, 0.05, Z0 + 0.02), bev=0.01, verts=32)
    rbox(0.26, 0.02, 0.18, 0.01, p['char'], (0, 0.3, Z0 + 0.1), seg=1)
    rbox(0.22, 0.006, 0.14, 0.006, p['teal'], (0, 0.289, Z0 + 0.12), seg=1)
    for sx in (-0.1, 0.1): cyl(0.008, 0.1, p['char'], (sx, 0.3, Z0 + 0.02), bev=0.003)
    rbox(0.12, 0.06, 0.06, 0.015, p['cream'], (0.0, 0.12, Z0 + 0.05), seg=2)
    for k in range(3):
        rr = 0.26 + k * 0.08; zt = Z0 + 0.02 + k * 0.035
        for j in range(8):
            a = D2R(195 + j * 21.4); c, s_ = math.cos(a), math.sin(a)
            rbox(0.06, 0.055, zt - Z0, 0.01, p['cream2'], (c * rr, s_ * rr, Z0), (0, 0, a + math.pi / 2), seg=1)
            rbox(0.05, 0.045, 0.03, 0.01, p['orange'], (c * rr, s_ * rr, zt), (0, 0, a + math.pi / 2), seg=2)
    ball(0.035, p['lampw'], (0, 0, Z0 + H + 0.12), seg=10)
    # the dome of our glass on six cream ribs, an oculus with a light at the top
    zb, SZ = Z0 + H + 0.01, 0.72
    dome(R - 0.01, p['glass'], (0, 0, zb), seg=48, sz=SZ)
    for k in range(6):
        bpy.ops.mesh.primitive_torus_add(major_radius=R - 0.005, minor_radius=0.014, major_segments=48, minor_segments=8, location=(0, 0, zb), rotation=(math.pi / 2, 0, D2R(k * 30)))
        rib = _done(bpy.context.object, p['cream']); bpy.ops.object.transform_apply(rotation=True); rib.scale = (1, 1, SZ); bpy.ops.object.transform_apply(scale=True); cut_half(rib, zb)
    cyl(0.07, 0.05, p['cream2'], (0, 0, zb + (R - 0.01) * SZ - 0.02), bev=0.015)
    light(p, (0, 0, zb + (R - 0.01) * SZ + 0.05), 0.02)
    # the portico at the front: an orange roof on four cream columns over the door
    door(p, 0.0, -R - 0.01, 0.0, 0.2, 0.3, Z0)
    for x_ in (-0.3, -0.11, 0.11, 0.3): cyl(0.024, 0.38, p['cream'], (x_, -R - 0.2, Z0), bev=0.008)
    rbox(0.76, 0.3, 0.035, 0.02, p['orange'], (0, -R - 0.12, Z0 + 0.38), seg=2)
    rbox(0.8, 0.34, 0.05, 0.02, p['char'], (0, -R - 0.14, 0.0), seg=2)
    light(p, (0.36, -R - 0.27, Z0 + 0.43), 0.016)
    # the library wing at the back right, joined by a short glass passage
    LX, LY, LW, LD, LH = 0.78, 0.5, 0.44, 0.42, 0.44
    rbox(LW + 0.08, LD + 0.08, 0.07, 0.12, p['char'], (LX, LY, 0.0))
    lib = rbox(LW, LD, LH, 0.12, p['cream'], (LX, LY, 0.06), seg=5)
    def books(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        cols = [p['orange'], p['teal'], p['wood'], p['navy'], p['leaf'], p['cream2']]
        for r_ in range(2):
            rbox(0.22, 0.04, 0.008, 0.003, p['wood'], (*L(0.0, 0.09), fz + 0.04 + r_ * 0.07), seg=1)
            for k in range(7): rbox(0.022, 0.035, 0.05 - 0.006 * (k % 3), 0.003, cols[(k + r_) % 6], (*L(-0.09 + k * 0.03, 0.09), fz + 0.048 + r_ * 0.07), seg=1)
        cyl(0.006, 0.07, p['char'], (*L(0.07, 0.0), fz), bev=0.002)
        ball(0.02, p['lampw'], (*L(0.07, 0.0), fz + 0.08), seg=8)
    lit_room(p, lib, 0.26, 0.2, 0.26, LX + 0.02, LY - LD / 2 + 0.01, 0.18, 0.0, books)
    rbox(LW + 0.02, LD + 0.02, 0.03, 0.12, p['orange'], (LX, LY, 0.13))
    vent(p, (LX + 0.1, LY + 0.08, 0.06 + LH - 0.01), 0.07)
    a = math.atan2(LY, LX); px, py = math.cos(a) * (R + 0.02), math.sin(a) * (R + 0.02)
    mx, my = (px + LX - LW / 2 + 0.02) / 2, (py + LY - 0.05) / 2
    rbox(0.18, 0.16, 0.26, 0.04, p['glass'], (mx + 0.02, my, Z0), (0, 0, a), seg=2)
    rbox(0.2, 0.18, 0.03, 0.03, p['cream'], (mx + 0.02, my, Z0 + 0.26), (0, 0, a), seg=2)
    # outside: a lamp post and a bench by the portico, plants under glass bells
    cyl(0.012, 0.42, p['char'], (-0.55, -R - 0.25, 0.0), bev=0.004)
    ball(0.03, p['lampw'], (-0.55, -R - 0.25, 0.44), seg=10)
    bench(p, (-0.7, -0.15, 0.0), D2R(90))
    for (x_, y_) in ((0.5, -R - 0.15), (-0.62, 0.25)): bell(p, (x_, y_, 0.0), 0.7)


# ======================================================================================
# the park (level 32, docs/levels.md): the first building for happiness, next to the homes and the university, under a
#    dome of our glass (the second building of our glass). Inside: grass from the Green Belt's seed, sea-buckthorn shrubs
#    from the nursery (grown, with their orange berries), a ring path with benches and lamps, drip hoses along the beds
#    because water is precious, two sprinklers. In by the airlock at the front; the gardener's shed with his tools and
#    the air unit that keeps the air in the dome at the back. One gardener (agronomist).
# ======================================================================================
def shrub(p, at, s=1.0):
    """a grown sea-buckthorn shrub: silvery-green leaves, orange berries on the outside"""
    x, y, z = at
    sea = mat('buckthorn', '#9dbb87', 0.75)
    for (dx, dy, dz, r) in ((0, 0, 0.09, 0.08), (0.06, 0.03, 0.07, 0.06), (-0.05, 0.04, 0.07, 0.06), (0.01, -0.05, 0.06, 0.055)):
        ball(r * s, sea, (x + dx * s, y + dy * s, z + dz * s), (1, 1, 0.9), seg=10)
    for (dx, dy, dz) in ((0.07, -0.03, 0.08), (-0.06, -0.03, 0.09), (0.02, -0.08, 0.07), (0.0, 0.05, 0.14), (-0.07, 0.06, 0.06)):
        ball(0.012 * s, p['orange'], (x + dx * s, y + dy * s, z + dz * s), seg=6)

def b_park(p):
    R, ZB = 0.88, 0.16
    cyl(R + 0.06, 0.05, p['char'], (0, 0, 0), bev=0.02, verts=72)
    cyl(R, ZB - 0.04, p['cream'], (0, 0, 0.04), bev=0.02, verts=72)
    torus(R + 0.003, 0.016, p['orange'], (0, 0, 0.1))
    cyl(R - 0.05, 0.012, mat('lawn', '#7cc865', 0.8), (0, 0, ZB - 0.005), bev=0.004, verts=64)
    # the ring path, a path in from the airlock, the benches and the lamps on it
    pt = torus(0.46, 0.045, p['cream2'], (0, 0, ZB + 0.005)); pt.scale = (1, 1, 0.18); bpy.ops.object.transform_apply(scale=True)
    a_in = D2R(-60)
    for k in range(4):
        r_ = 0.5 + k * 0.08
        rbox(0.09, 0.08, 0.008, 0.02, p['cream2'], (math.cos(a_in) * r_, math.sin(a_in) * r_, ZB + 0.002), (0, 0, a_in), seg=1)
    for a in (150, 30, 250):
        ar = D2R(a); bench(p, (math.cos(ar) * 0.36, math.sin(ar) * 0.36, ZB), ar + math.pi / 2)
    for a in (90, 210, -15):
        ar = D2R(a); x_, y_ = math.cos(ar) * 0.56, math.sin(ar) * 0.56
        cyl(0.008, 0.16, p['char'], (x_, y_, ZB), bev=0.003); ball(0.022, p['lampw'], (x_, y_, ZB + 0.17), seg=8)
    # the beds: shrubs outside the ring and a group in the middle, grass tufts, the drip hose round the outer beds
    for a in (120, 175, 225, 280, 330, 15, 65):
        ar = D2R(a); shrub(p, (math.cos(ar) * 0.7, math.sin(ar) * 0.7, ZB), 1.0)
    for (x_, y_, s_) in ((0.0, 0.08, 1.2), (-0.12, -0.06, 0.9), (0.12, -0.08, 0.8)): shrub(p, (x_, y_, ZB), s_)
    for k in range(14):
        ar = D2R(k * 26 + 7); r_ = 0.24 + 0.05 * (k % 3)
        tuft(p, (math.cos(ar) * r_, math.sin(ar) * r_, ZB), 1.0, seed=(k % 4 == 0))
    hz = torus(0.62, 0.006, hose(), (0, 0, ZB + 0.01))
    for a in (40, 200):
        ar = D2R(a); x_, y_ = math.cos(ar) * 0.78, math.sin(ar) * 0.78
        cyl(0.01, 0.05, p['char'], (x_, y_, ZB), bev=0.003); light(p, (x_, y_, ZB + 0.06), 0.01)       # the sprinklers
    # the dome of our glass: four ribs over the top and a ring round its middle
    SZ = 0.55; RD = R - 0.02
    dome(RD, p['glass'], (0, 0, ZB), seg=56, sz=SZ)
    for k in range(4):
        bpy.ops.mesh.primitive_torus_add(major_radius=RD + 0.004, minor_radius=0.014, major_segments=56, minor_segments=8, location=(0, 0, ZB), rotation=(math.pi / 2, 0, D2R(k * 45)))
        rib = _done(bpy.context.object, p['cream']); bpy.ops.object.transform_apply(rotation=True); rib.scale = (1, 1, SZ); bpy.ops.object.transform_apply(scale=True); cut_half(rib, ZB)
    torus(RD * math.cos(D2R(40)) + 0.004, 0.012, p['cream'], (0, 0, ZB + RD * SZ * math.sin(D2R(40))))
    cyl(0.07, 0.04, p['cream2'], (0, 0, ZB + RD * SZ - 0.015), bev=0.012)
    light(p, (0, 0, ZB + RD * SZ + 0.04), 0.02)
    # the airlock at the front right, where the path comes in
    ax, ay = math.cos(a_in) * (R + 0.1), math.sin(a_in) * (R + 0.1)
    rbox(0.36, 0.34, 0.06, 0.08, p['char'], (ax, ay, 0.0), (0, 0, a_in + math.pi / 2))
    rbox(0.3, 0.28, 0.34, 0.09, p['cream'], (ax, ay, 0.05), (0, 0, a_in + math.pi / 2), seg=4)
    rbox(0.305, 0.285, 0.025, 0.09, p['orange'], (ax, ay, 0.12), (0, 0, a_in + math.pi / 2))
    door(p, ax + math.cos(a_in) * 0.15, ay + math.sin(a_in) * 0.15, a_in + math.pi / 2, 0.16, 0.26, 0.05)
    # the gardener's shed at the back left, with a lit window; the air unit beside it, its pipe into the dome
    gr = D2R(125); gx, gy = math.cos(gr) * (R + 0.18), math.sin(gr) * (R + 0.18)
    rbox(0.4, 0.32, 0.06, 0.08, p['char'], (gx, gy, 0.0), (0, 0, gr + math.pi / 2))
    shed = rbox(0.34, 0.26, 0.32, 0.08, p['cream'], (gx, gy, 0.05), (0, 0, gr + math.pi / 2))
    rbox(0.345, 0.265, 0.025, 0.08, p['orange'], (gx, gy, 0.12), (0, 0, gr + math.pi / 2))
    vent(p, (gx, gy, 0.37), 0.07)
    for k, (du) in enumerate((-0.05, 0.0, 0.05)):                     # the tools on the outer wall: rake, spade, hoe
        tx_, ty_ = gx + math.cos(gr) * 0.135 + math.cos(gr + math.pi / 2) * du, gy + math.sin(gr) * 0.135 + math.sin(gr + math.pi / 2) * du
        tube([(tx_, ty_, 0.07), (tx_, ty_, 0.33)], 0.006, p['wood'])
    ar_ = D2R(165); air_unit(p, (math.cos(ar_) * (R + 0.18), math.sin(ar_) * (R + 0.18), 0.0), ar_ - math.pi / 2, 0.8)
    tube([(math.cos(ar_) * (R + 0.08), math.sin(ar_) * (R + 0.08), 0.12), (math.cos(ar_) * (R - 0.01), math.sin(ar_) * (R - 0.01), 0.12)], 0.018, p['char'])


# ======================================================================================
# the dispatch room (level 33, docs/levels.md): next to the Ark, a low tower with windows of our glass all round, towards
#    the colony; up in the glass room the dispatcher sits at a console with the screens of the sensors from every building
#    (the power, the heat of the furnaces, the carts in the mine, the moisture in the greenhouses), as in the control room
#    of a factory on Earth. The cables for the sensors come out of the base into a covered tray along the ground, past a
#    junction box, towards the buildings. One dispatcher, a new profession.
# ======================================================================================
def b_dispatch(p):
    # ---- the base with the door, small windows and the stripe
    BW, BD, BH = 0.78, 0.66, 0.36
    rbox(BW + 0.08, BD + 0.08, 0.07, 0.14, p['char'], (0, 0, 0))
    base = rbox(BW, BD, BH, 0.14, p['cream'], (0, 0, 0.06), seg=5)
    rbox(BW + 0.02, BD + 0.02, 0.035, 0.14, p['orange'], (0, 0, 0.14))
    door(p, 0.18, -BD / 2 - 0.02, 0.0, 0.2, 0.3, 0.06)
    for x_ in (-0.18,): porthole(p, (x_, -BD / 2, 0.27), (0, -1), r=0.055)
    porthole(p, (-BW / 2, 0.05, 0.27), (-1, 0), r=0.055)
    # ---- the shaft up to the glass room
    SR, SZ0, SZ1 = 0.17, 0.06 + BH - 0.02, 0.86
    cyl(SR, SZ1 - SZ0, p['cream'], (0, 0.05, SZ0), bev=0.03, verts=40)
    torus(SR + 0.003, 0.012, p['orange'], (0, 0.05, 0.62))
    for k in range(3): porthole(p, (math.cos(D2R(-100)) * SR, 0.05 + math.sin(D2R(-100)) * SR, 0.48 + k * 0.11), (math.cos(D2R(-100)), math.sin(D2R(-100))), r=0.028)
    # ---- the glass room: a floor, glass all round on cream mullions, the console with the sensor screens, the chair
    GR, GZ0, GH = 0.36, SZ1, 0.22
    cyl(GR + 0.04, 0.05, p['cream'], (0, 0.05, GZ0 - 0.04), bev=0.02, verts=48)
    torus(GR + 0.04, 0.012, p['orange'], (0, 0.05, GZ0 - 0.015))
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=GR, depth=GH, location=(0, 0.05, GZ0 + 0.01 + GH / 2), end_fill_type='NOTHING')
    _done(bpy.context.object, p['glass'])
    for k in range(8):
        a = D2R(k * 45 + 22.5)
        rbox(0.024, 0.024, GH, 0.008, p['cream'], (math.cos(a) * GR, 0.05 + math.sin(a) * GR, GZ0 + 0.01), (0, 0, a), seg=1)
    cyl(GR - 0.01, 0.01, p['floor'], (0, 0.05, GZ0 + 0.005), bev=0.003, verts=40)
    for k in range(5):                                                     # the console: an arc of desks facing the colony
        a = D2R(-150 + k * 30); c, s_ = math.cos(a), math.sin(a); rr = GR - 0.09
        rbox(0.1, 0.07, 0.07, 0.012, p['cream2'], (c * rr, 0.05 + s_ * rr, GZ0 + 0.01), (0, 0, a + math.pi / 2), seg=2)
        rbox(0.08, 0.008, 0.05, 0.005, p['teal'], (c * (rr + 0.025), 0.05 + s_ * (rr + 0.025), GZ0 + 0.085), (0, 0, a + math.pi / 2), seg=1)
    cyl(0.008, 0.05, p['char'], (0, -0.04, GZ0 + 0.01), bev=0.003)
    rbox(0.07, 0.065, 0.018, 0.008, p['orange'], (0, -0.04, GZ0 + 0.06), seg=2)
    rbox(0.07, 0.016, 0.06, 0.008, p['orange'], (0, -0.01, GZ0 + 0.075), seg=2)
    ball(0.025, p['lampw'], (0, 0.05, GZ0 + GH - 0.03), seg=10)
    # ---- the roof: a cream cap with an overhang, the stripe, a mast with the radio for the robot and the drone, a light
    RZ = GZ0 + 0.01 + GH
    cyl(GR + 0.06, 0.04, p['cream'], (0, 0.05, RZ), bev=0.018, verts=48)
    dome(GR + 0.02, p['cream'], (0, 0.05, RZ + 0.035), seg=40, sz=0.3)
    torus(GR + 0.06, 0.012, p['orange'], (0, 0.05, RZ + 0.02))
    cyl(0.012, 0.22, p['char'], (0.08, 0.1, RZ + 0.1), bev=0.004)
    for k in range(2): rbox(0.08, 0.008, 0.008, 0.003, p['char'], (0.08, 0.1, RZ + 0.2 + k * 0.05), seg=1)
    light(p, (0.08, 0.1, RZ + 0.33), 0.018)
    light(p, (-0.1, 0.05, RZ + 0.13), 0.014)
    # ---- the sensor cables: out of the back of the base into a covered tray, past the junction box, away to the buildings
    tube([(0.2, BD / 2 - 0.02, 0.12), (0.2, BD / 2 + 0.12, 0.12), (0.2, BD / 2 + 0.16, 0.03)], 0.02, p['char'])
    JX, JY = 0.2, BD / 2 + 0.28
    rbox(0.2, 0.16, 0.2, 0.04, p['cream2'], (JX, JY, 0.0))
    rbox(0.205, 0.165, 0.02, 0.04, p['orange'], (JX, JY, 0.14))
    for k in range(3): light(p, (JX - 0.06 + k * 0.06, JY - 0.083, 0.17), 0.011)
    for dx in (-0.04, 0.0, 0.04):
        tube([(JX + dx, JY + 0.08, 0.04), (JX + dx, JY + 0.13, 0.02)], 0.01, p['char'])
    TY0, TY1 = JY + 0.12, 1.05                                          # the covered cable tray, straight out to the buildings
    rbox(0.16, TY1 - TY0, 0.035, 0.012, p['char'], (JX, (TY0 + TY1) / 2, 0.0), seg=1)
    for k in range(4): rbox(0.17, (TY1 - TY0) / 4 - 0.02, 0.012, 0.006, p['cream2'], (JX, TY0 + (k + 0.5) * (TY1 - TY0) / 4, 0.035), seg=1)


# ======================================================================================
# the medical post (level 35, docs/levels.md): between the two homes, a small cream building with the doctor's room and
#    two beds for watching someone overnight. Its sign is a white cross on green, as on chemists' shops (the red cross is
#    a protected sign), lit at night. The doctor sees people in the evening and checks the seals of the suits: a suit
#    stands at the pressure tester under the side canopy. A ramp to the door, for someone who cannot walk.
# ======================================================================================
def suit_on_stand(p, at, rz=0.0):
    """an empty suit on its stand, as the colonists wear them: cream body, orange shoulders, the glass helmet"""
    x, y, z = at
    cyl(0.05, 0.02, p['char'], (x, y, z), bev=0.006)
    cyl(0.008, 0.1, p['char'], (x, y, z + 0.02), bev=0.003)
    rbox(0.1, 0.07, 0.12, 0.035, p['cream'], (x, y, z + 0.1), (0, 0, rz), seg=3)
    for sx in (-1, 1):
        ball(0.025, p['orange'], (x + math.cos(rz) * sx * 0.055, y + math.sin(rz) * sx * 0.055, z + 0.2), seg=10)
        cyl(0.016, 0.1, p['cream'], (x + math.cos(rz) * sx * 0.06, y + math.sin(rz) * sx * 0.06, z + 0.1), bev=0.006)
    ball(0.05, p['glass'], (x, y, z + 0.27), seg=16)
    rbox(0.08, 0.04, 0.09, 0.02, p['cream2'], (x - math.sin(rz) * 0.05, y + math.cos(rz) * 0.05, z + 0.12), (0, 0, rz), seg=2)   # the backpack

def b_medpost(p):
    green = mat('medgreen', '#2fbf6a', 0.4, emit='#2fbf6a', strength=1.2)
    white = mat('medwhite', '#ffffff', 0.4, emit='#ffffff', strength=0.8)
    W, D, H = 1.0, 0.64, 0.46
    rbox(W + 0.08, D + 0.08, 0.07, 0.14, p['char'], (0, 0, 0))
    body = rbox(W, D, H, 0.13, p['cream'], (0, 0, 0.06), seg=5)
    # the doctor's room behind the front window: the couch, the cabinet with medicines, the desk with a screen
    def surgery(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        rbox(0.16, 0.08, 0.06, 0.015, p['cream2'], (*L(-0.08, 0.05), fz), seg=2)
        rbox(0.15, 0.07, 0.015, 0.008, mat('bedsheet', '#7fc8ff', 0.85), (*L(-0.08, 0.05), fz + 0.06), seg=1)
        rbox(0.04, 0.06, 0.02, 0.01, mat('pillow', '#ffffff', 0.9), (*L(-0.14, 0.05), fz + 0.072), seg=1)
        rbox(0.08, 0.04, 0.16, 0.01, p['cream'], (*L(0.12, 0.1), fz), seg=1)
        for r_ in range(2):
            for k in range(3): cyl(0.009, 0.025, white if (k + r_) % 2 else green, (*L(0.095 + k * 0.025, 0.09), fz + 0.06 + r_ * 0.05), bev=0.003)
        screen(p, L(0.02, 0.1), 0.0, fz + 0.06)
    lit_room(p, body, 0.38, 0.24, 0.3, -0.15, -D / 2 + 0.01, 0.18, 0.0, surgery)
    # the two beds for watching someone, behind the window on the left side
    room(p, body, -W / 2 + 0.01, 0.05, 0.18, D2R(-90), w=0.3, h=0.22, depth=0.26)
    rbox(W + 0.02, D + 0.02, 0.035, 0.13, p['orange'], (0, 0, 0.14))
    # the door with a ramp to it
    DX = 0.3
    door(p, DX, -D / 2 - 0.02, 0.0, 0.2, 0.34, 0.06)
    ramp = rbox(0.28, 0.34, 0.03, 0.01, p['cream2'], (DX, -D / 2 - 0.22, 0.0), (D2R(8), 0, 0), seg=1)
    for sx in (-1, 1):
        tube([(DX + sx * 0.14, -D / 2 - 0.36, 0.13), (DX + sx * 0.14, -D / 2 - 0.08, 0.17)], 0.007, p['orange'])   # the handrails
        for (yy, zz) in ((-D / 2 - 0.36, 0.13), (-D / 2 - 0.08, 0.17)): cyl(0.007, zz, p['char'], (DX + sx * 0.14, yy, 0.0), bev=0.002)
    # the sign over the door: a white cross on green, on both faces, lit
    SX_, SY_, SZ_ = DX, -D / 2 - 0.01, 0.06 + H + 0.02
    rbox(0.04, 0.04, 0.08, 0.01, p['char'], (SX_, SY_ + 0.04, 0.06 + H - 0.04), seg=1)
    rbox(0.16, 0.03, 0.16, 0.025, green, (SX_, SY_ + 0.04, SZ_), seg=2)
    for dy in (0.024, 0.056):
        rbox(0.1, 0.006, 0.032, 0.004, white, (SX_, SY_ + dy, SZ_ + 0.064), seg=1)
        rbox(0.032, 0.006, 0.1, 0.004, white, (SX_, SY_ + dy, SZ_ + 0.03), seg=1)
    # the roof: a vent, a light; the air unit at the back
    RZ = 0.06 + H
    vent(p, (-0.25, 0.1, RZ - 0.01), 0.09)
    light(p, (-W / 2 + 0.08, -D / 2 + 0.08, RZ + 0.01), 0.018)
    air_unit(p, (-0.2, D / 2 + 0.17, 0.0), math.pi, 0.85)
    tube([(-0.2, D / 2 + 0.07, 0.15), (-0.2, D / 2 - 0.02, 0.15)], 0.018, p['char'])
    # the suit check under the canopy on the right: a suit on its stand, the pressure tester, its hose to the suit
    CX = W / 2 + 0.24
    for sy in (-0.2, 0.2): cyl(0.016, 0.44, p['char'], (CX + 0.16, sy, 0.0), bev=0.005)
    rbox(0.38, 0.5, 0.025, 0.02, p['orange'], (CX - 0.02, 0.0, 0.44), (0, D2R(-8), 0), seg=2)
    rbox(0.36, 0.46, 0.02, 0.01, p['cream2'], (CX, 0.0, 0.0), seg=1)
    suit_on_stand(p, (CX + 0.02, -0.08, 0.02), 0.0)
    rbox(0.1, 0.08, 0.14, 0.02, p['cream'], (CX + 0.03, 0.14, 0.02), seg=2)
    rbox(0.07, 0.006, 0.05, 0.004, p['teal'], (CX + 0.03, 0.098, 0.1), seg=1)
    light(p, (CX + 0.07, 0.1, 0.17), 0.01)
    tube([(CX + 0.03, 0.1, 0.08), (CX + 0.04, 0.0, 0.1), (CX + 0.03, -0.05, 0.14)], 0.006, p['char'])
    # outside: a bench and a plant under glass
    bench(p, (-0.2, -D / 2 - 0.22, 0.0), 0.0)
    bell(p, (-0.48, -D / 2 - 0.2, 0.0), 0.7)


# ======================================================================================
# a green patch on the Green Belt (levels 21-26, docs/levels.md): not a building, a piece of the rocky terrace that
#    grows by itself (Joro, 25.11.2026: more real and more detailed, in our style). The bare rock has low outcrops,
#    cracks, pebbles and darker damp hollows where the morning frost melts. Stage 1 (level 21): crusts of lichen with a
#    pale rim on the stones and round the cracks, a few leafy ones. Stage 2: moss in cushions, starting in the cracks and
#    hollows; the drip hose with its emitters (level 23). Stage 3 (level 25): a thin soil over most of it, grass in clumps
#    of different height and colour, some ripe, the rocks still poking through. Stage 4 (level 26): sea buckthorn
#    planted by hand in strips across the slope, each in its watering hollow, a drip line along every strip.
# ======================================================================================
def _wobble(o, cx, cy, fn):
    """push the outline of a flat round object in or out by fn(angle) (1 = unchanged)"""
    for v in o.data.vertices:
        dx, dy = v.co.x - cx, v.co.y - cy
        if abs(dx) + abs(dy) < 1e-6: continue
        f = fn(math.atan2(dy, dx)); v.co.x = cx + dx * f; v.co.y = cy + dy * f
    return o

def lichen(rnd, at, r, col, rim):
    """a crust of lichen: an irregular flat disc with a paler rim, as they grow on stone"""
    x, y, z = at
    ph = rnd.uniform(0, 6.28)
    o = cyl(r, 0.004, col, (x, y, z), bev=0.0015, verts=18, seg=1)
    _wobble(o, x, y, lambda a: 1 + 0.18 * math.sin(3 * a + ph) + 0.08 * math.sin(5 * a + 2 * ph))
    t = torus(r * 0.98, 0.0035, rim, (x, y, z + 0.004)); t.scale = (1, 1, 0.5); bpy.ops.object.transform_apply(scale=True)
    _wobble(t, x, y, lambda a: 1 + 0.18 * math.sin(3 * a + ph) + 0.08 * math.sin(5 * a + 2 * ph))

def leafy_lichen(rnd, at, s, col):
    x, y, z = at
    for k in range(5):
        a = k * 1.256 + rnd.uniform(-0.3, 0.3)
        ball(0.016 * s, col, (x + math.cos(a) * 0.014 * s, y + math.sin(a) * 0.014 * s, z + 0.004), (1.4, 1.0, 0.35), seg=8)

def moss_cushion(rnd, at, s, cols):
    x, y, z = at
    dome(0.05 * s, cols[0], (x, y, z), seg=12, sz=0.25)                     # the mat, and the tight cushion of shoots on it
    for k in range(rnd.randint(9, 14)):
        a = rnd.uniform(0, 6.28); r_ = rnd.uniform(0, 0.045) * s
        ball(rnd.uniform(0.012, 0.02) * s, cols[k % len(cols)], (x + math.cos(a) * r_, y + math.sin(a) * r_, z + 0.008), (1, 1, 0.8), seg=6)

def blade(at, h, az, tilt, col, w=0.007):
    x, y, z = at
    o = ball(1.0, col, (0, 0, 0), (w, w * 0.55, h / 2), seg=6)
    d = (math.sin(tilt) * math.cos(az), math.sin(tilt) * math.sin(az), math.cos(tilt))
    o.rotation_euler = (0, tilt, az); o.location = (x + d[0] * h * 0.45, y + d[1] * h * 0.45, z + d[2] * h * 0.45)
    bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
    return o

def grass_clump(rnd, at, s, cols, seed=False):
    x, y, z = at
    n = rnd.randint(6, 8); hh = rnd.uniform(0.75, 1.3) * s
    for k in range(n):
        a = k * 6.28 / n + rnd.uniform(-0.3, 0.3)
        blade((x, y, z), rnd.uniform(0.05, 0.085) * hh, a, rnd.uniform(0.2, 0.55), cols[(k + int(hh * 10)) % len(cols)])
    if seed:
        for k in range(2):
            a = rnd.uniform(0, 6.28)
            ball(1.0, straw(), (x + math.cos(a) * 0.008, y + math.sin(a) * 0.008, z + 0.075 * hh), (0.007, 0.007, 0.018), seg=6)

def buckthorn(rnd, at, s=1.0):
    """a sea-buckthorn shrub: a few woody stems from the ground, narrow silvery leaves at their ends, clusters of orange berries"""
    x, y, z = at
    leaf = mat('buckleaf', '#a8c29a', 0.75); leaf2 = mat('buckleaf2', '#8fae7f', 0.75); bark = mat('bark', '#6e5440', 0.85)
    leaf = mat('buckleaf', '#adc39e', 0.65); leaf2 = mat('buckleaf2', '#8fac7e', 0.7)
    for k in range(5):
        a = k * 1.047 + rnd.uniform(-0.3, 0.3); tilt = rnd.uniform(0.2, 0.5); h = rnd.uniform(0.17, 0.24) * s
        tip = (x + math.cos(a) * math.sin(tilt) * h, y + math.sin(a) * math.sin(tilt) * h, z + math.cos(tilt) * h)
        tube([(x, y, z), tip], 0.0035 * s, bark)
        for j in range(13):                                                       # the narrow leaves along the upper half
            t_ = rnd.uniform(0.35, 1.0); b = rnd.uniform(0, 6.28); r_ = rnd.uniform(0.008, 0.04) * s
            pt = (x + (tip[0] - x) * t_ + math.cos(b) * r_, y + (tip[1] - y) * t_ + math.sin(b) * r_, z + (tip[2] - z) * t_)
            blade(pt, 0.05 * s, b, rnd.uniform(0.7, 1.2), leaf if j % 2 else leaf2, w=0.008 * s)
        for j in range(3):                                                       # the berries close along the stem
            t_ = 0.4 + j * 0.15
            pt = (x + (tip[0] - x) * t_, y + (tip[1] - y) * t_, z + (tip[2] - z) * t_)
            for q in range(3): ball(0.0065 * s, p_orange(), (pt[0] + 0.007 * math.cos(q * 2.1), pt[1] + 0.007 * math.sin(q * 2.1), pt[2] + 0.003 * q), seg=6)

def p_orange():
    return mat('orange', '#ef7433', 0.55)

def b_patch(p, stage):
    import random
    rnd = random.Random(11)
    rockA = mat('rockflat', '#c8764a', 0.9); rockB = mat('rockout', '#d88d5e', 0.85); damp = mat('rockdamp', '#b86a42', 0.9)
    crack = mat('crack', '#5c3424', 0.9); pebble = mat('pebble', '#a9694a', 0.85)
    lich = [mat('lichen1', '#a3b27f', 0.9), mat('lichen2', '#d9a441', 0.9), mat('lichen3', '#cfcfa6', 0.9)]
    rims = [mat('lichrim1', '#c9d3ad', 0.9), mat('lichrim2', '#f0c867', 0.9), mat('lichrim3', '#ecebcf', 0.9)]
    mossc = [mat('mossd', '#566f31', 0.95), mat('mosse', '#67823a', 0.95), mat('mossf', '#7a9244', 0.95)]
    grassc = [p['leaf'], p['leaf2'], mat('drygrass', '#b9c46a', 0.85)]
    soilm = mat('thinsoil', '#8f6444', 0.95)
    edge = lambda a: 1 + 0.1 * math.sin(3 * a + 0.4) + 0.06 * math.sin(5 * a + 1.3) + 0.04 * math.sin(9 * a)
    # ---- the rock: an irregular slab, darker damp hollows, low outcrops, cracks, pebbles
    _wobble(cyl(0.7, 0.05, rockA, (0, 0, 0), bev=0.02, verts=72), 0, 0, edge)
    Z = 0.05
    outcrops = []
    for (dx, dy, r, sz) in ((0.32, 0.3, 0.12, 0.35), (-0.42, 0.05, 0.1, 0.4), (0.1, -0.42, 0.09, 0.45), (-0.1, 0.0, 0.08, 0.3), (0.48, -0.2, 0.07, 0.5)):
        o = ball(r, rockB, (dx, dy, Z - 0.01), (1.0, 0.85, sz + 0.2), seg=16)
        ball(r * 0.35, rockB, (dx + r * 0.6, dy - r * 0.3, Z), (1.2, 1.0, 0.7), seg=10)
        outcrops.append((dx, dy, r, Z - 0.01 + r * (sz + 0.2)))
    cracks = [[(-0.55, -0.05), (-0.35, -0.1), (-0.2, -0.05), (0.0, -0.15), (0.15, -0.12)], [(0.1, 0.55), (0.12, 0.35), (0.25, 0.2), (0.22, 0.05)], [(-0.3, 0.5), (-0.25, 0.35), (-0.35, 0.25)]]
    for c in cracks: tube([(x_, y_, Z + 0.001) for (x_, y_) in c], 0.006, crack)
    for k in range(26):
        a = rnd.uniform(0, 6.28); r_ = rnd.uniform(0.1, 0.66) * edge(a)
        ball(rnd.uniform(0.012, 0.03), pebble if k % 3 else rockB, (math.cos(a) * r_, math.sin(a) * r_, Z + 0.004), (1.3, 1.0, 0.6), seg=6)
    # ---- the lichens: on the outcrops and round the cracks (fewer once the soil covers the ground)
    nl = {1: 40, 2: 22, 3: 8, 4: 8}[stage]
    spots = []
    for (dx, dy, r, top) in outcrops: spots += [(dx + rnd.uniform(-0.4, 0.4) * r, dy + rnd.uniform(-0.4, 0.4) * r, top - 0.004) for _ in range(3)]
    for c in cracks: spots += [(x_ + rnd.uniform(-0.04, 0.04), y_ + rnd.uniform(-0.04, 0.04), Z + 0.001) for (x_, y_) in c]
    rnd.shuffle(spots)
    for k, (x_, y_, z_) in enumerate(spots[:nl]):
        if stage >= 3 and z_ <= Z + 0.002: continue
        if k % 6 == 5: leafy_lichen(rnd, (x_, y_, z_), 1.0, lich[0])
        else: lichen(rnd, (x_, y_, z_), rnd.uniform(0.028, 0.06), lich[k % 3], rims[k % 3])
    # ---- the moss: cushions that start in the cracks and the hollows
    if stage == 2:
        for c in cracks:
            for (x_, y_) in c: moss_cushion(rnd, (x_, y_, Z), 1.1, mossc)
        for (dx, dy) in ((-0.2, 0.15), (0.25, -0.1), (0.05, 0.42), (-0.35, -0.3)):
            for k in range(3): moss_cushion(rnd, (dx + rnd.uniform(-0.08, 0.08), dy + rnd.uniform(-0.08, 0.08), Z), 1.3, mossc)
        for k in range(12):
            a = rnd.uniform(0, 6.28); r_ = rnd.uniform(0.1, 0.55)
            moss_cushion(rnd, (math.cos(a) * r_, math.sin(a) * r_, Z), 0.9, mossc)
    # ---- the thin soil and the grass in clumps, the rocks still showing
    if stage >= 3:
        _wobble(cyl(0.6, 0.012, soilm, (0, 0, Z), bev=0.005, verts=64), 0, 0, lambda a: edge(a) * (1 + 0.05 * math.sin(7 * a)))
        n = 0
        for i in range(-10, 11):
            for j in range(-10, 11):
                x_, y_ = i * 0.058 + rnd.uniform(-0.025, 0.025), j * 0.058 + rnd.uniform(-0.025, 0.025)
                a = math.atan2(y_, x_)
                if math.hypot(x_, y_) > 0.56 * edge(a): continue
                if any(math.hypot(x_ - dx, y_ - dy) < r for (dx, dy, r, top) in outcrops): continue
                if stage == 4 and min(abs(y_ - row) for row in (-0.36, 0.0, 0.36)) < 0.07: continue
                if rnd.random() < 0.1: continue
                if stage == 4 and rnd.random() < 0.35: continue
                grass_clump(rnd, (x_, y_, Z + 0.012), 1.0, grassc, seed=(n % 6 == 0)); n += 1
    # ---- the sea buckthorn: strips across the slope, each shrub in its watering hollow
    if stage == 4:
        for row in (-0.36, 0.0, 0.36):
            for k in range(-3, 4):
                x_ = k * 0.16 + (0.08 if row == 0.0 else 0)
                if math.hypot(x_, row) > 0.5 * edge(math.atan2(row, x_)): continue
                t = torus(0.045, 0.01, soilm, (x_, row, Z + 0.014)); t.scale = (1, 1, 0.5); bpy.ops.object.transform_apply(scale=True)
                buckthorn(rnd, (x_, row, Z + 0.012), 1.0)
    # ---- the drip hose from the purification station, with its emitters; along every strip at stage 4
    if stage >= 2:
        main = [(0.85, 0.75, 0.012), (0.6, 0.55, Z + 0.016), (0.52, 0.42, Z + 0.016)]
        if stage == 4:
            tube(main + [(0.52, -0.36, Z + 0.016)], 0.007, hose())
            for row in (-0.36, 0.0, 0.36):
                tube([(0.52, row, Z + 0.016), (-0.5, row, Z + 0.016)], 0.005, hose())
                for k in range(-3, 4):
                    ball(0.008, p['char'], (k * 0.16 + (0.08 if row == 0.0 else 0) + 0.03, row, Z + 0.02), seg=6)
        else:
            ring = [(math.cos(D2R(a)) * 0.42 * edge(D2R(a)), math.sin(D2R(a)) * 0.42 * edge(D2R(a)), Z + 0.016) for a in range(40, 330, 15)]
            tube(main + ring, 0.006, hose())
            for (x_, y_, z_) in ring[::2]: ball(0.008, p['char'], (x_, y_, z_ + 0.004), seg=6)


# ======================================================================================
# the roads (level 36, the draft docs/drafts/levels-31-40.md; Joro picked: light grey concrete pavers with a warm tone in
#    herringbone, a dark stone kerb). The pavers are pressed at the road depot from crushed stone and crushed slag bound
#    with lime from the slag mill. herringbone() lays them in a 90-degree herringbone over a joint-coloured bed.
# ======================================================================================
def paver_mats():
    return mat('paver', '#cdc5b7', 0.8), mat('joint', '#7f786d', 0.9), mat('kerb', '#5a4f49', 0.8)

def paver_tones():
    """the field in two warm greys, the darker band along the kerb, the brick pavers of the crossings (as on the map)"""
    return mat('paver', '#cdc5b7', 0.8), mat('paver2', '#b8b0a2', 0.8), mat('paverdark', '#686158', 0.8), mat('paverbrick', '#b2604a', 0.8)

def herringbone(x0, x1, y0, y1, z, wd=0.045, gap=0.005, bands=(), band=0.11, crossings=()):
    """bands: the sides with a kerb ('y0', 'y1', 'x0', 'x1'), where a band of darker pavers runs; crossings: the
    centres of the crossings, with brick pavers in the middle and a dark ring round them"""
    _, jnt, _ = paver_mats(); p1, p2, dark, brick = paver_tones()
    import random
    rnd = random.Random(5)
    rbox(x1 - x0, y1 - y0, 0.012, 0.004, jnt, ((x0 + x1) / 2, (y0 + y1) / 2, z), seg=1)
    ox, oy = (x0 + x1) / 2, (y0 + y1) / 2
    n = int(max(x1 - x0, y1 - y0) / wd) + 4
    for i in range(-n, n + 1):
        for j in range(-n // 2 - 2, n // 2 + 3):
            bx, by = ox + (i + 2 * j) * wd, oy + (i - 2 * j) * wd
            for (cx, cy, w, d) in ((bx + wd, by + wd / 2, 2 * wd, wd), (bx + wd / 2, by + 2 * wd, wd, 2 * wd)):
                if x0 + w / 2 - 1e-6 <= cx <= x1 - w / 2 + 1e-6 and y0 + d / 2 - 1e-6 <= cy <= y1 - d / 2 + 1e-6:
                    m = p1 if rnd.random() < 0.5 else p2
                    edge = {'y0': cy - y0, 'y1': y1 - cy, 'x0': cx - x0, 'x1': x1 - cx}
                    if any(edge[b] < band for b in bands): m = dark
                    for (qx, qy) in crossings:
                        r = math.hypot(cx - qx, cy - qy)
                        if r < 0.24: m = brick
                        elif r < 0.37: m = dark
                    rbox(w - gap, d - gap, 0.016, 0.004, m, (cx, cy, z), seg=1)

def b_street(p, paved=True):
    """a piece of street as on the map: 4 m wide, one block long (16 m), with the kerbs and the covers of the service
    channel; unpaved it is the trodden dust we have now"""
    L, W, Z = 3.86, 0.96, 0.0
    _, _, kerb = paver_mats()
    if not paved:
        rbox(L, W, 0.012, 0.01, mat('dust', '#f0c08c', 0.95), (0, 0, Z), seg=1)
        for y_ in (-0.18, 0.18): rbox(L - 0.1, 0.06, 0.003, 0.002, mat('track', '#dca777', 0.95), (0, y_, Z + 0.012), seg=1)
        return
    herringbone(-L / 2 + 0.06, L / 2 - 0.06, -W / 2 + 0.07, W / 2 - 0.2, Z, bands=('y0', 'y1'), crossings=((-L / 2, 0.0), (L / 2, 0.0)))
    for y_ in (-W / 2 + 0.035, W / 2 - 0.035): rbox(L, 0.06, 0.034, 0.012, kerb, (0, y_, Z), seg=2)
    for x_ in (-L / 2 + 0.03, L / 2 - 0.03): rbox(0.06, W - 0.1, 0.02, 0.01, kerb, (x_, 0, Z), seg=1)
    # the covers of the service channel along the far side, flush with the pavers, each with an orange lifting slot
    k = 0; x_ = -L / 2 + 0.25
    while x_ < L / 2 - 0.2:
        rbox(0.34, 0.11, 0.016, 0.006, p['cream2'], (x_, W / 2 - 0.13, Z), seg=1)
        rbox(0.05, 0.012, 0.004, 0.002, p['orange'], (x_, W / 2 - 0.13, Z + 0.016), seg=1)
        x_ += 0.36; k += 1

# ======================================================================================
# the road depot (level 36, the draft): next to the mine, where the stone comes from. A cream garage with the orange
#    stripe and two bays: the paving machine (it lays a whole layer of pavers with its clamp) and the small electric
#    sweeper of the maintenance technician. In the yard: the piles of crushed stone and crushed slag, the bin of lime from
#    the slag mill, the vibrating press under a canopy, pallets of pavers. In front a paved apron, the first piece of road.
#    Two places: a builder and a maintenance technician.
# ======================================================================================
def paving_machine(p, at, rz=0.0):
    x, y, z = at; c, s_ = math.cos(rz), math.sin(rz)
    for sy in (-1, 1): rbox(0.34, 0.06, 0.06, 0.025, p['char'], (x - s_ * sy * 0.09, y + c * sy * 0.09, z), (0, 0, rz), seg=2)   # the tracks
    rbox(0.26, 0.2, 0.1, 0.03, p['orange'], (x, y, z + 0.05), (0, 0, rz), seg=3)
    rbox(0.1, 0.16, 0.1, 0.03, p['glass'], (x - c * 0.06, y - s_ * 0.06, z + 0.15), (0, 0, rz), seg=2)                       # the cab
    rbox(0.11, 0.17, 0.02, 0.01, p['cream'], (x - c * 0.06, y - s_ * 0.06, z + 0.25), (0, 0, rz), seg=1)
    tube([(x + c * 0.06, y + s_ * 0.06, z + 0.15), (x + c * 0.2, y + s_ * 0.2, z + 0.26), (x + c * 0.3, y + s_ * 0.3, z + 0.2)], 0.014, p['char'])
    hx, hy = x + c * 0.3, y + s_ * 0.3
    rbox(0.14, 0.14, 0.03, 0.01, p['char'], (hx, hy, z + 0.14), (0, 0, rz), seg=1)                                        # the clamp
    pav, _, _ = paver_mats()
    for i in range(3):
        for j in range(3): rbox(0.04, 0.04, 0.025, 0.004, pav, (hx + (i - 1) * 0.044, hy + (j - 1) * 0.044, z + 0.11), (0, 0, rz), seg=1)
    light(p, (x - c * 0.06, y - s_ * 0.06, z + 0.28), 0.012)

def sweeper(p, at, rz=0.0):
    x, y, z = at; c, s_ = math.cos(rz), math.sin(rz)
    for (u, v) in ((-0.07, -0.07), (-0.07, 0.07), (0.07, -0.07), (0.07, 0.07)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.03, depth=0.025, location=(x + c * u - s_ * v, y + s_ * u + c * v, z + 0.03), rotation=(math.pi / 2, 0, rz))
        _done(bpy.context.object, p['char'])
    rbox(0.22, 0.15, 0.08, 0.035, p['cream'], (x, y, z + 0.03), (0, 0, rz), seg=3)
    rbox(0.09, 0.13, 0.09, 0.03, p['glass'], (x - c * 0.05, y - s_ * 0.05, z + 0.11), (0, 0, rz), seg=2)
    rbox(0.1, 0.14, 0.015, 0.01, p['orange'], (x - c * 0.05, y - s_ * 0.05, z + 0.2), (0, 0, rz), seg=1)
    for sv in (-1, 1):                                                       # the two round brushes at the front
        bx, by = x + c * 0.14 - s_ * sv * 0.06, y + s_ * 0.14 + c * sv * 0.06
        cyl(0.04, 0.015, p['orange'], (bx, by, z), bev=0.005, verts=20)
        for k in range(8):
            a = k * 0.785; tube([(bx, by, z + 0.008), (bx + math.cos(a) * 0.05, by + math.sin(a) * 0.05, z + 0.002)], 0.003, p['char'])
    light(p, (x - c * 0.05, y - s_ * 0.05, z + 0.22), 0.012)

def b_roaddepot(p):
    # ---- the garage with two bays, the stripe, a small office window
    GX, GY, GW, GD, GH = -0.25, 0.25, 1.2, 0.62, 0.5
    rbox(GW + 0.08, GD + 0.08, 0.06, 0.14, p['char'], (GX, GY, 0.0))
    gar = rbox(GW, GD, GH, 0.14, p['cream'], (GX, GY, 0.05), seg=5)
    rbox(GW + 0.02, GD + 0.02, 0.035, 0.14, p['orange'], (GX, GY, 0.14))
    for k, bx in enumerate((GX - 0.33, GX + 0.12)):
        cut(gar, cutter(0.34, 0.3, 0.32, (bx, GY - GD / 2, 0.05), r=0.04))
        rbox(0.4, 0.06, 0.37, 0.04, p['orange'], (bx, GY - GD / 2 - 0.005, 0.05), seg=2)
        cut(bpy.context.object, cutter(0.34, 0.2, 0.32, (bx, GY - GD / 2, 0.05), r=0.04))
        rbox(0.32, 0.3, 0.012, 0.004, p['floor'], (bx, GY - GD / 2 + 0.15, 0.05), seg=1)
        ball(0.025, p['lampw'], (bx, GY - GD / 2 + 0.15, 0.33), seg=10)
        rbox(0.34, 0.03, 0.05, 0.01, p['char'], (bx, GY - GD / 2 + 0.01, 0.33), seg=1)            # the rolled-up door
        light(p, (bx + 0.22, GY - GD / 2 - 0.02, 0.44), 0.016)
    paving_machine(p, (GX - 0.33, GY - GD / 2 - 0.12, 0.0), -math.pi / 2)
    sweeper(p, (GX + 0.12, GY - GD / 2 + 0.05, 0.05), -math.pi / 2)
    def office(cx, cy, fz):
        L = frame(cx, cy, 0.0); desk(p, L, 0.0, fz, u=0.0, v=0.05, w=0.14)
    lit_room(p, gar, 0.18, 0.18, 0.2, GX + 0.45, GY - GD / 2 + 0.01, 0.22, 0.0, office)
    door(p, GX + GW / 2 + 0.01, GY + 0.05, -math.pi / 2, 0.18, 0.34, 0.05)
    RZ = 0.05 + GH
    for x_ in (GX - 0.3, GX + 0.2): vent(p, (x_, GY + 0.12, RZ - 0.01), 0.08)
    light(p, (GX - GW / 2 + 0.08, GY - 0.15, RZ + 0.01), 0.018)
    # ---- the paved apron in front of the bays, with the kerb
    _, _, kerb = paver_mats()
    herringbone(GX - GW / 2, GX + GW / 2 + 0.05, GY - GD / 2 - 0.55, GY - GD / 2 - 0.06, 0.0, bands=('y0',))
    rbox(GW + 0.11, 0.05, 0.034, 0.012, kerb, (GX + 0.025, GY - GD / 2 - 0.58, 0.0), seg=2)
    # ---- the yard on the right: the piles of crushed stone and slag, the lime bin, the press under its canopy, pallets
    YX = 0.75
    for (dx, dy, m) in ((0.0, 0.6, p['rock2']), (0.32, 0.62, mat('slag', '#5d5652', 0.8))):
        dome(0.17, m, (YX + dx, dy, 0.0), seg=16, sz=0.55)
        for k in range(4): ball(0.025, m, (YX + dx + 0.14 * math.cos(k * 1.6), dy - 0.12 + 0.03 * k, 0.02), (1.2, 1, 0.7), seg=8)
    cyl(0.08, 0.04, p['char'], (YX + 0.55, 0.3, 0.0), bev=0.012)
    cyl(0.065, 0.24, p['cream'], (YX + 0.55, 0.3, 0.03), bev=0.02)
    torus(0.066, 0.008, p['orange'], (YX + 0.55, 0.3, 0.16))
    dome(0.065, mat('lime', '#f4f1ea', 0.9), (YX + 0.55, 0.3, 0.27), seg=16, sz=0.35)
    PX, PY = YX + 0.1, 0.12
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.014, 0.42, p['char'], (PX + sx * 0.2, PY + sy * 0.16, 0.0), bev=0.005)
    rbox(0.48, 0.4, 0.025, 0.02, p['orange'], (PX, PY, 0.42), (D2R(6), 0, 0), seg=2)
    rbox(0.22, 0.18, 0.2, 0.04, p['cream2'], (PX, PY, 0.0), seg=3)                       # the vibrating press
    rbox(0.225, 0.185, 0.025, 0.04, p['orange'], (PX, PY, 0.13))
    rbox(0.16, 0.12, 0.08, 0.02, p['orange'], (PX, PY + 0.02, 0.2), seg=2)                 # its hopper
    light(p, (PX + 0.09, PY - 0.092, 0.19), 0.012)
    tube([(YX + 0.05, 0.45, 0.06), (PX - 0.05, PY + 0.1, 0.27)], 0.012, p['char'])
    p1, p2, dark, brick = paver_tones()
    for k, (qx, qy) in enumerate(((PX - 0.05, PY - 0.35), (PX + 0.25, PY - 0.35))):   # the light pavers, and the dark ones for the bands
        rbox(0.22, 0.18, 0.03, 0.008, p['wood'], (qx, qy, 0.0), seg=1)
        for lay in range(3):
            for i in range(4):
                for j in range(3): rbox(0.05, 0.05, 0.035, 0.005, (p1 if (i + j + lay) % 2 else p2) if k == 0 else dark, (qx - 0.075 + i * 0.05, qy - 0.05 + j * 0.05, 0.03 + lay * 0.036), seg=1)


# ======================================================================================
# the weather station (level 37, the draft docs/drafts/levels-31-40.md): on the highest terrace, a low cream cabin with
#    the orange stripe and a lattice mast that rises over the canyon's rim, held by guy wires. On the mast: the cups for
#    the wind and the vane at the top, the screen with the pressure and temperature sensors, the dust counter on an arm.
#    On the cabin the lidar: it shines a thin green beam up and measures the dust in the air, as Phoenix did on Mars; the
#    beam is seen at night. A dust gauge on a post. One scientist at the screens behind the window.
# ======================================================================================
def b_weather(p):
    beam = mat('lidarbeam', '#9dff7a', 0.3, emit='#7dff5a', strength=2.5, alpha=0.4)
    # ---- the cabin
    CW, CD, CH = 0.62, 0.48, 0.36
    rbox(CW + 0.08, CD + 0.08, 0.06, 0.12, p['char'], (0, 0, 0))
    cab = rbox(CW, CD, CH, 0.12, p['cream'], (0, 0, 0.05), seg=5)
    def desk_(cx, cy, fz):
        L = frame(cx, cy, 0.0)
        desk(p, L, 0.0, fz, u=-0.02, v=0.05, w=0.16)
        screen(p, L(0.09, 0.08), 0.0, fz + 0.1, w=0.07, h=0.05)
    lit_room(p, cab, 0.24, 0.18, 0.24, -0.1, -CD / 2 + 0.01, 0.17, 0.0, desk_)
    rbox(CW + 0.02, CD + 0.02, 0.03, 0.12, p['orange'], (0, 0, 0.13))
    door(p, 0.18, -CD / 2 - 0.02, 0.0, 0.16, 0.28, 0.05)
    RZ = 0.05 + CH
    # ---- the lidar on the roof: a housing with a dark window looking up, the thin green beam
    cyl(0.07, 0.08, p['cream2'], (-0.12, 0.06, RZ - 0.01), bev=0.02)
    torus(0.071, 0.008, p['orange'], (-0.12, 0.06, RZ + 0.03))
    cyl(0.04, 0.012, p['char'], (-0.12, 0.06, RZ + 0.07), bev=0.004)
    cyl(0.006, 1.6, beam, (-0.12, 0.06, RZ + 0.08), bev=0.0, verts=10)
    light(p, (0.12, 0.08, RZ + 0.01), 0.016)
    vent(p, (0.12, -0.08, RZ - 0.01), 0.06)
    # ---- the lattice mast behind the cabin: three legs, zigzag bracing, orange bands, guy wires to anchors
    MX, MY, MH, MR = 0.45, 0.42, 1.55, 0.06
    legs = [(MX + math.cos(D2R(90 + k * 120)) * MR, MY + math.sin(D2R(90 + k * 120)) * MR) for k in range(3)]
    cyl(0.12, 0.04, p['char'], (MX, MY, 0.0), bev=0.012)
    for (x_, y_) in legs: tube([(x_, y_, 0.03), (x_, y_, MH)], 0.008, p['grey'])
    nz = 12
    for k in range(nz):
        za, zb = 0.05 + k * (MH - 0.1) / nz, 0.05 + (k + 1) * (MH - 0.1) / nz
        for e in range(3):
            a, b = legs[e], legs[(e + 1) % 3]
            if k % 2 == 0: tube([(a[0], a[1], za), (b[0], b[1], zb)], 0.003, p['grey'])
            else: tube([(b[0], b[1], za), (a[0], a[1], zb)], 0.003, p['grey'])
    for zz in (0.5, 1.0): torus(MR + 0.006, 0.01, p['orange'], (MX, MY, zz))
    for k in range(3):                                                            # the guy wires and their anchors
        a = D2R(60 + k * 120); ax, ay = MX + math.cos(a) * 0.55, MY + math.sin(a) * 0.55   # clear of the arms and the cabin
        tube([(MX + math.cos(a) * MR, MY + math.sin(a) * MR, MH * 0.7), (ax, ay, 0.03)], 0.002, p['char'])
        rbox(0.05, 0.05, 0.03, 0.01, p['char'], (ax, ay, 0.0), seg=1)
    # the screen with the pressure and temperature sensors: stacked white plates on an arm
    tube([(MX, MY - MR, 0.72), (MX, MY - 0.2, 0.72)], 0.006, p['char'])
    for k in range(5): cyl(0.045 - k * 0.002, 0.008, mat('pillow', '#ffffff', 0.9), (MX, MY - 0.22, 0.66 + k * 0.022), bev=0.003, verts=20)
    # the dust counter: a small box with its inlet, on the other arm
    tube([(MX + MR, MY, 1.05), (MX + 0.2, MY, 1.05)], 0.006, p['char'])
    rbox(0.06, 0.05, 0.07, 0.015, p['cream'], (MX + 0.22, MY, 1.0), seg=2)
    tube([(MX + 0.22, MY, 1.07), (MX + 0.22, MY, 1.11), (MX + 0.25, MY, 1.11)], 0.006, p['orange'])
    light(p, (MX + 0.22, MY - 0.028, 1.04), 0.008)
    # at the top: the cups for the wind and the vane, a light
    anemometer(p, (MX, MY, MH - 0.04), 0.12)
    # the cable from the mast into the cabin
    tube([(MX, MY - 0.08, 0.04), (CW / 2 - 0.05, CD / 2 + 0.01, 0.12)], 0.01, p['char'])
    # ---- the dust gauge on a post at the front left: a jar that catches what settles
    GX, GY = -0.45, -0.35
    cyl(0.008, 0.2, p['char'], (GX, GY, 0.0), bev=0.003)
    cyl(0.03, 0.05, p['glass'], (GX, GY, 0.2), bev=0.006)
    cyl(0.027, 0.012, mat('dust', '#f0c08c', 0.95), (GX, GY, 0.2), bev=0.003)
    torus(0.031, 0.005, p['orange'], (GX, GY, 0.25))


# ======================================================================================
# the seed vault (level 38, the draft docs/drafts/levels-31-40.md): dug into the frozen rock of the canyon wall next to
#    the Ice Hollow, as Svalbard is on Earth; not in the hollow itself, whose ice will melt as the air thickens. Outside:
#    the narrow cream portal sticking out of the rock, with the orange stripe and a lit strip over the steel door; frost
#    on the rock. Next to the door the small room of our glass where the agronomist tests which seeds sprout here, beds
#    under lamps; sealed boxes of seed from the Ark's bank wait on a pallet; the edge of the Ice Hollow in front.
# ======================================================================================
def b_seedvault(p):
    import random
    rnd = random.Random(3)
    frost = mat('frost', '#eef6ff', 0.6)
    # ---- the slope of the canyon wall the portal comes out of, as Svalbard's out of its mountain: one rounded mass of
    #      rock with the thin dark lines of its strata (as on the map), frost on it, broken boulders at its foot
    tones = [mat('strata1', '#c8744e', 0.92), mat('strata2', '#b6603c', 0.92), mat('strata3', '#d0865c', 0.92)]
    line = mat('strataline', '#8f4a2e', 0.9)
    RX, RY, RZ_, CY = 1.25, 0.78, 0.82, 1.02
    o = ball(1.0, tones[0], (0, CY, 0), (RX, RY, RZ_), seg=48); cut_below(o, 0.0)
    for c in (0.16, 0.32, 0.48, 0.64):
        k = math.sqrt(max(0.0, 1 - (c / RZ_) ** 2))
        pts = [(RX * k * 1.004 * math.cos(t), CY - RY * k * 1.004 * math.sin(t), c) for t in [D2R(8 + i * 8) for i in range(21)]]
        tube(pts, 0.006, line)
    for q in range(14):
        t = rnd.uniform(0.2, 2.9); c = rnd.uniform(0.25, 0.75); k = math.sqrt(max(0.0, 1 - (c / RZ_) ** 2))
        ball(rnd.uniform(0.04, 0.08), frost, (RX * k * math.cos(t), CY - RY * k * math.sin(t) - 0.01, c), (1.8, 0.9, 0.3), seg=8)
    def crag(at, r, h, m):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0, location=(0, 0, 0))
        o = bpy.context.object
        for v in o.data.vertices: v.co *= rnd.uniform(0.82, 1.12)
        o.scale = (r, r * 0.85, h); o.location = at; bpy.ops.object.transform_apply(location=True, scale=True)
        cut_below(o, 0.0); return _done(o, m, smooth=False)
    for k in range(7):
        x_ = rnd.uniform(-1.05, 1.05)
        if abs(x_) < 0.6: x_ = math.copysign(0.6 + abs(x_) * 0.6, x_)
        crag((x_, rnd.uniform(0.38, 0.48), 0.0), rnd.uniform(0.06, 0.12), rnd.uniform(0.06, 0.12), tones[k % 3])
    # ---- the portal: a long narrow box sticking out of the rock, the stripe, the lit strip, the steel door
    PW, PD, PH, PY = 0.38, 0.9, 0.52, 0.18
    rbox(PW + 0.06, PD, 0.05, 0.04, p['char'], (0, PY, 0.0))
    rbox(PW, PD, PH, 0.06, p['cream'], (0, PY, 0.04), seg=4)
    rbox(PW + 0.012, PD + 0.012, 0.03, 0.06, p['orange'], (0, PY, 0.12))
    FY = PY - PD / 2
    rbox(0.2, 0.03, 0.3, 0.02, p['orange'], (0, FY - 0.005, 0.04), seg=2)
    rbox(0.16, 0.035, 0.27, 0.015, p['steel'], (0, FY - 0.01, 0.04), seg=2)
    rbox(0.01, 0.04, 0.27, 0.003, p['char'], (0, FY - 0.012, 0.04), seg=1)
    rbox(PW - 0.06, 0.02, 0.12, 0.01, p['teal'], (0, FY - 0.006, 0.36), seg=1)      # the lit strip over the door
    light(p, (0.15, FY - 0.02, 0.33), 0.014)
    vent(p, (0.0, PY + 0.2, 0.04 + PH - 0.01), 0.06)
    # ---- the glass room by the door: beds of trial seeds under lamps, the agronomist's table
    GX0, GX1, GY0, GY1, GH = PW / 2 + 0.02, PW / 2 + 0.5, FY - 0.02, FY + 0.38, 0.32
    rbox(GX1 - GX0 + 0.04, GY1 - GY0 + 0.04, 0.05, 0.03, p['char'], ((GX0 + GX1) / 2, (GY0 + GY1) / 2, 0.0))
    rbox(GX1 - GX0, GY1 - GY0, 0.06, 0.03, p['cream'], ((GX0 + GX1) / 2, (GY0 + GY1) / 2, 0.04))
    for (w_, d_, x_, y_) in ((GX1 - GX0, 0.012, (GX0 + GX1) / 2, GY0), (GX1 - GX0, 0.012, (GX0 + GX1) / 2, GY1), (0.012, GY1 - GY0, GX1, (GY0 + GY1) / 2)):
        rbox(w_, d_, GH - 0.1, 0.004, p['glass'], (x_, y_, 0.1), seg=1)
    for (x_, y_) in ((GX0, GY0), (GX1, GY0), (GX1, GY1), (GX0, GY1)): rbox(0.03, 0.03, GH - 0.06, 0.01, p['cream'], (x_, y_, 0.1), seg=1)
    rbox(GX1 - GX0 + 0.03, GY1 - GY0 + 0.03, 0.012, 0.006, p['glass'], ((GX0 + GX1) / 2, (GY0 + GY1) / 2, GH + 0.04), seg=1)
    rbox(GX1 - GX0 + 0.04, 0.03, 0.03, 0.01, p['cream'], ((GX0 + GX1) / 2, GY0, GH + 0.03), seg=1)
    rbox(GX1 - GX0 + 0.04, 0.03, 0.03, 0.01, p['cream'], ((GX0 + GX1) / 2, GY1, GH + 0.03), seg=1)
    for k, y_ in enumerate((GY0 + 0.1, GY0 + 0.27)):
        rbox(GX1 - GX0 - 0.12, 0.1, 0.03, 0.01, p['soil'], ((GX0 + GX1) / 2 + 0.03, y_, 0.1), seg=1)
        for i in range(6):
            for j in range(2):
                ball(0.009, p['leaf2'] if (i + k) % 3 else straw(), ((GX0 + GX1) / 2 - 0.12 + i * 0.05 + 0.03, y_ - 0.025 + j * 0.05, 0.14), (1, 1, 1.6), seg=6)
        ball(0.018, p['lampw'], ((GX0 + GX1) / 2 + 0.03, y_, GH - 0.02), seg=8)
    light(p, (GX1, GY0, GH + 0.06), 0.012)
    # ---- sealed boxes of seed from the Ark's bank on a pallet, brought by the robot
    rbox(0.3, 0.22, 0.03, 0.01, p['wood'], (-0.42, FY + 0.05, 0.0), seg=1)
    for (dx, dy, dz) in ((-0.07, -0.05, 0.03), (0.07, -0.05, 0.03), (-0.07, 0.05, 0.03), (0.07, 0.05, 0.03), (0.0, 0.0, 0.12)):
        rbox(0.12, 0.09, 0.08, 0.02, p['cream'], (-0.42 + dx, FY + 0.05 + dy, dz), seg=2)
        rbox(0.125, 0.095, 0.02, 0.02, p['orange'], (-0.42 + dx, FY + 0.05 + dy, dz + 0.06), seg=2)
    cyl(0.012, 0.36, p['char'], (-0.25, FY - 0.15, 0.0), bev=0.004)
    ball(0.028, p['lampw'], (-0.25, FY - 0.15, 0.38), seg=10)
    # ---- the edge of the Ice Hollow in front
    ice = cyl(0.42, 0.03, p['ice'], (-0.7, -0.75, 0.0), bev=0.012, verts=40)
    _wobble(ice, -0.7, -0.75, lambda a: 1 + 0.15 * math.sin(3 * a + 0.5) + 0.07 * math.sin(7 * a))
    for k in range(5): ball(0.035, frost, (-0.7 + rnd.uniform(-0.3, 0.3), -0.75 + rnd.uniform(-0.25, 0.25), 0.03), (1.4, 1, 0.3), seg=8)


BUILD = {'ark': lambda p: b_ark(p, 'folded'), 'ark-18': lambda p: b_ark(p, 'open'),
         'arkdish-folded': lambda p: b_arkdish(p, 'folded'), 'arkdish-open': lambda p: b_arkdish(p, 'open'), 'dome': b_dome, 'kitchen': lambda p: b_kitchen(p, 10), **{f'kitchen-{l}': (lambda l: lambda p: b_kitchen(p, l))(l) for l in (1, 10, 20)}, 'processor': b_processor, 'veglab': b_veglab, 'greenhouse': lambda p: b_greenhouse(p, 10), **{f'greenhouse-{l}': (lambda l: lambda p: b_greenhouse(p, l))(l) for l in (1, 10, 20)},
         'research-old': b_research_old, 'drone': b_drone, 'research-1': lambda p: b_research(p, 1), 'research-10': lambda p: b_research(p, 10), 'warehouse': lambda p: b_warehouse(p, 10), **{f'warehouse-{l}': (lambda l: lambda p: b_warehouse(p, l))(l) for l in (1, 10, 20)}, 'furnace': b_furnace, 'mine': b_mine,
         'pump': b_pump, 'solar': lambda p: b_solar(p, 10), **{f'solar-{l}': (lambda l: lambda p: b_solar(p, l))(l) for l in (1, 10, 20)}, 'batteries': lambda p: b_batteries(p, 10), **{f'batteries-{l}': (lambda l: lambda p: b_batteries(p, l))(l) for l in (1, 10, 20)}, 'geolocator': b_geolocator, 'mine-portal': b_mine_portal,
         'home-1': lambda p: b_home(p, 1), 'home-10': lambda p: b_home(p, 10), 'home-20': lambda p: b_home(p, 20), 'rover': b_rover, 'drill': lambda p: b_drill(p, 10), **{f'drill-{l}': (lambda l: lambda p: b_drill(p, l))(l) for l in (1, 10, 20)}, 'smelter': b_smelter, 'claypit': b_claypit, 'brickkiln': b_brickkiln, 'copperworks': b_copperworks,
         **{f'brickhome-{l}': (lambda l: lambda p: b_brickhome(p, l))(l) for l in (1, 10, 20)},
         **{f'canteen-{l}': (lambda l: lambda p: b_canteen(p, l))(l) for l in (1, 10, 20)},
         **{f'dock-{s}': (lambda s: lambda p: b_dock(p, s))(s) for s in range(5)}, 'pstation': b_pstation, 'fieldstation': b_fieldstation, 'nursery': b_nursery, 'woolworks': b_woolworks, 'slagmill': b_slagmill, 'glassworks': b_glassworks, **{f'hull-{h}': (lambda h: lambda p: b_dock(p, 4, h))(h) for h in range(1, 5)},
         **{f'brickhome-{l}i': (lambda l: lambda p: b_brickhome(p, l, True))(l) for l in (1, 10, 20)},
         **{f'canteen-{l}i': (lambda l: lambda p: b_canteen(p, l, True))(l) for l in (1, 10, 20)},
         **{f'greenhouse-{l}i': (lambda l: lambda p: b_greenhouse(p, l, True))(l) for l in (1, 10, 20)}, 'university': b_university, 'university-b': b_university_b, 'park': b_park, 'dispatch': b_dispatch, 'medpost': b_medpost, **{f'patch-{k}': (lambda k: lambda p: b_patch(p, k))(k) for k in range(1, 5)}, 'roaddepot': b_roaddepot, 'street-paved': b_street, 'street-dust': lambda p: b_street(p, False), 'weather': b_weather, 'seedvault': b_seedvault}
for name, fn in BUILD.items():
    if ONLY and name not in ONLY: continue
    reset(); p = pal(); fn(p)
    if name in ('ark', 'ark-18'): join_all(ARK_KEEP); export_light(f'{OUT}/{name}.glb')
    else: export(f'{OUT}/{name}.glb')
    print('built', name)
