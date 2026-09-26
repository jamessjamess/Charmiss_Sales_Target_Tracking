/*
 * tests/taxonomy.test.js — Test ของ core/taxonomy.js (CR-15 ข้อ 8) ไม่ใช้ DOM
 *
 * รันด้วย Node: node tests/run.js taxonomy / ในเบราว์เซอร์: tests/calc.test.html รวม Test ชุดนี้ด้วย
 * ใช้ข้อมูลจริง (SP.data.taxonomy, SP.data.products จาก data/seed/) ไม่แก้ข้อมูลต้นฉบับ (ทุกฟังก์ชันคืนสำเนาใหม่)
 * store: ไม่อ่าน ไม่เขียน
 */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.tests = SP.tests || {};

  function T() { return SP.core.taxonomy; }
  function D() { return SP.data; }
  function tax() { return JSON.parse(JSON.stringify(D().taxonomy)); }
  function products() { return D().products; }
  function node(kind, id) { return T().find(D().taxonomy, kind, id); }
  function count(prods, kind, id, t) { return T().countSkus(T().find(t || D().taxonomy, kind, id), prods).total; }
  function keys(prods, field, id) { return prods.filter(function (p) { return p[field] === id; }).map(function (p) { return p.trCode || p.tempCode; }); }

  SP.tests.taxonomy = [
    {
      name: 'tx-1. validateName("  primer ", ["Primer"]) → ซ้ำ · validateName("", []) → ว่าง · ชื่อใหม่ผ่าน (ตัดช่องว่างหัวท้าย)',
      expected: [false, 'duplicate', false, 'empty', true, 'Lip Balm'],
      actual: function () {
        var a = T().validateName('  primer ', ['Primer']), b = T().validateName('', []), c = T().validateName('  Lip Balm ', ['Lip Care']);
        return [a.ok, a.error, b.ok, b.error, c.ok, c.name];
      }
    },
    {
      name: 'tx-2. canDelete: Blush (มี SKU) → false · Highlighter Type (ไม่มี SKU ไม่มีลูก) → true · Highlighter Sub Category (มีลูก) → false',
      expected: [false, true, false],
      actual: function () {
        var t = D().taxonomy;
        return [T().canDelete(node('category', 'type-blush'), products(), t), T().canDelete(node('category', 'type-highlighter'), products(), t),
          T().canDelete(node('category', 'sub-cheek-highlight'), products(), t)];
      }
    },
    {
      name: 'tx-3. moveSkus Highlighter ← SKU 16470, 16480 จาก Blush → Blush ลด 2 · Highlighter เพิ่ม 2 · สินค้าทั้งสองชี้ไป Highlighter (Type ตามปลายทาง)',
      expected: [25, 23, 0, 2, true, ['sub-cheek-highlight', 'sub-cheek-highlight'], ['type-highlighter', 'type-highlighter'], 2],
      actual: function () {
        var before = products();
        var res = T().moveSkus(before, 'sub-cheek-blush', 'sub-cheek-highlight', ['16470', '16480'], D().taxonomy);
        var moved = res.products.filter(function (p) { return p.trCode === '16470' || p.trCode === '16480'; });
        return [count(before, 'category', 'sub-cheek-blush'), count(res.products, 'category', 'sub-cheek-blush'),
          count(before, 'category', 'sub-cheek-highlight'), count(res.products, 'category', 'sub-cheek-highlight'),
          before.filter(function (p) { return p.trCode === '16470'; })[0].subCategoryId === 'sub-cheek-blush',
          moved.map(function (p) { return p.subCategoryId; }), moved.map(function (p) { return p.typeId; }), res.moved];
      }
    },
    {
      name: 'tx-4. mergeNodes(Lip Gloss → Lip Color) → SKU ของ Lip Gloss ทั้งหมดอยู่ที่ Lip Color · Lip Gloss และ Type ใต้ปิดใช้งาน',
      expected: [0, 46, false, false, true],
      actual: function () {
        var res = T().mergeNodes(D().taxonomy, products(), 'sub-lip-gloss', 'sub-lip-color');
        return [count(res.products, 'category', 'sub-lip-gloss', res.taxonomy), count(res.products, 'category', 'sub-lip-color', res.taxonomy),
          T().find(res.taxonomy, 'category', 'sub-lip-gloss').active, T().find(res.taxonomy, 'category', 'type-gloss').active,
          node('category', 'sub-lip-gloss').active !== false];
      }
    },
    {
      name: 'tx-5. moveNode Sub Category Primer จาก Face ไป Skincare → Type ย้ายตาม · SKU ได้ Category ใหม่ · ชื่อซ้ำกับปลายทาง → ไม่ยอมรับ',
      expected: [true, 'cat-skin', 'sub-face-prep', ['cat-skin'], false, 'duplicate'],
      actual: function () {
        var res = T().moveNode(D().taxonomy, 'category', 'sub-face-prep', 'cat-skin', products());
        var ps = res.products.filter(function (p) { return p.subCategoryId === 'sub-face-prep'; });
        var t = tax();
        var add = T().addNode(t, 'category', 'cat-skin', 'Primer', 'sub-skin-primer');
        var dup = T().moveNode(add.taxonomy, 'category', 'sub-face-prep', 'cat-skin', products());
        return [res.ok, T().find(res.taxonomy, 'category', 'sub-face-prep').parentId, T().find(res.taxonomy, 'category', 'type-primer').parentId,
          ps.map(function (p) { return p.categoryId; }).filter(function (v, i, a) { return a.indexOf(v) === i; }), dup.ok, dup.error];
      }
    },
    {
      name: 'tx-6. findWarnings → ชื่อซ้ำ Primer → Primer · Blush → Blush · Eyeliner → Eyeliner (+ Highlighter) · ไม่มี SKU: Highlighter',
      expected: [true, true, true, true, true],
      actual: function () {
        var w = T().findWarnings(D().taxonomy, products(), '2027-03-01');
        function has(type, id) { return w.some(function (x) { return x.type === type && x.id === id; }); }
        return [has('dupParent', 'type-primer'), has('dupParent', 'type-blush'), has('dupParent', 'type-eyeliner'),
          has('noSku', 'sub-cheek-highlight'), has('noSku', 'type-highlighter')];
      }
    },
    {
      name: 'tx-7. countSkus แท็บหมวดสินค้า กรอง Series Sanrio Blooming Heart → นับเฉพาะ SKU ของ Series นั้น (x / y) · ผลรวม Category = จำนวน SKU ของ Series',
      expected: [true, true, 16],
      actual: function () {
        var ser = 'ser-sanrio-blooming-heart';
        var cross = T().crossFilterOf(D().taxonomy, 'series', [ser]);
        var face = T().countSkus(node('category', 'cat-face'), products(), cross);
        var expect = products().filter(function (p) { return p.categoryId === 'cat-face' && p.seriesId === ser; }).length;
        var sum = T().children(D().taxonomy, 'category', null).reduce(function (s, c) { return s + T().countSkus(c, products(), cross).filtered; }, 0);
        return [face.filtered === expect && face.total === 23, face.filtered < face.total, sum];
      }
    },
    {
      name: 'tx-8. crossTab(products, "series", "category") → ผลรวมทุกช่อง = จำนวน SKU ที่มีทั้ง Series และ Category (115)',
      expected: [115, 115, true],
      actual: function () {
        var ct = T().crossTab(products(), 'series', 'category', D().taxonomy);
        var cells = 0;
        ct.rows.forEach(function (r) { Object.keys(r.cells).forEach(function (k) { cells += r.cells[k]; }); });
        var both = products().filter(function (p) { return p.seriesId && p.categoryId; }).length;
        return [cells, both, ct.total === both && ct.cols.reduce(function (s, c) { return s + c.total; }, 0) === both];
      }
    },
    {
      name: 'tx-9. ลากเปลี่ยนลำดับ: ภายในรายการแม่เดียวกันได้ (Lip Care ไปก่อน Lip Color) · ข้ามรายการแม่ → ไม่ยอมรับ',
      expected: [true, ['sub-lip-care', 'sub-lip-color', 'sub-lip-gloss'], false, 'parent'],
      actual: function () {
        var ok = T().reorderNode(D().taxonomy, 'category', 'sub-lip-care', 'sub-lip-color', false);
        var bad = T().reorderNode(D().taxonomy, 'category', 'sub-lip-care', 'sub-face-base', false);
        return [ok.ok, T().children(ok.taxonomy, 'category', 'cat-lip').map(function (n) { return n.id; }), bad.ok, bad.error];
      }
    },
    {
      name: 'tx-10. filterTree: กรอง Category Lip (มิติเดียวกัน) → แสดง Lip และลูกหลานเท่านั้น · สถานะปิดใช้งาน → เฉพาะรายการที่ปิด + เส้นทาง · ข้อมูล ไม่มี SKU → Highlighter',
      expected: [true, false, true, ['sub-cheek-highlight', 'type-highlighter'], true],
      actual: function () {
        var f = T().filterTree(D().taxonomy, 'category', { category: ['cat-lip'], status: 'active' }, products());
        var none = T().filterTree(D().taxonomy, 'category', { data: 'noSku', status: 'active' }, products());
        var t = T().setActive(D().taxonomy, 'category', 'type-gloss', false);
        var inactive = T().filterTree(t, 'category', { status: 'inactive' }, products());
        return [!!f.show['type-tint'] && !!f.show['cat-lip'], !!f.show['cat-face'], !!f.show['cat-lip'],
          Object.keys(none.match).filter(function (k) { return none.match[k]; }), !!inactive.match['type-gloss'] && !inactive.match['sub-lip-gloss'] && !!inactive.show['sub-lip-gloss']];
      }
    },
    {
      name: 'tx-11. Series สิ้นสุดแล้ว: endDate ก่อนวันนี้ → คำเตือน expired + filterTree ข้อมูล "Series สิ้นสุดแล้ว" / ไม่มี endDate → ไม่เตือน',
      expected: [true, false, true],
      actual: function () {
        var t = tax();
        T().find(t, 'series', 'ser-sanrio-paradise-island').endDate = '2026-12-31';
        var w = T().findWarnings(t, products(), '2027-03-01');
        var f = T().filterTree(t, 'series', { data: 'expired', status: 'all' }, products(), '2027-03-01');
        return [w.some(function (x) { return x.type === 'expired' && x.id === 'ser-sanrio-paradise-island'; }), w.some(function (x) { return x.type === 'expired' && x.id === 'ser-charming-lab'; }),
          !!f.match['ser-sanrio-paradise-island'] && !f.match['ser-charming-lab']];
      }
    },
    {
      name: 'tx-12. ย้าย SKU ไปปลายทางที่ปิดใช้งาน → ไม่ยอมรับ · ย้ายข้ามระดับ → ไม่ยอมรับ · ข้อมูลต้นฉบับไม่ถูกแก้',
      expected: ['inactive', 'level', 25],
      actual: function () {
        var t = T().setActive(D().taxonomy, 'category', 'sub-cheek-highlight', false);
        var a = T().moveSkus(products(), 'sub-cheek-blush', 'sub-cheek-highlight', null, t);
        var b = T().moveSkus(products(), 'sub-cheek-blush', 'type-highlighter', null, D().taxonomy);
        return [a.error, b.error, keys(products(), 'subCategoryId', 'sub-cheek-blush').length];
      }
    }
  ];
})();
