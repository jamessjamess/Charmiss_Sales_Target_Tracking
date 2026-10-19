/*
 * data/products.js — กฎนำเข้า Product Master จากข้อมูลจริง + สินค้าใหม่ปี 2027 (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * CR-11: สินค้าทั้งหมดมาจาก data/seed/seed-charmiss.js (สร้างจาก Sales_Planning_2026_R2.xlsx ห้ามแก้ด้วยมือ)
 *   core/seed.js แปลงเข้าโครง Product Master ตอนโหลด แล้วเก็บที่ SP.data.products (ไม่มีสินค้าตัวอย่างเดิมแล้ว)
 *
 * โครงของสินค้าหลังนำเข้า (เจ้าของข้อมูล: ทีม Product · clearance → Supply Chain / ค่าที่แก้เก็บที่ store: master.products)
 *   trCode              = Product Code (CR-30 ระบบสร้างเสมอ แก้ไม่ได้ · เลขเดียวกับ TRCLOUD) = productKey (calc.productKey) ใช้อ้างสินค้าทุกที่
 *                         newProducts ด้านล่างใช้รหัสอ้างอิงชั่วคราว (tempCode) เฉพาะในไฟล์นี้ core/seed.js แปลงเป็น Product Code ระบบตอนโหลด
 *   name                = ชื่อเต็ม / shortName = ชื่อย่อ (Product Nickname ใน Excel) ใช้แสดงในหน้าวางแผน SKU (calc.displayName)
 *   barcode, nameEn · inTrcloud (CR-30 true = เปิดใน TRCLOUD แล้ว: สินค้าจาก seed · false = ยังไม่เปิด: newProducts / สร้างใหม่)
 *   categoryId, subCategoryId, typeId = หมวดสินค้า (data/taxonomy.js) / inferred = true → ระบบกำหนดจากคำในชื่อ ควรตรวจสอบ
 *   seriesId, subSeriesId = Series (สร้างจาก Campaign ใน Excel / Existing = ไม่ใช่ Series → ว่าง = ขาดข้อมูลจำเป็น)
 *   packSize, uom       = ขนาดบรรจุ (อ่านจากชื่อ เช่น 5g, 50ml) / image = data URL ของภาพย่อ หรือ null
 *   launchDate          = วันเริ่มขาย 'YYYY-MM-DD' / discontinueMonth = เดือนสุดท้ายที่ขาย 'YYYY-MM' (null = ยังขายอยู่)
 *                         sourceStatus ใน Excel ใช้กำหนดวันที่เท่านั้น Status คำนวณจากวันที่ (calc.productStatus)
 *   clearance           = { fromMonth, toMonth, stockQty } ช่วงระบาย Stock (Supply Chain) | null
 *   note, createdAt, updatedAt
 * ราคา → data/pricing.js / Listing → data/listings.js / ยอดขายปีก่อนราย SKU → SP.data.history.years.<ปี>.skuQty
 */
