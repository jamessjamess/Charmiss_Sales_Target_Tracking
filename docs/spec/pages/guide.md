# คู่มือการใช้งาน (`modules/about-prototype`, id `aboutPrototype`)

CR-28 แทนหน้าเกี่ยวกับ Prototype (คง id · Path · ลิงก์เดิมใช้ได้) · เมนูกลุ่ม `ช่วยเหลือ` (group id `project-info` เดิม) เห็นทุกบทบาท ·
ลิงก์ Header `คู่มือ` · fit (เนื้อหาแท็บเลื่อนภายในการ์ด) · ไม่มีปุ่ม `?` ที่หัวหน้านี้
เนื้อหาทั้งหมดอยู่ใน `data/guide.js` (แก้ข้อความ ลำดับงานได้โดยไม่แก้โค้ด · CR-36 ผู้ใช้เลือกคงไฟล์นี้เป็นไฟล์ข้อความของคู่มือ) · ป้ายบนหน้าอยู่ใน `content.js` `pages.aboutPrototype`

- **CR-36 ตัดสถานการณ์ทดสอบ (UAT) ทั้งหมด** (ทำ UAT นอกระบบ): แท็บ · สถานการณ์ S1–S13 · ฟังก์ชัน `uat*` / `keepOnReset` ใน `core/guide.js` · แถบลอย `กำลังทดสอบ …` ใน `core/layout.js` ·
  Key `uat.results` · ข้อความ · CSS · Test cr28-4..7 · `รีเซ็ตข้อมูล` = ล้าง store ทั้งหมด
- **CR-36 ชื่อหน้าในคู่มือ = ชื่อจากเมนู**: ข้อความใน `data/guide.js` ใช้ `{page_<id>}` (เติมด้วย `guide.textVars()` ทั้งหน้าคู่มือและปุ่ม `?`) · ห้ามพิมพ์ชื่อหน้าเอง ·
  Test `guide.textIssues` (ไม่มี placeholder ที่ไม่รู้จัก · ไม่มีชื่อหน้าในเมนูที่พิมพ์เอง) · `{npdMonths}` = `settings.NPD_MONTHS`

ตัดออกจากหน้าจอ (CR-28): ขอบเขต · สิ่งที่ตัดออกโดยตั้งใจ · Decision log · คำถามที่ค้าง · ขั้นต่อไป · กล่องสิ่งที่ขออนุมัติ —
อยู่ใน `docs/DECISIONS.md` · `docs/spec/open-items.md` · `docs/spec/business-rules.md` เท่านั้น

## แท็บ `ภาพรวมและลำดับงาน | คำศัพท์และสูตร` (จำที่ `ui.guideTab`)

### ภาพรวมและลำดับงาน (อ่านจบในจอเดียวที่ 1920×937)

- `ภาพรวม` 1 บรรทัด (`guide.overview`)
- `ลำดับการทำงาน` (`components.flowDiagram` · HTML + SVG):
  - การ์ด 4 ขั้นต่อด้วยลูกศร: เลขขั้น · ชื่อหน้า (จากเมนู) · Chip ผู้แก้ไข (สีตามลำดับบทบาท `--person-*`) · สิ่งที่ทำ · ผลลัพธ์ · ปุ่ม `ไปหน้านี้`
    - CR-36 SKU Planning: `เพิ่มสินค้าในแผน 3 แบบ: สินค้าเดิมที่ยังไม่เคยขาย · NPD ที่ยืนยันแล้ว · ขอ NPD เพิ่ม` · Plan Summary: `ดูแผน Clearance แยกจากเป้าหมาย`
  - ผู้แก้ไขคำนวณจากสิทธิ์จริง (`guide.pageEditors` · ไม่นับบทบาทที่แก้ได้ทุกหน้า · ไม่มีผู้แก้ไข = `ทุกบทบาท`)
  - การ์ดที่บทบาทปัจจุบันเป็นผู้แก้ไข = ไฮไลต์ + ป้าย `บทบาทของคุณ` · หน้าที่บทบาทไม่เห็น = ปุ่มกดไม่ได้
  - การ์ดขั้นที่ 3 มีกล่อง `↺ ยังไม่ครบเป้า: …` · แถวล่าง `ข้อมูลที่ต้องมีก่อน` + `แก้ไขย้อนกลับได้ทุกขั้น …`
  - CR-36 `ข้อมูลที่ต้องมีก่อน` = กล่องต่อกลุ่มเมนู (ชื่อกลุ่มจาก `site.groups`) ภายในเป็นหน้าในกลุ่ม + ผู้แก้ไขของแต่ละหน้า (`guide.pageEditors` · `flowDiagram` masters `lines`):
    Product Master = Product List · Launch & Listing · Price & Promotion (Price & Promotion รวม Supply Chain จากสิทธิ์ย่อย Clearance · registry `alsoPerms`) ·
    Account Master = Partner List · Sales Person Management
