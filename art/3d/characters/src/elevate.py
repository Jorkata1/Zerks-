# Zerks-X6: three ways to make the people in suits a little more detailed (Joro, 21.11.2026: "елевейтнем малко
# визията на самите астронавти... малко по-детайлни", three variants). All three keep the chosen look A (the glass
# helmet, 14.11.2026): the same proportions, parts, pivots and materials (accent, skin, hair) as colonist.glb.
#   1 The suit: details of a real spacesuit (boots with soles, folds at the knees and elbows, lock rings at the
#     wrists and the neck, thumbs, a patch on the arm, the control module on the chest, lamps on the helmet).
#   2 The face: a livelier face (eyes with whites and a glint, brows, nose, mouth), hair with shape, the radio
#     microphone, a name tape in the profession colour.
#   3 The gear: a forearm computer, knee pads, a tool belt with a pouch, the tool of the profession on the hip,
#     two air tanks on the pack, the gold sun visor pushed up, a lamp on top of the helmet.
#   4 The combination (Joro, 21.11.2026: "Комбинация от всичко без ... оранжевото над главите им"): 1, 2 and 3
#     together, without the gold visor.
#   python elevate.py -- <out_dir> [names]     (bpy 5.x; the helpers come from characters.py and ../../buildings/src)
# v0 is the person as it is now (characters.py person()), for the side-by-side sheet.
import os, sys, runpy, math
HERE = os.path.dirname(os.path.abspath(__file__))
ARGV = sys.argv[sys.argv.index('--') + 1:]
OUT, NAMES = ARGV[0], (ARGV[1].split(',') if len(ARGV) > 1 else None)
sys.argv = [sys.argv[0], '--', OUT]
globals().update({k: v for k, v in runpy.run_path(os.path.join(HERE, 'characters.py'), run_name='characters').items()
                  if not k.startswith('__')})

TOOL_OF = dict(geologist='tool_hammer', engineer='tool_wrench', agronomist='tool_trowel', cook='tool_ladle', scientist='tool_tablet')
TOOLS = tuple(TOOL_OF.values())

def fy(x, z, off=0.0):
    """the front of the face (the head ball at (0, -0.01, 1.3), radii 0.2, 0.19, 0.21) at x, z; off moves it forward"""
    q = 1 - (x / 0.2) ** 2 - ((z - 1.3) / 0.21) ** 2
    return -0.01 - 0.19 * math.sqrt(max(q, 0.0)) - off

def on_face(pts, r, m, off=0.003):
    """a thin line lying on the face through (x, z) points (the mouth, the moustache)"""
    return hose([(px, fy(px, pz, off), pz) for px, pz in pts], r, m)