(function (SP) {
  'use strict';

  SP.data.productImport = {
    // ไฟล์ใน data/seed/ ที่ใช้ (SP.data.<seed>)
    seed: 'seedCharmiss',

    // วันที่มีผลของราคาตั้งต้น (ถ้าวันเริ่มขายหลังวันนี้ ใช้วันเริ่มขาย) / ผู้บันทึกข้อมูลตั้งต้น
    priceFrom: '2024-01-01',
    importedBy: 'นำเข้าจาก Excel',

    // Campaign ใน Excel ที่ไม่ใช่ Series (ปล่อย Series ว่าง → หน้ารายการสินค้าแสดง "ขาดข้อมูลจำเป็น")
    notSeries: ['Existing'],
    notSeriesNote: 'Campaign ใน Excel = Existing (ยังไม่ได้กำหนด Series)',

    // หมวดสินค้าจากคำในชื่อสินค้า (ไม่สนตัวพิมพ์ ตรงทั้งคำ) ตรวจตามลำดับ ใช้กฎแรกที่ตรง
    //   Cushion / Foundation / Powder / Primer / Setting Spray → Face · Blush / Highlighter → Cheek ·
    //   Brow / Eyeliner / Palette → Eye · Toner → Skincare · Tint / Gloss / Stick / Lip → Lip
    //   (Blush มาก่อน Tint เพื่อให้ "Water Tint Blush Stick" เป็น Cheek)
    categoryRules: [
      { word: 'cushion', typeId: 'type-cushion' },
      { word: 'foundation', typeId: 'type-foundation' },
      { word: 'setting spray', typeId: 'type-setting-spray' },
      { word: 'powder', typeId: 'type-powder' },
      { word: 'primer', typeId: 'type-primer' },
      { word: 'blush', typeId: 'type-blush' },
      { word: 'highlighter', typeId: 'type-highlighter' },
      { word: 'brow', typeId: 'type-brow' },
      { word: 'eyeliner', typeId: 'type-eyeliner' },
      { word: 'palette', typeId: 'type-palette' },
      { word: 'toner', typeId: 'type-toner-pad' },
      { word: 'tint', typeId: 'type-tint' },
      { word: 'gloss', typeId: 'type-gloss' },
      { word: 'stick', typeId: 'type-lip-stick' },
      { word: 'lip', typeId: 'type-lip-care' }
    ],

    // CR-35: ชื่อชั่วคราวเป็นป้ายที่หน้าจอ (Status Request) ไม่เก็บในชื่อ · เดิม: สินค้าใหม่ (NPD) ปี 2027 — ชื่อลงท้าย เพื่อไม่ให้สับสนกับสินค้าจริง
    //   โครงเดียวกับรายการใน data/seed/ + tempCode (รหัสอ้างอิงในไฟล์ข้อมูล → Product Code ระบบตาม Type: 32210 · 34150 · 33480)
    //   Listing ที่ 7-Eleven และ EVEANDBOY (data/listings.js)
    //   แผนการเปิดตัวอยู่ที่ data/npd.js
    newProducts: [
      { tempCode: 'NPD_2027Q2_01', name: 'Charmiss Blooming Heart Gloss 03', series: 'Sanrio Blooming Heart',
        rsp: 199, dealerPrice: 130, launchDate: '2027-06-01', note: 'สินค้าใหม่ปี 2027', createdAt: '2026-09-15T14:00:00' },
      { tempCode: 'NPD_2027Q2_02', name: 'Charmiss Blooming Heart Lip Serum 05', series: 'Sanrio Blooming Heart',
        rsp: 239, dealerPrice: 130, launchDate: '2027-06-01', note: 'สินค้าใหม่ปี 2027', createdAt: '2026-09-15T14:00:00' },
      { tempCode: 'NPD_2027Q2_03', name: 'Charmiss Juicy Pop Tint 10', series: 'Charming Lips',
        rsp: 199, dealerPrice: 90, launchDate: '2027-06-01', note: 'สินค้าใหม่ปี 2027', createdAt: '2026-09-20T10:00:00' },
      // CR-30 แผน NPD ต่อเนื่อง: ปี 2028 แบบไตรมาส (ยังไม่ Listing) และเปิดตัว ก.พ. 2028 ที่ Shopee · Lazada (units = หน่วยขายที่ Listing)
      { tempCode: 'NPD_2028Q2_01', name: 'Charmiss Charming Glow Eyeshadow Palette 02', series: 'Charming Glow',
        rsp: 459, dealerPrice: 250, launchDate: null, launchQuarter: '2028-Q2', units: [], note: 'สินค้าใหม่ปี 2028', createdAt: '2026-09-22T10:00:00' },
      { tempCode: 'NPD_2028Q1_01', name: 'Charmiss Perfect Heart Blush Stick 03', series: 'Perfect Heart',
        rsp: 259, dealerPrice: 140, launchDate: '2028-02-01', units: ['shopee', 'lazada'], note: 'สินค้าใหม่ปี 2028', createdAt: '2026-09-22T10:00:00' },
      // CR-34: คำขอ NPD จาก Sales (ยังไม่ยืนยัน · source SALES_REQUEST · request = สิ่งที่ Sales กรอก) · Listing จาก SKU Planning ที่หน่วยขายใน units
      //   แผน NPD ที่มา SALES อยู่ที่ data/npd.js · จำนวนรายเดือนตัวอย่างที่ data/plan-seeds.js (CR-34)
      { tempCode: 'NPD_2027Q2_04', name: 'Charmiss Juicy Pop Tint 11', series: 'Charming Lips',
        rsp: 199, dealerPrice: 90, launchDate: '2027-06-01', units: ['watsons'], note: '', createdAt: '2026-09-18T11:00:00',
        source: 'SALES_REQUEST', requestedBy: 'พิมพ์ลดา ใจดี', requestedAt: '2026-09-18T11:00:00',
        request: { unitId: 'watsons', unitIds: ['watsons'], price: 199, launchDate: '2027-06-01', startMonth: '2027-06', note: '',
          reason: 'Watsons ขอสีส้มอิฐสำหรับแคมเปญหน้าร้อน · ลูกค้าถามหาสีใกล้ Tint 05' } },
      { tempCode: 'NPD_2027Q3_01', name: 'Charmiss Perfect Heart Blush Stick 04', series: 'Perfect Heart',
        rsp: 259, dealerPrice: 140, launchDate: '2027-07-01', units: ['shopee'], note: '', createdAt: '2026-09-19T15:00:00',
        source: 'SALES_REQUEST', requestedBy: 'มิลิน แก้วใส', requestedAt: '2026-09-19T15:00:00',
        request: { unitId: 'shopee', unitIds: ['shopee'], price: 259, launchDate: '2027-07-01', startMonth: '2027-07', note: '',
          reason: 'สีชมพูพีชสำหรับ Live ขายบน Shopee (ขนาดพกพา)' } },
      // CR-35: ตัวอย่าง Status Delete (เลิกขายแล้ว ไม่ผลิต ไม่ขาย · ไม่มี Listing และไม่อยู่ในแผน)
      { tempCode: 'SAMPLE_DEL_01', name: 'Charmiss Juicy Pop Tint Mini 01', series: 'Charming Lips',
        rsp: 99, dealerPrice: 50, launchDate: '2023-03-01', discontinueMonth: '2025-06', deletedFrom: '2025-12', units: [], isSample: true,
        note: 'ตัวอย่างสินค้าที่เลิกขายแล้ว', createdAt: '2023-02-01T09:00:00' }
    ],
    // CR-36: ตัวอย่างแผน Clearance (Supply Chain) · Glitter Lip Gloss ITP 04 (Discontinued ตั้งแต่ เม.ย. 2026) → Clearance ม.ค.–เม.ย. 2027 ราคา 79 บาท
    //   Watsons + TT เขต 1 · สต็อก 1,200 ชิ้น · แผนระบาย 1,000 ชิ้น (125 ชิ้น / หน่วย / เดือน · สถานะ ยังระบายไม่หมด) · สินค้านี้ไม่มี Listing และไม่อยู่ในแผน SKU ใด (ไม่ต้องล้างยอดเดิม)
    samplePatches: [
      { trCode: '32090', patch: { isSample: true, clearance: { fromMonth: '2027-01', toMonth: '2027-04', stockQty: 1200, price: 79, unitIds: ['watsons', 'TT-01'], expiry: '2027-06-30', note: 'ตัวอย่างแผน Clearance',
        plan: { watsons: { '2027-01': 125, '2027-02': 125, '2027-03': 125, '2027-04': 125 }, 'TT-01': { '2027-01': 125, '2027-02': 125, '2027-03': 125, '2027-04': 125 } } } } }
    ],
    // CR-37: ตัวอย่างสินค้าแบบ Bundle (ไม่แก้ data/seed/) · core/seed.js สร้างสินค้า (kind: 'bundle' · หมวด Set & Bundle · Series จากชิ้นส่วน)
    //   ราคาหลัก RSP = rsp · ราคาหลักประเภทอื่น = สัดส่วนเดียวกับ priceRatioOf (ปัดเป็นบาท) · Listing = units · แผน SKU ตั้งต้นของปี planYear = plan (<หน่วยขาย>: { เดือน 0–11: ชุด })
    //   ยอดแผนของ Watsons และ Shopee ยังต่ำกว่าเป้าหมาย (แถวคงเหลือยังเป็น ขาด)
    bundles: [
      { trCode: '90100', name: 'Charmiss Matte All Day Cushion 5g -01 Twin Set', shortName: 'Matte All Day Cushion 5g -01 Twin Set',
        components: [{ skuId: '12130', qty: 2 }], rsp: 109, priceRatioOf: '12130', launchDate: '2026-01-01', isSample: true,
        units: [{ unitId: 'watsons', fromMonth: '2027-01' }], planYear: 2027, plan: { watsons: { 0: 150, 1: 150, 2: 150, 3: 150, 4: 150, 5: 150, 6: 150, 7: 150, 8: 150, 9: 150, 10: 150, 11: 150 } },
        note: 'ตัวอย่าง Bundle', createdAt: '2026-09-25T10:00:00' },
      { trCode: '90200', name: 'Charmiss Matte All Day Cushion 5g Duo -01/-02', shortName: 'Matte All Day Cushion 5g Duo -01/-02',
        components: [{ skuId: '12130', qty: 1 }, { skuId: '12140', qty: 1 }], rsp: 109, priceRatioOf: '12130', launchDate: '2026-01-01', isSample: true,
        units: [{ unitId: 'shopee', fromMonth: '2027-03' }], planYear: 2027, plan: { shopee: { 2: 200, 3: 200, 4: 200, 5: 200, 6: 200, 7: 200, 8: 200, 9: 200, 10: 200, 11: 200 } },
        note: 'ตัวอย่าง Bundle', createdAt: '2026-09-25T10:00:00' }
    ]
  };

  // เติมโดย core/seed.js ตอนโหลด (ห้ามใส่รายการที่นี่ ให้แก้ข้อมูลที่ Excel หรือ productImport.newProducts)
  SP.data.products = [];
})(window.SP);
