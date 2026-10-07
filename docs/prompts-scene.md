# Prompt ฉาก, พื้น และของตกแต่ง (ครบทุกชิ้น)

แทนของจากแพ็ก Ninja Adventure ทั้งหมด: `floor.png`, `interior.png`, `village.png` (ต้นไม้ + บอสต้นไม้), `fog.png`

## ทำไมไม่ใช้ tile 16 px แบบ brief เดิม

ChatGPT วาด tile ขนาดเป๊ะ ๆ ที่ต่อกันไร้รอยได้ไม่ดี (ขอบไม่ตรง, ขนาด pixel ไม่เท่ากัน) จึงเปลี่ยนเป็น 2 แบบที่ทำได้จริง:

| แบบ | คืออะไร | ตัวอย่าง | สคริปต์ทำอะไรให้ |
|---|---|---|---|
| **Texture** | ภาพสี่เหลี่ยม**เต็มกรอบ** ลวดลายต่อกันได้ทุกด้าน (seamless) | หญ้า, ถนน, พื้นเมือง, พื้นห้องบอส, น้ำ | ย่อเป็นชิ้น 192×192 px, เกลี่ยขอบให้ต่อกันเนียน, ลดสี แล้วเกมปูซ้ำ |
| **ชิ้นแยก** | วัตถุบนพื้น**บานเย็น `#FF00FF`** เหมือนตัวละคร | ต้นไม้, หย่อมดิน, ดอกไม้/หิน, น้ำพุ, บอสต้นไม้ | ตัดพื้นหลัง, ย่อตามขนาดที่ใช้, แยกชิ้นอัตโนมัติถ้ามีหลายชิ้นในภาพเดียว |

ความละเอียด pixel จะเท่ากับตัวละคร (แสดงแบบ 1:1) ทั้งฉากเลยเข้ากัน

## วิธีใช้ (ทุกชิ้น)
1. เปิดแชตใหม่ 1 ชิ้นต่อ 1 แชต
2. **แนบรูป:** `art-src/2.2.png` (sheet ผู้เล่น) ทุกชิ้น เพื่อให้ขนาด pixel และสไตล์ตรงกับตัวละคร
   - ชิ้นที่บอก "แนบเพิ่ม" ให้แนบรูปนั้นด้วย
3. ขอภาพ **สี่เหลี่ยมจัตุรัส (1024×1024)** สำหรับ texture ทุกชิ้น ถ้า ChatGPT ให้ภาพแนวนอน/ตั้ง พิมพ์ `Make it a square 1:1 image.`
4. บันทึกเป็น `art-src/<ชื่อไฟล์>` ตามหัวข้อ
5. ส่งครบแล้วบอกผม: ผมเพิ่มโหมด texture / decal ในสคริปต์ และเปลี่ยนโค้ดวาดพื้นให้ใช้ไฟล์ใหม่

**เช็ก texture ก่อนบันทึก:** ลายต้องเต็มกรอบ ไม่มีขอบ/กรอบ/เงามืดที่มุม ไม่มีวัตถุใหญ่จุดเดียวเด่น (ปูซ้ำแล้วจะเห็นเป็นลายซ้ำ)
ถ้าเห็นรอยต่อชัด สั่ง `Make it perfectly seamless: the left edge must continue into the right edge and the top into the bottom.`

**ท้าย prompt ทุกชิ้นใช้ STYLE เดียวกัน** (ใส่ไว้ในแต่ละกล่องแล้ว ก๊อปทั้งกล่องได้เลย)

---

# A. พื้น (Texture)

## ground-1.png · หญ้าชั้น 1 (ทุ่งสดใส)
```
A seamless tileable top-down ground texture of a bright, sunny meadow: short fresh green grass with gentle
variation in shade, a few tiny clovers and pale grass blades scattered evenly. No large objects, no paths,
no shadows from objects, nothing that stands out. The pattern must continue across all four edges so it can
repeat in a grid. Fill the entire square image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

## ground-2.png · หญ้าชั้น 2 (ทุ่งกว้าง เขียวเข้มอมฟ้า)
```
A seamless tileable top-down ground texture of lush, deep blue-green plains grass, slightly longer blades
with soft wind-swept clumps and a few tiny white flowers scattered evenly. No large objects, no paths,
nothing that stands out. The pattern must continue across all four edges so it can repeat in a grid.
Fill the entire square image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

## ground-3.png · พื้นป่าชั้น 3 (ป่าหมอกมืด)
```
A seamless tileable top-down ground texture of a dark, misty forest floor: dark green moss, patches of
fallen dark leaves, tiny roots and a few small glowing blue-green mushrooms scattered evenly. Moody and dim
but still readable. No large objects, no paths, nothing that stands out. The pattern must continue across
all four edges so it can repeat in a grid. Fill the entire square image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

## ground-4.png · หญ้าชั้น 4 (เมืองน้ำ ริมคลอง)
```
A seamless tileable top-down ground texture of soft green canal-side grass mixed with small smooth pebbles
and tiny patches of damp darker soil, fresh and cool in tone. No large objects, no paths, nothing that
stands out. The pattern must continue across all four edges so it can repeat in a grid. Fill the entire
square image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

