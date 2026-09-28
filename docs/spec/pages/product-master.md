# Launch & Listing · แท็บ Listing (เดิมหน้า Listing `modules/product-master`, id `productMaster`)

CR-35 ย้ายเป็นแท็บ Listing ของ [launch-listing.md](launch-listing.md) (โค้ดเดิม · `renderListing`) · หน้าเดิมพาไป `launch-listing/index.html#listing` · สิทธิ์ `launchListing` (สิทธิ์ย่อย `listing.clearance` คงเดิม)

- CR-35 Chip `เฉพาะสินค้าใหม่` (Request · Planned · NPD ณ เดือนที่เลือก) · ค้นหาด้วย Product Code / รหัสชั่วคราว · มาจาก `ดู Listing` = ค้นหาสินค้านั้นครั้งเดียว (`ui.listingFocus`)
- CR-35 Clearance: เดือนสิ้นสุดว่างได้ (= จนสินค้าหมด) · แก้ช่วงเดือนแล้วราคา / หน่วยขาย / หมายเหตุคงเดิม (แก้ที่ Price & Promotion แท็บ Clearance)

Product Master · fit · ข้อมูล ณ เดือน (ไม่อิงปีแผน · CR-30) · ผู้แก้ไขตั้งต้น: ทีม Product (สิทธิ์ `listing`) · Supply Chain (สิทธิ์ย่อย `listing.clearance`)

## ข้อมูล Listing (`master.listings`)

- 1 รายการต่อสินค้า × หน่วยขาย: `{ productKey, accountId (= unitId), status, fromMonth, toMonth, addedBy… }`
  - `status`: `offered` เสนอขาย (กำลังเสนอคู่ค้า) · `listed` วางขาย · `delisted` ถอดแล้ว · ไม่มีรายการ = ไม่เคย Listing
  - `fromMonth` = เดือนเริ่มวางขายในหน่วยนั้น (ว่าง = ตามเดือนเปิดตัวของสินค้า) · `toMonth` = เดือนสุดท้ายที่วางขายก่อนถอด
- ย้ายข้อมูลเดิม (`calc.normalizeListings` ตอนโหลด): Checkbox เดิม → `วางขาย` · `fromMonth` = เดือนเริ่มขายต่อหน่วยจากแผน NPD หรือเดือนเปิดตัวของสินค้า
- เดือนเปิดตัวระดับ SKU ยังใช้คำนวณ Status NPD · เลิกขายระดับ SKU ยังอยู่ (Discontinued = ถอดทุกหน่วย)

## โครงหน้า

- หัวหน้า: `Listing` · ข้อมูล ณ เดือน [▾] (ค่าเริ่มต้น = เดือนปัจจุบันกลาง) · `?` (กฎ Status และวิธีเติมยอด ย้ายจากกล่องในหน้า) · `ส่งออก ▾` · `แก้ไข`
- แถบเครื่องมือ: แท็บ Channel ที่ใช้งาน (`ui.productMaster.channel`) · ค้นหา · Series · Status · สถานะ Listing (หลายค่า) · อายุ · ☐ ไม่มียอด ≥ 3 เดือน
  - อายุ / ไม่มียอด ใช้นิยามเดียวกับ SKU Planning (`calc.salesAge` · `calc.ageMatch`) เพื่อประเมินการถอด Shelf · แถวแสดงเมื่อมีหน่วยขายอย่างน้อย 1 หน่วยตรงเงื่อนไข
  - ตัดตัวกรอง Item Type
- ตาราง 1 แถวต่อ SKU:
  - SKU ติดซ้าย: รูปย่อ · ชื่อสั้น · Product Code · Series · Badge Status (ณ เดือนที่เลือก) หรือ `Discontinued {เดือน}`
  - `ความครอบคลุม` = หน่วยขายที่วางขาย ณ เดือนที่เลือก ÷ หน่วยขายที่ใช้งานใน Channel นี้ (`calc.listingCoverage` · ไม่นับข้าม Channel · เสนอขายไม่นับ)
  - คอลัมน์ต่อหน่วยขายใต้หัวกลุ่ม `Listing ต่อ {unitLabel} · {Channel}` (แท็บ TT = เขตการขาย) · หัวคอลัมน์แสดงจำนวน SKU ที่วางขาย
  - ช่อง 2 บรรทัด: สัญลักษณ์ `✓` วางขาย · `◌` เสนอขาย · `✕` ถอดแล้ว + เดือนเริ่ม (ถอดแล้ว + `– เดือนถอด`) / บรรทัดเล็ก = อายุการขายในหน่วยนั้น หรือ `ไม่มียอด {n}ด`
  - สีเฉพาะสัญลักษณ์ (ไม่ทาพื้นทั้งช่อง) · Clearance (Supply Chain) ท้ายตาราง
  - ตัดคอลัมน์วันเริ่มขาย · Status ปีแผน · เลิกขาย

## โหมดแก้ไข

- คลิกช่อง → Popover: สถานะ (ไม่เคย Listing · วางขาย · เสนอขาย · ถอดแล้ว) · เดือนเริ่มวางขาย · วางขายถึงเดือน (เมื่อถอด) · ประวัติ 5 รายการล่าสุด · ทางลัด `เลือกทั้งแถว` · `ทั้งคอลัมน์ {หน่วยขาย}` · `ทั้ง Series {Series} ใน {หน่วยขาย}`
- Shift / Ctrl + คลิก หรือปุ่ม `เลือก` ที่หัวแถว / หัวคอลัมน์ = เลือกหลายช่อง → แถบลอยด้านล่าง `วางขายตั้งแต่…` · `ถอดตั้งแต่…` (เดือนสุดท้ายที่วางขาย = เดือนก่อนหน้า · ข้ามช่องที่ไม่เคย Listing) · `เสนอขาย` · `ล้างที่เลือก`
- ถอดสินค้าที่ยังมีแผน SKU หลังเดือนถอด → กล่องยืนยัน `มีแผน {x} ชิ้น ({y} บาท) ในเดือนที่จะถูกล็อก` (`calc.plannedAfter` · แจ้งเท่านั้น)
- ช่องที่ Sales สร้าง Listing (เพิ่ม SKU / สร้าง NPD จาก SKU Planning · CR-20) มีป้าย `Listing โดย Sales`
- บันทึก = `master.listings` + `master.products` (Clearance) + Audit log (`entity: 'listing'`, key `{productKey}|{unitId}` · ค่าเดิม → ใหม่เป็นข้อความ)

## ผลต่อ SKU Planning

- เดือนก่อน `fromMonth` = ล็อก 0 เหตุผล `ก่อนเดือนเริ่มวางขายใน Listing` · เดือนหลัง `toMonth` ของสินค้าที่ถอด = ล็อก 0 เหตุผล `ถอดจาก Listing แล้ว` (`calc.listingOutside`)
- แผนตั้งต้นใช้เฉพาะ Listing ที่มีช่วงทับปีแผนและไม่ใช่เสนอขาย (`calc.listedInYear`) · `เสนอขาย` เพิ่มเข้าแผนได้พร้อมป้าย `ยังไม่ยืนยัน Listing`
