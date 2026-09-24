/*
 * data/taxonomy.js — หมวดสินค้าและ Series (ข้อมูลเท่านั้น ไม่มี Logic)
 *
 * เจ้าของข้อมูล: ทีม Product / ค่าที่แก้ในหน้า "หมวดสินค้าและ Series" เก็บที่ store: master.taxonomy
 *   category = Category → Sub Category → Type (level: CATEGORY | SUB_CATEGORY | TYPE)
 *   series   = Series → Sub Series (level: SERIES | SUB_SERIES)
 *   { id, name, parentId, level, active, order } — active = false เลือกใหม่ในฟอร์มสินค้าไม่ได้ แต่สินค้าเดิมยังแสดงชื่อได้
 * ห้ามลบรายการที่มี SKU ใช้อยู่ (calc.removeTaxonomyNode) ให้ปิดใช้งานแทน
 *
 * CR-11: หมวดสินค้าชุดนี้ใช้กับสินค้าจริงจาก data/seed/ (Excel ยังไม่มี Category) — สินค้าได้หมวดจากคำในชื่อ
 *   ตามกฎใน data/products.js (productImport.categoryRules) และมีเครื่องหมาย inferred: true (ระบบเดาให้ ควรตรวจสอบ)
 * series ว่างไว้: core/seed.js สร้าง Series จากค่า Campaign ที่พบใน data/seed/ (ยกเว้น Existing ซึ่งไม่ใช่ Series)
 */
(function (SP) {
  'use strict';

  SP.data.taxonomy = {
    category: [
      {"id":"cat-face","name":"Face","parentId":null,"level":"CATEGORY","active":true,"order":1},
      {"id":"sub-face-base","name":"Base","parentId":"cat-face","level":"SUB_CATEGORY","active":true,"order":1},
      {"id":"type-cushion","name":"Cushion","parentId":"sub-face-base","level":"TYPE","active":true,"order":1},
      {"id":"type-foundation","name":"Foundation","parentId":"sub-face-base","level":"TYPE","active":true,"order":2},
      {"id":"sub-face-set","name":"Powder & Setting","parentId":"cat-face","level":"SUB_CATEGORY","active":true,"order":2},
      {"id":"type-powder","name":"Powder","parentId":"sub-face-set","level":"TYPE","active":true,"order":1},
      {"id":"type-setting-spray","name":"Setting Spray","parentId":"sub-face-set","level":"TYPE","active":true,"order":2},
      {"id":"sub-face-prep","name":"Primer","parentId":"cat-face","level":"SUB_CATEGORY","active":true,"order":3},
      {"id":"type-primer","name":"Primer","parentId":"sub-face-prep","level":"TYPE","active":true,"order":1},
      {"id":"cat-cheek","name":"Cheek","parentId":null,"level":"CATEGORY","active":true,"order":2},
      {"id":"sub-cheek-blush","name":"Blush","parentId":"cat-cheek","level":"SUB_CATEGORY","active":true,"order":1},
      {"id":"type-blush","name":"Blush","parentId":"sub-cheek-blush","level":"TYPE","active":true,"order":1},
      {"id":"sub-cheek-highlight","name":"Highlighter","parentId":"cat-cheek","level":"SUB_CATEGORY","active":true,"order":2},
      {"id":"type-highlighter","name":"Highlighter","parentId":"sub-cheek-highlight","level":"TYPE","active":true,"order":1},
      {"id":"cat-lip","name":"Lip","parentId":null,"level":"CATEGORY","active":true,"order":3},
      {"id":"sub-lip-color","name":"Lip Color","parentId":"cat-lip","level":"SUB_CATEGORY","active":true,"order":1},
      {"id":"type-tint","name":"Tint","parentId":"sub-lip-color","level":"TYPE","active":true,"order":1},
      {"id":"type-lip-stick","name":"Stick","parentId":"sub-lip-color","level":"TYPE","active":true,"order":2},
      {"id":"sub-lip-gloss","name":"Lip Gloss","parentId":"cat-lip","level":"SUB_CATEGORY","active":true,"order":2},
      {"id":"type-gloss","name":"Gloss","parentId":"sub-lip-gloss","level":"TYPE","active":true,"order":1},
      {"id":"sub-lip-care","name":"Lip Care","parentId":"cat-lip","level":"SUB_CATEGORY","active":true,"order":3},
      {"id":"type-lip-care","name":"Balm / Serum / Oil","parentId":"sub-lip-care","level":"TYPE","active":true,"order":1},
      {"id":"cat-eye","name":"Eye","parentId":null,"level":"CATEGORY","active":true,"order":4},
      {"id":"sub-eye-brow","name":"Brow","parentId":"cat-eye","level":"SUB_CATEGORY","active":true,"order":1},
      {"id":"type-brow","name":"Brow Pencil","parentId":"sub-eye-brow","level":"TYPE","active":true,"order":1},
      {"id":"sub-eye-liner","name":"Eyeliner","parentId":"cat-eye","level":"SUB_CATEGORY","active":true,"order":2},
      {"id":"type-eyeliner","name":"Eyeliner","parentId":"sub-eye-liner","level":"TYPE","active":true,"order":1},
      {"id":"sub-eye-shadow","name":"Eyeshadow","parentId":"cat-eye","level":"SUB_CATEGORY","active":true,"order":3},
      {"id":"type-palette","name":"Eyeshadow Palette","parentId":"sub-eye-shadow","level":"TYPE","active":true,"order":1},
      {"id":"cat-skin","name":"Skincare","parentId":null,"level":"CATEGORY","active":true,"order":5},
      {"id":"sub-skin-toner","name":"Toner","parentId":"cat-skin","level":"SUB_CATEGORY","active":true,"order":1},
      {"id":"type-toner-pad","name":"Toner Pad","parentId":"sub-skin-toner","level":"TYPE","active":true,"order":1}
    ],
    series: []
  };
})(window.SP);