def person_v(p, v, accent='#5aa9ff', sk='#f2c6a0', hr='#4a3326', options=None):
    """The person in the glass helmet, variant v (1, 2 or 3). options as in characters.person()."""
    x = extra(); fig = {}
    baked = options is not None
    a = mat('accent-' + accent if baked else 'accent', accent, 0.55)
    skn = mat('skin-' + sk if baked else 'skin', sk, 0.75)
    har = mat('hair-' + hr if baked else 'hair', hr, 0.85)
    white, glint = mat('eyewhite', '#fbf6ee', 0.45), mat('glint', '#ffffff', 0.2, emit='#ffffff', strength=1.2)
    lip, steel = mat('mouth', '#7a3b2e', 0.7), p['steel']
    S, F, G = v in (1, 4), v in (2, 4), v in (3, 4)    # the suit, the face, the gear; 4 is all three without the visor
    def want(n): return not baked or n in options
    def into(n): return part(fig, 'body' if baked else n)
    for side, s in (('l', 1), ('r', -1)):
        with part(fig, 'leg_' + side):
            capsule(0.1, (s * 0.13, 0, 0.2), (s * 0.13, 0, 0.46), p['cream'], verts=10, seg=3)
            if S:      # a cream boot on a thick dark sole, with a strap; two folds of the knee joint
                rbox(0.22, 0.33, 0.07, 0.03, p['char'], (s * 0.13, -0.035, 0.0), seg=2)
                rbox(0.2, 0.29, 0.12, 0.055, p['cream2'], (s * 0.13, -0.03, 0.04), seg=2)
                rbox(0.21, 0.05, 0.035, 0.012, p['orange'], (s * 0.13, -0.085, 0.13), seg=1)
                for z in (0.262, 0.297): ring(0.099, 0.013, p['cream2'], (s * 0.13, 0, z), seg=12, mseg=4)
            else:
                rbox(0.21, 0.31, 0.15, 0.07, p['char'], (s * 0.13, -0.035, 0.0), seg=2)
            ring(0.103, 0.024, p['orange'], (s * 0.13, 0, 0.175), seg=12, mseg=4)
            if G:      # a knee pad
                rbox(0.12, 0.04, 0.09, 0.02, p['char'], (s * 0.13, -0.1, 0.235), seg=2)
        with part(fig, 'arm_' + side):
            capsule(0.08, (s * 0.33, 0, 0.9), (s * 0.33, 0, 0.62), p['cream'], verts=10, seg=3)
            ball(0.105, a, (s * 0.325, 0, 0.955), (1, 1, 0.85), seg=12)
            ring(0.082, 0.02, p['orange'], (s * 0.33, 0, 0.6), seg=12, mseg=4)
            ball(0.092, p['char'], (s * 0.33, 0, 0.53), seg=10)
            if S:
                for z in (0.715, 0.75): ring(0.079, 0.011, p['cream2'], (s * 0.33, 0, z), seg=12, mseg=4)   # the elbow folds
                ring(0.08, 0.015, steel, (s * 0.33, 0, 0.574), seg=12, mseg=4)                            # the glove's lock ring
                ball(0.036, p['char'], (s * 0.275, -0.06, 0.53), seg=8)                                   # the thumb
                disc(0.04, 0.02, p['cream2'], (s * 0.407, 0, 0.815), 'x', verts=12)                      # the colony patch
                disc(0.029, 0.01, a, (s * 0.415, 0, 0.815), 'x', verts=12)
            if G and s == 1:   # the computer on the left forearm (lower and shorter under the elbow folds)
                cz, ch, sh = (0.622, 0.075, 0.047) if S else (0.63, 0.09, 0.058)
                rbox(0.085, 0.035, ch, 0.012, p['char'], (0.33, -0.095, cz), seg=2)
                rbox(0.064, 0.006, sh, 0.005, p['teal'], (0.33, -0.114, cz + (ch - sh) / 2), seg=1)
    with part(fig, 'body'):
        rbox(0.5, 0.36, 0.6, 0.17, p['cream'], (0, 0, 0.44), seg=3)
        rprism(0.512, 0.372, 0.05, 0.176, p['orange'], (0, 0, 0.63), seg=4)
        if S:      # the display and control module: a screen, a row of buttons and two knobs
            rbox(0.25, 0.07, 0.15, 0.035, p['char'], (0, -0.165, 0.74), seg=2)
            rbox(0.11, 0.01, 0.04, 0.008, p['teal'], (-0.045, -0.2, 0.835), seg=1)
            for bx in (-0.085, -0.045, -0.005): ball(0.011, p['cream2'], (bx, -0.198, 0.785), seg=6)
            disc(0.024, 0.02, p['orange'], (0.065, -0.205, 0.79), 'y', verts=10)
            disc(0.018, 0.02, a, (0.065, -0.205, 0.85), 'y', verts=10)
        else:
            rbox(0.2, 0.05, 0.12, 0.03, p['char'], (0, -0.172, 0.77), seg=2)
            ball(0.022, p['teal'], (-0.05, -0.2, 0.845), seg=6)
            ball(0.024, a, (0.045, -0.2, 0.805), seg=6)
            rbox(0.07, 0.012, 0.022, 0.006, p['cream2'], (0.04, -0.199, 0.855), seg=1)
        if F:      # the name tape in the profession colour
            rbox(0.14, 0.012, 0.03, 0.008, a, (0, -0.176, 0.9), seg=1)
        if G:      # a tool belt with a pouch
            rprism(0.49, 0.355, 0.04, 0.17, p['char'], (0, 0, 0.535), seg=3)
            rbox(0.08, 0.045, 0.075, 0.015, p['cream2'], (0.15, -0.165, 0.475), seg=2)
            rbox(0.084, 0.05, 0.022, 0.01, a, (0.15, -0.166, 0.53), seg=1)
        # the life support on the back
        rbox(0.36, 0.19, 0.06, 0.03, p['char'], (0, 0.27, 0.47), seg=2)
        rbox(0.38, 0.2, 0.5, 0.08, p['cream2'], (0, 0.27, 0.5), seg=3)
        rprism(0.39, 0.21, 0.06, 0.085, a, (0, 0.27, 0.86), seg=3)
        cyl(0.04, 0.05, p['cream'], (0.09, 0.28, 0.99), bev=0.012, verts=8, seg=2)
        ball(0.055, p['char'], (0.09, 0.28, 1.05), (1, 1, 0.55), seg=8)
        if S:      # a vent grille and three status lights
            for z in (0.6, 0.632, 0.664): rbox(0.18, 0.012, 0.014, 0.005, p['char'], (0, 0.37, z), seg=1)
            for lx, m in ((-0.06, p['teal']), (0.0, p['orange']), (0.06, p['teal'])): ball(0.016, m, (lx, 0.372, 0.77), seg=6)
        else:
            ball(0.024, p['teal'], (-0.1, 0.372, 0.74), seg=6)
        if G:      # two air tanks on brackets, with charge strips like the batteries
            for s in (1, -1):
                cyl(0.06, 0.42, p['cream'], (s * 0.245, 0.3, 0.5), bev=0.05, verts=12, seg=2)
                cyl(0.04, 0.035, a, (s * 0.245, 0.3, 0.92), bev=0.01, verts=10, seg=1)
                rbox(0.022, 0.01, 0.24, 0.005, p['teal'], (s * 0.245, 0.358, 0.58), seg=1)
                for bz in (0.58, 0.82): rbox(0.07, 0.04, 0.03, 0.01, p['char'], (s * 0.2, 0.3, bz), seg=1)
        for s in (1, -1):
            hose([(s * 0.12, 0.3, 0.97), (s * 0.15, 0.3, 1.06), (s * 0.16, 0.2, 1.1), (s * 0.15, 0.1, 1.07)], 0.02, p['char'])
        # the collar and the helmet
        cyl(0.215, 0.07, p['cream2'], (0, 0, 1.0), bev=0.02, verts=16, seg=2)
        ring(0.215, 0.03, p['orange'], (0, 0, 1.065), seg=16, mseg=5)
        if S: ring(0.222, 0.017, steel, (0, 0, 1.092), seg=16, mseg=4)          # the ring the helmet locks onto
        keep(ball(0.337, p['cream'], (0, 0, 1.36), seg=20), lambda c: c.y > 0.03)
        ball(0.028, p['teal'], (0, 0.18, 1.655), seg=6)
        if S:      # the frame round the front of the helmet, down to the neck ring, with a lamp on each side
            keep(ring(0.336, 0.019, p['cream2'], (0, 0.03, 1.36), (math.pi / 2, 0, 0), seg=28, mseg=5), lambda c: c.y > -0.26)
            for s in (1, -1):
                rbox(0.055, 0.08, 0.06, 0.02, p['char'], (s * 0.337, 0.03, 1.44), seg=2)
                disc(0.021, 0.01, p['lampw'], (s * 0.337, -0.012, 1.47), 'y', verts=10)
        if v == 3:      # the gold sun visor, pushed up (not in the combination: Joro, 21.11.2026)
            keep(ball(0.342, mat('goldtint', '#e8a53a', 0.15, alpha=0.6), (0, 0, 1.36), seg=24), lambda c: c.y < 0.03 and c.z > 1.5)
        if G:           # a lamp on top: on the shell, or on the frame when there is one
            ly, lz = (0.03, 1.705) if S else (0.06, 1.685)
            rbox(0.09, 0.07, 0.05, 0.02, p['char'], (0, ly, lz), seg=2)
            disc(0.026, 0.01, p['lampw'], (0, ly - 0.04, lz + 0.025), 'y', verts=10)
        # the face
        ball(0.2, skn, (0, -0.01, 1.3), (1, 0.95, 1.05), seg=20)
        for s in (1, -1):
            if F:  # eyes with whites, a dark iris and a glint; the brows in the hair colour
                ex, ez = s * 0.068, 1.318
                ball(0.031, white, (ex, fy(ex, ez, -0.012), ez), (1, 0.55, 1.15), seg=10)
                ball(0.019, x['eye'], (ex * 1.03, fy(ex, ez, 0.002), ez - 0.002), (1, 0.5, 1.1), seg=8)
                ball(0.006, glint, (ex * 1.03 - 0.006, fy(ex, ez, 0.008), ez + 0.008), seg=6)
                on_face([(s * 0.03, 1.383), (s * 0.065, 1.391), (s * 0.1, 1.382)], 0.0085, har, 0.004)
            else:
                ball(0.024, x['eye'], (s * 0.07, -0.192, 1.315), seg=10)
            disc(0.05, 0.035, p['char'], (s * 0.2, 0.0, 1.3), 'x')
        if F:      # the nose, a small smile and the radio microphone
            ball(0.024, skn, (0, fy(0, 1.28, -0.008), 1.28), (0.9, 0.75, 1.0), seg=8)
            on_face([(0.034 * math.cos(t), 1.245 + 0.034 * math.sin(t)) for t in [math.radians(d) for d in range(205, 340, 15)]], 0.0065, lip, 0.004)
            hose([(0.19, -0.045, 1.27), (0.165, -0.14, 1.235), (0.11, fy(0.11, 1.225, 0.03), 1.225), (0.078, fy(0.078, 1.225, 0.028), 1.225)], 0.0065, p['char'])
            ball(0.013, p['char'], (0.078, fy(0.078, 1.225, 0.028), 1.225), seg=6)
    # the hair: v2 gives it a side parting and some volume
    def cap(rot=(-0.5, 0, 0)):
        h = dome(0.214, har, (0, 0.012, 1.33), seg=20, sz=0.95); h.rotation_euler = rot
    if want('hair_short'):
        with into('hair_short'):
            if F: cap((-0.42, 0.22, 0))     # a side parting
            else: cap()
    if want('hair_bun'):
        with into('hair_bun'):
            cap((-0.45, -0.12, 0) if F else (-0.5, 0, 0)); ball(0.075, har, (0, 0.13, 1.53), seg=8)
            if F: ring(0.05, 0.012, a, (0, 0.1, 1.5), (math.radians(-35), 0, 0), seg=10, mseg=4)   # a hair tie
    if want('hair_full'):
        with into('hair_full'):
            cap((-0.4, -0.18, 0) if F else (-0.5, 0, 0)); ball(0.2, har, (0, 0.075, 1.27), (1.06, 0.72, 1.0), seg=12)
            if F:
                for s in (1, -1): capsule(0.04, (s * 0.165, -0.085, 1.37), (s * 0.168, -0.08, 1.2), har, verts=8, seg=2)
    if want('beard'):
        with into('beard'):
            if F:
                ball(0.1, har, (0, -0.135, 1.185), (1.22, 0.6, 0.72), seg=10)
                on_face([(-0.045, 1.252), (-0.02, 1.26), (0.0, 1.258), (0.02, 1.26), (0.045, 1.252)], 0.011, har, 0.006)
            else:
                ball(0.105, har, (0, -0.14, 1.2), (1.25, 0.6, 0.75), seg=10)
    if want('stripe'):
        with into('stripe'): stripe_over(0.347, 0.05, 0.008, p['orange'], (0, 0, 1.36), lambda fwd, up: fwd < -0.05, seg=24)
    if want('aerial'):
        with into('aerial'):
            cyl(0.008, 0.34, p['char'], (-0.14, 0.3, 1.0), bev=0.0, verts=6)
            ball(0.022, p['teal'], (-0.14, 0.3, 1.35), seg=6)
    if G:          # the tool of the profession, hung from the belt on the right hip
        tx, ty = -0.165, -0.19
        loop = lambda: ring(0.02, 0.006, p['char'], (tx, ty + 0.004, 0.548), (math.pi / 2, 0, 0), seg=10, mseg=4)
        if want('tool_hammer'):     # the geologist's hammer, head down
            with into('tool_hammer'):
                cyl(0.012, 0.2, p['wood'], (tx, ty, 0.355), bev=0.004, verts=8, seg=1)
                rbox(0.1, 0.032, 0.035, 0.008, steel, (tx, ty, 0.335), seg=1); loop()
        if want('tool_wrench'):     # the engineer's wrench
            with into('tool_wrench'):
                rbox(0.024, 0.012, 0.17, 0.005, steel, (tx, ty, 0.39), seg=1)
                ring(0.028, 0.011, steel, (tx, ty, 0.375), (math.pi / 2, 0, 0), seg=12, mseg=4); loop()
        if want('tool_trowel'):     # the agronomist's trowel
            with into('tool_trowel'):
                cyl(0.014, 0.09, p['wood'], (tx, ty, 0.465), bev=0.005, verts=8, seg=1)
                ball(0.05, steel, (tx, ty, 0.42), (0.7, 0.18, 1.1), seg=10); loop()
        if want('tool_ladle'):      # the cook's ladle
            with into('tool_ladle'):
                cyl(0.008, 0.16, steel, (tx, ty, 0.4), bev=0.0, verts=6)
                ball(0.04, steel, (tx, ty, 0.39), (1, 1, 0.6), seg=10); loop()
        if want('tool_tablet'):     # the scientist's tablet in a holster
            with into('tool_tablet'):
                rbox(0.1, 0.016, 0.13, 0.012, p['char'], (tx, ty, 0.4), seg=2)
                rbox(0.08, 0.004, 0.1, 0.006, p['teal'], (tx, ty - 0.009, 0.415), seg=1)
    # the glass last, so it is the last piece of the body
    with part(fig, 'body'):
        ball(0.33, x['suitglass'], (0, 0, 1.36), seg=20)
    return fig, PERSON_PIV

