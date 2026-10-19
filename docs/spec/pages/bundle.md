# Bundle (`modules/bundle` · id `bundle`)

CR-37 · Product Master · ไอคอน `B` ต่อจาก Product List · fit · Flag `bundle` (ปิด = ไม่อยู่ในเมนู ไม่มีแถวในเมทริกซ์สิทธิ์ เปิดตรงไม่ได้ · registry `feature`) ·
สิทธิ์ `bundle` (ทีม Product = แก้ไข · Sales Director / Sales Manager / Sales Officer / Supply Chain = ดู · Management / ผู้ดูรายงาน = ไม่เห็นเหมือน Product List · ผู้ดูแลระบบ = แก้ไข)

- `modules/bundle/index.html` โหลด `modules/products/products.js` (+ products.css · bundle.css) · `SP.modules.bundle` = Drawer และโหมดแก้ไขชุดเดียวกับ Product List (ไม่เรียก Module อื่น)
- หัวหน้า: `Bundle` · `?` · `ส่งออก ▾` · `แก้ไข` (ไม่มีคำอธิบายใต้หัวข้อ) · แท็บ `รายการ Bundle | ความต้องการชิ้นส่วน` (`#list` / `#demand` · `ui.bundleTab`)

## แท็บรายการ Bundle

- KPI 4 ใบ (กด = กรอง): `Bundle ทั้งหมด` (ไม่รวม Delete) · `Active` · `อยู่ในแผน` (มีจำนวนในแผน SKU ปีแผนอย่างน้อย 1 หน่วยขาย · `calc.bundlePlanTotals`) ·
  `ชิ้นส่วนที่ต้องตรวจ` (ชิ้นส่วน Discontinued · Clearance · Delete = `settings.BUNDLE.checkStatuses`)
- ตัวกรอง: ค้นหา (รหัส / ชื่อ Bundle และรหัส / ชื่อชิ้นส่วน) · Status (ค่าเริ่มต้น `ไม่รวม Delete`) · Series · ชิ้นส่วน (SKU เดี่ยวที่อยู่ใน Bundle) · Chip ตัวกรอง · ข้อมูลที่ต้องตรวจ (`components.dataCheck`)
- ตาราง: Product Code · ชื่อ Bundle · Status · ส่วนประกอบ (Chip `12130 × 1` · Tooltip ชื่อและ Status · ชิ้นส่วนสถานะผิดปกติ = Chip เหลือง) · ชิ้น / ชุด ·
  ราคารวมชิ้นส่วน (RSP ณ เดือนปัจจุบันกลาง · `calc.bundleComponentPrice`) · RSP Bundle · ส่วนลด Bundle (`calc.bundleDiscount` · ติดลบสีแดง) · Series · แผนปี {ปี} (ชุด) · `›`
- ข้อมูลที่ต้องตรวจ 4 เกณฑ์: ชิ้นส่วนสถานะ Discontinued / Clearance / Delete · ชุดส่วนประกอบซ้ำกัน (`calc.duplicateBundleSets`) · ส่วนลดติดลบ · ไม่มี RSP
- โหมดแก้ไข: `+ สร้าง Bundle` (Drawer เปล่า: ชื่อ · ชื่อย่อ · ส่วนประกอบ · RSP · Product Code จาก `catalog.nextCode` Type Bundle เลขนำหน้า `90` · Status เริ่มต้น Planned) · ลบ Bundle ที่ไม่มีการอ้างอิง

## Drawer Bundle (กว้าง 50% · ใช้ร่วมกับ Product List)

- แท็บ ข้อมูลทั่วไป · ราคา · Listing และวงจรสินค้า · ประวัติการแก้ไข (3 แท็บหลังเป็นโค้ดเดียวกับสินค้าเดี่ยว) · หัว Drawer มีป้าย `Bundle`
- ข้อมูลทั่วไป: รหัส · ชื่อ · รูป (เหมือนสินค้าเดี่ยว) → `ส่วนประกอบ` → หมวดสินค้า (ระบบกำหนด Set & Bundle › Bundle › Bundle · อ่านอย่างเดียว) →
  Series (`ระบบกำหนดจากชิ้นส่วน` = `calc.bundleSeries` · แก้เอง = `seriesManual: true` ป้าย `ทีม Product กำหนดเอง` + ปุ่ม `ใช้ Series จากชิ้นส่วน`) → หมายเหตุ
- ส่วนประกอบ: ตาราง ชิ้นส่วน · ชื่อ · Status · จำนวน (− / + / ช่องกรอก) · RSP / ชิ้น · รวม · `นำออก` · `+ เพิ่มชิ้นส่วน` (ค้นหา SKU เดี่ยวที่ไม่ใช่ Bundle / Request / Delete · ซ้ำ = รวมจำนวน) ·
  แถวรวม `จำนวนชิ้นรวม N · ราคารวมชิ้นส่วน X บาท · RSP Bundle Y บาท · ส่วนลด Z%` · ผิดกติกา (`calc.bundleIssues`) = ข้อความแดงใต้ตาราง + ปุ่ม `บันทึก` ใช้ไม่ได้
- บันทึก: Bundle เดิมที่ส่วนประกอบเปลี่ยนและมีในแผน SKU → ถามยืนยัน `Bundle นี้มีในแผน N หน่วยขาย ความต้องการชิ้นส่วนจะคำนวณใหม่` · Store ตรวจกติกาซ้ำ (ปฏิเสธ = แจ้งแล้วอยู่ในโหมดแก้ไข)
- เปิดจากลิงก์ `อยู่ใน Bundle` ของ Product List: `ui.bundleFocus` (อ่านครั้งเดียว) → แท็บรายการ + Drawer ของ Bundle นั้น

## แท็บความต้องการชิ้นส่วน (อ่านอย่างเดียว · ไม่ใช่ยอดขาย)

- ตัวกรอง: ปีแผน (`components.yearPicker` · `app.planYear`) · Channel · หน่วยขาย · Series ของ SKU เดี่ยว · `หน่วย: ชิ้น`
- แถว = SKU เดี่ยวที่เป็นชิ้นส่วนของ Bundle อย่างน้อย 1 รายการ · 3 บรรทัด `ขายเดี่ยว` · `ผ่าน Bundle` (กางดูราย Bundle) · `รวม` (ตัวหนา) × ม.ค.–ธ.ค. + รวมปี (`calc.componentDemand`)
- หมายเหตุท้ายตาราง `จำนวนผ่าน Bundle ใช้ดูความต้องการสินค้าเท่านั้น ยอดขายนับที่ Bundle ไม่นับซ้ำที่ชิ้นส่วน` · ส่งออกตามตัวกรอง (รวมบรรทัดราย Bundle)
