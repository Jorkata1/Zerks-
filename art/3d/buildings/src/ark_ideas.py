# Two ideas for the Ark (06.11.2026): Joro wants to change it and asked for two other ways it could look.
# What the Ark is (docs/concept.md, docs/levels.md): the ship we came in. It landed at the bottom of the canyon and stays
# in the middle of the base as the main building. It carries 100 colonists asleep in life pods; every upgrade of the Ark
# gives power to one more pod. Its reactor gives the energy in the first levels (it runs down by level 7), it holds a
# little of every resource (1000) until there is a warehouse, the commander walks out on one side and the containers
# come down on the other, and the building drone lives on it (docs/build-sequence.md, a proposal).
# So both ideas show the same things, each in its own way:
#   - the pods behind clear glass: at level 10 most of the pods you see are open (those people are awake), one glows
#     teal (it has power and its sleeper is next), the rest are dark (no power yet);
#   - the reactor's radiators: a reactor has to give its heat away, and in thin air that is done by big flat panels;
#   - the way out for people, the cargo hatch with a crane and the containers, the pad with the drone.
#   A  the ship that stands: it landed upright on four legs and its engines, like a lander. The pods are in a glass ring
#      in the middle, a lift takes people down, a crane on the other side lowers the containers, two radiators stand out
#      to the sides; the drone has a balcony with a small hatch high on the hull.
#   B  the ship that lies: a lifting body that came down on its belly like a glider, on six short legs. The belly is the
#      dark heat shield, the cockpit is a glass canopy on the nose, the pods are in a row behind a long window and a
#      ramp folds down from the airlock. On the roof the bay stands open: the radiators are on the inner faces of its
#      doors (as on the Space Shuttle), the reactor and the drone's pad are inside. The crane is on the far side.
# Units as in build.py; on the map and the sheet both stand at 4.15 m to a unit. Doors look along -y; the camera sees -y and +x.
# Each model is joined into one mesh and exported without texture coordinates, so it stays under 250 KB without npx.
#   python ark_ideas.py -- <out_dir> [ark-a,ark-b]
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:]
OUTDIR = ARGS[0]
ONLY_IDEAS = ARGS[1].split(',') if len(ARGS) > 1 else None
src = open(os.path.join(HERE, "build.py")).read()
src = src[:src.index("BUILD = {")]
sys.argv = [sys.argv[0], '--', OUTDIR]
exec(compile(src, "build.py", "exec"))
from mathutils import Vector

D2R = math.radians

# ---------- shared parts ----------
def pod(p, at, fr, z, state, s=1.0):
    """a life pod standing with its glass lid towards the window (-inward(fr)).
    state: 'sleep' (has power, its sleeper is next: teal), 'dark' (no power yet), 'open' (the lid is open, the person is awake)"""
    x, y = at; t, i = tangent(fr), inward(fr)
    L = frame(x, y, fr)
    W, D, H = 0.17 * s, 0.13 * s, 0.46 * s
    rbox(W, D, H, 0.06 * s, p['cream'], (x, y, z), (0, 0, fr), seg=3)
    rbox(W + 0.012, D + 0.012, 0.045 * s, 0.03 * s, p['char'], (x, y, z), (0, 0, fr), seg=2)
    fv = -D / 2
    inner = {'sleep': p['teal'], 'dark': p['char'], 'open': p['win']}[state]
    rbox(W * 0.62, 0.012, H * 0.62, 0.03 * s, inner, (*L(0, fv - 0.004), z + H * 0.2), (0, 0, fr), seg=2)
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
    """the building drone (build.py, b_drone), scaled and parked at `at`"""
    before = set(bpy.data.objects)
    b_drone(p)
    for o in [o for o in bpy.data.objects if o not in before]:
        o.location = (o.location.x * s + at[0], o.location.y * s + at[1], o.location.z * s + at[2])
        o.scale = (o.scale.x * s, o.scale.y * s, o.scale.z * s)

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

