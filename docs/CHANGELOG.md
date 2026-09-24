# CHANGELOG

ประวัติการเปลี่ยนแปลงของ Prototype (ใหม่สุดอยู่บน) — สร้างใน CR-11 วันที่ 2026-09-24 รายการก่อนหน้าสรุปจาก CR เดิม

## CR-12 — 2026-09-24 · รายงานสรุปแผน: กราฟ ตาราง และแท็บติดตามสถานะ

`docs/change-requests/CR-12_summary-report.md`

### ขั้นที่ 4

- แบ่งเป็น 2 แท็บ (จำที่ `ui.summaryTab`): **ติดตามสถานะ** (ค่าเริ่มต้นก่อนล็อก) · **รายงานสรุปแผน** (ค่าเริ่มต้นหลังล็อก พิมพ์ได้เฉพาะแท็บนี้)
- ติดตามสถานะ: บรรทัดสถานะทั้งปี · ล็อก / **ปลดล็อก Baseline** (ใหม่ ต้องมีเหตุผล) · ตารางรายการที่ต้องดำเนินการ (Channel · หน่วยขาย · ผู้รับผิดชอบ ·
  ส่วนต่าง · เป้าหมายรายเดือน · แผน SKU · การดำเนินการถัดไป) เรียงตามความรุนแรง + ตัวกรอง / ตัดรายการแบบประโยคยาวเดิม
- เมนูข้างของขั้นที่ 4 แสดงจำนวนรายการที่ต้องดำเนินการ (ข้อมูลตั้งต้น 9)
- รายงาน: หัวรายงาน (เลขฉบับ `{ปี}-BL-{nn}` / `{ปี}-DRAFT` · สถานะ · จัดสรรเป้าหมายประจำปี · พิมพ์เมื่อ) · ลายน้ำฉบับร่างทุกหน้า ·
  ล็อกแล้วตัวเลขทั้งหมดจาก Snapshot · ส่วนการอนุมัติ · ช่องลงนาม Sales Director / Management
- ตาราง: เพิ่ม `% ของ Total` · ตัดคอลัมน์ Top-down (ย้ายไปหัวรายงาน) · สถานะอนุมัติ Phasing + SKU เป็นไอคอน 2 ตัว + คำอธิบายใต้ตาราง ·
  ผู้รับผิดชอบบรรทัดเดียว / พิมพ์: หัวคอลัมน์ไม่ซ้อน หัวตารางซ้ำทุกหน้า ไม่ตัดแถว ไม่พิมพ์ ⓘ · 4 หน้า A4 แนวนอน

### กราฟ

- `charts.barLine` ใหม่: แท่งเป้าหมายสีอ่อน · แผนเส้นทึบ 3px มีจุด · ยอดปีก่อนเส้นประ 1.5px · ป้ายท้ายเส้น · Legend ตรงกับที่วาด · Tooltip รายเดือน ·
  แกน Y เริ่ม 0 ค่าสูงสุด × 1.10 ปัดเป็นเลขกลม 4–6 เส้น
- `charts.waterfall`: แกนเริ่มเลขกลม (`axisStart`) · แท่งยอดรวมเริ่มจุดเดียวกัน · เส้นแบ่งแกน + ตัวเลข · สัญลักษณ์ตัดแกน
- กราฟรายเดือน : ที่มาของการเติบโต = 60 : 40 สูงเท่ากัน (จอ < 1280px เรียงลง)

### ส่วนกลาง

- `core/report.js` (ใหม่): ข้อมูลขั้นที่ 4 ใช้ร่วมกับ Side Menu · `core/calc.js`: `niceAxis`, `axisStart`, `niceScaleMax(values, { headroom })`, `mergeMix`,
  `planActions` · `core/workflow.js`: `unlock`, `lastOf`, `baselineVersion`, `addBaselineVersion`, `approvalRows`
- `data/settings.js`: `CHART_*`, `AXIS_START_RULES`, `BASELINE_CODE` / Token `--chart-target`, `--chart-plan`, `--chart-lastyear`, `--watermark-fg`
- store: `plan.<ปี>.baselineVersions`, `ui.summaryTab` / Test 120 → 129

## CR-11 — 2026-09-24 · หน้าวางแผนยอดขายราย SKU: สินค้าจริง + กรอกง่าย

`docs/change-requests/CR-11_sku-planning-ux.md`

### ข้อมูล

- เพิ่ม `data/seed/seed-charmiss.js` (สร้างจาก Excel ห้ามแก้ด้วยมือ) และ `core/seed.js` นำเข้าตอนโหลด
- ลบสินค้าตัวอย่างเดิมทั้งหมด → สินค้าจริง 117 SKU + สินค้าใหม่ 2027 รหัสชั่วคราว 3 รายการ (รวม 120) / Series 8 รายการจาก Campaign /
  หมวดสินค้า Face · Cheek · Lip · Eye · Skincare กำหนดจากคำในชื่อ (`inferred`) / 5 SKU Existing ไม่มี Series
- Listing: 7-Eleven 11 · EVEANDBOY 76 จาก Excel / หน่วยอื่นตามกฎใน `data/listings.js`
- Price List รองรับ `accountId` (ราคาเฉพาะ Account) · TT ใช้ราคา Dealer (`priceBasis: 'SELL_IN'`) · ราคาตัวอย่างเปลี่ยน ก.ค. 2027
- ยอดขายปีก่อนราย SKU (`history.years.2026.skuQty`) และ Run-rate คำนวณจากข้อมูลจริง / GP EVEANDBOY 45%
- Promotion, แผน NPD (3 แผน), ยอดขายจริงปี 2027, ค่าตั้งต้นรายช่อง และข้อมูล ERP สร้างใหม่บนสินค้าจริง (กำหนดตายตัว ไม่สุ่ม)
- `DATA_VERSION` 6 → 7 (ค่าที่ลองแก้ไว้จากรุ่นก่อนถูกล้างครั้งเดียว)