- `บทบาทและหน้าที่` (`guide.roleRows` จากสิทธิ์ปัจจุบันในหน้า Permissions ไม่พิมพ์ซ้ำ · CR-31 แทนหน้า Roles ที่ซ่อน):
  บทบาท (+ Chip `สร้างเอง`) · คำอธิบาย · แก้ไขได้ที่ (ชื่อย่อหน้า · ผู้ดูแลระบบ = `ทุกหน้า ยกเว้น …`) · หน้าเริ่มต้น · จำนวนผู้ใช้ · แถวบทบาทปัจจุบันไฮไลต์
- `สำหรับการทดสอบ` (`guide.testNotes` · วิธีใช้ Prototype · คงไว้ใน CR-36) · บรรทัด `สิทธิ์ใน Prototype ใช้ซ่อนเมนูและปุ่มบนหน้าจอเท่านั้น …` แสดงที่นี่ที่เดียว

### คำศัพท์และสูตร

- CR-36 คำศัพท์ตามกลุ่ม (`guide.glossaryGroups` · แถวหัวกลุ่มในตาราง):
  - เป้าหมายและแผน: Total Target · Net Sales · Sale Amount · GP / Platform Fee (`{gpLabels}`) · L12M · ยอดอ้างอิงรายเดือน · เป้าหมาย Top-down · แผน Bottom-up · คงเหลือ · สิ้นสุดแผน
  - หน่วยขายและคู่ค้า: หน่วยขาย · คู่ค้า · รหัสคู่ค้า · ภาระเป้าหมายต่อคน
  - สินค้า: Request · Planned · NPD (`{npdMonths}` เดือนแรก) · Active · Discontinued · Clearance · Delete · รหัสชั่วคราว `NPD-YYMM-NNN` · ชื่อชั่วคราว · Product Level · Product Year · Listing
  - ประเภทสินค้าในแผน: สินค้าเดิม · Listing ใหม่ · NPD ยืนยันแล้ว · ขอ NPD
  - Clearance: ราคา Clearance · แผน Clearance (ไม่นับในเป้าหมาย) · ลำดับราคา (Clearance → Promotion หน่วยขาย → Promotion Channel → ราคาหลัก)
- สูตร (`guide.formulaLines`): `Sale Amount = …` + 1 บรรทัดต่อ Channel ที่ใช้งาน · มีส่วนแบ่ง = `÷ 1.07 × (1 − {gpLabel})` · ไม่มี = `÷ 1.07` ·
  CR-36 `Clearance Net Sales = จำนวน × ราคา Clearance ÷ 1.07 × (1 − GP / Platform Fee ตาม Channel)`
- ความหมายสีคงเหลือ 4 Chip (`alert-ok / short / over / empty`) · CR-36 `คงเหลือสต็อก Clearance` 3 Chip: ครบ (เขียว) · ยังระบายไม่หมด (เหลือง) · เกินสต็อก (แดง)

## ปุ่ม `?` ที่หัวทุกหน้า (`components.pageHelp` · ใส่โดย `core/layout.js`)

- ต่อท้ายชื่อหน้าทุกหน้าในเมนู (ยกเว้นคู่มือ) · หน้าไม่มี `guide.pages.<id>` = ไม่มีปุ่ม · CR-36 ข้อความเติม `{page_<id>}` จากเมนู
- Popover: `หน้านี้ใช้ทำอะไร` · `ผู้แก้ไข` (`guide.pageEditors` · ไม่มี = `ทุกบทบาทดูได้อย่างเดียว`) · `ขั้นตอนหลัก` ≤ 3 ข้อ · ลิงก์ `ดูคู่มือทั้งหมด` ·
  CR-35 บรรทัดแรกเป็น `pages.<id>.helpLead` ของหน้าที่ไม่มีคำอธิบายใต้หัวข้อ
- Module เพิ่มหัวข้อได้ด้วย `ctx.addHelp(label, build)` (กดแล้วแสดงในกล่องเดิม + `← กลับ`) —
  SKU Planning: `กฎ Status และวิธีเติมยอด` (Legend + กฎ + คีย์ลัด)
- CR-36 หน้าแผน NPD / Listing / Category & Series เดิมไม่มีรายการของตัวเอง (หน้าเดิมเป็นทางผ่าน) · Product List มีขั้นตอนของแท็บ Product Level
