/*
 * data/listings.js — Listing ตั้งต้น: SKU ใดขายได้ในหน่วยแบ่งเป้าใด (ข้อมูลเท่านั้น ไม่มี Logic)
 *   accountId = id ของหน่วยแบ่งเป้า (Account หรือเขตการขาย)
 *
 * เจ้าของข้อมูล: ทีม Product / ไม่มีรายการ = ไม่ได้ Listing → ไม่แสดงในหน้าวางแผนของ Account นั้น
 * เดือนที่เริ่มขายในหน่วยกำหนดในแผน (plan.<ปี>.sku.<accountId>.items.<sku>.startMonth)
 * ค่าที่แก้ในหน้า Product Master เก็บที่ store: master.listings
 * SKU G ตั้งใจไม่ Listing ใน Watsons เพื่อใช้เดโม "ติ๊ก Listing แล้วเห็นในหน้าวางแผน"
 */
(function (SP) {
  'use strict';

  SP.data.listings = [
    { sku: 'A', accountId: 'watsons' }, { sku: 'A', accountId: 'eveandboy' }, { sku: 'A', accountId: 'tt-north' }, { sku: 'A', accountId: 'tt-northeast' }, { sku: 'A', accountId: 'tt-central' }, { sku: 'A', accountId: 'shopee' }, { sku: 'A', accountId: 'lazada' }, { sku: 'A', accountId: 'tiktok' },
    { sku: 'B', accountId: 'seven' }, { sku: 'B', accountId: 'watsons' }, { sku: 'B', accountId: 'eveandboy' }, { sku: 'B', accountId: 'beautrium' }, { sku: 'B', accountId: 'konvy' }, { sku: 'B', accountId: 'tt-north' }, { sku: 'B', accountId: 'tt-northeast' }, { sku: 'B', accountId: 'tt-central' }, { sku: 'B', accountId: 'shopee' }, { sku: 'B', accountId: 'lazada' }, { sku: 'B', accountId: 'tiktok' },
    { sku: 'C', accountId: 'seven' }, { sku: 'C', accountId: 'watsons' }, { sku: 'C', accountId: 'eveandboy' }, { sku: 'C', accountId: 'tt-north' }, { sku: 'C', accountId: 'tt-northeast' }, { sku: 'C', accountId: 'tt-central' }, { sku: 'C', accountId: 'shopee' }, { sku: 'C', accountId: 'lazada' }, { sku: 'C', accountId: 'tiktok' },
    { sku: 'D', accountId: 'seven' }, { sku: 'D', accountId: 'watsons' }, { sku: 'D', accountId: 'eveandboy' }, { sku: 'D', accountId: 'tt-north' }, { sku: 'D', accountId: 'tt-northeast' }, { sku: 'D', accountId: 'tt-central' }, { sku: 'D', accountId: 'shopee' }, { sku: 'D', accountId: 'lazada' },
    { sku: 'E', accountId: 'seven' }, { sku: 'E', accountId: 'watsons' }, { sku: 'E', accountId: 'eveandboy' }, { sku: 'E', accountId: 'beautrium' }, { sku: 'E', accountId: 'tt-north' }, { sku: 'E', accountId: 'tt-northeast' }, { sku: 'E', accountId: 'tt-central' }, { sku: 'E', accountId: 'shopee' }, { sku: 'E', accountId: 'lazada' }, { sku: 'E', accountId: 'tiktok' },
    { sku: 'F', accountId: 'watsons' }, { sku: 'F', accountId: 'eveandboy' }, { sku: 'F', accountId: 'lazada' }, { sku: 'F', accountId: 'shopee' },
    { sku: 'G', accountId: 'shopee' }, { sku: 'G', accountId: 'lazada' }, { sku: 'G', accountId: 'tiktok' },
    { sku: 'H', accountId: 'shopee' }, { sku: 'H', accountId: 'lazada' }, { sku: 'H', accountId: 'tiktok' }, { sku: 'H', accountId: 'eveandboy' }
  ];
})(window.SP);
