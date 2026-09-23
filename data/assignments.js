/*
 * data/assignments.js — ผู้รับผิดชอบหน่วยแบ่งเป้าตามช่วงเดือน (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 *   { unitId, salesPersonId | null, fromMonth: 'YYYY-MM', toMonth: 'YYYY-MM' | null }
 *   salesPersonId = null → ว่าง / toMonth = null → ยังรับผิดชอบอยู่
 * กฎ (ตรวจใน core/calc.js): 1 หน่วย 1 เดือน มีได้ 1 คน ช่วงห้ามทับกัน / แก้เดือนที่ผ่านไปแล้วไม่ได้
 * ไม่มีช่วงที่ครอบเดือนนั้น = ว่าง
 * ค่าที่แก้ในหน้า Sales Person เก็บที่ store: master.assignments
 *
 * ตั้งใจให้เห็น:
 *   EVEANDBOY เปลี่ยนคนเมื่อ มี.ค. 2027 (วิทยาลาออก ก.พ. 2027) → ตาราง Performance มีคนที่ลาออกแล้ว
 *   TT เขต 3 ภาคกลาง ว่าง → Alert "หน่วยที่ว่าง"
 */
(function (SP) {
  'use strict';

  SP.data.assignments = [
    { unitId: 'seven',        salesPersonId: 'sp-anan',  fromMonth: '2026-01', toMonth: null },
    { unitId: 'watsons',      salesPersonId: 'sp-pim',   fromMonth: '2026-01', toMonth: null },
    { unitId: 'eveandboy',    salesPersonId: 'sp-wit',   fromMonth: '2026-01', toMonth: '2027-02' },
    { unitId: 'eveandboy',    salesPersonId: 'sp-pim',   fromMonth: '2027-03', toMonth: null },
    { unitId: 'beautrium',    salesPersonId: 'sp-kam',   fromMonth: '2026-01', toMonth: null },
    { unitId: 'cjexpress',    salesPersonId: 'sp-kam',   fromMonth: '2026-01', toMonth: null },
    { unitId: 'konvy',        salesPersonId: 'sp-kam',   fromMonth: '2026-01', toMonth: null },
    { unitId: 'lotuss',       salesPersonId: 'sp-kam',   fromMonth: '2026-01', toMonth: null },
    { unitId: 'tsuruha',      salesPersonId: 'sp-kam',   fromMonth: '2026-01', toMonth: null },
    { unitId: 'tt-north',     salesPersonId: 'sp-korn',  fromMonth: '2026-01', toMonth: null },
    { unitId: 'tt-northeast', salesPersonId: 'sp-nuch',  fromMonth: '2026-01', toMonth: null },
    { unitId: 'tt-east',      salesPersonId: 'sp-thana', fromMonth: '2026-06', toMonth: null },
    { unitId: 'tt-south',     salesPersonId: 'sp-thana', fromMonth: '2026-06', toMonth: null },
    { unitId: 'shopee',       salesPersonId: 'sp-mild',  fromMonth: '2026-01', toMonth: null },
    { unitId: 'lazada',       salesPersonId: 'sp-ton',   fromMonth: '2026-01', toMonth: null },
    { unitId: 'tiktok',       salesPersonId: 'sp-mild',  fromMonth: '2026-01', toMonth: null },
    { unitId: 'exp-kh',       salesPersonId: 'sp-kam',   fromMonth: '2027-01', toMonth: null },
    { unitId: 'exp-la',       salesPersonId: 'sp-kam',   fromMonth: '2027-01', toMonth: null },
    { unitId: 'exp-mm',       salesPersonId: 'sp-kam',   fromMonth: '2027-01', toMonth: null }
  ];
})(window.SP);