def vperson(p, v, look, at=(0, 0), rz=0.0, pose=None):
    name, prof, sk, hr, style, beard = look
    opts = {'hair_' + style} | ({'beard'} if beard else set()) | ({'stripe', 'aerial'} if prof == 'commander' else set())
    if v in (3, 4) and prof in TOOL_OF: opts.add(TOOL_OF[prof])
    fig, piv = person(p, ACCENT[prof], sk, hr, opts) if v == 0 else person_v(p, v, ACCENT[prof], sk, hr, opts)
    return finish(fig, name, piv, at, rz, pose)

def crew5(p, v):
    """the Commander and the first four named colonists (cook, agronomist, geologist, engineer): one waves, two walk"""
    spots = [(0.0, -0.45, 0.0), (-0.95, 0.0, 0.22), (0.95, 0.05, -0.22), (-1.9, 0.4, 0.35), (1.9, 0.45, -0.35)]
    poses = [dict(arm_r=(0, 152, 0)), None, dict(leg_l=(-24, 0, 0), leg_r=(24, 0, 0), arm_l=(20, 0, 0), arm_r=(-20, 0, 0)),
             dict(arm_l=(-35, 0, 0)), dict(leg_l=(22, 0, 0), leg_r=(-22, 0, 0), arm_l=(-18, 0, 0), arm_r=(18, 0, 0))]
    for look, (px, py, rz), pose in zip(LOOKS[:5], spots, poses):
        vperson(p, v, look, (px, py), rz, pose)

