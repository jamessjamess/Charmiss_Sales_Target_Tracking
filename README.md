# Sales Target Planning — Concept Prototype

เว็บเล่าแนวคิดระบบตั้ง Sales Target เพื่อขออนุมัติจาก Management และ Sales Director ก่อนสร้างระบบจริง
เป็น HTML + CSS + JavaScript ล้วน ไม่มี Framework ไม่มี Build step ไม่ต้องติดตั้งอะไร

ข้อกำหนดทั้งหมดอยู่ที่ [PROMPT_concept-prototype.md](PROMPT_concept-prototype.md) และ Change Request [PROMPT_change_top-down-v2.md](PROMPT_change_top-down-v2.md), [PROMPT_change_phasing-v2.md](PROMPT_change_phasing-v2.md), [PROMPT_change_sku-v2.md](PROMPT_change_sku-v2.md), [PROMPT_change_approval-topdown-v3.md](PROMPT_change_approval-topdown-v3.md), [PROMPT_change_v4.md](PROMPT_change_v4.md), [PROMPT_change_v5_ux-review.md](PROMPT_change_v5_ux-review.md)

---

## เปิดจากเครื่อง

1. ดับเบิลคลิก `index.html` เว็บจะพาไปหน้าแรกของ Tour (ตอนนี้คือ Top-down ปี 2027)
2. แนะนำ **Chrome หรือ Edge** ตัวเลขที่ลองแก้ในหน้าหนึ่งจะส่งต่อไปหน้าถัดไป
3. ใน Firefox เปิดจากไฟล์ในเครื่องแล้วค่าที่แก้จะไม่ส่งต่อข้ามหน้า (Header จะขึ้นข้อความเตือน) ถ้าจะใช้ Firefox ให้เปิดจาก GitHub Pages แทน

ต้องต่ออินเทอร์เน็ตเพื่อโหลด Font และ Diagram (Mermaid) ถ้าไม่มีเน็ต หน้าเว็บยังอ่านได้ครบ ใช้ Font ของเครื่องและแสดง Diagram แบบกล่องธรรมดาแทน

### ระหว่างนำเสนอ

- **Side Menu** ซ้ายมี 4 กลุ่ม: Sales Planning (4 ขั้น: Top-down → Phasing → วางแผนราย SKU → รายงานสรุปแผน) / Product Master /
  Account Master / ข้อมูลโครงการ (เกี่ยวกับ Prototype) ปุ่ม « ล่างเมนูพับเหลือไอคอน (ชี้ไอคอนเพื่อดูชื่อหน้าและสถานะ)
  หน้าวางแผนราย SKU พับเมนูเองเมื่อจอกว้างน้อยกว่า 1920px / จอแคบเปิดเมนูด้วย ☰
- **ปีแผน** เลือกได้ที่ Header (2026–2028) ข้อมูลแผนแยกตามปี เปลี่ยนปีแล้วค่าที่แก้ของปีเดิมยังอยู่
- **มุมมองผู้ใช้** (Header) จำลองว่าใครกำลังใช้: Management / Sales Director / Sales Person ปุ่มที่หัวหน้าเปลี่ยนตามบทบาท
  - บทบาทที่แก้ไขไม่ได้จะเห็น `อ่านอย่างเดียว · ผู้จัดทำคือ …` และปุ่ม **สลับเป็นมุมมองผู้จัดทำ** (กดแล้วแก้ไขได้ทันที)
  - Top-down: Sales Director กด แก้ไข → ส่งอนุมัติ → สลับเป็น Management → อนุมัติ หรือ ส่งกลับแก้ไข (ต้องใส่เหตุผล)
  - Phasing / วางแผนราย SKU: ผู้รับผิดชอบของ Account/เขตนั้นจัดทำ → ส่ง → Sales Director อนุมัติ
  - ส่งไม่ได้ถ้ายังจัดสรรไม่ครบ (แผน SKU ต้องไม่ขาดเป้า) หรือขั้นบนยังไม่อนุมัติ ปุ่มจะบอกเหตุผล
  - ชื่อผู้จัดทำ / ผู้ส่ง / ผู้อนุมัติ อยู่ใน `ประวัติ ▾` ข้างป้ายสถานะ
