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
            rbox(0.11, 0.2, 0.05, 0.02, p['cream2'], (bx, by, fz), (0, 0, fr))
            rbox(0.104, 0.13, 0.022, 0.01, sheet, (bx - i[0] * 0.03, by - i[1] * 0.03, fz + 0.045), (0, 0, fr))
            rbox(0.08, 0.045, 0.026, 0.012, pillow, (bx + i[0] * 0.065, by + i[1] * 0.065, fz + 0.045), (0, 0, fr))
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
# C: the block of flats around a winter garden. At first one block with two rooms and a glass hall; by level 10
#    two wings come forward and the yard between them is roofed with glass: a warm garden with a tree and benches,
#    the common room of the house. At level 11 the second floor goes on all three wings.
# ======================================================================================
def home_c(p, lvl):
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

IDEAS = []
for key, fn in (('a', home_a), ('b', home_b), ('c', home_c)):
    for lvl in (1, 10, 20): IDEAS.append((f'home-{key}-{lvl}', fn, lvl))
for name, fn, lvl in IDEAS:
    if ONLY_IDEAS and name not in ONLY_IDEAS: continue
    reset(); p = pal(); fn(p, lvl); export(f'{OUT}/{name}.glb'); print('built', name)
