# CHANGELOG

ประวัติการเปลี่ยนแปลงของ Prototype (ใหม่สุดอยู่บน) · CR ที่ทำเสร็จแล้วลบต้นฉบับออกจาก `docs/change-requests/` เหลือสรุปที่นี่

## CR-36 — 2026-09-28 · กราฟการเติบโตแนวตั้ง · Product List (หมวดลำดับชั้น · จัดกลุ่ม · Product Year · แท็บ Product Level · Drawer 50%) · KPI Launch & Listing · แผน Clearance · Partner List · คู่มือตัด UAT

(ทำ 3 รอบต่อเนื่อง รายงานครั้งเดียว · ไม่ Commit เพราะโฟลเดอร์ไม่ใช่ Git · ผู้ใช้เลือก: ข้อมูลตัวอย่างในไฟล์ข้อมูลปกติ · ข้อความคู่มือคงที่ data/guide.js · ตัด UAT รวมโค้ด)
ไฟล์นอกรายการของ CR: `core/charts.js` (+ waterfallColumns · dots) · `core/components.js` (+ treeSelect · groupPicker · dataCheck action · flowDiagram lines · pageHelp เติมชื่อหน้า) ·
`core/guide.js` (ตัด uat* · + textVars · textIssues) · `core/layout.js` (ตัดแถบลอย UAT · resetData) · `core/seed.js` (samplePatches) · `core/registry.js` · `core/loader.js` (หมายเหตุ) ·
`data/products.js` · `data/permissions.js` · `data/settings.js` (คอลัมน์ Sub Series) · `data/guide.js` · `styles/*` · `tests/*` · `docs/*` · `CLAUDE.md` (แถวคู่มือ)

- รอบ 1 (ส่วน 1 · 2 · 5): Waterfall แนวตั้งเต็มการ์ด (`charts.waterfallColumns`) · หมวดสินค้า `treeSelect` (`calc.categoryOptions`) · `groupPicker` + `calc.productGroupLevels` / `groupItems` / `groupTotal` ·
  `calc.productYear` (ตัวกรอง · คอลัมน์ · จัดกลุ่ม) · Sub Series ค่าเริ่มต้น · `ไม่รวม Delete` · Drawer 50% 2 คอลัมน์ · แท็บ Product Level (โค้ด taxonomy เดิม) + ระบบกำหนด → Product Level · ชื่อ Partner List
- รอบ 2 (ส่วน 3 · 4): แท็บ NPD การ์ด 3 ใบ · จัดกลุ่ม · `calc.listedNotPlanned` (Chip · Popover · SKU Planning เปิด เพิ่มสินค้าในแผน) · แผน Clearance (`calc.clearanceMonths` · `clearanceUnitIds` · `clearanceQty` ·
  `clearancePlanned` · `clearanceStockState` · `clearanceDistribute` · `clearancePlanMonthly` · `clearanceLockedRows` · `clearClearanceCells`) · แท็บ Clearance คอลัมน์ + แถวขยาย · SKU Planning ล็อกเดือน Clearance ·
  Plan Summary ส่วนลายจุด · ตัวอย่าง 32090
- รอบ 3 (ส่วน 6 · docs): คู่มือ 2 แท็บ · ข้อมูลที่ต้องมีก่อนแยกผู้แก้ไขตามหน้า · คำศัพท์ 5 กลุ่ม · สูตร Clearance · สีคงเหลือสต็อก · `{page_<id>}` · ตัด UAT ทั้งหมด
- Test: `tests/cr36.test.js` 13 ข้อ (2 ข้อในเบราว์เซอร์) · ปรับค่าคาดหวัง: เมนู Product Master 3 หน้า (cr25-6 · cr25-9 · cr31-6) · SKU Grid Clearance (calc) · cr35-13 (116) · ตัด cr28-4..7 · cr28-8 · cr32-24 · cr33-3

## CR-35 — 2026-09-28 · Account Master และ Sales Person Management Polish · Product Master: ชื่อหน้าภาษาอังกฤษ · วงจรสถานะ 7 แบบ · รหัสชั่วคราวคำขอ NPD · Launch & Listing · แท็บ Clearance

(ทำ 4 รอบต่อเนื่อง รายงานครั้งเดียว · ไม่ Commit เพราะโฟลเดอร์ไม่ใช่ Git · ผู้ใช้เลือก ID ภายในตาม CR · Discontinued ไม่อยู่ในแผนตั้งต้น)
ไฟล์นอกรายการของ CR: `core/stores.js` · `core/master.js` · `core/units.js` · `core/catalog.js` · `core/seed.js` · `core/plan-edits.js` · `core/components.js` · `core/permissions.js` · `core/registry.js` ·
`modules/people` · `modules/summary` · `modules/products` · `modules/promotions` · `modules/sku-planning` · `modules/npd-plan` · `modules/product-master` · `modules/sales-units` · `modules/accounts` / `territories` (หมายเหตุ) ·
`modules/launch-listing` (ใหม่) · `data/products.js` · `data/permissions.js` · `data/settings.js` (หมายเหตุ) · `data/content.js` · `data/guide.js` · `styles/*` · `tests/*` · `docs/*`

- รอบ 1 (ส่วน 1–3): ชื่อหน้า Account Master ทุกจุด · `viewOnlyNote` `ดูอย่างเดียว · แก้ไขได้โดย {บทบาท}` · ปุ่ม แก้ไข ของแถวหน่วยขายแสดงตลอด · รหัสคู่ค้าห้ามซ้ำ (store · นำเข้า · commandImport) ·
  รวมรหัสซ้ำของร้าน TT ตอนโหลด 8 รหัส (ร้าน 211 · ยอดอ้างอิงรวมเท่าเดิม) · ตัดป้าย / ตัวกรอง / เกณฑ์ ID ซ้ำ · `DATA_VERSION` 15
- รอบ 2 (ส่วน 4–6): สัญญาณโหมดแก้ไขทั้ง 2 แท็บของ Sales Person Management (คอลัมน์แก้ไข · แถบบอกวิธี · ช่องยึด + ป้าย เริ่ม · Esc / คลิกนอกยกเลิก) · `components.yearPicker` ·
  `calc.ownerYears` · `yearKind` · มุมมองตามบุคคลเป็นพันบาท + `allOwners` (ทีม KAM กลาง)
- รอบ 3 (ส่วน 7–10): ชื่อหน้าภาษาอังกฤษ + `helpLead` ในปุ่ม ? · Status 7 แบบ (`PRODUCT_STATUSES` · `productStatus` / `dateStatus` · `revenueTypeOf` · Delete · Discontinued เฉพาะหน่วยที่เคยขาย) ·
  คำขอ NPD `REQ-nnn` + รหัสชั่วคราว `NPD-YYMM-NNN` + `catalog.confirmRequest` (ปุ่ม ยืนยันเป็น NPD) · ป้ายชื่อชั่วคราว / จาก Sales · การ์ดและตัวกรอง Product List · ตัวอย่าง Delete 33490
- รอบ 4 (ส่วน 11–12 · คู่มือ · docs): หน้า Launch & Listing (แท็บ NPD | Listing · ดู Listing · เฉพาะสินค้าใหม่ · หน้าเดิมเป็นทางผ่าน · สิทธิ์ `launchListing`) ·
  Price & Promotion แท็บ Clearance (ราคา · ส่วนลด · ช่วงเดือนสิ้นสุดว่างได้ · หน่วยขาย · วันหมดอายุ · หมายเหตุ · + เพิ่ม Clearance + ยืนยัน Status) · ราคา Clearance ลำดับแรก ·
  registry `alsoPerms` · คำศัพท์ 4 คำ + UAT S12 S13 · docs แยก data-model-products.md / open-items-assumptions.md