# ======================================================================================
# A: the ship that stands
# ======================================================================================
def ark_a(p):
    R = 0.62
    Z_SKIRT, Z_HULL, Z_PODS, Z_UP, Z_NOSE = 0.5, 0.78, 1.8, 2.45, 3.05
    # the engines under the skirt, the skirt (dark: the base of the ship), four landing legs between the doors
    for a in (90, 210, 330):
        cone(0.12, 0.06, 0.26, p['char'], (math.cos(D2R(a)) * 0.25, math.sin(D2R(a)) * 0.25, 0.37))
    cone(0.5, R + 0.015, Z_HULL - Z_SKIRT + 0.02, p['char'], (0, 0, (Z_SKIRT + Z_HULL + 0.02) / 2), verts=64)
    for a in (45, 135, 225, 315):
        c, s_ = math.cos(D2R(a)), math.sin(D2R(a))
        top, foot = Vector((c * 0.55, s_ * 0.55, 0.62)), Vector((c * 0.9, s_ * 0.9, 0.09))
        tube([tuple(top), tuple(foot)], 0.038, p['char'])
        tube([tuple(top.lerp(foot, 0.35)), tuple(top.lerp(foot, 0.62))], 0.052, p['orange'])
        ball(0.055, p['char'], tuple(foot), seg=14)
        cyl(0.12, 0.05, p['char'], (foot.x, foot.y, 0.0), bev=0.02)
    # the lower hull: the reactor, the airlock and the hold
    cyl(R, Z_PODS - Z_HULL, p['cream'], (0, 0, Z_HULL), bev=0.04, verts=64)
    cyl(R + 0.012, 0.05, p['orange'], (0, 0, 1.56), bev=0.01, verts=64)
    door(p, 0.0, -R + 0.01, 0.0, w=0.3, h=0.5, z=0.86)
    rbox(0.36, 0.1, 0.03, 0.01, p['char'], (0.0, -R - 0.04, 0.83))
    hatch(p, R - 0.01, 0.0, math.pi / 2, w=0.38, h=0.46, z=0.86)
    for a in (300, 330, 120, 150, 60, 200):
        c, s_ = math.cos(D2R(a)), math.sin(D2R(a))
        porthole(p, (c * R, s_ * R, 1.22), (c, s_), r=0.055)
    # the lift: two rails up the hull, the cage down on the ground, the hoist on top
    for sx in (-1, 1):
        cyl(0.025, 1.62, p['char'], (sx * 0.24, -0.71, 0.0), bev=0.01)
        for zb in (0.95, 1.45):
            rbox(0.04, 0.16, 0.04, 0.015, p['char'], (sx * 0.24, -0.645, zb), seg=2)
    rbox(0.58, 0.12, 0.1, 0.03, p['char'], (0.0, -0.72, 1.6))
    light(p, (0.0, -0.785, 1.66), 0.022)
    rbox(0.44, 0.36, 0.04, 0.02, p['cream2'], (0.0, -0.9, 0.0), seg=2)
    for sx in (-1, 1):
        side = sx * 0.2
        tube([(side, -0.74, 0.3), (side, -1.06, 0.3), (sx * 0.08, -1.06, 0.3)], 0.014, p['orange'])
        for py in (-0.74, -1.06):
            cyl(0.012, 0.27, p['char'], (side, py, 0.04), bev=0.004)
    # the radiators of the reactor, out to the two sides
    for a in (45, 225):
        radiator(p, D2R(a), 0.74, 1.18, 0.95, 1.75, [(1.05, 0.76), (1.45, 0.76)])
    # the crane over the cargo hatch, a container on its hook, another one set down beside it
    rbox(0.14, 0.14, 0.1, 0.03, p['char'], (R + 0.02, 0.0, 1.42))
    tube([(R + 0.06, 0.0, 1.47), (0.88, 0.0, 1.68), (1.3, 0.0, 1.68)], 0.035, p['orange'])
    rbox(0.08, 0.08, 0.06, 0.02, p['char'], (1.3, 0.0, 1.62))
    tube([(1.3, 0.0, 1.62), (1.3, 0.0, 0.36)], 0.008, p['char'])
    container(p, (1.3, 0.0), 0.0, 0.38, 0.34, 0.32)
    container(p, (1.27, 0.5), 0.12, 0.38, 0.34, 0.32, eye=False)
    # the pod deck: a glass ring, the pods round a column that brings them power and cold
    cyl(R - 0.02, 0.03, p['floor'], (0, 0, Z_PODS), bev=0.005, verts=64)
    bpy.ops.mesh.primitive_cylinder_add(vertices=72, radius=R, depth=Z_UP - Z_PODS, location=(0, 0, (Z_PODS + Z_UP) / 2), end_fill_type='NOTHING')
    _done(bpy.context.object, p['glass'])
    for zr in (Z_PODS, Z_UP):
        torus(R + 0.005, 0.03, p['char'], (0, 0, zr))
    for k in range(8):
        a = D2R(k * 45 + 22.5)
        rbox(0.032, 0.032, Z_UP - Z_PODS, 0.012, p['char'], (math.cos(a) * R, math.sin(a) * R, Z_PODS), (0, 0, a), seg=1)
    cyl(0.12, Z_UP - Z_PODS - 0.03, p['cream2'], (0, 0, Z_PODS + 0.03), bev=0.02)
    for zr in (2.0, 2.2):
        torus(0.125, 0.012, p['teal'], (0, 0, zr))
    torus(0.26, 0.012, p['lampw'], (0, 0, Z_UP - 0.03))
    states = {0: 'open', 45: 'dark', 90: 'dark', 135: 'dark', 180: 'dark', 225: 'open', 270: 'open', 315: 'sleep'}
    for a, st in states.items():
        ar = D2R(a)
        pod(p, (math.cos(ar) * 0.38, math.sin(ar) * 0.38), ar + math.pi / 2, Z_PODS + 0.03, st)
    # the upper hull with the bridge's round windows, the nose with the antenna
    cyl(R, Z_NOSE - Z_UP, p['cream'], (0, 0, Z_UP), bev=0.0, verts=64)
    for a in (270, 300, 330, 0, 180, 90, 135):
        c, s_ = math.cos(D2R(a)), math.sin(D2R(a))
        porthole(p, (c * R, s_ * R, 2.78), (c, s_), r=0.065)
    dome(R, p['cream'], (0, 0, Z_NOSE), seg=48, sz=1.0)
    cyl(0.07, 0.06, p['cream2'], (0, 0, Z_NOSE + R - 0.03), bev=0.02)
    cyl(0.012, 0.3, p['char'], (0, 0, Z_NOSE + R + 0.02), bev=0.004)
    light(p, (0, 0, Z_NOSE + R + 0.33), 0.022)
    # the drone's balcony on the upper hull, with the small hatch it goes in by (for paste and charge)
    a = D2R(225); c, s_ = math.cos(a), math.sin(a)
    rbox(0.34, 0.12, 0.06, 0.02, p['char'], (c * 0.72, s_ * 0.72, 2.56), (0, 0, a), seg=2)
    pad(p, (c * 0.9, s_ * 0.9, 2.6), 0.26)
    drone_at(p, (c * 0.9, s_ * 0.9, 2.645), 0.7)
    door(p, c * (R - 0.01), s_ * (R - 0.01), a + math.pi / 2, w=0.2, h=0.22, z=2.68)

