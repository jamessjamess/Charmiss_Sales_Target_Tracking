# Business Rules · สินค้า ราคา Listing (Product Master)

แยกจาก `business-rules.md` ตอน CR-30 (ไฟล์เดิมใกล้ 30 KB) · สิทธิ์อยู่ที่ `permissions.md` · โครงข้อมูลที่ `data-model.md`

## Status (CR-35 วงจร 7 สถานะ · `calc.PRODUCT_STATUSES`)

| ลำดับ | Status | ความหมาย | รหัส | อยู่ในแผน SKU | ประเภทรายได้ (`calc.revenueTypeOf` · ใช้ Phase 2) |
|---|---|---|---|---|---|
| 1 | Request | คำขอ NPD จาก Sales ที่ทีม Product ยังไม่ยืนยัน (`calc.isRequestProduct` = `SALES_REQUEST` ที่ไม่มี Product Code) | รหัสชั่วคราว `NPD-YYMM-NNN` | ได้ (`ขอ NPD`) | NPD |
| 2 | Planned | NPD ที่ยืนยันแล้ว ยังไม่เริ่มขาย | 5 หลัก | ได้ (`NPD ยืนยันแล้ว`) | NPD |
| 3 | NPD | เปิดขายแล้ว `NPD_MONTHS` เดือนแรก (ค่าภายใน `new`) | 5 หลัก | ได้ | NPD |
| 4 | Active | ขายปกติ | 5 หลัก | ได้ | Existing |
| 5 | Discontinued | ไม่ผลิตแล้ว ขายจนหมดในราคาใกล้เคียงปกติ | 5 หลัก | ได้เฉพาะหน่วยขายที่เคยขาย · ไม่อยู่ในแผนตั้งต้น | Existing |
| 6 | Clearance | ไม่ผลิตแล้ว ขายจนหมดในราคา Clearance ก่อนหมดอายุ | 5 หลัก | ไม่ควรอยู่ในแผน (ประเภท `Clearance` ตาม CR-34) | Clearance |
| 7 | Delete | เลิกขายแล้ว ไม่ผลิต ไม่ขาย (ตั้งแต่ `deletedFrom`) | 5 หลัก | ไม่ได้ (แถวเดิมอ่านอย่างเดียว คงค่า) | – |

- Status ที่แสดง `calc.productStatus(p, month)` = Delete (ตั้งแต่ `deletedFrom`) → Request → Status จากวันที่ (`calc.dateStatus` ด้านล่าง) · ลำดับนี้ใช้ในตัวกรองทุกหน้า · ป้ายและสีใน `content.js` / `tokens.css` ที่เดียว
- การล็อกช่องของแผน SKU ใช้ Status จากวันที่ (`calc.dateStatusAt`) · Delete = อ่านอย่างเดียวคงค่า · Discontinued ปลดล็อกเฉพาะหน่วยขายที่เคยขาย (`soldInUnit`)
- ตั้ง Delete ขณะยังอยู่ในแผน = ถามยืนยัน `สินค้านี้มีในแผน {n} หน่วยขาย` (ไม่ล้างค่าให้อัตโนมัติ) · SKU Delete ไม่อยู่ในกล่องเพิ่มสินค้าในแผน

Status จากวันที่ (`calc.dateStatus` · ห้ามให้ผู้ใช้เลือก):

- Clearance (ในช่วง Clearance ขึ้นก่อนเสมอ · CR-35 เดือนสิ้นสุดว่าง = จนสินค้าหมด)
- Discontinued (หลังเดือนเลิกขาย)
- Planned (ก่อนเดือนเปิดตัว หรือยังไม่มีเดือนเปิดตัว)
- NPD (3 เดือนแรก `NPD_MONTHS` · ค่าภายในยังเป็น `new` · CR-30 เปลี่ยนเฉพาะป้าย New → NPD)
- Active
- NPD แบบไตรมาส (`launchQuarter` `YYYY-Qn`): ใช้ต้นไตรมาสเป็นเดือนเปิดตัวชั่วคราว (`calc.quarterStart`) · ป้าย `เดือนเปิดตัวยังไม่ยืนยัน`
- Status ของปีแผน = Status ณ ม.ค. · หน้า Product Master แสดง Status ณ เดือนปัจจุบันกลาง (`core/clock.js`)

