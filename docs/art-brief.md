# Art brief: asset ของเกมเราเอง

เอกสารนี้แทน asset ของคนอื่นทั้งหมด (Ninja Adventure: ภาพ + เพลง) ด้วยของที่เราสร้างเอง
ทุกขนาดและตำแหน่งเฟรมในเอกสารตรงกับที่โค้ดอ่านอยู่ตอนนี้ วางไฟล์ใหม่ทับชื่อเดิมใน `public/assets/` ได้เลย

## 0. สิ่งที่ต้องรู้ก่อนเริ่ม

**ChatGPT ทำรูปให้ได้ไหม?** ได้ แต่มีข้อจำกัดที่ต้องรู้

| ทำได้ดี | ทำได้ไม่ดี (ต้องเก็บงานเอง) |
|---|---|
| ภาพ concept / หน้าตาตัวละคร, key art หน้าแรก, ปก itch.io | sprite 16×16 ที่ pixel ตรง grid จริง (มักได้ "pixel ปลอม" ขนาดไม่เท่ากัน มี anti-alias) |
| texture พื้น/อิฐ/หญ้า แบบภาพเดี่ยว | sprite sheet หลายเฟรมที่ตัวละครหน้าตาเหมือนกันทุกเฟรม |
| ไอคอน, ต้นไม้, ของตกแต่ง | จำนวนเฟรม/ตำแหน่งในตารางให้เป๊ะตามที่สั่ง |

**Workflow ที่ได้ผลจริง**
1. สั่ง ChatGPT วาด**ทีละชิ้น** บนพื้นสีชมพูบานเย็นล้วน `#FF00FF` (ลบพื้นหลังง่าย)
2. ทำตัวละครเป็น "turnaround" ก่อน (หน้า/หลัง/ซ้าย/ขวา ท่ายืน) พอได้แบบที่ชอบ **อัปโหลดรูปนั้นกลับเข้าไป** แล้วสั่งท่าเดิน/ท่าฟันโดยอ้างรูปเดิม จะได้หน้าตาตรงกัน
3. วางรูปใน `art-src/<ชื่อ>.png` (ชื่อตามตารางด้านล่าง) แล้วรันสคริปต์ ตัดพื้นหลัง ย่อ ลดสี จัดเป็น sheet ให้เอง:
   ```
   python scripts/import_art.py            # ทุกตัว
   python scripts/import_art.py slinger    # ตัวเดียว
   ```
   รายชื่อ, ขนาด และตัวเลือกของแต่ละตัวอยู่ใน `SPRITES` ในสคริปต์
   ถ้ารูปมีแค่ท่ายืน 4 ทิศ (ขั้น 2.1) สคริปต์ทำท่าเดินแบบเด้งให้ก่อน; ได้ตาราง 4×5 (ขั้น 2.2) มาแทนเมื่อไรก็ได้ท่าเดินจริง
   ถ้าอยากเก็บงานเพิ่ม เปิดไฟล์ผลลัพธ์ใน **LibreSprite** หรือ **Piskel** (ฟรี)
4. `npm run dev` ดูผล

**เรื่องสิทธิ์**
- ตามเงื่อนไขของ OpenAI ภาพที่สร้างเป็นของผู้ใช้ แต่ในหลายประเทศ (เช่นสหรัฐฯ) ภาพที่ AI สร้างล้วนๆ อาจจดลิขสิทธิ์ไม่ได้ = คนอื่นก๊อปได้ ถ้าเราแก้ด้วยมือเยอะ ส่วนที่แก้เป็นของเราชัดเจน
- itch.io ให้ติดป้ายว่าใช้ AI-generated content ตอนอัปโหลด ต้องติดตามจริง
- **ห้ามใส่ชื่อ** Sword Art Online, Kirito, Asuna, ชื่อศิลปิน หรือชื่อเกมอื่นใน prompt (เสี่ยงลิขสิทธิ์ + ได้ของที่ดูเหมือนของคนอื่น) ใช้คำบรรยายแทน
- ฟอนต์ Kanit / Exo 2 เป็น OFL ใช้ต่อได้ถาวร ไม่ต้องเปลี่ยน; เสียงเอฟเฟกต์ (SFX) สังเคราะห์ในโค้ด เป็นของเราอยู่แล้ว

**ChatGPT ทำเพลงไม่ได้** ดูหัวข้อ 7

## 1. Style guide (ล็อกไว้ก่อน แล้วใช้กับทุกชิ้น)