- **ทุกหน้าเปิดมาเป็นโหมดดู** ต้องกด **แก้ไข** ก่อน แล้ว **บันทึก** หรือ **ยกเลิก** (ยกเลิกคืนค่าเดิม) ช่องที่ยังไม่บันทึกมีขอบหนา
- สีคงเหลือ: **จัดสรรครบ = เขียว / ขาด = แดง / เกิน = เหลือง / ยังไม่กำหนด = เทา** มีข้อความกำกับเสมอ
- หน้า Top-down และ Phasing แก้ได้ทั้ง % และบาท ตัวเลขเปลี่ยนเมื่อกด **Enter** หรือออกจากช่อง (ตาราง Phasing และ SKU ใช้ลูกศร ← → เลื่อนเดือนได้)
- หน้า Top-down (โหมดแก้ไข): `กระจายตามสัดส่วนปัจจุบัน` ปรับสัดส่วนของ Channel ให้รวม 100% (ต้องกดเอง) / ถังขยะ = นำออกจากแผน /
  `+ เพิ่ม Channel` เลือก Export เพื่อเดโม Channel ใหม่ (เห็นใน Donut และ Filter ของทุกหน้า)
- หน้า **วางแผนราย SKU**: แถว 1 = Channel · Account/เขต · ผู้รับผิดชอบ · ตัวเลขหลัก / แถว 2 = Series · มุมมอง · ⓘ · โหมด · Legend · ?
  (โหมดแก้ไข) `+ เพิ่ม SKU` ที่หัวคอลัมน์ SKU และ `+ เพิ่ม NPD` ในกลุ่ม NPD / Filter Series "Summer Launch 2027" แล้วกด เพิ่มทั้ง Series
  / ชี้ช่องตัวเลขเพื่อดูการคำนวณของช่องนั้น / โหมดปรับแผนใช้ได้หลังล็อก Baseline
- **รายงานสรุปแผน**: KPI · เป้าหมายเทียบแผนรายเดือน · ตาราง Channel → Account/เขต (กดชื่อเพื่อไปหน้าวางแผน) · สัดส่วนตามกลุ่มสินค้า ·
  เป้าหมายรายผู้รับผิดชอบ · รายการที่ต้องดำเนินการ / Filter Channel / ปุ่ม **พิมพ์ / บันทึก PDF** (A4 แนวนอน) /
  Sales Director ล็อก Baseline ได้เมื่อแผน SKU ทุก Account/เขตอนุมัติแล้ว
- **เกี่ยวกับ Prototype** (เมนูล่างสุดหรือลิงก์ที่ Header): ขอบเขต · Decision log · คำถามที่ค้าง · ขั้นต่อไป และสิ่งที่ขออนุมัติ
- หน้า **ผู้รับผิดชอบ**: บันทึกการลาออก แล้วคลิกเดือนแรก–เดือนสุดท้ายใน Timeline เพื่อโอน Account/เขตให้คนใหม่
  ตัวเลขเป้าไม่เปลี่ยน ตารางผลงานรายบุคคลแยกยอดตามเดือนที่แต่ละคนรับผิดชอบ
- หน้า **Listing และวันเริ่มขาย** ติ๊ก Listing (ตอนแก้ไข) แล้วหน้าวางแผนราย SKU จะเห็น SKU นั้น / หน้า Master ทุกหน้าลบรายการด้วยถังขยะ
  (ลบได้เฉพาะรายการที่ยังไม่ถูกใช้ นอกนั้นให้ปิดใช้งาน)
- ปุ่มลูกศร **← →** บนคีย์บอร์ดเปลี่ยนหน้าใน Sales Planning ได้ (ยกเว้นตอนพิมพ์อยู่ในช่องกรอก)
- **รีเซ็ตข้อมูล** ล้างค่าที่ลองแก้ทั้งหมดรวมสถานะอนุมัติ กลับไปใช้ข้อมูลตัวอย่าง (ค่าที่แก้หายเองเมื่อปิดแท็บ)
- **พิมพ์หรือบันทึก PDF** ด้วย Ctrl+P ได้ทุกหน้า เมนูและปุ่มจะถูกซ่อน

