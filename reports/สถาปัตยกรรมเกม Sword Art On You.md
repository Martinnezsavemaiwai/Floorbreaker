# แยกไฟล์ก่อน เปลี่ยน engine ทีหลัง: แผนโตของ Sword Art On You

คำตอบสั้น ๆ คือ ตอนนี้ยังไม่ต้องย้ายไป engine ให้ย้ายไป **Vite + TypeScript ES modules แล้วใช้ Canvas 2D แบบ vanilla ต่อ** แยก `index.html` ราว 1000 บรรทัดออกเป็นประมาณ 15–25 ไฟล์ตามหน้าที่ เปลี่ยน loop เป็น fixed timestep เปลี่ยน state ที่เป็น string เป็น scene stack และย้ายเนื้อหาเกมไปเป็น data module ส่วน **Phaser 4** (stable ตั้งแต่ 10 เม.ย. 2026) เก็บไว้เป็นทางเลือกเมื่อเนื้อหาโตจนต้องใช้ Tiled, gamepad/touch และ camera สำเร็จรูปพร้อมกัน ระบบต่อสู้ของเกมนี้แข็งเกินระดับเกมงานอดิเรกทั่วไปแล้ว ได้แก่ boss ที่มี telegraph หลายท่าและเปลี่ยน phase, dash ที่มี i-frame, hit-stop, screen shake, particle และตัวเลขดาเมจ จุดที่ทำให้เกมยังดูไม่ครบคือ **ลูปที่ครอบการต่อสู้** ระหว่าง run ไม่มีให้เลือกอัปเกรด ตายแล้วไม่ได้อะไรติดตัว เมืองมีไว้แค่ฟื้น HP และศัตรูทุกชั้นมีพฤติกรรมเหมือนกัน นอกจากนี้ยังขาดของพื้นฐานที่ผู้เล่นคาดหวังและทำไม่ยาก คือ suspend save, i-frame หลังโดนตี, input buffer, การเปลี่ยนปุ่ม, โหมดง่าย และปุ่ม fullscreen ความเสี่ยงที่มักถูกมองข้ามมีสองเรื่อง เรื่องแรกคือ **เพลงที่เป็น `.ogg` อย่างเดียวอาจเล่นไม่ได้บน Safari/iOS** เรื่องที่สองคือ **ชื่อเกมพ้องกับเครื่องหมายการค้า SWORD ART ONLINE** ซึ่ง Kadokawa จดทะเบียนไว้ในหมวดซอฟต์แวร์เกม รายงานนี้ปิดท้ายด้วยแผนย้าย 10 ขั้น โดยเกมต้องยังเล่นได้หลังจบทุกขั้น

## Roguelite ที่ครบต้องมีมากกว่าการต่อสู้ที่ดี

