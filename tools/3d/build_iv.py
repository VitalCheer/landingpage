"""Build a realistic gravity IV set and export models/iv-set.glb.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P tools/3d/build_iv.py

Units: 1.0 = 10 cm. Blender Z-up; the camera side is -Y.
Named nodes used by the website: IVSet, Pole, Bag, BagFluid, DripChamber, Drop,
DripPool, Tube, TubeFluid, RollerClamp, ClampWheel, YSite, Patient, Cannula,
Dressing, Clipboard, Pump.
Transparent materials (BagPVC, Fluid, ChamberClear, TubePVC, Dressing ...) are
re-tuned in the browser with physical transmission.
"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_common import (assign, curve_tube, cut, cyl, decal, empty, export_glb,  # noqa: E402
                            finalize, material, parent_to, rbox, reset_scene, torus)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "tools", "3d", "out", "iv-set.glb")  # raw export; then run: npm run build:models
R = math.radians

reset_scene()

# ---------------------------------------------------------------- materials --
M_CHROME = material("Chrome", "#D9DEE0", rough=0.16, metal=1.0)
M_PVC = material("BagPVC", "#EEF6F6", rough=0.22, transmission=0.95, ior=1.5)
M_SEAL = material("BagSeal", "#F4F8F8", rough=0.45, transmission=0.6, ior=1.5)
M_FLUID = material("Fluid", "#D8F3F1", rough=0.05, transmission=1.0, ior=1.33)
M_PRINT = material("BagPrint", "#ffffff", rough=0.4, image="bag-print.png")
M_CLEAR = material("ChamberClear", "#F2F8F8", rough=0.06, transmission=1.0, ior=1.5)
M_TUBE = material("TubePVC", "#F0F7F7", rough=0.12, transmission=0.95, ior=1.5)
M_WHITE = material("PlasticWhite", "#F2F4F3", rough=0.38, coat=0.2)
M_PORT_BLUE = material("PortBlue", "#2E8FB8", rough=0.45)
M_RUBBER = material("Rubber", "#8C969A", rough=0.75)
M_JADE = material("ClampJade", "#139C8D", rough=0.4, coat=0.2)
M_CLAMP = material("ClampHousing", "#EAF3F2", rough=0.35, transmission=0.4, ior=1.5)
M_HUB = material("CannulaHub", "#3A8DDB", rough=0.25, transmission=0.5, ior=1.5)
M_STEEL = material("Steel", "#C9CED1", rough=0.25, metal=1.0)
M_SKIN = material("Skin", "#D7A487", rough=0.55)
M_SHEET = material("Sheet", "#F3F7F6", rough=0.92)
M_BLANKET = material("Blanket", "#D3ECE7", rough=0.95)
M_DRESS = material("Dressing", "#FFFFFF", rough=0.3, transmission=0.85, ior=1.4)
M_TAPE = material("Tape", "#F6F6F2", rough=0.85)
M_BOARD = material("ClipboardBoard", "#DCE6E8", rough=0.5)
M_PAPER = material("Paper", "#ffffff", rough=0.8, image="paper.png", image_alpha=False)
M_PUMP = material("PumpShell", "#DFE4E6", rough=0.45)
M_SCREEN = material("PumpScreen", "#11181B", rough=0.15, coat=0.8)

root = empty("IVSet")

# ---------------------------------------------------------------- pole --------
PX, PY = 1.75, 0.25
pole_grp = empty("Pole", parent=root)
pole_parts = [
    cyl("PoleShaft", 0.11, 11.6, (PX, PY, 3.2), mat=M_CHROME, verts=40),
    cyl("PoleCap", 0.13, 0.12, (PX, PY, 9.04), mat=M_WHITE, bevel=0.03),
    cyl("HookArm", 0.045, 1.75, (PX / 2, PY, 8.95), axis="X", mat=M_CHROME, verts=24),
    torus("Hook", 0.13, 0.03, (0.0, PY - 0.12, 8.82), rot=(0, R(90), 0), mat=M_CHROME),
    cyl("PoleCollar", 0.15, 0.2, (PX, PY, 1.0), mat=M_WHITE, bevel=0.03),
]
for p in pole_parts:
    parent_to(p, pole_grp)


# ---------------------------------------------------------------- bag ---------
def pillow(name, w, h, t, z0, N=36, M=60, offset=0.0, only_front=False, mat=None, y0=0.0):
    """Soft sealed-bag surface: zero thickness at the welded edges."""
    verts, faces, uvs, idx = [], [], [], {}

    def thick(i, j):
        a = math.sin(math.pi * i / N) ** 0.5
        b = math.sin(math.pi * j / M) ** 0.42
        return t * a * b

    sides = [("front", -1)] if only_front else [("front", -1), ("back", 1)]
    for side, sign in sides:
        for j in range(M + 1):
            for i in range(N + 1):
                edge = (i in (0, N) or j in (0, M)) and not only_front
                key = ("edge" if edge else side, i, j)
                if key in idx:
                    continue
                idx[key] = len(verts)
                verts.append((-w / 2 + w * i / N, y0 + sign * (thick(i, j) + offset), z0 + h * j / M))
                uvs.append((i / N, j / M))

        def k(ii, jj):
            edge = (ii in (0, N) or jj in (0, M)) and not only_front
            return idx[("edge" if edge else side, ii, jj)]

        for j in range(M):
            for i in range(N):
                q = [k(i, j), k(i + 1, j), k(i + 1, j + 1), k(i, j + 1)]
                faces.append(q if sign < 0 else q[::-1])

    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[me.loops[li].vertex_index]
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        assign(o, mat)
    return o


BW, BH, BT, BZ = 1.5, 2.6, 0.2, 5.62
bag_grp = empty("Bag", parent=root)
bag = pillow("BagShell", BW, BH, BT, BZ, mat=M_PVC)
fluid = pillow("BagFluid", BW * 0.92, BH * 0.93, BT * 0.86, BZ + 0.08, mat=M_FLUID)
fill_cut = rbox("cut_fill", (3, 3, 3), (0, 0, 7.55 + 1.5), mat=M_FLUID)
cut(fluid, fill_cut)
printed = pillow("BagPrintLayer", BW * 0.86, BH * 0.86, BT, BZ + 0.18, only_front=True, offset=0.006, mat=M_PRINT)

seal = rbox("BagSeal", (BW + 0.14, 0.018, BH + 0.14), (0, 0, BZ + BH / 2), bevel=0.14, segs=8, mat=M_SEAL)
seal_in = rbox("cut_seal", (BW - 0.1, 1, BH - 0.1), (0, 0, BZ + BH / 2), bevel=0.1, segs=8, mat=M_SEAL)
cut(seal, seal_in)
tab = rbox("BagTab", (0.55, 0.018, 0.5), (0, 0, BZ + BH + 0.2), bevel=0.12, segs=6, mat=M_SEAL)
hole = cyl("cut_hole", 0.1, 1, (0, 0, BZ + BH + 0.26), axis="Y", mat=M_SEAL)
cut(tab, hole)
ports = [
    cyl("PortAdmin", 0.11, 0.5, (-0.3, 0, BZ - 0.18), mat=M_SEAL, bevel=0.02),
    cyl("PortInject", 0.1, 0.36, (0.3, 0, BZ - 0.12), mat=M_SEAL, bevel=0.02),
    cyl("PortInjectCap", 0.115, 0.16, (0.3, 0, BZ - 0.36), mat=M_PORT_BLUE, bevel=0.03),
]
for p in [bag, fluid, printed, seal, tab] + ports:
    parent_to(p, bag_grp)

# ---------------------------------------------------------------- drip chamber -
CX = -0.3
ch = empty("DripChamber", loc=(CX, 0, 4.2), parent=root)
ch_parts = [
    cyl("Spike", 0.05, 0.4, (CX, 0, 5.2), mat=M_WHITE),
    cyl("SpikeHousing", 0.17, 0.32, (CX, 0, 4.98), mat=M_WHITE, bevel=0.04),
    rbox("VentCap", (0.1, 0.12, 0.14), (CX + 0.2, 0, 5.0), bevel=0.04, mat=M_WHITE),
    cyl("ChamberFlange", 0.25, 0.06, (CX, 0, 4.82), mat=M_WHITE, bevel=0.02),
    cyl("ChamberWall", 0.3, 1.3, (CX, 0, 4.15), mat=M_CLEAR, bevel=0.12, segs=6),
    cyl("DropFormer", 0.035, 0.22, (CX, 0, 4.68), mat=M_CLEAR),
    cyl("DripPool", 0.27, 0.38, (CX, 0, 3.72), mat=M_FLUID, bevel=0.08, segs=4),
    cyl("ChamberOutlet", 0.075, 0.22, (CX, 0, 3.42), mat=M_CLEAR, bevel=0.02),
]
drop = bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, location=(CX, 0, 4.5), segments=24, ring_count=12)
drop = bpy.context.object
drop.name = "Drop"
drop.scale = (1, 1, 1.25)
assign(drop, M_FLUID)
ch_parts.append(drop)
for p in ch_parts:
    parent_to(p, ch)

# ---------------------------------------------------------------- roller clamp -
CZ = 2.3
rc = empty("RollerClamp", loc=(CX, 0, CZ), parent=root)
housing = rbox("ClampHousing", (0.34, 0.3, 0.95), (CX, 0, CZ), bevel=0.05, segs=4, mat=M_CLAMP)
slot = rbox("cut_slot", (0.2, 0.5, 0.75), (CX, -0.12, CZ + 0.02), bevel=0.04, mat=M_CLAMP)
cut(housing, slot)
wheel = cyl("ClampWheel", 0.17, 0.12, (CX, -0.12, CZ + 0.12), axis="X", mat=M_JADE, bevel=0.02)
wheel_axle = empty("ClampWheelPivot", loc=(CX, -0.12, CZ + 0.12), parent=rc)
for i in range(20):
    a = 2 * math.pi * i / 20
    rib = rbox(f"WheelRib{i}", (0.12, 0.022, 0.03),
               (CX, -0.12 + math.cos(a) * 0.172, CZ + 0.12 + math.sin(a) * 0.172), rot=(a, 0, 0), mat=M_JADE)
    parent_to(rib, wheel_axle)
parent_to(wheel, wheel_axle)
parent_to(housing, rc)

# ---------------------------------------------------------------- Y-site --------
YZ = 0.95
ys = empty("YSite", loc=(CX, 0, YZ), parent=root)
y_parts = [
    cyl("YBody", 0.085, 0.5, (CX, 0, YZ), mat=M_CLEAR, bevel=0.03),
    cyl("YBranch", 0.065, 0.42, (CX + 0.13, 0, YZ + 0.2), mat=M_CLEAR, bevel=0.02),
    cyl("YValve", 0.095, 0.14, (CX + 0.25, 0, YZ + 0.37), mat=M_WHITE, bevel=0.03),
    cyl("YValveSeal", 0.06, 0.03, (CX + 0.27, 0, YZ + 0.44), mat=M_RUBBER),
]
y_parts[1].rotation_euler = (0, R(35), 0)
y_parts[2].rotation_euler = (0, R(35), 0)
y_parts[3].rotation_euler = (0, R(35), 0)
for p in y_parts:
    parent_to(p, ys)

# ---------------------------------------------------------------- patient -------
patient = empty("Patient", parent=root)
ARM_Y, ARM_Z = -0.6, -1.6


def arm_radius(x):
    t = min(1, max(0, (x + 1.0) / 8.0))
    return 0.3 + 0.13 * t


def limb(name, nx=60, na=56):
    """Tapered, slightly flattened forearm along +X (ends hidden off-frame / under the blanket)."""
    verts, faces = [], []
    for i in range(nx + 1):
        x = -1.0 + 8.0 * i / nx
        r = arm_radius(x)
        # subtle muscle swell towards the elbow
        swell = 1 + 0.06 * math.sin(math.pi * min(1, max(0, (x - 1.5) / 5.0)))
        for k in range(na):
            ang = 2 * math.pi * k / na
            verts.append((x, ARM_Y + math.cos(ang) * r * swell, ARM_Z + math.sin(ang) * r * 0.82 * swell))
    for i in range(nx):
        for k in range(na):
            a = i * na + k
            b = i * na + (k + 1) % na
            faces.append([a, b, b + na, a + na])
    faces.append(list(range(na))[::-1])
    faces.append([nx * na + k for k in range(na)])
    m = bpy.data.meshes.new(name)
    m.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(name, m)
    bpy.context.scene.collection.objects.link(o)
    return o


arm = limb("Forearm")
assign(arm, M_SKIN)

sheet = rbox("Sheet", (12, 2.5, 0.06), (2.0, -1.15, -1.98), bevel=0.03, mat=M_SHEET)  # bed edge sits just in front of the pole
blanket = rbox("Blanket", (3.4, 3.0, 0.75), (-1.55, -0.55, -1.62), bevel=0.3, segs=6, mat=M_BLANKET)
folds_tex = bpy.data.textures.new("folds", "CLOUDS")
folds_tex.noise_scale = 0.55
blk_sub = blanket.modifiers.new("smooth", "SUBSURF")
blk_sub.levels = 3
blk_sub.render_levels = 3
disp = blanket.modifiers.new("folds", "DISPLACE")
disp.texture = folds_tex
disp.strength = 0.14


def conform(name, x0, x1, y0, y1, lift, mat, nx=24, ny=18):
    """A thin film that follows the top of the forearm."""
    verts, faces = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x = x0 + (x1 - x0) * i / nx
            y = y0 + (y1 - y0) * j / ny
            r = arm_radius(x)
            dy = max(-r * 0.999, min(r * 0.999, y - ARM_Y))
            z = ARM_Z + math.sqrt(r * r - dy * dy) * 0.82 + lift
            verts.append((x, y, z))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append([a, a + 1, a + nx + 2, a + nx + 1])
    m = bpy.data.meshes.new(name)
    m.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(name, m)
    bpy.context.scene.collection.objects.link(o)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.008
    assign(o, mat)
    return o


dressing = conform("Dressing", 0.85, 1.75, ARM_Y - 0.26, ARM_Y + 0.26, 0.012, M_DRESS)
tape = conform("Tape", 0.35, 0.6, ARM_Y - 0.28, ARM_Y + 0.28, 0.02, M_TAPE, nx=8, ny=14)

SITE = (1.32, ARM_Y, ARM_Z + 0.3 * 0.82 + 0.05)
can = empty("Cannula", loc=SITE, parent=patient)
sx, sy, sz = SITE
c_parts = [
    cyl("CannulaHub", 0.06, 0.32, (sx - 0.06, sy, sz + 0.03), axis="X", mat=M_HUB, bevel=0.015),
    rbox("CannulaWings", (0.16, 0.42, 0.014), (sx + 0.02, sy, sz - 0.015), bevel=0.06, segs=6, mat=M_HUB),
    cyl("CannulaPort", 0.045, 0.1, (sx - 0.02, sy, sz + 0.1), mat=M_WHITE, bevel=0.015),
    cyl("Catheter", 0.014, 0.3, (sx + 0.22, sy, sz - 0.02), axis="X", mat=M_CLEAR),
    cyl("LuerLock", 0.075, 0.2, (sx - 0.3, sy, sz + 0.04), axis="X", mat=M_CLEAR, bevel=0.02),
]
c_parts[3].rotation_euler = (0, R(90 + 12), 0)
for i in range(6):
    c_parts.append(cyl(f"LuerRib{i}", 0.08, 0.01, (sx - 0.37 + i * 0.026, sy, sz + 0.04), axis="X", mat=M_CLEAR))
for p in c_parts:
    parent_to(p, can)
for p in (arm, sheet, blanket, dressing, tape):
    parent_to(p, patient)

# ---------------------------------------------------------------- tubing --------
tube_pts = [
    (CX, 0, 3.32),
    (CX, 0, CZ + 0.5),
    (CX, -0.04, CZ),
    (CX, 0, CZ - 0.55),
    (CX, 0, YZ + 0.3),
    (CX, 0, YZ - 0.3),
    (CX + 0.05, -0.15, -0.3),
    (CX - 0.35, -0.55, -1.05),
    (0.2, ARM_Y - 0.02, -1.3),
    (0.75, ARM_Y, -1.27),
    (sx - 0.4, sy, sz + 0.04),
]
tube = curve_tube("Tube", tube_pts, 0.05, mat=M_TUBE, resolution=28, bevel_res=6)
tube_fluid = curve_tube("TubeFluid", tube_pts, 0.032, mat=M_FLUID, resolution=28, bevel_res=4)
parent_to(tube, root)
parent_to(tube_fluid, root)

# ---------------------------------------------------------------- clipboard -----
cb = empty("Clipboard", loc=(PX + 0.75, PY - 0.12, 4.55), parent=root)
bx, by, bz = cb.location
cb_parts = [
    rbox("Board", (0.95, 0.04, 1.3), (bx, by, bz), bevel=0.05, segs=4, mat=M_BOARD),
    decal("PaperSheet", (0.82, 1.08), (bx, by - 0.022, bz - 0.06), (R(90), 0, 0), M_PAPER),
    rbox("Clip", (0.42, 0.07, 0.16), (bx, by - 0.04, bz + 0.58), bevel=0.03, mat=M_STEEL),
    torus("ClipboardHook", 0.12, 0.022, (PX + 0.13, PY - 0.05, bz + 0.72), rot=(R(90), 0, 0), mat=M_CHROME),
]
for p in cb_parts:
    parent_to(p, cb)

# ---------------------------------------------------------------- pump (ghost) -
pz = 2.3
pump = empty("Pump", loc=(PX + 0.95, PY - 0.1, pz), parent=root)
qx, qy, qz = pump.location
pp = [
    rbox("PumpBody", (1.4, 0.85, 1.15), (qx, qy, qz), bevel=0.1, segs=5, mat=M_PUMP),
    rbox("PumpScreen", (0.8, 0.02, 0.42), (qx - 0.12, qy - 0.43, qz + 0.22), bevel=0.03, mat=M_SCREEN),
    rbox("PumpCassette", (0.26, 0.05, 0.9), (qx + 0.48, qy - 0.43, qz), bevel=0.04, mat=M_WHITE),
    rbox("PumpPoleClamp", (0.35, 0.3, 0.3), (PX + 0.15, PY, pz), bevel=0.04, mat=M_PUMP),
]
for i in range(6):
    pp.append(cyl(f"PumpKey{i}", 0.05, 0.03, (qx - 0.42 + (i % 3) * 0.16, qy - 0.44, qz - 0.18 - (i // 3) * 0.14),
                  axis="Y", mat=M_WHITE, bevel=0.01))
for p in pp:
    parent_to(p, pump)

for o in (bag_grp,):
    pass

finalize(smooth_angle=45)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
export_glb(OUT)
print("EXPORTED", OUT)
