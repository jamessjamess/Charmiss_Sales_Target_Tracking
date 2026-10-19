# Product List (`modules/products`, id `productList`)

CR-35 ชื่อหน้าภาษาอังกฤษ (ทุกหน้าใน Product Master) · ไม่มีคำอธิบายใต้หัวข้อ · ข้อความเดิมเป็นบรรทัดแรกของปุ่ม `?` (`page.helpLead` → `components.pageHelp`)

Product Master · fit · ผู้แก้ไขตั้งต้น: ทีม Product · Status ณ เดือนปัจจุบันกลาง (`core/clock.js`) · Product Code และ Preset คอลัมน์จาก `core/catalog.js`

## CR-36 แท็บ · หมวดแบบลำดับชั้น · จัดกลุ่ม · Product Year · Drawer

- แท็บ `สินค้า | Product Level` ต่อจากหัวข้อ เหนือการ์ดสรุป (`ui.productListTab` · `#items` / `#level`) · แท็บ Product Level = หน้า Category & Series เดิมทั้งหมด (ดู [taxonomy.md](taxonomy.md)) ·
  เห็นเมื่อสิทธิ์ `taxonomy` ไม่ใช่ ไม่เห็น (ส่วนของหน้า Product List · ค่าเดิม ทีม Product / ผู้ดูแลระบบ แก้ไข) · โค้ดของ 2 แท็บอยู่ใน `modules/products/products.js` (`renderItems` · `renderLevel`)
- ตัวกรองหมวดสินค้า `components.treeSelect` (`calc.categoryOptions`): Category ตัวหนา · `- ` Sub Category · `-- ` Type · เยื้องตามระดับ · ช่องที่เลือกแสดงชื่อไม่มีเครื่องหมาย
- `จัดกลุ่ม: <เกณฑ์> ▾` (`components.groupPicker` · `calc.productGroupLevels` + `groupItems`): ไม่จัดกลุ่ม · Category · Sub Category · Type · Series (ค่าเริ่มต้น) ·
  Product Level (3 ชั้น) · Status · Product Year · หัวกลุ่ม `<ชื่อ> · N SKU` พับได้ทุกชั้น · จำต่อผู้ใช้ที่ `ui.groupBy.<ผู้ใช้>.productList`
- Product Year (`calc.productYear`): ตัวกรองเพิ่มเติม (หลายปี + `ยังไม่มี Listing`) · คอลัมน์เลือกได้ (ไม่อยู่ในค่าเริ่มต้น) · เกณฑ์จัดกลุ่ม
- คอลัมน์ค่าเริ่มต้นเพิ่ม `Sub Series` ต่อจาก Series (`PRODUCT_COLUMN_PRESETS.standard`) · ไม่มีแถบเลื่อนแนวนอนที่ 1920 · ตัวเลือก Status ค่าเริ่มต้น `ไม่รวม Delete`
- Drawer สินค้ากว้าง 50% ของจอ (ขั้นต่ำ 720px) · ช่องข้อมูล 2 คู่ต่อแถว · รูปอยู่ขวาของส่วนรหัสและชื่อ · ป้าย `ระบบกำหนด` = ลิงก์ไปแท็บ Product Level ที่เลือก Type นั้น (`ui.taxonomySelection`)

## CR-35 วงจรสถานะ · รหัสชั่วคราว · การ์ด

- Status 7 แบบตามลำดับ `Request` · `Planned` · `NPD` · `Active` · `Discontinued` · `Clearance` · `Delete` (ลำดับของตัวกรองทุกหน้า · กฎที่ [product-rules.md](../product-rules.md))
- KPI:
  - `ทั้งหมด` ไม่นับ Delete
  - `Active` + บรรทัดย่อย `Discontinued {n}`
  - `NPD` + บรรทัดย่อยกดได้ `ขอ NPD {n} · ยืนยันแล้ว {n} · เปิดขายแล้ว {n}` (Request · Planned · NPD)
  - `ยังไม่เปิดใน TRCLOUD` = จำนวน Request (ไม่มีรหัส 5 หลัก) + บรรทัดย่อย `รหัสชั่วคราว`