เกมแนวนี้ทำให้การตายเป็นส่วนหนึ่งของโครงสร้างเกม ไม่ใช่ "game over" ตอน Supergiant ทำ Hades ทีมตั้งใจใส่ "ช่องทางความก้าวหน้าถาวรหลายช่อง" และเรื่องที่คืบหน้าไปทุกครั้งที่ตาย ([memoireonline](https://www.memoireonline.com/11/22/13305/m_Stories--video-games--investigating-narratives-through-play1.html)) Greg Kasavin ย้ำว่าความยากไม่ควรกลายเป็นกำแพงที่กั้นผู้เล่นออกจากเนื้อหา ([GDC Podcast ep.16](https://gdconf.com/news/roguelikes-and-narrative-design-hades-creative-director-greg-kasavin-gdc-podcast-ep-16)) อย่างไรก็ดี meta-progression ต้อง "เสริม ไม่ใช่ทำให้ความท้าทายด้านฝีมือหมดความหมาย" ([bugnet](https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression)) และมีผู้เล่นบางกลุ่มบ่นว่าระบบ grind ข้าม run ทำให้รู้สึกว่าฝีมือไม่ได้พัฒนาจริง ([piefed](https://piefed.keyboardvagabond.com/c/games/p/232999/meta-progression-in-roguelites-was-fun-for-a-while-but-it-s-starting-to-f)) สำหรับเกมนี้จึงควรทำ meta-progression ให้เล็กและเน้นปลดล็อก ไม่ใช่เพิ่มค่าสถานะถาวรแบบไม่จำกัด ส่วนความยาว run ใช้ Vampire Survivors เป็นจุดอ้างอิงได้ เกมนั้นนิยาม run ที่สำเร็จไว้ราว 30 นาที และใช้เอฟเฟกต์ "เกือบได้แล้ว" ดึงให้ผู้เล่นกดเล่นอีกรอบ ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)) เป้าที่เหมาะกับ 3 ชั้นจึงประมาณ 15–30 นาทีต่อการเคลียร์ทั้งเกม และถ้าตายในชั้นแรกไม่ควรเสียเวลาเกิน 5 นาที ตัวเลขนี้เป็นการอนุมาน เพราะไม่พบข้อมูลความยาว run ของเกมเบราว์เซอร์บน itch.io

ฝั่ง combat มีหลักสองข้อ ข้อแรก ศัตรูแต่ละชนิดต้องตั้งคำถามให้ผู้เล่นตอบสองข้อ คือ "หลบดาเมจฉันได้ไหม" และ "ตีฉันโดนไหม" ผ่านจังหวะ anticipation → attack → recovery และควรบอกท่าล่วงหน้าผ่านหลายช่องทางพร้อมกัน ทั้งท่าง้าง, VFX และเสียง ([Game Developer, Mike Stout](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)) ข้อสอง เกมแอ็กชันที่เล่นแล้วรู้สึกยุติธรรมมัก "โกงให้ผู้เล่น" แบบมองไม่เห็น Dead Cells ใช้เทคนิคซ่อนแบบนี้ 30–40 อย่าง ([80.lv](https://80.lv/articles/dead-cells-hidden-tricks-that-make-the-game-feel-fair)) ตัวที่ได้ผลคุ้มที่สุดคือ input buffer ราว 100–120 ms ([bugnet](https://bugnet.io/blog/how-to-fix-platformer-jump-feels-unresponsive); [Wayline](https://www.wayline.io/blog/input-buffering-responsive-game-feel)) ฝั่ง UX และ accessibility ใช้ Game Accessibility Guidelines ระดับ Basic เป็น checklist ได้เลย รายการที่เกี่ยวข้องคือ tutorial แบบลงมือเล่น, เปลี่ยนปุ่มได้, มีระดับความยากให้เลือกหลายแบบ, ปรับความเร็วเกมได้, ไม่สื่อข้อมูลด้วยสีหรือเสียงอย่างเดียว และ settings ที่บันทึกถาวร ([GAG Basic](https://gameaccessibilityguidelines.com/basic/)) XAG 108 แนะนำให้มีความยากตั้งแต่ 4 ระดับขึ้นไปพร้อม assist ปรับรายข้อ ([Microsoft Learn XAG](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines)) เรื่องเซฟ ผู้เล่น roguelike คาดหวัง suspend save คือเซฟตอนออกแล้วลบทิ้งตอนโหลด Returnal เปิดตัวโดยไม่มีระบบนี้ โดนวิจารณ์จนต้องเพิ่ม "Suspend Cycle" ในแพตช์ 2.0 ([CGMagazine](https://www.cgmagonline.com/news/returnal-2-0-update-adds-suspend-feature); [TheSixthAxis](https://www.thesixthaxis.com/2021/10/26/returnal-2-0-update-lets-you-save-the-game-mid-run-photo-mode-patch-notes/))

ตารางด้านล่างสรุปองค์ประกอบของ action RPG/roguelite ขนาดเล็กที่ครบ เทียบกับสถานะปัจจุบัน แท็กความสำคัญเป็นการประเมินจากหลักฐานข้างต้น

| หมวด | ต้องมี (MUST) | ควรมี (SHOULD) | สถานะเกมตอนนี้ |
|---|---|---|---|
| Core loop | ตัวเลือกใน run (เลือก 1 จาก 3 อัปเกรด), เหตุผลให้เริ่ม run ใหม่ | Sword Skill 2–4 ท่า มี 2 ช่อง, meta-currency เล็ก ๆ | เลเวลอัปให้ HP/ATK คงที่, มีสกิลเดียว, เก็บแค่ best record |
| ศัตรู/บอส | 2–3 archetype ต่อชั้น, บอส 3+ ท่า มี phase | ศัตรูชั้นละ 1 พฤติกรรมใหม่ | **บอสผ่านเกณฑ์แล้ว** แต่ mob ทุกชั้นใช้ wind-up+lunge เหมือนกัน |
| เศรษฐกิจ/เรื่อง | — | ทอง (Col), ร้านในเมือง, intro/NPC/ending สั้น ๆ | ไม่มี item, ทอง, NPC, เรื่องเล่า |
| Game feel | input buffer, i-frame หลังโดนตี, telegraph | dash cancel ช่วงท้ายท่าตี, hitbox เข้าข้างผู้เล่น | มี hit-stop/shake/particle และ i-frame ตอน dash แต่ **ไม่มี i-frame หลังโดนตี** |
| UX | pause เมื่อสลับแท็บ, tutorial ในฉาก, ปุ่ม fullscreen | rebinding, gamepad | pause เฉพาะตอน `blur`, มีแค่หน้า how-to, ไม่มี fullscreen |
| Accessibility | remap ปุ่ม, assist mode | ปรับความเร็วเกม, cue ที่ไม่พึ่งสีหรือเสียงอย่างเดียว | มี volume แยก, ปิด shake ได้, ลดแสงกะพริบได้ |
| เซฟ | suspend save | export/import เซฟ | localStorage (prefix `saoy.`) เก็บ settings และ best record เท่านั้น |

## สิ่งที่ขาดแบ่งเป็นงานถูกที่ได้ผลมากกับงานใหญ่ที่รอได้

ข้อเท็จจริงที่ตรวจจากโค้ดแล้วยืนยันว่ามีช่องว่างที่แก้ได้เร็วหลายข้อ ข้อแรก **ไม่มี i-frame หลังโดนตี** มีแค่ตอน dash ของ Sword Skill ถ้ามี mob หลายตัวพุ่งเข้ามาพร้อมกัน ผู้เล่นจะโดนดาเมจซ้อนในไม่กี่เฟรมจนตาย และรู้สึกว่าไม่ยุติธรรม ข้อนี้จึงเป็น MUST อันดับต้น ข้อสอง เกม **pause ตอน window `blur` แต่ไม่ได้ฟัง `visibilitychange`** การ alt-tab บนเดสก์ท็อปจึงพอใช้ได้ แต่การสลับแท็บหรือปิดจอบนมือถือหลุดได้ event นี้ยังเป็นจังหวะที่น่าเชื่อถือที่สุดสำหรับเขียน suspend save ด้วย เพราะไว้ใจได้มากกว่า `beforeunload` ข้อสาม **telegraph ของ boss slam/leap/roots/quake มีแต่เสียงตอนกระแทก ไม่มีเสียงเตือนตอนง้าง** ขณะที่ mob และ boss charge มีเสียงเตือนแล้ว ข้อนี้ไม่ผ่าน XAG 103 ที่ให้จับคู่ cue ทางภาพกับเสียง ([XAG](https://devdocs.xbox.com/build/game-principles/accessibility/xbox-accessibility-guidelines.md)) ข้อสี่ **ไม่มีปุ่ม fullscreen** canvas แค่ถูก scale ด้วย CSS เป็น `min(100vw,150vh)` บน itch.io ที่กรอบ embed เล็ก ปัญหานี้หนักกว่าที่เห็น ผลสำรวจเกม HTML5 200 เกมพบว่าบนมือถือขนาด 390×844 กรอบเกมเหลือราว 331×207 CSS px ([dev.to, ส.ค. 2026](https://dev.to/liza_18827c15bdd387c4cd9c/why-your-browser-game-is-unplayable-on-a-phone-7hi)) และ itch แนะนำให้เปิดปุ่ม fullscreen พร้อมตั้งขนาด embed ให้ตรงสัดส่วนเกม ([itch.io forum](https://itch.io/post/10626415)) สามข้อนี้ใช้โค้ดไม่กี่บรรทัดต่อข้อ

ช่องว่างเชิงเนื้อหาคือส่วนที่ทำให้เกมยัง "ไม่ครบ" ตัวที่สำคัญที่สุดคือ **ตัวเลือกอัปเกรด 1 จาก 3 ตอนเลเวลอัปหรือหลังชนะบอส** เพราะตอนนี้ทุก run เล่นออกมาเหมือนกัน ตัวถัดมาคือ **ศัตรูชนิดใหม่ชั้นละอย่าง** เช่น ตัวยิงระยะไกลและตัวถึก/ฝูง เพราะตอนนี้ต่างกันแค่ stat กับ sprite ตามด้วย **ทองกับร้านในเมือง** เพื่อให้เมือง (safe zone) มีหน้าที่มากกว่าฟื้น HP และ **เรื่องเล่าขั้นต่ำ** คือ intro ว่าติดอยู่ใน death game, NPC เมืองละ 1–3 ประโยค, การ์ดชื่อบอส และฉากจบ ทั้งหมดนี้ทำได้ถูกแต่ได้ผลกับธีมมาก Hades ทำงานระดับ ~8,000 บรรทัดพากย์ ([Tom's Guide](https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant)) ซึ่งเกินขอบเขตงานอดิเรกมาก ข้อสรุปจึงอยู่ที่หลักการ ไม่ใช่ขนาด คือให้การตายมีอะไรเล่าต่อ Permadeath ที่เริ่มใหม่จากชั้น 1 ทุกครั้งโดยไม่มี assist mode ไม่ผ่านข้อ "wide choice of difficulty levels" ของ GAG ([GAG Basic](https://gameaccessibilityguidelines.com/basic/)) ทางแก้ที่ถูกที่สุดคือตัวคูณดาเมจที่รับ ×0.5 หรือโหมด checkpoint ต่อชั้น

| ลำดับ | ช่องว่าง | ระดับ | แรงงาน (ประเมิน) |
|---|---|---|---|
| P1 | i-frame ~0.5–1 วินาทีหลังโดนตี | MUST | เล็กมาก |
| P1 | ฟัง `visibilitychange` เพื่อ pause และ suspend save | MUST | เล็กมาก |
| P1 | input buffer ~120 ms สำหรับ attack/skill | MUST | เล็กมาก |
| P1 | ปุ่ม fullscreen (`requestFullscreen`) และตั้งค่า embed บน itch | MUST | เล็กมาก |
| P1 | suspend save ตอนเข้าเมือง + ปุ่ม "Continue" ที่หน้า title | MUST | เล็ก |
| P1 | อัปเกรดเลือก 1 จาก 3 | MUST | เล็ก–กลาง |
| P1 | tutorial prompt ในฉากชั้น 1 | MUST | เล็ก |
| P1 | ศัตรู ranged + tank/swarm ชั้นละชนิดใหม่ | MUST | กลาง |
| P2 | เสียงเตือนตอนง้างท่า slam/leap/roots/quake ของบอส | SHOULD | เล็ก |
| P2 | rebinding, assist mode, ปรับความเร็วเกม | SHOULD (GAG basic) | เล็ก–กลาง |
| P2 | ทอง + ร้าน, meta-unlock Sword Skill ท่าที่ 2–4, เรื่องขั้นต่ำ | SHOULD | กลาง |
| P2 | gamepad ผ่าน Gamepad API, dash cancel, hitbox ใจดี | SHOULD | กลาง |
| P3 | equipment, touch control, bestiary, daily seed, export เซฟ | NICE | กลาง–ใหญ่ |

เส้นตัดที่แนะนำสำหรับ v1.0 บน itch.io คือ P1 ทั้งหมด บวก rebinding, assist mode และเรื่องขั้นต่ำ ที่เหลือทำหลังปล่อยเกม ระบบ equipment เต็มรูปแบบต้องมี inventory UI ซึ่งเป็นงานใหญ่ที่สุดในตาราง และเป็นงานที่ทำในไฟล์เดียวแล้วเจ็บที่สุด รายการนี้จึงเป็นเหตุผลที่ชัดที่สุดว่าทำไมต้องแยกโครงสร้างก่อนเพิ่มเนื้อหา

## เลือก Vite + TypeScript ตอนนี้ แล้วเก็บ Phaser 4 ไว้เป็นทางออก

ที่ราว 30–50 entity Canvas 2D ไม่ใช่คอขวด เหตุผลที่ต้องเปลี่ยนจึงเป็นเรื่องโครงสร้าง เครื่องมือ และ pipeline ของเนื้อหา ไม่ใช่ performance ภาพรวมของตัวเลือก ณ ต.ค. 2026 สรุปได้ตามตาราง

| ตัวเลือก | เวอร์ชันล่าสุด | ขนาด (gzip) | ข้อดีสำหรับเกมนี้ | ข้อเสีย |
|---|---|---|---|---|
| Vanilla + Vite/TS | — | 0 KB | โค้ดเดิมรอดเกือบ 100%, DOM menu และ Web Audio ใช้ต่อได้ | ต้องเขียน gamepad/touch/camera/loader เอง |
| **Phaser 4** | 4.2.1 (9 ก.ค. 2026) | 356 KB | ครบทุกอย่าง, มี Tiled loader, docs เยอะ และ AI ตอบเรื่องนี้แม่น | port ฝั่ง engine เกือบทั้งหมด, Canvas renderer deprecated |
| PixiJS v8 | 8.22.0 (1 ต.ค. 2026) | 265 KB | ห่างจากโค้ดเดิมน้อยที่สุด | เป็นแค่ renderer, `@pixi/sound` ไม่ออกเวอร์ชันใหม่ตั้งแต่ 2024 |
| Excalibur | 0.32.0 (ธ.ค. 2025) | 145 KB | TS-first, มี plugin Tiled และ debug extension | ยังไม่ถึง 1.0, community เล็กกว่า Phaser ราว 40 เท่า |
| LittleJS | 1.25.0 (4 ต.ค. 2026) | 125 KB | เล็ก, เร็ว, แนวคิดใกล้โค้ดเดิม | ผู้ดูแลหลักคนเดียว, community เล็ก |
| KAPLAY | 3001.0.19 / 4000-alpha | 67 KB | เรียนง่าย | v3001 หยุดพัฒนา, v4000 ยัง alpha และ breaking ทุกรอบ |
| Godot 4 web | 4.7 | ~35 MB wasm | editor ครบ | เขียนใหม่หมดรวม UI, ไฟล์ใหญ่ขึ้นราว 10 เท่า, Safari WebGL2 มีปัญหา |

ข้อมูลเวอร์ชันและยอดดาวน์โหลดมาจาก [npm registry](https://registry.npmjs.org/phaser) ขนาดมาจาก [bundlephobia](https://bundlephobia.com/package/phaser@4.2.1) และข้อจำกัดของ Godot มาจาก [Godot docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) และ [Godot Forum](https://forum.godotengine.org/t/export-optimising-a-build-for-size/94584)

**Phaser 4 พร้อมใช้แล้ว** 4.0.0 ออกเมื่อ 10 เม.ย. 2026 และออกต่อเนื่องถึง 4.2.1 ([phaser.io](https://phaser.io/download/stable)) ส่วน Phaser 3 หยุดที่ 3.90.0 (พ.ค. 2025) ถ้าจะใช้ Phaser จึงควรเริ่มที่ v4 มีสองจุดใน migration guide ที่กระทบเกม pixel art โดยตรง คือ `roundPixels` เปลี่ยนค่าเริ่มต้นเป็น `false` (ต้องตั้ง `pixelArt: true`) และ Canvas renderer "should be considered deprecated" ([Migration Guide](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md)) บทความเปรียบเทียบปี 2026 ให้ Phaser ชนะด้านความเสถียรและ performance บน Safari/iOS และบอกว่า KAPLAY จะเจอขีดจำกัดเมื่อโปรเจกต์ใหญ่ขึ้น ([JSLegendDev](https://jslegenddev.substack.com/p/i-tried-3-web-game-frameworks-so)) แต่บทความนี้ถูก Phaser นำไปเผยแพร่ซ้ำ จึงควรอ่านโดยเผื่อว่ามีอคติ

ข้อโต้แย้งที่หนักที่สุดของฝั่ง "ย้ายไป Phaser เลย" คือได้ Tiled, gamepad, touch, camera, asset loader และการ unlock เสียงบน iOS มาพร้อมกันในครั้งเดียว ข้อนี้จริง แต่การ port ไป Phaser เท่ากับเขียนโค้ดฝั่ง engine ใหม่เกือบทั้งหมด ประเมินคร่าว ๆ ราว 1–2 สัปดาห์ของเวลางานอดิเรก ทั้ง loop, entity, tilemap, particle และ hit-stop ระหว่างนั้นต้องทิ้งระบบที่ทำงานดีอยู่แล้วหลายตัว ขณะที่ปัญหาที่มีจริงตอนนี้ คือไม่มี module, ไม่มี type, state เป็น string และเนื้อหาผูกกับโค้ด แก้ได้ด้วย Vite + TS โดยไม่ต้องทิ้งอะไร ทั้งสองทางยังเก็บ DOM menu ไว้ได้ เพราะทุกตัวเลือกบนเว็บ render ลง `<canvas>` และวาง HTML/CSS ซ้อนทับด้านบนได้ ทางที่แนะนำจึงมีสองขั้น ขั้นแรก แยกเป็น module ด้วย Vite + TS และเขียน loader สำหรับ Tiled ประมาณ 100 บรรทัดเอง ขั้นสอง ค่อยพิจารณา Phaser 4 เมื่อเงื่อนไขอย่างน้อยสองข้อนี้เกิดพร้อมกัน คือ ชั้นเกิน 5–6 ชั้นที่ออกแบบใน Tiled, ต้องรองรับ touch บนมือถือจริงจัง, ต้องมี camera zoom/bounds หรือมีปัญหาเสียงบน iOS ที่แก้เองไม่จบ ถ้าวันนั้นมาถึง โค้ดที่แยกเป็น `data/` และ `systems/` แบบไม่ผูกกับ DOM ไว้แล้วจะย้ายไปง่ายกว่าไฟล์เดียวมาก งานขั้นแรกจึงไม่เสียเปล่า

## สถาปัตยกรรมเป้าหมาย: fixed step, scene stack, plain data, ไม่ใช้ ECS

**Game loop** ควรเปลี่ยนจาก variable-dt (cap 0.05 s) เป็น fixed step 1/60 s ที่ขับด้วย accumulator ใน `requestAnimationFrame` Fiedler อธิบายหลักนี้ว่า "the renderer produces time and the simulation consumes it in discrete dt sized steps" ([Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/)) Nystrom เรียกแบบ fixed update + variable rendering ว่ายืดหยุ่นที่สุด ([Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html)) สำหรับเกมนี้ ประโยชน์ที่จับต้องได้คือจังหวะท่าบอสและ i-frame เหมือนกันทุกเฟรมทั้งบนจอ 60, 120 และ 144 Hz และบนมือถือที่ช้า และทำให้ bot sim และ replay test เป็น deterministic ได้ hit-stop, slow-mo และ pause จะรวมเป็นตัวปรับตัวเดียวคือ `timeScale` ข้อควรระวังคือ hit-stop ต้องนับถอยหลังด้วยเวลาจริง ไม่ใช่เวลา sim ไม่อย่างนั้นจะไม่มีวันจบ เมื่อเกิด `visibilitychange` ให้ reset `last` ด้วย

```ts
// core/loop.ts
const STEP = 1 / 60, MAX_FRAME = 0.25;
export const time = { scale: 1, hitStop: 0 };
let acc = 0, last = performance.now();
export function startLoop(step: (dt: number) => void, render: (alpha: number) => void) {
  requestAnimationFrame(function frame(now) {
    let real = Math.min((now - last) / 1000, MAX_FRAME); last = now;
    if (time.hitStop > 0) { time.hitStop -= real; real = 0; }
    acc += real * time.scale;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    render(acc / STEP);
    requestAnimationFrame(frame);
  });
}
```

**State string ให้เปลี่ยนเป็น scene stack** (pushdown automaton) Nystrom อธิบายว่าเป็นการแทน state pointer ตัวเดียวด้วย stack ที่ push แล้ว pop กลับได้ ([Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)) Title และ Play อยู่ชั้นล่าง ส่วน Pause, Dialogue, Shop และ GameOver push ขึ้นไปซ้อนด้านบน scene บนสุดที่ตั้ง `blocksUpdate` จะหยุด Play ไว้ แต่ Play ยังถูกวาดอยู่ด้านล่าง วิธีนี้ลบ `if (state === 'paused')` ที่กระจายอยู่ทั่วโค้ดออกไปได้เกือบหมด **AI ใช้ FSM ต่อไป** บอสให้ใช้ "phase → สุ่มท่าแบบมีน้ำหนัก → ช่วง recovery" ย้าย switch ตามชื่อท่าที่มีอยู่ไปเป็นตาราง `Record<string, MoveFn>` และเก็บรายการท่าต่อ phase ไว้ใน data behavior tree, GOAP และ utility AI คุ้มค่าเมื่อมี agent จำนวนมากที่ต้องเลือกจากท่าจำนวนมากตามบริบท ซึ่งไม่ใช่สถานการณ์ของบอสที่ออกแบบด้วยมือไม่กี่ตัว

**Entity ให้เก็บเป็น plain data + system functions ไม่ต้องใช้ ECS** Nystrom เตือนเรื่อง "over-engineering a 'solution' to a non-existent problem" ([Component](https://gameprogrammingpatterns.com/component.html)) Joshua Manton เล่าว่าเขาถอด component ออกจาก engine ตัวเองแล้วกลับไปใช้ entity kind แบบมี type ไม่กี่แบบ ([Manton, 2023](https://joshuamanton.substack.com/p/why-i-removed-components-from-my)) รูปแบบที่แนะนำคือ discriminated union `Player | Mob | Boss | Npc` ที่ narrow ด้วย `switch (e.kind)` และแยก particle กับ projectile ไว้ใน array ของตัวเอง ถ้าวันหนึ่งความสามารถของ entity ผสมกันหลากหลายมาก ให้ย้ายไป miniplex ซึ่ง entity ยังเป็น plain JS object ([miniplex](https://github.com/hmans/miniplex)) ไม่ต้องไปถึง bitECS ที่ออกแบบมาสำหรับงาน SoA typed array ระดับหมื่น entity ([bitECS](https://github.com/NateTheGreatt/bitECS)) **ใช้ event bus แบบมี type ขนาดราว 10 บรรทัด** สำหรับเหตุการณ์ที่มีผู้รับหลายฝ่าย เช่น `hit`, `death`, `levelUp`, `bossPhase` เพื่อไม่ให้ combat ต้องเรียก audio, particle และ HUD ตรง ๆ ส่วน input, การเคลื่อนที่ และงานรายเฟรมห้ามส่งผ่าน bus เพราะจะซ่อน control flow จนดีบักยาก

**เนื้อหาเก็บเป็น TypeScript data module** ที่ใช้ `satisfies` และ `keyof typeof` เขียนผิดอย่าง `loot: "kobld"` จะถูกจับได้ตอน `tsc --noEmit` โดยไม่ต้องมี validator ตอน runtime Vite แค่ transpile ไม่ตรวจ type ([Vite Features](https://vite.dev/guide/features)) จึงต้องเพิ่ม `typecheck` เป็น script แยก ใช้ Zod 4 เฉพาะตรงขอบเขตที่ไว้ใจข้อมูลไม่ได้ คือเซฟใน localStorage และ JSON ที่มาจากเครื่องมือภายนอก ([zod.dev](https://zod.dev/)) **บทสนทนา** ช่วงแรกใช้ array ของประโยคใน TS ก็พอ เมื่อเริ่มมีทางเลือกหรือเงื่อนไขค่อยเปลี่ยนไปใช้ Ink ผ่าน inkjs ซึ่งเก็บสถานะเควสต์ใน variable ได้ และ serialize ด้วย `state.ToJson()` ลงเซฟได้ ([inkjs](https://github.com/y-lohse/inkjs)) Yarn ไม่มี runtime JS อย่างเป็นทางการ ([bondage](https://npmjs.com/package/bondage))

**แผนที่ใช้ Tiled (.tmj)** แทนตำแหน่งต้นไม้ที่เขียนลงใน `FLOORS` ตรง ๆ แบ่ง layer เป็น `ground`, `deco`, `collision` และ object layer `entities` ที่ใส่ `type` ได้แก่ `spawn_mob`, `boss`, `npc`, `exit`, `chest` และ property อย่าง `mob=kobold` ตอนโหลดให้อ่าน `type ?? class` เพราะ Tiled 1.9 เปลี่ยนชื่อ field แล้ว 1.10 เปลี่ยนกลับ ([Tiled JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)) ปิดโหมด infinite และใช้ CSV encoding loader ประมาณ 100 บรรทัดพอ LDtk เป็นทางเลือกที่มี entity field แบบมี type และ IntGrid ([LDtk](https://ldtk.io/docs/game-dev/json-overview/)) ทั้งสองตัวดีกว่าการ hard-code มาก ให้เลือกตัวเดียวแล้วใช้ไปตลอด

**Asset** รวม sprite เป็น atlas ไม่กี่แผ่นด้วย Aseprite CLI (`--sheet --data --format json-array --list-tags`) ([Aseprite CLI](https://www.aseprite.org/docs/cli/)) และ preload ทีละชั้นด้วย `Promise.all` เรื่องที่ต้องรีบจัดการคือ **เพลงที่เป็น `.ogg` อย่างเดียว** Safari เพิ่งรองรับ Ogg ใน 18.4 (มี.ค. 2025) และยังมีรายงานว่าใช้งานได้ไม่สมบูรณ์ ([frequal.com](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html); [WebKit 183852](https://bugs.webkit.org/show_bug.cgi?id=183852)) ให้ทำ MP3 หรือ M4A เป็นไฟล์หลัก และใช้ ogg เป็นทางเลือกเสริม แล้วทดสอบบน iPhone จริง ถ้าระบบเสียงที่เขียนเองเริ่มจัดการยาก howler.js (~7 KB) ให้ audio sprite และ fallback มาด้วย ([howler.js](https://howlerjs.com/)) SFX ที่ synth ด้วย Web Audio ให้ใช้ต่อ เพราะไม่ต้องมีไฟล์ asset เลย ส่วน **Google Fonts CDN (Kanit, Exo 2)** ควรเปลี่ยนเป็น self-host เพื่อตัดการพึ่ง CDN และเรื่องความเป็นส่วนตัวของผู้เล่นใน EU และเพราะ canvas ไม่รอ webfont จึงต้องเรียก `document.fonts.load()` ก่อนวาดครั้งแรก ฝั่ง performance ให้ทำตาม MDN คือ pre-render tile ลง offscreen canvas (ทำอยู่แล้ว), วาดที่พิกัด integer, ไม่ใช้ `shadowBlur` ทุกเฟรม และ cache ข้อความ HUD ([MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)) ทุกครั้งที่ resize ต้องตั้ง `imageSmoothingEnabled = false` ใหม่

โครงไฟล์เป้าหมายมีประมาณ 20 ไฟล์ แบนราบ และแยกตามหน้าที่

```
sword-art-on-you/
  index.html            # canvas + DOM UI roots เท่านั้น
  package.json          # dev, build, typecheck, test
  public/               # เพลง (mp3 + ogg), ฟอนต์ self-host, LICENSE/credits
  art-src/              # .ase / .tmx ต้นฉบับ (ไม่ ship)
  src/
    main.ts
    core/   loop.ts scenes.ts input.ts events.ts assets.ts save.ts rng.ts
    scenes/ title.ts play.ts pause.ts shop.ts dialogue.ts gameover.ts
    world/  world.ts types.ts spawn.ts
    systems/ player.ts mobAI.ts bossAI.ts combat.ts physics.ts loot.ts
    render/ draw.ts hud.ts particles.ts
    audio/  sfx.ts       # Web Audio เดิม subscribe event
    ui/                  # DOM menus เดิม
    data/   floors.ts mobs.ts bosses.ts items.ts upgrades.ts npcs.ts
    maps/   loadTiled.ts
  tests/  sim.test.ts  smoke.spec.ts
```

`core/input.ts` ควร abstract การควบคุมเป็น intent ตั้งแต่วันแรก คือ `move: {x,y}`, `aim`, `attack`, `skill` แล้วรับค่าจาก keyboard, Gamepad API หรือ joystick บนจอ ทำแบบนี้แล้ว rebinding, gamepad และ touch จะกลายเป็นงานเพิ่ม input source โดยไม่ต้องแก้ systems

## ทดสอบ เซฟ deploy และ IP

**การทดสอบที่คนเดียวทำไหวมีสี่ขั้น** ขั้นแรก ย้าย logic เข้า `systems/` ที่ไม่แตะ `window` หรือ `canvas` ขั้นสอง port bot sim ที่มีใน console อยู่แล้วไปเป็น Vitest ให้วน `update(1/60)` N รอบ ใช้ seeded PRNG (mulberry32 ยาวราว 5 บรรทัด) และตรวจ invariant เช่น ไม่มีตำแหน่งเป็น NaN, ไม่มี entity อยู่ในกำแพง และ HP อยู่ในช่วงที่ถูกต้อง `Math.random()` seed ไม่ได้ การสุ่มที่มีผลต่อ gameplay ทุกจุดจึงต้องผ่าน RNG ของเกม ส่วน effect ภาพใช้ `Math.random` ต่อได้ ขั้นสาม ทำ replay test โดยเก็บ `{seed, version, inputs}` แล้ว assert hash ของ state สุดท้าย ขั้นสี่ ทำ Playwright smoke test หนึ่งตัวที่ใช้ `page.clock.install()` ซึ่ง mock ได้ทั้ง `requestAnimationFrame` และ `performance` ([Playwright Clock](https://playwright.dev/docs/clock)) ให้กด Start แล้วตรวจว่าไม่มี error ใน console screenshot ของ canvas ไม่นิ่งเมื่อต่าง GPU และ OS จึงควรมีไม่เกินหนึ่งหรือสองภาพ

**ระบบเซฟใช้ localStorage ต่อได้** แต่ต้องถือว่าข้อมูลในเบราว์เซอร์เป็นแค่ cache Web Storage จำกัด 5 MiB ต่อ origin ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) ขนาดนี้ไม่ใช่ปัญหา ความเสี่ยงจริงอยู่ที่สามเรื่อง เรื่องแรก Safari ลบ storage ที่ script เขียนได้ทั้งหมดหลัง 7 วันที่ไม่มีการใช้งาน ([WebKit 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)) เรื่องสอง ตั้งแต่ Safari 17 frame ข้าม origin ได้ partition แยกและได้ quota แค่ ~10% ([WebKit 2023](https://webkit.org/blog/14403/updates-to-storage-policy/)) เรื่องสาม itch.io เล่นเกมผ่าน iframe ซึ่งมีรายงานว่าข้อมูลหายแบบสุ่มและใช้ไม่ได้บน iPad ([itch forum](https://itch.io/t/5464689/web-browser-game-randomly-losing-localstorage-data); [iPad](https://itch.io/t/2636350/localstorage-doesnt-work-for-html5-games-on-ipad-by-default)) ส่วนคำถามว่าอัปเดตเกมแล้วเซฟหายหรือไม่ ยังมีข้อมูลขัดกันและไม่มีคำตอบจาก staff ([itch forum](https://itch.io/t/2346400/html5-local-storage-is-lost-at-every-update)) ข้อนี้ต้องทดสอบเอง IndexedDB โดน eviction และ partition เหมือนกัน การย้ายไปจึงไม่ได้อะไรเพิ่ม รูปแบบเซฟที่แนะนำคือ `{v, savedAt, gameVersion, data}` ตอนโหลดให้รัน migration วนจนถึงเวอร์ชันปัจจุบัน ตรวจด้วย Zod และครอบทุกการเข้าถึง storage ด้วย try/catch เพราะ private mode ของ Safari จะ throw ก่อนเขียนทับให้เขียน `.bak` ไว้ก่อน แยกเซฟออกเป็นสามก้อน คือ settings, meta (unlock, currency, best) และ suspend slot เดียวที่ลบทิ้งทันทีเมื่อโหลด และเพิ่มปุ่ม **export/import** ทั้งแบบ string และแบบดาวน์โหลดไฟล์ `.json` ซึ่งเป็นการป้องกันเซฟหายวิธีเดียวที่เชื่อถือได้จริง prefix `saoy.` ที่ใช้อยู่ช่วยกันชนกับเกมอื่นบน `user.github.io` ได้แล้ว

**Deploy** ตั้ง `base: './'` ใน Vite เพื่อให้ build เดียวใช้ได้ทั้ง itch.io และ GitHub Pages itch ต้องการ ZIP ที่มี `index.html` อยู่ที่ root จำนวนไฟล์ไม่เกิน **1,000** ขนาดรวมไม่เกิน 500 MB ([itch.io HTML5 docs](https://itch.io/docs/creators/html5)) Ninja Adventure มีไฟล์หลายพันไฟล์ จึงต้อง copy เฉพาะไฟล์ที่ใช้จริง หรือรวมเป็น atlas ไม่อย่างนั้นจะเกินลิมิต ไม่ต้องทำ service worker ใน v1 เพราะ worker ที่ค้างเวอร์ชันเก่าเป็นต้นเหตุคลาสสิกของอาการ "อัปเดตแล้วไม่เห็น" AudioContext ต้อง `resume()` หลังมี user gesture ([Chrome autoplay](https://developer.chrome.com/blog/autoplay)) ปุ่ม Click to Play ของ itch ช่วยเรื่องนี้ได้ แต่ควรเรียก resume ตอน keydown หรือ click แรกด้วย **Version control** ให้ `git init` ทันที และ ignore `node_modules/`, `dist/` และ clone `assets/NinjaAdventure/` ที่มี `.git` ของตัวเอง ถ้าไม่ ignore git จะเพิ่มเป็น embedded gitlink แทนไฟล์จริง ให้ copy ไฟล์ที่ใช้ไปไว้ในโฟลเดอร์ของเกมพร้อมไฟล์ license และ credits CI ทำเป็น workflow เดียว ขั้นตอนคือ `npm ci` → `typecheck` → `test` → `build` → deploy ไป Pages ([Vite static deploy](https://vite.dev/guide/static-deploy)) → `butler push dist user/game:html5` โดยใช้ `BUTLER_API_KEY` เป็น secret butler ส่งเฉพาะส่วนที่เปลี่ยน ([butler docs](https://itch.io/docs/butler/pushing.html))

**IP คือความเสี่ยงที่ควรตัดสินใจก่อนโปรโมต** (ส่วนนี้ไม่ใช่คำแนะนำทางกฎหมาย) "SWORD ART ONLINE" เป็นเครื่องหมายการค้าจดทะเบียนในสหรัฐฯ ของ Kadokawa (reg. 5940485) ครอบคลุมโปรแกรมเกม ([Justia](https://trademark.justia.com/owners/kadokawa-corporation-3059400); ควรตรวจซ้ำบน USPTO TSDR) และ "Sword Art On You" เป็นคำพ้องที่ใกล้มาก ไม่พบ guideline สำหรับงานแฟน (二次創作) ของ SAO โดยเฉพาะ ([Kadokawa topics](https://www.kadokawa.co.jp/topics/10932/)) ToS ของ itch.io ระบุว่าผู้อัปโหลดรับรองว่ามีสิทธิ์ในงาน และลบงานได้โดยไม่แจ้งล่วงหน้า ([itch.io Terms](https://itch.io/docs/legal/terms)) ในทางปฏิบัติ itch ไม่ตรวจล่วงหน้า แต่ลบเมื่อเจ้าของสิทธิ์ร้องเรียน ([itch takedown](https://itch.io/takedowns/1499978)) ความเสี่ยงสำหรับเกมฟรีที่คนรู้จักน้อยจึงต่ำแต่ไม่ใช่ศูนย์ และผลที่น่าจะเกิดคือถูก takedown ไม่ใช่ถูกฟ้อง ความเสี่ยงเรียงจากมากไปน้อยคือ ชื่อเกมและโลโก้ รองลงมาคือชื่อเฉพาะที่หยิบมาจาก SAO เช่น Aincrad, Illfang, Asterius, Nerius และชื่อตัวละคร ส่วน premise ติดอยู่ใน VR death game เป็น trope ของแนวเรื่อง ไม่มีใครถือสิทธิ์ ทางลดความเสี่ยงคือตั้งชื่อเกม ชื่อปราสาท และชื่อบอสใหม่ คงธีมไว้ ใส่ disclaimer ว่าไม่เกี่ยวข้องกับ Kadokawa/Aniplex/Bandai Namco แจกฟรี และปิด donation (หน้า HTML5 ของ itch รับเงินได้แค่แบบ donation) ([itch.io HTML5 docs](https://itch.io/docs/creators/html5)) อ้าง parody ไม่ได้ช่วยมาก เพราะกฎหมายญี่ปุ่นไม่มีข้อยกเว้น fair use ทั่วไป ควรเปลี่ยนชื่อตั้งแต่ตอนที่ยังไม่มีผู้เล่น เพราะตอนนี้ต้นทุนต่ำที่สุด

## แผนย้าย 10 ขั้น ที่เกมยังเล่นได้หลังทุกขั้น

ลำดับนี้ทำโครงสร้างก่อน แล้วจึงเพิ่มเนื้อหา เพราะ inventory, ร้านค้า และ NPC จะเจ็บที่สุดถ้าทำในไฟล์เดียว ระยะเวลาเป็นการประเมินสำหรับงานอดิเรก ไม่ได้วัดจริง

| ขั้น | งาน | เสร็จเมื่อ | ประเมิน |
|---|---|---|---|
| 0 | `git init`, `.gitignore` (ignore `NinjaAdventure/`, `node_modules/`, `dist/`), copy เฉพาะ asset ที่ใช้, commit snapshot ของ index.html เดิม | มี baseline ที่ย้อนกลับได้ | ครึ่งวัน |
| 1 | `npm create vite`, ย้าย `<script>` ไป `src/main.js` (ยังไม่ใช้ TS), `base: './'`, self-host ฟอนต์, เพิ่มเพลง MP3 คู่กับ ogg | `npm run build` แล้วเล่นจาก `dist/` ได้ | 1 วัน |
| 2 | Quick wins: i-frame หลังโดนตี, `visibilitychange`, input buffer, ปุ่ม fullscreen, เสียงตอนง้างท่าบอส | P1 ที่เล็กมากผ่านหมด | 1 วัน |
| 3 | แยก `FLOORS` และ stat ไป `data/*.js` ด้วย id แบบ string | ไม่มีตัวเลข balance ใน logic | 1 วัน |
| 4 | `core/loop` (fixed step + timeScale), `core/scenes` (scene stack) แล้วลบ state string | pause, hit-stop และ dialog ทำงานผ่าน stack | 2–3 วัน |
| 5 | แยก update/draw ไปเป็น `systems/*`, `render/*`, `audio/sfx` + event bus, `core/input` แบบ intent | ไม่มี `if (kind===...)` ยาว ๆ ในลูปหลัก | 3–4 วัน |
| 6 | เปิด TS แบบค่อยเป็นค่อยไป (`allowJs`/`checkJs` แล้วเปลี่ยนเป็น `.ts`), `satisfies` บน data, script `typecheck` | `tsc --noEmit` ผ่าน | 2–3 วัน |
| 7 | `core/rng` + Vitest sim tests + Playwright smoke + GitHub Actions (Pages + butler) | CI เขียว, deploy อัตโนมัติ | 2 วัน |
| 8 | `core/save` (versioned + Zod + suspend + export/import), tutorial prompt, rebinding, assist mode | P1 ครบ, ผ่าน GAG basic หลัก ๆ | 3–4 วัน |
| 9 | เนื้อหา: อัปเกรด 1 จาก 3, ศัตรูใหม่ชั้นละชนิด, ทอง + ร้าน, เรื่องขั้นต่ำ, Tiled loader สำหรับชั้นใหม่, ตัดสินใจเรื่องชื่อ/IP | v1.0 บน itch.io | 2–4 สัปดาห์ |
| 10 | (มีเงื่อนไข) ประเมิน Phaser 4 อีกครั้งเมื่อมีเงื่อนไขอย่างน้อยสองข้อจากรายการในหัวข้อ engine | ตัดสินใจว่า port หรือไม่ | — |

ขั้น 2 ตั้งใจวางไว้ก่อนการ refactor ใหญ่ เพราะเป็นการแก้ที่ผู้เล่นรู้สึกได้ทันทีและแทบไม่มีความเสี่ยง ขั้น 4 และ 5 เป็นจุดที่ bug มีโอกาสเข้ามามากที่สุด ก่อนเริ่มขั้น 4 ควรรัน bot sim เดิมใน console เพื่อจดค่าอ้างอิงไว้ เช่น เวลาที่บอสใช้แต่ละท่า และจำนวนเฟรมของ i-frame แล้วตรวจซ้ำหลังเปลี่ยนเป็น fixed step สิ่งที่ไม่ควรทำตลอดแผนนี้ ได้แก่ ECS library, dependency injection, plugin scheduler, behavior-tree framework, pipeline สร้าง asset แบบ custom และ service worker ทุกตัวแก้ปัญหาที่เกมขนาดนี้ไม่มี

## Conclusion

ประเด็นสำคัญคือ ปัญหาของเกมนี้ไม่ได้อยู่ที่ engine แต่อยู่ที่โครงสร้างและลูปของเกม การย้ายไป Phaser ตอนนี้จะใช้เวลาหลายสัปดาห์เขียนระบบต่อสู้ที่ดีอยู่แล้วขึ้นใหม่ ขณะที่สิ่งที่ผู้เล่นจะสังเกตจริง ๆ คือ ไม่มีตัวเลือกใน run, ตายแล้วไม่ได้อะไร, โดนรุมตายเพราะไม่มี i-frame และเซฟหายเมื่อปิดแท็บ ซึ่งการย้าย engine ไม่ได้แก้ข้อไหนเลย การแยกเป็น Vite + TS module ที่ logic ไม่ผูกกับ DOM ให้ผลสองต่อ คือทำให้เพิ่มเนื้อหาได้ทันที และเตรียมทางไว้ถ้าวันหนึ่งต้อง port ไป Phaser จริง

จุดที่ยังไม่แน่นอนและควรทดสอบเองมีสามข้อ ข้อแรก localStorage ใน iframe ของ itch รอดข้ามการอัปเดตเกมหรือไม่ ข้อมูลยังขัดกันอยู่ ข้อสอง เพลง ogg เล่นได้บน iPhone จริงหรือไม่ ข้อสาม ตัวเลขระยะเวลาในแผนเป็นการประเมิน ไม่ได้วัดจริง ส่วนการตัดสินใจเรื่องชื่อเกมควรทำก่อน v1.0 เพราะหลังจากมีผู้เล่น หน้า itch และลิงก์ที่ถูกแชร์ไปแล้ว ต้นทุนของการเปลี่ยนชื่อจะสูงขึ้นมาก
