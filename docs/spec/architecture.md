# โครงโค้ด — loader · registry · layout · store

## ข้อกำหนดทางเทคนิค

- HTML + CSS + JS ล้วน เปิดด้วยการดับเบิลคลิก `index.html` (`file://`) และ Deploy GitHub Pages ได้ ไม่มี Build step
- ห้าม ES Modules · `fetch()` ไฟล์ในเครื่อง · localStorage · Library กราฟ
- ไฟล์ภายนอกมี 2 อย่าง: Google Font (IBM Plex Sans Thai ใน `styles/app.css`) และ SheetJS 0.18.5 จาก cdnjs
  (โหลดเมื่อกดส่งออก Excel ครั้งแรกเท่านั้น ถ้าโหลดไม่ได้ให้เสนอ CSV แทน)
- ทุกไฟล์ JS ห่อด้วย IIFE และผูกไว้ใต้ `window.SP` ตัวเดียว: `SP.core.*` · `SP.data.*` · `SP.modules.*`
- ลิงก์เป็น Relative และชี้ไฟล์ `index.html` ตรงๆ (สร้างด้วย `SP.core.paths.to('modules/x/index.html')`) ห้ามลิงก์ชื่อโฟลเดอร์ และห้าม Path ที่ขึ้นต้นด้วย `/`
- ต้องมี `.nojekyll` ที่ Root ไม่อย่างนั้น GitHub Pages จะข้าม `modules/_template/`
- รูปสินค้าเก็บเป็น data URL ที่ย่อด้วย Canvas แล้ว (ด้านยาวไม่เกิน `IMAGE_MAX_PX` 320px) ห้ามเก็บไฟล์ต้นฉบับ และห้ามโหลดรูปจาก URL ภายนอก

## โฟลเดอร์

```
index.html        โหลด core/loader.js เท่านั้น แล้ว layout พาไปหน้าแรกที่ผู้ใช้เห็น
core/             โค้ดกลาง (ลำดับโหลดด้านล่าง)
data/             ข้อมูลตั้งต้นและข้อความ (content.js) · data/seed/ สร้างจาก Excel ห้ามแก้ด้วยมือ
modules/<ชื่อ>/   1 หน้า = index.html + <ชื่อ>.js (+ <ชื่อ>.css เมื่อจำเป็น) · _template/ ใช้ตั้งต้นหน้าใหม่
styles/           app.css (รวม Font · tokens · base · components · print) · สีและขนาดอยู่ใน tokens.css เท่านั้น
tests/            run.js (Node) · calc.test.html (เบราว์เซอร์) · *.test.js
docs/             SPEC.md (สารบัญ) · spec/ · DECISIONS.md · CHANGELOG.md · change-requests/
```

## ลำดับการโหลด (`core/loader.js` → `FILES`)

paths → format → data/settings → **features** → **clock** (CR-24 เดือนปัจจุบันกลาง) → data (channels, accounts, territories, salespeople, teams, permissions, users, assignments,
seed/seed-tt-stores, stores, taxonomy, seed/seed-charmiss, products, listings, pricing, promotions, npd, targets, history, actuals, plan-seeds,
erp-snapshot, content, **guide** (CR-28 คู่มือ · ปุ่ม ? · CR-36 ไม่มี UAT)) → calc → **stores** (นำเข้าร้านค้า TT) → **seed** (นำเข้าสินค้าจริง) → taxonomy → workflow → permissions → registry →
**guide** (CR-28 `core/guide.js` ฟังก์ชันล้วนของคู่มือ · CR-36 textVars / textIssues) → **master** (CR-29 `core/master.js` ฟังก์ชันล้วนของ Account Master) → store (CR-35 ปฏิเสธรหัสคู่ค้าซ้ำตอน `set` · `units.firstCodeConflict`) → components → charts → export → report → layout → JS ของหน้า (`data-module`) → `layout.boot()`

- รายการไฟล์ใน `core/` และ `data/` อยู่ที่ `FILES` ที่เดียว ถ้าเพิ่มไฟล์ต้องเพิ่มในรายการนี้ด้วย (`tests/run.js` ใช้รายการเดียวกัน)
- นำเข้าข้อมูลจริงตอนโหลด:
  - `core/stores.js` แปลง `data/seed/seed-tt-stores.js` ตามกฎใน `data/stores.js`
  - `core/seed.js` แปลง `data/seed/seed-charmiss.js` ตามกฎใน `data/products.js` · `listings.js` · `pricing.js`
  - ค่าที่ต้องปรับให้แก้ที่กฎ ห้ามแก้ไฟล์ seed

