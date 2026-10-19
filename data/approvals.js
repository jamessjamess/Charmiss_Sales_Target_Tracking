/*
 * data/approvals.js — CR-39 Module Approval: ตั้งค่าขั้นอนุมัติตั้งต้นและข้อมูลตัวอย่างคำขอ (ข้อมูลเท่านั้น ไม่มี Logic · core/approval.js ใช้)
 *
 * config.revisionLock = ตั้งค่าขั้นอนุมัติของคำขอประเภท revisionLock (ปุ่ม รีเซ็ตข้อมูล คืนค่านี้):
 *   sdConfirm = ต้องให้ Sales Director ยืนยันก่อนส่งถึง MD (ค่าเริ่มต้นปิด · Management ส่ง → MD อนุมัติและ Lock)
 * CR-41: คำขอของ 2027 R1 (ส่ง · ความคิดเห็นของ MD · อนุมัติและ Lock) ย้ายไปที่ data/scenarios.js (สถานการณ์ S2 build.r1)
 */
(function (SP) {
  'use strict';

  SP.data.approvals = {
    config: {
      revisionLock: { sdConfirm: false }
    }
  };
})(window.SP);
