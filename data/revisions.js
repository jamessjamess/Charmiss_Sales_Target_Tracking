/*
 * data/revisions.js — CR-38 Revision ของ Sales Planning: รอบตั้งต้นและข้อมูลตัวอย่าง (ข้อมูลเท่านั้น ไม่มี Logic · core/revision.js ใช้)
 *
 * defaults = รอบที่มีตอนเริ่ม (ปุ่ม รีเซ็ตข้อมูล › ข้อมูลตั้งต้น): 2027 R1 ร่าง · มีผลตั้งแต่เดือนแรกของปีแผน · ทุกขั้นแก้ได้ทุกเดือน (เหมือน Phase 1)
 * sample   = ข้อมูลตัวอย่าง Revision สำหรับ Test (core/revision.js loadSample · CR-41 ไม่มีในเมนูแล้ว — หน้าจอใช้สถานการณ์ Demo S2):
 *   R1 = คำขอของ R1 ในสถานการณ์ S2 (data/scenarios.js build.r1)
 *   r2 = 2027 R2 ร่าง มีผล เม.ย. 2027 · Total 120 → 123 ล้านบาท · ECOM +4 ล้าน (หน่วยขายตามสัดส่วนเดิม) · MT −1 ล้าน ที่ Watsons
 *        ส่วนต่างของหน่วยขายลงเฉพาะ เม.ย.–ธ.ค. (calc.fillOpenMonths ตามสัดส่วนเดิมของเดือนที่เปิด) · แผน SKU ไม่เปลี่ยน
 *   userId = ผู้ทำ (data/users.js) · at = เวลา (ISO)
 */
(function (SP) {
  'use strict';

  SP.data.revisions = {
    // CR-39: createdAt = วันที่ของรายการ สร้างจากข้อมูลตั้งต้น ในประวัติของ R1 (ประวัติไม่ว่าง)
    defaults: [{ planYear: 2027, createdAt: '2026-09-01T09:00:00' }],
    sample: {
      year: 2027,
      r2: {
        effectiveMonth: '2027-04', reason: 'ECOM โตเกินคาดไตรมาสแรก', userId: 'u-mgmt', at: '2027-03-20T09:00:00',
        total: 123000000,
        channelDelta: { ecom: 4000000, mt: -1000000 },
        // หน่วยขายที่รับส่วนต่างของ Channel (ไม่ระบุ = ทุกหน่วยขายตามสัดส่วนเดิม)
        unitDelta: { mt: { watsons: -1000000 } }
      }
    }
  };
})(window.SP);