def game(v):
    def f(p):
        fig, piv = person_v(p, v); finish(fig, 'colonist', piv, on_body=OPTIONAL + TOOLS)
    return f

def crew10v(p, v=4):
    """the Commander and the ten awake at level 10, in two loose rows (as crew10 in characters.py)"""
    walk = dict(leg_l=(-24, 0, 0), leg_r=(24, 0, 0), arm_l=(20, 0, 0), arm_r=(-20, 0, 0))
    walk2 = dict(leg_l=(22, 0, 0), leg_r=(-22, 0, 0), arm_l=(-18, 0, 0), arm_r=(18, 0, 0))
    spots = [(0.0, -0.75, 0.0, dict(arm_r=(0, 152, 0)))]
    for k in range(5): spots.append(((k - 2) * 0.98 + 0.49, 0.1 + abs(k - 2) * 0.12, -(k - 2) * 0.1, [None, walk, None, dict(arm_l=(-35, 0, 0)), walk2][k]))
    for k in range(5): spots.append(((k - 2) * 0.98 - 0.49, 1.05 + abs(k - 2) * 0.1, -(k - 2) * 0.08, [walk2, None, dict(arm_r=(0, 30, 0)), walk, None][k]))
    for look, (px, py, rz, pose) in zip(LOOKS[:11], spots):
        vperson(p, v, look, (px, py), rz, pose)

