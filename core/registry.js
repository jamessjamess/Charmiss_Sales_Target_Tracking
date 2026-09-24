/*
 * core/registry.js — รายชื่อ Module (ที่เดียวที่กำหนด Side Menu และลำดับ Tour)
 *
 * เพิ่ม Module ใหม่ = คัดลอก modules/_template/ แล้วเพิ่ม 1 บรรทัดใน LIST
 *   id      = ชื่อที่ Module ลงทะเบียนไว้ใน SP.modules และ Key ใน SP.data.content.pages
 *   title   = ชื่อเต็ม (หัวข้อสำรองเมื่อ content.js ไม่มี title)
 *   short   = ชื่อใน Side Menu และปุ่มก่อนหน้า/ถัดไป ({territoryChannels} = ชื่อ Channel ที่แบ่งตามเขต จาก Channel Master)
 *   icon    = ข้อความสั้นในไอคอนตอนพับเมนู (หน้าใน Sales Planning ใช้เลขขั้น)
 *   path    = Path จาก Root ไปยัง index.html ของ Module (ต้องลงท้ายด้วย index.html)
 *   group   = กลุ่มใน Side Menu: 'sales-planning' | 'product-master' | 'account-master' | 'project-info' (null = ไม่อยู่ในเมนู)
 *   tour    = ลำดับขั้นใน Sales Planning (null = ไม่มีเลขขั้นและปุ่มก่อนหน้า/ถัดไป)
 *   visible = แสดงใน Side Menu หรือไม่ (false = ซ่อนไว้ ไฟล์ยังอยู่ เปิดตรงได้ เปิดกลับได้โดยเปลี่ยนเป็น true)
 *   year    = true → หน้าอิงปีแผน แสดงตัวเลือกปี (components.planYearPicker) ต่อท้ายชื่อหน้า
 *   ชื่อที่แสดงจริงมาจาก content.js (pages.<id>.title / short / titleTip) title / short ในนี้เป็นค่าสำรอง
 *   fit     = true → หน้าสูงเท่าจอ (จอกว้างตั้งแต่ 1024px) ตาราง/กราฟเลื่อนภายในพื้นที่ของตัวเอง (body.fit-screen)
 * เลขขั้น "ขั้นที่ x/n" และปุ่มก่อนหน้า/ถัดไป นับเฉพาะหน้า visible ในกลุ่ม Sales Planning
 * index.html ที่ Root พาไปหน้าแรกของกลุ่ม Sales Planning
 */
(function (SP) {
  'use strict';

  var GROUPS = ['sales-planning', 'product-master', 'account-master', 'project-info'];

  var LIST = [
    { id: 'topDown',       title: 'จัดสรรเป้าหมายประจำปี',       short: 'เป้าหมายประจำปี',        path: 'modules/top-down/index.html',         group: 'sales-planning', tour: 1,    visible: true, fit: true, year: true },
    { id: 'phasing',       title: 'จัดสรรเป้าหมายรายเดือน',      short: 'เป้าหมายรายเดือน',       path: 'modules/phasing/index.html',          group: 'sales-planning', tour: 2,    visible: true, year: true },
    { id: 'skuPlanning',   title: 'วางแผนยอดขายราย SKU',         short: 'แผนยอดขายราย SKU',       path: 'modules/sku-planning/index.html',     group: 'sales-planning', tour: 3,    visible: true, fit: true, year: true },
    { id: 'summary',       title: 'รายงานสรุปแผน',               short: 'รายงานสรุปแผน',          path: 'modules/summary/index.html',          group: 'sales-planning', tour: 4,    visible: true, year: true },
    { id: 'productList',   title: 'รายการสินค้า',                short: 'รายการสินค้า',           icon: 'P', path: 'modules/products/index.html',       group: 'product-master', tour: null, visible: true, fit: true },
    { id: 'npdPlan',       title: 'แผนการเปิดตัวสินค้าใหม่ (NPD)', short: 'แผน NPD',             icon: 'N', path: 'modules/npd-plan/index.html',       group: 'product-master', tour: null, visible: true, fit: true, year: true },
    { id: 'promotionPrice', title: 'Promotion Price',            short: 'Promotion Price',        icon: '%', path: 'modules/promotions/index.html',     group: 'product-master', tour: null, visible: true, fit: true, year: true },
    { id: 'productMaster', title: 'Listing และวันเริ่มขาย',      short: 'Listing และวันเริ่มขาย', icon: 'L', path: 'modules/product-master/index.html', group: 'product-master', tour: null, visible: true, fit: true, year: true },
    { id: 'taxonomy',      title: 'หมวดสินค้าและ Series',        short: 'หมวดสินค้าและ Series',   icon: 'C', path: 'modules/taxonomy/index.html',       group: 'product-master', tour: null, visible: true, fit: true },
    { id: 'accounts',      title: 'Account',                     short: 'Account',               icon: 'A', path: 'modules/accounts/index.html',       group: 'account-master', tour: null, visible: true, fit: true },
    { id: 'territories',   title: 'เขตการขาย',                   short: 'เขตการขาย ({territoryChannels})', icon: 'T', path: 'modules/territories/index.html', group: 'account-master', tour: null, visible: true },
    { id: 'salespeople',   title: 'ผู้รับผิดชอบ',                short: 'ผู้รับผิดชอบ',           icon: 'S', path: 'modules/salespeople/index.html', group: 'account-master', tour: null, visible: true, fit: true, year: true },
    { id: 'aboutPrototype', title: 'เกี่ยวกับ Prototype',        short: 'เกี่ยวกับ Prototype',     icon: 'i', path: 'modules/about-prototype/index.html', group: 'project-info', tour: null, visible: true, fit: true }
  ];

  function byTour(a, b) { return (a.tour == null ? 999 : a.tour) - (b.tour == null ? 999 : b.tour); }

  SP.core.registry = {
    list: LIST,
    groups: GROUPS,
    // หน้าใน Sales Planning ที่แสดงอยู่ เรียงตามลำดับ → เลขขั้น และปุ่มก่อนหน้า/ถัดไป
    tour: function () {
      return LIST.filter(function (e) { return e.visible && e.group === 'sales-planning' && e.tour != null; }).sort(byTour);
    },
    // Side Menu: [{ id: group, entries: [...] }] เฉพาะหน้า visible
    menu: function () {
      return GROUPS.map(function (g) {
        return { id: g, entries: LIST.filter(function (e) { return e.visible && e.group === g; }).sort(byTour) };
      }).filter(function (g) { return g.entries.length; });
    },
    byId: function (id) { return LIST.filter(function (e) { return e.id === id; })[0] || null; },
    byPath: function (path) { return LIST.filter(function (e) { return e.path === path; })[0] || null; }
  };
})(window.SP);
