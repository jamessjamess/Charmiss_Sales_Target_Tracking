/*
 * data/products.js — Product Master ตั้งต้น (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * เจ้าของข้อมูล: ทีม Product (clearance → Supply Chain)
 *   sku              = รหัส SKU (ใช้เป็น Key ในแผน plan.<ปี>.sku.<accountId>.items)
 *   name, series     = ชื่อและ Series (กลุ่มสินค้า/แคมเปญ ใช้ Filter Series) / note = คำอธิบายสั้น (tooltip)
 *                      (รุ่นก่อนเรียก campaign — store แปลง master.products เดิมให้ตอนโหลด)
 *   launchDate       = วันเริ่มขาย 'YYYY-MM-DD' (NPD = 3 เดือนนับจากเดือนนี้)
 *   discontinueMonth = เดือนสุดท้ายที่ขาย 'YYYY-MM' หลังจากนี้ = 0 (null = ยังขายอยู่)
 *   clearance        = { fromMonth, toMonth, stockQty } ช่วงระบาย Stock ระดับ SKU | null
 *                      (เดโมแบ่ง stockQty เท่ากันทุก Account ที่ Listing — ดูคำถามที่ค้าง)
 *   manualDefault    = ค่าตั้งต้นของช่อง "กรอกเอง" (ชิ้น/เดือน ต่อหน่วยแบ่งเป้า) เฉพาะปีที่มีใน data/targets.js years
 * หน่วยที่ขายได้อยู่ใน data/listings.js / ราคาอยู่ใน data/pricing.js (priceList)
 * Series "Summer Launch 2027" มี 2 SKU (A, H) ไว้เดโม "เพิ่มทั้ง Series"
 * ค่าที่แก้ในหน้า Product Master เก็บที่ store: master.products
 */
(function (SP) {
  'use strict';

  SP.data.products = [
    {
      sku: 'A', name: 'SKU A', series: 'Summer Launch 2027', note: 'สินค้าใหม่ (NPD)',
      launchDate: '2027-04-01', discontinueMonth: null, clearance: null,
      manualDefault: {
        shopee: 1200, lazada: 600, tiktok: 900,
        watsons: 800, eveandboy: 400,
        'tt-north': 500, 'tt-northeast': 500, 'tt-central': 500
      }
    },
    {
      sku: 'B', name: 'SKU B', series: 'Core', note: 'สินค้าขายดี ราคาต่อชิ้นต่ำ',
      launchDate: '2023-06-01', discontinueMonth: null, clearance: null
    },
    {
      sku: 'C', name: 'SKU C', series: 'Core', note: 'มี Promo บางวัน',
      launchDate: '2024-02-01', discontinueMonth: null, clearance: null
    },
    {
      sku: 'D', name: 'SKU D', series: 'Phase-out', note: 'ระบายสต็อกก่อนเลิกขาย',
      launchDate: '2022-09-01', discontinueMonth: '2027-05',
      clearance: { fromMonth: '2027-03', toMonth: '2027-05', stockQty: 8000 }
    },
    {
      sku: 'E', name: 'SKU E', series: 'Core', note: 'สินค้าหลัก',
      launchDate: '2025-01-01', discontinueMonth: null, clearance: null
    },
    {
      sku: 'F', name: 'SKU F', series: 'Online Exclusive', note: 'ขายช่องทางอื่นอยู่แล้ว เพิ่งเข้า Shopee',
      launchDate: '2025-08-01', discontinueMonth: null, clearance: null,
      manualDefault: { shopee: 150 }
    },
    {
      sku: 'G', name: 'SKU G', series: 'Holiday 2027', note: 'สินค้าใหม่ปลายปี',
      launchDate: '2027-10-15', discontinueMonth: null, clearance: null,
      manualDefault: { shopee: 900, lazada: 500, tiktok: 700, watsons: 600 }
    },
    {
      sku: 'H', name: 'SKU H', series: 'Summer Launch 2027', note: 'สินค้าใหม่ชุดเดียวกับ SKU A',
      launchDate: '2027-05-15', discontinueMonth: null, clearance: null,
      manualDefault: { shopee: 700, lazada: 400, tiktok: 500, eveandboy: 300 }
    }
  ];
})(window.SP);
