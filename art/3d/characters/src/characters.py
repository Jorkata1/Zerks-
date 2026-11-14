# Zerks-X6 characters: three ideas for the people in suits (the Commander and the colonists) and three for ECHO,
# in the look of the buildings (art/3d/buildings/README.md): cream soft bodies, an orange band, charcoal feet,
# teal lights, clear glass with something behind it. Asked by Joro on 14.11.2026.
#   python characters.py -- <out_dir> [names]        (needs bpy 5.x; the helpers come from ../../buildings/src)
# Units are metres: a person is about 1.7 m, ECHO about half a metre. They look along -y, like the doors.
# Every figure is a root with five children, each with its origin at the joint, so the game swings them:
#   body, arm_l, arm_r, leg_l, leg_r   (ECHO: body and one node per rotor)
import sys, os, math
from contextlib import contextmanager
HERE = os.path.dirname(os.path.abspath(__file__))
BSRC = os.path.normpath(os.path.join(HERE, '..', '..', 'buildings', 'src'))
ARGS = sys.argv[sys.argv.index('--') + 1:]
OUTDIR = ARGS[0]
PICK = ARGS[1].split(',') if len(ARGS) > 1 else None   # build.py below has its own ONLY
sys.path.insert(0, BSRC)
src = open(os.path.join(BSRC, 'build.py')).read()
src = src[:src.index('BUILD = {')]
sys.argv = [sys.argv[0], '--', OUTDIR]
exec(compile(src, 'build.py', 'exec'))
from mathutils import Vector

# ---------- small helpers ----------
def capsule(r, a, b, m, verts=20, seg=5):
    """a soft limb from a to b (the centres of its round ends)"""
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length + 2 * r, location=(a + b) / 2)
    o = bpy.context.object
    bv = o.modifiers.new('b', 'BEVEL'); bv.width = r * 0.97; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
    _apply(o)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return _done(o, m)

def ring(R, r, m, loc, rot=(0, 0, 0), seg=28, mseg=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=mseg, location=loc, rotation=rot)
    return _done(bpy.context.object, m)

def rprism(w, d, h, r, m, loc=(0, 0, 0), soft=0.008, seg=6):
    """a band or plate with a rounded outline seen from above (a belt around a rounded body)"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], loc[2] + h / 2))
    o = bpy.context.object; o.scale = (w, d, h); bpy.ops.object.transform_apply(scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    ed = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > h * 0.5]
    bmesh.ops.bevel(bm, geom=ed, offset=min(r, w / 2.02, d / 2.02), segments=seg, affect='EDGES', profile=0.5)
    bm.to_mesh(o.data); bm.free()
    if soft:
        bv = o.modifiers.new('b', 'BEVEL'); bv.width = min(soft, h / 2.2); bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(50)
        _apply(o)
    return _done(o, m)

def patch(R, m, centre, th, ph, n=3.0, proud=0.006, up=0.0, side=0.0, sz=1.0, thick=0.012, rings=6, segs=40):
    """a visor (or an eye) lying on a round head of radius R: a rounded outline that reaches th radians to each side
    and ph up and down, standing `proud` of the surface; up and side move its middle; sz is the head's z scale"""
    def pt(a, b):
        a += side; b += up
        return (centre[0] + (R + proud) * math.cos(b) * math.sin(a), centre[1] - (R + proud) * math.cos(b) * math.cos(a),
                centre[2] + (R + proud) * math.sin(b) * sz)
    verts, faces = [pt(0, 0)], []
    for i in range(1, rings + 1):
        for k in range(segs):
            al = 2 * math.pi * k / segs; ca, sa = math.cos(al), math.sin(al)
            q = (abs(ca) ** n + abs(sa) ** n) ** (-1 / n) * i / rings
            verts.append(pt(q * ca * th, q * sa * ph))
    for k in range(segs): faces.append((0, 1 + k, 1 + (k + 1) % segs))
    for i in range(1, rings):
        a0, a1 = 1 + (i - 1) * segs, 1 + i * segs
        for k in range(segs): faces.append((a0 + k, a1 + k, a1 + (k + 1) % segs, a0 + (k + 1) % segs))
    me = bpy.data.meshes.new('patch'); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new('patch', me); bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    sd = o.modifiers.new('s', 'SOLIDIFY'); sd.thickness = thick; sd.offset = -1
    _apply(o)
    return _done(o, m)

def visor_on(R, rim, glass, centre, th, ph, n=3.0, up=0.0, sz=1.0, rings=6, segs=40):
    """a visor on a round head with a thin rim around it"""
    patch(R, rim, centre, th + 0.07, ph + 0.07, n, 0.003, up, 0.0, sz, rings=rings, segs=segs)
    return patch(R, glass, centre, th, ph, n, 0.008, up, 0.0, sz, rings=rings, segs=segs)

def stripe_over(R, half_w, t, m, centre, test, seg=40):
    """a flat band over a round helmet, from front to back over the top; test(forward, up) keeps part of it"""
    o = ring(R, t, m, centre, (0, math.pi / 2, 0), seg=seg, mseg=6 if seg > 30 else 4)
    keep(o, lambda c: test(-c.y, -c.x))
    o.scale = (1, 1, half_w / t)
    return o

def keep(o, test):
    """keep only the part of a mesh where test(vertex) is true (in the object's own coordinates)"""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not test(v.co)], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    return o

def rotor(p, at, R, blades=3, m=None, verts=14, seg=2):
    """a hub and flat blades with a little pitch; its own node, so the game spins it"""
    m = m or p['char']
    cyl(R * 0.16, R * 0.16, m, (at[0], at[1], at[2] - R * 0.08), bev=R * 0.03, verts=verts, seg=seg)
    for k in range(blades):
        a = k * 2 * math.pi / blades
        rbox(R * 0.86, R * 0.26, R * 0.035, R * 0.012, m, (at[0] + math.cos(a) * R * 0.52, at[1] + math.sin(a) * R * 0.52, at[2] - R * 0.0175), (0.22, 0, a), seg=seg)

