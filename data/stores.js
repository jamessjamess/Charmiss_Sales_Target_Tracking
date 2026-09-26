/*
 * data/stores.js — กฎนำเข้าร้านค้า Traditional Trade (CR-16) ข้อมูลเท่านั้น ไม่มี Logic
 *
 * ข้อมูลจริงอยู่ที่ data/seed/seed-tt-stores.js (SP.data.seedTtStores สร้างจาก Excel ห้ามแก้ด้วยมือ)
 * core/stores.js นำเข้าตอนโหลด (ก่อน core/seed.js) ตามกฎในไฟล์นี้:
 *   channelMap       = รหัส Channel ใน seed → id ใน data/channels.js
 *   provinceAliases  = ชื่อจังหวัดที่สะกดต่างกันใน seed → ชื่อที่ใช้ในรายชื่อจังหวัดแนะนำ (ร้านที่มีหลายจังหวัดคั่นด้วย , แปลงทีละชื่อ)
 *   salesRefTotal    = ยอดรวมยอดอ้างอิงตามที่ seed ตั้งใจ (22,900,000 = ยอดขายปีก่อน TT) seed ปัดเศษแล้วขาด 3 บาท
 *                      → ปรับด้วย Largest remainder (ร้านที่ยอดสูงสุด 3 ร้าน +1 บาท) ยอดรวมจึงตรงกับหน้าจัดสรรเป้าหมายประจำปี
 *   seasonality      = น้ำหนักรายเดือนของ TT ปี 2026 (พันบาท รวม 22,900) → ยอดอ้างอิงรายเดือนของร้าน = ยอดอ้างอิง × น้ำหนัก ÷ ผลรวม
 *                      (calc.distributeAnnual จำนวนเต็ม ผลรวมเท่ายอดอ้างอิง กำหนดตายตัว ไม่สุ่ม) ใช้เป็นยอดปีก่อนรายเดือนของเขต
 * ไม่นำเข้า: เงื่อนไขเครดิต วงเงินเครดิต ช่องทางชำระ (ไม่อยู่ใน seed)
 * ค่าที่แก้ในหน้าเขตการขายและร้านค้าเก็บที่ store: master.storeAssignments, master.storeMoves, master.provinceSuggestions,
 *   master.territories, master.assignments (โอนทั้งเขต)
 */
(function (SP) {
  'use strict';

  SP.data.storeImport = {
    seed: 'seedTtStores',
    channelMap: { TT: 'tt' },
    provinceAliases: {
      'อุตรดิต': 'อุตรดิตถ์',
      'อุุดรธานี': 'อุดรธานี',
      'นาธิวาส': 'นราธิวาส',
      'ภูเก็ด': 'ภูเก็ต',
      'สุมุทรปราการ': 'สมุทรปราการ',
      'อยุธยา': 'พระนครศรีอยุธยา'
    },
    salesRefTotal: 22900000,
    seasonality: [2017, 1914, 2027, 2054, 1901, 1806, 1697, 1652, 1786, 1901, 1998, 2147]
  };

  // เติมโดย core/stores.js ตอนโหลด
  SP.data.stores = [];
  SP.data.storeAssignments = [];
  SP.data.provinceSuggestions = {};
  SP.data.storeMoves = [];
  SP.data.storeChannels = [];
})(window.SP);
