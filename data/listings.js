/*
 * data/listings.js — กฎ Listing ตั้งต้น: สินค้าใดขายได้ในหน่วยขายใด (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * หลังนำเข้า (core/seed.js) SP.data.listings = [{ productKey, accountId (= unitId) }]
 *   เจ้าของข้อมูล: ทีม Product / ไม่มีรายการ = ไม่ได้ Listing → ไม่แสดงในหน้าวางแผนของหน่วยนั้น
 *   ค่าที่แก้ในหน้า Listing และวันเริ่มขาย เก็บที่ store: master.listings / แผน NPD ที่อนุมัติแล้วเพิ่ม Listing ให้เอง
 *
 * CR-11 ที่มาของ Listing:
 *   7-Eleven และ EVEANDBOY = listings ใน data/seed/ (ข้อมูลจริง)
 *   สินค้าใหม่ปี 2027 (productImport.newProducts) = newProductUnits
 *   หน่วยขายอื่น = รายการของหน่วยต้นแบบ (from) ตัดประเภทสินค้า (excludeTypes) หรือ Series (excludeSeries) ออก
 *     กำหนดตายตัวให้แต่ละหน่วยต่างกันเล็กน้อย / ยอดขายปีก่อนราย SKU ของหน่วยเหล่านี้คำนวณจากรูปแบบของหน่วยต้นแบบ
 *     ปรับให้ Net Sales แต่ละเดือนตรงกับยอดขายปีก่อนของหน่วยนั้น (data/history.js) ไม่มีการสุ่ม
 */
(function (SP) {
  'use strict';

  SP.data.listingRules = {
    newProductUnits: ['seven', 'eveandboy'],
    units: [
      { unit: 'watsons',      from: 'eveandboy', excludeTypes: ['type-toner-pad'] },
      { unit: 'beautrium',    from: 'eveandboy', excludeSeries: ['Perfect Heart'] },
      { unit: 'tsuruha',      from: 'eveandboy', excludeTypes: ['type-palette'], excludeSeries: ['Sanrio Blooming Heart'] },
      { unit: 'konvy',        from: 'eveandboy' },
      { unit: 'cjexpress',    from: 'seven' },
      { unit: 'lotuss',       from: 'seven' },
      { unit: 'tt-north',     from: 'eveandboy', excludeTypes: ['type-palette', 'type-toner-pad'] },
      { unit: 'tt-northeast', from: 'eveandboy', excludeTypes: ['type-palette', 'type-toner-pad'] },
      { unit: 'tt-central',   from: 'eveandboy', excludeTypes: ['type-palette', 'type-toner-pad'] },
      { unit: 'tt-east',      from: 'eveandboy', excludeTypes: ['type-palette', 'type-toner-pad'] },
      { unit: 'tt-south',     from: 'eveandboy', excludeTypes: ['type-palette', 'type-toner-pad'] },
      { unit: 'shopee',       from: 'eveandboy' },
      { unit: 'lazada',       from: 'eveandboy', excludeTypes: ['type-brow'] },
      { unit: 'tiktok',       from: 'eveandboy', excludeTypes: ['type-primer', 'type-toner-pad'] }
    ]
  };

  // เติมโดย core/seed.js ตอนโหลด
  SP.data.listings = [];
})(window.SP);