@contextmanager
def part(fig, name):
    before = set(bpy.data.objects)
    yield
    fig.setdefault(name, []).extend(o for o in bpy.data.objects if o not in before)

def finish(fig, name, pivots, at=(0, 0), rz=0.0, pose=None, lift=0.0, on_body=()):
    """join each part into one mesh with its origin at the joint, hang them on a root, pose and place the root"""
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root); made = {}
    for g, objs in fig.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if len(objs) > 1: bpy.ops.object.join()
        o = bpy.context.object; o.name = g; o.data.name = g
        bpy.context.scene.cursor.location = pivots.get(g, (0, 0, 0)); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        o.parent = root; made[g] = o
        if pose and g in pose: o.rotation_euler = [math.radians(a) for a in pose[g]]
    for g, o in made.items():
        if g in on_body: o.parent = made['body']
    root.location = (at[0], at[1], lift); root.rotation_euler = (0, 0, rz)
    return root

def extra():
    return dict(
        suitglass=mat('suitglass', '#dff7f4', 0.04, alpha=0.3), gold=mat('goldvisor', '#f0b43c', 0.18), visor=mat('darkvisor', '#1e2440', 0.15),
        eye=mat('eye', '#2a2220', 0.5), lens=mat('lens', '#10131f', 0.1))
def acc(c): return mat('accent-' + c, c, 0.55)
def skin(c): return mat('skin-' + c, c, 0.75)
def hair(c): return mat('hair-' + c, c, 0.85)

# who is who: the profession colour, the skin, the hair and the hair style of the face behind the glass (idea A)
CREW = [
    ('commander', '#ef7433', '#eebf98', '#4a3326', 0),
    ('cook', '#ffc65c', '#f6d3b3', '#b5651d', 1),
    ('agronomist', '#4fc06a', '#a8704a', '#1f1b1a', 2),
    ('geologist', '#9a7cff', '#d99a6c', '#2a211d', 3),
    ('engineer', '#5aa9ff', '#f2c6a0', '#d9a84a', 0),
]

# =====================================================================================================
# Idea A: the glass helmet. A big clear bubble with the person's face behind it (the buildings show what is
# inside their glass, so does the suit); short and soft, the profession colour on the shoulders and the pack.
# =====================================================================================================
A_PIV = dict(body=(0, 0, 0), arm_l=(0.31, 0, 0.95), arm_r=(-0.31, 0, 0.95), leg_l=(0.13, 0, 0.5), leg_r=(-0.13, 0, 0.5))
def astro_a(p, who):
    name, colour, sk, hr, style = who
    x = extra(); a = acc(colour); fig = {}
    commander = name == 'commander'
    for side, s in (('l', 1), ('r', -1)):
        with part(fig, 'leg_' + side):
            capsule(0.1, (s * 0.13, 0, 0.2), (s * 0.13, 0, 0.46), p['cream'])
            rbox(0.21, 0.31, 0.15, 0.07, p['char'], (s * 0.13, -0.035, 0.0))
            ring(0.103, 0.024, p['orange'], (s * 0.13, 0, 0.175))
        with part(fig, 'arm_' + side):
            capsule(0.08, (s * 0.33, 0, 0.9), (s * 0.33, 0, 0.62), p['cream'])
            ball(0.105, a, (s * 0.325, 0, 0.955), (1, 1, 0.85), seg=18)                 # the shoulder, in the profession colour
            ring(0.082, 0.02, p['orange'], (s * 0.33, 0, 0.6))
            ball(0.092, p['char'], (s * 0.33, 0, 0.53), seg=16)                          # the glove
    with part(fig, 'body'):
        rbox(0.5, 0.36, 0.6, 0.17, p['cream'], (0, 0, 0.44), seg=5)
        rprism(0.512, 0.372, 0.05, 0.176, p['orange'], (0, 0, 0.63))
        # the chest panel: a light and the button in the profession colour
        rbox(0.2, 0.05, 0.12, 0.03, p['char'], (0, -0.172, 0.77))
        ball(0.022, p['teal'], (-0.05, -0.2, 0.845), seg=10)
        ball(0.024, a, (0.045, -0.2, 0.805), seg=10)
        rbox(0.07, 0.012, 0.022, 0.006, p['cream2'], (0.04, -0.199, 0.855))
        # the life support on the back: the air goes to the collar through two hoses
        rbox(0.36, 0.19, 0.06, 0.03, p['char'], (0, 0.27, 0.47))
        rbox(0.38, 0.2, 0.5, 0.08, p['cream2'], (0, 0.27, 0.5))
        rprism(0.39, 0.21, 0.06, 0.085, a, (0, 0.27, 0.86))
        cyl(0.04, 0.05, p['cream'], (0.09, 0.28, 0.99), bev=0.012, verts=14)
        ball(0.055, p['char'], (0.09, 0.28, 1.05), (1, 1, 0.55), seg=12)
        ball(0.024, p['teal'], (-0.1, 0.372, 0.74), seg=10)
        for s in (1, -1):
            tube([(s * 0.12, 0.3, 0.97), (s * 0.15, 0.3, 1.06), (s * 0.16, 0.2, 1.1), (s * 0.15, 0.1, 1.07)], 0.02, p['char'])
        # the collar and the clear helmet; the back half is a cream shell with the lamp
        cyl(0.215, 0.07, p['cream2'], (0, 0, 1.0), bev=0.02, verts=28)
        ring(0.215, 0.03, p['orange'], (0, 0, 1.065))
        shell = keep(ball(0.337, p['cream'], (0, 0, 1.36), seg=28), lambda c: c.y > 0.03)
        if commander:   # the Commander's stripe over the helmet, as on the Apollo commanders' suits
            stripe_over(0.347, 0.05, 0.008, p['orange'], (0, 0, 1.36), lambda fwd, up: fwd < -0.05)
        ball(0.028, p['teal'], (0, 0.18, 1.655), seg=10)
        # the face: head, hair, eyes, the earphones of the radio cap
        ball(0.2, skin(sk), (0, -0.01, 1.3), (1, 0.95, 1.05), seg=22)
        h = dome(0.214, hair(hr), (0, 0.012, 1.33), seg=22, sz=0.95); h.rotation_euler = (-0.5, 0, 0)
        if style == 1: ball(0.075, hair(hr), (0, 0.13, 1.53), seg=14)                     # a bun
        if style == 2: ball(0.215, hair(hr), (0, 0.03, 1.36), (1.04, 0.9, 0.9), seg=18)   # fuller hair
        if style == 3: ball(0.105, hair(hr), (0, -0.14, 1.2), (1.25, 0.6, 0.75), seg=14)  # a beard
        for s in (1, -1):
            ball(0.024, x['eye'], (s * 0.07, -0.192, 1.315), seg=10)
            hcyl(0.05, 0.035, p['char'], (s * 0.2, 0.0, 1.3), 'x', bev=0.01)
        ball(0.33, x['suitglass'], (0, 0, 1.36), seg=28)
        if commander:   # a whip aerial on the pack
            cyl(0.008, 0.34, p['char'], (-0.14, 0.3, 1.0), bev=0.0, verts=8)
            ball(0.022, p['teal'], (-0.14, 0.3, 1.35), seg=10)
    return fig, A_PIV

