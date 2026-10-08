# Prompt 2.2: sheet ท่าเดิน + ท่าโจมตี (ทุกตัว)

## วิธีใช้ (เหมือนกันทุกตัว)
1. เปิดแชต ChatGPT ใหม่ 1 ตัวต่อ 1 แชต (กันสไตล์ตัวก่อนหน้าปนมา)
2. **แนบรูป:** `art-src/<ชื่อไฟล์>.png` ของตัวนั้น (รูปท่ายืน 4 ทิศที่ทำไว้แล้ว)
3. วาง prompt ของตัวนั้น (ก๊อปทั้งกล่อง)
4. ได้รูปแล้ว **บันทึกทับชื่อเดิม** `art-src/<ชื่อไฟล์>.png` (รูปท่ายืนเดิมยังอยู่ใน git ถ้าต้องใช้อีก)
5. รัน `python scripts/import_art.py <ชื่อไฟล์>` → `npm run dev` ดูผล
   สคริปต์เห็นว่าเป็นตาราง 4×5 แล้วจะใช้ท่าเดินจริงแทนท่าเดินแบบเด้งเอง

**เช็กก่อนบันทึก** (ถ้าไม่ผ่าน กด regenerate หรือพิมพ์บอกให้แก้)
- 4 คอลัมน์ × 5 แถวพอดี 20 ท่า ไม่มีตัวหนังสือ ไม่มีเส้นตาราง
- คอลัมน์ 3 หันซ้าย คอลัมน์ 4 หันขวา
- อาวุธ / หาง / ผ้าคลุม **ติดกับตัว** ไม่ลอยแยก (ชิ้นที่ลอยแยกจะถูกนับเป็นอีกท่า)
- ทุกท่าห่างกันชัดเจน ไม่ซ้อนกัน

ถ้าได้ตารางผิดจำนวน สั่งต่อในแชตเดิมว่า:
`Redo it as exactly 4 columns and 5 rows (20 poses), evenly spaced, nothing overlapping, no text.`

---

