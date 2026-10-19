# CLAUDE.md — Sales Target Planning (Prototype)

Prototype เว็บวางแผน Sales Target ของ Charmiss ใช้ทดลอง Flow ก่อนทำระบบจริง
ไม่มี Login · ไม่มีฐานข้อมูล (เก็บใน sessionStorage) · ข้อมูลตัวอย่างอยู่ใน `data/` · ตอบผู้ใช้เป็นภาษาไทย

## คำสั่ง

- เปิด: ดับเบิลคลิก `index.html` (Chrome/Edge ผ่าน `file://`)
- Test: `node tests/run.js` (ทุกชุด) · `node tests/run.js <ชุด>` · Test ที่ใช้ DOM/กราฟ: เปิด `tests/calc.test.html`
- ต้องผ่านทั้งหมดก่อนรายงานว่างานเสร็จ

## ข้อห้ามทางเทคนิค

- HTML + CSS + JS ล้วน ห้าม npm / Build tool / Framework / ES Modules (`import`, `export`, `type="module"`) / `fetch()` ไฟล์ในเครื่อง / localStorage / Library กราฟ
- ทุกไฟล์ JS ห่อ IIFE และผูกใต้ `window.SP` (`SP.core.*`, `SP.data.*`, `SP.modules.*`)
- ลิงก์ Relative ชี้ไฟล์ `index.html` ตรงๆ ผ่าน `SP.core.paths.to()` ห้าม Path ขึ้นต้นด้วย `/`
- ไฟล์ภายนอกได้ 2 อย่าง: Google Font และ SheetJS (โหลดเมื่อกดส่งออกหรือนำเข้า Excel ครั้งแรกเท่านั้น)
- ใช้ Token สีเท่านั้น: ห้ามค่าสี `#xxx` / `rgb(` นอก `styles/tokens.css`
- เดือน / วันปัจจุบันอ่านจาก `SP.core.clock` เท่านั้น ห้าม Hardcode เดือน / ปี
- `data/seed/` สร้างจาก Excel ห้ามแก้ด้วยมือ · ต้องมี `.nojekyll` ที่ Root

## โค้ดอยู่ตรงไหน

| เรื่อง | ไฟล์ |
|---|---|
| Header, Side Menu, หัวข้อหน้า, ปุ่มก่อนหน้า/ถัดไป | `core/layout.js` |
| รายการหน้า เมนู กลุ่ม ลำดับขั้น | `core/registry.js` |
| ลำดับการโหลดไฟล์ | `core/loader.js` |
| สูตรคำนวณทั้งหมด (pure functions) | `core/calc.js` |
| Workflow · ร้านค้าและเขต · หมวดสินค้า · รายงาน · seed · สินค้าในแผน SKU | `core/workflow.js` · `core/stores.js` · `core/taxonomy.js` · `core/report.js` · `core/seed.js` · `core/plan-edits.js` |
| Revision · คำขออนุมัติ · สถานการณ์ Demo | `core/revision.js` · `core/approval.js` · `core/scenario.js` |
| Account Master / หน่วยขายและคู่ค้า / คู่มือ | `core/master.js` · `core/units.js` · `core/guide.js` |
| Product Code · Preset คอลัมน์ · นำเข้าราคา · TRCLOUD | `core/catalog.js` |
| UI ที่ใช้หลายหน้า · กราฟ SVG · ส่งออกไฟล์ | `core/components.js` · `core/charts.js` · `core/export.js` |
| ส่งข้อมูลข้ามหน้า | `SP.core.store` เท่านั้น |
| ข้อความทุกหน้า | `data/content.js` |
| สีและขนาด · ไอคอน | `styles/tokens.css` · `assets/icons.js` |
| หน้าจอ | `modules/<ชื่อ>/` (index.html + <ชื่อ>.js) |

**หาฟังก์ชันด้วย `grep` ในโค้ด ไม่ใช่จากเอกสาร**

## กติกาหลัก

1. Module เรียกได้เฉพาะ `SP.core.*` และ `SP.data.*` ห้ามเรียก Module อื่น
2. สูตร, Status, สิทธิ์แก้ช่อง, ราคา, คงเหลือ คำนวณใน `core/` เท่านั้น ห้ามคำนวณใน Module
3. ห้าม Hardcode ชื่อ/จำนวน Channel และคำว่า Account/เขต/Platform/GP (ใช้ Channel Master: `unitLabel`, `gpLabel`)
4. ห้ามเขียนข้อความหรือตัวเลขผลลัพธ์ลงใน HTML หรือ Module (ใช้ `content.js` และ calc)
5. สินค้าอ้างด้วย `calc.productKey(p)` เสมอ
6. เพิ่มหน้า = คัดลอก `modules/_template/` + 1 บรรทัดใน registry + ข้อความใน `content.js`
7. ถ้า CR ขัดกับกติกานี้หรือกับ `docs/spec/` ให้ถามก่อน ห้ามเดา
8. ทุกการเขียนข้อมูล Sales Planning ต้องผ่าน `SP.core.revision.assertWritable` / `guardWrite` (บังคับใน `store.set` · ห้ามเลี่ยง Store)

