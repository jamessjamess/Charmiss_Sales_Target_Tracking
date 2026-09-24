# CLAUDE.md — Sales Target Planning (Concept Prototype)

เว็บเล่า Concept ระบบตั้ง Sales Target ของ Charmiss เพื่อให้ Management / Sales Director อนุมัติแนวคิด
ผู้ชมไม่ใช่สายเทคนิค ต้องเข้าใจใน 10–15 นาที ไม่มี Login ไม่มีฐานข้อมูล ไม่มี Import (ส่งออก Excel / CSV ได้ตาม v7)
ข้อกำหนดเต็มอยู่ที่ `PROMPT_concept-prototype.md` และ Change Request ตามลำดับ: `PROMPT_change_top-down-v2.md` (ปีแผน, Account Master,
% ↔ บาท) → `PROMPT_change_phasing-v2.md` (Filter Channel, ตาราง Phasing) → `PROMPT_change_sku-v2.md` (Product Master, โหมดแผน,
cellState, subChannelPicker) → `PROMPT_change_approval-topdown-v3.md` (Channel Master, Workflow ต่อขั้น, Top-down ใหม่, charts)
→ `PROMPT_change_v4.md` (เขตการขาย + ผู้รับผิดชอบตามช่วงเดือน, Side Menu, Series, โหมดแก้ไข, ⓘ/Tooltip) — v4 ข้อ 1 แทน v3 ข้อ 2
→ `PROMPT_change_v5_ux-review.md` (UX/UI ทั้งระบบ: คำศัพท์, สีคงเหลือ, แถวคงเหลือ, หัวหน้า, บทบาทอ่านอย่างเดียว, แถบบริบท,
Top-down/Phasing/SKU ใหม่, รายงานสรุปแผน, หน้าเกี่ยวกับ Prototype, ข้อมูลตั้งต้น) — v5 แทนข้อที่ขัดกันของ CR ก่อนหน้า
→ `PROMPT_change_v6_product-master.md` (Product Master 5 หน้า, productKey, Status 5 ค่า, ความครบถ้วน, ราคาตามวันที่มีผล, Promotion,
แผน NPD + Workflow, รหัสชั่วคราว/ผูกรหัสจริง, Audit log, เชื่อม Sales Planning)
→ `PROMPT_change_v7_top-down.md` (unitLabel/gpLabel, % 2 คอลัมน์, การเติบโตเป็นบาท, Waterfall + แท่งสัดส่วนแทน Donut,
ส่งออก Excel/CSV, ค่าตั้งต้นตามสัดส่วนปีก่อน) — CR ใหม่แทนข้อที่ขัดกันของ CR ก่อนหน้า
→ ตั้งแต่ CR-10 เก็บ CR ที่ `docs/change-requests/CR-XX_*.md` (front matter `status: Pending | Applied`, v7 = CR-09):
`CR-10_top-down-layout.md` (ชื่อขั้นตอนใหม่, ปีแผนในแถวหัวข้อ, ตัดแผงกราฟหน้าขั้นที่ 1, แท่งเป้าหมายเทียบปีก่อนสเกลจริงเดียวกันทั้งตาราง
— ข้อ 3.4 และ Test แก้ไข 2026-09-24 แทนฉบับแรก) → `CR-11_sku-planning-ux.md` (สินค้าจริงจาก `data/seed/`, ค่าตั้งต้นยอดปีก่อน × การเติบโต,
ราคาเฉพาะ Account, หน้าวางแผน SKU: ชื่อ 2 บรรทัด ค้นหา/จัดกลุ่ม/เรียง/ยอดปีก่อน, เครื่องมือช่วยกรอก, คีย์บอร์ดและ Excel)
→ `CR-12_summary-report.md` (ขั้นที่ 4 แยกแท็บติดตามสถานะ | รายงานสรุปแผน, กราฟรายเดือนแยกชุดชัด + แกนเลขกลม, Waterfall แกนเริ่มเลขกลม,
ตาราง % ของ Total + สถานะอนุมัติ 2 ไอคอน, รายการที่ต้องดำเนินการเป็นตาราง, รายงานเป็นหลักฐาน: เลขฉบับ ลายน้ำ Snapshot การอนุมัติ ช่องลงนาม)
— `docs/SPEC.md` (สเปกฉบับย่อสำหรับ CR อ้างหัวข้อ: 6 ข้อมูลหลัก · 7 หน้าวางแผน SKU · 10 Business Rules) / `docs/DECISIONS.md` / `docs/CHANGELOG.md`
สร้างใน CR-11 (2026-09-24) — รายละเอียดเต็มยังอยู่ในไฟล์นี้ Decision log บนหน้าเว็บอยู่ใน `pages.aboutPrototype.decisions`
วิธีเปิด/Deploy/เพิ่ม Module อยู่ที่ `README.md`

ผู้ใช้ต้องการ HTML ธรรมดา ห้ามเสนอ npm, Build tool หรือ Framework

## ข้อกำหนดทางเทคนิค (ห้ามฝ่า)

- HTML + CSS + JS ล้วน ต้องดับเบิลคลิก `index.html` เปิดผ่าน `file://` ได้ และ Deploy GitHub Pages ได้
- ห้าม ES Modules (`type="module"`, `import`, `export`), ห้าม `fetch()` ไฟล์ในเครื่อง, ห้าม localStorage, ห้าม Library กราฟ
- ทุกไฟล์ JS ห่อด้วย IIFE และผูกไว้ใต้ `window.SP` ตัวเดียว (`SP.core.*`, `SP.data.*`, `SP.modules.*`)
- ลิงก์เป็น Relative และชี้ไฟล์ `index.html` ตรงๆ ห้ามลิงก์ชื่อโฟลเดอร์ ห้าม Path ขึ้นต้นด้วย `/`
  สร้างลิงก์ด้วย `SP.core.paths.to('modules/x/index.html')`
- ไฟล์ภายนอกได้ 2 อย่าง: Google Font (IBM Plex Sans Thai ใน `styles/app.css`) และ SheetJS 0.18.5 จาก cdnjs
  (`core/export.js` โหลด **เมื่อกดส่งออก Excel ครั้งแรกเท่านั้น** ห้ามโหลดตอนเปิดหน้า โหลดไม่ได้ = เสนอ CSV แทน)
- `data/seed/` = ข้อมูลจริงที่สร้างจาก Excel (`seed-charmiss.js` จาก `Sales_Planning_2026_R2.xlsx`) **ห้ามแก้ด้วยมือ** ต้องสร้างใหม่จาก Excel
  `core/seed.js` แปลงเข้าโครง Product Master ตอนโหลด (ค่าที่ต้องปรับให้แก้ที่กฎใน `data/products.js` / `listings.js` / `pricing.js`)
- รูปสินค้าเก็บเป็น data URL ที่ย่อแล้ว (ด้านยาว ≤ `IMAGE_MAX_PX` 320px ด้วย Canvas `components.resizeImage`) ห้ามเก็บไฟล์ต้นฉบับ ห้ามโหลดรูปจาก URL ภายนอก
- ต้องมี `.nojekyll` ที่ Root ไม่อย่างนั้น GitHub Pages จะข้าม `modules/_template/`

## หลักการแยก Module

1. 1 Module = 1 โฟลเดอร์ใน `modules/`: `index.html` + `<ชื่อ>.js` (+ `<ชื่อ>.css` เฉพาะเมื่อจำเป็น)
   `index.html` ที่ Root ไม่มี Module: โหลดแค่ `core/loader.js` แล้ว `layout.boot()` พาไปหน้าแรกของ Tour ใน registry
2. Module ใช้ได้เฉพาะ `SP.core.*` และ `SP.data.*` ห้ามเรียกโค้ดของ Module อื่น
3. ส่งข้อมูลข้าม Module ผ่าน `SP.core.store` เท่านั้น (ห้ามแตะ sessionStorage ตรงๆ)
4. ห้ามซ้ำซ้อน:
   - Header (ชื่อระบบ + ป้าย Prototype · มุมมองผู้ใช้ · เกี่ยวกับ Prototype · รีเซ็ต — **ไม่มีปีแผน**) / Side Menu / แถบก่อนหน้า-ถัดไป /
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
     (`productStatus`, `statusAt`, `statusSegments`, `planYearStatus`, `cellSource`, `lockReason`, `cellState`, `skuPlanGrid`, `availableSkus`,
     `stopPlanItem`, `sumRows`) — ห้ามคำนวณ Status ราคา หรือความครบถ้วนใน Module
   - สินค้า: อ้างด้วย `calc.productKey(p)` (TR Code ถ้ามี ไม่มีใช้รหัสชั่วคราว) ทุกที่ ห้ามใช้ `p.sku` / `findProduct`, `productCompleteness`,
     `planBlockReason`, `taxonomyName`, `taxonomyChildren`, `productTaxonomy`, `seriesList(taxonomy, products)`, `inSeries`, `isListed`
   - ราคา / Promotion: `priceOn`, `rspOn`, `priceHistory`, `addPrice`, `effectivePrice`, `effectiveGp`, `pricingDetail`, `pricingOf(data, snapshot)`,
     `priceChangedMonths`, `promoPrice`, `promoConflicts`, `validatePromotion`, `shiftPromotion`
   - NPD / รหัส / ERP / Audit: `npdStage`, `applyNpdApproval`, `npdCoverage`, `npdStartMonth`, `nextTempCode`, `bindTrCode`, `renamePlanKey`,
     `compareErp`, `auditDiff`
   - Top-down (v7): `pctOfTotal`, `growthAmount`, `roundShares`, `growthWaterfall`, `channelShareRows`, `topDownRows`
   - แผน SKU (CR-11): ค่าตั้งต้น `defaultPlanQty(method, skuHistory, unitTarget, unitHistory, seasonality)` · `growthFactor` · `skuHistory` ·
     `runRateFrom` · ชื่อที่แสดง `displayName` / `titleCase` · หมวดจากชื่อ `inferCategory` · Chip เดียว `primaryStatus` · ▲/▼ `anomalyMark` ·
     เรียง/จัดกลุ่ม `sortPlanRows` / `groupPlanRows` · ที่มาของส่วนต่าง `priorOutsidePlan` · เครื่องมือช่วยกรอกคืน writes `[{ key, m, qty }]`:
     `distributeAnnual`, `annualWrites`, `scaleRows`, `lastYearWrites`, `clearWrites`, `closeGap`, `closeGapWrites`, `parseTsv`, `toTsv`,
     `pasteCells`, `fillCells`, `cleanQty` แล้วใส่ลงแผนด้วย `applyWrites` (ช่องระบบเติม → Override / ข้ามช่องที่แก้ไม่ได้) · `resetRows`
     — คีย์บอร์ด การเลือกช่วง คัดลอก/วาง ย้อนกลับ อยู่ใน `components.gridKeys` + `undoStack` ห้ามเขียนใน Module
   - นำเข้าข้อมูลจริง → `core/seed.js` (`SP.core.seed.build(SP.data)`) เท่านั้น
   - ข้อมูลขั้นที่ 4 (CR-12) → `core/report.js` (`build` ตัวเลขทั้งหมดของรายงานเป็น JSON · `current` ล็อกแล้ว = Snapshot · `actions` · `actionCount`)
     ใช้ร่วมกันระหว่างหน้ารายงานกับ Side Menu / กฎเรียงรายการ `calc.planActions` / รวมกลุ่มสินค้า `calc.mergeMix` /
     เลขฉบับ `W.baselineVersion`, `W.addBaselineVersion` / ส่วนการอนุมัติ `W.approvalRows` / `W.lastOf(state, action)`
   - แกนกราฟ (CR-12) → `calc.niceAxis(start, max)` (4–6 เส้น ขั้นละ 1 / 2 / 2.5 / 5 × 10^n) · `calc.niceScaleMax(values, { headroom })` ·
     `calc.axisStart(values)` (+ `charts.axisStart`) ค่าคงที่ใน `settings.CHART_*`, `AXIS_START_RULES`
   - ชื่อหน้า / ชื่อขั้นตอน → `content.js` (`pages.<id>.title`, `short` = ชื่อย่อในเมนูและปุ่มก่อนหน้า/ถัดไป, `titleTip` = Tooltip ของชื่อหน้า)
     + ค่าสำรองใน registry ห้ามเขียนชื่อหน้าใน Module / ปีแผนต่อท้ายชื่อหน้า = `components.planYearPicker` (layout ใส่ให้หน้าที่ registry ตั้ง `year: true`)
   - แท่งเป้าหมายเทียบปีก่อน = `calc.niceScaleMax` / `calc.scaleTicks` / `calc.vsLastYear` + `charts.niceScaleMax`, `charts.vsLastYearBar`,
     `charts.vsLastYearAxis` (ขั้นการปัดใน `settings.SCALE_STEP_BAHT`, `SCALE_STEP_SMALL_BAHT`, `SCALE_SMALL_BELOW_BAHT`)
   - ส่งออกไฟล์ → `core/export.js` (`toCsv`, `downloadCsv`, `toXlsx`, `loadXlsx`) + `components.exportButton`, `exportHeader`, `exportStamp`, `fileSafe`
   - ห้าม Hardcode คำว่า Account / เขต / Platform / GP: ใช้ `channel.unitLabel` / `channel.gpLabel` (ข้อความรวมทุก Channel ใช้ "หน่วยขาย")
   - % ↔ บาท, การเติบโต, สัดส่วนปีก่อน, Seasonality, กระจายตามสัดส่วนปัจจุบัน ใน calc เท่านั้น (`amountFromPct`, `pctFromAmount`,
     `growth`, `normalizeShares`, `priorShares`, `phasingTotals`, `defaultPhasing`, `phasingBasis`)
   - คงเหลือ `calc.remaining` (`emptyRemaining` = ยังไม่กำหนด) / รายงาน `calc.planMix`, `calc.addMonthly` / ลบ Master `calc.canRemoveUnit`
   - ผู้รับผิดชอบ / Performance ใน calc เท่านั้น (`ownerOf`, `ownerSegments`, `setOwner`, `setEndMonth`, `validateAssignments`,
     `assignmentAlerts`, `eligiblePeople`, `performanceByPerson`, `personPerformance`, `actualNetByUnit`)
   - ห้ามเขียน Logic Workflow ใน Module: เรียก `workflowBar` (components) ซึ่งเรียก `core/workflow.js` (`viewState` สำหรับบทบาทที่แก้ไม่ได้)