- Test: `tests/cr35.test.js` 13 ข้อ · ปรับค่าคาดหวังจากร้าน 211 · สิทธิ์ launchListing (เมนู Product Master 4 หน้า · cr25-9 Supply Chain เห็น 4 แก้ 2) · คำขอ REQ-nnn · สถานการณ์ทดสอบ 13 ข้อ

## CR-34 — 2026-09-28 · ประเภทสินค้าในแผน SKU · เดือนเริ่มขายในคอลัมน์ช่วงเวลาขาย · + เพิ่มสินค้าในแผน · กราฟ Plan Summary

(ทำ 3 รอบต่อเนื่อง รายงานครั้งเดียว · ผู้ใช้เลือก Status จากวันที่ + สถานะคำขอแยก และข้อมูลตัวอย่างในไฟล์ข้อมูลปกติ · ไม่ Commit เพราะโฟลเดอร์ไม่ใช่ Git)
ไฟล์นอกรายการของ CR: `core/plan-edits.js` (ใหม่) · `core/loader.js` · `core/calc.js` (+ ฟังก์ชันใหม่ + planType ในแถว Grid / skuPlanItems · addSalesListings ใส่ source) ·
`core/seed.js` (ข้อมูลตัวอย่าง CR-34 · Listing ของคำขอ) · `core/charts.js` (+ planTargetBars · partBars) · `core/components.js` (+ planTypeBadge · planTypeSwatch) ·
`data/products.js` · `data/npd.js` · `data/listings.js` · `data/plan-seeds.js` · `data/content.js` · `data/guide.js` · `styles/*` · `tests/*` · `docs/*` · `CLAUDE.md` (ตารางไฟล์)

- รอบ 1 (ส่วน 1 · 2.1–2.3 · 2.6): `calc.planTypeOf` 5 ประเภท + `labels.planTypes` + Token `--c-type-*` · จัดกลุ่ม Series | ประเภท | ไม่จัดกลุ่ม ·
  ป้ายประเภทแทน Chip Status · บรรทัดใต้ชื่อเหลือ รหัส · Series · คอลัมน์ช่วงเวลาขายเลือกเดือนเริ่ม (NPD ยืนยันแล้วก่อนเปิดตัวเลือกไม่ได้ · ยืนยันก่อนล้างค่า) ·
  Listing จาก SKU Planning (`source: 'skuPlanning'`) · ข้อมูลตัวอย่าง คำขอ NPD 33490 Watsons มิ.ย. · 16500 Shopee ก.ค. 2027 + Listing ใหม่ 53021 Watsons · 22010 TT เขต 1
- รอบ 2 (ส่วน 2.4–2.5 · 5): ปุ่มเดียว `+ เพิ่มสินค้าในแผน` (แถบแก้ไข · แถวคงเหลือ) → Drawer 3 แท็บ (สินค้าเดิมที่ยังไม่เคยขาย · NPD ยืนยันแล้ว · ขอ NPD เพิ่ม + เหตุผล) ·
  ตัด + เพิ่ม SKU / + เพิ่มสินค้าใหม่ / + สร้าง NPD · นำออกจากแผนลบ Listing จาก SKU Planning + ถามยกเลิกคำขอ · ข้อความแจ้ง NPD มีลิงก์เปิดแท็บ ·
  หน้าแผน NPD: ที่มา `Sales · ชื่อ` + เหตุผล · `ใช้ในแผน` · Chip `คำขอจาก Sales (n)` · ยืนยันคำขอใน Drawer · ข้อมูลที่ต้องตรวจ `มีแผนสินค้า Clearance` (SKU Planning · Plan Summary)
- รอบ 3 (ส่วน 3–4 · คู่มือ · docs): กราฟรายเดือนแท่งซ้อนตามประเภท + ขีดเป้าหมาย Top-down + เส้นประยอดอ้างอิง (ซ่อนได้) + แถวส่วนต่าง + สรุปทั้งปีหัวกราฟ ·
  สัดส่วนแผน 50 : 50 ตามประเภทแผน | ตามกลุ่มสินค้าซ้อนตามประเภท (ตัดแท่ง ตาม Status) · คำศัพท์ 5 คำ + UAT S11 · `docs/spec/ui-charts.md` แยกจาก ui-standards
- Test: `tests/cr34.test.js` 9 ข้อ · ปรับค่าคาดหวังจากสินค้าตัวอย่างเพิ่ม 2 รายการ (calc · taxonomy) และสถานการณ์ทดสอบ 11 ข้อ (cr28)

## CR-33 — 2026-09-27 · Sales Unit & Customer แก้ไขรายรายการ · คอลัมน์ตาม Channel · SKU Planning แยกคอลัมน์ช่วงเวลาขาย / อายุ

(ทำ 2 รอบต่อเนื่อง รายงานครั้งเดียว · ไม่ Commit เพราะโฟลเดอร์ไม่ใช่ Git · แทนที่ CR-32 ข้อ 3.2 · 3.4 · 3.5 และคอลัมน์ ช่วงเวลาขาย · อายุ ของ CR-27)
ไฟล์นอกรายการของ CR: `core/units.js` (+ canEdit · command* · withChanges · unitCounts · columnPresetFor) · `core/catalog.js` (+ ensureVersion · tableState คง version) ·
`core/components.js` (+ toast) · `data/settings.js` (SALES_UNIT_COLUMN_PRESETS ตามแท็บ + SALES_UNIT_COLUMN_VERSION · ผู้ใช้อนุญาต) · `tests/*` · `docs/*`

- รอบ 1 (ส่วน 1–3): ตัดแถวสรุปและปุ่ม แก้ไข ที่หัวหน้า · ค้นหารหัสคู่ค้า / ชื่อ · แถวหน่วยขายบรรทัดเดียว (`{gpLabel} xx%` · `คู่ค้า N` / `ร้าน N` · ปุ่ม แก้ไข / รายละเอียด) ·
  Drawer หน่วยขาย / คู่ค้า / ตั้งค่า Channel บันทึกของตัวเอง + ถามก่อนปิดเมื่อยังไม่บันทึก · ผู้รับผิดชอบปีปัจจุบัน – สุดแผน (อ่านอย่างเดียว) · + เพิ่มหน่วยขาย = Drawer เปล่า ·
  ช่องติ๊กตลอด + แถบคำสั่งแทนหัวแผง (ย้าย · นำออก · ใช้หน่วยขายแนะนำ · เปลี่ยนสถานะ… · ยกเลิกการเลือก) บันทึกทันที + Toast · ลากวาง · นำเข้าร้านค้าคงไว้ (ผู้ใช้เลือก) ·
  คอลัมน์ค่าเริ่มต้นตามแท็บ · ป้ายหน่วยขายแนะนำในช่องหน่วยขาย · แถวท้าย n ราย + ข้อมูลตัวอย่าง (ตัด `*`) · `รหัสคู่ค้า` ทุกจุด
- รอบ 2 (ส่วน 4 + Test + docs): `calc.skuAgeGroup` แหล่งเดียวของตัวกรองและคอลัมน์อายุ · ป้ายสั้น `≤ 1 ปี · 1–2 ปี · > 2 ปี · ยังไม่เริ่มขาย` (ผู้ใช้เลือก) ·
  SKU Planning 2 คอลัมน์ `ช่วงเวลาขาย` | `อายุ` รวม 130px (1366 = 116px) · ตัดป้าย `อายุนาน` · ส่งออก ช่วงเวลาขาย · อายุ · `tests/cr33.test.js` (cr33-1..8)
- ข้อมูลที่ต้องตรวจ ณ ก.ย. 2026 เท่าเดิม 34 รายการ · ตัวเลขแผนไม่เปลี่ยน

## CR-30 — 2026-09-27 · Product Master ทั้ง Module (Product Code ระบบสร้าง · NPD · ราคาหลักและ Promotion Price รายเดือน · Listing ตามช่วงเวลา · แผน NPD ต่อเนื่อง)

