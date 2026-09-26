/*
 * core/registry.js — รายชื่อ Module (ที่เดียวที่กำหนด Side Menu และลำดับ Tour)
 *
 * เพิ่ม Module ใหม่ = คัดลอก modules/_template/ แล้วเพิ่ม 1 บรรทัดใน LIST
 *   id      = ชื่อที่ Module ลงทะเบียนไว้ใน SP.modules และ Key ใน SP.data.content.pages
 *   title   = ชื่อเต็ม (หัวข้อสำรองเมื่อ content.js ไม่มี title)
 *   short   = ชื่อใน Side Menu และปุ่มก่อนหน้า/ถัดไป ({territoryChannels} = ชื่อ Channel ที่แบ่งตามเขต จาก Channel Master)
 *   icon    = ข้อความสั้นในไอคอนตอนพับเมนู (หน้าใน Sales Planning ใช้เลขขั้น)
 *   path    = Path จาก Root ไปยัง index.html ของ Module (ต้องลงท้ายด้วย index.html)
 *   group   = กลุ่มใน Side Menu: 'sales-planning' | 'product-master' | 'account-master' | 'role-management' (CR-25 แทน 'system-settings') | 'project-info'
 *             (null = ไม่อยู่ในเมนู)
 *   tour    = ลำดับขั้นใน Sales Planning (null = ไม่มีเลขขั้นและปุ่มก่อนหน้า/ถัดไป)
 *   visible = แสดงใน Side Menu หรือไม่ (false = ซ่อนไว้ ไฟล์ยังอยู่ เปิดตรงได้ เปิดกลับได้โดยเปลี่ยนเป็น true)
 *   year    = true → หน้าอิงปีแผน แสดงตัวเลือกปี (components.planYearPicker) ต่อท้ายชื่อหน้า
 *   ชื่อที่แสดงจริงมาจาก content.js (pages.<id>.title / short / titleTip) title / short ในนี้เป็นค่าสำรอง
 *   fit     = true → หน้าสูงเท่าจอ (จอกว้างตั้งแต่ 1024px) ตาราง/กราฟเลื่อนภายในพื้นที่ของตัวเอง (body.fit-screen)
 *   perm    = (CR-25) id ของหน้าที่ใช้สิทธิ์ร่วม — หน้านี้ไม่มีแถวของตัวเองในเมทริกซ์สิทธิ์ (Roles · Users ใช้สิทธิ์ของ Permissions = roleManagement)
 *   open    = (CR-25) true → ทุกบทบาทเห็นเสมอ ไม่อยู่ในเมทริกซ์สิทธิ์ (เกี่ยวกับ Prototype)
 *   CR-23: ชื่อ 4 ขั้นของ Sales Planning เป็นภาษาอังกฤษ (Annual Target · Sub-channel Allocation · SKU Planning · Plan Summary) id คงเดิม
 * CR-25: เลขขั้น "ขั้นที่ x/n" คงที่ (x = tour · n = จำนวนขั้นทั้งหมด) แม้บางขั้นมองไม่เห็น / ปุ่มก่อนหน้า/ถัดไปข้ามขั้นที่มองไม่เห็น (step)
 * index.html ที่ Root พาไปหน้าเริ่มต้นของบทบาท (core/permissions.js homePage)
 */
