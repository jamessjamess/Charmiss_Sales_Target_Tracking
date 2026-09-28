# Price & Promotion (`modules/promotions`, id `promotionPrice`)

CR-35 ชื่อหน้าภาษาอังกฤษ · คำอธิบายอยู่ในปุ่ม `?` · แท็บ `ราคาหลัก | Promotion Price | Clearance` (`ui.pricesTab`)

Product Master · fit · CR-30 แทนหน้าราคาขายต่อ Account (ราคาเดียวทั้งปี) และปฏิทิน Promotion รายวัน (Phase 2 · ตัดออกทั้งหมด)

สิทธิ์: หน้า = `prices` · ราคาหลัก = `prices.base` (ทีม Product แก้ไข) · Promotion Price = `prices.promo` (Sales Director แก้ไข · Sales Manager / Officer แก้เฉพาะ Channel ในทีม) ·
CR-35 แท็บ Clearance = สิทธิ์ย่อย `listing.clearance` เดิม (Supply Chain แก้ไข · สูงกว่าสิทธิ์หน้าได้ · registry `alsoPerms` ทำให้ Supply Chain เห็นหน้านี้โดยเห็นเฉพาะแท็บ Clearance)

## ราคาที่ใช้คำนวณ (`calc.resolvePrice` → `calc.resolveWith`)

0. CR-35 ราคา Clearance: เดือนที่อยู่ในช่วง Clearance ของหน่วยขายนั้น (`calc.clearanceActive` · `clearanceForUnit`) และมีราคา Clearance → ใช้แทนทุกลำดับ (source `clearance` · Tooltip `ราคา Clearance`)
1. Promotion Price ของหน่วยขายในเดือนนั้น
2. Promotion Price ระดับ Channel ในเดือนนั้น
3. ราคาหลักที่มีผล ณ เดือนนั้น: MT / ECOM / Export = RSP · TT = TT Dealer (`channel.priceBasis`)

- Tooltip ในหน้าวางแผน SKU บอกที่มา (`Promotion Price · 7-Eleven` / `Promotion Price · ทั้ง MT` / `RSP` / `TT Dealer`)
- ราคาทั้งหมดรวม VAT (`PRICE_INCLUDES_VAT`)

## แท็บราคาหลัก (`ui.pricesTab` = base)

- ราคา ณ เดือน [▾] · ตาราง SKU (จัดกลุ่มตาม Series) × ประเภทราคา (`PRICE_TYPES`: RSP · TT Dealer · TT Wholesale ว่างได้)
- ช่องที่เปลี่ยนในเดือนที่เลือกมีจุดเล็ก · คลิกช่อง → ประวัติราคา (เดือนที่มีผล · ราคา · ผู้บันทึก)
- โหมดแก้ไข: `+ บันทึกราคาใหม่` → เลือกเดือนที่มีผล (เดือนปัจจุบันหรืออนาคต) → กรอกเฉพาะ SKU ที่เปลี่ยน
- `นำเข้าจาก Excel`: ตรวจก่อนยืนยัน ค่าเดิม → ใหม่ (`catalog.priceImportDiff`)

## แท็บ Promotion Price

- Channel (Segmented · ร่วมกับหน้า Listing) · มุมมอง รายเดือน | ภาพรวมเดือน · Series · ค้นหา · ☐ ซ่อนหน่วยขายที่ไม่มีสินค้า Listing
- รายเดือน = ระดับ (ทั้ง Channel หรือหน่วยขาย) × 12 เดือนของปีแผน · ภาพรวมเดือน = เดือนที่เลือก × (ทั้ง Channel + หน่วยขาย)
- ช่อง: ราคาที่ได้รับมา (ตัวจาง · Tooltip ที่มา) · Promotion Price ที่ระดับนี้ (ตัวเข้ม พื้นอ่อน `−x%`) · ไม่ได้ Listing (พื้นเทา ว่าง)
- โหมดแก้ไข: Grid กลาง (วางจาก Excel · Ctrl+Z) · ลบค่า = ใช้ราคาที่ได้รับมา
  - เลือกหลายช่อง → `ตั้งราคา…` · `ลด x% จากราคาหลัก` · `คัดลอกไปเดือน…` · `คัดลอกไปหน่วยขาย…`
  - เตือน (ไม่บล็อก) เมื่อสูงกว่าราคาหลัก หรือต่ำกว่าเกิน 50% (`PROMO_PRICE_WARN_BELOW`)
- บันทึก `master.basePrices` / `master.promoPrices` + Audit log → มีผลทันทีกับ SKU Planning และแท็บราคาในรายการสินค้า