(ทำ 3 รอบ · ไม่ Commit เพราะโฟลเดอร์ไม่ใช่ Git · รอบ 3 ทำหลัง CR-31 / CR-32 ตามที่ผู้ใช้สั่ง · แทนที่ CR-08 ข้อ 4.5 · CR-18 ข้อ 2 · CR-20 ข้อ 3 · CR-15 ข้อ 6 —
ไฟล์ CR เหล่านั้นถูกลบไปแล้ว จึงบันทึกการแทนที่ไว้ที่นี่และใน DECISIONS D-91..D-100 แทน `superseded_by` · Module ใน CR `modules/listing` = `modules/product-master` · `modules/promotion` = `modules/promotions`)
ไฟล์นอกรายการของ CR (ผู้ใช้อนุญาตไฟล์กลางและไฟล์ข้อมูลทั้งหมด ยกเว้น `data/seed/`): `core/catalog.js` (ใหม่) · `core/calc.js` · `core/seed.js` · `core/store.js` (DATA_VERSION 10 → 11 → 14) ·
`core/loader.js` · `core/components.js` (+ columnPicker · ไอคอนกุญแจ · categoryFilter `opts.labels`) · `core/permissions.js` (LEGACY prices) · `core/report.js` · `core/registry.js` · `core/taxonomy.js` (ค่าตัวกรอง `noPrefix`) ·
`data/settings.js` · `data/pricing.js` (เขียนใหม่) · `data/promotions.js` (ลบ · ผู้ใช้เลือก) · `data/channels.js` (TT priceBasis) · `data/products.js` · `data/npd.js` · `data/listings.js` (หมายเหตุ) · `data/permissions.js` ·
`data/content.js` · `data/guide.js` · `modules/summary/summary.js` (Snapshot ราคา · คำ) · `styles/components.css` · `tests/*`

- รอบ 1 (ส่วน 1–2): Status `New` แสดงเป็น `NPD` · Product Code ระบบสร้าง (`core/catalog.js` nextCode · codeCounters · เลขนำหน้าตั้งต้นต่อ Type · แปลง `NPD_2027Q2_01..03` → 32210 / 34150 / 33480) ·
  ตัด Internal Code · Item Type · รหัสชั่วคราว · ผูกรหัสจริง · `ใน TRCLOUD` · ความครบถ้วนที่ควรมี = Barcode · รูป · หน้ารายการสินค้าใหม่ (KPI 6 · ตัวกรอง 2 แถว + Chip · Preset คอลัมน์ส่วนตัว · ส่งออก ▾ · นำเข้าด้วยรหัสเดิม)
- รอบ 2 (ส่วน 3–4 + สิทธิ์ราคา): `master.basePrices` · `master.promoPrices` · `calc.resolvePrice` (ย้ายข้อมูลเดิม · ราคาเท่าเดิมทุกช่อง 2025–2027) · หน้า `ราคาและ Promotion` (ราคาหลัก | Promotion Price) ·
  สิทธิ์ `prices` · `prices.base` · `prices.promo` · ตัดปฏิทิน Promotion รายวัน · หน้าแผน NPD ใหม่ (ช่วงเวลาต่อเนื่อง · ขั้นงานมีเดือนเป้าหมาย · เดือนเปิดตัวแบบไตรมาส · สินค้าตัวอย่างปี 2028 อีก 2 รายการ) ·
  สร้าง NPD จาก Sales ได้ Product Code ทันที (ต้องเลือก Type)
- รอบ 3 (ส่วน 5–8): Listing = สถานะ (เสนอขาย · วางขาย · ถอดแล้ว) + ช่วงเดือนต่อหน่วยขาย (`calc.normalizeListings` · `listingOutside` · `listedInYear` · `setListing` · `listingCoverage` · `plannedAfter`) ·
  หน้า `Listing` เขียนใหม่ (ข้อมูล ณ เดือน · ความครอบคลุม · ช่อง 2 บรรทัด · ตัวกรองสถานะ Listing / อายุ / ไม่มียอด · Popover · เลือกหลายช่อง · กล่องยืนยันการถอด · กฎย้ายไปปุ่ม ?) ·
  SKU Planning ล็อกเดือนนอกช่วง Listing + ป้าย `ยังไม่ยืนยัน Listing` / `เดือนเปิดตัวยังไม่ยืนยัน` · NPD แบบไตรมาสใช้ต้นไตรมาสเป็นเดือนเปิดตัวชั่วคราว ·
  หน้าหมวดสินค้าและ Series: ตัวกรองแถวเดียวตามแท็บ · `{ระดับ} · อยู่ใน {เส้นทาง}` + คำเตือนใต้ชื่อ · เลขนำหน้า Product Code ของ Type + รหัสถัดไป · ⚠ เฉพาะรายการที่มีปัญหา
- เอกสาร: `pages/products.md` · `npd-plan.md` · `promotions.md` · `product-master.md` · `taxonomy.md` · `sku-planning.md` · `data-model.md` · `permissions.md` · `architecture.md` · `ui-standards.md` · `testing.md` ·
  `product-rules.md` (ใหม่ · แยกจาก business-rules.md) · SPEC.md
- Test: `tests/cr30.test.js` ครบ 14 ข้อตาม CR (ข้อ 10 เปลี่ยนจาก "Planned จนกว่าจะระบุเดือน" ของรอบ 2 เป็น "Planned ก่อนต้นไตรมาส · ล็อก ม.ค.–มี.ค. 2028" ตาม CR)

## CR-32 — 2026-09-27 · Sales Unit & Customer (รวม Account & Platform + เขตและร้านค้า) · Sales Person Management · person.userId

(ทำก่อน CR-30 รอบ 3 ตามที่ผู้ใช้สั่ง · ไม่ Commit เพราะโฟลเดอร์ไม่ใช่ Git · Seed ตัวอย่างอยู่ที่ `data/seed/` ตาม CR · แทนที่หน้า Account & Platform / เขตและร้านค้า / บุคลากรและทีมของ CR-29 (ไฟล์ CR-29 ลบไปแล้ว))
ไฟล์นอกรายการของ CR: `core/units.js` (ใหม่) · `core/clock.js` (horizonEnd / horizonYears) · `core/calc.js` (+ suggestSalesUnit · ownerGaps · personMonthlyLoad · ownerReplace) ·
`core/report.js` (+ unitMonthlyValues) · `core/components.js` (+ dataCheck · flashRow · choiceDialog body) · `core/permissions.js` · `data/permissions.js` · `data/users.js` · `data/accounts.js` (suggest) ·
`core/loader.js` · `core/registry.js` · `modules/summary/summary.js` (ชื่อหน้าในลิงก์) · `modules/about-prototype/about-prototype.js` ({horizon}) · `styles/components.css` · `tests/*`

- รอบ 1: `PLAN_HORIZON_END` · `data/seed/seed-mt-branches.js` (56 คู่ค้า: Beautrium 10 · EVEANDBOY 10 · Account อื่น 4 รายละ · ยังไม่จัดสรร 3 · ECOM 5) · `core/units.js` (หน่วยขาย / คู่ค้า / ช่วงโครงเดียว ·
  แบ่งยอดอ้างอิงจาก L12M ผลรวมเท่ายอดหน่วยขาย) · `calc.suggestSalesUnit` (TT ได้ผลเท่าเดิม 220 ร้าน) · DATA_VERSION 12 + ข้อความแจ้ง 1 ครั้ง
- รอบ 2: หน้า `modules/sales-units` (แท็บ Channel · ตัวกรองเพิ่มเติม · แผงหน่วยขาย 2 บรรทัด · ตารางคู่ค้า + Preset แยกแท็บ · ย้าย / นำออก / ใช้หน่วยขายแนะนำทุก Channel · Drawer หน่วยขาย / คู่ค้า ·
  นำเข้าร้านค้า · ตั้งค่า Channel · ส่งออก 3 ชีต) · หน้าเดิมเป็นหน้าพาไป · Permissions `salesUnits` (+ .gp · .channelSettings = สูงสุดของ key เดิม · LEGACY + ALIASES) · `components.dataCheck` · 5 เกณฑ์
