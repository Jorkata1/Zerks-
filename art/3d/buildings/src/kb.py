# Helpers for building soft, detailed Zerks-X6 buildings in Blender (bpy) from KayKit parts.
# Units: KayKit metres (a base module is about 2.2 wide). Blender is Z-up; the glTF export turns it Y-up.
import bpy, bmesh, math, os
from mathutils import Vector

# where the free packs were cloned (see ../README.md)
A = os.environ.get('ZERKS_ASSETS', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets'))
KK = A + '/kaykit-warm/'
FURN = A + '/KayKit-Furniture-Bits-1.0/addons/kaykit_furniture_bits/Assets/gltf/'
REST = A + '/KayKit-Restaurant-Bits-1.0/addons/kaykit_restaurant_bits/Assets/gltf/'
CROP = A + '/qs/public/glb/crops_pack/'

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

# ---------- materials ----------
MATS = {}
def mat(name, color, rough=0.75, emit=None, strength=1.5, alpha=1.0, metal=0.0):
    key = (name,)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    c = tuple(int(color[i:i+2], 16) / 255 for i in (1, 3, 5))
    srgb = lambda x: (x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    b.inputs['Base Color'].default_value = (*[srgb(x) for x in c], 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        e = tuple(int(emit[i:i+2], 16) / 255 for i in (1, 3, 5))
        b.inputs['Emission Color'].default_value = (*[srgb(x) for x in e], 1)
        b.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: m.blend_method = 'BLEND'
        m.use_backface_culling = False
    MATS[key] = m
    return m

def P():
    return dict(
        cream=mat('cream', '#fbf1e3', 0.7), cream2=mat('cream2', '#efdcc4', 0.75), orange=mat('orange', '#ff8b3d', 0.6),
        char=mat('charcoal', '#4a3f38', 0.7), grey=mat('warmgrey', '#b9aa9a', 0.7), teal=mat('tealglow', '#3ee0c0', 0.4, emit='#3ee0c0', strength=2.0),
        tealsoft=mat('teal', '#22c19b', 0.55), glass=mat('glass', '#c8f5ef', 0.05, alpha=0.36), glassb=mat('glassblue', '#a8dcff', 0.05, alpha=0.32),
        water=mat('water', '#4fb8ff', 0.15, alpha=0.75), steam=mat('steam', '#ffffff', 0.9, alpha=0.8), leaf=mat('leaf', '#5fcf55', 0.65),
        leaf2=mat('leaf2', '#8fe36a', 0.65), soil=mat('soil', '#8a5a3c', 0.95), fire=mat('fire', '#ffb04a', 0.4, emit='#ff8a2a', strength=4.0),
        lamp=mat('lamp', '#fff1c8', 0.3, emit='#ffe08a', strength=3.0), ice=mat('ice', '#d9f3ff', 0.2, alpha=0.85), quartz=mat('quartz', '#f2e6ff', 0.25),
        solar=mat('solar', '#3a6fd8', 0.3), red=mat('redlight', '#ff6a4a', 0.4, emit='#ff6a4a', strength=2.5), wood=mat('wood', '#d9a066', 0.8),
        bed=mat('bedsheet', '#7fc8ff', 0.85), pillow=mat('pillow', '#ffffff', 0.9))

# ---------- objects ----------
def _done(o, m=None, smooth=True):
    if m is not None:
        o.data.materials.clear(); o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o

def _apply(o):
    bpy.context.view_layer.objects.active = o
    for mod in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)

def rbox(w, d, h, r, m, loc=(0, 0, 0), rot=(0, 0, 0), seg=4):
    """rounded box, w along x, d along y, h up; loc = centre of the bottom face"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], loc[2] + h / 2), rotation=rot)
    o = bpy.context.object; o.scale = (w, d, h); bpy.ops.object.transform_apply(scale=True)
    r = min(r, w / 2.05, d / 2.05, h / 2.05)
    bv = o.modifiers.new('b', 'BEVEL'); bv.width = r; bv.segments = seg; bv.limit_method = 'NONE'
    _apply(o)
    return _done(o, m)

def cyl(r, h, m, loc=(0, 0, 0), rot=(0, 0, 0), bev=None, verts=40, seg=4):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(loc[0], loc[1], loc[2] + h / 2), rotation=rot)
    o = bpy.context.object
    bev = min(bev if bev is not None else r * 0.25, h / 2.05, r * 0.9)
    if bev > 0.001:
        bv = o.modifiers.new('b', 'BEVEL'); bv.width = bev; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
        _apply(o)
    return _done(o, m)

def ball(r, m, loc=(0, 0, 0), scale=(1, 1, 1), seg=28):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = bpy.context.object; o.scale = scale; bpy.ops.object.transform_apply(scale=True)
    return _done(o, m)

def dome(r, m, loc=(0, 0, 0), seg=32, sz=1.0):
    """half sphere standing on loc"""
    o = ball(r, m, (0, 0, 0), (1, 1, sz), seg)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.location = loc
    return o

def torus(R, r, m, loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=40, minor_segments=12, location=loc, rotation=rot)
    return _done(bpy.context.object, m)

def tube(points, r, m):
    """a soft pipe through points (list of xyz)"""
    cu = bpy.data.curves.new('pipe', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for i, p in enumerate(points): sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new('pipe', cu); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    return _done(o, m)

def imp(path, loc=(0, 0, 0), rz=0, s=1.0, round_w=None, keep_mats=True):
    """import a glTF/GLB, join it into one mesh, soften its edges, place it"""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']; empties = [o.name for o in new if o.type != 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    o = bpy.context.object
    # clear parents but keep the transform, drop empties
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for n in empties:
        if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.scale = (s, s, s); o.rotation_euler = (0, 0, rz); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.location = loc
    if round_w is not None: soften(o, round_w)
    return o

def soften(o, w, seg=3, angle=30, sub=0):
    """take the sharp edges off: merge the split vertices, bevel every edge sharper than `angle`, shade smooth"""
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0008)
    bm.to_mesh(o.data); bm.free()
    bv = o.modifiers.new('soft', 'BEVEL'); bv.width = w; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(angle)
    bv.harden_normals = False; bv.use_clamp_overlap = True
    _apply(o)
    if sub:
        ss = o.modifiers.new('sub', 'SUBSURF'); ss.levels = sub; ss.render_levels = sub
        ss.uv_smooth = 'PRESERVE_BOUNDARIES'; ss.boundary_smooth = 'PRESERVE_CORNERS'
        _apply(o)
    for p in o.data.polygons: p.use_smooth = True
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(60))
        _apply(o)
    except Exception:
        pass
    return o

def split_faces(o, test, m):
    """move the faces where test(face_centre, uv_swatch) is true into their own object with material m"""
    me = o.data; uv = me.uv_layers.active.data
    bpy.context.view_layer.objects.active = o
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    uvl = bm.loops.layers.uv.active
    sel = []
    for f in bm.faces:
        u = sum(l[uvl].uv.x for l in f.loops) / len(f.loops); v = sum(l[uvl].uv.y for l in f.loops) / len(f.loops)
        if test(o.matrix_world @ f.calc_center_median(), (int(u * 8), int((1 - v) * 4))): sel.append(f)
    for f in bm.faces: f.select = f in sel
    bm.to_mesh(me); bm.free()
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    parts = [x for x in bpy.context.selected_objects if x != o]
    for p in parts: _done(p, m)
    return parts[0] if parts else None

def bbox(o):
    cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector((min(c.x for c in cs), min(c.y for c in cs), min(c.z for c in cs))), Vector((max(c.x for c in cs), max(c.y for c in cs), max(c.z for c in cs)))

def puff(loc, s, m):
    """a soft cloud of steam: three overlapping balls"""
    for dx, dy, dz, k in [(0, 0, 0, 1), (s * 0.5, s * 0.2, s * 0.25, 0.75), (-s * 0.45, -s * 0.1, s * 0.35, 0.7)]:
        ball(s * k, m, (loc[0] + dx, loc[1] + dy, loc[2] + dz), seg=20)

def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True, use_selection=False,
                              export_image_format='AUTO', export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
