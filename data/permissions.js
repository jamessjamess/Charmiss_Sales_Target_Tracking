/*
 * data/permissions.js — บทบาท และค่าตั้งต้นของสิทธิ์แยกตาม Module (ข้อมูล + ตัวแปลงตารางเป็น Object เท่านั้น) — CR-21 · CR-25
 *
 * SP.data.roles = [{ id, name, description, system, order, defaultLevel, homePageId }]
 *   homePageId = (CR-25) หน้าเริ่มต้นของบทบาท (id ของหน้าใน core/registry.js) — index.html · สลับมุมมองผู้ใช้ · ดูตัวอย่างในมุมมองนี้
 *   system = บทบาทตั้งต้น 8 บทบาท ลบไม่ได้ (แก้ชื่อและคำอธิบายได้) / order = ลำดับคอลัมน์ในหน้าบทบาทและสิทธิ์ และตัวเลือกมุมมองผู้ใช้
 *   defaultLevel = ระดับของรายการที่ไม่ได้ระบุ (ไม่มี = VIEW สำหรับหน้า · NONE สำหรับปุ่มเฉพาะ) — ผู้ดูแลระบบ = EDIT ทุกรายการ
 *   id ของบทบาทตั้งต้นตรงกับ ui.role.type เดิม (management · director · manager · officer · product · supply · viewer) + admin
 * SP.data.permissionResources = สิทธิ์ย่อยของหน้า (หน้าอื่น 1 รายการต่อหน้า id = id ของหน้าใน core/registry.js สร้างอัตโนมัติ ห้ามพิมพ์ซ้ำ)
 *   pages.<pageId> = [{ id, label, main (สิทธิ์ของหน้า), scopable (เลือกทุก Channel / เฉพาะทีมได้), action (ปุ่มเฉพาะ อนุญาต / ไม่อนุญาต) }]
 *   global = สิทธิ์ที่ใช้ทุกหน้า (ส่งออก Excel / CSV / พิมพ์)
 * SP.data.permissions = { <roleId>: { <resourceId>: { level: 'NONE' | 'VIEW' | 'EDIT', scope: 'ALL' | 'TEAM' } } }
 *   CR-25: ระบุครบทุกช่องตามตาราง CR-25 ข้อ 3 (ไม่เห็น → NONE · ดู → VIEW · แก้ไข → EDIT · แก้ไข·ทีม → EDIT + TEAM · ✓ → EDIT · – → NONE)
 *   แทนค่าตั้งต้นของ CR-21 ที่ทุกบทบาทเห็นทุกหน้า / หน้าที่เพิ่มใน registry ภายหลังยังได้ defaultLevel (ไม่มี = VIEW) จนกว่าจะตั้งในเมทริกซ์
 *   CR-23: annualTarget (หน้า Annual Target) แทน topdown.channel · unitTargets (หน้า Sub-channel Allocation: หน่วยขาย + รายเดือน)
 *   แทน topdown.unit + phasing — core/permissions.js แปลงค่าที่บันทึกไว้เดิมให้เอง
 *   ค่าที่แก้ในหน้าบทบาทและสิทธิ์เก็บที่ store: master.roles, master.permissions (ผู้ใช้อยู่ที่ data/users.js → master.users)
 */
