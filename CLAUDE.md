# CLAUDE.md — Sales Target Planning (Prototype)

Prototype เว็บวางแผน Sales Target ของ Charmiss (Sales Planning · Product Master · Account Master) ใช้นำเสนอและทดลอง Flow ก่อนทำระบบจริง
ไม่มี Login · ไม่มีฐานข้อมูล (เก็บใน sessionStorage) · ข้อมูลตัวอย่างอยู่ใน `data/` · ตอบผู้ใช้เป็นภาษาไทย

## คำสั่ง

- เปิด: ดับเบิลคลิก `index.html` (Chrome/Edge ผ่าน `file://`)
- Test: `node tests/run.js` (ทุกชุด) · `node tests/run.js <ชุด>` · Test ที่ใช้ DOM/กราฟ: เปิด `tests/calc.test.html`
- ต้องผ่านทั้งหมดก่อนรายงานว่างานเสร็จ

## ข้อห้ามทางเทคนิค

- HTML + CSS + JS ล้วน ห้าม npm / Build tool / Framework / ES Modules (`import`, `export`, `type="module"`) / `fetch()` ไฟล์ในเครื่อง / localStorage / Library กราฟ
- ทุกไฟล์ JS ห่อ IIFE และผูกใต้ `window.SP` (`SP.core.*`, `SP.data.*`, `SP.modules.*`)
- ลิงก์ Relative ชี้ไฟล์ `index.html` ตรงๆ ผ่าน `SP.core.paths.to()` ห้าม Path ขึ้นต้นด้วย `/`
- ไฟล์ภายนอกได้ 2 อย่าง: Google Font และ SheetJS (โหลดเมื่อกดส่งออก Excel ครั้งแรกเท่านั้น)
- `data/seed/` สร้างจาก Excel ห้ามแก้ด้วยมือ · ต้องมี `.nojekyll` ที่ Root

## โค้ดอยู่ตรงไหน

| เรื่อง | ไฟล์ |
|---|---|
| Header, Side Menu, หัวข้อหน้า, ปุ่มก่อนหน้า/ถัดไป | `core/layout.js` |
| รายการหน้า เมนู กลุ่ม ลำดับขั้น | `core/registry.js` |
| ลำดับการโหลดไฟล์ | `core/loader.js` |
| สูตรคำนวณทั้งหมด (pure functions) | `core/calc.js` |
| Workflow / ร้านค้าและเขต / หมวดสินค้า / รายงาน / นำเข้า seed | `core/workflow.js` · `core/stores.js` · `core/taxonomy.js` · `core/report.js` · `core/seed.js` |
| UI ที่ใช้หลายหน้า · กราฟ SVG · ส่งออกไฟล์ | `core/components.js` · `core/charts.js` · `core/export.js` |
| ส่งข้อมูลข้ามหน้า | `SP.core.store` เท่านั้น |
| ข้อความทุกหน้า | `data/content.js` |
| สีและขนาด | `styles/tokens.css` (ที่อื่นใช้ `var(--...)`) |
| หน้าจอ | `modules/<ชื่อ>/` (index.html + <ชื่อ>.js) |

**หาฟังก์ชันด้วย `grep` ในโค้ด ไม่ใช่จากเอกสาร** (เอกสารไม่มีรายชื่อฟังก์ชัน)

## กติกาหลัก

1. Module เรียกได้เฉพาะ `SP.core.*` และ `SP.data.*` ห้ามเรียก Module อื่น
2. สูตร, Status, สิทธิ์แก้ช่อง, ราคา, คงเหลือ คำนวณใน `core/` เท่านั้น ห้ามคำนวณใน Module
3. ห้าม Hardcode ชื่อ/จำนวน Channel และคำว่า Account/เขต/Platform/GP (ใช้ Channel Master: `unitLabel`, `gpLabel`)
4. ห้ามเขียนข้อความหรือตัวเลขผลลัพธ์ลงใน HTML หรือ Module (ใช้ `content.js` และ calc)
5. สินค้าอ้างด้วย `calc.productKey(p)` เสมอ
6. เพิ่มหน้า = คัดลอก `modules/_template/` + 1 บรรทัดใน registry + ข้อความใน `content.js`
7. ถ้า CR ขัดกับกติกานี้หรือกับ `docs/spec/` ให้ถามก่อน ห้ามเดา

## เอกสาร (อ่านเฉพาะที่เกี่ยวกับงาน)

| อ่านเมื่อ | ไฟล์ |
|---|---|
| แก้โครงโค้ด loader / registry / store | `docs/spec/architecture.md` |
| แก้โครงข้อมูลหรือ Key ใน store | `docs/spec/data-model.md` |
| แก้ UI กลาง คำศัพท์ สี Workflow Component กราฟ | `docs/spec/ui-standards.md` |
| แก้หน้าใดหน้าหนึ่ง | `docs/spec/pages/<หน้า>.md` |
| Business Rule / สิ่งที่ห้ามทำ | `docs/spec/business-rules.md` |
| สมมติฐาน / คำถามค้าง | `docs/spec/open-items.md` |
| วิธีทดสอบบนเบราว์เซอร์ | `docs/spec/testing.md` |
| สารบัญและการอ้างหัวข้อเดิมของ SPEC | `docs/SPEC.md` |
| ข้อสรุป · ประวัติการเปลี่ยนแปลง | `docs/DECISIONS.md` · `docs/CHANGELOG.md` |
| งานที่ได้รับ | `docs/change-requests/CR-XX_*.md` |

**ห้ามอ่าน `docs/spec/` ทั้งโฟลเดอร์หรือ CR เก่าทั้งหมดโดยไม่จำเป็น**

## ขั้นตอนทำ CR

1. อ่าน CR + ไฟล์ใน `docs/spec/` ที่ CR อ้าง แล้วเสนอแผนสั้นๆ (ไฟล์ที่จะแก้ + ลำดับ) ก่อนเริ่ม
2. แก้เฉพาะไฟล์ใน "ไฟล์ที่แก้ได้" ของ CR · ต้องแก้ไฟล์อื่นให้ถามก่อน
3. `node tests/run.js` ผ่านทั้งหมด
4. อัปเดตเฉพาะไฟล์ `docs/spec/` ที่เกี่ยวข้อง + `docs/DECISIONS.md` + `docs/CHANGELOG.md` · เปลี่ยน `status` ของ CR เป็น `Applied`
5. รายงานผลเฉพาะข้อที่ไม่ผ่าน และสิ่งที่ตัดสินใจเอง

## ดูแลไฟล์นี้

- ขนาดไม่เกิน 10 KB · ห้ามเพิ่มรายชื่อฟังก์ชัน ประวัติ CR หรือรายละเอียดของหน้า (ใส่ใน `docs/spec/` หรือ `docs/CHANGELOG.md`)
- ไฟล์ใน `docs/spec/` แต่ละไฟล์ไม่ควรเกิน 30 KB ถ้าเกินให้แยกตามหัวข้อย่อย