- ตัวกรอง Status ค่าเริ่มต้น `ทุก Status ยกเว้น Delete` (+ `ทั้งหมด`) · `ตัวกรองเพิ่มเติม` เพิ่ม `ประเภทรายได้` (NPD / Existing / Clearance · `calc.revenueTypeOf`) · ค้นหาด้วย Product Code รหัสชั่วคราว หรือชื่อ
- คอลัมน์รหัส = `calc.productCode` (คำขอ = `NPD-YYMM-NNN`) · ป้าย `ชื่อชั่วคราว` เฉพาะ Request (`components.tempNameTag` · ไม่ใช่ส่วนของชื่อ) · ป้าย `จาก Sales` ต่อท้ายชื่อ (ไม่ถูกตัด)
- Drawer ของคำขอ: รหัสชั่วคราว + ปุ่ม `ยืนยันเป็น NPD` (ทีม Product) → กล่องยืนยัน (`components.confirmRequestDialog`: ชื่อสินค้าจริง · Type · รหัส 5 หลักที่จะได้) → `catalog.confirmRequest` บันทึกทันที + Audit + Toast
  - ได้ Product Code จากตัวสร้างเดิม (`catalog.nextCode`) · `tempCode` เก็บไว้ (ช่อง `รหัสชั่วคราวเดิม` · ค้นหาได้) · Key เดิม (`REQ-nnn`) แผน SKU / Listing / ราคาอยู่ครบ · Status Request → Planned
- Drawer แท็บ Listing และวงจรสินค้า: `Delete ตั้งแต่เดือน` (โหมดแก้ไข) · บันทึกแล้วสินค้ายังมีในแผน = ถาม `สินค้านี้มีในแผน {n} หน่วยขาย` ก่อน (แถวในแผนอ่านอย่างเดียว ไม่ล้างค่าให้อัตโนมัติ)
- ลิงก์ Listing ใน Drawer → [Launch & Listing](launch-listing.md) แท็บ Listing ของสินค้านั้น

## โครงหน้า (CR-30)

- KPI 6 ใบกดกรองได้: ทั้งหมด · Active · NPD · ขาดข้อมูลจำเป็น · ขาดข้อมูลที่ควรมี · ยังไม่เปิดใน TRCLOUD
- ตัวกรองแถวแรก (แสดงตลอด): ค้นหา · Status · Series · หมวดสินค้า (ลำดับชั้นในตัวเดียว) · มุมมอง รายการ | จัดกลุ่ม
- ปุ่ม `ตัวกรองเพิ่มเติม (n)` กางแถวที่สอง (`ui.productMoreFilters`): Channel ที่ Listing · ความครบถ้วน · ที่มา (ทีม Product / จาก Sales) · ใน TRCLOUD
- ตัวกรองที่ใช้อยู่เป็น Chip (× + ล้างทั้งหมด) · รับตัวกรองจากหน้าหมวดสินค้าและ Series (`ui.productFilterHandoff`) ครั้งเดียว
- ปุ่มขวา: `คอลัมน์ ▾` (`components.columnPicker` + Preset ส่วนตัวต่อผู้ใช้ใน `ui.columnPresets`) · `ส่งออก ▾` · `เปรียบเทียบกับ ERP`
- ตาราง: Product Code และชื่อ (ชื่อย่อ · Tooltip ชื่อเต็ม) แสดงเสมอและติดซ้าย · คอลัมน์อื่นเลือกและเรียงได้ · หัวติดบน เลื่อนภายในการ์ด
- ป้าย `ระบบกำหนด` = หมวดสินค้าที่เดาจากชื่อ · `จาก Sales` = สินค้าที่ Sales สร้างจากหน้าวางแผน SKU

## Product Code

