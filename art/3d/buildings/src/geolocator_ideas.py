# Three ideas for the geolocator: the first building of the game, put together from the cargo containers.
# It finds deposits in the ground and measures the air (ECHO reads the 7% from it).
#   python geo.py -- <out_dir>
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = sys.argv[sys.argv.index('--') + 1]
src = open(os.path.join(HERE, "build.py")).read()
src = src[:src.index("BUILD = {")]
sys.argv = [sys.argv[0], '--', OUTDIR]
exec(compile(src, "build.py", "exec"))
from mathutils import Vector, Euler

def apply_all(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def group(fn):
    """run fn(), return the objects it made"""
    before = set(bpy.data.objects); fn(); return [o for o in bpy.data.objects if o not in before]

def turn(objs, angle, axis, center):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.transform.rotate(value=angle, orient_axis=axis, center_override=center)

def flag(p, at, h=0.32):
    cyl(0.012, h, p['char'], at, bev=0.004)
    rbox(0.1, 0.012, 0.06, 0.01, p['orange'], (at[0] + 0.05, at[1], at[2] + h - 0.07))
    ball(0.02, p['teal'], (at[0], at[1], at[2] + h + 0.015), seg=8)

def container(p, w=1.3, d=0.78, h=0.68, at=(0, 0, 0)):
    """the cargo container the station is made of: cream, ribbed doors on the right end, an orange stripe and a code"""
    x, y, z = at
    rbox(w + 0.1, d + 0.1, 0.1, 0.12, p['char'], (x, y, z))
    body = rbox(w, d, h, 0.16, p['cream'], (x, y, z + 0.08), seg=5)
    rbox(w + 0.02, d + 0.02, 0.04, 0.16, p['orange'], (x, y, z + 0.08 + h * 0.62))
    # the double door on the right end: a flat panel inside the rounded corners, three bars, two handles
    pw = d - 0.36
    rbox(0.025, pw, h - 0.24, 0.01, p['cream2'], (x + w / 2 + 0.002, y, z + 0.2))
    for k in (-1, 0, 1): rbox(0.02, 0.025, h - 0.26, 0.008, p['char'], (x + w / 2 + 0.012, y + k * pw * 0.33, z + 0.21))
    for k in (-1, 1): rbox(0.03, 0.02, 0.08, 0.008, p['orange'], (x + w / 2 + 0.02, y + k * 0.05, z + 0.4))
    rbox(0.22, 0.02, 0.08, 0.02, p['orange'], (x - w / 2 + 0.2, y - d / 2 - 0.005, z + 0.62))
    return body

# ---------- G1: the radar station ----------
def geo_1(p):
    W, D, H = 1.3, 0.78, 0.68
    body = container(p, W, D, H)
    # a window on the front: inside, a desk with a glowing map screen and a chair
    def desk(cx, cy, fz):
        rbox(0.4, 0.16, 0.18, 0.03, p['cream2'], (cx, cy + 0.05, fz))
        rbox(0.32, 0.03, 0.17, 0.02, p['teal'], (cx, cy + 0.12, fz + 0.2))
        for (dx, dz) in ((-0.06, 0.27), (0.07, 0.3), (0.02, 0.24)): ball(0.012, p['orange'], (cx + dx, cy + 0.1, fz + dz), seg=6)
        place(REST + 'chair_A.gltf', 0.12, (cx + 0.05, cy - 0.08, fz), rz=0.3)
    lit_room(p, body, 0.6, 0.34, 0.32, -0.22, -D / 2 + 0.01, 0.28, 0.0, desk)
    door(p, 0.38, -D / 2 - 0.02, 0.0, 0.26, 0.48, 0.08)
    # the radar on the roof: a drum, a short mast, a dish with an orange rim and a feed on three struts
    R0 = Vector((-0.2, 0.1, H + 0.08))
    cyl(0.2, 0.16, p['cream2'], tuple(R0), bev=0.06); torus(0.2, 0.02, p['orange'], (R0.x, R0.y, R0.z + 0.08))
    cyl(0.04, 0.28, p['char'], (R0.x, R0.y, R0.z + 0.14), bev=0.012)
    C = Vector((R0.x, R0.y, R0.z + 0.52))
    dish = group(lambda: (dome(0.42, p['cream'], (0, 0, 0), seg=40, sz=0.32), torus(0.42, 0.035, p['orange'], (0, 0, 0))))
    for o in dish: o.location = (o.location.x, o.location.y, o.location.z)
    feed_parts = group(lambda: [tube([(math.cos(a) * 0.4, math.sin(a) * 0.4, 0.0), (0, 0, -0.3)], 0.01, p['char']) for a in (0.3, 2.4, 4.5)] + [ball(0.045, p['teal'], (0, 0, -0.3), seg=12)])
    parts = dish + feed_parts
    # turn the dish so it opens up and to the front-right, like it is sweeping the horizon
    for o in parts: o.rotation_euler = (math.radians(180 - 55), 0, math.radians(-35)); o.location = tuple(C)
    apply_all(parts)
    # the weather mast: cups of the anemometer, a wind vane, a light; this is what measures the air
    M = Vector((0.5, 0.22, H + 0.08))
    cyl(0.05, 0.06, p['char'], tuple(M), bev=0.02); cyl(0.016, 0.55, p['grey'], tuple(M), bev=0.005)
    top = M.z + 0.55
    for k in range(3):
        a = k * 2.094
        tube([(M.x, M.y, top), (M.x + math.cos(a) * 0.12, M.y + math.sin(a) * 0.12, top)], 0.008, p['char'])
        ball(0.035, p['orange'], (M.x + math.cos(a) * 0.12, M.y + math.sin(a) * 0.12, top), (1, 1, 0.8), seg=10)
    rbox(0.24, 0.015, 0.012, 0.005, p['char'], (M.x, M.y, top - 0.12), (0, 0, 0.6))
    rbox(0.08, 0.012, 0.07, 0.01, p['orange'], (M.x - 0.11 * math.cos(0.6), M.y - 0.11 * math.sin(0.6), top - 0.15), (0, 0, 0.6))
    light(p, (M.x, M.y, top + 0.05), 0.03)
    # a small solar panel leaning on the left end, its cable into the wall
    rbox(0.42, 0.5, 0.03, 0.02, p['navy'], (-W / 2 - 0.2, 0.0, 0.32), (0, math.radians(-38), 0))
    rbox(0.46, 0.54, 0.02, 0.02, p['cream'], (-W / 2 - 0.21, 0.0, 0.3), (0, math.radians(-38), 0))
    tube([(-W / 2 - 0.05, 0.2, 0.1), (-W / 2 + 0.01, 0.2, 0.1)], 0.02, p['char'])
    # survey flags on the found deposit, in front-right
    for (x, y) in ((0.95, -0.75), (1.2, -0.45), (0.75, -1.0)): flag(p, (x, y, 0.0))
    ball(0.07, p['crystal'], (0.98, -0.72, 0.0), (1, 1, 0.8), seg=10)

# ---------- G2: the scanner: a probe in the ground sends rings, a hologram of the planet shows what it found ----------
def geo_2(p):
    # the probe tripod over the ground, a spike into it, three glowing rings on the ground (the scan)
    P = Vector((0.55, -0.35, 0.0))
    ring = mat('scan', '#6ff4ea', 0.3, emit='#2fd8c8', strength=0.9, alpha=0.55)
    for k, r in enumerate((0.3, 0.48, 0.66)):
        t = torus(r, 0.018, ring, (P.x, P.y, 0.012)); t.scale = (1, 1, 0.3); apply_all([t])
    for k in range(3):
        a = k * 2.094 + 0.3; fx, fy = P.x + math.cos(a) * 0.36, P.y + math.sin(a) * 0.36
        cyl(0.05, 0.04, p['char'], (fx, fy, 0.0), bev=0.015)
        tube([(fx, fy, 0.03), (P.x, P.y, 0.75)], 0.035, p['orange'])
    cyl(0.12, 0.16, p['cream'], (P.x, P.y, 0.68), bev=0.05); ball(0.04, p['teal'], (P.x, P.y, 0.88), seg=10)
    cyl(0.03, 0.62, p['char'], (P.x, P.y, 0.06), bev=0.01)
    for z in (0.2, 0.35, 0.5): torus(0.04, 0.012, p['orange'], (P.x, P.y, z))
    # the round cabin with a glass dome: inside, a glowing globe of the planet on a pedestal, with marks on the deposits
    C = Vector((-0.45, 0.2, 0.0))
    cyl(0.62, 0.1, p['char'], tuple(C), bev=0.04)
    cyl(0.56, 0.45, p['cream'], (C.x, C.y, 0.08), bev=0.12)
    torus(0.56, 0.025, p['orange'], (C.x, C.y, 0.36))
    door(p, C.x - 0.15, C.y - 0.57, 0.0, 0.24, 0.36, 0.08)
    porthole(p, (C.x + 0.4, C.y - 0.39, 0.32), (0.72, -0.69), 0.055)
    cyl(0.5, 0.03, p['room'], (C.x, C.y, 0.52), bev=0.0)
    cyl(0.07, 0.14, p['cream2'], (C.x, C.y, 0.55), bev=0.03)
    globe = mat('globe', '#d9874f', 0.5, emit='#ff9a52', strength=0.35)
    ball(0.2, globe, (C.x, C.y, 0.86), seg=28)
    for (a, b) in ((0.4, 0.3), (2.0, -0.2), (3.5, 0.5), (5.0, 0.0)):
        ball(0.03, p['teal'], (C.x + math.cos(a) * math.cos(b) * 0.2, C.y + math.sin(a) * math.cos(b) * 0.2, 0.86 + math.sin(b) * 0.2), seg=8)
    t = torus(0.24, 0.008, p['teal'], (C.x, C.y, 0.86), (0.4, 0.2, 0))
    dome(0.5, p['glass'], (C.x, C.y, 0.52), seg=40, sz=0.95)
    torus(0.5, 0.035, p['orange'], (C.x, C.y, 0.53))
    # the antenna stands on the drum's rim, outside the glass
    ax, ay = C.x + 0.53 * math.cos(0.9), C.y + 0.53 * math.sin(0.9)
    cyl(0.025, 0.06, p['char'], (ax, ay, 0.52), bev=0.01); cyl(0.013, 0.45, p['char'], (ax, ay, 0.55), bev=0.005); light(p, (ax, ay, 1.02), 0.03)
    # the data cable from the probe to the cabin, lying on the ground
    tube([(P.x - 0.12, P.y + 0.05, 0.03), (0.05, -0.05, 0.03), (C.x + 0.55, C.y - 0.1, 0.03), (C.x + 0.55, C.y - 0.1, 0.15)], 0.02, p['char'])
    # a rack with drill cores beside the cabin
    R = Vector((-0.6, -0.75, 0.0))
    rbox(0.5, 0.22, 0.05, 0.02, p['char'], tuple(R))
    for k in range(4):
        cyl(0.04, 0.22 + (k % 2) * 0.05, [p['rock'], p['rock2'], p['ore'], p['rock']][k], (R.x - 0.18 + k * 0.12, R.y, 0.05), bev=0.015)
    for (x, y) in ((1.1, -0.05), (0.95, -0.95)): flag(p, (x, y, 0.0))

# ---------- G3: the weather and survey post: a big air gauge, a telescope dome, an antenna on the container ----------
def geo_3(p):
    W, D, H = 1.2, 0.75, 0.62
    body = container(p, W, D, H, (0.25, 0.3, 0.0))
    door(p, 0.5, 0.3 - D / 2 - 0.02, 0.0, 0.24, 0.44, 0.08)
    porthole(p, (0.05, 0.3 - D / 2 - 0.005, 0.45), (0, -1), 0.06)
    # the small observatory on the roof: a drum, a dome with an open slit, a telescope looking out
    O = Vector((0.0, 0.35, H + 0.08))
    cyl(0.3, 0.16, p['cream2'], tuple(O), bev=0.05)
    dome(0.3, p['cream'], (O.x, O.y, O.z + 0.16), seg=40, sz=0.9)
    rbox(0.1, 0.34, 0.3, 0.04, mat('dark', '#1b1817', 0.9), (O.x + 0.0, O.y - 0.18, O.z + 0.2), (math.radians(-35), 0, 0))
    cyl(0.04, 0.32, p['orange'], (O.x, O.y - 0.2, O.z + 0.28), (math.radians(-55), 0, 0), bev=0.015)
    torus(0.3, 0.02, p['orange'], (O.x, O.y, O.z + 0.16))
    # the antenna on the right end of the roof
    A = Vector((0.7, 0.45, H + 0.08))
    cyl(0.02, 0.6, p['char'], tuple(A), bev=0.006)
    for z, w in ((0.35, 0.22), (0.47, 0.16), (0.57, 0.1)): rbox(w, 0.015, 0.015, 0.006, p['char'], (A.x, A.y, A.z + z))
    light(p, (A.x, A.y, A.z + 0.64), 0.03)
    # the big air gauge in front: it shows how much air there is (7% now)
    G = Vector((-0.75, -0.45, 0.0))
    cyl(0.06, 0.06, p['char'], tuple(G), bev=0.02); cyl(0.03, 0.5, p['grey'], tuple(G), bev=0.01)
    gz = 0.82
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.3, depth=0.07, location=(G.x, G.y, gz), rotation=(math.pi / 2, 0, 0)); _done(bpy.context.object, p['cream'])
    torus(0.3, 0.04, p['orange'], (G.x, G.y - 0.035, gz), (math.pi / 2, 0, 0))
    # the scale: a teal arc of ticks from 0 to 100 and a needle near the start
    for k in range(11):
        a = math.radians(210 - k * 24)
        rbox(0.02, 0.012, 0.05 if k % 5 else 0.08, 0.006, p['char'] if k else p['teal'], (G.x + math.cos(a) * 0.23, G.y - 0.04, gz + math.sin(a) * 0.23 - 0.025), (0, -(a - math.pi / 2), 0))
    na = math.radians(210 - 0.07 * 240)
    tube([(G.x, G.y - 0.05, gz), (G.x + math.cos(na) * 0.2, G.y - 0.05, gz + math.sin(na) * 0.2)], 0.012, p['orange'])
    ball(0.03, p['char'], (G.x, G.y - 0.05, gz), seg=10)
    rbox(0.12, 0.01, 0.05, 0.01, p['teal'], (G.x, G.y - 0.045, gz - 0.12))
    # a wind sock on a pole and a sample probe in the ground with flags
    S = Vector((-0.95, 0.35, 0.0))
    cyl(0.015, 0.6, p['char'], tuple(S), bev=0.005)
    for k in range(4):
        cyl(0.05 - k * 0.008, 0.08, p['orange'] if k % 2 == 0 else p['cream'], (S.x + 0.04 + k * 0.08, S.y, 0.55 - k * 0.012), (0, math.pi / 2 + 0.15, 0), bev=0.0)
    cyl(0.03, 0.4, p['char'], (0.85, -0.65, 0.0), bev=0.01); cyl(0.06, 0.06, p['orange'], (0.85, -0.65, 0.4), bev=0.02); light(p, (0.85, -0.65, 0.5), 0.03)
    tube([(0.85, -0.6, 0.03), (0.65, 0.3 - D / 2 - 0.0, 0.03)], 0.015, p['char'])
    for (x, y) in ((1.1, -0.9), (0.6, -1.05)): flag(p, (x, y, 0.0))

for name, fn in (('geo-1', geo_1), ('geo-2', geo_2), ('geo-3', geo_3)):
    reset(); p = pal(); fn(p); export(f'{OUT}/{name}.glb'); print('built', name)
