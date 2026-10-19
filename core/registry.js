/*
 * core/registry.js — รายชื่อ Module (ที่เดียวที่กำหนด Side Menu และลำดับ Tour)
 *
 * เพิ่ม Module ใหม่ = คัดลอก modules/_template/ แล้วเพิ่ม 1 บรรทัดใน LIST
 *   id      = ชื่อที่ Module ลงทะเบียนไว้ใน SP.modules และ Key ใน SP.data.content.pages
 *   title   = ชื่อเต็ม (หัวข้อสำรองเมื่อ content.js ไม่มี title)
 *   short   = ชื่อใน Side Menu และปุ่มก่อนหน้า/ถัดไป ({territoryChannels} = ชื่อ Channel ที่แบ่งตามเขต จาก Channel Master)
 *   icon    = (CR-40) ชื่อไอคอนเส้นของ Lucide ใน assets/icons.js (SP.data.icons) แสดงหน้าชื่อในเมนูข้างและช่องค้นหาเมนู
 *             หน้าใน Sales Planning ไม่มี icon = วงกลมเลขขั้น (components.stepIcon · คงลำดับงาน)
 *   path    = Path จาก Root ไปยัง index.html ของ Module (ต้องลงท้ายด้วย index.html)
 *   group   = กลุ่มใน Side Menu: 'sales-planning' | 'approval' (CR-39) | 'product-master' | 'account-master' | 'role-management' (CR-25 แทน 'system-settings') | 'project-info'
 *             (null = ไม่อยู่ในเมนู)
 *   tour    = ลำดับขั้นใน Sales Planning (null = ไม่มีเลขขั้นและปุ่มก่อนหน้า/ถัดไป)
 *   visible = แสดงใน Side Menu หรือไม่ (false = ซ่อนไว้ ไฟล์ยังอยู่ เปิดตรงได้ เปิดกลับได้โดยเปลี่ยนเป็น true)
 *   year    = true → หน้าอิงปีแผน แสดงตัวเลือกปี (components.planYearPicker) ต่อท้ายชื่อหน้า
 *   ชื่อที่แสดงจริงมาจาก content.js (pages.<id>.title / short / titleTip) title / short ในนี้เป็นค่าสำรอง
 *   fit     = true → หน้าสูงเท่าจอ (จอกว้างตั้งแต่ 1024px) ตาราง/กราฟเลื่อนภายในพื้นที่ของตัวเอง (body.fit-screen)
 *   perm    = (CR-25) id ของหน้าที่ใช้สิทธิ์ร่วม — หน้านี้ไม่มีแถวของตัวเองในเมทริกซ์สิทธิ์ (Roles · Users ใช้สิทธิ์ของ Permissions = roleManagement)
 *   open    = (CR-25) true → ทุกบทบาทเห็นเสมอ ไม่อยู่ในเมทริกซ์สิทธิ์ (เกี่ยวกับ Prototype)
 *   alsoPerms = (CR-35) สิทธิ์ย่อยของหน้าอื่นที่ทำให้หน้านี้มองเห็นด้วย (Price & Promotion แท็บ Clearance ใช้ listing.clearance ของ Launch & Listing)
 *   feature = (CR-37) ชื่อ Feature Flag (core/features.js) — ปิด = ไม่อยู่ในเมนู ไม่อยู่ในเมทริกซ์สิทธิ์ และเปิดตรงไม่ได้ (Bundle = bundle)
 *   CR-23: ชื่อ 4 ขั้นของ Sales Planning เป็นภาษาอังกฤษ (Annual Target · Sub-channel Allocation · SKU Planning · Plan Summary) id คงเดิม
 * CR-25: เลขขั้น "ขั้นที่ x/n" คงที่ (x = tour · n = จำนวนขั้นทั้งหมด) แม้บางขั้นมองไม่เห็น / ปุ่มก่อนหน้า/ถัดไปข้ามขั้นที่มองไม่เห็น (step)
 * index.html ที่ Root พาไปหน้าเริ่มต้นของบทบาท (core/permissions.js homePage)
 */