## slinger.png · Kobold Slinger (ชั้น 1)
```
Using the attached character exactly (same colors, same proportions, same green hood, same sling and pouches),
draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a 4-frame walk cycle (step with left foot, passing, step with right foot, passing)
with clearly different leg positions. Row 5: attack pose — whirling the sling overhead about to throw a stone,
facing that column's direction. Keep each pose the same size and centered in its cell, feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## taurus.png · Taurus Soldier (ชั้น 2)
```
Using the attached character exactly (same bull head, same bronze chest armor, same short axe),
draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a 4-frame heavy walk cycle (step with left foot, passing, step with right foot,
passing) with clearly different leg positions. Row 5: attack pose — swinging the axe down hard in that
column's direction, axe held firmly in the hand. Keep each pose the same size and centered in its cell,
feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## javelin.png · Taurus Javelineer (ชั้น 2)
```
Using the attached character exactly (same bull head, same red leather armor, same quiver of javelins),
draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a 4-frame walk cycle (step with left foot, passing, step with right foot, passing)
with clearly different leg positions. Row 5: attack pose — arm drawn back about to throw a javelin overhand
in that column's direction, javelin held in the hand. Keep each pose the same size and centered in its cell,
feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## guardian.png · Taurus Guardian (ชั้น 2 เกราะ)
```
Using the attached character exactly (same bull head, same heavy steel plate armor, same tall tower shield),
draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a slow, heavy 4-frame walk cycle (step with left foot, passing, step with right
foot, passing) with clearly different leg positions, shield always held against the body. Row 5: attack pose —
shield bash, slamming the tower shield forward in that column's direction. Keep each pose the same size and
centered in its cell, feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## elf.png · Dark Elf Warrior (ชั้น 3)
```
Using the attached character exactly (same grey skin, same long white hair, same purple leather armor, same
curved blade), draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear
empty space between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a light, agile 4-frame walk cycle (step with left foot, passing, step with right
foot, passing) with clearly different leg positions. Row 5: attack pose — a fast slash with the curved blade
in that column's direction, blade held in the hand. Keep each pose the same size and centered in its cell,
feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## mage.png · Dark Elf Mage (ชั้น 3)
```
Using the attached character exactly (same hooded teal robe, same staff with a glowing orb),
draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a 4-frame walk cycle (step with left foot, passing, step with right foot, passing),
robe hem swaying, feet visible under the robe in different positions. Row 5: casting pose — staff thrust
forward in that column's direction with the orb glowing brighter. Keep each pose the same size and centered
in its cell, feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## knight.png · Dark Elf Knight (ชั้น 3 เกราะ)
```
Using the attached character exactly (same black and violet plate armor, same long white hair, same kite shield),
draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a steady armored 4-frame walk cycle (step with left foot, passing, step with right
foot, passing) with clearly different leg positions, shield always held against the body. Row 5: attack pose —
lunging forward behind the shield with a thrust in that column's direction. Keep each pose the same size and
centered in its cell, feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## wraith.png · Water Wraith (ชั้น 4 ยิงไกล)
```
Using the attached character exactly (same translucent aqua water spirit, same tattered hooded robe, same
glowing eyes), draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear
empty space between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a 4-frame hovering float cycle — no legs; the body rises and sinks slightly and the
ragged robe tail ripples differently in each frame. Row 5: attack pose — both arms thrust forward in that
column's direction, a small water orb forming between the hands. Keep each pose the same size and centered in
its cell, the lowest point of the robe at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## tideguard.png · Tide Guardian (ชั้น 4 เกราะ)
```
Using the attached character exactly (same fish-man, same coral and shell armor, same round shell shield),
draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a heavy 4-frame walk cycle (step with left foot, passing, step with right foot,
passing) with clearly different leg positions, shield always held against the body. Row 5: attack pose —
shield bash, driving the shell shield forward in that column's direction. Keep each pose the same size and
centered in its cell, feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## boss1.png · Grask the Kobold Warlord (บอสชั้น 1)
```
Using the attached character exactly (same red-furred kobold chieftain, same bone club, same leather war harness
and skull decorations), draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with
clear empty space between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view),
3 = facing left, 4 = facing right. Rows 1-4: a heavy, menacing 4-frame walk cycle (step with left foot,
passing, step with right foot, passing) with clearly different leg positions, club held in the hand. Row 5:
attack pose — raising the bone club high for an overhead smash toward that column's direction. The club must
stay attached to the hand and fully inside the pose's space. Keep each pose the same size and centered in its
cell, feet at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## boss2.png · Bullgard the Horned King (บอสชั้น 2)
```
Using the attached character exactly (same giant bull king, same golden crown, same huge double axe, same purple
cape), draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced with clear empty space
between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view), 3 = facing left,
4 = facing right. Rows 1-4: a slow, stomping 4-frame walk cycle (step with left foot, passing, step with right
foot, passing) with clearly different leg positions. In every pose the double axe is gripped in the hands and
touches the body — never floating or cut off. Row 5: attack pose — the double axe raised for a huge downward
chop toward that column's direction. Keep each pose the same size and centered in its cell, feet at the same
baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

## boss4.png · Marisca the Tide Mare (บอสชั้น 4)
```
Using the attached character exactly (same upright hippocampus sea beast: horse head and front body, teal scales,
fin mane, long fish tail), draw a sprite sheet grid of exactly 4 columns and 5 rows (20 poses), evenly spaced
with clear empty space between poses. Columns: 1 = facing down (toward camera), 2 = facing up (back view),
3 = facing left, 4 = facing right. Rows 1-4: a 4-frame gliding cycle — no legs; the body sways and the fish tail
curls in a different S-curve in each frame, fins rippling. Row 5: attack pose — rearing back with the mouth
open, a burst of water spray gathering in front of it toward that column's direction. Keep each pose the same
size and centered in its cell, the tail tip at the same baseline.
16-bit top-down 3/4 view pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading,
light from the top-left, no anti-aliasing, no gradients, no text, no grid lines.
Solid flat #FF00FF magenta background.
```

---

## ไม่ต้องทำ
- **player.png** มี sheet เดินจริงแล้ว (จาก `2.2.png`)
- **merchant.png** ยืนอยู่กับที่ ใช้แค่ท่ายืนหันหน้า ท่าเดินไม่ได้ใช้

## สัตว์: วิ่ง 2 เฟรม (ทุกตัว)

วิธีใช้เหมือนตัวละคร: แชตใหม่ 1 ตัว · แนบ `art-src/<ชื่อไฟล์>.png` ของตัวนั้น · บันทึกทับชื่อเดิม · `python scripts/import_art.py <ชื่อไฟล์>`

**เช็กก่อนบันทึก**
- มี **2 ท่าพอดี** วางเรียงซ้าย-ขวา ห่างกันชัด
- **หันหน้าไปทางซ้ายทั้งคู่** (เกมกลับด้านให้เองตอนวิ่งไปทางขวา)
- ขนาดเท่ากัน เท้าอยู่ระดับเดียวกัน ขาต่างกันชัดเจนระหว่าง 2 ท่า
- ไม่มีฝุ่น/เส้นความเร็ว/เงาแยกจากตัว (ชิ้นที่ลอยแยกอาจถูกนับเป็นท่าที่ 3)

## boar.png · Wild Tusker (ชั้น 1)
```
Using the attached animal exactly (same angry brown wild boar, same white tusks, same red eyes, same bristly
mane and proportions), redraw it as exactly 2 side-view running frames, both facing LEFT, placed side by side
with clear empty space between them. Frame 1: front legs reaching forward and back legs pushing backward
(stretched gallop). Frame 2: all four legs tucked under the body, body slightly higher. Same size, same ground
line, nothing else in the image (no dust, no speed lines, no shadow).
16-bit pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading, light from the
top-left, no anti-aliasing, no gradients, no text. Solid flat #FF00FF magenta background.
```

## piglet.png · Boar Piglet (ฝูงชั้น 1)
```
Using the attached animal exactly (same small round pink piglet, same tiny tusks, same proportions), redraw it
as exactly 2 side-view running frames, both facing LEFT, placed side by side with clear empty space between
them. Frame 1: short legs stretched forward and back in a quick trot, ears flapping back. Frame 2: legs tucked
under the round body, a little hop off the ground. Same size, same ground line, nothing else in the image
(no dust, no speed lines, no shadow).
16-bit pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading, light from the
top-left, no anti-aliasing, no gradients, no text. Solid flat #FF00FF magenta background.
```

## shadowpig.png · Shadow Piglet (ฝูงชั้น 3)
```
Using the attached animal exactly (same small piglet made of purple shadow smoke, same glowing eyes, same
proportions), redraw it as exactly 2 side-view running frames, both facing LEFT, placed side by side with clear
empty space between them. Frame 1: legs stretched forward and back, smoky wisps trailing from the back of the
body. Frame 2: legs tucked under the body, the wisps curling differently. The smoke must stay attached to the
body, no loose floating puffs. Same size, same ground line, nothing else in the image.
16-bit pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading, light from the
top-left, no anti-aliasing, no gradients, no text. Solid flat #FF00FF magenta background.
```

## tidalboar.png · Tidal Boar (ชั้น 4)
```
Using the attached animal exactly (same blue-grey boar with a fish fin crest and wet scales, same tusks, same
proportions), redraw it as exactly 2 side-view running frames, both facing LEFT, placed side by side with clear
empty space between them. Frame 1: front legs reaching forward and back legs pushing backward (stretched
gallop), fin crest swept back. Frame 2: all four legs tucked under the body, body slightly higher, fin crest
upright. Same size, same ground line, nothing else in the image (no water splashes, no speed lines, no shadow).
16-bit pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading, light from the
top-left, no anti-aliasing, no gradients, no text. Solid flat #FF00FF magenta background.
```

## crab.png · Tide Crabling (ฝูงชั้น 4)
```
Using the attached animal exactly (same small orange crab with big claws, same colors and proportions), redraw
it as exactly 2 frames of it scuttling sideways, seen from a top-down 3/4 view, placed side by side with clear
empty space between them. Frame 1: legs on the left side stretched out, legs on the right side bent, both claws
raised up. Frame 2: the opposite — left legs bent, right legs stretched, claws lowered and slightly open.
Same size, same ground line, nothing else in the image (no bubbles, no sand, no shadow).
16-bit pixel art, crisp equal-sized square pixels, 1-pixel dark outline, 3-tone shading, light from the
top-left, no anti-aliasing, no gradients, no text. Solid flat #FF00FF magenta background.
```