### Test สูตรคำนวณ

ดับเบิลคลิก `tests/calc.test.html` หน้าจอจะแสดงผลผ่าน/ไม่ผ่านของทุก Test

---

## Deploy บน GitHub Pages

1. สร้าง Repository ใหม่บน GitHub (Public หรือ Private ที่มี GitHub Pages)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น Branch `main` รวมไฟล์ `.nojekyll` ด้วย
   (ถ้าไม่มี `.nojekyll` GitHub จะข้ามโฟลเดอร์ที่ขึ้นต้นด้วย `_` เช่น `modules/_template/`)
3. ไปที่ **Settings → Pages**
4. ที่ **Build and deployment** เลือก Source = **Deploy from a branch**, Branch = **main**, Folder = **/ (root)** แล้วกด Save
5. รอ 1–2 นาที GitHub จะแสดงลิงก์ เช่น `https://<ชื่อบัญชี>.github.io/<ชื่อ-repo>/`

ลิงก์ทั้งหมดในเว็บเป็นแบบ Relative จึงใช้ได้ทั้งบนเครื่องและบน GitHub Pages โดยไม่ต้องแก้อะไร

---

## แก้ข้อความหรือข้อมูลตัวอย่าง

| ต้องการแก้ | ไฟล์ |
|---|---|
| ข้อความทุกหน้า, ปัญหาของ Excel, Decision log, คำถามที่ค้าง (หน้าเกี่ยวกับ Prototype) | `data/content.js` |
| VAT, ราคารวม VAT หรือไม่, จำนวนเดือน NPD, เดือนที่ล็อก Forecast | `data/settings.js` |
| ปีที่เลือกได้และปีตั้งต้น | `data/settings.js` (`PLAN_YEARS`, `DEFAULT_PLAN_YEAR`) |
| Channel Master (หน่วยแบ่งเป้า Account/เขต, มี GP หรือไม่, สี) | `data/channels.js` |
| Account Master (Account และ GP ที่มีผล) | `data/accounts.js` |
| เขตการขายของ TT | `data/territories.js` |
| Sales Person (เริ่มงาน/ลาออก) | `data/salespeople.js` |
| ผู้รับผิดชอบแต่ละหน่วยตามช่วงเดือน | `data/assignments.js` |
| SKU, วันเริ่มขาย, เดือนเลิกขาย, Clearance (Product Master ตั้งต้น) | `data/products.js` |
| Listing ตั้งต้น (SKU ใดขายใน Account ใด) | `data/listings.js` |
| ยอดขายจริงสมมติของปี 2027 (ใช้ในโหมดปรับแผน) | `data/actuals.js` |
| Price List, Promotion | `data/pricing.js` |
| Total Target, Channel และ % แบ่งตั้งต้น, หน่วยในแผนตั้งต้นต่อปี | `data/targets.js` |
| ยอดย้อนหลังรายเดือนต่อ Account/เขต ปี 2025–2026 และ Run-rate | `data/history.js` |
| จำนวนชิ้นที่กำหนดเองในแผน SKU ตั้งต้น (ให้ตัวอย่างมี Account/เขตที่จัดสรรครบ) | `data/plan-seeds.js` |
| สี ฟอนต์ ขนาด | `styles/tokens.css` |

ห้ามพิมพ์ตัวเลขที่เป็นผลคำนวณลงในข้อความ ทุกตัวเลขคำนวณจาก `core/calc.js`

---

## โครงสร้างไฟล์

```
index.html            พาไปหน้าแรกของ Sales Planning (หน้า home ถูกซ่อนอยู่ ไฟล์ยังอยู่ที่ modules/home/)
core/                 ส่วนกลาง: loader, registry, layout, store, calc, workflow, format, components, charts, paths
data/                 ข้อมูลตัวอย่างและข้อความ (ไม่มี Logic)
styles/               app.css (ไฟล์เดียวที่ทุกหน้าลิงก์) → tokens, base, components, print
modules/<ชื่อ>/        1 Module = 1 โฟลเดอร์: index.html + <ชื่อ>.js (+ <ชื่อ>.css ถ้าจำเป็น)
modules/_template/    โครงตั้งต้นสำหรับ Module ใหม่
tests/                Test ของสูตร
```

