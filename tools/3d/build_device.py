"""Build the VitalCheer flow-control device and export models/vitalcheer-device.glb.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P tools/3d/build_device.py -- [preview.png]

Units: 1.0 = device width (~95 mm). Blender is Z-up; front faces -Y.
Named nodes used by the website: Device, Body, Lid, DoorPivot, Mechanism,
Clamp, BackPanel, Cable, Sensor, LED.
"""
import math
import bpy
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_common import (assign, cut, cyl, decal, empty, export_glb, finalize, material,  # noqa: E402
                            parent_to, rbox, reset_scene, studio_render, torus, curve_tube)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "models", "vitalcheer-device.glb")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PREVIEW = argv[0] if argv else None

reset_scene()
R = math.radians

# ---------------------------------------------------------------- materials --
M_SHELL = material("Shell", "#F3F5F4", rough=0.32, coat=0.35, coat_rough=0.12)
M_SHELL_SOFT = material("ShellSatin", "#ECEFEE", rough=0.45, coat=0.15)
M_GREY = material("ClampGrey", "#C4C9CB", rough=0.55)
M_GREY_DARK = material("GreyDark", "#9DA4A7", rough=0.5)
M_CAVITY = material("Cavity", "#2A2F31", rough=0.6)
M_MECH = material("Mechanism", "#4A5155", rough=0.32, metal=0.75)
M_MECH_DARK = material("MechanismDark", "#25292B", rough=0.4, metal=0.4)
M_BLACK = material("PortBlack", "#0E1012", rough=0.35)
M_LED = material("LED", "#1AB0FF", rough=0.25, emit="#0A9BFF", emit_strength=6)  # neon blue light bar
M_LED_RING = material("LEDRing", "#BFE9FF", rough=0.2, emit="#5CC6FF", emit_strength=6)
M_SENSOR_FACE = material("SensorFace", "#15191B", rough=0.18, coat=0.6)
M_SENSOR_WIN = material("SensorWindow", "#3A4246", rough=0.08, metal=0.2, coat=1.0)
M_BADGE = material("Badge", "#ffffff", rough=0.3, image="badge.png")
M_CROSS = material("Cross", "#ffffff", rough=0.3, image="cross.png")
M_LABEL = material("Label", "#ffffff", rough=0.5, image="label.png")
M_POWER = material("PowerIcon", "#ffffff", rough=0.3, image="power.png", emit="#5CC6FF", emit_strength=2)

W, D, H = 1.0, 0.72, 1.3
SPLIT = 1.115  # lid seam height

root = empty("Device")

# ---------------------------------------------------------------- body + lid --
body = rbox("Body", (W, D, H), (0, 0, H / 2), bevel=0.2, segs=14, mat=M_SHELL, profile=0.55)
lid = rbox("Lid", (W, D, H), (0, 0, H / 2), bevel=0.2, segs=14, mat=M_SHELL, profile=0.55)
top_cut = rbox("cut_top", (3, 3, 2), (0, 0, SPLIT + 1.0), mat=M_SHELL)
bottom_cut = rbox("cut_bottom", (3, 3, 2), (0, 0, SPLIT + 0.008 - 1.0), mat=M_SHELL)
cut(body, top_cut)
cut(lid, bottom_cut)

# side cavity on +X that holds the tubing mechanism
cav = rbox("cut_cavity", (0.26, 0.5, 0.86), (0.5, 0.01, 0.6), bevel=0.05, segs=6, mat=M_CAVITY)
cut(body, cav)
# LED recess on the front
led_cut = rbox("cut_led", (0.085, 0.04, 0.27), (0, -D / 2, 0.36), bevel=0.04, segs=8, mat=M_LED)
cut(body, led_cut)
# pill-shaped recess on the back for the port + power button
panel_cut = rbox("cut_panel", (0.62, 0.06, 0.17), (0, D / 2, 0.2), bevel=0.08, segs=10, mat=M_SHELL_SOFT)
cut(body, panel_cut)

# the light bar fills the recess flush with the front face (no dark rim)
led = rbox("LED", (0.083, 0.02, 0.268), (0, -D / 2 + 0.011, 0.36), bevel=0.04, segs=8, mat=M_LED)

badge = decal("Badge", (0.5, 0.5), (0, -D / 2 - 0.0015, 0.79), (R(90), 0, 0), M_BADGE)