### Business Rule

- ค่าตั้งต้นของช่องระบบเติม = ยอดขายเดือนเดียวกันปีก่อนของ SKU × การเติบโตของหน่วยขาย (เลือก Run-rate × Seasonality ได้ต่อหน่วยขาย)

### หน้าวางแผนยอดขายราย SKU

- คอลัมน์ชื่อ 2 บรรทัด (ชื่อย่อ + Chip Status เดียว / TR Code · Series) แถวสูงคงที่
- แถวเครื่องมือ: ค้นหา · จัดกลุ่ม (Series | Status | ไม่จัดกลุ่ม) + พับ/กางทั้งหมด · เรียง · แสดงยอดปีก่อน (บรรทัดเล็ก + คอลัมน์ปีก่อน / การเติบโต)
- หัวกลุ่มมีผลรวม (แทนแถวรวม Series ที่เลือก) / แถวข้อความ SKU ที่มียอดปีก่อนแต่ไม่อยู่ในแผน
- เครื่องมือช่วยกรอก: ยอดทั้งปี · ⋯ ของแถว · เลือกหลายแถว · ปิดส่วนต่าง (ก่อน/หลัง + ยืนยัน) · คีย์บอร์ดและ Excel · Ctrl+Z · ▲/▼ ต่างจากปีก่อน
- แถวรวมต่อจากแถวสุดท้าย ติดล่างเฉพาะเมื่อล้น · Hover ไฮไลต์แถวและหัวคอลัมน์ · คงเหลือแสดง % ของเป้าหมาย · เมนูข้างพับเองเมื่อจอ < 2200px
- Legend ย้ายไปอยู่ในแผง ? (พร้อมคีย์ลัด)

### ส่วนกลาง

- `core/calc.js`: `defaultPlanQty`, `growthFactor`, `skuHistory`, `runRateFrom`, `displayName`, `inferCategory`, `primaryStatus`, `anomalyMark`,
  `distributeAnnual`, `annualWrites`, `scaleRows`, `lastYearWrites`, `clearWrites`, `closeGap`, `closeGapWrites`, `applyWrites`, `resetRows`,
  `parseTsv`, `toTsv`, `pasteCells`, `fillCells`, `sortPlanRows`, `groupPlanRows`, `priorOutsidePlan` / `priceOn` รองรับ `accountId`
- `core/components.js`: `gridKeys`, `undoStack`, `promptNumber` / `dialog` opts `body`, `wide` / `menuButton` รายการ `disabled`, `danger`
- หน้ารายการสินค้า: ชื่อย่อ · ป้าย "ระบบกำหนด" ของหมวดสินค้า · ราคาเฉพาะ Account ในประวัติราคา
- เพิ่ม `docs/SPEC.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md` / Test 108 → 120

## CR-10 — 2026-09-23 (แก้ข้อ 3.4 2026-09-24) · ปรับหน้าขั้นที่ 1

`docs/change-requests/CR-10_top-down-layout.md` — ชื่อขั้นตอนใหม่ (จัดสรรเป้าหมายประจำปี / รายเดือน / วางแผนยอดขายราย SKU) · ปีแผนย้ายไปแถวหัวข้อ ·
ตัดแผงกราฟหน้าขั้นที่ 1 · แท่งเป้าหมายเทียบปีก่อนสเกลจริงเดียวกันทั้งตาราง (รวมในรายงานสรุปแผน)

## ทำความสะอาด — 2026-09-23

ลบหน้าที่ซ่อนไว้ 5 หน้า (home, master-data, sku-status, measure-chain, approval) และโค้ดที่ไม่ได้ใช้ (Mermaid, donut, barList ฯลฯ)

## v7 (CR-09) — 2026-09-23 · Top-down

`PROMPT_change_v7_top-down.md` — unitLabel / gpLabel · % 2 คอลัมน์ · การเติบโตเป็นบาท · Waterfall + แท่งสัดส่วน · ส่งออก Excel / CSV · ค่าตั้งต้นตามสัดส่วนปีก่อน

## v6 — 2026-09-23 · Product Master

`PROMPT_change_v6_product-master.md` — Product Master 5 หน้า · productKey · Status 5 ค่า · ความครบถ้วน · ราคาตามวันที่มีผล · Promotion · แผน NPD + Workflow ·
รหัสชั่วคราว / ผูกรหัสจริง · Audit log

## v5 — 2026-09-23 · UX/UI Review

`PROMPT_change_v5_ux-review.md` — คำศัพท์ · สีคงเหลือ · แถวคงเหลือ · หัวหน้า · บทบาทอ่านอย่างเดียว · แถบบริบท · รายงานสรุปแผน · หน้าเกี่ยวกับ Prototype · ข้อมูลตั้งต้น

## v3 + v4 — 2026-09-23 · Channel Master, Workflow, เขตการขาย

`PROMPT_change_approval-topdown-v3.md`, `PROMPT_change_v4.md` — Channel Master · Workflow ต่อขั้น · เขตการขาย + ผู้รับผิดชอบตามช่วงเดือน · Side Menu · Series · โหมดแก้ไข

## v2 — 2026-09-23 · Top-down / Phasing / SKU

`PROMPT_change_top-down-v2.md`, `PROMPT_change_phasing-v2.md`, `PROMPT_change_sku-v2.md` — ปีแผน · Account Master · % ↔ บาท · ตาราง Phasing · Product Master · โหมดแผน

## v1 — 2026-09-23 · Concept Prototype

`PROMPT_concept-prototype.md` — โครงเว็บ HTML ล้วน · Top-down · Phasing · SKU · Test สูตร
