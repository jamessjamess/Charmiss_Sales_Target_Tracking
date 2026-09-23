# CLAUDE.md — Sales Target Planning (Concept Prototype)

เว็บเล่า Concept ระบบตั้ง Sales Target ของ Charmiss เพื่อให้ Management / Sales Director อนุมัติแนวคิด
ผู้ชมไม่ใช่สายเทคนิค ต้องเข้าใจใน 10–15 นาที ไม่มี Login ไม่มีฐานข้อมูล ไม่มี Import/Export
ข้อกำหนดเต็มอยู่ที่ `PROMPT_concept-prototype.md` และ Change Request ตามลำดับ: `PROMPT_change_top-down-v2.md` (ปีแผน, Account Master,
% ↔ บาท) → `PROMPT_change_phasing-v2.md` (Filter Channel, ตาราง Phasing) → `PROMPT_change_sku-v2.md` (Product Master, โหมดแผน,
cellState, subChannelPicker) → `PROMPT_change_approval-topdown-v3.md` (Channel Master, Workflow ต่อขั้น, Top-down ใหม่, charts)
→ `PROMPT_change_v4.md` (เขตการขาย + ผู้รับผิดชอบตามช่วงเดือน, Side Menu, Series, โหมดแก้ไข, ⓘ/Tooltip) — v4 ข้อ 1 แทน v3 ข้อ 2
→ `PROMPT_change_v5_ux-review.md` (UX/UI ทั้งระบบ: คำศัพท์, สีคงเหลือ, แถวคงเหลือ, หัวหน้า, บทบาทอ่านอย่างเดียว, แถบบริบท,
Top-down/Phasing/SKU ใหม่, รายงานสรุปแผน, หน้าเกี่ยวกับ Prototype, ข้อมูลตั้งต้น) — v5 แทนข้อที่ขัดกันของ CR ก่อนหน้า
วิธีเปิด/Deploy/เพิ่ม Module อยู่ที่ `README.md`

ผู้ใช้ต้องการ HTML ธรรมดา ห้ามเสนอ npm, Build tool หรือ Framework

## ข้อกำหนดทางเทคนิค (ห้ามฝ่า)

- HTML + CSS + JS ล้วน ต้องดับเบิลคลิก `index.html` เปิดผ่าน `file://` ได้ และ Deploy GitHub Pages ได้
- ห้าม ES Modules (`type="module"`, `import`, `export`), ห้าม `fetch()` ไฟล์ในเครื่อง, ห้าม localStorage, ห้าม Library กราฟ
- ทุกไฟล์ JS ห่อด้วย IIFE และผูกไว้ใต้ `window.SP` ตัวเดียว (`SP.core.*`, `SP.data.*`, `SP.modules.*`)
- ลิงก์เป็น Relative และชี้ไฟล์ `index.html` ตรงๆ ห้ามลิงก์ชื่อโฟลเดอร์ ห้าม Path ขึ้นต้นด้วย `/`
  สร้างลิงก์ด้วย `SP.core.paths.to('modules/x/index.html')`
- ไฟล์ภายนอกได้ 2 อย่าง: Google Font (IBM Plex Sans Thai ใน `styles/app.css`) และ Mermaid จาก jsDelivr
  (โหลดผ่าน `components.diagram()` ต้องมี fallback เป็น HTML เสมอ)
- ต้องมี `.nojekyll` ที่ Root ไม่อย่างนั้น GitHub Pages จะข้าม `modules/_template/`

## หลักการแยก Module

1. 1 Module = 1 โฟลเดอร์ใน `modules/`: `index.html` + `<ชื่อ>.js` (+ `<ชื่อ>.css` เฉพาะเมื่อจำเป็น)
   หน้าแรกเป็นข้อยกเว้น: `index.html` ที่ Root ใช้ `modules/home/home.js` (ซ่อนอยู่ Root จึงพาไปหน้าแรกของ Sales Planning)
2. Module ใช้ได้เฉพาะ `SP.core.*` และ `SP.data.*` ห้ามเรียกโค้ดของ Module อื่น
3. ส่งข้อมูลข้าม Module ผ่าน `SP.core.store` เท่านั้น (ห้ามแตะ sessionStorage ตรงๆ)
4. ห้ามซ้ำซ้อน:
   - Header (ชื่อระบบ + ป้าย Prototype · ปีแผน · มุมมองผู้ใช้ · เกี่ยวกับ Prototype · รีเซ็ต) / Side Menu / แถบก่อนหน้า-ถัดไป /
     หัวข้อ / คำอธิบาย → `core/layout.js`
   - รายการไฟล์ core/ และ data/ ที่โหลด → `core/loader.js` (`FILES`)
   - สูตร → `core/calc.js` (pure functions) / กฎ Workflow → `core/workflow.js` (pure functions) / ตัวเลขและเดือน → `core/format.js`
   - UI ที่ใช้หลายหน้า → `core/components.js` + `styles/components.css` / กราฟ → `core/charts.js` (SVG/CSS เขียนเอง)
   - สีและขนาด → `styles/tokens.css` เท่านั้น (CSS อื่นและ Module ใช้ `var(--...)`, JS ห้ามตั้งค่าสี
     สี Channel/คน ส่งเป็นชื่อ Token เช่น `style: { '--c': C.tokenVar('--ch-1') }`)
   - ข้อความทุกหน้า → `data/content.js` (`pages.<id>`, `labels.*`) / ห้ามเขียนตัวเลขผลลัพธ์ลงใน HTML หรือข้อความ
   - ห้าม Hardcode ชื่อหรือจำนวน Channel: อ่านจาก Channel Master (`SP.data.channels`) และ `plan.<ปี>.topDown.channels`
   - ค้นหน่วยแบ่งเป้าใช้ `calc.unitInfo`, `calc.unitsOfChannel`, `calc.availableUnits`, `calc.resolveSelection`, `calc.gpOf`
     (SKU ใช้ `product.sku` ไม่ใช่ id)
   - Status / วิธีเติมยอด / เหตุผลช่องล็อก / สิทธิ์แก้ช่อง / ชิ้น → Net Sales / ผลรวม Series คำนวณใน calc เท่านั้น
     (`skuStatus`, `planYearStatus`, `cellSource`, `lockReason`, `cellState`, `skuPlanGrid`, `availableSkus`, `stopPlanItem`, `sumRows`)
   - % ↔ บาท, การเติบโต, สัดส่วนปีก่อน, Seasonality, กระจายตามสัดส่วนปัจจุบัน ใน calc เท่านั้น (`amountFromPct`, `pctFromAmount`,
     `growth`, `normalizeShares`, `priorShares`, `priorChannelShares`, `phasingTotals`, `defaultPhasing`, `phasingBasis`)
   - คงเหลือ `calc.remaining` (`emptyRemaining` = ยังไม่กำหนด) / รายงาน `calc.planMix`, `calc.addMonthly` / ลบ Master `calc.canRemoveUnit`
   - ผู้รับผิดชอบ / Performance ใน calc เท่านั้น (`ownerOf`, `ownerSegments`, `setOwner`, `setEndMonth`, `validateAssignments`,
     `assignmentAlerts`, `eligiblePeople`, `performanceByPerson`, `personPerformance`, `actualNetByUnit`)
   - ห้ามเขียน Logic Workflow ใน Module: เรียก `workflowBar` (components) ซึ่งเรียก `core/workflow.js` (`viewState` สำหรับบทบาทที่แก้ไม่ได้)
