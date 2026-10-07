"""Turn ChatGPT pixel-art images (on a flat #FF00FF background) into game-ready sprites.

    python scripts/import_art.py character art-src/2.2.png public/assets/player.png --no-attack
    python scripts/import_art.py item art-src/sword.png public/assets/sword.png 42

character: a 4-column x N-row grid of poses (columns = down, up, left, right; rows 1-4 = walk).
Each pose is cut out, scaled so the tallest standing pose is POSE_H px, reduced to COLORS colours for the whole sheet,
and packed into the sheet layout the game reads: 4 x 7 cells of CELL px (rows 1-4 walk, row 5 attack,
rows 6-7 empty). --no-attack fills row 5 with the standing pose instead (for the player, whose sword the
game draws separately).
item: one drawing, cropped to its outline and scaled to the given height in px (the game draws it 1:1).
Needs Pillow (pip install pillow).
"""
import sys
from PIL import Image

CELL = 48          # sheet cell size; the game draws a cell as 48 screen px, so the new art shows 1:1
POSE_H = 47        # tallest standing pose, in art px: fills the cell, about as tall as the 16 px pack sprites at x3
COLORS = 32        # colours kept per sheet


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
                if len(xs) > 30:  # ignore specks
                    boxes.append((min(xs) * step, min(ys) * step, (max(xs) + 1) * step, (max(ys) + 1) * step))
    return boxes


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


def character(src, dst, attack_row=True):
    img = cut_out(Image.open(src))
    rows = grid(blobs(img))
    if any(len(r) != 4 for r in rows):
        sys.exit(f'{src}: expected 4 poses per row, found {[len(r) for r in rows]}')
    walk = rows[:4]
    scale = POSE_H / max(b[3] - b[1] for r in walk for b in r)
    sheet = Image.new('RGBA', (CELL * 4, CELL * 7), (0, 0, 0, 0))
    use = walk + [rows[4] if attack_row and len(rows) > 4 else walk[0]]
    for r, row in enumerate(use):
        for c, box in enumerate(row):
            part = img.crop(box)
            w, h = max(1, round(part.width * scale)), max(1, round(part.height * scale))
            part = part.resize((w, h), Image.Resampling.BOX)
            if part.width > CELL or part.height > CELL:  # e.g. a wide sword swing: shrink to fit
                part.thumbnail((CELL, CELL), Image.Resampling.NEAREST)
            sheet.alpha_composite(part, (c * CELL + (CELL - part.width) // 2, r * CELL + CELL - part.height))  # feet on the bottom
    snap(sheet).save(dst)  # one colour set for the whole sheet, so every frame matches
    print(f'{dst}: {len(rows)} rows from {src}, scale {scale:.3f}')


def item(src, dst, height):
    img = cut_out(Image.open(src))
    img = img.crop(img.getchannel('A').getbbox())
    h = int(height); w = max(1, round(img.width * h / img.height))
    snap(img.resize((w, h), Image.Resampling.BOX)).save(dst)
    print(f'{dst}: {w}x{h} from {src}')


if __name__ == '__main__':
    kind, src, dst, *rest = sys.argv[1:]
    if kind == 'item': item(src, dst, rest[0])
    else: character(src, dst, attack_row='--no-attack' not in rest)