## registry (`core/registry.js`)

- 1 บรรทัดต่อหน้า: `{ id, title, short, icon, path, group, tour, visible, fit, year, perm, open, alsoPerms }`
  - CR-35 `alsoPerms`: สิทธิ์ย่อยของหน้าอื่นที่ทำให้หน้านี้มองเห็นด้วย (`permissions.pageLevel` · Price & Promotion ← `listing.clearance`)
  - `group`: `sales-planning` · `product-master` · `account-master` · `role-management` (CR-25 แทน `system-settings`) · `project-info` → Side Menu สร้างกลุ่มตามนี้อัตโนมัติ
  - `tour`: ลำดับขั้นของ Sales Planning (1–4) ใช้กับเลข "ขั้นที่ x/4" (คงที่ทุกบทบาท · `registry.step`) และปุ่มก่อนหน้า/ถัดไป (ข้ามขั้นที่มองไม่เห็น) · หน้ากลุ่มอื่นเป็น `null`
  - `perm` (CR-25): ใช้สิทธิ์ของหน้าอื่น ไม่มีแถวในเมทริกซ์ (Users · Roles ที่ซ่อนแล้ว → `roleManagement`) · `open: true`: ทุกบทบาทเห็นเสมอ (เกี่ยวกับ Prototype)
  - CR-36 `modules/products` = แท็บ สินค้า | Product Level (โค้ดหน้า Category & Series เดิมเป็น `renderLevel` · CSS `taxonomy.css` โหลดต่อ) · หน้าเดิม `taxonomy` = ทางผ่าน `#level`
  - CR-35 หน้าที่รวมหลายหน้าเดิม: `modules/launch-listing` (แท็บ NPD | Listing · โค้ดของ 2 หน้าเดิมเป็น `renderNpd` / `renderListing` ในไฟล์เดียว · CSS ของหน้าเดิมโหลดต่อ) ·
    หน้าเดิม `npd-plan` / `product-master` เหลือ Module สั้นที่ `location.replace` ไปแท็บที่ตรงกัน (`#npd` / `#listing`)
  - หน้าที่ใช้ไฟล์ Module ร่วมกันอยู่ในโฟลเดอร์ย่อยได้: `modules/role-management/{index,roles/index,users/index}.html` โหลด `role-management.js` ไฟล์เดียว
    (ลงทะเบียน `SP.modules.roleManagement / roleRoles / roleUsers` เนื้อหาตาม id ของหน้า)
  - `fit: true`: ที่จอตั้งแต่ 1024px หน้าสูงเท่าจอ (`body.fit-screen`) ตารางเลื่อนภายในการ์ด (`.fit-card` + `.fit-scroll`)
  - `year: true`: หน้าอิงปีแผน แสดงตัวเลือกปีในแถวหัวข้อ
  - `visible: false`: ซ่อนหน้าชั่วคราว
  - `short`: ชื่อในเมนู (บรรทัดเดียว) รองรับ `{territoryChannels}`
- ชื่อหน้า คำอธิบาย และ Tooltip ของชื่อหน้าอยู่ใน `content.js` (`pages.<id>.title` · `short` · `lead` · `titleTip`) ส่วน registry เก็บค่าสำรอง
- เมนูแสดงเฉพาะหน้าที่ผู้ใช้ปัจจุบันเห็น (สิทธิ์ต่างจาก "ไม่เห็น") · CR-25: เลขขั้นคงที่ ปุ่มก่อนหน้า/ถัดไปข้ามขั้นที่มองไม่เห็น · index.html ไปหน้าเริ่มต้นของบทบาท ดู `permissions.md`

## layout (`core/layout.js`)

- `boot()` ทำงานตามลำดับนี้:
  1. หาหน้าจาก registry ด้วย Path ของหน้า
  2. สร้าง Header, Side Menu และแถวหัวข้อ
  3. เรียก `SP.modules[id].render(bodyEl, ctx)`
- `ctx` = `{ entry, page, content, year, intro (แถวหัวข้อ ใช้วาง workflowBar), refreshMenu(), addHelp(label, build) }`
  (CR-28 `addHelp` = เพิ่มหัวข้อในปุ่ม `?` ต่อท้ายชื่อหน้า)