- **มุมมอง:** top-down เอียง 3/4 แบบเกม RPG 16-bit (เห็นหัวกับลำตัวด้านหน้า)
- **ขนาด:** ภาพจาก ChatGPT ได้ตัวละครสูงราว 40 "pixel" (ไม่ใช่ 16 ตามที่สั่ง) **ไม่เป็นไร** สคริปต์ย่อให้สูง 47 px ในช่อง 48 px
  เกมแสดงแบบ 1:1 (ของเดิมจากแพ็กเป็น 16 px ขยาย ×3 เลยดู pixel ใหญ่กว่า จนกว่าจะเปลี่ยนครบ)
  ฉาก/tile ยังเป็น 16 px ×3 ตามเดิม
- **เส้นขอบ:** 1 px สีเข้ม (ไม่ใช่ดำสนิท ใช้สีเข้มของสีหลัก)
- **แสง:** มาจากซ้ายบน, แรเงา 3 ระดับ (สว่าง / กลาง / เงา) ไม่มี gradient ไม่มี anti-alias
- **Palette:** จำกัด 32 สี ทั้งเกมใช้ชุดเดียว แนะนำ **Endesga 32** หรือ **Resurrect 64** (palette ฟรี ใช้ได้) หรือให้ ChatGPT สร้าง palette ก่อนด้วย prompt 1.1
- **โทนสีแต่ละชั้น:** ชั้น 1 เขียวสด/ดิน, ชั้น 2 เขียวเข้มอมฟ้า/ม่วงในห้องบอส, ชั้น 3 ป่าหมอกเขียวมืด, ชั้น 4 เมืองน้ำฟ้า/หินเทา

**STYLE (ก๊อปไปต่อท้ายทุก prompt):**
```
Style: 16-bit top-down 3/4 view pixel art for a 2D action RPG. Designed on a strict 16x16 pixel grid and shown
scaled up so every pixel is a crisp, equal-sized square block. 1-pixel dark outline, 3-tone cel shading,
light from the top-left, limited 32-color palette, no anti-aliasing, no gradients, no blur, no text, no watermark.
Solid flat #FF00FF magenta background, nothing else in the image.
```

### 1.1 Prompt: palette
```
Create a 32-color pixel art palette for a bright fantasy action RPG set in a floating castle of stacked floors:
grassland, bull-warrior plains, misty dark forest, and a canal water town. Show it as a grid of 32 flat square
swatches with their hex codes underneath. Include skin tones, 4 greens, 3 browns, 3 blues, 2 purples, metal greys,
warm accent orange and gold, and a near-black outline color.
```

## 2. ตัวละคร (character sheet)

**ที่ต้องได้จาก ChatGPT:** ตาราง 4 คอลัมน์ × 5 แถวบนพื้นบานเย็น (แบบ `art-src/2.2.png`) ขนาดภาพเท่าไรก็ได้
**ที่สคริปต์สร้างให้เกม:** PNG พื้นใส **192×336** = 4 คอลัมน์ × 7 แถว ช่องละ 48×48 (เกมยังอ่าน sheet 16 px แบบเดิมได้ด้วย)
- คอลัมน์: 1 หันหน้า (ลง) · 2 หันหลัง (ขึ้น) · 3 หันซ้าย · 4 หันขวา
- แถว 1–4: เดิน 4 เฟรม · แถว 5: ท่าฟัน · แถว 6–7: ว่างได้ (ยังไม่ใช้)

### 2.1 Prompt แม่แบบ (ขั้นที่ 1: turnaround)
```
Character turnaround sheet of [DESCRIPTION]. Four standing poses in one row, evenly spaced, same size:
facing down (toward camera), facing up (back view), facing left, facing right. Each pose fits a 16x16 pixel
cell. [STYLE]
```

### 2.2 Prompt แม่แบบ (ขั้นที่ 2: เดิน + ฟัน, อัปโหลดรูป turnaround ที่เลือกแล้วไปด้วย)
```
Using the attached character exactly (same colors, same proportions, same outfit), draw a sprite sheet grid
with 4 columns and 5 rows, every cell 16x16 pixels with no gaps:
columns = facing down, facing up, facing left, facing right;
rows 1-4 = a 4-frame walk cycle (contact, passing, contact, passing);
row 5 = an attack pose swinging the weapon forward in that direction.
Keep the character centered in each cell with the feet near the bottom. [STYLE]
```

### 2.3 รายชื่อตัวละครที่ต้องมี

