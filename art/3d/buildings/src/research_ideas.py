# Three ideas for the research station (06.11.2026): Joro wants to see two or three ways it could look.
# What it does (docs/levels.md): it is found under the debris on level 1 and unlocks blueprints, bonuses, the zone
# expansions and the drones; one project runs at a time. When the Ark reaches level 10 the station is upgraded:
# a second slot and a place for a scientist, who makes the projects shorter. So every idea is built twice:
# level 1 (one project, nobody at a desk) and level 10 (two projects side by side and the scientist's desk).
# Each project has its own place you can see through the glass, so the slots can be counted.
#   A  the sample lab: rock cores and soil come in through a hatch on a short belt, a lab bench under a fume vent
#   B  the observatory and the computer room: a domed telescope, server racks with a console, a dish to orbit
#   C  the prototype workshop: a hologram table, a robot arm, a roller door out to the test pad with a drone
#   python research_ideas.py -- <out_dir> [research-a-1,research-b-10,...]
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

# ---------- small things inside the rooms; (u, v) is across the window and into the room ----------
# (frame, chair, screen, desk, jars, servers, office and dish live in build.py with the research station)

def holo_mat():
    return mat('holo', '#7ff6f0', 0.2, emit='#3fe0d0', strength=1.3, alpha=0.42)





def microscope(p, at, z):
    x, y = at
    rbox(0.05, 0.045, 0.012, 0.006, p['char'], (x, y, z), seg=1)
    cyl(0.008, 0.07, p['char'], (x, y + 0.012, z + 0.012), bev=0.003)
    tube([(x, y + 0.012, z + 0.075), (x, y - 0.01, z + 0.06), (x, y - 0.012, z + 0.035)], 0.011, p['cream2'])
    torus(0.012, 0.004, p['orange'], (x, y - 0.002, z + 0.064), (math.radians(60), 0, 0))

def lab_bench(p, fr):
    """slot: a lab bench along the back wall with a microscope, sample jars and a screen"""
    def f(cx, cy, fz):
        L = frame(cx, cy, fr)
        rbox(0.46, 0.11, 0.02, 0.008, p['cream2'], (*L(0, 0.05), fz + 0.1), (0, 0, fr), seg=2)
        for s in (-1, 1): rbox(0.02, 0.09, 0.1, 0.005, p['char'], (*L(s * 0.2, 0.05), fz), (0, 0, fr), seg=1)
        microscope(p, L(-0.14, 0.05), fz + 0.12)
        jars(p, L, fr, fz + 0.12, 0.0, 0.055)
        screen(p, L(0.15, 0.07), fr, fz + 0.12, 0.09, 0.06)
        cyl(0.03, 0.06, p['char'], (*L(-0.02, -0.05), fz), bev=0.008)
        cyl(0.04, 0.016, p['orange'], (*L(-0.02, -0.05), fz + 0.06), bev=0.006)
    return f

def analyser(p, fr):
    """slot 2 of the sample lab: an analyser with a lit chamber and a centrifuge on a bench"""
    def f(cx, cy, fz):
        L = frame(cx, cy, fr)
        rbox(0.14, 0.1, 0.14, 0.02, p['char'], (*L(-0.1, 0.04), fz), (0, 0, fr), seg=2)
        rbox(0.1, 0.012, 0.06, 0.01, p['teal'], (*L(-0.1, -0.014), fz + 0.05), (0, 0, fr), seg=1)
        rbox(0.1, 0.004, 0.06, 0.01, p['glass'], (*L(-0.1, -0.02), fz + 0.05), (0, 0, fr), seg=1)
        rbox(0.16, 0.1, 0.02, 0.008, p['cream2'], (*L(0.09, 0.04), fz + 0.09), (0, 0, fr), seg=2)
        for s in (-1, 1): rbox(0.018, 0.08, 0.09, 0.005, p['char'], (*L(0.09 + s * 0.06, 0.04), fz), (0, 0, fr), seg=1)
        x, y = L(0.075, 0.04)
        cyl(0.03, 0.04, p['cream'], (x, y, fz + 0.11), bev=0.01); torus(0.03, 0.006, p['orange'], (x, y, fz + 0.13))
        jars(p, L, fr, fz + 0.11, 0.15, 0.05, 1)
    return f