- รอบ 3: `person.userId` แหล่งเดียว (ผู้ใช้ไม่มี salesPersonId · สิทธิ์ของผู้ใช้ตัวอย่าง 18 คนเท่าเดิม · DATA_VERSION 13) · หน้า `Sales Person Management` (ไม่มีคำอธิบาย · สถานะเริ่มต้นใช้งาน ·
  ไม่จัดกลุ่ม · เรียง Channel → Manager → ชื่อ · Chip หน่วยขาย · คอลัมน์บัญชีผู้ใช้ · สร้างบัญชีผู้ใช้ · เส้นตารางต่อเนื่อง · ไม่มี Emoji) · หน้า Users คอลัมน์บุคลากร · 4 เกณฑ์ข้อมูลที่ต้องตรวจ
- รอบ 4: ผู้รับผิดชอบรายเดือน (ปุ่มปีถึงสุดแผน · ตามหน่วยขาย | ตามบุคคล · ไฮไลต์รายบุคคล · ช่องเดือนเท่ากัน · กล่องแทนที่ `calc.ownerReplace`) · มุมมองตามบุคคล (`calc.personMonthlyLoad` ·
  เป้าหมาย 2027 / ยอดจริง 2026) · คู่มือ: คำศัพท์ คู่ค้า · สิ้นสุดแผน · ภาระเป้าหมายต่อคน · UAT S10
- Test: `tests/cr32.test.js` 24 ข้อ · ปรับ permissions (19 รายการ · เมนู · สรุปหน้า) · cr29-9 · cr28 (10 สถานการณ์) · Browser 294+
- Docs: `pages/sales-units.md` ใหม่ · account-master · people · accounts / territories (ซ่อนแล้ว) · role-management · permissions · data-model · architecture · ui-standards · guide ·
  open-items · testing · SPEC · D-84..D-90

## CR-31 — 2026-09-26 · Role Management 2 หน้า (Permissions รวมการจัดการบทบาท · Users สิทธิ์ที่มีผลจริงตาม Module) · ข้อมูลบทบาทย้ายไปคู่มือ

(แทนที่ CR-21 ข้อ 4 · CR-25 ข้อ 1 และข้อ 4 — ไฟล์ CR-21 / CR-25 ลบไปแล้วหลัง Applied จึงบันทึกการแทนที่ไว้ที่นี่และ D-79 · D-80)
ไฟล์นอกรายการของ CR: `core/components.js` (+ `permissionCell` · `permissionLegend`) · `core/registry.js` (Roles `visible: false`) · `core/guide.js` (`roleRows` + คำอธิบาย · system · จำนวนผู้ใช้) ·
`data/content.js` · `data/guide.js` · `data/permissions.js` (ชื่อแถว `Permissions / Users`) · `styles/components.css` · `tests/*`

- ช่องสิทธิ์ข้อความล้วน (`permissionCell` + Legend `แก้ไข · ดู · ว่าง = ไม่เห็น`) ทั้ง 2 หน้าและ Drawer · ตารางแถว ~40px เส้นแบ่งแถวจาง ไม่มีเส้นคอลัมน์ · หัวกลุ่ม Module พับได้ · กลุ่ม `ทุกหน้า` → `ทั้งระบบ`
- Permissions: คำอธิบาย `สิทธิ์ของแต่ละบทบาทในแต่ละหน้า` · ตัดข้อความสิทธิ์ฝั่งหน้าจอ · `เห็น x หน้า` · Checkbox `เฉพาะที่ต่างจากค่าตั้งต้น` · จุดที่มุมช่อง ·
  หัวคอลัมน์ ชื่อ + `สร้างเอง` + `⋯` / `{n} คน` (ลิงก์ Users) · เมนู `⋯` ข้อมูลบทบาท · สิทธิ์ · อื่นๆ · อันตราย · แผงด้านข้าง (เพิ่ม · แก้ชื่อ · หน้าเริ่มต้น) · `+ เพิ่มบทบาท` คอลัมน์สุดท้าย ·
  คลิกช่อง = ตัวเลือกในช่อง (กดแล้วปิด) · คีย์ลูกศร / 1 / 2 / 3 / T · คลิกชื่อหน้า = ตั้งทั้งแถว · `คืนค่าตั้งต้นทั้งหมด` ใน `⋯` หัวหน้า (โหมดแก้ไข) · ช่องที่แก้ = ขอบล่างสีหลัก
- Users: Module ตัวเลือกเดี่ยว (`ui.usersModule`) · คอลัมน์สิทธิ์ของหน้าใน Module (+ คอลัมน์ย่อย) อ่านอย่างเดียว · Tooltip `ได้จากบทบาท` · กลุ่มตามบทบาทแรก ·
  คอลัมน์ทีม (ลิงก์บุคลากรและทีม) · ตัดคอลัมน์สถานะ · สถานะค่าเริ่มต้น ใช้งาน · แก้บทบาทในช่อง (Checkbox) · ปิด / เปิดใช้งานที่ `⋯` · `+ เพิ่มผู้ใช้` ที่หัวหน้า ·
  Drawer 3 แท็บ (ข้อมูล · สิทธิ์ที่มีผลจริงทุก Module · ประวัติ) · ส่งออกผู้ใช้ × สิทธิ์ของ Module
- หน้า Roles ซ่อน (ลิงก์เดิม → Permissions) · เมนู Role Management = Permissions · Users · คู่มือ `บทบาทและหน้าที่` + คำอธิบาย · จำนวนผู้ใช้ · บทบาทที่สร้างเอง ·
  บรรทัดสิทธิ์ฝั่งหน้าจอใน `สำหรับการทดสอบ` (ที่เดียวในระบบ)
- Test: `tests/cr31.test.js` 9 ข้อ (cr31-1 ใช้ DOM) · `cr25-9` เมนูผู้ดูแลระบบ 13 หน้า · Browser 275 Test
- Docs: `pages/role-management.md` เขียนใหม่ · permissions · ui-standards · guide · architecture · testing · open-items · SPEC · D-79..D-83

## CR-29 — 2026-09-26 · Account Master 3 หน้า · สิ้นสุดการรับผิดชอบแทนลาออก · กติกาไฟล์ที่แก้ได้

(ผู้ใช้เลือก: Export คงปิดใช้งาน → แท็บ ทั้งหมด · MT · ECOM · `ดูผลงานปี 2026` แสดงเฉพาะ Actual · ไฟล์นำเข้า = รูปแบบไฟล์ส่งออกร้านค้า ·
ไฟล์นอกรายการของ CR: ตามกติกาส่วน 0 = `core/loader.js` · `core/registry.js` · `core/master.js` (ใหม่) · `core/calc.js` (+`personYtd`) · `core/components.js` (+4 Component) ·
`core/permissions.js` · `data/permissions.js` · `data/content.js` · `data/guide.js` · `styles/components.css` · `tests/*` · นอกกติกา (เพิ่มอย่างเดียว ไม่เปลี่ยนผลเดิม) =
`core/store.js` (`master.channels`) · `core/export.js` (`readTable`) · `data/salespeople.js` (ทีม KAM `type: team`) · `data/stores.js` (`importColumns` · `importRules`))