# ======================================================================================
# B: the ship that lies on its belly
# ======================================================================================
def pod_row(p, fr, states, s, v):
    def f(cx, cy, fz):
        L = frame(cx, cy, fr); n = len(states)
        for k, st in enumerate(states):
            pod(p, L((k - (n - 1) / 2) * 0.19, v), fr, fz, st, s)
    return f

def lifting_hull(p, L, W, z0, z1, r, nose, tail, zc, belly):
    """a soft hull with flat sides in the middle that narrows to a blunt nose at +x and a little at the back;
    the faces under `belly` are charcoal: the heat shield it came down on"""
    o = rbox(L, W, z1 - z0, r, p['cream'], (0, 0, z0), seg=5)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    x1, x2 = L / 2 - nose, -L / 2 + tail
    bm = bmesh.new(); bm.from_mesh(o.data)
    cuts = [x1 + nose * k / 14 for k in range(1, 14)] + [x2 - tail * k / 5 for k in range(1, 5)] + [x2 + (x1 - x2) * k / 6 for k in range(1, 6)]
    for x in cuts:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(x, 0, 0), plane_no=(1, 0, 0))
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, belly), plane_no=(0, 0, 1))
    for v in bm.verts:
        x, y, z = v.co
        if x > x1: k = min(1.0, (x - x1) / nose); f = 0.22 + 0.78 * math.sqrt(1 - k * k)
        elif x < x2: k = min(1.0, (x2 - x) / tail); f = 0.72 + 0.28 * math.sqrt(1 - k * k)
        else: f = 1.0
        v.co.y = y * f
        v.co.z = zc + (z - zc) * (f if z > zc else 0.6 + 0.4 * f)
    o.data.materials.append(p['char'])
    for fc in bm.faces:
        fc.material_index = 1 if fc.calc_center_median().z < belly + 0.002 else 0
    bm.to_mesh(o.data); bm.free()
    for pl in o.data.polygons: pl.use_smooth = True
    return o

