"""Paints the /download page's pixel boxes as 9-slice PNGs, 1 image pixel = 1 art pixel.

Same drawing as the mobile app's PixelBoxPainter (lib/core/pixel/pixel_box.dart): ink outline,
1-px bevel (highlight top-left, shade bottom-right), stepped corners and a 45% ink drop shadow.
Run: python scripts/pixel-boxes.py  (writes public/pixel/box-*.png). Colours: tool/pixel_art/palette.json.
"""
from pathlib import Path
from PIL import Image

HEX = {
    'ink': '0D1B2A', 'slate': '414844', 'stone': '717973', 'mist': 'C1C8C2', 'paperDim': 'E3E2DF',
    'paper': 'FAF9F5', 'white': 'FFFFFF', 'greenDark': '274E3C', 'green': '3F6653', 'greenLight': 'C1ECD4',
    'amber': 'D97706', 'sun': 'FFB703', 'sunLight': 'FFDEA9', 'parchment': 'F7EBE1',
    'woodDeep': '3E1F0A', 'wood': '582F0E', 'woodMid': '7B4B27', 'red': 'BC4749', 'redDeep': '991B1B',
}
def rgb(name):
    if name == 'greenMid':  # mix green -> greenLight 45%
        a, b = rgb('green'), rgb('greenLight')
        return tuple(round(a[i] * 0.55 + b[i] * 0.45) for i in range(3))
    if name == 'redBright':  # mix red -> white 18%
        a = rgb('red')
        return tuple(round(a[i] * 0.82 + 255 * 0.18) for i in range(3))
    h = HEX[name]
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

STYLES = {  # fill, highlight, shade, outline, corner, shadowPx, bevel (PixelBoxStyle)
    'parchment': ('parchment', 'white', 'paperDim', 'ink', 2, 1, True),
    'green': ('green', 'greenMid', 'greenDark', 'ink', 2, 1, True),
    'gold': ('sun', 'sunLight', 'amber', 'ink', 2, 1, True),
    'wood': ('wood', 'woodMid', 'woodDeep', 'ink', 2, 1, True),
    'red': ('red', 'redBright', 'redDeep', 'ink', 2, 1, True),
    'slot': ('paperDim', 'white', 'mist', 'ink', 1, 0, True),
    'ink': ('ink', 'ink', 'ink', 'paper', 0, 0, False),
}
SIZE = 16  # box cols/rows before the shadow

def stepped(x, y, w, h, steps):
    s = max(0, min(steps, min(w, h) // 2))
    if s == 0:
        return [(x, y, w, h)]
    out = []
    for i in range(s):
        inset = s - i
        out += [(x + inset, y + i, w - 2 * inset, 1), (x + inset, y + h - 1 - i, w - 2 * inset, 1)]
    return out + [(x, y + s, w, h - 2 * s)]

def paint(style, pressed=False):
    fill, hi, lo, outline, corner, sh, bevel = style
    img = Image.new('RGBA', (SIZE + sh, SIZE + sh), (0, 0, 0, 0))
    px = img.load()
    def rect(x, y, w, h, steps, color):
        for rx, ry, rw, rh in stepped(x, y, w, h, steps):
            for yy in range(ry, ry + rh):
                for xx in range(rx, rx + rw):
                    px[xx, yy] = color
    o = sh if pressed else 0
    if not pressed and sh:
        rect(sh, sh, SIZE, SIZE, corner, rgb('ink') + (115,))
    rect(o, o, SIZE, SIZE, corner, rgb(outline) + (255,))
    inner = corner - 1 if corner > 0 else 0
    if bevel:
        a, b = (lo, hi) if pressed else (hi, lo)
        rect(o + 1, o + 1, SIZE - 2, SIZE - 2, inner, rgb(b) + (255,))
        rect(o + 1, o + 1, SIZE - 3, SIZE - 3, inner, rgb(a) + (255,))
        rect(o + 2, o + 2, SIZE - 4, SIZE - 4, max(inner - 1, 0), rgb(fill) + (255,))
    else:
        rect(o + 1, o + 1, SIZE - 2, SIZE - 2, inner, rgb(fill) + (255,))
    return img

out = Path(__file__).resolve().parent.parent / 'public' / 'pixel'
out.mkdir(parents=True, exist_ok=True)
for name, style in STYLES.items():
    paint(style).save(out / f'box-{name}.png')
    if style[5]:
        paint(style, pressed=True).save(out / f'box-{name}-pressed.png')
print('painted', len(STYLES), 'styles into', out)
