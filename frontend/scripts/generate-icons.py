"""
Regenerates every app icon — the web favicon/PWA icons in frontend/public/icons/
and the Android launcher/adaptive icons in android/app/src/main/res/ — from
one set of drawing rules, so the brand mark never drifts between platforms.

Run this again any time the brand colors or mark change (e.g. after editing
--color-marigold in src/index.css) rather than hand-editing icons in place.

Usage:
    pip install Pillow
    python3 frontend/scripts/generate-icons.py
"""
import os
from pathlib import Path

from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

MARIGOLD = (226, 87, 12, 255)
WHITE = (255, 255, 255, 255)

def make_tag_layer(w, h, notch, hole_r, hole_center):
    """The brand's own price-tag silhouette (matches the .tag-notch CSS
    clip-path used on every offer card) — white tag, punched hole shows
    marigold through it once composited onto the background."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    points = [(0, 0), (w, 0), (w, h), (notch, h), (0, h - notch)]
    d.polygon(points, fill=WHITE)
    hx, hy = hole_center
    # Punch the hole by ANDing a hole-mask into the EXISTING alpha channel
    # (not replacing it) — otherwise the transparent notch corner outside
    # the polygon gets forced opaque too, revealing black RGB(0,0,0) there.
    from PIL import ImageChops
    existing_alpha = layer.getchannel("A")
    hole_mask = Image.new("L", (w, h), 255)
    ImageDraw.Draw(hole_mask).ellipse([hx - hole_r, hy - hole_r, hx + hole_r, hy + hole_r], fill=0)
    layer.putalpha(ImageChops.multiply(existing_alpha, hole_mask))
    return layer

def rounded_square(size, radius, color):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=color)
    return img

def build_icon(canvas_size, bg_inset_ratio, rounded=True, rotate_deg=-16, tag_scale=0.52):
    """bg_inset_ratio: how much smaller the marigold square is than the full
    canvas — used to leave safe-zone padding for maskable icons (Android
    crops maskable icons into various shapes, so content must stay well
    inside the center ~80%)."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    bg_size = int(canvas_size * (1 - bg_inset_ratio))
    bg_radius = int(bg_size * 0.22)
    bg = rounded_square(bg_size, bg_radius, MARIGOLD) if rounded else Image.new("RGBA", (bg_size, bg_size), MARIGOLD)
    offset = (canvas_size - bg_size) // 2
    canvas.alpha_composite(bg, (offset, offset))

    tag_w, tag_h = int(bg_size * tag_scale), int(bg_size * tag_scale * 0.73)
    notch = int(tag_h * 0.28)
    hole_r = int(tag_h * 0.11)
    hole_center = (int(tag_w * 0.24), int(tag_h * 0.30))
    tag = make_tag_layer(tag_w, tag_h, notch, hole_r, hole_center)
    tag = tag.rotate(rotate_deg, expand=True, resample=Image.BICUBIC)

    tx = offset + (bg_size - tag.width) // 2
    ty = offset + (bg_size - tag.height) // 2 - int(bg_size * 0.02)
    canvas.alpha_composite(tag, (tx, ty))
    return canvas

out_dir = str(REPO_ROOT / "frontend" / "public" / "icons")
os.makedirs(out_dir, exist_ok=True)

# Standard (any-purpose) icons — content can safely fill most of the canvas.
for size in [192, 512]:
    build_icon(size, bg_inset_ratio=0.06).save(f"{out_dir}/icon-{size}.png")

# Maskable icons — Android applies its own shape mask, so keep a generous
# safe zone (per W3C maskable-icon spec: ~40% of the icon can be cropped).
for size in [192, 512]:
    # Smaller tag_scale so the rotated tag stays inside Android's maskable
    # "safe zone" (content should fit within the centered ~66% circle —
    # OS launchers crop maskable icons into circles/squircles/etc.).
    build_icon(size, bg_inset_ratio=0.0, rounded=False, tag_scale=0.34).save(f"{out_dir}/maskable-{size}.png")

# Apple touch icon (iOS home screen) — square, no transparency, iOS rounds it itself.
apple = build_icon(180, bg_inset_ratio=0.0, rounded=False)
apple_flat = Image.new("RGB", apple.size, (226, 87, 12))
apple_flat.paste(apple, (0, 0), apple)
apple_flat.save(f"{out_dir}/apple-touch-icon.png")

# Favicon
build_icon(64, bg_inset_ratio=0.04).save(f"{out_dir}/favicon-64.png")

print("done:", os.listdir(out_dir))

# ---- Android launcher icons -------------------------------------------
android_res = str(REPO_ROOT / "android" / "app" / "src" / "main" / "res")

# Legacy (pre-API26) launcher icons — full icon, since older launchers
# apply no consistent masking of their own.
LEGACY_DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for density, size in LEGACY_DENSITIES.items():
    d = f"{android_res}/mipmap-{density}"
    os.makedirs(d, exist_ok=True)
    build_icon(size, bg_inset_ratio=0.0, rounded=False).save(f"{d}/ic_launcher.png")
    build_icon(size, bg_inset_ratio=0.0, rounded=False).save(f"{d}/ic_launcher_round.png")

# Adaptive icon (API26+) foreground layer — transparent background, tag
# glyph only, sized to the standard 108dp-at-4x (432px) adaptive canvas,
# using the same safe-zone-scaled tag as the maskable web icons.
os.makedirs(f"{android_res}/drawable", exist_ok=True)
fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
tag_only = build_icon(432, bg_inset_ratio=0.0, rounded=False, tag_scale=0.34)
# build_icon draws its own marigold background — redraw just the tag on
# transparent instead of trying to strip the background back out.
tag_w, tag_h = int(432 * 0.34), int(432 * 0.34 * 0.73)
notch = int(tag_h * 0.28)
hole_r = int(tag_h * 0.11)
hole_center = (int(tag_w * 0.24), int(tag_h * 0.30))
tag_layer = make_tag_layer(tag_w, tag_h, notch, hole_r, hole_center).rotate(-16, expand=True, resample=Image.BICUBIC)
fg.alpha_composite(tag_layer, ((432 - tag_layer.width) // 2, (432 - tag_layer.height) // 2))
fg.save(f"{android_res}/drawable/ic_launcher_foreground.png")

os.makedirs(f"{android_res}/mipmap-anydpi-v26", exist_ok=True)
with open(f"{android_res}/mipmap-anydpi-v26/ic_launcher.xml", "w") as f:
    f.write(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/colorPrimary"/>\n'
        '    <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n'
        '</adaptive-icon>\n'
    )
with open(f"{android_res}/mipmap-anydpi-v26/ic_launcher_round.xml", "w") as f:
    f.write(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/colorPrimary"/>\n'
        '    <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n'
        '</adaptive-icon>\n'
    )

# Splash screen image (shown briefly on cold start before the page loads).
build_icon(512, bg_inset_ratio=1.0, rounded=False, tag_scale=0.34 / 0.94).save(f"{android_res}/drawable/splash_icon_tmp.png")
# Simpler: just reuse the transparent foreground tag on its own for splash.
fg.save(f"{android_res}/drawable/splash_icon.png")
os.remove(f"{android_res}/drawable/splash_icon_tmp.png")

print("android icons done:", os.listdir(f"{android_res}/mipmap-xxxhdpi"))