- ส่วน 0: CLAUDE.md หัวข้อ `ไฟล์ที่แก้ได้โดยไม่ต้องถาม` + ขั้นตอนข้อ 2 · SheetJS ใช้ส่งออกหรือนำเข้า · `docs/change-requests/_template.md` ใหม่
- โครง: เมนู Account Master = `Account & Platform` · `เขตและร้านค้า (TT)` · `บุคลากรและทีม` (`modules/people` ใหม่) · หน้าผู้รับผิดชอบ / ทีมขายซ่อน (`visible: false`) และพาไป `#monthly` / `#list` ·
  `core/master.js` ฟังก์ชันล้วน (รหัส · สถานะตามเดือน · ข้อมูลที่ต้องตรวจ · ผลกระทบ GP · ไทม์ไลน์ · สิ้นสุด / ยกเลิก · สมาชิกทีม · นำเข้า · audit) ·
  Component `checksChip` · `personLink` · `historyList` · `ownerTimeline` · ประวัติการเปลี่ยนแปลงที่ `master.audit` (เขียนตอนบันทึก)
- Account & Platform: แท็บจาก Channel Master (แบ่งเป้าตาม Account · ใช้งาน) · รหัส `U-{Channel}-{nnn}` ห้ามซ้ำ · ตาราง Channel · รหัส · ชื่อ · GP · สถานะ · ผู้รับผิดชอบ ณ เดือนปัจจุบัน ·
  Drawer (ข้อมูล · ประวัติ): แก้ GP พร้อมผลต่อ Net Sales · เปลี่ยนผู้รับผิดชอบตั้งแต่เดือน · ไทม์ไลน์ 12 เดือน · ปิดใช้งานตามเดือน (แจ้งเป้าหมายที่มีในแผน) · นำออกเฉพาะที่ไม่ถูกอ้างถึง ·
  `ตั้งค่า Channel` (`master.channels` แทน `SP.data.channels` · ชื่อ · หน่วย · GP · สี · ใช้งาน · เพิ่ม Channel) · ตัดคอลัมน์แผนปี 2027
- เขตและร้านค้า: Drawer เขต (ข้อมูล · ผู้รับผิดชอบ · ประวัติ) · เพิ่มเขตครบฟิลด์ (จังหวัด · ผู้รับผิดชอบ · เดือนเริ่ม) · ข้อมูลที่ต้องตรวจ (ยังไม่จัดสรร · ไม่มีจังหวัด · ข้อมูลซ้ำ · ไม่มีผู้รับผิดชอบ) ·
  นำเข้า Excel (ร้านใหม่ / ข้อมูลเปลี่ยน / ไม่พบในไฟล์ · ปิดเฉพาะที่เลือก · ปิดบังชื่อบุคคลธรรมดา) · จำนวนยังไม่จัดสรรตรงกันทุกจุด (`master.storeSummary`) · ประเภทร้านย่อ · ป้ายนอกจังหวัดจาง
- บุคลากรและทีม: แท็บรายชื่อและทีม (จัดกลุ่มตาม Channel · Chip ทีม · ข้อมูลที่ต้องตรวจ · เพิ่มบุคลากร / ทีม) · ผู้รับผิดชอบรายเดือน (ตัวเลือกปี · แก้ด้วย `calc.setOwner`) ·
  Drawer: ทีมตามช่วงเวลา · หน่วยขายที่ดูแล · ผลงาน 1 บรรทัด · `สิ้นสุดการรับผิดชอบ…` จบใน Drawer (ผู้รับช่วงรายหน่วย · ปิดสมาชิกทีม) · `ยกเลิกการสิ้นสุด` · ส่งออก 2 ชีต
- `ลาออก` → `สิ้นสุดการรับผิดชอบ` ทุกข้อความ (`content.js` · `guide.js` S7) · บุคลากรประเภททีม (ไม่นับว่าไม่มีผู้รับผิดชอบ)
- Plan Summary: ตารางบุคลากร + `เป้าหมาย YTD` · `Actual YTD` · `% YTD` (`calc.personYtd`) · ตัวเลือก `ผลงานปีแผน 2027 | ดูผลงานปี 2026`
- สิทธิ์: `accounts` (+ `accounts.gp` · `accounts.channelSettings`) · `territories` · `people` (ค่าเดิมของ `salespeople` / `salesTeam` ย้ายด้วย `LEGACY`) · Officer เห็นเฉพาะเขตและร้านค้า
- Test: `tests/cr29.test.js` 14 ข้อ · ปรับ `tests/permissions.test.js` ตามตารางใหม่ · Browser 261 Test
- Docs: `pages/account-master.md` (รูปแบบร่วม + ตารางเทียบฟีเจอร์) · `pages/people.md` ใหม่ · `pages/accounts.md` เขียนใหม่ · territories · summary · salespeople / sales-team (หน้าพาไป) ·
  data-model · permissions · business-rules · ui-standards · architecture · open-items · testing · guide · SPEC · D-71..D-78

## CR-28 — 2026-09-26 · คู่มือการใช้งาน + สถานการณ์ทดสอบ (UAT) · ตัวกรองแท็บติดตามสถานะ

(ผู้ใช้อนุญาตไฟล์นอกรายการ: `core/loader.js` (โหลด `data/guide.js` · `core/guide.js` ใหม่) · `core/calc.js` (นับแท็บ · เรียงตาม %) · `modules/sku-planning/*` (ย้ายปุ่ม ?) ·
CR เขียน `modules/about/*` และ `docs/spec/pages/master-and-about.md` = โฟลเดอร์ `modules/about-prototype` เดิม · spec เปลี่ยนชื่อเป็น `pages/guide.md` ·
CLAUDE.md ไม่ได้แก้ (อยู่นอกรายการ) — ตาราง "โค้ดอยู่ตรงไหน" ยังไม่มี `core/guide.js` / `data/guide.js`)

- ติดตามสถานะ: `calc.actionTabs` · `actionTabMatch` · `gapPct` · `planActions` `sort: 'pct'` → แท็บ ทั้งหมด · ขาด · เกิน · จัดสรรครบ · ไม่มีผู้รับผิดชอบ (`ui.statusFilter`) แทน Checkbox ·
  หัวข้อ `ยังจัดสรรไม่ครบ x จาก y` · ส่วนต่าง `ขาด 2.70 ล้าน (24.7%)` · ปุ่ม `ไปแก้ไข →` / `กำหนดผู้รับผิดชอบ →` · ทุกหน่วยครบ = ข้อความไอคอนเขียว · `segmented` รับ `option.className`
- คู่มือการใช้งาน (id `aboutPrototype` เดิม · กลุ่ม `ช่วยเหลือ` · Header `คู่มือ`): `data/guide.js` (ภาพรวม · Flow · คำศัพท์ · สถานการณ์ S1–S9 · ปุ่ม ? ทุกหน้า) ·
  `core/guide.js` (pageEditors · groupEditors · roleRows · formulaLines · uat*) · `components.flowDiagram` · หน้า 3 แท็บ (`ui.guideTab` · `#uat-S4`) ·
  UAT: ผู้ทดสอบ · วันที่ · ความคืบหน้า · ส่งออก 9 แถว · ล้างผล · เริ่มสถานการณ์ (มุมมองผู้ใช้ + หน่วยขาย + Toast) · ไม่ผ่านต้องมีหมายเหตุ ·
  ตัดขอบเขต · Decision log · คำถามที่ค้าง · ขั้นต่อไป · กล่องขออนุมัติออกจาก `content.js` (9 รายการที่ยังไม่อยู่ใน docs ย้ายไป open-items / business-rules ก่อน)
- layout: ปุ่ม `?` ต่อท้ายชื่อหน้า (`components.pageHelp` · ผู้แก้ไขจากสิทธิ์จริง · `ctx.addHelp`) · `resetData` คง `uat.*` · แถบลอย `กำลังทดสอบ {id} · ขั้นที่ x/y` + `กลับไปบันทึกผล` · `pageLabel`
- SKU Planning: กฎ Status · Legend · คีย์ลัด ย้ายจากปุ่ม ? ในแถวเครื่องมือเป็นหัวข้อ `กฎ Status และวิธีเติมยอด` ในปุ่ม ? ต่อท้ายชื่อหน้า
- Test `node tests/run.js cr28` cr28-1..9 (ข้อ 6 เบราว์เซอร์) · เบราว์เซอร์ 247