def ark_b(p):
    L, W, Z0, Z1, RR = 2.5, 1.36, 0.22, 1.15, 0.25
    NOSE, TAIL, ZC, BELLY = 0.9, 0.3, 0.55, 0.4
    hull = lifting_hull(p, L, W, Z0, Z1, RR, NOSE, TAIL, ZC, BELLY)
    # the orange band: a thin slice of the hull, pushed out a little
    band = hull.copy(); band.data = hull.data.copy(); bpy.context.collection.objects.link(band)
    bm = bmesh.new(); bm.from_mesh(band.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0.43), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0.475), plane_no=(0, 0, 1), clear_outer=True)
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * 0.012
    bm.to_mesh(band.data); bm.free(); _done(band, p['orange'])
    # six short legs under the belly
    for x in (-0.8, 0.0, 0.75):
        for y in (-0.48, 0.48):
            cyl(0.09, 0.04, p['char'], (x, y, 0.0), bev=0.015)
            cyl(0.035, 0.22, p['char'], (x, y, 0.03), bev=0.01)
            cyl(0.046, 0.04, p['orange'], (x, y, 0.1), bev=0.01)
    # the pods behind the long window on the near side
    lit_room(p, hull, 0.85, 0.3, 0.48, -0.5, -W / 2 + 0.01, 0.55, 0.0,
             pod_row(p, 0.0, ['open', 'open', 'sleep', 'dark'], 0.56, 0.136))
    porthole(p, (0.62, -0.655, 0.72), (0.12, -0.99), r=0.06)
    porthole(p, (-0.5, W / 2, 0.72), (0, 1), r=0.06)
    porthole(p, (-0.2, W / 2, 0.72), (0, 1), r=0.06)
    # the cockpit: a glass canopy on the nose, two seats looking forward, the console in front of them
    cx0 = 0.64
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1.0, depth=0.6, location=(cx0, 0, 1.0 + 0.3))
    c = bpy.context.object; c.scale = (0.27, 0.21, 1.0); bpy.ops.object.transform_apply(scale=True)
    cut(hull, c)
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1.0, depth=0.02, location=(cx0, 0, 1.0))
    fl = bpy.context.object; fl.scale = (0.27, 0.21, 1.0); bpy.ops.object.transform_apply(scale=True); _done(fl, p['floor'])
    for y in (-0.08, 0.08):
        chair(p, (cx0 - 0.07, y), -math.pi / 2, 1.01)
    rbox(0.07, 0.3, 0.06, 0.02, p['cream2'], (cx0 + 0.14, 0.0, 1.01), seg=2)
    rbox(0.012, 0.24, 0.04, 0.006, p['teal'], (cx0 + 0.105, 0.0, 1.035), seg=1)
    can = dome(0.28, p['glass'], (cx0, 0, 1.0), seg=32, sz=0.7)
    can.scale = (1.0, 0.22 / 0.28, 1.0); bpy.ops.object.select_all(action='DESELECT'); can.select_set(True)
    bpy.context.view_layer.objects.active = can; bpy.ops.object.transform_apply(scale=True)
    # the airlock and the ramp folded down from it
    dx = 0.17
    door(p, dx, -W / 2 - 0.005, 0.0, w=0.26, h=0.46, z=0.42)
    y0, z0, y1 = -W / 2 - 0.06, 0.42, -1.3
    run, rise = y0 - y1, z0; ln = math.hypot(run, rise); al = math.atan2(rise, run); yc = (y0 + y1) / 2
    rbox(0.26, ln, 0.03, 0.01, p['char'], (dx, yc, z0 / 2 - 0.015), (al, 0, 0), seg=1)
    for sx in (-1, 1):
        rbox(0.025, ln, 0.05, 0.01, p['orange'], (dx + sx * 0.14, yc, z0 / 2 - 0.02), (al, 0, 0), seg=1)
    for k in range(1, 5):
        yk = y1 + run * k / 5; zk = rise * k / 5
        rbox(0.22, 0.016, 0.01, 0.004, p['grey'], (dx, yk, zk + 0.008), (al, 0, 0), seg=1)
    for sx in (-1, 1):
        x = dx + sx * 0.14
        tube([(x, -1.25, 0.3), (x, -0.78, 0.62)], 0.012, p['orange'])
        cyl(0.01, 0.27, p['char'], (x, -1.25, 0.04), bev=0.003)
    # the engines at the back
    for y in (-0.25, 0.25):
        cone(0.17, 0.11, 0.26, p['char'], (-L / 2 - 0.11, y, 0.62), (0, math.pi / 2, 0))
    # the bay on the roof: its doors stand open, and the radiators on their inner faces give away the reactor's heat;
    # in the bay the reactor at the back and the drone's pad at the front
    BX0, BX1, BY = -0.85, 0.15, 0.4
    bc = cutter(BX1 - BX0, 2 * BY, 0.5, ((BX0 + BX1) / 2, 0, 0.95), r=0.04)
    cut(hull, bc)
    rbox(BX1 - BX0 - 0.02, 2 * BY - 0.02, 0.02, 0.01, p['cream2'], ((BX0 + BX1) / 2, 0, 0.951), seg=1)
    FZ = 0.971
    rx = -0.6
    for x in (rx - 0.14, rx + 0.14):
        rbox(0.05, 0.22, 0.06, 0.015, p['char'], (x, 0, FZ), seg=2)
    hcyl(0.13, 0.44, p['cream2'], (rx, 0, FZ + 0.15), 'x', bev=0.03)
    for x in (rx - 0.1, rx + 0.1):
        torus(0.133, 0.014, p['orange'], (x, 0, FZ + 0.15), (0, math.pi / 2, 0))
    light(p, (rx, 0, FZ + 0.29), 0.02)
    for sy in (-1, 1):
        tube([(rx, sy * 0.12, FZ + 0.2), (rx, sy * 0.3, FZ + 0.2), (rx, sy * 0.39, Z1 - 0.01)], 0.016, p['char'])
    pad(p, (-0.1, 0, FZ), 0.2)
    drone_at(p, (-0.1, 0, FZ + 0.045), 0.6)
    PW, PL, BETA = 0.4, 0.96, D2R(30)
    for sy in (-1, 1):
        hy, hz = sy * (BY + 0.01), Z1
        uy, uz = sy * math.sin(BETA), math.cos(BETA)          # along the door, from the hinge up and out
        ny, nz = -sy * math.cos(BETA), math.sin(BETA)          # the inner face's normal, up and into the bay
        phi = -sy * BETA
        xm = (BX0 + BX1) / 2
        cy_, cz_ = hy + uy * PW / 2, hz + uz * PW / 2
        rbox(PL, 0.035, PW, 0.015, p['cream'], (xm, cy_, cz_ - PW / 2), (phi, 0, 0), seg=2)
        for k in range(5):
            t_ = 0.07 + k * 0.065
            rbox(PL - 0.08, 0.012, 0.014, 0.005, p['grey'], (xm, hy + uy * t_ + ny * 0.022, hz + uz * t_ + nz * 0.022 - 0.007), (phi, 0, 0), seg=1)
        rbox(PL, 0.045, 0.035, 0.012, p['orange'], (xm, hy + uy * PW, hz + uz * PW - 0.0175), (phi, 0, 0), seg=1)
        hcyl(0.018, PL, p['char'], (xm, hy, hz), 'x', bev=0.005)
    # an antenna with a light at the back of the roof
    cyl(0.012, 0.3, p['char'], (-1.0, 0.3, Z1 - 0.02), bev=0.004)
    light(p, (-1.0, 0.3, Z1 + 0.29), 0.02)
    light(p, (0.95, -0.35, Z1 - 0.05), 0.02)
    # the far side: the cargo hatch, the crane on the roof's edge, a container on the hook and one beside it
    hatch(p, 0.2, W / 2 + 0.005, math.pi, w=0.4, h=0.46, z=0.42)
    kx = 0.25
    rbox(0.13, 0.13, 0.08, 0.03, p['char'], (kx, 0.52, Z1 - 0.02))
    cyl(0.04, 0.2, p['orange'], (kx, 0.52, Z1 + 0.05), bev=0.012)
    tube([(kx, 0.52, Z1 + 0.24), (kx, 1.2, Z1 + 0.24)], 0.032, p['orange'])
    rbox(0.08, 0.08, 0.06, 0.02, p['char'], (kx, 1.2, Z1 + 0.18))
    tube([(kx, 1.2, Z1 + 0.18), (kx, 1.2, 0.36)], 0.008, p['char'])
    container(p, (kx, 1.2), 0.0, 0.4, 0.34, 0.32)
    container(p, (-0.45, 1.15), -0.1, 0.4, 0.34, 0.32, eye=False)

def join_all():
    """one mesh with a part per material, so the file stays light (npx gltf-transform is not needed)"""
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()

def export_light(path):
    """like kb.export, without texture coordinates (nothing here has a texture) and with positions to about a millimetre"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, use_selection=False,
                              export_texcoords=False, export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=7, export_draco_position_quantization=12)

IDEAS = [('ark-a', ark_a), ('ark-b', ark_b)]
for name, fn in IDEAS:
    if ONLY_IDEAS and name not in ONLY_IDEAS: continue
    reset(); p = pal(); fn(p); join_all(); export_light(f'{OUTDIR}/{name}.glb'); print('built', name)