ตอนนี้หลายตัวใช้ภาพเดียวกันแล้วย้อมสี ถ้าเราวาดเองแยกทุกตัวได้เลย (หลังได้ภาพ บอกผม ผมแก้โค้ดให้ชี้ไปไฟล์ใหม่)

| ไฟล์ | ใครใช้ | [DESCRIPTION] สำหรับ prompt |
|---|---|---|
| `player.png` | ผู้เล่น | a young swordsman with short silver hair tied back, navy-blue short coat with light-cyan trim, white scarf, brown boots, holding a slim straight one-handed sword |
| `merchant.png` | พ่อค้าในเมือง (ใช้แค่ท่ายืนหันหน้า) | a plump cheerful traveling merchant with an orange apron, a big backpack full of bottles, and a round cloth hat |
| `slinger.png` | Kobold Slinger (ชั้น 1 ยิงไกล) | a small dog-faced goblin in a green hood with a leather sling |
| `taurus.png` | Taurus Soldier (ชั้น 2) | a muscular bull-headed warrior in bronze chest armor holding a short axe |
| `javelin.png` | Taurus Javelineer (ชั้น 2 ยิงไกล) | a lean bull-headed warrior in light red leather armor carrying a quiver of javelins |
| `guardian.png` | Taurus Guardian (ชั้น 2 เกราะ) | a huge bull-headed warrior in heavy steel plate armor with a tall tower shield |
| `elf.png` | Dark Elf Warrior (ชั้น 3) | a grey-skinned elf warrior with long white hair, purple leather armor, a curved blade |
| `mage.png` | Dark Elf Mage (ชั้น 3 ยิงไกล) | a hooded dark elf mage in a teal robe holding a staff with a glowing orb |
| `knight.png` | Dark Elf Knight (ชั้น 3 เกราะ) | a dark elf knight in black and violet plate armor with a kite shield |
| `wraith.png` | Water Wraith (ชั้น 4 ยิงไกล) | a translucent aqua water spirit in a tattered hooded robe, glowing eyes |
| `tideguard.png` | Tide Guardian (ชั้น 4 เกราะ) | a fish-man warrior in coral and shell armor with a round shell shield |
| `boss1.png` | Kobold Lord (บอสชั้น 1) | a large kobold chieftain with red fur, a bone club and a leather war harness |
| `boss2.png` | Asterius (บอสชั้น 2) | a giant bull king warrior with a golden crown, a huge double axe, and a purple cape |
| `boss4.png` | Wythege (บอสชั้น 4) | a hippocampus sea beast standing upright: horse head and front body, fish tail, teal scales, fin mane |

**บอส:** เกมขยายบอส ×7–8.5 ภาพ 16 px จะดูเป็นก้อนใหญ่ ถ้าอยากให้บอสละเอียดกว่า วาดบอสช่องละ **32×32** (sheet 128×224) แล้วบอกผม แก้โค้ด 2 บรรทัด
**ร่าง rage:** บอสมีร่างตอนโกรธ (HP ต่ำกว่า 50%) ตอนนี้เกมย้อมแดงให้เอง ถ้าอยากได้ภาพแยก สั่ง "same character, rage form: glowing red eyes, steam, darker red tint" แล้วตั้งชื่อ `boss1-rage.png`

### 2.4 สัตว์ (beast sheet)
(สคริปต์ยังไม่รองรับแบบนี้ ได้รูปแล้วบอก ผมเพิ่มให้)
**รูปแบบไฟล์:** PNG **32×16** = 2 เฟรม (ช่องละ 16×16) **หันซ้าย** เท่านั้น (เกมกลับด้านให้เอง)

```
Two-frame side-view walk cycle of [DESCRIPTION], facing left, two 16x16 cells side by side, frame 2 has
the legs in the opposite position. [STYLE]
```
| ไฟล์ | ใครใช้ | [DESCRIPTION] |
|---|---|---|
| `boar.png` | Frenzy Boar (ชั้น 1) | an angry brown wild boar with white tusks and red eyes |
| `piglet.png` | Boar Piglet (ฝูงชั้น 1, เกมย่อ 0.65) | a small round pink piglet with tiny tusks |
| `shadowpig.png` | Shadow Piglet (ฝูงชั้น 3) | a small piglet made of purple shadow smoke with glowing eyes |
| `tidalboar.png` | Tidal Boar (ชั้น 4) | a blue-grey boar with a fish fin crest and wet scales |
| `crab.png` | Tide Crabling (ฝูงชั้น 4) | a small orange crab with big claws |