# ---------------------------------------------------------------- back panel --
back = empty("BackPanel", parent=root)
usb = rbox("USBC", (0.085, 0.03, 0.03), (0.13, D / 2 - 0.02, 0.2), bevel=0.014, segs=6, mat=M_BLACK)
usb_in = rbox("USBCTongue", (0.05, 0.02, 0.008), (0.13, D / 2 - 0.01, 0.2), mat=M_GREY_DARK)
btn = cyl("PowerButton", 0.055, 0.03, (-0.15, D / 2 - 0.012, 0.2), axis="Y", mat=M_SHELL, bevel=0.01)
ring = torus("PowerRing", 0.058, 0.0055, (-0.15, D / 2 + 0.001, 0.2), rot=(R(90), 0, 0), mat=M_LED_RING)
icon = decal("PowerIcon", (0.06, 0.06), (-0.15, D / 2 + 0.0045, 0.2), (R(90), 0, R(180)), M_POWER)
for o in (usb, usb_in, btn, ring, icon):
    parent_to(o, back)

# ---------------------------------------------------------------- pole clamp --
clamp = empty("Clamp", parent=root)
cz = 0.74
parts = [
    rbox("ClampPlate", (0.34, 0.05, 0.4), (0, D / 2 + 0.02, cz - 0.03), bevel=0.04, segs=6, mat=M_GREY),
    rbox("ClampTab", (0.2, 0.05, 0.12), (0, D / 2 + 0.04, cz - 0.25), bevel=0.03, segs=6, mat=M_GREY),
    rbox("JawL", (0.12, 0.2, 0.27), (-0.1, D / 2 + 0.14, cz), bevel=0.035, segs=6, mat=M_GREY),
    rbox("JawR", (0.12, 0.2, 0.27), (0.1, D / 2 + 0.14, cz), bevel=0.035, segs=6, mat=M_GREY),
    cyl("ClampRod", 0.022, 0.42, (-0.06, D / 2 + 0.17, cz), axis="X", mat=M_GREY_DARK),
]
# serrated jaw faces
for side in (-1, 1):
    for i in range(9):
        z = cz - 0.11 + i * 0.0275
        rib = rbox(f"Rib{side}_{i}", (0.02, 0.15, 0.012), (side * 0.035, D / 2 + 0.15, z),
                   rot=(0, R(45), 0), mat=M_GREY_DARK)
        parts.append(rib)
# knurled knob
kx = -0.25
parts.append(cyl("Knob", 0.085, 0.07, (kx, D / 2 + 0.17, cz), axis="X", mat=M_GREY, bevel=0.012))
for i in range(28):
    a = 2 * math.pi * i / 28
    parts.append(rbox(f"Knurl{i}", (0.06, 0.01, 0.012),
                      (kx, D / 2 + 0.17 + math.cos(a) * 0.087, cz + math.sin(a) * 0.087),
                      rot=(a, 0, 0), mat=M_GREY))
parts.append(rbox("Phillips1", (0.004, 0.05, 0.01), (kx - 0.036, D / 2 + 0.17, cz), mat=M_GREY_DARK))
parts.append(rbox("Phillips2", (0.004, 0.01, 0.05), (kx - 0.036, D / 2 + 0.17, cz), mat=M_GREY_DARK))
parts.append(cyl("KnobCap", 0.04, 0.01, (kx - 0.034, D / 2 + 0.17, cz), axis="X", mat=M_GREY_DARK))
for p in parts:
    parent_to(p, clamp)

# ---------------------------------------------------------------- mechanism --
mech = empty("Mechanism", parent=root)
mx = 0.43
mparts = [
    rbox("Track", (0.04, 0.07, 0.8), (mx, 0.0, 0.6), bevel=0.012, mat=M_MECH),
    rbox("BeltL", (0.012, 0.02, 0.7), (mx + 0.01, -0.14, 0.6), mat=M_MECH_DARK),
    rbox("BeltR", (0.012, 0.02, 0.7), (mx + 0.01, 0.16, 0.6), mat=M_MECH_DARK),
]
for i in range(8):
    mparts.append(rbox(f"Finger{i}", (0.05, 0.11, 0.06), (mx + 0.005, 0.08, 0.27 + i * 0.09),
                       bevel=0.01, mat=M_MECH))
for j, z in enumerate((0.28, 0.93)):
    mparts.append(cyl(f"Gear{j}", 0.085, 0.03, (mx + 0.012, -0.12, z), axis="X", mat=M_MECH, bevel=0.004))
    mparts.append(cyl(f"Hub{j}", 0.03, 0.05, (mx + 0.02, -0.12, z), axis="X", mat=M_MECH_DARK))
    for t in range(18):
        a = 2 * math.pi * t / 18
        mparts.append(rbox(f"Tooth{j}_{t}", (0.03, 0.022, 0.02),
                           (mx + 0.012, -0.12 + math.cos(a) * 0.092, z + math.sin(a) * 0.092),
                           rot=(a, 0, 0), mat=M_MECH))