def holo_table(p, L, fr, fz, u, v, kind=0):
    """a round table that shows the blueprint being worked on as a hologram above it"""
    x, y = L(u, v); h = holo_mat()
    cyl(0.075, 0.08, p['char'], (x, y, fz), bev=0.02)
    cyl(0.072, 0.012, p['teal'], (x, y, fz + 0.075), bev=0.004)
    if kind == 0:   # a greenhouse arch
        hcyl(0.045, 0.1, h, (x, y, fz + 0.145), 'x', bev=0.01)
    else:           # a drone
        rbox(0.06, 0.06, 0.02, 0.008, h, (x, y, fz + 0.12), seg=2)
        for a in (45, 135, 225, 315):
            cyl(0.022, 0.006, h, (x + math.cos(D2R(a)) * 0.05, y + math.sin(D2R(a)) * 0.05, fz + 0.135), bev=0.0)
    torus(0.06, 0.003, h, (x, y, fz + 0.095))

def robot_arm(p, L, fr, fz, u, v):
    """a robot arm that builds the part on its small bench"""
    bx, by = L(u, v)
    cyl(0.035, 0.025, p['char'], (bx, by, fz), bev=0.008)
    j1 = (bx, by, fz + 0.17); tx, ty = L(u - 0.09, v - 0.06)
    tube([(bx, by, fz + 0.02), j1], 0.013, p['orange'])
    ball(0.02, p['char'], j1, seg=10)
    tip = (tx, ty, fz + 0.115)
    tube([j1, tip], 0.011, p['orange'])
    ball(0.015, p['char'], tip, seg=10)
    rbox(0.1, 0.08, 0.06, 0.012, p['cream2'], (tx, ty, fz), (0, 0, fr), seg=2)
    rbox(0.04, 0.04, 0.025, 0.008, p['orange'], (tx, ty, fz + 0.06), (0, 0, fr), seg=1)

def holo_bay(p, fr, tables=1):
    """slot(s) of the workshop: hologram tables with the blueprint, a robot arm building the part"""
    def f(cx, cy, fz):
        L = frame(cx, cy, fr)
        if tables == 1:
            holo_table(p, L, fr, fz, -0.12, 0.02, 0)
            robot_arm(p, L, fr, fz, 0.2, 0.06)
        else:
            holo_table(p, L, fr, fz, -0.34, 0.02, 0)
            holo_table(p, L, fr, fz, 0.0, 0.02, 1)
            robot_arm(p, L, fr, fz, 0.33, 0.06)
    return f

def drone(p, at):
    """a small build drone: a cream body, four arms with rotors, a teal light"""
    x, y, z = at
    rbox(0.14, 0.14, 0.05, 0.03, p['cream'], (x, y, z + 0.012), seg=3)
    for a in (45, 135, 225, 315):
        ex, ey = x + math.cos(D2R(a)) * 0.13, y + math.sin(D2R(a)) * 0.13
        tube([(x + math.cos(D2R(a)) * 0.05, y + math.sin(D2R(a)) * 0.05, z + 0.06), (ex, ey, z + 0.06)], 0.01, p['char'])
        cyl(0.012, 0.03, p['char'], (ex, ey, z + 0.045), bev=0.004)
        cyl(0.05, 0.008, p['char'], (ex, ey, z + 0.075), bev=0.0)
        torus(0.05, 0.006, p['orange'], (ex, ey, z + 0.079))
    for s in (-1, 1): rbox(0.012, 0.12, 0.012, 0.005, p['char'], (x + s * 0.05, y, z), seg=1)
    light(p, (x, y - 0.07, z + 0.055), 0.016)


def mast(p, at, h=0.36):
    x, y, z = at
    cyl(0.05, 0.04, p['cream2'], (x, y, z), bev=0.015)
    cyl(0.013, h, p['char'], (x, y, z + 0.04), bev=0.005)
    for k, zz in enumerate((h * 0.7, h * 0.85)): rbox(0.12 - k * 0.04, 0.012, 0.012, 0.005, p['char'], (x, y, z + zz))
    light(p, (x, y, z + h + 0.06), 0.028)


