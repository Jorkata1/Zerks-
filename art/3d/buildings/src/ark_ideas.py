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
#   A  the ship that stands: it landed upright on four legs, like a lander. The pods are on two decks of glass rings,
#      a lift takes people down, a crane on the other side lowers the containers, two radiators stand out to the sides;
#      the drone has a balcony with a small hatch high on the hull. Made bigger and plainly a rescue ship (Joro):
#      the orange top of a lifeboat with reflective tape and a beacon, searchlights round the bridge, about 21 m high.
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

# the shared parts (pod, hatch, container, drone_at, pad, cone, radiator, deck, join_all, export_light) live in build.py with the Ark

# ======================================================================================
# A: the ship that stands (Joro liked it, 06.11.2026, and wants it bigger and plainly a rescue ship)
#    It is wider and has two pod decks, so it stands about 21 m high. What makes it read as a rescue ship: the orange
#    top, like the canopy of a lifeboat, the beacon on it, the searchlights that light the ground round it, and the
#    many pods. On the two decks you see 24 pods; at level 10 ten people are awake (ten pods open) and the eleventh
#    pod has power (it glows), the other 13 are still dark, as docs/levels.md has it.
# ======================================================================================
def ark_a(p):
    R = 0.8
    Z_SKIRT, Z_HULL, Z_D1, Z_MID, Z_D2, Z_UP, Z_NOSE = 0.5, 0.85, 2.0, 2.65, 2.85, 3.5, 4.1
    beacon = mat('beacon', '#ff6a3a', 0.3, emit='#ff4a1a', strength=3.0)
    # the engines under the skirt, the skirt (dark: the base of the ship), four landing legs between the doors
    for a in (0, 90, 180, 270):
        cone(0.15, 0.08, 0.28, p['char'], (math.cos(D2R(a)) * 0.34, math.sin(D2R(a)) * 0.34, 0.36))
    cone(0.66, R + 0.015, Z_HULL - Z_SKIRT + 0.02, p['char'], (0, 0, (Z_SKIRT + Z_HULL + 0.02) / 2), verts=72)
    for a in (45, 135, 225, 315):
        c, s_ = math.cos(D2R(a)), math.sin(D2R(a))
        top, foot = Vector((c * 0.72, s_ * 0.72, 0.68)), Vector((c * 1.15, s_ * 1.15, 0.1))
        tube([tuple(top), tuple(foot)], 0.05, p['char'])
        tube([tuple(top.lerp(foot, 0.33)), tuple(top.lerp(foot, 0.6))], 0.068, p['orange'])
        ball(0.07, p['char'], tuple(foot), seg=14)
        cyl(0.15, 0.06, p['char'], (foot.x, foot.y, 0.0), bev=0.025)
    # the lower hull: the reactor, the airlock and the hold
    cyl(R, Z_D1 - Z_HULL, p['cream'], (0, 0, Z_HULL), bev=0.04, verts=72)
    cyl(R + 0.012, 0.06, p['orange'], (0, 0, 1.86), bev=0.012, verts=72)
    door(p, 0.0, -R + 0.01, 0.0, w=0.34, h=0.56, z=0.92)
    rbox(0.4, 0.1, 0.03, 0.01, p['char'], (0.0, -R - 0.04, 0.89))
    hatch(p, R - 0.01, 0.0, math.pi / 2, w=0.44, h=0.5, z=0.92)
    for a in (300, 330, 120, 150, 60, 200, 250, 20):
        c, s_ = math.cos(D2R(a)), math.sin(D2R(a))
        porthole(p, (c * R, s_ * R, 1.62), (c, s_), r=0.06)
    # the lift: two rails up the hull, the cage down on the ground, the hoist on top
    for sx in (-1, 1):
        cyl(0.028, 1.72, p['char'], (sx * 0.27, -R - 0.09, 0.0), bev=0.01)
        for zb in (1.0, 1.55):
            rbox(0.045, 0.17, 0.045, 0.015, p['char'], (sx * 0.27, -R - 0.03, zb), seg=2)
    rbox(0.64, 0.13, 0.11, 0.03, p['char'], (0.0, -R - 0.1, 1.68))
    light(p, (0.0, -R - 0.17, 1.75), 0.024)
    rbox(0.5, 0.4, 0.045, 0.02, p['cream2'], (0.0, -R - 0.31, 0.0), seg=2)
    for sx in (-1, 1):
        side = sx * 0.23
        tube([(side, -R - 0.13, 0.33), (side, -R - 0.49, 0.33), (sx * 0.09, -R - 0.49, 0.33)], 0.015, p['orange'])
        for py in (-R - 0.13, -R - 0.49):
            cyl(0.013, 0.29, p['char'], (side, py, 0.045), bev=0.004)
    # the radiators of the reactor, out to the two sides
    for a in (45, 225):
        radiator(p, D2R(a), 0.94, 1.42, 1.0, 1.85, [(1.1, 0.96), (1.6, 0.96)])
    # the crane over the cargo hatch, a container on its hook, another one set down beside it
    rbox(0.15, 0.15, 0.11, 0.03, p['char'], (R + 0.02, 0.0, 1.58))
    tube([(R + 0.06, 0.0, 1.64), (1.08, 0.0, 1.88), (1.5, 0.0, 1.88)], 0.038, p['orange'])
    rbox(0.09, 0.09, 0.06, 0.02, p['char'], (1.5, 0.0, 1.82))
    tube([(1.5, 0.0, 1.82), (1.5, 0.0, 0.38)], 0.009, p['char'])
    container(p, (1.5, 0.0), 0.0, 0.4, 0.36, 0.34)
    container(p, (1.44, 0.56), 0.12, 0.4, 0.36, 0.34, eye=False)
    # two pod decks with a ring of hull between them: 24 pods you can see, 10 open, 1 with power, 13 dark
    deck(p, R, Z_D1, Z_MID, ['open', 'open', 'dark', 'dark', 'open', 'dark', 'open', 'open', 'open', 'open', 'open', 'sleep'])
    cyl(R, Z_D2 - Z_MID, p['cream'], (0, 0, Z_MID), bev=0.0, verts=72)
    deck(p, R, Z_D2, Z_UP, ['dark', 'dark', 'dark', 'open', 'dark', 'dark', 'dark', 'dark', 'dark', 'dark', 'open', 'dark'])
    # the upper hull: the bridge with its round windows, the searchlights that light the ground round the ship
    cyl(R, Z_NOSE - Z_UP, p['cream'], (0, 0, Z_UP), bev=0.0, verts=72)
    for k in range(8):
        a = D2R(k * 45); c, s_ = math.cos(a), math.sin(a)
        if k == 5: continue                      # the drone's hatch is here
        porthole(p, (c * R, s_ * R, 3.76), (c, s_), r=0.07)
    for a in (22.5, 112.5, 202.5, 292.5):
        # a searchlight on a short arm, tilted down to light the ground round the ship
        ar = D2R(a); c, s_ = math.cos(ar), math.sin(ar)
        tube([(c * (R - 0.01), s_ * (R - 0.01), 4.0), (c * (R + 0.08), s_ * (R + 0.08), 4.0)], 0.018, p['char'])
        tilt = D2R(35)
        d = Vector((c * math.cos(tilt), s_ * math.cos(tilt), -math.sin(tilt)))
        q = d.to_track_quat('Z', 'Y').to_euler()
        hc = Vector((c * (R + 0.13), s_ * (R + 0.13), 3.97))
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.06, depth=0.12, location=tuple(hc), rotation=q)
        _done(bpy.context.object, p['cream2'])
        bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.012, major_segments=24, minor_segments=8, location=tuple(hc + d * 0.06), rotation=q)
        _done(bpy.context.object, p['orange'])
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.05, depth=0.01, location=tuple(hc + d * 0.062), rotation=q)
        _done(bpy.context.object, p['lampw'])
    # the orange top, like the canopy of a lifeboat, with the beacon and the antenna
    dome(R, p['orange'], (0, 0, Z_NOSE), seg=56, sz=0.95)
    torus(R + 0.004, 0.03, p['char'], (0, 0, Z_NOSE + 0.01))
    tape = mat('reflective', '#ffffff', 0.25)
    for k in range(8):
        az, el = D2R(k * 45 + 22.5), D2R(38)
        n = Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)))
        pt = Vector((n.x * R, n.y * R, Z_NOSE + n.z * R * 0.95))
        q = n.to_track_quat('Z', 'Y').to_euler()
        rbox(0.07, 0.17, 0.014, 0.006, tape, tuple(pt - n * 0.004), tuple(q), seg=1)
    TOPZ = Z_NOSE + R * 0.95
    cyl(0.1, 0.05, p['cream2'], (0, 0, TOPZ - 0.03), bev=0.02)
    ball(0.045, beacon, (0, 0, TOPZ + 0.07), seg=16)
    dome(0.07, p['glass'], (0, 0, TOPZ + 0.02), seg=20, sz=1.3)
    mx, my = math.cos(D2R(150)) * 0.5, math.sin(D2R(150)) * 0.5
    mz = Z_NOSE + R * 0.95 * math.sqrt(1 - (0.5 / R) ** 2)
    cyl(0.013, 0.38, p['char'], (mx, my, mz - 0.03), bev=0.004)
    light(p, (mx, my, mz + 0.36), 0.022)
    # the drone's balcony on the upper hull, with the small hatch it goes in by (for paste and charge)
    a = D2R(225); c, s_ = math.cos(a), math.sin(a)
    rbox(0.36, 0.13, 0.06, 0.02, p['char'], (c * (R + 0.1), s_ * (R + 0.1), 3.56), (0, 0, a), seg=2)
    pad(p, (c * (R + 0.3), s_ * (R + 0.3), 3.6), 0.28)
    drone_at(p, (c * (R + 0.3), s_ * (R + 0.3), 3.645), 0.75)
    door(p, c * (R - 0.01), s_ * (R - 0.01), a + math.pi / 2, w=0.22, h=0.24, z=3.68)

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

IDEAS = [('ark-a', ark_a), ('ark-b', ark_b)]
for name, fn in IDEAS:
    if ONLY_IDEAS and name not in ONLY_IDEAS: continue
    reset(); p = pal(); fn(p); join_all(); export_light(f'{OUTDIR}/{name}.glb'); print('built', name)
