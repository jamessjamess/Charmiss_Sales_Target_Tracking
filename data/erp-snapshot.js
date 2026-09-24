/*
 * data/erp-snapshot.js — ข้อมูลสินค้าจาก ERP สำหรับเดโม "เปรียบเทียบกับ ERP" (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * หลังนำเข้า (core/seed.js) SP.data.erpSnapshot = [{ trCode, name, barcode, rsp }] เทียบกับ Product Master ด้วย calc.compareErp
 *   สร้างจากสินค้าใน data/seed/ (ชื่อ + RSP) แล้วใส่ความต่างตามรายการด้านล่าง (ความต่างเป็นตัวอย่าง ไม่ใช่ข้อมูล ERP จริง)
 *     rename   = ชื่อใน ERP ต่างจาก Master / rsp = RSP ใน ERP ต่าง / barcode = ERP มี Barcode ที่ Master ยังไม่มี
 *     onlyErp  = มีใน ERP แต่ไม่มีใน Master / notInErp = มีใน Master แต่ไม่มีใน ERP
 */
(function (SP) {
  'use strict';

  SP.data.erpImport = {
    rename: { '16370': 'CHARMISS YOU MAKE ME BLUSH LIQUID BLUSH 04 FAITH LOVE' },
    rsp: { '15000': 419 },
    barcode: { '12130': '8859580712130', '12140': '8859580712140', '33400': '8859580733400' },
    onlyErp: [
      { trCode: '33480', name: 'Charmiss Juicy Pop Tint 10 Lychee Rose', barcode: '', rsp: 199 },
      { trCode: '12250', name: 'CHARMISS BLOOMING HEART SOFT GLOW CUSHION SPF50+ PA++++ 03 HONEY', barcode: '', rsp: 269 }
    ],
    notInErp: ['53021']
  };

  // เติมโดย core/seed.js ตอนโหลด
  SP.data.erpSnapshot = [];
})(window.SP);