- หน้าที่ไม่อยู่ใน registry (เช่นหน้า Test) ใช้ Module ตัวเดียวที่ลงทะเบียนไว้
- ถ้าผู้ใช้เปิดหน้าที่ไม่มีสิทธิ์เห็นด้วย URL จะแสดง `ไม่มีสิทธิ์เข้าถึงหน้านี้` และไม่เรียก Module
- ลิงก์ไปหน้าที่ไม่เห็นจะถูกซ่อนเองทั้งหน้า และผู้ที่ไม่มีสิทธิ์ส่งออกจะได้ `body.perm-no-export`
- Header มีชื่อระบบ · ป้าย Prototype · มุมมองผู้ใช้ · คู่มือ (CR-28) · รีเซ็ตข้อมูล (ไม่มีปีแผนใน Header)
  - CR-29 `master.channels` (ตั้งค่า Channel) บันทึกแล้วแทน `SP.data.channels` ตอนโหลดและตอน set (`core/store.js`) · รีเซ็ต = ค่าจาก `data/channels.js`
  - CR-28 `รีเซ็ตข้อมูล` = `layout.resetData()`: CR-36 ล้าง store ทั้งหมด (ตัด UAT)
- CR-28: หัวข้อทุกหน้าในเมนู (ยกเว้นคู่มือ) มีปุ่ม `?` (`components.pageHelp` · เนื้อหา `data/guide.js` pages) · ระหว่างทดสอบสถานการณ์
  (`uat.results.active`) ทุกหน้ายกเว้นคู่มือมีแถบลอยมุมล่างขวา `กำลังทดสอบ …` + `กลับไปบันทึกผล`
- ถ้าหน้ามี `page.approve` layout จะต่อกล่อง "สิ่งที่ขออนุมัติ" ท้ายหน้า (CR-28 ไม่มีหน้าที่ใช้แล้ว — เนื้อหาเดิมอยู่ที่ open-items.md)

## กติกาของ Module

1. Module ใช้ได้เฉพาะ `SP.core.*` และ `SP.data.*` ห้ามเรียกโค้ดของ Module อื่น ส่งข้อมูลข้ามหน้าผ่าน `SP.core.store` เท่านั้น
2. ห้ามเขียนส่วนที่ซ้ำกับของกลาง:

   | เรื่อง | อยู่ที่ |
   |---|---|
   | Header · Side Menu · ปุ่มก่อนหน้า/ถัดไป · หัวข้อ · คำอธิบาย | layout |
   | สูตร · Status · ราคา · คงเหลือ · สิทธิ์แก้ช่อง | `core/calc.js` |
   | กฎ Workflow | `core/workflow.js` |
   | สิทธิ์ | `core/permissions.js` |
   | ร้านค้าและเขต | `core/stores.js` |
   | เพิ่ม / ขอ / นำสินค้าออกจากแผน SKU (CR-34 · ตรวจสิทธิ์ในฟังก์ชัน) | `core/plan-edits.js` |
   | หมวดสินค้า | `core/taxonomy.js` |
   | ข้อมูลขั้นที่ 4 | `core/report.js` |
   | UI ที่ใช้หลายหน้า | `core/components.js` + `styles/components.css` |
   | กราฟ | `core/charts.js` (มาตรฐานที่ `ui-charts.md`) |
   | ส่งออกไฟล์ | `core/export.js` |
   | ตัวเลขและเดือน | `core/format.js` |
   | ข้อความ | `data/content.js` |
   | สีและขนาด | `styles/tokens.css` |
3. JS ห้ามตั้งค่าสี ให้ส่งชื่อ Token แทน เช่น `style: { '--c': 'var(--ch-1)' }`
4. ทุกไฟล์ JS ของ Module มี Comment หัวไฟล์บอก: หน้าที่ · ข้อมูลที่อ่านจาก `data/` · Key ที่อ่าน/เขียนใน store

## store (`core/store.js`)

