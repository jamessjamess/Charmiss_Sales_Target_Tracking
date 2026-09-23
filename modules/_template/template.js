/*
 * modules/_template/template.js — โครงตั้งต้นสำหรับ Module ใหม่
 *
 * วิธีใช้ (ดูรายละเอียดใน README.md):
 *   1. คัดลอกโฟลเดอร์ modules/_template/ เป็น modules/<ชื่อ-module>/
 *   2. เปลี่ยนชื่อไฟล์นี้เป็น <ชื่อ-module>.js และแก้ data-module ใน index.html ให้ตรง
 *   3. เปลี่ยน 'template' ด้านล่างเป็น id ของ Module (camelCase เช่น 'priceCheck')
 *   4. เพิ่ม 1 บรรทัดใน core/registry.js และข้อความหน้าใน data/content.js → pages.<id>
 *
 * หน้าที่:        (อธิบายว่า Module นี้ทำอะไร)
 * อ่านจาก data/:  (เช่น SP.data.products, SP.data.pricing)
 * store อ่าน:     (เช่น app.planYear, plan.<ปี>.topDown — สร้าง Key ด้วย SP.core.store.planKey('topDown'))
 * store เขียน:    (เช่น <id>.<key>)
 *
 * กติกา: ใช้ได้เฉพาะ SP.core.* และ SP.data.* / ห้ามเรียกโค้ดของ Module อื่น
 *        สูตรอยู่ใน SP.core.calc / จัดรูปแบบตัวเลขด้วย SP.core.format / สีใช้ class จาก CSS
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var h = C.h;

  function render(root) {
    // หัวข้อ คำอธิบาย และกล่อง "สิ่งที่ต้องการให้อนุมัติ" สร้างจาก layout.js ตาม data/content.js
    root.appendChild(C.card('ตัวอย่างที่กดลองได้', [
      h('p', null, 'ใส่เนื้อหาของ Module ที่นี่'),
      C.remainingBar(SP.core.calc.remaining(10000, 9500))
    ]));
  }

  SP.modules.template = { render: render };
})(window.SP);
