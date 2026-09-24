/*
 * data/accounts.js — Account Master (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * หน่วยแบ่งเป้าของ Channel ที่ allocationUnit = 'ACCOUNT' เลือกได้จากรายการนี้เท่านั้น (ห้ามพิมพ์ชื่อเอง)
 *   id        = ใช้เป็นส่วนหนึ่งของ Key ใน store เช่น plan.2027.phasing.shopee
 *   channelId = id ใน data/channels.js
 *   active    = false → ไม่แสดงในรายการ "+ เพิ่ม Account"
 *   gp        = GP ของร้านค้า หรือค่าธรรมเนียม Platform (สัดส่วน 0.45 = 45% ชื่อเรียกตาม gpLabel ของ Channel)
 *               gpFrom = วันที่ค่านี้มีผล 'YYYY-MM-DD' / เจ้าของข้อมูล: Sales/KAM + Finance (Channel ที่ hasGP = false ไม่ใช้ค่านี้)
 *   note      = หมายเหตุที่แสดงในหน้า Account (ไม่บังคับ)
 * CR-11: GP ของ 7-Eleven (40%) และ EVEANDBOY (45%) ตรงกับที่ใช้ปรับยอดขายราย SKU ปี 2026 ใน data/seed/
 * Platform ใหม่ของ ECOM (Website (Own), LINE Shop) ตั้ง active: false ไว้เดโมการเปิดใช้งานและเพิ่มในหน้า Top-down
 * ค่าที่แก้ในหน้า Account Master เก็บที่ store: master.accounts
 * ผู้รับผิดชอบแต่ละ Account อยู่ใน data/assignments.js (ไม่ผูกไว้กับ Account)
 */
(function (SP) {
  'use strict';

  SP.data.accounts = [
    { id: 'seven',     name: '7-Eleven',           channelId: 'mt',     active: true, gp: 0.40, gpFrom: '2026-01-01' },
    { id: 'watsons',   name: 'Watsons',            channelId: 'mt',     active: true, gp: 0.45, gpFrom: '2026-04-01' },
    { id: 'eveandboy', name: 'EVEANDBOY',          channelId: 'mt',     active: true, gp: 0.45, gpFrom: '2026-01-01' },
    { id: 'beautrium', name: 'Beautrium',          channelId: 'mt',     active: true, gp: 0.40, gpFrom: '2025-07-01' },
    { id: 'cjexpress', name: 'CJexpress',          channelId: 'mt',     active: true, gp: 0.35, gpFrom: '2026-01-01' },
    { id: 'konvy',     name: 'Konvy',              channelId: 'mt',     active: true, gp: 0.25, gpFrom: '2026-01-01' },
    { id: 'lotuss',    name: "Lotus's",            channelId: 'mt',     active: true, gp: 0.38, gpFrom: '2026-01-01' },
    { id: 'tsuruha',   name: 'Tsuruha',            channelId: 'mt',     active: true, gp: 0.42, gpFrom: '2026-01-01' },
    { id: 'mrdiy',     name: 'MR.DIY',             channelId: 'mt',     active: true, gp: 0.35, gpFrom: '2027-01-01' },
    { id: 'shopee',    name: 'Shopee',             channelId: 'ecom',   active: true, gp: 0.20, gpFrom: '2026-07-01' },
    { id: 'lazada',    name: 'Lazada',             channelId: 'ecom',   active: true, gp: 0.20, gpFrom: '2026-07-01' },
    { id: 'tiktok',    name: 'Tiktok',             channelId: 'ecom',   active: true, gp: 0.15, gpFrom: '2026-01-01' },
    { id: 'website',   name: 'Website (Own)',      channelId: 'ecom',   active: false, gp: 0.03, gpFrom: '2027-01-01', note: 'ช่องทางของบริษัท: ค่าธรรมเนียมคือค่าบริการชำระเงิน' },
    { id: 'lineshop',  name: 'LINE Shop',          channelId: 'ecom',   active: false, gp: 0.10, gpFrom: '2027-01-01' },
    { id: 'exp-kh',    name: 'Distributor กัมพูชา',  channelId: 'export', active: true, gp: 0.15, gpFrom: '2027-01-01' },
    { id: 'exp-la',    name: 'Distributor ลาว',     channelId: 'export', active: true, gp: 0.15, gpFrom: '2027-01-01' },
    { id: 'exp-mm',    name: 'Distributor เมียนมา',  channelId: 'export', active: true, gp: 0.18, gpFrom: '2027-01-01' }
  ];
})(window.SP);