def echo_size4(p):
    vperson(p, 4, LOOKS[0], (-0.25, 0.0), 0.0, dict(arm_l=(0, -28, 0)))
    fig, piv = echo_final(p); finish(fig, 'echo', piv, (0.75, -0.25), 0.25, None, 1.02, on_body=('eye_l', 'eye_r'))

VJOBS = {}
# the game's model since 21.11.2026 (Joro chose the combination) and the models for the sheets (catalog.html#set=people)
VJOBS['colonist'] = game(4)
VJOBS['final-commander'] = lambda p: vperson(p, 4, LOOKS[0])
VJOBS['final-colonist'] = lambda p: vperson(p, 4, LOOKS[4])
VJOBS['final-crew'] = crew10v
VJOBS['final-echo-size'] = echo_size4
for v in range(5):
    VJOBS['v%d-commander' % v] = (lambda v: lambda p: vperson(p, v, LOOKS[0]))(v)
    VJOBS['v%d-colonist' % v] = (lambda v: lambda p: vperson(p, v, LOOKS[4]))(v)
    VJOBS['v%d-crew' % v] = (lambda v: lambda p: crew5(p, v))(v)
for v in (1, 2, 3, 4):
    VJOBS['v%d-game' % v] = game(v)

for name, fn in VJOBS.items():
    if NAMES and name not in NAMES: continue
    reset(); fn(pal())
    tris = sum(sum(len(f.vertices) - 2 for f in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    export(os.path.join(OUT, name + '.glb'))
    print('%-16s %6d triangles  %5.0f KB' % (name, tris, os.path.getsize(os.path.join(OUT, name + '.glb')) / 1024))