5. Side Menu และลำดับ Tour มาจาก `core/registry.js` (`{ id, title, short, icon, path, group, tour, visible, fit }`)
   - `group` = `'sales-planning' | 'product-master' | 'account-master' | 'project-info'` → Side Menu 4 กลุ่มสร้างอัตโนมัติ
     (ข้อมูลโครงการ = เกี่ยวกับ Prototype อยู่ท้ายสุด)
   - เลขขั้น "ขั้นที่ x/n" และปุ่มก่อนหน้า/ถัดไป นับเฉพาะหน้า visible ในกลุ่ม Sales Planning (4 ขั้น:
     Top-down → Phasing → วางแผนราย SKU → รายงานสรุปแผน) หน้ากลุ่มอื่นไม่มีเลขขั้นและปุ่มก่อนหน้า/ถัดไป
   - ซ่อน (ห้ามลบไฟล์): home, masterData, skuStatus, measureChain, approval — เปิดตรงได้ยังทำงาน
   - `fit: true` = หน้าสูงเท่าจอที่ ≥ 1024px (`body.fit-screen`) ตาราง/กราฟเลื่อนภายใน (Top-down, วางแผนราย SKU, ผู้รับผิดชอบ,
     เกี่ยวกับ Prototype)
   - `short` = ชื่อในเมนู บรรทัดเดียว รองรับ `{territoryChannels}` = ชื่อ Channel ที่แบ่งตามเขต (เมนู "เขตการขาย (TT)")
   เพิ่ม Module = คัดลอก `modules/_template/` + 1 บรรทัดใน registry (+ ข้อความใน `content.js`) ขั้นตอนเต็มใน README
6. ทุกไฟล์ JS ของ Module มี Comment หัวไฟล์: หน้าที่, ข้อมูลที่อ่านจาก data/, Key ที่อ่าน/เขียนใน store

### ลำดับการโหลด (loader.js)