## เอกสาร (อ่านเฉพาะที่เกี่ยวกับงาน)

| อ่านเมื่อ | ไฟล์ |
|---|---|
| แก้โครงโค้ด loader / registry / store | `docs/spec/architecture.md` |
| แก้โครงข้อมูลหรือ Key ใน store | `docs/spec/data-model.md` · สินค้า ราคา `data-model-products.md` |
| แก้ UI กลาง คำศัพท์ Workflow Component · ธีม สี ไอคอน · กราฟ | `docs/spec/ui-standards.md` · `ui-theme.md` · `ui-charts.md` |
| แก้หน้าใดหน้าหนึ่ง | `docs/spec/pages/<หน้า>.md` |
| นาฬิกา · สถานการณ์ Demo | `docs/spec/demo-scenarios.md` |
| Business Rule / สิ่งที่ห้ามทำ | `docs/spec/business-rules.md` · สินค้า ราคา Listing `docs/spec/product-rules.md` |
| สมมติฐาน / คำถามค้าง | `docs/spec/open-items.md` · `open-items-assumptions.md` |
| วิธีทดสอบบนเบราว์เซอร์ | `docs/spec/testing.md` |
| สารบัญ SPEC | `docs/SPEC.md` |
| ข้อสรุป · ประวัติการเปลี่ยนแปลง | `docs/DECISIONS.md` · `docs/CHANGELOG.md` |
| งานที่ได้รับ | `docs/change-requests/CR-XX_*.md` |

**ห้ามอ่าน `docs/spec/` ทั้งโฟลเดอร์หรือ CR เก่าทั้งหมดโดยไม่จำเป็น**

## ขั้นตอนทำ CR

1. อ่าน CR + ไฟล์ใน `docs/spec/` ที่ CR อ้าง แล้วเสนอแผนสั้นๆ (ไฟล์ที่จะแก้ + ลำดับ) ก่อนเริ่ม
2. แก้ไฟล์ใน "Module ที่แก้" ของ CR + ไฟล์ตามหัวข้อ "ไฟล์ที่แก้ได้โดยไม่ต้องถาม" · นอกนั้นให้ถามก่อน
3. `node tests/run.js` ผ่านทั้งหมด
4. อัปเดตเฉพาะไฟล์ `docs/spec/` ที่เกี่ยวข้อง + `docs/DECISIONS.md` + `docs/CHANGELOG.md` · เปลี่ยน `status` ของ CR เป็น `Applied`
5. รายงานผลเฉพาะข้อที่ไม่ผ่าน และสิ่งที่ตัดสินใจเอง

## ไฟล์ที่แก้ได้โดยไม่ต้องถาม

นอกจากไฟล์ที่ CR ระบุ แก้ไฟล์เหล่านี้ได้เลยเมื่องานต้องใช้:
- `core/loader.js` — เพิ่มไฟล์ใหม่ในรายการโหลด
- `core/registry.js` — เพิ่ม/ซ่อน/เปลี่ยนชื่อหน้าตาม CR
- `data/content.js`, `data/guide.js` — ข้อความ
- `core/<ชื่อใหม่>.js` — ไฟล์ใหม่ที่เป็น pure functions
- `core/calc.js`, `core/report.js`, `core/charts.js` — **เพิ่ม** ฟังก์ชันใหม่ (ห้ามเปลี่ยนผลของฟังก์ชันเดิม)
- `core/components.js` — **เพิ่ม** Component ใหม่ หรือเพิ่มตัวเลือกที่ไม่เปลี่ยนค่าเริ่มต้นของ Component เดิม
- `core/permissions.js`, `data/permissions.js` — เพิ่ม resource ใหม่และค่าตั้งต้นตาม CR
- `styles/*`, `tests/*`, `docs/*`

ต้องถามก่อนเฉพาะเมื่อ:
- เปลี่ยนผลลัพธ์ของฟังก์ชันกลางที่มีอยู่ (calc, report, workflow, permissions, stores ฯลฯ)
- แก้ไฟล์ใน `modules/` ที่ CR ไม่ได้ระบุ (เว้นแต่เป็นการเปลี่ยนคำใน content หรือแทนการเช็กบทบาทแบบเขียนตายตัวด้วย `permissions.can()`)
- แก้ `data/seed/`
- ลบไฟล์

ให้รายงานไฟล์ที่แก้เพิ่มนอกรายการของ CR ไว้ในสรุปตอนจบงาน (ไม่ต้องถามระหว่างทำ)

## ดูแลไฟล์นี้

- ขนาดไม่เกิน 10 KB · ห้ามเพิ่มรายชื่อฟังก์ชัน ประวัติ CR หรือรายละเอียดของหน้า (ใส่ใน `docs/spec/` หรือ `docs/CHANGELOG.md`)
- ไฟล์ใน `docs/spec/` แต่ละไฟล์ไม่ควรเกิน 30 KB ถ้าเกินให้แยกตามหัวข้อย่อย