## แท็บ Clearance (CR-35)

- ตาราง 1 แถวต่อ SKU × ช่วง Clearance (`calc.clearanceRows` จาก `product.clearance`): SKU · ราคาหลัก (RSP ของเดือนเริ่ม · อ่านอย่างเดียว) · ราคา Clearance (บาท รวม VAT) · ส่วนลด (`calc.clearanceDiscount`) ·
  ช่วงเดือน (สิ้นสุดว่าง = `จนสินค้าหมด`) · หน่วยขาย (`ทุกหน่วยขาย` หรือที่เลือก) · วันหมดอายุ (ล็อตสุดท้าย · ไม่บังคับ) · หมายเหตุ · ปุ่มนำออก
- โหมดแก้ไข (สิทธิ์ย่อย Clearance): แก้ในช่อง · `+ เพิ่ม Clearance` = เลือก SKU สถานะ Active / Discontinued (`calc.clearanceCandidates`) · เดือนเริ่ม · ราคา →
  กด `บันทึก` แล้วถาม `เปลี่ยน Status ของ {ชื่อ} เป็น Clearance ตั้งแต่ {เดือน}` → Status เป็น Clearance ตั้งแต่เดือนเริ่ม · บันทึก `master.products` + Audit (`entity: 'product'`, field `clearance`)
- ผู้เห็นหน้าแต่ไม่มีสิทธิ์ย่อย: ดูอย่างเดียว + `ดูอย่างเดียว · แก้ Clearance ได้เฉพาะผู้มีสิทธิ์ Clearance`
- แท็บราคาหลัก / Promotion Price: แถวของ SKU ที่มีช่วง Clearance มีป้าย `Clearance` + ข้อความเทา `ใช้ราคา Clearance {ช่วงเดือน}` (ค่าในแท็บ Promotion ยังเป็นราคาที่แก้ในแท็บนั้น)
- ส่งออกแท็บ Clearance = ชีต `Clearance` ตามคอลัมน์ของตาราง
- CR-36 **แผน Clearance** (Supply Chain · ไม่นับใน รวมแผน · คงเหลือ · สถานะ ขาด / เกิน / ครบ ของ Sales Planning ทุกขั้น):
  - คอลัมน์เพิ่ม `สต็อกที่ต้องระบาย (ชิ้น)` (`stockQty` · กรอกเอง) · `แผนระบาย` (`calc.clearancePlanned`) · `คงเหลือสต็อก` (`calc.clearanceStockState`: 0 = ครบ เขียว · > 0 = ยังระบายไม่หมด เหลือง · < 0 = เกินสต็อก แดง) ·
    `Net Sales แผน {ปี}` (`calc.clearancePlanMonthly` · ราคา Clearance ตามสูตร Net Sales ของ Channel)
  - คลิกแถว (หรือ ▸) = ตารางย่อย หน่วยขายที่เลือก (`calc.clearanceUnitIds` · ทุกหน่วยขาย = หน่วยที่ Listing สินค้านี้ในปี) × เดือนในช่วง Clearance ของปีแผน · กรอกชิ้น (โหมดแก้ไข) ·
    `กระจายเท่ากันทุกเดือน` (`calc.clearanceDistribute` · แบ่งคงเหลือสต็อกเท่ากัน ปัดลง เศษเดือนสุดท้าย) · แถวรวมชิ้นและ Net Sales รายเดือน · เดือนนอกช่วง = 0
  - ผู้ไม่มีสิทธิ์ย่อย Clearance เห็น `ดูอย่างเดียว · แก้ไขได้โดย {บทบาท}` (`components.viewOnlyNote`)
  - SKU Planning ล็อกเดือน Clearance (`–`) · Plan Summary แสดงแยก `แผน Clearance (ไม่นับในเป้าหมาย)`
- **Phase 2**: หน้าจัดการ Clearance แยก (สต็อก ล็อต วันหมดอายุหลายล็อต) และรายงานรายได้แยก NPD / Existing / Clearance ต่อช่วงเวลา

## ย้ายข้อมูลเดิม (ตอนโหลด)

- RSP / ราคา Dealer เดิม → ราคาหลัก (`priceImport.baseFrom` 2024-01 + รอบเปลี่ยนราคาใน `data/pricing.js`)
- ราคาต่อ Account เดิม → Promotion Price ระดับหน่วยขายทุกเดือนของปี 2027 (เช่น 33400 ที่ 7-Eleven = 149)
- ตรวจแล้วราคาใหม่เท่าราคาเดิมทุกช่อง SKU × หน่วยขาย × เดือน (2025–2027) → ตัวเลข SKU Planning เท่าเดิม