ทุกหน้ามีแค่ `<link>` ไปที่ `styles/app.css`, `<main id="module-root">` และ Script บรรทัดเดียว:

```html
<script src="../../core/loader.js" data-module="top-down.js"></script>
```

`loader.js` โหลดไฟล์ใน `core/` และ `data/` ตามลำดับ แล้วโหลด JS ของ Module จากนั้น `layout.js` สร้าง Header (ชื่อระบบ + ป้าย Prototype, ปีแผน, มุมมองผู้ใช้, เกี่ยวกับ Prototype, รีเซ็ต), Side Menu, แถบก่อนหน้า/ถัดไป, หัวข้อ และคำอธิบายให้เอง (Module ใส่ `workflowBar` ในแถวหัวข้อผ่าน `ctx.intro`)

---

## เพิ่ม Module ใหม่ทีละขั้น

ตัวอย่าง: เพิ่มหน้า "ตรวจราคา" id = `priceCheck` โฟลเดอร์ = `price-check`

1. **คัดลอกโฟลเดอร์** `modules/_template/` เป็น `modules/price-check/`
2. **เปลี่ยนชื่อไฟล์** `modules/price-check/template.js` เป็น `price-check.js`
3. **แก้ `modules/price-check/index.html`** บรรทัด Script ให้ชี้ไฟล์ใหม่:
   ```html
   <script src="../../core/loader.js" data-module="price-check.js"></script>
   ```
4. **แก้ `price-check.js`**
   - บรรทัดสุดท้าย `SP.modules.template = ...` เป็น `SP.modules.priceCheck = { render: render };`
   - แก้ Comment หัวไฟล์: หน้าที่, ข้อมูลที่อ่านจาก `data/`, Key ที่อ่าน/เขียนใน store
   - เขียนเนื้อหาใน `render(root, ctx)`
5. **เพิ่ม 1 บรรทัดใน `core/registry.js`** ตรงตำแหน่งที่ต้องการใน Tour:
   ```js
   { id: 'priceCheck', title: 'ตรวจราคา', short: 'ตรวจราคา', icon: 'P', path: 'modules/price-check/index.html', group: 'product-master', tour: null, visible: true },
   ```
   แล้วเลื่อนเลข `tour` ของหน้าหลังจากนั้นขึ้นทีละ 1 (หรือใส่ `tour: null` ถ้าไม่ให้อยู่ใน Tour)
   `group` = กลุ่มใน Side Menu (`sales-planning` | `product-master` | `account-master` | `project-info`) / `short` = ชื่อในเมนู (บรรทัดเดียว) / `icon` = ตัวอักษรตอนพับเมนู
   ถ้าเป็นขั้นใน Sales Planning ใส่ `group: 'sales-planning'` และเลข `tour` (เลขขั้นและปุ่มก่อนหน้า/ถัดไปนับใหม่เอง) / `visible: false` = ซ่อนจากเมนู
6. **เพิ่มข้อความหน้าใน `data/content.js`** ใต้ `pages`:
   ```js
   priceCheck: {
     title: 'ตรวจราคา',
     lead: ['คำอธิบาย 1 บรรทัด ว่าหน้านี้ทำอะไร'],   // วิธีใช้ปุ่มให้อยู่ใน Tooltip หรือแผง ?
     approve: ['สิ่งที่ต้องการให้อนุมัติ']      // ไม่มีก็ลบออก
   }
   ```
7. ถ้าต้องมี CSS เฉพาะหน้า สร้าง `modules/price-check/price-check.css` แล้วเพิ่ม `<link>` ใน `index.html` ต่อจาก `app.css` (ใช้สีจาก `var(--...)` ใน `tokens.css` เท่านั้น)
8. ดับเบิลคลิก `index.html` แล้วตรวจว่าหน้าใหม่อยู่ใน Side Menu (และปุ่มก่อนหน้า/ถัดไปถ้าเป็นขั้นใน Sales Planning)

