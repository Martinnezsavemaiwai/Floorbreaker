"""Turn ChatGPT pixel-art images (on a flat #FF00FF background) into game-ready sprites.

    python scripts/import_art.py              # rebuild every sprite listed in SPRITES below
    python scripts/import_art.py slinger      # just one

character: poses in a 4-column grid (columns = down, up, left, right). Either a full sheet (rows 1-4 walk,
  row 5 attack) or a single row of standing poses (a turnaround): then the walk is faked with a 1 px bob.
  Packed into the layout the game reads: 4 x 7 square cells (rows 1-4 walk, row 5 attack, rows 6-7 empty).
  attack=False fills row 5 with the standing pose (the player: the game draws its sword separately).
beast: two side-view frames facing left -> a 2-cell strip.
item: one drawing cropped to its outline, `size` = its longer side in px.
pieces: several separate drawings in one image (read left to right, top to bottom) -> <name>-1.png, -2.png...
  all scaled by the same factor so the largest is `size` px on its longer side.
texture: a full-frame tileable texture -> a `size` px square (or `size` px tall strip with `wide`), edges
  blended so it repeats without a seam.
fog: white mist on black -> white with the brightness as transparency (soft, not pixel art).
scene: a full-frame picture (title key art) -> exactly `size` x `h` px, cut to SCENE_COLORS colours; the game
  draws it at 2x with smoothing off, so a 480 x 320 scene fills the 960 x 640 canvas on a 2 px grid.

`size` for characters/beasts is the cell size: pick 16 x the scale the game draws that sprite at, so it shows
1:1 (48 for normal mobs at x3, 62 for the x1.3 guardians, 31 for x0.65 swarms, 16 x boss scale for bosses).
Each sheet is cut to its own COLORS colours. Needs Pillow (pip install pillow).
"""
import sys
from PIL import Image

COLORS = 32  # colours kept per sheet

# name: (kind, size, options) -> art-src/<name>.png becomes public/assets/<name>.png
SPRITES = {
    'player': ('character', 48, {'src': '2.2', 'attack': False}),
    'merchant': ('character', 48, {}), 'slinger': ('character', 48, {}),
    'taurus': ('character', 48, {}), 'javelin': ('character', 48, {}), 'guardian': ('character', 62, {}),
    'elf': ('character', 48, {}), 'mage': ('character', 48, {}), 'knight': ('character', 62, {}),
    'wraith': ('character', 48, {}), 'tideguard': ('character', 62, {}),
    'boss1': ('character', 144, {}), 'boss2': ('character', 160, {}), 'boss4': ('character', 176, {}),
    'boar': ('beast', 48, {}), 'tidalboar': ('beast', 48, {}),
    'piglet': ('beast', 31, {}), 'shadowpig': ('beast', 31, {}), 'crab': ('beast', 31, {}),
    'sword': ('item', 42, {}),
    # scenery
    'ground-1': ('texture', 192, {}), 'ground-2': ('texture', 192, {}), 'ground-3': ('texture', 192, {}),
    'ground-4': ('texture', 192, {}), 'town': ('texture', 192, {}), 'bossroom': ('texture', 192, {}),
    'wall': ('texture', 192, {}), 'water': ('texture', 192, {}), 'road': ('texture', 160, {'wide': True, 'clear_green': True}),
    'tree-big': ('item', 128, {}), 'tree-dark': ('item', 128, {}), 'tree-small': ('item', 80, {}),
    'fountain': ('item', 132, {}), 'treant': ('item', 224, {}),
    'patches': ('pieces', 150, {}), 'deco': ('pieces', 40, {}),
    'fog': ('fog', 640, {}),
    # optional: the game draws its own doorway until these exist (see OPTIONAL in src/core/assets.ts)
    'door': ('item', 118, {}), 'door-boss': ('item', 118, {}),
    'shrine': ('item', 80, {}), 'portal': ('item', 112, {}),
    'title-art': ('scene', 480, {'h': 320}),
    # icons: one row each, left to right in the order of ICONS in src/core/assets.ts
    'icons-arts': ('pieces', 28, {}), 'icons-upgrades': ('pieces', 28, {}), 'icons-elements': ('pieces', 28, {}),
    'house': ('item', 220, {}), 'stall': ('item', 150, {}),
    'town-props': ('pieces', 64, {}),  # barrel crate sacks bench lamp / board planter hay mooring cart -> town-props-1..10
    'bird': ('beast', 20, {}), 'gull': ('beast', 24, {}),
    'boss-gate': ('item', 120, {}), 'pillar': ('item', 175, {}), 'pillar-cracked': ('item', 175, {}), 'torch': ('item', 40, {}),
    'rock': ('item', 34, {}), 'root-sprout': ('beast', 34, {}), 'lanterns': ('item', 220, {}),
    'coin': ('pieces', 12, {}), 'xp-orb': ('pieces', 12, {}),  # 4-frame spin / pulse, left to right
    'potion': ('item', 16, {}), 'platform': ('item', 128, {}), 'moss': ('item', 80, {}),
    'icons-shop': ('pieces', 28, {}),  # potion, skill scroll, element mod -> icons-shop-1..3
    'icons-shrine': ('pieces', 28, {}),  # blood, gold, curse, potion (SHRINE_IDS order) -> icons-shrine-1..4
    'shots': ('pieces', 40, {}),  # left to right: stone, javelin, magic bolt, water drop -> shots-1..4
    'folk-1': ('character', 48, {'attack': False}), 'folk-2': ('character', 48, {'attack': False}), 'folk-3': ('character', 48, {'attack': False}),
}