# =====================================================================================================
# Idea B: the classic suit. Real proportions, a white helmet with a gold sun visor, the life support pack
# with its aerial; the profession is a coloured stripe on the arms, the legs and over the helmet.
# =====================================================================================================
B_PIV = dict(body=(0, 0, 0), arm_l=(0.3, 0, 1.34), arm_r=(-0.3, 0, 1.34), leg_l=(0.105, 0, 0.86), leg_r=(-0.105, 0, 0.86))
def astro_b(p, who):
    name, colour, sk, hr, style = who
    x = extra(); a = acc(colour); fig = {}
    commander = name == 'commander'
    for side, s in (('l', 1), ('r', -1)):
        with part(fig, 'leg_' + side):
            capsule(0.082, (s * 0.105, 0, 0.2), (s * 0.105, 0, 0.8), p['cream'])
            rbox(0.16, 0.29, 0.13, 0.055, p['char'], (s * 0.105, -0.04, 0.0))
            ring(0.085, 0.02, p['cream2'], (s * 0.105, 0, 0.49))
            cyl(0.087, 0.05, a, (s * 0.105, 0, 0.64), bev=0.008, verts=20)
            ring(0.085, 0.018, p['orange'], (s * 0.105, 0, 0.16))
        with part(fig, 'arm_' + side):
            capsule(0.07, (s * 0.3, 0, 1.32), (s * 0.3, 0, 0.82), p['cream'])
            ball(0.09, p['cream'], (s * 0.295, 0, 1.35), seg=16)
            cyl(0.075, 0.05, a, (s * 0.3, 0, 1.14), bev=0.008, verts=20)
            ring(0.072, 0.018, p['cream2'], (s * 0.3, 0, 1.03))
            ring(0.072, 0.018, p['orange'], (s * 0.3, 0, 0.8))
            ball(0.078, p['char'], (s * 0.3, 0, 0.73), seg=14)
    with part(fig, 'body'):
        rbox(0.44, 0.28, 0.66, 0.12, p['cream'], (0, 0, 0.78), seg=5)
        rprism(0.452, 0.292, 0.045, 0.126, p['orange'], (0, 0, 0.93))
        # the control unit on the chest
        rbox(0.24, 0.09, 0.17, 0.035, p['cream2'], (0, -0.165, 1.1))
        ball(0.02, p['teal'], (-0.07, -0.213, 1.22), seg=10)
        hcyl(0.024, 0.03, p['orange'], (0.06, -0.215, 1.15), 'y', bev=0.006)
        hcyl(0.02, 0.03, p['char'], (-0.01, -0.215, 1.15), 'y', bev=0.006)
        rbox(0.1, 0.012, 0.035, 0.005, a, (0.045, -0.211, 1.205))
        # the life support pack with the aerial
        rbox(0.38, 0.2, 0.06, 0.03, p['char'], (0, 0.235, 0.81))
        rbox(0.4, 0.21, 0.66, 0.07, p['cream'], (0, 0.235, 0.84))
        rprism(0.41, 0.22, 0.04, 0.075, p['orange'], (0, 0.235, 1.3))
        rbox(0.16, 0.014, 0.1, 0.02, a, (0, 0.338, 1.08))
        ball(0.022, p['teal'], (0.12, 0.342, 0.95), seg=10); ball(0.022, p['teal'], (-0.12, 0.342, 0.95), seg=10)
        cyl(0.008, 0.26, p['char'], (0.14, 0.26, 1.48), bev=0.0, verts=8)
        ball(0.02, p['teal'], (0.14, 0.26, 1.75), seg=10)
        for s in (1, -1):
            tube([(s * 0.13, 0.26, 1.46), (s * 0.15, 0.24, 1.53), (s * 0.14, 0.12, 1.5)], 0.018, p['char'])
        # the neck ring, the helmet and the gold visor
        cyl(0.15, 0.06, p['cream2'], (0, 0, 1.41), bev=0.018, verts=24)
        ball(0.205, p['cream'], (0, 0, 1.625), seg=26)
        visor_on(0.205, p['char'], x['gold'], (0, 0, 1.625), 0.98, 0.6, 2.6, up=0.08)
        # the stripe over the helmet: one for a colonist, two for the Commander
        for dx in ((-0.04, 0.04) if commander else (0.0,)):
            stripe_over(0.207, 0.024, 0.008, a, (dx, 0, 1.625), lambda fwd, up: up > 0.162 or (fwd < 0 and up > -0.17))
    return fig, B_PIV

