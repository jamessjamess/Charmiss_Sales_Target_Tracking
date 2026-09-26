# รายการสินค้า (`modules/products`, id `productList`)

Product Master · fit · ผู้แก้ไขตั้งต้น: ทีม Product

- KPI 5 ใบกดกรองได้: ทั้งหมด · Active · New · ขาดข้อมูลจำเป็น · ขาดข้อมูลที่ควรมี
- แถบตัวกรองแถวเดียว:
  - ค้นหารหัส / ชื่อ · มุมมองรายการ | จัดกลุ่มตาม Series
  - Status · หมวดสินค้า (ทุกระดับ) · Series · Channel · Item Type · ความครบถ้วน · ที่มา (ทีม Product / จาก Sales)
- รับตัวกรองจากหน้าหมวดสินค้าและ Series (`ui.productFilterHandoff`) ครั้งเดียว
- เลือกคอลัมน์เพิ่มเติมได้ (`ui.productColumns`) · รูปและรหัสติดซ้าย · ส่งออก CSV (BOM)
- ป้าย:
  - `ระบบกำหนด` = หมวดสินค้าที่กำหนดจากคำในชื่อ (เลือกหมวดเองแล้วป้ายหายไป)
  - `จาก Sales` = สินค้าที่ Sales สร้างจากหน้าวางแผน SKU
- Drawer 4 แท็บ:
  - ข้อมูลทั่วไป: รหัส · ชื่อ · หมวดสินค้า · Series · ขนาด · รูป (เลือกหมวดและ Series จาก Master เท่านั้น)
  - ราคา: ประวัติ RSP / ราคา Dealer + ราคาใหม่ตามวันที่มีผล + ราคาต่อ Account ของ SKU (Promotion เฉพาะเมื่อเปิด Flag)
  - Listing และวงจรสินค้า: Status 12 เดือน · Clearance · แผน NPD
  - ประวัติการแก้ไข: `master.audit`
- `+ เพิ่ม SKU` ด้วย TR Code หรือรหัสชั่วคราว
- `ผูกรหัสจริง` (โหมดดู + กล่องยืนยัน):
  - ย้าย Listing ราคา ราคาต่อ Account Promotion แผน NPD และแผน SKU ทุกปีไปที่ TR Code
  - รหัสชั่วคราวเก็บใน `tempCodeHistory` · รหัสห้ามซ้ำ
- ลบได้เฉพาะ SKU ที่ไม่มี Listing ราคา ราคาต่อ Account Promotion หรือแผน NPD
- `เปรียบเทียบกับ ERP` (Drawer):
  - แสดงความต่างของชื่อ / RSP / Barcode · รายการที่มีใน ERP แต่ไม่มีใน Master และกลับกัน
  - ในโหมดแก้ไขกดใช้ค่าจาก ERP ได้