# ======================================================================================
# A: the sample lab. The cores from the geolocator and the rock from the mine come in a crate; a short belt takes
#    them to a hatch in the side wall, and they are looked at on the bench behind the big front window. The fume
#    vent on the roof is above the bench. At level 10 a second lab with the analyser joins on the left (slot 2),
#    and the scientist gets a glass office on the roof.
# ======================================================================================
def research_a(p, lvl):
    two = lvl >= 10
    W, D, H, R = 1.3, 1.0, 0.78, 0.22
    rbox(W + 0.1, D + 0.1, 0.1, R + 0.05, p['char'], (0, 0, 0))
    body = rbox(W, D, H, R, p['cream'], (0, 0, 0.08), seg=6)
    lit_room(p, body, 0.6, 0.34, 0.34, -0.2, -D / 2 + 0.01, 0.3, 0.0, lab_bench(p, 0.0))
    rbox(W + 0.025, D + 0.025, 0.045, R, p['orange'], (0, 0, 0.2))
    door(p, 0.36, -D / 2 - 0.02, 0.0, 0.26, 0.48, 0.08)
    TOP = 0.08 + H
    # the sample hatch in the right wall and the belt that brings the crate's cores to it
    hx = W / 2
    rbox(0.14, 0.36, 0.34, 0.05, p['cream2'], (hx + 0.04, 0.06, 0.1))
    rbox(0.025, 0.27, 0.23, 0.03, p['orange'], (hx + 0.115, 0.06, 0.155))
    rbox(0.02, 0.22, 0.18, 0.02, p['char'], (hx + 0.13, 0.06, 0.18))
    light(p, (hx + 0.06, 0.06, 0.455), 0.022)
    BL = 0.36; bx = hx + 0.15 + BL / 2
    rbox(BL, 0.16, 0.035, 0.015, p['char'], (bx, 0.06, 0.2))
    for s in (-1, 1): rbox(BL, 0.014, 0.03, 0.006, p['orange'], (bx, 0.06 + s * 0.085, 0.215))
    for x in (bx - BL / 2 + 0.06, bx + BL / 2 - 0.04): rbox(0.03, 0.12, 0.2, 0.008, p['char'], (x, 0.06, 0.0))
    for k, m in enumerate(('ore', 'rock', 'ice')): cyl(0.028, 0.07, p[m], (bx - 0.1 + k * 0.1, 0.06, 0.235), bev=0.01)
    cx = hx + 0.15 + BL + 0.16
    rbox(0.26, 0.28, 0.2, 0.04, p['orange'], (cx, 0.06, 0.0))
    rbox(0.22, 0.24, 0.02, 0.01, p['char'], (cx, 0.06, 0.19))
    for ix in (-1, 0, 1):
        for iy in (-1, 0, 1): cyl(0.024, 0.06, p['rock'] if (ix + iy) % 2 else p['ore'], (cx + ix * 0.065, 0.06 + iy * 0.065, 0.18), bev=0.008)
    # roof: the fume vent above the bench, the antenna
    if not two:
        cyl(0.05, 0.1, p['cream2'], (-0.2, 0.12, TOP - 0.01), bev=0.02)
        vent(p, (-0.2, 0.12, TOP + 0.06), 0.12)
        mast(p, (0.35, 0.15, TOP - 0.01))
        return
    vent(p, (0.3, 0.15, TOP - 0.01), 0.1)
    # level 10, the scientist's office on the roof: a glass room with a desk, a flat roof, an orange band
    ox, oy = -0.15, 0.06
    rbox(0.5, 0.42, 0.04, 0.08, p['cream2'], (ox, oy, TOP - 0.02))
    rbox(0.44, 0.36, 0.02, 0.06, p['floor'], (ox, oy, TOP + 0.02))
    office(p, 0.0)(ox, oy - 0.04, TOP + 0.04)
    ball(0.03, p['lampw'], (ox + 0.14, oy - 0.1, TOP + 0.26), seg=12)
    rbox(0.46, 0.38, 0.27, 0.08, p['glass'], (ox, oy, TOP + 0.02))
    rbox(0.5, 0.42, 0.05, 0.08, p['cream'], (ox, oy, TOP + 0.29))
    rbox(0.51, 0.43, 0.03, 0.08, p['orange'], (ox, oy, TOP + 0.27))
    light(p, (ox + 0.16, oy - 0.1, TOP + 0.35), 0.022)
    # level 10, slot 2: the second lab on the left with the analyser
    AW, AD, AH, AR = 0.78, 0.84, 0.66, 0.16
    ax, ay = -W / 2 - AW / 2 + 0.08, -0.06
    rbox(AW + 0.1, AD + 0.1, 0.1, AR + 0.05, p['char'], (ax, ay, 0))
    annex = rbox(AW, AD, AH, AR, p['cream'], (ax, ay, 0.08), seg=6)
    lit_room(p, annex, 0.42, 0.28, 0.3, ax, ay - AD / 2 + 0.01, 0.28, 0.0, analyser(p, 0.0))
    rbox(AW + 0.025, AD + 0.025, 0.045, AR, p['orange'], (ax, ay, 0.18))
    air_unit(p, (ax - 0.05, ay + 0.12, 0.08 + AH - 0.01), 0.0, 0.9)