# =====================================================================================================
# Idea C: the work suit. A hard rounded shell like the buildings, with a dark base (the legs), the orange
# band, a wide dark visor with the teal line of its display, a helmet lamp and two air tanks with charge
# strips like the batteries; the profession is the colour of the hard hat.
# =====================================================================================================
C_PIV = dict(body=(0, 0, 0), arm_l=(0.37, 0, 0.9), arm_r=(-0.37, 0, 0.9), leg_l=(0.14, 0, 0.48), leg_r=(-0.14, 0, 0.48))
def astro_c(p, who):
    name, colour, sk, hr, style = who
    x = extra(); a = acc(colour); fig = {}
    commander = name == 'commander'
    for side, s in (('l', 1), ('r', -1)):
        with part(fig, 'leg_' + side):
            capsule(0.1, (s * 0.14, 0, 0.18), (s * 0.14, 0, 0.44), p['char'])
            rbox(0.22, 0.32, 0.14, 0.07, p['char'], (s * 0.14, -0.04, 0.0))
            ring(0.103, 0.022, p['orange'], (s * 0.14, 0, 0.17))
        with part(fig, 'arm_' + side):
            capsule(0.09, (s * 0.385, 0, 0.86), (s * 0.385, 0, 0.58), p['cream'])
            ring(0.092, 0.02, p['orange'], (s * 0.385, 0, 0.56))
            ball(0.102, p['char'], (s * 0.385, 0, 0.48), seg=16)
    with part(fig, 'body'):
        rbox(0.58, 0.42, 0.56, 0.2, p['cream'], (0, 0, 0.42), seg=6)
        rprism(0.592, 0.432, 0.045, 0.206, p['orange'], (0, 0, 0.655))
        # the gauge on the chest
        hcyl(0.07, 0.035, p['char'], (0, -0.2, 0.82), 'y', bev=0.01)
        hcyl(0.045, 0.02, p['teal'], (0, -0.214, 0.82), 'y', bev=0.006)
        rbox(0.09, 0.012, 0.03, 0.006, a, (0.15, -0.203, 0.835))
        # two air tanks on a bracket, with charge strips; a mushroom vent between them
        rbox(0.34, 0.08, 0.3, 0.03, p['char'], (0, 0.225, 0.52))
        for s in (1, -1):
            cyl(0.088, 0.5, p['cream2'], (s * 0.105, 0.31, 0.42), bev=0.07, verts=20)
            cyl(0.06, 0.035, a, (s * 0.105, 0.31, 0.915), bev=0.01, verts=16)
            rbox(0.03, 0.014, 0.28, 0.006, p['teal'], (s * 0.105, 0.396, 0.52))
            tube([(s * 0.105, 0.31, 0.94), (s * 0.12, 0.3, 1.0), (s * 0.13, 0.22, 1.02)], 0.018, p['char'])
        # the helmet: a rounded shell, the wide visor, the display line, the lamp, the hard hat
        cyl(0.2, 0.06, p['char'], (0, 0, 0.955), bev=0.015, verts=24)
        rbox(0.56, 0.46, 0.46, 0.2, p['cream'], (0, 0, 0.99), seg=6)
        rbox(0.44, 0.1, 0.2, 0.085, x['visor'], (0, -0.19, 1.13))
        rbox(0.3, 0.014, 0.018, 0.006, p['teal'], (0, -0.238, 1.165))
        rprism(0.44, 0.34, 0.05, 0.15, a, (0, 0.0, 1.43))
        hcyl(0.045, 0.06, p['char'], (0, -0.2, 1.385), 'y', bev=0.012)
        hcyl(0.032, 0.02, p['lampw'], (0, -0.232, 1.385), 'y', bev=0.006)
        for s in (1, -1): hcyl(0.06, 0.03, p['cream2'], (s * 0.285, 0.0, 1.2), 'x', bev=0.012)
        if commander:
            cyl(0.008, 0.3, p['char'], (-0.2, 0.12, 1.44), bev=0.0, verts=8)
            ball(0.022, p['teal'], (-0.2, 0.12, 1.75), seg=10)
    return fig, C_PIV

ASTRO = dict(a=astro_a, b=astro_b, c=astro_c)

def crew(p, idea, lift=0.0):
    """the Commander and the first four colonists of level 3, in a loose row: one waves, two walk"""
    spots = [(0.0, -0.45, 0.0), (-0.95, 0.0, 0.22), (0.95, 0.05, -0.22), (-1.9, 0.4, 0.35), (1.9, 0.45, -0.35)]
    poses = [dict(arm_r=(0, 152, 0)), None,
             dict(leg_l=(-24, 0, 0), leg_r=(24, 0, 0), arm_l=(20, 0, 0), arm_r=(-20, 0, 0)),
             dict(arm_l=(-35, 0, 0)), dict(leg_l=(22, 0, 0), leg_r=(-22, 0, 0), arm_l=(-18, 0, 0), arm_r=(18, 0, 0))]
    for who, (px, py, rz), pose in zip(CREW, spots, poses):
        fig, piv = ASTRO[idea](p, who)
        finish(fig, who[0], piv, (px, py), rz, pose)

