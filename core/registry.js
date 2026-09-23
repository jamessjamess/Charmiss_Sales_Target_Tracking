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
 *   fit     = true → หน้าสูงเท่าจอ (จอกว้างตั้งแต่ 1024px) ตาราง/กราฟเลื่อนภายในพื้นที่ของตัวเอง (body.fit-screen)
 * เลขขั้น "ขั้นที่ x/n" และปุ่มก่อนหน้า/ถัดไป นับเฉพาะหน้า visible ในกลุ่ม Sales Planning
 * index.html ที่ Root พาไปหน้าแรกของกลุ่ม Sales Planning
 */
(function (SP) {
  'use strict';

  var GROUPS = ['sales-planning', 'product-master', 'account-master', 'project-info'];

  var LIST = [
    { id: 'home',          title: 'ภาพรวม',                     short: 'ภาพรวม',                path: 'index.html',                          group: null,             tour: null, visible: false },
    { id: 'topDown',       title: 'แบ่งเป้า Top-down',           short: 'แบ่งเป้า Top-down',      path: 'modules/top-down/index.html',         group: 'sales-planning', tour: 1,    visible: true, fit: true },
    { id: 'phasing',       title: 'กระจายเป้ารายเดือน',          short: 'กระจายเป้ารายเดือน',     path: 'modules/phasing/index.html',          group: 'sales-planning', tour: 2,    visible: true },
    { id: 'skuPlanning',   title: 'วางแผนราย SKU',               short: 'วางแผนราย SKU',          path: 'modules/sku-planning/index.html',     group: 'sales-planning', tour: 3,    visible: true, fit: true },
    { id: 'summary',       title: 'รายงานสรุปแผน',               short: 'รายงานสรุปแผน',          path: 'modules/summary/index.html',          group: 'sales-planning', tour: 4,    visible: true },
    { id: 'productMaster', title: 'Listing และวันเริ่มขาย',      short: 'Listing และวันเริ่มขาย', icon: 'L', path: 'modules/product-master/index.html', group: 'product-master', tour: null, visible: true },
    { id: 'accounts',      title: 'Account',                     short: 'Account',               icon: 'A', path: 'modules/accounts/index.html',       group: 'account-master', tour: null, visible: true },
    { id: 'territories',   title: 'เขตการขาย',                   short: 'เขตการขาย ({territoryChannels})', icon: 'T', path: 'modules/territories/index.html', group: 'account-master', tour: null, visible: true },
    { id: 'salespeople',   title: 'ผู้รับผิดชอบ',                short: 'ผู้รับผิดชอบ',           icon: 'S', path: 'modules/salespeople/index.html', group: 'account-master', tour: null, visible: true, fit: true },
    { id: 'aboutPrototype', title: 'เกี่ยวกับ Prototype',        short: 'เกี่ยวกับ Prototype',     icon: 'i', path: 'modules/about-prototype/index.html', group: 'project-info', tour: null, visible: true, fit: true },
    // ซ่อนไว้ (ห้ามลบไฟล์): เนื้อหาย้ายไปอยู่ในหน้าอื่นแล้ว
    { id: 'masterData',    title: 'ใครดูแลข้อมูลอะไร',            short: 'เจ้าของข้อมูล',           path: 'modules/master-data/index.html',      group: null,             tour: null, visible: false },
    { id: 'skuStatus',     title: 'Status vs วิธีเติมยอด',         short: 'Status SKU',            path: 'modules/sku-status/index.html',       group: null,             tour: null, visible: false },
    { id: 'measureChain',  title: 'จากจำนวนชิ้นถึง Net Sales',     short: 'ชิ้น → Net Sales',       path: 'modules/measure-chain/index.html',    group: null,             tour: null, visible: false },
    { id: 'approval',      title: 'อนุมัติ ล็อกเป้า Forecast',      short: 'อนุมัติ',                path: 'modules/approval/index.html',         group: null,             tour: null, visible: false }
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
