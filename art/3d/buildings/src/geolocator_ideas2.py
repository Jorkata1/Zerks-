# Four more ideas for the geolocator (05.11.2026, after the first three): the first building of the game,
# put together from the cargo supplies next to the Ark. It finds deposits in the ground and measures the air (7%).
#   python geolocator_ideas2.py -- <out_dir> [geo-4,geo-5,...]
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

def container(p, w, d, h, at):
    """the cargo container the station is made of: cream, ribbed doors on the right end, an orange stripe and a code"""
    x, y, z = at
    rbox(w + 0.1, d + 0.1, 0.1, 0.12, p['char'], (x, y, z))
    body = rbox(w, d, h, 0.16, p['cream'], (x, y, z + 0.08), seg=5)
    rbox(w + 0.02, d + 0.02, 0.04, 0.16, p['orange'], (x, y, z + 0.08 + h * 0.62))
    pw = d - 0.36
    rbox(0.025, pw, h - 0.24, 0.01, p['cream2'], (x + w / 2 + 0.002, y, z + 0.2))
    for k in (-1, 0, 1): rbox(0.02, 0.025, h - 0.26, 0.008, p['char'], (x + w / 2 + 0.012, y + k * pw * 0.33, z + 0.21))
    for k in (-1, 1): rbox(0.03, 0.02, 0.08, 0.008, p['orange'], (x + w / 2 + 0.02, y + k * 0.05, z + 0.4))
    rbox(0.22, 0.02, 0.08, 0.02, p['orange'], (x - w / 2 + 0.2, y - d / 2 - 0.005, z + 0.62))
    return body