## CR-27 — 2026-09-26 · ปรับความเรียบร้อย Sales Planning 4 หน้า

(ผู้ใช้เลือก: สร้าง `data/plan-seeds.js` ใหม่ตามยอด SKU ปี 2025 และเป้าหมายใหม่ (ไฟล์นอกรายการที่แก้ได้) · % ของ Total ใช้ตามตาราง CR (L12M ตรงกับหน้าจอ) ·
CR-24 ข้อ 2.2 และ CR-26 A2–A3 ใส่ `superseded_by: CR-27`)

- ข้อมูลตั้งต้น: `data/targets.js` Channel 48 / 20 / 32 (MT +1.4% · TT +5.2% · ECOM +10.4%) · หน่วยขาย = `calc.roundShares`(L12M) MT 46/35/19 · TT 34/29/19/18 · ECOM 46/27/27 ·
  `core/seed.js` `priorSkuQty` → `history.years[2025].skuQty` (7-Eleven แผนตั้งต้น 24,878,087 เทียบ L12M 24,878,381) · `data/plan-seeds.js` สร้างใหม่ (TT เขต 1 +1.5% · Tiktok +2% · TT เขต 3 ตรงเป้า) ·
  settings `AGING_LONG_MONTHS` 24 · `AGING_YEAR_MONTHS` 12
- calc: `roundShares` ใช้กับปุ่มเติมตามสัดส่วน L12M · `ageBand` · `ageMatch(age, filter, noSaleOnly)` · `salesAge.current` · `skuPlanNet` · `channelMonthShares` · `uniformGrowth` · `targetPlanBars` ·
  components `targetGrowth` (▼ + Tooltip เมื่อต่ำกว่า L12M) · charts: `stackedColumns` growth คืน `{ text, muted }` · `stackedShare` `part.text` · `vsLastYearBar` `opts.title` / `opts.newTag`
- ทั้ง 4 หน้า: ตัด `ขั้นที่ x/4` ออกจากหัวข้อ (`core/layout.js` · ลบข้อความ `stepOf`)
- Annual Target: `ช่วงเวลาทับซ้อน` แทนการเติบโต 2025 → L12M · Waterfall ชิดบนของการ์ด
- Sub-channel Allocation: แถวรวม `▦ มุมมองรวม` · คอลัมน์ `แผน SKU` · `ส่วนต่างแผน` (คลิกไป SKU Planning) · หมายเหตุ 💬 (`plan.<ปี>.unitNotes` · ส่งออก) ·
  `ใช้รูปแบบรายเดือนของ Channel` · แถวการเติบโตซ่อนเมื่อเท่ากันทุกเดือน (บรรทัด `การเติบโตเท่ากันทุกเดือน x%`) · ความกว้างคอลัมน์ช่วง 1600–1799px
- SKU Planning: คอลัมน์ `ช่วงเวลาขาย · อายุ` 130px (`– ปัจจุบัน` · Tooltip หัวคอลัมน์) · ตัวกรองอายุ 3 ช่วง + Checkbox `เฉพาะที่ไม่มียอด ≥ 3 เดือน` · ชื่อ SKU 2 บรรทัด (แถว 52px) ·
  เลิกจุดประมาณการรายช่อง → ป้าย `ประมาณการ` ที่หัวเดือน · แถวเครื่องมือ 13px
- Plan Summary: ลำดับ KPI → การ์ดคู่ 55 : 45 → ตาราง → รายเดือนเต็มความกว้าง → กลุ่มสินค้า (Status แท่งซ้อน 100% แท่งเดียว) → Pivot → รายผู้รับผิดชอบ
  (คอลัมน์ `เป้าหมายเทียบแผน` สเกลร่วมเริ่มที่ 0 · เรียงตามเป้าหมาย) · พิมพ์ขึ้นหน้าใหม่ก่อน ตาราง · กลุ่มสินค้า · รายผู้รับผิดชอบ (ฉบับร่าง 5 หน้า)
- Test `node tests/run.js cr27` cr27-1..10 · ปรับ Test เดิมตามค่าตั้งต้นใหม่ (v7-6 · cr11-1 · cr12-9 · cr13-4 · cr23-2 · cr23-6 · cr24-5 · cr24-7) · เบราว์เซอร์ 238

## ปรับ Header — 2026-09-26

- ตัดข้อความ `(จำลองสำหรับการนำเสนอ)` ข้าง Dropdown มุมมองผู้ใช้ (ย้ายไปเป็น Tooltip ของคำว่า มุมมองผู้ใช้) · Dropdown กว้างสุด 24em แสดงบทบาท · Channel · ชื่อครบ
  (`core/layout.js` · `styles/base.css` ตามที่ผู้ใช้ขอ)

## CR-26 — 2026-09-26 · อายุการขายของ SKU · ตารางแผนราย SKU × Channel

(ผู้ใช้เลือก: ประวัติย้อนหลังราย SKU ใช้กับอายุการขายเท่านั้น ยอดอ้างอิงของ CR-24 ไม่เปลี่ยน · Discontinued ใช้กฎเดียวกับ Active)

- `data/settings.js` AGING_* · `core/seed.js` `history.skuStart` (`startMonths`) · calc: `skuBackfill` · `skuActualAt` · `salesAge` · `ageMatch` · `monthsDiff` ·
  sortPlanRows `age` / `noSale` / `recent` · `skuPlanItems` · `pivotPlan`
- SKU Planning: คอลัมน์ `เริ่มขาย · อายุ` 110px ติดซ้าย (ชื่อ SKU 230px) + ป้าย `ไม่มียอด n ด.` / `อายุนาน` + Tooltip · ตัวกรอง `อายุ ▾` · เรียง 3 แบบใหม่ ·
  หัวกลุ่ม `· ไม่มียอด n` · ส่งออก 5 คอลัมน์ · รับ SKU ที่ส่งมาจาก Plan Summary (`ui.skuSearchHandoff`)
- `core/report.js` `skuItems` + `pivotPlan` · Plan Summary: `แผนตามสินค้าและช่องทาง` (ตัวควบคุมจำที่ `ui.summaryPivot` · Tree · สีไล่ความเข้ม · คลิกไป SKU Planning ·
  ส่งออกแบบแบน · พิมพ์ขึ้นหน้าใหม่ หัวตารางซ้ำ)
- Test `node tests/run.js aging` cr26-1..10 · เบราว์เซอร์ 228

## CR-25 — 2026-09-26 · Module Role Management และเมนูข้างตามบทบาท

(ผู้ใช้เลือก: หน้า Roles / Users เป็นโฟลเดอร์ย่อยใน `modules/role-management` ใช้ไฟล์ JS เดียว · หน้าใหม่และบทบาทที่ไม่คัดลอกยังได้ ดู ·
แถวสรุปนับหน้าในเมนูข้าง · ไฟล์ CR-21 ถูกลบไปแล้ว จึงบันทึก superseded ของ CR-21 ข้อ 2 และข้อ 6 ที่ D-55 · D-56)

- registry: กลุ่ม `role-management` แทน `system-settings` · Permissions (`roleManagement` · K) · Roles (`roleRoles` · R) · Users (`roleUsers` · U) · `perm` · `open` ·
  `registry.step` (เลขขั้นคงที่ · ก่อนหน้า/ถัดไปข้ามขั้นที่มองไม่เห็น)
- permissions: หน้า `perm` ใช้สิทธิ์ร่วม · หน้า `open` เห็นเสมอ ไม่อยู่ในเมทริกซ์ · `menuFor` · `homePage` · `roleHome` · `rolePages` · `roleSummary` · `switchTarget` · `setRoleHome` ·
  saveSummary นับการเปลี่ยนหน้าเริ่มต้น