(function (SP) {
  'use strict';

  var GROUPS = ['sales-planning', 'approval', 'product-master', 'account-master', 'role-management', 'project-info'];   // CR-39 ตัดกลุ่ม revision (CR-38) · Revision เป็นแท็บของ Plan Summary · + approval

  var LIST = [
    { id: 'topDown',       title: 'Annual Target',               short: 'Annual Target',          path: 'modules/top-down/index.html',         group: 'sales-planning', tour: 1,    visible: true, fit: true, year: true },
    { id: 'phasing',       title: 'Sub-channel Allocation',      short: 'Sub-channel Allocation', path: 'modules/phasing/index.html',          group: 'sales-planning', tour: 2,    visible: true, fit: true, year: true },
    { id: 'skuPlanning',   title: 'SKU Planning',                short: 'SKU Planning',           path: 'modules/sku-planning/index.html',     group: 'sales-planning', tour: 3,    visible: true, fit: true, year: true },
    { id: 'summary',       title: 'Plan Summary',                short: 'Plan Summary',           path: 'modules/summary/index.html',          group: 'sales-planning', tour: 4,    visible: true, year: true },
    // CR-38 Revision (Flag revision) · CR-39 เป็นแท็บ Revision / เปรียบเทียบ ของ Plan Summary: หน้าเดิมซ่อน ลิงก์เดิมพาไปแท็บที่ตรงกัน (ใช้สิทธิ์ของ Plan Summary)
    { id: 'revisionList',  title: 'Revision List',               short: 'Revision List',          icon: 'target', path: 'modules/revision-list/index.html',    group: 'sales-planning', tour: null, visible: false, feature: 'revision', perm: 'summary' },
    { id: 'revisionCompare', title: 'Revision Compare',          short: 'Revision Compare',       icon: 'target', path: 'modules/revision-compare/index.html', group: 'sales-planning', tour: null, visible: false, feature: 'revision', perm: 'summary' },
    // CR-39 Module Approval (Flag approval): คำขออนุมัติทั้งหมด · ป้ายตัวเลข = คำขอที่ผู้ใช้ต้องดำเนินการ
    { id: 'approval',      title: 'Approval',                    short: 'Approval',               icon: 'badge-check', path: 'modules/approval/index.html',       group: 'approval', tour: null, visible: true, fit: true, feature: 'approval' },
    { id: 'productList',   title: 'Product List',                short: 'Product List',           icon: 'package', path: 'modules/products/index.html',       group: 'product-master', tour: null, visible: true, fit: true },
    { id: 'bundle',        title: 'Bundle',                      short: 'Bundle',                 icon: 'boxes', path: 'modules/bundle/index.html',        group: 'product-master', tour: null, visible: true, fit: true, year: false, feature: 'bundle' },   // CR-37
    // CR-35: แผน NPD + Listing รวมเป็น Launch & Listing (แท็บ NPD | Listing) · หน้าเดิมซ่อน ลิงก์เดิมพาไปแท็บที่ตรงกัน (ใช้สิทธิ์ launchListing)
    { id: 'launchListing', title: 'Launch & Listing',            short: 'Launch & Listing',        icon: 'rocket', path: 'modules/launch-listing/index.html', group: 'product-master', tour: null, visible: true, fit: true },
    { id: 'npdPlan',       title: 'Launch & Listing · NPD',      short: 'Launch & Listing · NPD',  icon: 'rocket', path: 'modules/npd-plan/index.html',       group: 'product-master', tour: null, visible: false, perm: 'launchListing' },
    { id: 'promotionPrice', title: 'Price & Promotion',          short: 'Price & Promotion',         icon: 'tag', path: 'modules/promotions/index.html',     group: 'product-master', tour: null, visible: true, fit: true, year: true, alsoPerms: ['listing.clearance'] },
    { id: 'productMaster', title: 'Launch & Listing · Listing', short: 'Launch & Listing · Listing', icon: 'rocket', path: 'modules/product-master/index.html', group: 'product-master', tour: null, visible: false, perm: 'launchListing' },
    // CR-36: Category & Series ย้ายเป็นแท็บ Product Level ของ Product List · หน้าเดิมซ่อน ลิงก์เดิมพาไปแท็บ (สิทธิ์ส่วนของหน้า taxonomy ใต้ productList)
    { id: 'taxonomy',      title: 'Product List · Product Level', short: 'Product Level',   icon: 'package', path: 'modules/taxonomy/index.html',       group: 'product-master', tour: null, visible: false, perm: 'productList', fit: true },
    // CR-29: Account Master 3 หน้าตามสิ่งที่จัดการ — Account & Platform · เขตและร้านค้า (TT) · บุคลากรและทีม (ใหม่)
    //   หน้าผู้รับผิดชอบ / ทีมขายเดิม ซ่อน (visible: false · ใช้สิทธิ์ของ people) ลิงก์เดิมพาไปแท็บที่ตรงกันของหน้าบุคลากรและทีม
    // CR-32: Account & Platform + เขตและร้านค้า (TT) รวมเป็น Account Master (salesUnits) · หน้าเดิมซ่อน (ใช้สิทธิ์ของ salesUnits)
    //   ลิงก์เดิมพาไปหน้าใหม่ (หน้าเขตเดิม → แท็บ Channel ที่แบ่งเป้าตามเขต)
    // CR-36: ชื่อหน้า Partner List (เดิม Account Master · id / สิทธิ์ / Route คงเดิม)
    { id: 'salesUnits',    title: 'Partner List',         short: 'Partner List',   icon: 'store', path: 'modules/sales-units/index.html',    group: 'account-master', tour: null, visible: true, fit: true },
    { id: 'accounts',      title: 'Account & Platform',          short: 'Account & Platform',    icon: 'store', path: 'modules/accounts/index.html',       group: 'account-master', tour: null, visible: false, perm: 'salesUnits' },
    { id: 'territories',   title: 'เขตและร้านค้า (TT)',           short: 'เขตและร้านค้า ({territoryChannels})', icon: 'store', path: 'modules/territories/index.html', group: 'account-master', tour: null, visible: false, perm: 'salesUnits' },
    // CR-32: บุคลากรและทีม → Sales Person Management (id / Path / สิทธิ์ people เดิม)
    { id: 'people',        title: 'Sales Person Management',     short: 'Sales Person Management', icon: 'users', path: 'modules/people/index.html',         group: 'account-master', tour: null, visible: true, fit: true },
    { id: 'salespeople',   title: 'ผู้รับผิดชอบ',                short: 'ผู้รับผิดชอบ',           icon: 'users', path: 'modules/salespeople/index.html', group: 'account-master', tour: null, visible: false, perm: 'people' },
    { id: 'salesTeam',     title: 'ทีมขาย',                      short: 'ทีมขาย',                icon: 'users', path: 'modules/sales-team/index.html',  group: 'account-master', tour: null, visible: false, perm: 'people' },
    // CR-25: Role Management ใช้สิทธิ์เดียวกัน (roleManagement) · ไอคอน K / R / U · CR-31 หน้า Roles ซ่อน (ลิงก์เดิมพาไปหน้า Permissions)
    { id: 'roleManagement', title: 'Permissions',                short: 'Permissions',            icon: 'shield-check', path: 'modules/role-management/index.html', group: 'role-management', tour: null, visible: true, fit: true },
    { id: 'roleRoles',     title: 'Roles',                       short: 'Roles',                  icon: 'shield-check', path: 'modules/role-management/roles/index.html', group: 'role-management', tour: null, visible: false, fit: true, perm: 'roleManagement' },
    { id: 'roleUsers',     title: 'Users',                       short: 'Users',                  icon: 'user-cog', path: 'modules/role-management/users/index.html', group: 'role-management', tour: null, visible: true, fit: true, perm: 'roleManagement' },
    // CR-28: คู่มือการใช้งาน (แทนเกี่ยวกับ Prototype · คง id และ Path เดิม ลิงก์เดิมยังใช้ได้) · กลุ่ม project-info แสดงชื่อ ช่วยเหลือ
    { id: 'aboutPrototype', title: 'คู่มือการใช้งาน',            short: 'คู่มือการใช้งาน',         icon: 'book-open', path: 'modules/about-prototype/index.html', group: 'project-info', tour: null, visible: true, fit: true, open: true }
  ];

  function byTour(a, b) { return (a.tour == null ? 999 : a.tour) - (b.tour == null ? 999 : b.tour); }
  // CR-37: หน้าที่ผูก Feature Flag (entry.feature) แสดงเมื่อ Flag เปิดเท่านั้น
  function featureOn(e) { var F = SP.core.features; return !e.feature || !F || F.isOn(e.feature); }
  function shown(e) { return e.visible && featureOn(e); }

  SP.core.registry = {
    list: LIST,
    groups: GROUPS,
    // หน้าใน Sales Planning ที่แสดงอยู่ เรียงตามลำดับ
    //   allowed(entry) → bool = หน้าที่ผู้ใช้เห็น (permissions.pageVisible) ไม่ระบุ = ทุกหน้า
    tour: function (allowed) {
      return LIST.filter(function (e) { return shown(e) && e.group === 'sales-planning' && e.tour != null && (!allowed || allowed(e)); }).sort(byTour);
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
        return { id: g, entries: LIST.filter(function (e) { return shown(e) && e.group === g && (!allowed || allowed(e)); }).sort(byTour) };
      }).filter(function (g) { return g.entries.length; });
    },
    featureOn: featureOn,
    byId: function (id) { return LIST.filter(function (e) { return e.id === id; })[0] || null; },
    byPath: function (path) { return LIST.filter(function (e) { return e.path === path; })[0] || null; }
  };
})(window.SP);