## road.png · ถนนดินจากเมืองไปห้องบอส (ใช้ทุกชั้น)
**แนบเพิ่ม:** `art-src/ground-1.png` (ให้ขอบหญ้าเข้ากับพื้น)
```
A seamless horizontal strip of a packed dirt road seen from top-down, running left to right across the whole
image. Light brown earth with small stones and faint cart ruts, with an uneven natural grass edge along the
top and the bottom where it meets the attached grass. The road must continue seamlessly from the left edge
into the right edge. The road band fills the middle 60% of the height; the top and bottom 20% are grass
matching the attached ground texture. Fill the entire image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Wide 3:1 image.
```

## town.png · พื้นเมือง (ลานหินในเมือง ใช้ทุกชั้น)
```
A seamless tileable top-down ground texture of a warm beige cobblestone town plaza: rounded stones of
slightly varying sizes and tones with thin dark mortar lines, a few worn and cracked stones scattered evenly.
No large objects, no shadows, nothing that stands out. The pattern must continue across all four edges so it
can repeat in a grid. Fill the entire square image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

## bossroom.png · พื้นห้องบอส (ใช้ทุกชั้น เกมย้อมสีตามชั้นให้เอง)
```
A seamless tileable top-down ground texture of an ancient dungeon floor: large dark grey stone slabs laid in a
brick pattern, thin black gaps between slabs, subtle cracks and a few faint carved rune marks scattered evenly.
Neutral grey (it will be color-tinted per level). No large objects, nothing that stands out. The pattern must
continue across all four edges so it can repeat in a grid. Fill the entire square image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

## wall.png · กำแพงประตูห้องบอส
```
A seamless tileable texture of a massive dark stone castle wall seen from top-down, large heavy blocks with deep
shadowed seams and a little moss in the cracks. Neutral dark grey. The pattern must continue across all four
edges so it can repeat in a grid. Fill the entire square image edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

## water.png · น้ำในบ่อ/คลอง (ชั้น 4 และน้ำพุ)
```
A seamless tileable top-down texture of calm clear canal water: blue to teal tones with small light ripple
highlights and soft wave lines scattered evenly. No objects, no shore, no reflections of objects.
The pattern must continue across all four edges so it can repeat in a grid. Fill the entire square image
edge to edge.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text, no border. Square 1:1 image.
```

---

# B. ชิ้นแยก (พื้นบานเย็น)

**STYLE ท้ายทุกกล่องในหมวดนี้มีบรรทัด** `Solid flat #FF00FF magenta background` **ห้ามตัด** สคริปต์ใช้สีนี้ตัดพื้นหลัง
**เช็กก่อนบันทึก:** ไม่มีเงาบนพื้น (เกมวาดเงาเอง), ไม่มีพื้นหญ้าติดมาใต้วัตถุ, ชิ้นที่หลายชิ้นในภาพเดียวต้องห่างกันชัด

## tree-big.png · ต้นไม้ใหญ่ (ใช้ทุกชั้น)
```
One large round leafy oak tree seen from a top-down 3/4 view: a wide full canopy of layered green leaves with
light highlights on the top-left, a short thick brown trunk and a few roots visible at the base. The canopy is
about 1.3 times wider than it is tall. Just the tree, centered, no ground, no grass, no shadow.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 1-pixel dark outline, 3-tone shading, light from the top-left, no anti-aliasing, no gradients, no text.
Solid flat #FF00FF magenta background.
```

## tree-small.png · ต้นไม้เล็ก/พุ่มไม้ (ใช้ทุกชั้น)
```
One small round bushy tree seen from a top-down 3/4 view: a compact ball-shaped green canopy on a very short
trunk, about as wide as it is tall. Just the tree, centered, no ground, no grass, no shadow.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 1-pixel dark outline, 3-tone shading, light from the top-left, no anti-aliasing, no gradients, no text.
Solid flat #FF00FF magenta background.
```

## tree-dark.png · ต้นไม้ป่ามืด ชั้น 3 (ไม่บังคับ ถ้าไม่ทำใช้ tree-big ย้อมสีเข้มแทน)
```
One large gnarled dark-forest tree seen from a top-down 3/4 view: twisted dark trunk, a heavy canopy of deep
blue-green leaves with a few hanging vines, a couple of tiny glowing mushrooms at the roots. The canopy is about
1.3 times wider than it is tall. Just the tree, centered, no ground, no shadow.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 1-pixel dark outline, 3-tone shading, light from the top-left, no anti-aliasing, no gradients, no text.
Solid flat #FF00FF magenta background.
```

## patches.png · หย่อมดินบนพื้นหญ้า (3 ชิ้นในภาพเดียว)
**แนบเพิ่ม:** `art-src/ground-1.png`
```
Three separate irregular patches of bare brown dirt seen from top-down, each a different organic blob shape
(one roughly round, one long and oval, one wide and lumpy), with small stones inside and a ragged grass fringe
around the edge that matches the attached grass. Arrange them in a row with plenty of empty space between them.
Only the three patches, no shadows, no other objects.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 3-tone shading, no anti-aliasing, no gradients, no text. Solid flat #FF00FF magenta background.
```

