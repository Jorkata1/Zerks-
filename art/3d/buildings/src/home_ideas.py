# Three ideas for the colonists' home (05.11.2026): Joro wants it to look more like a house or a block of flats,
# still technical and futuristic and in the style of the other buildings. Each idea grows with the home's level
# (docs/levels.md): level 1 has 4 places, level 10 has 10 on one floor, the second floor comes at level 11 and
# level 20 has 20 places on two floors. Every room sleeps two and has one window with its two beds behind the glass,
# so the windows count the places: 2 rooms at level 1, 5 at level 10, 10 at level 20.
# Every home has an airlock at the door, a water tank and an air unit, because the air outside is thin (7-28%).
#   python home_ideas.py -- <out_dir> [home-a-1,home-b-20,...]
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

# the helpers and idea C (b_home) now live in build.py

# ======================================================================================
# A: the pod block. A round core with the airlock and the stairs; the bedrooms are pods plugged into it,
#    two beds each. New pods are added as the home grows; at level 11 the second ring of pods goes on top.
# ======================================================================================
def home_a(p, lvl):
    R, PL, PW, PH = 0.5, 0.56, 0.42, 0.42
    two = lvl >= 11
    angles = (-20, 200) if lvl < 5 else (-20, 35, 90, 145, 200)
    CH = 1.36 if two else 0.9
    cyl(R + PL + 0.12, 0.08, p['char'], (0, 0, 0), bev=0.03, verts=64)
    core = cyl(R, CH, p['cream'], (0, 0, 0.08), bev=0.1, verts=56)
    for z in ((0.56, 0.98) if two else (0.56,)): torus(R + 0.004, 0.025, p['orange'], (0, 0, z))
    # the airlock at the front: a short hall with the outer door; the stairs light runs up the core above it
    rbox(0.46, 0.36, 0.5, 0.12, p['cream'], (0, -R - 0.08, 0.08))
    rbox(0.47, 0.37, 0.035, 0.12, p['orange'], (0, -R - 0.08, 0.4))
    door(p, 0.0, -R - 0.27, 0.0, 0.22, 0.34, 0.08)
    rbox(0.4, 0.13, 0.03, 0.02, p['orange'], (0, -R - 0.31, 0.5))
    rbox(0.05, 0.03, CH - 0.68, 0.02, p['teal'], (0, -R + 0.005, 0.66))
    # the pods: one window at the outer end, two beds behind it; a vent and a light on top
    for fl in ((0, 1) if two else (0,)):
        z0 = 0.08 + fl * PH
        for a in angles:
            th = D2R(a); c = (math.cos(th), math.sin(th)); rc = R - 0.02 + PL / 2
            pod = rbox(PL, PW, PH, 0.16, p['cream'], (c[0] * rc, c[1] * rc, z0), (0, 0, th), seg=5)
            rbox(PL + 0.02, PW + 0.02, 0.03, 0.16, p['orange'], (c[0] * rc, c[1] * rc, z0 + PH * 0.18), (0, 0, th))
            ro = R - 0.02 + PL
            room(p, pod, c[0] * (ro - 0.01), c[1] * (ro - 0.01), z0 + 0.13, th + math.pi / 2, w=0.26, h=0.2, depth=0.24)
            if fl == 1 or not two:
                light(p, (c[0] * (ro - 0.06), c[1] * (ro - 0.06), z0 + PH - 0.005), 0.022)
                vent(p, (c[0] * (rc - 0.05), c[1] * (rc - 0.05), z0 + PH - 0.01), 0.07)
    # the top of the core: the air unit and the antenna; at level 20 a small glass garden on the roof
    top = 0.08 + CH
    cyl(0.4, 0.06, p['cream2'], (0, 0, top - 0.02), bev=0.02)
    if lvl >= 20:
        torus(0.38, 0.03, p['orange'], (0, 0, top + 0.04))
        cyl(0.36, 0.03, p['soil'], (0, 0, top + 0.03), bev=0.0)
        bush(p, (0.1, 0.05, top + 0.03), 1.0); bush(p, (-0.14, -0.08, top + 0.03), 0.7)
        cyl(0.025, 0.12, p['wood'], (0.1, 0.05, top + 0.03), bev=0.006)
        dome(0.38, p['glass'], (0, 0, top + 0.04), seg=40, sz=0.75)
    else:
        air_unit(p, (0.05, 0.08, top + 0.04), 0.0, 1.0)
        cyl(0.013, 0.3, p['char'], (-0.22, 0.12, top + 0.04), bev=0.004); light(p, (-0.22, 0.12, top + 0.36), 0.026)
    # the water tank in front, beside the airlock, with its pipe into the core
    tx, ty = 0.88 * math.cos(D2R(-55)), 0.88 * math.sin(D2R(-55))
    tank(p, (tx, ty, 0.08))
    tube([(tx - 0.1, ty + 0.06, 0.3), (0.5 * math.cos(D2R(-58)), 0.5 * math.sin(D2R(-58)), 0.3)], 0.016, p['char'])
    if lvl >= 20:
        # the air unit moves down between two back pods when the roof becomes a garden, its pipe into the core
        ua = D2R(117.5)
        air_unit(p, (0.95 * math.cos(ua), 0.95 * math.sin(ua), 0.08), ua - math.pi / 2, 0.9)
        tube([(0.83 * math.cos(ua), 0.83 * math.sin(ua), 0.2), (0.48 * math.cos(ua), 0.48 * math.sin(ua), 0.2)], 0.016, p['char'])
    if lvl >= 10:
        # a home, not a shelter: a plant under glass by the door and a bench
        bench(p, (-0.62, -0.62, 0.08), D2R(35))
        bell(p, (-0.34, -0.86, 0.08), 0.9)