(function (SP) {
  'use strict';

  var GROUPS = ['sales-planning', 'product-master', 'account-master', 'role-management', 'project-info'];

  var LIST = [
    { id: 'topDown',       title: 'Annual Target',               short: 'Annual Target',          path: 'modules/top-down/index.html',         group: 'sales-planning', tour: 1,    visible: true, fit: true, year: true },
    { id: 'phasing',       title: 'Sub-channel Allocation',      short: 'Sub-channel Allocation', path: 'modules/phasing/index.html',          group: 'sales-planning', tour: 2,    visible: true, fit: true, year: true },
    { id: 'skuPlanning',   title: 'SKU Planning',                short: 'SKU Planning',           path: 'modules/sku-planning/index.html',     group: 'sales-planning', tour: 3,    visible: true, fit: true, year: true },
    { id: 'summary',       title: 'Plan Summary',                short: 'Plan Summary',           path: 'modules/summary/index.html',          group: 'sales-planning', tour: 4,    visible: true, year: true },
    { id: 'productList',   title: 'รายการสินค้า',                short: 'รายการสินค้า',           icon: 'P', path: 'modules/products/index.html',       group: 'product-master', tour: null, visible: true, fit: true },
    { id: 'npdPlan',       title: 'แผนการเปิดตัวสินค้าใหม่ (NPD)', short: 'แผน NPD',             icon: 'N', path: 'modules/npd-plan/index.html',       group: 'product-master', tour: null, visible: true, fit: true, year: true },
    { id: 'promotionPrice', title: 'ราคาขายต่อ Account',         short: 'ราคาขายต่อ Account',        icon: '%', path: 'modules/promotions/index.html',     group: 'product-master', tour: null, visible: true, fit: true, year: true },
    { id: 'productMaster', title: 'Listing และวันเริ่มขาย',      short: 'Listing และวันเริ่มขาย', icon: 'L', path: 'modules/product-master/index.html', group: 'product-master', tour: null, visible: true, fit: true, year: true },
    { id: 'taxonomy',      title: 'หมวดสินค้าและ Series',        short: 'หมวดสินค้าและ Series',   icon: 'C', path: 'modules/taxonomy/index.html',       group: 'product-master', tour: null, visible: true, fit: true },
    { id: 'accounts',      title: 'Account',                     short: 'Account',               icon: 'A', path: 'modules/accounts/index.html',       group: 'account-master', tour: null, visible: true, fit: true },
    { id: 'territories',   title: 'เขตการขายและร้านค้า',          short: 'เขตการขายและร้านค้า ({territoryChannels})', icon: 'T', path: 'modules/territories/index.html', group: 'account-master', tour: null, visible: true, fit: true },
    { id: 'salespeople',   title: 'ผู้รับผิดชอบ',                short: 'ผู้รับผิดชอบ',           icon: 'S', path: 'modules/salespeople/index.html', group: 'account-master', tour: null, visible: true, fit: true, year: true },
    { id: 'salesTeam',     title: 'ทีมขาย',                      short: 'ทีมขาย',                icon: 'G', path: 'modules/sales-team/index.html',  group: 'account-master', tour: null, visible: true },
    // CR-25: Role Management 3 หน้าใช้สิทธิ์เดียวกัน (roleManagement) · ไอคอน K / R / U ไม่ซ้ำกับหน้าอื่น
    { id: 'roleManagement', title: 'Permissions',                short: 'Permissions',            icon: 'K', path: 'modules/role-management/index.html', group: 'role-management', tour: null, visible: true, fit: true },
    { id: 'roleRoles',     title: 'Roles',                       short: 'Roles',                  icon: 'R', path: 'modules/role-management/roles/index.html', group: 'role-management', tour: null, visible: true, fit: true, perm: 'roleManagement' },
    { id: 'roleUsers',     title: 'Users',                       short: 'Users',                  icon: 'U', path: 'modules/role-management/users/index.html', group: 'role-management', tour: null, visible: true, fit: true, perm: 'roleManagement' },
    { id: 'aboutPrototype', title: 'เกี่ยวกับ Prototype',        short: 'เกี่ยวกับ Prototype',     icon: 'i', path: 'modules/about-prototype/index.html', group: 'project-info', tour: null, visible: true, fit: true, open: true }
  ];

  function byTour(a, b) { return (a.tour == null ? 999 : a.tour) - (b.tour == null ? 999 : b.tour); }

  SP.core.registry = {
    list: LIST,
    groups: GROUPS,
    // หน้าใน Sales Planning ที่แสดงอยู่ เรียงตามลำดับ
    //   allowed(entry) → bool = หน้าที่ผู้ใช้เห็น (permissions.pageVisible) ไม่ระบุ = ทุกหน้า
    tour: function (allowed) {
      return LIST.filter(function (e) { return e.visible && e.group === 'sales-planning' && e.tour != null && (!allowed || allowed(e)); }).sort(byTour);
    },
    // CR-25: ขั้นของหน้า → { n (เลขขั้นคงที่ = tour), total (ขั้นทั้งหมด), prev, next (ขั้นที่เห็นก่อน/หลัง ข้ามขั้นที่มองไม่เห็น), first (ขั้นแรกที่เห็น) }
    //   หน้าที่ไม่อยู่ใน Sales Planning = null
    step: function (entry, allowed) {
      var all = this.tour();
      if (!entry || all.indexOf(entry) < 0) return null;
      var seen = this.tour(allowed);
      return {
        n: entry.tour, total: all.length,
        prev: seen.filter(function (e) { return e.tour < entry.tour; }).pop() || null,
        next: seen.filter(function (e) { return e.tour > entry.tour; })[0] || null,
        first: seen[0] || null
      };
    },
    // Side Menu: [{ id: group, entries: [...] }] เฉพาะหน้า visible (+ allowed) กลุ่มที่ไม่มีหน้าไม่แสดง
    menu: function (allowed) {
      return GROUPS.map(function (g) {
        return { id: g, entries: LIST.filter(function (e) { return e.visible && e.group === g && (!allowed || allowed(e)); }).sort(byTour) };
      }).filter(function (g) { return g.entries.length; });
    },
    byId: function (id) { return LIST.filter(function (e) { return e.id === id; })[0] || null; },
    byPath: function (path) { return LIST.filter(function (e) { return e.path === path; })[0] || null; }
  };
})(window.SP);
