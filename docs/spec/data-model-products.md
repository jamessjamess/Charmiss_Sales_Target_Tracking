# โครงข้อมูล · Product Master ราคา Listing แผน NPD

CR-35 แยกจาก [data-model.md](data-model.md) (ไฟล์เดิมใกล้ 30 KB) · Key ใน store อยู่ที่ data-model.md · กฎที่ [product-rules.md](product-rules.md)

## Product Master (ข้อมูลจริง)

- `data/seed/seed-charmiss.js` สร้างจาก `Sales_Planning_2026_R2.xlsx` (ฉบับที่ 2 ราคารวม VAT)
- สินค้า 125 รายการ: จริง 117 + สินค้าใหม่ใน `data/products.js` 7 รายการ + CR-35 ตัวอย่าง Delete 1 รายการ (`SAMPLE_DEL_01` Charmiss Juicy Pop Tint Mini 01 · `deletedFrom 2025-12` · `isSample` · ได้รหัส 33490)
  - CR-35 ตัดคำ "(ชื่อชั่วคราว)" / "(คำขอจาก Sales)" ออกจากชื่อ (ชื่อชั่วคราวเป็นป้าย) · คำขอ CR-34 2 รายการเป็น Request: `REQ-001` (Watsons · `NPD-2706-001`) · `REQ-002` (Shopee · `NPD-2707-002`) · ไม่มี Product Code
  - 32210 · 34150 · 33480 เปิดตัว มิ.ย. 2027 (เดิมรหัสชั่วคราว `NPD_2027Q2_01..03`)
  - 16490 เปิดตัว ก.พ. 2028 · 22110 เปิดตัว `2028-Q2` (ไตรมาส · เดือนเปิดตัวยังไม่ยืนยัน)
- ฟิลด์: `{ trCode, barcode, name, nameEn, shortName, categoryId, subCategoryId, typeId, inferred, seriesId, subSeriesId, packSize, uom, image,
  inTrcloud, launchDate, launchQuarter?, discontinueMonth, clearance, source, request, note, createdAt, updatedAt }` (CR-30 ตัด `tempCodeHistory` · `internalCode` · `itemType`)
  - CR-35: `id` (คำขอ = `REQ-nnn` · Key ของสินค้าที่ยังไม่มี Product Code) · `requestSeq` (NNN ของรหัสชั่วคราว) · `tempCode` (รหัสชั่วคราวเดิม เก็บตอนยืนยัน) · `deletedFrom` (`YYYY-MM` · Status Delete) · `isSample`
  - CR-35 `clearance` = `{ fromMonth, toMonth | null (= จนสินค้าหมด), stockQty, price (บาท รวม VAT) | null, unitIds | null (= ทุกหน่วยขาย), expiry (YYYY-MM-DD) | null, note | null }` ·
    ช่วงเดือน + Stock แก้ที่ Launch & Listing แท็บ Listing · ราคา หน่วยขาย วันหมดอายุ หมายเหตุ แก้ที่ Price & Promotion แท็บ Clearance (สิทธิ์ย่อย `listing.clearance` ทั้ง 2 ที่)
  - CR-36 `clearance.plan` = `{ <unitId>: { 'YYYY-MM': ชิ้น } }` แผนระบาย (ไม่นับในแผน SKU / เป้าหมาย) · `stockQty` = สต็อกที่ต้องระบาย · ตัวอย่าง `productImport.samplePatches` (data/products.js ·
    32090 Glitter Lip Gloss ITP 04: Clearance ม.ค.–เม.ย. 2027 · 79 บาท · Watsons + TT เขต 1 · สต็อก 1,200 · แผน 1,000 = 125 ชิ้น / หน่วย / เดือน · `isSample` · ไม่แก้ data/seed/ ตามที่ผู้ใช้เลือก)
