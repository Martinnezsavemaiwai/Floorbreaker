"""Turn ChatGPT pixel-art images (on a flat #FF00FF background) into game-ready sprites.

    python scripts/import_art.py              # rebuild every sprite listed in SPRITES below
    python scripts/import_art.py slinger      # just one

character: poses in a 4-column grid (columns = down, up, left, right). Either a full sheet (rows 1-4 walk,
  row 5 attack) or a single row of standing poses (a turnaround): then the walk is faked with a 1 px bob.
  Packed into the layout the game reads: 4 x 7 square cells (rows 1-4 walk, row 5 attack, rows 6-7 empty).
  attack=False fills row 5 with the standing pose (the player: the game draws its sword separately).
beast: two side-view frames facing left -> a 2-cell strip.
item: one drawing cropped to its outline, `size` = height in px.

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


def item(src, dst, h):
    img = cut_out(Image.open(src))
    img = img.crop(img.getchannel('A').getbbox())
    w = max(1, round(img.width * h / img.height))
    snap(img.resize((w, h), Image.Resampling.BOX)).save(dst)
    print(f'{dst}: {w}x{h} from {src}')


def build(name):
    kind, size, opt = SPRITES[name]
    src, dst = f'art-src/{opt.pop("src", name)}.png', f'public/assets/{name}.png'
    {'character': character, 'beast': beast, 'item': item}[kind](src, dst, size, **opt)


if __name__ == '__main__':
    for name in sys.argv[1:] or SPRITES:
        build(name)
