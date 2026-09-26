/*
 * data/territories.js — Territory Master: เขตการขาย (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * หน่วยแบ่งเป้าของ Channel ที่ allocationUnit = 'TERRITORY' (ตอนนี้คือ TT) เลือกได้จากรายการนี้เท่านั้น
 *   id        = ใช้เป็นส่วนหนึ่งของ Key ใน store เหมือน Account (id ห้ามซ้ำกับ Account)
 *               History ปีก่อน, Listing, Run-rate และยอดจริงของ TT ผูกกับ id เขต ไม่ผูกกับคน
 *   channelId = id ใน data/channels.js
 *   active    = false → ไม่แสดงในรายการ "+ เพิ่มเขต"
 * เป้าของเขต = Quota ของเขตนั้น เขตการขาย = กลุ่มร้านค้า (CR-16) ร้านค้าอยู่ในเขตใดในเดือนใดเก็บที่ storeAssignments (core/stores.js)
 * CR-16: เขตของ TT มาจาก data/seed/seed-tt-stores.js (core/stores.js นำเข้าตอนโหลด แทนที่เขตของ Channel เดียวกันในรายการนี้)
 *   TT เขต 1 · เหนือ–กลาง–กทม. · TT เขต 2 · อีสานตอนบน–ลาว · TT เขต 3 · อีสานใต้–ตะวันออก · TT เขต 4 · ตะวันตก–ใต้ (id TT-01 … TT-04)
 * ค่าที่แก้ในหน้าเขตการขายและร้านค้าเก็บที่ store: master.territories
 */
(function (SP) {
  'use strict';

  // เขตของ Channel อื่นที่แบ่งตามเขตแต่ไม่มีข้อมูลร้านค้า (ตอนนี้ไม่มี) / TT เติมโดย core/stores.js
  SP.data.territories = [];
})(window.SP);