- Product Code (`trCode`) ระบบสร้างและเป็นเลขเดียวกับ TRCLOUD · สินค้าอ้างด้วย `calc.productKey(p)` = `id || trCode || tempCode` (CR-35):
  - `CODE_DIGITS` 5 หลัก = เลขนำหน้าของ Type 2 หลัก (`taxonomy.category[TYPE].codePrefix`) + 3 หลัก · ขั้น `CODE_STEP` 10 (`core/catalog.js nextCode`)
  - เลขนำหน้าตั้งต้นจากรหัสที่พบมากที่สุดของสินค้าใน Type (`catalog.applyPrefixDefaults` · Lip Stick = 17 เพราะ 16 เป็นของ Blush · Highlighter ยังไม่มี)
  - รหัสชั่วคราวเดิมแปลงตอนโหลด (`catalog.assignSystemCodes` → `SP.data.codeMigration`) และย้ายการอ้างอิงใน Listing · ราคา · แผน NPD · ยอดจริง · แผน SKU ตั้งต้น
  - `inTrcloud` = มีรหัสใน TRCLOUD แล้ว (สินค้าจริง = true · สินค้าใหม่ = false) · CR-35 `catalog.inTrcloud(p)` = ไม่ใช่คำขอ (ยังไม่เปิดใน TRCLOUD = Request เท่านั้น)
  - CR-35 `catalog.assignSystemCodes`: คำขอได้ `REQ-nnn` (แปลง Key ชั่วคราวเดิม → id) · สินค้าอื่นได้รหัสระบบตามเดิม
- การแปลงตอนนำเข้า:
  - Campaign → Series 8 รายการ · `Existing` ไม่ใช่ Series (5 SKU คิ้วและไพรเมอร์ จึงขาดข้อมูลจำเป็น)
  - หมวดสินค้ากำหนดจากคำในชื่อ (`inferred: true` ป้าย "ระบบกำหนด") และขนาดบรรจุอ่านจากชื่อ
- หมวดสินค้า (`data/taxonomy.js`): Category Face · Cheek · Lip · Eye · Skincare → Sub Category → Type (`codePrefix`) / Series → Sub Series
  (Series มีวันเริ่ม / วันสิ้นสุดได้)
- ไม่มี Tester / Gift / Premium และ Clearance ในข้อมูลจริง (ตั้งได้ที่ Price & Promotion แท็บ Clearance)
- สินค้าที่ Sales สร้าง: `source: 'SALES_REQUEST'` · `requestedBy` · `requestedAt` · `request = { unitId, unitIds, price, launchDate, startMonth, note, reason (CR-34) }` ·
  CR-35 ยังไม่มี `trCode` = Request (`calc.isRequestProduct`) · แผน NPD ของคำขอ id `npd-req-nnn` · ยืนยันแล้วได้ `trCode` + `tempCode` · `confirmedAt` / `confirmedBy`

## ราคาและ Listing (CR-30)

- ราคาทุกรายการรวม VAT (`PRICE_INCLUDES_VAT = true`) · ราคาที่ใช้ = `calc.resolvePrice` (CR-35 ราคา Clearance → Promotion ของหน่วยขาย → ของ Channel → ราคาหลัก ·
  `calc.pricingOf` ส่ง `clearance` = `{ <productKey>: product.clearance }` จาก `data.products` · Snapshot Baseline [Phase 2] ไม่มี clearance = ลำดับเดิม)
- ราคาหลัก `basePrices` = `{ productKey, priceType: RSP | TT_DEALER | TT_WHOLESALE, effectiveMonth, price, by, at }`
  - ราคาที่มีผล ณ เดือน = รายการล่าสุดที่ `effectiveMonth` ไม่เกินเดือนนั้น (บันทึกราคาใหม่ = เพิ่มรายการ ไม่เขียนทับ)
  - ตั้งต้นจาก `data/pricing.js priceImport` (`baseFrom` 2024-01 + `changes` เช่น Perfect Heart Cushion 399 → 429 · TT 220 → 240 ตั้งแต่ ก.ค. 2027)
  - TT ใช้ `TT_DEALER` (`channel.priceBasis`) · Channel อื่นใช้ RSP · `TT_WHOLESALE` ยังไม่มีข้อมูล
- Promotion Price `promoPrices` = `{ productKey, channelId, unitId | null (= ทั้ง Channel), month, price, by, at }` รายเดือน
  - ย้ายจากราคาต่อ Account เดิม = ระดับหน่วยขายทุกเดือนของปี 2027 (Juicy Pop Tint 02 / 05 ที่ 7-Eleven 149 บาท)