# ---------- G4: the borehole rig: a probe on a cable goes down a borehole and reads the layers ----------
def geo_4(p):
    CX, CY, W, D, H = 0.3, -0.15, 1.2, 0.75, 0.62
    body = container(p, W, D, H, (CX, CY, 0.0))
    # inside the window: a screen with the ground layers the probe has read, a desk, a lamp
    def strata(cx, cy, fz):
        rbox(0.38, 0.14, 0.1, 0.03, p['cream2'], (cx, cy + 0.04, fz))
        rbox(0.26, 0.03, 0.16, 0.02, p['char'], (cx, cy + 0.11, fz + 0.1))
        for k, m in enumerate(('rock', 'rock2', 'ore', 'crystal')):
            rbox(0.22, 0.012, 0.028, 0.006, p[m], (cx, cy + 0.093, fz + 0.12 + k * 0.034))
    lit_room(p, body, 0.5, 0.32, 0.3, CX - 0.2, CY - D / 2 + 0.01, 0.28, 0.0, strata)
    door(p, CX + 0.38, CY - D / 2 - 0.02, 0.0, 0.24, 0.44, 0.08)
    vent(p, (CX - 0.3, CY + 0.1, H + 0.08), 0.1)
    anemometer(p, (CX + 0.3, CY + 0.15, H + 0.08), 0.42)

    # the rig: a platform with the borehole, four orange legs to a crown, a pulley, a winch and the probe on its cable
    P = Vector((-0.62, 0.68, 0.0))
    plat = rbox(0.72, 0.72, 0.08, 0.06, p['char'], (P.x, P.y, 0.0))
    HOLE = Vector((P.x, P.y - 0.07, 0.0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.1, depth=0.3, location=(HOLE.x, HOLE.y, 0.04))
    cut(plat, bpy.context.object)
    cyl(0.1, 0.005, mat('dark', '#1b1817', 0.9), (HOLE.x, HOLE.y, 0.0), bev=0.0)
    torus(0.105, 0.018, p['orange'], (HOLE.x, HOLE.y, 0.08))
    LB, LT, Z0, Z1 = 0.29, 0.08, 0.08, 1.4
    def leg_at(z, sx, sy):
        s = LB + (LT - LB) * (z - Z0) / (Z1 - Z0)
        return (P.x + sx * s, P.y + sy * s, z)
    corners = ((1, 1), (-1, 1), (-1, -1), (1, -1))
    for sx, sy in corners:
        cyl(0.05, 0.04, p['char'], (P.x + sx * LB, P.y + sy * LB, Z0 - 0.01), bev=0.015)
        tube([leg_at(Z0, sx, sy), leg_at(Z1, sx, sy)], 0.028, p['orange'])
    for z in (0.55, 1.0):
        tube([leg_at(z, sx, sy) for sx, sy in corners + corners[:1]], 0.016, p['cream2'])
    # the crown: two bars along y, two plates, the pulley on its axle; the cables run between the bars
    for sx in (-1, 1): rbox(0.04, 0.24, 0.05, 0.015, p['cream'], (P.x + sx * 0.085, P.y, Z1 - 0.02))
    for sx in (-1, 1): rbox(0.03, 0.12, 0.16, 0.012, p['cream'], (P.x + sx * 0.06, P.y, Z1 + 0.02))
    PZ = Z1 + 0.12
    torus(0.07, 0.018, p['char'], (P.x, P.y, PZ), (0, math.pi / 2, 0))
    hcyl(0.016, 0.15, p['grey'], (P.x, P.y, PZ), 'x', bev=0.004)
    light(p, (P.x, P.y, Z1 + 0.22), 0.03)
    # the winch at the back of the platform, its motor and the cable up to the pulley
    WN = Vector((P.x, P.y + 0.17, 0.2))
    for sx in (-1, 1): rbox(0.03, 0.12, 0.16, 0.012, p['char'], (WN.x + sx * 0.15, WN.y, 0.08))
    hcyl(0.075, 0.27, p['cream'], tuple(WN), 'x', bev=0.02)
    for sx in (-1, 1): hcyl(0.085, 0.02, p['orange'], (WN.x + sx * 0.12, WN.y, WN.z), 'x', bev=0.006)
    rbox(0.1, 0.1, 0.18, 0.03, p['orange'], (WN.x - 0.22, WN.y, 0.08))
    light(p, (WN.x - 0.22, WN.y - 0.055, 0.2), 0.022)
    tube([(WN.x, WN.y - 0.01, WN.z + 0.075), (P.x, P.y + 0.07, PZ)], 0.008, p['char'])
    # the probe hangs over the borehole, half way down
    tube([(P.x, P.y - 0.07, PZ), (HOLE.x, HOLE.y, 0.78)], 0.008, p['char'])
    cyl(0.05, 0.3, p['cream'], (HOLE.x, HOLE.y, 0.46), bev=0.03)
    for z in (0.52, 0.66): torus(0.05, 0.012, p['orange'], (HOLE.x, HOLE.y, z))
    ball(0.035, p['teal'], (HOLE.x, HOLE.y, 0.45), seg=10)
    # the cable from the winch motor to the container, on the ground
    # (it leaves the motor at the front, runs along the platform in front of the drum, drops off the edge and goes into the back wall)
    tube([(P.x - 0.2, WN.y - 0.055, 0.1), (P.x - 0.2, P.y + 0.08, 0.1), (P.x + 0.38, P.y + 0.08, 0.1), (P.x + 0.4, P.y + 0.08, 0.02),
          (CX - 0.3, CY + D / 2 + 0.1, 0.02), (CX - 0.3, CY + D / 2 + 0.1, 0.25), (CX - 0.3, CY + D / 2 - 0.02, 0.25)], 0.014, p['char'])
    # the core tray behind the rig: three cores pulled out of the hole
    T = Vector((-0.72, -0.25, 0.0))
    for sx in (-1, 1): rbox(0.05, 0.26, 0.1, 0.015, p['char'], (T.x + sx * 0.2, T.y, 0.0))
    rbox(0.5, 0.3, 0.04, 0.02, p['cream2'], (T.x, T.y, 0.1))
    for k, m in enumerate(('rock', 'ore', 'rock2')):
        hcyl(0.035, 0.4, p[m], (T.x, T.y - 0.08 + k * 0.08, 0.175), 'x', bev=0.012)
    ball(0.04, p['crystal'], (T.x + 0.08, T.y, 0.2), (1.2, 1, 0.8), seg=10)
    for (x, y) in ((0.7, -0.95), (1.05, -0.75)): flag(p, (x, y, 0.0))

# ---------- G5: the seismic station; Joro picked it (05.11.2026), so it lives in build.py as b_geolocator ----------
geo_5 = b_geolocator

# ---------- G6: the drone station: a small drone with big blades (thin air) flies out, maps the ground and lands on the roof ----------
def geo_6(p):
    CX, CY, W, D, H = -0.15, 0.2, 1.3, 0.8, 0.62
    body = container(p, W, D, H, (CX, CY, 0.0))
    # inside the window: a desk with the map the drone made, the found spots in orange
    def mapdesk(cx, cy, fz):
        rbox(0.4, 0.14, 0.1, 0.03, p['cream2'], (cx, cy + 0.04, fz))
        rbox(0.32, 0.03, 0.16, 0.02, p['teal'], (cx, cy + 0.11, fz + 0.1))
        for (dx, dz, r) in ((-0.07, 0.19, 0.05), (-0.07, 0.19, 0.03), (0.07, 0.16, 0.04)):
            torus(r, 0.004, p['char'], (cx + dx, cy + 0.093, fz + dz), (math.pi / 2, 0, 0))
        for (dx, dz) in ((-0.07, 0.19), (0.07, 0.16)): ball(0.012, p['orange'], (cx + dx, cy + 0.09, fz + dz), seg=6)
    lit_room(p, body, 0.5, 0.32, 0.3, CX - 0.32, CY - D / 2 + 0.01, 0.28, 0.0, mapdesk)
    door(p, CX + 0.3, CY - D / 2 - 0.02, 0.0, 0.24, 0.44, 0.08)
    RZ = 0.08 + H
    # the landing pad on the roof
    PX, PY = CX + 0.12, CY
    cyl(0.3, 0.04, p['char'], (PX, PY, RZ), bev=0.012)
    cyl(0.2, 0.045, p['cream2'], (PX, PY, RZ), bev=0.0)
    torus(0.3, 0.018, p['orange'], (PX, PY, RZ + 0.03))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        light(p, (PX + math.cos(a) * 0.25, PY + math.sin(a) * 0.25, RZ + 0.05), 0.02)
    # the drone: a small body on four legs, a camera under it, a mast with two big blades and a solar panel on top
    DZ = RZ + 0.045
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        tube([(PX + math.cos(a) * 0.06, PY + math.sin(a) * 0.06, DZ + 0.13), (PX + math.cos(a) * 0.15, PY + math.sin(a) * 0.15, DZ + 0.015)], 0.008, p['char'])
        ball(0.02, p['char'], (PX + math.cos(a) * 0.15, PY + math.sin(a) * 0.15, DZ + 0.015), seg=8)
    rbox(0.18, 0.18, 0.13, 0.05, p['cream'], (PX, PY, DZ + 0.11))
    rbox(0.185, 0.185, 0.025, 0.05, p['orange'], (PX, PY, DZ + 0.16))
    ball(0.035, p['char'], (PX, PY - 0.07, DZ + 0.11), seg=12)
    cyl(0.018, 0.22, p['char'], (PX, PY, DZ + 0.24), bev=0.006)
    for z, a0 in ((DZ + 0.3, 0.3), (DZ + 0.37, 1.3)):
        cyl(0.03, 0.025, p['grey'], (PX, PY, z - 0.012), bev=0.008)
        for s in (0, math.pi):
            a = a0 + s
            rbox(0.3, 0.06, 0.012, 0.025, p['cream'], (PX + math.cos(a) * 0.17, PY + math.sin(a) * 0.17, z), (0, 0, a))
            rbox(0.05, 0.062, 0.014, 0.02, p['orange'], (PX + math.cos(a) * 0.3, PY + math.sin(a) * 0.3, z - 0.001), (0, 0, a))
    rbox(0.16, 0.1, 0.02, 0.01, p['navy'], (PX, PY, DZ + 0.46))
    light(p, (PX, PY, DZ + 0.5), 0.02)
    # the charger box on the roof with its cable to the pad
    rbox(0.22, 0.2, 0.16, 0.05, p['cream2'], (CX - 0.36, CY + 0.15, RZ))
    light(p, (CX - 0.36, CY + 0.045, RZ + 0.11), 0.022)
    tube([(CX - 0.26, CY + 0.15, RZ + 0.03), (PX - 0.29, PY + 0.1, RZ + 0.025)], 0.012, p['char'])
    # a windsock on the left end of the roof: the drone needs to know the wind
    S = Vector((CX - 0.42, CY - 0.16, RZ))
    cyl(0.04, 0.04, p['char'], tuple(S), bev=0.012); cyl(0.013, 0.42, p['char'], tuple(S), bev=0.004)
    for k in range(4):
        cyl(0.04 - k * 0.006, 0.07, p['orange'] if k % 2 == 0 else p['cream'], (S.x - 0.035 - k * 0.07, S.y, S.z + 0.38 - k * 0.01), (0, -math.pi / 2 - 0.12, 0), bev=0.0)
    # the ladder up the left end
    LX = CX - W / 2 - 0.08
    for sy in (-0.12, 0.12): tube([(LX, CY + sy, 0.0), (LX, CY + sy, RZ + 0.12)], 0.014, p['char'])
    for z in (0.15, 0.3, 0.45, 0.6): tube([(LX, CY - 0.12, z), (LX, CY + 0.12, z)], 0.01, p['orange'])
    # a solar panel leaning on the right end, the flags where the drone found the deposit
    rbox(0.4, 0.5, 0.03, 0.02, p['navy'], (CX + W / 2 + 0.36, CY, 0.32), (0, math.radians(38), 0))
    rbox(0.44, 0.54, 0.02, 0.02, p['cream'], (CX + W / 2 + 0.37, CY, 0.3), (0, math.radians(38), 0))
    for sy in (-0.2, 0.2):
        tube([(CX + W / 2 + 0.47, CY + sy, 0.0), (CX + W / 2 + 0.47, CY + sy, 0.24)], 0.014, p['char'])
        tube([(CX + W / 2 + 0.24, CY + sy, 0.0), (CX + W / 2 + 0.24, CY + sy, 0.43)], 0.014, p['char'])
    tube([(CX + W / 2 + 0.24, CY + 0.2, 0.02), (CX + W / 2 + 0.1, CY + 0.3, 0.02), (CX + W / 2 + 0.1, CY + 0.3, 0.25), (CX + W / 2 - 0.02, CY + 0.3, 0.25)], 0.012, p['char'])
    for (x, y) in ((0.75, -0.75), (1.05, -0.5), (0.5, -1.0)): flag(p, (x, y, 0.0))
    ball(0.06, p['crystal'], (0.8, -0.72, 0.0), (1, 1, 0.8), seg=10)

# ---------- G7: the round station of today, filled out: a window into the control room, a probe in the ground, a supply crate ----------
def geo_7(p):
    C = Vector((-0.2, 0.25, 0.0)); R = 0.56
    cyl(R + 0.05, 0.08, p['char'], tuple(C), bev=0.03)
    body = cyl(R, 0.5, p['cream'], (C.x, C.y, 0.06), bev=0.12, verts=56)
    torus(R, 0.025, p['orange'], (C.x, C.y, 0.48))
    def outward(th): return (math.sin(th), -math.cos(th))
    # the window on the front-right: inside, a chair at a desk with the scan screen
    th = 0.45; n = outward(th)
    def console(cx, cy, fz):
        dx, dy = cx - n[0] * 0.026, cy - n[1] * 0.026
        rbox(0.3, 0.1, 0.08, 0.03, p['cream2'], (dx, dy, fz), (0, 0, th))
        rbox(0.24, 0.025, 0.12, 0.02, p['teal'], (dx - n[0] * 0.03, dy - n[1] * 0.03, fz + 0.08), (0, 0, th))
        cyl(0.05, 0.1, p['orange'], (cx + n[0] * 0.08, cy + n[1] * 0.08, fz), bev=0.025)
    lit_room(p, body, 0.36, 0.24, 0.28, C.x + n[0] * (R - 0.02), C.y + n[1] * (R - 0.02), 0.14, th, console)
    # the door on the front-left
    thd = -0.55; nd = outward(thd)
    door(p, C.x + nd[0] * (R + 0.01), C.y + nd[1] * (R + 0.01), thd, 0.22, 0.34, 0.06)
    # the roof: a low dome, the mast and the turning scanner arm (as today)
    dome(0.46, p['cream2'], (C.x, C.y, 0.56), seg=40, sz=0.45)
    cyl(0.05, 0.3, p['char'], (C.x, C.y, 0.66), bev=0.015)
    rbox(0.66, 0.05, 0.04, 0.02, p['orange'], (C.x, C.y, 0.94), (0, 0, 0.5))
    hx, hy = C.x + 0.3 * math.cos(0.5), C.y + 0.3 * math.sin(0.5)
    d = dome(0.13, p['cream'], (0, 0, 0), seg=24, sz=0.4); d.rotation_euler = (math.radians(110), 0, 0.5 + math.pi / 2); d.location = (hx, hy, 1.01)
    torus(0.13, 0.02, p['orange'], (hx, hy, 1.01), (math.radians(110), 0, 0.5 + math.pi / 2))
    light(p, (C.x - 0.32 * math.cos(0.5), C.y - 0.32 * math.sin(0.5), 0.98), 0.035)
    light(p, (C.x, C.y, 1.0), 0.03)
    for k in range(3):
        a = 2.2 + k * 0.5
        porthole(p, (C.x + math.cos(a) * (R - 0.01), C.y + math.sin(a) * (R - 0.01), 0.3), (math.cos(a), math.sin(a)), 0.05)
    # the probe in the ground in front-right, its cable to the station, the found spot with flags
    Q = Vector((0.75, -0.45, 0.0))
    cyl(0.12, 0.04, p['char'], tuple(Q), bev=0.015)
    cyl(0.045, 0.36, p['cream'], (Q.x, Q.y, 0.04), bev=0.02)
    for z in (0.14, 0.26): torus(0.045, 0.012, p['orange'], (Q.x, Q.y, z))
    cyl(0.07, 0.06, p['orange'], (Q.x, Q.y, 0.4), bev=0.02)
    light(p, (Q.x, Q.y, 0.5), 0.03)
    tube([(Q.x - 0.1, Q.y + 0.04, 0.02), (C.x + 0.66, C.y - 0.2, 0.02), (C.x + 0.66, C.y - 0.2, 0.2), (C.x + 0.52, C.y - 0.17, 0.2)], 0.014, p['char'])
    for (x, y) in ((1.05, -0.75), (0.6, -0.95)): flag(p, (x, y, 0.0))
    ball(0.06, p['crystal'], (0.95, -0.85, 0.0), (1, 1, 0.8), seg=10)
    # the supply crate from the containers behind it, half used, with a small solar panel on top
    K = Vector((0.75, 0.55, 0.0))
    rbox(0.5, 0.42, 0.34, 0.08, p['cream2'], tuple(K))
    rbox(0.52, 0.44, 0.04, 0.08, p['orange'], (K.x, K.y, 0.22))
    rbox(0.42, 0.34, 0.025, 0.02, p['navy'], (K.x, K.y, 0.37), (math.radians(-20), 0, 0))
    tube([(K.x - 0.25, K.y - 0.05, 0.03), (C.x + 0.66, C.y + 0.18, 0.03), (C.x + 0.66, C.y + 0.18, 0.22), (C.x + 0.53, C.y + 0.15, 0.22)], 0.012, p['char'])
    # the weather mast on the left
    anemometer(p, (C.x - 0.75, C.y - 0.25, 0.0), 0.75)

IDEAS = (('geo-4', geo_4), ('geo-5', geo_5), ('geo-6', geo_6), ('geo-7', geo_7))
for name, fn in IDEAS:
    if ONLY_IDEAS and name not in ONLY_IDEAS: continue
    reset(); p = pal(); fn(p); export(f'{OUT}/{name}.glb'); print('built', name)