## ความครบถ้วน (`calc.productCompleteness`)

- ข้อมูลจำเป็น (`PRODUCT_REQUIRED`) = Product Code · ชื่อ · Category · Sub Category · Type · Series · RSP · เดือนเปิดตัว (หรือไตรมาส) → ขาดข้อใดใช้ในแผน SKU ไม่ได้
- ข้อมูลที่ควรมี (`PRODUCT_RECOMMENDED`) = Barcode · รูปสินค้า (Sub Series ไม่บังคับ)
- สินค้าที่ Sales สร้างใช้วางแผนได้แม้ข้อมูลไม่ครบ

## Product Code (CR-30 · `core/catalog.js`)

- ระบบสร้างเสมอและเป็นเลขเดียวกับ TRCLOUD · ผู้ใช้แก้ไม่ได้ · ไม่มีการผูกรหัสจริง
- CR-35 **รหัสชั่วคราวของคำขอ NPD** `NPD-YYMM-NNN` (`calc.requestCodeOf` · คำนวณทุกครั้ง ไม่เก็บ):
  - YYMM = เดือนเริ่มขายของคำขอ (`launchDate` → `request.launchDate` → `startMonth` · เดือนเริ่มของ Listing ที่เร็วสุดเปลี่ยน = YYMM เปลี่ยน) · NNN = ลำดับคำขอรวมทั้งระบบ (`requestSeq` · ไม่เปลี่ยน)
  - ID ภายใน (Key) = `REQ-nnn` (`catalog.requestId` · `nextRequestSeq`) · `calc.productKey(p) = p.id || p.trCode || p.tempCode` · รหัสที่แสดง = `calc.productCode(p)`
  - ยืนยัน (`catalog.confirmRequest`) = Product Code 5 หลักจากตัวสร้างเดิม (`catalog.nextCode` ตาม Type ที่เลือก) · เก็บ `tempCode` · Key เดิม (แผน SKU · Listing · ราคาไม่ต้องย้าย) · ยืนยันซ้ำ = `notRequest`
  - `ยังไม่เปิดใน TRCLOUD` = คำขอเท่านั้น (`catalog.inTrcloud = !isRequestProduct`)
  - ชื่อชั่วคราวเป็นป้าย (`tempNameTag`) ไม่ใช่ส่วนของชื่อ · ข้อมูลจำเป็นของคำขอ = `REQUEST_REQUIRED` (ชื่อ · Series · หมวด · Type · RSP · เดือนเริ่มขาย · ไม่นับรหัส TRCLOUD / Barcode) · ควรมี = รูป
- รูปแบบ `CODE_DIGITS` 5 หลัก = เลขนำหน้าของ Type 2 หลัก + 3 หลัก · รหัสใหม่ = รหัสสูงสุดของกลุ่ม ปัดขึ้นเป็นขั้นถัดไปของ `CODE_STEP` 10 · กลุ่มว่าง = `{เลขนำหน้า}000`
- เลขที่เคยใช้ไม่กลับมาใช้ (`master.codeCounters`) แม้ลบสินค้าแล้ว · เต็มกลุ่ม = สร้างไม่ได้
- เลขนำหน้าของ Type: 2 หลัก ห้ามซ้ำกับ Type อื่น · Type ที่ยังไม่มีเลขนำหน้า = สร้างสินค้าใน Type นั้นไม่ได้ และอยู่ใน `ข้อมูลที่ต้องตรวจ` ของหน้าหมวดสินค้า
- `ใน TRCLOUD` เปลี่ยนเมื่อผู้ใช้กดปรับตามผลเปรียบเทียบกับ ERP เท่านั้น

## ราคา (CR-30 · `calc.resolvePrice`)