- data/permissions.js: ตาราง CR-25 ข้อ 3 ครบทุกช่อง (TABLE) + `homePageId` ทุกบทบาท + resource `Permissions / Roles / Users`
- layout: index.html / หน้าไม่มีสิทธิ์ (ปุ่ม `ไปที่หน้าเริ่มต้น: …`) → หน้าเริ่มต้นของบทบาท · สลับมุมมองผู้ใช้แล้วหน้าถูกซ่อน → หน้าเริ่มต้น + Toast (`ui.toast`) ·
  เลขขั้นและไอคอนขั้นคงที่ · `กลับขั้นแรก` ไปขั้นแรกที่เห็น · Toast ใน components.css
- modules/role-management: 3 หน้าจากแท็บเดิม · Permissions: บรรทัด `เห็น n หน้า · แก้ไข m หน้า` · ช่องไม่เห็นพื้นเทาว่าง · ดูตัวอย่างไปหน้าเริ่มต้นของบทบาท ·
  Roles: คอลัมน์และ Dropdown หน้าเริ่มต้น · ประวัติการแก้ไขเฉพาะเรื่องของหน้า · ส่งออกเฉพาะหน้า Permissions
- content: ชื่อกลุ่ม `Role Management` · ชื่อ 3 หน้า · Toast · Decision log (เมนูตามบทบาท · หน้าเริ่มต้นของบทบาท)
- Test `node tests/run.js permissions` cr25-1..9 (ปรับ cr21-1 ตามค่าตั้งต้นใหม่) · เบราว์เซอร์ 218

## CR-24 — 2026-09-25 · ยอดขาย L12M · กราฟ Annual Target · เมนูข้างใน SKU Planning

(ผู้ใช้อนุญาตแก้เพิ่ม: `core/loader.js` (เพิ่ม clock.js) · `core/components.js` priorLabel / priorNote / referenceNote · `core/stores.js` 1 บรรทัด (หน้า TT ใช้ clock) ·
ขอบเขต clock = L12M + หน้า TT · จุดประมาณการที่ช่องตาม CR · CR-06 ข้อ 2.2 และ CR-20 ข้อ 1 ถูกแทนที่ (ไฟล์ CR ลบไปแล้ว บันทึกที่ D-51 · D-53))

- `core/clock.js` ใหม่ (`DEMO_CURRENT_MONTH` '2026-09') · calc: `referenceMonthly` · `referenceValues` · `l12m` · `skuReference` · Top-down prior = L12M ·
  `priorMonthly` / `phasingBasis` = ยอดอ้างอิง · แผน SKU ค่าตั้งต้นและ ly = ยอดอ้างอิง SKU (`lyYear` · `lyEstimated`) · `priorOutsidePlan` ใช้ยอดอ้างอิง
- ข้อความ: `ยอดขาย L12M ⓘ` · `ยอดขายอ้างอิง` · `เป้าหมายเทียบ L12M` · `เติมตามสัดส่วน L12M` · `คืนค่าตามยอดอ้างอิง` · `การเติบโตเทียบยอดอ้างอิง` · Decision log บนหน้าเว็บ
- Annual Target: คอลัมน์ `2024 · 2025 · L12M` (+ บรรทัดช่วงเดือน · Tooltip ปี 2025) · กราฟ 2 ใบ 55 : 45 (`charts.stackedColumns` ใหม่ + Waterfall จาก L12M · Hover ร่วมกับตาราง ·
  อัปเดตเมื่อแก้) · ส่งออกมีคอลัมน์ L12M
- Sub-channel Allocation: ส่วน A `2024 · 2025 · L12M` · ส่วน B แถว `ยอดขายอ้างอิง (บาท) ⓘ` · ปีใต้หัวเดือน (26 / 25) · เส้นแบ่ง ส.ค. | ก.ย. · ส่วน A สูงสุด 45%
- SKU Planning: `แสดงยอดอ้างอิง` · คอลัมน์ `L12M` · จุดประมาณการ ก.ย.–ธ.ค. + Tooltip + Legend · Tooltip ระบบเติม `ค่าตั้งต้น = ยอดจริงล่าสุดของเดือนนี้ (2026)` ·
  `core/layout.js` เลิกพับเมนูข้างเอง · ตาราง 260 / 90 / 110px (แสดงยอดอ้างอิง 84px · 13px) พอดี 1920 เมื่อเมนูเปิด
- Plan Summary: KPI `การเติบโตเทียบ L12M` · เส้นประ `ยอดขายอ้างอิง` · ตาราง `ยอดขาย L12M` · Waterfall และแท่งสัดส่วนเริ่มจาก L12M
- ตัวเลขตั้งต้นเปลี่ยน: L12M รวม 114,424,720 (+4.9%) · MT −5.0% · TT +5.2% · ECOM +20.8% · Waterfall 114.42 → 120.00 · แผน SKU 109.09 ล้านคงเดิม
- Test `node tests/run.js l12m` cr24-1..9 · ปรับ Test เดิม (v2 2028 · ph-5e · ph account · cr11-1 · cr12-6 · cr23-2) ตามฐาน L12M · เบราว์เซอร์ 209

## CR-23 — 2026-09-25 · Annual Target และ Sub-channel Allocation

(CR-22 ไม่ได้รับ ผู้ใช้ให้ทำ CR-23 ก่อน · ผู้ใช้อนุญาตแก้เพิ่ม: workflowBar ใน `core/components.js` (ปุ่มแก้ไขกดไม่ได้พร้อมเหตุผล) ·
`modules/sku-planning` 1 บรรทัด (ลิงก์ตอน Channel ยังไม่มีหน่วยขาย → Sub-channel Allocation) · TT ปี 2024 / 2025 สมมติ · ตัดมุมมองรวมทุก Channel)

- ชื่อ 4 ขั้นเป็นภาษาอังกฤษ (content.js + ค่าสำรองใน registry) · Tooltip ภาษาไทย · ข้อความที่อ้างชื่อหน้าและ Decision log ปรับตาม · `ไปที่หน้า {page}` มีช่องว่าง
- `data/history.js` ปี 2024 ทุกหน่วยขาย + TT 2024 / 2025 (MT ~9% · ECOM ~30–40% · TT ทรงตัว) · calc: ปีย้อนหลัง · ยอดขายย้อนหลัง · แถวส่งออกแยก 2 หน้า ·
  Audit การเปลี่ยนเป้าหมาย Channel · Channel ที่ยังไม่มีเป้าหมาย
- Annual Target (`modules/top-down`): เฉพาะแถว Channel · ยอดขาย 3 ปีใต้หัวกลุ่ม · ลิงก์ `{n} หน่วยขาย` · ⋯ เติมตามสัดส่วนปีก่อน / นำ Channel ออก · ตารางสูงตามแถว ·
  บันทึกแล้วเขียน Audit · ส่งออกพร้อมยอดขาย 3 ปี
- Sub-channel Allocation (`modules/phasing` · fit): ปุ่ม Channel + ตัวเลขของ Channel · บรรทัดแจ้งเมื่อเป้าหมาย Channel เปลี่ยน · ส่วน A ตารางหน่วยขาย (รวมทั้ง Channel ·
  จุดสถานะรายเดือน · คลิกเลือก) · ส่วน B รายเดือน (กราฟพับได้ · มุมมองรวม) · แก้ไขครั้งเดียวทั้ง 2 ส่วน · ส่งออก 2 ชีต · Channel เป้าหมาย 0 = แก้ไขไม่ได้
- สิทธิ์ `annualTarget` · `unitTargets` + แปลงค่าที่บันทึกไว้เดิม · หน้าบทบาทและสิทธิ์แสดง resource ใหม่ · Test `node tests/run.js targets` cr23-1..8 · เบราว์เซอร์ 200

## เอกสาร — 2026-09-25