(function (SP) {
  'use strict';

  SP.data.roles = [
    { id: 'management', name: 'Management',     description: 'กำหนด Total Target และแบ่งลง Channel', system: true, order: 1, homePageId: 'topDown' },
    { id: 'director',   name: 'Sales Director', description: 'แบ่งเป้าลงหน่วยขาย กำหนดเป้ารายเดือน และจัดการ Account Master', system: true, order: 2, homePageId: 'phasing' },
    { id: 'manager',    name: 'Sales Manager',  description: 'วางแผนราย SKU ของ Channel ที่อยู่ในทีม', system: true, order: 3, homePageId: 'skuPlanning' },
    { id: 'officer',    name: 'Sales Officer',  description: 'วางแผนราย SKU ของ Channel ที่อยู่ในทีม (สิทธิ์เท่ากับ Sales Manager ในหน้าวางแผน)', system: true, order: 4, homePageId: 'skuPlanning' },
    { id: 'product',    name: 'ทีม Product',    description: 'จัดการ Product Master (ยกเว้น Clearance)', system: true, order: 5, homePageId: 'productList' },
    { id: 'supply',     name: 'Supply Chain',   description: 'จัดการ Clearance', system: true, order: 6, homePageId: 'productList' },
    { id: 'viewer',     name: 'ผู้ดูรายงาน',     description: 'ดูรายงานสรุปแผน แก้ไขไม่ได้', system: true, order: 7, homePageId: 'summary' },
    { id: 'admin',      name: 'ผู้ดูแลระบบ',     description: 'กำหนดบทบาทและสิทธิ์ของผู้ใช้ แก้ไขได้ทุกหน้า (ยกเว้น Plan Summary = ดู)', system: true, order: 8, defaultLevel: 'EDIT', homePageId: 'roleManagement' }
  ];

  SP.data.permissionResources = {
    pages: {
      topDown: [
        { id: 'annualTarget', label: 'Annual Target', main: true }
      ],
      phasing: [
        { id: 'unitTargets', label: 'Sub-channel Allocation', main: true }
      ],
      skuPlanning: [
        { id: 'skuPlan', label: 'แผนยอดขายราย SKU', main: true, scopable: true },
        { id: 'skuPlan.createNpd', label: 'สร้าง NPD', scopable: true, action: true }
      ],
      // CR-36: Product List = หน้าหลัก + ส่วนของหน้า Product Level (key เดิม taxonomy ของหน้า Category & Series · ค่าเดิมคงไว้)
      productList: [
        { id: 'productList', label: 'Product List', main: true },
        { id: 'taxonomy', label: 'Product Level' }
      ],
      // CR-30: หน้าราคาและ Promotion = หน้าหลัก + ส่วนของหน้า ราคาหลัก (ทีม Product) · Promotion Price (Sales ตาม Channel ในทีม)
      promotionPrice: [
        { id: 'prices', label: 'Price & Promotion', main: true },
        { id: 'prices.base', label: 'ราคาหลัก' },
        { id: 'prices.promo', label: 'Promotion Price', scopable: true }
      ],
      // CR-35: Launch & Listing = สิทธิ์เดียวของหน้า (สูงสุดของแผน NPD และ Listing เดิม · core/permissions.js LEGACY) · Clearance ใช้ร่วมกับแท็บ Clearance ของ Price & Promotion
      launchListing: [
        { id: 'launchListing', label: 'Launch & Listing', main: true },
        { id: 'listing.clearance', label: 'Clearance' }
      ],
      // CR-29: หน้า Account & Platform = หน้าหลัก + ส่วนของหน้า GP / Platform Fee และตั้งค่า Channel (สิทธิ์ย่อยสูงกว่าหน้าหลักได้)
      // CR-32: ย้ายมาอยู่ใต้หน้า Account Master (ค่าเดิมของ accounts / territories แปลงให้เอง · core/permissions.js LEGACY)
      salesUnits: [
        { id: 'salesUnits', label: 'Partner List', main: true },   // CR-36 ชื่อหน้า
        { id: 'salesUnits.gp', label: 'GP / Platform Fee' },
        { id: 'salesUnits.channelSettings', label: 'ตั้งค่า Channel' }
      ],
      // CR-25: Permissions · Roles · Users ใช้สิทธิ์เดียวกัน (registry perm: 'roleManagement') · CR-31 หน้า Roles ซ่อน
      roleManagement: [
        { id: 'roleManagement', label: 'Permissions / Users', main: true }
      ]
    },
    global: [
      { id: 'export', label: 'ส่งออก Excel / CSV / พิมพ์', action: true }
    ]
  };

  // ตาราง CR-25 ข้อ 3: 1 แถวต่อ resource ตามลำดับเมนู · คอลัมน์ = บทบาทตามลำดับ (management · director · manager · officer · product · supply · viewer · admin)
  //   N = ไม่เห็น / – · V = ดู · E = แก้ไข / ✓ · T = แก้ไข·ทีม / ✓·ทีม
  var ROLE_ORDER = ['management', 'director', 'manager', 'officer', 'product', 'supply', 'viewer', 'admin'];
  var TABLE = {
    annualTarget:        'E V N N N N N E',
    unitTargets:         'V E V V N N N E',
    skuPlan:             'V V T T N N N E',
    'skuPlan.createNpd': 'N N T T N N N E',
    summary:             'V V V V V V V V',
    productList:         'N V V V E V N E',
    launchListing:       'N V V V E V N E',   // CR-35 = สูงสุดของ npdPlan และ listing เดิม (เท่ากันทุกบทบาท)
    prices:              'N V V V V N N E',
    'prices.base':       'N V V V E N N E',
    'prices.promo':      'N E T T V N N E',
    'listing.clearance': 'N V V V V E N E',
    taxonomy:            'N N N N E N N E',   // CR-36 ส่วนของหน้า Product List (แท็บ Product Level)
    // CR-32: salesUnits = สิทธิ์สูงสุดของ accounts (N E V N N N N E) และ territories (N E V V N N N E) เดิม · สิทธิ์ย่อยคงค่าเดิม
    salesUnits:          'N E V V N N N E',
    'salesUnits.gp':     'N E V N N N N E',
    'salesUnits.channelSettings': 'N E N N N N N E',
    people:              'N E V N N N N E',
    roleManagement:      'N N N N N N N E',
    'export':            'E E E E E E E E'
  };
  var CELL = { N: { level: 'NONE', scope: 'ALL' }, V: { level: 'VIEW', scope: 'ALL' }, E: { level: 'EDIT', scope: 'ALL' }, T: { level: 'EDIT', scope: 'TEAM' } };

  SP.data.permissions = {};
  ROLE_ORDER.forEach(function (roleId, i) {
    var row = SP.data.permissions[roleId] = {};
    Object.keys(TABLE).forEach(function (resId) { var c = CELL[TABLE[resId].split(' ')[i]]; row[resId] = { level: c.level, scope: c.scope }; });
  });
})(window.SP);