- Adapter ปัจจุบันคือ sessionStorage ถ้าเปลี่ยนเป็น Backend ให้เขียน adapter ใหม่ที่มี `load / save / remove / clear` โดยไม่ต้องแก้ Module
- `get()` คืนสำเนา · Default ของแต่ละ Key มาจาก `data/` · เก็บเฉพาะค่าที่ผู้ใช้กรอก ตัวเลขอื่นคำนวณใหม่ตอนแสดง
- **ส่ง `store.data()` ให้ calc แทน `SP.data` เสมอ** (`store.data()` = SP.data ที่แทน Master ด้วยค่าใน store) ค่าที่แก้ในหน้า Master จึงมีผลทุกหน้า
- Key ของปีแผนสร้างด้วย `store.planKey('topDown')` และอ่านปีด้วย `store.year()` ห้ามต่อ String ปีเอง
- `DATA_VERSION` (ปัจจุบัน 13 · CR-32 12 = หน่วยขายและคู่ค้า · 13 = person.userId): ถ้าค่าที่บันทึกมาจากรุ่นก่อน จะถูกล้างครั้งเดียวตอนโหลด (ยกเว้นปีแผนและสถานะเมนูพับ)
  และแจ้งผู้ใช้ 1 ครั้ง (`ui.toast` = `content.site.dataVersionToast`) · `store.reset()` เขียนรุ่นข้อมูลกลับทันที
- CR-30 ลำดับโหลดเพิ่ม: `core/catalog.js` หลัง `core/calc.js` (Product Code · เลขนำหน้า Type · Preset คอลัมน์ · นำเข้าราคา · TRCLOUD) · `core/seed.js` ใส่เลขนำหน้าตั้งต้น แปลงรหัสชั่วคราว และ `calc.normalizeListings` ตอนโหลด
- CR-32 ลำดับโหลดเพิ่ม: `data/seed/seed-mt-branches.js` หลัง `data/stores.js` · `core/units.js` หลัง `core/seed.js` (แบ่งยอดอ้างอิงของคู่ค้าจาก L12M ของหน่วยขายจึงต้องมี history ก่อน) ·
  `core/permissions.js` ผูก `person.userId` ตั้งต้นตอนโหลด (หลัง `core/stores.js` สร้างบุคลากร TT) · ค่าคงที่สุดแผน `settings.PLAN_HORIZON_END` อ่านผ่าน `clock.horizonEnd` / `horizonYears`
- CR-34 ลำดับโหลดเพิ่ม: `core/plan-edits.js` หลัง `core/units.js` (ใช้ calc · permissions · clock)
- store แปลงรูปแบบค่าที่บันทึกจากรุ่นก่อนให้เองตอนโหลด
- เปิดจากไฟล์ใน Firefox (`location.origin === 'null'`) ค่าไม่ส่งต่อข้ามหน้า Header จึงแสดงคำเตือน
- Key ทั้งหมดดูที่ `data-model.md`

## Feature Flags (Phase 1 / Phase 2)

- `data/settings.js` → `FEATURES` = `approvalWorkflow` · `baseline` · `reforecast` · `sellIn` · `npdApproval` (Phase 1 ปิดทั้งหมด · CR-30 ตัด `promotionCalendar` และ `data/promotions.js`)
- อ่านผ่าน `SP.core.features` เท่านั้น ห้ามอ่าน `settings.FEATURES` ตรงๆ
- CR-24: `SP.core.clock` (`core/clock.js`) = เดือนปัจจุบันกลาง จาก `settings.DEMO_CURRENT_MONTH` ('YYYY-MM' · ไม่มีค่า = วันที่เครื่อง) →
  `currentMonth` · `lastClosedMonth` · `l12mRange` · `referenceYear(m)` · `fullYears` · `rangeLabel` — calc / components / stores / Module อ่านจากที่นี่ที่เดียว
- โค้ดและ Test ของ Phase 2 คงไว้ครบ (Test Workflow ยังรัน และรันซ้ำโดยเปิด Flag ทั้งหมด)
- ข้อความใน `content.js` ที่ผูก Flag ใช้ `feature` / `!feature`

## เพิ่มหน้าใหม่

1. คัดลอก `modules/_template/` เป็น `modules/<ชื่อ>/` แล้วเปลี่ยนชื่อไฟล์ JS และ `data-module` ใน `index.html`
2. เพิ่ม 1 บรรทัดใน `core/registry.js` (`id` ใหม่)
3. เพิ่ม `pages.<id>` ใน `data/content.js` (`title` · `short` · `lead` · ข้อความของหน้า)
4. หน้าใหม่ได้สิทธิ์ตั้งต้นของแต่ละบทบาทอัตโนมัติ (ดู · ผู้ดูแลระบบแก้ไข) ปรับได้ที่หน้า Permissions (และเพิ่มในตาราง `data/permissions.js` ถ้าต้องการให้บางบทบาทไม่เห็น)
