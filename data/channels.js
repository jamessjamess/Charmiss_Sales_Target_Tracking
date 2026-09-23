/*
 * data/channels.js — Channel Master (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * ทุกที่ในโค้ดอ่าน Channel จากที่นี่ ห้าม Hardcode ชื่อหรือจำนวน Channel
 *   id              = Key ใน plan.<ปี>.topDown (pct.mt, units.mt, channels: ['mt', …])
 *   name / fullName = ชื่อย่อที่แสดง / ชื่อเต็ม (tooltip)
 *   colorToken      = ชื่อ CSS Variable ใน styles/tokens.css (--ch-1 ถึง --ch-8) ไม่ใส่ = ได้สีถัดไปตาม order
 *   allocationUnit  = หน่วยแบ่งเป้าของ Channel นี้: 'ACCOUNT' (data/accounts.js) | 'TERRITORY' (data/territories.js)
 *   sellOutMethod   = 'ACTUAL' (ยอดขายจริงของร้าน) | 'SELL_IN_MINUS_CN' (ยอดขายเข้า − CN) — ตอนนี้ใช้แสดงผล ยังไม่ใช้คำนวณ
 *   hasGP           = false → GP = 0 ทุกหน่วยใน Channel นี้ และแถบแบ่งเงินไม่มีส่วน GP
 *   active          = false → ไม่อยู่ในแผนตั้งต้น แต่เลือกเพิ่มได้จาก "+ เพิ่ม Channel" ในหน้า Top-down
 *   order           = ลำดับแสดงผลและลำดับสี
 *   unitLabel       = ชื่อเรียกหน่วยขายใน Channel นี้ (ป้าย Dropdown, ปุ่ม "+ {unitLabel}", แถวว่าง) — ห้าม Hardcode ในโค้ด
 *   gpLabel         = ชื่อเรียก GP ของ Channel นี้ (แถบบริบท, ⓘ) / Channel ที่ hasGP = false ไม่ใช้ค่านี้
 * Channel ที่ใช้ในแผนแต่ละปีอยู่ใน store: plan.<ปี>.topDown.channels
 */
(function (SP) {
  'use strict';

  SP.data.channels = [
    { id: 'mt',     name: 'MT',     fullName: 'Modern Trade',      colorToken: '--ch-1', allocationUnit: 'ACCOUNT',   sellOutMethod: 'ACTUAL',           hasGP: true,  active: true,  order: 1, unitLabel: 'Account',   gpLabel: 'GP' },
    { id: 'tt',     name: 'TT',     fullName: 'Traditional Trade', colorToken: '--ch-2', allocationUnit: 'TERRITORY', sellOutMethod: 'SELL_IN_MINUS_CN', hasGP: false, active: true,  order: 2, unitLabel: 'เขตการขาย', gpLabel: null },
    { id: 'ecom',   name: 'ECOM',   fullName: 'E-commerce',        colorToken: '--ch-3', allocationUnit: 'ACCOUNT',   sellOutMethod: 'ACTUAL',           hasGP: true,  active: true,  order: 3, unitLabel: 'Platform',  gpLabel: 'ค่าธรรมเนียม Platform' },
    { id: 'export', name: 'Export', fullName: 'Export ต่างประเทศ',  colorToken: '--ch-4', allocationUnit: 'ACCOUNT',   sellOutMethod: 'ACTUAL',           hasGP: true,  active: false, order: 4, unitLabel: 'Account',   gpLabel: 'GP' }
  ];
})(window.SP);