paths → format → data/* (settings, channels, accounts, territories, salespeople, assignments, products, listings, pricing, targets,
history, actuals, plan-seeds, content) → calc → workflow → registry → store → components → charts → layout → JS ของ Module → `layout.boot()`
`boot()` หา entry จาก registry ด้วย Path ของหน้า, สร้าง Header + Side Menu + หัวข้อ แล้วเรียก
`SP.modules[entry.id].render(bodyEl, ctx)` — `ctx = { entry, page, content, year, intro (แถวหัวข้อ ใส่ workflowBar), refreshMenu() }`
หลัง render ถ้ามี `page.approve` layout ต่อกล่อง "สิ่งที่ขออนุมัติ" (`page.approveTitle`) ท้ายหน้า (ตอนนี้คือหน้าเกี่ยวกับ Prototype)
(ถ้าหน้าไม่อยู่ใน registry เช่น tests ใช้ Module ตัวเดียวที่ลงทะเบียนไว้)

### store

- ข้อมูลแผนแยกตามปี (ปีที่เลือกใน Header เก็บที่ `app.planYear` ตัวเลือกจาก `settings.PLAN_YEARS`):
  - `app.planYear` — เปลี่ยนแล้ว reload หน้า
  - `plan.<ปี>.topDown` = `{ total, channels: [channelId], pct: { <channelId|unitId>: สัดส่วน }, units: { <channelId>: [unitId] } }`
  - `plan.<ปี>.phasing.<unitId>` = `{ monthPct: [12 สัดส่วน], edited: bool }` → บาทรายเดือน `calc.phasingTotals(เป้าทั้งปี, monthPct).amounts`
  - `plan.<ปี>.sku.<unitId>` = `{ items: { <sku>: { startMonth, qty: [12], overrides: [12 bool], stopped } } }` แผนครั้งแรก (Baseline)
    default = `calc.defaultSkuPlan(master, id, year, true, planSeeds.years[ปี][id])` (SKU ที่ Listing และขายอยู่ ไม่รวม NPD
    + จำนวนชิ้นที่กำหนดใน `data/plan-seeds.js` = กรอกเอง/Override)
  - `plan.<ปี>.forecast.<unitId>` = โครงเดียวกัน ใช้ในโหมดปรับแผน default = สำเนาของ Baseline ห้ามเขียนทับ Baseline
  - `plan.<ปี>.workflow.<step>.<unitId|all>` = `{ status, history: [{ action, by, at, note }], snapshot, prevSnapshot }`
    step = `topDown` (all) | `phasing` | `sku` | `forecast` | `baseline` (all) ไม่มี Key = ฉบับร่าง
    อ่าน/เขียนทั้งปีด้วย `store.workflowStates()` / `store.saveWorkflowStates(map)` (map Key = `'<step>.<unitId|all>'`)
- Master (ไม่แยกปี) default จากไฟล์ใน `data/`: `master.products`, `master.listings`, `master.accounts`, `master.territories`,
  `master.salespeople`, `master.assignments` → `store.master()` คืนทั้งหมด / `store.data()` = SP.data ที่แทน Master ด้วยค่าใน store
  **ส่ง `store.data()` ให้ calc แทน SP.data เสมอ** ค่าที่แก้ในหน้า Master จึงมีผลทุกหน้า
- UI: `ui.selection` = `{ channel, unit }` (Phasing และวางแผน SKU ใช้ร่วมกัน รายงานตั้งก่อนพาไปหน้านั้น) /
  `ui.planMode` = `'initial' | 'reforecast'` (reforecast ใช้ได้หลังล็อก Baseline) / `ui.currentMonth` = เดือนปัจจุบันจำลอง 0–11
  (default `DEMO_FORECAST_MONTH` = มี.ค.) ใช้ร่วมกันทั้งโหมดปรับแผน ผู้รับผิดชอบ และ Performance (`store.currentKey()` = 'YYYY-MM') /
  `ui.role` = `{ type, personId }` (`store.role()` ปุ่มสลับมุมมองใน workflowBar ตั้งค่านี้แล้ว reload) / `ui.sidebarCollapsed` /
  `ui.seriesFilter` = [Series] (SKU และ Product Master ใช้ร่วมกัน) / `ui.productMaster.channel` / `ui.masterChannel` (หน้า Account)
  Filter Channel ของรายงาน และแท็บของหน้าเกี่ยวกับ Prototype เป็นตัวแปรใน Module (ไม่เก็บ)
- store แปลงค่าจากรุ่นก่อนให้เองตอนโหลด: phasing แบบ Array, `ui.phasing.selection` → `ui.selection`, `{ account }` → `{ unit }`,
  topDown `accounts` → `units` + `channels`, `master.products` `campaign` → `series`,
  `plan.<ปี>.salesPerson.<unitId>` → `master.assignments` ทั้งปี แล้วลบ Key เดิม (เลิกใช้)
- Module สร้าง Key ด้วย `store.planKey('topDown')` และอ่านปีด้วย `store.year()` ห้ามต่อ String ปีเอง
- ปีที่ไม่มีใน `targets.years` เริ่มจาก 0 ใช้ `targets.defaultChannels` และ `targets.defaultUnits`
- เก็บเฉพาะค่าที่ผู้ใช้กรอก (% เก็บความละเอียดเต็ม บาทคำนวณจาก % เสมอ) ตัวเลขอื่นคำนวณใหม่ตอนแสดงผล
- Default มาจาก `data/` (กำหนดใน `DEFAULTS` ของ store.js) `get()` คืนสำเนา
- Adapter ปัจจุบัน = sessionStorage ถ้าเปลี่ยนเป็น Backend ให้เขียน adapter ใหม่ (load/save/remove/clear)
- เปิดจากไฟล์ใน Firefox (`location.origin === 'null'`) ค่าไม่ส่งต่อข้ามหน้า → Header แสดงคำเตือน

### ข้อมูลหลัก

- `data/channels.js` = Channel Master `{ id, name, fullName, colorToken, allocationUnit: 'ACCOUNT'|'TERRITORY', sellOutMethod:
  'ACTUAL'|'SELL_IN_MINUS_CN', hasGP, active, order }` สี `--ch-1`…`--ch-8` (`calc.channelColor` ไม่มี colorToken = สีตาม order)
  MT/ECOM = ACCOUNT, TT = TERRITORY (hasGP false, SELL_IN_MINUS_CN), Export = ACCOUNT `active: false` (ไม่อยู่ในแผนตั้งต้น
  แต่เลือกได้จาก "+ เพิ่ม Channel") / sellOutMethod ตอนนี้แสดงผลเท่านั้น ยังไม่ใช้คำนวณ
- หน่วยแบ่งเป้า (`unit` ในโค้ด / ในหน้าจอเรียก "Account / เขตการขาย") = Account หรือเขต ตาม `allocationUnit` ของ Channel id ไม่ซ้ำกัน
  ใช้เป็น Key ทุกที่ (phasing, sku, listing, history, actuals, promotions.subChannel) — เป้า ยอดขาย และ History ผูกกับหน่วย **ไม่ผูกกับคน**
  - `data/accounts.js` = `{ id, name, channelId, active, gp, gpFrom }` (GP ย้ายมาจาก pricing; `calc.gpOf` = 0 ถ้า Channel hasGP false)
  - `data/territories.js` = `{ id, channelId, name, active }` TT 5 เขต (id เดิม `tt-north` … + `tt-east`) ป้ายหน่วย = "เขต"
- `data/salespeople.js` = `{ id, name, channelId | null, startMonth, endMonth }` (null channel = ดูแลได้ทุก Channel)
- `data/assignments.js` = `{ unitId, salesPersonId | null, fromMonth, toMonth | null }` ('YYYY-MM') กฎ: 1 หน่วย 1 เดือน 1 คน ช่วงห้ามทับ
  (`validateAssignments`), แก้เดือนก่อนเดือนปัจจุบันไม่ได้ (`setOwner` → error 'past'), เปลี่ยนได้ทุกเดือนที่ยังไม่ผ่าน (ไม่ติด M+1..M+3),
  คนที่เลย endMonth แล้ว = ว่าง + Alert "มีรายการที่ยังผูกกับผู้ที่ลาออก" / ข้อมูลตั้งต้น: EVEANDBOY เปลี่ยนคน มี.ค. 2027, TT เขต 3 ว่าง
- `data/history.js` = `years.<ปี>.monthly.<unitId>` + `actualMonths` / ยอด Channel = รวมทุกหน่วยใน Master ของ Channel
- `data/products.js` = `{ sku, name, series, note, launchDate, discontinueMonth, clearance, manualDefault }` / `data/listings.js` =
  `[{ sku, accountId (= unitId) }]` / Series "Summer Launch 2027" = A + H (เดโม "เพิ่มทั้ง Series")
  ราคา = `product.price` หรือ `pricing.priceList[sku]` → `calc.productPrice` / Stock Clearance แบ่งเท่ากันทุกหน่วยที่ Listing
- `data/actuals.js` = ยอดขายจริงสมมติ `years.2027.<unitId>.<sku>` = [12 ชิ้น] ตัวเลขคงที่ ห้ามสุ่มตอนเปิด
- `data/plan-seeds.js` = `years.<ปี>.<unitId>.<sku>.<เดือน>` = ชิ้น (เติมในแผน SKU ตั้งต้นเป็น Override) ตอนนี้ tt-central ธ.ค.
  ให้เขต 3 จัดสรรครบพอดี
- ข้อมูลตั้งต้นสำหรับนำเสนอ (v5 ข้อ 7, Test "v5: ข้อมูลตั้งต้น"): Total 2027 = 120,000,000 / ยอดขายปีก่อนรวม 113.2 ล้าน (+6.0%) /
  แผน SKU รวมต่างจากเป้า −0.4% / ขาด: 7-Eleven, TT เขต 1, Shopee, Lazada · เกิน: Watsons, EVEANDBOY, TT เขต 2, Tiktok ·
  จัดสรรครบ: TT เขต 3 / Top-down ตั้งต้น MT 95% (ขาด) TT 105% (เกิน) ECOM 100% / รีเซ็ตข้อมูลคืนค่าชุดนี้

### มาตรฐานกลาง (v5 ข้อ 1)

- ภาษาไทยทางการ ประโยคสั้น ไม่ใช้ภาษาพูด / คำอธิบายใต้หัวข้อ 1 บรรทัด บอกว่าหน้านี้ทำอะไร (วิธีใช้อยู่ใน Tooltip หรือแผง ?)
  ศัพท์ธุรกิจเป็นภาษาอังกฤษ: Target, Net Sales, Sell-out Amount, GP, SKU, Channel, Account, Series, NPD, Forecast, Baseline
- ตารางคำศัพท์ (ใช้ให้ตรงกันทุกหน้า): หน่วยแบ่งเป้า → Account / เขตการขาย · % ของชั้นบน → สัดส่วน (%) · เป้า (บาท) → เป้าหมาย (บาท) ·
  ปีก่อน → ยอดขายปีก่อน · Growth → การเติบโต · % ของปี → สัดส่วนรายเดือน (%) · Net Sales (แถว Phasing) → เป้าหมาย Net Sales (บาท) ·
  Growth vs ปีก่อน → การเติบโตเทียบปีก่อน · Remaining → คงเหลือ · ครบ/ยังจัดสรรไม่ครบ/เกินเป้า → จัดสรรครบ / ขาด {จำนวน} / เกิน {จำนวน} ·
  ร่าง → ฉบับร่าง · ส่งกลับแก้ → ส่งกลับแก้ไข · ต้องตรวจใหม่ → ต้องตรวจสอบใหม่ · เปิดให้แก้ → เปิดให้แก้ไข ·
  ดูในบทบาท → มุมมองผู้ใช้ (จำลองสำหรับการนำเสนอ) · ผู้ส่ง (ตอนฉบับร่าง) → ผู้จัดทำ · กำลังแก้ไข → โหมดแก้ไข · ยังไม่มีรายการที่เปลี่ยนแปลง /
  มีรายการที่ยังไม่บันทึก n รายการ · เมนู Sales Person และผู้รับผิดชอบ → ผู้รับผิดชอบ · สรุปและสถานะอนุมัติ → รายงานสรุปแผน
- ตัวเลข: ตารางที่กรอก = บาทเต็ม ไม่มีทศนิยม / กราฟและรายงาน = ล้านบาท 2 ตำแหน่ง (`F.millionPlain`) หน่วยที่หัวคอลัมน์หรือแกน /
  % ช่องกรอก 2 ตำแหน่ง การเติบโต 1 ตำแหน่ง (`F.growth`, `C.growthText`: เป้าหมาย 0 → `–`, ไม่มียอดปีก่อน → `ใหม่`) /
  ห้ามตัวย่อ "ล." ห้ามตัดตัวเลขด้วย "…" (คอลัมน์ไม่พอ = ลดขนาดตัวอักษร) / ห้ามปนหน่วยในบรรทัดเดียว / tabular-nums ชิดขวา
- สีสถานะคงเหลือ Token `--status-complete` / `--status-short` / `--status-over` / `--status-empty` (+ `-bg`, `-fg`):
  จัดสรรครบ (±1 บาท) = เขียว / **ขาด = แดง** / **เกิน = เหลือง** / ยังไม่กำหนด (เป้าชั้นบน 0 หรือยังไม่มี Account/เขต) = เทาอ่อน
  class `alert-<status>` (พื้น), `text-<status>` (ตัวอักษร), `rem-<status>` (แถวคงเหลือ), `dot-<status>` / ป้ายทั่วไปที่ไม่ใช่คงเหลือใช้
  `tag-ok | tag-warn | tag-danger | tag-muted` / ห้ามสื่อสถานะด้วยสีอย่างเดียว ต้องมีข้อความกำกับเสมอ
- **แถวคงเหลือ** `components.remainingRow({ rem, tag: 'tr'|'div', cells, label, labelColspan, className })` แทน Chip ในตาราง:
  ป้ายซ้าย `คงเหลือ · ขาด/เกิน/จัดสรรครบ/ยังไม่กำหนด` ตัวเลขอยู่ในคอลัมน์เดียวกับตัวเลขที่ต้องปรับ พื้นแถวสีอ่อนตามสถานะ
  (`remainingAmount`, `remainingPct`, `remainingText(rem, format)`) / Chip คงเหลือ (`alertBadge`) ใช้เฉพาะ Dropdown หรือเมนู และมีข้อความในตัว
- โครงหัวหน้า (layout): `[ขั้นที่ x/4] หัวข้อ [ป้ายสถานะ] ประวัติ ▾ ........ [ปุ่ม workflowBar]` + คำอธิบาย 1 บรรทัด
  ชื่อผู้จัดทำ/ผู้ส่ง/ผู้อนุมัติอยู่ใน `ประวัติ ▾` เท่านั้น / หัวข้อรองรับ `{year}` (`รายงานสรุปแผน {year}`)
- **บทบาทที่แก้ไขไม่ได้** (`W.viewState(state, role, { step, ownerId, ownerName, editing, locked })` → `kind`):
  `actions` = มีปุ่ม / `readOnly` = `อ่านอย่างเดียว · ผู้จัดทำคือ {ชื่อ}` + ปุ่ม `สลับเป็นมุมมองผู้จัดทำ` (รออนุมัติ = `รอ {ผู้อนุมัติ} อนุมัติ`
  + `สลับเป็นมุมมองผู้อนุมัติ`) / `waiting` = บทบาทเป็นผู้อนุมัติแต่ยังไม่ส่ง → `อ่านอย่างเดียว · รอผู้จัดทำส่งอนุมัติ (ผู้จัดทำคือ …)`
  + ปุ่มสลับเป็นผู้จัดทำ / `none` = อนุมัติแล้วหรือล็อก Baseline แล้ว / ปุ่มสลับตั้ง `ui.role` แล้ว reload
- แถบบริบทแถวเดียว (Phasing, วางแผนราย SKU) `.ctx-bar` = `subChannelPicker` + `contextStats`:
  `Channel | ‹ Account/เขต ▾ › | ผู้รับผิดชอบ: … · GP (เฉพาะ hasGP) · เป้าหมายทั้งปี · ยอดขายปีก่อน · การเติบโต`
  Dropdown ตอนปิด = ชื่อเท่านั้น / ตอนเปิด = ชื่อ · ผู้รับผิดชอบ · คงเหลือ (ข้อความ + สี) · สถานะ Workflow (ข้อความ) ไม่มีจุดไร้คำอธิบาย
  ชื่อผู้รับผิดชอบแสดงครั้งเดียวต่อหน้า แถบผู้รับผิดชอบรายเดือนแสดงเฉพาะเมื่อมีหลายคนในปี (`calc.ownerSegments` > 1)
  จอ < 1800px ย่อตัวอักษร ซ่อนป้าย Account/เขต (อยู่ใน title ของปุ่ม) / จอ < 1340px ขึ้นบรรทัดใหม่ได้
- เมนูข้าง: ชื่อบรรทัดเดียว / พับแล้วแสดงไอคอน + Tooltip `ชื่อหน้า · สถานะ` ไม่มีวงกลมสถานะ / Header มีป้าย `Prototype`

### Workflow (core/workflow.js + components.workflowBar)

- สถานะ: ฉบับร่าง → รออนุมัติ → อนุมัติแล้ว / ส่งกลับแก้ไข (ต้องมีเหตุผล) / ต้องตรวจสอบใหม่ / baseline: ล็อกแล้ว
  แก้ไขได้เมื่อ ฉบับร่าง, ส่งกลับแก้ไข, ต้องตรวจสอบใหม่ / อนุมัติแล้ว → ผู้อนุมัติกด เปิดให้แก้ไข → ฉบับร่าง
- ผู้จัดทำ/ผู้อนุมัติ (`submitterRole`, `approverRole`): Top-down = Sales Director → Management / Phasing, SKU, Forecast ต่อหน่วย =
  ผู้รับผิดชอบปัจจุบันของหน่วย (`ownerOf` ณ เดือนปัจจุบันจำลอง; หน่วยว่าง → Sales Director ส่งแทน) → Sales Director /
  Baseline = Sales Director ล็อกที่หน้ารายงานสรุปแผน
- `allowedActions(state, role, { step, ownerId, editing, locked })`, `viewState`, `transition(state, action, payload)`,
  `canSubmit(step, unitId, year, { states, remaining, baselineLocked })`, `changedUnits`, `invalidateDownstream`, `applyAction`,
  `canLock`, `isLocked`, `lastEvent`
- ส่งอนุมัติได้เมื่อ: Top-down และ Phasing คงเหลือครบ (±1 บาท) / SKU ไม่ขาดเป้า (เกินเป้าส่งได้) / Phasing รอ Top-down อนุมัติ /
  SKU รอ Phasing ของหน่วยนั้น / Forecast ต้องล็อก Baseline แล้ว (ไม่บังคับคงเหลือ)
- อนุมัติเก็บ `snapshot` (เป้าต่อหน่วย: Top-down = ทั้งปี, Phasing = 12 เดือน) อนุมัติใหม่แล้วหน่วยที่ต่างเกิน 1 บาท → ขั้นล่างที่อนุมัติแล้ว
  ของหน่วยนั้นเป็น "ต้องตรวจสอบใหม่" หน่วยอื่นไม่เปลี่ยน
- หลังล็อก Baseline: Top-down / Phasing / แผนครั้งแรก ไม่มีปุ่ม / โหมดปรับแผนเปิดใช้ มี Workflow ของตัวเอง (step `forecast`)
- `workflowBar(opts)` = ป้ายสถานะ + ประวัติ ▾ (Popover: ผู้จัดทำ/ผู้อนุมัติ + รายการเปลี่ยนสถานะ) ข้างชื่อหน้า และปุ่มมุมขวา
  (display: contents ใน ctx.intro) opts: `step, unitId, year, ownerId, title(), editing(), facts() → { remaining }, summary() → [บรรทัด],
  snapshot(), onEdit, onSave, onCancel, onChange` / `simple: true` = แค่ แก้ไข · บันทึก · ยกเลิก (หน้า Master)
  กล่องยืนยันใช้ `C.dialog` (`<dialog>`) สรุปตัวเลขหลัก / ส่งกลับต้องมีเหตุผล / ปุ่มส่งกดไม่ได้พร้อมข้อความเหตุผล
- บทบาทจำลอง: Header "มุมมองผู้ใช้" Management / Sales Director / Sales Person (คนที่ทำงานอยู่) → `ui.role` เปลี่ยนแล้ว reload
  ในเดโมทุกบทบาทแก้หน้า Master ได้

### โหมดดู / แก้ไข (ทุกหน้าที่มีตัวเลข)

- เปิดมาเป็นโหมดดู: ตัวเลขเป็นข้อความ ไม่มีช่องกรอก ไม่มีปุ่มเพิ่ม/ลบ
- แก้ไข → Module แก้สำเนา (draft) ไม่เขียน store จนกด บันทึก / ยกเลิก = ทิ้ง draft
- แถบ `C.editBanner()` "โหมดแก้ไข · มีรายการที่ยังไม่บันทึก n รายการ" / ช่องที่ยังไม่บันทึก class `is-dirty-cell` (ขอบหนา)
  การลบรายการนับเป็นรายการที่ยังไม่บันทึก
- `C.guardUnsaved(fnนับค่าที่ยังไม่บันทึก)` = เตือนตอนออกจากหน้า (beforeunload — Chrome แสดงเฉพาะหลังผู้ใช้โต้ตอบจริง)
  `C.confirmDiscard(n)` ก่อนเปลี่ยนหน่วย / Series / โหมด / เดือนปัจจุบัน
- ปุ่มลบทุกหน้า = `C.trashButton({ label, confirmTitle, lines, onConfirm, disabled, disabledTitle })` ไอคอนถังขยะ + กล่องยืนยัน (danger)
  ปุ่มเพิ่มมีข้อความ (`+ เพิ่ม …`)

### Component ที่ใช้ซ้ำ (core/components.js)

- `percentAmountInput({ pct, base, label, onCommit })` ช่อง % + บาท (display: contents / `.parts` = [ช่อง %, ช่องบาท] ใส่แยก td/ช่อง Grid ได้)
- `subChannelPicker({ tree, selection, onSelect, remainingOf, workflowOf, ownerOf, guard })` (ดูแถบบริบท) ใช้ร่วมกันหน้า Phasing
  และวางแผน SKU ห้ามสร้างชุดใหม่ / คืน `.channel`, `.unit`, `.update()` / `contextStats([{ label, value, title }])` ต่อท้ายในแถวเดียวกัน
- `ownerInfo(data, unitId, key)`, `ownerStrip(data, unitId, year, { tag: 'td'|'div' })` แถบผู้รับผิดชอบรายเดือน (คนเดียวกันต่อเนื่อง = แถบเดียว,
  ว่าง/ลาออก = ลายเส้นทแยง) สีคน `personColor` → `--person-1..8`
- `multiSelect({ label, allLabel, selected, clear, empty, search, options, value, onChange, guard })` เลือกหลายค่า ส่งค่าเมื่อปิดรายการ
  → `seriesFilter({ options: calc.seriesList, value, onChange, guard })` และ Filter Channel ของรายงาน
- `searchSelect({ ..., plainButton, buttonLabel, fixed })` — `fixed: true` = รายการย้ายไปท้าย body ตอนเปิด (ปุ่มในตาราง) ปิดเองเมื่อเลื่อน
- `rulesPanel()` แผงพับได้ (Product Master) / `rulesButton(legendNode)` ปุ่ม ? (หน้า SKU: Legend เต็ม + กฎ) ข้อความจาก `labels.rules`
- `calcExplainer(info)` ⓘ Popover: สูตร (`labels.explain`), `charts.splitBar` ของหน่วยทั้งปี, GP ที่มีผล · VAT · ราคารวม VAT หรือไม่ +
  ลิงก์คำถามค้าง (`about-prototype/index.html#open-questions`) / `cellBreakdown(root, resolve)` Tooltip รายช่อง (Hover/Focus `[data-cell]`)
  ตัวเลขจาก `calc.cellBreakdown` / ห้ามทำคำอธิบายสูตรเป็นหน้าแยกหรือกล่องถาวรในหน้า SKU
- `dialog` (opts `danger`), `popover(anchor, build, opts)`, `menuButton(items)` (⋯), `wfIcon`, `wfBadge`, `alertBadge(rem)`, `remainingRow`,
  `trashButton`, `icon('trash')`, `numberInput({ commit: true })`, `accountPicker` (ปุ่ม → Dropdown เลือกจาก Master), `growthText`,
  `historyTag`, `remainingBar`, `bindArrowNav`, `barChart` (12 เดือน, lead/trail ให้คอลัมน์ตรงกับตาราง), `segmented` (option `disabled`,
  `title` / แสดงค่าที่เลือกตอนสร้าง เปลี่ยนแท็บแล้วสร้างใหม่), `approveBox(items, title)`
- class `.print-only` = แสดงเฉพาะตอนพิมพ์

### กราฟ (core/charts.js — SVG/CSS เขียนเอง)

- `donut({ items: [{ id, value, colorToken, legend: [...], muted }], inner: [ปีก่อน], center, onHover })` วงนอก = ปีนี้ วงในบาง = ปีก่อน
  → `.update(items, center, inner)`, `.highlight(id)`
- `miniBar({ value, prior, max, colorToken, title })` แท่งเล็กในแถวตาราง (เทียบปีก่อน หน้า Top-down)
- `barLine({ bars, line, dashed, months, labels, format, height })` แท่ง 12 เดือน + เส้นทึบ + เส้นประ (รายงาน)
- `hbars({ items: [{ label, value, text, colorToken, title }] })` แท่งแนวนอน (รายงาน: สัดส่วนตามกลุ่มสินค้า)
- `barList(...)` (ไม่ได้ใช้ในหน้าหลักแล้ว) / `splitBar(calc.moneySplit(...), labels, opts)` แถบ Net Sales / GP / VAT (ⓘ และหน้า measure-chain)

### หน้า Top-down (v5 ข้อ 2)

- แถบ Total บรรทัดเดียว (Total Target · ยอดขายปีก่อน · การเติบโต + ⋯ ใช้สัดส่วนปีก่อนตอนแก้ไข) — Total แสดงครั้งเดียว
- ตาราง Tree (~75%) + Donut 2 วง (~25%, กลางวง = % จัดสรรแล้ว, Legend ชื่อเท่านั้น) ไม่มีกราฟแท่งแยก
- คอลัมน์: ชื่อ · ยอดขายปีก่อน (ล้านบาท) · สัดส่วน (%) (Tooltip `แถว Channel เทียบกับ Total Target · แถว Account/เขต เทียบกับ Channel`) ·
  เป้าหมาย (บาท) · การเติบโต · เทียบปีก่อน (miniBar) · (โหมดแก้ไข) จัดการ
- แถวคงเหลือท้ายทุก Channel และระดับ Total / Channel ว่าง = ยังไม่กำหนด
- โหมดแก้ไข: % และบาท, ถังขยะ + กล่องยืนยัน (ลบหน่วยที่มีค่า), `+ เพิ่ม Account` / `+ เพิ่มเขต` ต่อ Channel, `+ เพิ่ม Channel` (จาก Master),
  ปุ่ม `กระจายตามสัดส่วนปัจจุบัน` ในแถวคงเหลือของ Channel (`calc.normalizeShares` ต้องกดเอง ห้ามกระจายอัตโนมัติ)
- Hover Donut ↔ แถว Channel / ไม่มี Scrollbar แนวนอน ตารางเลื่อนแนวตั้งภายใน หัวตารางติดบน แถว ~34px

### หน้า Phasing (v5 ข้อ 3)

- แถบบริบทแถวเดียว → (แก้ไข) editBanner → การ์ด: หัวกราฟ (ป้ายที่มาของค่าตั้งต้น, Legend, ปุ่มคืนค่าตามสัดส่วนปีก่อน เฉพาะแก้ไข) +
  กราฟ ~160px (ไม่มีตัวเลขบนแท่ง ตัวเลขอยู่ใน Tooltip) + แถวผู้รับผิดชอบ (เฉพาะหลายคน) + ตาราง Grid (ใช้ `--ph-cols` ร่วมกัน)
- แถวตาราง: เดือน / ยอดขายปีก่อน (บาท) / สัดส่วนรายเดือน (%) / เป้าหมาย Net Sales (บาท) / การเติบโตเทียบปีก่อน / แถวคงเหลือ
  เดือนที่ต่างจากค่าตั้งต้นมีจุดมุมช่อง + Tooltip ค่าตั้งต้น / ค่าตั้งต้น = ยอดปีก่อนของหน่วย → Channel → เท่ากัน
- แก้เดือนหนึ่งไม่ปรับเดือนอื่น / Workflow ต่อหน่วย / ช่องกรอกตัวอักษรเล็กกว่าตารางให้ 7 หลักไม่ถูกตัด (breakpoint 1800/1600/1440)

### หน้าวางแผนราย SKU (v5 ข้อ 4)

- แถว 1 = แถบบริบท / แถว 2 = Series · มุมมอง ชิ้น | Sell-out Amount | Net Sales · ⓘ · โหมด (ปรับแผน disabled Tooltip
  `ใช้งานได้หลังจากล็อก Baseline`) · (ปรับแผน) เดือนปัจจุบันจำลอง · Legend (เฉพาะรายการที่มีในตารางและโหมดปัจจุบัน ชิดขวา
  ไม่พอขึ้น 2 บรรทัดในแถวเดียวกัน) · ? (Legend เต็ม 9 รายการ + กฎ) — ไม่มีการ์ดสรุป
- `calc.cellState(mode, m, currentMonth, fillSource)`: ล็อก 0 แก้ไม่ได้ / ครั้งแรก = แก้ได้ทุกเดือน / ปรับแผน: ≤ M Actual,
  M+1..M+3 ล็อก, M+4+ แก้ได้ / แก้ได้เฉพาะมุมมองจำนวนชิ้น / แก้ช่องระบบเติมหรือ Clearance = Override (↺ คืนค่า ตอนแก้ไข)
- ตาราง: (หลายคน) แถวผู้รับผิดชอบ + หัวเดือน + แถวเป้าหมาย `เป้าหมาย Net Sales (จาก Phasing)` ติดบน / (แก้ไข) `+ เพิ่ม SKU`
  ที่หัวคอลัมน์ SKU / (เลือก Series) แถวข้อความ SKU ของ Series ที่ยังไม่อยู่ในแผน + `เพิ่มทั้ง Series` / กลุ่ม SKU ที่ขายอยู่ · NPD
  (NPD ว่าง = `ยังไม่มี NPD ในแผน` · จำนวน NPD ที่ Listing แล้วแต่ยังไม่อยู่ในแผน · (แก้ไข) `+ เพิ่ม NPD`) / ถังขยะ = นำออกจากแผน
  (ปรับแผน = หยุดวางแผน) + กล่องยืนยัน / ป้าย P มุมบนซ้ายภายในช่อง
- ท้ายตารางติดล่างทุกแถว (`--i` = ลำดับจากล่าง): (ปรับแผน) Plan Baseline · (เลือก Series) รวม Series ที่เลือก ชิ้น/เงิน ·
  รวมแผน (ชิ้น) · รวมแผน Net Sales (บาท) (เลือก Series = รวมทั้ง Account / รวมทั้งเขต) · แถวคงเหลือ (รายเดือน: ค่าบวก = ขาด ค่าลบ = เกิน
  ✓ = จัดสรรครบ สีช่องตามสถานะของเดือน ป้ายแถว = สถานะทั้งปี) — **คงเหลือเทียบเป้าทั้งหน่วยเสมอ**
- กล่องตารางสูงเต็มพื้นที่ที่เหลือ (`.sku-grid { height: 100% }` + แถวว่าง `sp-filler` รับพื้นที่ส่วนเกิน) แถวรวมอยู่ล่างสุดเสมอ
- "เพิ่มทั้ง Series" = ทุก SKU ของ Series ที่ Listing ในหน่วยนี้และยังไม่อยู่ในแผน (NPD เริ่มขาย = เดือนของ Launch Date)
- จอกว้างน้อยกว่า 1920px Side Menu พับเอง / 12 เดือน + รวม ไม่เลื่อนแนวนอน / ≥ 1024px หน้าไม่ยืด ตารางเลื่อนเอง

### หน้ารายงานสรุปแผน (v5 ข้อ 5, `modules/summary`)

- แถบบน: Filter Channel (multiSelect) · `พิมพ์ / บันทึก PDF` · ล็อก Baseline (Director + `W.canLock`, กล่องยืนยัน → เวลาที่ล็อก)
- 1 KPI 4 ใบ (บาทเต็ม): Total Target + การเติบโต / แผน Bottom-up รวม + % ของเป้าหมาย / ส่วนต่าง (สีสถานะ) / ความคืบหน้าอนุมัติแผน SKU x / y
  2 `charts.barLine` เป้าหมาย (Phasing) · แผน · ยอดขายปีก่อน 12 เดือน / 3 ตาราง Total → Channel (พับได้) → Account/เขต: ยอดขายปีก่อน ·
  เป้าหมาย · แผน · ส่วนต่าง (สี + ข้อความ) · Top-down (ช่องเดียว rowspan) · Phasing · SKU · ผู้รับผิดชอบ — กดชื่อ → หน้าวางแผน SKU,
  กดสถานะ → หน้านั้น (ตั้ง `ui.selection`) / 4 `calc.planMix` ตาม Status และตาม Series (Top 8 + อื่นๆ) `charts.hbars` /
  5 เป้าหมายรายผู้รับผิดชอบ (`performanceByPerson` เป้าหมายและแผน เฉพาะเดือนที่รับผิดชอบ + แถวไม่มีผู้รับผิดชอบ, ป้ายลาออก) /
  6 รายการที่ต้องดำเนินการ จัดกลุ่มตาม Account/เขต (ขาด/เกิน, ยังไม่ส่ง, ส่งกลับแก้ไข, ต้องตรวจสอบใหม่, ไม่มีผู้รับผิดชอบ) แต่ละเรื่องเป็นลิงก์
- ตัวเลขข้อ 2–6 เป็นล้านบาท 2 ตำแหน่ง / Print: A4 แนวนอน (`styles/print.css` `@page`) ซ่อนเมนูและปุ่ม ขึ้นหน้าใหม่ก่อนข้อ 3 และ 5
  (`.rp-break`) หัวกระดาษ `.rp-print-head.print-only` `รายงานสรุปแผน {ปี} · พิมพ์เมื่อ {วันเวลา}` (อัปเดตตอน beforeprint)
- หน้านี้เลื่อนแนวตั้งได้ (หน้าเดียวที่ไม่ต้องพอดีจอ)

### หน้าเกี่ยวกับ Prototype (`modules/about-prototype`, id `aboutPrototype`, กลุ่ม project-info)

- แท็บ ขอบเขต (+ สิ่งที่ตัดออก) | Decision log | คำถามที่ค้าง (`#open-questions` เปิดแท็บนี้) | ขั้นต่อไป + กล่องสิ่งที่ขออนุมัติ
- ข้อความจาก `pages.aboutPrototype` / เนื้อหาแท็บเลื่อนภายในการ์ด / พิมพ์ = แสดงทุกแท็บต่อกัน / ลิงก์เล็กที่ Header

### หน้า Master (v5 ข้อ 6)

- โครงหัวหน้า ภาษา สี ตัวเลขเหมือน Sales Planning ไม่มีเลขขั้น / workflowBar แบบง่าย / ปุ่ม `+ เพิ่ม …` + ถังขยะในคอลัมน์จัดการ (โหมดแก้ไข)
- Listing และวันเริ่มขาย (`modules/product-master`): Channel ตามแผนของปี → คอลัมน์ Listing = หน่วยของ Channel / seriesFilter + ค้นหา + Status /
  แผงกฎ (พับ) / แก้ไข: วันเริ่มขาย, Listing, Clearance, เลิกขาย, + เพิ่ม SKU, ลบ (เฉพาะ SKU ที่ไม่มี Listing)
- Account (`modules/accounts`): ชื่อ · Channel · GP · มีผลตั้งแต่ · การใช้งาน · ผู้รับผิดชอบปัจจุบัน · แผนปี / เพิ่ม ปิดใช้งาน ลบ
- เขตการขาย (`modules/territories`): ชื่อ · Channel · ยอดขายปีก่อน · การใช้งาน · ผู้รับผิดชอบปัจจุบัน / เพิ่มเขต ลบ
  ลบ Account/เขตได้เฉพาะที่ไม่อยู่ในแผน ไม่มียอดขายย้อนหลัง และไม่เคยมีผู้รับผิดชอบ (`calc.canRemoveUnit`) นอกนั้นให้ปิดใช้งาน
- ผู้รับผิดชอบ (`modules/salespeople`, fit): Alert → รายชื่อ (บันทึกการลาออก, เพิ่มคน, ลบคนที่ไม่มีประวัติ) | Timeline 12 เดือน
  (แก้ไข: คลิกเดือนแรก + เดือนสุดท้ายของหน่วยเดียวกัน → เลือกคน; ถึง ธ.ค. = toMonth null; เดือนที่ผ่านแล้วคลิกไม่ได้)
  → ผลงานรายบุคคล (เลื่อนภายในการ์ด): Target Baseline ช่วงที่รับผิดชอบ · Target/Actual ถึงเดือนปัจจุบัน · % (รวมคนที่ลาออก ป้าย "ลาออก ก.พ. 2027")

### Layout และขนาดจอ

- Side Menu 236px พับ 56px (`ui.sidebarCollapsed`) / < 1024px เลื่อนออกด้วย ☰ / ไอคอนสถานะ Workflow ข้างหน้าใน Sales Planning
  (`ctx.refreshMenu()` หลังเปลี่ยนสถานะหรือหน่วย)
- ทุกหน้าไม่เลื่อนที่ viewport 1920×937 (จอ 1920×1080) ยกเว้นรายงานสรุปแผน / Top-down, Phasing, วางแผน SKU ต้องไม่เลื่อนที่ 1366×625 ด้วย
  ทดสอบทั้งสองขนาดทุกครั้ง (จอ < 1600px ใช้ตัวเลขเล็กลงเล็กน้อยให้ 12 เดือนพอดีเมื่อมี Side Menu)
- ไม่มี Scroll แนวนอนที่ 375px ทุกหน้า

## Business Rules (ที่ตกลงแล้ว)

- Top-down เป็น **Net Sales (บาท)**: Total → Channel → Account/เขต เป็น % ของชั้นบน → รายเดือนด้วย Phasing
  แก้ได้ทั้ง % และบาท (เก็บ %) เปลี่ยนเป้าชั้นบนแล้วชั้นล่างคง % เดิม บาทปรับตาม / การเติบโต = เป้า ÷ ปีก่อน − 1
  "ใช้สัดส่วนปีก่อน" เติม % ตามยอดปีก่อน (ไม่มีข้อมูล = 0%) / "กระจายตามสัดส่วนปัจจุบัน" ปรับให้รวม 100% (กดเอง) / ลบหน่วยที่มีค่า > 0 ต้องยืนยัน
- เป้าของเขต TT = Quota การแบ่งลงสาขาเป็นงานของ Sales Person ระบบไม่ลงถึงสาขา
- เปลี่ยนผู้รับผิดชอบไม่แก้ Target หรือ Forecast (ตัวเลขอยู่กับหน่วย) Performance รายคนคิดเฉพาะเดือนที่รับผิดชอบ
- Bottom-up เป็น **จำนวนชิ้น** ต่อ SKU × หน่วย × เดือน มาเจอกันที่ **คงเหลือ**
- สูตร (ทดสอบใน `tests/calc.test.js`):
  - Sell-out Amount ก่อน VAT = ชิ้น × ราคา (ถ้า `PRICE_INCLUDES_VAT` ให้ ÷ 1.07) / Net Sales = Sell-out ก่อน VAT × (1 − GP)
  - Sell-out รวม VAT = × 1.07 (แสดงผล) / กลับด้าน: Sell-out ก่อน VAT = Net Sales ÷ (1 − GP)
  - แบ่งเงิน (`calc.moneySplit`) = Net Sales / GP / VAT เทียบยอดรวม VAT (hasGP false ไม่มีส่วน GP)
  - คงเหลือ = เป้าชั้นบน − ผลรวมที่แบ่งแล้ว / ±1 บาท = จัดสรรครบ, > 0 ขาด, < 0 เกิน, เป้าชั้นบน 0 และยังไม่แบ่ง = ยังไม่กำหนด
  - Promo บางวัน = ราคาเฉลี่ยถ่วงตามจำนวนวัน / Clearance = Stock ÷ จำนวนเดือน (ปัดลง เศษไปเดือนท้าย)
  - ระบบเติม = Run-rate × Seasonality Index / Seasonality Index = ยอดเดือน ÷ ค่าเฉลี่ย 12 เดือน
- Status ระดับ SKU (`calc.skuStatus`): หลังเดือนเลิกขาย = เลิกขาย / เดือน Clearance = Clearance (มาก่อนเสมอ) / ก่อนวันเริ่มขาย =
  ยังไม่วางขาย / NPD = 3 เดือนแรก / นอกนั้น Existing
- วิธีเติมยอด (`calc.cellSource`) + เหตุผลล็อก (`calc.lockReason`: ไม่ได้ Listing / ยังไม่วางขาย / เลิกขาย / ก่อนเดือนเริ่มขายในหน่วย)
- SKU ใหม่กรอกเองทั้งปีในแผนรายปี (ไม่มี Run-rate แม้พ้น NPD)
- Baseline ล็อกทั้งปีหลังแผน SKU ทุกหน่วยอนุมัติ (เก็บ Snapshot GP และ Price List ใน workflow.baseline — ยังไม่ใช้คำนวณใหม่)
  → Re-forecast ล็อก M+1..M+3 ปรับได้ตั้งแต่ M+4
- สีมีความหมายชุดเดียว: Source (ล็อก เทา, กรอกเอง ฟ้า, ระบบเติม เขียว, Clearance ส้ม) / คงเหลือ (จัดสรรครบ เขียว, ขาด แดง, เกิน เหลือง,
  ยังไม่กำหนด เทา) / Workflow (ฉบับร่าง เทา, รออนุมัติ ฟ้า, อนุมัติ เขียว, ส่งกลับแก้ไข แดง, ต้องตรวจสอบใหม่ เหลือง) ป้ายต้องมีข้อความกำกับเสมอ

### ตัดออกโดยตั้งใจ (ห้ามใส่)

Ramp-up NPD, Cannibalization, เกณฑ์ % คงเหลือที่ Config ได้, แยก Core/Steady, การกระจายยอดคงเหลืออัตโนมัติ

### สิ่งที่ห้ามทำ (v5 ข้อ 9)

ห้ามแสดงตัวเลขเดียวกันซ้ำในหน้าเดียวโดยไม่มีเหตุผล / ห้าม Chip คงเหลือในตาราง / ห้ามตัวย่อ "ล." และห้ามตัดตัวเลขด้วย "…" /
ห้ามใช้สีเป็นสื่อเดียวของสถานะ / ห้ามเขียนข้อความใน Module ตรงๆ / ห้ามกระจายยอดคงเหลืออัตโนมัติ

### สมมติฐานที่ Claude ตั้งเอง (ผู้ใช้ยังไม่ได้ยืนยัน)

- หน้า Phasing และ SKU เปิดที่ Shopee (`DEFAULT_UNIT`) / บทบาทตั้งต้น Sales Director (`DEFAULT_ROLE`)
- หน้า approval (ซ่อน) สมมติ "ตอนนี้" = มิ.ย. และ M = ล็อก / โหมดปรับแผนนับ M เป็น Actual
- ปีแผน 2027 ตัวเลือก 2026–2028 / ปีที่ไม่มีข้อมูลตั้งต้นใช้ defaultChannels/defaultUnits ที่ 0%
- `content.excelProblems` เป็นข้อความร่าง ต้องให้ทีมแก้เป็นปัญหาจริง
- แผน SKU ตั้งต้นไม่รวม NPD / มุมมองจำนวนชิ้นแสดงเป้าหมาย/คงเหลือเป็น Net Sales
- Export `active: false` = ไม่อยู่ในแผนตั้งต้นแต่เพิ่มได้ / Account ของ Export 3 รายไม่มียอดปีก่อน
- TT ใช้ id เขตเดิมของ Distributor (History/Listing/Run-rate ใช้ต่อ) เพิ่มเขต 4 ภาคตะวันออกพร้อม History สมมติ
- ส่งอนุมัติแผน SKU ได้เมื่อไม่ขาดเป้า (เกินเป้าได้ เพราะจำนวนชิ้นให้ตรง ±1 บาทแทบเป็นไปไม่ได้) — ข้อมูลตั้งต้น 4/9 ขาดเป้า
  ต้องเพิ่มแผนก่อนส่ง / Re-forecast ไม่บังคับคงเหลือ
- "ต้องตรวจสอบใหม่" แก้และส่งใหม่ได้เหมือนฉบับร่าง / หน่วยว่าง Sales Director ส่งแทน / หลังล็อก Baseline แก้ Top-down, Phasing, แผนครั้งแรกไม่ได้
- ผู้รับผิดชอบ: เดือนที่ผ่านแล้ว = ก่อนเดือนปัจจุบันจำลอง / บันทึกลาออกย้อนหลังเดือนปัจจุบันไม่ได้ / กำหนดถึง ธ.ค. = ต่อไปเรื่อยๆ
- Performance: % ความสำเร็จ = Actual ÷ Target ของเดือนที่ผ่านมาถึงเดือนปัจจุบัน (Actual ของ M นับรวม)
- Product Master และ Account Master ใช้โหมดดู/แก้ไข (workflowBar แบบง่าย) ทุกบทบาทแก้ได้ในเดโม
- เพิ่ม SKU H ใน Series Summer Launch 2027 ให้ Series มีมากกว่า 1 SKU
- CR v3 เขียนป้ายขั้นว่า 1/n ตอนนี้ Sales Planning มี 4 ขั้น (1/4 ถึง 4/4)
- v5: ผู้อนุมัติที่ยังไม่ถึงขั้น เห็นทั้ง "อ่านอย่างเดียว" และ "รอผู้จัดทำส่งอนุมัติ" พร้อมปุ่มสลับเป็นผู้จัดทำ (รวมข้อ 1.6 กับข้อ 10.5)
- v5: คงเหลือรายเดือนในหน้า SKU แสดงค่ามีเครื่องหมาย (บวก = ขาด ลบ = เกิน) เพราะช่องแคบใส่ข้อความไม่ได้ สีช่อง + Tooltip บอกสถานะ
- v5: `+ เพิ่ม SKU` ย้ายไปหัวคอลัมน์ SKU (แถว 2 ไม่พอ) / Legend ที่ไม่พอในแถวเดียวขึ้น 2 บรรทัดภายในแถวที่ 2
- v5: แผน Bottom-up ในรายงาน = แผนครั้งแรก (Baseline) / ความคืบหน้าอนุมัติ = แผน SKU ที่อนุมัติแล้ว (ล็อก Baseline แล้ว = ครบ)
- v5: Top-down ในตารางรายงานเป็นช่องเดียวทั้งตาราง แถว Channel แสดงจำนวนที่อนุมัติแล้ว x/y ของ Phasing และ SKU
- v5: ลบรายการใน Master ได้เฉพาะรายการที่ยังไม่ถูกใช้ (Account/เขต: ไม่อยู่ในแผน ไม่มียอดย้อนหลัง ไม่เคยมีผู้รับผิดชอบ /
  SKU: ไม่มี Listing / Sales Person: ไม่มีประวัติผู้รับผิดชอบ) นอกนั้นให้ปิดใช้งานหรือบันทึกการลาออก
- v5: `data/plan-seeds.js` เติมจำนวนชิ้นเดือน ธ.ค. ของ TT เขต 3 ให้จัดสรรครบพอดี (ข้อ 7 ต้องมี Account ที่จัดสรรครบ)

### คำถามที่ค้าง (อยู่ใน `content.js` → pages.aboutPrototype.openQuestions)

1. ราคาใน Price List รวม VAT หรือไม่ (Excel เดิมคิดแบบรวม VAT)
2. TT มี GP หรือไม่ (Channel Master ตั้ง hasGP false ไว้ก่อน)
3. Chayamiss เป็น Channel หรือ Account (Export ใส่เป็น Channel ตัวอย่างแล้ว)
4. ระบบจริงใช้หลายคนพร้อมกัน ต้องมี Backend
5. Stock Clearance ระดับ SKU แบ่งให้แต่ละหน่วยอย่างไร (เดโมแบ่งเท่ากัน)
6. แผน SKU ของ TT ทำที่ระดับเขตใช่หรือไม่
7. CN% ของ TT กำหนดต่อเขตหรือทั้ง Channel
8. การเปลี่ยนผู้รับผิดชอบต้องมีผู้อนุมัติหรือไม่

## การทดสอบ

- เปิด `tests/calc.test.html` ต้องขึ้น "ผ่านทั้งหมด" ทุกครั้งที่แก้ `calc.js` หรือ `workflow.js` และเพิ่ม Test เมื่อเพิ่มสูตร
  (Test Workflow wf-1..6, ผู้รับผิดชอบ as-1..6, คำอธิบายการคำนวณ cx-1..3, Series, v5-1..5 + ข้อมูลตั้งต้น + ลบ Master) ตอนนี้ 83 Test
- หลังแก้ ให้เปิด `index.html` ผ่าน `file://` ใน Chrome แล้วตรวจ: ไม่มี "โหลดไฟล์ไม่ได้", Side Menu 4 กลุ่ม, ค่าที่แก้ส่งต่อข้ามหน้า,
  ไม่มี Scroll แนวนอนที่ 375px (ตารางกว้างให้อยู่ใน `.table-scroll`), ไม่มีคำต้องห้ามตามตารางคำศัพท์ในข้อความทุกหน้า
- เล่น Workflow ครบวง: Director ส่ง Top-down → Management อนุมัติ → ผู้รับผิดชอบส่ง Phasing/SKU ทุกหน่วย (สลับบทบาทที่ Header
  หรือปุ่มสลับมุมมอง) → Director อนุมัติ → ล็อก Baseline ที่หน้ารายงาน / เปิดให้แก้ไข Top-down แล้วเปลี่ยนเป้าหน่วยเดียว → หน่วยนั้น
  "ต้องตรวจสอบใหม่"
- ทดสอบเพิ่ม Export แล้วเห็นใน Tree, Donut, Filter ของ Phasing / SKU / Product Master
- ทดสอบลาออก + โอนเขตที่หน้าผู้รับผิดชอบ แล้วหน้า Phasing แสดงแถบผู้รับผิดชอบ 2 คน ตัวเลขเป้าไม่เปลี่ยน
- รายงาน: พิมพ์ด้วย `Page.printToPDF({ preferCSSPageSize: true })` ได้ A4 แนวนอน (842×595 pt)
- ใน headless ต้องตอบ dialog ผ่าน `Page.javascriptDialogOpening` → `Page.handleJavaScriptDialog` (confirm และ beforeunload)
  ปุ่มในกล่องยืนยัน (`<dialog>`) กด `.dlg-confirm` / beforeunload แสดงเฉพาะเมื่อมี user activation จริง (ใช้ Input.dispatchMouseEvent)
- Browser pane ของ Claude desktop แสดง `file://` เป็นภาพนิ่ง ให้ทดสอบด้วย Chrome headless ผ่าน DevTools Protocol
  (Node มีในเครื่อง ไม่ต้องติดตั้ง package) เปิด `Emulation.setFocusEmulationEnabled` ไม่อย่างนั้นช่องที่ commit ตอน blur ดูเหมือนไม่ทำงาน
- แก้ไข/ส่งได้เฉพาะบทบาทที่ถูกต้อง (ผู้รับผิดชอบหน่วย) — ใน Script ทดสอบตั้ง `ui.role` ก่อนกด แก้ไข หรือกด `.wf-switch`
- ตรวจตัวเลขถูกตัด: `scrollWidth > clientWidth` ของช่องและ input ในโหมดแก้ไขที่ 1920 / 1800 / 1600 / 1440 / 1366