### 2.5 บอสต้นไม้ (ชั้น 3)
`treant.png` **64×48** ภาพเดียว (เกมทำให้โยกและพองเอง)
```
A giant evil tree monster seen from a top-down 3/4 view: thick twisted trunk with an angry carved face,
glowing yellow eyes, dark green leafy crown, roots spreading at the base. Fits a 64x48 pixel canvas. [STYLE]
```

## 3. ฉากและ tile

**ขนาด tile 16×16** (เกมขยาย ×3) ทุกชิ้นต้องต่อกันได้ไร้รอย (seamless)

```
A seamless tileable 16x16 pixel [TILE] tile for a top-down RPG, shown as a 4x4 repeat so the seams are
visible. [STYLE minus the magenta background line]
```

| ไฟล์ (ใหม่) | จำนวน | [TILE] / รายละเอียด |
|---|---|---|
| `grass-a.png` | 1 พื้น + 4 ลาย | bright green grass (ชั้น 1, 3) — แบบเรียบ 1 + แบบมีดอก/หิน/กอหญ้าเล็ก 4 |
| `grass-b.png` | 1 พื้น + 4 ลาย | lush blue-green grass (ชั้น 2, 4) |
| `dirt-a.png`, `dirt-b.png` | ชุด 3×3 (9 ช่อง) ต่อ palette | dirt path patch with grass edges: 4 corners, 4 edges, 1 center (ใช้ทำถนนและหย่อมดิน) |
| `town.png` | 5 | warm beige cobblestone town plaza tiles |
| `bossroom.png` | 5 | dark grey stone brick dungeon floor tiles |
| `water.png` (ไม่บังคับ) | ชุด 3×3 | canal water with a stone rim (ตอนนี้วาดด้วยโค้ด) |

**ต้นไม้และของตกแต่ง** (พื้นสีบานเย็น)
| ไฟล์ | ขนาด | prompt สั้น |
|---|---|---|
| `tree-big.png` | 64×48 | a wide round leafy oak tree, top-down 3/4 view |
| `tree-small.png` | 32×32 | a small round bush-like tree |
| `tuft-1.png`, `tuft-2.png` | 16×16 | a small grass tuft / a cluster of tiny flowers |
| `fountain.png` (ไม่บังคับ) | 64×64 | a round stone town fountain with blue water (ตอนนี้วาดด้วยโค้ด) |
| `fog.png` | 320×176 | soft wispy white fog clouds, seamless tileable, transparent background (ภาพนี้ไม่ต้องเป็น pixel) |

**ของชิ้นเล็ก**
| ไฟล์ | ขนาด | หมายเหตุ |
|---|---|---|
| `sword.png` | 7×12 | ดาบในมือ: **ด้ามอยู่บน ใบดาบชี้ลง** "a slim silver straight sword, hilt at the top, blade pointing down" |
| `shadow.png` | 12×8 | วงรีเงาสีดำโปร่ง 50% ใต้ตัวละคร (วาดเองใน 10 วินาทีง่ายกว่า) |

**ทำไว้หลังได้ภาพ:** ตอนนี้โค้ดอ่าน tile จากไฟล์ใหญ่ของ Ninja Adventure (`floor.png`, `interior.png`, `village.png`) ตามพิกัด
พอได้ไฟล์แยกข้างบน ผมจะเปลี่ยน [src/render/terrain.js](../src/render/terrain.js) ให้อ่านไฟล์ใหม่ (งานเล็ก)

## 4. UI และหน้าตาเกม

ส่วนใหญ่ (HUD, ปุ่ม, ไอคอน SVG) เขียนด้วยโค้ดเอง เป็นของเราอยู่แล้ว ที่ควรมีเพิ่ม:

| ไฟล์ | ขนาด | prompt |
|---|---|---|
| `logo.png` | 1200×400 พื้นใส | Game logo text "[ชื่อเกม]" in bold sharp fantasy letters with a sword through the first letter, silver and cyan, glowing edge. (โลโก้มีตัวอักษร: ChatGPT สะกดผิดบ่อย ลองหลายรอบ หรือใช้ตัวอักษรจากโค้ดต่อแบบตอนนี้) |
| `keyart.png` | 1920×1080 | Key art: a lone young swordsman with silver hair and a navy coat stands on a cliff edge looking up at a colossal floating castle made of stacked circular floors in the sky, sunset, painterly pixel art style. (ใช้เป็นพื้นหลังหน้าแรก) |
| `cover.png` | **630×500** (ขนาดปก itch.io) | ภาพเดียวกับ key art ครอปใหม่ ใส่โลโก้ |
| `icon.png` | 512×512 | a crossed sword and crystal emblem icon, pixel art, readable at 32x32 (ใช้เป็น favicon) |
| `potion.png` (ไม่บังคับ) | 16×16 | a small round red healing potion bottle (ตอนนี้วาดด้วยโค้ด) |