for i in range(5):
    mparts.append(cyl(f"Screw{i}", 0.012, 0.01, (mx + 0.03, 0.2, 0.25 + i * 0.18), axis="X", mat=M_MECH))
for p in mparts:
    parent_to(p, mech)

# ---------------------------------------------------------------- side door --
hinge = (W / 2 + 0.0, 0.26, 0.6)
door_pivot = empty("DoorPivot", loc=hinge, parent=root)
door = rbox("Door", (0.03, 0.52, 0.9), (W / 2 + 0.017, 0.0, 0.6), bevel=0.014, segs=5, mat=M_SHELL)
for i in range(4):
    vent = rbox(f"cut_vent{i}", (0.1, 0.22, 0.022), (W / 2 + 0.017, 0.0, 0.94 - i * 0.05),
                bevel=0.01, segs=4, mat=M_CAVITY)
    cut(door, vent)
label = decal("Label", (0.18, 0.25), (W / 2 + 0.0335, 0.03, 0.42), (R(90), 0, R(90)), M_LABEL)
for p in (door, label):
    parent_to(p, door_pivot)
door_pivot.rotation_euler = (0, 0, R(34))

# ---------------------------------------------------------------- sensor head --
sensor = empty("Sensor", loc=(1.08, -0.78, 0.11), parent=root)
sx, sy, sz = sensor.location
s_parts = [
    rbox("SensorBody", (0.2, 0.2, 0.2), (sx, sy, sz), bevel=0.05, segs=8, mat=M_SHELL),
    rbox("SensorFace", (0.15, 0.02, 0.15), (sx, sy - 0.094, sz), bevel=0.03, segs=6, mat=M_SENSOR_FACE),
    rbox("SensorWinA", (0.04, 0.012, 0.06), (sx - 0.035, sy - 0.102, sz + 0.005), bevel=0.012, mat=M_SENSOR_WIN),
    rbox("SensorWinB", (0.04, 0.012, 0.06), (sx + 0.035, sy - 0.102, sz + 0.005), bevel=0.012, mat=M_SENSOR_WIN),
    decal("SensorCross", (0.11, 0.11), (sx + 0.1015, sy, sz), (R(90), 0, R(90)), M_CROSS),
    torus("SensorClip", 0.06, 0.011, (sx - 0.02, sy - 0.07, sz - 0.11), rot=(R(80), 0, R(15)), mat=M_GREY),
    rbox("SensorClipTab", (0.05, 0.03, 0.05), (sx - 0.02, sy - 0.05, sz - 0.085), bevel=0.012, mat=M_GREY),
    cyl("SensorStrain", 0.03, 0.06, (sx, sy + 0.12, sz), axis="Y", mat=M_SHELL, bevel=0.01),
]
for p in s_parts:
    parent_to(p, sensor)
sensor.rotation_euler = (0, 0, R(-28))

# ---------------------------------------------------------------- cable --
grommet = cyl("Grommet", 0.045, 0.05, (0.28, D / 2 + 0.02, 1.0), axis="Y", mat=M_SHELL, bevel=0.012)
bpy_points = [
    (0.28, D / 2 + 0.04, 1.0),
    (0.32, D / 2 + 0.3, 0.96),
    (0.9, 0.78, 0.72),
    (1.42, 0.35, 0.36),
    (1.45, -0.25, 0.08),
    (1.25, -0.6, 0.05),
    (1.14, -0.66, 0.1),
]
cable = curve_tube("Cable", bpy_points, 0.022, mat=M_SHELL_SOFT, resolution=32)

for o in (body, lid, led, badge, grommet, cable):
    parent_to(o, root)

finalize()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
export_glb(OUT)
print("EXPORTED", OUT)

if PREVIEW:
    studio_render(PREVIEW, cam_loc=(2.6, -4.2, 2.3), target=(0.35, 0, 0.6), lens=55)
    back_path = PREVIEW.replace(".png", "-back.png")
    bpy.context.scene.camera.location = (-2.4, 4.3, 2.2)
    bpy.context.scene.render.filepath = back_path
    import bpy as _b
    _b.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    _b.ops.render.render(write_still=True)
    print("RENDERED", PREVIEW, back_path)