# ======================================================================================
# C: the prototype workshop. A new blueprint shows as a hologram over the round table, the robot arm builds the
#    part, and what is built rolls out of the roller door in the right wall onto the test pad, where the new drone
#    is tried before it goes to work; a post charges it. At level 10 the hall is wider with a second hologram table
#    (slot 2), and the scientist's office is a small upper floor with its own window.
# ======================================================================================
def research_c(p, lvl):
    two = lvl >= 10
    W, D, H, R = (1.8 if two else 1.5), 1.1, 0.8, 0.24
    rbox(W + 0.1, D + 0.1, 0.1, R + 0.05, p['char'], (0, 0, 0))
    body = rbox(W, D, H, R, p['cream'], (0, 0, 0.08), seg=6)
    ww = 1.0 if two else 0.7
    wx = -0.3 if two else -0.25
    lit_room(p, body, ww, 0.38, 0.44, wx, -D / 2 + 0.01, 0.3, 0.0, holo_bay(p, 0.0, 2 if two else 1))
    rbox(W + 0.025, D + 0.025, 0.045, R, p['orange'], (0, 0, 0.17))
    door(p, (0.45 if two else 0.33), -D / 2 - 0.02, 0.0, 0.24, 0.48, 0.08)
    TOP = 0.08 + H
    # the roller door in the right wall: the built prototype goes out to the test pad
    rx = W / 2
    rbox(0.05, 0.5, 0.46, 0.04, p['orange'], (rx + 0.01, 0.0, 0.08))
    rbox(0.05, 0.42, 0.4, 0.02, p['char'], (rx + 0.025, 0.0, 0.08))
    for k in range(6): rbox(0.012, 0.4, 0.012, 0.004, p['grey'], (rx + 0.052, 0.0, 0.13 + k * 0.06))
    light(p, (rx + 0.02, -0.21, 0.6), 0.024)
    # the test pad with the new drone and the charging post
    px, py = rx + 0.47, 0.0
    cyl(0.3, 0.035, p['char'], (px, py, 0.0), bev=0.012)
    torus(0.26, 0.014, p['orange'], (px, py, 0.037))
    for k in range(6): light(p, (px + math.cos(k * 1.047) * 0.29, py + math.sin(k * 1.047) * 0.29, 0.04), 0.016)
    drone(p, (px, py, 0.035))
    qx, qy = px + 0.08, py + 0.44
    rbox(0.12, 0.1, 0.3, 0.03, p['cream2'], (qx, qy, 0.0))
    rbox(0.04, 0.012, 0.1, 0.008, p['teal'], (qx, qy - 0.052, 0.14), seg=1)
    light(p, (qx, qy, 0.32), 0.02)
    tube([(qx, qy - 0.05, 0.05), (qx, qy - 0.12, 0.012), (px + 0.06, py + 0.27, 0.012), (px + 0.06, py + 0.25, 0.03)], 0.01, p['char'])
    # the roof: a long skylight over the hall, a vent
    sx = wx
    rbox(ww * 0.6 + 0.08, 0.36, 0.06, 0.05, p['char'], (sx, -0.05, TOP - 0.02))
    rbox(ww * 0.6, 0.3, 0.02, 0.03, p['room'], (sx, -0.05, TOP + 0.03))
    rbox(ww * 0.6, 0.3, 0.06, 0.04, p['glass'], (sx, -0.05, TOP + 0.03))
    for k in (-1, 1): rbox(0.02, 0.3, 0.02, 0.006, p['char'], (sx + k * ww * 0.15, -0.05, TOP + 0.08))
    if not two: vent(p, (0.37, 0.22, TOP - 0.01), 0.1)
    if two:
        # the scientist's office: a small upper floor at the back with a window to the front
        ux, uy, UW, UD, UH = 0.36, 0.08, 0.56, 0.44, 0.36
        upper = rbox(UW, UD, UH, 0.08, p['cream'], (ux, uy, TOP - 0.02), seg=4)
        lit_room(p, upper, 0.36, 0.22, 0.3, ux - 0.04, uy - UD / 2 + 0.01, TOP + 0.07, 0.0, office(p, 0.0))
        rbox(UW + 0.02, UD + 0.02, 0.035, 0.08, p['orange'], (ux, uy, TOP + 0.03))
        mast(p, (ux + 0.16, uy + 0.1, TOP - 0.02 + UH), 0.26)
        vent(p, (ux - 0.12, uy + 0.06, TOP - 0.03 + UH), 0.09)
    else:
        mast(p, (0.3, -0.2, TOP - 0.01))


IDEAS = []
# B, the observatory and the computer room, was picked (Joro, 06.11.2026) and lives in build.py as b_research
research_b = b_research
for key, fn in (('a', research_a), ('b', research_b), ('c', research_c)):
    for lvl in (1, 10): IDEAS.append((f'research-{key}-{lvl}', fn, lvl))
for name, fn, lvl in IDEAS:
    if ONLY_IDEAS and name not in ONLY_IDEAS: continue
    reset(); p = pal(); fn(p, lvl); export(f'{OUT}/{name}.glb'); print('built', name)