def is_bg(p):  # the magenta background, including the anti-aliased fringe ChatGPT leaves around it
    r, g, b = p[:3]
    return r > 150 and b > 150 and g < 110


def cut_out(img):
    """RGBA copy with the background made transparent."""
    img = img.convert('RGBA')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            if is_bg(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return img


def blobs(img, step=4):
    """Bounding boxes of the separate drawings (coarse grid flood fill; nearby parts like a sword merge in)."""
    a = img.getchannel('A')
    w, h = img.width // step, img.height // step
    small = a.resize((w, h), Image.Resampling.BOX).point(lambda v: 255 if v > 20 else 0).load()
    seen, boxes = set(), []
    for sy in range(h):
        for sx in range(w):
            if small[sx, sy] and (sx, sy) not in seen:
                stack, xs, ys = [(sx, sy)], [], []
                seen.add((sx, sy))
                while stack:
                    x, y = stack.pop(); xs.append(x); ys.append(y)
                    for nx in range(x - 2, x + 3):  # 2-cell reach bridges small gaps (sword tip, hair strands)
                        for ny in range(y - 2, y + 3):
                            if 0 <= nx < w and 0 <= ny < h and small[nx, ny] and (nx, ny) not in seen:
                                seen.add((nx, ny)); stack.append((nx, ny))
                boxes.append((min(xs) * step, min(ys) * step, (max(xs) + 1) * step, (max(ys) + 1) * step))
    tallest = max(b[3] - b[1] for b in boxes)
    return [b for b in boxes if b[3] - b[1] > tallest * 0.3]  # drop stray specks


def grid(boxes, cols=4):
    """Sort boxes into rows of `cols` by their centres."""
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    rows = [boxes[i:i + cols] for i in range(0, len(boxes), cols)]
    return [sorted(r, key=lambda b: (b[0] + b[2]) / 2) for r in rows]


def snap(img):
    """Hard alpha, then every pixel to one of the image's own COLORS colours (median cut, no dithering)."""
    alpha = img.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    out = img.convert('RGB').quantize(COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    out.putalpha(alpha)
    return out


def place(sheet, part, x, y, cell):
    """Paste a scaled pose into a cell: centred, feet on the bottom edge (shrunk if it would overflow)."""
    if part.width > cell or part.height > cell:
        part.thumbnail((cell, cell), Image.Resampling.NEAREST)
    sheet.alpha_composite(part, (x + (cell - part.width) // 2, y + cell - part.height))


def scaled(img, box, k):
    part = img.crop(box)
    return part.resize((max(1, round(part.width * k)), max(1, round(part.height * k))), Image.Resampling.BOX)


def character(src, dst, cell, attack=True):
    img = cut_out(Image.open(src))
    rows = grid(blobs(img))
    if any(len(r) != 4 for r in rows):
        sys.exit(f'{src}: expected 4 poses per row, found {[len(r) for r in rows]}')
    walk = rows[:4] if len(rows) >= 4 else rows[:1] * 4
    bob = [0] * 4 if len(rows) >= 4 else [0, 1, 0, 1]  # turnaround only: lift the body 1 px on every other step
    k = (cell - 1 - max(bob)) / max(b[3] - b[1] for r in walk for b in r)  # tallest pose fills the cell
    sheet = Image.new('RGBA', (cell * 4, cell * 7), (0, 0, 0, 0))
    for r, row in enumerate(walk + [rows[4] if attack and len(rows) > 4 else walk[0]]):
        for c, box in enumerate(row):
            place(sheet, scaled(img, box, k), c * cell, r * cell - (bob[r] if r < 4 else 0), cell)
    snap(sheet).save(dst)  # one colour set for the whole sheet, so every frame matches
    print(f'{dst}: {len(rows)} row(s) from {src}{" (bob walk)" if len(rows) < 4 else ""}')


def beast(src, dst, cell):
    img = cut_out(Image.open(src))
    frames = sorted(blobs(img), key=lambda b: b[0])[:2]
    if len(frames) != 2:
        sys.exit(f'{src}: expected 2 frames, found {len(frames)}')
    k = (cell - 1) / max(max(b[2] - b[0], b[3] - b[1]) for b in frames)  # the bigger side fills the cell
    sheet = Image.new('RGBA', (cell * 2, cell), (0, 0, 0, 0))
    for i, box in enumerate(frames):
        place(sheet, scaled(img, box, k), i * cell, 0, cell)
    snap(sheet).save(dst)
    print(f'{dst}: 2 frames from {src}')


def item(src, dst, size):
    img = cut_out(Image.open(src))
    img = img.crop(img.getchannel('A').getbbox())
    snap(scaled(img, (0, 0, img.width, img.height), size / max(img.size))).save(dst)
    print(f'{dst}: {Image.open(dst).size} from {src}')


def pieces(src, dst, size):
    img = cut_out(Image.open(src))
    boxes = [b for row in grid(blobs(img), cols=99) for b in row]
    rows, cur = [], []  # group into rows: a new row starts when a box begins below the current row's bottom
    for b in sorted(boxes, key=lambda b: b[1]):
        if cur and b[1] > max(c[3] for c in cur): rows.append(cur); cur = []
        cur.append(b)
    boxes = [b for r in rows + [cur] for b in sorted(r, key=lambda b: b[0])]
    k = size / max(max(b[2] - b[0], b[3] - b[1]) for b in boxes)
    for i, box in enumerate(boxes, 1):
        part = scaled(img, box, k)
        snap(part.crop(part.getchannel('A').getbbox())).save(dst.replace('.png', f'-{i}.png'))
    print(f'{dst}: {len(boxes)} pieces from {src}')


def seamless(img, wide):
    """Hide the wrap-around seam: near the edges, fade to a copy rolled by half (whose edges are the image's
    middle, so they wrap cleanly); the middle keeps the original."""
    w, h = img.size
    rolled = Image.new(img.mode, img.size)
    dx, dy = w // 2, (0 if wide else h // 2)  # a road strip only repeats left to right
    for ox, oy in ((0, 0), (-w, 0), (0, -h), (-w, -h)):
        rolled.paste(img, (dx + ox, dy + oy))
    mask = Image.new('L', img.size)
    m = mask.load()
    for y in range(h):
        for x in range(w):
            ex = abs(x - w / 2) / (w / 2)
            ey = 0 if wide else abs(y - h / 2) / (h / 2)
            m[x, y] = int(255 * max(0, (max(ex, ey) - 0.7) / 0.3))  # only the outer 15% each side blends
    return Image.composite(rolled, img, mask)


def texture(src, dst, size, wide=False, clear_green=False):
    img = Image.open(src).convert('RGB')
    w = round(size * img.width / img.height) if wide else size
    img = snap(seamless(img.resize((w, size), Image.Resampling.BOX), wide).convert('RGBA'))
    if clear_green:  # the road's grass verges become transparent, so the dirt lies on any floor's own grass
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = px[x, y]
                edge = y < img.height * 0.18 or y > img.height * 0.82  # verge rows: drop stray flower pixels too
                if edge or (g > r + 12 and g > b): px[x, y] = (0, 0, 0, 0)
    img.save(dst)
    print(f'{dst}: {w}x{size} texture from {src}')


def fog(src, dst, width):
    img = Image.open(src).convert('L')
    img = seamless(img.resize((width, round(width * img.height / img.width)), Image.Resampling.LANCZOS), False)
    out = Image.new('RGBA', img.size, (255, 255, 255, 0))
    out.putalpha(img)
    out.save(dst)
    print(f'{dst}: {out.size} fog from {src}')


SCENE_COLORS = 64  # a whole landscape needs more colours than one sprite


def scene(src, dst, size, h):
    img = Image.open(src).convert('RGB')
    k = max(size / img.width, h / img.height)  # cover, then crop the overflow evenly
    img = img.resize((round(img.width * k), round(img.height * k)), Image.Resampling.BOX)
    x, y = (img.width - size) // 2, (img.height - h) // 2
    img = img.crop((x, y, x + size, y + h)).quantize(SCENE_COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img.convert('RGB').save(dst)
    print(f'{dst}: {size}x{h} scene from {src}')


def build(name):
    kind, size, opt = SPRITES[name]
    src, dst = f'art-src/{opt.pop("src", name)}.png', f'public/assets/{name}.png'
    {'character': character, 'beast': beast, 'item': item, 'pieces': pieces, 'texture': texture, 'fog': fog, 'scene': scene}[kind](src, dst, size, **opt)


if __name__ == '__main__':
    for name in sys.argv[1:] or SPRITES:
        build(name)
