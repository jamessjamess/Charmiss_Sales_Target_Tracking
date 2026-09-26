# Listing และวันเริ่มขาย (`modules/product-master`, id `productMaster`)

Product Master · fit · อิงปีแผน · ผู้แก้ไขตั้งต้น: ทีม Product (Listing) · Supply Chain (สิทธิ์ย่อย Clearance)

- ตัวกรอง: Channel (Segmented · `ui.productMaster.channel`) · ค้นหา · Series · Status · Item Type
- ตาราง:
  - SKU ติดซ้าย (รูปย่อ · ชื่อ · Series / Sub Series) · วันเริ่มขาย (อ่านอย่างเดียว) · Status
  - คอลัมน์ต่อหน่วยขาย ใต้หัวกลุ่ม `Listing ต่อ {unitLabel} · {Channel}`
- โหมดแก้ไข:
  - ผู้มีสิทธิ์ Listing ติ๊ก Listing ได้ (เลือกทั้งแถว / ทั้งคอลัมน์ เฉพาะแถวที่แสดง)
  - ผู้มีสิทธิ์ Clearance แก้ Clearance ผ่านฟอร์ม (Stock · ช่วงเดือน · ข้อความย่อไม่ตัดตัวเลข)
  - ป้ายข้างแถบบอกส่วนที่แก้ได้ตามสิทธิ์
- ช่องที่ Sales สร้าง Listing (เพิ่ม SKU / สร้าง NPD จากหน้าวางแผน SKU) มีป้าย `Listing โดย Sales` ให้ทีม Product ตรวจสอบ