- ลำดับ: CR-35 **ราคา Clearance** (เดือนในช่วง Clearance ของหน่วยขายนั้น · `product.clearance.price` · `unitIds` ว่าง = ทุกหน่วยขาย · ไม่มีราคา = ข้ามไปลำดับเดิม) → Promotion Price ของหน่วยขาย (เดือนนั้น) → Promotion Price ระดับ Channel (เดือนนั้น) → ราคาหลัก ณ เดือนนั้น (MT / ECOM / Export = RSP · TT = TT Dealer)
- ราคาหลักเปลี่ยนตามรอบเวลา (`effectiveMonth`) · บันทึกราคาใหม่ = เพิ่มรายการ ไม่เขียนทับ · เดือนที่มีผลต้องไม่ก่อนเดือนปัจจุบัน
- Promotion Price รายเดือน · ลบค่า = ใช้ราคาที่ได้รับมา · เตือน (ไม่บล็อก) เมื่อสูงกว่าราคาหลัก หรือต่ำกว่าเกิน 50% (`PROMO_PRICE_WARN_BELOW`)
- GP / Platform Fee เป็นค่าเดียวทั้งปี
- **[Phase 2]** แก้ราคาหลังล็อก Baseline ไม่เปลี่ยน Target Baseline / Plan Baseline (Snapshot `basePrices` · `promoPrices`) แต่มีผลกับ Forecast

## Listing (CR-30 · ช่วงเวลาและสถานะต่อหน่วยขาย)

- สถานะ: เสนอขาย (`offered`) · วางขาย (`listed`) · ถอดแล้ว (`delisted`) · ไม่มีรายการ = ไม่เคย Listing
- เดือนก่อน `fromMonth` และเดือนหลัง `toMonth` ของสินค้าที่ถอด = ล็อก 0 ใน SKU Planning (`calc.listingOutside`)
- แผนตั้งต้นใช้เฉพาะ Listing ที่มีช่วงทับปีแผนและไม่ใช่เสนอขาย (`calc.listedInYear`) · เสนอขายเพิ่มเข้าแผนได้พร้อมป้าย `ยังไม่ยืนยัน Listing`
- `isListed` / จำนวนหน่วยที่ Listing / Stock Clearance / ราคา นับเฉพาะเสนอขายและวางขาย (ถอดแล้วไม่นับ)
- ความครอบคลุม = หน่วยขายที่วางขาย ณ เดือนที่ดู ÷ หน่วยขายที่ใช้งานใน Channel เดียวกัน (`calc.listingCoverage` · ไม่นับข้าม Channel)
- ถอดสินค้าที่ยังมีแผนหลังเดือนถอด = แจ้งจำนวนชิ้นและ Net Sales ก่อนยืนยัน (ไม่บล็อก · `calc.plannedAfter`)
- Clearance = Stock ÷ จำนวนเดือน (ปัดลง เศษไปเดือนท้าย) แบ่งเท่ากันทุกหน่วยที่ Listing · CR-35 เดือนสิ้นสุดว่าง = ใช้ถึง ธ.ค. ของปีแผน
- CR-36 **แผน Clearance** (Supply Chain · `clearance.plan`) ไม่นับใน รวมแผน · คงเหลือ · สถานะ ขาด / เกิน / ครบ ทุกขั้น (ไม่ให้ใช้การระบายสินค้าปิดช่องว่างของเป้าหมาย) ·
  Net Sales = จำนวน × ราคา Clearance ÷ 1.07 × (1 − GP / Platform Fee ของหน่วยขาย) · เดือน Clearance ในแผน SKU อ่านอย่างเดียว (แทนการแบ่ง Stock อัตโนมัติ)
- CR-36 **Product Year** (`calc.productYear`) = ปีของเดือนเริ่มที่เร็วที่สุดของ Listing (ไม่นับเสนอขาย) → ไม่มี = ปีของเดือนแรกที่มียอดขายในข้อมูลย้อนหลัง → ไม่มีทั้งสอง = null (`ยังไม่มี Listing`)
- CR-35 เริ่ม Clearance ได้เฉพาะ SKU สถานะ Active / Discontinued (`calc.clearanceCandidates`) · บันทึกแล้วถามยืนยันการเปลี่ยน Status ก่อน
- CR-34 Listing จาก SKU Planning (`source: 'skuPlanning'` · CR-20 `addedBy: 'SALES'` นับเป็นแบบเดียวกัน · `calc.isPlanListing`): Sales แก้เดือนเริ่ม (คอลัมน์ช่วงเวลาขาย) และลบ
  (นำออกจากแผน) ได้เฉพาะ Listing แบบนี้ของหน่วยขายนั้น · มีผลตอนบันทึกแผน (`calc.planMasterPreview`) · Listing ที่ทีม Product สร้างแก้ / ลบจาก SKU Planning ไม่ได้

