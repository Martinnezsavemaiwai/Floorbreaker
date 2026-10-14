"""Draw the interface's pixel art: the notice-board kit every menu and the HUD are built from.

    python scripts/make_ui_art.py      # writes public/assets/ui/*.png

Everything is drawn pixel by pixel at 1x in colours sampled from the town sprites (town-props-2/6, stall), so the
menus share the sprites' grain. CSS shows the 9-slices at 2x with smoothing off (border-image-slice = the border
below, border-image-width = 2x it). The plank grain is seeded, so a rerun gives the same files.
"""
import os
import random
from PIL import Image

OUT = 'public/assets/ui'
# sampled from town-props-6 (notice board), town-props-2 (crate), town-props-1 (barrel iron), stall (cloth)
LINE, LINE2 = (29, 20, 24), (44, 28, 26)
OAK = [(124, 70, 34), (179, 117, 55), (205, 155, 85), (227, 187, 116)]       # shade .. highlight
WALNUT = [(36, 21, 15), (51, 30, 21), (62, 37, 26), (74, 44, 29), (84, 51, 33)]
PLANK = [(80, 48, 30), (110, 61, 32), (142, 80, 36), (170, 103, 45), (205, 155, 85)]
PLANK_HOT = [(110, 61, 32), (150, 88, 38), (184, 116, 50), (214, 150, 70), (240, 200, 120)]
GOLD = [(122, 70, 30), (198, 124, 53), (232, 176, 74), (246, 210, 122), (255, 238, 180)]
GOLD_HOT = [(150, 90, 34), (222, 150, 62), (246, 196, 92), (255, 224, 146), (255, 248, 210)]
BLOOD = [(70, 16, 14), (112, 28, 22), (150, 40, 30), (186, 58, 42), (226, 112, 88)]
IRON = [(38, 43, 51), (56, 65, 73), (83, 92, 99), (120, 128, 134)]
BRASS = [(122, 70, 30), (198, 124, 53), (246, 210, 122)]
PAPER = [(58, 36, 20), (184, 149, 90), (217, 189, 132), (227, 204, 150), (236, 217, 168), (244, 230, 192)]


