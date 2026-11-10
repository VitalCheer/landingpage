"""Generate the decal textures used by the Blender models.

Run with the system Python (needs Pillow):
    python tools/3d/make_textures.py
"""
import os
import random

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "textures")
os.makedirs(OUT, exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"


def gradient_text(size, text, font, c1, c2):
    """Text filled with a left-to-right gradient, on transparency."""
    w, h = size
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).text((w // 2, h // 2), text, font=font, fill=255, anchor="mm")
    grad = Image.new("RGBA", size)
    gd = ImageDraw.Draw(grad)
    for x in range(w):
        t = x / max(1, w - 1)
        col = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        gd.line([(x, 0), (x, h)], fill=col + (255,))
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


# --- Front badge: logo mark + "VitalCheer" wordmark --------------------------
logo = Image.open(os.path.join(ROOT, "images", "logo.png")).convert("RGBA")
badge = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
mark = logo.copy()
mark.thumbnail((560, 560), Image.LANCZOS)
badge.alpha_composite(mark, ((1024 - mark.width) // 2, 40))
word = gradient_text(
    (1024, 260), "VitalCheer", ImageFont.truetype(FONT_BOLD, 196),
    (14, 150, 140), (9, 92, 98),
)
badge.alpha_composite(word, (0, 40 + mark.height + 10))
badge.save(os.path.join(OUT, "badge.png"))

# --- Medical cross outline for the sensor head --------------------------------
cross = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
cd = ImageDraw.Draw(cross)
arm, w = 70, 36
pts = [
    (128 - w, 128 - arm), (128 + w, 128 - arm), (128 + w, 128 - w), (128 + arm, 128 - w),
    (128 + arm, 128 + w), (128 + w, 128 + w), (128 + w, 128 + arm), (128 - w, 128 + arm),
    (128 - w, 128 + w), (128 - arm, 128 + w), (128 - arm, 128 - w), (128 - w, 128 - w),
]
cd.polygon(pts, outline=(214, 40, 52, 255), width=12)
cd.line([(84, 132), (108, 132), (118, 104), (132, 160), (144, 124), (172, 124)],
        fill=(214, 40, 52, 255), width=9, joint="curve")
cross.save(os.path.join(OUT, "cross.png"))

# --- Product label with a decorative (non-functional) QR-style pattern -------
random.seed(7)
label = Image.new("RGBA", (512, 720), (0, 0, 0, 0))
ld = ImageDraw.Draw(label)
ld.rounded_rectangle([0, 0, 511, 719], radius=28, fill=(250, 251, 250, 255))
n, cell, ox, oy = 25, 17, 43, 50
for r in range(n):
    for c in range(n):
        finder = (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)
        if finder:
            rr, cc = r % 18 if r >= n - 7 else r, c % 18 if c >= n - 7 else c
            on = rr in (0, 6) or cc in (0, 6) or (2 <= rr <= 4 and 2 <= cc <= 4)
        else:
            on = random.random() < 0.5
        if on:
            ld.rectangle([ox + c * cell, oy + r * cell, ox + (c + 1) * cell - 1, oy + (r + 1) * cell - 1],
                         fill=(20, 24, 26, 255))
ld.text((256, 560), "VitalCheer", font=ImageFont.truetype(FONT_BOLD, 52), fill=(20, 24, 26, 255), anchor="mm")
ld.text((256, 626), "VC / 001", font=ImageFont.truetype(FONT_REG, 40), fill=(80, 88, 90, 255), anchor="mm")
label.save(os.path.join(OUT, "label.png"))

# --- Power icon for the back button -------------------------------------------
power = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
pd = ImageDraw.Draw(power)
pd.arc([58, 62, 198, 202], start=-60, end=240, fill=(120, 200, 255, 255), width=16)
pd.line([(128, 44), (128, 126)], fill=(120, 200, 255, 255), width=16)
power.save(os.path.join(OUT, "power.png"))

# --- IV bag print: graduations + generic label ---------------------------------
bag = Image.new("RGBA", (512, 768), (0, 0, 0, 0))
bd = ImageDraw.Draw(bag)
ink = (24, 96, 104, 235)
f_small = ImageFont.truetype(FONT_REG, 26)
for i, ml in enumerate(range(100, 1000, 100)):
    y = 690 - i * 66
    long = ml % 200 == 0
    bd.line([(40, y), (40 + (70 if long else 44), y)], fill=ink, width=5)
    if long:
        bd.text((124, y), str(ml), font=f_small, fill=ink, anchor="lm")
bd.rounded_rectangle([210, 210, 470, 420], radius=14, outline=ink, width=4)
bd.text((340, 262), "1000 ml", font=ImageFont.truetype(FONT_BOLD, 44), fill=ink, anchor="mm")
for k, wdt in enumerate((200, 170, 190, 130)):
    bd.line([(240, 318 + k * 22), (240 + wdt, 318 + k * 22)], fill=ink, width=6)
bag.save(os.path.join(OUT, "bag-print.png"))

# --- Clipboard paper -----------------------------------------------------------
paper = Image.new("RGBA", (512, 680), (248, 250, 249, 255))
pdr = ImageDraw.Draw(paper)
for k in range(14):
    y = 90 + k * 40
    pdr.line([(48, y), (464 - (k * 37) % 140, y)], fill=(70, 110, 112, 255), width=5)
pdr.rectangle([48, 30, 300, 58], fill=(20, 140, 132, 255))
paper.save(os.path.join(OUT, "paper.png"))

print("textures written to", OUT)
