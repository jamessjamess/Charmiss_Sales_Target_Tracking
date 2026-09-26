/*
 * data/teams.js — ทีมขายต่อ Channel และผู้ใช้จำลองของบทบาทอื่น (ข้อมูลเท่านั้น ไม่มี Logic) — CR-19 ชื่อทั้งหมดเป็นชื่อสมมติ
 *
 * SP.data.teams = [{ channelId, members: [{ salesPersonId, role: 'MANAGER' | 'OFFICER', fromMonth: 'YYYY-MM', toMonth: 'YYYY-MM' | null }] }]
 *   salesPersonId = id ใน Sales Person Master (data/salespeople.js + Sales Person TT จาก data/seed/seed-tt-stores.js)
 *   toMonth = เดือนสุดท้ายที่เป็นสมาชิก (null = ยังเป็นอยู่) / 1 Channel มีหลาย Manager และ Officer ได้ / 1 คนอยู่ได้หลาย Channel
 *   สิทธิ์แก้ไขแผนยอดขายราย SKU มาจากการเป็นสมาชิกทีม ณ เดือนปัจจุบันจำลอง (core/permissions.js)
 *   ผู้รับผิดชอบหน่วยขาย (data/assignments.js) ใช้แสดงผลและคำนวณผลงานรายคนเท่านั้น
 *   ค่าที่แก้ในหน้าทีมขายเก็บที่ store: master.teams
 * ข้อมูลตั้งต้น: MT Manager อนันต์ · Officer พิมพ์ลดา, วิทยา (ถึง ก.พ. 2027 ตามวันลาออก) /
 *   ECOM Manager ณัฐวุฒิ · Officer มิลิน, ต้นกล้า / TT Manager ประเสริฐ · Officer Sales Person TT จาก CR-16 (อัมพร ถึง ก.ค. 2026)
 * CR-21: ผู้ใช้จำลองของตัวเลือกมุมมองผู้ใช้ย้ายไป data/users.js (master.users) — ไฟล์นี้เหลือเฉพาะทีมขาย
 */
(function (SP) {
  'use strict';

  SP.data.teams = [
    { channelId: 'mt', members: [
      { salesPersonId: 'sp-anan', role: 'MANAGER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'sp-pim',  role: 'OFFICER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'sp-wit',  role: 'OFFICER', fromMonth: '2026-01', toMonth: '2027-02' }
    ] },
    { channelId: 'tt', members: [
      { salesPersonId: 'sp-pra',   role: 'MANAGER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'SP-TT-01', role: 'OFFICER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'SP-TT-02', role: 'OFFICER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'SP-TT-03', role: 'OFFICER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'SP-TT-04', role: 'OFFICER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'SP-TT-05', role: 'OFFICER', fromMonth: '2026-01', toMonth: '2026-07' }
    ] },
    { channelId: 'ecom', members: [
      { salesPersonId: 'sp-nat',  role: 'MANAGER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'sp-mild', role: 'OFFICER', fromMonth: '2026-01', toMonth: null },
      { salesPersonId: 'sp-ton',  role: 'OFFICER', fromMonth: '2026-01', toMonth: null }
    ] }
  ];
})(window.SP);