# =====================================================================================================
# ECHO: the ship's AI in a small flying body. The air is thin (7%), so it flies as the construction drone
# does, on rotors in rings, wide for its size. The face is the one on its button: a cream head, a dark visor,
# teal eyes, an orange light on the aerial. Under the chin is the lamp it points with.
# =====================================================================================================
def echo_1(p):
    """the ball: a round head over one wide ringed rotor"""
    x = extra(); fig = {}
    with part(fig, 'body'):
        ball(0.2, p['cream'], (0, 0, 0.36), seg=26)
        ring(0.19, 0.013, p['orange'], (0, 0, 0.29), seg=32, mseg=6)
        visor_on(0.2, p['cream2'], x['visor'], (0, 0, 0.36), 0.95, 0.4, 3.0, up=0.12)
        patch(0.2, p['teal'], (0, 0, 0.36), 0.4, 0.085, 4.0, 0.014, up=0.12)             # one bar for an eye, as on the button
        cyl(0.008, 0.12, p['char'], (0, 0, 0.55), bev=0.0, verts=8)
        ball(0.026, mat('beacon', '#ff7a2e', 0.4, emit='#ff5a10', strength=0.9), (0, 0, 0.685), seg=10)
        hcyl(0.03, 0.04, p['char'], (0, -0.17, 0.235), 'y', bev=0.008)
        hcyl(0.02, 0.02, p['lampw'], (0, -0.195, 0.235), 'y', bev=0.005)
        # the ring of the rotor under the head, on three struts, with three feet
        ring(0.19, 0.03, p['char'], (0, 0, 0.09), seg=32)
        ring(0.19, 0.012, p['orange'], (0, 0, 0.122), seg=32, mseg=6)
        for k in range(3):
            a = math.radians(90 + k * 120)
            tube([(math.cos(a) * 0.19, math.sin(a) * 0.19, 0.1), (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.2)], 0.014, p['cream2'])
            ball(0.028, p['char'], (math.cos(a) * 0.19, math.sin(a) * 0.19, 0.035), seg=10)
    with part(fig, 'rotor'):
        rotor(p, (0, 0, 0.1), 0.165)
    return fig, dict(body=(0, 0, 0), rotor=(0, 0, 0.1))

def echo_2(p):
    """the two fans: an egg of a body between two ringed rotors on short arms"""
    x = extra(); fig = {}
    with part(fig, 'body'):
        ball(0.19, p['cream'], (0, 0, 0.3), (1, 1, 1.12), seg=26)
        keep(ball(0.194, p['char'], (0, 0, 0.3), (1, 1, 1.12), seg=26), lambda c: c.z < -0.125)
        ring(0.168, 0.012, p['orange'], (0, 0, 0.195), seg=32, mseg=6)
        visor_on(0.19, p['cream2'], x['visor'], (0, 0, 0.3), 0.95, 0.46, 3.0, up=0.14, sz=1.12)
        for s in (1, -1): patch(0.19, p['teal'], (0, 0, 0.3), 0.13, 0.2, 2.0, 0.014, up=0.14, side=s * 0.33, sz=1.12)     # two eyes
        cyl(0.008, 0.11, p['char'], (0, 0, 0.5), bev=0.0, verts=8)
        ball(0.026, mat('beacon', '#ff7a2e', 0.4, emit='#ff5a10', strength=0.9), (0, 0, 0.625), seg=10)
        ball(0.04, p['char'], (0, -0.1, 0.105), seg=12)                                    # the pointing lamp on its ball joint
        hcyl(0.022, 0.03, p['lampw'], (0, -0.132, 0.095), 'y', bev=0.005)
        for s in (1, -1):
            tube([(s * 0.16, 0, 0.3), (s * 0.24, 0, 0.3)], 0.026, p['cream2'])
            ring(0.135, 0.028, p['cream'], (s * 0.36, 0, 0.3), seg=30)
            ring(0.137, 0.012, p['orange'], (s * 0.36, 0, 0.325), seg=30, mseg=6)
            hcyl(0.012, 0.25, p['char'], (s * 0.36, 0, 0.292), 'y', bev=0.0)
        for s in (1, -1): ball(0.03, p['char'], (s * 0.08, 0.02, 0.03), seg=10)
        ball(0.03, p['char'], (0, -0.09, 0.03), seg=10)
        for (fx, fy) in ((0.08, 0.02), (-0.08, 0.02), (0, -0.09)):
            tube([(fx, fy, 0.04), (fx * 0.8, fy * 0.8, 0.12)], 0.012, p['char'])
    for side, s in (('l', 1), ('r', -1)):
        with part(fig, 'rotor_' + side):
            rotor(p, (s * 0.36, 0, 0.3), 0.118)
    return fig, dict(body=(0, 0, 0), rotor_l=(0.36, 0, 0.3), rotor_r=(-0.36, 0, 0.3))

def echo_3(p):
    """the little drone: the construction drone's small relative, four ringed rotors and a screen for a face"""
    x = extra(); fig = {}
    spots = [(sx * 0.215, sy * 0.2) for sx in (1, -1) for sy in (1, -1)]
    with part(fig, 'body'):
        rbox(0.32, 0.3, 0.17, 0.075, p['cream'], (0, 0, 0.1), seg=5)
        rprism(0.328, 0.308, 0.03, 0.08, p['orange'], (0, 0, 0.2))
        rbox(0.24, 0.05, 0.11, 0.035, x['visor'], (0, -0.135, 0.125))
        for s in (1, -1): rbox(0.055, 0.014, 0.028, 0.008, p['teal'], (s * 0.055, -0.163, 0.172))
        cyl(0.008, 0.1, p['char'], (0, 0.06, 0.27), bev=0.0, verts=8)
        ball(0.024, mat('beacon', '#ff7a2e', 0.4, emit='#ff5a10', strength=0.9), (0, 0.06, 0.385), seg=10)
        ball(0.045, p['char'], (0, -0.04, 0.085), seg=12)
        hcyl(0.024, 0.03, p['lampw'], (0, -0.075, 0.07), 'y', bev=0.005)
        for (rx, ry) in spots:
            tube([(rx * 0.55, ry * 0.55, 0.19), (rx, ry, 0.2)], 0.018, p['cream2'])
            ring(0.105, 0.02, p['cream'], (rx, ry, 0.21), seg=24)
            ring(0.106, 0.009, p['orange'], (rx, ry, 0.228), seg=24, mseg=6)
        for s in (1, -1):
            tube([(s * 0.1, -0.1, 0.012), (s * 0.1, 0.1, 0.012)], 0.012, p['char'])
            for fy in (-0.07, 0.07): tube([(s * 0.1, fy, 0.012), (s * 0.085, fy, 0.11)], 0.01, p['char'])
    for k, (rx, ry) in enumerate(spots):
        with part(fig, 'rotor_%d' % (k + 1)):
            rotor(p, (rx, ry, 0.215), 0.09, blades=2)
    piv = dict(body=(0, 0, 0)); piv.update({'rotor_%d' % (k + 1): (rx, ry, 0.215) for k, (rx, ry) in enumerate(spots)})
    return fig, piv