# ======================================================================================
# B: the row house. A long house with a soft gable roof; a room for two behind every front window and the airlock
#    porch in the row. It grows longer room by room, and at level 11 it gets the upper floor under the roof.
# ======================================================================================
def gable(p, W, D, zb, m, pitch=0.55):
    s = (D + 0.16) / math.sqrt(2)
    roof = rbox(W, s, s, 0.07, m, (0, 0, zb - s / 2), (D2R(45), 0, 0), seg=4)
    apply_all([roof])
    for v in roof.data.vertices: v.co.z = zb + (v.co.z - zb) * pitch
    cut_half(roof, zb)
    return (D + 0.16) / 2 * pitch

def home_b(p, lvl):
    rooms = 2 if lvl < 5 else 5
    two = lvl >= 11
    SL, D, FH = 0.4, 0.9, 0.5
    W = (rooms + 1) * SL + 0.14
    door_slot = 1 if rooms == 2 else 2
    xs = [-W / 2 + 0.07 + SL * (k + 0.5) for k in range(rooms + 1)]
    H = FH * (2 if two else 1) + 0.04
    rbox(W + 0.1, D + 0.1, 0.08, 0.14, p['char'], (0, 0, 0))
    body = rbox(W, D, H, 0.12, p['cream'], (0, 0, 0.08), seg=5)
    for z in ((0.08 + FH,) if two else ()): rbox(W + 0.02, D + 0.02, 0.035, 0.12, p['orange'], (0, 0, z))
    for fl in ((0, 1) if two else (0,)):
        for k, x in enumerate(xs):
            if k == door_slot and fl == 0: continue
            room(p, body, x, -D / 2 + 0.01, 0.2 + fl * FH, 0.0)
            if fl == 1:
                # a small balcony under each upper window
                rbox(0.32, 0.12, 0.03, 0.02, p['cream2'], (x, -D / 2 - 0.05, 0.08 + FH + 0.035))
                tube([(x - 0.15, -D / 2 - 0.1, 0.08 + FH + 0.065), (x - 0.15, -D / 2 - 0.1, 0.08 + FH + 0.15), (x + 0.15, -D / 2 - 0.1, 0.08 + FH + 0.15), (x + 0.15, -D / 2 - 0.1, 0.08 + FH + 0.065)], 0.008, p['orange'])
    # the airlock porch in the row, with a canopy and a light
    xd = xs[door_slot]
    rbox(0.34, 0.24, 0.48, 0.1, p['cream2'], (xd, -D / 2 - 0.08, 0.08))
    door(p, xd, -D / 2 - 0.21, 0.0, 0.22, 0.34, 0.08)
    rbox(0.42, 0.18, 0.03, 0.02, p['orange'], (xd, -D / 2 - 0.2, 0.56))
    # the roof: a soft gable with an orange ridge, an air vent stack on the ridge and a skylight
    zb = 0.08 + H
    rh = gable(p, W + 0.12, D, zb, p['orange'])
    hcyl(0.035, W + 0.14, p['cream'], (0, 0, zb + rh - 0.02), 'x', bev=0.012)
    vent(p, (W / 2 - 0.3, 0.0, zb + rh - 0.03), 0.09)
    light(p, (-W / 2 + 0.05, 0.0, zb + rh + 0.03), 0.026)
    # solar tiles on the front slope and a round window in the gable end: the house makes some of its own power
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
        # plants under glass along the front, a bench by the door, a lamp
        for k, x in enumerate(xs):
            if k != door_slot and k % 2 == 0: bell(p, (x, -D / 2 - 0.16, 0.0), 0.8)
        bench(p, (xs[door_slot + 1], -D / 2 - 0.2, 0.0), 0.0)
    if lvl >= 20:
        # the winter garden at the right end: a glass room with plants, the place where everyone sits in the evening
        gx = W / 2 + 0.26
        rbox(0.44, 0.66, 0.08, 0.06, p['char'], (gx, 0.0, 0.0))
        rbox(0.4, 0.62, 0.02, 0.02, p['floor'], (gx, 0.0, 0.08))
        bush(p, (gx - 0.06, 0.1, 0.1), 1.0); bush(p, (gx + 0.08, -0.12, 0.1), 0.8)
        bench(p, (gx, -0.18, 0.1), D2R(90))
        rbox(0.4, 0.62, 0.42, 0.08, p['glass'], (gx, 0.0, 0.1))
        rbox(0.44, 0.66, 0.035, 0.06, p['orange'], (gx, 0.0, 0.52))

# ======================================================================================
# C: the block of flats around a winter garden; Joro picked it (06.11.2026), so it lives in build.py as b_home
# ======================================================================================
home_c = b_home

IDEAS = []
for key, fn in (('a', home_a), ('b', home_b), ('c', home_c)):
    for lvl in (1, 10, 20): IDEAS.append((f'home-{key}-{lvl}', fn, lvl))
for name, fn, lvl in IDEAS:
    if ONLY_IDEAS and name not in ONLY_IDEAS: continue
    reset(); p = pal(); fn(p, lvl); export(f'{OUT}/{name}.glb'); print('built', name)
