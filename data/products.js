/*
 * data/products.js — กฎนำเข้า Product Master จากข้อมูลจริง + สินค้าใหม่ปี 2027 (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * CR-11: สินค้าทั้งหมดมาจาก data/seed/seed-charmiss.js (สร้างจาก Sales_Planning_2026_R2.xlsx ห้ามแก้ด้วยมือ)
 *   core/seed.js แปลงเข้าโครง Product Master ตอนโหลด แล้วเก็บที่ SP.data.products (ไม่มีสินค้าตัวอย่างเดิมแล้ว)
 *
 * โครงของสินค้าหลังนำเข้า (เจ้าของข้อมูล: ทีม Product · clearance → Supply Chain / ค่าที่แก้เก็บที่ store: master.products)
 *   trCode / tempCode   = รหัสหลัก / รหัสชั่วคราว NPD_{ปี}Q{ไตรมาส}_{ลำดับ} (ใช้เมื่อยังไม่มี TR Code)
 *                         productKey = trCode ถ้ามี ไม่มีใช้ tempCode (calc.productKey) — ใช้อ้างสินค้าทุกที่
 *   name                = ชื่อเต็ม / shortName = ชื่อย่อ (Product Nickname ใน Excel) ใช้แสดงในหน้าวางแผน SKU (calc.displayName)
 *   internalCode, barcode, nameEn
 *   categoryId, subCategoryId, typeId = หมวดสินค้า (data/taxonomy.js) / inferred = true → ระบบกำหนดจากคำในชื่อ ควรตรวจสอบ
 *   seriesId, subSeriesId = Series (สร้างจาก Campaign ใน Excel / Existing = ไม่ใช่ Series → ว่าง = ขาดข้อมูลจำเป็น)
 *   itemType            = SALE | TESTER | GIFT | PREMIUM (หน้าวางแผน SKU ใช้เฉพาะ SALE)
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

    // สินค้าใหม่ (NPD) ปี 2027 ที่ยังไม่มี TR Code — ชื่อลงท้าย (ชื่อชั่วคราว) เพื่อไม่ให้สับสนกับสินค้าจริง
    //   โครงเดียวกับรายการใน data/seed/ + tempCode / Listing ที่ 7-Eleven และ EVEANDBOY (data/listings.js)
    //   แผนการเปิดตัวอยู่ที่ data/npd.js
    newProducts: [
      { tempCode: 'NPD_2027Q2_01', name: 'Charmiss Blooming Heart Gloss 03 (ชื่อชั่วคราว)', series: 'Sanrio Blooming Heart',
        rsp: 199, dealerPrice: 130, launchDate: '2027-06-01', note: 'สินค้าใหม่ปี 2027 รอรหัสจริง', createdAt: '2026-09-15T14:00:00' },
      { tempCode: 'NPD_2027Q2_02', name: 'Charmiss Blooming Heart Lip Serum 05 (ชื่อชั่วคราว)', series: 'Sanrio Blooming Heart',
        rsp: 239, dealerPrice: 130, launchDate: '2027-06-01', note: 'สินค้าใหม่ปี 2027 รอรหัสจริง', createdAt: '2026-09-15T14:00:00' },
      { tempCode: 'NPD_2027Q2_03', name: 'Charmiss Juicy Pop Tint 10 (ชื่อชั่วคราว)', series: 'Charming Lips',
        rsp: 199, dealerPrice: 90, launchDate: '2027-06-01', note: 'สินค้าใหม่ปี 2027 รอรหัสจริง', createdAt: '2026-09-20T10:00:00' }
    ]
  };

  // เติมโดย core/seed.js ตอนโหลด (ห้ามใส่รายการที่นี่ ให้แก้ข้อมูลที่ Excel หรือ productImport.newProducts)
  SP.data.products = [];
})(window.SP);