def canvas(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def rect(im, x, y, w, h, c):
    for j in range(y, y + h):
        for i in range(x, x + w):
            im.putpixel((i, j), c + (255,))


def frame():
    """Window frame, 24x24, border 8: oak band between two dark lines, iron brackets with a brass rivet at the corners."""
    s, b = 24, 8
    im = canvas(s, s)
    bands = [LINE, OAK[3], OAK[2], OAK[2], OAK[1], OAK[1], OAK[0], LINE2]  # outside -> inside
    for k, c in enumerate(bands):
        rect(im, k, k, s - 2 * k, 1, c); rect(im, k, s - 1 - k, s - 2 * k, 1, c)
        rect(im, k, k, 1, s - 2 * k, c); rect(im, s - 1 - k, k, 1, s - 2 * k, c)
    # the bottom and right edges of the oak band sit in shade
    for k in range(1, 7):
        im.putpixel((s - 1 - k, s // 2), OAK[0] + (255,))
    rect(im, b, b, s - 2 * b, s - 2 * b, (0, 0, 0))
    im.paste(canvas(s - 2 * b, s - 2 * b), (b, b))  # the body shows through
    for cx, cy in [(0, 0), (s - b, 0), (0, s - b), (s - b, s - b)]:
        rect(im, cx, cy, b, b, LINE)
        rect(im, cx + 1, cy + 1, b - 2, b - 2, IRON[1])
        rect(im, cx + 1, cy + 1, b - 2, 1, IRON[2]); rect(im, cx + 1, cy + 1, 1, b - 2, IRON[2])
        rect(im, cx + 1, cy + b - 2, b - 2, 1, IRON[0]); rect(im, cx + b - 2, cy + 1, 1, b - 2, IRON[0])
        rect(im, cx + 3, cy + 3, 2, 2, BRASS[1]); im.putpixel((cx + 3, cy + 3), BRASS[2] + (255,))
    return im


def planks(rng):
    """Walnut boards, 64x24 tile (three 8 px boards), grain that wraps so it tiles both ways."""
    w, h = 64, 24
    im = canvas(w, h)
    for p in range(3):
        base = WALNUT[2] if p != 1 else WALNUT[3]
        y0 = p * 8
        rect(im, 0, y0, w, 8, base)
        rect(im, 0, y0, w, 1, WALNUT[4] if p == 1 else WALNUT[3])   # top edge catches the light
        rect(im, 0, y0 + 7, w, 1, WALNUT[0])                         # seam
        for _ in range(9):                                           # grain streaks
            x, y, n = rng.randrange(w), y0 + rng.randrange(2, 6), rng.randrange(4, 14)
            c = WALNUT[1] if rng.random() < .65 else WALNUT[4]
            for i in range(n):
                im.putpixel(((x + i) % w, y), c + (255,))
        joint = (p * 23 + 11) % w                                    # one butt joint per board, nailed
        rect(im, joint, y0 + 1, 1, 6, WALNUT[0])
        im.putpixel(((joint + 2) % w, y0 + 2), IRON[2] + (255,)); im.putpixel(((joint + 2) % w, y0 + 5), IRON[2] + (255,))
    return im


def paper(nails=False):
    """Parchment 9-slice, 16x16, border 4: notched dark outline, a burnt rim, flat fill. nails: iron nails in the corners."""
    s = 16
    im = canvas(s, s)
    rect(im, 1, 0, s - 2, s, PAPER[0]); rect(im, 0, 1, s, s - 2, PAPER[0])
    rect(im, 1, 1, s - 2, s - 2, PAPER[1])
    rect(im, 2, 2, s - 4, s - 4, PAPER[2])
    rect(im, 3, 3, s - 6, s - 6, PAPER[4])
    rect(im, 3, 3, s - 6, 1, PAPER[5])
    for x, y in [(1, 6), (s - 2, 9), (7, 1), (10, s - 2)]:  # a few fibres in the rim only: the centre stays flat so it stretches
        im.putpixel((x, y), PAPER[3] + (255,))
    if nails:
        for cx, cy in [(1, 1), (s - 3, 1), (1, s - 3), (s - 3, s - 3)]:
            rect(im, cx, cy, 2, 2, IRON[1]); im.putpixel((cx, cy), IRON[3] + (255,))
    return im


def plank(pal):
    """Button 9-slice, 12x12, border 4: dark outline with notched corners, lit top row, a flat centre, shaded foot."""
    s = 12
    im = canvas(s, s)
    rect(im, 1, 0, s - 2, s, LINE); rect(im, 0, 1, s, s - 2, LINE)
    rect(im, 1, 1, s - 2, s - 2, pal[2])
    rect(im, 1, 1, s - 2, 1, pal[4]); rect(im, 1, 1, 1, s - 3, pal[3])
    rect(im, 1, s - 3, s - 2, 1, pal[1]); rect(im, 1, s - 2, s - 2, 1, pal[0]); rect(im, s - 2, 2, 1, s - 4, pal[1])
    for x, y, n in [(4, 2, 4), (6, 9, 3)]:  # grain stays in the edge slices; the centre is flat so it stretches cleanly
        for i in range(n):
            im.putpixel((x + i, y), pal[3] + (255,) if y < 4 else pal[1] + (255,))
    return im


def tack():
    """A brass tack seen from above, 7x7."""
    im = canvas(7, 7)
    rect(im, 2, 1, 3, 5, LINE); rect(im, 1, 2, 5, 3, LINE)
    rect(im, 2, 2, 3, 3, BRASS[1]); im.putpixel((2, 2), BRASS[2] + (255,)); im.putpixel((3, 2), BRASS[2] + (255,))
    im.putpixel((2, 3), BRASS[2] + (255,)); im.putpixel((4, 4), BRASS[0] + (255,))
    return im


def tag():
    """Keycap and small-tab 9-slice, 8x8, border 3: an oak tag with a deep foot (it reads as a key you press)."""
    s = 8
    im = canvas(s, s)
    rect(im, 1, 0, s - 2, s, LINE); rect(im, 0, 1, s, s - 2, LINE)
    rect(im, 1, 1, s - 2, s - 3, OAK[2]); rect(im, 1, 1, s - 2, 1, OAK[3])
    rect(im, 1, s - 3, s - 2, 1, OAK[0]); rect(im, 1, s - 2, s - 2, 1, LINE2)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = random.Random(7)
    out = {'frame': frame(), 'planks': planks(rng), 'paper': paper(), 'banner': paper(nails=True),
           'plank': plank(PLANK), 'plank-hot': plank(PLANK_HOT), 'plank-gold': plank(GOLD), 'plank-gold-hot': plank(GOLD_HOT),
           'plank-blood': plank(BLOOD), 'tack': tack(), 'tag': tag()}
    for name, im in out.items():
        im.save(f'{OUT}/{name}.png')
        print(f'{OUT}/{name}.png', im.size)


if __name__ == '__main__':
    main()
