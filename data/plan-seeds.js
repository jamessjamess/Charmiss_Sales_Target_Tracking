/*
 * data/plan-seeds.js — ค่าตั้งต้นรายช่องของแผน SKU (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * years.<ปี>.<unitId>.<sku> = { <เดือน 0–11>: จำนวนชิ้น } → ช่องนั้นเป็นค่าที่กรอกทับค่าระบบ (Override)
 * ใช้ตอนสร้างแผนตั้งต้น (calc.defaultSkuPlan) ของปีที่มีใน data/targets.js เท่านั้น
 * ตั้งไว้ให้ TT เขต 3 · ภาคกลาง มีแผนเท่าเป้าพอดี (สถานะ "จัดสรรครบ") สำหรับการนำเสนอ
 */
(function (SP) {
  'use strict';

  SP.data.planSeeds = {
    years: {
      2027: {
        'tt-central': { B: { 11: 3946 }, C: { 11: 2546 }, E: { 11: 2343 } }
      }
    }
  };
})(window.SP);