**ซ่อน Module ชั่วคราว** = ตั้ง `visible: false` ใน `core/registry.js` (ไฟล์ยังอยู่ เปิดกลับได้) ตอนนี้หน้า "ภาพรวม", "ใครดูแลข้อมูลอะไร", "Status SKU", "จากจำนวนชิ้นถึง Net Sales" และ "อนุมัติ" ซ่อนอยู่

**ถอด Module** = ลบบรรทัดใน `core/registry.js` (จะลบโฟลเดอร์ด้วยก็ได้) หน้าอื่นไม่ได้รับผลกระทบ

### กติกาของ Module

- ใช้ได้เฉพาะ `SP.core.*` และ `SP.data.*` ห้ามเรียกโค้ดของ Module อื่น
- ส่งข้อมูลข้ามหน้าผ่าน `SP.core.store` เท่านั้น ข้อมูลแผนใช้ Key ตามปี: `SP.core.store.planKey('priceCheck')` → `plan.<ปี>.priceCheck`
- สูตรใหม่ให้เพิ่มใน `core/calc.js` พร้อม Test ใน `tests/calc.test.js` / กฎการอนุมัติอยู่ที่ `core/workflow.js` (Module เรียกผ่าน `components.workflowBar`)
- ส่ง `SP.core.store.data()` ให้ calc แทน `SP.data` เพื่อให้ค่าที่แก้ในหน้า Master มีผล
- ห้าม Hardcode ชื่อหรือจำนวน Channel อ่านจาก `SP.data.channels` และ Channel ในแผนของปี
- จัดรูปแบบตัวเลขด้วย `SP.core.format` และใช้ UI จาก `SP.core.components`
- ห้ามสร้างตัวแปร Global อื่นนอกจาก `window.SP` (ห่อไฟล์ด้วย IIFE เหมือน Template)

### Key ใน store ที่มีอยู่

| Key | ค่า | เขียนโดย |
|---|---|---|
| `app.planYear` | ปีแผนที่เลือก | Header (layout.js) |
| `plan.<ปี>.topDown` | `{ total, channels: [channelId], pct: { <channelId/unitId>: สัดส่วน }, units: { <channelId>: [unitId] } }` | top-down |
| `plan.<ปี>.phasing.<unitId>` | `{ monthPct: [12 สัดส่วน], edited }` | phasing |
| `plan.<ปี>.sku.<unitId>` | `{ items: { <sku>: { startMonth, qty, overrides, stopped } } }` แผนครั้งแรก | sku-planning |
| `plan.<ปี>.forecast.<unitId>` | โครงเดียวกัน แผนโหมดปรับแผน (ไม่เขียนทับแผนครั้งแรก) | sku-planning |
| `plan.<ปี>.workflow.<step>.<unitId\|all>` | `{ status, history, snapshot }` สถานะอนุมัติ (topDown, phasing, sku, forecast, baseline) | workflowBar, summary (ล็อก Baseline) |
| `master.products` / `master.listings` | Product Master และ Listing (ไม่แยกปี) | product-master |
| `master.accounts` / `master.territories` | Account (GP) และเขตการขาย | accounts, territories |
| `master.salespeople` / `master.assignments` | Sales Person และผู้รับผิดชอบตามช่วงเดือน | salespeople (หน้าผู้รับผิดชอบ) |
| `ui.selection` | `{ channel, unit }` ของตัวเลือก Channel / Account หรือเขต (หน้า Phasing และ SKU ใช้ร่วมกัน) | phasing, sku-planning, summary |
| `ui.planMode` / `ui.currentMonth` | โหมดแผน และเดือนปัจจุบันจำลอง (ใช้กับผู้รับผิดชอบและ Performance ด้วย) | sku-planning, salespeople |
| `ui.role` | บทบาทจำลอง `{ type, personId }` | Header (layout.js), ปุ่มสลับมุมมองใน workflowBar |
| `ui.sidebarCollapsed` | Side Menu พับอยู่หรือไม่ | layout.js |
| `ui.seriesFilter` | Series ที่เลือก (หน้า SKU และ Product Master ใช้ร่วมกัน) | sku-planning, product-master |
| `ui.productMaster.channel` / `ui.masterChannel` | Channel ที่เลือกในหน้า Product Master / Account | product-master, accounts |