## 5. Effect

effect ทั้งหมด (ประกายฟัน, เศษคริสตัลแตก, วงเตือนท่าบอส, กระสุน) **วาดด้วยโค้ด** ไม่ต้องทำภาพ

## 6. สรุปจำนวนงาน

| กลุ่ม | จำนวน | ลำดับแนะนำ |
|---|---|---|
| Style + palette | 1 | 1 (ต้องทำก่อนทุกอย่าง) |
| ผู้เล่น + พ่อค้า | 2 sheet | 2 (เห็นตลอดเวลา คุ้มสุด) |
| tile ชั้น 1 + ต้นไม้ + ดาบ + เงา | ~12 ชิ้น | 3 |
| ศัตรูชั้น 1 (boar, piglet, slinger) + บอส 1 | 4 | 4 |
| ชั้น 2–4 ศัตรู + บอส | 14 | 5 (ทำทีละชั้น) |
| UI (โลโก้, key art, ปก, icon) | 4 | ก่อนเผยแพร่ |
| เพลง | 5–6 | ขนานกันได้ |

รวมประมาณ **35–40 ชิ้นภาพ + 6 เพลง** ทำทีละชั้นได้ เกมยังเล่นได้ตลอดเพราะชิ้นที่ยังไม่เปลี่ยนก็ใช้ของเดิมไปก่อน

## 7. เพลง (ChatGPT ทำไม่ได้)

ตอนนี้ใช้ 4 เพลงจาก Ninja Adventure ต้องมีเพลงของเราเอง:

| ไฟล์ | ใช้ตอน | อารมณ์ / ความเร็ว |
|---|---|---|
| `theme_title.mp3` (ใหม่) | หน้าแรก | ลึกลับ กว้างใหญ่ ช้า ~80 BPM |
| `floor1.mp3` | ชั้น 1 | ผจญภัย สดใส ~120 BPM |
| `floor2.mp3` | ชั้น 2 | หนักแน่น กลองเยอะ ~110 BPM |
| `floor3.mp3` | ชั้น 3 | ป่าหมอก ลึกลับ น่ากลัวนิดๆ ~90 BPM |
| `floor4.mp3` | ชั้น 4 | น้ำ ลื่นไหล ใส ~100 BPM |
| `boss.mp3` | สู้บอส | เร่งเร้า ~150 BPM |
| `clear.mp3` | ชนะบอส / บทจบ | ชัยชนะ อบอุ่น ช้า |

ทุกเพลงต้อง **loop ได้ไม่สะดุด** (ตัดให้ท้ายต่อหัวพอดี) ยาว 1–2 นาทีพอ

**ทางเลือก**
1. **BeepBox** (beepbox.co ฟรี เล่นในเบราว์เซอร์) แต่งเพลงชิปทูนเอง เพลงเป็นของเรา 100% แนะนำถ้าอยากเป็นเจ้าของจริง
2. **Suno / Udio** (AI ทำเพลงจากข้อความ) แผนฟรีมัก**ห้ามใช้เชิงพาณิชย์** ถ้าจะขายหรือเปิดรับเงินบริจาคต้องใช้แผนเสียเงิน อ่านเงื่อนไขตอนสมัคร
   ตัวอย่าง prompt: `16-bit chiptune RPG overworld theme, adventurous, bright, 120 bpm, square and triangle waves, seamless loop, instrumental`

## 8. ขั้นถัดไป

1. ทำ palette + ผู้เล่น ก่อน (ข้อ 1, 2.1, 2.2)
2. ส่งรูปที่ได้มาให้ผม (วางในโฟลเดอร์ `art-src/`) ผมทำสคริปต์ย่อ/ลดสี/ต่อ sheet แล้วใส่เข้าเกม
3. ระหว่างนั้นตัดสินใจ**ชื่อเกมใหม่** ถ้าจะเผยแพร่ (โลโก้กับปกต้องใช้ชื่อ)