5. Side Menu และลำดับ Tour มาจาก `core/registry.js` (`{ id, title, short, icon, path, group, tour, visible, fit, year }`)
   - `year: true` = หน้าอิงปีแผน (4 ขั้นของ Sales Planning, แผน NPD, Promotion Price, Listing, ผู้รับผิดชอบ) แสดงตัวเลือกปีในแถวหัวข้อ
     หน้าที่ไม่อิงปี (รายการสินค้า, หมวดสินค้าและ Series, Account, เขตการขาย) ไม่แสดง
   - `group` = `'sales-planning' | 'product-master' | 'account-master' | 'project-info'` → Side Menu 4 กลุ่มสร้างอัตโนมัติ
     (ข้อมูลโครงการ = เกี่ยวกับ Prototype อยู่ท้ายสุด) / Product Master 5 หน้า: รายการสินค้า (`productList`) · แผน NPD (`npdPlan`) ·
     Promotion Price (`promotionPrice`) · Listing และวันเริ่มขาย (`productMaster`) · หมวดสินค้าและ Series (`taxonomy`)
   - เลขขั้น "ขั้นที่ x/n" และปุ่มก่อนหน้า/ถัดไป นับเฉพาะหน้า visible ในกลุ่ม Sales Planning (4 ขั้น:
     จัดสรรเป้าหมายประจำปี → จัดสรรเป้าหมายรายเดือน → วางแผนยอดขายราย SKU → รายงานสรุปแผน) หน้ากลุ่มอื่นไม่มีเลขขั้นและปุ่มก่อนหน้า/ถัดไป
   - ไม่มีหน้าที่ซ่อน: หน้า home, masterData, skuStatus, measureChain, approval ที่เคยซ่อนไว้ลบแล้ว (2026-09-23 ตามที่ผู้ใช้สั่ง)
     `visible: false` ยังใช้ซ่อนหน้าชั่วคราวได้
   - `fit: true` = หน้าสูงเท่าจอที่ ≥ 1024px (`body.fit-screen`) ตาราง/กราฟเลื่อนภายใน (Top-down, วางแผนราย SKU, Product Master ทั้ง 5 หน้า,
     Account, ผู้รับผิดชอบ, เกี่ยวกับ Prototype) — การ์ด `.fit-card` + `.fit-scroll`
   - `short` = ชื่อในเมนู บรรทัดเดียว รองรับ `{territoryChannels}` = ชื่อ Channel ที่แบ่งตามเขต (เมนู "เขตการขาย (TT)")
   เพิ่ม Module = คัดลอก `modules/_template/` + 1 บรรทัดใน registry (+ ข้อความใน `content.js`) ขั้นตอนเต็มใน README
6. ทุกไฟล์ JS ของ Module มี Comment หัวไฟล์: หน้าที่, ข้อมูลที่อ่านจาก data/, Key ที่อ่าน/เขียนใน store

### ลำดับการโหลด (loader.js)

