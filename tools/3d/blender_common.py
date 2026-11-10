"""Shared helpers for the VitalCheer Blender build scripts (Blender 4.2+ / 5.x)."""
import math
import os

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "textures")


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def srgb(hex_color):
    """'#RRGGBB' -> linear RGB tuple."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def _set(bsdf, names, value):
    for n in names:
        if n in bsdf.inputs:
            bsdf.inputs[n].default_value = value
            return


def material(name, color="#ffffff", rough=0.4, metal=0.0, coat=0.0, coat_rough=0.08,
             emit=None, emit_strength=0.0, transmission=0.0, ior=1.45, alpha=1.0,
             image=None, image_alpha=True):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    _set(b, ["Base Color"], (*srgb(color), 1.0))
    _set(b, ["Roughness"], rough)
    _set(b, ["Metallic"], metal)
    _set(b, ["Coat Weight", "Clearcoat"], coat)
    _set(b, ["Coat Roughness", "Clearcoat Roughness"], coat_rough)
    _set(b, ["IOR"], ior)
    if transmission:
        _set(b, ["Transmission Weight", "Transmission"], transmission)
    if emit:
        _set(b, ["Emission Color", "Emission"], (*srgb(emit), 1.0))
        _set(b, ["Emission Strength"], emit_strength)
    if alpha < 1.0:
        _set(b, ["Alpha"], alpha)
    if image:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(os.path.join(TEX, image))
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        if image_alpha:
            nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    if image or alpha < 1.0 or transmission:
        for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(m, attr, val)
            except (AttributeError, TypeError):
                pass
    return m


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def rbox(name, size, loc, bevel=0.0, segs=8, mat=None, profile=0.5, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = min(bevel, min(size) / 2 - 1e-4)
        m.segments = segs
        m.profile = profile
        m.limit_method = "NONE"
    if mat:
        assign(o, mat)
    return o


def cyl(name, r, depth, loc, axis="Z", verts=48, mat=None, bevel=0.0, segs=4):
    rot = {"X": (0, math.radians(90), 0), "Y": (math.radians(90), 0, 0), "Z": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = segs
        m.limit_method = "ANGLE"
    if mat:
        assign(o, mat)
    return o


def torus(name, major, minor, loc, rot=(0, 0, 0), mat=None, seg=64, mseg=16):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc,
                                     rotation=rot, major_segments=seg, minor_segments=mseg)
    o = bpy.context.object
    o.name = name
    if mat:
        assign(o, mat)
    return o


def sphere(name, r, loc, mat=None, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=48, ring_count=24)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if mat:
        assign(o, mat)
    return o


def decal(name, size, loc, rot, mat):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(o, mat)
    return o


def cut(target, cutter, mode="DIFFERENCE"):
    m = target.modifiers.new("cut_" + cutter.name, "BOOLEAN")
    m.object = cutter
    m.operation = mode
    m.solver = "EXACT"
    try:
        m.material_mode = "TRANSFER"
    except AttributeError:
        pass
    cutter.hide_render = True
    cutter.display_type = "WIRE"
    cutter["is_cutter"] = True
    return m


def empty(name, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None)
    o.location = loc
    bpy.context.scene.collection.objects.link(o)
    if parent:
        parent_to(o, parent)
    return o


def parent_to(child, parent):
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = mw


def curve_tube(name, points, radius, mat=None, resolution=24, bevel_res=10):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = resolution
    cu.bevel_depth = radius
    cu.bevel_resolution = bevel_res
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(points) - 1)
    for bp, p in zip(sp.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        cu.materials.append(mat)
    return o


def finalize(smooth_angle=40):
    """Bake modifiers/curves into plain meshes, smooth-shade, drop cutters."""
    dg = bpy.context.evaluated_depsgraph_get()
    cutters = [o for o in bpy.data.objects if o.get("is_cutter")]
    for o in list(bpy.data.objects):
        if o.get("is_cutter") or o.type not in {"MESH", "CURVE"}:
            continue
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        if o.type == "CURVE":
            new = bpy.data.objects.new(o.name + "_m", me)
            bpy.context.scene.collection.objects.link(new)
            new.matrix_world = o.matrix_world.copy()
            new.parent = o.parent
            if o.parent:
                new.matrix_parent_inverse = o.matrix_parent_inverse.copy()
            name = o.name
            bpy.data.objects.remove(o)
            new.name = name
            o = new
        else:
            o.modifiers.clear()
            o.data = me
        try:
            o.data.shade_smooth()
        except AttributeError:
            for p in o.data.polygons:
                p.use_smooth = True
        try:
            o.data.set_sharp_from_angle(angle=math.radians(smooth_angle))
        except AttributeError:
            pass
    for c in cutters:
        bpy.data.objects.remove(c)


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_lights=False,
        export_cameras=False,
    )


def studio_render(path, cam_loc, target, lens=50, res=(1100, 900), samples=64, world="#E9EEEE"):
    scene = bpy.context.scene
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = eng
            break
        except TypeError:
            continue
    try:
        scene.eevee.taa_render_samples = samples
    except AttributeError:
        pass
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (*srgb(world), 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    scene.world = w

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = cam_loc
    tgt = bpy.data.objects.new("tgt", None)
    scene.collection.objects.link(tgt)
    tgt.location = target
    c = cam.constraints.new("TRACK_TO")
    c.target = tgt
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    scene.camera = cam

    def area(name, loc, energy, size):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.size = size
        lo = bpy.data.objects.new(name, ld)
        scene.collection.objects.link(lo)
        lo.location = loc
        t = lo.constraints.new("TRACK_TO")
        t.target = tgt
        t.track_axis = "TRACK_NEGATIVE_Z"
        t.up_axis = "UP_Y"

    area("key", (-2.5, -3.0, 3.2), 900, 3.0)
    area("fill", (3.0, -2.0, 1.5), 350, 3.0)
    area("rim", (1.0, 3.0, 3.0), 500, 2.0)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    floor = bpy.context.object
    floor.name = "floor_preview"
    assign(floor, material("floor", world, rough=0.6))
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(floor)