## สินค้าใหม่และ NPD

- **สินค้าที่ Sales สร้าง (NPD จากหน้าวางแผน SKU)**: CR-35 เป็นคำขอ (Status Request · รหัสชั่วคราว · ไม่ต้องเลือก Type · ได้ Product Code ตอนทีม Product ยืนยัน) · เดิม CR-30 ได้ Product Code จากระบบทันที + RSP ราคาหลักตั้งแต่เดือนเริ่มขาย + Promotion Price ของหน่วยขาย (ถ้าต่างจาก RSP) + Listing โดย Sales + แผน NPD ที่มา `จาก Sales`
  - ถ้าทีม Product แก้ราคาหรือเดือนเปิดตัว แถวในแผนแสดงจุด `!` แต่จำนวนชิ้นไม่เปลี่ยน
- **เพิ่มสินค้าในแผน** (CR-34 แทน เพิ่ม SKU): สินค้าที่ขายอยู่ / NPD ยืนยันแล้ว ที่ยังไม่อยู่ในแผน · ยังไม่ได้ Listing = Listing จาก SKU Planning (วางขาย) ตอนบันทึกแผน
- **ประเภทสินค้าในแผน** (CR-34 · `calc.planTypeOf` ต่อ SKU × หน่วยขาย × ปีแผน · Status ยังคำนวณจากวันที่เท่านั้น): ช่วง Clearance ทับปีแผน = `Clearance` →
  คำขอจาก Sales ที่ยังไม่ยืนยัน (`calc.isNpdRequest` = สินค้า `SALES_REQUEST` หรือแผน NPD ที่มา `SALES` ที่ไม่มี `confirmedAt`) = `ขอ NPD` →
  Planned / NPD ในปีแผน = `NPD ยืนยันแล้ว` → เคยมียอดจริงในหน่วยขายนี้ (`calc.soldInUnit`) = `สินค้าเดิม` → CR-35 Active / NPD ที่ไม่เคยขาย = `Listing ใหม่` ·
  Discontinued ที่ไม่เคยขาย = ไม่มีประเภท (`null` · เพิ่มในแผนไม่ได้)
  - ยืนยันคำขอ = CR-35 ปุ่ม `ยืนยันเป็น NPD` (Product List / Launch & Listing แท็บ NPD · บันทึกทันที · Request → Planned) · เดิม CR-34 เลือกสถานะคำขอที่หน้าแผน NPD (ไม่มีขั้นอนุมัติ) · เดือนเปิดตัวของคำขอ = เดือนเริ่มเร็วสุดของ Listing ทุกหน่วยขาย (`calc.syncRequestLaunch`)
  - นำคำขอออกจากแผนเมื่อไม่มีหน่วยขายอื่นใช้ → ถามยกเลิกคำขอ (ยกเลิก = สินค้า ราคา Listing แผน NPD ของคำขอถูกนำออก · `planEdits.cancelRequest`)
- **แผน NPD** Phase 1 บันทึกแล้วมีผลทันที: ตั้งเดือนเปิดตัว (หรือไตรมาส) และ Listing วางขาย + เดือนเริ่มขายต่อหน่วยเป็นค่าตั้งต้นในแผน SKU
  - ขั้นงานต่อกันจากเดือนเป้าหมาย · ขั้นที่เลยเป้าหมายแล้วยังไม่เสร็จ = ⚠
  - **[Phase 2]** ต้องให้ Sales Director อนุมัติ · เลื่อนเดือนเปิดตัวหลังอนุมัติ = แผนกลับเป็นฉบับร่าง และแผน SKU ที่อนุมัติแล้วเป็น "ต้องตรวจสอบใหม่"

## ห้ามลบข้อมูลที่ถูกอ้างอิง (ให้ปิดใช้งานแทน)

- SKU ลบได้เมื่อไม่มี Listing · ราคา · แผน NPD
- หมวดสินค้าลบได้เมื่อไม่มี SKU และไม่มีรายการย่อย