แยก SPEC เป็น `docs/spec/` (architecture · data-model · ui-standards · business-rules · open-items · testing · pages/) · SPEC.md เหลือสารบัญ ·
ย่อ DECISIONS และ CHANGELOG · ลบต้นฉบับ CR-10 ถึง CR-21

## CR-21 — 2026-09-25 · หน้าบทบาทและสิทธิ์

- สิทธิ์เป็นข้อมูลที่แก้ได้: `data/permissions.js` (8 บทบาท + ผู้ดูแลระบบ · สิทธิ์ย่อย · ค่าตั้งต้น = ตาราง CR-19) · `data/users.js` (18 ผู้ใช้) → `master.roles / permissions / users`
- `core/permissions.js` เขียนใหม่ (ระดับ + ขอบเขตทีม · หลายบทบาทใช้สิทธิ์สูงสุด · กฎสิทธิ์ย่อย · ตรวจก่อนบันทึก) · `ui.role` เป็นผู้ใช้ (`userId`)
- หน้าใหม่ `modules/role-management` (กลุ่ม ตั้งค่าระบบ): เมทริกซ์สิทธิ์ · บทบาท · ผู้ใช้ · ส่งออก · ประวัติ · ดูตัวอย่างในมุมมองนี้
- layout ซ่อนหน้าที่ไม่เห็นจากเมนู / ขั้น / ลิงก์ · URL = `ไม่มีสิทธิ์เข้าถึงหน้านี้` · ไม่มีสิทธิ์ส่งออก = ซ่อนปุ่มส่งออก / CSV / พิมพ์
- Product Master 5 หน้าใช้ตารางสิทธิ์แทนการตรวจบทบาทเอง · ลบ `roleUsers` จาก `data/teams.js` · Test permissions 19 · เบราว์เซอร์ 192

## CR-20 — 2026-09-25 · แผน SKU: ค่าตั้งต้นจากยอดปีก่อน · เพิ่ม SKU · NPD โดย Sales

- ค่าตั้งต้น = ยอดขายเดือนเดียวกันปีก่อน (ตัดเมนู `ค่าตั้งต้น ▾`) · แผนตั้งต้นรวม 109.09 ล้าน (−9.1%) · `plan-seeds.js` สร้างใหม่
- แถบแก้ไข: ปรับทั้งหน่วยขาย ±% · ปรับให้ครบตามเป้าหมาย · + สร้าง NPD · แถวคงเหลือเมื่อขาดมีข้อความแนะนำ
- `+ เพิ่ม SKU` = Drawer จาก Product Master ทั้งหมด (ยังไม่ได้ Listing → Listing โดย Sales) · NPD โดย Sales บันทึกลง Product Master ทันที
- ฝั่งทีม Product: ป้าย `จาก Sales` · กลุ่ม `คำขอจาก Sales` · ป้าย `Listing โดย Sales` · Test cr20-1..9

## CR-19 — 2026-09-25 · บทบาท ทีมขาย สิทธิ์แยกตาม Module

- บทบาท Management · Director · Manager · Officer · ทีม Product · Supply Chain · ผู้ดูรายงาน (Trade Marketing เลิกใช้)
- ทีมขายต่อ Channel (`data/teams.js`) + หน้าใหม่ทีมขาย · สิทธิ์แผน SKU = สมาชิกทีม ไม่ใช่ผู้รับผิดชอบ
- workflowBar ตัดสินปุ่มตามสิทธิ์ + ข้อความอ่านอย่างเดียว + ปุ่มสลับ · Top-down 2 ระดับ · Director ทำเป้ารายเดือน · Test pm-1..11

## CR-18 — 2026-09-25 · ราคาและสูตร

- ราคารวม VAT · `Sale Amount` แทน Sell-out Amount · สูตร Net Sales ตาม Channel ในฟังก์ชันเดียว
- หน้า Promotion Price → ราคาขายต่อ Account (`master.accountPrices` · Flag `promotionCalendar` ปิด) · GP / Platform Fee ค่าเดียวทั้งปี
- seed ฉบับที่ 2 · `plan-seeds` / `actuals` สร้างใหม่ · `DATA_VERSION` 9 · ปิดคำถามค้างเรื่อง VAT และ GP ของ TT · Test cr18-1..8

## CR-17 — 2026-09-25 · ลดขอบเขตตาม Flow ใหม่ (Phase 1)

- Feature Flags (`core/features.js`) ซ่อนการอนุมัติ Baseline Re-forecast Sell-in และการอนุมัติแผน NPD · โค้ดและ Test คงไว้
- ขั้นที่ 4 ตัวนับ = ส่วนต่างหรือไม่มีผู้รับผิดชอบ · รายงาน DRAFT + ลายน้ำ · Test ft-1..5

## CR-16 — 2026-09-25 · เขตการขายและร้านค้า (TT)

- ร้านค้า TT จริง 220 ร้าน · 4 เขต · 5 Sales Person จาก seed (`core/stores.js`) แทนเขตสมมติ · `DATA_VERSION` 8
- หน้าใหม่: ข้อมูล ณ เดือน · แผงเขต · ตารางร้าน · ย้าย / นำออก / จัดสรรตามเขตแนะนำ · โอนทั้งเขต · Drawer Timeline · Test st-1..10

## CR-15 — 2026-09-25 · หน้าหมวดสินค้าและ Series

- มุมมองแบบคอลัมน์ + แผงรายละเอียด · แก้ทีละรายการ (เพิ่ม ย้าย รวม ปิด ลบ) · ตัวกรองข้ามมิติ · ตารางไขว้ · Series มีวันเริ่ม / สิ้นสุด
- `core/taxonomy.js` · `tests/run.js` (Node) · Test tx-1..12 (CR-14 ไม่ได้รับ)

## CR-13 — 2026-09-25 · การอนุมัติในแท็บติดตามสถานะ + มุมมองรวม

แท็บรายงานเป็นค่าเริ่มต้น · ตารางติดตามสถานะทุกหน่วยขาย · มุมมองรวมของหน้าเป้าหมายรายเดือน (อ่านอย่างเดียว · แท่งซ้อน)

## CR-12 — 2026-09-24 · รายงานสรุปแผน

แท็บติดตามสถานะ | รายงาน · เลขฉบับ BL + Snapshot + ลายน้ำ + ช่องลงนาม · ปลดล็อก Baseline · กราฟรายเดือนใหม่ · แกน Waterfall เลขกลม · `core/report.js`

## CR-11 — 2026-09-24 · หน้าวางแผน SKU: สินค้าจริง + กรอกง่าย

สินค้าจริง 117 SKU จาก seed (`core/seed.js`) · หน้าวางแผน SKU ใหม่ (ชื่อ 2 บรรทัด ค้นหา จัดกลุ่ม เรียง ยอดปีก่อน) · เครื่องมือช่วยกรอก + คีย์บอร์ด / Excel · `DATA_VERSION` 7

## CR-10 — 2026-09-23 · หน้าขั้นที่ 1

ชื่อขั้นตอนใหม่ · ปีแผนย้ายไปแถวหัวข้อ · ตัดแผงกราฟ · แท่งเทียบปีก่อนสเกลเดียวกันทั้งตาราง

## v1–v7 — 2026-09-23

- v1 โครงเว็บ HTML ล้วน · v2 ปีแผน Account Master % ↔ บาท Phasing Product Master · v3 + v4 Channel Master Workflow เขตการขาย ผู้รับผิดชอบ Side Menu
- v5 UX/UI Review (คำศัพท์ สี แถวคงเหลือ รายงาน หน้าเกี่ยวกับ Prototype) · v6 Product Master 5 หน้า productKey Status ราคา NPD Audit
- v7 unitLabel / gpLabel · % 2 คอลัมน์ · Waterfall · ส่งออก Excel / CSV · ทำความสะอาด: ลบหน้าที่ซ่อน 5 หน้าและโค้ดที่ไม่ได้ใช้