## deco.png · ของตกแต่งเล็กบนพื้น (8 ชิ้นในภาพเดียว)
```
A set of 8 small separate ground decorations for a top-down RPG field, arranged in a 4 x 2 grid with plenty of
empty space between them, all roughly the same small size: a tuft of tall grass, a cluster of tiny white
flowers, a cluster of tiny yellow flowers, a small grey rock, a pair of small pebbles, a small fern, a red-capped
mushroom, a small twig with leaves. Each item seen from a top-down 3/4 view, no shadows, no ground under them.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 1-pixel dark outline, 3-tone shading, light from the top-left, no anti-aliasing, no gradients, no text.
Solid flat #FF00FF magenta background.
```

## fountain.png · น้ำพุกลางเมือง (ใช้ทุกชั้น)
**แนบเพิ่ม:** `art-src/town.png`
```
One round stone town fountain seen from a top-down 3/4 view: a wide circular basin of pale carved stone that
matches the attached cobblestone, filled with clear blue water, a small central pillar with water spraying up
and falling back. Just the fountain, centered, no ground around it, no shadow.
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 1-pixel dark outline, 3-tone shading, light from the top-left, no anti-aliasing, no gradients, no text.
Solid flat #FF00FF magenta background.
```

## treant.png · Nerius the Evil Treant (บอสชั้น 3)
**แนบเพิ่ม:** `art-src/tree-big.png` (ให้ใบไม้สไตล์เดียวกัน)
```
A giant evil tree monster boss seen from a top-down 3/4 view: a thick twisted dark trunk with an angry carved
face (deep frowning brows, a jagged open mouth) and two glowing yellow eyes, a heavy dark green leafy crown in
the same leaf style as the attached tree, gnarled roots spreading at the base like claws. Much bigger and more
menacing than a normal tree; the whole monster is about 1.3 times wider than it is tall. Just the monster,
centered, no ground, no shadow. (The game sways it, swells it while attacking and tints it red when enraged.)
Pixel density and style must match the attached character sprite: 16-bit pixel art, crisp equal-sized square
pixels, 1-pixel dark outline, 3-tone shading, light from the top-left, no anti-aliasing, no gradients, no text.
Solid flat #FF00FF magenta background.
```

---

# C. หมอก (ชั้น 3)

## fog.png · หมอกลอย (ภาพนี้ **ไม่ต้องเป็น pixel art**)
```
Soft wispy white fog and mist clouds drifting horizontally, light and airy with varied density and some clear
gaps, on a pure solid black background. The pattern must tile seamlessly left-right and top-bottom.
No objects, no ground, no text. Wide 16:9 image.
```
สคริปต์จะแปลงความสว่างเป็นความโปร่งใส (ขาว = หมอกทึบ, ดำ = ใส) เพราะ ChatGPT ทำพื้นหลังใสไม่ได้

---

# สรุปไฟล์

| ไฟล์ | แบบ | ใช้ที่ | บังคับ? |
|---|---|---|---|
| `ground-1.png` … `ground-4.png` | texture | ทุ่งของแต่ละชั้น | ✓ (ทำ 1 กับ 2 ก่อนก็ได้ ชั้น 3/4 ใช้ซ้ำไปก่อน) |
| `road.png` | texture แนวนอน | ถนนเมือง → ห้องบอส | ✓ |
| `town.png` | texture | พื้นเมือง | ✓ |
| `bossroom.png` | texture | พื้นห้องบอส | ✓ |
| `wall.png` | texture | กำแพงประตูห้องบอส | ไม่บังคับ (ไม่ทำใช้ bossroom มืด ๆ แทน) |
| `water.png` | texture | บ่อน้ำชั้น 4, น้ำพุ | ไม่บังคับ (ตอนนี้วาดด้วยโค้ด) |
| `tree-big.png`, `tree-small.png` | ชิ้นแยก | ต้นไม้ทุกชั้น | ✓ |
| `tree-dark.png` | ชิ้นแยก | ต้นไม้ชั้น 3 | ไม่บังคับ |
| `patches.png` | ชิ้นแยก ×3 | หย่อมดินในทุ่ง | ✓ |
| `deco.png` | ชิ้นแยก ×8 | ดอกไม้/หิน/หญ้าในทุ่ง | ✓ |
| `fountain.png` | ชิ้นแยก | กลางเมือง | ไม่บังคับ (ตอนนี้วาดด้วยโค้ด) |
| `treant.png` | ชิ้นแยก | บอสชั้น 3 | ✓ |
| `fog.png` | texture บนพื้นดำ | หมอกชั้น 3 | ✓ |

รวมบังคับ **13 ภาพ** (+ ไม่บังคับ 4) ครบแล้วไม่เหลือภาพจากแพ็กในเกม เหลือแค่เพลง