paths → format → data/* (settings, channels, accounts, territories, salespeople, assignments, taxonomy, **seed/seed-charmiss**, products, listings,
pricing, promotions, npd, targets, history, actuals, plan-seeds, erp-snapshot, content) → calc → **seed** (นำเข้าข้อมูลจริง) → workflow → registry →
store → components → charts → export → **report** (ข้อมูลขั้นที่ 4) → layout → JS ของ Module → `layout.boot()`
`boot()` หา entry จาก registry ด้วย Path ของหน้า, สร้าง Header + Side Menu + หัวข้อ แล้วเรียก
`SP.modules[entry.id].render(bodyEl, ctx)` — `ctx = { entry, page, content, year, intro (แถวหัวข้อ ใส่ workflowBar), refreshMenu() }`
หลัง render ถ้ามี `page.approve` layout ต่อกล่อง "สิ่งที่ขออนุมัติ" (`page.approveTitle`) ท้ายหน้า (ตอนนี้คือหน้าเกี่ยวกับ Prototype)
(ถ้าหน้าไม่อยู่ใน registry เช่น tests ใช้ Module ตัวเดียวที่ลงทะเบียนไว้ / `index.html` ที่ Root → ไปหน้าแรกของ Tour)

### store

- ข้อมูลแผนแยกตามปี (ปีที่เลือกจากตัวเลือกปีในแถวหัวข้อ เก็บที่ `app.planYear` ตัวเลือกจาก `settings.PLAN_YEARS` ใช้ร่วมกันทุกหน้า):
  - `app.planYear` — เปลี่ยนแล้ว reload หน้า
  - `plan.<ปี>.topDown` = `{ total, channels: [channelId], pct: { <channelId|unitId>: สัดส่วน }, units: { <channelId>: [unitId] } }`
  - `plan.<ปี>.phasing.<unitId>` = `{ monthPct: [12 สัดส่วน], edited: bool }` → บาทรายเดือน `calc.phasingTotals(เป้าทั้งปี, monthPct).amounts`
  - `plan.<ปี>.sku.<unitId>` = `{ method, items: { <productKey>: { startMonth, qty: [12], overrides: [12 bool], stopped } } }` แผนครั้งแรก (Baseline)
    `method` = วิธีเติมยอดของช่องระบบเติม `'lastYear'` (ค่าเริ่มต้น `DEFAULT_FILL_METHOD`) | `'runRate'` (CR-11 เลือกได้ต่อหน่วยขาย)
    default = `calc.defaultSkuPlan(master, id, year, true, planSeeds.years[ปี][id])` (สินค้าขายจริงที่ข้อมูลจำเป็นครบ Listing และขายอยู่
    + สินค้าใหม่ที่แผน NPD อนุมัติแล้วและวางแผนหน่วยนี้ เริ่มขายตามเดือนในแผน NPD + จำนวนชิ้นใน `data/plan-seeds.js` = กรอกเอง/Override)
  - `plan.<ปี>.forecast.<unitId>` = โครงเดียวกัน ใช้ในโหมดปรับแผน default = สำเนาของ Baseline ห้ามเขียนทับ Baseline
  - `plan.<ปี>.workflow.<step>.<unitId|all>` = `{ status, history: [{ action, by, at, note }], snapshot, prevSnapshot }`
    step = `topDown` (all) | `phasing` | `sku` | `forecast` | `baseline` (all) ไม่มี Key = ฉบับร่าง
    `baseline.all.snapshot` = `{ gp: { <unitId>: GP }, priceList, promotions (ยืนยันแล้ว), report }` ตอนล็อก → แผนครั้งแรก / Plan Baseline
    คำนวณด้วย snapshot (`gridOpts.snapshot`) ราคาและ Promotion ที่แก้หลังล็อกมีผลกับ Forecast เท่านั้น /
    `report` (CR-12) = ผลของ `core/report.js build()` ตอนล็อก — รายงานที่ล็อกแล้วอ่านตัวเลขทั้งหมดจากที่นี่ (ชื่อ เป้าหมาย แผน ผู้รับผิดชอบ การอนุมัติ)
  - `plan.<ปี>.baselineVersions` = `[{ no, code, at, by }]` (CR-12) ต่อท้ายทุกครั้งที่ล็อก Baseline → เลขฉบับรายงาน `{ปี}-BL-{nn}` / ไม่ล็อก = `{ปี}-DRAFT`
    Workflow ของแผน NPD ไม่อยู่ที่นี่ (อยู่ใน `master.npdPlans[].workflow`)
    อ่าน/เขียนทั้งปีด้วย `store.workflowStates()` / `store.saveWorkflowStates(map)` (map Key = `'<step>.<unitId|all>'`)
- Master (ไม่แยกปี) default จากไฟล์ใน `data/`: `master.products`, `master.listings`, `master.taxonomy`, `master.priceList`, `master.promotions`,
  `master.npdPlans`, `master.audit` (เริ่ม [] ต่อท้ายด้วย `store.appendAudit(entries)` ที่สร้างจาก `calc.auditDiff`), `master.accounts`,
  `master.territories`, `master.salespeople`, `master.assignments` → `store.master()` คืนทั้งหมด / `store.data()` = SP.data ที่แทน Master ด้วยค่าใน store
  **ส่ง `store.data()` ให้ calc แทน SP.data เสมอ** ค่าที่แก้ในหน้า Master จึงมีผลทุกหน้า
- UI: `ui.selection` = `{ channel, unit }` (Phasing และวางแผน SKU ใช้ร่วมกัน รายงานตั้งก่อนพาไปหน้านั้น) /
  `ui.planMode` = `'initial' | 'reforecast'` (reforecast ใช้ได้หลังล็อก Baseline) / `ui.currentMonth` = เดือนปัจจุบันจำลอง 0–11
  (default `DEMO_FORECAST_MONTH` = มี.ค.) ใช้ร่วมกันทั้งโหมดปรับแผน ผู้รับผิดชอบ และ Performance (`store.currentKey()` = 'YYYY-MM') /
  `ui.role` = `{ type, personId }` (`store.role()` ปุ่มสลับมุมมองใน workflowBar ตั้งค่านี้แล้ว reload) / `ui.sidebarCollapsed` /
  `ui.seriesFilter` = [seriesId หรือ subSeriesId] (SKU, รายการสินค้า, Listing, Promotion ใช้ร่วมกัน เลือก Series = รวม Sub Series) /
  `ui.productMaster.channel` (Listing และ Promotion Price) / `ui.productColumns` (คอลัมน์เพิ่มเติมของรายการสินค้า) / `ui.masterChannel` (หน้า Account) /
  `ui.skuShowLastYear` (หน้าวางแผน SKU แสดงยอดปีก่อน) / `ui.summaryTab` = `'status' | 'report' | null` (CR-12 แท็บล่าสุดของขั้นที่ 4
  null = ยังไม่ล็อก → ติดตามสถานะ / ล็อกแล้ว → รายงาน / ล็อกเสร็จตั้ง report · ปลดล็อกตั้ง status)
  Filter Channel ของรายงาน ตัวกรองของแท็บติดตามสถานะ แท็บของหน้าเกี่ยวกับ Prototype และ ค้นหา / จัดกลุ่ม / เรียง / กลุ่มที่พับ / แถวที่เลือก
  ของหน้าวางแผน SKU เป็นตัวแปรใน Module (ไม่เก็บ)
- `DATA_VERSION` = 7 (CR-11 สินค้าจริง): ค่าที่บันทึกจากรุ่นก่อนถูกล้างครั้งเดียวตอนโหลด (คงปีแผนและเมนูพับ) / `store.reset()` เขียนรุ่นข้อมูลกลับทันที
  (ไม่อย่างนั้นค่าที่ตั้งหลังรีเซ็ต เช่น มุมมองผู้ใช้ จะถูกล้างอีกครั้งตอนเปิดหน้าถัดไป) / `store.today()` = วันที่ของเดือนปัจจุบันจำลอง
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
  'ACTUAL'|'SELL_IN_MINUS_CN', hasGP, active, order, unitLabel, gpLabel }` — unitLabel: MT/Export = Account, TT = เขตการขาย, ECOM = Platform /
  gpLabel: MT/Export = GP, ECOM = ค่าธรรมเนียม Platform, TT = null สี `--ch-1`…`--ch-8` (`calc.channelColor` ไม่มี colorToken = สีตาม order)
  MT/ECOM = ACCOUNT, TT = TERRITORY (hasGP false, SELL_IN_MINUS_CN, **`priceBasis: 'SELL_IN'`** = คำนวณยอดขายด้วยราคา Dealer ใน Price List — CR-11),
  Export = ACCOUNT `active: false` (ไม่อยู่ในแผนตั้งต้น แต่เลือกได้จาก "+ เพิ่ม Channel") / sellOutMethod ตอนนี้แสดงผลเท่านั้น ยังไม่ใช้คำนวณ
- หน่วยแบ่งเป้า (`unit` ในโค้ด / ในหน้าจอเรียก "Account / เขตการขาย") = Account หรือเขต ตาม `allocationUnit` ของ Channel id ไม่ซ้ำกัน
  ใช้เป็น Key ทุกที่ (phasing, sku, listing, history, actuals, promotions.subChannel) — เป้า ยอดขาย และ History ผูกกับหน่วย **ไม่ผูกกับคน**
  - `data/accounts.js` = `{ id, name, channelId, active, gp, gpFrom, note }` (`calc.gpOf` = 0 ถ้า Channel hasGP false) / GP 7-Eleven 40% ·
    EVEANDBOY 45% (CR-11 ตรงกับที่ใช้ปรับยอดขายราย SKU ใน seed) / ECOM มี Platform
    `Website (Own)` (ค่าธรรมเนียม Payment 3% + หมายเหตุ) และ `LINE Shop` แบบ `active: false` (เดโมเปิดใช้งานแล้วเพิ่มในหน้า Top-down)
  - `data/territories.js` = `{ id, channelId, name, active }` TT 5 เขต (id เดิม `tt-north` … + `tt-east`) ป้ายหน่วย = "เขต"
- `data/salespeople.js` = `{ id, name, channelId | null, startMonth, endMonth }` (null channel = ดูแลได้ทุก Channel)
- `data/assignments.js` = `{ unitId, salesPersonId | null, fromMonth, toMonth | null }` ('YYYY-MM') กฎ: 1 หน่วย 1 เดือน 1 คน ช่วงห้ามทับ
  (`validateAssignments`), แก้เดือนก่อนเดือนปัจจุบันไม่ได้ (`setOwner` → error 'past'), เปลี่ยนได้ทุกเดือนที่ยังไม่ผ่าน (ไม่ติด M+1..M+3),
  คนที่เลย endMonth แล้ว = ว่าง + Alert "มีรายการที่ยังผูกกับผู้ที่ลาออก" / ข้อมูลตั้งต้น: EVEANDBOY เปลี่ยนคน มี.ค. 2027, TT เขต 3 ว่าง
- `data/history.js` = `years.<ปี>.monthly.<unitId>` + `actualMonths` (ใช้สร้างข้อความ ⓘ ยอดขายปีก่อน) / ยอด Channel = รวมทุกหน่วยใน Master ของ Channel
  / CR-11 (`core/seed.js` เติม): `years.2026.skuQty.<unitId>.<productKey>` = จำนวนชิ้นรายเดือน (ยอดขายปีก่อนราย SKU) ·
  `runRate.<productKey>.<unitId>` = เฉลี่ย `RUN_RATE_MONTHS` (3) เดือนจริงล่าสุด (มิ.ย.–ส.ค. 2026) · 7-Eleven / EVEANDBOY รูปแบบรายเดือนของ `monthly`
  = Net Sales จาก SKU ยอดทั้งปีคงตามไฟล์ (19,800,000 / 9,900,000) / หน่วยอื่น: รูปแบบของหน่วยต้นแบบ (`listingRules.units[].from`) เฉพาะ SKU ที่ Listing
  ปรับทุกเดือนให้ Net Sales เท่ากับ `monthly` ของหน่วยนั้น (กำหนดตายตัว ไม่สุ่ม)
- `data/seed/seed-charmiss.js` (CR-11) = `SP.data.seedCharmiss` `{ meta, products (117: trCode, name, shortName, series, rsp, dealerPrice, sourceStatus,
  launchDate, discontinueMonth), listings (7-Eleven 11 · EVEANDBOY 76), accountPrices, history2026 }` → `core/seed.js` สร้าง:
- `data/products.js` = กฎนำเข้า `SP.data.productImport` (`categoryRules` คำในชื่อ → Type, `notSeries: ['Existing']`, สินค้าใหม่ 2027 `newProducts`)
  → `SP.data.products` 120 รายการ (จริง 117 + รหัสชั่วคราว NPD_2027Q2_01..03 เปิดตัว 1 มิ.ย. 2027 ชื่อลงท้าย "(ชื่อชั่วคราว)")
  `{ trCode, tempCode, tempCodeHistory, internalCode, barcode, name, nameEn, shortName, categoryId, subCategoryId, typeId, inferred (หมวดจากชื่อ),
  seriesId, subSeriesId, itemType, packSize, uom (จากชื่อ), image, launchDate, discontinueMonth, clearance, note, createdAt, updatedAt }` —
  Active 58 · NPD-2025 18 (เปิดตัว 1 ต.ค. 2025) · Discontinued 41 (เลิกขายก่อนปี 2027) / 5 SKU Existing (คิ้ว + ไพรเมอร์) ไม่มี Series = ขาดข้อมูลจำเป็น /
  ไม่มี Tester / Gift / Premium และ Clearance ในข้อมูลจริง (Test ใช้สินค้าสมมติ) / Sales Planning ใช้เฉพาะ `itemType = SALE`
  - `productKey` = trCode ถ้ามี ไม่มีใช้ tempCode (`NPD_{ปี}Q{ไตรมาส}_{ลำดับ}` ตามวันเริ่มขาย `calc.nextTempCode`) ใช้อ้างสินค้าทุกที่
    (Listing, ราคา, Promotion, แผน NPD, แผน SKU, Actual, Run-rate)
  - ความครบถ้วน `calc.productCompleteness`: จำเป็น `settings.PRODUCT_REQUIRED` (รหัส ชื่อ Category Sub Category Type Series Item Type RSP วันเริ่มขาย)
    / ที่ควรมี `PRODUCT_RECOMMENDED` (Barcode รูป Sub Series Internal Code ขนาดบรรจุ) — ขาดข้อมูลจำเป็น = ใช้ในแผน SKU ไม่ได้ (`planBlockReason`)
- `data/taxonomy.js` = `{ category: [{ id, name, level: CATEGORY|SUB_CATEGORY|TYPE, parentId, active, order }], series: [... SERIES|SUB_SERIES] }`
  CR-11: Category = Face · Cheek · Lip · Eye · Skincare (+ Sub Category / Type) / Series 8 รายการสร้างจาก Campaign (`ser-<ชื่อ>` ไม่มี Sub Series)
  ฟอร์มสินค้าเลือกจาก Master เท่านั้น (`components.cascadeSelect`) รายการที่มี SKU ใช้อยู่ลบไม่ได้ ให้ปิดใช้งาน
- `data/pricing.js` = `SP.data.priceImport` (`dealerChannels`, `changes`) → `SP.data.priceList`
  `[{ productKey, priceType: RSP|SELL_IN, channelId | null, accountId | null, price, effectiveFrom, effectiveTo | null, by, at }]`
  เพิ่มราคาใหม่ด้วย `calc.addPrice` (ปิดช่วงราคาเดิมให้เอง ไม่เขียนทับ) / ลำดับ (CR-11): Promotion ที่ยืนยันแล้ว → ราคาเฉพาะ Account (`accountId`)
  → ราคาของ Channel → ราคาทั่วไป / RSP จาก seed · SELL_IN ของ TT = dealerPrice · Juicy Pop Tint 02/05 ที่ 7-Eleven 149 บาท ·
  ราคาเปลี่ยนตัวอย่าง: Perfect Heart Cushion RSP 399 → 429 (TT 220 → 240) ตั้งแต่ 1 ก.ค. 2027
- `data/promotions.js` = `{ id, name, productKey, accountIds, startDate, endDate, mode: PRICE|DISCOUNT_PCT, value, promoGpPct | null,
  status: DRAFT|CONFIRMED, createdBy }` เฉพาะ CONFIRMED ที่ใช้คำนวณ / ห้ามซ้อนใน SKU × หน่วยขายเดียวกัน
- `data/npd.js` = `SP.data.npdPlans` `{ id, productKey, seriesId, stage: plan|concept|production|ready, plannedLaunchDate,
  plannedAccounts: [{ accountId, plannedStartMonth }], note, workflow: { status, history } }` (stage "เปิดตัวแล้ว" ระบบตั้งเมื่อถึงวันเปิดตัว)
- `data/listings.js` = `SP.data.listingRules` → `SP.data.listings` `[{ productKey, accountId (= unitId) }]` 962 รายการ: 7-Eleven / EVEANDBOY จาก seed ·
  สินค้าใหม่ 2027 → `newProductUnits` (7-Eleven, EVEANDBOY) · หน่วยอื่น = รายการของหน่วยต้นแบบตัด `excludeTypes` / `excludeSeries`
  (TT ไม่มี Palette และ Toner, Watsons ไม่มี Toner, Lazada ไม่มีดินสอเขียนคิ้ว …) / Stock Clearance แบ่งเท่ากันทุกหน่วยที่ Listing
- `data/erp-snapshot.js` = `SP.data.erpImport` (ความต่างตัวอย่าง: ชื่อ 16370, RSP 15000, Barcode 3 รายการ, มีใน ERP แต่ไม่มีใน Master 33480 / 12250,
  ไม่มีใน ERP 53021) → `SP.data.erpSnapshot`
- `data/actuals.js` = ยอดขายจริงสมมติ `years.2027.<unitId>.<productKey>` = [12 ชิ้น] ตัวเลขคงที่ ห้ามสุ่มตอนเปิด
  (CR-11 สร้างใหม่ครั้งเดียวจากแผนตั้งต้น × ตัวคูณคงที่ 0.85–1.12)
- `data/plan-seeds.js` = `years.<ปี>.<unitId>.<productKey>.<เดือน>` = ชิ้น (เติมในแผน SKU ตั้งต้นเป็น Override) CR-11: ทีมขายปรับเพิ่ม 5 SKU หลัก
  ของ TT เขต 1 (+1.5%) และ Tiktok (+2%) = เกิน / TT เขต 3 เท่าเป้าพอดี = จัดสรรครบ
- ข้อมูลตั้งต้นสำหรับนำเสนอ (v5 ข้อ 7 + v7 ข้อ 6, Test "v5: ข้อมูลตั้งต้น" และ v7-7): Total 2027 = 120,000,000 / ยอดขายปี 2026 รวม
  113,200,000 (+6.0% = +6,800,000 บาท) / Top-down ตั้งต้น = สัดส่วนตามยอดขายปีก่อน ปัดเป็น % เต็ม รวม 100% (`calc.roundShares`):
  Channel 45 / 20 / 35 · MT 41/39/20 · TT 34/38/28 · ECOM 45/25/30 → จัดสรรครบทุกชั้น ตัวอย่างขาด/เกินจึงอยู่ที่แผน SKU:
  CR-11 แผน SKU ตั้งต้น (ยอดปีก่อน × การเติบโต) รวม 116.60 ล้าน (−2.8%) / ขาด: 7-Eleven (8,485 บาท จาก Promotion สงกรานต์และการปัดเศษ),
  Watsons, EVEANDBOY (−21%: เลิกขาย 41 SKU ยอดปีก่อน 1.87 ล้าน + ขาด Series 5 SKU 0.23 ล้าน), TT เขต 2, Shopee, Lazada ·
  เกิน: TT เขต 1, Tiktok · จัดสรรครบ: TT เขต 3 / หน่วยอื่นขาดราว 2.6–3% จาก SKU Existing ที่ใช้ในแผนไม่ได้ /
  Waterfall: 113.20 → MT +2.30 → TT +1.10 → ECOM +3.40 → 120.00 / รีเซ็ตข้อมูลคืนค่าชุดนี้

### มาตรฐานกลาง (v5 ข้อ 1)

- ภาษาไทยทางการ ประโยคสั้น ไม่ใช้ภาษาพูด / คำอธิบายใต้หัวข้อ 1 บรรทัด บอกว่าหน้านี้ทำอะไร (วิธีใช้อยู่ใน Tooltip หรือแผง ?)
  ศัพท์ธุรกิจเป็นภาษาอังกฤษ: Target, Net Sales, Sell-out Amount, GP, SKU, Channel, Account, Series, NPD, Forecast, Baseline
- ชื่อขั้นตอน (CR-10): 1 จัดสรรเป้าหมายประจำปี (ย่อ เป้าหมายประจำปี · Tooltip การจัดสรรแบบ Top-down) / 2 จัดสรรเป้าหมายรายเดือน
  (ย่อ เป้าหมายรายเดือน · Tooltip Phasing) / 3 วางแผนยอดขายราย SKU (ย่อ แผนยอดขายราย SKU · Tooltip การวางแผนแบบ Bottom-up) / 4 รายงานสรุปแผน
  — ห้ามใช้ Top-down / Phasing / Bottom-up เป็นชื่อหน้า (ใช้ได้ในข้อความอื่น เช่น คอลัมน์สถานะอนุมัติ, ชื่อ Workflow)
- ตารางคำศัพท์ (ใช้ให้ตรงกันทุกหน้า): หน่วยแบ่งเป้า → หน่วยขาย (ข้อความรวมทุก Channel) / ชื่อเฉพาะของ Channel = `unitLabel`
  (Account · เขตการขาย · Platform) · GP → `gpLabel` (GP · ค่าธรรมเนียม Platform) · Top-down: % ของ Total / % ใน Channel (ห้ามคอลัมน์ % เดียวที่ฐานต่างกัน) ·
  เป้า (บาท) → เป้าหมาย (บาท) · ยอดขายปีก่อน → `ยอดขายปี {ปีก่อน}` + ⓘ (`components.priorLabel`) ในแถบ Total, หัวคอลัมน์, แถบบริบท, แถว Phasing,
  รายงาน (ห้ามป้าย "Actual 8M + Est.") · NPD / Existing (Sales Planning) → Status ชุดใหม่ Planned / New / Active / Clearance / Discontinued
  (กลุ่มหน้า SKU: สินค้าที่วางขายแล้ว · สินค้าใหม่ (New) ปี {ปี}) · Growth → การเติบโต · % ของปี → สัดส่วนรายเดือน (%) · Net Sales (แถว Phasing) → เป้าหมาย Net Sales (บาท) ·
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
- โครงหัวหน้า (layout): `[ขั้นที่ x/4] หัวข้อ [2027 ▾] [ป้ายสถานะ] ประวัติ ▾ ........ [ส่งออก ▾] [ปุ่ม workflowBar]` + คำอธิบาย 1 บรรทัด
  ชื่อหน้ามี Tooltip (`titleTip`) / ปีแผน (`planYearPicker`) ขนาดตัวอักษรเท่าหัวข้อ มี ▾ Tooltip `เปลี่ยนปีแผน` เปลี่ยนแล้วโหลดหน้าใหม่
  มีรายการที่ยังไม่บันทึก → `confirmDiscard` ก่อน / ชื่อผู้จัดทำ/ผู้ส่ง/ผู้อนุมัติอยู่ใน `ประวัติ ▾` เท่านั้น / หัวข้อไม่ใส่ปี (ปีอยู่ที่ตัวเลือกปี)
- **บทบาทที่แก้ไขไม่ได้** (`W.viewState(state, role, { step, ownerId, ownerName, editing, locked })` → `kind`):
  `actions` = มีปุ่ม / `readOnly` = `อ่านอย่างเดียว · ผู้จัดทำคือ {ชื่อ}` + ปุ่ม `สลับเป็นมุมมองผู้จัดทำ` (รออนุมัติ = `รอ {ผู้อนุมัติ} อนุมัติ`
  + `สลับเป็นมุมมองผู้อนุมัติ`) / `waiting` = บทบาทเป็นผู้อนุมัติแต่ยังไม่ส่ง → `อ่านอย่างเดียว · รอผู้จัดทำส่งอนุมัติ (ผู้จัดทำคือ …)`
  + ปุ่มสลับเป็นผู้จัดทำ / `none` = อนุมัติแล้วหรือล็อก Baseline แล้ว / ปุ่มสลับตั้ง `ui.role` แล้ว reload
- แถบบริบทแถวเดียว (Phasing, วางแผนราย SKU) `.ctx-bar` = `subChannelPicker` + `contextStats`:
  `Channel | {unitLabel} ‹ ▾ › | ผู้รับผิดชอบ: … · {gpLabel} (เฉพาะ hasGP) · เป้าหมายทั้งปี · ยอดขายปี {ปีก่อน} ⓘ · การเติบโต`
  Dropdown ตอนปิด = ชื่อเท่านั้น / ตอนเปิด = ชื่อ · ผู้รับผิดชอบ · คงเหลือ (ข้อความ + สี) · สถานะ Workflow (ข้อความ) ไม่มีจุดไร้คำอธิบาย
  ชื่อผู้รับผิดชอบแสดงครั้งเดียวต่อหน้า แถบผู้รับผิดชอบรายเดือนแสดงเฉพาะเมื่อมีหลายคนในปี (`calc.ownerSegments` > 1)
  จอ < 1800px ย่อตัวอักษร ซ่อนป้าย unitLabel (อยู่ใน title ของปุ่ม) / จอ < 1600px ขึ้นบรรทัดใหม่ได้เมื่อไม่พอ (เช่น ECOM ขณะมี Side Menu)
- เมนูข้าง: ชื่อบรรทัดเดียว — Sales Planning ใช้ชื่อเต็ม ถ้ายาวเกินบรรทัดใช้ชื่อย่อ (`nav.fitLabels` วัดหลังวางเมนูและเมื่อ Font โหลดเสร็จ
  ที่เมนู 236px ตอนนี้ได้ชื่อย่อทั้ง 4 ขั้น) / ปุ่มก่อนหน้า/ถัดไปใช้ชื่อย่อ (`ถัดไป: เป้าหมายรายเดือน →`) / พับแล้วแสดงไอคอน + Tooltip
  `ชื่อเต็ม · สถานะ` ไม่มีวงกลมสถานะ / Header มีป้าย `Prototype`

### Workflow (core/workflow.js + components.workflowBar)

- สถานะ: ฉบับร่าง → รออนุมัติ → อนุมัติแล้ว / ส่งกลับแก้ไข (ต้องมีเหตุผล) / ต้องตรวจสอบใหม่ / baseline: ล็อกแล้ว → ปลดล็อก (`unlock` CR-12
  Sales Director ต้องมีเหตุผล → ฉบับร่าง แผนแก้ไขได้ตามปกติ ล็อกใหม่ = รายงานฉบับถัดไป)
  แก้ไขได้เมื่อ ฉบับร่าง, ส่งกลับแก้ไข, ต้องตรวจสอบใหม่ / อนุมัติแล้ว → ผู้อนุมัติกด เปิดให้แก้ไข → ฉบับร่าง
- ผู้จัดทำ/ผู้อนุมัติ (`submitterRole`, `approverRole`): Top-down = Sales Director → Management / Phasing, SKU, Forecast ต่อหน่วย =
  ผู้รับผิดชอบปัจจุบันของหน่วย (`ownerOf` ณ เดือนปัจจุบันจำลอง; หน่วยว่าง → Sales Director ส่งแทน) → Sales Director /
  Baseline = Sales Director ล็อกที่หน้ารายงานสรุปแผน
- แผน NPD (step `npd`, ต่อแผน เก็บใน `master.npdPlans[].workflow`): ทีม Product ส่ง → Sales Director อนุมัติ / ส่งได้เมื่อมีวันเปิดตัวและหน่วยขาย ≥ 1
  (`facts.ready`) / workflowBar ใช้ `getState()` + `onAction(action, payload)` / อนุมัติ → `calc.applyNpdApproval` (ตั้งวันเริ่มขาย + Listing) /
  เลื่อนวันเปิดตัวหลังอนุมัติ → `W.resetToDraft` + `W.reviewUnits(states, 'sku', หน่วยที่วางแผน)` (แผน SKU ที่อนุมัติแล้ว → ต้องตรวจสอบใหม่)
- หน้า Master: `W.masterViewState(role, editRoles)` / `canEditMaster` — workflowBar `simple: true, editRoles: [...]` บทบาทอื่นเห็น
  `อ่านอย่างเดียว · ผู้แก้ไขคือ {ชื่อ}` + ปุ่มสลับ (รายการสินค้า / NPD = ทีม Product, Listing = ทีม Product + Supply Chain, Promotion = Trade Marketing,
  หมวดสินค้าและ Series = ทีม Product, Account / เขต / ผู้รับผิดชอบ = ทุกบทบาท)
- `allowedActions(state, role, { step, ownerId, editing, locked })`, `viewState`, `transition(state, action, payload)`,
  `canSubmit(step, unitId, year, { states, remaining, baselineLocked })`, `changedUnits`, `invalidateDownstream`, `applyAction`,
  `canLock`, `isLocked`, `lastEvent`, `lastOf`, `baselineVersion`, `addBaselineVersion`, `approvalRows`
- ส่งอนุมัติได้เมื่อ: Top-down และ Phasing คงเหลือครบ (±1 บาท) / SKU ไม่ขาดเป้า (เกินเป้าส่งได้) / Phasing รอ Top-down อนุมัติ /
  SKU รอ Phasing ของหน่วยนั้น / Forecast ต้องล็อก Baseline แล้ว (ไม่บังคับคงเหลือ)
- อนุมัติเก็บ `snapshot` (เป้าต่อหน่วย: Top-down = ทั้งปี, Phasing = 12 เดือน) อนุมัติใหม่แล้วหน่วยที่ต่างเกิน 1 บาท → ขั้นล่างที่อนุมัติแล้ว
  ของหน่วยนั้นเป็น "ต้องตรวจสอบใหม่" หน่วยอื่นไม่เปลี่ยน
- หลังล็อก Baseline: Top-down / Phasing / แผนครั้งแรก ไม่มีปุ่ม / โหมดปรับแผนเปิดใช้ มี Workflow ของตัวเอง (step `forecast`)
- `workflowBar(opts)` = ป้ายสถานะ + ประวัติ ▾ (Popover: ผู้จัดทำ/ผู้อนุมัติ + รายการเปลี่ยนสถานะ) ข้างชื่อหน้า และปุ่มมุมขวา
  (display: contents ใน ctx.intro) opts: `step, unitId, year, ownerId, title(), editing(), facts() → { remaining }, summary() → [บรรทัด],
  snapshot(), onEdit, onSave, onCancel, onChange` / `simple: true` = แค่ แก้ไข · บันทึก · ยกเลิก (หน้า Master)
  กล่องยืนยันใช้ `C.dialog` (`<dialog>`) สรุปตัวเลขหลัก / ส่งกลับต้องมีเหตุผล / ปุ่มส่งกดไม่ได้พร้อมข้อความเหตุผล
- บทบาทจำลอง: Header "มุมมองผู้ใช้" Management / Sales Director / ทีม Product / Supply Chain / Trade Marketing / Sales Person (คนที่ทำงานอยู่)
  → `ui.role` เปลี่ยนแล้ว reload

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
- v6/v7: `drawer({ label, className, beforeClose, onClose })` → `{ head, body, open, close, isOpen }` (Drawer ~600px ขวา) ·
  `productThumb(p, taxonomy, { size })` (รูป หรือตัวอักษรย่อ Series บนสี `--ser-*`) · `resizeImage(file, maxPx)` · `completenessBadge` · `statusStrip` ·
  `cascadeSelect` · `hoverTip(root, selector, build)` (Tooltip ทั่วไป) · `choiceDialog` · `exportButton({ build(source), unsaved })` ·
  `priorLabel(year, text)` / `priorNote(year)` · `roleName` · workflowBar opts `extra` (ปุ่มส่งออกหน้าปุ่ม), `editRoles`, `getState`, `onAction` /
  Popover (z 70) และ Tooltip (z 75) อยู่เหนือ Drawer (z 61)
- `dialog` (opts `danger`), `popover(anchor, build, opts)`, `menuButton(items)` (⋯), `wfIcon`, `wfBadge`, `alertBadge(rem)`, `remainingRow`,
  `trashButton`, `icon('trash')`, `numberInput({ commit: true })`, `accountPicker` (ปุ่ม → Dropdown เลือกจาก Master), `growthText`,
  `remainingBar`, `bindArrowNav`, `barChart` (12 เดือน, lead/trail ให้คอลัมน์ตรงกับตาราง), `segmented` (option `disabled`,
  `title` / แสดงค่าที่เลือกตอนสร้าง เปลี่ยนแท็บแล้วสร้างใหม่), `approveBox(items, title)`
- CR-11: `gridKeys(table, { editing, cols, pasteCols, valueAt(key, col), apply(writes), undo() })` ตารางกรอกตัวเลข (แถว `tr[data-row]` ช่อง `[data-col]`):
  ลูกศร · Enter ลง · Tab ขวา · Shift+ลูกศร / Shift+คลิก / ลาก = เลือกช่วง · Ctrl+C (TSV) · Ctrl+V (`calc.pasteCells`) · Delete · Ctrl+D / Ctrl+R
  (`calc.fillCells`) · Ctrl+Z (`opts.undo` ยกเว้นกำลังพิมพ์) · ไฮไลต์แถว + หัวคอลัมน์ที่ชี้ (`is-hover-row`, `is-hover-col`) → `.refresh()`, `.clear()` /
  `undoStack(limit)` (`UNDO_LIMIT`) / `promptNumber({ title, label, suffix, value, hint })` / `dialog` opts `body`, `wide` / `menuButton(items | fn, label,
  { className, text, align })` รายการมี `disabled`, `danger`, `current` / `numberInput.setValue(v, force)` / `cellBreakdown` info `notes`
- class `.print-only` = แสดงเฉพาะตอนพิมพ์

### กราฟ (core/charts.js — SVG/CSS เขียนเอง)

- `waterfall({ start: { label, value }, steps: [{ id, label, value (ส่วนต่าง), tag }], end, format, signed, tick, axisNote, onHover })` ที่มาของการเติบโต
  แนวนอน (เพิ่ม = `--wfc-up` เขียว, ลด = `--wfc-down` แดง, ยอดรวม `--wfc-total`) → `.info = { start, end, step, ticks }`, `.update(o)`, `.highlight(id)` (รายงาน)
  แกน (CR-12) เริ่มที่เลขกลม `calc.axisStart` (ค่าต่ำสุด ≥ 200 ล้าน ขั้นละ 100 ล้าน · ≥ 50 ล้าน ขั้นละ 50 ล้าน · ต่ำกว่านั้น 0) ปลายแกน `niceAxis` /
  แท่งยอดปีก่อนและ Total เริ่มจุดเดียวกัน (แถวใช้ subgrid คอลัมน์ร่วมกัน) / เส้นแบ่งแกน + ตัวเลขใต้แกน / แกนไม่เริ่มที่ 0 = สัญลักษณ์ตัดแกน + `แกนเริ่มที่ 100 ล้านบาท` / Channel ไม่มียอดปีก่อน = แท่งเพิ่มทั้งหมด + ป้าย "ใหม่" / คงเหลือระดับ Total ≠ 0 = แท่ง "ยังไม่จัดสรร" / "จัดสรรเกิน"
- `stackedShare({ rows: [{ label, parts: [{ id, value (0–1), colorToken, title }] }], legend, minLabel (0.06), onHover })` แท่ง 100% 2 ปี
  → `.update(rows, legend)`, `.highlight(id)`
- แท่งเป้าหมายเทียบปีก่อน (CR-10 ข้อ 3.4 ฉบับแก้ไข) = **สเกลจริงเดียวกันทั้งตาราง เริ่มที่ 0** (ห้ามสเกลต่อแถว หรือแยกสเกล Channel / หน่วยขาย):
  - `niceScaleMax(values)` = ค่ามากสุดของเป้าหมายและยอดขายปีก่อนทุกแถว (รวมแถวที่พับอยู่) ปัดขึ้นขั้นละ 10 ล้าน (ค่าสูงสุด < 30 ล้าน ขั้นละ 5 ล้าน)
    [54, 51.7, 24, 22.14 … ล้าน] → 60 ล้าน / [18, 12 ล้าน] → 20 ล้าน / คำนวณใหม่หลัง Enter / blur เท่านั้น
  - `vsLastYearBar(target, lastYear, scaleMax, { colorToken, year })`: แท่ง = เป้าหมาย ÷ scaleMax · ขีดตั้ง = ยอดปีก่อน ÷ scaleMax (ตำแหน่งตามยอดจริง)
    54 / 51.7 / 60 ล้าน → แท่ง 90.0% ขีด 86.2% / ไม่มียอดปีก่อน = แท่งไม่มีขีด + ป้าย `ใหม่` / เป้าหมาย 0 = ไม่มีแท่ง มีเฉพาะขีด /
    เส้นแกนจางที่ 1/3 และ 2/3 ทุกแถว / สีตาม Channel / Tooltip `เป้าหมาย {x} บาท · ยอดขายปี {ปีก่อน} {y} บาท · {±z}%` / `.info` = ผลจาก calc
  - `vsLastYearAxis(scaleMax)` แกนใต้ชื่อคอลัมน์ `0 · 20 · 40 · 60 ล้าน` (แบ่ง 3 ช่วง ตำแหน่งตรงกับเส้นแกน) / ใช้ทั้งหน้าจัดสรรเป้าหมายประจำปีและรายงาน
  — แทน `miniBar` เดิม (ลบแล้ว) / ข้อความจาก `labels.vsLastYear`
- `barLine({ bars, line, dashed, months, labels: { bar, line, dashed, lineEnd, dashedEnd }, tick, endText, tip })` (CR-12) แท่งเป้าหมาย
  `--chart-target` (สีหลักอ่อน ~40%) · แผน = เส้นทึบ 3px + จุดทุกเดือน `--chart-plan` · ยอดปีก่อน = เส้นประ 1.5px ไม่มีจุด `--chart-lastyear` /
  แกน Y เริ่ม 0 ค่าสูงสุด = `niceScaleMax(ทุกชุด, { headroom: CHART_HEADROOM })` เส้นแบ่ง 4–6 เส้น (`calc.niceAxis`) / ป้ายท้ายเส้นเดือน ธ.ค.
  (`แผน 12.70` · `ปี 2026 11.90` ชนกันแยกขึ้น/ลง) / Legend ใช้สัญลักษณ์เดียวกับที่วาด / Hover เดือน = Tooltip เป้าหมาย · แผน · ส่วนต่าง · ยอดปีก่อน /
  วาดด้วย HTML + SVG เฉพาะเส้น (`vector-effect: non-scaling-stroke`) จึงยืดตามความสูงการ์ดได้ → `.info = { top, step, ticks }`
- `hbars({ items: [{ label, value, text, colorToken, title }] })` แท่งแนวนอน (รายงาน: สัดส่วนตามกลุ่มสินค้า)
- `splitBar(calc.moneySplit(...), labels, opts)` แถบ Net Sales / GP / VAT (ⓘ วิธีคำนวณ) / ไม่มี donut และ barList แล้ว (ลบพร้อมหน้าที่ซ่อน)

### หน้าจัดสรรเป้าหมายประจำปี (Top-down, v5 ข้อ 2 + v7 + CR-10)

- แถบ Total บรรทัดเดียว: `Total Target [ช่องกรอก] บาท · ยอดขายปี 2026 ⓘ 113,200,000 บาท · การเติบโต +6.0% (+6,800,000 บาท)`
  (ⓘ = `ยอดขายปี 2026 = ยอดขายจริง ม.ค.–ส.ค. + ประมาณการ ก.ย.–ธ.ค.` คำนวณจาก `history.actualMonths`) — Total แสดงครั้งเดียว
- ตาราง Tree เต็มความกว้าง **ไม่มีแผงกราฟ** (CR-10) — Waterfall และแท่งสัดส่วน Channel อยู่ในหน้ารายงานสรุปแผน / Hover แถว = ไฮไลต์ทั้ง Channel /
  ห้าม Donut
- คอลัมน์: ชื่อ (แถวหน่วยขายต่อท้ายด้วยผู้รับผิดชอบปัจจุบัน ข้อความเล็กสีจาง) · ยอดขายปี 2026 (ล้านบาท) ⓘ · % ของ Total ·
  % ใน Channel (Tooltip `สัดส่วนของหน่วยขายเทียบกับเป้าหมายของ Channel นั้น`) · เป้าหมาย (บาท) · การเติบโต ·
  เป้าหมายเทียบปีก่อน (`charts.vsLastYearBar` ~240px, จอ < 1600px 160px + แกน `vsLastYearAxis` ใต้ชื่อคอลัมน์, Tooltip
  `ความยาวแท่ง = เป้าหมาย · ขีดตั้ง = ยอดขายปีก่อน · ทุกแถวใช้สเกลเดียวกัน`) · (โหมดแก้ไข) จัดการ — สเกลจริงเดียวกันทั้งตาราง (แท่ง MT ยาวกว่า TT
  และทุกหน่วยขาย)
  - แถว Channel: กรอก % ของ Total · % ใน Channel = 100% อ่านอย่างเดียวสีจาง / แถวหน่วยขาย: กรอก % ใน Channel · % ของ Total สีจาง
    (= % ใน Channel × % ของ Total ของ Channel, `calc.pctOfTotal`) / เป้าหมาย (บาท) กรอกได้ทั้งสองระดับ แปลงกลับเป็น % ของคอลัมน์ที่แก้ได้
  - แถวคงเหลือ: `คงเหลือใน {Channel} · สถานะ` (% อยู่ที่คอลัมน์ % ใน Channel) / `คงเหลือระดับ Total · สถานะ` (% อยู่ที่ % ของ Total)
    Channel ว่าง = `ยังไม่มี {unitLabel}` ยังไม่กำหนด
- โหมดแก้ไข: ถังขยะ + กล่องยืนยัน, `+ {unitLabel}` ต่อ Channel (กดไม่ได้เมื่อเพิ่มครบ Tooltip
  `เพิ่ม Platform ที่เปิดใช้งานครบแล้ว · เปิดใช้งาน Platform ใหม่ได้ที่ Account Master`), `+ เพิ่ม Channel`, ⋯ เติมตามสัดส่วนปีก่อน,
  `กระจายตามสัดส่วนปัจจุบัน` ในแถวคงเหลือ (`calc.normalizeShares` ต้องกดเอง ห้ามกระจายอัตโนมัติ)
- ส่งออก ▾ ไฟล์ `Top-down_{ปี}_{Draft|Submitted|Approved…}_{YYYYMMDD}`: Excel มีหัวไฟล์ 4 แถว (ปีแผน · สถานะ · วันเวลาที่ส่งออก · มุมมองผู้ใช้)
  แล้วคอลัมน์ Channel · ระดับ · ประเภทหน่วย · หน่วยขาย · ผู้รับผิดชอบปัจจุบัน · ยอดขายปี 2026 (บาท) · % ของ Total · % ใน Channel · เป้าหมาย (บาท) ·
  การเติบโต (%) · การเติบโต (บาท) / 1 แถวต่อ Channel และหน่วยขาย + Total + คงเหลือ (`calc.topDownRows`) / ตัวเลขชนิดตัวเลขจริง
  (% = ทศนิยม รูปแบบ 0.00%, เงิน #,##0) / ตรึงแถวหัวตาราง (แก้ sheetViews ใน zip) / ห้าม Merge cell / CSV ไม่มีหัวไฟล์ มี BOM
- ไม่มี Scrollbar แนวนอน ตารางเลื่อนแนวตั้งภายใน หัวตารางติดบน **บรรทัดเดียวทุกคอลัมน์** (ตรวจที่ 1366 โหมดแก้ไขด้วย) แถว ~34px

### หน้าจัดสรรเป้าหมายรายเดือน (Phasing, v5 ข้อ 3)

- แถบบริบทแถวเดียว → (แก้ไข) editBanner → การ์ด: หัวกราฟ (ป้ายที่มาของค่าตั้งต้น, Legend, ปุ่มคืนค่าตามสัดส่วนปีก่อน เฉพาะแก้ไข) +
  กราฟ ~160px (ไม่มีตัวเลขบนแท่ง ตัวเลขอยู่ใน Tooltip) + แถวผู้รับผิดชอบ (เฉพาะหลายคน) + ตาราง Grid (ใช้ `--ph-cols` ร่วมกัน)
- แถวตาราง: เดือน / ยอดขายปี {ปีก่อน} (บาท) ⓘ / สัดส่วนรายเดือน (%) / เป้าหมาย Net Sales (บาท) / การเติบโตเทียบปีก่อน / แถวคงเหลือ
- ส่งออก ▾ `Phasing_{ปี}_{หน่วยขาย}_{สถานะ}_{YYYYMMDD}`: 1 แถวต่อเดือน + รวมทั้งปี + คงเหลือ
  เดือนที่ต่างจากค่าตั้งต้นมีจุดมุมช่อง + Tooltip ค่าตั้งต้น / ค่าตั้งต้น = ยอดปีก่อนของหน่วย → Channel → เท่ากัน
- แก้เดือนหนึ่งไม่ปรับเดือนอื่น / Workflow ต่อหน่วย / ช่องกรอกตัวอักษรเล็กกว่าตารางให้ 7 หลักไม่ถูกตัด (breakpoint 1800/1600/1440)

### หน้าวางแผนยอดขายราย SKU (Bottom-up, v5 ข้อ 4 + CR-11)

- แถว 1 = แถบบริบท / แถว 2 (CR-11) = ค้นหา SKU / ชื่อ (รหัส ชื่อย่อ ชื่อเต็ม ไม่สร้างตารางใหม่) · จัดกลุ่ม Series | Status | ไม่จัดกลุ่ม
  (ค่าเริ่มต้น Series เมื่อหน่วยมี SKU > `GROUP_BY_SERIES_ABOVE` 20 ไม่งั้น Status) + พับทั้งหมด / กางทั้งหมด · Series ▾ · เรียง ▾
  (ยอดทั้งปีมากไปน้อย · TR Code · ชื่อ · การเติบโต — เรียงจากค่าที่บันทึกแล้ว ลำดับไม่กระโดดระหว่างแก้ไข) · มุมมอง ชิ้น | Sell-out Amount | Net Sales · ⓘ ·
  ☐ แสดงยอดปีก่อน (`ui.skuShowLastYear`) · โหมด (ปรับแผน disabled Tooltip `ใช้งานได้หลังจากล็อก Baseline`) · (ปรับแผน) เดือนปัจจุบันจำลอง ·
  ? (Legend เต็ม + กฎ + คีย์ลัด) — ไม่มี Legend ในแถว (CR-11 แทน v5) / ตัวอักษร 14px แถวเดียวที่ 1920 (เมนูพับ) จอเล็กขึ้นบรรทัดที่ 2
  / (แก้ไข) แถบแก้ไขต่อท้ายแถวเดียวกัน: editBanner · `ค่าตั้งต้น: {วิธี} ▾` (เปลี่ยนวิธีต้องยืนยัน `ค่าในช่องที่ระบบเติมจะถูกคำนวณใหม่ ช่องที่แก้ไขเองจะไม่เปลี่ยน`) ·
  (มีแถวที่เลือก) `เลือก n รายการ · ปรับ ±% · ตั้งเท่ายอดปีก่อน · คืนค่าตั้งต้น · ล้างค่า · ยกเลิกการเลือก`
- คอลัมน์ชื่อ (~300px ติดซ้าย แถวสูง 48px คงที่): (แก้ไข) Checkbox · บรรทัด 1 = `calc.displayName` (shortName หรือชื่อตัด Charmiss, ตัวใหญ่ทั้งหมด → Title Case)
  + Chip Status เดียว (`calc.primaryStatus`: Clearance > New > Discontinued ระหว่างปี, ช่วงเดือนใน title) / บรรทัด 2 = รหัส · Series (· เริ่มขาย ของสินค้าใหม่)
  · (แก้ไข) ⋯ = คืนค่าตั้งต้น · ตั้งเท่ายอดปีก่อน · ปรับเพิ่ม/ลด % · ล้างค่า · นำออกจากแผน (ปรับแผน = หยุดวางแผน) + กล่องยืนยัน /
  Tooltip ชื่อ = ชื่อเต็ม · รหัส · หมวด · Series · RSP (+ ราคาเฉพาะ Account / ราคา Dealer) · Status ปีแผน
- หัวกลุ่ม (พับได้) = ชื่อกลุ่ม · จำนวน (ค้นหา = n จาก m) + ผลรวมของกลุ่มตามมุมมอง (แทนแถว "รวม Series ที่เลือก" เดิม) + (แก้ไข) Checkbox เลือกทั้งกลุ่ม
  / กลุ่ม Status: สินค้าที่วางขายแล้ว · Clearance · เลิกขายระหว่างปี · สินค้าใหม่ (New) ปี {ปี} (+ แถวข้อความ NPD) / แถวข้อความท้ายตาราง:
  SKU ที่มียอดปีก่อนแต่ไม่อยู่ในแผน (เลิกขายก่อนปีแผน · ขาดข้อมูลจำเป็น + ยอดขายปีก่อน = ที่มาของส่วนต่าง `calc.priorOutsidePlan`)
- แสดงยอดปีก่อน: บรรทัดเล็กสีจางใต้ตัวเลขทุกช่อง (มุมมองเงิน = ราคาปีก่อน) + คอลัมน์ขวาสุด `ปีก่อน` · `การเติบโต` (แถว SKU / กลุ่ม / รวมแผน —
  ยอดปีก่อนของ SKU ในแผน) / พอดี 1920px เดือนละ ~93px เมนูข้างพับ (หน้าวางแผน SKU พับเองเมื่อจอ < 2200px)
- เครื่องมือช่วยกรอก (โหมดแก้ไข มุมมองจำนวนชิ้น): ช่อง `ทั้งปี` กรอกได้ (`calc.annualWrites`) · ⋯ ของแถว · เลือกหลายแถว · ปิดส่วนต่าง (ปุ่มในป้ายแถวคงเหลือ
  = ทั้งปี / กดช่องคงเหลือรายเดือน = เดือนนั้น → กล่อง: เดือน · SKU ที่จะปรับ (แถวที่เลือก หรือทุกแถวที่แก้ได้และมีค่า) · ก่อน/หลัง · ต้องกดยืนยัน
  `calc.closeGapWrites`) · คีย์บอร์ดและ Excel (`components.gridKeys`) · Ctrl+Z ภายในรอบแก้ไข (`undoStack` ยกเลิก/บันทึก = ล้าง) ·
  ▲/▼ มุมล่างซ้ายเมื่อต่างจากเดือนเดียวกันปีก่อนเกิน `ANOMALY_PCT` 50% (ไม่บล็อกการบันทึก Tooltip บอกค่าปีก่อน) / ทุกเครื่องมือ: ช่องระบบเติม → Override
  นับเป็นรายการที่ยังไม่บันทึก ข้ามช่องล็อก 0 / Actual / M+1..M+3 เสมอ / ติดลบไม่รับ ทศนิยมปัด (`calc.cleanQty`)
- ค่าตั้งต้นของช่องระบบเติม (`calc.defaultPlanQty` เลือกวิธีต่อหน่วยขาย `plan.method`): `ยอดปีก่อน × การเติบโต` (ค่าเริ่มต้น) = ยอดเดือนเดียวกันปีก่อนของ SKU
  × g (เป้าหมายทั้งปีของหน่วย ÷ ยอดขายปีก่อนของหน่วย) / `Run-rate × Seasonality` / SKU ที่ไม่มียอดปีก่อนในหน่วยนั้น = กรอกเอง / Tooltip ช่องบอกวิธี
  และตัวเลข (`14,925 × 1.1182`) + ยอดปีก่อนของช่อง / `skuPlanGrid` ต้องได้ `opts.target` (เป้าหมายทั้งปีของหน่วย) ทุกที่ที่เรียก
- `calc.cellState(mode, m, currentMonth, fillSource)`: ล็อก 0 แก้ไม่ได้ / ครั้งแรก = แก้ได้ทุกเดือน / ปรับแผน: ≤ M Actual,
  M+1..M+3 ล็อก, M+4+ แก้ได้ / แก้ได้เฉพาะมุมมองจำนวนชิ้น / แก้ช่องระบบเติมหรือ Clearance = Override (↺ คืนค่า ตอนแก้ไข)
- ตาราง: (หลายคน) แถวผู้รับผิดชอบ + หัวเดือน + แถวเป้าหมาย `เป้าหมาย Net Sales (จาก Phasing)` ติดบน / (แก้ไข) `+ เพิ่ม SKU`
  ที่หัวคอลัมน์ SKU / (เลือก Series) แถวข้อความ SKU ของ Series ที่ยังไม่อยู่ในแผน + `เพิ่มทั้ง Series` / กลุ่ม SKU ที่ขายอยู่ · NPD
  (NPD ว่าง = `ยังไม่มี NPD ในแผน` · จำนวน NPD ที่ Listing แล้วแต่ยังไม่อยู่ในแผน · (แก้ไข) `+ เพิ่ม NPD`) / ถังขยะ = นำออกจากแผน
  (ปรับแผน = หยุดวางแผน) + กล่องยืนยัน / ป้าย P มุมบนซ้ายภายในช่อง
- ท้ายตาราง (`--i` = ลำดับจากล่าง): (ปรับแผน) Plan Baseline · รวมแผน (ชิ้น) · รวมแผน Net Sales (บาท) (เลือก Series = รวมทั้ง Account / รวมทั้งเขต) ·
  แถวคงเหลือ (รายเดือน: ค่าบวก = ขาด ค่าลบ = เกิน ✓ = จัดสรรครบ + บรรทัดเล็ก % ของเป้าหมาย สีช่องตามสถานะของเดือน ป้ายแถว = สถานะทั้งปี)
  — **คงเหลือเทียบเป้าทั้งหน่วยเสมอ** (ไม่เทียบกับผลค้นหาหรือ Series)
- CR-11 กล่องตารางสูงตามแถว (`flex: 0 1 auto` ไม่มีแถวว่าง): แถวน้อย = แถวรวมต่อจากแถวสุดท้ายทันที / แถวล้นกล่อง = แถวรวมและคงเหลือติดล่าง (sticky) /
  Hover ช่อง = ไฮไลต์แถวและหัวคอลัมน์เดือน / ป้าย P มุมบนซ้ายภายในช่อง / override-dot มุมบนขวา / ▲▼ มุมล่างซ้าย
- "เพิ่มทั้ง Series" = ทุก SKU ของ Series ที่ Listing ในหน่วยนี้ ยังไม่อยู่ในแผน และข้อมูลจำเป็นครบ (สินค้าใหม่เริ่มขาย = เดือนของ Launch Date
  หรือเดือนในแผน NPD ที่อนุมัติแล้ว)
- v6: ใช้เฉพาะ `itemType = SALE` / Filter Series รองรับ Sub Series / `+ เพิ่ม SKU` แสดงสินค้าที่ขาดข้อมูลจำเป็นแต่เลือกไม่ได้ พร้อมเหตุผล / ราคาและ GP ต่อช่อง = `c.price` / `c.gp` (Promotion ที่ยืนยันแล้ว ถ่วงตามจำนวนวัน, GP ช่วง Promotion)
  / หลังล็อก Baseline แผนครั้งแรกและ Plan Baseline ใช้ snapshot · โหมดปรับแผนใช้ราคาปัจจุบัน + ป้าย `ราคาเปลี่ยนจาก Baseline n เดือน`
  (`calc.priceChangedMonths` นับเดือน M+1 ถึง ธ.ค.) / ส่งออก ▾ `SKU-Plan_{ปี}_{หน่วยขาย}_{สถานะ}_{YYYYMMDD}` ตามมุมมองที่แสดง
- จอกว้างน้อยกว่า 2200px Side Menu พับเอง (CR-11 เดิม 1920px) / 12 เดือน + รวม ไม่เลื่อนแนวนอน (ยอดปีก่อนที่จอ < 1600px เลื่อนแนวนอนภายในกล่องได้)
  / ≥ 1024px หน้าไม่ยืด ตารางเลื่อนเอง / จอเตี้ยกว่า 700px แถว SKU 40px

### ขั้นที่ 4: ติดตามสถานะ | รายงานสรุปแผน (v5 ข้อ 5 + CR-12, `modules/summary`)

- เมนูยังเป็นหน้าเดียว (4 ขั้น) มีแท็บใต้หัวข้อ (`C.segmented`) จำที่ `ui.summaryTab` / ค่าเริ่มต้น: ยังไม่ล็อก = ติดตามสถานะ · ล็อกแล้ว = รายงาน /
  แท็บติดตามสถานะมีตัวเลขจำนวนรายการ / Side Menu ขั้นที่ 4 แสดงจำนวนรายการที่ต้องดำเนินการ (`.side-count` จาก `report.actionCount()`
  คำนวณหลังหน้าแสดงแล้ว ไม่มีรายการ + ล็อกแล้ว = ไอคอนล็อก) — ข้อมูลตั้งต้น = `9`
- **ติดตามสถานะ** (พิมพ์ไม่ได้: ตอนพิมพ์เหลือข้อความ `statusNoPrint`): การ์ดสถานะทั้งปี (จัดสรรเป้าหมายประจำปียังไม่ได้รับอนุมัติ ({สถานะ}) /
  อนุมัติแล้ว · ยังไม่ล็อก Baseline · แผน SKU อนุมัติแล้ว x/y / ล็อกแล้ว · รายงานที่เคยล็อก) + ปุ่ม `ล็อก Baseline {ปี}` (Director + `W.canLock`
  กล่องยืนยันบอกเลขฉบับที่จะได้) / ล็อกแล้ว = `ปลดล็อก Baseline` (Director ต้องมีเหตุผล) /
  ตาราง 1 แถวต่อหน่วยขายที่มีประเด็น (`calc.planActions`): Channel (แถบสี) · หน่วยขาย (ลิงก์หน้าวางแผน SKU) · ผู้รับผิดชอบ (`ยังไม่มีผู้รับผิดชอบ` สีแดง) ·
  ส่วนต่าง (ล้านบาท) · เป้าหมายรายเดือน · แผน SKU (ข้อความสั้น `ยังไม่ส่ง` / `รออนุมัติ` …) · การดำเนินการถัดไป (ลิงก์ไปหน้าที่ต้องทำ ≤ 4 คำ) /
  เรียง: ไม่มีผู้รับผิดชอบ → ส่งกลับแก้ไข / ต้องตรวจสอบใหม่ → ส่วนต่างมากไปน้อย → ยังไม่ส่ง → รออนุมัติ / ตัวกรอง Channel · ผู้รับผิดชอบ · เฉพาะที่มีส่วนต่าง /
  ไม่มีประเด็น = `ไม่มีรายการที่ต้องดำเนินการ` / ล็อกแล้วเหลือเฉพาะเรื่องผู้รับผิดชอบ (แผนครั้งแรกแก้ไม่ได้แล้ว)
- **รายงานสรุปแผน** (พิมพ์ได้เฉพาะแท็บนี้ ปุ่ม `พิมพ์ / บันทึก PDF` อยู่ในแท็บนี้): หัวรายงาน `รายงานสรุปแผน {ปี}` + `ฉบับที่ {ปี}-BL-{nn}` /
  `{ปี}-DRAFT` · `สถานะ: อนุมัติแล้ว · ล็อก Baseline {เวลา} โดย …` หรือ `สถานะ: ฉบับร่าง · ยังไม่ได้รับอนุมัติ` · `จัดสรรเป้าหมายประจำปี: …` ·
  `พิมพ์เมื่อ` (print-only อัปเดตตอน beforeprint) · หมายเหตุ `ตัวเลขในรายงานนี้มาจาก Baseline ที่ล็อกไว้` / ฉบับร่าง = ลายน้ำเฉียง
  `ฉบับร่าง · ยังไม่ได้รับอนุมัติ` (`--watermark-fg` บนจอซ้ำตามความยาว ตอนพิมพ์ `position: fixed` ทุกหน้า) /
  ล็อกแล้ว = ตัวเลข ชื่อ ผู้รับผิดชอบ และการอนุมัติทั้งหมดจาก `snapshot.report` (`report.current`) ไม่อ่านข้อมูลที่ยังแก้ได้
- เนื้อหา: Filter Channel · KPI 4 ใบ (บาทเต็ม) · `charts.barLine` : `charts.waterfall` + `stackedShare` = **60 : 40 สูงเท่ากัน** (จอ < 1280px เรียงลง) ·
  ตาราง Total → Channel (พับได้) → หน่วยขาย: `Channel / หน่วยขาย · ยอดขายปี {ปีก่อน} ⓘ · เป้าหมาย · % ของ Total · เป้าหมายเทียบปีก่อน
  (vsLastYearBar) · แผน Bottom-up · ส่วนต่าง · สถานะอนุมัติ · ผู้รับผิดชอบ` (ไม่มีคอลัมน์ Top-down — ย้ายไปหัวรายงาน) / สถานะอนุมัติ = 2 ไอคอน
  Phasing · แผน SKU (`○` ฉบับร่าง · `◐` รออนุมัติ · `●` อนุมัติแล้ว · `↩` ส่งกลับแก้ไข · `!` ต้องตรวจสอบใหม่ จาก `pages.summary.approvalIcons`
  เฉพาะรายงาน) + Tooltip + คำอธิบายบรรทัดเดียวใต้ตาราง / แถว Channel และ Total = `อนุมัติแล้ว x/y` (Phasing และ SKU อนุมัติครบ) / ผู้รับผิดชอบบรรทัดเดียว ·
  สัดส่วนแผนตาม Status และ Series / Category (`calc.mergeMix` Top 8) · เป้าหมายรายผู้รับผิดชอบ · **การอนุมัติ** (ขั้นตอน · หน่วยขาย · ผู้ส่ง · วันที่ส่ง ·
  ผู้อนุมัติ · วันที่อนุมัติ จาก `W.approvalRows` ยังไม่อนุมัติ = แสดงสถานะ) · ช่องลงนาม Sales Director / Management (ชื่อ · ลายมือชื่อ · วันที่) เมื่อล็อกแล้ว
- ตัวเลขกราฟ ตาราง กลุ่มสินค้า รายผู้รับผิดชอบเป็นล้านบาท 2 ตำแหน่ง / พิมพ์ A4 แนวนอน 4 หน้า (ข้อมูลตั้งต้น): 1 หัวรายงาน · KPI · กราฟ /
  2 ตาราง / 3 กลุ่มสินค้า · รายผู้รับผิดชอบ / 4 การอนุมัติ · ช่องลงนาม (`.rp-break`) / ซ่อนหัวข้อของ layout ปุ่ม และ ⓘ (`.info-dot` ทุกหน้า) /
  `thead { display: table-header-group }` · `tr { break-inside: avoid }` (print.css) / ตาราง `table-layout: fixed` หัวคอลัมน์ตัดบรรทัดในช่อง ไม่ซ้อน
- หน้านี้เลื่อนแนวตั้งได้ (หน้าเดียวที่ไม่ต้องพอดีจอ)

### หน้าเกี่ยวกับ Prototype (`modules/about-prototype`, id `aboutPrototype`, กลุ่ม project-info)

- แท็บ ขอบเขต (+ สิ่งที่ตัดออก) | Decision log | คำถามที่ค้าง (`#open-questions` เปิดแท็บนี้) | ขั้นต่อไป + กล่องสิ่งที่ขออนุมัติ
- ข้อความจาก `pages.aboutPrototype` / เนื้อหาแท็บเลื่อนภายในการ์ด / พิมพ์ = แสดงทุกแท็บต่อกัน / ลิงก์เล็กที่ Header

### หน้า Master (v5 ข้อ 6)

- โครงหัวหน้า ภาษา สี ตัวเลขเหมือน Sales Planning ไม่มีเลขขั้น / workflowBar แบบง่าย / ปุ่ม `+ เพิ่ม …` + ถังขยะในคอลัมน์จัดการ (โหมดแก้ไข)
- Product Master (v6) 5 หน้า ทุกหน้า fit (ตารางเลื่อนภายในการ์ด) ข้อความจาก `pages.productList / npdPlan / promotionPrice / productMaster / taxonomy`
  - รายการสินค้า (`modules/products`, id `productList`, ทีม Product): KPI 5 ใบกดกรองได้ (ทั้งหมด · Active · New · ขาดข้อมูลจำเป็น · ขาดข้อมูลที่ควรมี) /
    แถบตัวกรองแถวเดียว (ค้นหารหัส/ชื่อ · รายการ | จัดกลุ่มตาม Series · Status · หมวดสินค้า · Series · Channel · Item Type · ความครบถ้วน) /
    เลือกคอลัมน์ (`ui.productColumns`) / ส่งออก CSV (BOM) / เปรียบเทียบกับ ERP (Drawer, ใช้ค่าจาก ERP ในโหมดแก้ไข) / รูปและรหัสติดซ้าย /
    Drawer 4 แท็บ: ข้อมูลทั่วไป (รหัส ชื่อ หมวดสินค้า Series ขนาด รูป) · ราคา (ประวัติ + ราคาใหม่ตามวันที่มีผล + Promotion ที่เกี่ยวข้อง) ·
    Listing และวงจรสินค้า (Status 12 เดือน, Clearance, แผน NPD) · ประวัติการแก้ไข (master.audit) / + เพิ่ม SKU (TR Code หรือรหัสชั่วคราว) /
    `ผูกรหัสจริง` (โหมดดู): ย้าย Listing ราคา Promotion แผน NPD และแผน SKU / Forecast ทุกปีที่บันทึกไว้ (`calc.bindTrCode` + `renamePlanKey`)
    เก็บรหัสชั่วคราวใน `tempCodeHistory` ห้ามซ้ำ / ลบได้เฉพาะ SKU ที่ไม่มี Listing ราคา Promotion หรือแผน NPD
  - แผน NPD (`modules/npd-plan`, id `npdPlan`): KPI (NPD ในปี · ตาม Series · ยังไม่อนุมัติ · หน่วยขายที่วางแผนแล้วแต่ยังไม่อยู่ในแผน SKU) /
    Timeline (Series พับได้ → SKU × 12 เดือน ‹ ปี › หมุดวันเปิดตัว + แถบช่วง New สีตามขั้น `--npd-*`) | ตาราง / Drawer: ขั้น วันเปิดตัว หน่วยขาย +
    เดือนเริ่มขาย (อยู่ในแผน SKU แล้วหรือไม่ + ลิงก์ไปหน้าวางแผน SKU) + workflowBar ของแผน / แก้ไข (ทีม Product): สร้างแผนจาก SKU เดิม
    หรือสร้าง SKU ใหม่ด้วยรหัสชั่วคราว
  - Promotion Price (`modules/promotions`, id `promotionPrice`, Trade Marketing): Channel · หน่วยขาย (หลายค่า) · Series · ค้นหา ·
    ปฏิทินรายเดือน | รายการ / ปฏิทิน: SKU × 12 เดือน ราคาที่มีผลเฉลี่ย (`calc.pricingDetail`) + `−x%` / RSP สีจาง / P = บางวัน / เส้นประ = ฉบับร่าง /
    `หลายราคา` + Tooltip รายหน่วย / แก้ไข: คลิกช่อง → ฟอร์มทั้งเดือน (SKU หลายรายการ ติ๊กทั้ง Series, หน่วยขายหลายค่า, ราคาหรือส่วนลด %, GP ช่วง
    Promotion, ตัวอย่างราคา, คัดลอกไปเดือนถัดไป / หน่วยขายอื่น = ฉบับร่าง) / `calc.validatePromotion` (ห้ามซ้อน บอกชื่อที่ชน, ราคา > 0, เตือนเกิน RSP)
  - Listing และวันเริ่มขาย (`modules/product-master`): Channel (Segmented) · ค้นหา · Series · Status · Item Type / SKU ติดซ้าย (รูปย่อ ชื่อ Series /
    Sub Series) / วันเริ่มขายอ่านอย่างเดียว / หัวกลุ่ม `Listing ต่อ {unitLabel} · {Channel}` / แก้ไข: ทีม Product ติ๊ก Listing (เลือกทั้งแถว / ทั้งคอลัมน์
    เฉพาะแถวที่แสดง) · Supply Chain แก้ Clearance ผ่านฟอร์ม (ข้อความย่อไม่ตัดตัวเลข)
  - หมวดสินค้าและ Series (`modules/taxonomy`): แท็บ หมวดสินค้า (Category → Sub Category → Type) | Series (Series → Sub Series) / เพิ่ม เลื่อนลำดับ
    ปิดใช้งาน / ลบได้เฉพาะรายการที่ไม่มี SKU ใช้และไม่มีรายการย่อย
- Account (`modules/accounts`, fit): ชื่อ (+ หมายเหตุ) · Channel · {gpLabel} (%) · มีผลตั้งแต่ · การใช้งาน · ผู้รับผิดชอบปัจจุบัน · แผนปี /
  เพิ่ม (`+ {unitLabel}` ตาม Filter) ปิดใช้งาน ลบ
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
  - ระบบเติม (CR-11) ค่าเริ่มต้น = ยอดเดือน m ปีก่อนของ SKU × g (g = เป้าหมายทั้งปีของหน่วย ÷ ยอดขายปีก่อนของหน่วย ปัดเป็นจำนวนเต็ม)
    เป้าหมาย 22,140,000 · ปีก่อน 19,800,000 · 14,925 → 16,689 / เลือกได้ต่อหน่วย: Run-rate × Seasonality Index (Run-rate = เฉลี่ย 3 เดือนจริงล่าสุด)
    / Seasonality Index = ยอดเดือน ÷ ค่าเฉลี่ย 12 เดือน / SKU ที่เลิกขายก่อนปีแผนได้ 0 (ไม่อยู่ในแผน) ส่วนต่างปิดด้วย NPD หรือการปรับเพิ่ม
  - ปิดส่วนต่าง = ส่วนต่างของเดือน × สัดส่วน Net Sales ของแถว ÷ Net Sales ต่อชิ้น (ปัด Largest remainder คงเหลือไม่เกิน 1 ชิ้น × ราคาต่อชิ้น)
    / กรอกยอดทั้งปี = กระจายตามรูปแบบเดิมของแถว → ยอดปีก่อน → Seasonality (ผลรวมตรงที่กรอก เดือนที่ล็อกไม่ถูกแตะ)
- Status สินค้า (`calc.productStatus(product, 'YYYY-MM')` / `statusAt(product, year, m)`, คำนวณจากวันที่เท่านั้น ห้ามให้เลือกเอง):
  Clearance (ในช่วง Clearance มาก่อนเสมอ) / Discontinued (หลังเดือนเลิกขาย) / Planned (ก่อนวันเริ่มขาย หรือยังไม่มีวันเริ่มขาย) /
  New (NPD_MONTHS = 3 เดือนแรก) / Active / Status ของปีแผน = ณ ม.ค. (`planYearStatus`)
- ราคาที่มีผลของเดือน (`calc.effectivePrice`) = ราคาตามวันที่มีผล (เฉพาะ Account → Channel → ทั่วไป ตาม priceBasis: RSP หรือ Dealer ของ TT) + Promotion ที่ยืนยันแล้ว ถ่วงตามจำนวนวัน (RSP 100, Promotion 70 วันที่ 1–10 มิ.ย.
  → 90) / ส่วนลด % = RSP × (1 − ส่วนลด) / GP ที่มีผล = GP ช่วง Promotion (ถ้ากำหนด) ถ่วงตามยอดเงิน / Promotion ฉบับร่างไม่มีผล
- แก้ราคาหรือ Promotion หลังล็อก Baseline ไม่เปลี่ยน Target Baseline / Plan Baseline (snapshot) แต่มีผลกับ Forecast
- แผน NPD อนุมัติแล้ว → ตั้งวันเริ่มขายและ Listing ให้ และเดือนเริ่มขายต่อหน่วยเป็นค่าตั้งต้นในแผน SKU / ขั้น "เปิดตัวแล้ว" ระบบตั้งเมื่อถึงเดือนเปิดตัว
- วิธีเติมยอด (`calc.cellSource`) + เหตุผลล็อก (`calc.lockReason`: ไม่ได้ Listing / ยังไม่วางขาย / เลิกขาย / ก่อนเดือนเริ่มขายในหน่วย)
- SKU ใหม่กรอกเองทั้งปีในแผนรายปี (ไม่มียอดปีก่อน / Run-rate แม้พ้น NPD)
- Baseline ล็อกทั้งปีหลังแผน SKU ทุกหน่วยอนุมัติ (เก็บ Snapshot GP และ Price List ใน workflow.baseline — ยังไม่ใช้คำนวณใหม่)
  → Re-forecast ล็อก M+1..M+3 ปรับได้ตั้งแต่ M+4
- สีมีความหมายชุดเดียว: Source (ล็อก เทา, กรอกเอง ฟ้า, ระบบเติม เขียว, Clearance ส้ม) / คงเหลือ (จัดสรรครบ เขียว, ขาด แดง, เกิน เหลือง,
  ยังไม่กำหนด เทา) / Workflow (ฉบับร่าง เทา, รออนุมัติ ฟ้า, อนุมัติ เขียว, ส่งกลับแก้ไข แดง, ต้องตรวจสอบใหม่ เหลือง) / Status สินค้า
  (`--c-st-planned|new|active|clearance|discontinued-*`) / ขั้น NPD (`--npd-*`) / Promotion (`--promo-*`) / Waterfall (`--wfc-*`)
  ป้ายต้องมีข้อความกำกับเสมอ

### ตัดออกโดยตั้งใจ (ห้ามใส่)

Ramp-up NPD, Cannibalization, เกณฑ์ % คงเหลือที่ Config ได้, แยก Core/Steady, การกระจายยอดคงเหลืออัตโนมัติ

### สิ่งที่ห้ามทำ (v5 ข้อ 9)

ห้ามแสดงตัวเลขเดียวกันซ้ำในหน้าเดียวโดยไม่มีเหตุผล / ห้าม Chip คงเหลือในตาราง / ห้ามตัวย่อ "ล." และห้ามตัดตัวเลขด้วย "…" /
ห้ามใช้สีเป็นสื่อเดียวของสถานะ / ห้ามเขียนข้อความใน Module ตรงๆ / ห้ามกระจายยอดคงเหลืออัตโนมัติ
v6: ห้ามให้เลือก Status เอง / ห้ามพิมพ์ชื่อ Category / Series เองในฟอร์มสินค้า / ห้ามเก็บรูปขนาดเต็มหรือโหลดรูปจาก URL ภายนอก /
ห้ามลบข้อมูลที่ถูกอ้างอิง (ใช้ปิดใช้งาน) / ห้าม Promotion ซ้อนกันใน SKU × หน่วยขายเดียวกัน / ห้ามให้การแก้ราคาหรือ Promotion เปลี่ยน Target Baseline /
ห้ามคำนวณ Status ราคา ความครบถ้วนใน Module
v7: ห้ามคอลัมน์สัดส่วนคอลัมน์เดียวที่ฐานต่างกัน / ห้าม Hardcode คำว่า Account / เขต / Platform / GP / ห้ามโหลด SheetJS ตอนเปิดหน้า /
ห้าม Merge cell ในไฟล์ส่งออก / ห้าม Donut ในหน้า Top-down
CR-11: ห้ามเก็บสินค้าตัวอย่างเดิมปนกับสินค้าจริง / ห้ามแก้ `data/seed/` ด้วยมือ / ห้ามสุ่มตัวเลขในข้อมูลตั้งต้น / ห้ามปิดส่วนต่างหรือเปลี่ยนวิธีค่าตั้งต้น
โดยไม่มีกล่องยืนยัน / ห้ามให้เครื่องมือช่วยกรอกแก้ช่องที่ล็อก / ห้ามแสดง Status หลาย Chip จนแถวสูงไม่เท่ากัน

### สมมติฐานที่ Claude ตั้งเอง (ผู้ใช้ยังไม่ได้ยืนยัน)

- หน้า Phasing และ SKU เปิดที่ Shopee (`DEFAULT_UNIT`) / บทบาทตั้งต้น Sales Director (`DEFAULT_ROLE`)
- โหมดปรับแผนนับเดือนปัจจุบัน (M) เป็น Actual
- ปีแผน 2027 ตัวเลือก 2026–2028 / ปีที่ไม่มีข้อมูลตั้งต้นใช้ defaultChannels/defaultUnits ที่ 0%
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
- v6: ข้อมูลตัวอย่างสินค้า 48 รายการสร้างใหม่ (TR Code 5 หลัก + รหัสชั่วคราว 3 รายการ + Tester/Gift/Premium 4 รายการ) พร้อมรูปภาพ SVG ย่อ ราคา Promotion 7 รายการ
  แผน NPD 6 แผน (1 อนุมัติแล้ว, 1 รออนุมัติ) และข้อมูล ERP ตัวอย่าง — ยังไม่ใช่ข้อมูลจริง
- v6: "เดือนปัจจุบันจำลอง" (`ui.currentMonth`) เป็นวันอ้างอิงของ Status ณ วันนี้ ราคา ณ วันนี้ และขั้น "เปิดตัวแล้ว" ของ NPD
- v6: สินค้าที่ขาดข้อมูลจำเป็นไม่อยู่ในแผน SKU ตั้งต้น และเพิ่มในแผนไม่ได้ (แสดงในรายการพร้อมเหตุผล)
- v6: Promotion ที่คัดลอก (เดือนถัดไป / หน่วยขายอื่น) เริ่มเป็นฉบับร่างเสมอ / RSP ที่ใช้ตรวจเกิน RSP = RSP ณ วันที่เริ่มของ Channel ของหน่วยแรกที่เลือก
- v6: เลื่อนวันเปิดตัวหลังอนุมัติ = แผนกลับเป็นฉบับร่าง วันเริ่มขายใน Product Master คงค่าที่อนุมัติไว้จนกว่าจะอนุมัติใหม่
- v6: ผูกรหัสจริงทำในโหมดดู (ไม่ต้องกดแก้ไข) มีกล่องยืนยัน / Audit log เก็บเฉพาะใน sessionStorage
- v7: ค่าตั้งต้นตามสัดส่วนปีก่อนทำให้ Top-down จัดสรรครบทุกชั้น ตัวอย่าง "ขาด / เกิน" จึงอยู่ที่แผน SKU (MT ขาด · TT เกิน ในระดับหน่วยขาย)
- v7: TT ใช้ unitLabel "เขตการขาย" ตามข้อ 1 ปุ่มจึงเป็น `+ เขตการขาย` / Waterfall แกนเริ่มที่ค่าต่ำกว่ายอดต่ำสุด (บอกค่าเริ่มแกนใต้กราฟ)
- v7: แถบบริบทขึ้นบรรทัดใหม่ได้ที่จอ < 1600px (ป้าย ค่าธรรมเนียม Platform ยาวกว่า GP) / หน้า Account ใช้ fit เพราะมี Platform ใหม่เพิ่ม
- v7: ไฟล์ส่งออก Phasing / SKU ใช้หัวไฟล์ชุดเดียวกัน + หน่วยขาย (และมุมมอง) / แถวคงเหลือในไฟล์ใส่สถานะไว้ที่คอลัมน์หน่วยขาย
- CR-10: Tooltip แท่งเทียบปีก่อนใช้คำ `ยอดขายปี {ปีก่อน}` ตามตารางคำศัพท์ (CR เขียน "ยอดปีก่อน") / หัวข้อรายงานเอาปีออก (`รายงานสรุปแผน` + ตัวเลือกปี)
  เพราะปีอยู่ที่ตัวเลือกปีแล้ว (หัวกระดาษตอนพิมพ์ยังมีปี) / ตัวเลือกปีใช้ Popover ของ components / ลิงก์ในข้อความที่อ้างชื่อหน้าเปลี่ยนเป็นชื่อใหม่
  (`ไปที่หน้าจัดสรรเป้าหมายประจำปี`, `เปิดหน้าวางแผนยอดขายราย SKU ของ …`) / `miniBar` ลบเพราะไม่มีหน้าใดใช้แล้ว (vsLastYearBar แทน)
  / ฉบับแก้ไข 3.4: สเกลรวมเฉพาะแถว Channel และหน่วยขาย (ไม่รวมแถวคงเหลือ / แถว Total ของรายงาน ซึ่งไม่มีแท่ง) ในรายงานสเกลตาม Filter Channel ที่เลือก
  / แกนแบ่ง 3 ช่วงตามข้อกำหนด ค่าสูงสุดที่ไม่หาร 3 ลงตัว (เช่น 80 ล้าน) ป้ายแกนเป็นทศนิยม 1 ตำแหน่ง (26.7 · 53.3) / แท่งสีเดียวตาม Channel
  (ฉบับแก้ไขไม่มีส่วนสีเข้มเลยขีด) / คอลัมน์ในรายงานอยู่ถัดจากเป้าหมาย
- CR-11 ข้อมูล: หน่วยขายอื่นใช้รูปแบบ SKU ของ EVEANDBOY **เฉพาะ SKU ที่ Listing ในหน่วยนั้น** (ไม่รวมสินค้าที่เลิกขาย) และปรับ **ทุกเดือน** ให้ Net Sales
  เท่ายอดขายปีก่อนรายเดือนของหน่วย (เป้าหมายรายเดือนจาก Phasing กับค่าตั้งต้นจึงสอดคล้องกัน) / 7-Eleven และ EVEANDBOY: รูปแบบรายเดือนของยอดขายปีก่อน
  (ฐานของ Phasing) เปลี่ยนเป็นของจริงจาก SKU ยอดทั้งปีเท่าเดิม / Net Sales ราย SKU ของ EVEANDBOY ใน seed รวม 9,899,754 (ต่าง −246 จากการปัดจำนวนชิ้นใน Excel)
  Test cr11-8 จึงวัดยอดขายปีก่อนของหน่วยหลังนำเข้า ±100 และราย SKU ไม่เกิน 0.01% / GP EVEANDBOY เปลี่ยน 42% → 45% ตาม seed
- CR-11 หมวดสินค้า: เพิ่มคำ `Setting Spray` → Face (ไม่อยู่ในรายการของ CR) และตรวจตามลำดับ (Blush ก่อน Tint) / Category = Face · Cheek · Lip · Eye · Skincare
  พร้อม Sub Category / Type ที่ตั้งเอง / ขนาดบรรจุอ่านจากชื่อ / ราคา Dealer เก็บเป็น SELL_IN ของ TT แล้วให้ Channel TT `priceBasis: 'SELL_IN'`
- CR-11 ตัวอย่าง: สินค้าใหม่ 3 รายการ — _01 และ _03 แผน NPD อนุมัติแล้ว (อยู่ในแผนตั้งต้น 7-Eleven + EVEANDBOY เริ่ม มิ.ย.) / _02 รออนุมัติ / Promotion และ
  ราคาเปลี่ยน ก.ค. เป็นข้อมูลตัวอย่างบนสินค้าจริง / ไม่มี Clearance และ Tester ในข้อมูลจริง (เดโม Clearance ทำได้ที่หน้า Listing) / แผนตั้งต้นของ EVEANDBOY
  แสดง 73 SKU (Listing 76 − ขาด Series 5 + สินค้าใหม่ 2) + แถวข้อความ SKU ที่เลิกขาย 41 รายการ (CR เขียนราว 115 = จำนวน SKU ที่มียอดปี 2026)
- CR-11 หน้า SKU: Legend ย้ายไปอยู่ในแผง ? อย่างเดียว (แถวที่ 2 ตาม CR ไม่มี Legend) / ปุ่มปิดส่วนต่าง = ปุ่มในป้ายแถวคงเหลือ (ทั้งปี) + กดช่องคงเหลือของเดือน /
  ปิดส่วนต่างทั้งปีปรับทีละเดือนให้คงเหลือของแต่ละเดือนเป็น 0 / ยอดปีก่อนในมุมมองเงินใช้ราคาและ GP ปีก่อน (Price List ณ ปีก่อน) / ▲▼ แสดงเฉพาะโหมดแก้ไข /
  เรียงตามการเติบโต = ทั้งปีเทียบยอดปีก่อนของ SKU / Tab ที่ช่องสุดท้ายขึ้นแถวถัดไป / ช่อง `ทั้งปี` ไม่รับการวางหรือเติมจาก Excel (กรอกทีละแถว) /
  คอลัมน์ `ปีก่อน` ของแถวรวมแผน = ยอดปีก่อนของ SKU ในแผน (ไม่ใช่ยอดขายปีก่อนของหน่วย ซึ่งอยู่ในแถบบริบท)
- CR-12 Workflow: CR ต้องการ "เปิดให้แก้ไขแล้วล็อกใหม่ → BL-02" แต่เดิมล็อกแล้วปลดไม่ได้ → เพิ่ม `ปลดล็อก Baseline` (Sales Director ต้องมีเหตุผล
  อยู่ในแท็บติดตามสถานะ) / ล็อกเสร็จพาไปแท็บรายงาน ปลดล็อกพาไปแท็บติดตามสถานะ / แท็บที่จำไว้มีผลก่อนค่าเริ่มต้นตามสถานะ
- CR-12 ติดตามสถานะ: หน่วยที่แผนเกินเป้าก็แสดง (ส่วนต่างเป็นประเด็น การดำเนินการ `ตรวจสอบแผนที่เกิน`) · รออนุมัติอยู่ท้ายสุด (`รออนุมัติจาก Director`) ·
  ล็อกแล้วเหลือเฉพาะเรื่องผู้รับผิดชอบ · ตัวเลขในเมนูนับเฉพาะหน่วยขาย (บรรทัดสถานะทั้งปีไม่นับ) · เพิ่มบรรทัด `รายงานที่เคยล็อก`
- CR-12 รายงาน: ไอคอน `○ ◐ ● ↩ !` ใช้เฉพาะคอลัมน์สถานะอนุมัติของรายงาน (ไอคอน Workflow ที่อื่นคงเดิม `◔ ✓`) / `% ของ Total` เทียบ Total Target
  ทั้งปีเสมอ (เลือก Filter Channel แล้วแถว Total แสดงสัดส่วนของ Channel ที่เลือก) / ส่วนการอนุมัติแสดงทุกฉบับ (ยังไม่อนุมัติแสดงสถานะแทนผู้อนุมัติ)
  ช่องลงนามแสดงเมื่อล็อกแล้วเท่านั้น / ฉบับร่างมีหมายเหตุ `ฉบับร่าง: ตัวเลขเป็นข้อมูลล่าสุดที่ยังแก้ไขได้` / Snapshot ของรายงานเก็บชื่อหน่วยขาย ผู้รับผิดชอบ
  ผู้รับผิดชอบรายเดือน และประวัติการอนุมัติ ณ เวลาที่ล็อก / Baseline ที่ล็อกก่อน CR-12 (ไม่มี `snapshot.report`) คำนวณจากข้อมูลปัจจุบันด้วยราคาตอนล็อก
  และนับเป็นฉบับที่ 1
- CR-12 กราฟ: "เส้นแบ่งแกน 4–6 เส้น" นับไม่รวมเส้น 0 / ข้อมูลตั้งต้นค่าสูงสุดของกราฟรายเดือน 11.99 ล้าน × 1.10 = 13.19 → แกน 0–15 ล้าน ขั้นละ 2.5 (ขั้น 2 ล้านได้ 7 เส้น เกินกฎ)
  (ส่วนที่เกิน headroom จากการปัดเป็นเลขกลม 12% ของแกน) / ป้ายแกนทศนิยมตามขั้น (2.5 → 1 ตำแหน่ง) / Waterfall ใช้เฉพาะในรายงาน (หน้าขั้นที่ 1 ไม่มีกราฟตั้งแต่ CR-10)

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
  (Test Workflow wf-1..6, ผู้รับผิดชอบ as-1..6, คำอธิบายการคำนวณ cx-1..3, Series, v5-1..5 + ข้อมูลตั้งต้น + ลบ Master, v6-1..12 + 6b,
  v7-1..7, cr10-1..6, cr11-1..9 + เครื่องมือช่วยกรอก 3, cr12-1..9) ตอนนี้ 129 Test — cr10 / cr12 ใช้ `SP.core.charts` (สร้าง DOM) จึงต้องรันในเบราว์เซอร์
  (`tests/calc.test.html`)
  / Test อ้างสินค้าจริง (12130, 33390, 33400, 12040, 25011, NPD_2027Q2_01..03) กฎที่ข้อมูลจริงไม่มี (Clearance, Sub Series) ใช้สินค้าสมมติในแต่ละ Test
- หลังแก้ ให้เปิด `index.html` ผ่าน `file://` ใน Chrome แล้วตรวจ: ไม่มี "โหลดไฟล์ไม่ได้", Side Menu 4 กลุ่ม, ค่าที่แก้ส่งต่อข้ามหน้า,
  ไม่มี Scroll แนวนอนที่ 375px (ตารางกว้างให้อยู่ใน `.table-scroll`), ไม่มีคำต้องห้ามตามตารางคำศัพท์ในข้อความทุกหน้า
- เล่น Workflow ครบวง: Director ส่ง Top-down → Management อนุมัติ → ผู้รับผิดชอบส่ง Phasing/SKU ทุกหน่วย (สลับบทบาทที่ Header
  หรือปุ่มสลับมุมมอง) → Director อนุมัติ → ล็อก Baseline ที่หน้ารายงาน / เปิดให้แก้ไข Top-down แล้วเปลี่ยนเป้าหน่วยเดียว → หน่วยนั้น
  "ต้องตรวจสอบใหม่"
- ทดสอบเพิ่ม Channel Export แล้วเห็นใน Tree, Waterfall, แท่งสัดส่วน, Filter ของ Phasing / SKU / Listing / Promotion Price
- ทดสอบลาออก + โอนเขตที่หน้าผู้รับผิดชอบ แล้วหน้า Phasing แสดงแถบผู้รับผิดชอบ 2 คน ตัวเลขเป้าไม่เปลี่ยน
- รายงาน: พิมพ์ด้วย `Page.printToPDF({ preferCSSPageSize: true })` ได้ A4 แนวนอน (842×595 pt) 4 หน้า / ดูหน้า PDF ได้ด้วยการเปิดไฟล์ PDF
  ใน headless Chrome (PDF viewer ทำงาน) แล้วจับภาพ / จำลองการพิมพ์ `Emulation.setEmulatedMedia({ media: 'print' })` ที่กว้าง 1032px (พื้นที่พิมพ์ A4)
- CR-12: ขั้นที่ 4 ค่าเริ่มต้นแท็บติดตามสถานะ (9 รายการ TT เขต 3 แถวแรก) · ตัวกรอง · พิมพ์แท็บติดตามสถานะได้แค่ข้อความ · รายงานฉบับร่างมีลายน้ำ ·
  ล็อก → 2027-BL-01 + ช่องลงนาม · แก้ราคา/ชื่อหลังล็อกแล้วตัวเลขในรายงานไม่เปลี่ยน · ปลดล็อก (ต้องมีเหตุผล) → DRAFT → ล็อกใหม่ → 2027-BL-02
- ใน headless ต้องตอบ dialog ผ่าน `Page.javascriptDialogOpening` → `Page.handleJavaScriptDialog` (confirm และ beforeunload)
  ปุ่มในกล่องยืนยัน (`<dialog>`) กด `.dlg-confirm` / beforeunload แสดงเฉพาะเมื่อมี user activation จริง (ใช้ Input.dispatchMouseEvent)
- Browser pane ของ Claude desktop แสดง `file://` เป็นภาพนิ่ง ให้ทดสอบด้วย Chrome headless ผ่าน DevTools Protocol
  (Node มีในเครื่อง ไม่ต้องติดตั้ง package) เปิด `Emulation.setFocusEmulationEnabled` ไม่อย่างนั้นช่องที่ commit ตอน blur ดูเหมือนไม่ทำงาน
- แก้ไข/ส่งได้เฉพาะบทบาทที่ถูกต้อง (ผู้รับผิดชอบหน่วย) — ใน Script ทดสอบตั้ง `ui.role` ก่อนกด แก้ไข หรือกด `.wf-switch`
- CR-11: EVEANDBOY ค้นหา · จัดกลุ่ม · พับ/กาง · เลือกทั้ง Series แล้วปรับ +10% · กรอกยอดทั้งปี · ปิดส่วนต่าง · ยกเลิกแล้วค่ากลับทั้งหมด / วางจาก Excel
  (`new ClipboardEvent('paste', { clipboardData: new DataTransfer() })`) + Ctrl+Z / Ctrl+C ได้ TSV / เปิดยอดปีก่อนที่ 1920×937 ไม่มี Scroll แนวนอน /
  ตรวจตัวเลขถูกตัดโหมดแก้ไขที่ 1920 / 1800 / 1600 / 1440 / 1366
- ตรวจตัวเลขถูกตัด: `scrollWidth > clientWidth` ของช่องและ input ในโหมดแก้ไขที่ 1920 / 1800 / 1600 / 1440 / 1366
- v6: สร้าง SKU รหัสชั่วคราว → อัปโหลดรูป (`DOM.setFileInputFiles` ต้องได้ ≤ 320px) → สร้างแผน NPD + หน่วยขาย → ทีม Product ส่ง → Director อนุมัติ →
  แผน SKU ของหน่วยที่วางแผนมี SKU พร้อมเดือนเริ่มขาย → ผูกรหัสจริง (รหัสซ้ำต้องไม่ยอมรับ) แล้วแผน SKU ยังอยู่ครบ / Promotion Watsons มิ.ย. →
  ปฏิทินและ Tooltip หน้า SKU ราคาเดียวกัน / Listing เลือกทั้งคอลัมน์ / หลังล็อก Baseline เพิ่ม Promotion → ป้ายราคาเปลี่ยน + Plan Baseline ไม่เปลี่ยน
- v7: ช่องกรอก % อยู่ถูกคอลัมน์ตามระดับ / แถบ Total ไม่มีป้าย Actual / Hover กราฟ ↔ ตาราง / เปิดใช้งาน LINE Shop แล้วเพิ่มในหน้า Top-down /
  ส่งออก CSV (BOM, จำนวนแถว) และ Excel (ต้องมีอินเทอร์เน็ต: ตัวเลขเป็นชนิดตัวเลข, รูปแบบ, ไม่มี Merge, `<pane ySplit="5" state="frozen">`)
  ดักไฟล์ใน headless ด้วยการแทน `URL.createObjectURL` / `HTMLAnchorElement.prototype.click`
- เปิดไฟล์ Excel ใน headless อ่านกลับด้วย `XLSX.read` / zip ของ SheetJS หาไฟล์ด้วย Path ขึ้นต้นด้วย `/` (`CFB.find(zip, '/xl/worksheets/sheet1.xml')`)
