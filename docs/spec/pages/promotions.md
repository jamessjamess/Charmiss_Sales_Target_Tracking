# ราคาและ Promotion (`modules/promotions`, id `promotionPrice`)

Product Master · fit · CR-30 แทนหน้าราคาขายต่อ Account (ราคาเดียวทั้งปี) และปฏิทิน Promotion รายวัน (Phase 2 · ตัดออกทั้งหมด)

สิทธิ์: หน้า = `prices` · ราคาหลัก = `prices.base` (ทีม Product แก้ไข) · Promotion Price = `prices.promo` (Sales Director แก้ไข · Sales Manager / Officer แก้เฉพาะ Channel ในทีม)

## ราคาที่ใช้คำนวณ (`calc.resolvePrice`)

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

## ย้ายข้อมูลเดิม (ตอนโหลด)

- RSP / ราคา Dealer เดิม → ราคาหลัก (`priceImport.baseFrom` 2024-01 + รอบเปลี่ยนราคาใน `data/pricing.js`)
- ราคาต่อ Account เดิม → Promotion Price ระดับหน่วยขายทุกเดือนของปี 2027 (เช่น 33400 ที่ 7-Eleven = 149)
- ตรวจแล้วราคาใหม่เท่าราคาเดิมทุกช่อง SKU × หน่วยขาย × เดือน (2025–2027) → ตัวเลข SKU Planning เท่าเดิม