- ระบบสร้างเสมอและเป็นเลขเดียวกับ TRCLOUD: `{เลขนำหน้าของ Type 2 หลัก}{3 หลัก}` = รหัสสูงสุดของกลุ่ม ปัดขึ้นเป็นขั้นถัดไปของ `CODE_STEP` (12240 → 12250 · 11032 → 11040)
- เลขที่ใช้แล้วไม่กลับมาใช้ซ้ำ (`master.codeCounters`) · Type ที่ยังไม่มีเลขนำหน้า (กำหนดที่หน้าหมวดสินค้าและ Series) → สร้างสินค้าไม่ได้
- ฟอร์มแสดงรหัสพร้อมไอคอนกุญแจ แก้ไม่ได้ · ตัด Internal Code · Item Type · รหัสชั่วคราว · ปุ่มผูกรหัสจริง
- รหัสชั่วคราวเดิม (`NPD_2027Q2_*`) แปลงเป็นรหัสระบบตอนโหลด (`catalog.assignSystemCodes`) และย้ายการอ้างอิงทุกที่ (แผน SKU · Listing · ราคา · แผน NPD · ยอดจริง)
- `ใน TRCLOUD` (ยังไม่เปิด / เปิดแล้ว) เปลี่ยนเมื่อกด `ปรับสถานะตามผลเปรียบเทียบ` ในหน้าต่างเปรียบเทียบกับ ERP (โหมดแก้ไข) เท่านั้น

## Drawer 4 แท็บ

- ข้อมูลทั่วไป: Product Code (ล็อก) · ชื่อ · หมวดสินค้า (Category › Sub Category › Type) · Series · ขนาด · รูป · ใน TRCLOUD
- ราคา (อ่านอย่างเดียว): ราคาหลักตามรอบเวลา + Promotion Price ของสินค้านี้ · ลิงก์ไปหน้าราคาและ Promotion
- Listing และวงจรสินค้า: Status 12 เดือน · Clearance · แผน NPD
- ประวัติการแก้ไข: `master.audit`

## โหมดแก้ไข (ทีม Product)

- `+ เพิ่ม SKU`: เลือก Type ก่อน แล้วเห็นรหัสที่จะได้ · บันทึกราคา RSP ตั้งต้นเป็นราคาหลัก
- `นำเข้าด้วยรหัสเดิม` (รายการที่มีใน TRCLOUD แต่ไม่มีใน Master): เดาหมวดจากชื่อ · Series และเดือนเปิดตัวว่าง → ขาดข้อมูลจำเป็นจนกว่าจะเติม
- ลบได้เฉพาะ SKU ที่ไม่มี Listing ราคา หรือแผน NPD
- ความครบถ้วน: จำเป็น = `PRODUCT_REQUIRED` (Product Code · ชื่อ · หมวด 3 ระดับ · Series · RSP · เดือนเปิดตัวหรือไตรมาส) · ควรมี = `PRODUCT_RECOMMENDED` (Barcode · รูป) · Sub Series ไม่บังคับ

## CR-37 Bundle

- สินค้าแบบ Bundle แสดงในตารางเหมือนสินค้าทั่วไป + ป้าย `Bundle` ต่อท้ายชื่อ (`components.bundleTag`) · KPI นับรวม Bundle
- ตัวกรองเพิ่มเติม `ประเภทสินค้า` (สินค้าเดี่ยว / Bundle · `filters.kind` · `calc.productKind`) · Chip ตัวกรอง
- `›` ของแถว Bundle เปิด Drawer เดียวกับหน้า [Bundle](bundle.md) (ส่วนประกอบในแท็บข้อมูลทั่วไป · แก้ได้ในโหมดแก้ไขของ Product List)
- Drawer SKU เดี่ยว: บรรทัด `อยู่ใน Bundle: 90100 (×2) · 90200 (×1)` (`calc.bundlesContaining`) ลิงก์ไปหน้า Bundle (`ui.bundleFocus`)
- Flag `bundle` ปิด = ไม่มีแถว ป้าย ตัวกรอง และบรรทัด อยู่ใน Bundle
