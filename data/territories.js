/*
 * data/territories.js — Territory Master: เขตการขาย (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * หน่วยแบ่งเป้าของ Channel ที่ allocationUnit = 'TERRITORY' (ตอนนี้คือ TT) เลือกได้จากรายการนี้เท่านั้น
 *   id        = ใช้เป็นส่วนหนึ่งของ Key ใน store เหมือน Account (id ห้ามซ้ำกับ Account)
 *               History ปีก่อน, Listing, Run-rate และยอดจริงของ TT ผูกกับ id เขต ไม่ผูกกับคน
 *   channelId = id ใน data/channels.js
 *   active    = false → ไม่แสดงในรายการ "+ เพิ่มเขต"
 * เป้าของเขต = Quota ของเขตนั้น การแบ่งลงร้านค้า/สาขาในเขตเป็นงานของ Sales Person ระบบไม่ลงถึงสาขา
 * ค่าที่แก้ในหน้าเขตการขายเก็บที่ store: master.territories
 */
(function (SP) {
  'use strict';

  SP.data.territories = [
    { id: 'tt-north',     channelId: 'tt', name: 'TT เขต 1 · ภาคเหนือ',   active: true },
    { id: 'tt-northeast', channelId: 'tt', name: 'TT เขต 2 · ภาคอีสาน',   active: true },
    { id: 'tt-central',   channelId: 'tt', name: 'TT เขต 3 · ภาคกลาง',    active: true },
    { id: 'tt-east',      channelId: 'tt', name: 'TT เขต 4 · ภาคตะวันออก', active: true },
    { id: 'tt-south',     channelId: 'tt', name: 'TT เขต 5 · ภาคใต้',      active: true }
  ];
})(window.SP);