ECHO = {'1': echo_1, '2': echo_2, '3': echo_3}

# =====================================================================================================
# The chosen ones (Joro, 14.11.2026): idea A for the people and ECHO 2. Lighter than the ideas, for the phone.
# =====================================================================================================
def disc(r, length, m, centre, axis='x', verts=10, bev=0.008):
    """a short light cylinder lying along x or y"""
    o = cyl(r, length, m, (centre[0], centre[1], centre[2] - length / 2), bev=bev, verts=verts, seg=2)
    o.rotation_euler = (0, math.pi / 2, 0) if axis == 'x' else (math.pi / 2, 0, 0)
    return o

def hose(points, r, m):
    cu = bpy.data.curves.new('hose', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 1; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for i, q in enumerate(points): sp.points[i].co = (*q, 1)
    o = bpy.data.objects.new('hose', cu); bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return _done(bpy.context.object, m)

# the parts the game shows or hides: one hair style, the beard, and the Commander's stripe and aerial
HAIR = ('hair_short', 'hair_bun', 'hair_full')
OPTIONAL = HAIR + ('beard', 'stripe', 'aerial')
PERSON_PIV = dict(body=(0, 0, 0), arm_l=(0.31, 0, 0.95), arm_r=(-0.31, 0, 0.95), leg_l=(0.13, 0, 0.5), leg_r=(-0.13, 0, 0.5))

def person(p, accent='#5aa9ff', sk='#f2c6a0', hr='#4a3326', options=None):
    """The person in the suit with the glass helmet. options=None: every optional part is its own node under the body
    and the three materials are called accent, skin and hair, for the game to set (art/3d/characters/colonist.glb).
    options=a set of names: only those are built, into the body, with the colours given (the sheets)."""
    x = extra(); fig = {}
    baked = options is not None
    a = mat('accent-' + accent if baked else 'accent', accent, 0.55)
    skn = mat('skin-' + sk if baked else 'skin', sk, 0.75)
    har = mat('hair-' + hr if baked else 'hair', hr, 0.85)
    def want(n): return not baked or n in options
    def into(n): return part(fig, 'body' if baked else n)
    for side, s in (('l', 1), ('r', -1)):
        with part(fig, 'leg_' + side):
            capsule(0.1, (s * 0.13, 0, 0.2), (s * 0.13, 0, 0.46), p['cream'], verts=10, seg=3)
            rbox(0.21, 0.31, 0.15, 0.07, p['char'], (s * 0.13, -0.035, 0.0), seg=2)
            ring(0.103, 0.024, p['orange'], (s * 0.13, 0, 0.175), seg=12, mseg=4)
        with part(fig, 'arm_' + side):
            capsule(0.08, (s * 0.33, 0, 0.9), (s * 0.33, 0, 0.62), p['cream'], verts=10, seg=3)
            ball(0.105, a, (s * 0.325, 0, 0.955), (1, 1, 0.85), seg=12)
            ring(0.082, 0.02, p['orange'], (s * 0.33, 0, 0.6), seg=12, mseg=4)
            ball(0.092, p['char'], (s * 0.33, 0, 0.53), seg=10)
    with part(fig, 'body'):
        rbox(0.5, 0.36, 0.6, 0.17, p['cream'], (0, 0, 0.44), seg=3)
        rprism(0.512, 0.372, 0.05, 0.176, p['orange'], (0, 0, 0.63), seg=4)
        rbox(0.2, 0.05, 0.12, 0.03, p['char'], (0, -0.172, 0.77), seg=2)
        ball(0.022, p['teal'], (-0.05, -0.2, 0.845), seg=6)
        ball(0.024, a, (0.045, -0.2, 0.805), seg=6)
        rbox(0.07, 0.012, 0.022, 0.006, p['cream2'], (0.04, -0.199, 0.855), seg=1)
        rbox(0.36, 0.19, 0.06, 0.03, p['char'], (0, 0.27, 0.47), seg=2)
        rbox(0.38, 0.2, 0.5, 0.08, p['cream2'], (0, 0.27, 0.5), seg=3)
        rprism(0.39, 0.21, 0.06, 0.085, a, (0, 0.27, 0.86), seg=3)
        cyl(0.04, 0.05, p['cream'], (0.09, 0.28, 0.99), bev=0.012, verts=8, seg=2)
        ball(0.055, p['char'], (0.09, 0.28, 1.05), (1, 1, 0.55), seg=8)
        ball(0.024, p['teal'], (-0.1, 0.372, 0.74), seg=6)
        for s in (1, -1):
            hose([(s * 0.12, 0.3, 0.97), (s * 0.15, 0.3, 1.06), (s * 0.16, 0.2, 1.1), (s * 0.15, 0.1, 1.07)], 0.02, p['char'])
        cyl(0.215, 0.07, p['cream2'], (0, 0, 1.0), bev=0.02, verts=16, seg=2)
        ring(0.215, 0.03, p['orange'], (0, 0, 1.065), seg=16, mseg=5)
        keep(ball(0.337, p['cream'], (0, 0, 1.36), seg=20), lambda c: c.y > 0.03)
        ball(0.028, p['teal'], (0, 0.18, 1.655), seg=6)
        ball(0.2, skn, (0, -0.01, 1.3), (1, 0.95, 1.05), seg=14)
        for s in (1, -1):
            ball(0.024, x['eye'], (s * 0.07, -0.192, 1.315), seg=6)
            disc(0.05, 0.035, p['char'], (s * 0.2, 0.0, 1.3), 'x')
    def cap():
        h = dome(0.214, har, (0, 0.012, 1.33), seg=14, sz=0.95); h.rotation_euler = (-0.5, 0, 0)
    if want('hair_short'):
        with into('hair_short'): cap()
    if want('hair_bun'):
        with into('hair_bun'): cap(); ball(0.075, har, (0, 0.13, 1.53), seg=8)
    if want('hair_full'):
        with into('hair_full'): cap(); ball(0.2, har, (0, 0.075, 1.27), (1.06, 0.72, 1.0), seg=12)
    if want('beard'):
        with into('beard'): ball(0.105, har, (0, -0.14, 1.2), (1.25, 0.6, 0.75), seg=10)
    if want('stripe'):
        with into('stripe'): stripe_over(0.347, 0.05, 0.008, p['orange'], (0, 0, 1.36), lambda fwd, up: fwd < -0.05, seg=24)
    if want('aerial'):
        with into('aerial'):
            cyl(0.008, 0.34, p['char'], (-0.14, 0.3, 1.0), bev=0.0, verts=6)
            ball(0.022, p['teal'], (-0.14, 0.3, 1.35), seg=6)
    # the glass last, so it is the last piece of the body
    with part(fig, 'body'):
        ball(0.33, x['suitglass'], (0, 0, 1.36), seg=20)
    return fig, PERSON_PIV

def echo_final(p):
    """ECHO 2, lighter: the body, the two rotors and the two eyes are nodes (the eyes blink when the game squeezes them)"""
    x = extra(); fig = {}; R, C, UP, SZ = 0.19, (0, 0, 0.3), 0.14, 1.12
    with part(fig, 'body'):
        ball(R, p['cream'], C, (1, 1, SZ), seg=20)
        keep(ball(0.194, p['char'], C, (1, 1, SZ), seg=20), lambda c: c.z < -0.12)
        ring(0.168, 0.012, p['orange'], (0, 0, 0.195), seg=24, mseg=4)
        visor_on(R, p['cream2'], x['visor'], C, 0.95, 0.46, 3.0, up=UP, sz=SZ, rings=3, segs=28)
        cyl(0.008, 0.11, p['char'], (0, 0, 0.5), bev=0.0, verts=6)
        ball(0.026, mat('beacon', '#ff7a2e', 0.4, emit='#ff5a10', strength=0.9), (0, 0, 0.625), seg=8)
        ball(0.04, p['char'], (0, -0.1, 0.105), seg=8)
        disc(0.022, 0.03, p['lampw'], (0, -0.132, 0.095), 'y', verts=8, bev=0.005)
        for s in (1, -1):
            capsule(0.026, (s * 0.17, 0, 0.3), (s * 0.23, 0, 0.3), p['cream2'], verts=8, seg=2)
            ring(0.135, 0.028, p['cream'], (s * 0.36, 0, 0.3), seg=20, mseg=6)
            ring(0.137, 0.012, p['orange'], (s * 0.36, 0, 0.325), seg=20, mseg=4)
            disc(0.012, 0.25, p['char'], (s * 0.36, 0, 0.292), 'y', verts=6, bev=0.0)
        for (fx, fy) in ((0.08, 0.02), (-0.08, 0.02), (0, -0.09)):
            ball(0.03, p['char'], (fx, fy, 0.03), seg=8)
            capsule(0.012, (fx, fy, 0.04), (fx * 0.8, fy * 0.8, 0.12), p['char'], verts=6, seg=1)
    piv = dict(body=(0, 0, 0))
    for side, s in (('l', 1), ('r', -1)):
        with part(fig, 'rotor_' + side):
            rotor(p, (s * 0.36, 0, 0.3), 0.118, verts=8, seg=1)
        piv['rotor_' + side] = (s * 0.36, 0, 0.3)
        with part(fig, 'eye_' + side):
            patch(R, p['teal'], C, 0.13, 0.2, 2.0, 0.014, up=UP, side=s * 0.33, sz=SZ, rings=2, segs=14)
        piv['eye_' + side] = (C[0] + (R + 0.014) * math.cos(UP) * math.sin(s * 0.33), C[1] - (R + 0.014) * math.cos(UP) * math.cos(s * 0.33),
                              C[2] + (R + 0.014) * math.sin(UP) * SZ)
    return fig, piv

# The looks (a proposal): the Commander and the colonists the game names (unity/.../Sim/Texts.cs); also in looks.json
ACCENT = dict(commander='#ef7433', cook='#ffc65c', agronomist='#4fc06a', geologist='#9a7cff', engineer='#5aa9ff', scientist='#33c5a2')
LOOKS = [
    # name, profession, skin, hair, style, beard
    ('Commander', 'commander', '#eebf98', '#4a3326', 'short', False),
    ('Maya Okafor', 'cook', '#7a4a30', '#1f1b1a', 'bun', False),
    ('Lena Sorensen', 'agronomist', '#f6d3b3', '#e0b860', 'full', False),
    ('Tomas Varga', 'geologist', '#eebf98', '#5a3a26', 'short', True),
    ('Ravi Menon', 'engineer', '#a8704a', '#1f1b1a', 'short', False),
    ('Ana Lima', 'geologist', '#c98f62', '#2a211d', 'full', False),
    ('Kenji Mori', 'engineer', '#f0c9a0', '#1f1b1a', 'short', False),
    ('Pablo Herrera', 'agronomist', '#d99a6c', '#2a211d', 'short', True),
    ('Elif Kaya', 'engineer', '#e0aa80', '#3a2a22', 'bun', False),
    ('Jonas Weber', 'geologist', '#f2c6a0', '#b5651d', 'short', True),
    ('Dr. Hana Sato', 'scientist', '#f0c9a0', '#1f1b1a', 'full', False),
    ('Sofia Ruiz', 'geologist', '#d99a6c', '#3a2a22', 'bun', False),
    ('Marek Novak', 'engineer', '#f6d3b3', '#a8a29a', 'short', True),
    ('Grace Mensah', 'engineer', '#6e4530', '#1f1b1a', 'bun', False),
    ('Nadia Petrova', 'agronomist', '#f6d3b3', '#d8d0c4', 'bun', False),
    ('Luca Bianchi', 'cook', '#e8b890', '#4a3326', 'short', False),
]
def write_looks(path):
    import json
    people = {n: dict(profession=pr, skin=sk, hair=hr, style=st, beard=b) for n, pr, sk, hr, st, b in LOOKS}
    json.dump(dict(note='A proposal (14.11.2026): the colours of the professions and how each named person looks. '
                        'The model is colonist.glb: materials accent, skin, hair; show one of hair_short, hair_bun, hair_full, '
                        'beard if true, stripe and aerial for the Commander only.',
                   accent=ACCENT, people=people), open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

def baked(p, look, at=(0, 0), rz=0.0, pose=None):
    name, prof, sk, hr, style, beard = look
    opts = {'hair_' + style} | ({'beard'} if beard else set()) | ({'stripe', 'aerial'} if prof == 'commander' else set())
    fig, piv = person(p, ACCENT[prof], sk, hr, opts)
    return finish(fig, name, piv, at, rz, pose)

def crew10(p):
    """the Commander and the ten awake at level 10, in two loose rows"""
    walk = dict(leg_l=(-24, 0, 0), leg_r=(24, 0, 0), arm_l=(20, 0, 0), arm_r=(-20, 0, 0))
    walk2 = dict(leg_l=(22, 0, 0), leg_r=(-22, 0, 0), arm_l=(-18, 0, 0), arm_r=(18, 0, 0))
    spots = [(0.0, -0.75, 0.0, dict(arm_r=(0, 152, 0)))]
    for k in range(5): spots.append(((k - 2) * 0.98 + 0.49, 0.1 + abs(k - 2) * 0.12, -(k - 2) * 0.1, [None, walk, None, dict(arm_l=(-35, 0, 0)), walk2][k]))
    for k in range(5): spots.append(((k - 2) * 0.98 - 0.49, 1.05 + abs(k - 2) * 0.1, -(k - 2) * 0.08, [walk2, None, dict(arm_r=(0, 30, 0)), walk, None][k]))
    for look, (px, py, rz, pose) in zip(LOOKS[:11], spots):
        baked(p, look, (px, py), rz, pose)

def final_colonist(p):
    fig, piv = person(p); finish(fig, 'colonist', piv, on_body=OPTIONAL)
def final_echo(p):
    fig, piv = echo_final(p); finish(fig, 'echo', piv, on_body=('eye_l', 'eye_r'))
def final_echo_size(p):
    baked(p, LOOKS[0], (-0.25, 0.0), 0.0, dict(arm_l=(0, -28, 0)))
    fig, piv = echo_final(p); finish(fig, 'echo', piv, (0.75, -0.25), 0.25, None, 1.02, on_body=('eye_l', 'eye_r'))

# ---------- what to build ----------
def one(idea):
    def f(p):
        fig, piv = ASTRO[idea](p, CREW[4]); finish(fig, 'colonist', piv)
    return f
def commander(idea):
    def f(p):
        fig, piv = ASTRO[idea](p, CREW[0]); finish(fig, 'commander', piv)
    return f
def echo(n):
    def f(p):
        fig, piv = ECHO[n](p); finish(fig, 'echo', piv)
    return f
def echo_size(n, idea):
    """ECHO in the air beside the Commander, for its size"""
    def f(p):
        fig, piv = ASTRO[idea](p, CREW[0]); finish(fig, 'commander', piv, (-0.25, 0.0), 0.0, dict(arm_l=(0, -28, 0)))
        fig, piv = ECHO[n](p); finish(fig, 'echo', piv, (0.75, -0.25), 0.25, None, 1.02)
    return f

JOBS = {}
for i in 'abc':
    JOBS['astro-' + i] = one(i)
    JOBS['astro-' + i + '-commander'] = commander(i)
    JOBS['astro-' + i + '-crew'] = (lambda idea: (lambda p: crew(p, idea)))(i)
for n, i in zip('123', 'abc'):
    JOBS['echo-' + n] = echo(n)
    JOBS['echo-' + n + '-size'] = echo_size(n, i)

# the chosen ones: colonist and echo are the game's models; the rest is baked for the sheets (mockup/catalog.html)
JOBS['colonist'] = final_colonist
JOBS['echo'] = final_echo
JOBS['final-commander'] = lambda p: baked(p, LOOKS[0])
JOBS['final-colonist'] = lambda p: baked(p, LOOKS[4])
JOBS['final-crew'] = crew10
JOBS['final-echo-size'] = final_echo_size

if __name__ == '__main__':
    if not PICK or 'looks' in PICK: write_looks(os.path.join(OUTDIR, 'looks.json'))
    for name, fn in JOBS.items():
        if PICK and name not in PICK: continue
        reset(); fn(pal())
        tris = sum(sum(len(f.vertices) - 2 for f in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
        export(os.path.join(OUTDIR, name + '.glb'))
        print('%-22s %6d triangles  %5.0f KB' % (name, tris, os.path.getsize(os.path.join(OUTDIR, name + '.glb')) / 1024))
