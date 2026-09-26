# CHANGELOG

ประวัติการเปลี่ยนแปลงของ Prototype (ใหม่สุดอยู่บน) · CR ที่ทำเสร็จแล้วลบต้นฉบับออกจาก `docs/change-requests/` เหลือสรุปที่นี่

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