- Listing (`data/listings.js`) = `{ productKey, accountId (= unitId), status: offered | listed | delisted, fromMonth, toMonth, addedBy?, addedAt?, addedByName? }`
  - `calc.normalizeListings` ตอนโหลด: ไม่มีสถานะ = `listed` · `fromMonth` = เดือนเริ่มขายต่อหน่วยจากแผน NPD หรือเดือนเปิดตัวของสินค้า
  - 7-Eleven 11 · EVEANDBOY 76 SKU จาก Excel
  - หน่วยอื่นใช้รายการของหน่วยต้นแบบ แล้วตัดประเภทสินค้าหรือ Series ที่กำหนดไว้ (TT ไม่มี Palette และ Toner · Watsons ไม่มี Toner · Lazada ไม่มีดินสอเขียนคิ้ว)
  - `addedBy: 'SALES'` = Listing ที่ Sales สร้าง · CR-34 `source: 'skuPlanning'` = จาก SKU Planning · `listingRules.salesListings` = ตัวอย่าง
- แผน NPD (`data/npd.js`) = `{ id, productKey, seriesId, stage: plan | concept | production | ready, plannedLaunchDate, launchQuarter, stageTargets: { <ขั้น>: 'YYYY-MM' },
  plannedAccounts: [{ accountId, plannedStartMonth }], expectedRsp, owner, source: PRODUCT | SALES, note, workflow }` · CR-34 `requestedBy` · `reason` · `confirmedAt` · `confirmedBy`
- ข้อมูล ERP ตัวอย่าง (`data/erp-snapshot.js`) ใช้กับปุ่มเปรียบเทียบกับ ERP ในหน้ารายการสินค้า

## สินค้าแบบ Bundle (CR-37)

- ฟิลด์เพิ่มของสินค้า: `kind` = `'bundle'` (ไม่มี = สินค้าเดี่ยว `single` · สินค้าเดิมไม่ต้องเพิ่มฟิลด์) · `components` = `[{ skuId (productKey ของ SKU เดี่ยว), qty (จำนวนเต็ม ≥ 1) }]` ·
  `seriesManual` (true = ทีม Product แก้ Series เอง · false / ไม่มี = Series จากชิ้นส่วน `calc.bundleSeries`)
- Store (`master.products`) กำหนดให้ทุก Bundle ตอนบันทึก (`calc.normalizeBundles`): รวม `skuId` ซ้ำ · `categoryId / subCategoryId / typeId` = `settings.BUNDLE` (Set & Bundle › Bundle › Bundle · `inferred: false`) ·
  `seriesId` = Series ของชิ้นส่วน หรือ `ser-mix` (Mix Series · `data/taxonomy.js`) เมื่อชิ้นส่วนต่าง Series · `subSeriesId: null`
- ราคา / Listing / แผน SKU / Promotion / Clearance ของ Bundle = ระเบียนปกติของสินค้านั้น (Key = Product Code ของ Bundle) · ราคารวมชิ้นส่วนคำนวณทุกครั้ง ไม่เก็บ
- ตัวอย่าง (ไม่แก้ `data/seed/`): `data/products.js` `productImport.bundles` → `core/seed.js addSampleBundle` สร้างสินค้า + RSP + ราคาหลักประเภทอื่นตามสัดส่วนของ `priceRatioOf` + Listing + แผนตั้งต้น (`planSeeds`) + `codeCounters` + ERP
  - 90100 Matte All Day Cushion 5g -01 Twin Set = 12130 × 2 · RSP 109 · TT Dealer 65 (109 × 35 ÷ 59) · Watsons ตั้งแต่ ม.ค. 2027 · 150 ชุด / เดือน
  - 90200 Matte All Day Cushion 5g Duo -01/-02 = 12130 × 1 + 12140 × 1 · RSP 109 · TT Dealer 65 · Shopee ตั้งแต่ มี.ค. 2027 · 200 ชุด / เดือน (มี.ค.–ธ.ค.)
  - เปิดตัว ม.ค. 2026 (Active ณ เดือนปัจจุบันกลาง) · `isSample: true` · `inTrcloud: true` · สินค้ารวม 127 รายการ
- `store.js` `DATA_VERSION` 16 (ค่าที่เก็บไว้จากรุ่นก่อนล้างครั้งเดียว ให้เห็นตัวอย่าง Bundle)
